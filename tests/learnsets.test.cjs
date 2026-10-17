const {test}=require('node:test'),a=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const scene=require('./battle-fixture.cjs');
function actor(G,dex){const p=new G.Player(G.DEX_BY[dex]);p.uid='local';p.cast=()=>{};p.addMove(G.Moves.startFor(p.mon));return p;}
test('purchased second opening attack is deferred until a copy repertoire exists, without bypassing bans',()=>{const {G,enemy}=scene();for(const dex of [132,235]){G.EnemyMgr.clear();const p=actor(G,dex);p.pendingCopiedStart=true;p.banned.add('body-slam');enemy(50,1000,25);G.Moves.observe(p,1);a.equal(p.moves.length,2);a.equal(p.pendingCopiedStart,false);a.ok(p.moves.every(m=>G.Moves.poolFor(p.mon,p).includes(m.id)&&m.id!=='body-slam'));a.equal(p.active,0);}});

test('every ordinary species/form card has exact source provenance; no padding, role or sibling grants',()=>{
 const {G}=scene();let small=0,pairs=0;for(const base of G.DEX){const mons=[base,...G.SpecialRules.variants(base.dex).map(v=>G.SpecialRuntime.mon(base,v.key))];for(const mon of mons){const pool=G.Moves.poolFor(mon);a.ok(pool.length,mon.dex+':'+mon.formKey);a.equal(new Set(pool).size,pool.length);a.ok(pool.includes(G.Moves.startFor(mon)));if(pool.length<12)small++;for(const id of pool){pairs++;const d=G.Moves.BY_ID[id];a.ok(d&&!d.specialOnly&&d.kind!=='buff');if(G.BattleRules.ADAPTATIONS[mon.dex]||mon.dex===235)continue;const sources=G.BattleRules.sources(mon,id,G.BattleDex);a.ok(sources.length,mon.dex+':'+id);for(const [pid,method,versions]of sources){a.ok(G.BattleDex.learnsets.pokemonNames[pid]);a.ok(G.BattleDex.learnsets.methods[method]);a.ok(versions.length&&versions.every(n=>G.BattleDex.learnsets.versionGroups.includes(n)));}}}}
 a.ok(small>100);a.ok(pairs>10000);a.ok(G.Moves.poolFor(G.DEX_BY[151]).length>18,'Mew must not be alphabetically truncated');
});
test('Eevee branches, regional ancestors, TM compatibility and legal cross-type moves are independent',()=>{
 const {G}=scene(),pool=d=>G.Moves.poolFor(G.DEX_BY[d]);
 a.ok(!pool(133).includes('bubble'));a.ok(!pool(134).includes('thunderbolt'));a.ok(!pool(135).includes('water-gun'));a.ok(!pool(129).includes('flamethrower'));a.ok(!pool(25).includes('icy-wind'));
 a.ok(pool(6).includes('dragon-pulse'));a.ok(pool(25).includes('surf'));
 a.ok(G.BattleRules.sources(G.DEX_BY[25],'surf',G.BattleDex).some(s=>s[1]===4||s[1]===5));
 a.ok(G.BattleRules.sources(G.DEX_BY[865],'brick-break',G.BattleDex).some(s=>s[0]===10166||s[0]===865));
 for(const id of pool(865))a.ok(G.BattleRules.sources(G.DEX_BY[865],id,G.BattleDex).every(s=>s[0]!==83),'Kanto Farfetchd leaked into Sirfetchd');
 a.ok(pool(865).includes('brick-break'));a.ok(!pool(865).includes('karate-chop'));
});
test('curated pools cannot override compatibility, and unknown species cannot obtain a generic pool',()=>{
 const {G}=scene(),m=G.DEX_BY[129];a.deepEqual(Array.from(G.Moves.poolFor({...m,skillPool:['flamethrower','z-burst']})),Array.from(G.Moves.poolFor(m)));a.deepEqual(Array.from(G.Moves.poolFor({dex:99999,types:['fire']})),[]);
});
test('small pools provide valid growth without new junk skills for 160 sequential rewards',()=>{
 const {G}=scene();G.Progress={event(){}};for(const dex of [129,201,202,374,602,789,790,824]){const p=actor(G,dex);let rng=17;for(let step=0;step<160;step++){p.level=step+1;const cards=G.LevelUp.offer(p,()=>((rng=Math.imul(rng,1664525)+1013904223)>>>0)/4294967296);a.ok(cards.length&&cards.length<=3);a.equal(new Set(cards.map(c=>c.key)).size,cards.length);const card=cards.find(c=>c.type==='evo')||cards.find(c=>c.type==='up')||cards.find(c=>c.type==='training')||cards[0];a.notEqual(card.apply(p),false,dex+':'+step+':'+card.key);a.ok(p.moves.every(m=>G.Moves.poolFor(p.mon,p).includes(m.id)));}a.ok(p.moves.some(m=>m.evolved),dex+': no evolution');a.ok(p.moves.every(m=>(m.training||0)<=12&&(m.mastery||0)<=3));}
});
test('Ditto copies nearest eligible enemy repertoire once, retains identity/defenses, never boss powers',()=>{
 const {G,enemy}=scene(),p=actor(G,132),stats=Array.from(p.baseStats),hp=p.maxHp,id=p.activeMove().instanceId;
 a.equal(G.Moves.poolFor(p.mon,p).join(','),'transform');G.Moves.observe(p,1);a.equal(p.activeMove().id,'transform');
 enemy(80,1000,6);enemy(50,1000,25);G.Moves.observe(p,1);a.equal(p.copiedDex,25);a.equal(p.dex,132);a.deepEqual(Array.from(p.baseStats),stats);a.equal(p.maxHp,hp);a.equal(p.activeMove().instanceId,id);a.ok(G.Moves.poolFor(p.mon,p).includes(p.activeMove().id));a.ok(!p.moves.some(m=>m.learningOnly));
 enemy(20,1e8,150);G.Moves.observe(p,1);a.equal(p.copiedDex,25);a.ok(!G.Moves.poolFor(p.mon,p).some(id=>G.Moves.BY_ID[id].specialOnly));a.equal(actor(G,132).copiedDex,undefined);
});
test('Smeargle unlocks only observed enemy species, validates stale offers and resets each run',()=>{
 const {G,enemy}=scene(),p=actor(G,235);a.equal(G.Moves.poolFor(p.mon,p).length,0);enemy(50,1000,129);G.Moves.observe(p,1);a.ok(p.observedSpecies.includes(129));a.equal(p.activeMove().id,'hydro-pump');a.ok(!G.Moves.poolFor(p.mon,p).includes('flamethrower'));const card=G.LevelUp.pool(p).find(c=>c.type==='new');a.ok(card);const saved=JSON.stringify(p.sketchedMoves);G.Moves.observe(p,1);a.equal(JSON.stringify(p.sketchedMoves),saved);p.sketchedMoves=[];a.equal(card.apply(p),false,'confirmation must revalidate observed permission');enemy(30,1000,6);G.Moves.observe(p,1);a.ok(G.Moves.poolFor(p.mon,p).includes('flamethrower'));a.equal(actor(G,235).sketchedMoves,undefined);
});
test('learning-only moves cannot deal ghost damage, evolve or waste upgrade cards',()=>{
 const {G,enemy}=scene(),p=actor(G,132),e=enemy(50,1000,6);G.Game={player:p};for(const id of ['transform','sketch']){const m=G.Moves.instance(id);a.equal(m.def.maxLvl,1);a.equal(G.Moves.levelUp(m),false);a.equal(G.Moves.evoInfo(m,{},20),null);G.Combat.ghostCast(p,id,1,0,false);a.equal(e.hp,1000);}p.remote=true;G.Moves.observe(p,1);a.equal(p.copiedDex,undefined);
});
test('existing learned moves, old bans/bindings and pending mastery survive the new permission boundary',()=>{
 const {G,enemy}=scene(),p=actor(G,129);G.Progress={event(){}};p.addMove('flamethrower');const old=p.moves[1];while(G.Moves.levelUp(old));p.level=20;const c=G.LevelUp.pool(p).find(c=>c.type==='evo'&&c.moveId==='flamethrower');a.ok(c);a.equal(c.apply(p),true);G.RunGrowth.reward(p,'boss:legacy');a.equal(G.RunGrowth.spend(p,old.instanceId),true);a.ok(!G.LevelUp.pool(p).some(c=>c.type==='new'&&c.moveId==='flamethrower'));const e=enemy(70,1000);a.ok(G.Battle.damage(p,e,old,old.dmg)>0);
 const save={pbind:{129:['flamethrower',null,null,null]},pban:{129:['flamethrower']},coins:42,owned:{129:1}},before=JSON.stringify(save);G.DB={save};G.Moves.poolFor(p.mon,p);a.equal(JSON.stringify(save),before);
});
test('legacy binding warning preserves old selections without silently granting an attack',()=>{
 const {G,ctx}=scene();G.UI={$:()=>null};G.DB={save:{pbind:{129:['flamethrower',null,null,null]}}};ctx.document={createElement:()=>({innerHTML:'',querySelectorAll:()=>[]})};const src=fs.readFileSync('js/ui/menu.js','utf8').replace('return { init, open,','return { _bind:d=>{upgDex=d;return bindPanel();}, init, open,');vm.runInContext(src,ctx);const html=G.MenuUI._bind(129).innerHTML;a.ok(html.includes('Atajo antiguo no disponible'));a.ok(html.includes('value="flamethrower" selected'));a.equal(G.DB.save.pbind[129][0],'flamethrower');
});
