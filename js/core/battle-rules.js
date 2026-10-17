/* Pure battle/catalog rules. Species data stays outside runtime state and saves. */
(function(factory){const value=factory();if(typeof module!=='undefined'&&module.exports)module.exports=value;else G.BattleRules=value;})(()=>{
  const REGIONS=[['Kanto','关都'],['Johto','城都'],['Hoenn','丰缘'],['Sinnoh','神奥'],['Unova','合众','Teselia'],['Kalos','卡洛斯'],['Alola','阿罗拉'],['Galar','伽勒尔'],['Paldea','帕底亚']];
  const ROLES={tank:['counter','body-slam','bulldoze','stealth-rock'],healer:['draining-kiss','leech-seed','hyper-voice','substitute'],skirmisher:['aqua-jet','shadow-sneak','quick-attack','air-slash'],caster:['psychic','dragon-pulse','earth-power','hyper-beam'],bruiser:['metal-claw','karate-chop','counter','body-slam'],controller:['whirlpool','icy-wind','leech-seed','stealth-rock']};
  const TRAITS={
    disguise:{title:'Disguise',desc:'The first unblocked hit breaks Disguise and costs at most 12.5% max HP; once per run.'},
    carapace:{title:'Carapace',desc:'Physical damage taken -12%.',kind:'physical',reduction:.12},
    ward:{title:'Spirit ward',desc:'Special damage taken -12%.',kind:'special',reduction:.12},
    sturdy:{title:'Last stand',desc:'Survive a lethal hit at full HP with 1 HP; 60s cooldown.'},
    technician:{title:'Technician',desc:'Moves with base damage at most 18 deal +20% damage.'},
    vigor:{title:'Vigor',desc:'Below 35% HP, matching-type attacks deal +20% damage.'},
    adapt:{title:'Adaptability',desc:'Matching-type attacks gain an additional 12% damage.'},
    swift:{title:'Swift foot',desc:'Movement speed +8%; dodge +5%.'},
    sustain:{title:'Sustain',desc:'Regenerate 0.4% max HP per second.'},
    focus:{title:'Focused mind',desc:'Special attacks deal +10% damage.'},
    force:{title:'Brute force',desc:'Physical attacks deal +10% damage.'},
    pressure:{title:'Pressure',desc:'Deal +15% damage to bosses and elites.'},
    guard:{title:'Battle guard',desc:'Gain a single-hit block every 12s; maximum one charge.'}
  };
  function stats(mon,data){return mon.formStats||data?.species?.[mon.dex]?.stats || [Math.max(1,Math.round((mon.hp-70)/.45)),80,60,80,60,70];}
  function role(mon,data){const [hp,atk,def,spa,spd,spe]=stats(mon,data);return def+spd>=220?'tank':hp>=120?'healer':spe>=100?'skirmisher':spa>atk*1.15?'caster':atk>=95?'bruiser':'controller';}
  function trait(mon,data){const id=mon.formAbility||data?.species?.[mon.dex]?.ability?.id||'',r=role(mon,data);
    const groups={carapace:['shell-armor','battle-armor','fur-coat','fluffy','filter','solid-rock','heatproof'],ward:['ice-scales','magic-guard','wonder-skin','water-bubble'],sturdy:['sturdy'],disguise:['disguise'],technician:['technician','skill-link','iron-fist','strong-jaw'],vigor:['overgrow','blaze','torrent','swarm','guts','berserk'],adapt:['adaptability','protean','libero','normalize','scrappy','aerilate','pixilate','refrigerate'],swift:['speed-boost','quick-feet','swift-swim','chlorophyll','sand-rush','slush-rush','limber','run-away'],sustain:['regenerator','natural-cure','rain-dish','ice-body','poison-heal','hydration','healer'],focus:['competitive','solar-power','analytic','psychic-surge'],force:['huge-power','pure-power','sheer-force','moxie','tough-claws','defiant'],pressure:['pressure','intimidate','unnerve','supreme-overlord'],guard:['multiscale','shadow-shield','overcoat','bulletproof','soundproof']};
    const key=Object.keys(groups).find(k=>groups[k].includes(id))||({tank:'carapace',healer:'sustain',skirmisher:'swift',caster:'focus',bruiser:'force',controller:'guard'}[r]);
    return {key,...TRAITS[key],...(key==='disguise'&&mon.formKey==='busted'?{desc:'Disguise is broken for this run.'}:{}),source:mon.formAbilityData||data?.species?.[mon.dex]?.ability,adapted:!groups[key].includes(id)};
  }
  const ADAPTATIONS={132:['transform'],201:['hidden-power'],235:['sketch'],789:['struggle'],790:['struggle'],824:['struggle']};
  const copyable=m=>m&&m.dmg>0&&!m.specialOnly&&m.kind!=='buff'&&!['struggle','transform','sketch'].includes(m.id);
  function sources(mon,id,data){
    const canonical=Object.entries(data?.legacyAliases||{}).find(([,legacy])=>legacy===id)?.[0]||id;
    const records=mon.formSprite?data?.learnsets?.forms?.[mon.formSprite]:data?.learnsets?.species?.[mon.dex];
    return records?.[canonical]||[];
  }
  function pool(mon,data,defs){if(!data?.species?.[mon.dex])return [];
    if(ADAPTATIONS[mon.dex])return mon.dex===235?[...ADAPTATIONS[235],...Object.values(defs).filter(copyable).map(m=>m.id)]:ADAPTATIONS[mon.dex].filter(id=>defs[id]);
    // Curated lists are ordering preferences, never permission to learn.
    const preferred=new Set(mon.skillPool||[]);
    return Object.keys(defs).filter(id=>!defs[id].specialOnly&&!defs[id].learningOnly&&(!defs[id].restrictedTo||defs[id].restrictedTo.includes(mon.dex))&&defs[id].kind!=='buff'&&sources(mon,id,data).length)
      .sort((a,b)=>Number(!mon.types.includes(defs[a].type))-Number(!mon.types.includes(defs[b].type))||Number(!preferred.has(a))-Number(!preferred.has(b))||a.localeCompare(b));
  }
  function armor(value){return Math.min(.65,Math.max(0,value)/(Math.max(0,value)+180));}
  function classify(move,data){const c=move.damageClass||data?.moveClasses?.[move.id];return c==='status'&&move.dmg>0?'special':c||(move.kind==='melee'||move.kind==='dash'?'physical':'special');}
  function flatten(value){return value==null?'':typeof value==='object'?Object.entries(value).map(([k,v])=>k+' '+flatten(v)).join(' '):String(value);}
  function searchText(mon,data,extra=''){const entry=data?.species?.[mon.dex]||{};return [flatten(mon),flatten(entry),REGIONS[mon.gen-1]?.join(' '),String(mon.dex).padStart(3,'0'),String(mon.dex).padStart(4,'0'),'#'+mon.dex,extra].join(' ').normalize('NFKC').toLocaleLowerCase();}
  function matches(mon,save,filters,text){if(filters.gen&&mon.gen!==+filters.gen)return false;
    const own=!!save.owned?.[mon.dex],sh=!!save.shiny?.[mon.dex];
    if(filters.owned==='own'&&!own||filters.owned==='miss'&&own)return false;
    if(filters.type&&filters.type!=='all'&&!mon.types.includes(filters.type))return false;
    if(filters.rarity==='shiny'&&!sh||/^\d$/.test(filters.rarity)&&mon.rarity!==+filters.rarity)return false;
    return String(filters.query||'').normalize('NFKC').toLocaleLowerCase().trim().split(/\s+/).filter(Boolean).every(q=>/^#\d+$/.test(q)?Number(q.slice(1))===mon.dex:/^0\d+$/.test(q)?Number(q)===mon.dex:text.includes(q));
  }
  return {REGIONS,ROLES,TRAITS,ADAPTATIONS,copyable,sources,stats,role,trait,pool,armor,classify,searchText,matches};
});
