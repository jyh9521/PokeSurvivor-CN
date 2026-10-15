/* HUD-sized cooperation shortcuts; no duplicate health panel or in-run host controls. */
G.TeamUI=(()=>{
  let panel,status,buttons=[],last=-Infinity;
  const keys={KeyR:'gather',KeyF:'help',KeyT:'danger'};
  function ping(kind){if(!G.Coop.active||G.Game.state!=='playing'||G.SettingsUI.isOpen||performance.now()-last<3000)return;if(G.Coop.ping(kind))last=performance.now();}
  function update(){if(!panel)return;panel.hidden=!G.Coop.active||G.Game.state!=='playing'||G.SettingsUI.isOpen;if(panel.hidden)return;
    for(const [i,b]of buttons.entries()){b.disabled=performance.now()-last<3000;const key=G.Gamepad?.using?G.Gamepad.button([0,2,3][i]):['R','F','T'][i];b.querySelector('kbd').textContent=key;b.title=b.getAttribute('aria-label')+' ('+key+')';}
    panel.style.top=(82+G.Coop.mates.filter(m=>m.connected).length*15)+'px';
    status.replaceChildren();
    for(const m of G.Coop.mates){if(!m.connected||!m.pl.dead)continue;const row=document.createElement('div');row.setAttribute('translate','no');row.textContent=m.name+' · '+G.T('Rescate')+' '+Math.round(Math.min(1,(m.pl.net?.rev||0)/G.Player.REVIVE_TIME)*100)+'%';status.appendChild(row);}
    status.hidden=!status.childElementCount;
  }
  function init(){panel=document.createElement('section');panel.id='team-controls';panel.hidden=true;panel.setAttribute('aria-label',G.T('Marcas de equipo'));
    const actions=document.createElement('div');actions.className='team-actions';panel.appendChild(actions);
    for(const[k,name,key,icon]of [['gather','Reunirse','R','bond'],['help','Ayuda','F','heart'],['danger','Peligro','T','flag']]){const b=document.createElement('button');b.className='hud-action';b.dataset.teamPing=k;b.title=G.T(name)+' ('+key+')';b.setAttribute('aria-label',G.T(name));b.innerHTML=G.Icons.html(icon,14)+'<span>'+G.T(name)+'</span><kbd>'+key+'</kbd>';b.onclick=()=>ping(k);buttons.push(b);actions.appendChild(b);}
    status=document.createElement('div');status.id='team-rescue';status.hidden=true;panel.appendChild(status);
    document.body.appendChild(panel);setInterval(update,100);
    window.addEventListener('keydown',e=>{if(!e.repeat&&!/INPUT|TEXTAREA|SELECT/.test(e.target.tagName)&&keys[e.code]&&G.Game.state==='playing'){e.preventDefault();ping(keys[e.code]);}});
  }
  window.addEventListener('load',init);return {update};
})();
