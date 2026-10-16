/* Combat tuning shared by source, production and authority. Values are run-only. */
(function(factory){if(typeof module==='object'&&module.exports)module.exports=factory();else G.BattleBalance=factory();})(()=>{
  const STAB=1.20,DENSITY_HP=1.65,CONTACT_DAMAGE=1.8,CONTACT_FACTOR=.60,CONTACT_CAP=.22,CONTACT_GRACE=.60;
  const level=p=>Math.max(1,Math.min(10000,Number.isFinite(p?.level)?p.level:1));
  const offense=p=>1+(level(p)-1)*.045;
  const enemyScale=t=>({hp:1+Math.min(1800,Math.max(0,t))/900,dmg:1+Math.max(0,t)/600,spd:1+Math.min(.35,Math.max(0,t)/1400)});
  // Fixed clock anchors, never player-level feedback: earning upgrades stays valuable.
  function curve(t,points){t=Number.isFinite(t)?Math.max(0,t):0;for(let i=1;i<points.length;i++){const [end,b]=points[i],[start,a]=points[i-1];if(t<=end){const x=Math.max(0,(t-start)/(end-start)),s=x*x*(3-2*x);return a+(b-a)*s;}}return points[points.length-1][1];}
  const normalHp=t=>DENSITY_HP*curve(t,[[0,1.05],[160,1.25],[500,1.65],[900,2],[1800,2.5]]);
  const bossHp=t=>curve(t,[[0,1.05],[180,1.05],[360,1.1],[540,1.15],[720,1.2],[900,1.25],[1800,1.35]]);
  const ELITE_HP=1.75;
  const xpReward=t=>curve(t,[[0,4.2],[180,4.2],[600,1.4],[1800,1.4]]);
  const pressureWindow=t=>(t>=180&&t<300)||(t>=720&&t<900)||(t>=1440&&t<1620);
  // Only newly unlocked tiers blend over 20 seconds; old-tier species are unchanged.
  function tierBlend(t,index,tiers){if(!Number.isInteger(index)||index<1||!tiers?.[index])return 1;const tr=tiers[index],x=Math.max(0,Math.min(1,(t-tr.from)/20));return tiers[index-1].hp/tr.hp+(1-tiers[index-1].hp/tr.hp)*x*x*(3-2*x);}
  // Per-target planning floors, not total multi-target DPS or simulated hit rates.
  // Preserve timing/coverage/utility and never reduce an existing move.
  const FLOORS={melee:66,dash:36,beam:30,wave:26,mark:24,rolling:30,projectile:30,curve:30,split:30,spiral:30,ricochet:30,lob:28,nova:14,chain:24,aura:23,boomerang:38,cone:32,mine:30,meteor:32};
  function budget(m){let hits=1;if(['projectile','curve','split','spiral','ricochet','lob','mine','meteor'].includes(m.kind))hits=Math.min(2,m.count||1);if(m.kind==='cone')hits=Math.min(3,m.count||1);if(m.kind==='boomerang')hits=2*Math.min(2,m.count||1);return m.dmg*hits/m.cd;}
  function tune(m){if(!m.dmg||m.specialOnly||m.kind==='buff')return;
    m.nativeDmg=m.dmg;
    if(m.kind==='melee')m.dmg*=1.45;
    const floor=m.id==='leech-seed'?18:FLOORS[m.kind];if(floor&&budget(m)<floor)m.dmg*=floor/budget(m);
    // Deliberate heavy/fast tradeoff: below the generic melee floor, but stronger per hit.
    if(m.id==='body-slam'){m.dmg*=.78;m.radius=+(m.radius*1.15).toFixed(2);m.stagger=.25;}
    if(m.id==='play-rough')m.dmg*=.72;
    if(m.id==='tackle'){m.guardTime=.8;m.stagger=.2;}
    if(m.kind==='meteor'){m.dmg*=1.35;m.radius=+(m.radius*1.15).toFixed(2);m.fall=.35;m.lockTime=.18;}
    if(m.id==='leech-seed'){m.dmg*=1.15;m.delay=.55;m.radius=76;m.seedHeal=.012;m.lockTime=.2;}
    m.dmg=+m.dmg.toFixed(3);
  }
  const bodyContact=e=>!e.judge&&(e.remote?!(e.net?.st&16):e.phase!=='dash'&&!e.jump&&!e.ai?.cast);
  return{CONTACT_FACTOR,CONTACT_CAP,CONTACT_GRACE,bodyContact,STAB,DENSITY_HP,CONTACT_DAMAGE,level,offense,enemyScale,curve,normalHp,bossHp,ELITE_HP,xpReward,pressureWindow,tierBlend,FLOORS,budget,tune};
});
