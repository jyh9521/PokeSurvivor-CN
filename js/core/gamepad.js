/* Native Gamepad API, standard mapping; no CDN or external input dependency. */
G.Gamepad=(()=>{
  let axis=[0,0],previous=[],active=null,repeatAt=0,lastDir='',armed=false;
  const read=i=>!!active?.buttons[i]?.pressed;
  function targets(){const tap=document.getElementById('tap-start');if(tap&&!tap.classList.contains('hidden')&&tap.getClientRects().length)return[tap];const overlays=['#scr-settings:not(.hidden)','#scr-profile:not(.hidden)','#pull-fx:not(.hidden)','#scr-item:not(.hidden)','#scr-bond:not(.hidden)','#scr-levelup:not(.hidden)','#scr-pause:not(.hidden)'];const scope=overlays.map(s=>document.querySelector(s)).find(Boolean)||document.querySelector('.scr:not(.hidden)');return scope?[...scope.querySelectorAll('button,a[href],select,input[type=checkbox],.card,.cell,.answer,[tabindex]')].filter(el=>!el.disabled&&el.getClientRects().length&&getComputedStyle(el).visibility!=='hidden'):[];}
  function navigate(dir){const all=targets();if(!all.length)return;const at=all.indexOf(document.activeElement);const next=all[(at+(dir==='left'||dir==='up'?-1:1)+all.length)%all.length];next.tabIndex=next.tabIndex<0?0:next.tabIndex;next.focus();next.scrollIntoView({block:'nearest'});}
  function poll(){axis=[0,0];if(!G.Settings.get('gamepad')||document.hidden){active=null;previous=[];armed=false;return;}
    let pads=[];try{pads=typeof navigator.getGamepads==='function'?Array.from(navigator.getGamepads()||[]):[];}catch{}const next=pads.find(p=>p?.connected&&p.mapping==='standard');
    if(!next){if(active&&G.Game.state==='playing')G.Game.togglePause();active=null;previous=[];armed=false;return;}
    if(active?.index!==next.index){previous=next.buttons.map(b=>!!b.pressed);armed=false;}active=next;
    const states=active.buttons.map(b=>!!b.pressed);if(!states.some(Boolean))armed=true;
    const edge=i=>armed&&states[i]&&!previous[i];const text=/^(INPUT|TEXTAREA)$/.test(document.activeElement?.tagName)&&document.activeElement?.type!=='checkbox';
    const playing=G.Game.state==='playing'&&!G.SettingsUI.isOpen&&!G.UI.isOpen('scr-pause');
    if(playing&&!text){let x=Number(active.axes[0])||0,y=Number(active.axes[1])||0;const len=Math.hypot(x,y);if(len>.2){const scale=Math.min(1,(len-.2)/.8)/len;axis=[x*scale,y*scale];}if(read(14)||read(15)||read(12)||read(13))axis=G.U.norm((read(15)?1:0)-(read(14)?1:0),(read(13)?1:0)-(read(12)?1:0));if(edge(4))G.Input.inject('keyq');if(edge(5))G.Input.inject('keye');if(edge(0))G.Coop?.ping('gather');if(edge(2))G.Coop?.ping('help');if(edge(3))G.Coop?.ping('danger');}
    else if(!text){const x=active.axes[0]||0,y=active.axes[1]||0;const dir=read(14)||x<-.6?'left':read(15)||x>.6?'right':read(12)||y<-.6?'up':read(13)||y>.6?'down':'';if(dir&&(dir!==lastDir||performance.now()>=repeatAt)){if(document.activeElement?.tagName==='SELECT'&&['up','down'].includes(dir)){const el=document.activeElement;el.selectedIndex=(el.selectedIndex+(dir==='up'?-1:1)+el.options.length)%el.options.length;el.dispatchEvent(new Event('change',{bubbles:true}));}else navigate(dir);repeatAt=performance.now()+(dir!==lastDir?350:150);}lastDir=dir;
      if(edge(0)){const all=targets();const el=all.includes(document.activeElement)?document.activeElement:all[0];if(el){el.tabIndex=0;el.focus();if(el.tagName==='SELECT'){if(edge(5))el.selectedIndex++;}else el.click();}}
    }
    if(!text&&edge(1)){if(G.UI.isOpen('scr-profile'))document.getElementById('prof-close').click();else if(!document.getElementById('pull-fx').classList.contains('hidden')){const b=document.getElementById('pull-close');if(!b.classList.contains('hidden'))b.click();}else if(G.Game.state==='ui'&&G.UI.isOpen('scr-lobby'))document.getElementById('lobby-menu').click();else G.Input.inject('escape');}
    if(!text&&edge(9))G.Input.inject('escape');previous=states;
  }
  return {poll,axis:()=>axis,get connected(){return !!active;}};
})();
