/* Native Chrome source UI, real audio decode/ended, actual input-independent casts. */
const fs=require('fs'),path=require('path'),http=require('http'),a=require('assert/strict'),{chromium}=require('playwright');
const root=path.resolve(__dirname,'..'),out=path.join(root,'artifacts/learnsets/browser');fs.mkdirSync(out,{recursive:true});
const server=http.createServer((req,res)=>{try{const u=new URL(req.url,'http://x'),f=path.resolve(root,'.'+(u.pathname==='/'?'/dev.html':decodeURIComponent(u.pathname)));if(!f.startsWith(root+path.sep))throw Error();res.setHeader('content-type',({'.html':'text/html','.js':'application/javascript','.css':'text/css','.wav':'audio/wav','.ogg':'audio/ogg','.json':'application/json'})[path.extname(f)]||'application/octet-stream');res.end(fs.readFileSync(f));}catch{res.writeHead(404).end();}});
(async()=>{let b;const checks=[],errors=[],check=(n,v)=>{a.ok(v,n);checks.push(n);console.log('PASS '+n);};try{
 await new Promise(r=>server.listen(0,'127.0.0.1',r));b=await chromium.launch({channel:'chrome',headless:true});const c=await b.newContext({locale:'zh-CN',viewport:{width:1280,height:800},serviceWorkers:'block'});
 await c.addInitScript(()=>{const proto=(window.AudioContext||window.webkitAudioContext).prototype,old=proto.createBufferSource;proto.createBufferSource=function(){const s=old.call(this),start=s.start;s.start=function(...a){if(s.buffer?.duration>10)s.playbackRate.value=100;return start.apply(this,a);};return s;};});
 const p=await c.newPage();p.on('pageerror',e=>errors.push(e.message));await p.goto('http://127.0.0.1:'+server.address().port);await p.waitForFunction(()=>document.getElementById('boot').classList.contains('hidden'));if(await p.locator('#tap-start').isVisible())await p.locator('#tap-start').click();await p.locator('[data-tab=register]').click();await p.locator('#f-user').fill('LearnsetCheck');await p.locator('#f-pass').fill('fixture-password');await p.locator('#btn-auth').click();await p.locator('#scr-test').waitFor({state:'visible'});for(let i=0;i<30&&await p.locator('#scr-test').isVisible();i++)await p.locator('#test-a .answer').first().click();await p.locator('#res-ok').click();await p.locator('#scr-menu').waitFor({state:'visible'});

 check('Chinese learnset acquisition explanations and special move names are translated',await p.evaluate(()=>G.T('Repertorio histórico verificable')==='可追溯的历代学习记录'&&G.T('Transform','move')==='变身'&&G.T('Brick Break','move')==='劈瓦'));
 check('real browser scans all species without empty pools or inherited sibling grants',await p.evaluate(()=>G.DEX.every(m=>G.Moves.poolFor(m).length>0)&&!G.Moves.poolFor(G.DEX_BY[133]).includes('bubble')&&!G.Moves.poolFor(G.DEX_BY[25]).includes('icy-wind')));
 await p.evaluate(()=>{G.DB.save.owned[132]={at:1};G.DB.save.partner=132;G.DB.save.pupg[132]={moves:1};G.Spawner.update=()=>{};});
 await p.evaluate(()=>G.Game.startRun());
 check('Ditto enters actual game with Transform instead of a generic kit',await p.evaluate(()=>G.Game.player.activeMove().id==='transform'&&G.Game.player.slots.length===1&&G.Game.player.pendingCopiedStart===true));
 await p.evaluate(()=>{const p=G.Game.player;G.EnemyMgr.clear();const e=new G.Enemy({dex:25,hp:1e8,spd:0,dmg:0,xp:0,behavior:'chase'},p.x+70,p.y,{hp:1,spd:1,dmg:1});G.EnemyMgr.add(e);});
 await p.waitForFunction(()=>G.Game.player.copiedDex===25);
 check('live update copies repertoire but retains Ditto identity and produces a real attack',await p.evaluate(()=>G.Game.player.dex===132&&G.Game.player.moves.length===2&&G.Game.player.pendingCopiedStart===false&&G.Game.player.moves.some(m=>!m.learningOnly&&m.castAt>0)&&G.Moves.poolFor(G.Game.player.mon,G.Game.player).includes('thunderbolt')));
 await p.screenshot({path:path.join(out,'ditto-copy.png')});
 await p.evaluate(()=>{G.Game.toUI();G.DB.save.owned[235]={at:1};G.DB.save.partner=235;G.DB.save.pupg[235]={moves:1};});await p.evaluate(()=>G.Game.startRun());
 check('Smeargle cannot choose unseen attacks at run start',await p.evaluate(()=>G.Game.player.activeMove().id==='sketch'&&!G.LevelUp.pool(G.Game.player).some(c=>c.type==='new')));
 await p.evaluate(()=>{const p=G.Game.player;G.EnemyMgr.clear();G.EnemyMgr.add(new G.Enemy({dex:129,hp:1e8,spd:0,dmg:0,xp:0,behavior:'chase'},p.x+70,p.y,{hp:1,spd:1,dmg:1}));});await p.waitForFunction(()=>G.Game.player.observedSpecies?.includes(129));
 check('live Sketch replaces its placeholder and offers only observed attacks',await p.evaluate(()=>G.Game.player.activeMove().id==='hydro-pump'&&G.Game.player.moves.length===2&&G.Moves.poolFor(G.Game.player.mon,G.Game.player).every(id=>['hydro-pump','tackle'].includes(id))));
 await p.screenshot({path:path.join(out,'smeargle-observation.png')});
 await p.evaluate(()=>G.Game.toUI());
 const terrain=await p.evaluate(()=>{
  G.EnemyMgr.clear();G.Combat.clearFields();G.Projectiles.clear();G.World.reset(17);
  G.World.propsInCircle(0,0,1800);const props=G.World.checkpoint().props,results=[];
  for(const type of ['tree','rock']){
   let found=null;const m=G.Moves.instance('aerial-ace');
   for(const o of props.filter(q=>q.type===type&&q.solid))for(const angle of [0,Math.PI/2,Math.PI,Math.PI*1.5]){
    const dx=Math.cos(angle),dy=Math.sin(angle),distance=o.r+24,sx=o.x-dx*distance,sy=o.y-dy*distance;
    if(m.radius<distance+o.r+20||!G.World.isFree(sx,sy,10,true)||!G.World.isFree(sx+dx*m.radius,sy+dy*m.radius,10,true))continue;
    found={o,angle,sx,sy};break;
   }
   if(!found)throw Error('No real '+type+' fixture');
   const actor=new G.Player(G.DEX_BY[6]);actor.x=found.sx;actor.y=found.sy;actor.cast=()=>{};actor.addMove('aerial-ace');actor.aim=found.angle;
   actor.target={x:actor.x+Math.cos(actor.aim)*100,y:actor.y+Math.sin(actor.aim)*100};
   G.Combat.tick(.01,actor,0);
   const travel=Math.hypot(actor.x-found.sx,actor.y-found.sy);
   results.push({type,travel,range:m.radius,free:G.World.isFree(actor.x,actor.y,actor.r,true)});
  }
  return results;
 });
 console.log('REAL_TERRAIN',JSON.stringify(terrain));check('native generated trees and rocks are crossed with full-body free landings',terrain.length===2&&terrain.every(r=>r.free&&Math.abs(r.travel-r.range)<1e-6));
 check('no browser runtime errors',errors.length===0);
 fs.writeFileSync(path.join(out,'results.json'),JSON.stringify({checks,errors,terrain},null,2));
 console.log('PASS LEARNSETS_BROWSER: '+checks.length+' checks; native tree/rock phase verified');
 }finally{if(b)await b.close();await new Promise(r=>server.close(r));}})().catch(e=>{console.error(e);process.exitCode=1;});
