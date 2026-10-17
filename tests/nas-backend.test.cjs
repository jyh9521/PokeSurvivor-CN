const {test}=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const {WebSocket}=require('ws'),{createApp}=require('../server/app.cjs');
const {validateSave}=require('../server/store.cjs');
const {DatabaseSync,backup}=require('node:sqlite');
const seed=name=>({v:3,name,coins:500,owned:{1:{at:1,from:'starter'}},shiny:{},partner:1,partnerShiny:false,pupg:{},stats:{runs:0,bestTime:0},tickets:{t1:0,t10:0},profile:{favs:[],title:''},ach:{},legends:{}});
async function fixture(t){const dir=fs.mkdtempSync(path.join(os.tmpdir(),'ps-nas-test-'));let app=createApp({dataDir:dir,campaigns:[],reconnectMs:100});await new Promise(r=>app.server.listen(0,'127.0.0.1',r));let base='http://127.0.0.1:'+app.server.address().port;
  t.after(async()=>{await app.close();const p=path.resolve(dir);if(p.startsWith(path.join(path.resolve(os.tmpdir()),'ps-nas-test-')))fs.rmSync(p,{recursive:true,force:true});});
  const cookies=new Map();
  async function call(url,b,cookie='',method=b?'POST':'GET',origin=base){if(url==='room/open'&&b?.open===false){for(const r of app.rooms.values())for(const m of r.members)if(cookies.has(m.uid))await call('room/ready',{ready:true},cookies.get(m.uid));}const r=await fetch(base+'/api/'+url,{method,headers:{...(b?{'content-type':'application/json'}:{}),cookie,origin},body:b?JSON.stringify({...b,protocol:17}):undefined});return {status:r.status,data:await r.json(),cookie:r.headers.get('set-cookie')?.split(';')[0]||cookie};}
  const account=async name=>{const r=await call('register',{name,password:'local-test-password'});assert.equal(r.status,200);cookies.set(r.data.user.id,r.cookie);return r;};
    return {get app(){return app;},get base(){return base;},dataDir:dir,call,account,async restart(){await app.close();app=createApp({dataDir:dir,campaigns:[],reconnectMs:100});await new Promise(r=>app.server.listen(0,'127.0.0.1',r));base='http://127.0.0.1:'+app.server.address().port;}};
}
test('real account cookies, dual-save revisions, conflicts, histories and restart persistence',async t=>{
  const f=await fixture(t),a=await f.account('Alice'),b=await f.account('Bob');
  assert.match(a.cookie,/^ps_nas=/);assert.equal((await f.call('session')).status,401);
  assert.equal((await f.call('login',{name:'Alice',password:'incorrect-password'})).status,401);
  assert.equal((await f.call('register',{name:'ALICE',password:'local-test-password'})).status,409);
  assert.equal((await f.call('register',{name:'NIÑO',password:'local-test-password'})).status,200);
  assert.equal((await f.call('register',{name:'niño',password:'local-test-password'})).status,409);
  const s=seed('Alice'),one=await f.call('save',{rev:0,save:s},a.cookie,'PUT');assert.equal(one.data.rev,1);
  const duplicate=await f.call('save',{rev:1,save:s,mutation:'a'.repeat(32)},a.cookie,'PUT');assert.equal(duplicate.data.rev,2);
  assert.equal((await f.call('save',{rev:1,save:s,mutation:'a'.repeat(32)},a.cookie,'PUT')).data.rev,2);
  assert.equal((await f.call('save',{rev:1,save:{...s,coins:800},mutation:'a'.repeat(32)},a.cookie,'PUT')).status,400);
  assert.equal((await f.call('save',undefined,b.cookie)).data.save,null);
  s.coins=450;assert.equal((await f.call('save',{rev:2,save:s},a.cookie,'PUT')).data.rev,3);
  s.coins=999;const conflict=await f.call('save',{rev:1,save:s},a.cookie,'PUT');assert.equal(conflict.status,409);assert.equal(conflict.data.current.save.coins,450);
  assert.equal((await f.call('history',undefined,a.cookie)).status,403);assert.equal(f.app.store.history(a.data.user.id)[0].rev,2);
  assert.equal((await f.call('restore',{revision:1,rev:3},a.cookie)).status,403);
  await f.restart();assert.equal((await f.call('session',undefined,a.cookie)).data.save.coins,450);
  const snap=path.join(f.dataDir,'backup.sqlite');await backup(f.app.store.db,snap);const copy=new DatabaseSync(snap,{readOnly:true});assert.equal(JSON.parse(copy.prepare('SELECT data FROM saves WHERE uid=?').get(a.data.user.id).data).coins,450);copy.close();
  assert.equal((await f.call('save',{rev:3,save:{...seed('Alice'),coins:-1}},a.cookie,'PUT')).status,400);
  assert.equal((await f.call('save',{rev:3,save:seed('Alice')},a.cookie,'PUT','https://foreign.example')).status,403);
  const proto=JSON.parse(JSON.stringify(seed('Alice')).replace('"pupg":{}','"pupg":{"__proto__":{"polluted":true}}'));
  assert.throws(()=>validateSave(proto,'Alice'),/Invalid save key/);
  assert.equal((await f.call('delete',{password:'wrong-password'},a.cookie)).status,401);
  assert.equal((await f.call('delete',{password:'local-test-password'},a.cookie)).status,200);
  assert.equal((await f.call('session',undefined,a.cookie)).status,401);
});
test('retired friend actions, hall invitations, real WebSocket relay and room authorization',async t=>{
  const f=await fixture(t),a=await f.account('Alice'),b=await f.account('Bob'),c=await f.account('Charlie');
  for(const u of [a,b,c])assert.equal((await f.call('save',{rev:0,save:seed(u.data.user.name)},u.cookie,'PUT')).status,200);
  assert.equal((await f.call('friends/request',{name:'Bob'},a.cookie)).status,410);assert.equal((await f.call('friends/accept',{uid:b.data.user.id},a.cookie)).status,410);assert.equal((await f.call('friends/remove',{uid:b.data.user.id},a.cookie)).status,410);
  const open=async u=>{const ws=new WebSocket(f.base.replace('http:','ws:')+'/api/ws',{headers:{cookie:u.cookie,origin:f.base}});await new Promise((r,j)=>{ws.once('open',r);ws.once('error',j);});t.after(()=>ws.terminate());return ws;};
  const wa=await open(a),wb=await open(b),wc=await open(c);
  await f.call('room/create',{},a.cookie);assert.equal((await f.call('invite',{uid:c.data.user.id},a.cookie)).status,200);
  await f.call('invite',{uid:b.data.user.id},a.cookie);assert.equal((await f.call('invite/accept',{uid:c.data.user.id},b.cookie)).status,409);
  await f.call('invite/accept',{uid:a.data.user.id},b.cookie);
  const room=(await f.call('social',undefined,a.cookie)).data.room;assert.equal(room.members.length,2);
  assert.equal((await f.call('room/open',{open:false},b.cookie)).status,403);
  await f.call('room/open',{open:false},a.cookie);
  const received=new Promise(r=>wb.on('message',x=>{const v=JSON.parse(x);if(v.type==='relay')r(v);}));
  wa.send(JSON.stringify({type:'relay',to:b.data.user.id,data:{k:'start',seed:42,host:'spoofed',members:[]}}));
  const msg=await received;assert.equal(msg.from,a.data.user.id);assert.equal(msg.data.host,a.data.user.id);assert.equal(msg.data.members.length,2);
  const closed=new Promise(r=>wc.once('close',r));wc.send(JSON.stringify({type:'relay',to:a.data.user.id,data:{k:'f'}}));assert.equal(await closed,1008);
  wa.terminate();await new Promise(r=>setTimeout(r,30));const retained=(await f.call('social',undefined,b.cookie)).data.room;assert.equal(retained.id,room.id);assert.equal(retained.members.find(m=>m.uid===a.data.user.id).connected,false);await new Promise(r=>setTimeout(r,150));assert.equal((await f.call('social',undefined,b.cookie)).data.room,null);
});
test('leaderboard uses authenticated run and server identity, rejects replay and fake elapsed time',async t=>{
  const f=await fixture(t),a=await f.account('Alice');await f.call('save',{rev:0,save:seed('Alice')},a.cookie,'PUT');
  const run=(await f.call('run',{mode:'s'},a.cookie)).data.id;
  assert.equal((await f.call('score',{mode:'s',run,mark:{t:9999,lv:1,kills:0}},a.cookie)).status,400);
  await new Promise(r=>setTimeout(r,1100));
  const score=await f.call('score',{mode:'s',run,mark:{t:1,lv:2,kills:3,names:['Injected']}},a.cookie);assert.equal(score.status,200);
  assert.equal((await f.call('score',{mode:'s',run,mark:{t:1,lv:2,kills:3}},a.cookie)).status,403);
  const rows=(await f.call('ranking?mode=s&period=a&dex=1',undefined,a.cookie)).data.rows;assert.equal(rows.length,1);assert.deepEqual(rows[0].names,['Alice']);
  assert.equal((await f.call('ranking?mode=bad',undefined,a.cookie)).status,400);
  assert.equal((await f.call('report',{id:score.data.id},a.cookie)).status,200);
});
test('NAS room enforces eight-player capacity',async t=>{
  const f=await fixture(t),users=[];for(const name of ['Alice','Bob','Charlie','Dora','Evan','Frank','Grace','Helen','Ivan']){const u=await f.account(name);await f.call('save',{rev:0,save:seed(name)},u.cookie,'PUT');users.push(u);}
  const host=users[0];for(const u of users.slice(1)){await f.call('friends/request',{name:u.data.user.name},host.cookie);await f.call('friends/accept',{uid:host.data.user.id},u.cookie);}
  for(const u of users){const ws=new WebSocket(f.base.replace('http:','ws:')+'/api/ws',{headers:{cookie:u.cookie,origin:f.base}});await new Promise((r,j)=>{ws.once('open',r);ws.once('error',j);});t.after(()=>ws.terminate());}
  await f.call('room/create',{},host.cookie);
  for(const u of users.slice(1,8)){assert.equal((await f.call('invite',{uid:u.data.user.id},host.cookie)).status,200);assert.equal((await f.call('invite/accept',{uid:host.data.user.id},u.cookie)).status,200);}
  assert.equal((await f.call('social',undefined,host.cookie)).data.room.members.length,8);
  assert.equal((await f.call('invite',{uid:users[8].data.user.id},host.cookie)).status,409);
});

test('public release disables history APIs and protects deployment files',async t=>{
 const f=await fixture(t),a=await f.account('PublicAlice');
 assert.equal((await f.call('save',{rev:0,save:seed('PublicAlice')},a.cookie,'PUT')).status,200);
 for(const cookie of ['',a.cookie]){assert.equal((await f.call('history',undefined,cookie)).status,403);assert.equal((await f.call('restore',{revision:1,rev:1},cookie)).status,403);}
 assert.equal((await f.call('save',undefined,a.cookie)).data.rev,1);
 for(const url of ['/dev.html','/.env','/server/store.cjs','/data/pokesurvivor.sqlite'])assert.equal((await fetch(f.base+url)).status,403);
 const dex=await (await fetch(f.base+'/pokedex/')).text();assert.ok(dex.includes('账号与存档状态请在游戏内'));assert.ok(!dex.includes('云存档、联机和在线排行未启用'));
});

test('authenticated diagnostic ping works without a room and exposes only queue size',async t=>{
 const f=await fixture(t),a=await f.account('ProbeUser');const ws=new WebSocket(f.base.replace('http:','ws:')+'/api/ws',{headers:{cookie:a.cookie,origin:f.base}});t.after(()=>ws.terminate());
 await new Promise((r,j)=>{ws.once('open',r);ws.once('error',j);});
 const reply=new Promise((r,j)=>{const timer=setTimeout(()=>j(Error('No diagnostic pong')),500);ws.on('message',raw=>{const value=JSON.parse(raw);if(value.type==='pong'){clearTimeout(timer);r(value);}});});
 ws.send(JSON.stringify({type:'ping',id:'diagnostic-1'}));const value=await reply;assert.equal(value.id,'diagnostic-1');assert.equal(typeof value.buffered,'number');assert.deepEqual(Object.keys(value).sort(),['buffered','id','type']);
});
