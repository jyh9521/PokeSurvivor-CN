/* Keyboard, pointer/touch and L3 share the same activation path. */
G.BattleUI=(()=>{
  let panel,select,button,info,previous='';
  function blocked(){return ['scr-pause','scr-levelup','scr-item','scr-bond'].some(id=>G.UI.isOpen(id));}
  function cycle(){if(!select||select.disabled||G.Game.state!=='playing'||blocked())return false;select.selectedIndex=(select.selectedIndex+1)%select.options.length;return true;}
  function activate(){const p=G.Game.player;if(G.Game.state!=='playing'||G.SettingsUI.isOpen||blocked()||!p)return false;return G.Battle.activate(p,select.value);}
  function update(){if(!panel)return;const p=G.Game.player,shown=G.Game.state==='playing'&&p?.battle&&!G.SettingsUI.isOpen&&!blocked();panel.hidden=!shown;if(!shown)return;
    const b=p.battle;const key=p.dex+':'+b.used;if(key!==previous){previous=key;const choice=select.value||'z';select.replaceChildren();for(const[k,n]of [['z','Z-Move'],['mega','Mega'],['max','Dynamax']])if(G.Battle.available(p,k)){const o=document.createElement('option');o.value=k;o.textContent=G.T(n);select.appendChild(o);}select.value=[...select.options].some(o=>o.value===choice)?choice:'z';}
    select.disabled=b.used;button.disabled=p.dead||b.used||b.energy<100;button.textContent=b.form?G.T(b.form==='mega'?'Mega':'Dynamax')+' '+Math.ceil(b.remaining)+'s':b.used?G.T('Used this run'):G.T('Activate')+' '+Math.floor(b.energy)+'%';
    info.textContent=G.T(G.Battle.trait(p).title)+' · '+Object.entries(p.passives).map(([id,n])=>G.T(G.PassiveDefs.find(d=>d.id===id).name)+' '+n).join(' / ');
  }
  addEventListener('load',()=>{panel=document.createElement('section');panel.id='battle-controls';panel.hidden=true;panel.innerHTML='<div><select id="battle-form" aria-label="'+G.T('Special form')+'"></select><button id="battle-activate" class="btn small">'+G.T('Activate')+'</button><kbd>C / R3 · V / L3</kbd></div><small id="battle-info"></small>';document.body.appendChild(panel);select=panel.querySelector('select');button=panel.querySelector('button');info=panel.querySelector('small');button.onclick=activate;panel.title=G.T('Choose one special per run: Mega 30s, Dynamax 20s, or one Z burst.');setInterval(update,100);});
  addEventListener('keydown',e=>{if(!e.repeat&&!/INPUT|TEXTAREA|SELECT/.test(e.target.tagName)){if(e.code==='KeyV')activate();if(e.code==='KeyC')cycle();}});
  return {activate,cycle,update};
})();
