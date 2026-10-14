/* Actual browser persistence acceptance; no config interception or cloud mocks. */
const fs = require('node:fs'), path = require('node:path'), vm = require('node:vm');
const assert = require('node:assert/strict'), http = require('node:http');
const { pathToFileURL } = require('node:url');
const { chromium } = require('playwright');
const os = require('node:os');
const ROOT = path.resolve(process.env.TEST_ROOT || path.join(__dirname, '..'));
const baseline = process.argv.includes('--baseline');
const fileMode = baseline || process.argv.includes('--file');
const entry = baseline ? 'dev.html' : (process.env.TEST_ENTRY || 'index.html');
const out = process.env.TEST_OUTPUT || path.join(ROOT, 'artifacts/verification', baseline ? 'baseline' : fileMode ? 'file' : 'modified');
fs.mkdirSync(out, { recursive: true });
const mime = { '.html':'text/html', '.js':'application/javascript', '.css':'text/css', '.json':'application/json', '.ttf':'font/ttf', '.woff2':'font/woff2', '.png':'image/png' };
const server = http.createServer((req,res) => {
  try {
    let f = path.resolve(ROOT, '.' + decodeURIComponent(new URL(req.url,'http://local').pathname));
    if (!f.startsWith(ROOT + path.sep) && f !== ROOT) throw Error('path');
    if (fs.statSync(f).isDirectory()) f = path.join(f,'index.html');
    if (path.relative(ROOT,f).split(path.sep).some(p=>p.startsWith('.'))) throw Error('path');
    res.setHeader('Content-Type',mime[path.extname(f)] || 'application/octet-stream');
    res.end(fs.readFileSync(f));
  } catch { res.writeHead(404).end(); }
});
(async () => {
  let browser, context;
  const profile=fs.mkdtempSync(path.join(os.tmpdir(),'pokesurvivor-local-test-'));
  const checks = [], external = [], errors = [];
  const check = (name,value) => { assert.ok(value,name); checks.push(name); };
  try {
    const cfg = {G:{}};
    vm.runInNewContext(fs.readFileSync(path.join(ROOT,'js/core/firebase-config.js'),'utf8'),cfg);
    check('configuration',baseline ? !!cfg.G.FIREBASE_CONFIG : cfg.G.FIREBASE_CONFIG === null);
    if (!fileMode) await new Promise(r=>server.listen(0,'127.0.0.1',r));
    const origin = fileMode ? null : `http://127.0.0.1:${server.address().port}`;
    const url = fileMode ? pathToFileURL(path.join(ROOT,entry)).href : origin + '/' + entry;
    const options={headless:true,channel:process.env.PLAYWRIGHT_CHANNEL || 'chrome',locale:'en-US',viewport:{width:1280,height:800},serviceWorkers:'block'};
    context = await chromium.launchPersistentContext(profile,options);
    browser=context.browser();
    const intercept=async ctx=>ctx.route('**/*',route=>{
      const u = new URL(route.request().url());
      if (/^https?:$/.test(u.protocol) && u.origin !== origin) {external.push(u.href);return route.abort();}
      return route.continue();
    });
    await intercept(context);
    const page = await context.newPage();
    page.on('pageerror',e=>errors.push(e.message));
    page.on('dialog',d=>d.accept());
    const start = async () => {
      await page.waitForFunction(()=>document.getElementById('boot').classList.contains('hidden'));
      if (await page.locator('#tap-start').isVisible()) await page.locator('#tap-start').click();
    };
    await page.goto(url); await start();
    check('language',await page.locator('html').getAttribute('lang') === (baseline || entry.startsWith('en/') ? 'en' : 'zh-CN'));
    if(process.argv.includes('--protected'))check('production hides G',await page.evaluate(()=>typeof window.G==='undefined'));
    check('no cloud login',!(await page.locator('#btn-google').isVisible()));
    await page.locator('[data-tab="register"]').click();
    await page.locator('#f-user').fill('Pikachu');
    await page.locator('#f-pass').fill('isolated-local-test');
    await page.locator('#btn-auth').click();
    await page.locator('#scr-test').waitFor({state:'visible'});
    for (let i=0;i<30 && await page.locator('#scr-test').isVisible();i++) await page.locator('#test-a .answer').first().click();
    await page.locator('#res-ok').click();
    await page.locator('#scr-menu').waitFor({state:'visible'});
    if(!baseline) {
      check('online menus hidden',!(await page.locator('[data-go="friends"]').isVisible()) && !(await page.locator('[data-go="rank"]').isVisible()));
      check('Chinese font available',await page.evaluate(async()=> (await document.fonts.load('16px PSChinese','宝可梦')).length > 0));
    }
    const saved = async ()=>page.evaluate(()=>JSON.parse(localStorage.getItem('ps.save.pikachu')));
    const before = await saved();
    check('starter persisted',before.partner && before.owned[before.partner] && before.name === 'Pikachu');
    await page.locator('[data-go="upgrades"]').click();
    const buy = page.locator('#upg-list [data-buy]:not([disabled])').first();
    await buy.click();
    const upgraded = await saved();
    check('purchase persisted',Object.values(upgraded.pupg).some(levels=>Object.values(levels).some(x=>x>0)));
    await page.locator('.scr:not(.hidden) [data-back]').first().click();
    await page.screenshot({path:path.join(out,'menu.png'),animations:'disabled'});
    await page.locator('[data-go="play"]').click();
    await page.waitForFunction(()=>document.querySelector('#scr-menu').classList.contains('hidden'));
    await page.keyboard.down('KeyD');
    await page.waitForTimeout(1800);
    await page.keyboard.up('KeyD');
    await page.screenshot({path:path.join(out,'playing.png')});
    await page.keyboard.press('Escape');
    await page.locator('#scr-pause').waitFor({state:'visible'});
    await page.locator('#btn-quit').click();
    await page.locator('#btn-again').waitFor({state:'visible'});
    check('run persisted',(await saved()).stats.runs === before.stats.runs + 1);
    await page.locator('#btn-again').click();
    const progress = await saved();
    await page.reload(); await start();
    await page.locator('#scr-menu').waitFor({state:'visible'});
    check('reload restores progress',JSON.stringify(await saved()) === JSON.stringify(progress));
    await page.locator('#btn-settings').click();
    await page.locator('#set-tabs [data-t="acc"]').click();
    await page.locator('#set-logout').click();
    await page.locator('#scr-login').waitFor({state:'visible'});
    await page.locator('#f-user').fill('Pikachu');
    await page.locator('#f-pass').fill('wrong-password');
    await page.locator('#btn-auth').click();
    await page.waitForFunction(()=>document.getElementById('login-err').textContent.length>0);
    check('wrong password rejected',await page.locator('#scr-login').isVisible());
    await page.locator('#f-pass').fill('isolated-local-test'); await page.locator('#btn-auth').click();
    await page.locator('#scr-menu').waitFor({state:'visible'});
    const relog = await saved();
    check('login restores progress',relog.partner === progress.partner && relog.coins === progress.coins && JSON.stringify(relog.pupg) === JSON.stringify(progress.pupg) && relog.stats.runs === progress.stats.runs);
    const storage = await page.evaluate(()=>Object.fromEntries(Object.entries(localStorage)));
    await page.close();
    const reopen = await context.newPage();
    await reopen.goto(url);
    await reopen.waitForFunction(()=>document.getElementById('boot').classList.contains('hidden'));
    check('new tab restores local account',await reopen.evaluate(()=>JSON.parse(localStorage.getItem('ps.session')) === 'pikachu' && !!JSON.parse(localStorage.getItem('ps.save.pikachu')).partner));
    await context.close();
    context=await chromium.launchPersistentContext(profile,options);browser=context.browser();
    await intercept(context);
    const restarted=await context.newPage();
    restarted.on('pageerror',e=>errors.push(e.message));
    await restarted.goto(url);
    await restarted.waitForFunction(()=>document.getElementById('boot').classList.contains('hidden'));
    const recovered=await restarted.evaluate(()=>JSON.parse(localStorage.getItem('ps.save.pikachu')));
    check('browser restart restores progress',recovered.partner===progress.partner && recovered.coins===progress.coins && recovered.stats.runs===progress.stats.runs && JSON.stringify(recovered.pupg)===JSON.stringify(progress.pupg));
    check('no page errors',errors.length===0);
    check('zero external requests',external.length===0);
    fs.writeFileSync(path.join(out,'report.json'),JSON.stringify({entry,transport:fileMode?'file':'http',checks,external,errors,storageKeys:Object.keys(storage)},null,2));
    console.log(`PASS ${baseline?'BASELINE':fileMode?'MODIFIED_FILE':'MODIFIED'}: ${checks.length} checks; local account, starter, purchase, run, reload, logout/login, browser restart; external=0; errors=0`);
  } finally {
    if(browser)await browser.close();
    if(server.listening)await new Promise(r=>server.close(r));
    const target=path.resolve(profile),prefix=path.join(path.resolve(os.tmpdir()),'pokesurvivor-local-test-');
    if(target.startsWith(prefix))fs.rmSync(target,{recursive:true,force:true});
  }
})().catch(e=>{console.error(e);process.exitCode=1;});
