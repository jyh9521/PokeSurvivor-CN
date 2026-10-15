/* Shared viewport portal for native selects. The select remains the form value
 * and change-event owner; the browser's OS popup is never scaled/clipped by a
 * scrolling game panel. Pad selection keeps its transactional A/B semantics. */
G.SelectPopup=(()=>{
  let popup=null,source=null,before='',index=0;
  function close(){if(!popup)return;popup.remove();popup=null;const s=source;source=null;if(s?.isConnected)s.focus({preventScroll:true});}
  function highlight(){if(!popup)return;[...popup.children].forEach((b,i)=>{b.classList.toggle('on',i===index);b.setAttribute('aria-selected',String(i===index));});popup.children[index]?.focus({preventScroll:true});popup.children[index]?.scrollIntoView({block:'nearest'});}
  function choose(){if(!source)return;const s=source,v=popup.children[index]?.dataset.value;close();if(!s.disabled&&v!==undefined&&[...s.options].some(o=>o.value===v&&!o.disabled&&!o.hidden)&&s.value!==v){s.value=v;s.dispatchEvent(new Event('change',{bubbles:true}));}}
  function position(){if(!popup||!source)return;const r=source.getBoundingClientRect(),gap=6,pad=8,below=innerHeight-r.bottom-pad,above=r.top-pad,height=Math.min(360,Math.max(below,above));popup.style.width=Math.min(Math.max(r.width,220),innerWidth-pad*2)+'px';popup.style.maxHeight=Math.max(48,height)+'px';popup.style.left=Math.max(pad,Math.min(r.left,innerWidth-popup.offsetWidth-pad))+'px';popup.style.top=(below>=Math.min(220,height)?r.bottom+gap:Math.max(pad,r.top-popup.offsetHeight-gap))+'px';}
  function open(s){if(popup&&source===s){close();return;}close();source=s;before=s.value;popup=document.createElement('div');popup.className='select-popup';popup.dataset.uiLayer='';popup.style.zoom=1/((Number(getComputedStyle(document.documentElement).zoom)||1)*(Number(getComputedStyle(document.body).zoom)||1));popup.setAttribute('role','listbox');popup.setAttribute('aria-label',s.labels?.[0]?.textContent||s.getAttribute('aria-label')||G.T('Elegir'));index=0;
    for(const o of s.options){if(o.hidden||o.disabled)continue;const b=document.createElement('button');b.type='button';b.className='select-option';b.setAttribute('role','option');b.textContent=G.T(o.textContent);b.dataset.value=o.value;if(o.value===before)index=popup.children.length;b.onclick=()=>{index=[...popup.children].indexOf(b);choose();};popup.appendChild(b);}
    popup.addEventListener('focusin',e=>{const n=[...popup.children].indexOf(e.target);if(n>=0){index=n;[...popup.children].forEach((b,i)=>{b.classList.toggle('on',i===index);b.setAttribute('aria-selected',String(i===index));});}});
    s.focus({preventScroll:true});G.UIFocus.enter(popup);
    document.body.appendChild(popup);position();highlight();
  }
  document.addEventListener('pointerdown',e=>{const s=e.target.closest('select');if(s&&!s.disabled&&s.size<=1&&!s.multiple){e.preventDefault();open(s);}else if(popup&&!popup.contains(e.target)){close();}},true);
  document.addEventListener('keydown',e=>{if(popup){if(['Escape','ArrowUp','ArrowDown','Home','End','Enter',' '].includes(e.key)){e.preventDefault();e.stopImmediatePropagation();if(e.key==='Escape')close();else if(e.key==='Enter'||e.key===' ')choose();else{index=e.key==='Home'?0:e.key==='End'?popup.children.length-1:Math.max(0,Math.min(popup.children.length-1,index+(e.key==='ArrowUp'?-1:1)));highlight();}}}else if(e.target.tagName==='SELECT'&&['Enter',' ','ArrowDown','ArrowUp'].includes(e.key)){e.preventDefault();e.stopImmediatePropagation();open(e.target);}},true);
  new MutationObserver(()=>{if(popup&&(G.Dialog?.open||!source?.isConnected||source.disabled||source.closest('.hidden,[hidden],[inert]')))close();}).observe(document.documentElement,{subtree:true,childList:true,attributes:true,attributeFilter:['class','hidden','disabled']});
  window.addEventListener('resize',position);window.addEventListener('scroll',e=>{if(popup&&!popup.contains(e.target))position();},true);
  function navigate(direction){if(!popup)return;const delta=direction==='up'?-1:direction==='down'?1:0;if(!delta)return;index=Math.max(0,Math.min(popup.children.length-1,index+delta));highlight();}
  return {open,close,navigate,choose,get element(){return popup;}};
})();
