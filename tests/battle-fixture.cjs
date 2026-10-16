const vm=require('node:vm'),fs=require('node:fs');
module.exports=function fixture(){
 let time=0,random=.99;
 const noop=()=>{},G={LIFT:18,U:{dist:(x,y,a,b)=>Math.hypot(a-x,b-y),dist2:(x,y,a,b)=>(a-x)**2+(b-y)**2,norm:(x,y)=>{const d=Math.hypot(x,y);return d?[x/d,y/d]:[0,0];},rand:(a,b)=>a,clamp:(v,a,b)=>Math.min(b,Math.max(a,v)),randInt:(a,b)=>a,pick:a=>a[0],hash:()=>.5,damp:(a,b,k,dt)=>a+(b-a)*Math.min(1,k*dt),pickN:(a,n)=>a.slice(0,n),TYPE_NAME:{normal:'Normal',fire:'Fire'},TYPE_COLOR:{normal:'#ddd',fire:'#f80',water:'#48f',grass:'#4b4',ice:'#aff',fighting:'#c64',psychic:'#f6a'}},
  Settings:{fx:2,get:()=>false},I18n:{lang:'en'},T:s=>s,
  Sprites:{PX:2,actionFor:()=>'Attack',hasShiny:()=>false,hovers:()=>false,bodyRadius:()=>10,bodyHeight:()=>20,animMeta:()=>null,dirFromAngle:()=>0,prepareAction:noop,preload:noop,Animator:class{constructor(dex){this.dex=dex;this.speed=1;this.scale=1;}update(){}loop(){}play(){}busy(){return false;}snapshot(){return [];}request(){}sync(){}}},
  Coop:{active:false,isHost:false,noteDamage:noop},VFX:{forMove:()=>({})},FX:new Proxy({},{get:()=>noop}),Audio:{sfx:noop},Judgment:{noteDmg:noop},Weather:{mult:()=>1,speedFor:()=>1},Types:{mult:()=>1,label:()=>null},
  World:{isFree:()=>true,projectileBlock:()=>null,damageProp:noop,propsInCircle:()=>[],nearestBreakable:()=>null,collide:()=>false,isLiquid:()=>false,isWall:()=>false},Camera:{sees:()=>false,damage:noop},Input:{axis:()=>[0,0]},Path:{dirFor:()=>[1,0]},Projectiles:{nearest:(all,x,y,r)=>all.find(e=>!e.dead&&Math.hypot(e.x-x,e.y-y)<r),all:()=>[],clearOrbs:noop}};
 const math=Object.create(Math);math.random=()=>random;
 const ctx=vm.createContext({G,console,performance:{now:()=>time},Math:math,document:{addEventListener:noop},addEventListener:noop});
 for(const f of ['js/data/pokedex.js','js/data/sprites-meta.js','js/data/mega-sprites.js','js/data/form-sprites.js','js/data/battle-dex.js','js/core/battle-rules.js','js/data/special-data.js','js/core/special-rules.js','js/data/battle-moves.js','js/data/expansion-moves.js','js/data/moves.js','js/data/boss-catalog.js','js/entities/advanced-shots.js','js/entities/projectile.js','js/systems/special-runtime.js','js/systems/battle.js','js/entities/skill-vfx.js','js/entities/player.js','js/entities/enemy.js','js/systems/boss-stages.js','js/systems/combat.js','js/systems/levelup.js'])vm.runInContext(fs.readFileSync(f,'utf8'),ctx,{filename:f});
 G.startMoveOf=dex=>G.Moves.startFor(G.DEX_BY[dex]);
 const player=(dex=6)=>{const p=new G.Player(G.DEX_BY[dex]);p.uid='host';p.addMove('tackle');p.cast=noop;return p;};
 const enemy=(x=30,hp=1000,dex=1)=>{const e=new G.Enemy({dex,hp,spd:0,dmg:10,xp:0,behavior:'chaser'},x,0,{hp:1,spd:1,dmg:1});e.die=function(){this.dead=true;};G.EnemyMgr.add(e);G.EnemyMgr.rebuildGrid();return e;};
 return {G,ctx,player,enemy,time:n=>time=n,random:n=>random=n};
};
