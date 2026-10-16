/* Room-scoped WebRTC transport. NAS supplies authenticated room signalling. Gameplay uses WebRTC only: direct first, independent TURN on failure.
 * State snapshots are replaceable; event batches are acknowledged, ordered and
 * retried on the reliable RTC lane; snapshots use an unordered lossy lane. Only short-lived TURN credentials enter the RTC configuration; never exported in diagnostics. */
(function(factory){if(typeof module==='object'&&module.exports)module.exports=factory();else G.DirectLink=factory();})(()=>{
  function create({signal,relay,deliver,sent=()=>{},changed=()=>{},Peer,
    getTurn=null,directTimeoutMs=6000,turnTimeoutMs=12000,p2pOnly=false,batchAcks=()=>false,iceServers=[{urls:'stun:stun.cloudflare.com:3478'},{urls:'stun:stun.l.google.com:19302'}],now=()=>performance.now()}={}){
    const links=new Map();let room='',self='',host='',prepared='';
    const ready=p=>p?.dc?.readyState==='open'&&(!p2pOnly||p.stateDc?.readyState==='open');
    const routeOf=p=>ready(p)?(p.path?.localType==='relay'||p.path?.remoteType==='relay'||p.stage==='turn'?'turn':'direct'):p?.phase||'connecting';
    const modeOf=p=>ready(p)?'direct':p?.terminal?'failed':p2pOnly?(!peerType()||p?.reason&&/error|timeout|failed|closed/.test(p.reason)?'failed':'connecting'):'relay';
    const peerType=()=>Peer===undefined?(globalThis.RTCPeerConnection||globalThis.mozRTCPeerConnection||globalThis.webkitRTCPeerConnection):Peer;
    function flushAck(p){if(links.get(p.uid)!==p||!p.ackDue||p.lastEvent<1)return;wire(p,{k:'rtc-wire',room,lane:'ack',seq:p.lastEvent,cumulative:true});p.ackDue=false;}
    function scheduleAck(p){p.ackDue=true;if(p.ackScheduled)return;p.ackScheduled=true;Promise.resolve().then(()=>{p.ackScheduled=false;flushAck(p);});}
    function discard(p){clearTimeout(p.timer);clearTimeout(p.disconnectTimer);const pc=p.pc;p.pc=null;p.dc=null;p.stateDc=null;if(pc){pc.onconnectionstatechange=null;pc.ondatachannel=null;pc.onicecandidate=null;pc.close();}}
    function reset(){for(const p of links.values())discard(p);links.clear();room='';}
    function row(uid){let p=links.get(uid);if(!p){p={uid,pc:null,dc:null,attempt:'',candidates:[],retryAt:0,stateSeq:0,lastState:0,eventSeq:0,lastEvent:0,pending:new Map(),incoming:new Map(),early:new Map(),stage:'direct',phase:'direct-connecting',generation:0,startedAt:now(),deadline:now()+26000};links.set(uid,p);}return p;}
    function failed(p,reason){if(links.get(p.uid)!==p)return;discard(p);p.phase='failed';p.terminal=true;p.reason=reason;p.retryAt=Infinity;changed(p.uid,'reconnecting');}
    async function turn(p){if(links.get(p.uid)!==p||p.terminal||p.phase==='turn-credentials')return;
      discard(p);p.phase='turn-credentials';p.reason='turn-credentials';const generation=++p.generation;changed(p.uid,'reconnecting');
      try{const cfg=await getTurn({room,peer:p.uid});if(links.get(p.uid)!==p||generation!==p.generation)return;
        if(!Array.isArray(cfg?.iceServers)||!cfg.iceServers.length||!Number.isFinite(cfg.expiresAt)||cfg.expiresAt<Date.now()+60000)throw {code:'turn-provider-unavailable'};
        p.turnConfig=cfg;p.stage='turn';p.phase='turn-connecting';p.retryAt=0;offer(p);
      }catch(e){if(links.get(p.uid)===p&&generation===p.generation)failed(p,['turn-not-configured','turn-budget-exhausted','turn-usage-unavailable'].includes(e.code)?e.code:'turn-provider-unavailable');}
    }
    function fallback(p,reason='channel-closed'){if(links.get(p.uid)!==p)return;
      if(getTurn){if(p.stage==='turn')return failed(p,'turn-connect-failed');if(self===p.initiator)return turn(p);p.phase='waiting-turn';p.reason='waiting-turn';changed(p.uid,'reconnecting');return;}
      p.gameMode=p2pOnly?'connecting':'relay';p.reason=reason;discard(p);p.retryAt=now()+15000;changed(p.uid,p2pOnly?'reconnecting':'relay');if(!p2pOnly)for(const e of p.pending.values()){relay(p.uid,e.packet);e.at=now();}
    }
    function retry(uid){for(const p of links.values()){if(uid&&p.uid!==uid||now()-(p.retryClickedAt??-Infinity)<3000)continue;p.retryClickedAt=now();p.generation++;discard(p);p.terminal=false;p.stage='direct';p.phase='direct-connecting';p.reason='connecting';p.turnConfig=null;p.retryAt=0;p.deadline=now()+26000;
      if(self===p.initiator)offer(p);else signal(p.uid,{kind:'retry',attempt:p.attempt||'retry'});}}
    function wire(p,packet,direct=true){const dc=packet.lane==='state'?(p2pOnly?p.stateDc:p.stateDc||p.dc):p.dc;
      if(direct&&dc?.readyState==='open'&&dc.bufferedAmount<65536){try{dc.send(JSON.stringify(packet));if(packet.lane==='state'){p.gameMode='direct';sent(p.uid);}return true;}catch{fallback(p,'send-error');}}
      // Replaceable snapshots are dropped under pressure, never queued behind events.
      if(p2pOnly)return false;if(packet.lane==='state')p.gameMode='relay';return relay(p.uid,packet);
    }
    function receive(uid,packet){const p=links.get(uid);if(!p||packet?.k!=='rtc-wire'||packet.room!==room)return;
      if(packet.lane==='ack'){if(!Number.isSafeInteger(packet.seq)||packet.seq<1||packet.seq>p.eventSeq)return;const covered=[...p.pending].filter(([seq])=>packet.cumulative===true?seq<=packet.seq:seq===packet.seq);for(const[seq,event]of covered){if(!event.retries)p.ackRttMs=Math.max(1,now()-event.firstAt);p.pending.delete(seq);}return;}
      if(packet.lane==='control'){if(packet.data&&typeof packet.data.k==='string'&&packet.data.k!=='f')deliver(uid,packet.data);return;}
      if(!Number.isSafeInteger(packet.seq)||packet.seq<1||!packet.data||packet.data.k!=='f')return;
      if(packet.lane==='state'){if(packet.seq<=p.lastState)return;p.lastState=packet.seq;deliver(uid,packet.data);return;}
      if(packet.lane!=='event'||!Array.isArray(packet.data.ev)||packet.seq>p.lastEvent+256)return;
      if(packet.seq>p.lastEvent)p.incoming.set(packet.seq,packet.data);
      // Acknowledging receipt (including duplicates) makes failover exactly once.
      if(batchAcks()){scheduleAck(p);}else wire(p,{k:'rtc-wire',room,lane:'ack',seq:packet.seq});
      while(p.incoming.has(p.lastEvent+1)){const data=p.incoming.get(++p.lastEvent);p.incoming.delete(p.lastEvent);deliver(uid,data);}
    }
    function channel(p,dc){const key=dc.label==='state'?'stateDc':'dc';p[key]=dc;
      dc.onopen=()=>{if(links.get(p.uid)!==p||p[key]!==dc)return;if(p.dc?.readyState!=='open'||p2pOnly&&p.stateDc?.readyState!=='open')return;clearTimeout(p.timer);p.gameMode='direct';p.phase='connected';p.terminal=false;p.deadline=0;p.reason='connected';inspect(p);changed(p.uid,'direct');};
      dc.onmessage=e=>{if(p[key]!==dc||links.get(p.uid)!==p)return;try{receive(p.uid,JSON.parse(e.data));}catch{}};
      dc.onclose=()=>{if(p[key]===dc)fallback(p);};dc.onerror=()=>{if(p[key]===dc)fallback(p);};}
    function setup(p,attempt,stage='direct'){discard(p);p.stage=stage;p.phase=stage+'-connecting';p.startedAt=now();p.attempts=(p.attempts||0)+1;p.reason='connecting';p.path=null;p.attempt=attempt;p.candidates=p.early.get(attempt)||[];p.early.clear();let pc;try{pc=p.pc=new (peerType())({iceServers:stage==='turn'?p.turnConfig.iceServers:iceServers,iceTransportPolicy:stage==='turn'?'relay':'all'});p.error=null;}catch(e){p.error=['SecurityError','NotAllowedError','NotSupportedError','TypeError'].includes(e.name)?e.name:'Error';throw e;}
      pc.onicecandidate=e=>{if(p.pc===pc&&e.candidate)signal(p.uid,{attempt,kind:'candidate',candidate:e.candidate.toJSON()});};
      pc.ondatachannel=e=>{if(p.pc===pc&&['game','state'].includes(e.channel.label))channel(p,e.channel);else e.channel.close();};
      pc.onconnectionstatechange=()=>{if(p.pc!==pc)return;clearTimeout(p.disconnectTimer);if(pc.connectionState==='disconnected')p.disconnectTimer=setTimeout(()=>{if(p.pc===pc&&pc.connectionState==='disconnected')fallback(p,'connection-disconnected');},5000);else if(['failed','closed'].includes(pc.connectionState))fallback(p,'connection-'+pc.connectionState);};
      p.timer=setTimeout(()=>{if(p.pc===pc&&!ready(p))fallback(p,'timeout');},getTurn?(stage==='turn'?turnTimeoutMs:directTimeoutMs):20000);return pc;}
    async function offer(p){if(!peerType()||p.pc||p.terminal||p.phase==='turn-credentials'||now()<p.retryAt||self!==p.initiator)return;
      const attempt=[...crypto.getRandomValues(new Uint8Array(16))].map(n=>n.toString(16).padStart(2,'0')).join('');try{const pc=setup(p,attempt,p.stage);channel(p,pc.createDataChannel('game',{ordered:true}));channel(p,pc.createDataChannel('state',{ordered:false,maxRetransmits:0}));await pc.setLocalDescription(await pc.createOffer());if(p.pc===pc)signal(p.uid,{attempt,kind:'offer',transport:p.stage,sdp:pc.localDescription.sdp});}catch{if(p.attempt===attempt)fallback(p,'offer-error');}}
    async function accept(uid,s){const p=links.get(uid);if(!p||!peerType())return;
      try{if(s.kind==='retry'){if(self===p.initiator)retry(uid);return;}if(s.kind==='candidate'&&(s.attempt!==p.attempt||!p.pc)){if(p.early.size>=2&&!p.early.has(s.attempt))p.early.delete(p.early.keys().next().value);const q=p.early.get(s.attempt)||[];if(q.length<64)q.push(s.candidate);p.early.set(s.attempt,q);return;}if(s.kind==='offer'){if(uid!==p.initiator||self===p.initiator)return;if(p.attempt===s.attempt&&p.pc)return;p.deadline=now()+26000;p.terminal=false;const stage=s.transport==='turn'?'turn':'direct';if(stage==='turn'){if(!getTurn)return failed(p,'turn-not-configured');const generation=++p.generation;discard(p);p.attempt=s.attempt;p.phase='turn-credentials';const cfg=await getTurn({room,peer:uid,refresh:!!p.turnConfig});if(links.get(uid)!==p||p.generation!==generation)return;if(!Array.isArray(cfg?.iceServers)||!cfg.iceServers.length)throw {code:'turn-provider-unavailable'};p.turnConfig=cfg;}p.terminal=false;const pc=setup(p,s.attempt,stage);await pc.setRemoteDescription({type:'offer',sdp:s.sdp});for(const c of p.candidates.splice(0))await pc.addIceCandidate(c);await pc.setLocalDescription(await pc.createAnswer());if(p.pc===pc)signal(uid,{attempt:s.attempt,kind:'answer',sdp:pc.localDescription.sdp});}
        else if(s.attempt===p.attempt&&p.pc){const pc=p.pc;if(s.kind==='answer'&&self===p.initiator){await pc.setRemoteDescription({type:'answer',sdp:s.sdp});for(const c of p.candidates.splice(0))await pc.addIceCandidate(c);}else if(s.kind==='candidate'){if(pc.remoteDescription)await pc.addIceCandidate(s.candidate);else if(p.candidates.length<64)p.candidates.push(s.candidate);}}
      }catch(e){if(p.attempt===s.attempt){if(s.transport==='turn')failed(p,['turn-not-configured','turn-budget-exhausted','turn-usage-unavailable'].includes(e.code)?e.code:'turn-provider-unavailable');else fallback(p,'signal-error');}}}
    function sync(id,uid,hostUid,members,preparing=''){if(room!==id||self!==uid||host!==hostUid&&prepared!==hostUid){reset();room=id||'';self=uid;}host=hostUid;prepared=preparing||'';if(!room)return;
      const wanted=new Set(members.filter(m=>m.uid!==self&&(self===host||m.uid===host||prepared&&(self===prepared||m.uid===prepared))).map(m=>m.uid));
      for(const[u,p]of links)if(!wanted.has(u)){discard(p);links.delete(u);}
      for(const u of wanted){const p=row(u);p.initiator=self===host||u===host?host:prepared;const online=members.find(m=>m.uid===u).connected!==false;p.online=online;if(!online&&p.pc&&!p2pOnly)fallback(p);if(online)offer(p);}}
    function send(uid,data){const p=links.get(uid);if(data.k==='start')return relay(uid,data);if(!p)return p2pOnly?false:relay(uid,data);if(data.k!=='f')return wire(p,{k:'rtc-wire',room,lane:'control',data});if(p.overflow)return false;
      if(data.ev?.length){if(p.pending.size>=256){p.overflow=true;changed(uid,'overflow');return false;}const packet={k:'rtc-wire',room,lane:'event',seq:++p.eventSeq,data:{k:'f',ev:data.ev}};p.pending.set(packet.seq,{packet,at:now(),firstAt:now()});wire(p,packet);}
      const snapshot={...data,ev:[]};return wire(p,{k:'rtc-wire',room,lane:'state',seq:++p.stateSeq,data:snapshot});}
    async function inspect(p){const pc=p.pc;if(!pc||p.inspecting||now()<(p.inspectAt||0))return;p.inspecting=true;p.inspectAt=now()+2000;
      try{const values=await pc.getStats();if(p.pc!==pc)return;let pair;values.forEach(s=>{if(s.type==='transport'&&s.selectedCandidatePairId)pair=values.get(s.selectedCandidatePairId);});if(!pair)values.forEach(s=>{if(s.type==='candidate-pair'&&s.state==='succeeded'&&s.nominated)pair=s;});
        if(pair){const local=values.get(pair.localCandidateId),remote=values.get(pair.remoteCandidateId);p.path={rttMs:Number.isFinite(pair.currentRoundTripTime)?Math.round(pair.currentRoundTripTime*1000):null,localType:local?.candidateType||'unknown',remoteType:remote?.candidateType||'unknown',protocol:local?.protocol||'unknown'};}
      }catch{}finally{p.inspecting=false;}}
    async function renew(p){if(p.renewing||now()<(p.renewAt||0)||p.turnConfig?.expiresAt-Date.now()>900000)return;const pc=p.pc;p.renewing=true;p.renewAt=now()+60000;
      try{const cfg=await getTurn({room,peer:p.uid});if(p.pc!==pc||links.get(p.uid)!==p)return;pc.setConfiguration({iceServers:cfg.iceServers,iceTransportPolicy:'relay'});p.turnConfig=cfg;p.renewReason=null;}catch{p.renewReason='turn-refresh-unavailable';}finally{p.renewing=false;}}
    function tick(){for(const p of links.values()){if(getTurn&&!ready(p)&&!p.terminal){if(p.deadline&&now()>=p.deadline){failed(p,'connection-deadline');continue;}if(p.phase==='direct-connecting'&&now()-p.startedAt>=directTimeoutMs){fallback(p,'direct-timeout');}else if(p.phase==='turn-connecting'&&now()-p.startedAt>=turnTimeoutMs){failed(p,'turn-connect-failed');continue;}}if(getTurn&&ready(p)&&p.stage==='turn')renew(p);flushAck(p);inspect(p);let retried=0;const retryAfter=Math.min(4000,Math.max(800,(p.ackRttMs||0)*2+100));for(const e of p.pending.values())if(retried<4&&now()-e.at>=retryAfter){wire(p,e.packet);e.at=now();e.retries=(e.retries||0)+1;retried++;}if(p.online)offer(p);}}
    const pressure=uid=>{const p=links.get(uid);return {bufferedBytes:Math.max(p?.dc?.bufferedAmount||0,p?.stateDc?.bufferedAmount||0),pendingEvents:p?.pending.size||0,incomingEvents:p?.incoming.size||0,ackRttMs:p?.ackRttMs||null,oldestEventMs:p?.pending.size?Math.max(0,now()-Math.min(...[...p.pending.values()].map(e=>e.firstAt??e.at))):0};};
    return {info(uid){const p=links.get(uid);return {mode:modeOf(p),route:routeOf(p),phase:p?.phase||'waiting',reason:p?.reason||(!peerType()?'unavailable':'waiting'),remainingMs:p?.terminal||ready(p)?0:Math.max(0,(p?.deadline||0)-now())};},retry,route:uid=>routeOf(links.get(uid)),pressure,sync,send,receive,signal:accept,tick,reset,mode:uid=>modeOf(links.get(uid)),
      stats:()=>({p2pOnly,webrtcAvailable:typeof peerType()==='function',secureContext:globalThis.isSecureContext===true,rtcApi:typeof peerType()==='function'?'available':'missing',directBufferedBytes:Math.max(0,...[...links.keys()].map(uid=>pressure(uid).bufferedBytes)),oldestEventMs:Math.max(0,...[...links.keys()].map(uid=>pressure(uid).oldestEventMs)),peerLinks:[...links.values()].map(p=>({mode:ready(p)?routeOf(p):modeOf(p),phase:p.phase,stage:p.stage,renewReason:p.renewReason||null,remainingMs:ready(p)||p.terminal?0:Math.max(0,(p.deadline||0)-now()),connection:p.pc?.connectionState||'closed',ice:p.pc?.iceConnectionState||'closed',reason:p.reason||(!peerType()?'unavailable':'waiting'),attempts:p.attempts||0,incomingEvents:p.incoming.size,ackRttMs:p.ackRttMs||null,error:p.error||null,path:p.dc?.readyState==='open'&&p.gameMode!=='relay'?p.path||null:null})),connectedPeers:[...links.values()].filter(p=>ready(p)).length,turnPeers:[...links.values()].filter(p=>ready(p)&&routeOf(p)==='turn').length,directPeers:[...links.values()].filter(p=>ready(p)&&routeOf(p)==='direct'&&p.gameMode!=='relay').length,connectingPeers:[...links.values()].filter(p=>!ready(p)).length,relayPeers:p2pOnly?0:[...links.values()].filter(p=>!ready(p)||p.gameMode==='relay').length,pendingEvents:[...links.values()].reduce((n,p)=>n+p.pending.size,0)})};
  }
  return {create};
});
