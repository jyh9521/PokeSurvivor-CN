/* Account-scoped controls use existing dialog/focus/button infrastructure. */
G.ServerControls=(()=>{
  const T=s=>G.T(s);
  function element(tag,text,cls){const e=document.createElement(tag);if(text)e.textContent=T(text);if(cls)e.className=cls;return e;}
  function button(text,run,cls='btn small'){const b=element('button',text,cls);b.onclick=async()=>{b.disabled=true;try{await run();}catch(e){G.UI.toast(e.message,5000);}finally{b.disabled=false;}};return b;}
  function render(box){
    const panel=element('section',null,'panel server-controls');panel.append(element('h3','Dispositivos de la cuenta'));
    panel.append(element('p','Una partida activa por cuenta. Revocar requiere tu contraseña; no borra partidas.','sub'));
    const list=element('div');let showing=false;
    const refresh=async()=>{const r=await G.NAS.devices();list.replaceChildren();for(const d of r.devices){const row=element('div',null,'device-row');
      const info=element('span');info.textContent=(d.current?T('Este dispositivo')+' · ':'')+d.label+' · '+T('Última actividad')+': '+(d.seen?new Date(d.seen).toLocaleString():T('Desconocida'));info.setAttribute('translate','no');row.append(info);
      if(!d.current)row.append(button('Revocar',async()=>{const p=await G.Dialog.password('Contraseña de tu cuenta de juego');if(p){await G.NAS.revokeDevice(d.id,p);await refresh();}}));list.append(row);}
      if(r.activeElsewhere)list.append(button('Tomar control de la partida',async()=>{if(!(await G.Dialog.confirm('La otra partida se desconectará. ¿Tomar el control?',{danger:true})))return;const p=await G.Dialog.password('Contraseña de tu cuenta de juego');if(p){await G.NAS.takeover(p);await refresh();}}));};
    panel.append(button('Ver dispositivos',async()=>{showing=!showing;list.hidden=!showing;if(showing)await refresh();}),button('Revocar otros dispositivos',async()=>{if(!(await G.Dialog.confirm('¿Cerrar las otras sesiones?',{danger:true})))return;const p=await G.Dialog.password('Contraseña de tu cuenta de juego');if(p){await G.NAS.revokeDevice('others',p);if(showing)await refresh();}}),list);list.hidden=true;box.append(panel);
    if(!G.NAS.isAdmin)return;
    const admin=element('section',null,'panel server-controls');admin.append(element('h3','Administración del servidor'));
    const status=element('p',null,'sub'),input=element('textarea',null,'field');input.maxLength=200;input.rows=2;input.setAttribute('aria-label',T('Aviso de mantenimiento'));
    const show=r=>{status.textContent=T(r.draining?'Mantenimiento: sin nuevas partidas':'Servidor abierto')+' · '+T('Partidas activas')+': '+r.activeRuns+' · '+T('Salas en partida')+': '+r.activeRooms+(r.ready?' · '+T('Listo para actualizar'):'');};
    const change=async op=>{if(op==='force'&&!(await G.Dialog.confirm('Emergencia: terminar las partidas en 10 s y actualizar. ¿Continuar?',{danger:true})))return;show(await G.NAS.administer(op,input.value,op==='force'?'jyh9521':undefined));};
    admin.append(status,input,button('Activar mantenimiento',()=>change('drain')),button('Reabrir servidor',()=>change('resume')),button('Actualizar estado',async()=>show(await G.NAS.adminStatus())),button('Actualización urgente',()=>change('force'),'btn small danger'));
    box.append(admin);G.NAS.adminStatus().then(show).catch(e=>status.textContent=e.message);
  }
  let banner;
  function maintenance(value){if(!banner){banner=element('aside',null,'maintenance-banner');banner.setAttribute('role','status');document.body.append(banner);}banner.hidden=!value.draining;banner.textContent=T('Mantenimiento: termina tu partida; las cuentas y partidas se conservan.')+(value.message?' · '+value.message:'');banner.setAttribute('translate','no');}
  window.addEventListener('load',()=>G.NAS?.onOperations(maintenance));
  return {render};
})();
