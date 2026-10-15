/* Layer ownership shared by keyboard, mouse and controllers. Opening order is
 * meaningful when a child keeps its parent visible at the same CSS z-index. */
G.UIFocus=(()=>{
  const selector='.scr,[data-ui-layer]',states=new Map(),restore=new WeakMap(),preferred=new WeakMap();
  let serial=0,lastAction=null;
  const visible=el=>!!el?.isConnected&&!el.closest('.hidden,[hidden],[inert]')&&!!el.getClientRects().length&&getComputedStyle(el).visibility!=='hidden';
  const controlSelector='button,a[href],input,select,textarea,.card,.cell,.answer,.chip,.gen-tab,.tab,.fav-slot,[tabindex]';
  const snapshot=target=>target?{target,owner:target.closest(selector),key:target.id||target.dataset.focusKey}:null;
  document.addEventListener('click',e=>lastAction=snapshot(e.target.closest(controlSelector)||document.activeElement),true);
  function restoreLayer(el){const entry=restore.get(el);if(!entry)return;let {target,owner,key}=entry;
    if(!visible(target)&&owner?.isConnected&&key)target=[...owner.querySelectorAll('[id],[data-focus-key]')].find(n=>(n.id||n.dataset.focusKey)===key);
    if(visible(target)&&!target.disabled&&owner)preferred.set(owner,target);
  }
  function z(el){let value=0;for(let n=el;n&&n!==document.body;n=n.parentElement)value=Math.max(value,Number(getComputedStyle(n).zIndex)||0);return value;}
  function sync(){
    const nodes=[...document.querySelectorAll(selector)];
    for(const el of nodes){const on=visible(el),old=states.get(el);
      if(on&&!old?.on){const origin=lastAction||snapshot(document.activeElement);
        if(origin&&!el.contains(origin.target))restore.set(el,origin);
        states.set(el,{on:true,order:++serial});
      }else if(!on&&old?.on){old.on=false;restoreLayer(el);
      }
    }
    for(const el of states.keys())if(!el.isConnected||!el.matches(selector)){restoreLayer(el);states.delete(el);}
  }
  function top(){sync();if(G.Dialog?.element)return G.Dialog.element;
    return [...states].filter(([,s])=>s.on).sort(([a,x],[b,y])=>z(b)-z(a)||(a.contains(b)?1:b.contains(a)?-1:y.order-x.order))[0]?.[0]||null;
  }
  function enter(el){sync();if(!visible(el)){const origin=document.activeElement;if(origin&&origin!==document.body)lastAction=snapshot(origin);}}
  function take(root){const el=preferred.get(root);preferred.delete(root);return el;}
  function pages(root){return [...root?.querySelectorAll('[data-ui-tabs],.tabs,.gen-tabs,.filters')||[]].map(group=>({group,items:[...group.children].filter(el=>visible(el)&&!el.disabled&&el.matches('button,.tab,.gen-tab,.chip')&&typeof el.onclick==='function')})).filter(g=>g.items.length>1);}
  function page(root,delta){const groups=pages(root),current=groups.find(g=>g.group.contains(document.activeElement))||groups[0];if(!current)return false;
    const i=Math.max(0,current.items.findIndex(el=>el.matches('.on,[aria-selected=true]'))),next=current.items[Math.max(0,Math.min(current.items.length-1,i+delta))];
    if(next!==current.items[i]){next.click();const selected=visible(next)?next:[...current.group.children].find(el=>visible(el)&&el.matches('.on,[aria-selected=true]'));selected?.focus({preventScroll:true});}return true;
  }
  // Native keyboard focus may not escape the currently owning layer.
  document.addEventListener('keydown',e=>{if(e.key!=='Tab')return;const root=top();if(!root)return;const items=[...root.querySelectorAll('button,a[href],input,select,textarea,[tabindex]')].filter(el=>visible(el)&&!el.disabled&&el.tabIndex>=0);if(!items.length)return;const i=items.indexOf(document.activeElement),n=e.shiftKey?i<=0?items.length-1:i-1:i<0||i===items.length-1?0:i+1;e.preventDefault();items[n].focus();},true);
  function back(root){
    if(G.Dialog?.open){G.Dialog.cancel();return true;}
    if(G.SelectPopup?.element){G.SelectPopup.close();return true;}
    if(root?.onuiback){root.onuiback();return true;}
    const button=[...root?.querySelectorAll('[data-ui-back],[data-back]')||[]].find(el=>visible(el)&&!el.disabled);
    if(button){button.click();return true;}return false;
  }
  let keyboardScope=null;
  new MutationObserver(()=>{const root=top();if(root===keyboardScope)return;keyboardScope=root;if(!root)return;
    const restored=take(root),candidate=visible(restored)?restored:[...root.querySelectorAll(controlSelector)].find(el=>visible(el)&&!el.disabled&&!el.matches('[aria-disabled=true],.locked')&&!el.closest('.cards.done')&&(el.matches('button,a,input,select,textarea,[tabindex]')||typeof el.onclick==='function'));
    if(candidate&&(!root.contains(document.activeElement)||restored)){if(candidate.tabIndex<0)candidate.tabIndex=0;candidate.focus({preventScroll:true});}
  }).observe(document.documentElement,{subtree:true,childList:true,attributes:true,attributeFilter:['class','hidden','data-ui-layer']});
  return {top,enter,take,pages,page,back,visible};
})();
