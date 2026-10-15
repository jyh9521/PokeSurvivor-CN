/* Standard Gamepad API: spatial focus, explicit Back/Pause, device-aware hints. */
G.Gamepad=(()=>{
  let axis=[0,0],previous=[],active=null,repeatAt=0,lastDir='',armed=false,using=false,scopeBefore=null,editing=null;
  const memory=new WeakMap(),originalKeys=new WeakMap();let cache=null,dirty=true;
  new MutationObserver(()=>dirty=true).observe(document.documentElement,{subtree:true,childList:true,attributes:true,attributeFilter:['class','hidden','disabled','style']});window.addEventListener('resize',()=>dirty=true);
  const layouts={xbox:['A','B','X','Y','LB','RB','LT','RT','View','Start'],playstation:['×','○','□','△','L1','R1','L2','R2','Share','Options'],nintendo:['B','A','Y','X','L','R','ZL','ZR','−','+']};
  const visible=el=>!!el&&!el.closest('.hidden,[hidden],[inert]')&&!!el.getClientRects().length&&getComputedStyle(el).visibility!=='hidden';
  function layout(){const setting=G.Settings.get('padLayout');return layouts[setting]?setting:/054c|dualsense|dualshock|playstation|sony/i.test(active?.id||'')?'playstation':/057e|nintendo|joy-con|switch pro/i.test(active?.id||'')?'nintendo':'xbox';}
  const button=i=>layouts[layout()][i]||String(i);
  function mode(value){if(using===value&&document.body.dataset.input===(value?'gamepad':'keyboard'))return;using=value;document.body.dataset.input=value?'gamepad':'keyboard';if(!value){editing=null;document.querySelectorAll('.pad-focus').forEach(el=>el.classList.remove('pad-focus'));}}
  window.addEventListener('keydown',()=>mode(false),true);
  window.addEventListener('pointerdown',()=>mode(false),true);
  let mouse=null;window.addEventListener('pointermove',e=>{if(e.pointerType!=='mouse')return;if(mouse&&Math.hypot(e.clientX-mouse[0],e.clientY-mouse[1])>3)mode(false);mouse=[e.clientX,e.clientY];});
  function scope(){if(G.Dialog?.element)return G.Dialog.element;
    const layers=[...document.querySelectorAll('.scr:not(.hidden),#pull-fx:not(.hidden),#nas-network-panel,#invite-pop,#tap-start,#sound-panel')];
    return layers.filter(visible).sort((a,b)=>(Number(getComputedStyle(b).zIndex)||0)-(Number(getComputedStyle(a).zIndex)||0)||([...document.body.children].indexOf(b)-[...document.body.children].indexOf(a)))[0]||null;
  }

  function targets(root){if(!root)return[];if(!dirty&&cache?.root===root)return cache.all;const roots=[root];if(['scr-menu','scr-dex','scr-upgrades','scr-gacha','scr-friends','scr-rank','scr-goals','scr-lobby'].includes(root.id)&&visible(document.getElementById('topbar')))roots.push(document.getElementById('topbar'));
    if(root.id==='tap-start')return[root];
    const all=roots.flatMap(r=>[...r.querySelectorAll('button,a[href],input,select,textarea,.card,.cell,.answer,.chip,.gen-tab,.tab,.fav-slot,#user-pill,[tabindex]')]).filter(el=>visible(el)&&!el.disabled&&!el.matches('input[type=hidden],.locked,[aria-disabled=true]')&&!el.closest('.cards.done')&&(el.matches('button,a,input,select,textarea')||typeof el.onclick==='function'||el.hasAttribute('tabindex'))).filter(el=>!el.closest('button')||el.tagName==='BUTTON');const diagnostic=document.getElementById('nas-network-toggle');if(['scr-settings','scr-pause','scr-lobby'].includes(root.id)&&visible(diagnostic))all.push(diagnostic);cache={root,all};dirty=false;return all;
  }
  function identity(el){return el.id||['go','t','k','v','gen','dex','hostTransfer','tab','nas'].map(k=>el.dataset[k]===undefined?'':k+'='+el.dataset[k]).filter(Boolean).join('|');}
  function focus(el,root){if(!el)return;document.querySelectorAll('.pad-focus').forEach(n=>n.classList.remove('pad-focus'));if(el.tabIndex<0)el.tabIndex=0;if(el.tagName==='BUTTON'&&getComputedStyle(el).position==='static')el.classList.add('pad-relative');el.classList.add('pad-focus');el.focus({preventScroll:true});el.scrollIntoView({block:'nearest',inline:'nearest'});memory.set(root,{key:identity(el),rect:el.getBoundingClientRect()});}
  function ensure(root,all){if(!root)return null;if(all.includes(document.activeElement)){if(using&&!document.activeElement.classList.contains('pad-focus'))focus(document.activeElement,root);return document.activeElement;}const saved=memory.get(root);let el=saved?.key&&all.find(n=>identity(n)===saved.key);if(!el&&saved?.rect){const c=r=>[(r.left+r.right)/2,(r.top+r.bottom)/2],p=c(saved.rect);el=all.slice().sort((a,b)=>{const x=c(a.getBoundingClientRect()),y=c(b.getBoundingClientRect());return Math.hypot(x[0]-p[0],x[1]-p[1])-Math.hypot(y[0]-p[0],y[1]-p[1]);})[0];}el=el||all[0];focus(el,root);return el;}
  function adjust(el,dir){const sign=['left','up'].includes(dir)?-1:1;
    if(el.tagName==='SELECT'){let i=el.selectedIndex+sign;while(el.options[i]?.disabled||el.options[i]?.hidden)i+=sign;if(i<0||i>=el.options.length)return;el.selectedIndex=i;return;}
    else {const step=Number(el.step)||1;el.value=Math.max(Number(el.min)||0,Math.min(Number(el.max)||100,Number(el.value)+sign*step));el.dispatchEvent(new Event('input',{bubbles:true}));}
    el.dispatchEvent(new Event('change',{bubbles:true}));
  }
  function navigate(root,all,dir){const el=ensure(root,all);if(!el)return;if(editing?.el===el||el.matches('input[type=range]')&&['left','right'].includes(dir)){adjust(el,dir);return;}const found=G.PadNav.next(el.getBoundingClientRect(),all.filter(n=>n!==el).map(n=>({el:n,rect:n.getBoundingClientRect()})),dir);if(found)focus(found.el,root);}
  function confirm(root,all){const el=ensure(root,all);if(!el)return;if(el.tagName==='SELECT'){if(editing){const changed=el.value!==editing.value;delete el.dataset.padEdit;editing=null;if(changed)el.dispatchEvent(new Event('change',{bubbles:true}));}else{editing={el,value:el.value};el.dataset.padEdit='true';}return;}if(el.matches('input:not([type=checkbox]):not([type=radio]),textarea')){el.focus();return;}el.click();}
  function back(root){if(G.Dialog?.open){G.Dialog.cancel();return;}if(editing){const {el,value}=editing;editing=null;delete el.dataset.padEdit;if(el.isConnected){el.value=value;}return;}
    const ids={'scr-settings':'set-close','scr-profile':'prof-close','scr-news':'news-close','scr-legal':'legal-close','scr-support':'sup-close','scr-recover':'rec-later','scr-nick':'nick-later','scr-starters':'starter-back','scr-lobby':'lobby-menu','scr-pause':'btn-resume','scr-over':'btn-again','scr-mod':'mod-back','scr-bond':'bond-back','pull-fx':'pull-close','invite-pop':'inv-no','sound-panel':'btn-sound'};
    const favorite=document.getElementById('fav-back');if(root?.id==='scr-goals'&&visible(favorite)){favorite.click();return;}
    const el=ids[root?.id]?document.getElementById(ids[root.id]):root?.id==='nas-network-panel'?root.querySelector('[data-network-close]'):root?.id!=='scr-menu'?root?.querySelector('#fav-back:not(.hidden),[data-back]'):null;if(visible(el)&&!el.disabled)el.click();
  }
  function hints(root){const glyphs=layouts[layout()];for(const el of document.querySelectorAll('[data-pad-controls]')){const value=G.I18n.f('Palanca: moverse · {x}: confirmar · {x}: volver · {x}/{x}: cambiar ataque · {x}: pausa',button(0),button(1),button(4),button(5),button(9));if(el.textContent!==value)el.textContent=value;}const confirmGlyph=JSON.stringify(button(0));if(document.documentElement.style.getPropertyValue('--pad-confirm')!==confirmGlyph)document.documentElement.style.setProperty('--pad-confirm',confirmGlyph);
    for(const el of document.querySelectorAll('[data-pad-choice]')){const value=G.I18n.f(el.dataset.padChoice==='reroll'?'Cruceta: elegir · {x}: confirmar · {x}: cambiar opciones':'Cruceta: elegir · {x}: confirmar',button(0),button(2));if(el.textContent!==value)el.textContent=value;}
    for(const n of document.querySelectorAll('[data-pad-glyph]')){const value=glyphs[Number(n.dataset.padGlyph)];if(n.textContent!==value)n.textContent=value;}
    for(const n of document.querySelectorAll('.card .key')){if(!originalKeys.has(n))originalKeys.set(n,n.textContent);const value=using?(n.parentElement===document.activeElement?button(0):''):originalKeys.get(n);if(n.textContent!==value)n.textContent=value;}
    let help=document.getElementById('pad-help');if(!help){help=document.createElement('div');help.id='pad-help';help.setAttribute('translate','no');document.body.appendChild(help);}help.hidden=!using||!root;const text=G.I18n.f('Cruceta: elegir · {x}: confirmar · {x}: volver',button(0),button(1));if(help.textContent!==text)help.textContent=text;
  }
  function poll(){axis=[0,0];if(!G.Settings.get('gamepad')||document.hidden){active=null;previous=[];armed=false;mode(false);hints(null);return;}
    let pads=[];try{pads=Array.from(navigator.getGamepads?.()||[]);}catch{}const next=pads.find(p=>p?.connected&&p.mapping==='standard');
    if(!next){if(active&&G.Game.state==='playing'&&!scope())G.Game.togglePause();active=null;previous=[];armed=false;mode(false);hints(null);return;}
    if(active?.index!==next.index){previous=next.buttons.map(b=>!!b.pressed);armed=false;}active=next;const states=active.buttons.map(b=>!!b.pressed),read=i=>states[i];if(!states.some(Boolean))armed=true;const edge=i=>armed&&states[i]&&!previous[i];
    const x=Number(active.axes[0])||0,y=Number(active.axes[1])||0;if(Math.hypot(x,y)>.25||states.some((v,i)=>v&&!previous[i]))mode(true);
    const root=scope(),all=targets(root);if(root!==scopeBefore){scopeBefore=root;editing=null;repeatAt=performance.now()+160;lastDir='';if(using)ensure(root,all);}if(editing&&!all.includes(editing.el))editing=null;
    const playing=G.Game.state==='playing'&&!root;
    if(playing&&using){const len=Math.hypot(x,y);if(len>.2){const scale=Math.min(1,(len-.2)/.8)/len;axis=[x*scale,y*scale];}if(read(14)||read(15)||read(12)||read(13))axis=G.U.norm((read(15)?1:0)-(read(14)?1:0),(read(13)?1:0)-(read(12)?1:0));if(edge(4))G.Input.inject('keyq');if(edge(5))G.Input.inject('keye');if(edge(0))G.Judgment?.cinematic?G.Input.inject('enter'):G.Coop?.ping('gather');if(edge(2))G.Coop?.ping('help');if(edge(3))G.Coop?.ping('danger');}
    else if(root){if(using)ensure(root,all);const dir=read(14)?'left':read(15)?'right':read(12)?'up':read(13)?'down':Math.abs(x)>.6&&Math.abs(x)>=Math.abs(y)?x<0?'left':'right':Math.abs(y)>.6?y<0?'up':'down':'';
      if(dir&&(dir!==lastDir||performance.now()>=repeatAt)){navigate(root,all,dir);repeatAt=performance.now()+(dir!==lastDir?350:150);}lastDir=dir;if(edge(0))confirm(root,all);if(edge(2)&&root.id==='scr-levelup'){const b=document.getElementById('lvl-reroll');if(visible(b)&&!b.disabled)b.click();}}
    if(edge(1))back(root);
    if(edge(9)&&!G.Dialog?.open){if(root?.id==='scr-pause')document.getElementById('btn-resume').click();else if(playing)G.Game.togglePause();}
    hints(scope());previous=states;
  }
  return {poll,button,axis:()=>axis,get using(){return using;},get connected(){return !!active;},get layout(){return layout();}};
})();
