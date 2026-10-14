/* Public, read-only diagnostics. Exports metrics only, never accounts or saves. */
G.NetworkUI=(()=>{
  const T=s=>G.T(s),fields=[['directPeers','Conexiones directas WebRTC',''],['relayPeers','Conexiones por relé NAS',''],['pendingEvents','Eventos pendientes de confirmar',''],['nasRttMs','RTT navegador ↔ NAS','ms'],['peerRttMs','RTT entre jugadores vía NAS','ms'],['jitterMs','Variación del RTT al NAS','ms'],['fps','FPS del navegador',''],['targetHz','Frecuencia objetivo','Hz'],['sendHz','Envíos por conexión','Hz'],['receiveHz','Recepciones por conexión','Hz'],['bufferedBytes','Cola del navegador','bytes'],['serverBufferedBytes','Cola del NAS hacia ti','bytes'],['coalescedFrames','Estados antiguos combinados','']];
  let button,panel;
  function update(){
    if(!button)return;button.hidden=!G.NAS?.enabled||!G.NAS.user||G.DB.guest;
    if(button.hidden){panel.hidden=true;return;}if(panel.hidden)return;
    const m=G.NAS.networkMetrics();
    panel.querySelector('[data-network="status"]').textContent=T(m.connected?'Conectado por NAS':'Sin conexión al NAS')+(m.directPeers?' · WebRTC':'')+(m.background?' · '+T('Pestaña en segundo plano'):'');
    for(const[k,,unit]of fields){const n=m[k];panel.querySelector('[data-network="'+k+'"]').textContent=n==null?'—':(Math.round(n*10)/10).toLocaleString(G.I18n.lang)+(unit?' '+unit:'');}
    panel.querySelector('[data-network="timeouts"]').textContent=m.probeTimeouts+' / '+(m.probeReplies+m.probeTimeouts);
    panel.querySelector('[data-network="disconnects"]').textContent=m.disconnects;
  }
  function init(){
    button=document.createElement('button');button.id='nas-network-toggle';button.className='btn small';button.textContent=T('Diagnóstico de red');button.hidden=true;
    panel=document.createElement('section');panel.id='nas-network-panel';panel.className='panel';panel.hidden=true;
    panel.innerHTML='<b>'+T('Diagnóstico de red')+'</b><p data-network="status"></p>'+fields.map(([k,label])=>'<div class="network-row"><span>'+T(label)+'</span><strong data-network="'+k+'">—</strong></div>').join('')+'<div class="network-row"><span>'+T('Sondas agotadas / completadas')+'</span><strong data-network="timeouts"></strong></div><div class="network-row"><span>'+T('Desconexiones')+'</span><strong data-network="disconnects"></strong></div><p class="sub">'+T('Las sondas vencen a los 5 s; no es una medición de pérdida de paquetes. El RTT entre jugadores incluye el NAS y la respuesta del otro navegador.')+'</p><button class="btn small" data-network-export>'+T('Exportar diagnóstico')+'</button> <button class="btn small" data-network-close>'+T('Cerrar')+'</button>';
    document.body.append(button,panel);button.onclick=()=>{panel.hidden=!panel.hidden;update();};panel.querySelector('[data-network-close]').onclick=()=>panel.hidden=true;
    panel.querySelector('[data-network-export]').onclick=()=>{const value={format:1,version:'0.3.0',recordedAt:new Date().toISOString(),metrics:G.NAS.networkMetrics()},blob=new Blob([JSON.stringify(value,null,2)],{type:'application/json'}),a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='pokesurvivor-network.json';a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000);};
    update();setInterval(update,1000);
  }
  window.addEventListener('load',init);return {update};
})();
