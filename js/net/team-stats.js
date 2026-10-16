/* Only observed, attributed direct hits and completed rescues. No wallet effects. */
(function(factory){if(typeof module==='object'&&module.exports)module.exports=factory();else G.TeamStats=factory();})(()=>{
  function create(members){
    const rows=new Map(members.map(m=>[m.uid,{uid:m.uid,damage:0,kills:0,assists:0,rescues:0}])),hits=new Map();
    function hit(enemy,uid,damage,killed){if(!rows.has(uid)||!Number.isFinite(damage)||damage<=0)return;
      rows.get(uid).damage+=damage;let set=hits.get(enemy);if(!set){set=new Set();hits.set(enemy,set);}set.add(uid);
      if(killed){rows.get(uid).kills++;for(const other of set)if(other!==uid)rows.get(other).assists++;hits.delete(enemy);}
    }
    function rescue(helpers){for(const uid of new Set(helpers))if(rows.has(uid))rows.get(uid).rescues++;}
    function ingest(values){if(!Array.isArray(values)||values.length!==rows.size)return;const seen=new Set();for(const v of values){if(!rows.has(v.uid)||seen.has(v.uid))return;seen.add(v.uid);if(['damage','kills','assists','rescues'].some(k=>!Number.isFinite(v[k])||v[k]<0||v[k]>1e12))return;}for(const v of values)for(const k of ['damage','kills','assists','rescues'])rows.get(v.uid)[k]=v[k];}
    return {checkpoint(s){if(!s)return {rows:[...rows.values()],hits:[...hits].map(([id,set])=>[id,[...set]])};ingest(s.rows);hits.clear();for(const [id,values]of s.hits)hits.set(id,new Set(values));},hit,rescue,forget:id=>hits.delete(id),ingest,snapshot:()=>[...rows.values()].map(r=>({...r,damage:Math.floor(r.damage)}))};
  }
  return {create};
});
