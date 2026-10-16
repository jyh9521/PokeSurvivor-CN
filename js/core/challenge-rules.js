/* Versioned UTC schedules shared by the browser and NAS. No account state. */
(function(factory){if(typeof module==='object'&&module.exports)module.exports=factory();else G.ChallengeRules=factory();})(()=>{
  const VERSION=1,DAY=86400000;
  function hash(text){let h=2166136261;for(const c of text)h=Math.imul(h^c.charCodeAt(0),16777619);return h>>>0;}
  function current(period='d',at=Date.now()){
    if(!['d','w'].includes(period))throw Error('Invalid challenge period');
    const d=new Date(at);let start=Date.UTC(d.getUTCFullYear(),d.getUTCMonth(),d.getUTCDate());if(period==='w')start-=((d.getUTCDay()+6)%7)*DAY;
    const id=`v${VERSION}-${period}-${new Date(start).toISOString().slice(0,10)}`,seed=hash(id),starters=[1,4,7,25,133,152,155,158];
    return {id,version:VERSION,period,start,end:start+(period==='w'?7:1)*DAY,seed,dex:starters[seed%starters.length],biome:seed%3,maxSeconds:1800,upgrades:false,rewards:false};
  }
  function random(seed){let n=seed>>>0;return ()=>{n+=0x6D2B79F5;let t=n;t=Math.imul(t^(t>>>15),t|1);t^=t+Math.imul(t^(t>>>7),t|61);return ((t^(t>>>14))>>>0)/4294967296;};}
  return {VERSION,current,random,capacity:r=>r?.experiment===true?8:4,packetBudget:r=>r?.experiment===true?480:300};
});
