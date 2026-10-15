/* Protected bundle + actual Service Worker; no window.G and no socket mocks. */
const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),assert=require('node:assert/strict');
const {chromium}=require('playwright'),{createApp}=require('../server/app.cjs');
(async()=>{
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'ps-nas-production-')),app=createApp({dataDir:dir});let browser;
  const errors=[],external=[],checks=[];const check=(n,x)=>{assert.ok(x,n);checks.push(n);console.log('PASS',n);};
  try{
    await new Promise(r=>app.server.listen(0,'127.0.0.1',r));const origin='http://127.0.0.1:'+app.server.address().port;
    browser=await chromium.launch({headless:true,channel:'chrome'});const ctx=await browser.newContext({locale:'zh-CN',viewport:{width:1280,height:800}});
    await ctx.addInitScript(()=>{window.__pad=null;Object.defineProperty(navigator,'getGamepads',{value:()=>window.__pad?[window.__pad]:[]});});
    // Service-worker routing bypasses Playwright routes, so observe every request.
    ctx.on('request',r=>{if(/^https?:/.test(r.url())&&new URL(r.url()).origin!==origin)external.push(r.url());});
    const p=await ctx.newPage();const press=async i=>{await p.evaluate(i=>window.__pad.buttons[i].pressed=true,i);await p.waitForTimeout(90);await p.evaluate(i=>window.__pad.buttons[i].pressed=false,i);await p.waitForTimeout(100);};p.on('pageerror',e=>errors.push(e.message));p.on('dialog',d=>d.accept('production-nas-test'));
    await p.goto(origin+'/');await p.waitForFunction(()=>document.getElementById('boot').classList.contains('hidden'));if(await p.locator('#tap-start').isVisible())await p.locator('#tap-start').click();
    check('published runtime stays private',await p.evaluate(()=>typeof window.G==='undefined'));
    check('NAS password policy and unavailable Google recovery reflected in UI',await p.locator('#f-pass').getAttribute('minlength')==='8'&&!(await p.locator('#f-forgot').isVisible()));
    await p.locator('[data-tab="register"]').click();await p.locator('#f-user').fill('ProdAlice');await p.locator('#f-pass').fill('production-nas-test');await p.locator('#btn-auth').click();await p.locator('#scr-test').waitFor({state:'visible'});
    for(let i=0;i<30&&await p.locator('#scr-test').isVisible();i++)await p.locator('#test-a .answer').first().click();await p.locator('#res-ok').click();await p.locator('#scr-menu').waitFor({state:'visible'});
    await p.locator('#btn-settings').click();await p.locator('#set-tabs [data-t="acc"]').click();await p.locator('[data-nas="sync"]').click();
    const user=app.store.db.prepare('SELECT id FROM users WHERE name=?').get('ProdAlice');
    check('published new account receives exactly one welcome gift',app.store.getSave(user.id).save.coins===1000600&&app.store.db.prepare('SELECT COUNT(*) AS n FROM reward_receipts WHERE uid=?').get(user.id).n===1);
    await p.locator('#nas-network-toggle').click();await p.waitForFunction(()=>document.querySelector('[data-network="nasRttMs"]').textContent!=='—');
    check('published diagnostics measures actual authenticated WebSocket RTT',await p.locator('[data-network="status"]').innerText().then(t=>t.includes('已连接 NAS')));
    check('healthy NAS target is 15 Hz',await p.locator('[data-network="targetHz"]').innerText().then(t=>t.includes('15')));
    const downloadPromise=p.waitForEvent('download');await p.locator('[data-network-export]').click();const download=await downloadPromise;await download.saveAs(path.resolve('artifacts/relay-diagnostics/export.json'));
    const diagnostic=JSON.parse(fs.readFileSync('artifacts/relay-diagnostics/export.json','utf8'));
    check('diagnostic export contains metrics without account, session or save data',diagnostic.metrics.nasRttMs!=null&&!/ProdAlice|ps_nas|password|owned|coins|userId/.test(JSON.stringify(diagnostic)));
    await p.locator('[data-network-close]').click();
    check('player recovery/import tools removed',await p.locator('[data-nas="history"], [data-nas="import"]').count()===0);
    check('game reauthentication hidden while logged in',!(await p.locator('[data-nas="reauth"]').isVisible()));
    app.store.db.exec('DELETE FROM sessions');await p.locator('[data-nas="sync"]').click();await p.locator('[data-nas="reauth"]').waitFor({state:'visible'});
    check('expired session shows game-account verification',await p.locator('[data-nas="reauth"]').isVisible());
    await p.locator('[data-nas="reauth"]').click();await p.locator('#game-dialog input').fill('production-nas-test');await p.locator('#dialog-confirm').click();await p.waitForFunction(()=>document.querySelector('[data-nas="reauth"]').hidden);
    check('verification hides again after successful login',!(await p.locator('[data-nas="reauth"]').isVisible()));
    check('protected UI saves to SQLite',!!app.store.getSave(user.id).save.partner);
    const before=app.store.getSave(user.id);await p.locator('#nas-nickname').fill('公开测试昵称');await p.locator('#nas-nickname-save').click();await p.waitForFunction(()=>document.querySelector('#nas-nickname').value==='公开测试昵称');check('protected nickname UI preserves login identity, wallet and save revision',(await p.locator('#user-pill').innerText()).includes('公开测试昵称')&&app.store.getUser(user.id).name==='ProdAlice'&&app.store.getUser(user.id).nick==='公开测试昵称'&&JSON.stringify(before)===JSON.stringify(app.store.getSave(user.id)));
    await p.waitForFunction(()=>!!navigator.serviceWorker.controller);
    await p.evaluate(()=>fetch('/api/session',{cache:'no-store'}).then(r=>r.json()));
    const urls=await p.evaluate(async()=>{const rows=[];for(const name of await caches.keys())for(const req of await(await caches.open(name)).keys())rows.push(req.url);return rows;});
    check('service worker is active and never caches private API responses',urls.length>0&&!urls.some(u=>new URL(u).pathname.startsWith('/api/')));
    await p.setViewportSize({width:844,height:390});await p.locator('[data-nas="sync"]').scrollIntoViewIfNeeded();check('NAS sync control reachable in mobile layout',await p.locator('[data-nas="sync"]').isVisible());
    await p.locator('#nas-network-toggle').click();await p.locator('[data-network-export]').scrollIntoViewIfNeeded();
    check('diagnostics export reachable on mobile',await p.locator('[data-network-export]').isVisible());
    await p.screenshot({path:path.resolve('artifacts/relay-diagnostics/mobile-diagnostics.png')});await p.locator('[data-network-close]').click();
    await p.screenshot({path:path.resolve('artifacts/selfhost-verification/nas-production-settings.png')});
    await p.locator('#set-close').click();await p.reload();await p.waitForFunction(()=>document.getElementById('boot').classList.contains('hidden'));if(await p.locator('#tap-start').isVisible())await p.locator('#tap-start').click();await p.locator('#scr-menu').waitFor({state:'visible'});
    check('protected reload restores logged-in progress',await p.locator('#user-pill').innerText().then(t=>t.includes('公开测试昵称')));
    await p.locator('[data-go="upgrades"]').click();const wallet=app.store.getSave(user.id).save.coins;await p.locator('#upg-bulk').click();await p.waitForFunction(()=>document.getElementById('upg-refund')&&!document.getElementById('upg-refund').disabled);check('protected bulk-upgrade controls write to NAS',app.store.getSave(user.id).save.coins<wallet);const postBulk=app.store.getSave(user.id).save.coins;const refundAmount=require('../js/data/upgrades.js').refundable(app.store.getSave(user.id).save);await p.locator('#upg-refund').click();await p.evaluate(()=>window.__pad={index:0,id:'Sony DualSense (Vendor: 054c)',connected:true,mapping:'standard',axes:[0,0],buttons:Array.from({length:17},()=>({pressed:false,value:0}))});await p.waitForTimeout(180);await press(15);check('protected controller dialog shows matching Sony confirmation glyph',await p.locator('#dialog-confirm').evaluate(el=>el===document.activeElement&&getComputedStyle(el,'::after').content.includes('×')));await press(0);await p.waitForFunction(()=>document.getElementById('upg-refund').disabled);check('protected refund returns half actual investment without duplicating coins',app.store.getSave(user.id).save.coins===postBulk+refundAmount);await p.locator('.scr:not(.hidden) [data-back]').first().click();
    await p.locator('#btn-settings').click();await p.locator('#set-tabs [data-t="gfx"]').click();await p.locator('[data-k="quality"][data-v="potato"]').click();check('protected low-end preset changes rendering resolution',await p.locator('#game').evaluate(el=>el.width===Math.round(el.clientWidth)));check('protected own-character outline control is available',await p.locator('[data-k="playerOutline"]').isVisible());await p.locator('#set-close').click();
    const latest=app.store.getSave(user.id);app.store.putSave(app.store.getUser(user.id),{...latest.save,tickets:{...latest.save.tickets,t1:10}},latest.rev);await p.reload();await p.waitForFunction(()=>document.getElementById('boot').classList.contains('hidden'));if(await p.locator('#tap-start').isVisible())await p.locator('#tap-start').click();await p.locator('[data-go="gacha"]').click();await p.locator('#gacha-skip').check();const started=Date.now();await p.locator('#pull-1').click();await p.locator('#pull-results .pcard').waitFor({state:'visible'});check('protected skip-animation gacha displays immediate result',Date.now()-started<1500&&await p.locator('#pull-results .pcard').evaluate(el=>getComputedStyle(el).animationName==='none'));await p.screenshot({path:path.resolve('artifacts/playability/protected-instant-gacha.png')});
    await p.evaluate(()=>window.__pad={index:0,id:'Sony DualSense (Vendor: 054c)',connected:true,mapping:'standard',axes:[0,0],buttons:Array.from({length:17},()=>({pressed:false,value:0}))});await p.waitForTimeout(180);await press(1);await press(1);await p.locator('[data-go=\"play\"]').focus();await press(0);await p.locator('#scr-menu').waitFor({state:'hidden'});await press(1);check('protected controller B does not open pause during gameplay',!(await p.locator('#scr-pause').isVisible()));await press(9);await p.locator('#scr-pause').waitFor({state:'visible'});check('protected controller Start pauses with Sony L1 and Options hints',await p.locator('#scr-pause .pad-only').innerText().then(t=>t.includes('L1')&&t.includes('Options')));
    const local=await p.evaluate(()=>Object.entries(localStorage).filter(([k])=>k.startsWith('ps.nas.save.')).map(([,v])=>JSON.parse(v)));
    check('browser copy matches persisted NAS partner',local.length===1&&local[0].save.partner===app.store.getSave(user.id).save.partner);
    check('no third-party requests',external.length===0);check('no browser errors',errors.length===0);
    const report={checks,errors,external,privateApiCached:false};fs.writeFileSync('artifacts/selfhost-verification/nas-production.json',JSON.stringify(report,null,2));
    console.log(`PASS NAS_PRODUCTION: ${checks.length} checks; protected bundle, real service worker, no private API cache, dual saves, mobile, reload; external=0; errors=0`);
  }finally{if(browser)await browser.close();await app.close();const p=path.resolve(dir);if(p.startsWith(path.join(path.resolve(os.tmpdir()),'ps-nas-production-')))fs.rmSync(p,{recursive:true,force:true});}
})().catch(e=>{console.error(e);process.exitCode=1;});
