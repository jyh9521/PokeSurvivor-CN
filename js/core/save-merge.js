/* Shared conservative three-way merge; NAS supplies the trusted base. */
(function(factory){if(typeof module==='object'&&module.exports)module.exports=factory();else G.SaveMerge=factory();})(()=>{
const equal=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
const economy=['coins','tickets','pupg','pspent','pity','missions','ach'];
const unions=new Set(['owned','shiny','legends','starterBosses','arenas','itemsFound','evoMoves','ach']);
function merge(base,local,remote){
  if(!base||!local||!remote)return {conflicts:['base-expired']};
  const conflicts=[],out=structuredClone(remote);
  const touched=s=>economy.some(k=>!equal(s[k],base[k]));
  // Reward claims, pulls, purchases and refunds are inseparable from their money.
  // Parallel economic activity requires a human choice, not maximum balances or
  // client-provided earned/spent totals that can replay the same reward twice.
  if(touched(local)&&touched(remote))conflicts.push('economy');
  const keys=new Set([...Object.keys(base),...Object.keys(local),...Object.keys(remote)]);
  for(const k of keys){
    if(['updated','name','serverRewards'].includes(k))continue;
    const b=base[k],l=local[k],r=remote[k];
    if(equal(l,b))continue;
    if(equal(r,b)||equal(l,r)){if(l===undefined)delete out[k];else out[k]=structuredClone(l);continue;}
    if(unions.has(k)){out[k]={...l,...r};continue;}
    if(k==='stats'){out[k]={...r};for(const n of Object.keys(l||{}))out[k][n]=Math.max(l[n]||0,r[n]||0);continue;}
    if(!economy.includes(k))conflicts.push(k);
  }
  return {save:out,conflicts:[...new Set(conflicts)]};
}
return {merge,economy};
});
