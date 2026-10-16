/* Continuous seeded waves: real spawner, AI, drops, XP and four-lane rewards.
 * Headless open terrain and deterministic driving, NOT player win-rate evidence. */
const fs=require('node:fs'),vm=require('node:vm');
module.exports=function waves(scene,opt={}){
  const s=scene(),{G,ctx}=s,noop=()=>{};let state=(opt.seed||17)>>>0,t=0;
  const rng=()=>{state=(Math.imul(state,1664525)+1013904223)>>>0;return state/4294967296;};ctx.Math.random=rng;
  ctx.window={G};vm.runInContext(fs.readFileSync('js/core/util.js','utf8'),ctx,{filename:'js/core/util.js'});
  // Paired versions keep reward/spawn/loot sequences independent of combat RNG
  // consumption. All weights/cards/drops stay native; no guaranteed choices.
  const streams={};function stream(name,fn){const saved=state;state=streams[name]??((opt.seed||17)^name.split('').reduce((n,c)=>(Math.imul(n,31)+c.charCodeAt(0))>>>0,0));try{return fn();}finally{streams[name]=state;state=saved;}}
  G.U.rand=(a,b)=>a+(b-a)*rng();G.U.randInt=(a,b)=>Math.floor(a+rng()*(b-a+1));G.U.pick=a=>a[Math.floor(rng()*a.length)];G.U.shuffle=a=>{for(let i=a.length-1;i>0;i--){const j=Math.floor(rng()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;};
  G.VFX.forType=()=>({});G.Camera.sees=()=>true;G.Camera.outerRadius=()=>330;G.Camera.kick=noop;
  G.Path.dirFor=(e,p)=>G.U.norm(p.x-e.x,p.y-e.y);G.Progress={event:noop,kill:noop};G.Rift={inArena:false};G.Judgment.active=false;
  G.Events={golden:false,bag:()=>null};G.Coop.scaleRate=n=>1+.75*Math.max(0,n-1);G.Coop.scaleHp=n=>1+.3*Math.max(0,n-1);
  for(const file of ['js/data/types.js','js/data/upgrades.js','js/data/items.js','js/data/enemies.js','js/systems/hazards.js','js/entities/pickup.js','js/systems/spawner.js'])vm.runInContext(fs.readFileSync(file,'utf8'),ctx,{filename:file});
  const profiles={melee:{dex:68,passives:['vitality','harden','swords-dance','agility']},ranged:{dex:6,passives:['vitality','calm-mind','reflexes','harden']},sustain:{dex:3,preferred:'leech-seed',passives:['vitality','aqua-ring','harden','calm-mind']},tank:{dex:143,passives:['vitality','harden','light-screen','aqua-ring']},drain:{dex:114,passives:['vitality','aqua-ring','harden','calm-mind']}};
  const cfg=profiles[opt.profile||'melee'];
  const perks=G.Upgrades.perks(Object.fromEntries(G.Upgrades.LIST.map(u=>[u.id,opt.strong?u.max:opt.mid?Math.floor(u.max/2):0])));
  const players=Array.from({length:opt.players||1},(_,i)=>{const p=new G.Player(G.DEX_BY[opt.dex||cfg.dex],perks);p.uid='p'+i;p.x=i*30;p.cast=noop;p.addMove(G.Moves.startFor(p.mon));return p;});
  G.Camera.sees=(x,y,pad=0)=>players.some(p=>G.U.dist2(p.x,p.y,x,y)<(330+pad)**2);
  G.Game={player:players[0],st:{time:0},everyone:()=>players};
  if(G.Telemetry)for(const p of players)G.Telemetry.start(p);
  if(opt.offense)G.BattleBalance.offense=p=>opt.offense==='linear35'?1+(p.level-1)*.035:1+Math.min(19,p.level-1)*.04+Math.max(0,p.level-20)*.02;
  if(opt.xpScale)G.BattleBalance.xpReward=()=>opt.xpScale;
  const milestones=[],bosses=[],choices=[],lifetimes=[],damage={taken:0,hits:0},spawns={normal:0,elite:0,boss:0};let kills=0,capSeconds=0,maxCount=0,travel=0,hazards=0,upgrades=0;
  const add=G.EnemyMgr.add;G.EnemyMgr.add=e=>{e._born=t;spawns[e.boss?'boss':e.elite?'elite':'normal']++;if(e.boss){const row={at:+t.toFixed(2),hp:e.maxHp,dex:e.dex,chain:e.def.stageChain,firstHit:null,dead:null,stage:0};e._measure=row;bosses.push(row);}const hurt=e.hurt.bind(e);e.hurt=(...a)=>{if(e._measure&&e._measure.firstHit===null)e._measure.firstHit=+t.toFixed(2);return hurt(...a);};const die=e.die.bind(e);e.die=()=>{if(e.dead)return;kills++;if(e.boss){e._measure.dead=+t.toFixed(2);e._measure.stage=e.bossStage||0;}else lifetimes.push({at:t,life:t-e._born});stream('loot',die);};return add(e);};
  for(const p of players){const hurt=p.hurt.bind(p);p.hurt=(...a)=>{const hp=p.hp;hurt(...a);if(p.hp<hp){damage.taken+=hp-p.hp;damage.hits++;}};}
  const h=G.Hazards.add;G.Hazards.add=(...a)=>{hazards++;return h(...a);};
  const choose=p=>stream('reward:'+p.uid,()=>chooseCard(p));
  function chooseCard(p){const offered=G.LevelUp.offer(p).filter(c=>!c.disabled);if(!offered.length)return;
    // Select only actual offered cards; no forced skill levels or evolution prerequisites.
    const primary=c=>c.moveId===p.activeMove()?.id;
    const score=c=>c.type==='new'&&c.moveId===cfg.preferred?110:c.type==='evo'?(primary(c)?100:1):c.type==='up'?(primary(c)?90:1):c.type==='mastery'?(primary(c)?40:1):c.type==='passive'?(cfg.passives.includes(c.passiveId)?75-cfg.passives.indexOf(c.passiveId)*4:5):c.type==='new'?-1:0;
    offered.sort((a,b)=>score(b)-score(a));const c=offered[0];c.apply(p);if(c.type==='new'&&c.moveId===cfg.preferred)p.active=p.slots.findIndex(g=>g.some(m=>m.id===c.moveId));upgrades++;if(p===players[0])choices.push({time:+t.toFixed(1),level:p.level,key:c.key});
  }
  let owner=players[0];const desired=()=>{const p=owner;if(opt.idle)return[0,0];
    const hazard=G.Hazards.all.find(h=>!h.hit&&G.Hazards.inside(h,p.x,p.y,p.r+22));if(hazard){if(hazard.kind==='beam')return[-Math.sin(hazard.angle),Math.cos(hazard.angle)];const dir=G.U.norm(p.x-hazard.x,p.y-hazard.y);return dir[0]||dir[1]?dir:[1,0];}
    const shot=G.Projectiles.all().find(o=>!o.friendly&&G.U.dist2(p.x,p.y,o.x,o.y)<110**2&&(p.x-o.x)*o.vx+(p.y-o.y)*o.vy>0);if(shot){const cross=(p.x-shot.x)*(-shot.vy)+(p.y-shot.y)*shot.vx;return G.U.norm(-shot.vy*(cross<0?-1:1),shot.vx*(cross<0?-1:1));}
    const alive=G.EnemyMgr.all().filter(e=>!e.dead),near=alive.filter(e=>G.U.dist2(p.x,p.y,e.x,e.y)<85*85);
    // Escape a crowd; otherwise seek nearby XP and engage instead of running forever.
    if(near.length>=4||p.hp<p.maxHp*.3&&near.length){let x=0,y=0;for(const e of near){const d=Math.max(10,G.U.dist(p.x,p.y,e.x,e.y));x+=(p.x-e.x)/d**2;y+=(p.y-e.y)/d**2;}return G.U.norm(x,y);}
    const orb=G.Pickups.all().filter(o=>['xp','xpBig','heal','magnet','item'].includes(o.kind)).sort((a,b)=>G.U.dist2(p.x,p.y,a.x,a.y)-G.U.dist2(p.x,p.y,b.x,b.y))[0];
    const boss=alive.find(e=>e.boss);
    if(orb&&!boss&&G.U.dist(p.x,p.y,orb.x,orb.y)<220)return G.U.norm(orb.x-p.x,orb.y-p.y);
    const e=boss||alive.sort((a,b)=>G.U.dist2(p.x,p.y,a.x,a.y)-G.U.dist2(p.x,p.y,b.x,b.y))[0];if(!e)return[0,0];
    const m=p.activeMove(),d=G.U.dist(p.x,p.y,e.x,e.y),range=m.kind==='melee'?Math.max(e.r+p.r+12,m.radius*.65):120,[dx,dy]=G.U.norm(e.x-p.x,e.y-p.y);return d>range?[dx,dy]:d<range*.7?[-dx,-dy]:[-dy,dx];
  };
  G.Input.axis=()=>{const p=owner;if(opt.idle)return[0,0];if(t<(p._driveAt||0))return p._driveAxis;p._driveAt=t+.12;
    const goal=desired(),dirs=[goal,...Array.from({length:12},(_,i)=>[Math.cos(i*Math.PI/6),Math.sin(i*Math.PI/6)])],enemies=G.EnemyMgr.all().filter(e=>!e.dead&&G.U.dist2(p.x,p.y,e.x,e.y)<220**2),shots=G.Projectiles.all().filter(o=>!o.friendly&&G.U.dist2(p.x,p.y,o.x,o.y)<250**2);
    let best=goal,bestScore=-Infinity;
    for(const dir of dirs){const vx=dir[0]*p.spd,vy=dir[1]*p.spd;let score=(dir[0]*goal[0]+dir[1]*goal[1])*40;
      for(const e of enemies){const [dx,dy]=G.U.norm(p.x-e.x,p.y-e.y),speed=e.slowT>0?e.spd*(1-e.slow):e.spd;for(const horizon of [.2,.45]){const d=Math.hypot(p.x+vx*horizon-e.x-dx*speed*horizon,p.y+vy*horizon-e.y-dy*speed*horizon),safe=p.r+e.r+10;if(d<safe)score-=(1-d/safe)*800;}}
      for(const o of shots){const dx=o.x-p.x,dy=o.y-p.y,rx=o.vx-vx,ry=o.vy-vy,horizon=G.U.clamp(-(dx*rx+dy*ry)/(rx*rx+ry*ry||1),0,.6),d=Math.hypot(dx+rx*horizon,dy+ry*horizon),safe=(o.r||5)+p.r+10;if(d<safe)score-=(1-d/safe)*1200;}
      for(const h of G.Hazards.all){const until=h.delay-h.t;if(!h.hit&&until>=0&&until<.8&&G.Hazards.inside(h,p.x+vx*until,p.y+vy*until,p.r+12))score-=3000;}
      if(score>bestScore){best=dir;bestScore=score;}
    }p._driveAxis=best;return best;
  };
  stream('spawn',()=>G.Spawner.reset());const dt=1/(opt.fps||30),duration=opt.seconds||1200;let error=null;
  try{for(let f=0;f<duration/dt;f++){t=f*dt;s.time(t*1000);G.Game.st.time=t;if(players.every(p=>p.dead))break;
    stream('spawn',()=>G.Spawner.update(dt,players,t));
    for(const p of players){if(p.dead)continue;owner=p;const x=p.x,y=p.y;p.update(dt);travel+=Math.hypot(p.x-x,p.y-y);}
    G.EnemyMgr.update(dt,players);
    for(const p of players){if(p.dead)continue;G.Combat.tick(dt,p,t);}G.Projectiles.update(dt,players[0],G.EnemyMgr.all());for(const p of players)if(!p.dead)G.Combat.resolve(dt,p,t);G.Combat.updateFields(dt);G.Hazards.update(dt);
    G.Pickups.update(dt,players,(o,p)=>{if(o.kind==='xp'||o.kind==='xpBig'){for(const q of players){const n=q.gainXp(o.value/(1+.6*(players.length-1)));for(let i=0;i<n;i++)choose(q);}}else if(o.kind==='heal')p.heal(p.maxHp*.3);else if(o.kind==='magnet')G.Pickups.pullAll();else if(o.kind==='item'){const rank=id=>({shellbell:100,leftovers:95,assaultvest:80,quickclaw:70,choiceband:65,luckyegg:60,focussash:55,choicescarf:50,rockyhelmet:40,amuletcoin:5,lifeorb:-1}[id]||0);if(rank(o.value)>rank(p.item))p.equip(o.value);}else if(o.kind==='bomb')for(const e of G.EnemyMgr.all())if(!e.dead&&G.Camera.sees(e.x,e.y))e.hurt(60+players[0].level*14,'#fff',e.x-p.x,e.y-p.y,160);});
    if(G.RunGrowth)for(const p of players){const target=G.RunGrowth.targets(p).find(t=>p.activeGroup().includes(t.move));if(target)G.RunGrowth.spend(p,target.instanceId);}
    if(G.Telemetry)for(const p of players)G.Telemetry.tick(p,dt,t);
    const count=G.EnemyMgr.count;maxCount=Math.max(maxCount,count);if(count>=G.Spawner.CAP)capSeconds+=dt;
    if(f%Math.round(60/dt)===0)milestones.push({time:Math.round(t),level:players[0].level,hp:+players[0].hp.toFixed(1),maxHp:players[0].maxHp,alive:players.filter(p=>!p.dead).length,enemies:count,kills,damageTaken:+damage.taken.toFixed(1),moves:players[0].moves.map(m=>({id:m.id,lv:m.lvl,evolved:!!m.evolved,mastery:m.mastery||0})),passives:{...players[0].passives}});
  }}catch(e){error=e.stack;}
  return{profile:opt.profile||'melee',seed:opt.seed||17,players:players.length,strong:!!opt.strong,mid:!!opt.mid,perks,idle:!!opt.idle,fps:1/dt,requested:duration,seconds:+t.toFixed(2),alive:players.filter(p=>!p.dead).length,levels:players.map(p=>p.level),hp:players.map(p=>+p.hp.toFixed(1)),kills,spawns,maxCount,capSeconds:+capSeconds.toFixed(1),damageTaken:+damage.taken.toFixed(1),hitsTaken:damage.hits,travel:Math.round(travel),hazards,upgrades,bosses,milestones,choices,lifetimes,telemetry:G.Telemetry?.report(players[0]),error};
};
