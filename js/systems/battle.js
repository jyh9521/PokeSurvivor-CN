/* Stateful battle module: one owner for defense, passives, traits and temporary forms. */
G.Battle=(()=>{
  const rules=G.BattleRules,data=G.BattleDex;
  const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
  const maxLevel=id=>G.PassiveDefs.find(d=>d.id===id)?.maxLevel??G.PASSIVE_MAX_LEVEL;
  const level=(p,id)=>clamp(Number.isSafeInteger(p.passives?.[id])?p.passives[id]:0,0,maxLevel(id));
  const legacyLevel=(p,id)=>level(p,id)/2;
  const keys={maxhp:'hp',physical:'atk',special:'atk',speed:'spd',cooldown:'cd',armor:'def',ward:'def',shield:'def',block:'def',root:'rgn',regen:'rgn',magnet:'mag',experience:'xp'};
  const passiveKey=stat=>keys[stat];
  const passive=(p,stat)=>(G.PassiveDefs||[]).reduce((n,d)=>n+(d.stat===stat?level(p,d.id)*d.value:0),0);
  function init(p){p.baseForm=p.mon.formKey||'';p.baseStats=p.mon.formStats||rules.stats(p.mon,data);p.trait=rules.trait(p.mon,data);p.role=rules.role(p.mon,data);const entry=data.species[p.dex],form=G.SpecialRules.megas(p.dex,p.baseForm)[0];p.megaTrait=form?rules.trait(p.mon,{species:{[p.dex]:{...entry,stats:form.stats,ability:form.ability||entry.ability}}}):p.trait;p.passives={};p.battle={energy:0,choice:'z',megaKey:form?.key||'',used:false,form:null,remaining:0,shield:0,block:0,blockT:0,shieldT:0,counterT:0,sturdyT:0,heals:[],clock:0,formBonus:0,regen:0};visual(p);}
  function trait(p){return p.battle?.form==='mega'?p.megaTrait:p.trait;}
  function ensure(p){if(!p.battle)init(p);return p.battle;}
  function learn(p,id){const d=G.PassiveDefs.find(d=>d.id===id);if(!d)return false;ensure(p);const n=level(p,id);if(n>=maxLevel(id)||!n&&Object.keys(p.passives).length>=4)return false;p.passives[id]=n+1;if(d.stat==='maxhp')p.addMaxHp(d.value);if(d.stat==='cooldown')p.cdMul*=1-d.value;if(d.stat==='magnet')p.magnet*=1+d.value;if(d.stat==='experience')p.xpMul*=1+d.value;if(keys[d.stat]){p.statsTaken||={};p.statsTaken[keys[d.stat]]=(p.statsTaken[keys[d.stat]]||0)+1;}return true;}
  function retrain(p,oldId,newId,expected){
    const old=G.PassiveDefs.find(d=>d.id===oldId),next=G.PassiveDefs.find(d=>d.id===newId),n=level(p,oldId),ev=G.Moves.evoInfo(p.activeMove(),p.statsTaken);
    if(p.remote||p.dead||!old||!next||!n||n!==expected||Object.keys(p.passives).length!==4||p.passives[newId]||p.rerolls>=1+p.rerollBonus||!ev||ev.ready||passiveKey(next.stat)!==ev.needs)return false;
    // Pay with an existing reroll AND this level reward; forfeit every old level.
    // Reverse only the removed passive's own contribution, never permanent perks.
    const ratio=p.hp/p.maxHp;delete p.passives[oldId];
    if(old.stat==='maxhp'){p.maxHp=Math.max(1,p.maxHp-n*old.value);p.hp=Math.min(p.hp,p.maxHp*ratio);}
    if(old.stat==='cooldown')p.cdMul/=Math.pow(1-old.value,n);
    if(old.stat==='magnet')p.magnet/=Math.pow(1+old.value,n);
    if(old.stat==='experience')p.xpMul/=Math.pow(1+old.value,n);
    const key=passiveKey(old.stat);if(key)p.statsTaken[key]=Math.max(0,(p.statsTaken[key]||0)-n);
    if(old.stat==='block')p.battle.block=0;
    if(old.stat==='shield')p.battle.shield=Math.min(p.battle.shield,p.maxHp*passive(p,'shield'));
    p.rerolls++;return learn(p,newId);
  }
  function types(p){const b=p.battle;if(b?.form==='mega')return G.SpecialRuntime.entry(p)?.types||p.mon.types;return p.mon.types;}
  function formStats(p){return p.battle?.form==='mega'?G.SpecialRuntime.entry(p)?.stats||p.baseStats:p.baseStats;}
  function damage(p,e,m,amount){ensure(p);const cls=rules.classify(m,data),s=formStats(p),index=cls==='physical'?1:3,old=Math.max(.1,p.mon.atk||1);
    let k=(.70+s[index]*.0055)/old;
    k*=1+passive(p,cls);
    const actor=p.remote?G.Game?.player||p:p;
    k*=G.BattleBalance.offense(actor);
    k*=1+.05*Math.min(12,Math.max(0,m.training||0));
    const own=types(p).includes(m.type);if(own)k*=G.BattleBalance.STAB;
    if(trait(p).key==='adapt'&&own)k*=1.12;
    if(trait(p).key==='vigor'&&own&&p.hp/p.maxHp<.35)k*=1.2;
    if(trait(p).key==='technician'&&(m.def?.nativeDmg||m.nativeDmg||m.def?.dmg||m.dmg)<=18)k*=1.2;
    if(trait(p).key==='focus'&&cls==='special'||trait(p).key==='force'&&cls==='physical')k*=1.1;
    if(trait(p).key==='pressure'&&(e.boss||e.shiny||e.golden||e.elite))k*=1.15;
    k*=G.SpecialRuntime.damage(p,e,m);
    if(m.id==='counter')k*=(1.7+legacyLevel(p,'revenge')*.2)*(1+Math.min(.35,(s[2]+passive(p,'armor'))/600));
    const enemyStats=data.species[e.dex]?.stats;
    if(enemyStats&&cls!=='true'&&!m.ignoreArmor&&G.SpecialRuntime.ability(p)!=='piercing-drill')k*=1-rules.armor(enemyStats[cls==='physical'?2:4]*.55);
    return Number.isFinite(amount)&&amount>0?amount*k:0;
  }
  function healLimited(p,fraction){const b=ensure(p);b.heals=b.heals.filter(h=>b.clock-h.at<1);const used=b.heals.reduce((n,h)=>n+h.f,0),f=Math.min(fraction,Math.max(0,.04-used));if(f>0){b.heals.push({at:b.clock,f});p.heal(p.maxHp*f);}}
  function credit(p,m,dealt,killed){if(p.dead||p.remote||!Number.isFinite(dealt)||dealt<=0)return;ensure(p);p.onDealt(dealt);p.dmgDealt+=dealt;G.Telemetry?.damage(p,m,dealt,killed);charge(p,dealt,killed);if(m.seedHeal)healLimited(p,m.seedHeal);}
  function charge(p,dealt,killed){if(p.battle&&!p.battle.used)p.battle.energy=Math.min(100,p.battle.energy+Math.min(1,dealt*.01)+(killed?1:0));}
  function accept(p,e,amount,col,dx,dy,knock,m,eff){if(!e||e.dead||e.remote||!Number.isFinite(amount)||amount<=0)return {dealt:0,killed:false};const hp=e.hp;e.hurt(amount,col,dx,dy,knock,eff,p.uid);const dealt=Math.max(0,hp-Math.max(0,e.hp)),killed=dealt>0&&e.dead;credit(p,m,dealt,killed);return {dealt,killed};}
  function deal(p,e,amount,col,dx,dy,knock,m,eff){const value=damage(p,e,m,amount);if(!(value>0))return;if(e.remote){G.Coop.battleHit(e,value,col,dx,dy,knock,m,eff);return;}return accept(p,e,value,col,dx,dy,knock,m,eff);}
  function defend(p,amount,pure,cls,legacyReduction,contact=false){const b=ensure(p);if(!Number.isFinite(amount)||amount<=0)return 0;
    if(pure)return Math.max(1,amount);
    amount*=G.SpecialRuntime.incoming(p,cls);
    const dodge=clamp(passive(p,'dodge')+(trait(p).key==='swift'?.05:0),0,.3);
    if(Math.random()<dodge){G.Telemetry?.add(p,'dodges');G.FX.dmgText(p.x,p.y-p.bodyH,G.T('Dodged'),'#b9e6ff');return 0;}
    if(b.block>0){G.Telemetry?.add(p,'blocks');b.block=0;b.counterT=2+legacyLevel(p,'revenge');G.FX.ring(p.x,p.y,8,45,'#c8e9ff',.25,2);G.FX.dmgText(p.x,p.y-p.bodyH,G.T('Blocked'),'#c8e9ff');return 0;}
    const s=formStats(p),armor=s[cls==='special'?4:2]+passive(p,cls==='special'?'ward':'armor');
    let reduction=1-(1-rules.armor(armor))*(1-legacyReduction);
    if(trait(p).key==='carapace'&&cls==='physical'||trait(p).key==='ward'&&cls==='special')reduction=1-(1-reduction)*.88;
    reduction=Math.min(.85,reduction);let d=Math.max(1,amount*(1-reduction));
    if(contact){const close=p.meleeGuardT>0||p.activeGroup().some(m=>m.kind==='melee');d=Math.min(d,p.maxHp*(close?G.BattleBalance.CONTACT_CAP:G.BattleBalance.RANGED_CONTACT_CAP));}
    const absorbed=Math.min(b.shield,d);b.shield-=absorbed;d-=absorbed;G.Telemetry?.add(p,'shield',absorbed);
    if(p.dex===778&&p.baseForm!=='busted'&&d>0){G.SpecialRuntime.base(p,'busted');p.trait=rules.trait(p.mon,data);visual(p);return Math.min(d,p.maxHp*.125);}
    if(trait(p).key==='sturdy'&&b.sturdyT<=0&&p.hp>=p.maxHp-.001&&d>=p.hp){d=p.hp-1;b.sturdyT=60;}
    if(d>0)b.counterT=2+legacyLevel(p,'revenge');return Math.max(0,d);
  }
  function speed(p){const mobility=p.battle?.form==='mega'?Math.round(78+formStats(p)[5]*.42)/Math.round(78+p.baseStats[5]*.42):1;return G.SpecialRuntime.speed(p)*mobility*(1+passive(p,'speed'))*(trait(p)?.key==='swift'?1.08:1);}
  function crit(p){return clamp(p.critChance+passive(p,'crit'),0,.6);}
  function tick(p,dt){const b=ensure(p);b.clock+=dt;G.SpecialRuntime.tick(p,dt);
    for(const k of ['blockT','shieldT','counterT','sturdyT'])b[k]=Math.max(0,b[k]-dt);
    if(p.dead){b.zBoost=b.terrainT=b.maxBuffT=b.guardT=0;endForm(p);return;}
    if(!b.used&&!b.form)b.energy=Math.min(100,b.energy+dt*.8);
    const blockLv=level(p,'protect'),interval=blockLv?12-blockLv:trait(p).key==='guard'?12:0;
    if(interval&&b.blockT<=0){b.block=1;b.blockT=interval;}
    const shield=passive(p,'shield');if(shield&&b.shieldT<=0){b.shield=Math.max(b.shield,p.maxHp*shield);b.shieldT=8;}
    const regen=passive(p,'regen')+(!p.walking?passive(p,'root'):0)+(trait(p).key==='sustain'?.004:0);
    if(regen){const hp=p.hp;p.hp=Math.min(p.maxHp,p.hp+p.maxHp*regen*dt);G.Telemetry?.add(p,'healed',p.hp-hp);}
    if(b.form){b.remaining=Math.max(0,b.remaining-dt);if(b.remaining===0)endForm(p);}
    visual(p);
  }
  function available(p,kind){return kind==='z'||kind==='max'&&G.SpecialRules.maxAllowed(p.dex,p.baseForm)||kind==='mega'&&G.SpecialRules.megas(p.dex,p.baseForm).length>0;}
  function activate(p,kind){const b=ensure(p);if(kind==='mega'){const m=G.SpecialRules.mega(p.dex,b.megaKey,p.baseForm)||G.SpecialRules.megas(p.dex,p.baseForm)[0];if(m){b.megaKey=m.key;p.megaTrait=rules.trait({...p.mon,formAbility:m.ability?.id||''},{species:{[p.dex]:{...data.species[p.dex],stats:m.stats,ability:m.ability}}});}}if(p.remote||p.dead||b.used||b.form||b.energy<100||!available(p,kind)||kind==='z'&&!p.activeMove())return false;
    b.used=true;b.energy=0;b.choice=kind;b.uses=(b.uses||0)+1;G.Telemetry?.event(p,"special-use",{kind,uses:b.uses});
    if(kind==='z'){const cast=G.Combat.special(p,'z');G.Coop.formCast?.(p,'z',cast);}
    else{b.form=kind;b.remaining=kind==='mega'?30:20;if(kind==='mega'){b.formBonus=Math.round((G.SpecialRuntime.entry(p).stats[0]-p.baseStats[0])*.45);const total=Math.max(1,p.maxHp+b.formBonus);p.hp=p.hp/p.maxHp*total;p.maxHp=total;}if(kind==='max'){b.formBonus=Math.round(p.maxHp*.5);const ratio=(p.maxHp+b.formBonus)/p.maxHp;p.maxHp+=b.formBonus;p.hp*=ratio;}}
    if(kind!=='z')G.SkillVFX?.form(p,kind);visual(p);return true;
  }
  function endForm(p){const b=p.battle;if(!b||!b.form)return;if(b.formBonus){const total=p.maxHp;p.maxHp=Math.max(1,p.maxHp-b.formBonus);p.hp=Math.min(p.maxHp,p.hp/total*p.maxHp);b.formBonus=0;b.shield=Math.min(b.shield,p.maxHp*passive(p,'shield'));}b.maxBuffT=b.terrainT=b.guardT=0;b.maxAtk=b.maxSpa=b.maxSpeed=b.maxDef=false;b.form=null;b.remaining=0;if(b.rechargePending){b.rechargePending=false;b.used=false;b.energy=0;}visual(p);}
  function visual(p){const b=p.battle;if(!b||!p.anim)return;const form=b.form==='mega'?G.SpecialRuntime.entry(p):null;const sprite=form&&G.MegaSprites?.[form.id]?form.id:p.mon.formSprite||p.dex;
    if(p.anim.dex!==sprite){p.anim=new G.Sprites.Animator(sprite,1,sprite===p.dex&&p.shiny);G.Sprites.preload([sprite],8000,sprite===p.dex&&p.shiny);if(p.dead)p.anim.play('Faint',{hold:true});}
    p.anim.scale=b.form==='max'?1.65:1;p.r=G.Sprites.bodyRadius(sprite,p.anim.scale);p.bodyH=G.Sprites.bodyHeight(sprite,p.anim.scale);
  }
  function net(p){const b=p.battle;return b?[b.form||'',Math.round(b.remaining*10)/10,Math.round(b.energy),b.used?1:0,Math.round(b.shield),b.block,Object.entries(p.passives||{}),p.baseForm||'',b.megaKey||'',[(b.zBoost||0),(b.terrainT||0),b.fieldType||'',(b.maxBuffT||0),!!b.maxAtk,!!b.maxSpa,!!b.maxSpeed,!!b.maxDef,(b.guardT||0)],b.choice,b.rechargePending?1:0,b.uses||0,G.RunGrowth?.net(p)]:null;}
  function ingest(p,a){if(!p.remote||!Array.isArray(a))return;const b=ensure(p);if(a[7]!==p.baseForm)G.SpecialRuntime.base(p,a[7]);const m=G.SpecialRules.mega(p.dex,a[8],p.baseForm);b.megaKey=m?.key||G.SpecialRules.megas(p.dex,p.baseForm)[0]?.key||'';const f=Array.isArray(a[9])?a[9]:[];b.zBoost=clamp(+f[0]||0,0,20);b.terrainT=clamp(+f[1]||0,0,12);b.fieldType=typeof f[2]==='string'?f[2]:'';b.maxBuffT=clamp(+f[3]||0,0,8);[b.maxAtk,b.maxSpa,b.maxSpeed,b.maxDef]=f.slice(4,8).map(Boolean);b.guardT=clamp(+f[8]||0,0,2);b.form=['mega','max'].includes(a[0])?a[0]:null;b.remaining=clamp(Number(a[1])||0,0,30);b.energy=clamp(Number(a[2])||0,0,100);b.used=!!a[3];b.shield=clamp(Number(a[4])||0,0,1e6);b.block=a[5]?1:0;p.passives={};for(const row of (Array.isArray(a[6])?a[6]:[]).slice(0,4))if(Array.isArray(row)&&G.PassiveDefs.some(d=>d.id===row[0])&&Number.isSafeInteger(row[1])&&row[1]>0&&row[1]>0)p.passives[row[0]]=clamp(row[1],1,maxLevel(row[0]));b.choice=["mega","max","z"].includes(a[10])?a[10]:"z";b.rechargePending=!!a[11];b.uses=clamp(a[12]|0,0,100);p.growthSummary=a[13]||null;visual(p);}
  return {maxLevel,trait,init,learn,retrain,passiveKey,damage,deal,accept,credit,charge,defend,speed,crit,tick,activate,available,endForm,visual,net,ingest,types,level,passive,stats:p=>formStats(p)};
})();
