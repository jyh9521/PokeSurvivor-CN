/* Pure identity, eligibility and move conversion rules. No rendering or clocks. */
(function(factory){if(typeof module==='object'&&module.exports)module.exports=factory(require('../data/special-data.js'));else G.SpecialRules=factory(G.SpecialData);})(data=>{
 const variants=(dex)=>data.variants.filter(v=>v.dex===dex);
 const variant=(dex,key)=>variants(dex).find(v=>v.key===key)||null;
 const megas=(dex,key='')=>data.megas.filter(m=>m.dex===dex&&(!m.requires||m.requires===key));
 const mega=(dex,key,base='')=>megas(dex,base).find(m=>m.key===String(key))||null;
 const maxAllowed=(dex,key='')=>![888,889,890].includes(dex)&&(!key||!!variant(dex,key)?.max);
 const original=(dex,kind)=>data[kind==='max'?'maxSpecies':'zSpecies'].includes(dex);
 const Z=[
  {dex:[26],form:'alola',base:'thunderbolt',id:'stoked-sparksurfer',name:'Stoked Sparksurfer',type:'electric',kind:'wave',slow:.65},
  {dex:[724],base:'spirit-shackle',id:'sinister-arrow-raid',name:'Sinister Arrow Raid',type:'ghost',kind:'beam'},
  {dex:[133],base:'last-resort',id:'extreme-evoboost',name:'Extreme Evoboost',type:'normal',kind:'boost'},
  {dex:[727],base:'darkest-lariat',id:'malicious-moonsault',name:'Malicious Moonsault',type:'dark',kind:'mark'},
  {dex:[784],base:'clanging-scales',id:'clangorous-soulblaze',name:'Clangorous Soulblaze',type:'dragon',kind:'nova',boost:true},
  {dex:[792],base:'moongeist-beam',id:'menacing-moonraze-maelstrom',name:'Menacing Moonraze Maelstrom',type:'ghost',kind:'beam',ignoreArmor:true},
  {dex:[745],base:'stone-edge',id:'splintered-stormshards',name:'Splintered Stormshards',type:'rock',kind:'meteor',clear:true},
  {dex:[802],base:'spectral-thief',id:'soul-stealing-7-star-strike',name:'Soul-Stealing 7-Star Strike',type:'ghost',kind:'dash',steal:true},
  {dex:[151],base:'psychic',id:'genesis-supernova',name:'Genesis Supernova',type:'psychic',kind:'wave',terrain:true},
  {dex:[778],base:'play-rough',id:'lets-snuggle-forever',name:"Let's Snuggle Forever",type:'fairy',kind:'mark'},
  {dex:[25],base:'volt-tackle',id:'catastropika',name:'Catastropika',type:'electric',kind:'dash'},
  {dex:[730],base:'sparkling-aria',id:'oceanic-operetta',name:'Oceanic Operetta',type:'water',kind:'wave',heal:true},
  {dex:[143],base:'giga-impact',id:'pulverizing-pancake',name:'Pulverizing Pancake',type:'normal',kind:'rolling'},
  {dex:[791],base:'sunsteel-strike',id:'searing-sunraze-smash',name:'Searing Sunraze Smash',type:'steel',kind:'dash',ignoreArmor:true},
  {dex:[785,786,787,788],base:'natures-madness',id:'guardian-of-alola',name:'Guardian of Alola',type:'fairy',kind:'guardian'}
 ];
 const Z_NAMES={normal:'Breakneck Blitz',fire:'Inferno Overdrive',water:'Hydro Vortex',electric:'Gigavolt Havoc',grass:'Bloom Doom',ice:'Subzero Slammer',fighting:'All-Out Pummeling',poison:'Acid Downpour',ground:'Tectonic Rage',flying:'Supersonic Skystrike',psychic:'Shattered Psyche',bug:'Savage Spin-Out',rock:'Continental Crush',ghost:'Never-Ending Nightmare',dragon:'Devastating Drake',dark:'Black Hole Eclipse',steel:'Corkscrew Crash',fairy:'Twinkle Tackle'};
 const Z_KINDS={normal:'rolling',fire:'split',water:'wave',electric:'chain',grass:'mark',ice:'ricochet',fighting:'dash',poison:'lob',ground:'mark',flying:'boomerang',psychic:'beam',bug:'curve',rock:'meteor',ghost:'spiral',dragon:'wave',dark:'mark',steel:'ricochet',fairy:'nova'};
 function zMove(p,m){if(!m)return null;const own=Z.find(z=>z.dex.includes(p.dex)&&z.base===(m.def?.id||m.id)&&(!z.form||z.form===p.baseForm));
  const type=own?.type||m.type||'normal',status=m.damageClass==='status'||m.kind==='stance'||m.id==='substitute';
  return {...m,...own,id:own?.id||'z-'+type,name:own?.name||(status?'Z-Support':Z_NAMES[type]),type,kind:own?.kind||(status?'guard':Z_KINDS[type]),damageClass:m.damageClass==='physical'?'physical':'special',specialOnly:true,exclusive:!!own,cd:999,dmg:Math.min(240,Math.max(100,(m.def?.dmg||m.dmg||20)*2.8)),radius:260,width:100,speed:250,life:1.3,count:7,size:8,pierce:4,spread:.18,delay:.65,dur:8,knock:own?.kind==='rolling'?35:0};
 }
 const MAX_NAMES={normal:'Max Strike',fire:'Max Flare',water:'Max Geyser',electric:'Max Lightning',grass:'Max Overgrowth',ice:'Max Hailstorm',fighting:'Max Knuckle',poison:'Max Ooze',ground:'Max Quake',flying:'Max Airstream',psychic:'Max Mindstorm',bug:'Max Flutterby',rock:'Max Rockfall',ghost:'Max Phantasm',dragon:'Max Wyrmwind',dark:'Max Darkness',steel:'Max Steelspike',fairy:'Max Starfall'};
 function maxMove(m){const status=m.damageClass==='status'||m.kind==='stance'||m.id==='substitute';return {...m,id:'max-'+(status?'guard':m.type),name:status?'Max Guard':MAX_NAMES[m.type],maxType:m.type,kind:status?'guard':m.kind==='melee'||m.kind==='counter'?'wave':m.kind,radius:(m.radius||90)*1.35,width:(m.width||35)*1.35,dmg:(m.dmg||20)*1.35,count:Math.min(8,m.count||1),maxConverted:true};}
 return {variants,variant,megas,mega,maxAllowed,original,zMove,maxMove,Z,Z_NAMES,MAX_NAMES,data};
});
