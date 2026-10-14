/* NAS account controls live outside the generic settings renderer. */
G.NasUI=(()=>{
  const T=s=>G.T(s),esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const states={ok:'Guardado en navegador y NAS',pending:'Pendiente de sincronizar con NAS',syncing:'Sincronizando con NAS',offline:'Sin conexión: copia local conservada',conflict:'Conflicto: conserva ambas partidas', 'auth-required':'Vuelve a entrar para sincronizar', 'storage-error':'El navegador no pudo guardar la copia'};
  function update(){const el=document.getElementById('nas-state');if(el)el.textContent=T(states[G.DB.syncState]||G.DB.syncState);}
  G.DB.onSync(update);
  function render(box){if(!G.NAS?.enabled||G.DB.guest||!G.NAS.user)return;

    const panel=document.createElement('div');panel.id='nas-panel';panel.className='panel';panel.style.cssText='padding:12px;margin-top:12px';
    panel.innerHTML=`<b>${T('Guardado en navegador y NAS')}</b><p id="nas-state">${esc(T(states[G.DB.syncState]||G.DB.syncState))}</p>
      <button class="btn small" data-nas="reauth">${T('Volver a autenticar')}</button>
      <button class="btn small" data-nas="sync">${T('Sincronizar ahora')}</button>
      <button class="btn small" data-nas="history">${T('Historial NAS')}</button>
      <button class="btn small" data-nas="export">${T('Exportar copia local')}</button>
      <button class="btn small" data-nas="import">${T('Importar cuenta local')}</button>
      ${G.NAS.conflict?`<p>${T('Conflicto: conserva ambas partidas')}</p><button class="btn small" data-nas="browser">${T('Usar copia del navegador')}</button> <button class="btn small" data-nas="nas">${T('Usar copia del NAS')}</button>`:''}<div id="nas-history"></div>`;
    box.appendChild(panel);
    panel.querySelectorAll('[data-nas]').forEach(b=>b.onclick=async()=>{b.disabled=true;try{
      const action=b.dataset.nas;
      if(action==='reauth'){const p=prompt(T('Contraseña de cuenta NAS'));if(p){const r=await G.NAS.reauthenticate(p);if(!r.ok)throw Error(r.error);}}
      if(action==='sync')await G.NAS.refreshSave();
      if(action==='browser'||action==='nas')await G.NAS.resolve(action);
      if(action==='export'){const blob=new Blob([JSON.stringify({save:G.DB.save,conflict:G.NAS.conflict},null,2)],{type:'application/json'}),a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='pokesurvivor-local-backup.json';a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000);}
      if(action==='import'){const n=prompt(T('Nombre de cuenta local')),p=n&&prompt(T('Contraseña de cuenta local'));if(p){const r=await G.NAS.importLocal(n,p);if(!r.ok)throw Error(r.error||T('Pendiente de sincronizar con NAS'));}}
      if(action==='history'){const rows=await G.NAS.history(),h=panel.querySelector('#nas-history');h.textContent='';for(const row of rows){const btn=document.createElement('button');btn.className='btn small';btn.textContent=T('Restaurar versión')+' '+row.rev+' · '+new Date(row.at).toLocaleString(G.I18n.locale);btn.onclick=async()=>{if(confirm(T('¿Restaurar esta versión? La copia actual queda en el historial.'))){try{await G.NAS.restore(row.rev);G.SettingsUI.open('acc');}catch(e){G.UI.toast(e.message,4000);}}};h.appendChild(btn);}if(!rows.length)h.textContent=T('Sin versiones anteriores');return;}
      G.SettingsUI.open('acc');
    }catch(e){G.UI.toast(e.message,5000);}finally{b.disabled=false;}});
  }
  return {render};
})();
