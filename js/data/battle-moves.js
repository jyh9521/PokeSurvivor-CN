/* New behaviors, not recolored copies: moving waves, delayed marks, reactive counters and decoys. */
G.BattleMoves=[
 {id:'surf',type:'water',kind:'wave',cd:2.4,dmg:30,radius:210,width:100,speed:170,life:1.3,slow:.2},
 {id:'icy-wind',type:'ice',kind:'wave',cd:1.9,dmg:19,radius:170,width:110,speed:150,life:1.2,slow:.55},
 {id:'air-slash',type:'flying',kind:'wave',cd:1.3,dmg:22,radius:230,width:64,speed:240,life:1.1,knock:30},
 {id:'whirlpool',type:'water',kind:'mark',cd:2.2,dmg:28,radius:78,delay:.7,slow:.55},
 {id:'leech-seed',type:'grass',kind:'mark',cd:2.8,dmg:24,radius:60,delay:1.1,seedHeal:.008},
 {id:'stealth-rock',type:'rock',kind:'mark',cd:2.3,dmg:32,radius:70,delay:.8,knock:25},
 {id:'earth-power',type:'ground',kind:'mark',cd:2,dmg:38,radius:72,delay:.6},
 {id:'psychic',type:'psychic',kind:'mark',cd:1.9,dmg:35,radius:64,delay:.45,slow:.3},
 {id:'counter',type:'fighting',kind:'counter',autoSupport:true,cd:1.2,dmg:20,radius:90,arc:Math.PI*1.2,knock:30},
 {id:'substitute',type:'normal',kind:'decoy',autoSupport:true,cd:6,dmg:14,radius:85,dur:3.5},
 {id:'explosion',type:'normal',kind:'mark',cd:3.5,dmg:58,radius:115,delay:.9},
 {id:'hyper-beam',type:'normal',kind:'beam',cd:2.4,dmg:62,radius:320,width:40},
 {id:'dragon-pulse',type:'dragon',kind:'wave',cd:1.8,dmg:30,radius:240,width:70,speed:220,life:1.2},
 {id:'bullet-seed',type:'grass',kind:'projectile',cd:.7,dmg:7,count:4,spread:.08,pierce:1,speed:400,life:1,size:4},
 {id:'shadow-sneak',type:'ghost',kind:'dash',cd:1.15,dmg:27,radius:105,width:34},
 {id:'aqua-jet',type:'water',kind:'dash',cd:1,dmg:24,radius:115,width:38}
];
G.PassiveDefs=[
 {id:'harden',name:'Harden',desc:'Physical armor +25 per level.',stat:'armor',value:25},
 {id:'light-screen',name:'Light Screen',desc:'Special armor +25 per level.',stat:'ward',value:25},
 {id:'double-team',name:'Double Team',desc:'Dodge chance +5% per level; total capped at 30%.',stat:'dodge',value:.05},
 {id:'protect',name:'Protect',desc:'Gain one block every 10/8/6 seconds; maximum one charge.',stat:'block',value:1},
 {id:'focus-energy',name:'Focus Energy',desc:'Critical chance +6% per level; total capped at 60%.',stat:'crit',value:.06},
 {id:'swords-dance',name:'Swords Dance',desc:'Physical damage +10% per level.',stat:'physical',value:.1},
 {id:'calm-mind',name:'Calm Mind',desc:'Special damage +10% per level.',stat:'special',value:.1},
 {id:'ingrain',name:'Ingrain',desc:'While standing still, regenerate 0.6% max HP per level each second.',stat:'root',value:.006},
 {id:'aqua-ring',name:'Aqua Ring',desc:'Regenerate 0.3% max HP per level each second.',stat:'regen',value:.003},
 {id:'iron-defense',name:'Iron Defense',desc:'Every 8 seconds gain a shield worth 5% max HP per level; no stacking.',stat:'shield',value:.05},
 {id:'agility',name:'Agility',desc:'Movement speed +5% per level.',stat:'speed',value:.05},
 {id:'revenge',name:'Revenge',desc:'Taking HP damage or blocking arms counter moves for 2 seconds.',stat:'counter',value:1}
];
