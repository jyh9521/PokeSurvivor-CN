/* Four stable reward lanes. Run growth belongs to active attacks or passive moves. */
G.LevelUp=(()=>{
  const LANES=[['active-up','Upgrade active'],['passive-up','Upgrade passive'],['active-new','New active'],['passive-new','New passive']];
  const empty=(category,title,reason)=>({category,type:'empty',key:'empty:'+category,disabled:true,icon:'shield',color:'#8fa3c4',categoryLabel:G.T(title),tag:G.T('Unavailable'),title:G.T('No eligible choice'),desc:G.T(reason)});
  function active(pl){const out=[];
    for(const m of pl.moves){const ev=G.Moves.evoInfo(m,pl.statsTaken);
      if(ev?.ready)out.push({w:40,type:'evo',key:'evo:'+m.id,moveId:m.id,icon:'move:'+m.id,color:'#ffd23f',tag:'EVOLUCIÓN',title:G.T(m.name,'move')+' → '+G.T(ev.name,'move'),desc:ev.text,apply:p=>{if(!G.Moves.evoInfo(m,p.statsTaken)?.ready)return;G.Moves.evolve(m);G.FX.ring(p.x,p.y,8,120,'#ffd23f',.8,6);G.FX.burst(p.x,p.y-p.bodyH*.5,'#ffe14d',40,240);G.Audio.sfx('legend');G.Progress.event('evolve',{move:m.id});}});
      if(m.evolved&&!G.Moves.nextUpText(m))out.push({w:6,type:'mastery',key:'mastery:'+m.id,moveId:m.id,icon:'move:'+m.id,color:G.U.TYPE_COLOR[m.type],tag:G.T('Mastery')+' '+((m.mastery||0)+1),title:G.T(m.name,'move'),desc:G.T('Each mastery adds 6% of evolved base damage; no level cap.'),apply:()=>G.Moves.master(m)});
      const text=G.Moves.nextUpText(m);if(text)out.push({w:8,type:'up',key:'up:'+m.id,moveId:m.id,icon:'move:'+m.id,color:G.U.TYPE_COLOR[m.type],tag:'Nv.'+m.lvl+' > '+(m.lvl+1),title:G.T(m.name,'move'),desc:text,apply:()=>G.Moves.levelUp(m)});
    }return out;
  }
  function newActive(pl){if(pl.slots.length>=pl.maxMoves)return[];return G.Moves.poolFor(pl.mon).filter(id=>{const d=G.Moves.BY_ID[id];return d&&d.kind!=='buff'&&!d.specialOnly&&!pl.hasMove(id)&&!pl.banned?.has(id);}).map(id=>{const d=G.Moves.BY_ID[id];return{w:10,type:'new',key:'new:'+id,moveId:id,icon:'move:'+id,color:G.U.TYPE_COLOR[d.type],tag:G.U.TYPE_NAME[d.type],title:G.T(d.name,'move'),desc:d.desc,apply:p=>p.addMove(id)};});}
  function passives(pl,existing){if(!G.Battle)return[];return G.PassiveDefs.filter(d=>{const n=pl.passives?.[d.id]||0;return n<3&&(existing?n>0:!n&&Object.keys(pl.passives||{}).length<4);}).map(d=>{const n=pl.passives?.[d.id]||0;return{w:7,type:'passive',key:'passive:'+d.id,passiveId:d.id,icon:'shield',color:'#83dcff',tag:G.T('Passive')+' '+(n+1)+'/3',title:G.T(d.name),desc:G.T(d.desc),apply:p=>G.Battle.learn(p,d.id)};});}
  function pick(list){const evo=list.find(c=>c.type==='evo');if(evo)return evo;let x=Math.random()*list.reduce((n,c)=>n+c.w,0);return list.find(c=>(x-=c.w)<=0)||list[list.length-1];}
  function offer(pl){const pools=[active(pl),passives(pl,true),newActive(pl),passives(pl,false)],reasons=['Evolution may require a passive; evolved moves can gain mastery.','Learn a passive first, or all learned passives are capped.','Active slots are full, or no new attacks remain.','Passive slots are full, or no new passives remain.'];
    const rows=LANES.map(([category,label],i)=>pools[i].length?{...pick(pools[i]),category,categoryLabel:G.T(label)}:empty(category,label,reasons[i]));
    if(rows.every(c=>c.disabled))rows[0]={category:'active-up',categoryLabel:G.T('Growth complete'),type:'supply',key:'supply',icon:'berry',color:'#9fe6ac',tag:G.T('Recovery'),title:G.T('Recovery'),desc:G.T('All growth is capped. Restore 45% max HP and continue.'),apply:p=>p.heal(p.maxHp*.45)};
    return rows;
  }
  return{offer,LANES};
})();
