/* Server-timed challenges. Rewards are claimed from the server, never from run loot. */
G.ChallengeUI=(()=>{
  const T=s=>G.T(s);let panel,period='d',request=0,rules=null,retry=null;
  const visible=()=>!!panel&&!document.hidden&&!panel.classList.contains('hidden');
  const cycle=G.ChallengeCycle.create({visible,expired(){if(!visible())return;rules=null;panel.querySelector('[data-challenge-start]').disabled=true;refresh(true);}});
  function availability(){const b=document.getElementById('menu-challenges');if(b)b.hidden=!G.NAS?.enabled||!G.NAS.user||G.DB.guest;}
  function renderRewards(rewards){
    const box=panel.querySelector('[data-challenge-rewards]');box.replaceChildren();
    for(const tier of rewards.tiers){const p=document.createElement('p');p.dataset.tier=tier.tier;p.dataset.claimed=String(tier.claimed);p.textContent=G.U.mmss(tier.seconds)+' · '+tier.coins+' '+T('Monedas')+' + '+tier.t1+' '+T('Ticket individual')+' · '+T(tier.claimed?'Recogido':tier.eligible?'Listo para recoger':'Pendiente');box.append(p);}
    panel.querySelector('[data-challenge-claim]').disabled=!rewards.tiers.some(t=>t.eligible&&!t.claimed);
  }
  async function refresh(silent=false){
    const token=++request;cycle.stop();clearTimeout(retry);rules=null;panel.querySelectorAll('[data-period]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.period===period)));
    const info=panel.querySelector('[data-challenge-info]'),start=panel.querySelector('[data-challenge-start]');start.disabled=true;
    if(!silent)info.textContent=T('Cargando…');
    try{const data=await G.NAS.api('challenges?period='+period);if(token!==request)return;rules=data.challenge;
      info.textContent=[T(period==='d'?'Desafío diario':'Desafío semanal'),T(G.DEX_BY[rules.dex]?.name),'UTC '+new Date(rules.start).toISOString().slice(0,10)+' → '+new Date(rules.end).toISOString().slice(0,10),T('Semilla')+': '+rules.seed,T('Bioma')+': '+T(G.Tiles.BIOMES[rules.biome%G.Tiles.BIOMES.length].name),T('30 min; sin mejoras permanentes. Premios por hitos, una vez por cuenta y período.')].join(' · ');
      renderRewards(data.rewards);start.disabled=!!G.Social.room;if(G.Social.room)info.textContent+=' '+T('Sal de la sala para jugar el desafío.');
      cycle.configure(rules.end,data.serverNow);
    }catch(e){if(token!==request)return;info.textContent=e.message;panel.querySelector('[data-challenge-claim]').disabled=true;if(visible())retry=setTimeout(()=>refresh(true),5000);}
  }
  function init(){
    const anchor=document.querySelector('#scr-menu [data-go="play"]');if(!anchor)return;
    const row=document.createElement('div');row.className='community-modes';const b=document.createElement('button');b.id='menu-challenges';b.className='btn small';b.textContent=T('Desafíos diarios y semanales');b.onclick=()=>{G.UI.show('scr-challenges');refresh();};row.append(b);anchor.parentElement.append(row);
    panel=document.createElement('section');panel.id='scr-challenges';panel.className='scr dim hidden';panel.innerHTML=`<div class="box"><h2>${T('Desafíos diarios y semanales')}</h2><div class="row"><button class="btn small" data-period="d">${T('Desafío diario')}</button><button class="btn small" data-period="w">${T('Desafío semanal')}</button></div><p class="sub" data-challenge-info></p><p class="sub">${T('Mismo mapa y compañero inicial. Las decisiones y el ritmo de combate cambian los encuentros; no es una repetición determinista.')}</p><div data-challenge-rewards></div><div class="row"><button class="btn gold" data-challenge-start>${T('Jugar desafío')}</button><button class="btn small gold" data-challenge-claim>${T('Recoger premios del desafío')}</button><button class="btn small" data-challenge-rank>${T('Ver clasificación')}</button><button class="btn small" data-challenge-refresh>${T('Actualizar estado')}</button><button class="btn ghost" data-ui-back data-challenge-back>${T('Volver')}</button></div></div>`;
    document.body.append(panel);G.UI.registerScreen('scr-challenges');panel.querySelectorAll('[data-period]').forEach(b=>b.onclick=()=>{period=b.dataset.period;refresh();});panel.querySelector('[data-challenge-refresh]').onclick=()=>refresh();
    panel.querySelector('[data-challenge-rank]').onclick=()=>{request++;cycle.stop();G.RankingUI.open('c',period);};
    panel.querySelector('[data-challenge-back]').onclick=()=>{request++;cycle.stop();clearTimeout(retry);G.RunModes.configure(null);G.MenuUI.open();};
    panel.querySelector('[data-challenge-claim]').onclick=async()=>{if(!rules)return;const b=panel.querySelector('[data-challenge-claim]'),date=new Date(rules.start).toISOString().slice(0,10);b.disabled=true;try{await G.NAS.claimChallenge(period,date);G.UI.toast(T('Premios guardados en NAS.'));await refresh(true);}catch(e){G.UI.toast(e.message,5000);if(visible())refresh(true);}};
    panel.querySelector('[data-challenge-start]').onclick=async()=>{if(!rules||G.Social.room||cycle.due)return;const b=panel.querySelector('[data-challenge-start]');b.disabled=true;try{G.RunModes.configure(rules);await G.Game.startRun();if(G.Game.state==='ui')G.RunModes.configure(null);else cycle.stop();}finally{b.disabled=false;}};
    document.addEventListener('visibilitychange',()=>{if(visible()){cycle.check();if(!rules)refresh(true);}});G.DB.onSync(availability);G.Social.on(availability);availability();
  }
  window.addEventListener('load',init);return {availability};
})();
