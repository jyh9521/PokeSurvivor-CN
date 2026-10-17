/* Combat tuning shared by source, production and authority. Values are run-only. */
(function(factory){if(typeof module==='object'&&module.exports)module.exports=factory();else G.BattleBalance=factory();})(()=>{
  const STAB=1.20,DENSITY_HP=1.65,CONTACT_DAMAGE=1.8,CONTACT_FACTOR=.60,CONTACT_CAP=.22,RANGED_CONTACT_CAP=.30,CONTACT_GRACE=.60;
  const TYPE={super:1.6,resist:.6,immune:.3,min:.3,max:2.4};
  const WEATHER={major:1.2,minor:1.15,weak:.85};
  const ALTAR={damage:1.5,speed:1.45,cooldown:.6};
  const LAYERS={alphaAtk:1,permanentCap:.6,temporaryMax:1.7,cooldownMin:.5,speedMax:1.6};
  const permanentBonus=raw=>LAYERS.permanentCap*(1-Math.exp(-Math.max(0,Number.isFinite(raw)?raw:0)/LAYERS.permanentCap));
  const temporaryAttack=(item,altar)=>Math.min(LAYERS.temporaryMax,1+Math.max(0,item)+Math.max(0,altar));
  const cooldown=x=>Math.max(LAYERS.cooldownMin,Number.isFinite(x)&&x>0?x:1);
  const movement=x=>Math.min(LAYERS.speedMax,Math.max(0,Number.isFinite(x)?x:1));
  const attackEff=a=>{a=Math.max(.001,Number.isFinite(a)?a:100);return LAYERS.alphaAtk===1?a:100*(a/100)**LAYERS.alphaAtk;};
  const MAX_WAVE={speed:250,life:1}; // px/s and seconds for melee Max conversions only.
  const COOP={rateSlope:.75,bossSlope:.30,normalSlope:.15};
  const party=n=>Math.max(1,Math.min(8,Math.floor(Number.isFinite(n)?n:1)));
  const coopRate=n=>1+COOP.rateSlope*(party(n)-1),coopBossHp=n=>1+COOP.bossSlope*(party(n)-1),coopNormalHp=n=>1+COOP.normalSlope*(party(n)-1);
  const COMPOSITION={enabled:true,from:900,roles:false,ranged:12,rangedExtra:2,rangedMax:20,support:4,supportMax:6,eachSupport:2,primaryType:32};
  const ranged=b=>['ranged','fan','beamer','zoner'].includes(b),support=b=>['healer','shielder','summoner'].includes(b);
  function census(enemies){const c={ranged:0,support:0,behaviors:{},types:{}};for(const e of enemies){if(e.dead||e.boss||e.legend||e.judge)continue;c.behaviors[e.behavior]=(c.behaviors[e.behavior]||0)+1;const type=e.types?.[0];if(type)c.types[type]=(c.types[type]||0)+1;if(ranged(e.behavior))c.ranged++;if(support(e.behavior))c.support++;}return c;}
  function compositionAllows(def,c,n=1,horde=false,time=Infinity){if(!COMPOSITION.enabled||time<COMPOSITION.from)return true;const b=def.behavior,type=def.types?.[0];return !(COMPOSITION.roles&&ranged(b)&&c.ranged>=Math.min(COMPOSITION.rangedMax,COMPOSITION.ranged+COMPOSITION.rangedExtra*(party(n)-1))||COMPOSITION.roles&&support(b)&&(c.support>=Math.min(COMPOSITION.supportMax,COMPOSITION.support+party(n)-1)||(c.behaviors[b]||0)>=COMPOSITION.eachSupport)||!horde&&type&&(c.types[type]||0)>=COMPOSITION.primaryType);}
  const level=p=>Math.max(1,Math.min(10000,Number.isFinite(p?.level)?p.level:1));
  const offense=p=>1+(level(p)-1)*.045;
  const enemyScale=t=>({hp:1+Math.min(1800,Math.max(0,t))/900,dmg:1+Math.max(0,t)/600,spd:1+Math.min(.35,Math.max(0,t)/1400)});
  // Fixed clock anchors, never player-level feedback: earning upgrades stays valuable.
  function curve(t,points){t=Number.isFinite(t)?Math.max(0,t):0;for(let i=1;i<points.length;i++){const [end,b]=points[i],[start,a]=points[i-1];if(t<=end){const x=Math.max(0,(t-start)/(end-start)),s=x*x*(3-2*x);return a+(b-a)*s;}}return points[points.length-1][1];}
  const normalHp=t=>DENSITY_HP*curve(t,[[0,1.05],[160,1.25],[500,1.65],[900,2],[1800,2.5]]);
  const bossHp=t=>curve(t,[[0,1.05],[180,1.05],[360,1.1],[540,1.15],[720,1.2],[900,1.25],[1800,1.35]]);
  const ELITE_HP=1.75;
  // XP points per level; shared team XP applies permanent wisdom once at pickup.
  const XP={"need":[[1,1],[48,1],[60,2],[80,5]],"reward":[[0,4.2],[180,4.2],[600,1.4],[1200,2.8],[1800,4.2]],"boss":2,"catchup":false};
  const xpFor=l=>{l=Math.max(1,Math.min(10000,Math.floor(Number.isFinite(l)?l:1)));return Math.floor((8+l*6+l**1.75*1.6)*4*curve(l,XP.need));};
  const xpReward=t=>curve(t,XP.reward);
  const PRESSURE={armorFactor:.65,radius:68,delay:1.8,cooldown:1};
  const pressureRate=t=>curve(t,[[0,.08],[180,.08],[600,.13],[1200,.18],[1800,.23]]);
  const pressureDamage=(t,p)=>Math.max(12*(1+Math.max(0,t)/600),Math.max(0,p.maxHp)*pressureRate(t));
  const pressureWindow=t=>(t>=180&&t<300)||(t>=720&&t<900)||(t>=1440&&t<1620);
  const recoveryWindow=t=>t>=300&&(t-300)%90>=(pressureWindow(t)?72:60);
  // Finite builds need finite throughput and authored collection windows.
  const waveRate=t=>Math.min(10,(1.6+t*.028+Math.pow(t/60,1.6)*.5)*.24)*(recoveryWindow(t)?.2:1);
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
  return{MAX_WAVE,COOP,coopRate,coopBossHp,coopNormalHp,COMPOSITION,census,compositionAllows,cooldown,movement,permanentBonus,temporaryAttack,LAYERS,attackEff,TYPE,WEATHER,ALTAR,XP,xpFor,PRESSURE,pressureRate,pressureDamage,CONTACT_FACTOR,CONTACT_CAP,RANGED_CONTACT_CAP,CONTACT_GRACE,bodyContact,STAB,DENSITY_HP,CONTACT_DAMAGE,level,offense,enemyScale,curve,normalHp,bossHp,ELITE_HP,xpReward,pressureWindow,recoveryWindow,waveRate,tierBlend,FLOORS,budget,tune};
});
