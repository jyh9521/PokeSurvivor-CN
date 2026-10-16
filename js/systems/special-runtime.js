/* Temporary form/field effects have one simulation clock and bounded state. */
G.SpecialRuntime=(()=>{
 const rules=G.SpecialRules;
 function mon(base,key){const v=rules.variant(base.dex,key);if(!v)return base;return {...base,formKey:v.key,formStats:v.stats,formAbility:v.ability,formAbilityData:v.abilityData,formSprite:v.id,types:v.types,hp:Math.round(70+v.stats[0]*.45),spd:Math.round(78+v.stats[5]*.42),atk:+(.7+Math.max(v.stats[1],v.stats[3])*.0055).toFixed(2)};}
 function base(p,key){const v=rules.variant(p.dex,key);p.baseForm=v?.key||'';p.mon=mon(G.DEX_BY[p.dex],p.baseForm);p.baseStats=p.mon.formStats||G.BattleRules.stats(p.mon,G.BattleDex);p.baseAtk=p.mon.atk;p.baseSpd=p.mon.spd;p.trait=G.BattleRules.trait(p.mon,G.BattleDex);p.role=G.BattleRules.role(p.mon,G.BattleDex);}
 function entry(p){return rules.mega(p.dex,p.battle?.megaKey,p.baseForm);}
 function ability(p){if(p.battle?.form!=='mega')return '';return entry(p)?.ability?.id||({718:'complete-order',491:'nightmare-veil',807:'plasma-drive',978:'dragon-focus'}[p.dex]||'survivor-adaptation');}
 function move(p,m){const a=ability(p);if(m.type==='normal'&&['pixilate','refrigerate'].includes(a))return {...m,type:a==='pixilate'?'fairy':'ice',skinBoost:1.2};return m;}
 function damage(p,e,m){const a=ability(p),b=p.battle,physical=m.damageClass==='physical';let k=m.skinBoost||1;
  if(b.zBoost>0)k*=1.2;
  if(b.terrainT>0&&b.fieldType&&Math.hypot(e.x-p.x,e.y-p.y)<=260){
    if(m.type===b.fieldType)k*=1.2;
    if(b.fieldType==='fire'&&m.type==='water'||b.fieldType==='water'&&m.type==='fire')k*=.8;
  }
  if(b.maxBuffT>0&&((b.maxAtk&&physical)||(b.maxSpa&&!physical)))k*=1.12;
  if(['tough-claws','pure-power','huge-power'].includes(a)&&physical)k*=a==='tough-claws'&& !['melee','dash','counter'].includes(m.kind)?1:1.2;
  if(a==='parental-bond')k*=1.25;
  if(a==='strong-jaw'&&/bite|fang|crunch/.test(m.id))k*=1.3;
  if(a==='sheer-force'&&(m.burn||m.slow||m.poison))k*=1.2;
  if(a==='sand-force'&&['rock','ground','steel'].includes(m.type))k*=1.2;
  if(a==='sand-stream'&&m.type==='rock')k*=1.15;
  if(a==='solar-power'&&m.type==='fire')k*=1.2;
  if(a==='fairy-aura'&&m.type==='fairy')k*=1.2;
  if(a==='berserk'&&p.hp<p.maxHp*.5&&!physical)k*=1.25;
  if(a==='no-guard')k*=1.1;
  if(a==='trace'&&!physical)k*=1.15;
  if(a==='scrappy'&&physical&&e.types?.includes('ghost'))k*=1.2;
  if(a==='eelevate'&&m.type==='electric')k*=1.2;
  if(a==='nightmare-veil'&&e.slowT>0)k*=1.25;
  if(a==='plasma-drive'&&m.type==='electric')k*=1.2;
  if(a==='dragon-focus'&&['water','dragon'].includes(m.type))k*=1.2;
  if(a==='complete-order'&&m.type==='ground')k*=1.15;
  if(b.terrainT>0&&b.fieldType==='ghost'&&physical||b.terrainT>0&&b.fieldType==='dark'&&!physical)k*=1.12;
  if(a==='survivor-adaptation')k*=1.12;
  return k;
 }
 function incoming(p,cls){const b=p.battle,a=ability(p);let k=1;
  if(b.zBoost>0||b.maxBuffT>0&&b.maxDef&&(b.fieldType==='steel'&&cls==='physical'||b.fieldType==='ground'&&cls==='special'))k*=.85;
  if(b.terrainT>0&&(b.fieldType==='bug'&&cls==='special'||b.fieldType==='dragon'&&cls==='physical'))k*=.88;
  if(a==='shell-armor'||a==='delta-stream'||a==='stalwart')k*=.85;
  if(a==='intimidate'&&cls==='physical')k*=.8;
  if(a==='magic-bounce'&&cls==='special')k*=.8;
  if(a==='inner-focus'&&cls==='physical')k*=.9;
  if(['levitate','eelevate'].includes(a))k*=.9;
  if(a==='complete-order')k*=.85;
  if(b.guardT>0)k*=.25;
  return k;
 }
 function cooldown(p,m){return ability(p)==='prankster'&&(m.autoSupport||m.damageClass==='status')?.8:ability(p)==='plasma-drive'?.85:1;}
 function speed(p){const b=p.battle;return (b.zBoost>0?1.15:1)*(b.maxBuffT>0&&b.maxSpeed?1.12:1)*(ability(p)==='plasma-drive'?1.12:1);}
 function tick(p,dt){if(p.dead)return;const b=p.battle;
  for(const k of ['zBoost','terrainT','maxBuffT','guardT','maxEffectCd','auraT'])b[k]=Math.max(0,(b[k]||0)-dt);
  if(ability(p)==='insomnia'||ability(p)==='inner-focus')p.slowT=0;
  if(b.terrainT>0&&b.fieldType==='fairy')p.slowT=0;
  if(ability(p)==='regenerator'&&!p.remote)p.hp=Math.min(p.maxHp,p.hp+p.maxHp*.008*dt);
  if(['shadow-tag','nightmare-veil'].includes(ability(p))&&b.auraT<=0){b.auraT=.8;for(const e of G.EnemyMgr.queryCircle(p.x,p.y,150))if(!e.dead){if(e.remote)G.Coop.status(e,'s',e.boss?.1:.3);else e.applySlow(e.boss?.1:.3);}}
 }
 function maxEffect(p,m){const b=p.battle;if(!b||b.maxEffectCd>0||p.remote)return;b.maxEffectCd=2.5;b.maxBuffT=8;
  b.terrainT=8;b.fieldType=m.maxType;
  if(m.maxType==='fighting')b.maxAtk=true;if(m.maxType==='poison')b.maxSpa=true;
  if(m.maxType==='flying')b.maxSpeed=true;if(['steel','ground','fairy'].includes(m.maxType))b.maxDef=true;
  if(['grass','electric','psychic'].includes(m.maxType)){b.fieldType=m.maxType;b.terrainT=8;}
  if(['normal','bug','ghost','dragon','dark'].includes(m.maxType))for(const e of G.EnemyMgr.queryCircle(p.x,p.y,260))if(!e.dead){if(e.remote)G.Coop.status(e,'s',e.boss?.08:.3);else e.applySlow(e.boss?.08:.3);}
  if(m.maxType==='grass')p.heal(p.maxHp*.025);
  G.FX.ring(p.x,p.y,20,110,G.U.TYPE_COLOR[m.maxType]||'#fff',.5,3);
 }
 const DESCRIPTIONS={
  'tough-claws':'Contact attacks deal 20% more damage.','parental-bond':'Follow-up strikes are represented by 25% extra damage.','pure-power':'Physical attacks deal 20% more damage.','huge-power':'Physical attacks deal 20% more damage.',
  trace:'Special attacks deal 15% more damage.','shadow-tag':'Nearby foes are slowed; bosses resist the effect.',insomnia:'Ignore movement slows.','inner-focus':'Ignore movement slows; physical damage taken -10%.','solar-power':'Fire attacks deal 20% more damage.','sand-stream':'Rock attacks deal 15% more damage.',
  pixilate:'Normal attacks become Fairy and gain 20% damage.',refrigerate:'Normal attacks become Ice and gain 20% damage.',adaptability:'Matching-type attacks gain additional damage.',
  intimidate:'Physical damage taken -20%.','magic-bounce':'Special damage taken -20%.','strong-jaw':'Biting attacks deal 30% more damage.','shell-armor':'Damage taken -15%.','sand-force':'Rock, Ground and Steel attacks deal 20% more damage.',
  'delta-stream':'Damage taken -15%.','sheer-force':'Attacks with secondary effects deal 20% more damage.',scrappy:'Physical attacks against Ghost foes gain 20% damage.',stalwart:'Damage taken -15%.','piercing-drill':'Attacks ignore enemy base armor.',eelevate:'Electric damage +20%; damage taken -10%.',
  'fairy-aura':'Fairy attacks deal 20% more damage.',regenerator:'Recover 0.8% max HP each second.','no-guard':'All attacks deal 10% more damage.',berserk:'Below half HP, special attacks deal 25% more damage.',prankster:'Support move cooldowns are 20% shorter.',levitate:'Damage taken -10%.',
  'complete-order':'Damage taken -15%; Ground damage +15%.','nightmare-veil':'Slow nearby foes and deal 25% more damage to slowed foes.','plasma-drive':'Electric damage +20%, movement +12%, cooldown -15%.','dragon-focus':'Water and Dragon attacks deal 20% more damage.'
 };
 function traitsText(p){const m=entry(p);return m?.ability?.[G.I18n.lang==='zh-CN'?'zh':G.I18n.lang==='es'?'es':'en']||G.T('Survivor adaptation');}
 function description(p){return G.T(DESCRIPTIONS[ability(p)]||'Survivor adaptation');}
 return {mon,base,entry,ability,move,damage,incoming,cooldown,speed,tick,maxEffect,traitsText,description,DESCRIPTIONS};
})();
