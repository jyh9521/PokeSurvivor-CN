const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
function fixture(){const geom={w:8,h:8,n:4,r:8,d:[6,6,6,6],ax:4,ay:6};const G={SPRITE_META:{1:{a:Object.fromEntries(['Idle','Walk','Attack','Shoot','Hurt','Faint','Strike','Swing','Hop','Double','Rotate','Charge'].map(a=>[a,{...geom,d:geom.d.slice()}]))}},U:{clamp:(n,a,b)=>Math.max(a,Math.min(b,n))}};vm.runInNewContext(fs.readFileSync('js/core/sprites.js','utf8'),{G,Image:class{},performance:{now:()=>0},Date,document:{}});return {G,anim:new G.Sprites.Animator(1)};}
test('full action completes before the newest bounded cast request starts',()=>{const {anim}=fixture();anim.request('Strike');anim.update(.28);const phase=anim.progress();for(let i=0;i<100;i++)anim.request('Swing');assert.equal(anim.cur,'Strike');assert.equal(anim.progress(),phase);anim.update(.13);assert.equal(anim.cur,'Swing');assert.ok(anim.progress()>0);assert.equal(anim.pending,null);});
test('background movement resumes its own phase and updated speed after attacks',()=>{const {anim}=fixture();anim.loop('Walk',2);anim.update(.1);anim.play('Attack');anim.loop('Walk',.5);anim.update(.5);assert.equal(anim.cur,'Walk');assert.equal(anim.speed,.5);assert.ok(anim.progress()>0);});
test('repeated cast requests never interrupt held faint; explicit revive clears queue',()=>{const {anim}=fixture();anim.play('Faint',{hold:true});anim.request('Strike');anim.update(1);assert.equal(anim.cur,'Faint');assert.equal(anim.done,true);anim.play('Idle');assert.equal(anim.pending,null);});
test('remote pose epoch ignores duplicate and stale snapshots without resetting frames',()=>{const {anim}=fixture();const pose=[5,'Strike',6,1,1,0,'Walk',1,2];anim.sync(pose);anim.update(.1);const before=anim.progress();anim.sync(pose);assert.equal(anim.progress(),before);anim.sync([4,'Shoot',0,1,1,0,'Idle',1,0]);assert.equal(anim.cur,'Strike');anim.sync([6,'Strike',0,1,1,0,'Walk',1,2]);assert.equal(anim.progress(),0);assert.equal(anim.dir,2);});
test('same animation epoch on fresh packets uses bounded correction instead of restarting',()=>{const {anim}=fixture();anim.sync([5,'Strike',0,1,1,0,'Walk',1,2]);anim.update(.2);const before=anim.progress();anim.sync([5,'Strike',0,1,1,0,'Walk',1,2]);assert.ok(anim.progress()>=before-.09);assert.ok(anim.progress()>0);});
test('move selection uses complete available actions and variant-aware fallbacks',()=>{const {G}=fixture();assert.equal(G.Sprites.actionFor(1,{kind:'melee',id:'karate-chop'}),'Strike');assert.equal(G.Sprites.actionFor(1,{kind:'dash',id:'aerial-ace'}),'Hop');assert.equal(G.Sprites.actionFor(1,{kind:'buff',id:'swords-dance'}),'Rotate');G.SPRITE_META[1].sh=1;G.SPRITE_META[1].sm=['Strike'];assert.equal(G.Sprites.actionFor(1,{kind:'melee'},true),'Attack');});
const sourceCast=fs.readFileSync('js/entities/player.js','utf8');
test('actual Player.cast cannot reset a seventy-percent complete attack and keeps costs/audio',()=>{
 const {G,anim}=fixture();let sounds=0;G.Audio={sfx:()=>sounds++};vm.runInNewContext(sourceCast,{G});
 const p={dex:1,shiny:false,remote:false,anim,hp:100,maxHp:100,cdMul:1,hasItem:()=>true};const m={id:'karate-chop',kind:'melee',type:'fighting',cd:1};
 G.Player.prototype.cast.call(p,m);anim.update(.28);const before=anim.elapsed;G.Player.prototype.cast.call(p,m);
 assert.equal(anim.elapsed,before);assert.equal(sounds,2);assert.equal(p.hp,98);assert.equal(anim.pending.anim,'Strike');anim.update(.13);assert.equal(anim.cur,'Strike');assert.ok(anim.elapsed<before);
});
test('all source frames are visited at 60Hz and 30Hz playback finishes with equal background phase',()=>{
 const a=fixture().anim,b=fixture().anim,frames=new Set();for(const p of [a,b]){p.loop('Walk',.75);p.play('Strike');}
 for(let n=0;n<36;n++){frames.add(a.frame);a.update(1/60);}for(let n=0;n<18;n++)b.update(1/30);
 assert.deepEqual([...frames].sort(),[0,1,2,3]);assert.equal(a.cur,b.cur);assert.ok(Math.abs(a.elapsed-b.elapsed)<1e-7);assert.equal(a.speed,.75);
});
test('malformed and reordered animation poses do not corrupt animation clocks',()=>{
 const {anim}=fixture();anim.sync([4,'Strike',12,1,1,0,'Walk',1,2]);const before=anim.snapshot();
 for(const p of [[3,'Shoot',0,1,1,0,'Walk',1,2],[5,'__proto__',0,1,1,0,'Walk',1,2],[5,'Shoot',NaN,1,1,0,'Walk',1,2],[5,'Shoot',0,-1,1,0,'Walk',1,2],[5,'Shoot',0,1,1,0,'Walk',1,9]])assert.equal(anim.sync(p),false);
 assert.deepEqual(anim.snapshot(),before);anim.sync([4,'Strike',0,1,1,0,'Walk',1,2]);assert.ok(anim.elapsed>=12);anim.sync([5,'Strike',6,1,1,0,'Walk',1,2],NaN);assert.equal(anim.elapsed,6);
});
test('lazy decoded-sheet cache evicts even recently used entries under mobile byte budget',()=>{
 const G={SPRITE_META:{},Settings:{get:()=> 'potato'},U:{clamp:(n,a,b)=>Math.max(a,Math.min(b,n))}};
 for(let i=1;i<=40;i++)G.SPRITE_META[i]={a:{Idle:{w:1024,h:1024,n:1,r:1,d:[6],ax:512,ay:900}}};
 const images=[];class Image{constructor(){images.push(this);this.width=1024;this.height=1024;}}
 vm.runInNewContext(fs.readFileSync('js/core/sprites.js','utf8'),{G,Image,performance:{now:()=>0},Date,document:{}});
 for(let i=1;i<=40;i++){const s=G.Sprites.sheet(i,'Idle');s.img.onload();assert.ok(G.Sprites.cacheStats().bytes<=32*1024*1024);}
 assert.ok(G.Sprites.sheetCount<=8);assert.ok(images.some(i=>i.src===''));assert.equal(G.Sprites.sheet(40,'Idle').ready,true);
});
test('actual remote Enemy.netUpdate follows same-name source epochs and keeps positional interpolation',()=>{
 const {G,anim}=fixture();G.U.dist2=(x,y,a,b)=>(x-a)**2+(y-b)**2;G.U.damp=(x,y,k,dt)=>x+(y-x)*(1-Math.exp(-k*dt));G.Coop={ANIMS:['Idle','Walk','Attack','Shoot','Charge','Hurt','Faint']};
 vm.runInNewContext(fs.readFileSync('js/entities/enemy.js','utf8'),{G,performance:{now:()=>1000}});
 const e={anim,flash:0,dead:false,touchCd:0,bob:0,shiny:false,x:0,y:0,net:{x:10,y:0,vx:0,vy:0,age:0,dir:2,poseAt:1000,pose:[10,'Attack',6,1,1,0,'Walk',1,2]}};
 G.Enemy.prototype.netUpdate.call(e,.05);assert.equal(anim.remoteSerial,10);assert.ok(e.x>0&&e.x<10);anim.update(.1);const phase=anim.elapsed;G.Enemy.prototype.netUpdate.call(e,.01);assert.ok(anim.elapsed>phase);
 e.net.pose=[11,'Attack',0,1,1,0,'Walk',1,2];G.Enemy.prototype.netUpdate.call(e,.01);assert.equal(anim.remoteSerial,11);assert.equal(anim.elapsed,0);
});
test('low-end selection falls back from oversized extra sheets without dropping base animation',()=>{
 const {G}=fixture();G.Settings={get:()=> 'potato'};G.SPRITE_META[1].a.Strike.w=4096;G.SPRITE_META[1].a.Strike.h=4096;
 assert.equal(G.Sprites.actionFor(1,{kind:'melee',id:'karate-chop'}),'Attack');
});
