/* Stateful battle module: one owner for defense, passives, traits and temporary forms. */
G.Battle=(()=>{
  const rules=G.BattleRules,data=G.BattleDex;
  const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
  const level=(p,id)=>p.passives?.[id]||0;
  const passive=(p,stat)=>(G.PassiveDefs||[]).reduce((n,d)=>n+(d.stat===stat?level(p,d.id)*d.value:0),0);
  function init(p){p.baseStats=rules.stats(p.mon,data);p.trait=rules.trait(p.mon,data);p.role=rules.role(p.mon,data);const entry=data.species[p.dex],form=entry?.mega?.[0];p.megaTrait=form?rules.trait(p.mon,{species:{[p.dex]:{...entry,stats:form.stats,ability:form.ability||entry.ability}}}):p.trait;p.passives={};p.battle={energy:0,choice:'z',used:false,form:null,remaining:0,shield:0,block:0,blockT:0,shieldT:0,counterT:0,sturdyT:0,heals:[],clock:0,formBonus:0,regen:0};}
  function trait(p){return p.battle?.form==='mega'?p.megaTrait:p.trait;}
  function ensure(p){if(!p.battle)init(p);return p.battle;}
  function learn(p,id){const d=G.PassiveDefs.find(d=>d.id===id);if(!d)return false;ensure(p);const n=level(p,id);if(n>=3||!n&&Object.keys(p.passives).length>=4)return false;p.passives[id]=n+1;if(d.stat==='maxhp')p.addMaxHp(d.value);if(d.stat==='cooldown')p.cdMul*=1-d.value;if(d.stat==='magnet')p.magnet*=1+d.value;if(d.stat==='experience')p.xpMul*=1+d.value;const keys={maxhp:'hp',physical:'atk',special:'atk',speed:'spd',cooldown:'cd',armor:'def',ward:'def',shield:'def',block:'def',root:'rgn',regen:'rgn',magnet:'mag',experience:'xp'};if(keys[d.stat]){p.statsTaken||={};p.statsTaken[keys[d.stat]]=(p.statsTaken[keys[d.stat]]||0)+1;}return true;}
  function types(p){const b=p.battle;if(b?.form==='mega')return data.species[p.dex]?.mega?.[0]?.types||p.mon.types;return p.mon.types;}
  function formStats(p){return p.battle?.form==='mega'?data.species[p.dex]?.mega?.[0]?.stats||p.baseStats:p.baseStats;}
  function damage(p,e,m,amount){ensure(p);const cls=rules.classify(m,data),s=formStats(p),index=cls==='physical'?1:3,old=Math.max(.1,p.mon.atk||1);
    let k=(.70+s[index]*.0055)/old;
    k*=1+passive(p,cls);
    const own=types(p).includes(m.type);if(own)k*=1.12;
    if(trait(p).key==='adapt'&&own)k*=1.12;
    if(trait(p).key==='vigor'&&own&&p.hp/p.maxHp<.35)k*=1.2;
    if(trait(p).key==='technician'&&(m.def?.dmg||m.dmg)<=18)k*=1.2;
    if(trait(p).key==='focus'&&cls==='special'||trait(p).key==='force'&&cls==='physical')k*=1.1;
    if(trait(p).key==='pressure'&&(e.boss||e.shiny||e.golden||e.elite))k*=1.15;
    if(p.battle.form==='max')k*=1.2;
    if(m.id==='counter')k*=(1.7+level(p,'revenge')*.2)*(1+Math.min(.35,(s[2]+passive(p,'armor'))/600));
    const enemyStats=data.species[e.dex]?.stats;
    if(enemyStats&&cls!=='true')k*=1-rules.armor(enemyStats[cls==='physical'?2:4]);
    return Number.isFinite(amount)&&amount>0?amount*k:0;
  }
  function healLimited(p,fraction){const b=ensure(p);b.heals=b.heals.filter(h=>b.clock-h.at<1);const used=b.heals.reduce((n,h)=>n+h.f,0),f=Math.min(fraction,Math.max(0,.04-used));if(f>0){b.heals.push({at:b.clock,f});p.heal(p.maxHp*f);}}
  function credit(p,m,dealt,killed){if(p.dead||p.remote||!Number.isFinite(dealt)||dealt<=0)return;ensure(p);p.onDealt(dealt);p.dmgDealt+=dealt;charge(p,dealt,killed);if(m.seedHeal)healLimited(p,m.seedHeal);}
  function charge(p,dealt,killed){if(p.battle&&!p.battle.used)p.battle.energy=Math.min(100,p.battle.energy+Math.min(1,dealt*.01)+(killed?1:0));}
  function accept(p,e,amount,col,dx,dy,knock,m,eff){if(!e||e.dead||e.remote||!Number.isFinite(amount)||amount<=0)return {dealt:0,killed:false};const hp=e.hp;e.hurt(amount,col,dx,dy,knock,eff,p.uid);const dealt=Math.max(0,hp-Math.max(0,e.hp)),killed=dealt>0&&e.dead;credit(p,m,dealt,killed);return {dealt,killed};}
  function deal(p,e,amount,col,dx,dy,knock,m,eff){const value=damage(p,e,m,amount);if(!(value>0))return;if(e.remote){G.Coop.battleHit(e,value,col,dx,dy,knock,m,eff);return;}return accept(p,e,value,col,dx,dy,knock,m,eff);}
  function defend(p,amount,pure,cls,legacyReduction){const b=ensure(p);if(!Number.isFinite(amount)||amount<=0)return 0;
    if(pure)return Math.max(1,amount);
    const dodge=clamp(passive(p,'dodge')+(trait(p).key==='swift'?.05:0),0,.3);
    if(Math.random()<dodge){G.FX.dmgText(p.x,p.y-p.bodyH,G.T('Dodged'),'#b9e6ff');return 0;}
    if(b.block>0){b.block=0;b.counterT=2+level(p,'revenge');G.FX.ring(p.x,p.y,8,45,'#c8e9ff',.25,2);G.FX.dmgText(p.x,p.y-p.bodyH,G.T('Blocked'),'#c8e9ff');return 0;}
    const s=formStats(p),armor=s[cls==='special'?4:2]+passive(p,cls==='special'?'ward':'armor');
    let reduction=1-(1-rules.armor(armor))*(1-legacyReduction);
    if(trait(p).key==='carapace'&&cls==='physical'||trait(p).key==='ward'&&cls==='special')reduction=1-(1-reduction)*.88;
    reduction=Math.min(.85,reduction);let d=Math.max(1,amount*(1-reduction));
    const absorbed=Math.min(b.shield,d);b.shield-=absorbed;d-=absorbed;
    if(trait(p).key==='sturdy'&&b.sturdyT<=0&&p.hp>=p.maxHp-.001&&d>=p.hp){d=p.hp-1;b.sturdyT=60;}
    if(d>0)b.counterT=2+level(p,'revenge');return Math.max(0,d);
  }
  function speed(p){const mobility=p.battle?.form==='mega'?Math.round(78+formStats(p)[5]*.42)/Math.round(78+p.baseStats[5]*.42):1;return mobility*(1+passive(p,'speed'))*(trait(p)?.key==='swift'?1.08:1);}
  function crit(p){return clamp(p.critChance+passive(p,'crit'),0,.6);}
  function tick(p,dt){const b=ensure(p);b.clock+=dt;
    for(const k of ['blockT','shieldT','counterT','sturdyT'])b[k]=Math.max(0,b[k]-dt);
    if(p.dead){endForm(p);return;}
    if(!b.used)b.energy=Math.min(100,b.energy+dt*.8);
    const blockLv=level(p,'protect'),interval=blockLv?12-blockLv*2:trait(p).key==='guard'?12:0;
    if(interval&&b.blockT<=0){b.block=1;b.blockT=interval;}
    const shield=passive(p,'shield');if(shield&&b.shieldT<=0){b.shield=Math.max(b.shield,p.maxHp*shield);b.shieldT=8;}
    const regen=passive(p,'regen')+(!p.walking?passive(p,'root'):0)+(trait(p).key==='sustain'?.004:0);
    if(regen)p.hp=Math.min(p.maxHp,p.hp+p.maxHp*regen*dt);
    if(b.form){b.remaining=Math.max(0,b.remaining-dt);if(b.remaining===0)endForm(p);}
    visual(p);
  }
  function available(p,kind){return ['z','max'].includes(kind)||kind==='mega'&&!!data.species[p.dex]?.mega?.length;}
  function activate(p,kind){const b=ensure(p);if(p.remote||p.dead||b.used||b.energy<100||!available(p,kind))return false;
    b.used=true;b.energy=0;b.choice=kind;
    if(kind==='z'){G.Combat.special(p,'z');G.Coop.formCast?.(p,'z');}
    else{b.form=kind;b.remaining=kind==='mega'?30:20;if(kind==='max'){b.formBonus=Math.round(p.maxHp*.5);const ratio=(p.maxHp+b.formBonus)/p.maxHp;p.maxHp+=b.formBonus;p.hp*=ratio;}}
    if(kind!=='z')G.SkillVFX?.form(p,kind);visual(p);return true;
  }
  function endForm(p){const b=p.battle;if(!b||!b.form)return;if(b.form==='max'&&b.formBonus){const total=p.maxHp;p.maxHp=Math.max(1,p.maxHp-b.formBonus);p.hp=Math.min(p.maxHp,p.hp/total*p.maxHp);b.formBonus=0;b.shield=Math.min(b.shield,p.maxHp*passive(p,'shield'));}b.form=null;b.remaining=0;visual(p);}
  function visual(p){const b=p.battle;if(!b||!p.anim)return;const form=b.form==='mega'?data.species[p.dex]?.mega?.[0]:null;const sprite=form&&G.MegaSprites?.[form.id]?form.id:p.dex;
    if(p.anim.dex!==sprite){p.anim=new G.Sprites.Animator(sprite,1,sprite===p.dex&&p.shiny);G.Sprites.preload([sprite],8000,sprite===p.dex&&p.shiny);if(p.dead)p.anim.play('Faint',{hold:true});}
    p.anim.scale=b.form==='max'?1.65:b.form==='mega'&&sprite===p.dex?1.15:1;
  }
  function net(p){const b=p.battle;return b?[b.form||'',Math.round(b.remaining*10)/10,Math.round(b.energy),b.used?1:0,Math.round(b.shield),b.block,Object.entries(p.passives||{})]:null;}
  function ingest(p,a){if(!p.remote||!Array.isArray(a))return;const b=ensure(p);b.form=['mega','max'].includes(a[0])?a[0]:null;b.remaining=clamp(Number(a[1])||0,0,30);b.energy=clamp(Number(a[2])||0,0,100);b.used=!!a[3];b.shield=clamp(Number(a[4])||0,0,1e6);b.block=a[5]?1:0;p.passives={};for(const row of (Array.isArray(a[6])?a[6]:[]).slice(0,4))if(Array.isArray(row)&&G.PassiveDefs.some(d=>d.id===row[0])&&Number.isInteger(row[1])&&row[1]>0&&row[1]<=3)p.passives[row[0]]=row[1];visual(p);}
  return {trait,init,learn,damage,deal,accept,credit,charge,defend,speed,crit,tick,activate,available,endForm,visual,net,ingest,types,level,passive,stats:p=>formStats(p)};
})();
