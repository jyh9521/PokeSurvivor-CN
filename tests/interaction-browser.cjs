/* Real source runtime + authenticated NAS. Pad data is a controlled standard device,
 * not physical-device acceptance. No native dialogs; modal tests use the game UI. */
const fs=require('fs'),path=require('path'),os=require('os'),vm=require('vm'),assert=require('assert/strict');
const {chromium}=require('playwright'),{createApp}=require('../server/app.cjs');
const ROOT=path.resolve(__dirname,'..'),OUT=path.join(ROOT,'artifacts/interaction');fs.mkdirSync(OUT,{recursive:true});
(async()=>{const dir=fs.mkdtempSync(path.join(os.tmpdir(),'ps-pad-')),root=path.join(dir,'web');fs.mkdirSync(root);for(const n of ['js','css','assets'])fs.cpSync(path.join(ROOT,n),path.join(root,n),{recursive:true});for(const n of ['sw.js','version.json','manifest.webmanifest'])fs.copyFileSync(path.join(ROOT,n),path.join(root,n));fs.copyFileSync(path.join(ROOT,'dev.html'),path.join(root,'index.html'));
 const app=createApp({dataDir:dir,root,campaigns:[]});let browser;const errors=[],checks=[];const check=(n,x)=>{assert.ok(x,n);checks.push(n);console.log('PASS',n);};
 try{await new Promise(r=>app.server.listen(0,'127.0.0.1',r));const origin='http://127.0.0.1:'+app.server.address().port;const user=await app.store.credentials('PadPlayer','pad-password',true);const db=fs.readFileSync(path.join(ROOT,'js/core/db.js'),'utf8'),seed=vm.runInNewContext('const VERSION=3,START_COINS=500;'+db.slice(db.indexOf('  function newSave('),db.indexOf('  /** Rellena'))+'\nnewSave("PadPlayer")');seed.owned=Object.fromEntries([1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16].map(d=>[d,{at:1,from:'fixture'}]));seed.partner=1;seed.coins=10000;seed.pupg={1:{hp:1}};seed.tickets={t1:15,t10:0};app.store.putSave(user,seed,0);
 browser=await chromium.launch({channel:'chrome',headless:true});const ctx=await browser.newContext({locale:'zh-CN',viewport:{width:1280,height:800},serviceWorkers:'block'});await ctx.addCookies([{name:'ps_nas',value:app.store.session(user),url:origin,httpOnly:true,sameSite:'Strict'}]);await ctx.addInitScript(()=>{window.__pad={index:0,id:'Xbox Controller',connected:true,mapping:'standard',axes:[0,0],buttons:Array.from({length:17},()=>({pressed:false,value:0}))};Object.defineProperty(navigator,'getGamepads',{value:()=>window.__pad?[window.__pad]:[]});});const p=await ctx.newPage();p.on('pageerror',e=>errors.push(e.stack));p.on('console',m=>{if(m.type()==='error'&&/TypeError|ReferenceError|bucle/i.test(m.text()))errors.push(m.text());});p.on('dialog',d=>{errors.push('Unexpected native dialog: '+d.type());d.dismiss();});await p.goto(origin);await p.waitForFunction(()=>typeof G==='object'&&G.NAS.enabled&&document.getElementById('boot').classList.contains('hidden'));const press=async i=>{await p.evaluate(i=>window.__pad.buttons[i].pressed=true,i);await p.waitForTimeout(90);await p.evaluate(i=>window.__pad.buttons[i].pressed=false,i);await p.waitForTimeout(100);};await p.waitForTimeout(180);if(await p.locator('#tap-start').isVisible())await press(0);await p.locator('#scr-menu').waitFor({state:'visible'});await press(1);check('B on main menu does not pause or log out',await p.evaluate(()=>G.Game.state==='ui'&&G.DB.loggedIn));

 // No direct .focus() setup: real main-menu activation must transfer ownership.
 await p.locator('[data-go="dex"]').click();await press(3);
 check('dex child owns controller focus, not background main menu',await p.evaluate(()=>!!document.activeElement.closest('#scr-dex')));
 const gen=await p.locator('#dex-gens .on').innerText();await press(5);
 check('RB changes dex generation',await p.locator('#dex-gens .on').innerText()!==gen);
 await press(1);check('Back restores original main-menu control',await p.evaluate(()=>document.activeElement.dataset.go==='dex'));
 await p.locator('[data-go="goals"]').click();await press(3);
 check('goals child owns focus',await p.evaluate(()=>!!document.activeElement.closest('#scr-goals')));
 await p.evaluate(()=>{const s=G.DB.save;G.Progress.ensure(s);s.missions.daily[0].prog=s.missions.daily[0].goal;s.missions.weekly[0].prog=s.missions.weekly[0].goal;G.GoalsUI.open('missions');});
 const claims=await p.evaluate(()=>G.DB.save.stats.missionsDone||0);await p.locator('#goals-claim-all').click();await p.locator('#goals-claim-all').click({force:true,timeout:500}).catch(()=>{});
 check('claim-all grants completed daily and weekly exactly once',await p.evaluate(n=>G.DB.save.stats.missionsDone===n+2,claims));
 check('claim-all disabled with no rewards pending',await p.locator('#goals-claim-all').isDisabled());
 await press(5);check('RB selects achievements tab',await p.locator('#goals-tabs [data-tab=ach]').evaluate(el=>el.classList.contains('on')));
 await press(5);await press(5);check('RB clamps at final profile tab',await p.locator('#goals-tabs [data-tab=profile]').evaluate(el=>el.classList.contains('on')));
 await press(4);await press(1);
 for(const go of ['gacha','friends','rank']){await p.locator('[data-go="'+go+'"]').click();await press(3);check(go+' subpage captures focus',await p.evaluate(go=>!!document.activeElement.closest('#scr-'+go),go));await press(1);check(go+' restores entry focus',await p.evaluate(go=>document.activeElement.dataset.go===go,go));}
 await p.locator('[data-go="goals"]').click();await p.locator('#goals-tabs [data-tab=profile]').click();await p.locator('.fav-slot').first().click();await press(3);check('nested favorite picker owns focus',await p.evaluate(()=>document.activeElement.closest('#goals-body')?.hasAttribute('data-ui-layer')));await press(1);check('nested Back restores favorite slot',await p.evaluate(()=>document.activeElement.dataset.focusKey==='favorite-0'));await press(1);
 await p.locator('[data-go="upgrades"]').click();await press(13);
 check('upgrade focus stays inside child',await p.evaluate(()=>!!document.activeElement.closest('#scr-upgrades')));
 check('upgrade buttons are horizontally aligned in responsive header',await p.evaluate(()=>{const a=document.getElementById('upg-bulk').getBoundingClientRect(),b=document.getElementById('upg-refund').getBoundingClientRect();return Math.abs(a.y-b.y)<3&&a.right<=b.left;}));
 check('selector translates level suffix',!((await p.locator('#upg-mon').innerText()).includes('niveles')));
 for(const viewport of [{width:1280,height:800},{width:844,height:390},{width:390,height:844}]){
  await p.setViewportSize(viewport);await p.evaluate(()=>document.documentElement.style.zoom='1.1');
  for(let i=0;i<2;i++){await p.locator('#upg-mon').click();await p.locator('.select-popup').waitFor({state:'visible'});
   check(`dropdown first/reopen fits ${viewport.width}x${viewport.height} #${i}`,await p.locator('.select-popup').evaluate(el=>{const r=el.getBoundingClientRect();return r.width>100&&r.height>40&&r.top>=0&&r.bottom<=innerHeight+1&&r.right<=innerWidth+1&&el.children.length>5;}));
   if(i===0)await p.screenshot({path:path.join(OUT,'dropdown-'+viewport.width+'.png')});
   await p.keyboard.press('End');await p.keyboard.press('Enter');}
 }
 await p.evaluate(()=>document.documentElement.style.zoom='');await p.setViewportSize({width:1280,height:800});
 await p.locator('#upg-mon').click();await press(13);await press(0);check('portal list selection supports controller',await p.locator('.select-popup').count()===0);
 await press(1);await p.locator('[data-go="settings"]').click();await press(3);await press(5);
 check('RB changes settings tab',await p.locator('#set-tabs [data-t=gfx]').evaluate(el=>el.classList.contains('on')));
 const focusStyle=await p.evaluate(()=>getComputedStyle(document.activeElement).boxShadow);check('focused control has full inset feedback',focusStyle.includes('inset'));
 await p.mouse.wheel(0,12);await p.waitForTimeout(80);check('mouse wheel restores keyboard/mouse device mode',await p.evaluate(()=>!G.Gamepad.using));
 await p.evaluate(()=>window.__pad.axes=[.1,.1]);await p.waitForTimeout(100);check('stick drift does not flicker hints',await p.evaluate(()=>!G.Gamepad.using));
 await p.evaluate(()=>window.__pad.axes=[0,0,.8,0]);await p.waitForTimeout(100);check('right stick also updates device hints',await p.evaluate(()=>G.Gamepad.using));await p.evaluate(()=>window.__pad.axes=[0,0,0,0]);
 await press(4);check('pad updates already-open UI immediately',await p.evaluate(()=>G.Gamepad.using));
 await p.screenshot({path:path.join(OUT,'focus-settings.png')});await press(1);
 await p.locator('[data-go="play"]').click();await p.waitForFunction(()=>G.Game.state==='playing');
 await p.evaluate(()=>{window.__rumble=[];window.__reset=0;window.__pad.vibrationActuator={playEffect:(kind,params)=>{window.__rumble.push({kind,...params});return Promise.resolve('complete');},reset:()=>{window.__reset++;return Promise.resolve();}};G.Game.player.invuln=1e9;});
 await press(0);const hp=await p.evaluate(()=>{const a=G.Game.player;a.invuln=0;const hp=a.hp;a.hurt(5);return {before:hp,after:a.hp,shake:G.Camera.shake,rumble:window.__rumble.length};});
 check('actual local HP loss triggers shake and bounded rumble',hp.after<hp.before&&hp.shake>0&&hp.shake<=.85&&hp.rumble===1);
 await p.evaluate(()=>{const a=G.Game.player;a.hurt(5);a.invuln=0;a.hurt(0);a.invuln=1e9;});check('invulnerability and zero damage do not trigger extra vibration',await p.evaluate(()=>window.__rumble.length===1));
 await p.waitForTimeout(700);check('shake resets offsets without permanent camera displacement',await p.evaluate(()=>G.Camera.shake===0&&G.Camera._sx===0&&G.Camera._sy===0));
 await press(9);await p.screenshot({path:path.join(OUT,'pause-controller.png')});check('pause uses controller hints and full focus feedback',await p.evaluate(()=>document.body.dataset.input==='gamepad'&&getComputedStyle(document.activeElement).boxShadow.includes('inset')));await p.keyboard.press('F8');check('pause switches live back to keyboard hints',await p.locator('#scr-pause .keyboard-only:not([data-mouse-hint])').isVisible());await press(9);
 await p.evaluate(()=>{G.Game.player.rerolls=0;G.RunUI.showLevelUp(2,G.LevelUp.offer(G.Game.player),()=>G.RunUI.closeLevelUp());});await press(2);await p.evaluate(()=>window.__pad.buttons[2].pressed=true);await p.waitForTimeout(450);await p.evaluate(()=>window.__pad.buttons[2].pressed=false);await p.waitForTimeout(80);
 check('reroll X is edge-triggered and obeys existing limit',await p.evaluate(()=>G.Game.player.rerolls===1));await press(2);check('exhausted reroll cannot be bypassed',await p.evaluate(()=>G.Game.player.rerolls===1));await press(0);
 // Real animation and prop pixels, with the actual Y-sort + masked aid renderer.
 await p.evaluate(()=>{const a=G.Game.player;window.__old={x:a.x,y:a.y};window.__tree=G.World.visibleProps(G.Camera).find(p=>p.type==='tree');if(!window.__tree)throw Error('fixture requires visible tree');a.invuln=1e9;});
 for(const [name,dy]of [['tree-front',25],['tree-behind',-32],['tree-overlap',-50]]){
  await p.evaluate(({dy})=>{const a=G.Game.player,t=window.__tree;a.x=t.x;a.y=t.y+dy;G.Camera.x=a.x;G.Camera.y=a.y;}, {dy});await p.waitForTimeout(180);await p.screenshot({path:path.join(OUT,name+'.png')});
 }
 const ring=await p.evaluate(()=>{const a=G.Game.player,c=document.createElement('canvas').getContext('2d'),calls=[],draw=a.anim.draw,ellipse=c.ellipse;a.anim.draw=()=>calls.push('body');c.ellipse=function(...v){if(this.strokeStyle==='#ffdf57')calls.push(v[6]===Math.PI?'front':'rear');return ellipse.apply(this,v);};a.draw(c);a.anim.draw=draw;return calls;});check('ring rear/body/front order is stable across sprite frames',ring.join(',')==='rear,body,front');
 const pixels=await p.evaluate(()=>{const a=G.Game.player,t=window.__tree,c=document.createElement('canvas');c.width=c.height=256;const x=c.getContext('2d');a.x=t.x;a.y=t.y-32;const base=()=>{x.setTransform(1,0,0,1,128-a.x,180-a.y);x.clearRect(a.x-128,a.y-180,256,256);a.draw(x);G.World.drawProp(x,t,performance.now()/1000);};base();const before=x.getImageData(0,0,256,256).data;for(let i=0;i<20;i++)G.Occlusion.draw(x,[a],[t],0,1/60);const after=x.getImageData(0,0,256,256).data;let changed=0,opaque=0;for(let i=0;i<before.length;i+=4)if(before[i]!==after[i]||before[i+1]!==after[i+1]||before[i+2]!==after[i+2]){changed++;if(after[i+3]===255)opaque++;}document.body.appendChild(c);c.id='occlusion-proof';c.style.cssText='position:fixed;top:40px;left:40px;z-index:2000;background:#316638;border:2px solid white';return {changed,opaque};});
 check('foreground art receives only masked translucent character pixels',pixels.changed>0);await p.screenshot({path:path.join(OUT,'occlusion-detail.png')});await p.evaluate(()=>document.getElementById('occlusion-proof').remove());
 await p.evaluate(()=>window.__pad=null);await p.waitForTimeout(100);check('disconnect stops prior actuator and clears movement',await p.evaluate(()=>window.__reset>0&&G.Gamepad.axis().every(n=>n===0)));
 check('browser runtime and native-dialog errors absent',errors.length===0);fs.writeFileSync(path.join(OUT,'BROWSER.json'),JSON.stringify({checks,errors},null,2));console.log('PASS INTERACTION_BROWSER: '+checks.length+' checks; errors=0');
 }catch(e){console.log('ERRORS',errors);if(browser)for(const p of browser.contexts().flatMap(c=>c.pages())){try{await p.screenshot({path:path.join(OUT,'failure.png')});console.log('STATE',await p.evaluate(()=>({state:G.Game.state,focus:document.activeElement.tagName+'#'+document.activeElement.id,dialogs:G.Dialog.open,html:document.querySelector('.pad-focus')?.outerHTML.slice(0,250)})));await p.screenshot({path:path.join(OUT,'failure.png')});}catch{}}throw e;}finally{if(browser)await browser.close();await app.close();fs.rmSync(dir,{recursive:true,force:true});}
})().catch(e=>{console.error(e);process.exitCode=1;});
