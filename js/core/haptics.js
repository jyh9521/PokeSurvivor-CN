/* Native actuator adapter; completion means API completion, not measured motors. */
(function(factory){if(typeof module==='object'&&module.exports)module.exports=factory;else G.Haptics=factory();})(()=>{
  let serial=0,last={code:'idle',route:''},running=[];
  const actuators=pad=>{try{return [...new Set([pad?.vibrationActuator,...Array.from(pad?.hapticActuators||[])].filter(Boolean))];}catch{return [];}};
  const supported=pad=>actuators(pad).some(a=>{try{return typeof a.playEffect==='function'||typeof a.pulse==='function';}catch{return false;}});
  function stop(){serial++;for(const a of running){try{Promise.resolve(a.reset?a.reset():a.pulse?.(0,0)).catch(()=>{});}catch{}}running=[];last={code:'idle',route:''};}
  async function play(pad,strength,duration){
    const token=++serial;
    if(!pad?.connected){last={code:'no-pad',route:''};return false;}
    const list=actuators(pad);if(!supported(pad)){last={code:'unsupported',route:''};return false;}
    strength=Math.max(0,Math.min(1,Number(strength)||0));duration=Math.max(0,Math.min(500,Number(duration)||0));
    last={code:'playing',route:''};running=list;
    for(const a of list)for(const route of ['dual-rumble','pulse']){
      if(token!==serial||!pad.connected)return false;
      try{
        if(route==='dual-rumble'&&(typeof a.playEffect!=='function'||a.effects?.length&&!Array.from(a.effects).includes('dual-rumble')))continue;
        if(route==='pulse'&&typeof a.pulse!=='function')continue;
        const result=await (route==='pulse'?a.pulse(strength,duration):a.playEffect(route,{startDelay:0,duration,strongMagnitude:strength,weakMagnitude:strength*.7}));
        if(token!==serial)return false;
        if(result==='preempted'){last={code:'preempted',route};return false;}
        if(result===false)continue;
        last={code:'complete',route};return true;
      }catch{if(token!==serial)return false;}
    }
    if(token===serial)last={code:'error',route:''};return false;
  }
  return {play,stop,supported,get status(){return {...last};}};
});
