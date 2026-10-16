/* Controlled combat benchmark. Static ordinary target, neutral types, no AI/crit/items/bonds.
 * Executes actual casts, swept projectile collisions and fields; NOT an in-game win-rate test.
 * node tools/measure-combat.cjs <source-root> <output.json>
 */
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.resolve(process.argv[2]||'.'),output=path.resolve(process.argv[3]||'artifacts/growth-balance/combat.json');process.chdir(root);
const scene=require(path.join(root,'tests/battle-fixture.cjs'));
const defs=scene().G.Moves.ALL.filter(m=>m.dmg>0&&!m.specialOnly&&m.kind!=='buff');const rows=[];
for(const def of defs)for(const [t,lv,ml,ev]of [[0,1,1,false],[160,15,3,false],[500,41,5,true]]){
 const s=scene(),{G,ctx}=s;G.Camera.kick=()=>{};G.Camera.sees=()=>true;G.World.projectileBlock=()=>null;G.Progress={event(){}};G.Rift={inArena:false};G.Judgment.active=false;G.Game={st:{time:t},everyone:()=>[p]};
 const p=s.player(G.BattleRules.classify(def,G.BattleDex)==='physical'?143:6);p.level=lv;G.Game.player=p;
 const m=G.Moves.instance(def.id,ml);if(ev&&G.Moves.evoInfo(m,{hp:1,atk:1,spd:1,cd:1,def:1,rgn:1,mag:1,xp:1}))G.Moves.evolve(m);p.moves=[m];p.slots=[[m]];
 vm.runInContext(fs.readFileSync('js/data/enemies.js','utf8'),ctx);const tier=G.Enemies.TIERS.filter(a=>a.from<=t).at(-1),density=G.BattleBalance?.DENSITY_HP||(3.3+Math.min(1.7,t/210)),hp=Math.round(tier.hp*G.Enemies.scale(t).hp*density);
 const dist=def.kind==='trail'?10:def.kind==='orbit'?m.radius:40,e=s.enemy(dist,hp,1);p.target=e;
 let elapsed=0,error=null;try{for(let frame=0;frame<1800&&!e.dead;frame++){elapsed=frame/60;s.time(elapsed*1000);p.x=0;p.y=0;p.aim=0;p.invuln=100;if(def.kind==='counter')p.battle.counterT=2;G.Combat.tick(1/60,p,elapsed);G.Projectiles.update(1/60,p,[e]);G.Combat.resolve(1/60,p,elapsed);G.Combat.updateFields(1/60);}}catch(err){error=err.message;}
 rows.push({id:def.id,kind:def.kind,time:t,playerLevel:lv,moveLevel:ml,evolved:!!m.evolved,targetHP:hp,damage:hp-Math.max(0,e.hp),killSeconds:e.dead?+elapsed.toFixed(3):null,error});
}
fs.mkdirSync(path.dirname(output),{recursive:true});fs.writeFileSync(output,JSON.stringify({root,scenario:'Static target at intended range; position restored each frame, counter armed; no enemy AI, items, bonds or type advantages; 30s timeout.',rows},null,2));
const errors=rows.filter(r=>r.error);console.log(JSON.stringify({attacks:defs.length,cases:rows.length,errors:errors.slice(0,8),tackle:rows.filter(r=>r.id==='tackle'),lateKilled:rows.filter(r=>r.time===500&&r.killSeconds!==null).length}));if(errors.length)process.exitCode=1;
if(GLOBAL_VERIFY()){const late=rows.filter(r=>r.time===500);require('node:assert/strict').ok(late.every(r=>r.killSeconds!==null),'every eligible attack settles damage and kills the controlled late target');}
function GLOBAL_VERIFY(){return process.argv.includes('--verify');}
