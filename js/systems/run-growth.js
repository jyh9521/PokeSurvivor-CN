/* Run-only scarce rewards. IDs survive sorting, binding, fusion and evolution.
 * Host creates source IDs; clients only consume host events. No account migration. */
G.RunGrowth=(()=>{
  const PER_MOVE=3,TOTAL=6,RATE=.03;
  function state(p){return p.growth||=( {points:0,spent:0,sources:[],history:[],returns:[]} );}
  function targets(p){return (p.slots||[]).flatMap((group,index)=>group.filter(m=>m.evolved&&m.lvl>=m.def.maxLvl&&(m.mastery||0)<PER_MOVE).map(m=>({instanceId:m.instanceId,group:index+1,move:m})));}
  function reward(p,id){if(!p||p.remote||typeof id!=='string'||! /^(boss|rift):[\w-]{1,100}$/.test(id))return false;const s=state(p);if(s.sources.includes(id)||s.spent+s.points>=TOTAL)return false;s.sources.push(id);s.points++;s.history.push({source:id,action:'earned'});G.Telemetry?.event(p,'mastery-earned',{source:id,points:s.points});return true;}
  function spend(p,instanceId){const s=state(p),target=targets(p).find(t=>t.instanceId===instanceId);if(p.remote||!target||s.points<1||s.spent>=TOTAL)return false;if(!G.Moves.master(target.move))return false;s.points--;s.spent++;s.history.push({action:'spent',instanceId,group:target.group,level:target.move.mastery});G.Telemetry?.event(p,'mastery-spent',{instanceId,group:target.group,level:target.move.mastery});return true;}
  function returned(p,id){if(!p||p.remote||typeof id!=='string'||!id||id.length>100)return false;const s=state(p);if(s.returns.includes(id))return false;s.returns.push(id);reward(p,'rift:'+id);const b=p.battle;if(b?.used){b.energy=0;if(b.form)b.rechargePending=true;else{b.used=false;b.rechargePending=false;}}return true;}
  function boss(e){if(e.remote||!e.boss||e.judge||G.Rift?.inArena)return;const id='boss:'+e.id;reward(G.Game?.player,id);if(G.Coop.isHost)G.Coop.broadcast(['mr',id]);}
  function net(p){const s=state(p);return {points:s.points,spent:s.spent,targets:(p.slots||[]).flatMap((g,i)=>g.map(m=>[m.instanceId,m.id,i,m.mastery||0]))};}
  return{PER_MOVE,TOTAL,RATE,state,targets,reward,spend,returned,boss,net};
})();
