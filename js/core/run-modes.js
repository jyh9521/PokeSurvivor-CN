/* Run-only save overlay. Challenges/experiments never mutate a persistent wallet. */
G.RunModes=(()=>{
  const db=G.DB;let pending=null,active=null,temporary=null;
  G.DB=new Proxy(db,{get(target,key){
    if(!temporary)return Reflect.get(target,key);
    if(key==='save')return temporary;
    if(key==='commit'||key==='flush')return ()=>true;
    if(key==='owns')return dex=>!!temporary.owned[dex];
    if(key==='ownsShiny')return dex=>!!temporary.shiny[dex];
    if(key==='upgradesOf')return dex=>temporary.pupg[dex]||(temporary.pupg[dex]={});
    if(key==='grant')return (dex,from)=>{temporary.owned[dex]||={at:Date.now(),from};};
    if(key==='grantShiny')return (dex,from)=>{const fresh=!temporary.shiny[dex];temporary.owned[dex]||={at:Date.now(),from};temporary.shiny[dex]={at:Date.now(),from};return fresh;};
    return Reflect.get(target,key);
  }});
  function activate(coop){
    if(coop)pending=null;
    if(!pending&&!coop?.experiment)return;
    G.Progress?.resetNotices();
    active=pending?{kind:'challenge',...pending}:{kind:'experiment'};pending=null;
    temporary=structuredClone(db.save);temporary.coins=0;temporary.tickets={t1:0,t10:0};temporary.pupg={};temporary.pspent={};temporary.pbind={};temporary.pban={};temporary.pity={};temporary.missions={};
    if(active.kind==='challenge'){temporary.partner=active.dex;temporary.partnerShiny=false;temporary.owned={[active.dex]:{}};temporary.shiny={};}
  }
  function end(){G.Progress?.resetNotices();temporary=null;active=null;pending=null;}
  return {configure:value=>{pending=value;},activate,end,get pending(){return pending;},get active(){return active;}};
})();
