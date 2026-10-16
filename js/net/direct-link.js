/* Room-scoped WebRTC transport. NAS supplies authenticated signalling and fallback.
 * State snapshots are replaceable; event batches are acknowledged, ordered and
 * retried over NAS on path failure. No TURN credentials or account/save payloads. */
(function(factory){if(typeof module==='object'&&module.exports)module.exports=factory();else G.DirectLink=factory();})(()=>{
  function create({signal,relay,deliver,sent=()=>{},changed=()=>{},Peer,
    batchAcks=()=>false,iceServers=[{urls:'stun:stun.cloudflare.com:3478'},{urls:'stun:stun.l.google.com:19302'}],now=()=>performance.now()}={}){
    const links=new Map();let room='',self='',host='';
    const peerType=()=>Peer===undefined?(globalThis.RTCPeerConnection||globalThis.mozRTCPeerConnection||globalThis.webkitRTCPeerConnection):Peer;
    function flushAck(p){if(links.get(p.uid)!==p||!p.ackDue||p.lastEvent<1)return;wire(p,{k:'rtc-wire',room,lane:'ack',seq:p.lastEvent,cumulative:true});p.ackDue=false;}
    function scheduleAck(p){p.ackDue=true;if(p.ackScheduled)return;p.ackScheduled=true;Promise.resolve().then(()=>{p.ackScheduled=false;flushAck(p);});}
    function discard(p){clearTimeout(p.timer);const pc=p.pc;p.pc=null;p.dc=null;if(pc){pc.onconnectionstatechange=null;pc.ondatachannel=null;pc.onicecandidate=null;pc.close();}}
    function reset(){for(const p of links.values())discard(p);links.clear();room='';}
    function row(uid){let p=links.get(uid);if(!p){p={uid,pc:null,dc:null,attempt:'',candidates:[],retryAt:0,stateSeq:0,lastState:0,eventSeq:0,lastEvent:0,pending:new Map(),incoming:new Map()};links.set(uid,p);}return p;}
    function fallback(p,reason='channel-closed'){p.gameMode='relay';p.reason=reason;if(links.get(p.uid)!==p)return;discard(p);p.retryAt=now()+15000;changed(p.uid,'relay');for(const e of p.pending.values()){relay(p.uid,e.packet);e.at=now();}}
    function wire(p,packet,direct=true){if(direct&&p.dc?.readyState==='open'&&p.dc.bufferedAmount<65536){try{p.dc.send(JSON.stringify(packet));if(packet.lane==='state'){p.gameMode='direct';sent(p.uid);}return true;}catch{fallback(p);}}if(packet.lane==='state')p.gameMode='relay';return relay(p.uid,packet);}
    function receive(uid,packet){const p=links.get(uid);if(!p||packet?.k!=='rtc-wire'||packet.room!==room)return;
      if(packet.lane==='ack'){if(!Number.isSafeInteger(packet.seq)||packet.seq<1||packet.seq>p.eventSeq)return;const covered=[...p.pending].filter(([seq])=>packet.cumulative===true?seq<=packet.seq:seq===packet.seq);for(const[seq,event]of covered){if(!event.retries)p.ackRttMs=Math.max(1,now()-event.firstAt);p.pending.delete(seq);}return;}
      if(!Number.isSafeInteger(packet.seq)||packet.seq<1||!packet.data||packet.data.k!=='f')return;
      if(packet.lane==='state'){if(packet.seq<=p.lastState)return;p.lastState=packet.seq;deliver(uid,packet.data);return;}
      if(packet.lane!=='event'||!Array.isArray(packet.data.ev)||packet.seq>p.lastEvent+256)return;
      if(packet.seq>p.lastEvent)p.incoming.set(packet.seq,packet.data);
      // Acknowledging receipt (including duplicates) makes failover exactly once.
      if(batchAcks()){scheduleAck(p);}else wire(p,{k:'rtc-wire',room,lane:'ack',seq:packet.seq});
      while(p.incoming.has(p.lastEvent+1)){const data=p.incoming.get(++p.lastEvent);p.incoming.delete(p.lastEvent);deliver(uid,data);}
    }
    function channel(p,dc){p.dc=dc;dc.onopen=()=>{if(links.get(p.uid)!==p||p.dc!==dc)return;clearTimeout(p.timer);p.gameMode='direct';p.reason='connected';changed(p.uid,'direct');};
      dc.onmessage=e=>{if(p.dc!==dc||links.get(p.uid)!==p)return;try{receive(p.uid,JSON.parse(e.data));}catch{}};
      dc.onclose=()=>{if(p.dc===dc)fallback(p);};dc.onerror=()=>{if(p.dc===dc)fallback(p);};}
    function setup(p,attempt){discard(p);p.attempts=(p.attempts||0)+1;p.reason='connecting';p.path=null;p.attempt=attempt;p.candidates=[];let pc;try{pc=p.pc=new (peerType())({iceServers});p.error=null;}catch(e){p.error=['SecurityError','NotAllowedError','NotSupportedError','TypeError'].includes(e.name)?e.name:'Error';throw e;}
      pc.onicecandidate=e=>{if(p.pc===pc&&e.candidate)signal(p.uid,{attempt,kind:'candidate',candidate:e.candidate.toJSON()});};
      pc.ondatachannel=e=>{if(p.pc===pc&&e.channel.label==='game')channel(p,e.channel);else e.channel.close();};
      pc.onconnectionstatechange=()=>{if(p.pc===pc&&['failed','disconnected','closed'].includes(pc.connectionState))fallback(p,'connection-'+pc.connectionState);};
      p.timer=setTimeout(()=>{if(p.pc===pc&&p.dc?.readyState!=='open')fallback(p,'timeout');},9000);return pc;}
    async function offer(p){if(!peerType()||p.pc||now()<p.retryAt||self!==host)return;
      const attempt=[...crypto.getRandomValues(new Uint8Array(16))].map(n=>n.toString(16).padStart(2,'0')).join('');try{const pc=setup(p,attempt);channel(p,pc.createDataChannel('game',{ordered:true}));await pc.setLocalDescription(await pc.createOffer());if(p.pc===pc)signal(p.uid,{attempt,kind:'offer',sdp:pc.localDescription.sdp});}catch{if(p.attempt===attempt)fallback(p,'offer-error');}}
    async function accept(uid,s){const p=links.get(uid);if(!p||!peerType())return;
      try{if(s.kind==='offer'){if(uid!==host||self===host)return;if(p.attempt===s.attempt&&p.pc)return;const pc=setup(p,s.attempt);await pc.setRemoteDescription({type:'offer',sdp:s.sdp});await pc.setLocalDescription(await pc.createAnswer());if(p.pc===pc)signal(uid,{attempt:s.attempt,kind:'answer',sdp:pc.localDescription.sdp});}
        else if(s.attempt===p.attempt&&p.pc){const pc=p.pc;if(s.kind==='answer'&&self===host){await pc.setRemoteDescription({type:'answer',sdp:s.sdp});for(const c of p.candidates.splice(0))await pc.addIceCandidate(c);}else if(s.kind==='candidate'){if(pc.remoteDescription)await pc.addIceCandidate(s.candidate);else if(p.candidates.length<64)p.candidates.push(s.candidate);}}
      }catch{if(p.attempt===s.attempt)fallback(p,'signal-error');}}
    function sync(id,uid,hostUid,members){if(room!==id||self!==uid||host!==hostUid){reset();room=id||'';self=uid;host=hostUid;}if(!room)return;
      const wanted=new Set(members.filter(m=>m.uid!==self&&(self===host||m.uid===host)).map(m=>m.uid));
      for(const[u,p]of links)if(!wanted.has(u)){discard(p);links.delete(u);}
      for(const u of wanted){const p=row(u),online=members.find(m=>m.uid===u).connected!==false;p.online=online;if(!online&&p.pc)fallback(p);if(online)offer(p);}}
    function send(uid,data){const p=links.get(uid);if(!p||data.k!=='f')return relay(uid,data);if(p.overflow)return false;
      if(data.ev?.length){if(p.pending.size>=256){p.overflow=true;changed(uid,'overflow');return false;}const packet={k:'rtc-wire',room,lane:'event',seq:++p.eventSeq,data:{k:'f',ev:data.ev}};p.pending.set(packet.seq,{packet,at:now(),firstAt:now()});wire(p,packet);}
      const snapshot={...data,ev:[]};return wire(p,{k:'rtc-wire',room,lane:'state',seq:++p.stateSeq,data:snapshot});}
    async function inspect(p){const pc=p.pc;if(!pc||p.inspecting||now()<(p.inspectAt||0))return;p.inspecting=true;p.inspectAt=now()+2000;
      try{const values=await pc.getStats();if(p.pc!==pc)return;let pair;values.forEach(s=>{if(s.type==='transport'&&s.selectedCandidatePairId)pair=values.get(s.selectedCandidatePairId);});if(!pair)values.forEach(s=>{if(s.type==='candidate-pair'&&s.state==='succeeded'&&s.nominated)pair=s;});
        if(pair){const local=values.get(pair.localCandidateId),remote=values.get(pair.remoteCandidateId);p.path={rttMs:Number.isFinite(pair.currentRoundTripTime)?Math.round(pair.currentRoundTripTime*1000):null,localType:local?.candidateType||'unknown',remoteType:remote?.candidateType||'unknown',protocol:local?.protocol||'unknown'};}
      }catch{}finally{p.inspecting=false;}}
    function tick(){for(const p of links.values()){flushAck(p);inspect(p);let retried=0;const retryAfter=Math.min(4000,Math.max(800,(p.ackRttMs||0)*2+100));for(const e of p.pending.values())if(retried<4&&now()-e.at>=retryAfter){relay(p.uid,e.packet);e.at=now();e.retries=(e.retries||0)+1;retried++;}if(p.online)offer(p);}}
    const pressure=uid=>{const p=links.get(uid);return {bufferedBytes:p?.dc?.bufferedAmount||0,pendingEvents:p?.pending.size||0,incomingEvents:p?.incoming.size||0,ackRttMs:p?.ackRttMs||null,oldestEventMs:p?.pending.size?Math.max(0,now()-Math.min(...[...p.pending.values()].map(e=>e.firstAt??e.at))):0};};
    return {pressure,sync,send,receive,signal:accept,tick,reset,mode:uid=>links.get(uid)?.dc?.readyState==='open'&&links.get(uid)?.gameMode!=='relay'?'direct':'relay',
      stats:()=>({webrtcAvailable:typeof peerType()==='function',secureContext:globalThis.isSecureContext===true,rtcApi:typeof peerType()==='function'?'available':'missing',directBufferedBytes:Math.max(0,...[...links.keys()].map(uid=>pressure(uid).bufferedBytes)),oldestEventMs:Math.max(0,...[...links.keys()].map(uid=>pressure(uid).oldestEventMs)),peerLinks:[...links.values()].map(p=>({mode:p.dc?.readyState==='open'&&p.gameMode!=='relay'?'direct':'relay',connection:p.pc?.connectionState||'closed',ice:p.pc?.iceConnectionState||'closed',reason:p.reason||(!peerType()?'unavailable':'waiting'),attempts:p.attempts||0,incomingEvents:p.incoming.size,ackRttMs:p.ackRttMs||null,error:p.error||null,path:p.dc?.readyState==='open'&&p.gameMode!=='relay'?p.path||null:null})),directPeers:[...links.values()].filter(p=>p.dc?.readyState==='open'&&p.gameMode!=='relay').length,relayPeers:[...links.values()].filter(p=>p.dc?.readyState!=='open'||p.gameMode==='relay').length,pendingEvents:[...links.values()].reduce((n,p)=>n+p.pending.size,0)})};
  }
  return {create};
});
