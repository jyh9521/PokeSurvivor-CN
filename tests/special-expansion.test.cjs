const {test}=require('node:test'),a=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),crypto=require('node:crypto'),scene=require('./battle-fixture.cjs');
function setup(){const s=scene(),{G,ctx}=s;G.Camera.sees=()=>true;G.Camera.kick=()=>{};G.Spawner={say(){}};G.Game={player:null,everyone:()=>[],st:{time:200}};G.Progress={event(){},kill(){}};G.Judgment.active=false;G.Rift={inArena:false};vm.runInContext(fs.readFileSync('js/systems/hazards.js','utf8'),ctx);return s;}
test('only the 40 complete exact Mega identities can activate; partial and copied poses remain deferred',()=>{
 const {G,player}=setup();a.equal(G.SpecialRules.data.megas.length,40);
 for(const m of G.SpecialRules.data.megas){const p=new G.Player(G.SpecialRuntime.mon(G.DEX_BY[m.dex],m.requires));p.addMove('tackle');p.battle.energy=100;p.battle.megaKey=m.key;const original=p.anim.dex;a.equal(G.Battle.activate(p,'mega'),true,m.id);a.equal(p.anim.dex,m.id);a.deepEqual(Array.from(G.Battle.stats(p)),Array.from(m.stats));G.Battle.tick(p,31);a.equal(p.anim.dex,original);a.equal(p.battle.form,null);}
 for(const dex of [3,9,15,254,358]){const p=player(dex);p.battle.energy=100;a.equal(G.Battle.activate(p,'mega'),false,dex);a.equal(p.battle.used,false);}
 const p=player(150);a.equal(p.battle.megaKey,'10044');a.equal(G.SpecialRules.mega(978,'10323'),null);a.equal(G.SpecialRules.mega(978,'10324'),null);
});
test('exact base variants preserve national IDs and require their proper pre-Mega identities',()=>{
 const {G}=setup();a.equal(G.SpecialRules.variants(26)[0].key,'alola');
 for(const v of G.SpecialRules.data.variants){const p=new G.Player(G.SpecialRuntime.mon(G.DEX_BY[v.dex],v.key));a.equal(p.dex,v.dex);a.equal(p.anim.dex,v.id);a.equal(p.baseForm,v.key);a.deepEqual(Array.from(p.baseStats),Array.from(v.stats));a.deepEqual(Array.from(G.Battle.types(p)),Array.from(v.types));}
 a.equal(G.SpecialRules.megas(670).length,0);a.equal(G.SpecialRules.megas(670,'eternal').length,1);a.equal(G.SpecialRules.megas(718).length,0);a.equal(G.SpecialRules.megas(718,'complete').length,1);
});
test('Z conversion follows the base move type/class, not primary species type, with fifteen distinct available signatures',()=>{
 const {G,player}=setup(),p=player(6);const z=G.SpecialRules.zMove(p,G.Moves.instance('thunderbolt'));a.equal(z.type,'electric');a.equal(z.damageClass,'special');a.equal(z.id,'z-electric');
 a.equal(G.SpecialRules.Z.length,15);for(const row of G.SpecialRules.Z){const dex=row.dex[0],p=new G.Player(G.SpecialRuntime.mon(G.DEX_BY[dex],row.form));const m=G.Moves.instance(row.base);const z=G.SpecialRules.zMove(p,m);a.equal(z.id,row.id);a.equal(z.exclusive,true);a.ok(G.Moves.BY_ID[row.base]);a.ok(G.Moves.BY_ID[z.id]);}
 a.equal(G.SpecialRules.zMove(player(26),G.Moves.instance('thunderbolt')).exclusive,false);a.equal(G.SpecialRules.zMove(player(800),G.Moves.instance('photon-geyser')).exclusive,false);
});
test('Eevee Z is a timed boost, Tapu damage has a final boss cap, and ghost specials never deal damage or grant resources',()=>{
 const {G,player,enemy}=setup(),p=player(133);p.moves=[];p.slots=[];p.addMove('last-resort');p.battle.energy=100;const e=enemy(40);a.equal(G.Battle.activate(p,'z'),true);a.equal(p.battle.zBoost,20);a.equal(e.hp,1000);G.Battle.tick(p,21);a.equal(p.battle.zBoost,0);
 const t=player(785);t.moves=[];t.slots=[];t.addMove('natures-madness');e.boss=true;e.hp=900;t.battle.energy=100;G.Battle.activate(t,'z');a.equal(e.hp,820);
 const ghost=player(730);ghost.moves=[];ghost.slots=[];ghost.addMove('sparkling-aria');ghost.hp=1;const hp=e.hp;G.Combat.special(ghost,'z',true);G.Combat.updateFields(3);a.equal(e.hp,hp);a.equal(ghost.hp,1);a.equal(ghost.battle.zBoost||0,0);
});
test('normal Dynamax forbids explicit original exceptions and converts status to Max Guard',()=>{
 const {G,player}=setup();for(const dex of [888,889,890])a.equal(G.Battle.available(player(dex),'max'),false);
 a.equal(G.SpecialRules.maxMove(G.Moves.instance('substitute')).kind,'guard');const p=player();p.battle.energy=100;G.Battle.activate(p,'max');p.moves=[];p.slots=[];p.addMove('substitute');G.Combat.tick(.1,p,0);a.ok(p.battle.guardT>0);a.equal(p.battle.block,1);
 const types=Object.keys(G.SpecialRules.MAX_NAMES);a.equal(types.length,18);for(const type of types){const m=G.SpecialRules.maxMove({...G.Moves.instance('tackle'),type});a.equal(m.maxType,type);a.equal(m.maxConverted,true);a.ok(G.Moves.BY_ID[m.id]);}
});
test('temporary fields and Max boons are bounded and removed on form end/death',()=>{
 const {G,player,enemy}=setup(),p=player(),e=enemy(20);p.battle.energy=100;G.Battle.activate(p,'max');G.SpecialRuntime.maxEffect(p,{maxType:'fire'});const m={...G.Moves.instance('ember'),type:'fire'};a.ok(G.SpecialRuntime.damage(p,e,m)>1);a.equal(G.SpecialRuntime.damage(p,e,{...m,type:'psychic'}),1,'unrelated fields do not buff Psychic');p.battle.fieldType='psychic';a.equal(G.SpecialRuntime.damage(p,e,{...m,type:'psychic'}),1.2,'Psychic field applies once');G.Battle.endForm(p);a.equal(G.SpecialRuntime.damage(p,e,m),1);p.battle.zBoost=20;p.dead=true;G.Battle.tick(p,.1);a.equal(p.battle.zBoost,0);
});
test('new trajectories move differently, split at most once and share enemy hit exclusions',()=>{
 const {G,player,enemy}=setup(),p=player(),e=enemy(160);p.aim=0;
 for(const id of ['magical-leaf','dragon-darts','mystical-fire','water-shuriken','rollout']){G.Projectiles.clear();const m=G.Moves.instance(id);G.AdvancedShots.fire(p,m,false);a.ok(G.Projectiles.count>0);const first=G.Projectiles.all()[0],old=first.vy;G.Projectiles.update(.2,p,[e]);if(['curve','spiral'].includes(m.kind))a.notEqual(first.vy,old);if(m.kind==='split'){first.hits.add(999);G.Projectiles.update(.2,p,[e]);const children=G.Projectiles.all().filter(q=>q.child);a.ok(children.length>0);a.equal(children.filter(q=>q.hits===first.hits&&q.hits.has(999)).length,3);a.equal(new Set(G.Projectiles.all().map(q=>q.id)).size,G.Projectiles.count);G.Projectiles.update(.4,p,[e]);a.ok(G.Projectiles.all().filter(q=>q.child).length<=6);}}
 G.Projectiles.clear();for(let i=0;i<200;i++)G.AdvancedShots.fire(p,G.Moves.instance('mystical-fire'),false);a.ok(G.Projectiles.count<=80);
});
test('lobbed bombs only damage at their telegraphed landing, once, and vanish with a dead owner',()=>{
 const {G,player,enemy}=setup(),p=player(),e=enemy(80);p.moves=[];p.slots=[];p.addMove('seed-bomb');p.target=e;p.aim=0;G.Combat.tick(.01,p,0);G.Combat.updateFields(.4);a.equal(e.hp,1000);G.Combat.updateFields(.6);a.ok(e.hp<1000);const hp=e.hp;G.Combat.updateFields(2);a.equal(e.hp,hp);
 p.activeMove().t=0;G.Combat.tick(.01,p,0);p.dead=true;G.Combat.updateFields(2);a.equal(e.hp,hp);
});
test('two and three phase bosses change real species and completely replace attack kits without HP refill',()=>{
 const {G,enemy}=setup();for(const chain of [[92,93,94],[123,212]]){const e=enemy(20);e.def.stageChain=chain;e.boss=true;e.bossInit();e.hp=1000;G.BossStages.tick(e,.1);const kit=JSON.stringify(e.ai.melee.concat(e.ai.ranged));e.hp=300;G.BossStages.tick(e,.1);a.equal(e.dex,chain[chain.length-1]);a.equal(e.hp,300);a.notEqual(JSON.stringify(e.ai.melee.concat(e.ai.ranged)),kit);const phase=e.bossStage;e.hp=800;G.BossStages.tick(e,.1);a.equal(e.bossStage,phase,'phase never regresses');e.dead=true;e.hp=0;G.BossStages.tick(e,1);a.equal(e.hp,0,'no resurrection');}
});
test('phase transitions clear only that boss previous-phase hazards, not other bosses or new-phase warnings',()=>{
 const {G,enemy}=setup(),e=enemy();e.id=900;e.remote=true;e.bossStage=0;for(const [ownerId,ownerStage]of [[900,0],[900,1],[901,0]])G.Hazards.add({kind:'zone',x:0,y:0,r:20,delay:1,ownerId,ownerStage});G.BossStages.remote(e,93,1,1);a.deepEqual(Array.from(G.Hazards.all,h=>[h.ownerId,h.ownerStage]),[[900,1],[901,0]]);
});
test('all 27 starter encounter chains have available sprites and do not enter the legendary identity pool',()=>{
 const {G}=setup();a.equal(G.BossStages.starters().length,27);for(const chain of G.BossStages.starters()){a.equal(chain.length,3);a.ok(chain.every(d=>G.DEX_BY[d]&&!G.DEX_BY[d].leg&&G.SPRITE_META[d].a.Attack));}
});
test('six imported base form sheets match their pinned provenance hashes',()=>{
 const manifest=require('../tools/localization/form-art.json');a.equal(Object.keys(manifest).length,6);for(const [id,r]of Object.entries(manifest))for(const [file,sha]of Object.entries(r.sha256))a.equal(crypto.createHash('sha256').update(fs.readFileSync('assets/pokemon/'+id+'/'+file)).digest('hex'),sha);
 const deferred=require('../tools/localization/special-missing.json').deferred;a.equal(deferred.filter(r=>r.category==='mega').length,57);a.equal(deferred.filter(r=>r.category==='gmax').length,34);
});
test('every starter rift spawns, evolves twice, and emits exactly one correct victory record',()=>{
 const {G,ctx,player}=setup(),p=player();let events=[];G.Game.player=p;G.Game.everyone=()=>[p];G.Game.flash=()=>{};G.Game.offerBond=()=>{};G.Game.st.time=200;G.Coop.scaleHp=()=>1;
 G.DB={save:{legends:{},starterBosses:{}}};G.Tiles={T:16,arenaBiome:()=>0,ARENA_THEMES:{}};G.World.setArena=()=>{};G.World.setBiome=()=>{};G.World.biome=0;G.Weather.clear=()=>{};G.Pickups={pullAll(){}};G.Progress.event=(kind,d)=>events.push([kind,d]);
 vm.runInContext(fs.readFileSync('js/systems/rift.js','utf8'),ctx);
 for(const chain of G.BossStages.starters()){
  G.Rift.reset();G.EnemyMgr.clear();events=[];const final=chain.at(-1);G.Rift.debugArena(null,'starter',final);const e=G.EnemyMgr.get(G.Rift.arena.bossId);a.equal(e.dex,chain[0]);a.equal(e.legend,false);e.bossInit();e.hp=e.maxHp*.6;G.BossStages.tick(e,.1);a.equal(e.dex,chain[1]);e.hp=e.maxHp*.2;G.BossStages.tick(e,.1);a.equal(e.dex,final);const id=G.Rift.arena.id;G.Rift.onEvent(['aw',{id:'previous-arena',flawless:true}]);a.equal(G.Rift.arena.phase,'fight');G.Rift.onEvent(['al','previous-arena']);a.equal(G.Rift.arena.phase,'fight');e.hp=0;e.dead=true;G.Rift.update(.1,p,200);a.equal(events.length,1);a.equal(events[0][1].starterDex,final);a.equal(events[0][1].flawless,true);G.Rift.onEvent(['aw',{id,flawless:true}]);a.equal(events.length,1);
 }
 G.Rift.reset();G.EnemyMgr.clear();G.Judgment.AT=1800;G.Rift.update(181,p,200);a.equal(G.Rift.rift.kind,'starter');a.equal(G.Rift.checkpoint().misses,1,'starter opening does not reset or replace the failed legendary pity roll');G.Rift.reset();G.Rift.debugOpen();a.equal(G.Rift.rift.kind,'legend','the original portal picker stays exclusively legendary');
});
test('recipient healing locks expire on simulation time, independent of caster order and offscreen animation',()=>{
 const {G,player,enemy}=setup(),p=player(),h=enemy(0),target=enemy(1);h.behavior='healer';target.hp=100;h.update=target.update=()=>{};G.Camera.outerRadius=()=>500;G.Camera.sees=()=>false;
 h.healAround();a.equal(target.hp,150);for(let i=0;i<5;i++){G.EnemyMgr.update(.5,[p]);h.healAround();a.equal(target.hp,150);}G.EnemyMgr.update(.5,[p]);h.healAround();a.equal(target.hp,200);
 G.Coop.active=true;G.Coop.isHost=false;target.enemyHealT=0;h.healAround();a.equal(target.hp,200,'guests never apply healing');
});
test('malformed remote special packets are ignored instead of crashing or spawning attacks',()=>{
 const {G,player}=setup(),p=player();for(const cast of [[],['bad',1,0,0,0,0,0,''],['tackle',1,NaN,0,0,0,0,''],['tackle',1,0,0,0,0,0,{}]])a.equal(G.Combat.special(p,'z',true,cast),null);a.equal(G.Projectiles.count,0);
});
test('Mega regeneration never heals a dead player before form cleanup',()=>{
 const {G,player}=setup(),p=player(691);p.battle.energy=100;G.Battle.activate(p,'mega');p.hp=0;p.dead=true;G.Battle.tick(p,1);a.equal(p.hp,0);a.equal(p.battle.form,null);
});
test('special environment effects are authority-only, bounded and once per player',()=>{
 const {G,player,enemy}=setup(),p=player(802),e=enemy(40);const cast=['spectral-thief',1,0,0,0,40,0,''];p.battle.used=true;e.shield=100;G.Coop.active=true;G.Coop.isHost=false;a.equal(G.Combat.specialEnvironment(p,cast),false);a.equal(e.shield,100);
 G.Coop.isHost=true;a.equal(G.Combat.specialEnvironment(p,cast),true);a.equal(e.shield,0);e.shield=40;a.equal(G.Combat.specialEnvironment(p,cast),false);a.equal(e.shield,40);
 const wolf=player(745);wolf.battle.used=true;G.Coop.active=false;G.Coop.isHost=false;for(const x of [20,400])G.Hazards.add({kind:'zone',x,y:0,r:20,delay:1});a.equal(G.Combat.specialEnvironment(wolf,['stone-edge',1,0,0,0,40,0,'']),true);a.equal(G.Hazards.count,1);a.equal(G.Hazards.all[0].x,400);
});
test('Disguise changes Mimikyu to its exact busted sprite once without resetting learned moves or passives',()=>{
 const {G,player}=setup(),p=player(778);G.Battle.learn(p,'harden');p.invuln=0;const before=p.hp,slots=p.slots.length;p.hurt(10000);a.equal(p.baseForm,'busted');a.equal(p.anim.dex,10143);a.ok(p.hp>=before-p.maxHp*.125);a.equal(p.slots.length,slots);a.equal(p.passives.harden,1);p.invuln=0;const hp=p.hp;p.hurt(10);a.ok(p.hp<hp);a.equal(p.baseForm,'busted');const q=new G.Player(G.SpecialRuntime.mon(G.DEX_BY[778],'busted'));q.addMove('tackle');a.equal(q.trait.key,'disguise');a.match(q.trait.desc,/broken/);
});
