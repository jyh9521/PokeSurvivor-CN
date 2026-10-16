/* NAS adapters at the existing DB/Social/Net/Ranking seams; static/file stays local. */
G.NAS = (() => {
  performance.setResourceTimingBufferSize?.(1000);
  const local=G.DB,oldSocial=G.Social,oldNet=G.Net,oldRanking=G.Ranking;
  const clientId=[...crypto.getRandomValues(new Uint8Array(16))].map(n=>n.toString(16).padStart(2,'0')).join('');
  let enabled=false,available=false,user=null,save=null,rev=0,pending=false,conflict=null,guest=false;
  let reconnectAt=0,reconnectTimer=null,socket=null,social={friends:[],invites:[],room:null},activeRoom=null,change=0,flushing=null,retry=0,request=null;
  const syncListeners=new Set(),socialListeners=new Set(),messages=new Set(),peers=new Set();
  let state='local',storageOk=true,networkTimer=null,nextProbe=0,serverBuffered=0,disconnects=0;
  let operations={draining:false},deviceBusy=false;
  const operationListeners=new Set();
  function receiveOperations(value){operations=value;operationListeners.forEach(f=>f(value));G.Updater?.emergency(value.emergency);}
  let health=G.RelayHealth.create();
  const probesAnswered=new Map();
  const flow=G.RelayFlow.create({onSent:value=>{if(value.type==='relay'&&(value.data?.k==='f'||value.data?.lane==='state'))health.tx(value.to);}});
  const quality=G.NetworkQuality.create();
  const direct=G.DirectLink.create({batchAcks:()=>!!social.room,signal:(to,data)=>rawRelay(to,{k:'rtc-signal',...data}),relay:rawRelay,deliver:deliver,sent:uid=>health.tx(uid),changed:(uid,mode)=>{if(mode==='overflow'){action('room/leave',{});G.UI?.toast(G.T('Demasiados eventos pendientes; vuelve a la sala.'));}else peers.forEach(f=>f(uid,social.room?.members.find(m=>m.uid===uid)?.connected===false?'reconnecting':mode));}});
  const interval=uid=>{const directPath=direct.mode(uid)==='direct',pressure=direct.pressure(uid);return quality.interval(uid||'all',{...pressure,bufferedBytes:Math.max(pressure.bufferedBytes,directPath?0:socket?.bufferedAmount||0),serverBufferedBytes:directPath?0:serverBuffered},social.room?10:15);};
  function networkTick(){
    direct.tick();flow.drain(socket,(_v,_key,scope)=>!!activeRoom&&scope===activeRoom);health.sweep();
    if(!socket||socket.readyState!==1||performance.now()<nextProbe)return;nextProbe=performance.now()+2000;
    const own=health.probe('nas');if(own)flow.send(socket,{type:'ping',id:own});
    const peers=social.room?.isHost?social.room.members.filter(m=>m.uid!==user?.id).map(m=>m.uid):[social.room?.host];
    if(activeRoom)for(const peer of peers.filter(Boolean)){const id=health.probe(peer);if(id)relay(peer,{k:'nas-diagnostic-ping',id});}
  }
  function metrics(){const links=direct.stats();const entries=performance.getEntriesByType('resource').filter(r=>{try{const u=new URL(r.name);return u.origin===location.origin&&/^\/(css|js|assets)\//.test(u.pathname);}catch{return false;}});const resources=[...entries.filter(r=>/\.(?:js|css|woff2?|ttf)(?:[?#]|$)/.test(r.name)).slice(-48),...entries.filter(r=>! /\.(?:js|css|woff2?|ttf)(?:[?#]|$)/.test(r.name)).slice(-16)].map(r=>({kind:r.initiatorType,resource:new URL(r.name).pathname.split('/').at(-1),durationMs:Math.round(r.duration),ttfbMs:Math.max(0,Math.round(r.responseStart-r.requestStart)),transferBytes:r.transferSize,encodedBytes:r.encodedBodySize,decodedBytes:r.decodedBodySize,protocol:r.nextHopProtocol,compressed:r.encodedBodySize>0&&r.decodedBodySize>r.encodedBodySize,cached:r.transferSize===0&&r.decodedBodySize>0}));return {...links,reconnectingPeers:(social.room?.members||[]).filter(m=>m.uid!==user?.id&&m.connected===false).length,startupResources:resources,gameTransport:links.directPeers?(links.relayPeers?'mixed':'webrtc-direct'):'websocket-relay',probeTransport:'websocket-relay',...health.sample({connected:socket?.readyState===1,targetHz:Math.min(1/interval(),...(social.room?.members||[]).filter(m=>m.uid!==user?.id).map(m=>1/interval(m.uid))),bufferedBytes:socket?.bufferedAmount||0,serverBufferedBytes:serverBuffered,coalescedFrames:flow.stats().coalesced,queuedSnapshots:flow.stats().pending,disconnects,background:document.hidden})};}
  const clone=v=>JSON.parse(JSON.stringify(v));
  const read=k=>{try{return JSON.parse(localStorage.getItem(k)||'null');}catch{return null;}};
  const write=(k,v)=>{try{localStorage.setItem(k,JSON.stringify(v));return true;}catch{storageOk=false;setState('storage-error');return false;}};
  const key=()=>user?'ps.nas.save.'+user.id:'';
  const notify=()=>socialListeners.forEach(f=>{f('friends');f('invites');f('room');});
  function receiveSocial(next){const previous=social.room;if(previous?.id!==next.room?.id||(previous?.members||[]).map(m=>m.uid).sort().join('|')!==(next.room?.members||[]).map(m=>m.uid).sort().join('|')){flow.clear();quality.clear();health.clearPeers();probesAnswered.clear();}for(const p of previous?.members||[])if(p.uid!==user?.id&&(previous.id!==next.room?.id||!next.room.members.some(m=>m.uid===p.uid)))peers.forEach(f=>f(p.uid,'closed'));social=next;flow.setLimit(social.room?7:4);direct.sync(social.room?.id,user?.id,social.room?.host,social.room?.members||[]);notify();social.room?.members.forEach(p=>{if(p.uid!==user?.id)peers.forEach(f=>f(p.uid,p.connected===false?'reconnecting':direct.mode(p.uid)));});}
  const setState=s=>{state=storageOk?s:'storage-error';syncListeners.forEach(f=>f(state));};
  function assign(dst,src){for(const k of Object.keys(dst))if(!(k in src))delete dst[k];for(const k in src){if(dst[k]&&src[k]&&typeof dst[k]==='object'&&typeof src[k]==='object'&&!Array.isArray(dst[k])&&!Array.isArray(src[k]))assign(dst[k],src[k]);else dst[k]=clone(src[k]);}}
  function persist(){if(!user||guest)return false;return write(key(),{user,save,rev,pending,conflict,request});}
  async function api(url,body,method=body===undefined?'GET':'POST') {
    const ctl=new AbortController(),timer=setTimeout(()=>ctl.abort(),8000);
    try{
      const r=await fetch('/api/'+url,{method,credentials:'same-origin',cache:'no-store',headers:body===undefined?{}:{'content-type':'application/json'},body:body===undefined?undefined:JSON.stringify(body),signal:ctl.signal});
      const data=await r.json();if(!r.ok)throw Object.assign(Error(data.error||'NAS 请求失败。'),{status:r.status,current:data.current});return data;
    }finally{clearTimeout(timer);}
  }
  // Rebase only server-issued gifts missing from a retained browser copy.
  function reconcileRewards(localSave,remoteSave){
    const remote=remoteSave?.serverRewards||[],known=new Set((localSave.serverRewards||[]).map(r=>r.id));
    for(const r of remote)if(!known.has(r.id)){localSave.coins+=r.coins;known.add(r.id);}
    localSave.serverRewards=clone(remote);const totals=remoteSave?.challengeRewards;if(totals){const old=localSave.challengeRewards||{coins:0,t1:0};localSave.coins+=Math.max(0,totals.coins-(old.coins||0));localSave.tickets.t1+=Math.max(0,totals.t1-(old.t1||0));localSave.challengeRewards=clone(totals);}
  }
  function fresh(name){local.playAsGuest();const s=clone(local.save);s.name=name;return s;}
  function load(result){deviceBusy=false;user=result.user;guest=false;const cached=read(key());rev=result.rev;
    request=cached?.request||null;
    if(cached?.pending){save=cached.save;pending=true;rev=cached.rev;conflict=cached.conflict||null;}
    else {save=result.save||fresh(user.name);pending=!result.save;conflict=null;}
    write('ps.nas.session',user);persist();setState(conflict?'conflict':pending?'pending':'ok');connect();if(pending&&!conflict)flush();
  }
  function enable(){enabled=true;G.LOCAL_ONLY=false;document.title=G.T('PokéSurvivor · NAS autohospedado');document.getElementById('f-pass').minLength=8;document.querySelectorAll('#scr-menu [data-go="friends"],#scr-menu [data-go="rank"]').forEach(b=>b.classList.remove('hidden'));}
  async function ready(){const restored=await local.ready();if(G.NAS_DISCOVERY!==true||!/^https?:$/.test(location.protocol))return restored;
    const cachedUser=read('ps.nas.session');
    try{const cfg=await api('config');if(cfg.backend!=='nas')return restored;enable();receiveOperations(cfg.operations||{draining:false});write('ps.nas.backend',{origin:location.origin});
      try{const result=await api('session');available=true;load(result);return true;}catch(e){if(e.status!==401)throw e;available=true;user=null;save=null;return false;}
    }catch{
      const previous=read('ps.nas.backend');if(previous?.origin===location.origin&&cachedUser){const cached=read('ps.nas.save.'+cachedUser.id);if(cached?.save){enable();user=cachedUser;save=cached.save;rev=cached.rev;pending=!!cached.pending;conflict=cached.conflict;request=cached.request||null;setState('offline');return true;}}
      return restored;
    }
  }
  async function auth(name,password,register){if(!enabled)return (register?local.register:local.login)(name,password);
    try{const result=await api(register?'register':'login',{name,password});available=true;const previous=socket;socket=null;previous?.close();load(result);return {ok:true,isNew:!save.partner};}catch(e){return {ok:false,error:e.message,status:e.status};}}
  async function flush(){if(!enabled||!user||guest||!pending||conflict)return !pending;if(flushing)return flushing;
    flushing=(async()=>{setState('syncing');let turns=0;
      try{while(pending&&!conflict&&++turns<=3){const version=change;
          if(!request){const bytes=new Uint8Array(16);crypto.getRandomValues(bytes);request={rev,save:clone(save),autoMerge:true,mutation:[...bytes].map(n=>n.toString(16).padStart(2,'0')).join('')};persist();}
          const snapshot=clone(request.save),result=await api('save',request,'PUT');request=null;available=true;rev=result.rev;
          if(change===version && JSON.stringify(save)===JSON.stringify(snapshot)){assign(save,result.save);pending=false;}else {const rebased=G.SaveMerge.merge(snapshot,save,result.save);if(rebased.conflicts.length){conflict={...result,differences:rebased.conflicts};pending=true;}else{assign(save,rebased.save);pending=JSON.stringify(save)!==JSON.stringify(result.save);}}persist();}
        setState(conflict?'conflict':pending?'pending':'ok');return !pending;
      }catch(e){available=!!e.status&&e.status!==401;if(e.status===409){conflict=e.current;setState('conflict');}else if(e.status===423){deviceBusy=true;setState('device-busy');}else setState(e.status===401?'auth-required':'offline');persist();return false;}
      finally{flushing=null;if(pending&&!conflict){clearTimeout(retry);retry=setTimeout(flush,5000);}}
    })();return flushing;
  }
  function commit(){if(!enabled)return local.commit(...arguments);if(!user||guest||!save)return false;change++;save.updated=Date.now();pending=true;const ok=persist();if(!conflict){clearTimeout(retry);retry=setTimeout(flush,500);}return ok;}
  async function resolve(choice){if(!conflict||!['nas','browser'].includes(choice))return false;if(!write('ps.nas.conflict-backup.'+user.id,{local:save,remote:conflict,at:Date.now()}))return false;
    const selected=clone(choice==='nas'?conflict.save:save),other=choice==='nas'?save:conflict.save;
    if(!selected)return false;
    for(const field of ['owned','shiny','legends','arenas','itemsFound','evoMoves'])selected[field]={...(other?.[field]||{}),...(selected[field]||{})};
    if(choice==='browser')reconcileRewards(selected,conflict.save);
    request=null;change++;rev=conflict.rev;pending=JSON.stringify(selected)!==JSON.stringify(conflict.save);assign(save,selected);
    conflict=null;persist();setState(pending?'pending':'ok');return pending?flush():true;}

  async function logout(){if(!enabled)return local.logout();await flush();if(pending||conflict){G.UI?.toast('还有未同步进度，请先处理存档同步。',4000);return false;}
    try{await api('logout',{});}catch{}clearTimeout(retry);user=null;save=null;guest=false;socket?.close();socket=null;social={friends:[],invites:[],room:null};activeRoom=null;
    try{localStorage.removeItem('ps.nas.session');}catch{}setState('local');notify();return true;}
  function connect(){if(deviceBusy)return;if(!enabled||!user||guest)return;if(performance.now()<reconnectAt){clearTimeout(reconnectTimer);reconnectTimer=setTimeout(connect,Math.ceil(reconnectAt-performance.now())+25);return;}if(socket&&(socket.readyState===0||socket.readyState===1))return;
    const ws=new WebSocket((location.protocol==='https:'?'wss:':'ws:')+'//'+location.host+'/api/ws');socket=ws;
    ws.onopen=()=>{deviceBusy=false;peers.forEach(f=>f(user?.id,'relay'));available=true;serverBuffered=0;health=G.RelayHealth.create();nextProbe=0;ws.send(JSON.stringify({type:'social',client:clientId}));clearInterval(networkTimer);networkTimer=setInterval(networkTick,100);networkTick();if(pending&&!conflict)flush();};
    ws.onmessage=e=>{try{const m=JSON.parse(e.data);if(m.type==='social')receiveSocial(m.data);if(m.type==='operations')receiveOperations(m.data);if(m.type==='announcement')G.Announcements?.receive(m.data);
      if(m.type==='pong'){if(health.pong('nas',m.id))serverBuffered=Math.max(0,Number(m.buffered)||0);}
      if(m.type==='relay'){
        if(m.data?.k==='nas-diagnostic-ping'){if(connectedPeer(m.from)&&typeof m.data.id==='string'&&m.data.id.length<=40&&performance.now()-(probesAnswered.get(m.from)??-Infinity)>=500){probesAnswered.set(m.from,performance.now());relay(m.from,{k:'nas-diagnostic-pong',id:m.data.id});}}
        else if(m.data?.k==='nas-diagnostic-pong')health.pong(m.from,m.data.id);
        else if(m.data?.k==='rtc-signal')direct.signal(m.from,m.data);else if(m.data?.k==='rtc-wire')direct.receive(m.from,m.data);else deliver(m.from,m.data);
      }if(m.type==='room-closed'){receiveSocial({...social,room:null});activeRoom=null;}}
      catch(e){console.warn('[NAS]',e.message);}};
    ws.onclose=e=>{if(socket!==ws)return;if([4001,4002,4003].includes(e.code)){deviceBusy=true;G.UI?.toast(G.T(e.code===4003?'La sesión fue revocada.':'Otra sesión controla la partida. Revisa tus dispositivos.'),6000);setState(e.code===4003?'auth-required':'device-busy');}clearInterval(networkTimer);networkTimer=null;flow.clear();serverBuffered=0;disconnects++;socket=null;reconnectAt=performance.now()+3000;available=e.code===4001;if([4001,4002,4003].includes(e.code)){direct.reset();social.room?.members.forEach(p=>{if(p.uid!==user?.id)peers.forEach(f=>f(p.uid,'closed'));});social.room=null;activeRoom=null;}else{peers.forEach(f=>f(user?.id,'reconnecting'));direct.sync(social.room?.id,user?.id,social.room?.host,(social.room?.members||[]).map(m=>({...m,connected:false})));}notify();
      if(!deviceBusy&&user&&!guest){clearTimeout(reconnectTimer);reconnectTimer=setTimeout(connect,3025);}};
  }
  function proxy(original,overrides,always=[]){return new Proxy(original,{get(target,p){return (enabled||always.includes(p))&&p in overrides?Reflect.get(overrides,p):Reflect.get(target,p);}});}
  G.DB=proxy(local,{
    ready,register:(n,p)=>auth(n,p,true),login:(n,p)=>auth(n,p,false),commit,flush,logout,
    playAsGuest(){socket?.close();guest=true;user=null;save=fresh('Invitado');setState('local');return {ok:true,isNew:true};},
    setName(){/* NAS account name is immutable. */},
    owns:d=>!!save?.owned[d],ownsShiny:d=>!!save?.shiny[d],
    grant(d,from){if(!save.owned[d])save.owned[d]={at:Date.now(),from};},
    grantShiny(d,from){if(!save.owned[d])save.owned[d]={at:Date.now(),from};if(save.shiny[d])return false;save.shiny[d]={at:Date.now(),from};return true;},
    upgradesOf(d){return save?(save.pupg[d]||(save.pupg[d]={})):{};},
    onSync(fn){syncListeners.add(fn);local.onSync(fn);},
    async deleteAccount(password){try{await api('delete',{password});pending=false;conflict=null;const k=key();try{localStorage.removeItem(k);localStorage.removeItem('ps.nas.session');}catch{}user=null;save=null;socket?.close();social={friends:[],invites:[],room:null};notify();return {ok:true};}catch(e){return {ok:false,error:e.message,status:e.status};}},
    get mode(){return 'nas';},get fb(){return null;},get online(){return available&&!!user&&!guest;},get nameAccount(){return !!user;},get hasGoogle(){return false;},
    get user(){return user?.nick||user?.name||'Invitado';},get uid(){return user?.id;},get guest(){return guest;},get save(){return save;},get loggedIn(){return !!save;},get syncState(){return state;},get localReason(){return 'nas';},get storageOk(){return storageOk;}
  },['ready','onSync']);
  async function action(route,b){try{if ((route==='room/create'||route==='room/member'||route==='room/ready') && !(await flush())) return {ok:false,error:'请先同步存档并处理冲突。'};const r=await api(route,{...b,protocol:6});await refresh();return r;}catch(e){return {ok:false,error:e.message,status:e.status};}}
  async function refresh(){if(enabled)connect();if(!enabled)return oldSocial.refreshPresence();if(!user||guest)return;try{receiveSocial(await api('social'));available=true;}catch{available=false;}}
  const profile=()=>oldSocial.profileData();
  G.Social=proxy(oldSocial,{
    start:async()=>{connect();await refresh();return user?'ok':'off';},stop:async()=>{await action('room/leave',{});},
    claimNick:n=>setNickname(n),request:n=>action('friends/request',{name:n}),requestUid:uid=>action('friends/request',{uid}),accept:uid=>action('friends/accept',{uid}),remove:uid=>action('friends/remove',{uid}),
    createRoom:()=>action('room/create',{}),get MAX_PLAYERS(){return social.room?.capacity||8;},joinRoom:id=>{const invitation=social.invites.find(i=>i.room===id);return invitation?action('invite/accept',{uid:invitation.from}):Promise.resolve({ok:false,error:'邀请已失效。'});},leaveRoom:()=>action('room/leave',{}),refreshMember:()=>action('room/member',{}),setOpen:open=>action('room/open',{open}),setReady:ready=>action('room/ready',{ready}),transferHost:uid=>action('room/transfer',{uid}),
    async invite(uid){if(!social.room){const r=await action('room/create',{});if(!r.ok)return r;}return action('invite',{uid});},
    acceptInvite:uid=>action('invite/accept',{uid}),declineInvite:uid=>action('invite/decline',{uid}),
    refreshPresence:refresh,setPlaying(){},publishProfile(){commit();},profileData:profile,
    getProfile:async uid=>{try{return (await api('profile?uid='+encodeURIComponent(uid))).profile;}catch{return null;}},
    on(fn){socialListeners.add(fn);oldSocial.on(fn);},off(fn){socialListeners.delete(fn);oldSocial.off(fn);},
    get me(){return user?{uid:user.id,name:user.nick||user.name}:null;},get uid(){return user?.id;},get started(){return !!user;},get friends(){return social.friends;},get invites(){return social.invites;},get room(){return social.room;}
  },['on','off']);
  function deliver(from,data){if(data?.k==='f'&&data.p)health.rx(from);messages.forEach(f=>f(from,data));}
  function relay(to,data){if(activeRoom)return direct.send(to,data);}
  function rawRelay(to,data){if(socket?.readyState===1&&activeRoom)return flow.send(socket,{type:'relay',to,data,epoch:social.room?.epoch||0},{key:to,scope:activeRoom,replaceable:(data.k==='f'&&Array.isArray(data.ev)&&data.ev.length===0)||(data.k==='rtc-wire'&&data.lane==='state')});}
  G.Net=proxy(oldNet,{
    open(id){if(activeRoom!==id){flow.clear();health.clearPeers();}activeRoom=id;connect();},close(){activeRoom=null;direct.reset();flow.clear();health.clearPeers();},syncMembers(){},send:relay,toHost:msg=>relay(social.room?.host,msg),
    broadcast(msg){social.room?.members.filter(m=>m.uid!==user?.id).forEach(m=>relay(m.uid,msg));},
    on(fn){messages.add(fn);oldNet.on(fn);},off(fn){messages.delete(fn);oldNet.off(fn);},onPeer(fn){peers.add(fn);oldNet.onPeer(fn);},
    mode(uid){return connectedPeer(uid)?direct.mode(uid):'connecting';},slow(){return flow.congested(socket);},interval, noteFrame(){health.frame();},viaTurn(){return false;},peers(){return social.room?.members.filter(m=>m.uid!==user?.id).map(m=>m.uid)||[];},
    get uid(){return user?.id;},get hostUid(){return social.room?.host;},get isHost(){return social.room?.isHost;},get open_(){return !!activeRoom;},get turn(){return false;},stats:metrics
  },['on','off','onPeer']);
  function connectedPeer(uid){return socket?.readyState===1&&social.room?.members.some(m=>m.uid===uid);}
  let runPromise=null;const reported=new Set();
  function runStarted(mode){if(!runPromise)runPromise=api('run',{mode}).catch(()=>null);}
  async function submit(mode,mark){const run=await runPromise;runPromise=null;if(!run)return;try{await api('score',{mode,mark,run:run.id});}catch(e){G.UI?.toast('NAS 排行榜：'+e.message,3000);}finally{await api('run/end',{run:run.id}).catch(()=>{});}}
  async function prepareRun(coop){if(!enabled||guest)return true;if(runPromise)return true;
    if(deviceBusy){G.UI.toast(G.T('Otra sesión controla la partida. Revisa tus dispositivos.'));return false;}
    if(!(await refreshSave())||pending||conflict){if(!coop&&state==='offline'&&!conflict&&!operations.draining)return true;return false;}
    try{receiveOperations(await api('operations'));if(operations.draining)throw Error('服务器维护排空中，暂不开始新局。');
      if(!coop||coop.host===user.id){const value=await api('run',{mode:coop?'g':'s',challenge:!coop?G.RunModes?.pending?.id:undefined});if(value.challenge)G.RunModes.configure(value.challenge);runPromise=Promise.resolve(value);}return true;
    }catch(e){G.UI.toast(e.message,5000);return false;}}
  async function finishRun(){const run=await runPromise;runPromise=null;if(run)await api('run/end',{run:run.id}).catch(()=>{});}

  const board=(m,p,d)=>m+'_'+p+(d?'_p'+d:'');
  const ranking=(m,p,d,f=false)=>api(`ranking?mode=${m}&period=${p}&${m==='c'?'date='+encodeURIComponent(d||''):'dex='+(d||0)}&friends=${f?1:0}`);
  G.Ranking=proxy(oldRanking,{runStarted,submitSolo:m=>submit('s',m),submitGroup:m=>submit('g',m),board,
    challenge:async(p,d,f)=>ranking('c',p,d,f),top:async(m,p,d,f)=>(await ranking(m,p,d,f)).rows,myRank:async(m,p,d)=>(await ranking(m,p,d)).mine,
    isAdmin:()=>false,reported:()=>reported,report:async(b,r)=>{await api('report',{id:r.id});reported.add(b+'__'+r.id);},removeMine:async()=>{}
  });
  window.addEventListener('online',()=>{if(enabled&&user){connect();refreshSave();}});
  document.addEventListener('visibilitychange',()=>{if(enabled&&user){if(document.visibilityState==='hidden'){if(pending)flush();}else refreshSave();}});
  async function refreshSave(){if(G.Game&&!['ui','over'].includes(G.Game.state))return !pending&&!conflict;if(!enabled||!user||guest)return false;if(pending||conflict)return flush();const version=change;try{const r=await api('save');available=true;if(change!==version||pending)return flush();if(r.save&&r.rev!==rev){rev=r.rev;assign(save,r.save);persist();}setState('ok');return true;}catch(e){setState(e.status===401?'auth-required':'offline');return false;}}
  async function setNickname(nick){try{const r=await api('nickname',{nick});user=r.user;write('ps.nas.session',user);persist();G.UI?.refreshCoins();await refresh();return {ok:true};}catch(e){return {ok:false,error:e.message,status:e.status};}}
  async function claimChallenge(period,date){
    if(G.RunModes?.active||G.Game&&!['ui','over'].includes(G.Game.state))throw Error(G.T('Termina la partida antes de recoger premios.'));
    commit();if(!(await flush())||conflict)throw Error(G.T('Primero sincroniza tu partida.'));
    const uid=user.id,version=change,r=await api('challenges/claim',{period,date});
    if(user?.id!==uid)return {ok:false};
    if(change!==version){conflict={save:r.save,rev:r.rev,differences:['economy']};pending=true;persist();setState('conflict');throw Error(G.T('Premio guardado en NAS; resuelve el conflicto antes de continuar.'));}
    assign(save,r.save);rev=r.rev;request=null;pending=false;persist();setState('ok');G.UI?.refreshCoins();return r;
  }
  async function upgrade(op,dex,id){if(!(await flush())||conflict)return {ok:false,error:'请先同步存档并处理冲突。'};try{const uid=user.id,version=change;const r=await api('upgrades',{op,dex,id,rev});if(user?.id!==uid)return {ok:false,error:'账号已切换。'};if(change!==version){conflict={save:r.save,rev:r.rev};pending=true;persist();setState('conflict');return {ok:false,error:'操作期间存档发生变化，两份进度已保留，请处理同步冲突。'};}assign(save,r.save);rev=r.rev;persist();setState('ok');return {ok:true,...r.result};}catch(e){await refreshSave();return {ok:false,error:e.message,status:e.status};}}
  return {claimChallenge,prepareRun,finishRun,onOperations:f=>{operationListeners.add(f);f(operations);},get operations(){return operations;},get isAdmin(){return user?.name?.toLowerCase()==='jyh9521';},
    async devices(){return api('devices');},async revokeDevice(id,password){return api('devices/revoke',{id,password});},async takeover(password){await api('devices/takeover',{password});deviceBusy=false;connect();return refreshSave();},
    async administer(op,message,confirm){const value=await api('admin/operations',{op,message,confirm});receiveOperations(value);return value;},adminStatus:()=>api('admin/status'),
    announce:text=>action('announcement',{text}),get canAnnounce(){return social.me?.canAnnounce===true;},upgrade,setNickname,networkMetrics:metrics,refreshSave,get enabled(){return enabled;},get conflict(){return conflict;},get pending(){return pending;},get user(){return user;},get revision(){return rev;},exportCopies:()=>({format:1,recordedAt:new Date().toISOString(),browser:{rev,save:clone(save)},nas:clone(conflict),differences:G.SaveDiff.compare(save,conflict?.save)}),api,flush,resolve,reauthenticate:password=>auth(user.name,password,false),
  };
})();
