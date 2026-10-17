/* Actual casts/collisions/fields. Fixed static targets; damage windows are not win rates. */
module.exports=function measure(scene,id,stage,dex,scenario='single',seed=17){
 const s=scene(),{G,ctx}=s;let rng=seed>>>0;ctx.Math.random=()=>((rng=(Math.imul(rng,1664525)+1013904223)>>>0)/4294967296);G.U.rand=(a,b)=>a+(b-a)*ctx.Math.random();
 G.Camera.sees=()=>true;G.Camera.kick=()=>{};G.Progress={event(){}};G.Rift={inArena:false};G.Judgment.active=false;
 const p=s.player(dex);p.level=1;p.crit=0;p.hp=p.maxHp*.5;p.onDealt=()=>{};
 const deal=G.Battle.deal,damage=G.Battle.damage,spawn=G.Projectiles.spawn,oldCast=G.SkillVFX.cast,oldVis=G.VFX.forMove;let serial=0;const causal=new Map();
 G.SkillVFX.cast=(p,m)=>{m.__auditCast=++serial;};G.VFX.forMove=m=>({__auditCast:m.__auditCast});
 G.Projectiles.spawn=o=>{if(o.friendly!==false&&o.moveId){const fallback={...(G.Moves.BY_ID[o.moveId]||{}),id:o.moveId,type:o.mtype,damageClass:o.damageClass,dmg:o.dmg};o.moveData={...(o.moveData||fallback),__auditCast:o.vis?.__auditCast};}return spawn(o);};
 G.Battle.deal=(...a)=>{a[1].__auditCast=a[7]?.__auditCast;return deal(...a);};G.Battle.damage=(...a)=>{a[1].__auditCast=a[2]?.__auditCast;return damage(...a);};
 const lv=typeof stage==='number'?stage:5,m=G.Moves.instance(id,lv);
 if(typeof stage==='string')G.Moves.evolve(m);
 if(stage==='training'||stage==='full')m.training=12;
 if(stage==='mastery'||stage==='full')for(let i=0;i<3;i++)G.Moves.master(m);
 p.moves=[m];p.slots=[[m]];G.Game={player:p,st:{time:0},everyone:()=>[p]};
 const n=scenario==='crowd'?12:1,hp=scenario==='crowd'?180:scenario==='elite'?4000:10000;
 const base=G.Moves.BY_ID[id],r=id==='aqua-jet'?60:base.kind==='orbit'?base.radius:base.kind==='trail'?12:Math.min(90,base.radius?base.radius*.7:90);
 let dealt=0,directDamage=0,statusDamage=0,kills=0,packets=0,casts=0,healed=0,controlled=0,immune=0;const hitSlots=new Set(),perCast=new Map();
 const heal=p.heal.bind(p);p.heal=x=>{const before=p.hp;heal(x);healed+=p.hp-before;};p.cast=()=>{casts++;};
 const enemies=[];for(let i=0;i<n;i++){
  const a=n===1?0:(i-5.5)*Math.PI/9,rad=n===1?r:i<6?40:100,e=s.enemy(Math.cos(a)*rad,hp,1);e.y=Math.sin(a)*rad;e.elite=scenario==='elite';e.boss=scenario==='boss';e.touchCd=1e8;e.bossMove=()=>[0,0,'Idle'];e.anchor=[e.x,e.y];
  const hurt=e.hurt.bind(e);e.hurt=(...args)=>{const before=e.hp;hurt(...args);const loss=Math.max(0,before-Math.max(0,e.hp));if(loss>0){dealt+=loss;if(args.length<=2)statusDamage+=loss;else{directDamage+=loss;if(e.__auditCast){if(!causal.has(e.__auditCast))causal.set(e.__auditCast,new Set());causal.get(e.__auditCast).add(i);}}packets++;hitSlots.add(i);if(!perCast.has(casts))perCast.set(casts,new Set());perCast.get(casts).add(i);}if(scenario!=='crowd'){e.hp=hp;e.dead=false;}};
  e.die=()=>{if(!e.dead)kills++;e.dead=true;};enemies.push(e);
 }
 G.EnemyMgr.rebuildGrid();let error=null;
 try{for(let f=0;f<720;f++){const t=f/60;s.time(t*1000);p.x=p.y=0;p.aim=0;p.target=enemies.find(e=>!e.dead);if(m.kind==='counter')p.battle.counterT=2;
   for(const e of enemies){if(e.dead&&scenario==='crowd'){e.dead=false;e.hp=hp;e.staggerT=e.slowT=e.burnT=e.poisonT=0;e.slow=e.burn=e.poison=0;}e.update(1/60,p);[e.x,e.y]=e.anchor;e.kx=e.ky=0;}
   G.EnemyMgr.rebuildGrid();G.Combat.tick(1/60,p,t);G.Projectiles.update(1/60,p,enemies);G.Combat.resolve(1/60,p,t);G.Combat.updateFields(1/60);
   controlled+=enemies.filter(e=>e.slowT>0||e.staggerT>0).length/60;immune+=(p.invuln>0?1:0)/60;p.invuln=Math.max(0,p.invuln-1/60);
 }}catch(e){error=e.stack;}
 const range=['wave','cone','projectile','split','curve','spiral','rolling','ricochet'].includes(m.kind)?(m.speed||0)*(m.life||0):m.radius||0;
 G.Battle.deal=deal;G.Battle.damage=damage;G.Projectiles.spawn=spawn;G.SkillVFX.cast=oldCast;G.VFX.forMove=oldVis;
 return {id,kind:m.kind,stage,dex,damageClass:m.damageClass,level:m.lvl,evolved:!!m.evolved,training:m.training||0,mastery:m.mastery||0,scenario,seed,seconds:12,dps:dealt/12,directDps:directDamage/12,statusDps:statusDamage/12,kps:kills/12,casts,castHz:casts/12,averageTargetsPerCast:m.kind==='orbit'?null:[...causal.values()].reduce((s,a)=>s+a.size,0)/Math.max(1,serial),averageTargetsPerCastInterval:[...perCast.values()].reduce((s,a)=>s+a.size,0)/Math.max(1,casts),targetCoverage:hitSlots.size/n,packets,damage:dealt,cd:m.cd,range,radius:m.radius||0,width:m.width||0,arc:m.arc||0,count:m.count||1,pierce:m.pierce||0,theoryPacketDps:(m.dmg||0)*(G.Moves.growthFactor?.(m)||(1+.05*(m.training||0)))/m.cd,utility:{slow:m.slow||0,knock:m.knock||0,stagger:m.stagger||0,killHeal:m.killHeal||0,seedHeal:m.seedHeal||0,guardTime:m.guardTime||0,invulnerabilitySeconds:immune,controlledTargetSeconds:controlled,healed,amount:m.amount||0,stacks:m.stacks||0,duration:m.dur||0},error};
};
