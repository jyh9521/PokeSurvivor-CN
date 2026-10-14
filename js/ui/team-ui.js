/* Compact touch/keyboard cooperation controls; player names remain raw text. */
G.TeamUI=(()=>{
  let panel,status,buttons=[],last=-Infinity;
  const keys={KeyR:'gather',KeyF:'help',KeyT:'danger'};
  function ping(kind){if(!G.Coop.active||performance.now()-last<3000)return;if(G.Coop.ping(kind))last=performance.now();}
  function update(){if(!panel)return;panel.hidden=!G.Coop.active;if(panel.hidden)return;
    for(const b of buttons)b.disabled=performance.now()-last<3000;
    status.replaceChildren();
    for(const m of G.Coop.mates){if(!m.connected)continue;const row=document.createElement('div');row.setAttribute('translate','no');const p=m.pl;
      row.textContent=m.name+' · '+(p.dead?G.T('Rescate')+' '+Math.round(Math.min(1,(p.net?.rev||0)/G.Player.REVIVE_TIME)*100)+'%':Math.max(0,Math.round(p.hp))+'/'+Math.round(p.maxHp));row.style.color=p.dead?'#ff9ca7':m.color;status.appendChild(row);}
  }
  function init(){panel=document.createElement('section');panel.id='team-controls';panel.hidden=true;panel.style.cssText='position:fixed;z-index:40;left:8px;bottom:110px;max-width:280px;padding:8px;background:#142448e8;border:1px solid #6b91d5;border-radius:8px;font:12px system-ui;pointer-events:auto';
    status=document.createElement('div');panel.appendChild(status);
    for(const[k,name,key]of [['gather','Reunirse','R'],['help','Ayuda','F'],['danger','Peligro','T']]){const b=document.createElement('button');b.className='btn small';b.dataset.teamPing=k;b.textContent=G.T(name)+' '+key;b.onclick=()=>ping(k);buttons.push(b);panel.appendChild(b);}
    document.body.appendChild(panel);setInterval(update,200);
    window.addEventListener('keydown',e=>{if(!e.repeat&&!/INPUT|TEXTAREA|SELECT/.test(e.target.tagName)&&keys[e.code]&&G.Game.state==='playing'){e.preventDefault();ping(keys[e.code]);}});
  }
  window.addEventListener('load',init);return {update};
})();
