/* node tools/measure-wave-growth.cjs SOURCE_ROOT OUTPUT [--quick] [--strong] */
const fs=require('node:fs'),path=require('node:path');
const root=path.resolve(process.argv[2]||'.'),out=path.resolve(process.argv[3]||'artifacts/enemy-balance/waves.json');process.chdir(root);
const scene=require(path.join(root,'tests/battle-fixture.cjs')),wave=require('../tests/wave-growth-fixture.cjs');
const arg=(key,fallback)=>process.argv.find(a=>a.startsWith('--'+key+'='))?.split('=')[1]||fallback;
const rows=[];for(const profile of arg('profiles','melee,ranged,sustain,tank,drain').split(','))for(const seed of arg('seeds',process.argv.includes('--quick')?'17':'1,17,101').split(',').map(Number)){
 const opt={profile,seed,seconds:+arg('seconds',process.argv.includes('--quick')?'360':'1800'),fps:+arg('fps','30'),idle:process.argv.includes('--idle'),strong:process.argv.includes('--strong'),mid:process.argv.includes('--mid')},r=wave(scene,opt);rows.push(r);console.log(JSON.stringify({...r,lifetimes:undefined,choices:undefined,milestones:undefined}));if(r.error)throw Error(r.error);
}
fs.mkdirSync(path.dirname(out),{recursive:true});fs.writeFileSync(out,JSON.stringify({model:'Open terrain; real spawn scheduler/casts/AI/drops/magnet/XP/actual reward cards. One active slot, no bonds or specials; deterministic seek/escape driving. No revives, HP/level resets or fixed enemy targets. This is not human win-rate or real-device evidence.',rows},null,2));
