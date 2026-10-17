/* Offline party model: one host AI, but per-browser projectile/contact/hazard damage views.
 * Not a WebRTC emulator. No automatic revives; native casts and hurt/defense remain unchanged. */
exports.install=function install(G,players){
 if(players.length<2)return;const resolve=G.Combat.resolve,hazards=G.Hazards.update,seen=new Map(players.map(p=>[p,new Set()])),contacts=new Map(players.map(p=>[p,new Map()]));let batch;
 G.Combat.resolve=(dt,p,time)=>{
  if(!batch||batch.time!==time){const projectiles=[...G.Projectiles.all()];batch={time,projectiles,hostile:projectiles.filter(o=>!o.friendly),survivors:[],alive:players.filter(q=>!q.dead)};const ids=new Set(batch.hostile.map(o=>o.id));for(const set of seen.values())for(const id of set)if(!ids.has(id))set.delete(id);for(const map of contacts.values())for(const[id,t]of map)if(t>dt)map.set(id,t-dt);else map.delete(id);}
  const map=contacts.get(p);for(const e of G.EnemyMgr.all())e.touchCd=map.get(e.id)||0;
  const local=batch.projectiles.filter(o=>o.friendly?(o.owner===p||!o.owner&&p===players[0]):!seen.get(p).has(o.id)).map(o=>o.friendly?o:{...o});G.Projectiles.all().splice(0,Infinity,...local);resolve(dt,p,time);const remaining=G.Projectiles.all();batch.survivors.push(...remaining.filter(o=>o.friendly));const aliveIds=new Set(remaining.filter(o=>!o.friendly).map(o=>o.id));for(const o of batch.hostile)if(!aliveIds.has(o.id))seen.get(p).add(o.id);for(const e of G.EnemyMgr.all())map.set(e.id,e.touchCd||0);
  if(p===batch.alive.at(-1)){G.Projectiles.all().splice(0,Infinity,...batch.survivors,...batch.hostile.filter(o=>{const e=G.EnemyMgr.get(o.enemyId);return !e||!e.dead&&(o.enemyStage||0)>=(e.bossStage||0);}));for(const e of G.EnemyMgr.all())e.touchCd=contacts.get(players[0]).get(e.id)||0;}
 };
 G.Hazards.update=dt=>{const restore=list=>{G.Hazards.clear();G.Hazards.checkpoint({list});G.Hazards.all.forEach((h,i)=>h.hit=!!list[i].hit);};const original=G.Hazards.all.map(o=>({...o}));let after;for(const p of players){if(p.dead)continue;restore(original.map(o=>({...o})));G.Game.player=p;hazards(dt);after||=G.Hazards.all.map(o=>({...o}));}G.Game.player=players[0];restore(after||original);};
};
