/* Room-scoped WebRTC transport. NAS supplies authenticated signalling and fallback.
 * State snapshots are replaceable; event batches are acknowledged, ordered and
 * retried over NAS on path failure. No TURN credentials or account/save payloads. */
(function(factory){if(typeof module==='object'&&module.exports)module.exports=factory();else G.DirectLink=factory();})(()=>{
  function create({signal,relay,deliver,sent=()=>{},changed=()=>{},Peer=globalThis.RTCPeerConnection,
    iceServers=[{urls:'stun:stun.cloudflare.com:3478'},{urls:'stun:stun.l.google.com:19302'}],now=()=>performance.now()}={}){
    const links=new Map();let room='',self='',host='';
    function discard(p){clearTimeout(p.timer);const pc=p.pc;p.pc=null;p.dc=null;if(pc){pc.onconnectionstatechange=null;pc.ondatachannel=null;pc.onicecandidate=null;pc.close();}}
    function reset(){for(const p of links.values())discard(p);links.clear();room='';}
    function row(uid){let p=links.get(uid);if(!p){p={uid,pc:null,dc:null,attempt:'',candidates:[],retryAt:0,stateSeq:0,lastState:0,eventSeq:0,lastEvent:0,pending:new Map(),incoming:new Map()};links.set(uid,p);}return p;}
    function fallback(p){if(links.get(p.uid)!==p)return;discard(p);p.retryAt=now()+15000;changed(p.uid,'relay');for(const e of p.pending.values()){relay(p.uid,e.packet);e.at=now();}}
    function wire(p,packet,direct=true){if(direct&&p.dc?.readyState==='open'&&p.dc.bufferedAmount<65536){try{p.dc.send(JSON.stringify(packet));if(packet.lane==='state')sent(p.uid);return true;}catch{fallback(p);}}return relay(p.uid,packet);}
    function receive(uid,packet){const p=links.get(uid);if(!p||packet?.k!=='rtc-wire'||packet.room!==room)return;
      if(packet.lane==='ack'){p.pending.delete(packet.seq);return;}
      if(!Number.isSafeInteger(packet.seq)||packet.seq<1||!packet.data||packet.data.k!=='f')return;
      if(packet.lane==='state'){if(packet.seq<=p.lastState)return;p.lastState=packet.seq;deliver(uid,packet.data);return;}
      if(packet.lane!=='event'||!Array.isArray(packet.data.ev)||packet.seq>p.lastEvent+256)return;
      if(packet.seq>p.lastEvent)p.incoming.set(packet.seq,packet.data);
      // Acknowledging receipt (including duplicates) makes failover exactly once.
      wire(p,{k:'rtc-wire',room,lane:'ack',seq:packet.seq});
      while(p.incoming.has(p.lastEvent+1)){const data=p.incoming.get(++p.lastEvent);p.incoming.delete(p.lastEvent);deliver(uid,data);}
    }
    function channel(p,dc){p.dc=dc;dc.onopen=()=>{if(links.get(p.uid)!==p||p.dc!==dc)return;clearTimeout(p.timer);changed(p.uid,'direct');};
      dc.onmessage=e=>{if(p.dc!==dc||links.get(p.uid)!==p)return;try{receive(p.uid,JSON.parse(e.data));}catch{}};
      dc.onclose=()=>{if(p.dc===dc)fallback(p);};dc.onerror=()=>{if(p.dc===dc)fallback(p);};}
    function setup(p,attempt){discard(p);p.attempt=attempt;p.candidates=[];const pc=p.pc=new Peer({iceServers});
      pc.onicecandidate=e=>{if(p.pc===pc&&e.candidate)signal(p.uid,{attempt,kind:'candidate',candidate:e.candidate.toJSON()});};
      pc.ondatachannel=e=>{if(p.pc===pc&&e.channel.label==='game')channel(p,e.channel);else e.channel.close();};
      pc.onconnectionstatechange=()=>{if(p.pc===pc&&['failed','disconnected','closed'].includes(pc.connectionState))fallback(p);};
      p.timer=setTimeout(()=>{if(p.pc===pc&&p.dc?.readyState!=='open')fallback(p);},9000);return pc;}
    async function offer(p){if(!Peer||p.pc||now()<p.retryAt||self!==host)return;
      const attempt=[...crypto.getRandomValues(new Uint8Array(16))].map(n=>n.toString(16).padStart(2,'0')).join('');try{const pc=setup(p,attempt);channel(p,pc.createDataChannel('game',{ordered:true}));await pc.setLocalDescription(await pc.createOffer());if(p.pc===pc)signal(p.uid,{attempt,kind:'offer',sdp:pc.localDescription.sdp});}catch{if(p.attempt===attempt)fallback(p);}}
    async function accept(uid,s){const p=links.get(uid);if(!p||!Peer)return;
      try{if(s.kind==='offer'){if(uid!==host||self===host)return;if(p.attempt===s.attempt&&p.pc)return;const pc=setup(p,s.attempt);await pc.setRemoteDescription({type:'offer',sdp:s.sdp});await pc.setLocalDescription(await pc.createAnswer());if(p.pc===pc)signal(uid,{attempt:s.attempt,kind:'answer',sdp:pc.localDescription.sdp});}
        else if(s.attempt===p.attempt&&p.pc){const pc=p.pc;if(s.kind==='answer'&&self===host){await pc.setRemoteDescription({type:'answer',sdp:s.sdp});for(const c of p.candidates.splice(0))await pc.addIceCandidate(c);}else if(s.kind==='candidate'){if(pc.remoteDescription)await pc.addIceCandidate(s.candidate);else if(p.candidates.length<64)p.candidates.push(s.candidate);}}
      }catch{if(p.attempt===s.attempt)fallback(p);}}
    function sync(id,uid,hostUid,members){if(room!==id||self!==uid||host!==hostUid){reset();room=id||'';self=uid;host=hostUid;}if(!room)return;
      const wanted=new Set(members.filter(m=>m.uid!==self&&(self===host||m.uid===host)).map(m=>m.uid));
      for(const[u,p]of links)if(!wanted.has(u)){discard(p);links.delete(u);}
      for(const u of wanted){const p=row(u),online=members.find(m=>m.uid===u).connected!==false;p.online=online;if(!online&&p.pc)fallback(p);if(online)offer(p);}}
    function send(uid,data){const p=links.get(uid);if(!p||data.k!=='f')return relay(uid,data);if(p.overflow)return false;
      if(data.ev?.length){if(p.pending.size>=256){p.overflow=true;changed(uid,'overflow');return false;}const packet={k:'rtc-wire',room,lane:'event',seq:++p.eventSeq,data:{k:'f',ev:data.ev}};p.pending.set(packet.seq,{packet,at:now()});wire(p,packet);}
      const snapshot={...data,ev:[]};return wire(p,{k:'rtc-wire',room,lane:'state',seq:++p.stateSeq,data:snapshot});}
    function tick(){for(const p of links.values()){for(const e of p.pending.values())if(now()-e.at>=800){relay(p.uid,e.packet);e.at=now();}if(p.online)offer(p);}}
    return {sync,send,receive,signal:accept,tick,reset,mode:uid=>links.get(uid)?.dc?.readyState==='open'?'direct':'relay',
      stats:()=>({directPeers:[...links.values()].filter(p=>p.dc?.readyState==='open').length,relayPeers:[...links.values()].filter(p=>p.dc?.readyState!=='open').length,pendingEvents:[...links.values()].reduce((n,p)=>n+p.pending.size,0)})};
  }
  return {create};
});
