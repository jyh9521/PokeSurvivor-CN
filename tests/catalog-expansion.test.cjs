const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),crypto=require('node:crypto');
const config=require('../tools/localization/catalog-expansion.json'),baseline=require('../tools/localization/catalog-baseline.json'),manifest=require('../tools/localization/catalog-assets.json');
const scene=require('./battle-fixture.cjs'),ids=new Set(config.additions.map(r=>r.dex)),hash=b=>crypto.createHash('sha256').update(b).digest('hex');
test('catalog grows only by the nine audited species and retains every original species and battle value',()=>{
 const {G}=scene();assert.equal(G.DEX.length,975);assert.equal(new Set(G.DEX.map(p=>p.dex)).size,975);assert.deepEqual(Array.from(G.DEX,p=>p.dex),Array.from(G.DEX,p=>p.dex).sort((a,b)=>a-b));
 assert.equal(hash(JSON.stringify(G.DEX.filter(p=>!ids.has(p.dex)))),baseline.dexSha256);
 assert.equal(hash(JSON.stringify(Object.fromEntries(Object.entries(G.BattleDex.species).filter(([d])=>!ids.has(+d))))),baseline.battleSpeciesSha256);
});
test('all imported normal/shiny sheets match pinned hashes and exact eight-direction frame geometry',()=>{
 const G={};vm.runInNewContext(fs.readFileSync('js/data/sprites-meta.js','utf8'),{G});assert.equal(manifest.revision,config.revision);assert.equal(manifest.species.length,9);assert.equal(manifest.files.length,178);
 for(const r of manifest.files){const b=fs.readFileSync(r.file);assert.equal(hash(b),r.sha256,r.file);assert.equal(b.toString('hex',0,8),'89504e470d0a1a0a');const entry=G.SPRITE_META[r.dex],m=r.shiny&&entry.sa?.[r.action]||entry.a[r.action];assert.equal(b.readUInt32BE(16),r.w);assert.equal(b.readUInt32BE(20),r.h);assert.equal(b.readUInt32BE(16)%m.w,0);assert.equal(b.readUInt32BE(20),m.h*m.r);assert.ok(m.r>=8&&m.n>0&&m.n<=b.readUInt32BE(16)/m.w&&m.d.every(n=>n>0));}
 for(const r of config.additions)for(const name of ['Idle','Walk','Attack'])assert.ok(G.SPRITE_META[r.dex].a[name]);
});
test('new partners have unique curated pools, matching practical opening attacks, valid combat and defensive stats',()=>{
 const {G,player,enemy}=scene();for(const row of config.additions){const mon=G.DEX_BY[row.dex],pool=G.Moves.poolFor(mon);assert.equal(pool.length,12);assert.equal(new Set(pool).size,12);assert.ok(pool.every(id=>G.Moves.BY_ID[id].kind!=='buff'&&!G.Moves.BY_ID[id].specialOnly));
 assert.equal(G.Moves.startFor(mon),row.opening);const m=G.Moves.instance(row.opening,1);assert.ok(mon.types.includes(m.type));assert.ok(!['buff','counter','decoy','trail','mine'].includes(m.kind));const p=player(row.dex),e=enemy();assert.ok(p.maxHp>0&&p.baseStats.length===6);assert.ok(G.Battle.damage(p,e,m,m.dmg)>0);assert.ok(Number.isFinite(G.Battle.defend(p,100,false,'physical',0)));}
 assert.equal(new Set(config.additions.map(r=>G.Moves.poolFor(G.DEX_BY[r.dex]).join(','))).size,9);
});
test('roaming Gimmighoul uses actual alternate stats and all selected sprite variants stay labeled',()=>{
 const {G}=scene();assert.deepEqual(Array.from(G.BattleDex.species[999].stats),[45,30,25,75,45,80]);assert.equal(G.BattleDex.species[999].name,'gimmighoul-roaming');assert.equal(G.DEX_BY[999].bst,300);assert.equal(G.DEX_BY[999].battleId,10263);
 for(const row of config.additions.filter(r=>r.spriteForm))assert.equal(G.DEX_BY[row.dex].spriteForm,row.spriteForm);
});
test('all added species enter both mixed and regional gacha',()=>{
 const {G,ctx}=scene();G.SPRITE_META=Object.fromEntries(G.DEX.map(p=>[p.dex,{}]));G.Sprites.hasShiny=()=>false;vm.runInContext(fs.readFileSync('js/systems/gacha.js','utf8'),ctx);
 for(const row of config.additions){const mon=G.DEX_BY[row.dex];assert.ok(G.Gacha.pool(mon.rarity,0).some(p=>p.dex===row.dex));assert.ok(G.Gacha.pool(mon.rarity,mon.gen).some(p=>p.dex===row.dex));}
});
