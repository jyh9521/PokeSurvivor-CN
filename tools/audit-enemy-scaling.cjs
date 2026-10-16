/* Final spawn attributes through real definitions, constructor and party rule. */
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.resolve(process.argv[2]||'.'),out=path.resolve(process.argv[3]||'artifacts/balance/enemy-pipeline.json');process.chdir(root);
const {G,ctx}=require(path.join(root,'tests/battle-fixture.cjs'))();let seed=17;ctx.Math.random=()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/2**32);ctx.window={G};G.Events={bag:()=>null};G.Net={on(){},onPeer(){}};
for(const file of ['js/core/util.js','js/net/coop.js','js/data/enemies.js'])vm.runInContext(fs.readFileSync(file,'utf8'),ctx,{filename:file});G.Enemies.rollRun();
const B=G.BattleBalance,rows=[];
for(const time of [0,180,600,1200,1800])for(const players of [1,4,8]){
 const bag=G.Enemies.bagAt(time),defs=bag.filter((d,i)=>bag.findIndex(e=>e.dex===d.dex&&e.tier===d.tier)===i),party=G.Coop.scaleHp(players);
 for(const def of defs)for(const elite of [false,true]){
  const clock=G.Enemies.scale(time),normal=B.normalHp(time),blend=B.tierBlend(time,def.tier,G.Enemies.TIERS),e=new G.Enemy(def,0,0,{...clock,hp:clock.hp*party*normal*blend});e.dmg*=B.CONTACT_DAMAGE;
  if(elite){e.hp=e.maxHp=Math.round(e.maxHp*B.ELITE_HP);e.dmg*=1.25;}
  rows.push({time,players,dex:def.dex,tier:def.tier,behavior:def.behavior,elite,speciesHp:def.hp,timeHp:clock.hp,normalHp:normal,tierBlend:blend,partyHp:party,catchUp:1,effectiveHP:e.maxHp,damage:e.dmg,speed:e.spd,shotCd:def.shotCd||null,shotDamage:def.shotDmg?e.shotDmg():null,range:def.range||null});
 }
 for(const def of G.Enemies.BOSSES){const clock=G.Enemies.bossScale(time),e=new G.Enemy(def,0,0,{...clock,hp:clock.hp*party*(players>1?1.4:1)},true);rows.push({time,players,bossSlot:def.at,scheduled:time>=def.at,dex:def.dex,stageChain:def.stageChain||null,speciesHp:def.hp,timeHp:clock.hp,partyHp:party*(players>1?1.4:1),effectiveHP:e.maxHp,damage:e.dmg,speed:e.spd,shotCd:def.shotCd,shotDamage:e.shotDmg()});}
}
fs.mkdirSync(path.dirname(out),{recursive:true});fs.writeFileSync(out,JSON.stringify({seed:17,model:'Real util hash/cast roster, Enemy constructor, Coop.scaleHp and clock modifiers. Ordinary roster only, no horde/shiny/golden. Boss slot attributes before its scheduled time are labeled scheduled=false, not claimed as spawned.',rows},null,2));console.log('PASS ENEMY_PIPELINE: '+rows.length+' species/elite/boss/party rows; times=0,180,600,1200,1800; seed=17');
