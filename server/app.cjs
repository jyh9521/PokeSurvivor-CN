const {fromEnv}=require('./turn.cjs');
const Rules=require('../js/core/challenge-rules.js');
const {createOperations}=require('./operations.cjs');
/* Same-origin NAS HTTP + authenticated WebSocket relay. No Firebase SDK. */
const http=require('node:http'),fs=require('node:fs'),path=require('node:path');
const {randomBytes}=require('node:crypto'),{WebSocketServer,WebSocket}=require('ws');
const {isIP}=require('node:net');
const {createStatic}=require('./static.cjs');
const {create:createFlow}=require('../js/net/relay-flow.js');
const Upgrades=require('../js/data/upgrades.js');
const {createStore,error}=require('./store.cjs');
function createApp({dataDir,root=path.resolve(__dirname,'..'),publicOrigin='',registration=true,trustProxy=false,campaigns,reconnectMs=30000,clock=()=>Date.now(),turnProvider=fromEnv()}={}) {
  let closing=false;const serveStatic=createStatic();
  fs.mkdirSync(dataDir,{recursive:true});const store=createStore(path.join(dataDir,'pokesurvivor.sqlite'),{campaigns});
  if(publicOrigin)publicOrigin=new URL(publicOrigin).origin;
  const clients=new Map(),departures=new Map(),flows=new WeakMap(),sockets=new Map(),rooms=new Map(),invites=new Map(),runs=new Map(),limits=new Map();
  const operations=createOperations(store.db,error);
  const display=u=>u?.nick||u?.name||'已删除玩家';
  const connected=uid=>sockets.get(uid)?.readyState===WebSocket.OPEN;
  const token=req=>(req.headers.cookie||'').split(';').map(s=>s.trim()).find(s=>s.startsWith('ps_nas='))?.slice(7)||'';
  const userOf=req=>store.authenticate(token(req));
  const expected=req=>publicOrigin || `${trustProxy&&req.headers['x-forwarded-proto']==='https'?'https':'http'}://${req.headers.host}`;
  const validOrigin=req=>!req.headers.origin || req.headers.origin===expected(req);
  const clientIP=req=>{const forwarded=trustProxy?String(req.headers['x-forwarded-for']||'').split(',').pop().trim():'';return isIP(forwarded)?forwarded:req.socket.remoteAddress||'unknown';};
  function rate(key,max=120,span=60000){const now=clock(),r=limits.get(key);if(!r||now-r.at>span){limits.set(key,{at:now,n:1});return;}if(++r.n>max)throw error(429,'请求过于频繁，请稍后重试。');}
  function send(uid,value){const ws=sockets.get(uid);if(ws?.readyState!==WebSocket.OPEN)return;flows.get(ws).setLimit(Math.max(4,Rules.capacity(roomFor(uid))-1));return flows.get(ws).send(ws,value,{key:value.from||'',scope:roomFor(uid)?.id,replaceable:value.type==='relay'&&((value.data?.k==='f'&&Array.isArray(value.data.ev)&&value.data.ev.length===0)||(value.data?.k==='rtc-wire'&&value.data.lane==='state'))});}
  const roomFor=uid=>[...rooms.values()].find(r=>r.members.some(m=>m.uid===uid));
  const playing=uid=>[...runs.values()].some(r=>r.uid===uid||r.members.some(m=>m.uid===uid))||!!(roomFor(uid)&&!roomFor(uid).open&&roomFor(uid).phase!=='finished');
  let socialRevision=0;const socialGeneration=randomBytes(8).toString('hex');
  function social(user){const room=roomFor(user.id);return {revision:socialRevision,generation:socialGeneration,me:{uid:user.id,name:display(user),canAnnounce:operations.admin(user),isAdmin:operations.admin(user)},uid:user.id,
    players:[...sockets.keys()].filter(connected).map(uid=>({uid,name:display(store.getUser(uid)),status:'ok',online:true,play:playing(uid),room:roomFor(uid)?.id||''})),
    friends:store.friendRows(user.id).map(f=>{const id=f.a===user.id?f.b:f.a,u=store.getUser(id),r=roomFor(id);return {uid:id,name:display(u),pid:f.a+'_'+f.b,status:f.status==='ok'?'ok':f.requester===user.id?'out':'in',online:connected(id),play:playing(id),room:r?.id||''};}),
    invites:[...invites.values()].filter(i=>i.to===user.id&&clock()-i.at<180e3).map(i=>({from:i.from,name:i.name,room:i.room,at:i.at,experiment:rooms.get(i.room)?.experiment===true})),
    room:room?{capacity:Rules.capacity(room),experiment:room.experiment===true,id:room.id,host:room.host,isHost:room.host===user.id,open:room.open,epoch:room.epoch||0,transfer:room.transfer?{to:room.transfer.to}:null,members:room.members.map(m=>({...m,name:display(store.getUser(m.uid)),connected:connected(m.uid),play:playing(m.uid)}))}:null};}
  function notify(){socialRevision++;for(const uid of sockets.keys()){const u=store.getUser(uid);if(u)send(uid,{type:'social',data:social(u)});}}
  function leave(uid){clearTimeout(departures.get(uid));departures.delete(uid);const r=roomFor(uid);if(!r)return;if(r.host===uid){const next=r.open?r.members.find(m=>m.uid!==uid&&connected(m.uid)):null;if(next){r.host=next.uid;r.members=r.members.filter(m=>m.uid!==uid);r.members.forEach(m=>m.ready=false);r.epoch=(r.epoch||0)+1;}else{rooms.delete(r.id);for(const m of r.members)send(m.uid,{type:'room-closed'});}}else r.members=r.members.filter(m=>m.uid!==uid);
    for(const [k,i]of invites)if(i.from===uid||i.to===uid||!rooms.has(i.room))invites.delete(k);notify();}
  function member(user){const s=store.getSave(user.id).save;if(!s?.partner)throw error(400,'请先选择伙伴。');return {uid:user.id,name:display(user),dex:s.partner,shiny:!!s.partnerShiny,ready:false};}
  const reply=(res,status,value)=>{res.writeHead(status,{'content-type':'application/json; charset=utf-8','cache-control':'no-store','x-content-type-options':'nosniff'});res.end(JSON.stringify(value));};
  async function body(req){let chunks=[],size=0;for await(const chunk of req){size+=chunk.length;if(size>600*1024)throw error(413,'请求内容过大。');chunks.push(chunk);}try{return JSON.parse(Buffer.concat(chunks).toString()||'{}');}catch{throw error(400,'Invalid JSON');}}
  function cookie(req,res,value,clear=false){const secure=publicOrigin.startsWith('https:')||(trustProxy&&req.headers['x-forwarded-proto']==='https');res.setHeader('set-cookie',`ps_nas=${value}; HttpOnly; SameSite=Strict; Path=/; Max-Age=${clear?0:30*86400}${secure?'; Secure':''}`);}
  function operationStatus(){const status=operations.read();return {...status,activeRuns:runs.size,activeRooms:[...rooms.values()].filter(r=>!r.open&&r.phase!=='finished').length,ready:status.draining&&runs.size===0&&![...rooms.values()].some(r=>!r.open&&r.phase!=='finished')};}
  function guardStart(){if(operations.read().draining)throw error(503,'服务器维护排空中：本局结束后可继续存档，暂不开始新局。');}
  function broadcastOperations(){for(const uid of sockets.keys())send(uid,{type:'operations',data:operations.read()});}
  function startRun(user,mode,challengeId){guardStart();if(!['s','g'].includes(mode))throw error(400,'Invalid mode');let challenge=null;if(challengeId!==undefined){if(mode!=='s'||roomFor(user.id))throw error(409,'请先离开联机房间再开始挑战。');challenge=['d','w'].map(p=>Rules.current(p,clock())).find(c=>c.id===challengeId);if(!challenge)throw error(409,'挑战已轮换，请刷新挑战列表。');}let members=[member(user)];if(challenge)members[0]={...members[0],dex:challenge.dex,shiny:false};if(mode==='g'){const r=roomFor(user.id);if(!r||r.host!==user.id||r.members.length<2||r.open)throw error(403,'联机房间未开始。');members=r.members.slice();}
    const own=[...runs.values()].filter(r=>r.uid===user.id).sort((a,b)=>a.at-b.at);while(own.length>=4)runs.delete(own.shift().id);
    const value={id:randomBytes(16).toString('hex'),uid:user.id,mode,at:clock(),seen:clock(),challenge,experiment:mode==='g'&&roomFor(user.id).experiment===true,members,room:mode==='g'?roomFor(user.id).id:null};runs.set(value.id,value);if(value.room){const room=rooms.get(value.room);room.phase='running';room.runId=value.id;}notify();return {id:value.id,challenge};}
  function submit(user,b){const r=runs.get(b.run);if(!r||r.uid!==user.id||r.mode!==b.mode)throw error(403,'本局凭证无效。');
    const t=Number(b.mark?.t),elapsed=(clock()-r.at)/1000;if(!Number.isFinite(t)||t<1||t>7200||t>elapsed+3)throw error(400,'成绩时间不符合本局实际时长。');
    const lv=Number(b.mark.lv),kills=Number(b.mark.kills);if(!Number.isSafeInteger(lv)||lv<1||lv>1000||!Number.isSafeInteger(kills)||kills<0||kills>1e7)throw error(400,'Invalid score');
    const row={t:Math.floor(t),uids:r.members.map(m=>m.uid),names:r.members.map(m=>m.name),dex:r.members.map(m=>m.dex),shiny:r.members.map(m=>m.shiny),lv,kills};
    if(r.mode==='g'&&b.mark.teamStats!==undefined){const values=b.mark.teamStats;if(!Array.isArray(values)||values.length!==r.members.length||new Set(values.map(v=>v.uid)).size!==values.length||values.some(v=>!row.uids.includes(v.uid)||['damage','kills','assists','rescues'].some(k=>!Number.isSafeInteger(v[k])||v[k]<0||v[k]>1e12)))throw error(400,'Invalid team statistics');row.teamStats=values.map(v=>({uid:v.uid,damage:v.damage,kills:v.kills,assists:v.assists,rescues:v.rescues}));}
    if(r.challenge&&t>r.challenge.maxSeconds+1)throw error(400,'挑战成绩超过规则时长。');if(r.challenge)row.challenge=r.challenge.id;if(r.experiment)row.experiment=true;const id=store.addScore(r.challenge?'c':r.experiment?'x':r.mode,row);runs.delete(r.id);const room=rooms.get(r.room);if(room?.runId===r.id)room.phase='finished';notify();return {id};}
  function selectedChallenge(period,date){try{return Rules.select(period,date,clock());}catch{throw error(400,'Invalid challenge period or date');}}
  function challengeRankings(user,url){
    const challenge=selectedChallenge(url.searchParams.get('period')||'d',url.searchParams.get('date')),best=new Map();
    for(const row of store.scores()){if(row.mode!=='c'||row.challenge!==challenge.id)continue;const uid=row.uids[0],old=best.get(uid);if(!old||row.t>old.t||(row.t===old.t&&row.kills>old.kills))best.set(uid,row);}
    const all=[...best.values()].sort((a,b)=>b.t-a.t||b.kills-a.kills||a.at-b.at).map(r=>({...r,names:r.uids.map(id=>display(store.getUser(id))),online:r.uids.map(connected),playing:r.uids.map(playing)}));
    const mine=all.findIndex(r=>r.uids.includes(user.id)),circle=new Set([user.id,...store.friendRows(user.id).filter(f=>f.status==='ok').map(f=>f.a===user.id?f.b:f.a)]);
    return {challenge,serverNow:clock(),rewards:store.challengeStatus(user,challenge),rows:(url.searchParams.get('friends')==='1'?all.filter(r=>r.uids.some(u=>circle.has(u))):all).slice(0,50),mine:mine<0?null:{pos:mine+1,t:all[mine].t,row:all[mine]}};
  }
  function rankings(user,url){if(url.searchParams.get('mode')==='c')return challengeRankings(user,url);const mode=url.searchParams.get('mode')||'s',period=url.searchParams.get('period')||'a',dex=Number(url.searchParams.get('dex')||0);
    if(!['s','g'].includes(mode)||!['d','w','m','a'].includes(period)||!Number.isInteger(dex)||dex<0||dex>1100)throw error(400,'Invalid leaderboard');
    const now=new Date(clock()),day=Date.UTC(now.getUTCFullYear(),now.getUTCMonth(),now.getUTCDate()),week=day-((now.getUTCDay()+6)%7)*86400e3;
    const since={d:day,w:week,m:Date.UTC(now.getUTCFullYear(),now.getUTCMonth(),1),a:0}[period],best=new Map();
    for(const row of store.scores()){if(row.mode!==mode||row.at<since||(dex&&!row.dex.includes(dex)))continue;const key=row.uids.slice().sort().join('_');if(!best.has(key)||best.get(key).t<row.t)best.set(key,row);}
    const all=[...best.values()].map(r=>({...r,names:r.uids.map(uid=>display(store.getUser(uid))),online:r.uids.map(connected),playing:r.uids.map(playing)})).sort((a,b)=>b.t-a.t||a.at-b.at),mine=all.findIndex(r=>r.uids.includes(user.id));
    const circle=new Set([user.id,...store.friendRows(user.id).filter(f=>f.status==='ok').map(f=>f.a===user.id?f.b:f.a)]);
    return {rows:(url.searchParams.get('friends')==='1'?all.filter(r=>r.uids.some(u=>circle.has(u))):all).slice(0,50),mine:mine<0?null:{pos:mine+1,t:all[mine].t,row:all[mine]}};
  }
  const staticDirs=new Set(['assets','css','js','en','zh','guia','pokedex','legendarios','shinies','tipos','movimientos','objetos','logros','novedades','apoyar','contacto']);
  const staticFiles=new Set(['index.html','sw.js','version.json','manifest.webmanifest','favicon.ico','robots.txt','sitemap.xml','404.html','LICENSE','LICENSE-NONCOMMERCIAL.md','UPSTREAM-NOTICES.md']);
  const mime={'.md':'text/plain; charset=utf-8','.html':'text/html; charset=utf-8','.js':'application/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.png':'image/png','.jpg':'image/jpeg','.ico':'image/x-icon','.ttf':'font/ttf','.woff2':'font/woff2','.json':'application/json','.webmanifest':'application/manifest+json'};
  const server=http.createServer(async(req,res)=>{try{
    const url=new URL(req.url,'http://local');
    if(url.pathname.startsWith('/api/')){
      if(!validOrigin(req))throw error(403,'Origin mismatch');rate('http:'+clientIP(req),600);
      if(req.method==='GET'&&url.pathname==='/api/config')return reply(res,200,{backend:'nas',version:1,registration,protocol:15,operations:operations.read()});
      if(req.method==='GET'&&url.pathname==='/api/operations')return reply(res,200,operations.read());
      if(req.method==='GET'&&url.pathname==='/api/health')return reply(res,200,{ok:true,draining:operations.read().draining,activeRuns:runs.size,activeRooms:[...rooms.values()].filter(r=>!r.open&&r.phase!=='finished').length,ready:operationStatus().ready});
      if(['POST','PUT','DELETE'].includes(req.method)&&!String(req.headers['content-type']).startsWith('application/json'))throw error(415,'JSON required');
      // Player history and restore remain disabled even for old clients.
      if(['/api/history','/api/restore'].includes(url.pathname))throw error(403,'玩家历史存档恢复已关闭。');
      const b=req.method==='GET'?{}:await body(req);
      if(req.method==='POST'&&['/api/register','/api/login'].includes(url.pathname)){
        rate('auth:'+clientIP(req),20,60000);const register=url.pathname==='/api/register';if(register&&!registration)throw error(403,'当前已关闭注册。');
        const u=await store.credentials(b.name,b.password,register);cookie(req,res,store.session(u,req.headers['user-agent']||'浏览器'));return reply(res,200,{user:u,...store.getSave(u.id)});
      }
      const user=userOf(req);if(!user)throw error(401,'请重新登录 NAS 账号。');
      const route=req.method+' '+url.pathname;
      if(route==='POST /api/rtc/turn'){const r=roomFor(user.id),ws=sockets.get(user.id);if(!r||b.room!==r.id||!connected(user.id)||ws.session!==store.sessionId(token(req)))throw error(403,'仅当前房间在线会话可申请连接凭证。');rate('turn:'+user.id,12,60000);try{return reply(res,200,await turnProvider.credentials(user.id,r.id,{refresh:b.refresh===true}));}catch(e){const code=['turn-not-configured','turn-usage-unavailable','turn-budget-exhausted','turn-provider-unavailable'].includes(e.code)?e.code:'turn-provider-unavailable';return reply(res,503,{error:'TURN 备用连接暂不可用。',code});}}
      if(route==='GET /api/rtc/status')return reply(res,200,turnProvider.status());
      if(['PUT /api/save','POST /api/upgrades'].includes(route)&&([...runs.values()].some(r=>r.uid===user.id&&r.challenge)||(roomFor(user.id)?.experiment&&!roomFor(user.id)?.open&&roomFor(user.id)?.phase!=='finished')))throw error(409,'隔离挑战或实验对局不写入普通存档。');
      const owner=sockets.get(user.id);if(['PUT /api/save','POST /api/upgrades','POST /api/run','POST /api/challenges/claim'].includes(route)&&owner?.readyState===WebSocket.OPEN&&owner.session!==store.sessionId(token(req))&&((roomFor(user.id)?.open===false&&roomFor(user.id)?.phase!=='finished')||[...runs.values()].some(r=>r.uid===user.id)))throw error(423,'另一个设备正在对局；请结束该对局或在设备管理中接管。');

      if(['POST /api/room/create','POST /api/room/member','POST /api/invite/accept'].includes(route)&&b.protocol!==15)throw error(409,'请刷新到最新版再开始联机。');
      switch(route){
        case 'GET /api/challenges':{const challenge=selectedChallenge(url.searchParams.get('period')||'d',url.searchParams.get('date'));return reply(res,200,{challenge,rewards:store.challengeStatus(user,challenge),serverNow:clock()});}
        case 'GET /api/challenges/ranking':return reply(res,200,challengeRankings(user,url));
        case 'POST /api/challenges/claim':{rate('challenge-claim:'+user.id,10);if([...runs.values()].some(r=>r.uid===user.id)||(roomFor(user.id)&&!roomFor(user.id).open&&roomFor(user.id).phase!=='finished'))throw error(409,'请结束当前对局后领取挑战奖励。');return reply(res,200,store.claimChallenge(user,selectedChallenge(b.period||'d',b.date)));}
        case 'GET /api/admin/status':if(!operations.admin(user))throw error(403,'仅管理员可查看。');return reply(res,200,operationStatus());
        case 'POST /api/admin/operations':{rate('admin:'+user.id,10);operations.set(user,b);broadcastOperations();return reply(res,200,operationStatus());}
        case 'GET /api/devices':return reply(res,200,{devices:store.devices(user,token(req)),activeHere:sockets.get(user.id)?.session===store.sessionId(token(req)),activeElsewhere:!!sockets.get(user.id)&&sockets.get(user.id).session!==store.sessionId(token(req))});
        case 'POST /api/devices/revoke':{rate('device-auth:'+user.id,10);await store.credentials(user.name,b.password);store.revoke(user,token(req),b.id);const ws=sockets.get(user.id);if(ws&&!store.authenticate(ws.authToken)){ws.close(4003,'Session revoked');leave(user.id);}return reply(res,200,{ok:true});}
        case 'POST /api/devices/takeover':{rate('device-auth:'+user.id,10);await store.credentials(user.name,b.password);const ws=sockets.get(user.id);if(ws&&ws.session!==store.sessionId(token(req))){ws.close(4001,'Explicit device takeover');sockets.delete(user.id);leave(user.id);for(const[k,r]of runs)if(r.uid===user.id)runs.delete(k);}return reply(res,200,{ok:true});}
        case 'POST /api/run/end':{const run=runs.get(b.run);if(run&&run.uid===user.id){runs.delete(b.run);const room=rooms.get(run.room);if(room?.runId===run.id)room.phase='finished';notify();}return reply(res,200,{ok:true});}

        case 'GET /api/session':return reply(res,200,{user,...store.getSave(user.id)});
        case 'POST /api/logout':leave(user.id);sockets.get(user.id)?.close();store.logout(token(req));cookie(req,res,'',true);return reply(res,200,{ok:true});
        case 'POST /api/delete':await store.credentials(user.name,b.password);leave(user.id);sockets.get(user.id)?.close();store.remove(user);cookie(req,res,'',true);return reply(res,200,{ok:true});
        case 'POST /api/upgrades':{if(roomFor(user.id)?.open===false)throw error(409,'请结束联机对局后调整永久强化。');const old=store.getSave(user.id);if(!old.save||b.rev!==old.rev)throw error(409,'存档版本冲突，请刷新后重试。',{current:old});const s=structuredClone(old.save);let result;if(b.op==='bulk'&&Number.isSafeInteger(b.dex)){if(!s.owned[b.dex])throw error(400,'请先拥有这只宝可梦。');result=Upgrades.bulk(s,b.dex);}else if(b.op==='buy'&&Number.isSafeInteger(b.dex)&&Upgrades.BY[b.id])result=Upgrades.purchase(s,b.dex,b.id);else if(b.op==='refund')result=Upgrades.refund(s,b.dex);else throw error(400,'Invalid upgrade operation');return reply(res,200,{...store.putSave(user,s,old.rev),result});}
        case 'GET /api/save':return reply(res,200,store.getSave(user.id));
        case 'PUT /api/save':return reply(res,200,store.putSave(user,b.save,b.rev,b.mutation,b.autoMerge===true));
        case 'POST /api/nickname':{rate('nickname:'+user.id,10);const value=store.nickname(user,b.nick);const r=roomFor(user.id);if(r)r.members=r.members.map(m=>m.uid===user.id?{...m,name:display(value)}:m);notify();return reply(res,200,{user:value});}
        case 'POST /api/announcement':{
          if(user.name.toLowerCase()!=='jyh9521')throw error(403,'仅公告账号可发送。');
          const text=typeof b.text==='string'?b.text.trim().normalize('NFKC'):'';
          if(!text||[...text].length>200||/[\p{Cc}\p{Cf}]/u.test(text))throw error(400,'公告需 1–200 个字符，不能含控制字符。');
          rate('announcement:'+user.id,3,60000);
          const message={id:randomBytes(12).toString('hex'),text,at:clock()};
          let delivered=0;for(const uid of sockets.keys())if(connected(uid)){send(uid,{type:'announcement',data:message});delivered++;}
          return reply(res,200,{ok:true,delivered});
        }
        case 'GET /api/social':return reply(res,200,social(user));
        case 'POST /api/friends/request':case 'POST /api/friends/accept':case 'POST /api/friends/remove':throw error(410,'好友功能已由在线大厅替代，请刷新客户端。');
        case 'POST /api/room/create':{guardStart();leave(user.id);const r={id:randomBytes(12).toString('hex'),host:user.id,experiment:false,open:true,members:[member(user)]};rooms.set(r.id,r);notify();return reply(res,200,{ok:true,room:r.id});}
        case 'POST /api/room/leave':leave(user.id);return reply(res,200,{ok:true});
        case 'POST /api/room/member':{const r=roomFor(user.id);if(r&&r.open)r.members=r.members.map(m=>{if(m.uid!==user.id)return m;const next=member(user);return next.dex===m.dex&&next.shiny===m.shiny?{...m,name:next.name}:next;});notify();return reply(res,200,{ok:true});}
        case 'POST /api/room/ready':{const r=roomFor(user.id);if(!r||!r.open||!connected(user.id))throw error(409,'房间不是等待状态。');const m=r.members.find(m=>m.uid===user.id),n=member(user);if(m.dex!==n.dex||m.shiny!==n.shiny){r.members.forEach(x=>x.ready=false);Object.assign(m,n);}m.ready=!!b.ready;notify();return reply(res,200,{ok:true});}
        case 'GET /api/run/authority':{const r=roomFor(user.id),run=r&&runs.get(r.runId);if(!run||r.host!==user.id||run.uid!==user.id)throw error(403,'Not authority');return reply(res,200,{id:run.id});}
        case 'POST /api/room/handoff-begin':{const r=roomFor(user.id);if(!r||r.host!==user.id||r.phase!=='running'||!r.members.some(m=>m.uid===b.uid&&m.uid!==user.id)||!connected(b.uid)||! /^[a-f0-9]{32}$/.test(b.nonce||''))throw error(409,'Invalid handoff preparation');r.transfer={to:b.uid,nonce:b.nonce,epoch:r.epoch||0,at:clock()};delete r.handoff;notify();return reply(res,200,{ok:true});}
        case 'POST /api/room/handoff-abort':{const r=roomFor(user.id);if(r?.host===user.id&&r.transfer?.nonce===b.nonce){delete r.transfer;delete r.handoff;notify();}return reply(res,200,{ok:true});}
        case 'POST /api/room/handoff-ready':{const r=roomFor(user.id);if(!r||r.open||r.host===user.id||r.transfer?.to!==user.id||r.transfer?.nonce!==b.nonce||clock()-r.transfer.at>20000||!r.members.some(m=>m.uid===user.id)||b.epoch!==(r.epoch||0)||! /^[a-f0-9]{32}$/.test(b.nonce||''))throw error(409,'Invalid handoff receipt');r.handoff={to:user.id,nonce:b.nonce,epoch:b.epoch,at:clock()};return reply(res,200,{ok:true});}
        case 'POST /api/room/transfer':{const r=roomFor(user.id);if(!r||r.host!==user.id||b.uid===user.id||!r.members.some(m=>m.uid===b.uid)||!connected(b.uid))throw error(409,'仅房主可转交给在线队友。');if(!r.open){const h=r.handoff;if(r.phase!=='running'||!h||h.to!==b.uid||h.nonce!==b.nonce||h.epoch!==(r.epoch||0)||clock()-h.at>15000)throw error(409,'请先完成 P2P 主机状态交接。');const run=runs.get(r.runId);if(!run||run.uid!==user.id)throw error(409,'本局凭证不匹配。');run.uid=b.uid;run.seen=clock();}r.host=b.uid;r.epoch=(r.epoch||0)+1;delete r.handoff;delete r.transfer;r.members.forEach(m=>m.ready=false);notify();return reply(res,200,{ok:true});}
        case 'POST /api/room/open':{if(!b.open)guardStart();const r=roomFor(user.id);if(!r||r.host!==user.id)throw error(403,'仅房主可操作。');if(!b.open&&(r.members.length<2||r.members.some(m=>!m.ready||!connected(m.uid))))throw error(409,'所有玩家准备并在线后才能开始。');r.open=!!b.open;r.phase=r.open?'lobby':'starting';if(r.open)r.members.forEach(m=>m.ready=false);notify();return reply(res,200,{ok:true});}
        case 'POST /api/invite':{const r=roomFor(user.id);if(!r||!r.open||r.phase==='running')throw error(403,'请先进入开放房间。');if(b.uid===user.id||!connected(b.uid))throw error(409,'玩家当前不在线。');if(playing(b.uid))throw error(409,'玩家正在游戏中。');if(r.members.some(m=>m.uid===b.uid))throw error(409,'玩家已在房间。');rate('invite:'+user.id,20);rate('invite-pair:'+user.id+':'+b.uid,1,3000);if(r.members.length>=Rules.capacity(r))throw error(409,'房间已满。');invites.set(b.uid+'_'+user.id,{to:b.uid,from:user.id,name:display(user),room:r.id,at:clock()});notify();return reply(res,200,{ok:true,msg:'邀请已发送。'});}
        case 'POST /api/invite/accept':{const i=invites.get(user.id+'_'+b.uid),r=i&&rooms.get(i.room);if(!i||clock()-i.at>180e3||!r||!r.open||!r.members.some(m=>m.uid===i.from)||r.members.length>=Rules.capacity(r)||playing(user.id)||!connected(i.from))throw error(409,'邀请已失效、玩家正在游戏中或房间已满。');leave(user.id);r.members.push(member(user));r.members.forEach(m=>m.ready=false);invites.delete(user.id+'_'+b.uid);notify();return reply(res,200,{ok:true});}
        case 'POST /api/invite/decline':invites.delete(user.id+'_'+b.uid);notify();return reply(res,200,{ok:true});
        case 'GET /api/profile':{const uid=url.searchParams.get('uid')||user.id,u=store.getUser(uid),s=store.getSave(uid).save;if(!u||!s)return reply(res,200,{profile:null});return reply(res,200,{profile:{uid,online:connected(uid),play:playing(uid),friendStatus:uid===user.id?'self':(store.friendRows(user.id).find(f=>f.a===uid||f.b===uid)?.status||'none'),name:display(u),favs:s.profile?.favs||[],title:s.profile?.title||'',best:{solo:s.stats.bestTime||0,group:s.stats.bestGroupTime||0,level:s.stats.bestLevel||0,kills:s.stats.totalKills||0,bosses:s.stats.bossesTotal||0,legends:Object.keys(s.legends||{}).length,medals:Object.keys(s.ach||{}).length},medals:Object.keys(s.ach||{}).slice(0,8)}});}
        case 'POST /api/run':return reply(res,200,startRun(user,b.mode,b.challenge));
        case 'POST /api/score':return reply(res,200,submit(user,b));
        case 'GET /api/ranking':return reply(res,200,rankings(user,url));
        case 'POST /api/report':if(typeof b.id!=='string'||b.id.length>200)throw error(400,'Invalid report');store.db.prepare('INSERT OR IGNORE INTO reports VALUES(?,?,?)').run(user.id,b.id,clock());return reply(res,200,{ok:true});
        default:throw error(404,'接口不存在。');
      }
    }
    if(!['GET','HEAD'].includes(req.method))throw error(405,'Method not allowed');
    let f=path.resolve(root,'.'+decodeURIComponent(url.pathname)),rel=path.relative(root,f).split(path.sep);
    if((f!==root&&!f.startsWith(root+path.sep))||rel.some(p=>p.startsWith('.'))||(f!==root&&!staticDirs.has(rel[0])&&!staticFiles.has(rel.join('/'))))throw error(403,'Forbidden');
    if(fs.statSync(f).isDirectory())f=path.join(f,'index.html');const real=fs.realpathSync(f);if(!real.startsWith(fs.realpathSync(root)+path.sep))throw error(403,'Forbidden');
    await serveStatic(req,res,f,mime[path.extname(f)]||'application/octet-stream',url);
  }catch(e){if(!res.headersSent)reply(res,e.status||404,{error:e.status?e.message:'Not found',...(e.current?{current:e.current}:{})});else res.destroy();}});
  const wss=new WebSocketServer({noServer:true,maxPayload:256*1024,perMessageDeflate:false});
  server.requestTimeout=15000;server.headersTimeout=10000;server.keepAliveTimeout=5000;server.maxHeadersCount=100;
  server.on('upgrade',(req,socket,head)=>{try{if(new URL(req.url,'http://local').pathname!=='/api/ws'||!validOrigin(req))throw error(403,'Forbidden');const u=userOf(req);if(!u)throw error(401,'Unauthorized');rate('ws:'+u.id,10);wss.handleUpgrade(req,socket,head,ws=>{ws.authToken=token(req);ws.session=store.sessionId(ws.authToken);wss.emit('connection',ws,u);});}catch{socket.write('HTTP/1.1 403 Forbidden\r\nConnection: close\r\n\r\n');socket.destroy();}});
  wss.on('connection',(ws,user)=>{ws.on('error',()=>ws.terminate());const occupied=sockets.get(user.id);if(occupied?.readyState===WebSocket.OPEN&&occupied.session!==ws.session&&((roomFor(user.id)?.open===false&&roomFor(user.id)?.phase!=='finished')||[...runs.values()].some(r=>r.uid===user.id))){ws.close(4002,'Game active on another device');return;}clearTimeout(departures.get(user.id));departures.delete(user.id);flows.set(ws,createFlow({hardLimit:2*1024*1024,closeCode:1013}));const old=sockets.get(user.id);sockets.set(user.id,ws);old?.close(4001,'Another device connected');ws.alive=true;ws.on('pong',()=>ws.alive=true);notify();send(user.id,{type:'operations',data:operations.read()});
    ws.on('message',data=>{if(closing)return;if(sockets.get(user.id)!==ws||!store.authenticate(ws.authToken)){ws.close(4003,'Session revoked or replaced');return;}try{for(const run of runs.values())if(run.uid===user.id)run.seen=clock();rate('packet:'+user.id,Rules.packetBudget(roomFor(user.id)),1000);const msg=JSON.parse(data);if(msg.type==='ping'){if(typeof msg.id!=='string'||! /^[a-z0-9-]{1,40}$/i.test(msg.id))throw error(400,'Invalid probe');send(user.id,{type:'pong',id:msg.id,buffered:ws.bufferedAmount});return;}if(msg.type==='social'){if(msg.client!==undefined){if(typeof msg.client!=='string'||!/^[a-f0-9]{32}$/.test(msg.client))throw error(400,'Invalid client');const old=clients.get(user.id);if(old&&old!==msg.client)leave(user.id);clients.set(user.id,msg.client);}send(user.id,{type:'social',data:social(user)});return;}
      if(msg.type!=='relay')return;const r=roomFor(user.id);if(!r||!msg.data||typeof msg.data!=='object')throw error(403,'No room');
      if((msg.epoch||0)<(r.epoch||0))return;if((msg.epoch||0)!==(r.epoch||0))throw error(403,'Invalid room epoch');
      if(user.id!==r.host&&msg.to!==r.host&&!(msg.data.k==='rtc-signal'&&r.transfer&&clock()-r.transfer.at<20000&&(user.id===r.transfer.to||msg.to===r.transfer.to)))throw error(403,'Guests only send to host');
      if(!r.members.some(m=>m.uid===msg.to))throw error(403,'Peer outside room');
      if(msg.data.k==='rtc-signal'){rate('signal:'+user.id,120,10000);const s=msg.data;if(typeof s.attempt!=='string'||s.attempt.length>64||!['offer','answer','candidate','retry'].includes(s.kind)||((s.kind==='offer'||s.kind==='answer')&&(typeof s.sdp!=='string'||s.sdp.length>20000))||s.transport!==undefined&&!['direct','turn'].includes(s.transport)||(s.kind==='offer'&&user.id!==r.host&&user.id!==r.transfer?.to)||(s.kind==='answer'&&(user.id===r.host||user.id===r.transfer?.to&&msg.to!==r.host))||(s.kind==='candidate'&&(!s.candidate||typeof s.candidate.candidate!=='string'||s.candidate.candidate.length>2048)))throw error(400,'Invalid signalling');}
      if(!['rtc-signal','start'].includes(msg.data.k))throw error(403,'Gameplay requires P2P; NAS is signalling only');
      if(msg.data.k==='start'){if(user.id!==r.host||r.open||r.members.length<2||r.phase==='finished')throw error(403,'Invalid start');if(operations.read().draining&&r.phase!=='running')guardStart();msg.data={k:'start',seed:Math.floor(Number(msg.data.seed)||0),host:r.host,members:r.members,experiment:r.experiment===true};}
      send(msg.to,{type:'relay',from:user.id,data:msg.data});
    }catch(e){ws.close(e.status===429?1008:1008,'Invalid packet');}});
    ws.on('close',()=>{if(sockets.get(user.id)!==ws)return;sockets.delete(user.id);const lostRoom=roomFor(user.id);if(lostRoom?.open)lostRoom.members.forEach(m=>m.ready=false);if(closing)return;if(roomFor(user.id))departures.set(user.id,setTimeout(()=>{departures.delete(user.id);if(!connected(user.id)){leave(user.id);clients.delete(user.id);}},reconnectMs));else if(!roomFor(user.id))clients.delete(user.id);notify();});
  });
  const drainTimer=setInterval(()=>{for(const[uid,ws]of sockets)flows.get(ws)?.drain(ws,(_v,from,scope)=>{const room=roomFor(uid);return !!room&&room.id===scope&&room.members.some(m=>m.uid===from);});},50);drainTimer.unref();
  const timer=setInterval(()=>{turnProvider.prune?.();for(const ws of sockets.values()){if(!ws.alive){ws.terminate();continue;}ws.alive=false;ws.ping();}for(const[k,r]of runs)if(clock()-r.at>7500e3||(!connected(r.uid)&&clock()-(r.seen||r.at)>90000))runs.delete(k);for(const[k,i]of invites)if(clock()-i.at>180e3)invites.delete(k);for(const[k,r]of limits)if(clock()-r.at>3600e3)limits.delete(k);},30000);timer.unref();
  return {server,store,rooms,operationStatus,async close(){closing=true;clearInterval(timer);clearInterval(drainTimer);for(const t of departures.values())clearTimeout(t);departures.clear();for(const ws of sockets.values())ws.terminate();await new Promise(r=>server.close(r));await new Promise(r=>wss.close(r));store.close();}};
}
module.exports={createApp};
