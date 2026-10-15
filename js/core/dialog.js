/* Async in-game dialogs, without replacing native synchronous confirm. */
G.Dialog=(()=>{
  const queue=[];let current=null;
  function ask(text,options={}){return new Promise(resolve=>{queue.push({text,options,resolve});showNext();});}
  function showNext(){if(current||!queue.length)return;const request=queue.shift(),before=document.activeElement;
    const el=document.createElement('section');el.id='game-dialog';el.className='scr dim';el.setAttribute('role','dialog');el.setAttribute('aria-modal','true');el.setAttribute('aria-labelledby','game-dialog-title');
    const box=document.createElement('div');box.className='box';box.style.maxWidth='420px';
    const title=document.createElement('h3');title.id='game-dialog-title';title.textContent=G.T(request.options.title||'Confirmar');
    const message=document.createElement('p');message.className='sub';message.textContent=G.T(request.text);message.setAttribute('translate','no');box.append(title,message);
    let input=null;if(request.options.password){input=document.createElement('input');input.className='field';input.type='password';input.maxLength=64;input.autocomplete='current-password';input.setAttribute('aria-label',G.T('Contraseña'));box.appendChild(input);}
    const row=document.createElement('div');row.className='row';row.style.justifyContent='flex-end';row.style.marginTop='16px';
    const no=document.createElement('button'),yes=document.createElement('button');no.id='dialog-cancel';yes.id='dialog-confirm';no.className='btn ghost';yes.className='btn '+(request.options.danger?'danger':'gold');no.textContent=G.T('Cancelar');yes.textContent=G.T('Confirmar');row.append(no,yes);box.appendChild(row);el.appendChild(box);document.body.appendChild(el);
    function end(value){if(current?.element!==el)return;document.removeEventListener('keydown',keys,true);el.remove();current=null;if(before?.isConnected)before.focus({preventScroll:true});request.resolve(value);queueMicrotask(showNext);}
    function keys(e){if(e.key==='Escape'){e.preventDefault();e.stopImmediatePropagation();end(null);}else if(e.key==='Enter'&&e.target===input){e.preventDefault();yes.click();}else if(e.key==='Tab'){const all=[input,no,yes].filter(Boolean);const i=all.indexOf(document.activeElement);e.preventDefault();all[(i+(e.shiftKey?-1:1)+all.length)%all.length].focus();}}
    current={element:el,cancel:()=>end(null)};no.onclick=()=>end(null);yes.onclick=()=>{if(input&&!input.value){input.focus();return;}end(input?input.value:true);};document.addEventListener('keydown',keys,true);(input||no).focus();
  }
  return {confirm:async(text,options)=>!!(await ask(text,options)),password:(text,options={})=>ask(text,{...options,password:true}),cancel(){current?.cancel();},get element(){return current?.element||null;},get open(){return !!current||queue.length>0;}};
})();
