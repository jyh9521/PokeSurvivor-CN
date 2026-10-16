/* Optional NAS-only modes. Normal four-player rooms remain the default. */
G.ChallengeUI=(()=>{
  const T=s=>G.T(s);let panel,period='d',request=0,rules=null;
  function availability(){for(const id of ['menu-challenges','menu-experiment']){const b=document.getElementById(id);if(b)b.hidden=!G.NAS?.enabled||!G.NAS.user||G.DB.guest;}}
  async function refresh(){
    const token=++request;rules=null;panel.querySelectorAll('[data-period]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.period===period)));const info=panel.querySelector('[data-challenge-info]'),rows=panel.querySelector('[data-challenge-rows]'),start=panel.querySelector('[data-challenge-start]');start.disabled=true;info.textContent=T('Cargando…');rows.replaceChildren();
    try{const data=await G.NAS.api('challenges/ranking?period='+period);if(token!==request)return;rules=data.challenge;
      info.textContent=[T(period==='d'?'Desafío diario':'Desafío semanal'),T(G.DEX_BY[rules.dex]?.name),'UTC '+new Date(rules.start).toISOString().slice(0,10)+' → '+new Date(rules.end).toISOString().slice(0,10),T('Semilla')+': '+rules.seed,T('Bioma')+': '+T(G.Tiles.BIOMES[rules.biome%G.Tiles.BIOMES.length].name),T('30 min; sin mejoras permanentes ni recompensas; clasificación separada.')].join(' · ');
      if(!data.rows.length)rows.textContent=T('Aún no hay resultados.');
      data.rows.forEach((r,i)=>{const li=document.createElement('p');li.setAttribute('translate','no');li.textContent=`${i+1}. ${r.names[0]} · ${G.U.mmss(r.t)} · ${T('Derrotados')}: ${r.kills}`;rows.append(li);});start.disabled=!!G.Social.room;
      if(G.Social.room)info.textContent+=' '+T('Sal de la sala para jugar el desafío.');
    }catch(e){if(token===request)info.textContent=e.message;}
  }
  function init(){
    const anchor=document.querySelector('#scr-menu [data-go="play"]');if(!anchor)return;
    const row=document.createElement('div');row.className='community-modes';
    const challenges=document.createElement('button');challenges.id='menu-challenges';challenges.className='btn small';challenges.textContent=T('Desafíos diarios y semanales');challenges.onclick=()=>{G.UI.show('scr-challenges');refresh();};
    const experiment=document.createElement('button');experiment.id='menu-experiment';experiment.className='btn small';experiment.textContent=T('Crear sala experimental de 8');experiment.onclick=async()=>{if(G.Social.room){G.LobbyUI.open();return;}if(!(await G.Dialog.confirm('Sala experimental de 8: sin monedas, tickets ni progreso guardado. ¿Entrar?')))return;experiment.disabled=true;try{const r=await G.Social.createRoom({experiment:true});if(r.ok)G.LobbyUI.open();else G.UI.toast(r.error);}finally{experiment.disabled=false;}};
    row.append(challenges,experiment);anchor.parentElement.append(row);
    panel=document.createElement('section');panel.id='scr-challenges';panel.className='scr dim hidden';panel.innerHTML=`<div class="box"><h2>${T('Desafíos diarios y semanales')}</h2><div class="row"><button class="btn small" data-period="d">${T('Desafío diario')}</button><button class="btn small" data-period="w">${T('Desafío semanal')}</button></div><p class="sub" data-challenge-info></p><p class="sub">${T('Mismo mapa y compañero inicial. Las decisiones y el ritmo de combate cambian los encuentros; no es una repetición determinista.')}</p><div data-challenge-rows></div><div class="row"><button class="btn gold" data-challenge-start>${T('Jugar desafío')}</button><button class="btn small" data-challenge-refresh>${T('Actualizar estado')}</button><button class="btn ghost" data-ui-back data-challenge-back>${T('Volver')}</button></div></div>`;
    document.body.append(panel);G.UI.registerScreen('scr-challenges');panel.querySelectorAll('[data-period]').forEach(b=>b.onclick=()=>{period=b.dataset.period;refresh();});panel.querySelector('[data-challenge-refresh]').onclick=refresh;
    panel.querySelector('[data-challenge-back]').onclick=()=>{request++;G.RunModes.configure(null);G.MenuUI.open();};
    panel.querySelector('[data-challenge-start]').onclick=async()=>{if(!rules||G.Social.room)return;const b=panel.querySelector('[data-challenge-start]');b.disabled=true;try{G.RunModes.configure(rules);await G.Game.startRun();if(G.Game.state==='ui')G.RunModes.configure(null);}finally{b.disabled=false;}};
    G.DB.onSync(availability);G.Social.on(availability);availability();
  }
  window.addEventListener('load',init);return {availability};
})();
