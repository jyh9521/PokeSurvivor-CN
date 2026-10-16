/* Distinct trajectories and canonical prerequisites; no new character artwork. */
G.ExpansionMoves=[
 {id:'volt-tackle',name:'Volt Tackle',type:'electric',damageClass:'physical',kind:'dash',cd:1.8,dmg:37,radius:160,width:38},
 {id:'spirit-shackle',name:'Spirit Shackle',type:'ghost',damageClass:'physical',kind:'projectile',cd:1.4,dmg:29,count:1,speed:420,life:1.2,size:5,pierce:2,slow:.4},
 {id:'last-resort',name:'Last Resort',type:'normal',damageClass:'physical',kind:'wave',cd:2.7,dmg:44,radius:170,width:100,speed:190,life:1.2},
 {id:'darkest-lariat',name:'Darkest Lariat',type:'dark',damageClass:'physical',kind:'aura',cd:1.9,dmg:32,radius:105,ignoreArmor:true},
 {id:'clanging-scales',name:'Clanging Scales',type:'dragon',damageClass:'special',kind:'wave',cd:2.1,dmg:35,radius:220,width:135,speed:180,life:1.4},
 {id:'moongeist-beam',name:'Moongeist Beam',type:'ghost',damageClass:'special',kind:'beam',cd:2.5,dmg:52,radius:340,width:35,ignoreArmor:true},
 {id:'stone-edge',name:'Stone Edge',type:'rock',damageClass:'physical',kind:'mark',cd:2,dmg:36,radius:70,delay:.65},
 {id:'spectral-thief',name:'Spectral Thief',type:'ghost',damageClass:'physical',kind:'dash',cd:1.8,dmg:33,radius:150,width:35,stealShield:true},
 {id:'play-rough',name:'Play Rough',type:'fairy',damageClass:'physical',kind:'melee',cd:1.2,dmg:29,radius:98,arc:Math.PI*1.3,knock:18},
 {id:'sparkling-aria',name:'Sparkling Aria',type:'water',damageClass:'special',kind:'wave',cd:2.1,dmg:30,radius:220,width:120,speed:175,life:1.4},
 {id:'giga-impact',name:'Giga Impact',type:'normal',damageClass:'physical',kind:'rolling',cd:3,dmg:55,radius:220,count:1,speed:230,life:1.3,size:12,pierce:5,knock:28},
 {id:'sunsteel-strike',name:'Sunsteel Strike',type:'steel',damageClass:'physical',kind:'dash',cd:2.5,dmg:49,radius:190,width:44,ignoreArmor:true},
 {id:'natures-madness',name:"Nature's Madness",type:'fairy',damageClass:'special',kind:'mark',cd:2.3,dmg:32,radius:68,delay:.6},
 {id:'photon-geyser',name:'Photon Geyser',type:'psychic',damageClass:'special',kind:'beam',cd:2.3,dmg:45,radius:310,width:32},
 {id:'seed-bomb',name:'Seed Bomb',type:'grass',damageClass:'physical',kind:'lob',cd:1.7,dmg:30,radius:72,count:2,speed:170,life:.8,size:8},
 {id:'dragon-darts',name:'Dragon Darts',type:'dragon',damageClass:'physical',kind:'split',cd:1.3,dmg:18,count:2,speed:260,life:1.5,size:5,pierce:1},
 {id:'magical-leaf',name:'Magical Leaf',type:'grass',damageClass:'special',kind:'curve',cd:1.1,dmg:18,count:3,speed:220,life:1.6,size:5,pierce:1},
 {id:'water-shuriken',name:'Water Shuriken',type:'water',damageClass:'special',kind:'ricochet',cd:1,dmg:15,count:3,speed:310,life:1.5,size:5,pierce:3},
 {id:'rollout',name:'Rollout',type:'rock',damageClass:'physical',kind:'rolling',cd:1.6,dmg:27,count:1,speed:180,life:1.8,size:10,pierce:4},
 {id:'mystical-fire',name:'Mystical Fire',type:'fire',damageClass:'special',kind:'spiral',cd:1.7,dmg:22,count:4,speed:150,life:1.8,size:6,pierce:2,burn:.5}
];
for(const [type,name] of Object.entries(G.SpecialRules.Z_NAMES))G.ExpansionMoves.push({id:'z-'+type,name,type,kind:'mark',damageClass:'special',cd:999,dmg:100,radius:220,delay:.6,specialOnly:true});
for(const z of G.SpecialRules.Z)G.ExpansionMoves.push({...z,kind:z.kind==='boost'?'mark':z.kind,damageClass:'special',cd:999,dmg:160,radius:220,delay:.6,specialOnly:true});
for(const [type,name]of Object.entries(G.SpecialRules.MAX_NAMES))G.ExpansionMoves.push({id:'max-'+type,name,type,kind:'mark',damageClass:'special',cd:999,dmg:50,radius:100,delay:.5,specialOnly:true});
G.ExpansionMoves.push({id:'z-support',name:'Z-Support',type:'normal',kind:'mark',cd:999,dmg:0,radius:1,specialOnly:true},{id:'max-guard',name:'Max Guard',type:'normal',kind:'mark',cd:999,dmg:0,radius:1,specialOnly:true});
