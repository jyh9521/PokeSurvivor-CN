/* Same seeded native dynamic driver at every move-growth stage, no HP resets. */
const fs=require('fs'),path=require('path'),assert=require('assert/strict');
const root=path.resolve(process.argv[2]||'.'),out=path.resolve(process.argv[3]||'artifacts/move-growth/dynamic.json');process.chdir(root);
const factory=require(path.join(root,'tests/battle-fixture.cjs')),dynamic=require('../tests/dynamic-combat-fixture.cjs'),shared=factory();
const scene=()=>{const G=shared.G;G.EnemyMgr.clear();G.Projectiles.clear();G.Combat.clearFields();return shared;},defs=shared.G.Moves.ALL.filter(m=>m.dmg>0&&!m.specialOnly),rows=[];
for(const def of defs){for(const stage of [1,2,3,4,5,'evolved','training','mastery','full'])for(const dex of [68,65])for(const kind of ['moving','surround','boss']){
 let casts=0;const r=dynamic(scene,def.id,kind,17,{dex,configure(p,G){const current=p.activeMove(),m=G.Moves.instance(def.id,typeof stage==='number'?stage:5);if(typeof stage==='string')G.Moves.evolve(m);if(stage==='training'||stage==='full')m.training=12;if(stage==='mastery'||stage==='full')for(let i=0;i<3;i++)G.Moves.master(m);for(const k of Object.keys(current))delete current[k];Object.assign(current,m);p.cast=()=>casts++;}});
 assert.equal(r.error,null,def.id);rows.push({...r,stage,casts,castHz:casts/Math.max(.016,r.seconds),dps:r.damage/Math.max(.016,r.seconds),kps:r.kills/Math.max(.016,r.seconds)});
 }console.log('DYNAMIC '+def.id+' '+rows.length);}
fs.mkdirSync(path.dirname(out),{recursive:true});fs.writeFileSync(out,JSON.stringify({sourceRoot:root,model:'Native moving/12-enemy surround/boss AI, 24s limit, open terrain, seed17, two offensive stat axes 68/65, playerL41. All nine move stages explicitly rebuilt; no invulnerability, revive or reset. KPS uses actual scenario elapsed, finite non-replenished targets; not human win rates.',rows},null,2));console.log('PASS MOVE_DYNAMIC '+defs.length+' moves '+rows.length+' windows; errors=0');
