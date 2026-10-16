const {test}=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs');

function scene(){
 let now=0,slashes=0;
 const noop=()=>{},G={LIFT:18,DEX_BY:{1:{dex:1,name:'fixture',hp:100,spd:100,atk:1,types:['normal']}},
  U:{dist:(x,y,a,b)=>Math.hypot(a-x,b-y),dist2:(x,y,a,b)=>(a-x)**2+(b-y)**2,norm:(x,y)=>{const l=Math.hypot(x,y);return l?[x/l,y/l]:[0,0];},rand:(a,b)=>a,clamp:(n,a,b)=>Math.min(b,Math.max(a,n)),TYPE_COLOR:{normal:'#fff'}},
  Sprites:{PX:1,hasShiny:()=>false,hovers:()=>false,bodyRadius:()=>10,bodyHeight:()=>20,animMeta:()=>null,dirFromAngle:()=>0,preload:noop,prepareAction:noop,Animator:class{constructor(){this.speed=1;}update(){}loop(){}play(){}busy(){return false;}snapshot(){return [];}}},
  Coop:{active:false,isHost:false,noteDamage:noop},VFX:{forMove:()=>({})},FX:new Proxy({slash:()=>slashes++},{get:(o,k)=>o[k]||noop}),Audio:{sfx:noop},Judgment:{noteDmg:noop},Weather:{mult:()=>1,speedFor:()=>1},Types:{mult:()=>1,label:()=>null},
  World:{propsInCircle:()=>[],nearestBreakable:()=>null,collide:()=>false,isLiquid:()=>false},Camera:{sees:()=>false,damage:noop},Gamepad:{rumble:noop},Input:{axis:()=>[0,0]},startMoveOf:()=>'tackle',Path:{dirFor:()=>[1,0]},Projectiles:{clearOrbs:noop,nearest:(all,x,y,r)=>all.find(e=>!e.dead&&Math.hypot(e.x-x,e.y-y)<r),all:()=>[]}};
 const ctx=vm.createContext({G,console,performance:{now:()=>now},Math,document:{addEventListener:noop}});
 for(const file of ['js/core/battle-balance.js','js/data/moves.js','js/entities/player.js','js/entities/enemy.js','js/systems/combat.js'])vm.runInContext(fs.readFileSync(file,'utf8'),ctx);
 const player=()=>{const p=new G.Player(G.DEX_BY[1]);p.uid='host';p.addMove('tackle');p.cast=noop;return p;};
 const enemy=(x=30,y=0,hp=1000)=>{const e=new G.Enemy({dex:1,hp,spd:50,dmg:10,xp:0,behavior:'chaser'},x,y,{hp:1,spd:1,dmg:1});e.die=function(){this.dead=true;};G.EnemyMgr.add(e);G.EnemyMgr.rebuildGrid();return e;};
 return {G,ctx,player,enemy,setNow:n=>now=n,get slashes(){return slashes;}};
}

test('melee definitions add exact common tuning and all nine distinct roles',()=>{
 const {G}=scene(),m=G.Moves.BY_ID;
 assert.equal(m.tackle.cd,.45);assert.equal(m.tackle.radius,69);assert.ok(Math.abs(m.tackle.dmg-16*1.2*1.1*1.45)<.001);
 assert.equal(m['wing-attack'].combo,true);assert.equal(m['metal-claw'].shred,.15);assert.equal(m['bug-bite'].killHeal,.01);assert.equal(m.bite.killHeal,.01);assert.equal(m['karate-chop'].eliteBonus,1.3);assert.equal(m.lick.slow,.55);
 assert.ok(m['vine-whip'].radius>m.tackle.radius);assert.ok(m['body-slam'].stagger>.15);
 for(const d of G.Moves.ALL.filter(m=>m.kind==='melee')){assert.ok(d.arc<Math.PI*2);const a=G.Moves.instance(d.id);for(let i=1;i<d.maxLvl;i++)G.Moves.levelUp(a);const b=G.Moves.instance(d.id,d.maxLvl);assert.equal(a.dmg,b.dmg);assert.equal(a.cd,b.cd);G.Moves.evolve(a);assert.ok(a.arc>=Math.PI*2);}
});

test('range and exact circle-sector intersection include enemy bodies without the old 30-unit empty swing',()=>{
 const {G,player,enemy}=scene(),p=player(),m=p.activeMove();p.aim=0;
 const e=enemy(m.radius+9);assert.equal(G.Combat.meleeContains(p,m,e),true);e.x=m.radius+11;G.EnemyMgr.rebuildGrid();assert.equal(G.Combat.meleeTarget(p,m),null);G.Combat.tick(.1,p,0);assert.equal(p.dmgDealt,0);assert.equal(m.t,.05);
 e.x=45;e.y=45;p.aim=0;const narrow={...m,arc:Math.PI/2};assert.equal(G.Combat.meleeContains(p,narrow,e),true);e.y=65;assert.equal(G.Combat.meleeContains(p,narrow,e),false);
});

test('unreachable boss never steals aim from reachable enemies and damage occurs on actual cast',()=>{
 const {G,player,enemy}=scene(),p=player(),e=enemy(50),boss=enemy(250);boss.boss=true;p.target=boss;p.aim=Math.PI;
 assert.equal(G.Combat.meleeTarget(p,p.activeMove()),e);G.Combat.tick(.1,p,0);assert.ok(e.hp<1000);assert.equal(boss.hp,1000);assert.equal(p.target,e);assert.equal(p.meleeGuardT,.6);
});

test('guard survives ranged switch, never stacks and respects pure damage; expires with simulation time',()=>{
 const {G,player}=scene(),p=player();p.addMove('ember');p.meleeGuardT=.6;p.active=1;p.hurt(20);assert.equal(p.hp,85);
 p.invuln=0;p.active=0;p.hurt(20);assert.equal(p.hp,70);p.invuln=0;p.hurt(20,null,true);assert.equal(p.hp,50);
 p.active=1;p.update(.61);assert.equal(p.meleeGuardT,0);p.invuln=0;p.hurt(20);assert.equal(p.hp,30);
});

test('shared stagger cooldown across eight attackers prevents permanent control; elites resist and bosses ignore it',()=>{
 const {G,player,enemy}=scene(),p=player(),e=enemy(),m=p.activeMove();
 for(let i=0;i<8;i++)G.Combat.acceptMeleeHit(p,e,1,'#fff',1,0,m);
 assert.equal(e.staggerT,.15);assert.equal(e.staggerCd,.65);assert.ok(Math.hypot(e.kx,e.ky)<=60);
 e.update(.16,p);assert.equal(e.staggerT,0);G.Combat.acceptMeleeHit(p,e,1,'#fff',1,0,m);assert.equal(e.staggerT,0);
 e.shiny=true;e.staggerCd=0;e.applyMeleeControl(m,1,0);assert.equal(e.staggerT,.075);
 const boss=enemy();boss.boss=true;boss.applyMeleeControl(m,1,0);assert.equal(boss.staggerT,undefined);assert.equal(boss.kx,0);
});

test('stagger stops AI movement and touch damage but damage-over-time clocks keep advancing',()=>{
 const {G,player,enemy}=scene(),p=player(),e=enemy(5);e.staggerT=.15;e.staggerCd=.65;e.slowT=1;
 const x=e.x;e.update(.05,p);assert.equal(e.x,x);assert.equal(e.slowT,.95);G.Combat.resolve(.05,p,0);assert.equal(p.hp,100);
 e.staggerT=0;e.remote=true;e.net={st:8};G.Combat.resolve(.05,p,0);assert.equal(p.hp,100);
});

test('combos use 55/45 total damage with delayed second strike; cancel on death or scene cleanup',()=>{
 const s=scene(),{G,player,enemy}=s,p=player();p.slots=[[G.Moves.instance('wing-attack')]];const m=p.activeMove(),e=enemy();
 G.Combat.tick(.01,p,0);const first=1000-e.hp;assert.equal(first,Math.round(m.dmg*.55));assert.equal(s.slashes,1);assert.equal(p.meleeHasteT,.6);
 G.Combat.updateFields(.05);assert.equal(s.slashes,1);G.Combat.updateFields(.05);assert.equal(s.slashes,2);assert.equal(1000-e.hp,Math.round(m.dmg*.55)+Math.round(m.dmg*.45));
 m.t=0;G.Combat.tick(.01,p,1);p.dead=true;G.Combat.updateFields(.2);assert.equal(s.slashes,3);
 p.dead=false;m.t=0;G.Combat.tick(.01,p,2);G.Combat.clearFields();G.Combat.updateFields(.2);assert.equal(s.slashes,4);
});

test('ghost combos are visuals only: no damage, guard, control, prop damage or healing',()=>{
 const s=scene(),{G,player,enemy}=s,p=player(),e=enemy();G.Combat.ghostCast(p,'metal-claw',1,0,false);G.Combat.updateFields(.1);
 assert.equal(s.slashes,2);assert.equal(e.hp,1000);assert.equal(p.meleeGuardT,0);assert.equal(e.meleeShredT,undefined);assert.equal(p.dmgDealt,0);
});

test('kill healing is shared across bites, capped in every rolling second, and never credits shields, props or dead targets',()=>{
 const {G,player,enemy,setNow}=scene(),p=player();p.hp=20;
 for(let i=0;i<20;i++){const e=enemy(30,0,1),m=G.Moves.instance(i%2?'bite':'bug-bite');G.Combat.acceptMeleeHit(p,e,100,'#fff',1,0,m);G.Combat.acceptMeleeHit(p,e,100,'#fff',1,0,m);}
 assert.ok(Math.abs(p.hp-24)<.00001);setNow(999);G.Combat.acceptMeleeHit(p,enemy(30,0,1),100,'#fff',1,0,G.Moves.instance('bite'));assert.equal(p.hp,24);
 setNow(1000);G.Combat.acceptMeleeHit(p,enemy(30,0,1),100,'#fff',1,0,G.Moves.instance('bite'));assert.equal(p.hp,25);
 const shielded=enemy();shielded.shield=100;p.meleeGuardT=0;const r=G.Combat.acceptMeleeHit(p,shielded,1,'#fff',1,0,G.Moves.instance('bite'));assert.equal(r.dealt,0);assert.equal(p.meleeGuardT,0);assert.equal(shielded.staggerT,undefined);
});

test('metal claw shred is non-stacking and expires; karate bonus targets bosses and elites only; lick slows',()=>{
 const {G,player,enemy}=scene(),p=player(),e=enemy(),claw=G.Moves.instance('metal-claw');G.Combat.acceptMeleeHit(p,e,100,'#fff',1,0,claw);assert.equal(e.hp,900);
 G.Combat.acceptMeleeHit(p,e,100,'#fff',1,0,claw);assert.equal(e.hp,785);assert.equal(e.meleeShredT,2);e.update(2.1,p);assert.equal(e.meleeShredT,0);
 const boss=enemy();boss.boss=true;G.Combat.acceptMeleeHit(p,boss,100,'#fff',1,0,G.Moves.instance('karate-chop'));assert.equal(boss.hp,870);
 const normal=enemy();G.Combat.acceptMeleeHit(p,normal,100,'#fff',1,0,G.Moves.instance('karate-chop'));assert.equal(normal.hp,900);
 G.Combat.acceptMeleeHit(p,normal,10,'#fff',1,0,G.Moves.instance('lick'));assert.equal(normal.slow,.55);
});

function network(s,uid){
 const {G,ctx}=s;let receive;const sent=[];
 G.Net={uid,on:f=>receive=f,onPeer:()=>{},interval:()=>.1,slow:()=>false,viaTurn:()=>false,send:(u,m)=>sent.push([u,m]),toHost:m=>sent.push(['host',m])};G.Flow={};G.TeamStats={create:()=>({snapshot:()=>[],hit:()=>{},ingest:()=>{}})};
 vm.runInContext(fs.readFileSync('js/net/coop.js','utf8'),ctx);
 const p=s.player();G.Coop.begin({host:'host',members:Array.from({length:8},(_,i)=>({uid:i?'u'+i:'host',name:'p'+i,dex:1}))},p,{choosing:()=>false});
 return {p,sent,receive,flush:()=>G.Coop.toHost(['fixture'])};
}

test('host processes each guest melee hit exactly once and credits only the real killer among eight players',()=>{
 const s=scene(),{G}=s,n=network(s,'host'),e=s.enemy(30,0,1),event=['mh',1,e.id,50,'#fff',1,0,'bite',1,0];
 n.receive('u1',{k:'f',ev:[event,event]});for(let i=2;i<8;i++)n.receive('u'+i,{k:'f',ev:[event]});
 assert.equal(e.dead,true);assert.equal(G.Coop.mate('u1').q.filter(e=>e[0]==='mb').length,1);
 assert.equal(G.Coop.mate('u1').q.find(e=>e[0]==='mb')[3],true);
 assert.equal(G.Coop.mate('u1').q.filter(e=>e[0]==='hn').length,1,'attacker receives confirmed hit feedback');
 for(let i=2;i<8;i++)assert.equal(G.Coop.mate('u'+i).q.filter(e=>e[0]==='mb').length,0);
 assert.equal(n.p.hp,100);
});

test('guest accepts host-authorized benefits once, ignores spoofed sender and does not predict kills',()=>{
 const s=scene(),{G}=s,n=network(s,'u1');n.p.hp=20;const ack=['mb',1,'bite',true,10];
 n.receive('u2',{k:'f',ev:[ack]});assert.equal(n.p.hp,20);n.receive('host',{k:'f',ev:[ack,ack]});assert.equal(n.p.hp,21);assert.equal(n.p.meleeGuardT,.6);
 const e=s.enemy();e.remote=true;G.Coop.meleeHit(e,10,'#fff',1,0,G.Moves.instance('bite'));assert.equal(e.hp,1000);assert.equal(n.p.hp,21);
});

 test('malformed melee data and non-finite benefit receipts never mutate damage or movement',()=>{
 const s=scene(),{G}=s,n=network(s,'host'),e=s.enemy();
 n.receive('u1',{k:'f',ev:[['mh',1,e.id,10,'#fff',NaN,0,'bite',1,0],['mh',2,e.id,Infinity,'#fff',1,0,'bite',1,0]]});
 assert.equal(e.hp,1000);assert.equal(e.kx,0);
 G.Combat.meleeBenefits(n.p,G.Moves.instance('bite'),true,Infinity);assert.equal(n.p.dmgDealt,0);assert.equal(n.p.meleeGuardT,0);
 });
