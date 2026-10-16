/* Public, read-only diagnostics. Exports metrics only, never accounts or saves. */
G.NetworkUI=(()=>{
  const T=s=>G.T(s),fields=[['directPeers','Conexiones directas WebRTC',''],['relayPeers','Conexiones por relé NAS',''],['pendingEvents','Eventos pendientes de confirmar',''],['nasRttMs','RTT navegador ↔ NAS','ms'],['peerRttMs','RTT entre jugadores vía NAS','ms'],['jitterMs','Variación del RTT al NAS','ms'],['fps','FPS del navegador',''],['targetHz','Frecuencia objetivo','Hz'],['sendHz','Envíos por conexión','Hz'],['receiveHz','Recepciones por conexión','Hz'],['bufferedBytes','Cola del navegador','bytes'],['serverBufferedBytes','Cola del NAS hacia ti','bytes'],['coalescedFrames','Estados antiguos combinados','']];
  let button,panel;
  function update(){
    if(!button)return;button.hidden=!G.NAS?.enabled||!G.NAS.user||G.DB.guest;
    if(button.hidden){panel.hidden=true;return;}const m=G.NAS.networkMetrics();
    const latency=m.peerRttMs??m.nasRttMs;const value=m.connected?(latency==null?'—':Math.round(latency)+' ms'):'—';button.querySelector('[data-latency]').textContent=value;button.dataset.health=!m.connected?'offline':latency==null?'pending':latency<120?'good':latency<250?'fair':'poor';button.title=T(m.peerRttMs!=null?'RTT entre jugadores vía NAS':'RTT navegador ↔ NAS');button.setAttribute('aria-label',button.title+': '+value);if(panel.hidden)return;
    panel.querySelector('[data-network="status"]').textContent=T(m.connected?'Conectado por NAS':'Sin conexión al NAS')+(m.directPeers?' · WebRTC':'')+(m.background?' · '+T('Pestaña en segundo plano'):'');panel.querySelector('[data-network-links]').textContent=(m.peerLinks||[]).map(p=>[p.mode,p.ice,p.reason,'#'+p.attempts,p.path?`${p.path.localType} ↔ ${p.path.remoteType} ${p.path.protocol} ${p.path.rttMs??'—'} ms`:''].join(' / ')).join(' · ');
    for(const[k,,unit]of fields){const n=m[k];panel.querySelector('[data-network="'+k+'"]').textContent=n==null?'—':(Math.round(n*10)/10).toLocaleString(G.I18n.lang)+(unit?' '+unit:'');}
    panel.querySelector('[data-network="timeouts"]').textContent=m.probeTimeouts+' / '+(m.probeReplies+m.probeTimeouts);
    panel.querySelector('[data-network="disconnects"]').textContent=m.disconnects;
  }
  function init(){
    button=document.createElement('button');button.id='nas-network-toggle';button.className='hud-action';button.title=T('Diagnóstico de red');button.innerHTML='<span class=network-signal aria-hidden=true><i></i><i></i><i></i></span><span data-latency>—</span>';button.hidden=true;
    panel=document.createElement('section');panel.id='nas-network-panel';panel.dataset.uiLayer='';panel.className='panel';panel.hidden=true;
    panel.innerHTML='<p class="sub" data-network-links translate="no"></p><b>'+T('Diagnóstico de red')+'</b><p data-network="status"></p>'+fields.map(([k,label])=>'<div class="network-row"><span>'+T(label)+'</span><strong data-network="'+k+'">—</strong></div>').join('')+'<div class="network-row"><span>'+T('Sondas agotadas / completadas')+'</span><strong data-network="timeouts"></strong></div><div class="network-row"><span>'+T('Desconexiones')+'</span><strong data-network="disconnects"></strong></div><p class="sub">'+T('Las sondas vencen a los 5 s; no es una medición de pérdida de paquetes. El RTT entre jugadores incluye el NAS y la respuesta del otro navegador.')+'</p><button class="btn small" data-network-export>'+T('Exportar diagnóstico')+'</button> <button class="btn small" data-ui-back data-network-close>'+T('Cerrar')+'</button>';
    document.body.append(button,panel);button.onclick=()=>{panel.hidden=!panel.hidden;update();};panel.querySelector('[data-network-close]').onclick=()=>panel.hidden=true;
    panel.querySelector('[data-network-export]').onclick=()=>{const value={format:2,version:'0.8.0',recordedAt:new Date().toISOString(),metrics:G.NAS.networkMetrics()},blob=new Blob([JSON.stringify(value,null,2)],{type:'application/json'}),a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='pokesurvivor-network.json';a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000);};
    update();setInterval(update,1000);
  }
  window.addEventListener('load',init);return {update};
})();
