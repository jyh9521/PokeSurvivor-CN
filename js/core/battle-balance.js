/* Combat tuning shared by source, production and authority. Values are run-only. */
(function(factory){if(typeof module==='object'&&module.exports)module.exports=factory();else G.BattleBalance=factory();})(()=>{
  const STAB=1.20,DENSITY_HP=1.65,CONTACT_DAMAGE=1.8;
  const level=p=>Math.max(1,Math.min(10000,Number.isFinite(p?.level)?p.level:1));
  const offense=p=>1+(level(p)-1)*.045;
  const enemyScale=t=>({hp:1+Math.min(1800,Math.max(0,t))/900,dmg:1+Math.max(0,t)/600,spd:1+Math.min(.35,Math.max(0,t)/1400)});
  // Per-target planning floors, not total multi-target DPS or simulated hit rates.
  // Preserve timing/coverage/utility and never reduce an existing move.
  const FLOORS={melee:66,dash:36,beam:30,wave:26,mark:24,rolling:30,projectile:30,curve:30,split:30,spiral:30,ricochet:30,lob:28,nova:14,chain:24,aura:23,boomerang:38,cone:32,mine:30,meteor:32};
  function budget(m){let hits=1;if(['projectile','curve','split','spiral','ricochet','lob','mine','meteor'].includes(m.kind))hits=Math.min(2,m.count||1);if(m.kind==='cone')hits=Math.min(3,m.count||1);if(m.kind==='boomerang')hits=2*Math.min(2,m.count||1);return m.dmg*hits/m.cd;}
  function tune(m){if(!m.dmg||m.specialOnly||m.kind==='buff')return;
    m.nativeDmg=m.dmg;
    if(m.kind==='melee')m.dmg*=1.45;
    const floor=m.id==='leech-seed'?18:FLOORS[m.kind];if(floor&&budget(m)<floor)m.dmg*=floor/budget(m);
    m.dmg=+m.dmg.toFixed(3);
  }
  return{STAB,DENSITY_HP,CONTACT_DAMAGE,level,offense,enemyScale,FLOORS,budget,tune};
});
