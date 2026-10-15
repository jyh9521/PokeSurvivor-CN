/* Actual two-browser NAS gameplay, no Firebase/config/socket mocks.
 * Serve the source entry as index.html in an isolated test root; public dev.html stays blocked. */
const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),assert=require('node:assert/strict');
const {chromium}=require('playwright'),{createApp}=require('../server/app.cjs');
const ROOT=path.resolve(__dirname,'..'),OUT=path.join(ROOT,'artifacts/selfhost-verification');
fs.mkdirSync(OUT,{recursive:true});
(async()=>{
  const dataDir=fs.mkdtempSync(path.join(os.tmpdir(),'ps-nas-browser-')),root=path.join(dataDir,'web');fs.mkdirSync(root);for(const name of ['js','css','assets'])fs.cpSync(path.join(ROOT,name),path.join(root,name),{recursive:true});for(const name of ['manifest.webmanifest','sw.js','version.json'])fs.copyFileSync(path.join(ROOT,name),path.join(root,name));fs.copyFileSync(path.join(ROOT,'dev.html'),path.join(root,'index.html'));const app=createApp({dataDir,root});let browser;
  const checks=[],errors=[],external=[];
  const check=(name,condition)=>{assert.ok(condition,name);checks.push(name);console.log('PASS',name);};
  try{
    await new Promise(r=>app.server.listen(0,'127.0.0.1',r));const origin='http://127.0.0.1:'+app.server.address().port;
    browser=await chromium.launch({headless:true,channel:'chrome'});
    const context=async()=>{const c=await browser.newContext({locale:'zh-CN',viewport:process.env.PS_PORTRAIT==='1'?{width:390,height:844}:{width:1280,height:800},hasTouch:process.env.PS_PORTRAIT==='1',isMobile:process.env.PS_PORTRAIT==='1',serviceWorkers:'block'});await c.addInitScript(()=>{window.RTCPeerConnection=undefined;});await c.route('**/*',route=>{const u=new URL(route.request().url());if(u.origin!==origin&&/^https?:$/.test(u.protocol)){external.push(u.href);return route.abort();}return route.continue();});return c;};
    const ca=await context(),cb=await context();
    const open=async c=>{const p=await c.newPage();p.on('pageerror',e=>errors.push(e.message));p.on('dialog',d=>d.accept());await p.goto(origin+'/');await p.waitForFunction(()=>G.NAS.enabled&&document.getElementById('boot').classList.contains('hidden'));if(await p.locator('#tap-start').isVisible())await p.locator('#tap-start').click();return p;};
    const a=await open(ca),b=await open(cb);
    async function signup(p,name){await p.locator('[data-tab="register"]').click();await p.locator('#f-user').fill(name);await p.locator('#f-pass').fill('nas-browser-password');await p.locator('#btn-auth').click();await p.locator('#scr-test').waitFor({state:'visible'});for(let i=0;i<30&&await p.locator('#scr-test').isVisible();i++)await p.locator('#test-a .answer').first().click();await p.locator('#res-other').click();await p.locator('#starter-grid .cell').filter({hasText:'妙蛙种子'}).click();await p.locator('#starter-ok').click();await p.locator('#scr-menu').waitFor({state:'visible'});await p.evaluate(()=>G.NAS.flush());}
    await signup(a,'NasAlice');await signup(b,'NasBob');
    const uid=await a.evaluate(()=>G.NAS.user.id),bid=await b.evaluate(()=>G.NAS.user.id);
    check('NAS authentication enabled; online menus reachable',await a.evaluate(()=>G.DB.mode==='nas'&&G.DB.online)&&await a.locator('[data-go="friends"]').isVisible());
    const envelope=await a.evaluate(()=>JSON.parse(localStorage.getItem('ps.nas.save.'+G.NAS.user.id)));
    check('new account gift persists in browser and NAS exactly once',envelope.save.coins===1000600&&envelope.save.serverRewards.length===1&&app.store.db.prepare('SELECT COUNT(*) AS n FROM reward_receipts WHERE uid=?').get(uid).n===1);
    // Simulate an old offline copy lacking the server gift, then select that copy.
    const grantedBalance=await a.evaluate(()=>G.DB.save.coins);
    await a.evaluate(()=>{G.DB.save.serverRewards=[];G.DB.save.coins-=1000013;G.DB.commit();return G.NAS.flush();});
    check('old browser cannot overwrite a credited gift',await a.evaluate(()=>!!G.NAS.conflict)&&app.store.getSave(uid).save.coins===grantedBalance);
    await a.evaluate(()=>G.NAS.resolve('browser'));
    check('browser conflict choice preserves offline spending and adds missing gift only once',await a.evaluate(()=>G.DB.save.coins)===grantedBalance-13&&app.store.getSave(uid).save.coins===grantedBalance-13);
    await a.evaluate(()=>{G.DB.commit();return G.NAS.flush();});
    check('repeated save never repeats the gift',app.store.getSave(uid).save.coins===grantedBalance-13);
    check('real browser + SQLite contain matching starter',envelope.save.partner===1&&app.store.getSave(uid).save.partner===1&&(await a.evaluate(()=>JSON.parse(localStorage.getItem('ps.nas.save.'+G.NAS.user.id)).rev))===app.store.getSave(uid).rev);
    await a.locator('[data-go="upgrades"]').click();await a.locator('#upg-list [data-buy]:not([disabled])').first().click();await a.evaluate(()=>G.NAS.flush());await a.locator('.scr:not(.hidden) [data-back]').first().click();
    check('purchase reaches both copies',Object.values(app.store.getSave(uid).save.pupg[1]).some(x=>x>0));
    // A second device retrieves the actual NAS snapshot through its own cookie.
    const cc=await context(),c=await open(cc);await c.locator('#f-user').fill('NasAlice');await c.locator('#f-pass').fill('nas-browser-password');await c.locator('#btn-auth').click();await c.locator('#scr-menu').waitFor({state:'visible'});
    check('second browser restores NAS progress',await c.evaluate(()=>G.DB.save.partner===1&&Object.values(G.DB.save.pupg[1]).some(x=>x>0)));
    // Force a genuine revision collision; do not merge spendable currency with max().
    await c.evaluate(()=>{G.DB.save.coins-=7;G.DB.commit();return G.NAS.flush();});
    await a.evaluate(()=>{G.DB.save.coins-=11;G.DB.commit();return G.NAS.flush();});
    check('concurrent update retains both versions instead of overwriting',await a.evaluate(()=>!!G.NAS.conflict)&&app.store.getSave(uid).save.coins===(await c.evaluate(()=>G.DB.save.coins)));
    await a.locator('#btn-settings').click();await a.locator('#set-tabs [data-t="acc"]').click();
    check('conflict resolution exposed in account UI',await a.locator('[data-nas="nas"]').isVisible());await a.locator('[data-nas="nas"]').click();await a.locator('#set-close').click();
    check('explicit NAS resolution keeps coin balance exact',await a.evaluate(()=>G.DB.save.coins)==app.store.getSave(uid).save.coins);
    await cc.close();await a.reload();await a.waitForFunction(()=>G.NAS.user&&document.getElementById('boot').classList.contains('hidden'));if(await a.locator('#tap-start').isVisible())await a.locator('#tap-start').click();
    // Offline writes persist first. A genuine failed API request exercises the retry path.
    await ca.route('**/api/save',r=>r.abort());
    await a.evaluate(()=>{G.DB.save.coins-=3;G.DB.commit();return G.NAS.flush();});
    check('offline progress stays in browser with pending sync',await a.evaluate(()=>G.NAS.pending&&JSON.parse(localStorage.getItem('ps.nas.save.'+G.NAS.user.id)).pending));
    await ca.unroute('**/api/save');await a.evaluate(()=>G.NAS.flush());
    check('reconnected progress reaches NAS',!(await a.evaluate(()=>G.NAS.pending))&&app.store.getSave(uid).save.coins===await a.evaluate(()=>G.DB.save.coins));
    // Real friendship and invitation, through the same interfaces used by the menus.
    const req=await a.evaluate(()=>G.Social.request('NasBob'));check('friend request persisted',req.ok);
    await b.waitForFunction(()=>G.Social.friends.some(f=>f.status==='in'));await b.evaluate(id=>G.Social.accept(id),uid);
    await a.waitForFunction(()=>G.Social.friends.some(f=>f.status==='ok'));
    await a.locator('[data-go="friends"]').click();const invite=await a.evaluate(id=>G.Social.invite(id),bid);check('live invite sent',invite.ok);
    await b.locator('#inv-yes').waitFor({state:'visible'});await b.locator('#inv-yes').click();await b.locator('#scr-lobby').waitFor({state:'visible'});
    await a.evaluate(()=>G.LobbyUI.open());await a.locator('#lobby-start').waitFor({state:'visible'});
    await a.waitForFunction(()=>G.Social.room.members.length===2);await a.evaluate(()=>G.Social.setReady(true));await b.evaluate(()=>G.Social.setReady(true));await a.locator('#lobby-start').click();
    await a.waitForFunction(()=>G.Game.state==='playing'&&G.Coop.active);await b.waitForFunction(()=>G.Game.state==='playing'&&G.Coop.active);
    check('two real game instances enter shared NAS-relayed run',await a.evaluate(()=>G.Coop.isHost&&G.Coop.puppets().length===1)&&await b.evaluate(()=>!G.Coop.isHost&&G.Coop.puppets().length===1));
    if(process.env.PS_PORTRAIT==='1'){
      await b.evaluate(()=>{window.__rotatedPlayer=G.Game.player;window.__rotatedRoom=G.Social.room.id;});
      await b.setViewportSize({width:844,height:390});await b.waitForTimeout(200);await b.setViewportSize({width:390,height:844});await b.waitForTimeout(200);
      check('portrait co-op rotation keeps player, room and running state',await b.evaluate(()=>G.Game.player===window.__rotatedPlayer&&G.Social.room.id===window.__rotatedRoom&&G.Game.state==='playing'));
      await b.evaluate(()=>G.TeamUI.update());check('portrait team shortcuts fit screen with touch-sized targets',await b.locator('.team-actions button').evaluateAll(items=>items.every(el=>{const r=el.getBoundingClientRect();return r.left>=0&&r.right<=innerWidth&&r.height>=38;})));
    }
    await a.waitForFunction(()=>G.Net.stats().nasRttMs!=null&&G.Net.stats().peerRttMs!=null&&G.Net.stats().sendHz>=10&&G.Net.stats().receiveHz>=10);
    await a.waitForTimeout(2200);
    const network=await a.evaluate(()=>G.Net.stats());fs.writeFileSync('artifacts/relay-diagnostics/real-room-metrics.json',JSON.stringify(network,null,2));
    check('healthy room sends and receives near 15 Hz rather than 3 Hz',network.targetHz===15&&network.sendHz>=12&&network.receiveHz>=12);
    check('real peer probe traverses the NAS relay in both directions',network.peerRttMs!=null&&network.nasRttMs!=null&&network.fps>0);
    await a.locator('#nas-network-toggle').click();await a.screenshot({path:path.resolve('artifacts/relay-diagnostics/room-diagnostics.png')});await a.locator('[data-network-close]').click();
    const prior=await a.evaluate(()=>G.Coop.puppets()[0].x);
    if(process.env.PS_CLICK_MOVE==='1'){
      const goal=await b.evaluate(()=>{const pl=G.Game.player;for(const [dx,dy]of [[120,0],[-120,0],[90,60],[-90,-60]]){const p={x:pl.x+dx,y:pl.y+dy};if(G.Path.route(pl,p))return {x:(p.x-G.Camera.left()+G.Camera._sx)*G.Camera.scale,y:(p.y-G.Camera.top()+G.Camera._sy)*G.Camera.scale};}throw Error('No mouse fixture route');});
      await b.mouse.click(goal.x,goal.y);await b.waitForTimeout(1600);console.log('INPUT MODE: real mouse ground click on co-op guest');
    }else{await b.keyboard.down('KeyD');await b.waitForTimeout(1600);await b.keyboard.up('KeyD');}
    check('guest movement arrives in host gameplay',Math.abs((await a.evaluate(()=>G.Coop.puppets()[0].x))-prior)>5);
    // Controlled browser-queue pressure, with genuine relay and game events underneath.
    await a.evaluate(()=>{window.__queueDescriptor=Object.getOwnPropertyDescriptor(WebSocket.prototype,'bufferedAmount');Object.defineProperty(WebSocket.prototype,'bufferedAmount',{configurable:true,get(){return 70000;}});});
    await a.waitForFunction(()=>G.Net.stats().targetHz===5&&G.Net.stats().coalescedFrames>0);
    check('queue pressure selects 5 Hz and coalesces only stale states',await a.evaluate(()=>G.Net.stats().targetHz===5&&G.Net.stats().queuedSnapshots<=4));
    const pressureItems=await b.evaluate(()=>Object.keys(G.Items.BY));await b.evaluate(id=>G.Game.player.equip(id),pressureItems[0]);await a.evaluate(id=>G.Coop.broadcast(['item',id]),pressureItems[1]);
    await b.locator('#scr-item').waitFor({state:'visible'});await b.locator('#item-cards .card').first().click();
    check('real item event still arrives under queue pressure',await b.evaluate(id=>G.Game.player.item===id,pressureItems[0]));
    await a.evaluate(()=>{Object.defineProperty(WebSocket.prototype,'bufferedAmount',window.__queueDescriptor);delete window.__queueDescriptor;});
    await a.waitForFunction(()=>G.Net.stats().targetHz===15&&G.Net.stats().queuedSnapshots===0);await a.waitForFunction(()=>G.Game.state==='playing');
    check('clearing queue pressure returns to normal 15 Hz',await a.evaluate(()=>G.Net.stats().targetHz===15));
    // Drop only one-shot choice notifications on real WebSocket sends. Periodic snapshots remain intact.
    for(const page of [a,b])await page.evaluate(()=>{window.__originalSend=WebSocket.prototype.send;window.__droppedChoices=0;WebSocket.prototype.send=function(raw){let value;try{value=JSON.parse(raw);}catch{}if(value?.type==='relay'&&(value.data?.k==='f'||value.data?.lane==='event')){const packet=value.data.k==='f'?value.data:value.data.data;packet.ev=(packet.ev||[]).filter(ev=>{if(['lu','lp','lr','hs','he','hp'].includes(ev[0])){window.__droppedChoices++;return false;}return true;});raw=JSON.stringify(value);}return window.__originalSend.call(this,raw);};});
    const ids=await b.evaluate(()=>Object.keys(G.Items.BY));await b.evaluate(id=>G.Game.player.equip(id),ids[0]);
    await a.evaluate(id=>G.Coop.broadcast(['item',id]),ids[1]);await b.locator('#scr-item').waitFor({state:'visible'});
    await a.evaluate(()=>{G.Game.player.level++;G.Coop.levelStart(G.Game.player.level);});
    await a.locator('#scr-levelup').waitFor({state:'visible'});await b.locator('#scr-levelup').waitFor({state:'visible'});
    check('item choice cannot cover a shared level-up',!(await b.locator('#scr-item').isVisible()));
    await b.evaluate(()=>G.RunUI.pick(0));await a.evaluate(()=>G.RunUI.pick(0));await b.locator('#scr-item').waitFor({state:'visible'});
    check('unfinished item choice reopens after both players pick cards',await b.evaluate(()=>G.Game.state==='choice'));
    await b.locator('#item-cards .card').first().click();await a.waitForFunction(()=>G.Game.state==='playing');await b.waitForFunction(()=>G.Game.state==='playing');
    check('lost choice notifications recover without a permanent pause',(await a.evaluate(()=>window.__droppedChoices))+(await b.evaluate(()=>window.__droppedChoices))>0);
    await a.evaluate(()=>{G.Game.player.level++;G.Coop.levelStart(G.Game.player.level);});await b.locator('#scr-levelup').waitFor({state:'visible'});
    await a.evaluate(id=>G.Coop.broadcast(['item',id]),ids[1]);await b.waitForTimeout(200);
    check('items arriving during level-up stay queued',await b.locator('#scr-levelup').isVisible()&&!(await b.locator('#scr-item').isVisible()));
    await b.evaluate(()=>G.RunUI.pick(0));await a.evaluate(()=>G.RunUI.pick(0));await b.locator('#scr-item').waitFor({state:'visible'});await b.locator('#item-cards .card').first().click();await a.waitForFunction(()=>G.Game.state==='playing');await b.waitForFunction(()=>G.Game.state==='playing');
    check('queued item completes and both players resume',await b.evaluate(()=>G.Game.state==='playing'));
    for(const page of [a,b])await page.evaluate(()=>{WebSocket.prototype.send=window.__originalSend;delete window.__originalSend;});
    // Host restores a real world enemy while the guest's arena exit is delayed.
    const enemyId=await a.evaluate(()=>G.EnemyMgr.add(new G.Enemy({dex:10,hp:1000000,spd:1,dmg:0,xp:1,behavior:'chaser'},G.Game.player.x+100,G.Game.player.y,{hp:1,spd:1,dmg:1})).id);
    await b.waitForFunction(id=>!!G.EnemyMgr.get(id),enemyId);await a.evaluate(()=>G.Rift.debugArena('fire'));await b.waitForFunction(()=>G.Rift.inArena);
    await a.evaluate(()=>{G.Coop.broadcast(['al']);G.Rift.onEvent(['al']);});await b.waitForFunction(()=>G.Rift.arena?.phase==='lost');
    await b.evaluate(()=>G.Rift.arena.endT=50);await a.evaluate(()=>G.Rift.arena.endT=0.01);await a.waitForFunction(()=>!G.Rift.inArena);await b.waitForFunction(id=>!!G.EnemyMgr.get(id),enemyId);
    check('guest receives restored enemy before its delayed exit',await b.evaluate(()=>G.Rift.inArena));
    await b.evaluate(()=>G.Rift.arena.endT=0.01);await b.waitForFunction(()=>!G.Rift.inArena);
    check('late guest arena exit does not erase restored enemies',await b.evaluate(id=>!!G.EnemyMgr.get(id)&&G.EnemyMgr.get(id).remote,enemyId));
    await b.waitForTimeout(1200);
    check('restored enemy persists after return transition',await b.evaluate(id=>!!G.EnemyMgr.get(id)&&G.EnemyMgr.get(id).remote,enemyId));
    await b.screenshot({path:path.resolve('artifacts/coop-rift/guest-return.png')});
    await a.screenshot({path:path.join(OUT,'nas-coop-host.png')});await b.screenshot({path:path.join(OUT,'nas-coop-guest.png')});
    await a.evaluate(()=>G.Game.quit());await a.locator('#btn-again').waitFor({state:'visible'});await a.locator('#btn-again').click();await a.evaluate(()=>G.NAS.flush());
    await a.waitForTimeout(300);
    const scores=app.store.scores();check('real co-op result appears in server leaderboard',scores.some(r=>r.mode==='g'&&r.uids.includes(uid)&&r.uids.includes(bid)));
    await a.evaluate(()=>G.RankingUI.open());await a.locator('#scr-rank').waitFor({state:'visible'});await a.screenshot({path:path.join(OUT,'nas-ranking.png')});
    check('page errors absent',errors.length===0);check('third-party service requests absent',external.length===0);
    fs.writeFileSync(path.join(OUT,'nas-browser.json'),JSON.stringify({checks,errors,external,scoreCount:scores.length},null,2));
    console.log(`PASS NAS_BROWSER: ${checks.length} checks; dual saves, cross-device, conflicts, offline retry, real co-op and leaderboard; external=0; errors=0`);
  }finally{if(browser)await browser.close();await app.close();const p=path.resolve(dataDir);if(p.startsWith(path.join(path.resolve(os.tmpdir()),'ps-nas-browser-')))fs.rmSync(p,{recursive:true,force:true});}
})().catch(e=>{console.error(e);process.exitCode=1;});
