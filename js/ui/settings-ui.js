/* ============ settings-ui.js — pantalla de Ajustes (PC y móvil) ============
 * Se abre por encima de lo que haya (menú o pausa) y al cerrar vuelve ahí.
 * Pestañas: Sonido · Gráficos · Controles · Cuenta · Acerca de.
 * Los ajustes son de este dispositivo (G.Settings / G.Audio en el navegador).
 */
G.SettingsUI = (() => {
  const $ = G.UI.$;
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const VERSION = (G.APP_VERSION||'development')+' · 2026-10-16';
  const REPO = G.PROJECT_REPO || 'https://github.com/JPTER78/pokesurvivor';
  let tab = 'sound';

  function init() {
    document.querySelectorAll('#set-tabs .gen-tab').forEach(b => { b.onclick = () => { tab = b.dataset.t; render(); }; });
    $('set-close').onclick = close;
    $('btn-settings').innerHTML = G.Icons.html('gear', 20);
    $('btn-settings').onclick = () => open();
    $('btn-pause-settings').onclick = () => open('sound');
    // Pantalla completa (si el navegador la permite; en iPhone, cómo conseguirla).
    if (canFull() || iosTip()) {
      $('btn-full').classList.remove('hidden');
      $('btn-full').innerHTML = G.Icons.html('full', 20);
      $('btn-full').onclick = toggleFull;
    }
  }

  function open(t) {
    if (t) tab = t;
    G.UIFocus?.enter($('scr-settings'));
    $('scr-settings').classList.remove('hidden');
    render();
  }
  function close() {
    G.Gamepad?.cancelCapture(); $('scr-settings').classList.add('hidden'); }
  const isOpen = () => !$('scr-settings').classList.contains('hidden');

  // ---------------- pantalla completa ----------------
  function canFull() { return !!(document.fullscreenEnabled || document.webkitFullscreenEnabled); }
  function isFull() { return !!(document.fullscreenElement || document.webkitFullscreenElement); }
  // iPhone: Safari no deja poner una web a pantalla completa (por eso a veces
  // no salía la opción). Sí se puede abriéndola desde la pantalla de inicio.
  const IOS = /iPhone|iPad|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const standalone = () => !!navigator.standalone || (window.matchMedia && matchMedia('(display-mode: fullscreen), (display-mode: standalone)').matches);
  function iosTip() { return IOS && !canFull() && !standalone(); }
  const IOS_TIP = 'En iPhone, Safari no deja poner las webs a pantalla completa. Pulsa Compartir y luego "Añadir a pantalla de inicio": abriendo el juego desde ese icono se juega a pantalla completa.';
  function toggleFull() {
    if (!canFull()) { if (iosTip()) G.UI.toast(IOS_TIP, 9000); return; }
    if (isFull()) (document.exitFullscreen || document.webkitExitFullscreen).call(document);
    else {
      const el = document.documentElement;
      const p = (el.requestFullscreen || el.webkitRequestFullscreen).call(el);
      // Fullscreen follows the device orientation; never force a rotation.
      if (p && p.catch) p.catch(() => {});
    }
    setTimeout(() => { if (isOpen()) render(); }, 300);
  }

  // ---------------- piezas ----------------
  function section(title, sub) { return `<h3 class="set-h">${esc(title)}</h3>${sub ? `<p class="sub">${sub}</p>` : ''}`; }
  function toggle(key, label, desc) {
    const on = !!G.Settings.get(key);
    return `<div class="set-row"><div class="grow"><b>${esc(label)}</b><small>${esc(desc)}</small></div>
      <button class="btn small switch ${on ? 'gold' : ''}" data-k="${key}">${on ? 'Sí' : 'No'}</button></div>`;
  }
  function choice(key, opts) {
    const cur = G.Settings.get(key);
    return `<div class="chips set-chips">${opts.map(([v, l]) => `<button class="chip ${v === cur ? 'on' : ''}" data-k="${key}" data-v="${v}">${esc(l)}</button>`).join('')}</div>`;
  }

  function render() {
    document.querySelectorAll('#set-tabs .gen-tab').forEach(b => b.classList.toggle('on', b.dataset.t === tab));
    const box = $('set-body');
    box.scrollTop = 0;
    if (tab === 'sound') {
      box.innerHTML = section('Sonido') + toggle('randomBgm',G.T('Random BGM'),G.T('Shuffle local menu and battle music; off restores the original soundtrack.')) + '<div id="set-sound" class="sound-inline"></div>';
      G.UI.soundControls($('set-sound'));
    } else if (tab === 'gfx') {
      const auto = ['baja', 'media', 'alta'][G.Settings.autoLevel];
      box.innerHTML = section('Idioma', 'El juego se recarga al cambiarlo.')
        + `<div class="chips set-chips" translate="no">${[['es', 'Español'], ['en', 'English'], ['zh-CN', '简体中文']].map(([v, l]) =>
             `<button class="chip ${G.I18n.lang === v ? 'on' : ''}" data-lang="${v}">${l}</button>`).join('')}</div>`
        + section('Calidad', 'Cuántos efectos y partículas se dibujan. <b>Auto</b> la baja sola si el juego va a tirones (ahora: ' + auto + ').')
        + choice('quality', [['auto', 'Auto'], ['high', 'Alta'], ['mid', 'Media'], ['low', 'Baja'], ['potato', 'Equipo modesto']])
        + section('Pantalla')
        + toggle('showHitbox','Mostrar zona de impacto','Círculo real de contacto y proyectiles; no cambia el daño ni el tamaño.')
          + toggle('playerOutline','Resaltar tu personaje','Contorno visible incluso detrás de árboles y enemigos.')
        + toggle('dmgNumbers', 'Números de daño', 'Los números que salen al golpear y al recibir daño.')
        + toggle('calm', 'Menos sacudidas y destellos', 'La cámara tiembla menos y los fogonazos son suaves.')
        + toggle('fps', 'Mostrar FPS', 'Fotogramas por segundo, en la esquina de abajo.')
        + (canFull() ? `<div class="set-row"><div class="grow"><b>Pantalla completa</b><small>Sin barras del navegador.</small></div>
             <button class="btn small" id="set-full">${isFull() ? 'Salir' : 'Activar'}</button></div>`
           : iosTip() ? `<div class="set-row"><div class="grow"><b>Pantalla completa</b><small>${esc(IOS_TIP)}</small></div></div>` : '');
    } else if (tab === 'ctl') {
      box.innerHTML = section('Mando','')+padPanel()+'<p class=sub data-pad-controls></p>'+toggle('gamepad','Activar mando','Pulsa un botón para detectar el mando. Los campos de texto siguen usando teclado.')+toggle('rumble','Vibración del mando','Vibra al recibir daño real.')+'<button class="btn small" data-rumble-test>'+G.T('Probar vibración')+'</button><p class=sub data-rumble-status role=status></p>'+section('Iconos del mando','')+'<select class=field data-pad-layout aria-label="'+esc(G.T('Iconos del mando'))+'">'+[['auto','Auto'],['xbox','Xbox'],['playstation','PlayStation'],['nintendo','Nintendo']].map(([v,n])=>'<option value="'+v+'" '+(G.Settings.get('padLayout')===v?'selected':'')+'>'+n+'</option>').join('')+'</select>'+section('En móvil o tablet')
        + `<p class="sub">Arrastra para moverte; toca un ataque para cambiarlo y la esquina superior derecha para pausar. Puedes jugar en vertical u horizontal.</p>`
        + `<div class="set-row"><div class="grow"><b>Tamaño del joystick</b><small>Cuánto hay que arrastrar el dedo.</small></div></div>`
        + choice('stick', [[0.8, 'Pequeño'], [1, 'Normal'], [1.25, 'Grande']])
        + choice('stickMode', [['float', 'Flotante'], ['fixed', 'Fijo']])
        + '<button class="btn small" data-touch-layout>Colocar los botones</button>'
        + '<p class=sub>Diseños separados para vertical y horizontal; se guardan en este navegador.</p>'
        + section('En PC')
        + '<p class=sub>Rueda arriba: ataque anterior; rueda abajo: siguiente. Solo durante la partida en modo de movimiento con ratón.</p>'
        + toggle('clickMove','Mover con clic','Clic izquierdo: ir; mantener: seguir el cursor. Clic derecho o movimiento manual: cancelar.')
        + `<div class="keys">
             <div><kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd> o flechas</div><span>moverse</span>
             <div><kbd>1</kbd>–<kbd>4</kbd> o clic en el icono</div><span>elegir ataque</span>
             <div><kbd>Q</kbd> / <kbd>E</kbd></div><span>ataque anterior / siguiente</span>
             <div><kbd>Esc</kbd> o <kbd>P</kbd></div><span>pausa</span>
             <div><kbd>1</kbd>–<kbd>3</kbd></div><span>elegir carta al subir de nivel</span>
           </div>`;
    } else if (tab === 'acc') {
      renderAccount(box);
    } else {
      box.innerHTML = `<div class="about-logo">PokéSurvivor</div><p class="sub center">Versión ${esc(VERSION)}</p>`
        + `<p class="sub">Juego de fans <b>gratuito y sin ánimo de lucro</b>: sin anuncios ni compras. Pokémon y sus personajes son propiedad de Nintendo, Creatures y GAME FREAK; este proyecto no está afiliado a ellos.</p>`
        + section('Créditos')
        + `<ul class="credits">
             <li><b>Sprites:</b> PMD SpriteCollab y sus artistas (CC BY-NC 4.0).</li>
             <li><b>Datos de los Pokémon:</b> PokéAPI.</li>
             <li><b>Música y sonidos:</b> originales, generados por el propio juego.</li>
             <li><b>Licencias:</b> <a href="LICENSE-NONCOMMERCIAL.md" target="_blank" rel="noopener">PolyForm Noncommercial 1.0.0</a> · <a href="UPSTREAM-NOTICES.md" target="_blank" rel="noopener">Copyright 2026 JPTER78</a></li>
             <li><b>Fuente:</b> Pixelify Sans (OFL).</li>
           </ul>`
        + `<div class="row wrap" style="justify-content:center;gap:8px">
             ${window.PS_PAGES ? `<a class="btn small" href="${G.I18n.pageUrl('guide')}" target="_blank">Guía y preguntas</a>
              <a class="btn small" href="${G.I18n.pageUrl('pokedex')}" target="_blank">Pokédex</a>` : ''}
             <button class="btn small" data-legal>Aviso legal y privacidad</button>
              <a class="btn small" href="${G.I18n.pageUrl('contact')}" target="_blank" rel="noopener">Contacto</a>
             <a class="btn small" href="${REPO}" target="_blank" rel="noopener">Código (GitHub)</a>
           </div>`;
    }
    if (tab === 'acc' && G.NasUI) G.NasUI.render(box);
    wire(box);
  }

  function renderAccount(box) {
    const st = G.DB.guest ? 'guest' : G.DB.syncState;
    const SYNC = { ok: 'Guardado en la nube', syncing: 'Guardando…', pending: 'Pendiente de subir (se sube al salir del juego)',
                   offline: 'Sin conexión: se subirá al volver', local: 'Guardado sólo en este navegador', guest: 'Invitado: no se guarda' };
    if (G.DB.guest) {
      box.innerHTML = section('Cuenta', 'Estás jugando como <b>invitado</b>: tu progreso no se guarda al salir.')
        + `<button class="btn gold" id="set-login">Crear cuenta o entrar</button>`;
      return;
    }
    const nick = G.Social.me ? G.Social.me.name : (G.DB.user || '');
    const kind = G.DB.mode === 'local' ? 'Cuenta de este navegador' : G.DB.nameAccount ? 'Nombre y contraseña' : 'Google';
    box.innerHTML = section('Cuenta')
      + `<div class="set-row"><div class="grow"><b>Apodo</b><small>${G.NAS?.enabled?G.T('El apodo público se puede cambiar; la cuenta de acceso no cambia.'):'Es único y no se puede cambiar.'}</small></div><span class="gold" translate="no">${esc(nick)}</span></div>`
      + `<div class="set-row"><div class="grow"><b>Tipo de cuenta</b></div><span>${esc(kind)}</span></div>`
      + `<div class="set-row"><div class="grow"><b>Partida</b></div><span>${esc(SYNC[st] || st)}</span></div>`
      + `<div class="row wrap" style="gap:8px;margin-top:12px">
           <button class="btn" id="set-logout">Cerrar sesión</button>
           <button class="btn danger" id="set-delete">Borrar cuenta</button>
         </div><p class="note" id="set-msg"></p>`;
  }

  const PAD_BINDINGS=[[0,'Confirm'],[1,'Back'],[2,'Reroll / Help'],[3,'Danger mark'],[4,'Previous attack'],[5,'Next attack'],[9,'Pause'],[10,'Activate special'],[11,'Switch special'],[12,'Up'],[13,'Down'],[14,'Left'],[15,'Right']];
  function padPanel(){return '<p class="sub" data-pad-status role="status"></p><p class="sub" data-pad-live></p><div class="chips set-chips"><button class="btn small" data-pad-refresh>'+G.T('Detect controller')+'</button><button class="btn small" data-pad-export>'+G.T('Export controller diagnostics')+'</button></div><details class="pad-mapping"><summary tabindex="0">'+G.T('Calibrate controller')+'</summary><p class="sub">'+G.T('Generic USB controls are enabled. Calibrate only if buttons or axes differ.')+'</p><div class="chips set-chips">'+PAD_BINDINGS.map(([i,label])=>'<button class="btn small" data-pad-bind="'+i+'">'+G.T(label)+'</button>').join('')+'<button class="btn small" data-pad-axis="0">'+G.T('Move right')+'</button><button class="btn small" data-pad-axis="1">'+G.T('Move down')+'</button></div><p class="sub" data-pad-capture role="status"></p><button class="btn small" data-pad-cancel>'+G.T('Cancel calibration')+'</button> <button class="btn small" data-pad-reset>'+G.T('Reset controller mapping')+'</button></details>';}
  function refreshPad(){const el=document.querySelector('[data-pad-status]');if(!el)return;const s=G.Gamepad.status();const text=G.T(!s.enabled?'Controller input is disabled.':!s.supported?'Gamepad API is unavailable. Open the HTTPS game page in Chrome.':s.error?'The browser blocked controller access.':!s.connected?'No controller exposed by the browser. Tap this page, then press a controller button.':s.mapping==='standard'?'Standard controller detected.':'Unmapped USB controller detected; generic controls are enabled.');if(el.textContent!==text)el.textContent=text;
    const live=document.querySelector('[data-pad-live]'),value=s.connected?G.T('Buttons')+': '+s.buttons.length+' · '+G.T('Axes')+': '+s.axes.map((n,i)=>i+'='+n.toFixed(2)).join(' ')+' · '+G.T('Pressed')+': '+s.buttons.map((n,i)=>n>.5?i:null).filter(n=>n!==null).join(', '):'';if(live&&live.textContent!==value)live.textContent=value;
    document.querySelectorAll('[data-pad-bind],[data-pad-axis],[data-pad-reset]').forEach(b=>b.disabled=!s.connected||!s.enabled);
  }
  function calibrate(type,target){const el=document.querySelector('[data-pad-capture]');const prompt=type==='axis'?target===0?'Release controls, then move the stick right.':'Release controls, then move the stick down.':'Release controls, then press the desired controller button.';
    const started=G.Gamepad.beginCapture(type,({key,index,sign})=>{const all=structuredClone(G.Settings.get('padBindings')||{}),entry=all[key]||{buttons:{},axes:{}};entry[type==='axis'?'axes':'buttons']||={};entry[type==='axis'?'axes':'buttons'][target]=type==='axis'?{index,sign}:index;all[key]=entry;G.Settings.set('padBindings',all);if(el?.isConnected)el.textContent=G.T('Controller mapping saved.');});if(el)el.textContent=G.T(started?prompt:'Connect a controller and enable controller input first.');
  }
  function exportPad(){const data={format:1,version:G.APP_VERSION,controller:G.Gamepad.status(),userAgent:navigator.userAgent,visibility:document.visibilityState},url=URL.createObjectURL(new Blob([JSON.stringify(data,null,2)],{type:'application/json'})),a=document.createElement('a');a.href=url;a.download='pokesurvivor-controller.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
  const RUMBLE_TEXT={idle:'Vibración disponible. Prueba el mando.',playing:'Enviando vibración…',complete:'El navegador completó la orden. Comprueba si el mando vibró.',preempted:'La vibración fue interrumpida. Prueba otra vez.',error:'El navegador rechazó la vibración. Comprueba el modo del mando y la conexión.',unsupported:'Este navegador o conexión no expone vibración. Prueba USB o modo XInput.', 'no-pad':'No controller exposed by the browser. Tap this page, then press a controller button.',disabled:'Activa el mando y la vibración para probar.'};
  function refreshRumble(){refreshPad();const el=document.querySelector('[data-rumble-status]');if(!el)return;const value=G.T(RUMBLE_TEXT[G.Gamepad.rumbleStatus().code]||RUMBLE_TEXT.idle);if(el.textContent!==value)el.textContent=value;}
  function wire(box) {
    const detect=box.querySelector('[data-pad-refresh]');if(detect)detect.onclick=refreshPad;
    const output=box.querySelector('[data-pad-export]');if(output)output.onclick=exportPad;
    box.querySelectorAll('[data-pad-bind]').forEach(b=>b.onclick=()=>calibrate('button',Number(b.dataset.padBind)));
    box.querySelectorAll('[data-pad-axis]').forEach(b=>b.onclick=()=>calibrate('axis',Number(b.dataset.padAxis)));
    const cancel=box.querySelector('[data-pad-cancel]');if(cancel)cancel.onclick=()=>{G.Gamepad.cancelCapture();const el=box.querySelector('[data-pad-capture]');if(el)el.textContent=G.T('Calibration cancelled.');};
    const reset=box.querySelector('[data-pad-reset]');if(reset)reset.onclick=()=>{G.Gamepad.cancelCapture();const key=G.Gamepad.status().key,all=structuredClone(G.Settings.get('padBindings')||{});delete all[key];G.Settings.set('padBindings',all);const el=box.querySelector('[data-pad-capture]');if(el)el.textContent=G.T('Controller mapping reset.');};

    const place=box.querySelector('[data-touch-layout]');if(place)place.onclick=()=>G.LayoutUI.open();
    const test=box.querySelector('[data-rumble-test]');if(test)test.onclick=async()=>{test.disabled=true;try{await G.Gamepad.rumble(1,true);}finally{if(test.isConnected)test.disabled=false;refreshRumble();}};
    refreshRumble();
    const layout=box.querySelector('[data-pad-layout]');if(layout)layout.onchange=()=>G.Settings.set('padLayout',layout.value);
    box.querySelectorAll('.switch[data-k]').forEach(b => { b.onclick = () => { G.Settings.set(b.dataset.k, !G.Settings.get(b.dataset.k)); render(); }; });
    box.querySelectorAll('.chip[data-k]').forEach(b => {
      b.onclick = () => { const v = b.dataset.v; G.Settings.set(b.dataset.k, isNaN(+v) ? v : +v); render(); };
    });
    const full = $('set-full'); if (full) full.onclick = toggleFull;
    box.querySelectorAll('[data-lang]').forEach(b => { b.onclick = () => { if (b.dataset.lang !== G.I18n.lang) G.I18n.set(b.dataset.lang); }; });
    const lo = $('set-login'); if (lo) lo.onclick = () => { close(); leave(); };
    const out = $('set-logout'); if (out) out.onclick = () => { close(); leave(); };
    const del = $('set-delete');
    if (del) del.onclick = async () => {
      const ok = await G.UI.confirmDelete();
      if (!ok) return;
      del.disabled = true;
      const r = await G.DB.deleteAccount(ok.pass);
      if (!r.ok) { $('set-msg').textContent = r.error; del.disabled = false; return; }
      close();
      G.UI.toast('Cuenta borrada');
      G.Audio.music(null);
      G.Flow.toLogin();
    };
  }

  /** Cerrar sesión (si estás en una partida, se abandona). */
  async function leave() {
    if (G.DB.guest && !(await G.Dialog.confirm('Eres invitado: se perderá todo el progreso. ¿Salir?'))) return;
    if (G.Game.state !== 'ui') G.Game.quit && G.Game.quit();
    G.Audio.music(null);
    G.DB.logout().then(r => { if (r !== false) G.Flow.toLogin(); });
  }

  return { refreshRumble, init, open, close, get isOpen() { return isOpen(); } };
})();
