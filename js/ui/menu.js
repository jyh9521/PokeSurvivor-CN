/* ============ menu.js — menú principal, colección y mejoras ============ */
G.MenuUI = (() => {
  const $ = G.UI.$;
  const GEN_NAMES = ['Kanto', 'Johto', 'Hoenn', 'Sinnoh', 'Teselia', 'Kalos', 'Alola', 'Galar', 'Paldea'];
  let dexGen=0,dexSel=null,dexOwned='all',dexType='all',dexRarity='all',dexQuery='',dexObserver=null;
  const searchCache=new Map();

  function init() {
    const ICON = { play: 'ball', dex: 'book', upgrades: 'up', gacha: 'ball4', goals: 'medal3', friends: 'friends', rank: 'trophy', settings: 'gear' };
    document.querySelectorAll('#scr-menu [data-go]').forEach(b => {
      b.insertAdjacentHTML('afterbegin', `<span class="mi-ico">${G.Icons.html(ICON[b.dataset.go], 26)}</span>`);
      if (G.LOCAL_ONLY && ['friends', 'rank'].includes(b.dataset.go)) b.classList.add('hidden');
      b.dataset.sfx = b.dataset.go === 'play' ? 'confirm' : 'click';
      b.onclick = () => {
        const go = b.dataset.go;
        if (go === 'play') { if (G.Social.room) G.LobbyUI.open(); else G.Flow.play(); }
        else if (go === 'dex') openDex();
        else if (go === 'upgrades') openUpgrades();
        else if (go === 'gacha') G.GachaUI.open();
        else if (go === 'goals') G.GoalsUI.open();
        else if (go === 'friends') G.FriendsUI.open();
        else if (go === 'rank') G.RankingUI.open();
        else if (go === 'settings') G.SettingsUI.open();
      };
    });
    document.querySelectorAll('[data-back]').forEach(b => { b.onclick = open; });
    G.Social.on(() => { if (G.UI.isOpen('scr-menu')) socialLine(); });
    $('btn-logout').onclick = async () => {
      if (G.DB.guest && !(await G.Dialog.confirm('Eres invitado: se perderá todo el progreso. ¿Salir?'))) return;
      G.Audio.music(null);
      G.DB.logout().then(r => { if (r !== false) G.Flow.toLogin(); });
    };
  }

  // ---------------- menú principal ----------------

  function open() {
    const s = G.DB.save;
    const mon = G.DEX_BY[s.partner];
    const shiny = !!s.partnerShiny && G.DB.ownsShiny(mon.dex);
    G.UI.chrome(true);
    G.UI.show('scr-menu');
    G.UI.sprite($('menu-partner'), mon.dex, { lively: true, scale: 4, hero: true, shiny });
    $('menu-partner').style.setProperty('--stage-c', shiny ? '#9ae6ff' : G.U.TYPE_COLOR[mon.types[0]]);
    $('menu-partner').classList.toggle('shiny', shiny);
    $('menu-partner-name').innerHTML = mon.name + (shiny ? ' ' + G.Icons.html('shiny', 24) : '');
    $('menu-partner-info').innerHTML = G.UI.typeChips(mon.types) + ' ' + G.UI.stars(mon.rarity);
    // Normal / shiny a mano, aquí mismo (en el móvil no se encontraba en la ficha).
    const seg = $('menu-shiny');
    seg.classList.toggle('hidden', !G.DB.ownsShiny(mon.dex));
    seg.lastChild.innerHTML = G.Icons.html('shiny', 12) + ' Shiny';
    seg.querySelectorAll('button').forEach(b => {
      b.classList.toggle('on', (b.dataset.v === '1') === shiny);
      b.onclick = () => {
        if ((b.dataset.v === '1') === shiny) return;
        s.partnerShiny = b.dataset.v === '1';
        G.DB.commit();
        G.Audio.sfx('confirm');
        open();
      };
    });

    const owned = Object.keys(s.owned).filter(d => G.DEX_BY[d]).length;
    const shinies = Object.keys(s.shiny || {}).length;
    $('menu-dex-count').textContent = `${owned} / ${G.DEX.length}` + (shinies ? ` · ${shinies} shiny` : '');

    const st = s.stats;
    $('menu-stats').innerHTML =
      `Runs <b style="color:#fff">${st.runs}</b> · Mejor tiempo <b style="color:#fff">${G.U.mmss(st.bestTime)}</b><br>` +
      `Mejor nivel <b style="color:#fff">${st.bestLevel}</b> · Derrotados <b style="color:#fff">${st.totalKills.toLocaleString(G.I18n.lang === 'zh-CN' ? 'zh-CN' : 'es')}</b>` +
      (G.DB.guest ? '<br><span style="color:#ffb0b8">Modo invitado: no se guarda</span>' : '');

    socialLine();
    // Premios de misiones por recoger.
    G.Progress.checkAch();
    const pend = G.Progress.pending();
    $('menu-goals-sub').textContent = pend ? pend + (pend === 1 ? ' premio por recoger' : ' premios por recoger') : 'Misiones, logros y perfil';
    $('menu-goals-sub').classList.toggle('gold', pend > 0);
    // Con cuenta en la nube: amigos en línea, invitaciones y (una vez) el apodo.
    if (G.DB.online && !G.Social.started) {
      G.Social.start().then(r => {
        if (r === 'need-nick' && !G.NickUI.skipped && G.UI.isOpen('scr-menu')) G.NickUI.open();
        socialLine();
      });
    }
    G.InvitePop.refresh();G.ChallengeUI?.availability();
  }

  /** Texto bajo "Amigos" y "Jugar": quién está en línea, solicitudes, sala. */
  function socialLine() {
    const room = G.Social.room;
    const play = document.querySelector('#scr-menu [data-go=play] small');
    if (play) play.textContent = room ? 'Volver a tu sala (' + room.members.length + '/' + G.Social.MAX_PLAYERS + ')' : 'Entra en la mazmorra';
    const fr = G.Social.friends;
    const on = fr.filter(f => f.status === 'ok' && f.online).length;
    const req = fr.filter(f => f.status === 'in').length;
    const parts = [];
    if (on) parts.push(on + ' en línea');
    if (req) parts.push(req + (req === 1 ? ' solicitud' : ' solicitudes'));
    $('menu-friends-sub').textContent = parts.length ? parts.join(' · ') : 'Juega en grupo, hasta 4';
    $('menu-friends-sub').classList.toggle('gold', req > 0);
  }

  // ---------------- colección ----------------

  function openDex() {
    G.UI.show('scr-dex', true);
    const s = G.DB.save;
    if(dexSel==null)dexSel=s.partner;
    const owned = Object.keys(s.owned).filter(d => G.DEX_BY[d]).length;
    $('dex-total').textContent = `${owned} / ${G.DEX.length}`;

    // Pestañas de generación, con cuántos tienes de cada una.
    const tabs = $('dex-gens');
    tabs.innerHTML = '';
    const all=document.createElement('button');all.className='gen-tab'+(dexGen===0?' on':'');all.dataset.gen='0';all.innerHTML='<b>'+G.T('Todos')+'</b><small>'+owned+'/'+G.DEX.length+'</small>';all.onclick=()=>{dexGen=0;openDex();};tabs.appendChild(all);
    GEN_NAMES.forEach((name, i) => {
      const g = i + 1;
      const total = G.DEX.filter(p => p.gen === g).length;
      const have = G.DEX.filter(p => p.gen === g && s.owned[p.dex]).length;
      const b = document.createElement('button');
      b.className = 'gen-tab' + (g === dexGen ? ' on' : '');b.dataset.gen=String(g);
      b.innerHTML = `<b>${name}</b><small>${have}/${total}</small>`;
      b.onclick = () => { dexGen = g; openDex(); };
      tabs.appendChild(b);
    });

    const fb=$('dex-filters');fb.replaceChildren();
    const reset=document.createElement('button');reset.className='chip';reset.id='dex-reset';reset.textContent=G.T('Todos');reset.onclick=()=>{dexOwned=dexType=dexRarity='all';dexQuery='';openDex();};fb.appendChild(reset);
    function filter(id,title,options,value,change){const label=document.createElement('label');label.className='dex-filter-label';const name=document.createElement('span');name.textContent=G.T(title);label.appendChild(name);const select=document.createElement('select');select.id=id;select.setAttribute('aria-label',G.T(title));for(const [v,n]of options){const o=document.createElement('option');o.value=v;o.textContent=G.T(n);select.appendChild(o);}select.value=value;select.onchange=()=>{change(select.value);renderGrid();};label.appendChild(select);fb.appendChild(label);}
    filter('dex-owned','Acquisition',[['all','Todos'],['own','Tengo'],['miss','Me faltan']],dexOwned,v=>dexOwned=v);
    filter('dex-type','Type',[['all','Todos'],...Object.keys(G.U.TYPE_COLOR).filter(t=>t!=='aura').map(t=>[t,G.U.TYPE_NAME[t]])],dexType,v=>dexType=v);
    filter('dex-rarity','Rarity',[['all','Todos'],['shiny','Shiny'],...[5,4,3,2,1].map(r=>[String(r),G.Gacha.RARITY_NAME[r]])],dexRarity,v=>dexRarity=v);
    const search=document.createElement('input');search.id='dex-search';search.type='search';search.maxLength=180;search.placeholder=G.T('Search all Pokémon fields');search.setAttribute('aria-label',G.T('Search all Pokémon fields'));search.value=dexQuery;let timer;search.oninput=()=>{dexQuery=search.value;clearTimeout(timer);timer=setTimeout(renderGrid,90);};fb.appendChild(search);
    const count=document.createElement('span');count.id='dex-results';count.className='sub';count.setAttribute('aria-live','polite');fb.appendChild(count);
    renderGrid();
    showDetail(dexSel);
  }

  function renderGrid() {
    const s = G.DB.save;
    const grid = $('dex-grid');
    dexObserver?.disconnect();grid.innerHTML='';
    dexObserver=typeof IntersectionObserver==='function'?new IntersectionObserver(entries=>{for(const e of entries)if(e.isIntersecting){e.target._loadDex?.();dexObserver.unobserve(e.target);}},{rootMargin:'160px'}):null;
    let visible=0;
    for (const p of G.DEX) {
      const own=!!s.owned[p.dex],sh=!!s.shiny?.[p.dex];
      if(!searchCache.has(p.dex)){const extra=[G.T(p.name),...p.types.map(t=>G.T(G.U.TYPE_NAME[t])),G.T(G.Gacha.RARITY_NAME[p.rarity]),...G.Moves.poolFor(p).map(id=>G.T(G.Moves.BY_ID[id].name,'move'))].join(' ');searchCache.set(p.dex,G.BattleRules.searchText(p,G.BattleDex,extra));}
      const text=searchCache.get(p.dex)+' '+G.T(own?'Tengo':'Me faltan')+(sh?' shiny '+G.T('Shiny'):'');
      if(!G.BattleRules.matches(p,s,{gen:dexGen,owned:dexOwned,type:dexType,rarity:dexRarity,query:dexQuery},text))continue;
      visible++;
      const cell = document.createElement('div');
      cell.dataset.dex=String(p.dex);
      cell.className = 'cell' + (own ? '' : ' locked') + (p.dex === dexSel ? ' on' : '');
      cell.insertAdjacentHTML('beforeend', `<span class="no">${String(p.dex).padStart(3, '0')}</span>`);
      if (p.dex === s.partner) cell.insertAdjacentHTML('beforeend', `<span class="badge-r" title="Compañero">${G.Icons.html('crown', 14)}</span>`);
      else if (sh) cell.insertAdjacentHTML('beforeend', `<span class="badge-r" title="Tienes su shiny">${G.Icons.html('shiny', 12)}</span>`);
      const useShiny = sh && p.dex === s.partner && s.partnerShiny;
      const canvas=document.createElement('canvas');canvas.width=92;canvas.height=80;canvas._loadDex=()=>{G.UI.sprite(canvas,p.dex,{scale:2,silhouette:!own,shadow:own,shiny:useShiny});canvas._loadDex=null;};cell.appendChild(canvas);if(dexObserver)dexObserver.observe(canvas);else canvas._loadDex();
      cell.insertAdjacentHTML('beforeend', `<b>${own ? p.name : '???'}</b>${G.UI.stars(p.rarity, 9)}`);
      cell.onclick = () => {
        dexSel = p.dex;
        grid.querySelectorAll('.cell').forEach(c => c.classList.remove('on'));
        cell.classList.add('on');
        showDetail(p.dex);
      };
      grid.appendChild(cell);
    }
    $('dex-results').textContent=visible+' / '+G.DEX.length;
    if (!grid.children.length) grid.innerHTML = '<p class="sub" style="grid-column:1/-1">Ninguno con este filtro.</p>';
  }

  // Variante que se está viendo en la ficha (normal o shiny).
  let viewShiny = false;

  function showDetail(dex) {
    const s = G.DB.save;
    const p = G.DEX_BY[dex];
    const own = !!s.owned[dex];
    const hasSh = G.DB.ownsShiny(dex);
    const isPartner = dex === s.partner;
    if (!hasSh) viewShiny = false;
    else if (isPartner && dex !== showDetail.last) viewShiny = !!s.partnerShiny;
    showDetail.last = dex;

    const stats=G.BattleRules.stats(p,G.BattleDex),trait=G.BattleRules.trait(p,G.BattleDex);
    const usingThis = isPartner && (!hasSh || !!s.partnerShiny === viewShiny);

    const box = $('dex-detail');
    box.innerHTML = `
      <canvas id="dex-big" class="stage" width="220" height="190"></canvas>
      ${hasSh ? `<div class="seg">
          <button class="${viewShiny ? '' : 'on'}" data-v="0">${G.T('Normal', 'form')}</button>
          <button class="${viewShiny ? 'on' : ''}" data-v="1">${G.Icons.html('shiny', 12)} Shiny</button></div>` : ''}
      <div class="center">
        <div style="color:var(--muted);font-size:13px">Nº ${String(p.dex).padStart(3, '0')} · ${GEN_NAMES[p.gen - 1]}</div>
        <h3>${own ? p.name : '???'}</h3>
        <div style="color:${G.Gacha.RARITY_COLOR[p.rarity]}">${G.UI.stars(p.rarity, 24)} ${G.Gacha.RARITY_NAME[p.rarity]}</div>
        <div style="margin:6px 0">${own ? G.UI.typeChips(p.types) : ''}</div>
      </div>
      ${own ? `
        ${G.StatRadar.html(stats,G.T)}
        ${p.spriteForm?`<p class="sub center sprite-form">${G.T(p.spriteForm)}</p>`:''}
        <p class="trait-description"><b>${G.T('Species trait')}: ${trait.source?.[G.I18n.lang==='zh-CN'?'zh':G.I18n.lang==='es'?'es':'en']||G.T(trait.title)}</b><br>${G.T('Survivor adaptation')}: ${G.T(trait.desc)}</p>
        <p class="sub">${G.T('Battle role')}: ${G.T(G.BattleRules.role(p,G.BattleDex))} · ${G.T('Special forms')}: ${G.BattleDex.species[p.dex]?.mega.length?'Mega / ':''}Z / ${G.T('Dynamax')}</p>
        <p style="font-size:14px;margin:10px 0 4px">Empieza con <b class="gold">${G.T(G.Moves.BY_ID[G.startMoveOf(dex)].name, 'move')}</b><br><small>${G.T(G.Moves.BY_ID[G.startMoveOf(dex)].damageClass==='physical'?'Physical · scales with Attack':'Special · scales with Special Attack')}</small></p>
        <p class="move-icons" title="Movimientos que puede aprender">
          ${G.Moves.poolFor(p).map(id => `<span title="${G.T(G.Moves.BY_ID[id].name, 'move')}">${G.Icons.html('move:' + id, 16)}</span>`).join('')}</p>
        ${usingThis
          ? '<button class="btn grow" disabled style="width:100%">Es tu compañero</button>'
          : `<button id="dex-pick" class="btn gold" data-sfx="confirm" style="width:100%">Elegir de compañero${viewShiny ? ' (shiny)' : ''}</button>`}
      ` : `<p class="center" style="color:var(--muted)">Aún no lo tienes.<br>Consíguelo en el banner de <b class="gold">${GEN_NAMES[p.gen - 1]}</b>
            o derrotándolo cuando salga shiny.</p>`}
    `;
    $('dex-big').style.setProperty('--stage-c', !own ? '#5b83d6' : viewShiny ? '#9ae6ff' : G.U.TYPE_COLOR[p.types[0]]);
    $('dex-big').classList.toggle('shiny', own && viewShiny);
    G.UI.sprite($('dex-big'), dex, { lively: own, spin: own, silhouette: !own, scale: 3, hero: true, shiny: own && viewShiny });
    box.querySelectorAll('.seg button').forEach(b => {
      b.onclick = () => { viewShiny = b.dataset.v === '1'; showDetail(dex); };
    });
    const pick = $('dex-pick');
    if (pick) pick.onclick = () => {
      s.partner = dex;
      s.partnerShiny = hasSh && viewShiny;
      G.DB.commit();
      G.UI.toast(p.name + (s.partnerShiny ? ' shiny' : '') + ' es ahora tu compañero');
      renderGrid(); showDetail(dex);
    };
  }

  // ---------------- mejoras ----------------

  let upgDex = null,upgradeBusy=false;

  function openUpgrades() {
    G.UI.show('scr-upgrades', true);
    const s = G.DB.save;
    if (!upgDex || !s.owned[upgDex]) upgDex = s.partner;
    // Selector con tus Pokémon: el compañero primero, luego los que ya tienen mejoras.
    const sel = $('upg-mon');
    const lv = d => Object.values(s.pupg[d] || {}).reduce((a, b) => a + b, 0);
    const mons = Object.keys(s.owned).map(Number).filter(d => G.DEX_BY[d])
      .sort((a, b) => (b === s.partner) - (a === s.partner) || lv(b) - lv(a) || a - b);
    sel.innerHTML = mons.map(d => `<option value="${d}">${G.DEX_BY[d].name}${d === s.partner ? ' (compañero)' : ''}${lv(d) ? ' · ' + G.I18n.f('{x} niveles',lv(d)) : ''}</option>`).join('');
    sel.value = upgDex;
    sel.onchange = () => { upgDex = +sel.value; G.Audio.sfx('select'); renderUpgrades(); };
    renderUpgrades();
  }

  function renderUpgrades() {
    const s = G.DB.save;
    const levels = G.DB.upgradesOf(upgDex);
    const mon = G.DEX_BY[upgDex];
    const shiny = upgDex === s.partner && !!s.partnerShiny && G.DB.ownsShiny(upgDex);
    G.UI.sprite($('upg-stage'), upgDex, { lively: true, scale: 2, hero: true, shiny });
    $('upg-stage').style.setProperty('--stage-c', shiny ? '#9ae6ff' : G.U.TYPE_COLOR[mon.types[0]]);
    const box = $('upg-list');
    box.innerHTML = '';
    for (const u of G.Upgrades.LIST) {
      const lvl = levels[u.id] || 0;
      const maxed = lvl >= u.max;
      const cost = maxed ? 0 : G.Upgrades.cost(u.id, lvl);
      const el = document.createElement('div');
      el.className = 'panel upg-item';
      el.innerHTML = `
        <div class="ic">${G.Icons.html(u.icon, 32)}</div>
        <div>
          <b>${u.name}</b> <span style="color:var(--muted);font-size:13px">${u.unit}</span>
          <div class="pips">${Array.from({ length: u.max }, (_, i) => `<i class="${i < lvl ? 'on' : ''}"></i>`).join('')}</div>
        </div>
        <div class="upg-btns">
          ${u.id === 'ban' && lvl > 0 ? `<button class="btn small" data-ban>Elegir (${banList().length}/${lvl})</button>` : ''}
          <button class="btn small ${maxed ? '' : 'gold'}" data-buy data-sfx="none" ${upgradeBusy||maxed || s.coins < cost ? 'disabled' : ''}>
          ${maxed ? 'Máx.' : `<span class="coin"></span> ${cost}`}</button></div>`;
      if (u.id === 'ban' && lvl > 0) el.querySelector('[data-ban]').onclick = () => { banOpen = !banOpen; renderUpgrades(); };
      el.querySelector('[data-buy]').onclick = async () => {
        // Se vuelve a leer todo al pulsar (la partida puede haber cambiado desde que se dibujó).
        if(upgradeBusy)return;const sv = G.DB.save, lv = G.DB.upgradesOf(upgDex), now = lv[u.id] || 0;
        if (now >= u.max) { renderUpgrades(); return; }
        const price = G.Upgrades.cost(u.id, now);
        if (sv.coins < price) { renderUpgrades(); return; }
        upgradeBusy=true;
        let result;
        try{if(G.NAS?.enabled&&!G.DB.guest)result=await G.NAS.upgrade('buy',upgDex,u.id);
        else{result={ok:true,...G.Upgrades.purchase(sv,upgDex,u.id)};G.DB.commit(true);}}
        finally{upgradeBusy=false;}
        if(!result?.ok){G.UI.toast(result?.error||G.T('Error'));renderUpgrades();return;}
        G.Audio.sfx('buy');
        G.UI.refreshCoins();
        G.UI.toast(`${mon.name} · ${u.name}: nivel ${now + 1}`);
        renderUpgrades();
      };
      box.appendChild(el);
      if (u.id === 'ban' && lvl > 0 && banOpen) box.appendChild(banPicker(lvl));
    }
    const actions=document.createElement('div');actions.className='row wrap';
    const buy=document.createElement('button');buy.id='upg-bulk';buy.className='btn gold';buy.textContent=G.T('Mejorar al máximo posible');
    const refund=document.createElement('button');refund.id='upg-refund';refund.className='btn danger';refund.textContent=G.T('Devolver todas las mejoras');refund.disabled=upgradeBusy||!G.Upgrades.refundable(s);
    buy.disabled=upgradeBusy||!G.Upgrades.LIST.some(u=>(levels[u.id]||0)<u.max&&s.coins>=G.Upgrades.cost(u.id,levels[u.id]||0));buy.onclick=async()=>{if(upgradeBusy)return;upgradeBusy=true;renderUpgrades();let r;if(G.NAS?.enabled&&!G.DB.guest)r=await G.NAS.upgrade('bulk',upgDex);else{r={ok:true,...G.Upgrades.bulk(s,upgDex)};G.DB.commit(true);}G.UI.toast(r.ok?G.I18n.f('Comprados {x} niveles',r.count):r.error);upgradeBusy=false;G.UI.refreshCoins();renderUpgrades();};
    refund.onclick=async()=>{if(upgradeBusy)return;if(!(await G.Dialog.confirm(G.I18n.f('¿Devolver todas las mejoras? Recuperas el 50%: {x} monedas.',G.Upgrades.refundable(s)))))return;upgradeBusy=true;renderUpgrades();let r;if(G.NAS?.enabled&&!G.DB.guest)r=await G.NAS.upgrade('refund');else{r={ok:true,...G.Upgrades.refund(s)};G.DB.commit(true);}G.UI.toast(r.ok?G.I18n.f('Devueltas {x} monedas',r.coins):r.error);banOpen=false;upgradeBusy=false;G.UI.refreshCoins();renderUpgrades();};
    actions.append(buy,refund);$('upg-actions').replaceChildren(actions);
    box.appendChild(bindPanel());
  }

  // ---------------- atajos: hueco fijo para cada movimiento ----------------
  // save.pbind[dex] = [movimiento del hueco 1, del 2, del 3, del 4] (o null).
  function bindPanel() {
    const s = G.DB.save;
    s.pbind = s.pbind || {};
    const list = s.pbind[upgDex] || [null, null, null, null];
    const mon = G.DEX_BY[upgDex];
    const ids = G.Moves.poolFor(mon).concat([G.startMoveOf(upgDex)]).filter((v, i, a) => a.indexOf(v) === i)
      .sort((a, b) => G.Moves.BY_ID[a].name.localeCompare(G.Moves.BY_ID[b].name, 'es'));
    const el = document.createElement('div');
    el.className = 'panel bind-panel';
    el.innerHTML = `<b>Atajos de movimientos</b>
      <p class="sub" style="margin:2px 0 8px">Elige qué movimiento va siempre en cada hueco (teclas 1-4 o los iconos de abajo), para la memoria muscular. Si aún no tienes tantos movimientos, va al hueco más cercano.</p>
      <div class="bind-slots">${[0, 1, 2, 3].map(i => `<label class="bind-slot"><span>${i + 1}</span>
        <select class="field" data-slot="${i}"><option value="">Libre</option>${ids.map(id =>
          `<option value="${id}" ${list[i] === id ? 'selected' : ''}>${G.T(G.Moves.BY_ID[id].name, 'move')}</option>`).join('')}</select></label>`).join('')}</div>`;
    el.querySelectorAll('select[data-slot]').forEach(sel => {
      sel.onchange = () => {
        const l = (s.pbind[upgDex] || [null, null, null, null]).slice(0, 4);
        while (l.length < 4) l.push(null);
        const i = +sel.dataset.slot, id = sel.value || null;
        // Un movimiento sólo puede estar en un hueco.
        for (let j = 0; j < 4; j++) if (id && l[j] === id) l[j] = null;
        l[i] = id;
        s.pbind[upgDex] = l;
        G.DB.commit();
        G.Audio.sfx('select');
        renderUpgrades();
      };
    });
    return el;
  }

  // ---------------- veto: movimientos bloqueados ----------------
  // Lista por Pokémon en save.pban[dex]; con N niveles de Veto, N movimientos.
  let banOpen = false;
  function banList() {
    const s = G.DB.save;
    s.pban = s.pban || {};
    return s.pban[upgDex] || (s.pban[upgDex] = []);
  }
  function banPicker(max) {
    const mon = G.DEX_BY[upgDex];
    const start = G.startMoveOf(upgDex);
    const ids = G.Moves.poolFor(mon).filter(id => id !== start)
      .sort((a, b) => G.Moves.BY_ID[a].name.localeCompare(G.Moves.BY_ID[b].name, 'es'));
    const list = banList();
    const el = document.createElement('div');
    el.className = 'panel ban-picker';
    el.innerHTML = `<p class="sub" style="margin:0 0 8px">Toca los movimientos que no quieres que te salgan en las cartas (${list.length}/${max}). El movimiento de inicio no se puede vetar.</p>
      <div class="ban-moves">${ids.map(id => { const d = G.Moves.BY_ID[id]; const on = list.includes(id);
        return `<button class="chip ${on ? 'on ban' : ''}" data-id="${id}">${G.Icons.html('move:' + id, 16)} ${G.T(d.name, 'move')}${on ? ' ' + G.Icons.html('ban', 14) : ''}</button>`; }).join('')}</div>`;
    el.querySelectorAll('[data-id]').forEach(b => {
      b.onclick = () => {
        const l = banList(), id = b.dataset.id, i = l.indexOf(id);
        if (i >= 0) l.splice(i, 1);
        else if (l.length >= max) { G.UI.toast('Ya tienes ' + max + ' vetados: quita uno primero'); return; }
        else l.push(id);
        G.DB.commit();
        G.Audio.sfx('select');
        renderUpgrades();
      };
    });
    return el;
  }

  return { init, open, GEN_NAMES,get upgradeBusy(){return upgradeBusy;} };
})();
