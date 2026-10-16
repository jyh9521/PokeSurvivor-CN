/* Real Chrome instances, real authenticated HTTP/SQLite/WS and mixed local RTC.
 * Controlled combat inputs do not represent public-network/device acceptance. */
const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),vm=require('node:vm'),assert=require('node:assert/strict');
const {chromium}=require('playwright'),{createApp}=require('../server/app.cjs');
const RELAY=process.env.PS_RELAY_ONLY==='1',MELEE=process.env.PS_MELEE==='1',BATTLE=process.env.PS_BATTLE==='1';
const ROOT=path.resolve(__dirname,'..'),OUT=path.join(ROOT,BATTLE?'artifacts/battle-overhaul':MELEE?'artifacts/melee-rebalance':'artifacts/challenge-rewards',RELAY?'relay':'mixed');fs.mkdirSync(OUT,{recursive:true});
(async()=>{const dir=fs.mkdtempSync(path.join(os.tmpdir(),'ps-expansion-browser-')),root=path.join(dir,'web');fs.mkdirSync(root);for(const n of ['js','css','assets'])fs.cpSync(path.join(ROOT,n),path.join(root,n),{recursive:true});for(const n of ['sw.js','version.json','manifest.webmanifest'])fs.copyFileSync(path.join(ROOT,n),path.join(root,n));fs.copyFileSync(path.join(ROOT,'dev.html'),path.join(root,'index.html'));
  let clockOffset=0;const app=createApp({dataDir:dir,root,campaigns:[],clock:()=>Date.now()+clockOffset});let browser;const checks=[],errors=[];const check=(n,v)=>{assert.ok(v,n);checks.push(n);console.log('PASS',n);};
  try{await new Promise(r=>app.server.listen(0,'127.0.0.1',r));const origin='http://127.0.0.1:'+app.server.address().port;browser=await chromium.launch({channel:'chrome',headless:true,args:['--disable-background-timer-throttling','--disable-renderer-backgrounding','--disable-backgrounding-occluded-windows']});
    const source=fs.readFileSync(path.join(ROOT,'js/core/db.js'),'utf8'),users=[],pages=[];
    for(let i=0;i<8;i++){const name='Expansion'+i,u=await app.store.credentials(name,'test-password',true),s=vm.runInNewContext('const VERSION=3,START_COINS=500;'+source.slice(source.indexOf('  function newSave('),source.indexOf('  /** Rellena'))+'\nnewSave("'+name+'")');const dex=BATTLE?[6,593,668,865,999,1003,1008,1025][i]:1;s.partner=dex;s.owned={[dex]:{}};s.pupg={[dex]:{hp:2}};app.store.putSave(u,s,0);users.push(u);}
    async function open(u,i){const c=await browser.newContext({locale:'zh-CN',viewport:i===0?{width:390,height:844}:{width:900,height:650},serviceWorkers:'block'});await c.addCookies([{name:'ps_nas',value:app.store.session(u,'Expansion fixture'),url:origin,httpOnly:true,sameSite:'Strict'}]);await c.addInitScript(({rtc})=>{const W=WebSocket;window.WebSocket=class extends W{constructor(...args){super(...args);(window.__fixtureSockets||=[]).push(this);}};if(!rtc){window.RTCPeerConnection=undefined;window.mozRTCPeerConnection=undefined;window.webkitRTCPeerConnection=undefined;}else{const P=RTCPeerConnection;window.RTCPeerConnection=class extends P{constructor(){super({iceServers:[]});}};}},{rtc:!RELAY&&i<4});const p=await c.newPage();p.on('pageerror',e=>errors.push(e.stack));await p.goto(origin);await p.waitForFunction(()=>G.NAS.enabled&&document.getElementById('boot').classList.contains('hidden'));if(await p.locator('#tap-start').isVisible())await p.locator('#tap-start').click();await p.locator('#scr-menu').waitFor({state:'visible'});return p;}
    const a=await open(users[0],0);pages.push(a);
    if(BATTLE){
      await a.locator('[data-go="dex"]').click();await a.locator('#dex-gens [data-gen="0"]').click();
      check('all-regions tab precedes Kanto and renders the complete 975-species catalog',await a.locator('#dex-gens button').count()===10&&await a.locator('#dex-grid .cell').count()===975);
      check('species details display all six stats and the adapted native trait',await a.locator('#dex-detail .stat-radar [data-stat]').count()===6&&await a.locator('.trait-description').innerText().then(t=>t.includes('物种特性')&&t.includes('本作效果')));
      await a.locator('#dex-owned').selectOption('own');await a.locator('#dex-type').selectOption('fire');await a.locator('#dex-rarity').selectOption('4');await a.locator('#dex-search').fill('#006');
      await a.waitForFunction(()=>document.querySelectorAll('#dex-grid .cell').length===1);
      check('acquisition/type/rarity/search combine rather than overwrite each other',await a.locator('#dex-grid .cell').getAttribute('data-dex')==='6');
      await a.locator('#dex-reset').click();await a.locator('#dex-search').fill('皮卡丘');await a.waitForFunction(()=>document.querySelectorAll('#dex-grid .cell').length===1);
      check('Chinese name search finds an unowned species without changing ownership',await a.locator('#dex-grid .cell').getAttribute('data-dex')==='25'&&await a.evaluate(()=>!G.DB.save.owned[25]));
      await a.locator('#dex-search').fill('Johto');await a.waitForFunction(()=>document.querySelectorAll('#dex-grid .cell').length===100);
      check('all-field search includes English region names',await a.locator('#dex-grid .cell').count()===100);
      await a.locator('#dex-type').selectOption('fire');await a.locator('#dex-search').fill('关都');await a.waitForFunction(()=>{const cells=[...document.querySelectorAll('#dex-grid .cell')];return cells.length>0&&cells.every(c=>{const p=G.DEX_BY[c.dataset.dex];return p.gen===1&&p.types.includes('fire');});});
      check('multilingual region queries combine with the type selector',await a.evaluate(()=>[...document.querySelectorAll('#dex-grid .cell')].every(c=>{const p=G.DEX_BY[c.dataset.dex];return p.gen===1&&p.types.includes('fire');})));
      await a.locator('#dex-search').fill('<script>not-a-pokemon</script>');await a.waitForFunction(()=>document.querySelectorAll('#dex-grid .cell').length===0);
      check('search renders literal user input without injecting HTML',await a.locator('#dex-grid script').count()===0);
      await a.locator('#dex-reset').click();await a.setViewportSize({width:1280,height:800});await a.screenshot({animations:'disabled',path:path.join(OUT,'catalog-desktop.png')});await a.setViewportSize({width:390,height:844});await a.screenshot({animations:'disabled',path:path.join(OUT,'catalog-portrait.png')});
      check('portrait catalog search stays inside the viewport',await a.locator('#dex-search').boundingBox().then(b=>b.x>=0&&b.x+b.width<=390));
      await a.locator('#scr-dex [data-back]').click();
    }
    await a.locator('#menu-challenges').click();await a.locator('[data-challenge-start]').waitFor({state:'visible'});await a.waitForFunction(()=>!document.querySelector('[data-challenge-start]').disabled);
    check('Chinese challenge UI shows fixed rules and separate leaderboard',await a.locator('[data-challenge-info]').innerText().then(s=>s.includes('UTC')&&s.includes('每档奖励')));
    await a.screenshot({animations:'disabled',path:path.join(OUT,'challenge-portrait.png')});
    const beforeChallenge=app.store.getSave(users[0].id);await a.locator('[data-challenge-start]').click();await a.waitForFunction(()=>G.Game.state==='playing'&&G.RunModes.active?.kind==='challenge');
    check('actual challenge uses fixed starter, fixed seed and no permanent upgrades',await a.evaluate(()=>G.Game.player.dex===G.RunModes.active.dex&&Object.keys(G.DB.upgradesOf(G.Game.player.dex)).length===0));
    await a.waitForTimeout(1200);await a.evaluate(()=>G.Game.quit());await a.waitForFunction(()=>G.Game.state==='over'&&!G.RunModes.active);await a.waitForFunction(()=>document.getElementById('over-title').textContent.includes('达标奖励'));
    check('challenge settlement restores exact original save and never credits rewards',JSON.stringify(app.store.getSave(users[0].id))===JSON.stringify(beforeChallenge));
    await a.waitForFunction(async()=>{const r=await G.NAS.api('challenges/ranking?period=d');return r.rows.length===1;});check('challenge score only enters challenge board',(await a.evaluate(()=>G.NAS.api('ranking'))).rows.length===0);
    await a.locator('#btn-again').click();await a.locator('#scr-menu').waitFor({state:'visible'});
    const Rules=require('../js/core/challenge-rules.js'),day=Rules.current('d',Date.now()+clockOffset),week=Rules.current('w',Date.now()+clockOffset),date=new Date(day.start).toISOString().slice(0,10),weekDate=new Date(week.start).toISOString().slice(0,10);
    // Accepted-score fixtures exercise reward UI; elapsed-time eligibility is separately tested through real HTTP runs.
    for(const c of [day,week])app.store.addScore('c',{challenge:c.id,uids:[users[0].id],names:[users[0].name],dex:[c.dex],shiny:[false],t:c.period==='d'?900:1800,lv:1,kills:9});
    const beforeClaim=await a.evaluate(()=>{window.__preRewardCopy=structuredClone(G.DB.save);return {coins:G.DB.save.coins,t1:G.DB.save.tickets.t1};});await a.locator('#menu-challenges').click();await a.waitForFunction(()=>!document.querySelector('[data-challenge-claim]').disabled);await a.locator('[data-challenge-claim]').click();await a.waitForFunction(()=>document.querySelectorAll('[data-tier][data-claimed="true"]').length===3);
    check('daily claim UI credits exactly the configured wallet and tickets',app.store.getSave(users[0].id).save.coins===beforeClaim.coins+3000&&app.store.getSave(users[0].id).save.tickets.t1===beforeClaim.t1+3);
    const afterClaim=app.store.getSave(users[0].id);await a.evaluate(()=>G.NAS.api('challenges/claim',{period:'d'}));check('repeat claim cannot credit rewards twice',JSON.stringify(app.store.getSave(users[0].id))===JSON.stringify(afterClaim));
    await a.evaluate(()=>{for(const k of Object.keys(G.DB.save))delete G.DB.save[k];Object.assign(G.DB.save,structuredClone(window.__preRewardCopy));G.DB.save.coins-=11;G.DB.commit();return G.NAS.flush();});check('stale browser reward copy is retained as a conflict',await a.evaluate(()=>!!G.NAS.conflict));await a.evaluate(()=>G.NAS.resolve('browser'));
    check('stale browser resolution restores only the missing reward deltas once',app.store.getSave(users[0].id).save.coins===beforeClaim.coins+3000-11&&app.store.getSave(users[0].id).save.tickets.t1===beforeClaim.t1+3);
    // Make the real backend's next daily boundary occur shortly, without changing the browser wall clock.
    clockOffset=day.end-250-Date.now();await a.locator('[data-challenge-refresh]').click();await a.waitForFunction(old=>document.querySelector('[data-challenge-info]').textContent.includes(new Date(old+86400000).toISOString().slice(0,10)),day.start);
    check('open challenge page refreshes automatically at the server daily boundary',await a.locator('[data-challenge-claim]').isDisabled());
    await a.locator('[data-period="w"]').click();const currentWeek=Rules.current('w',Date.now()+clockOffset);clockOffset=currentWeek.end-250-Date.now();await a.locator('[data-challenge-refresh]').click();await a.waitForFunction(start=>document.querySelector('[data-challenge-info]').textContent.includes(new Date(start+7*86400000).toISOString().slice(0,10)),currentWeek.start);
    check('open challenge page refreshes automatically at the server weekly boundary',await a.locator('[data-challenge-info]').innerText().then(t=>t.includes('每周挑战')));
    await a.locator('[data-challenge-rank]').click();await a.locator('#scr-rank').waitFor({state:'visible'});check('Challenge tab sits next to Solo and Group in existing rankings',await a.locator('#rk-mode button').count()===3&&await a.locator('#rk-mode [data-value="c"]').innerText().then(t=>t.includes('挑战')));
    await a.locator('#rk-period [data-value="d"]').click();await a.locator('#rk-date').fill(date);await a.locator('#rk-date').dispatchEvent('change');await a.waitForFunction(()=>document.querySelectorAll('#rk-list .rk-row').length===1);
    check('daily challenge ranking queries the selected archived date',await a.locator('#rk-list').innerText().then(t=>t.includes('Expansion0'))&&await a.locator('#rk-challenge-range').innerText().then(t=>t.includes(date)));
    await a.locator('#rk-period [data-value="w"]').click();await a.locator('#rk-date').fill(weekDate);await a.locator('#rk-date').dispatchEvent('change');await a.waitForFunction(()=>document.querySelectorAll('#rk-list .rk-row').length===1);
    check('weekly challenge ranking shows selected period and retained results',await a.locator('#rk-challenge-range').innerText().then(t=>t.includes(weekDate)&&t.includes('→')));await a.screenshot({animations:'disabled',path:path.join(OUT,'challenge-ranking-portrait.png')});await a.setViewportSize({width:1280,height:800});await a.screenshot({animations:'disabled',path:path.join(OUT,'challenge-ranking-desktop.png')});await a.setViewportSize({width:390,height:844});await a.evaluate(()=>G.MenuUI.open());
    // Genuine parallel economy conflict with disjoint collections.
    const browserBalance=await a.evaluate(()=>G.DB.save.coins);const old=app.store.getSave(users[0].id),remote=structuredClone(old.save);remote.coins+=30;remote.owned[2]={};app.store.putSave(users[0],remote,old.rev);
    await a.evaluate(()=>{G.DB.save.coins-=11;G.DB.save.owned[3]={};G.DB.commit();return G.NAS.flush();});await a.evaluate(()=>G.SettingsUI.open('acc'));
    check('conflict table exposes exact values, revisions, time and export-both action',await a.locator('.save-comparison tr').count()===9&&await a.locator('[data-nas="export-both"]').isVisible());
    const download=a.waitForEvent('download');await a.locator('[data-nas="export-both"]').click();const downloaded=await download;const target=path.join(OUT,'conflict-both.json');await downloaded.saveAs(target);const backup=JSON.parse(fs.readFileSync(target));check('download preserves two independent original saves',backup.browser.save.coins===browserBalance-11&&backup.nas.save.coins===remote.coins&&backup.browser.rev!==backup.nas.rev);
    await a.locator('[data-nas="nas"]').click();await a.locator('#dialog-cancel').click();check('cancel resolution retains both versions',await a.evaluate(()=>!!G.NAS.conflict));
    await a.locator('[data-nas="nas"]').click();await a.locator('#dialog-confirm').click();await a.waitForFunction(()=>!G.NAS.conflict&&!G.NAS.pending);
    check('confirmed resolution uses one exact economy and retains both collections',app.store.getSave(users[0].id).save.coins===remote.coins&&app.store.getSave(users[0].id).save.owned[2]&&app.store.getSave(users[0].id).save.owned[3]);await a.screenshot({animations:'disabled',path:path.join(OUT,'save-portrait.png')});await a.locator('#set-close').click();
    for(let i=1;i<8;i++)pages.push(await open(users[i],i));
    await a.locator('[data-go="friends"]').click();await a.locator('#fr-create').click();await a.locator('#scr-lobby').waitFor({state:'visible'});
    for(let i=1;i<8;i++){app.store.request(users[0],undefined,users[i].id);app.store.friendship(users[i],users[0].id,true);await a.evaluate(uid=>G.Social.invite(uid),users[i].id);await pages[i].waitForFunction(()=>G.Social.invites.length>0);await pages[i].evaluate(uid=>G.Social.acceptInvite(uid),users[0].id);}
    await a.waitForFunction(relayOnly=>G.Social.room.members.length===8&&(relayOnly?G.Net.stats().directPeers===0&&G.Net.stats().relayPeers===7:G.Net.stats().directPeers>=3&&G.Net.stats().relayPeers>=4),RELAY);
    check('eight-player lobby uses eight colored cards and the requested real transport paths',await a.locator('.lob-card').count()===8&&await a.evaluate(()=>G.Coop.COLORS.length===8&&G.Social.MAX_PLAYERS===8));await a.screenshot({animations:'disabled',path:path.join(OUT,'eight-lobby-portrait.png')});
    for(const p of pages)await p.evaluate(()=>G.Social.setReady(true));const snapshots=users.map(u=>app.store.getSave(u.id));const browserSnapshots=await Promise.all(pages.map(p=>p.evaluate(()=>JSON.stringify(G.DB.save))));await a.waitForFunction(()=>!document.getElementById('lobby-start').disabled);await a.locator('#lobby-start').click();for(const p of pages)await p.waitForFunction(()=>G.Coop.active&&G.Game.state==='playing'&&!G.RunModes.active);
    check('all eight real browsers start normal combat with seven remote players',await Promise.all(pages.map(p=>p.evaluate(()=>G.Coop.players().length===8))).then(v=>v.every(Boolean)));
    if(BATTLE)check('seven added species start and synchronize their multiplayer identities',await Promise.all(pages.slice(1).map((p,i)=>p.evaluate(d=>G.Game.player.dex===d,[593,668,865,999,1003,1008,1025][i]))).then(xs=>xs.every(Boolean))&&await a.evaluate(uids=>uids.every(uid=>!!G.Coop.mate(uid)?.pl&&G.SPRITE_META[G.Coop.mate(uid).pl.dex]),users.slice(1).map(u=>u.id)));
    await a.waitForTimeout(2200);const metrics=await a.evaluate(()=>G.NAS.networkMetrics());check('eight-player snapshot pacing caps at 10Hz and diagnostics separate actual paths',metrics.targetHz<=10&&(RELAY?metrics.directPeers===0&&metrics.relayPeers===7:metrics.directPeers>=3&&metrics.relayPeers>=4));
    if(BATTLE){
      for(const lane of [3,1]){await a.evaluate(()=>G.Coop.levelStart(G.Game.player.level));for(const p of pages)await p.locator('#scr-levelup').waitFor({state:'visible'});check('eight-player shared level exposes four fixed lanes '+lane,await Promise.all(pages.map(p=>p.locator('#cards .card').count())).then(xs=>xs.every(n=>n===4)));for(const p of pages)await p.locator('#cards .card').nth(lane).click();for(const p of pages)await p.waitForFunction(()=>G.Game.state==='playing');}
      check('eight players resume after learning then upgrading their own passive',await Promise.all(pages.map(p=>p.evaluate(()=>Object.values(G.Game.player.passives).length===1&&Object.values(G.Game.player.passives)[0]===2))).then(xs=>xs.every(Boolean)));
    }
    if(MELEE){
    // Controlled real-game fixtures: actual cast/host messages and actual enemy deaths.
    for(const p of pages)await p.evaluate(()=>{const p=G.Game.player;p.slots=[];G.Projectiles.clear();G.Combat.clearFields();p.passives={};p.statsTaken={};p.frozen=true;p.invuln=1e6;p.maxHp=100;p.hp=100;p.regenFlat=0;p.buffs.regen.n=0;});
    const fixture=await a.evaluate(()=>{G.Spawner.update=()=>{};G.EnemyMgr.clear();const p=G.Game.player;return {x:p.x,y:p.y};});
    for(const p of pages)await p.evaluate(({x,y})=>{G.Game.player.x=x;G.Game.player.y=y;},fixture);
    const victimId=await a.evaluate(({x,y})=>{const e=new G.Enemy({dex:1,hp:1,spd:0,dmg:0,xp:0,behavior:'chaser'},x+35,y,{hp:1,spd:1,dmg:1});G.EnemyMgr.add(e);G.EnemyMgr.rebuildGrid();return e.id;},fixture);
    const guest=pages[1];await guest.waitForFunction(id=>!!G.EnemyMgr.get(id),victimId);
    const cast=await guest.evaluate(id=>{const p=G.Game.player,e=G.EnemyMgr.get(id);p.hp=20;p.x=e.x-35;p.y=e.y;p.meleeHeals=[];p.meleeGuardT=0;p.slots=[[G.Moves.instance('bite')]];G.Combat.tick(.001,p,0);p.activeMove().t=999;return {hp:p.hp,id:e.id};},victimId);
    check('guest does not predict kill healing before host confirms',cast.hp===20);
    await guest.waitForFunction(()=>G.Game.player.hp===21,null,{timeout:10000}).catch(async e=>{console.log('MELEE_DEBUG',JSON.stringify({guest:await guest.evaluate(id=>({hp:G.Game.player.hp,heals:G.Game.player.meleeHeals,dead:G.Game.player.dead,state:G.Game.state,enemy:G.EnemyMgr.get(id)?.hp,errors:window.__fixtureErrors}),victimId),host:await a.evaluate(id=>({enemy:G.EnemyMgr.get(id)?.hp,dead:G.EnemyMgr.get(id)?.dead,seen:G.Coop.mates.map(m=>({uid:m.uid,seen:m.meleeSeen}))}),victimId),errors}));throw e;});
    check('real guest melee cast credits exactly one host-confirmed kill heal',await a.evaluate(id=>!G.EnemyMgr.get(id)||G.EnemyMgr.get(id).dead,victimId));
    await guest.evaluate(()=>{const p=G.Game.player;p.slots=[[G.Moves.instance('ember')]];p.activeMove().t=999;});
    check('confirmed melee guard survives a switch to ranged',await guest.evaluate(()=>G.Game.player.meleeGuardT>0));
    const hp=await guest.evaluate(()=>G.Game.player.hp);await guest.evaluate(()=>{const e={id:987654,remote:true};const m=G.Moves.instance('bite');G.Coop.meleeHit(e,100,'#fff',1,0,m);});await guest.waitForTimeout(250);
    check('missing or already dead targets never grant additional heal',await guest.evaluate(()=>G.Game.player.hp)===hp);
    const controlId=await a.evaluate(({x,y})=>{const e=new G.Enemy({dex:1,hp:100000,spd:0,dmg:0,xp:0,behavior:'chaser'},x+35,y,{hp:1,spd:1,dmg:1});G.EnemyMgr.add(e);G.EnemyMgr.rebuildGrid();return e.id;},fixture);
    for(const p of pages)await p.waitForFunction(id=>!!G.EnemyMgr.get(id),controlId);
    // Keep the controlled target alive while all eight players swing both combo strikes.
    await Promise.all(pages.map(p=>p.evaluate(id=>{const p=G.Game.player,e=G.EnemyMgr.get(id);p.x=e.x-35;p.y=e.y;p.slots=[[G.Moves.instance('metal-claw')]];p.activeMove().cd=.16;p.atkMul=1;p.baseAtk=1;},controlId)));
    await a.waitForTimeout(1500);
    const effects=await a.evaluate(id=>{const e=G.EnemyMgr.get(id);return {hp:e.hp,shred:e.meleeShredT,kx:e.kx,ky:e.ky,cd:e.staggerCd};},controlId);
    check('eight-player real combo damage and shared non-stacking shred reach the authority',effects.hp<100000&&effects.shred>0&&effects.shred<=2);
    check('eight-player melee knockback remains bounded',Math.hypot(effects.kx,effects.ky)<=60.001);
    for(const p of pages)await p.evaluate(()=>{G.Game.player.slots=[];G.Combat.clearFields();});
    await a.waitForTimeout(900);
    check('shared stagger expires even after eight-player pressure',await a.evaluate(id=>!(G.EnemyMgr.get(id).staggerT>0),controlId));
    await a.screenshot({animations:'disabled',path:path.join(OUT,'melee-eight-player.png')});
    }
    if(BATTLE){
      for(const p of pages)await p.evaluate(()=>{const p=G.Game.player;p.slots=[];G.Combat.clearFields();G.Battle.init(p);});
      const phaseId=await a.evaluate(()=>{const p=G.Game.player,e=new G.Enemy({dex:92,hp:1000000,spd:0,dmg:1,xp:0,behavior:'chase',stageChain:[92,93,94]},p.x+100,p.y,{hp:1,spd:1,dmg:1},true);e.shotDmg=()=>0;G.EnemyMgr.add(e);e.hp=e.maxHp*.6;return e.id;});
      await pages[1].waitForFunction(id=>G.EnemyMgr.get(id)?.dex===93&&G.EnemyMgr.get(id)?.bossStage===1,phaseId,{timeout:10000});
      check('a real host boss stage changes species and reaches guest snapshots',true);
      await a.evaluate(id=>G.EnemyMgr.get(id).hp=200000,phaseId);await pages[2].waitForFunction(id=>G.EnemyMgr.get(id)?.dex===94&&G.EnemyMgr.get(id)?.bossStage===2,phaseId,{timeout:10000});
      check('third-stage Gengar synchronizes without refilling the one shared HP pool',await a.evaluate(id=>G.EnemyMgr.get(id).hp<=200000,phaseId));
      await a.evaluate(id=>{const e=G.EnemyMgr.get(id);e.hp=0;e.dead=true;},phaseId);
      await a.evaluate(()=>{const p=G.Game.player;let card;for(let i=0;i<100&&!card;i++)card=G.LevelUp.offer(p).find(c=>c.type==='passive');if(!card)throw Error('No passive offers');window.__passiveCard=card.key;G.RunUI.showLevelUp(2,[card],c=>{c.apply(p);G.RunUI.closeLevelUp();});});
      await a.locator('#cards .card').click();
      check('a real level-up card learns a passive without taking an attack slot',await a.evaluate(()=>Object.keys(G.Game.player.passives).length===1&&G.Game.player.slots.length===0));
      const defense=await a.evaluate(()=>{const p=G.Game.player;p.passives={};for(const id of ['harden','light-screen','protect','iron-defense'])G.Battle.learn(p,id);G.Battle.tick(p,0);p.invuln=0;p.battle.block=1;p.battle.shield=0;p.hp=60;const random=Math.random;Math.random=()=>.99;try{p.hurt(20);const blocked=p.hp;p.invuln=0;p.hurt(20);return {blocked,hp:p.hp,learned:Object.keys(p.passives).length,fifth:G.Battle.learn(p,'calm-mind')};}finally{Math.random=random;p.invuln=1e6;}});
      check('live block negates one hit, armor reduces the next, and passive slots are bounded',defense.blocked===60&&defense.hp<60&&defense.hp>40&&defense.learned===4&&!defense.fifth);
      const fieldTarget=await a.evaluate(uid=>{const q=G.Coop.mate(uid).pl,e=new G.Enemy({dex:1,hp:10000,spd:0,dmg:0,xp:0,behavior:'chaser'},q.x+40,q.y,{hp:1,spd:1,dmg:1});G.EnemyMgr.add(e);G.EnemyMgr.rebuildGrid();return e.id;},users[2].id);
      await pages[2].waitForFunction(id=>!!G.EnemyMgr.get(id),fieldTarget);
      await pages[2].evaluate(id=>{const p=G.Game.player,e=G.EnemyMgr.get(id);p.target=e;p.aim=Math.atan2(e.y-p.y,e.x-p.x);p.slots=[[G.Moves.instance('surf')]];G.Combat.tick(.001,p,0);p.activeMove().t=999;},fieldTarget);
      await a.waitForFunction(id=>G.EnemyMgr.get(id)?.hp<10000,fieldTarget,{timeout:10000});
      check('a real guest moving wave damages the authoritative enemy through a confirmed receipt',await pages[2].evaluate(()=>G.Game.player.dmgDealt>0));
      const beforeMark=await a.evaluate(id=>G.EnemyMgr.get(id).hp,fieldTarget);
      await pages[2].evaluate(id=>{const p=G.Game.player,e=G.EnemyMgr.get(id);p.target=e;p.slots=[[G.Moves.instance('earth-power')]];G.Combat.tick(.001,p,0);p.activeMove().t=999;},fieldTarget);
      await a.waitForFunction(({id,hp})=>G.EnemyMgr.get(id)?.hp<hp,{id:fieldTarget,hp:beforeMark},{timeout:10000});
      check('guest delayed marks detonate at the selected target and settle through the room authority',true);
      await pages[2].evaluate(()=>{G.Game.player.slots=[];G.Combat.clearFields();});
      await a.evaluate(()=>G.Game.player.battle.energy=100);await a.locator('[data-battle-choice="mega"]').click();await a.locator('#battle-activate').click();
      await pages[1].waitForFunction(uid=>G.Coop.mate(uid)?.pl.battle.form==='mega',users[0].id,{timeout:10000});
      check('Mega activates through the actual button and synchronizes form and passives to peers',await pages[1].evaluate(uid=>Object.keys(G.Coop.mate(uid).pl.passives).length===4,users[0].id));
      check('Mega uses audited alternate animation where available and does not replace species identity',await a.evaluate(()=>{const p=G.Game.player;return p.dex===6&&p.anim.dex===G.BattleDex.species[6].mega[0].id&&p.battle.remaining>0;}));
      const beforeMax=await pages[1].evaluate(()=>{const p=G.Game.player;p.battle.energy=100;window.__preMax={hp:p.hp,max:p.maxHp,r:p.r};return window.__preMax;});
      await pages[1].locator('[data-battle-choice="max"]').click();await pages[1].locator('#battle-activate').click();await a.waitForFunction(uid=>G.Coop.mate(uid)?.pl.battle.form==='max',users[1].id,{timeout:10000});
      check('Dynamax grows the actual sprite and HP and updates its collision radius',await pages[1].evaluate(()=>{const p=G.Game.player;return p.maxHp>window.__preMax.max&&p.r>window.__preMax.r&&p.anim.scale>1.5;}));
      const zTarget=await a.evaluate(uid=>{const q=G.Coop.mate(uid).pl,e=new G.Enemy({dex:1,hp:500,spd:0,dmg:0,xp:0,behavior:'chaser'},q.x+25,q.y,{hp:1,spd:1,dmg:1});G.EnemyMgr.add(e);G.EnemyMgr.rebuildGrid();return e.id;},users[2].id);
      await pages[2].waitForFunction(id=>!!G.EnemyMgr.get(id),zTarget);await pages[2].evaluate(id=>{const p=G.Game.player;p.target=G.EnemyMgr.get(id);p.aim=Math.atan2(p.target.y-p.y,p.target.x-p.x);p.slots=[[G.Moves.instance('thunderbolt')]];p.activeMove().t=999;p.battle.energy=100;},zTarget);await pages[2].locator('[data-battle-choice="z"]').click();await pages[2].locator('#battle-activate').click();await a.waitForFunction(id=>G.EnemyMgr.get(id)?.hp<500,zTarget,{timeout:10000});
      check('guest Z-Move deals real host-authoritative damage and refuses another special form',await pages[2].evaluate(()=>G.Game.player.battle.used&&!G.Battle.activate(G.Game.player,'max')));
      await a.screenshot({animations:'disabled',path:path.join(OUT,'mega-eight-player.png')});await pages[1].screenshot({animations:'disabled',path:path.join(OUT,'dynamax-eight-player.png')});
      await a.evaluate(()=>G.Battle.tick(G.Game.player,31));await pages[1].evaluate(()=>G.Battle.tick(G.Game.player,21));
      await pages[2].waitForFunction(uid=>!G.Coop.mate(uid).pl.battle.form,users[0].id,{timeout:10000});await a.waitForFunction(uid=>!G.Coop.mate(uid).pl.battle.form,users[1].id,{timeout:10000});
      check('temporary forms expire on every peer and restore base HP without a toggle heal',await pages[1].evaluate(()=>{const p=G.Game.player;return p.maxHp===window.__preMax.max&&Math.abs(p.hp-window.__preMax.hp)<.01&&!p.battle.form;}));
      check('form and passive state never enters the persistent wallet/save schema',users.every(u=>{const s=app.store.getSave(u.id).save;return !s.battle&&!s.passives&&!s.form;}));
    }
    if(BATTLE){
      await a.evaluate(()=>{G.Rift.debugArena('fire','starter',6);const e=G.EnemyMgr.get(G.Rift.arena.bossId);e.xp=0;window.__starterBoss=e.id;});
      await pages[1].waitForFunction(()=>G.Rift.arena?.kind==='starter'&&G.Rift.arena.dex===6,null,{timeout:10000});
      check('a starter rift enters the whole eight-player party with its own identity',await a.evaluate(()=>{const e=G.EnemyMgr.get(window.__starterBoss);return e.dex===4&&!e.legend;}));
      await a.evaluate(()=>{const e=G.EnemyMgr.get(window.__starterBoss);e.hp=e.maxHp*.2;});
      await pages[1].waitForFunction(()=>G.EnemyMgr.all().some(e=>e.boss&&e.dex===6&&e.bossStage===2),null,{timeout:10000});
      await a.evaluate(()=>{const e=G.EnemyMgr.get(window.__starterBoss);e.hp=0;e.dead=true;});
      await Promise.all(pages.map(p=>p.waitForFunction(()=>G.Rift.arena?.phase==='won'&&!!G.DB.save.starterBosses?.[6],null,{timeout:10000})));
      check('all eight players receive starter progress, never a false legendary record',(await Promise.all(pages.map(p=>p.evaluate(()=>!G.DB.save.legends?.[6]&&G.DB.save.stats.starterRiftWins===1)))).every(Boolean));
      const bonds=await pages[1].evaluate(()=>G.Game.player.bonds);await pages[1].evaluate(()=>G.Rift.onEvent(['aw',{flawless:true}]));
      check('duplicate guest arena wins do not duplicate bonds or starter records',await pages[1].evaluate(()=>G.Game.player.bonds)===bonds);
      for(const p of pages)await p.evaluate(()=>G.Game.player.bonds=0);
      await a.waitForFunction(()=>!G.Rift.inArena,null,{timeout:10000});await pages[1].waitForFunction(()=>!G.Rift.inArena,null,{timeout:10000});
    }
    const last=pages[7];await last.evaluate(()=>{window.__testRoom=G.Social.room.id;window.__testRun=G.Game.st.time;});await last.context().setOffline(true);await last.evaluate(()=>window.__fixtureSockets.at(-1).close());await a.waitForFunction(()=>G.NAS.networkMetrics().reconnectingPeers>=1,null,{timeout:10000}).catch(async e=>{console.log('RECONNECT_DEBUG',JSON.stringify({host:await a.evaluate(()=>({metrics:G.NAS.networkMetrics(),members:G.Social.room?.members,state:G.Game.state})),last:await last.evaluate(()=>({state:G.Game.state,sockets:window.__fixtureSockets.map(s=>s.readyState)})),errors}));throw e;});await last.context().setOffline(false);await last.waitForFunction(()=>G.Social.room?.members.length===8&&G.NAS.networkMetrics().connected,{},{timeout:20000});
    check('same browser reconnects into the same normal room',await last.evaluate(()=>G.Social.room.id===window.__testRoom));
    await a.evaluate(()=>G.Game.quit());for(const p of pages)if(await p.evaluate(()=>G.Game.state!=='over'))await p.evaluate(()=>G.Game.quit());
    await a.waitForFunction(()=>!G.NAS.pending);for(const p of pages)await p.evaluate(()=>G.NAS.flush());
    check('normal eight-player settlement saves real rewards for all members',users.every((u,i)=>app.store.getSave(u.id).rev>snapshots[i].rev&&app.store.getSave(u.id).save.stats.runs===snapshots[i].save.stats.runs+1));
    check('normal eight-player results enter existing group leaderboard',(await a.evaluate(()=>G.NAS.api('ranking?mode=g'))).rows.some(r=>r.uids.length===8));
    check('all tested pages remain free of runtime errors',errors.length===0);fs.writeFileSync(path.join(OUT,'browser-results.json'),JSON.stringify({checks,errors,relayOnly:RELAY,metrics,sourceHashes:BATTLE?Object.fromEntries([...fs.readFileSync(path.join(root,'index.html'),'utf8').matchAll(/<script[^>]*src="(js\/[^"]+\.js)"/g)].map(m=>[m[1],require('node:crypto').createHash('sha256').update(fs.readFileSync(path.join(root,m[1]))).digest('hex')])):undefined},null,2));console.log((BATTLE?'PASS BATTLE_EIGHT_BROWSER: ':MELEE?'PASS MELEE_EIGHT_BROWSER: ':'PASS COMMUNITY_EXPANSION_BROWSER: ')+checks.length+' checks; errors=0');
  }finally{if(browser)await browser.close();await app.close();fs.rmSync(dir,{recursive:true,force:true});}
})().catch(e=>{console.error(e);process.exitCode=1;});
