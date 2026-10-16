const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),crypto=require('node:crypto'),scene=require('./battle-fixture.cjs');

test('all 975 species have six real stats, native abilities, learned moves and a 12-18 attack pool',()=>{
 const {G}=scene();assert.equal(G.DEX.length,975);assert.equal(new Set(G.Moves.ALL.map(m=>m.id)).size,G.Moves.ALL.length);
 for(const mon of G.DEX){const d=G.BattleDex.species[mon.dex];assert.equal(d.stats.length,6);assert.ok(d.stats.every(v=>Number.isInteger(v)&&v>0));assert.ok(d.ability.id&&d.ability.zh);const pool=G.Moves.poolFor(mon);assert.ok(pool.length>=12&&pool.length<=18,mon.dex);assert.ok(pool.every(id=>G.Moves.BY_ID[id].kind!=='buff'&&!G.Moves.BY_ID[id].specialOnly));}
 assert.deepEqual(Array.from(G.BattleDex.species[143].stats),[160,110,65,65,110,30]);assert.deepEqual(Array.from(G.BattleDex.species[242].stats),[255,10,10,75,135,55]);assert.equal(G.BattleDex.species[208].stats[2],200);
 assert.notDeepEqual(Array.from(G.Moves.poolFor(G.DEX_BY[143])),Array.from(G.Moves.poolFor(G.DEX_BY[242])));
});

test('physical and special offense remain separate and low physical defense is not replaced by high special defense',()=>{
 const {G,player,enemy}=scene(),p=player(242),e=enemy();const a=G.Battle.damage(p,e,{id:'tackle',type:'normal',kind:'melee',dmg:20},100),b=G.Battle.damage(p,e,{id:'hyper-voice',type:'normal',kind:'nova',dmg:20},100);assert.ok(b>a);
 const steel=player(208);assert.ok(G.Battle.defend(steel,100,false,'physical',0)<G.Battle.defend(steel,100,false,'special',0));
 const bliss=player(242);assert.ok(G.Battle.defend(bliss,100,false,'special',0)<G.Battle.defend(bliss,100,false,'physical',0));
 assert.equal(G.Moves.BY_ID.toxic.damageClass,'special');assert.equal(G.Moves.BY_ID['leaf-storm'].damageClass,'physical','legacy ID follows displayed Petal Blizzard identity');
});

test('same-typed species gain distinct pools, six-stat roles and trait sources instead of one shared type kit',()=>{
 const {G,player}=scene(),snorlax=player(143),blissey=player(242),steelix=player(208),scizor=player(212);
 assert.notEqual(snorlax.trait.source.id,blissey.trait.source.id);assert.notDeepEqual(Array.from(snorlax.baseStats),Array.from(blissey.baseStats));assert.notDeepEqual(Array.from(G.Moves.poolFor(steelix.mon)),Array.from(G.Moves.poolFor(scizor.mon)));
 for(const p of [snorlax,blissey,steelix,scizor])assert.ok(G.BattleRules.TRAITS[p.trait.key]);
});

test('passives have four independent slots, six levels, no attack-slot cost and refuse unknown IDs',()=>{
 const {G,player}=scene(),p=player(),before=p.slots.length;
 for(const id of ['harden','light-screen','protect','double-team']){for(let i=0;i<6;i++)assert.equal(G.Battle.learn(p,id),true);assert.equal(G.Battle.learn(p,id),false);}
 assert.equal(p.slots.length,before);assert.equal(G.Battle.learn(p,'calm-mind'),false);assert.equal(G.Battle.learn(p,'invalid'),false);
 let passive=false;for(let i=0;i<100;i++)passive||=G.LevelUp.offer(p).some(c=>c.type==='passive');assert.equal(passive,false,'capped passives do not reappear');
});

test('block absorbs one valid hit, refreshes on a timer without hoarding and arms counters',()=>{
 const {G,player}=scene(),p=player();G.Battle.learn(p,'protect');G.Battle.tick(p,0);assert.equal(p.battle.block,1);const hp=p.hp;p.hurt(20);assert.equal(p.hp,hp);assert.equal(p.battle.block,0);assert.ok(p.battle.counterT>0);
 p.hurt(20);assert.ok(p.hp<hp);G.Battle.tick(p,10);assert.equal(p.battle.block,0);G.Battle.tick(p,1);assert.equal(p.battle.block,1);G.Battle.tick(p,100);assert.equal(p.battle.block,1);
});

test('dodge is bounded, does not consume block/shield, and pure damage bypasses avoidance and armor',()=>{
 const s=scene(),{G,player}=s,p=player();for(let i=0;i<3;i++)G.Battle.learn(p,'double-team');p.battle.block=1;p.battle.shield=20;s.random(0);const hp=p.hp;p.hurt(20);assert.equal(p.hp,hp);assert.equal(p.battle.block,1);assert.equal(p.battle.shield,20);
 p.hurt(20,null,true);assert.equal(p.hp,hp-20);assert.equal(p.battle.block,1);assert.equal(p.battle.shield,20);
 s.random(.99);p.battle.block=0;p.battle.shield=0;G.Battle.learn(p,'harden');assert.ok(G.Battle.defend(p,100,false,'physical',.99)>=15,'total mitigation capped at 85%');
});

test('shields refresh rather than accumulate and invulnerable/zero hits never consume defenses',()=>{
 const {G,player}=scene(),p=player();G.Battle.learn(p,'iron-defense');G.Battle.tick(p,0);const shield=p.battle.shield;G.Battle.tick(p,8);assert.equal(p.battle.shield,shield);p.battle.block=1;p.invuln=1;p.hurt(99);p.invuln=0;p.hurt(0);assert.equal(p.battle.block,1);
 p.battle.block=0;const hp=p.hp;p.hurt(1);assert.equal(p.hp,hp);assert.equal(p.battle.shield,shield-1);
});

test('all twelve passive effects are live, including offense, crit, mobility and conditional recovery',()=>{
 const {G,player,enemy}=scene(),p=player(),e=enemy();const physical={id:'tackle',type:'normal',kind:'melee',dmg:20},special={id:'ember',type:'fire',kind:'projectile',dmg:20};
 const a=G.Battle.damage(p,e,physical,100),b=G.Battle.damage(p,e,special,100);G.Battle.learn(p,'swords-dance');G.Battle.learn(p,'calm-mind');assert.ok(G.Battle.damage(p,e,physical,100)>a);assert.ok(G.Battle.damage(p,e,special,100)>b);
 G.Battle.learn(p,'focus-energy');assert.ok(G.Battle.crit(p)>=.03);G.Battle.learn(p,'agility');assert.ok(G.Battle.speed(p)>1);
 const q=player();G.Battle.learn(q,'ingrain');G.Battle.learn(q,'aqua-ring');q.hp=10;q.walking=true;G.Battle.tick(q,1);const moving=q.hp-10;q.hp=10;q.walking=false;G.Battle.tick(q,1);assert.ok(q.hp-10>moving);
 const r=player();G.Battle.learn(r,'revenge');r.hurt(1);assert.equal(r.battle.counterT,2.5);
});

test('Mega uses real alternate stats, types and ability, expires cleanly, and is limited to eligible species',()=>{
 const {G,player}=scene(),p=player(6),base=Array.from(p.baseStats),trait=p.trait.key;p.battle.energy=100;
 assert.equal(G.Battle.activate(p,'mega'),true);assert.equal(p.battle.remaining,30);assert.notDeepEqual(Array.from(G.Battle.stats(p)),base);assert.notEqual(G.Battle.trait(p).key,trait);assert.equal(p.dex,6);assert.equal(G.Battle.activate(p,'max'),false);
 G.Battle.tick(p,31);assert.equal(p.battle.form,null);assert.deepEqual(Array.from(G.Battle.stats(p)),base);assert.equal(G.Battle.trait(p).key,trait);
 const q=player(1);q.battle.energy=100;assert.equal(G.Battle.activate(q,'mega'),false);assert.equal(q.battle.used,false);
 const fast=player(428),before=G.Battle.speed(fast);fast.battle.energy=100;G.Battle.activate(fast,'mega');assert.ok(G.Battle.speed(fast)>before,'Mega speed stat changes real movement');G.Battle.endForm(fast);assert.equal(G.Battle.speed(fast),before);
});

test('Dynamax preserves original collision radius and HP fraction and cannot heal by toggling or expiration twice',()=>{
 const {G,player}=scene(),p=player();p.hp=p.maxHp*.4;const hp=p.hp,max=p.maxHp,r=p.r;p.battle.energy=100;assert.equal(G.Battle.activate(p,'max'),true);assert.equal(p.r,r);assert.equal(p.maxHp,max+Math.round(max*.5));assert.ok(Math.abs(p.hp/p.maxHp-.4)<1e-9);
 G.Battle.endForm(p);assert.equal(p.maxHp,max);assert.ok(Math.abs(p.hp-hp)<1e-9);G.Battle.endForm(p);assert.equal(p.maxHp,max);assert.equal(G.Battle.activate(p,'max'),false);
});

test('forms honor real charge and run/death boundaries; Z deals one burst and refuses repeats',()=>{
 const {G,player,enemy}=scene(),p=player(),e=enemy();p.aim=0;G.Camera.sees=()=>true;assert.equal(G.Battle.activate(p,'z'),false);G.Battle.tick(p,10);assert.equal(p.battle.energy,8);p.battle.energy=100;assert.equal(G.Battle.activate(p,'z'),true);G.Projectiles.update(.1,p,[e]);G.Combat.resolve(.1,p,.1);G.Combat.updateFields(1);const hp=e.hp;assert.ok(hp<1000);assert.equal(G.Battle.activate(p,'z'),false);assert.equal(e.hp,hp);
 const q=player();q.battle.energy=100;G.Battle.activate(q,'max');q.dead=true;q.hp=0;G.Battle.tick(q,.1);assert.equal(q.battle.form,null);assert.equal(q.hp,0);
 assert.equal(player().battle.used,false);
});

test('new waves use swept one-hit collision, delayed marks detonate once, decoys expire and counter requires a trigger',()=>{
 const {G,player,enemy}=scene(),p=player(),e=enemy(50);p.slots=[[G.Moves.instance('surf')]];p.target=e;p.aim=0;G.Combat.tick(.01,p,0);G.Combat.updateFields(.5);G.Projectiles.update(.1,p,[e]);G.Combat.resolve(.1,p,.1);G.Combat.updateFields(1);const hp=e.hp;assert.ok(hp<1000);G.Combat.updateFields(.01);assert.equal(e.hp,hp);
 G.Combat.clearFields();p.slots=[[G.Moves.instance('earth-power')]];G.Combat.tick(.01,p,0);const before=e.hp;G.Combat.updateFields(.3);assert.equal(e.hp,before);G.Combat.updateFields(.4);assert.ok(e.hp<before);const after=e.hp;G.Combat.updateFields(2);assert.equal(e.hp,after);
 p.slots=[[G.Moves.instance('substitute')]];G.Combat.tick(.01,p,0);assert.equal(G.Combat.decoys().length,1);G.Combat.updateFields(4);assert.equal(G.Combat.decoys().length,0);
 p.slots=[[G.Moves.instance('counter')]];p.battle.counterT=0;const old=e.hp;G.Combat.tick(.1,p,0);assert.equal(e.hp,old);p.battle.counterT=2;G.Combat.tick(.1,p,0);assert.ok(e.hp<old);assert.equal(p.battle.counterT,0);
});

test('ghost new skills never damage, heal, distract enemies or modify player defenses',()=>{
 const {G,player,enemy}=scene(),p=player(),e=enemy();p.hp=10;for(const id of ['surf','leech-seed','substitute'])G.Combat.ghostCast(p,id,1,0,false);G.Combat.updateFields(5);assert.equal(e.hp,1000);assert.equal(p.hp,10);assert.equal(G.Combat.decoys().length,0);assert.equal(p.battle.block,0);
});

test('recovery credits are capped across a rolling second, never given for zero damage, and stop on death',()=>{
 const {G,player}=scene(),p=player(),m=G.Moves.BY_ID['leech-seed'];p.hp=10;for(let i=0;i<100;i++)G.Battle.credit(p,m,10,false);assert.ok(Math.abs(p.hp-(10+p.maxHp*.04))<1e-8);const hp=p.hp;G.Battle.credit(p,m,0,true);assert.equal(p.hp,hp);p.dead=true;G.Battle.credit(p,m,100,true);assert.equal(p.hp,hp);
});

test('state snapshots synchronize form, passive levels, shield and blocks without accepting unknown passive fields',()=>{
 const {G,player}=scene(),p=player(),q=player();G.Battle.learn(p,'swords-dance');p.battle.energy=100;G.Battle.activate(p,'mega');p.battle.shield=12;p.battle.block=1;q.remote=true;const state=G.Battle.net(p);G.Battle.ingest(q,state);assert.equal(q.battle.form,'mega');assert.equal(q.passives['swords-dance'],1);assert.equal(q.battle.shield,12);assert.equal(q.battle.block,1);
 state[6].push(['bad',99]);G.Battle.ingest(q,state);assert.equal(q.passives.bad,undefined);G.Battle.endForm(p);G.Battle.ingest(q,G.Battle.net(p));assert.equal(q.battle.form,null);
});

test('catalog filters compose region/acquisition/type/rarity/search and recognize multilingual names and padded IDs',()=>{
 const {G}=scene(),save={owned:{25:{}},shiny:{25:{}}},p=G.DEX_BY[25],text=G.BattleRules.searchText(p,G.BattleDex,'皮卡丘 电 普通 已拥有');
 for(const query of ['皮卡丘','pikachu','#025','025','关都','Kanto','electric','电','35'])assert.equal(G.BattleRules.matches(p,save,{gen:0,owned:'own',type:'electric',rarity:'shiny',query},text),true,query);
 assert.equal(G.BattleRules.matches(G.DEX_BY[250],save,{query:'#025'},G.BattleRules.searchText(G.DEX_BY[250],G.BattleDex)),false);assert.equal(G.BattleRules.matches(p,save,{gen:2},text),false);assert.equal(G.BattleRules.matches(p,save,{owned:'miss'},text),false);assert.equal(G.BattleRules.matches(p,save,{type:'fire'},text),false);assert.equal(G.BattleRules.matches(p,save,{query:'不存在 <script>'},text),false);
});

test('all imported Mega animations retain local hashes, geometry, provenance and credits',()=>{
 const entries=JSON.parse(fs.readFileSync('tools/localization/mega-art.json','utf8'));assert.ok(Object.keys(entries).length>=40);
 for(const [id,e]of Object.entries(entries)){assert.ok(e.source.includes('PMDCollab/SpriteCollab'));assert.ok(e.credit||e.trackerCredit);for(const [file,sha]of Object.entries(e.sha256)){const b=fs.readFileSync('assets/pokemon/'+id+'/'+file);assert.equal(crypto.createHash('sha256').update(b).digest('hex'),sha);}for(const m of Object.values(e.meta.a))assert.ok(m.w>0&&m.h>0&&m.n>0&&m.d.length>=m.n);}
});

test('per-skill layered effects are bounded and quality changes never alter combat state',()=>{
 const {G,player,enemy}=scene(),p=player(),e=enemy();for(const id of ['surf','vine-whip','metal-claw','earth-power','hyper-beam'])assert.ok(G.SkillVFX.style(G.Moves.BY_ID[id]));
 for(let i=0;i<1000;i++)G.SkillVFX.cast(p,G.Moves.BY_ID.surf,true);assert.ok(G.SkillVFX.count<=100);assert.equal(e.hp,1000);G.SkillVFX.update(10);assert.equal(G.SkillVFX.count,0);
});

test('room protocol advertises version twelve and rejects previous battle clients',async()=>{
 const os=require('node:os'),path=require('node:path'),{createApp}=require('../server/app.cjs'),dir=fs.mkdtempSync(path.join(os.tmpdir(),'ps-protocol5-')),app=createApp({dataDir:dir,campaigns:[]});try{await new Promise(r=>app.server.listen(0,'127.0.0.1',r));const base='http://127.0.0.1:'+app.server.address().port,u=await app.store.credentials('BattleProtocol','password123',true),cookie='ps_nas='+app.store.session(u);assert.equal((await fetch(base+'/api/config').then(r=>r.json() )).protocol,16);const r=await fetch(base+'/api/room/create',{method:'POST',headers:{origin:base,cookie,'content-type':'application/json'},body:JSON.stringify({protocol:11})});assert.equal(r.status,409);}finally{await app.close();fs.rmSync(dir,{recursive:true,force:true});}
});

function network(s,uid){const {G,ctx}=s;let receive;const sent=[];G.Net={uid,on:f=>receive=f,onPeer:()=>{},interval:()=>.1,slow:()=>false,viaTurn:()=>false,send:(u,m)=>sent.push([u,m]),toHost:m=>sent.push(['host',m])};G.Flow={};G.TeamStats={create:()=>({snapshot:()=>[],hit:()=>{},ingest:()=>{}})};vm.runInContext(fs.readFileSync('js/net/coop.js','utf8'),ctx);const p=s.player();G.Coop.begin({host:'host',members:Array.from({length:8},(_,i)=>({uid:i?'u'+i:'host',name:'p'+i,dex:6}))},p,{choosing:()=>false});return {p,receive,sent};}
test('new damage stream applies damage and kill credits once across all eight members',()=>{const s=scene(),{G}=s,n=network(s,'host'),e=s.enemy(30,1),event=['bh',1,e.id,20,'#fff',1,0,0,'leech-seed',null];n.receive('u1',{k:'f',ev:[event,event]});for(let i=2;i<8;i++)n.receive('u'+i,{k:'f',ev:[event]});assert.equal(e.dead,true);assert.equal(G.Coop.mate('u1').q.filter(e=>e[0]==='bb').length,1);assert.equal(G.Coop.mate('u1').q.find(e=>e[0]==='bb')[4],true);assert.equal(G.Coop.mate('u2').q.filter(e=>e[0]==='bb').length,0);});
test('guest damage benefits require a host receipt, reject replays and never come from a ghost special',()=>{const s=scene(),{G}=s,n=network(s,'u1');n.p.hp=10;const receipt=['bb',1,'leech-seed',20,false];n.receive('u2',{k:'f',ev:[receipt]});assert.equal(n.p.hp,10);n.receive('host',{k:'f',ev:[receipt,receipt]});assert.ok(Math.abs(n.p.hp-(10+n.p.maxHp*.012))<1e-9);const hp=n.p.hp,e=s.enemy();G.Combat.special(n.p,'z',true);assert.equal(e.hp,1000);assert.equal(n.p.hp,hp);});

test('learned counter and decoy support skills trigger without switching away from the main attack',()=>{const {G,player,enemy}=scene(),p=player(),e=enemy();p.addMove('counter');p.addMove('substitute');p.setActive(0);p.target=e;G.Combat.tick(.001,p,0);assert.equal(G.Combat.decoys().length,1);const hp=e.hp;p.activeMove().t=999;p.battle.counterT=2;G.Combat.tick(.01,p,0);assert.ok(e.hp<hp);assert.equal(p.battle.counterT,0);assert.equal(p.active,0);});
test('only host-authorized guest decoys enter AI targeting, and ghost detonation never duplicates guest damage',()=>{const s=scene(),{G}=s,n=network(s,'host'),e=s.enemy();n.receive('u1',{k:'f',ev:[['c','substitute',1,0,0,[],[40,0,e.id,20]]]});assert.equal(G.Combat.decoys().length,1);G.Combat.updateFields(4);assert.equal(G.Combat.decoys().length,0);assert.equal(e.hp,1000);const p=n.p;let observed;G.SkillVFX.cast=actor=>observed={x:actor.target.x,y:actor.target.y};G.Combat.ghostCast(p,'earth-power',1,0,false,null,[200,40,999,20]);assert.deepEqual(observed,{x:200,y:40});assert.equal(p.target,undefined);});

test('only authenticated host mastery messages mint pending points; replays and guest spoofing do nothing',()=>{const s=scene(),{G}=s,n=network(s,'u1');G.Game={player:n.p};const msg={k:'f',ev:[['mr','boss:123'],['mr','boss:123']]};n.receive('u2',msg);assert.equal(n.p.growth,undefined);n.receive('host',msg);assert.equal(n.p.growth.points,1);const m=n.p.activeMove();while(G.Moves.levelUp(m));G.Moves.evolve(m);assert.equal(G.RunGrowth.spend(n.p,m.instanceId),true);n.receive('host',msg);assert.equal(m.mastery,1);assert.equal(n.p.growth.points,0);const state=G.Battle.net(n.p);const puppet=G.Coop.mate('u2').pl;G.Battle.ingest(puppet,state);assert.equal(puppet.growthSummary.targets[0][0],m.instanceId);assert.equal(puppet.growthSummary.targets[0][3],1);});
