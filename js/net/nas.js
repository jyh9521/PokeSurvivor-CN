/* NAS adapters at the existing DB/Social/Net/Ranking seams; static/file stays local. */
G.NAS = (() => {
  const local=G.DB,oldSocial=G.Social,oldNet=G.Net,oldRanking=G.Ranking;
  let enabled=false,available=false,user=null,save=null,rev=0,pending=false,conflict=null,guest=false;
  let socket=null,social={friends:[],invites:[],room:null},activeRoom=null,change=0,flushing=null,retry=0,request=null;
  const syncListeners=new Set(),socialListeners=new Set(),messages=new Set(),peers=new Set();
  let state='local',storageOk=true;
  const clone=v=>JSON.parse(JSON.stringify(v));
  const read=k=>{try{return JSON.parse(localStorage.getItem(k)||'null');}catch{return null;}};
  const write=(k,v)=>{try{localStorage.setItem(k,JSON.stringify(v));return true;}catch{storageOk=false;setState('storage-error');return false;}};
  const key=()=>user?'ps.nas.save.'+user.id:'';
  const notify=()=>socialListeners.forEach(f=>{f('friends');f('invites');f('room');});
  function receiveSocial(next){const previous=social.room;for(const p of previous?.members||[])if(p.uid!==user?.id&&(previous.id!==next.room?.id||!next.room.members.some(m=>m.uid===p.uid)))peers.forEach(f=>f(p.uid,'closed'));social=next;notify();social.room?.members.forEach(p=>{if(p.uid!==user?.id)peers.forEach(f=>f(p.uid,'relay'));});}
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
  function fresh(name){local.playAsGuest();const s=clone(local.save);s.name=name;return s;}
  function load(result){user=result.user;guest=false;const cached=read(key());rev=result.rev;
    request=cached?.request||null;
    if(cached?.pending){save=cached.save;pending=true;rev=cached.rev;if(cached.rev!==result.rev&&!request)conflict={rev:result.rev,save:result.save};else conflict=cached.conflict;}
    else {save=result.save||fresh(user.name);pending=!result.save;conflict=null;}
    write('ps.nas.session',user);persist();setState(conflict?'conflict':pending?'pending':'ok');connect();if(pending&&!conflict)flush();
  }
  function enable(){enabled=true;G.LOCAL_ONLY=false;document.title=G.T('PokéSurvivor · NAS autohospedado');document.getElementById('f-pass').minLength=8;document.querySelectorAll('#scr-menu [data-go="friends"],#scr-menu [data-go="rank"]').forEach(b=>b.classList.remove('hidden'));}
  async function ready(){const restored=await local.ready();if(G.NAS_DISCOVERY!==true||!/^https?:$/.test(location.protocol))return restored;
    const cachedUser=read('ps.nas.session');
    try{const cfg=await api('config');if(cfg.backend!=='nas')return restored;enable();write('ps.nas.backend',{origin:location.origin});
      try{const result=await api('session');available=true;load(result);return true;}catch(e){if(e.status!==401)throw e;available=true;user=null;save=null;return false;}
    }catch{
      const previous=read('ps.nas.backend');if(previous?.origin===location.origin&&cachedUser){const cached=read('ps.nas.save.'+cachedUser.id);if(cached?.save){enable();user=cachedUser;save=cached.save;rev=cached.rev;pending=!!cached.pending;conflict=cached.conflict;request=cached.request||null;setState('offline');return true;}}
      return restored;
    }
  }
  async function auth(name,password,register){if(!enabled)return (register?local.register:local.login)(name,password);
    try{const result=await api(register?'register':'login',{name,password});available=true;load(result);return {ok:true,isNew:!save.partner};}catch(e){return {ok:false,error:e.message};}}
  async function flush(){if(!enabled||!user||guest||!pending||conflict)return !pending;if(flushing)return flushing;
    flushing=(async()=>{setState('syncing');let turns=0;
      try{while(pending&&!conflict&&++turns<=3){const version=change;
          if(!request){const bytes=new Uint8Array(16);crypto.getRandomValues(bytes);request={rev,save:clone(save),mutation:[...bytes].map(n=>n.toString(16).padStart(2,'0')).join('')};persist();}
          const snapshot=clone(request.save),result=await api('save',request,'PUT');request=null;available=true;rev=result.rev;
          if(change===version && JSON.stringify(save)===JSON.stringify(snapshot)){assign(save,result.save);pending=false;}persist();}
        setState(pending?'pending':'ok');return !pending;
      }catch(e){available=!!e.status&&e.status!==401;if(e.status===409){conflict=e.current;setState('conflict');}else setState(e.status===401?'auth-required':'offline');persist();return false;}
      finally{flushing=null;if(pending&&!conflict){clearTimeout(retry);retry=setTimeout(flush,5000);}}
    })();return flushing;
  }
  function commit(){if(!enabled)return local.commit(...arguments);if(!user||guest||!save)return false;change++;save.updated=Date.now();pending=true;const ok=persist();if(!conflict){clearTimeout(retry);retry=setTimeout(flush,500);}return ok;}
  async function resolve(choice){if(!conflict)return false;write('ps.nas.conflict-backup.'+user.id,{local:save,remote:conflict,at:Date.now()});
    request=null;change++;rev=conflict.rev;if(choice==='nas'&&conflict.save){assign(save,conflict.save);pending=false;}else if(choice==='browser')pending=true;else return false;
    conflict=null;persist();setState(pending?'pending':'ok');return pending?flush():true;}
  async function logout(){if(!enabled)return local.logout();await flush();if(pending||conflict){G.UI?.toast('还有未同步进度，请先处理存档同步。',4000);return false;}
    try{await api('logout',{});}catch{}clearTimeout(retry);user=null;save=null;guest=false;socket?.close();socket=null;social={friends:[],invites:[],room:null};activeRoom=null;
    try{localStorage.removeItem('ps.nas.session');}catch{}setState('local');notify();return true;}
  function connect(){if(!enabled||!user||guest)return;if(socket&&(socket.readyState===0||socket.readyState===1))return;
    const ws=new WebSocket((location.protocol==='https:'?'wss:':'ws:')+'//'+location.host+'/api/ws');socket=ws;
    ws.onopen=()=>{available=true;ws.send(JSON.stringify({type:'social'}));if(pending&&!conflict)flush();};
    ws.onmessage=e=>{try{const m=JSON.parse(e.data);if(m.type==='social')receiveSocial(m.data);
      if(m.type==='relay')messages.forEach(f=>f(m.from,m.data));if(m.type==='room-closed'){receiveSocial({...social,room:null});activeRoom=null;}}
      catch(e){console.warn('[NAS]',e.message);}};
    ws.onclose=e=>{if(socket!==ws)return;socket=null;available=e.code===4001;social.room?.members.forEach(p=>{if(p.uid!==user?.id)peers.forEach(f=>f(p.uid,'closed'));});social.room=null;activeRoom=null;notify();
      if(e.code!==4001&&user&&!guest)setTimeout(connect,3000);};
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
    async deleteAccount(password){try{await api('delete',{password});pending=false;conflict=null;const k=key();try{localStorage.removeItem(k);localStorage.removeItem('ps.nas.session');}catch{}user=null;save=null;socket?.close();social={friends:[],invites:[],room:null};notify();return {ok:true};}catch(e){return {ok:false,error:e.message};}},
    get mode(){return 'nas';},get fb(){return null;},get online(){return available&&!!user&&!guest;},get nameAccount(){return !!user;},get hasGoogle(){return false;},
    get user(){return user?.name||'Invitado';},get uid(){return user?.id;},get guest(){return guest;},get save(){return save;},get loggedIn(){return !!save;},get syncState(){return state;},get localReason(){return 'nas';},get storageOk(){return storageOk;}
  },['ready','onSync']);
  async function action(route,b){try{if ((route==='room/create'||route==='room/member') && !(await flush())) return {ok:false,error:'请先同步存档并处理冲突。'};const r=await api(route,b);await refresh();return r;}catch(e){return {ok:false,error:e.message};}}
  async function refresh(){if(enabled)connect();if(!enabled)return oldSocial.refreshPresence();if(!user||guest)return;try{receiveSocial(await api('social'));available=true;}catch{available=false;}}
  const profile=()=>oldSocial.profileData();
  G.Social=proxy(oldSocial,{
    start:async()=>{connect();await refresh();return user?'ok':'off';},stop:async()=>{await action('room/leave',{});},
    claimNick:async()=>({ok:true}),request:n=>action('friends/request',{name:n}),accept:uid=>action('friends/accept',{uid}),remove:uid=>action('friends/remove',{uid}),
    createRoom:()=>action('room/create',{}),joinRoom:id=>{const invitation=social.invites.find(i=>i.room===id);return invitation?action('invite/accept',{uid:invitation.from}):Promise.resolve({ok:false,error:'邀请已失效。'});},leaveRoom:()=>action('room/leave',{}),refreshMember:()=>action('room/member',{}),setOpen:open=>action('room/open',{open}),
    async invite(uid){if(!social.room){const r=await action('room/create',{});if(!r.ok)return r;}return action('invite',{uid});},
    acceptInvite:uid=>action('invite/accept',{uid}),declineInvite:uid=>action('invite/decline',{uid}),
    refreshPresence:refresh,setPlaying(){},publishProfile(){commit();},profileData:profile,
    getProfile:async uid=>{try{return (await api('profile?uid='+encodeURIComponent(uid))).profile;}catch{return null;}},
    on(fn){socialListeners.add(fn);oldSocial.on(fn);},off(fn){socialListeners.delete(fn);oldSocial.off(fn);},
    get me(){return user?{uid:user.id,name:user.name}:null;},get uid(){return user?.id;},get started(){return !!user;},get friends(){return social.friends;},get invites(){return social.invites;},get room(){return social.room;}
  },['on','off']);
  function relay(to,data){if(socket?.readyState===1&&activeRoom)socket.send(JSON.stringify({type:'relay',to,data}));}
  G.Net=proxy(oldNet,{
    open(id){activeRoom=id;connect();},close(){activeRoom=null;},syncMembers(){},send:relay,toHost:msg=>relay(social.room?.host,msg),
    broadcast(msg){social.room?.members.filter(m=>m.uid!==user?.id).forEach(m=>relay(m.uid,msg));},
    on(fn){messages.add(fn);oldNet.on(fn);},off(fn){messages.delete(fn);oldNet.off(fn);},onPeer(fn){peers.add(fn);oldNet.onPeer(fn);},
    mode(uid){return connectedPeer(uid)?'relay':'connecting';},slow(){return true;},viaTurn(){return false;},peers(){return social.room?.members.filter(m=>m.uid!==user?.id).map(m=>m.uid)||[];},
    get uid(){return user?.id;},get hostUid(){return social.room?.host;},get isHost(){return social.room?.isHost;},get open_(){return !!activeRoom;},get turn(){return false;},stats(){return {backend:'nas',transport:'websocket'};}
  },['on','off','onPeer']);
  function connectedPeer(uid){return socket?.readyState===1&&social.room?.members.some(m=>m.uid===uid);}
  let runPromise=null;const reported=new Set();
  function runStarted(mode){runPromise=api('run',{mode}).catch(()=>null);}
  async function submit(mode,mark){const run=await runPromise;if(!run)return;try{await api('score',{mode,mark,run:run.id});}catch(e){G.UI?.toast('NAS 排行榜：'+e.message,3000);}}
  const board=(m,p,d)=>m+'_'+p+(d?'_p'+d:'');
  const ranking=(m,p,d,f=false)=>api(`ranking?mode=${m}&period=${p}&dex=${d||0}&friends=${f?1:0}`);
  G.Ranking=proxy(oldRanking,{runStarted,submitSolo:m=>submit('s',m),submitGroup:m=>submit('g',m),board,
    top:async(m,p,d,f)=>{try{return (await ranking(m,p,d,f)).rows;}catch{return [];}},myRank:async(m,p,d)=>{try{return (await ranking(m,p,d)).mine;}catch{return null;}},
    isAdmin:()=>false,reported:()=>reported,report:async(b,r)=>{await api('report',{id:r.id});reported.add(b+'__'+r.id);},removeMine:async()=>{}
  });
  window.addEventListener('online',()=>{if(enabled&&user){connect();refreshSave();}});
  document.addEventListener('visibilitychange',()=>{if(enabled&&user){if(document.visibilityState==='hidden'){if(pending)flush();}else refreshSave();}});
  async function refreshSave(){if(!enabled||!user||guest)return false;if(pending||conflict)return flush();const version=change;try{const r=await api('save');available=true;if(change!==version||pending)return flush();if(r.save&&r.rev!==rev){rev=r.rev;assign(save,r.save);persist();}setState('ok');return true;}catch(e){setState(e.status===401?'auth-required':'offline');return false;}}
  return {refreshSave,get enabled(){return enabled;},get conflict(){return conflict;},get pending(){return pending;},get user(){return user;},api,flush,resolve,reauthenticate:password=>auth(user.name,password,false),
  };
})();
