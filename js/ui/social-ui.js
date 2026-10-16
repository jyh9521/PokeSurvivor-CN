/* ============ social-ui.js — apodo, amigos, sala e invitaciones ============ */
(() => {
  const $ = G.UI.$;
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  /** ¿Se puede usar lo online? Si no, explica por qué. */
  function needOnline() {
    if (G.DB.online) return true;
    G.UI.toast(G.DB.guest ? 'Crea una cuenta para jugar con amigos y salir en el ranking.'
      : 'Esto necesita la versión online del juego (con la nube).', 3200);
    return false;
  }

  // ======================= APODO =======================

  G.NickUI = (() => {
    let then = null, skipped = false;

    function init() {
      $('nick-form').onsubmit = async e => {
        e.preventDefault();
        $('nick-err').textContent = '';
        $('nick-ok').disabled = true;
        const r = await G.Social.claimNick($('nick-in').value);
        $('nick-ok').disabled = false;
        if (!r.ok) { $('nick-err').textContent = r.error; G.Audio.sfx('error'); return; }
        G.Audio.sfx('confirm');
        G.UI.toast('Tu apodo es ' + G.Social.me.name);
        const cb = then; then = null;
        if (cb) cb(); else G.MenuUI.open();
      };
      $('nick-later').onclick = () => { skipped = true; then = null; G.MenuUI.open(); };
    }

    /** @param next  qué abrir después de elegirlo */
    function open(next) {
      then = next || null;
      G.UI.show('scr-nick');
      $('nick-err').textContent = '';
      $('nick-in').value = '';
      setTimeout(() => $('nick-in').focus(), 50);
    }

    return { init, open, get skipped() { return skipped; } };
  })();

  /** Abre `fn` si tienes apodo; si no, pide el apodo primero. */
  function withNick(fn) {
    if (!needOnline()) return;
    if (G.Social.me) { fn(); return; }
    G.Social.start().then(r => { if (r === 'ok') fn(); else G.NickUI.open(fn); });
  }

  // ======================= AMIGOS =======================

  G.FriendsUI = (() => {
    function init() {
      $('fr-create').onclick=async()=>{if(!G.NAS?.enabled)return;const r=await G.Social.createRoom();if(r.ok)G.LobbyUI.open();else G.UI.toast(r.error);};
      $('fr-room').onclick = () => G.LobbyUI.open();
      G.Social.on(() => { if (G.UI.isOpen('scr-friends')) render(); });
    }

    function msg(t, bad) {
      $('fr-msg').textContent = t || '';
      $('fr-msg').style.color = bad ? '#ffb0b8' : '';
      if (t) G.Audio.sfx(bad ? 'error' : 'confirm');
    }

    function open() { withNick(() => { G.UI.show('scr-friends', true); msg(''); render(); G.Social.refreshPresence(); }); }

    /** "hace 5 min", "hace 2 h", "hace 3 días". */
    function ago(t) {
      const m = Math.max(1, Math.round((Date.now() - t) / 60000));
      if (m < 60) return 'hace ' + m + ' min';
      const h = Math.round(m / 60);
      if (h < 48) return 'hace ' + h + ' h';
      return 'hace ' + Math.round(h / 24) + ' días';
    }

    function stateText(f) {
      if (f.status === 'in') return 'Quiere ser tu amigo';
      if (f.status === 'out') return 'Solicitud enviada';
      if (!f.online) return f.seen ? 'Visto ' + ago(f.seen) : 'Desconectado';
      return f.play ? 'Jugando' : 'En línea';
    }

    function render() {
      const room=G.Social.room;
      $('fr-me').textContent=G.T('Online hall: invite any available player. Yellow squares mean in game.');
      $('fr-room').classList.toggle('hidden',!room);$('fr-create').hidden=!G.NAS?.enabled||!!room;
      const box=$('fr-list'),list=(G.Social.players||[]).slice().sort((a,b)=>Number(a.play)-Number(b.play)||a.name.localeCompare(b.name));
      // Preserve focused invite controls across presence updates.
      const existing=new Map([...box.children].map(el=>[el.dataset.uid,el]));const keep=new Set();
      if(!list.length){box.textContent=G.T('No other players online');return;}
      if(!box.children.length)box.replaceChildren();
      for(const f of list){const inRoom=room?.members.some(m=>m.uid===f.uid),key=JSON.stringify([f,inRoom,room?.open,room?.members.length]);let el=existing.get(f.uid);if(!el){el=document.createElement('div');el.className='fr-row';el.dataset.uid=f.uid;box.append(el);}keep.add(el);if(el.dataset.state===key)continue;el.dataset.state=key;el.replaceChildren();const dot=document.createElement('i');dot.className='dot '+(f.play?'play':'on');const name=document.createElement('button');name.className='btn small ghost';name.setAttribute('translate','no');name.textContent=f.name+(f.uid===G.Social.uid?' ('+G.T('Tú')+')':'');name.onclick=()=>G.ProfileUI.show(f.uid);const state=document.createElement('span');state.className='st';state.textContent=G.T(inRoom?'En tu sala':f.play?'Jugando':'En línea');const invite=document.createElement('button');invite.className='btn small gold hall-invite';invite.dataset.hallInvite=f.uid;invite.textContent=G.T('Invite to party');invite.disabled=!!(f.uid===G.Social.uid||f.play||inRoom||room&&(!room.open||room.members.length>=G.Social.MAX_PLAYERS));invite.onclick=async()=>{invite.disabled=true;const result=await G.Social.invite(f.uid);msg(result.msg||result.error,!result.ok);const latest=(G.Social.players||[]).find(p=>p.uid===f.uid),r=G.Social.room;invite.disabled=!latest||latest.play||!!r?.members.some(m=>m.uid===f.uid)||r?.open===false;if(!result.ok)await G.Social.refreshPresence();};el.append(dot,name,state,invite);}
      for(const el of existing.values())if(!keep.has(el))el.remove();
    }

    return { init, open, render };
  })();

  // ======================= SALA =======================

  G.LobbyUI = (() => {
    let membersKey = '';

    function init() {
      $('lobby-leave').onclick = async () => {
        await G.Social.leaveRoom();
        G.Net.close();
        G.MenuUI.open();
      };
      $('lobby-menu').onclick = () => G.MenuUI.open();
      $('lobby-start').onclick = start;
      $('lobby-ready').onclick=async()=>{const me=G.Social.room?.members.find(m=>m.uid===G.Social.uid);const r=await G.Social.setReady(!me?.ready);if(!r.ok)G.UI.toast(r.error);};
      $('lobby-start').dataset.sfx = 'confirm';
      // Conecta / desconecta la red al entrar o salir de una sala.
      G.Social.on(what => {
        const room = G.Social.room;
        if (room) {
          G.Net.open(room.id, room.isHost, room.host);
          G.Net.syncMembers(room.members.map(m => m.uid));
        } else if (G.Net.open_) G.Net.close();
        if (what === 'room-closed') {
          G.UI.toast('La sala se ha cerrado', 2600);
          if (G.UI.isOpen('scr-lobby')) G.MenuUI.open();
        }
        if (G.UI.isOpen('scr-lobby')) render();
      });
      G.Net.onPeer(() => { if (G.UI.isOpen('scr-lobby')) render(); });
      setInterval(()=>{if(G.NAS?.enabled&&G.UI.isOpen('scr-lobby'))render();},1000);
    }

    function open() {
      if (!G.Social.room) { G.MenuUI.open(); return; }
      G.Social.refreshMember();
      G.Social.refreshPresence();
      G.UI.show('scr-lobby', true);
      membersKey = '';
      render();
    }

    function close() { G.UI.hide('scr-lobby'); }

    function connText(m, room) {
      if (m.uid === room.host) return 'Anfitrión';
      if (!room.isHost) return m.uid === G.Social.uid ? 'Tú' : 'En la sala';
      const mode = G.Net.mode(m.uid);
      return mode === 'direct' ? (G.Net.route?.(m.uid)==='turn'?'已连接（Cloudflare TURN）':'Conectado') : mode === 'relay' ? 'Conectado (por servidor)' : mode === 'failed' ? 'No se pudo conectar (reintentando…)' : 'Conectando…';
    }

    function render() {
      const room = G.Social.room;
      if (!room) return;
      const ms = room.members;
      $('lobby-sub').textContent = room.isHost
        ? G.T('Invite available players from the hall')+' · '+ms.length+'/'+G.Social.MAX_PLAYERS
        : 'Estás en la sala de ' + ((ms.find(m => m.uid === room.host) || {}).name || '…') + '. El anfitrión empezará la partida.';

      // Las tarjetas sólo se rehacen si cambian los miembros (los sprites no parpadean).
      const key = G.Social.MAX_PLAYERS+':'+ms.map(m => m.uid + ':' + m.dex + ':' + (m.shiny ? 1 : 0)).join('|');
      const box = $('lobby-members');
      if (key !== membersKey) {
        membersKey = key;
        box.innerHTML = '';
        for (let i = 0; i < G.Social.MAX_PLAYERS; i++) {
          const m = ms[i];
          const c = document.createElement('div');
          c.className = 'lob-card' + (m ? '' : ' empty');
          if (m) {
            c.style.setProperty('--pc', G.Coop.COLORS[i]);
            c.appendChild(G.UI.spriteCanvas(m.dex, 120, 96, { scale: 2, lively: true, shiny: !!m.shiny }));
            c.insertAdjacentHTML('beforeend', `<b translate="no">${esc(m.name)}</b><small>${esc((G.DEX_BY[m.dex] || {}).name || '')}</small><span class="conn" data-u="${m.uid}"></span>`);
          } else c.innerHTML = '<span>Libre</span>';
          box.appendChild(c);
        }
      }
      box.querySelectorAll('.conn').forEach(el => {
        const m = ms.find(x => x.uid === el.dataset.u);
        if (!m) return;
        const t = (m.play?'■ '+G.T('Jugando')+' · ':'')+connText(m, room)+(G.NAS?.enabled?' · '+G.T(m.ready?'Preparado':'Sin preparar'):'');
        el.textContent = t;
        el.className = 'conn' + (m.play?' play':t === 'Conectando…' ? ' wait' : '');
      });

      // Invitar (sólo el anfitrión y si queda sitio).
      const canInvite = (G.NAS?.enabled||room.isHost) && room.open!==false && ms.length < G.Social.MAX_PLAYERS;
      $('lobby-inv-title').classList.toggle('hidden', !canInvite);
      const inv = $('lobby-invite');
      inv.classList.toggle('hidden', !canInvite);
      if(canInvite){inv.replaceChildren();const button=document.createElement('button');button.className='btn gold hall-invite';button.id='lobby-open-hall';button.textContent=G.T('Open hall and invite players');button.onclick=()=>G.FriendsUI.open();inv.append(button);}

      let recovery=$('lobby-network-recovery');if(!recovery){recovery=document.createElement('div');recovery.id='lobby-network-recovery';recovery.setAttribute('role','status');$('lobby-note').after(recovery);}
      if(G.NAS?.enabled){const targets=ms.filter(m=>m.uid!==G.Net.uid&&(room.isHost||m.uid===room.host)).map(m=>({m,info:G.Net.linkInfo?.(m.uid)})).filter(o=>o.info&&o.info.mode!=='direct'),key=room.id+targets.map(({m,info})=>m.uid+info.phase+info.reason+info.mode).join('|');
        if(recovery.dataset.state!==key){recovery.dataset.state=key;recovery.replaceChildren();for(const {m,info}of targets){const text=document.createElement('p');text.dataset.rtcStatus=m.uid;recovery.append(text);if(info.mode==='failed'){const retry=document.createElement('button');retry.id='rtc-retry-'+m.uid;retry.className='btn gold';retry.dataset.rtcRetry=m.uid;retry.textContent=G.T('Retry connection');retry.onclick=()=>{G.Net.retry(m.uid);render();};recovery.append(retry);}}if(targets.some(o=>o.info.mode==='failed')){const all=document.createElement('button');all.id='lobby-retry-all';all.className='btn gold';all.textContent=G.T('Retry all connections');all.onclick=()=>{G.Net.retry();render();};recovery.append(all);}}
        for(const {m,info}of targets){const text=[...recovery.querySelectorAll('[data-rtc-status]')].find(n=>n.dataset.rtcStatus===m.uid);if(text)text.textContent=m.name+'：'+G.T('Connection '+info.phase)+(info.remainingMs?' · '+Math.ceil(info.remainingMs/1000)+'s':'')+' · '+G.T('Connection '+info.reason);}}

      const btn = $('lobby-start');
      btn.classList.toggle('hidden', !room.isHost);
      const connecting = ms.some(m => m.uid !== room.host && G.Net.mode(m.uid) === 'connecting');
      const failed = ms.some(m => m.uid !== room.host && G.Net.mode(m.uid) === 'failed');
      const allReady=!G.NAS?.enabled||ms.every(m=>m.ready&&m.connected!==false);btn.disabled = !room.isHost || ms.length < 2 || connecting || failed||!allReady;
      const ready=$('lobby-ready');ready.hidden=!G.NAS?.enabled;ready.textContent=G.T(ms.find(m=>m.uid===G.Social.uid)?.ready?'Cancelar preparación':'Prepararse');
      let transfer=$('lobby-transfer');if(!transfer){transfer=document.createElement('div');transfer.id='lobby-transfer';$('lobby-members').after(transfer);}transfer.replaceChildren();if(G.NAS?.enabled&&room.isHost)for(const m of ms.filter(m=>m.uid!==room.host&&m.connected!==false)){const b=document.createElement('button');b.className='btn small';b.dataset.hostTransfer=m.uid;b.textContent=G.T('Transferir anfitrión')+' → '+m.name;b.onclick=async()=>{const r=await G.Social.transferHost(m.uid);if(!r.ok)G.UI.toast(r.error);};transfer.appendChild(b);}
      btn.textContent = 'Empezar partida (' + ms.length + '/' + G.Social.MAX_PLAYERS + ')';
      $('lobby-note').textContent = !room.isHost ? 'Cuando el anfitrión empiece, entraréis todos a la vez.'
        : ms.length < 2 ? G.T('Invite at least one teammate from the hall.')
        : failed ? G.T('Connection failed. Retry, transfer the lobby host or leave; no NAS gameplay relay is used.')
        : !allReady?'Todos deben prepararse antes de empezar.': connecting ? G.T('Connecting teammates…') : 'La partida empieza para todos a la vez.';
    }

    async function start() {
      const room = G.Social.room;
      if (!room || !room.isHost || room.members.length < 2) return;
      if(G.NAS?.enabled&&room.members.some(m=>m.uid!==room.host&&G.Net.mode(m.uid)!=='direct')){G.UI.toast('等待所有玩家建立 WebRTC 直连或 TURN 备用连接后再开始。',5000);return;}
      const cfg = {
        k: 'start', seed: Math.floor(Math.random() * 1e6), host: room.host,
        members: room.members.map(m => ({ uid: m.uid, name: m.name, dex: m.dex, shiny: !!m.shiny }))
      };
      const opened = await G.Social.setOpen(false);
      if (opened && opened.ok === false) { G.UI.toast(opened.error); return; }
      const current=G.Social.room;if(G.NAS?.enabled&&current){cfg.host=current.host;cfg.members=current.members;cfg.experiment=current.experiment===true;}
      if(G.NAS?.enabled&&!(await G.NAS.prepareRun(cfg))){await G.Social.setOpen(true);return;}
      G.Net.broadcast(cfg);
      G.Flow.startCoop(cfg);
    }

    return { init, open, close, render };
  })();

  // ======================= INVITACIONES =======================

  G.InvitePop = (() => {
    let cur = null;

    function init() {
      $('inv-yes').onclick = async () => {
        if (!cur) return;
        const from = cur.from;
        hide();
        const r = await G.Social.acceptInvite(from);
        if (!r.ok) { G.UI.toast(r.error, 3000); return; }
        G.LobbyUI.open();
      };
      $('inv-no').onclick = () => { if (cur) G.Social.declineInvite(cur.from); hide(); };
      G.Social.on(what => { if (what === 'invites' || what === 'room') refresh(); });
    }

    function hide() { cur = null; $('invite-pop').classList.add('hidden');delete $('invite-pop').dataset.uiLayer; }

    /** Enseña la invitación más antigua si estás en los menús (no en plena partida). */
    function refresh() {
      const room = G.Social.room;
      const list = G.Social.invites.filter(i => !room || i.room !== room.id).sort((a, b) => a.at - b.at);
      if (!list.length || G.Game.state !== 'ui' || !G.DB.loggedIn) { hide(); return; }
      if (cur && cur.from === list[0].from) return;
      cur = list[0];
      $('inv-text').innerHTML = `${G.Icons.html('friends', 22)} <b class="gold" translate="no">${esc(cur.name)}</b> te invita a jugar en su sala`;
      $('invite-pop').classList.remove('hidden');$('invite-pop').dataset.uiLayer='';$('inv-yes').focus({preventScroll:true});
      G.Audio.sfx('shiny');
    }

    return { init, refresh };
  })();

  G.SocialUI = {
    init() { G.NickUI.init(); G.FriendsUI.init(); G.LobbyUI.init(); G.InvitePop.init(); },
    withNick, needOnline
  };
})();
