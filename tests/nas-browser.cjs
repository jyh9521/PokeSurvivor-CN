/* Actual two-browser NAS gameplay, no Firebase/config/socket mocks. */
const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),assert=require('node:assert/strict');
const {chromium}=require('playwright'),{createApp}=require('../server/app.cjs');
const ROOT=path.resolve(__dirname,'..'),OUT=path.join(ROOT,'artifacts/selfhost-verification');
fs.mkdirSync(OUT,{recursive:true});
(async()=>{
  const dataDir=fs.mkdtempSync(path.join(os.tmpdir(),'ps-nas-browser-')),app=createApp({dataDir});let browser;
  const checks=[],errors=[],external=[];
  const check=(name,condition)=>{assert.ok(condition,name);checks.push(name);console.log('PASS',name);};
  try{
    await new Promise(r=>app.server.listen(0,'127.0.0.1',r));const origin='http://127.0.0.1:'+app.server.address().port;
    browser=await chromium.launch({headless:true,channel:'chrome'});
    const context=async()=>{const c=await browser.newContext({locale:'zh-CN',viewport:{width:1280,height:800},serviceWorkers:'block'});await c.route('**/*',route=>{const u=new URL(route.request().url());if(u.origin!==origin&&/^https?:$/.test(u.protocol)){external.push(u.href);return route.abort();}return route.continue();});return c;};
    const ca=await context(),cb=await context();
    const open=async c=>{const p=await c.newPage();p.on('pageerror',e=>errors.push(e.message));p.on('dialog',d=>d.accept());await p.goto(origin+'/dev.html');await p.waitForFunction(()=>G.NAS.enabled&&document.getElementById('boot').classList.contains('hidden'));if(await p.locator('#tap-start').isVisible())await p.locator('#tap-start').click();return p;};
    const a=await open(ca),b=await open(cb);
    async function signup(p,name){await p.locator('[data-tab="register"]').click();await p.locator('#f-user').fill(name);await p.locator('#f-pass').fill('nas-browser-password');await p.locator('#btn-auth').click();await p.locator('#scr-test').waitFor({state:'visible'});for(let i=0;i<30&&await p.locator('#scr-test').isVisible();i++)await p.locator('#test-a .answer').first().click();await p.locator('#res-other').click();await p.locator('#starter-grid .cell').filter({hasText:'妙蛙种子'}).click();await p.locator('#starter-ok').click();await p.locator('#scr-menu').waitFor({state:'visible'});await p.evaluate(()=>G.NAS.flush());}
    await signup(a,'NasAlice');await signup(b,'NasBob');
    const uid=await a.evaluate(()=>G.NAS.user.id),bid=await b.evaluate(()=>G.NAS.user.id);
    check('NAS authentication enabled; online menus reachable',await a.evaluate(()=>G.DB.mode==='nas'&&G.DB.online)&&await a.locator('[data-go="friends"]').isVisible());
    const envelope=await a.evaluate(()=>JSON.parse(localStorage.getItem('ps.nas.save.'+G.NAS.user.id)));
    check('real browser + SQLite contain matching starter',envelope.save.partner===1&&app.store.getSave(uid).save.partner===1&&envelope.rev===app.store.getSave(uid).rev);
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
    await a.waitForFunction(()=>G.Social.room.members.length===2);await a.locator('#lobby-start').click();
    await a.waitForFunction(()=>G.Game.state==='playing'&&G.Coop.active);await b.waitForFunction(()=>G.Game.state==='playing'&&G.Coop.active);
    check('two real game instances enter shared NAS-relayed run',await a.evaluate(()=>G.Coop.isHost&&G.Coop.puppets().length===1)&&await b.evaluate(()=>!G.Coop.isHost&&G.Coop.puppets().length===1));
    const prior=await a.evaluate(()=>G.Coop.puppets()[0].x);
    await b.keyboard.down('KeyD');await b.waitForTimeout(1600);await b.keyboard.up('KeyD');
    check('guest movement arrives in host gameplay',Math.abs((await a.evaluate(()=>G.Coop.puppets()[0].x))-prior)>5);
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
