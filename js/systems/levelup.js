/* Unified weighted sampling without replacement; RNG is injectable for replay. */
G.LevelUp=(()=>{
  const labels={'active-up':'Upgrade active','active-new':'New active','passive-up':'Upgrade passive','passive-new':'New passive'};
  const describe=d=>{const zh=G.I18n?.lang==='zh-CN',names={maxhp:'最大生命',cooldown:'攻击冷却',magnet:'拾取范围',experience:'经验获取',armor:'物理防御',ward:'特殊防御',dodge:'闪避率',crit:'暴击率',physical:'物理伤害',special:'特殊伤害',root:'静止每秒回复',regen:'每秒回复',shield:'每8秒护盾',speed:'移动速度'};return d.stat==='block'?(zh?'每11/10/9/8/7/6秒补充一次格挡，最多1层。':d.desc):d.stat==='counter'?(zh?'每级增加0.5秒反击窗口与10%反击倍率。':d.desc):(zh?(names[d.stat]||d.stat):d.stat)+' '+(d.stat==='cooldown'?'-':'+')+(['maxhp','armor','ward'].includes(d.stat)?d.value:(d.value*100).toFixed(2)+'%')+(zh?' /级；最高6级':' / level; cap 6');};
  function active(pl){const out=[];
    for(const m of pl.moves){const ev=G.Moves.evoInfo(m,pl.statsTaken),instanceId=m.instanceId;
      // Resolve by immutable identity at confirmation, not array order/current slot.
      const resolve=p=>p.moves.find(n=>n.instanceId===instanceId);
      if(ev?.ready)out.push({w:40,type:'evo',key:'evo:'+instanceId,instanceId,moveId:m.id,icon:'move:'+m.id,color:'#ffd23f',tag:'EVOLUCIÓN',title:G.T(m.name,'move')+' → '+G.T(ev.name,'move'),desc:ev.text,apply:p=>{const n=resolve(p);if(!n||!G.Moves.evoInfo(n,p.statsTaken)?.ready)return false;G.Moves.evolve(n);G.FX.ring(p.x,p.y,8,120,'#ffd23f',.8,6);G.Audio.sfx('legend');G.Progress.event('evolve',{move:n.id});return true;}});
      const text=G.Moves.nextUpText(m);if(text)out.push({w:18,type:'up',key:'up:'+instanceId,instanceId,moveId:m.id,icon:'move:'+m.id,color:G.U.TYPE_COLOR[m.type],tag:'Nv.'+m.lvl+' > '+(m.lvl+1),title:G.T(m.name,'move'),desc:text,apply:p=>{const n=resolve(p);return !!n&&G.Moves.levelUp(n);}});
    }return out;
  }
  function newActive(pl){if(pl.slots.length>=pl.maxMoves)return[];const ids=G.Moves.poolFor(pl.mon).filter(id=>{const d=G.Moves.BY_ID[id];return d&&d.kind!=='buff'&&!d.specialOnly&&!pl.hasMove(id)&&!pl.banned?.has(id);});return ids.map(id=>{const d=G.Moves.BY_ID[id];return{w:18/Math.max(1,ids.length),type:'new',key:'new:'+id,moveId:id,icon:'move:'+id,color:G.U.TYPE_COLOR[d.type],tag:G.U.TYPE_NAME[d.type],title:G.T(d.name,'move'),desc:d.desc,apply:p=>p.banned?.has(id)?false:p.addMove(id)};});}
  function passives(pl){if(!G.Battle)return[];const defs=G.PassiveDefs.filter(d=>{const n=G.Battle.level(pl,d.id);return n<G.PASSIVE_MAX_LEVEL&&(n>0||Object.keys(pl.passives||{}).length<4);}),fresh=defs.filter(d=>!pl.passives?.[d.id]).length;return defs.map(d=>{const n=G.Battle.level(pl,d.id);return{w:n?12:18/Math.max(1,fresh),type:'passive',key:'passive:'+d.id,passiveId:d.id,icon:'shield',color:'#83dcff',tag:G.T('Passive')+' '+(n+1)+'/'+G.PASSIVE_MAX_LEVEL,title:G.T(d.name),desc:describe(d),apply:p=>G.Battle.learn(p,d.id)};});}
  function pool(pl){const rows=[...active(pl),...newActive(pl),...passives(pl)];return rows.map(c=>{const category=c.type==='passive'?(pl.passives?.[c.passiveId]?'passive-up':'passive-new'):c.type==='new'?'active-new':'active-up';return{...c,category,categoryLabel:G.T(labels[category])};});}
  function pick(list,rng){let x=Math.max(0,Math.min(.999999999,rng()))*list.reduce((n,c)=>n+c.w,0);return list.find(c=>(x-=c.w)<=0)||list.at(-1);}
  function offer(pl,rng=Math.random){if(typeof rng!=='function')rng=Math.random;const remaining=pool(pl),rows=[];
    while(rows.length<3&&remaining.length){const activeAvailable=remaining.some(c=>c.type!=='passive');const eligible=rows.length===2&&rows.every(c=>c.type==='passive')&&activeAvailable?remaining.filter(c=>c.type!=='passive'):remaining;const c=pick(eligible,rng);rows.push(c);remaining.splice(remaining.indexOf(c),1);}
    if(!rows.length)rows.push({category:'supply',categoryLabel:G.T('Growth complete'),type:'supply',key:'supply:heal',icon:'berry',color:'#9fe6ac',tag:G.T('Recovery'),title:G.T('Recovery'),desc:G.T('All growth is capped. Restore 45% max HP and continue.'),apply:p=>p.heal(p.maxHp*.45)});
    return rows;
  }
  return{offer,pool,describe};
})();
