/* In-game form chips never create a menu scope or retain movement-key focus. */
G.BattleUI=(()=>{
  let panel,forms,button,info,meter,current=null,choice='z';
  const labels={z:'Z-Move',mega:'Mega',max:'Dynamax'};
  function blocked(){return ['scr-pause','scr-levelup','scr-item','scr-bond'].some(id=>G.UI.isOpen(id));}
  function playing(){return G.Game.state==='playing'&&!G.SettingsUI.isOpen&&!blocked()&&!!G.Game.player?.battle;}
  function releaseFocus(){if(panel?.contains(document.activeElement))document.activeElement.blur();}
  function choose(kind){const p=G.Game.player;if(!playing()||p.dead||p.battle.used||!G.Battle.available(p,kind))return false;choice=kind;releaseFocus();update();return true;}
  function cycle(){if(!playing())return false;const available=Object.keys(labels).filter(k=>G.Battle.available(G.Game.player,k));return choose(available[(available.indexOf(choice)+1)%available.length]);}
  function activate(){const p=G.Game.player;if(!playing())return false;releaseFocus();const result=G.Battle.activate(p,choice);update();return result;}
  function update(){if(!panel)return;const p=G.Game.player,shown=playing();panel.hidden=!shown;if(!shown){releaseFocus();return;}
    if(current!==p){current=p;choice='z';forms.replaceChildren();for(const[k,n]of Object.entries(labels))if(G.Battle.available(p,k)){const chip=document.createElement('button');chip.type='button';chip.className='battle-choice';chip.dataset.battleChoice=k;chip.textContent=G.T(n);chip.onclick=()=>choose(k);forms.appendChild(chip);}}
    const b=p.battle;if(!G.Battle.available(p,choice))choice='z';
    for(const chip of forms.children){const selected=chip.dataset.battleChoice===choice;chip.classList.toggle('on',selected);chip.setAttribute('aria-pressed',String(selected));chip.disabled=b.used||p.dead;}
    const energy=Math.max(0,Math.min(100,Number(b.energy)||0));meter.style.setProperty('--charge',energy+'%');meter.setAttribute('aria-valuenow',String(Math.floor(energy)));meter.hidden=b.used;
    panel.classList.toggle('ready',!b.used&&energy>=100);button.disabled=p.dead||b.used||energy<100;button.textContent=b.form?G.T(labels[b.form])+' '+Math.ceil(b.remaining)+'s':b.used?G.T('Used this run'):G.T('Activate')+' '+Math.floor(energy)+'%';
    info.textContent=[G.T(G.Battle.trait(p).title),...Object.entries(p.passives).map(([id,n])=>G.T(G.PassiveDefs.find(d=>d.id===id).name)+' '+n)].join(' · ');info.title=info.textContent;
  }
  addEventListener('load',()=>{panel=document.createElement('section');panel.id='battle-controls';panel.hidden=true;panel.setAttribute('aria-label',G.T('Special forms'));
    forms=document.createElement('div');forms.id='battle-form';forms.setAttribute('role','group');forms.setAttribute('aria-label',G.T('Special form'));panel.appendChild(forms);
    meter=document.createElement('div');meter.id='battle-charge';meter.setAttribute('role','progressbar');meter.setAttribute('aria-label',G.T('Special forms'));meter.setAttribute('aria-valuemin','0');meter.setAttribute('aria-valuemax','100');panel.appendChild(meter);
    const actions=document.createElement('div');actions.className='battle-actions';button=document.createElement('button');button.type='button';button.id='battle-activate';button.className='btn small gold';button.onclick=activate;actions.appendChild(button);panel.appendChild(actions);const hints=document.createElement('div');hints.id='battle-shortcuts';for(const[keys,label]of [['C / R3','Switch special'],['V / L3','Activate']]){const row=document.createElement('div'),key=document.createElement('kbd'),text=document.createElement('span');key.textContent=keys;text.textContent=G.T(label);row.append(key,text);hints.appendChild(row);}panel.appendChild(hints);
    info=document.createElement('small');info.id='battle-info';panel.appendChild(info);panel.title=G.T('Choose one special per run: Mega 30s, Dynamax 20s, or one Z burst.');document.body.appendChild(panel);
    panel.addEventListener('pointerdown',e=>{if(e.target.closest('button')&&e.button===0)e.preventDefault();});setInterval(update,100);
  });
  addEventListener('keydown',e=>{if(panel?.contains(e.target)&&/^Arrow/.test(e.key))releaseFocus();if(!e.repeat&&!e.ctrlKey&&!e.altKey&&!e.metaKey&&!/INPUT|TEXTAREA|SELECT/.test(e.target.tagName)){if(e.code==='KeyV')activate();if(e.code==='KeyC')cycle();}});
  return {activate,cycle,update};
})();
