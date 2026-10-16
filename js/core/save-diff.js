/* Pure comparison for the conflict UI; never sums wallets or claims. */
(function(factory){if(typeof module==='object'&&module.exports)module.exports=factory();else G.SaveDiff=factory();})(()=>{
  const count=v=>Object.keys(v||{}).length;
  function summary(s,rev){return {rev,updated:Number.isFinite(s?.updated)?s.updated:null,coins:s?.coins||0,t1:s?.tickets?.t1||0,t10:s?.tickets?.t10||0,owned:count(s?.owned),shiny:count(s?.shiny),upgrades:Object.values(s?.pupg||{}).reduce((n,v)=>n+Object.values(v||{}).reduce((a,b)=>a+(Number(b)||0),0),0)};}
  function compare(a,b){const keys=new Set([...Object.keys(a||{}),...Object.keys(b||{})]);return [...keys].filter(k=>JSON.stringify(a?.[k])!==JSON.stringify(b?.[k]));}
  function discoveries(a,b){const out={};for(const k of ['owned','shiny','legends','arenas','itemsFound'])out[k]=Object.keys(b?.[k]||{}).filter(id=>!Object.hasOwn(a?.[k]||{},id));return out;}
  return {summary,compare,discoveries};
});
