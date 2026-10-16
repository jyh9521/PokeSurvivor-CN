/* NAS account controls live outside the generic settings renderer. */
G.NasUI=(()=>{
  const T=s=>G.T(s),esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const states={'device-busy':'Otra sesión controla la partida. Revisa tus dispositivos.',ok:'Guardado en navegador y NAS',pending:'Pendiente de sincronizar con NAS',syncing:'Sincronizando con NAS',offline:'Sin conexión: copia local conservada',conflict:'Conflicto: conserva ambas partidas', 'auth-required':'Vuelve a entrar para sincronizar', 'storage-error':'El navegador no pudo guardar la copia'};
  function update(){const el=document.getElementById('nas-state');if(el)el.textContent=T(states[G.DB.syncState]||G.DB.syncState);const reauth=document.querySelector('#nas-panel [data-nas="reauth"]');if(reauth)reauth.hidden=G.DB.syncState!=='auth-required';}
  G.DB.onSync(update);
  function render(box){if(!G.NAS?.enabled||G.DB.guest||!G.NAS.user)return;

    const panel=document.createElement('div');panel.id='nas-panel';panel.className='panel';panel.style.cssText='padding:12px;margin-top:12px';
    panel.innerHTML=`<b>${T('Guardado en navegador y NAS')}</b><p id="nas-state">${esc(T(states[G.DB.syncState]||G.DB.syncState))}</p>
      <button class="btn small" data-nas="reauth" ${G.DB.syncState==='auth-required'?'':'hidden'}>${T('Revalidar cuenta de juego')}</button>
      <button class="btn small" data-nas="sync">${T('Sincronizar ahora')}</button>
      <button class="btn small" data-nas="export">${T('Exportar copia local')}</button>
      ${G.NAS.conflict?`<p>${T('Conflicto: conserva ambas partidas')} · ${esc((G.NAS.conflict.differences||[]).map(k=>T(k==='economy'?'Monedas, tickets o recompensas':k==='base-expired'?'Copia base caducada':k)).join(' / '))}</p><button class="btn small" data-nas="browser">${T('Usar copia del navegador')}</button> <button class="btn small" data-nas="nas">${T('Usar copia del NAS')}</button>`:''}`;
    if(G.NAS.conflict?.save){
      const a=G.SaveDiff.summary(G.DB.save,G.NAS.revision),b=G.SaveDiff.summary(G.NAS.conflict.save,G.NAS.conflict.rev);
      const table=document.createElement('table');table.className='save-comparison';table.innerHTML=`<thead><tr><th>${T('Campo')}</th><th>${T('Navegador')}</th><th>NAS</th></tr></thead>`;
      const labels={rev:'Revisión',updated:'Último guardado',coins:'Monedas',t1:'Ticket individual',t10:'Ticket diez',owned:'Colección',shiny:'Shinies',upgrades:'Mejoras'};
      const body=document.createElement('tbody');for(const k of Object.keys(a)){const tr=document.createElement('tr');for(const v of [T(labels[k]),k==='updated'?(a[k]?new Date(a[k]).toLocaleString(G.I18n.lang):'—'):a[k],k==='updated'?(b[k]?new Date(b[k]).toLocaleString(G.I18n.lang):'—'):b[k]]){const td=document.createElement('td');td.textContent=v;tr.append(td);}body.append(tr);}table.append(body);panel.append(table);
      const detail=document.createElement('p');detail.className='sub';detail.textContent=T('Las colecciones se conservan de ambas copias. Monedas, tickets, mejoras y premios usan solo la copia elegida; nunca se suman.');panel.append(detail);
      const changed=document.createElement('p');changed.className='sub';changed.textContent=T('Campos distintos')+': '+G.SaveDiff.compare(G.DB.save,G.NAS.conflict.save).join(', ');panel.append(changed);
      const exportBoth=document.createElement('button');exportBoth.className='btn small gold';exportBoth.dataset.nas='export-both';exportBoth.textContent=T('Exportar ambas copias antes de elegir');panel.append(exportBoth);
    }

    const nickname=document.createElement('div');nickname.className='set-row nickname-row';
    const label=document.createElement('label');label.textContent=T('Apodo público');label.htmlFor='nas-nickname';
    const input=document.createElement('input');input.id='nas-nickname';input.className='field';input.maxLength=32;input.value=G.NAS.user.nick||G.NAS.user.name;input.setAttribute('translate','no');input.setAttribute('autocomplete','off');
    const button=document.createElement('button');button.className='btn small';button.id='nas-nickname-save';button.textContent=T('Guardar apodo');button.onclick=async()=>{button.disabled=true;const r=await G.NAS.setNickname(input.value);button.disabled=false;G.UI.toast(r.ok?T('Apodo actualizado; tu cuenta de acceso no cambia.'):r.error);if(r.ok)G.SettingsUI.open('acc');};
    nickname.append(label,input,button);box.append(nickname,panel);G.ServerControls?.render(box);G.Announcements?.controls(box);
    panel.querySelectorAll('[data-nas]').forEach(b=>b.onclick=async()=>{b.disabled=true;try{
      const action=b.dataset.nas;
      if(action==='reauth'){const p=await G.Dialog.password(T('Contraseña de tu cuenta de juego'));if(p){const r=await G.NAS.reauthenticate(p);if(!r.ok)throw Error(r.error);}}
      if(action==='sync')await G.NAS.refreshSave();
      if(action==='browser'||action==='nas'){if(!(await G.Dialog.confirm(action==='nas'?'Usar la economía del NAS y conservar las colecciones de ambas copias. ¿Continuar?':'Usar la economía del navegador y conservar las colecciones de ambas copias. ¿Continuar?',{danger:true})))return;await G.NAS.resolve(action);}
      if(action==='export'||action==='export-both'){const blob=new Blob([JSON.stringify(G.NAS.exportCopies(),null,2)],{type:'application/json'}),a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='pokesurvivor-local-backup.json';a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000);}
      G.SettingsUI.open('acc');
    }catch(e){G.UI.toast(e.message,5000);}finally{b.disabled=false;}});
  }
  return {render};
})();
