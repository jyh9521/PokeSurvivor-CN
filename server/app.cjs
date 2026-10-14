/* Same-origin NAS HTTP + authenticated WebSocket relay. No Firebase SDK. */
const http=require('node:http'),fs=require('node:fs'),path=require('node:path');
const {randomBytes}=require('node:crypto'),{WebSocketServer,WebSocket}=require('ws');
const {isIP}=require('node:net');
const {create:createFlow}=require('../js/net/relay-flow.js');
const {createStore,error}=require('./store.cjs');
function createApp({dataDir,root=path.resolve(__dirname,'..'),publicOrigin='',registration=true,trustProxy=false,campaigns}={}) {
  fs.mkdirSync(dataDir,{recursive:true});const store=createStore(path.join(dataDir,'pokesurvivor.sqlite'),{campaigns});
  if(publicOrigin)publicOrigin=new URL(publicOrigin).origin;
  const flows=new WeakMap(),sockets=new Map(),rooms=new Map(),invites=new Map(),runs=new Map(),limits=new Map();
  const connected=uid=>sockets.get(uid)?.readyState===WebSocket.OPEN;
  const token=req=>(req.headers.cookie||'').split(';').map(s=>s.trim()).find(s=>s.startsWith('ps_nas='))?.slice(7)||'';
  const userOf=req=>store.authenticate(token(req));
  const expected=req=>publicOrigin || `${trustProxy&&req.headers['x-forwarded-proto']==='https'?'https':'http'}://${req.headers.host}`;
  const validOrigin=req=>!req.headers.origin || req.headers.origin===expected(req);
  const clientIP=req=>{const forwarded=trustProxy?String(req.headers['x-forwarded-for']||'').split(',').pop().trim():'';return isIP(forwarded)?forwarded:req.socket.remoteAddress||'unknown';};
  function rate(key,max=120,span=60000){const now=Date.now(),r=limits.get(key);if(!r||now-r.at>span){limits.set(key,{at:now,n:1});return;}if(++r.n>max)throw error(429,'请求过于频繁，请稍后重试。');}
  function send(uid,value){const ws=sockets.get(uid);if(ws?.readyState!==WebSocket.OPEN)return;return flows.get(ws).send(ws,value,{key:value.from||'',scope:roomFor(uid)?.id,replaceable:value.type==='relay'&&value.data?.k==='f'&&Array.isArray(value.data.ev)&&value.data.ev.length===0});}
  const roomFor=uid=>[...rooms.values()].find(r=>r.members.some(m=>m.uid===uid));
  function social(user){const room=roomFor(user.id);return {me:{uid:user.id,name:user.name},uid:user.id,
    friends:store.friendRows(user.id).map(f=>{const id=f.a===user.id?f.b:f.a,u=store.getUser(id),r=roomFor(id);return {uid:id,name:u.name,pid:f.a+'_'+f.b,status:f.status==='ok'?'ok':f.requester===user.id?'out':'in',online:connected(id),play:!!r&&!r.open,room:r?.id||''};}),
    invites:[...invites.values()].filter(i=>i.to===user.id&&Date.now()-i.at<180e3).map(i=>({from:i.from,name:i.name,room:i.room,at:i.at})),
    room:room?{id:room.id,host:room.host,isHost:room.host===user.id,members:room.members}:null};}
  function notify(){for(const uid of sockets.keys()){const u=store.getUser(uid);if(u)send(uid,{type:'social',data:social(u)});}}
  function leave(uid){const r=roomFor(uid);if(!r)return;if(r.host===uid){rooms.delete(r.id);for(const m of r.members)send(m.uid,{type:'room-closed'});}else r.members=r.members.filter(m=>m.uid!==uid);
    for(const [k,i]of invites)if(i.from===uid||i.to===uid||!rooms.has(i.room))invites.delete(k);notify();}
  function member(user){const s=store.getSave(user.id).save;if(!s?.partner)throw error(400,'请先选择伙伴。');return {uid:user.id,name:user.name,dex:s.partner,shiny:!!s.partnerShiny};}
  const reply=(res,status,value)=>{res.writeHead(status,{'content-type':'application/json; charset=utf-8','cache-control':'no-store','x-content-type-options':'nosniff'});res.end(JSON.stringify(value));};
  async function body(req){let chunks=[],size=0;for await(const chunk of req){size+=chunk.length;if(size>600*1024)throw error(413,'请求内容过大。');chunks.push(chunk);}try{return JSON.parse(Buffer.concat(chunks).toString()||'{}');}catch{throw error(400,'Invalid JSON');}}
  function cookie(req,res,value,clear=false){const secure=publicOrigin.startsWith('https:')||(trustProxy&&req.headers['x-forwarded-proto']==='https');res.setHeader('set-cookie',`ps_nas=${value}; HttpOnly; SameSite=Strict; Path=/; Max-Age=${clear?0:30*86400}${secure?'; Secure':''}`);}
  function startRun(user,mode){if(!['s','g'].includes(mode))throw error(400,'Invalid mode');let members=[member(user)];if(mode==='g'){const r=roomFor(user.id);if(!r||r.host!==user.id||r.members.length<2||r.open)throw error(403,'联机房间未开始。');members=r.members.slice();}
    const own=[...runs.values()].filter(r=>r.uid===user.id).sort((a,b)=>a.at-b.at);while(own.length>=4)runs.delete(own.shift().id);
    const value={id:randomBytes(16).toString('hex'),uid:user.id,mode,at:Date.now(),members};runs.set(value.id,value);return {id:value.id};}
  function submit(user,b){const r=runs.get(b.run);if(!r||r.uid!==user.id||r.mode!==b.mode)throw error(403,'本局凭证无效。');
    const t=Number(b.mark?.t),elapsed=(Date.now()-r.at)/1000;if(!Number.isFinite(t)||t<1||t>7200||t>elapsed+3)throw error(400,'成绩时间不符合本局实际时长。');
    const lv=Number(b.mark.lv),kills=Number(b.mark.kills);if(!Number.isSafeInteger(lv)||lv<1||lv>1000||!Number.isSafeInteger(kills)||kills<0||kills>1e7)throw error(400,'Invalid score');
    const row={t:Math.floor(t),uids:r.members.map(m=>m.uid),names:r.members.map(m=>m.name),dex:r.members.map(m=>m.dex),shiny:r.members.map(m=>m.shiny),lv,kills};
    const id=store.addScore(r.mode,row);runs.delete(r.id);return {id};}
  function rankings(user,url){const mode=url.searchParams.get('mode')||'s',period=url.searchParams.get('period')||'a',dex=Number(url.searchParams.get('dex')||0);
    if(!['s','g'].includes(mode)||!['d','w','m','a'].includes(period)||!Number.isInteger(dex)||dex<0||dex>1100)throw error(400,'Invalid leaderboard');
    const now=new Date(),day=Date.UTC(now.getUTCFullYear(),now.getUTCMonth(),now.getUTCDate()),week=day-((now.getUTCDay()+6)%7)*86400e3;
    const since={d:day,w:week,m:Date.UTC(now.getUTCFullYear(),now.getUTCMonth(),1),a:0}[period],best=new Map();
    for(const row of store.scores()){if(row.mode!==mode||row.at<since||(dex&&!row.dex.includes(dex)))continue;const key=row.uids.slice().sort().join('_');if(!best.has(key)||best.get(key).t<row.t)best.set(key,row);}
    const all=[...best.values()].sort((a,b)=>b.t-a.t||a.at-b.at),mine=all.findIndex(r=>r.uids.includes(user.id));
    const circle=new Set([user.id,...store.friendRows(user.id).filter(f=>f.status==='ok').map(f=>f.a===user.id?f.b:f.a)]);
    return {rows:(url.searchParams.get('friends')==='1'?all.filter(r=>r.uids.some(u=>circle.has(u))):all).slice(0,50),mine:mine<0?null:{pos:mine+1,t:all[mine].t,row:all[mine]}};
  }
  const staticDirs=new Set(['assets','css','js','en','zh','guia','pokedex','legendarios','shinies','tipos','movimientos','objetos','logros','novedades','apoyar','contacto']);
  const staticFiles=new Set(['index.html','sw.js','version.json','manifest.webmanifest','favicon.ico','robots.txt','sitemap.xml','404.html']);
  const mime={'.html':'text/html; charset=utf-8','.js':'application/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.png':'image/png','.jpg':'image/jpeg','.ico':'image/x-icon','.ttf':'font/ttf','.woff2':'font/woff2','.json':'application/json','.webmanifest':'application/manifest+json'};
  const server=http.createServer(async(req,res)=>{try{
    const url=new URL(req.url,'http://local');
    if(url.pathname.startsWith('/api/')){
      if(!validOrigin(req))throw error(403,'Origin mismatch');rate('http:'+clientIP(req),600);
      if(req.method==='GET'&&url.pathname==='/api/config')return reply(res,200,{backend:'nas',version:1,registration});
      if(req.method==='GET'&&url.pathname==='/api/health')return reply(res,200,{ok:true});
      if(['POST','PUT','DELETE'].includes(req.method)&&!String(req.headers['content-type']).startsWith('application/json'))throw error(415,'JSON required');
      // Player history and restore remain disabled even for old clients.
      if(['/api/history','/api/restore'].includes(url.pathname))throw error(403,'玩家历史存档恢复已关闭。');
      const b=req.method==='GET'?{}:await body(req);
      if(req.method==='POST'&&['/api/register','/api/login'].includes(url.pathname)){
        rate('auth:'+clientIP(req),20,60000);const register=url.pathname==='/api/register';if(register&&!registration)throw error(403,'当前已关闭注册。');
        const u=await store.credentials(b.name,b.password,register);cookie(req,res,store.session(u));return reply(res,200,{user:u,...store.getSave(u.id)});
      }
      const user=userOf(req);if(!user)throw error(401,'请重新登录 NAS 账号。');
      const route=req.method+' '+url.pathname;
      switch(route){
        case 'GET /api/session':return reply(res,200,{user,...store.getSave(user.id)});
        case 'POST /api/logout':leave(user.id);sockets.get(user.id)?.close();store.logout(token(req));cookie(req,res,'',true);return reply(res,200,{ok:true});
        case 'POST /api/delete':await store.credentials(user.name,b.password);leave(user.id);sockets.get(user.id)?.close();store.remove(user);cookie(req,res,'',true);return reply(res,200,{ok:true});
        case 'GET /api/save':return reply(res,200,store.getSave(user.id));
        case 'PUT /api/save':return reply(res,200,store.putSave(user,b.save,b.rev,b.mutation));
        case 'GET /api/social':return reply(res,200,social(user));
        case 'POST /api/friends/request':store.request(user,b.name);notify();return reply(res,200,{ok:true,msg:'好友请求已发送。'});
        case 'POST /api/friends/accept':store.friendship(user,b.uid,true);notify();return reply(res,200,{ok:true,msg:'已添加好友。'});
        case 'POST /api/friends/remove':store.friendship(user,b.uid,false);notify();return reply(res,200,{ok:true});
        case 'POST /api/room/create':{leave(user.id);const r={id:randomBytes(12).toString('hex'),host:user.id,open:true,members:[member(user)]};rooms.set(r.id,r);notify();return reply(res,200,{ok:true,room:r.id});}
        case 'POST /api/room/leave':leave(user.id);return reply(res,200,{ok:true});
        case 'POST /api/room/member':{const r=roomFor(user.id);if(r&&r.open)r.members=r.members.map(m=>m.uid===user.id?member(user):m);notify();return reply(res,200,{ok:true});}
        case 'POST /api/room/open':{const r=roomFor(user.id);if(!r||r.host!==user.id)throw error(403,'仅房主可操作。');r.open=!!b.open;notify();return reply(res,200,{ok:true});}
        case 'POST /api/invite':{const r=roomFor(user.id);if(!r||r.host!==user.id||!r.open||!store.areFriends(user.id,b.uid))throw error(403,'只能邀请好友进入自己的开放房间。');if(r.members.length>=4)throw error(409,'房间已满。');invites.set(b.uid+'_'+user.id,{to:b.uid,from:user.id,name:user.name,room:r.id,at:Date.now()});notify();return reply(res,200,{ok:true,msg:'邀请已发送。'});}
        case 'POST /api/invite/accept':{const i=invites.get(user.id+'_'+b.uid),r=i&&rooms.get(i.room);if(!i||Date.now()-i.at>180e3||!r||!r.open||r.members.length>=4||!store.areFriends(user.id,b.uid))throw error(409,'邀请已失效或房间已满。');leave(user.id);r.members.push(member(user));invites.delete(user.id+'_'+b.uid);notify();return reply(res,200,{ok:true});}
        case 'POST /api/invite/decline':invites.delete(user.id+'_'+b.uid);notify();return reply(res,200,{ok:true});
        case 'GET /api/profile':{const uid=url.searchParams.get('uid')||user.id,u=store.getUser(uid),s=store.getSave(uid).save;if(!u||!s)return reply(res,200,{profile:null});return reply(res,200,{profile:{name:u.name,favs:s.profile?.favs||[],title:s.profile?.title||'',best:{solo:s.stats.bestTime||0,group:s.stats.bestGroupTime||0,level:s.stats.bestLevel||0,kills:s.stats.totalKills||0,bosses:s.stats.bossesTotal||0,legends:Object.keys(s.legends||{}).length,medals:Object.keys(s.ach||{}).length},medals:Object.keys(s.ach||{}).slice(0,8)}});}
        case 'POST /api/run':return reply(res,200,startRun(user,b.mode));
        case 'POST /api/score':return reply(res,200,submit(user,b));
        case 'GET /api/ranking':return reply(res,200,rankings(user,url));
        case 'POST /api/report':if(typeof b.id!=='string'||b.id.length>200)throw error(400,'Invalid report');store.db.prepare('INSERT OR IGNORE INTO reports VALUES(?,?,?)').run(user.id,b.id,Date.now());return reply(res,200,{ok:true});
        default:throw error(404,'接口不存在。');
      }
    }
    if(!['GET','HEAD'].includes(req.method))throw error(405,'Method not allowed');
    let f=path.resolve(root,'.'+decodeURIComponent(url.pathname)),rel=path.relative(root,f).split(path.sep);
    if((f!==root&&!f.startsWith(root+path.sep))||rel.some(p=>p.startsWith('.'))||(f!==root&&!staticDirs.has(rel[0])&&!staticFiles.has(rel.join('/'))))throw error(403,'Forbidden');
    if(fs.statSync(f).isDirectory())f=path.join(f,'index.html');const real=fs.realpathSync(f);if(!real.startsWith(fs.realpathSync(root)+path.sep))throw error(403,'Forbidden');
    res.writeHead(200,{'content-type':mime[path.extname(f)]||'application/octet-stream','cache-control':'no-cache','x-content-type-options':'nosniff'});if(req.method==='HEAD')res.end();else fs.createReadStream(f).pipe(res);
  }catch(e){if(!res.headersSent)reply(res,e.status||404,{error:e.status?e.message:'Not found',...(e.current?{current:e.current}:{})});else res.destroy();}});
  const wss=new WebSocketServer({noServer:true,maxPayload:256*1024,perMessageDeflate:false});
  server.requestTimeout=15000;server.headersTimeout=10000;server.keepAliveTimeout=5000;server.maxHeadersCount=100;
  server.on('upgrade',(req,socket,head)=>{try{if(new URL(req.url,'http://local').pathname!=='/api/ws'||!validOrigin(req))throw error(403,'Forbidden');const u=userOf(req);if(!u)throw error(401,'Unauthorized');rate('ws:'+u.id,10);wss.handleUpgrade(req,socket,head,ws=>wss.emit('connection',ws,u));}catch{socket.write('HTTP/1.1 403 Forbidden\r\nConnection: close\r\n\r\n');socket.destroy();}});
  wss.on('connection',(ws,user)=>{flows.set(ws,createFlow({hardLimit:2*1024*1024,closeCode:1013}));const old=sockets.get(user.id);sockets.set(user.id,ws);old?.close(4001,'Another device connected');ws.on('error',()=>ws.terminate());ws.alive=true;ws.on('pong',()=>ws.alive=true);notify();
    ws.on('message',data=>{try{rate('packet:'+user.id,300,1000);const msg=JSON.parse(data);if(msg.type==='ping'){if(typeof msg.id!=='string'||! /^[a-z0-9-]{1,40}$/i.test(msg.id))throw error(400,'Invalid probe');send(user.id,{type:'pong',id:msg.id,buffered:ws.bufferedAmount});return;}if(msg.type==='social'){send(user.id,{type:'social',data:social(user)});return;}
      if(msg.type!=='relay')return;const r=roomFor(user.id);if(!r||!msg.data||typeof msg.data!=='object')throw error(403,'No room');
      if(user.id!==r.host&&msg.to!==r.host)throw error(403,'Guests only send to host');
      if(!r.members.some(m=>m.uid===msg.to))throw error(403,'Peer outside room');
      if(msg.data.k==='start'){if(user.id!==r.host||r.open||r.members.length<2)throw error(403,'Invalid start');msg.data={k:'start',seed:Math.floor(Number(msg.data.seed)||0),host:r.host,members:r.members};}
      send(msg.to,{type:'relay',from:user.id,data:msg.data});
    }catch(e){ws.close(e.status===429?1008:1008,'Invalid packet');}});
    ws.on('close',()=>{if(sockets.get(user.id)!==ws)return;sockets.delete(user.id);leave(user.id);notify();});
  });
  const drainTimer=setInterval(()=>{for(const[uid,ws]of sockets)flows.get(ws)?.drain(ws,(_v,from,scope)=>{const room=roomFor(uid);return !!room&&room.id===scope&&room.members.some(m=>m.uid===from);});},50);drainTimer.unref();
  const timer=setInterval(()=>{for(const ws of sockets.values()){if(!ws.alive){ws.terminate();continue;}ws.alive=false;ws.ping();}for(const[k,r]of runs)if(Date.now()-r.at>7500e3)runs.delete(k);for(const[k,i]of invites)if(Date.now()-i.at>180e3)invites.delete(k);for(const[k,r]of limits)if(Date.now()-r.at>3600e3)limits.delete(k);},30000);timer.unref();
  return {server,store,rooms,async close(){clearInterval(timer);clearInterval(drainTimer);for(const ws of sockets.values())ws.terminate();await new Promise(r=>server.close(r));wss.close();store.close();}};
}
module.exports={createApp};
