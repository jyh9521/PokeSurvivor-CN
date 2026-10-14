/* Protected bundle + actual Service Worker; no window.G and no socket mocks. */
const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),assert=require('node:assert/strict');
const {chromium}=require('playwright'),{createApp}=require('../server/app.cjs');
(async()=>{
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'ps-nas-production-')),app=createApp({dataDir:dir});let browser;
  const errors=[],external=[],checks=[];const check=(n,x)=>{assert.ok(x,n);checks.push(n);console.log('PASS',n);};
  try{
    await new Promise(r=>app.server.listen(0,'127.0.0.1',r));const origin='http://127.0.0.1:'+app.server.address().port;
    browser=await chromium.launch({headless:true,channel:'chrome'});const ctx=await browser.newContext({locale:'zh-CN',viewport:{width:1280,height:800}});
    // Service-worker routing bypasses Playwright routes, so observe every request.
    ctx.on('request',r=>{if(/^https?:/.test(r.url())&&new URL(r.url()).origin!==origin)external.push(r.url());});
    const p=await ctx.newPage();p.on('pageerror',e=>errors.push(e.message));p.on('dialog',d=>d.accept('production-nas-test'));
    await p.goto(origin+'/');await p.waitForFunction(()=>document.getElementById('boot').classList.contains('hidden'));if(await p.locator('#tap-start').isVisible())await p.locator('#tap-start').click();
    check('published runtime stays private',await p.evaluate(()=>typeof window.G==='undefined'));
    check('NAS password policy and unavailable Google recovery reflected in UI',await p.locator('#f-pass').getAttribute('minlength')==='8'&&!(await p.locator('#f-forgot').isVisible()));
    await p.locator('[data-tab="register"]').click();await p.locator('#f-user').fill('ProdAlice');await p.locator('#f-pass').fill('production-nas-test');await p.locator('#btn-auth').click();await p.locator('#scr-test').waitFor({state:'visible'});
    for(let i=0;i<30&&await p.locator('#scr-test').isVisible();i++)await p.locator('#test-a .answer').first().click();await p.locator('#res-ok').click();await p.locator('#scr-menu').waitFor({state:'visible'});
    await p.locator('#btn-settings').click();await p.locator('#set-tabs [data-t="acc"]').click();await p.locator('[data-nas="sync"]').click();
    const user=app.store.db.prepare('SELECT id FROM users WHERE name=?').get('ProdAlice');
    check('player recovery/import tools removed',await p.locator('[data-nas="history"], [data-nas="import"]').count()===0);
    check('game reauthentication hidden while logged in',!(await p.locator('[data-nas="reauth"]').isVisible()));
    app.store.db.exec('DELETE FROM sessions');await p.locator('[data-nas="sync"]').click();
    check('expired session shows game-account verification',await p.locator('[data-nas="reauth"]').isVisible());
    await p.locator('[data-nas="reauth"]').click();await p.waitForFunction(()=>document.querySelector('[data-nas="reauth"]').hidden);
    check('verification hides again after successful login',!(await p.locator('[data-nas="reauth"]').isVisible()));
    check('protected UI saves to SQLite',!!app.store.getSave(user.id).save.partner);
    await p.waitForFunction(()=>!!navigator.serviceWorker.controller);
    await p.evaluate(()=>fetch('/api/session',{cache:'no-store'}).then(r=>r.json()));
    const urls=await p.evaluate(async()=>{const rows=[];for(const name of await caches.keys())for(const req of await(await caches.open(name)).keys())rows.push(req.url);return rows;});
    check('service worker is active and never caches private API responses',urls.length>0&&!urls.some(u=>new URL(u).pathname.startsWith('/api/')));
    await p.setViewportSize({width:844,height:390});await p.locator('[data-nas="sync"]').scrollIntoViewIfNeeded();check('NAS sync control reachable in mobile layout',await p.locator('[data-nas="sync"]').isVisible());
    await p.screenshot({path:path.resolve('artifacts/selfhost-verification/nas-production-settings.png')});
    await p.locator('#set-close').click();await p.reload();await p.waitForFunction(()=>document.getElementById('boot').classList.contains('hidden'));if(await p.locator('#tap-start').isVisible())await p.locator('#tap-start').click();await p.locator('#scr-menu').waitFor({state:'visible'});
    check('protected reload restores logged-in progress',await p.locator('#user-pill').innerText().then(t=>t.includes('ProdAlice')));
    const local=await p.evaluate(()=>Object.entries(localStorage).filter(([k])=>k.startsWith('ps.nas.save.')).map(([,v])=>JSON.parse(v)));
    check('browser copy matches persisted NAS partner',local.length===1&&local[0].save.partner===app.store.getSave(user.id).save.partner);
    check('no third-party requests',external.length===0);check('no browser errors',errors.length===0);
    const report={checks,errors,external,privateApiCached:false};fs.writeFileSync('artifacts/selfhost-verification/nas-production.json',JSON.stringify(report,null,2));
    console.log(`PASS NAS_PRODUCTION: ${checks.length} checks; protected bundle, real service worker, no private API cache, dual saves, mobile, reload; external=0; errors=0`);
  }finally{if(browser)await browser.close();await app.close();const p=path.resolve(dir);if(p.startsWith(path.join(path.resolve(os.tmpdir()),'ps-nas-production-')))fs.rmSync(p,{recursive:true,force:true});}
})().catch(e=>{console.error(e);process.exitCode=1;});
