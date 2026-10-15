/* Live server announcements: bounded queues, plain text, no gameplay input capture. */
G.Announcements=(()=>{
  const pending=[],seen=new Set();let showing=false,timer=null;
  const inRun=()=>G.Game&&G.Game.state!=='ui'&&G.Game.state!=='over';
  function receive(m){if(!m||typeof m.id!=='string'||typeof m.text!=='string'||[...m.text].length>200||seen.has(m.id))return;seen.add(m.id);if(seen.size>100)seen.delete(seen.values().next().value);if(pending.length<5)pending.push(m.text);pump();}
  function pump(){if(showing||!pending.length)return;
    // Do not interrupt existing confirmations or text entry. Re-evaluate run state on delivery.
    if(G.Dialog?.open||/^(INPUT|TEXTAREA)$/.test(document.activeElement?.tagName)){clearTimeout(timer);timer=setTimeout(pump,500);return;}
    showing=true;const text=pending.shift();
    if(inRun()){
      const layer=document.createElement('div');layer.className='announcement-lane';layer.setAttribute('role','status');
      const message=document.createElement('span');message.textContent=G.T('Anuncio del servidor')+' · '+text;message.setAttribute('translate','no');layer.append(message);document.body.append(layer);
      const duration=Math.min(20000,Math.max(10000,[...text].length*130));
      const animation=message.animate([{transform:'translateX(0)'},{transform:'translateX(calc(-100vw - 100%))'}],{duration,easing:'linear'});
      animation.finished.catch(()=>{}).finally(()=>{layer.remove();showing=false;pump();});
    }else G.Dialog.notice(text).finally(()=>{showing=false;pump();});
  }
  function controls(box){if(!G.NAS.canAnnounce)return;
    const panel=document.createElement('div');panel.className='panel announcement-controls';
    const label=document.createElement('label');label.textContent=G.T('Anuncio del servidor');label.htmlFor='announcement-text';
    const input=document.createElement('textarea');input.id='announcement-text';input.className='field';input.maxLength=400;input.rows=2;
    const hint=document.createElement('p');hint.className='sub';hint.textContent=G.T('Hasta 200 caracteres, 3 envíos por minuto. Solo jugadores conectados.');
    const button=document.createElement('button');button.className='btn small';button.textContent=G.T('Enviar anuncio');
    button.onclick=async()=>{button.disabled=true;try{const r=await G.NAS.announce(input.value);G.UI.toast(r.ok?G.T('Anuncio enviado'):r.error);if(r.ok)input.value='';}finally{button.disabled=false;}};
    panel.append(label,input,hint,button);box.append(panel);
  }
  return {receive,controls};
})();
