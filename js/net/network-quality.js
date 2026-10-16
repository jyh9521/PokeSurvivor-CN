/* Identifier-free quality classification and hysteretic per-peer snapshot pacing. */
(function(factory){if(typeof module==='object'&&module.exports)module.exports=factory();else G.NetworkQuality=factory();})(()=>{
  // Account transport and gameplay transport have different lifetimes.
  function session(m,room,uid){const multiplayer=!!room?.members?.some(p=>p.uid!==uid);return multiplayer?{...m,multiplayer:true}:{...m,multiplayer:false,p2pOnly:false,directPeers:0,turnPeers:0,relayPeers:0,connectedPeers:0,connectingPeers:0,reconnectingPeers:0,peerRttMs:null,peerLinks:[]};}
  function describe(m){
    const paths=(m.peerLinks||[]).filter(p=>['direct','turn'].includes(p.mode)).map(p=>p.path?.rttMs).filter(Number.isFinite);
    const transport=m.multiplayer===false?'nas':m.turnPeers?(m.directPeers?'mixed':'turn'):m.p2pOnly&&!m.directPeers?((m.peerLinks||[]).some(p=>p.mode==='failed')?'failed':'connecting'):m.directPeers?(m.relayPeers?'mixed':'direct'):'relay';
    const rtt=['failed','connecting'].includes(transport)?null:['direct','turn','mixed'].includes(transport)?(paths.length?Math.max(...paths):null):m.peerRttMs??m.nasRttMs??null;
    const reason=['failed','connecting'].includes(transport)?'reconnecting':!m.connected&&!['direct','turn','mixed'].includes(transport)?'offline':m.reconnectingPeers?'reconnecting':Math.max(m.bufferedBytes||0,m.serverBufferedBytes||0,m.directBufferedBytes||0)>=32768||m.oldestEventMs>=1600?'queue':m.fps!=null&&m.fps<35&&!m.background?'fps':rtt!=null&&rtt>=250?'latency':'stable';
    return {transport,rttMs:rtt,reason,level:['offline','reconnecting'].includes(reason)?'offline':reason==='stable'?'good':'fair'};
  }
  function create({now=()=>performance.now()}={}){
    const peers=new Map();
    function interval(uid,m={},cap=15){
      let p=peers.get(uid);if(!p){p={hz:cap,goodAt:now()};peers.set(uid,p);}
      const bytes=Math.max(m.bufferedBytes||0,m.serverBufferedBytes||0),age=m.oldestEventMs||0;
      const target=Math.min(cap,bytes>=65536||age>=2400||m.pendingEvents>=32?5:bytes>=32768||age>=1200||m.pendingEvents>=12?10:cap);
      if(target<p.hz){p.hz=target;p.goodAt=now();}else if(target>p.hz){if(now()-p.goodAt>=3000){p.hz=Math.min(target,p.hz+5);p.goodAt=now();}}else p.goodAt=now();
      p.hz=Math.min(p.hz,cap);return 1/p.hz;
    }
    return {interval,clear:()=>peers.clear()};
  }
  return {create,describe,session};
});
