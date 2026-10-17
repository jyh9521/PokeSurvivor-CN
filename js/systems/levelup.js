/* Unified weighted sampling without replacement; RNG is injectable for replay. */
G.LevelUp=(()=>{
  const labels={'active-up':'Upgrade active','active-new':'New active','passive-up':'Upgrade passive','passive-new':'New passive','passive-retrain':'Evolution retraining','training':'Move training'};
  const describe=d=>G.T(d.desc);
  function active(pl){const out=[];
    for(const m of pl.moves){const ev=G.Moves.evoInfo(m,pl.statsTaken,pl.level),instanceId=m.instanceId;
      // Resolve by immutable identity at confirmation, not array order/current slot.
      const resolve=p=>p.moves.find(n=>n.instanceId===instanceId);
      if(ev?.ready)out.push({w:40,type:'evo',key:'evo:'+instanceId,instanceId,moveId:m.id,icon:'move:'+m.id,color:'#ffd23f',tag:'EVOLUCIÓN',title:G.T(m.name,'move')+' → '+G.T(ev.name,'move'),desc:(ev.experience?G.T('Level 12 experience replaces missing passive prerequisite. '):'')+ev.text,apply:p=>{const n=resolve(p);if(!n||!G.Moves.evoInfo(n,p.statsTaken,p.level)?.ready)return false;G.Moves.evolve(n);G.FX.ring(p.x,p.y,8,120,'#ffd23f',.8,6);G.Audio.sfx('legend');G.Progress.event('evolve',{move:n.id});return true;}});
      const training=m.training||0;if(m.evolved&&training<12&&pl.level>=12+training*4)out.push({w:24,type:'training',category:'training',key:'training:'+instanceId+':'+training,instanceId,moveId:m.id,icon:'move:'+m.id,color:'#87e4ff',tag:G.T('Move training')+' '+(training+1)+'/12',title:G.T(m.name,'move'),desc:G.T('El entrenamiento añade 5 puntos porcentuales al daño evolucionado; entrenamiento y maestría se suman.')+' · '+G.Moves.changeText(m,{...m,training:training+1}),apply:p=>{const n=resolve(p);if(!n||!n.evolved||(n.training||0)!==training||p.level<12+training*4)return false;n.training=training+1;return true;}});
      const text=G.Moves.nextUpText(m);if(text)out.push({w:18,type:'up',key:'up:'+instanceId,instanceId,moveId:m.id,icon:'move:'+m.id,color:G.U.TYPE_COLOR[m.type],tag:'Nv.'+m.lvl+' > '+(m.lvl+1),title:G.T(m.name,'move'),desc:text,apply:p=>{const n=resolve(p);return !!n&&G.Moves.levelUp(n);}});
    }return out;
  }
  function newActive(pl){if(pl.slots.length>=pl.maxMoves)return[];const ids=G.Moves.poolFor(pl.mon).filter(id=>{const d=G.Moves.BY_ID[id];return d&&d.kind!=='buff'&&!d.specialOnly&&!pl.hasMove(id)&&!pl.banned?.has(id);});return ids.map(id=>{const d=G.Moves.BY_ID[id];return{w:18/Math.max(1,ids.length),type:'new',key:'new:'+id,moveId:id,icon:'move:'+id,color:G.U.TYPE_COLOR[d.type],tag:G.U.TYPE_NAME[d.type],title:G.T(d.name,'move'),desc:d.desc,apply:p=>p.banned?.has(id)?false:p.addMove(id)};});}
  function passives(pl){if(!G.Battle)return[];const defs=G.PassiveDefs.filter(d=>{const n=G.Battle.level(pl,d.id);return n<G.Battle.maxLevel(d.id)&&(n>0||Object.keys(pl.passives||{}).length<4);}),freshWeight=d=>['maxhp','armor','ward'].includes(d.stat)?2:['regen','cooldown'].includes(d.stat)?1.5:1,totalFresh=defs.filter(d=>!pl.passives?.[d.id]).reduce((sum,d)=>sum+freshWeight(d),0);return defs.map(d=>{const n=G.Battle.level(pl,d.id);return{w:n?12:18*freshWeight(d)/Math.max(1,totalFresh),type:'passive',key:'passive:'+d.id,passiveId:d.id,icon:'shield',color:'#83dcff',tag:G.T('Passive')+' '+(n+1)+'/'+(Number.isFinite(G.Battle.maxLevel(d.id))?G.Battle.maxLevel(d.id):'∞'),title:G.T(d.name),desc:describe(d),apply:p=>G.Battle.learn(p,d.id)};});}
  function retraining(pl){
    if(!G.Battle||Object.keys(pl.passives||{}).length!==4||pl.rerolls>=1+pl.rerollBonus)return[];
    const ev=G.Moves.evoInfo(pl.activeMove(),pl.statsTaken);if(!ev||ev.ready)return[];
    const targets=G.PassiveDefs.filter(d=>!pl.passives[d.id]&&G.Battle.passiveKey(d.stat)===ev.needs),old=Object.keys(pl.passives),rows=[];
    for(const d of targets)for(const oldId of old){const previous=G.PassiveDefs.find(d=>d.id===oldId),n=G.Battle.level(pl,oldId);rows.push({w:12/(targets.length*old.length),type:'passive',category:'passive-retrain',key:'retrain:'+oldId+':'+d.id,passiveId:d.id,icon:'shield',color:'#ffd23f',tag:G.T('Evolution retraining')+' 1/6',title:G.T(previous.name)+' → '+G.T(d.name),desc:G.T('Forfeit all levels of the old passive; learn the new passive at 1/6. Costs this reward and one remaining reroll. Unlocks the active move evolution prerequisite.'),apply:p=>G.Battle.retrain(p,oldId,d.id,n)});}
    return rows;
  }
  function pool(pl){const rows=[...active(pl),...newActive(pl),...passives(pl),...retraining(pl)];return rows.map(c=>{const category=c.category||(c.type==='passive'?(pl.passives?.[c.passiveId]?'passive-up':'passive-new'):c.type==='new'?'active-new':'active-up');return{...c,category,categoryLabel:G.T(labels[category])};});}
  function pick(list,rng){let x=Math.max(0,Math.min(.999999999,rng()))*list.reduce((n,c)=>n+c.w,0);return list.find(c=>(x-=c.w)<=0)||list.at(-1);}
  function offer(pl,rng=Math.random){if(typeof rng!=='function')rng=Math.random;const remaining=pool(pl),rows=[];const evolution=remaining.filter(c=>c.type==='evo');if(evolution.length){const c=pick(evolution,rng);rows.push(c);remaining.splice(remaining.indexOf(c),1);}
    while(rows.length<3&&remaining.length){const activeAvailable=remaining.some(c=>c.type!=='passive');const eligible=rows.length===2&&rows.every(c=>c.type==='passive')&&activeAvailable?remaining.filter(c=>c.type!=='passive'):remaining;const c=pick(eligible,rng);rows.push(c);remaining.splice(remaining.indexOf(c),1);}
    if(!rows.length)rows.push({category:'supply',categoryLabel:G.T('Growth complete'),type:'supply',key:'supply:heal',icon:'berry',color:'#9fe6ac',tag:G.T('Recovery'),title:G.T('Recovery'),desc:G.T('All growth is capped. Restore 45% max HP and continue.'),apply:p=>p.heal(p.maxHp*.45)});
    return rows;
  }
  return{offer,pool,describe};
})();
