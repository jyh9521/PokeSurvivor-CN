/* Explicit paused handoff, not a rewind to an old periodic backup. Transient
 * projectiles/fields are cleared at the barrier; persistent actors/drops survive. */
G.Migration=(()=>{
  const clone=v=>JSON.parse(JSON.stringify(v,(key,value)=>['anim','net','follow','target'].includes(key)?undefined:value));
  const modules=['World','EnemyMgr','Pickups','Spawner','Weather','Rift','Events','Hazards','Judgment'];
  function capture(){const state={v:1,busy:!G.Coop.canMigrate,team:G.Game.exportMigration(),players:G.Coop.exportPlayers(),modules:{}};for(const k of modules)state.modules[k]=clone(G[k].checkpoint());return state;}
  function valid(s){return !!s&&s.v===1&&!s.busy&&Number.isFinite(s.team?.time)&&s.team.time>=0&&modules.every(k=>s.modules?.[k]!==undefined)&&Array.isArray(s.modules.EnemyMgr.list)&&s.modules.EnemyMgr.list.length<=1024;}
  function apply(s,authority){if(!valid(s))throw Error('Invalid migration snapshot');G.Projectiles.clear();G.Combat.clearFields();G.FX.clear();G.Path.clear();for(const k of modules)G[k].checkpoint(s.modules[k],authority);G.Game.importMigration(s.team);}
  return {capture,valid,apply,clone};
})();
