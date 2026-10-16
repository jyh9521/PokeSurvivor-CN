/* ============ ranking-ui.js — pantalla del ranking ============
 * Pestañas Solo / Grupo, periodo (diario ... histórico), todos o sólo amigos,
 * filtro por Pokémon (sólo en el histórico) y tu puesto abajo aunque no salgas
 * en el top. Lo leído se guarda 30 min (ver ranking.js).
 */
G.RankingUI = (() => {
  const $ = G.UI.$;
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  let mode = 's', period = 'w', scope = 'all', dex = null;
  let token = 0, silentBusy=false, quietUntil=0,challengeDate='',challengeData=null;
  const cycle=G.ChallengeCycle.create({visible:()=>mode==='c'&&!challengeDate&&!document.hidden&&G.UI.isOpen('scr-rank'),expired:()=>load(true)});

  function init() {
    // A refresh must not replace a control between pointer down/up or during navigation.
    for(const type of ['pointerdown','pointerup','wheel','keydown','focusin','input','compositionstart','compositionend'])
      $('scr-rank').addEventListener(type,()=>{quietUntil=performance.now()+750;},{passive:true});
    $('rk-date').onchange=()=>{challengeDate=$('rk-date').value;load();};
    const shift=direction=>{if(!challengeData)return;const at=challengeData.challenge.start+direction*(period==='w'?7:1)*86400000;challengeDate=new Date(at).toISOString().slice(0,10);load();};
    $('rk-prev').onclick=()=>shift(-1);$('rk-next').onclick=()=>shift(1);$('rk-current').onclick=()=>{challengeDate='';load();};
    $('rk-claim').onclick=async()=>{if(!challengeData)return;const b=$('rk-claim');b.disabled=true;try{await G.NAS.claimChallenge(challengeData.challenge.period,new Date(challengeData.challenge.start).toISOString().slice(0,10));G.UI.toast(G.T('Premios guardados en NAS.'));await load();}catch(e){G.UI.toast(e.message,5000);load(true);}};
    document.addEventListener('visibilitychange',()=>{if(!document.hidden)cycle.check();});
    const dl = $('rk-dl');
    dl.innerHTML = G.DEX.map(p => `<option value="${esc(G.T(p.name))}">`).join('');
    $('rk-poke').onchange = () => {
      const v = $('rk-poke').value.trim().toLowerCase();
      const p = G.DEX.find(x => x.name.toLowerCase() === v || G.T(x.name).toLowerCase() === v);
      if (!v) { setDex(null); return; }
      if (!p) { G.UI.toast('No hay ningún Pokémon con ese nombre'); return; }
      setDex(p.dex);
    };
    $('rk-clear').onclick = () => { $('rk-poke').value = ''; setDex(null); };
    $('rk-mod').onclick = () => G.ModUI.open();
  }

  /** El filtro por Pokémon sólo existe en el histórico: al elegir uno se pasa a esa pestaña. */
  function setDex(d) {
    dex = d;
    if (d && period !== 'a') period = 'a';
    $('rk-clear').classList.toggle('hidden', !d);
    tabs(); load();
  }

  function open(nextMode,nextPeriod) {
    if(nextMode==='c'){mode='c';period=nextPeriod==='w'?'w':'d';challengeDate='';}
    if (!G.SocialUI.needOnline()) return;
    G.UI.show('scr-rank', true);
    if (!G.Social.started) G.Social.start();
    $('rk-mod').classList.toggle('hidden', !G.Ranking.isAdmin());
    tabs();
    load();
  }

  function tabs() {
    const mk = (box, items, cur, set, cls) => {
      box.innerHTML = '';
      for (const [k, label] of items) {
        const b = document.createElement('button');
        b.dataset.value=k;b.className = cls + (k === cur ? ' on' : '');
        b.innerHTML = label;
        b.onclick = () => { set(k); tabs(); load(); };
        box.appendChild(b);
      }
    };
    const modes=[['s', `<b>${G.Icons.html('user',16)} Solo</b>`],['g', `<b>${G.Icons.html('friends',16)} Grupo</b>`]];
    if(G.NAS?.enabled)modes.push(['c',`<b>${G.T('Desafío')}</b>`]);
    mk($('rk-mode'),modes,mode,k=>{mode=k;challengeDate='';cycle.stop();if(k==='c'&&!['d','w'].includes(period))period='d';},'gen-tab');
    mk($('rk-period'),mode==='c'?G.Ranking.PERIODS.filter(([p])=>['d','w'].includes(p)):G.Ranking.PERIODS,period,k=>{
      period=k;challengeDate='';if(k!=='a'&&dex){dex=null;$('rk-poke').value='';$('rk-clear').classList.add('hidden');}
    },'chip');
    $('rk-challenge-controls').classList.toggle('hidden',mode!=='c');$('rk-poke').classList.toggle('hidden',mode==='c');$('rk-clear').classList.toggle('hidden',mode==='c'||!dex);
    scope='all';$('rk-scope').replaceChildren();
  }

  const fmt = t => t >= 3600 ? Math.floor(t / 3600) + ':' + G.U.mmss(t % 3600).padStart(5, '0') : G.U.mmss(t);

  async function load(silent=false) {
    if(silent&&(silentBusy||G.Dialog?.open||performance.now()<quietUntil))return;
    if(silent)silentBusy=true;
    const my = ++token;if(mode==='c')$('rk-claim').disabled=true;
    const list = $('rk-list');
    if(!silent){list.innerHTML = '<p class="sub">Cargando…</p>';$('rk-me').innerHTML = '';}
    let rows = [], me = null;
    try {
      if(mode==='c'){
        const data=await G.Ranking.challenge(period,challengeDate,scope==='friends');if(my!==token)return;
        rows=data.rows;me=data.mine;challengeData=data;
        const c=data.challenge,start=new Date(c.start).toISOString().slice(0,10),end=new Date(c.end-86400000).toISOString().slice(0,10);
        if(document.activeElement!==$('rk-date'))$('rk-date').value=start;
        $('rk-date').max=new Date(data.serverNow).toISOString().slice(0,10);$('rk-date').setAttribute('aria-label',G.T(period==='w'?'Ciclo del desafío':'Fecha del desafío'));
        $('rk-challenge-range').textContent='UTC '+start+(period==='w'?' → '+end:'');$('rk-next').disabled=c.end>data.serverNow;
        $('rk-claim').disabled=!data.rewards.tiers.some(t=>t.eligible&&!t.claimed);
        if(!challengeDate)cycle.configure(c.end,data.serverNow);else cycle.stop();
      }else{
      [rows, me] = await Promise.all([
        G.Ranking.top(mode, period, dex, scope === 'friends'),
        G.Social.me ? G.Ranking.myRank(mode, period, dex) : Promise.resolve(null)
      ]);
      }
    } catch (e) {
      if (my !== token || silent) return;
      list.innerHTML = '<p class="sub">No se pudo cargar el ranking (' + esc(e.code || e.message) + ').</p>';
      return;
    } finally {if(silent)silentBusy=false;}
    if (my !== token || (silent&&(performance.now()<quietUntil||!G.UI.isOpen('scr-rank')||G.Dialog?.open||G.UI.isOpen('scr-profile')))) return;
    const active=document.activeElement,top=list.scrollTop;
    const focused=active?.closest('.rk-row');
    if(silent&&focused&&list.contains(focused)&&!rows.some(r=>r.id===focused.dataset.rowKey))return;
    const anchor=[...list.children].find(el=>el.getBoundingClientRect().bottom>list.getBoundingClientRect().top);
    const anchorKey=anchor?.dataset.rowKey,offset=anchor?.getBoundingClientRect().top;
    const existing=new Map([...list.children].map(el=>[el.dataset.rowKey,el]));
    if(!silent)list.innerHTML = '';
    if (!rows.length) {
      list.innerHTML = '<p class="sub">Todavía no hay marcas aquí. ¡Sé el primero!</p>';
    }
    const uid = G.Social.uid;
    const b = G.Ranking.board(mode, period, mode==='c'?challengeDate:dex), done = G.Ranking.reported();
    const keep=new Set();
    rows.forEach((r,i)=>{
      const key=r.id,signature=JSON.stringify([r,i,done.has(b+'__'+r.id)]);let el=silent&&existing.get(key);
      if(!el|| (el.dataset.signature!==signature&&!el.contains(active))){const next=rowEl(r,i+1,r.uids.includes(uid),b,done);if(el)el.replaceWith(next);el=next;el.dataset.signature=signature;}
      el.dataset.rowKey=key;keep.add(el);if(list.children[i]!==el)list.insertBefore(el,list.children[i]||null);
    });
    if(silent){for(const el of existing.values())if(!keep.has(el))el.remove();
      if(active?.isConnected&&document.activeElement!==active)active.focus({preventScroll:true});
      list.scrollTop=top;const next=[...list.children].find(el=>el.dataset.rowKey===anchorKey);
      if(next&&offset!=null)list.scrollTop+=next.getBoundingClientRect().top-offset;
    }

    if(mode==='c'){$('rk-me').textContent=G.T('Desafío')+' · '+$('rk-challenge-range').textContent+' · '+(me?G.T('Tu mejor puesto')+': #'+me.pos+' · '+fmt(me.t):G.T('Aún no hay resultados.'));return;}

    // La frase se monta en cada idioma (traducirla por trozos sale rara).
    if (G.I18n.lang === 'zh-CN') {
      const when = { d: '今天', w: '本周', m: '本月', y: '今年', a: '历史' }[period];
      const where = (mode === 's' ? '单人' : '多人') + (dex ? ' · ' + G.T(G.DEX_BY[dex].name) : '');
      $('rk-me').innerHTML = !G.Social.me ? G.T('Elige un apodo (en Amigos) para salir en el ranking.')
        : me && me.out ? `你尚未进入${when}${where}前 50 名。完整名次请查看历史排行榜。`
        : me ? `${when}${where}最佳名次：<b class="gold">#${me.pos}</b> · ${fmt(me.t)}`
        : `尚无${when}${where}记录。`;
      return;
    }
    const en = G.I18n.lang === 'en';
    const pn = en ? { d: 'today', w: 'this week', m: 'this month', y: 'this year', a: 'of all time' }[period]
                  : { d: 'de hoy', w: 'de esta semana', m: 'de este mes', y: 'de este año', a: 'de siempre' }[period];
    const mon = dex ? G.DEX_BY[dex].name : '';
    const where = en ? (mode === 's' ? 'solo' : 'group') + (dex ? ' with ' + mon : '')
                     : (mode === 's' ? 'en solitario' : 'en grupo') + (dex ? ' con ' + mon : '');
    $('rk-me').innerHTML = !G.Social.me ? 'Elige un apodo (en Amigos) para salir en el ranking.'
      : me && me.out ? (en ? `<span translate="no">You're not in the top 50 ${where} ${pn} yet. Your exact rank is in All-time.</span>`
                           : `Aún no estás en el top 50 ${pn} ${where}. Tu puesto exacto está en Histórico.`)
      : me ? (en ? `<span translate="no">Your best ${where} rank ${pn}: <b class="gold">#${me.pos}</b> · ${fmt(me.t)}</span>`
                 : `Tu mejor puesto ${pn} ${where}: <b class="gold">#${me.pos}</b> · ${fmt(me.t)}`)
      : (en ? `<span translate="no">You don't have a ${where} record ${pn} yet.</span>` : `Aún no tienes marca ${pn} ${where}.`);
  }

  function rowEl(r, pos, mine, b, done) {
    const el = document.createElement('div');
    el.className = 'rk-row' + (mine ? ' mine' : '') + (pos <= 3 ? ' top' + pos : '');
    el.insertAdjacentHTML('beforeend', `<span class="pos">${pos <= 3 ? G.Icons.html('trophy', 20) : ''}${pos}</span>`);
    const mons = document.createElement('span');
    mons.className = 'mons';
    r.dex.forEach((d, i) => { if (G.DEX_BY[d]) mons.appendChild(G.UI.spriteCanvas(d, 44, 40, { scale: 1, shiny: !!r.shiny[i] })); });
    el.appendChild(mons);
    el.insertAdjacentHTML('beforeend',
      `<span class="who"><b translate="no">${r.names.map((n, i) => `<a href="#" class="plink" data-u="${esc(r.uids[i] || '')}">${esc(n)}</a>${Array.isArray(r.online)?` <small class="rank-presence ${r.playing?.[i]?'play':''}" data-presence-uid="${esc(r.uids[i])}" style="display:inline;color:${r.online[i]?'#7ee07a':'#a8b4c8'}">${r.playing?.[i]?'■ '+G.T('Jugando'):G.T(r.online[i]?'En línea':'Desconectado')}</small>`:''}`).join(' · ')}</b><small>Nv. ${r.lv || 1} · ${(r.kills || 0).toLocaleString(G.I18n.lang === 'zh-CN' ? 'zh-CN' : 'es')} derrotados</small></span>
       <span class="time">${fmt(r.t)}</span>`);
    el.querySelectorAll('.plink').forEach(a => { a.onclick = e => { e.preventDefault(); G.ProfileUI.show(a.dataset.u); }; });
    // Reportar una marca sospechosa (no la tuya). Lo revisa el admin (mod-ui.js).
    if (!mine && G.Social.me) {
      const rep = document.createElement('button');
      const sent = done.has(b + '__' + r.id);
      rep.className = 'rk-rep' + (sent ? ' sent' : '');
      rep.title = sent ? 'Ya la has reportado' : 'Reportar marca sospechosa';
      rep.innerHTML = G.Icons.html('flag', 16);
      rep.onclick = async () => {
        if (rep.classList.contains('sent')) { G.UI.toast('Ya has reportado esta marca'); return; }
        if (!(await G.Dialog.confirm('¿Reportar la marca de ' + r.names.join(', ') + ' como trampa?'))) return;
        rep.classList.add('sent'); rep.title = 'Ya la has reportado';
        await G.Ranking.report(b, r);
        G.UI.toast('Gracias: la revisaremos');
      };
      el.appendChild(rep);
    } else el.appendChild(document.createElement('span'));
    return el;
  }

  setInterval(()=>{if(G.NAS?.enabled&&G.DB.online&&!document.hidden&&G.UI.isOpen('scr-rank')&&!G.UI.isOpen('scr-profile'))load(true);},10000);
  return { init, open, refresh:()=>load(true) };
})();
