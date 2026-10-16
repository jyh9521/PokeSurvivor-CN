/* Touch placement editor, adapted from JPTER78/pokesurvivor@4de8495.
 * PolyForm Noncommercial 1.0.0; required notice in UPSTREAM-NOTICES.md.
 * Shared HUD geometry replaces upstream's landscape-only duplicated sizes.
 * A local draft preserves both orientation profiles and never touches saves.
 */
G.LayoutUI=(()=>{
  let el=null,draft=null,mode='float',selected='bar',dragging=null;
  const keys=['bar','item','pause','stick','battle'];
  const names={bar:'Ataques',item:'Objeto',pause:'Pausa',stick:'Joystick',battle:'Special forms'};
  const clone=x=>JSON.parse(JSON.stringify(x||{}));
  const key=()=>G.Touch.profileKey();
  const profile=()=>draft[key()]||{};
  function geometry(){
    const l=G.HUD.layout(innerWidth,innerHeight,4,true,G.Touch.safeArea(),profile()),b=G.Touch.stickBase(innerWidth,innerHeight,profile()),r=G.Touch.R();
    return {battle:G.BattleUI.geometry(innerWidth,innerHeight,profile(),true,G.Touch.safeArea()),bar:{x:l.slots[0].x,y:l.slots[0].y,w:l.totalW,h:l.S},item:l.item,pause:l.pause,stick:{x:b.x-r,y:b.y-r,w:r*2,h:r*2}};
  }
  function position(k,x,y){
    draft[key()]||={};draft[key()][k]=[Math.max(0,Math.min(1,x/innerWidth)),Math.max(0,Math.min(1,y/innerHeight))];
    const r=geometry()[k];draft[key()][k]=[(r.x+r.w/2)/innerWidth,(r.y+r.h/2)/innerHeight];paint();
  }
  function paint(){
    const rects=geometry();
    for(const k of keys){const n=el.querySelector(`[data-layout-piece="${k}"]`),r=rects[k];
      Object.assign(n.style,{left:r.x+'px',top:r.y+'px',width:r.w+'px',height:r.h+'px'});
      n.classList.toggle('hidden',k==='stick'&&mode!=='fixed');n.classList.toggle('gold',k===selected);
      n.setAttribute('aria-pressed',String(k===selected));
    }
    el.querySelector('[data-layout-mode]').value=mode;
    el.querySelector('[data-layout-selected]').value=selected;
    const r=rects[selected];el.querySelector('[data-layout-x]').value=Math.round((r.x+r.w/2)/innerWidth*100);
    el.querySelector('[data-layout-y]').value=Math.round((r.y+r.h/2)/innerHeight*100);
    el.querySelector('[data-layout-orientation]').textContent=G.T(innerHeight>innerWidth?'Vertical':'Horizontal');
  }
  function build(){
    el=document.createElement('section');el.id='scr-layout';el.className='scr hidden';el.onuiback=close;
    el.innerHTML=keys.map(k=>`<button class="btn layout-piece" data-layout-piece="${k}" aria-label="${G.T(names[k])}">${k==='bar'?'1 · 2 · 3 · 4':G.T(names[k])}</button>`).join('')+
      `<div class="box layout-panel"><h3>${G.T('Colocar los botones')} · <span data-layout-orientation></span></h3>
      <p class="sub">${G.T('Arrastra o selecciona un control y ajusta su posición. Cambia la orientación para editar el otro diseño.')}</p>
      <label>${G.T('Joystick')}<select class="field" data-layout-mode><option value="float">${G.T('Flotante')}</option><option value="fixed">${G.T('Fijo')}</option></select></label>
      <label>${G.T('Control')}<select class="field" data-layout-selected>${keys.map(k=>`<option value="${k}">${G.T(names[k])}</option>`).join('')}</select></label>
      <label>${G.T('Posición horizontal')}<input type="range" min="0" max="100" step="1" data-layout-x></label>
      <label>${G.T('Posición vertical')}<input type="range" min="0" max="100" step="1" data-layout-y></label>
      <div class="row wrap"><button class="btn small" data-ui-back>${G.T('Cancelar')}</button><button class="btn small" data-layout-reset>${G.T('Restablecer')}</button><button class="btn small gold" data-layout-save>${G.T('Guardar')}</button></div></div>`;
    document.body.appendChild(el);
    el.querySelector('[data-ui-back]').onclick=close;
    el.querySelector('[data-layout-mode]').onchange=e=>{mode=e.target.value;paint();};
    el.querySelector('[data-layout-selected]').onchange=e=>{selected=e.target.value;paint();};
    for(const axis of ['x','y'])el.querySelector('[data-layout-'+axis+']').oninput=e=>{const r=geometry()[selected];position(selected,axis==='x'?Number(e.target.value)/100*innerWidth:r.x+r.w/2,axis==='y'?Number(e.target.value)/100*innerHeight:r.y+r.h/2);};
    el.querySelector('[data-layout-reset]').onclick=()=>{delete draft[key()];mode='float';paint();};
    el.querySelector('[data-layout-save]').onclick=()=>{G.Settings.set('touchLayouts',clone(draft));G.Settings.set('stickMode',mode);G.UI.toast('Botones colocados');close();};
    el.querySelectorAll('[data-layout-piece]').forEach(n=>{
      n.onclick=()=>{selected=n.dataset.layoutPiece;paint();};
      n.addEventListener('pointerdown',e=>{if(e.button!==0)return;selected=n.dataset.layoutPiece;const r=geometry()[selected];dragging={id:e.pointerId,k:selected,dx:e.clientX-r.x-r.w/2,dy:e.clientY-r.y-r.h/2};e.preventDefault();n.focus({preventScroll:true});n.setPointerCapture(e.pointerId);paint();});
      n.addEventListener('pointermove',e=>{if(dragging?.id===e.pointerId)position(dragging.k,e.clientX-dragging.dx,e.clientY-dragging.dy);});
      for(const event of ['pointerup','pointercancel','lostpointercapture'])n.addEventListener(event,()=>dragging=null);
    });
    addEventListener('resize',()=>{dragging=null;if(isOpen())paint();});
    addEventListener('keydown',e=>{if(e.key==='Escape'&&isOpen()){e.preventDefault();e.stopImmediatePropagation();close();}},true);
  }
  function open(){if(!el)build();draft=clone(G.Settings.get('touchLayouts'));mode=G.Settings.get('stickMode')==='fixed'?'fixed':'float';selected='bar';G.Touch.reset();G.ClickMove?.cancel();G.UIFocus.enter(el);el.classList.remove('hidden');paint();}
  function close(){dragging=null;if(el)el.classList.add('hidden');}
  function isOpen(){return !!el&&!el.classList.contains('hidden');}
  return {open,close,get isOpen(){return isOpen();}};
})();
