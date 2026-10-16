/* Place one destructible in each attack's actual path, with zero enemies. */
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const root=path.resolve(process.argv[2]||'.'),out=path.resolve(process.argv[3]||'artifacts/balance/props.json');process.chdir(root);const scene=require(path.join(root,'tests/battle-fixture.cjs')),rows=[];
for(const d of scene().G.Moves.ALL.filter(m=>m.dmg>0&&!m.specialOnly&&m.kind!=='buff')){
 const{G,player}=scene(),p=player(),m=G.Moves.instance(d.id);p.moves=[m];p.slots=[[m]];G.Camera.sees=()=>true;G.Camera.kick=()=>{};G.World.isWall=()=>false;
 const prop={id:'prop',x:['trail','mine'].includes(m.kind)?0:m.kind==='orbit'?m.radius:40,y:0,r:12,hp:10000,solid:true};
 G.World.propsInCircle=(x,y,r)=>Math.hypot(prop.x-x,prop.y-y)<r+prop.r?[prop]:[];G.World.nearestBreakable=()=>prop;G.World.damageProp=(o,n)=>o.hp-=n;
 if(m.kind==='boomerang'){const spawn=G.Projectiles.spawn;G.Projectiles.spawn=o=>{const n=Math.hypot(o.vx,o.vy)||1;prop.x=o.vx/n*40;prop.y=o.vy/n*40;return spawn(o);};}
 p.target=prop;p.aim=0;if(m.kind==='counter')p.battle.counterT=100;
 for(let f=0;f<720&&prop.hp===10000;f++){G.Combat.tick(1/60,p,f/60);G.Projectiles.update(1/60,p,[]);G.Combat.resolve(1/60,p,f/60);G.Combat.updateFields(1/60);}
 rows.push({id:d.id,kind:d.kind,damage:10000-prop.hp,position:{x:prop.x,y:prop.y}});
}
fs.mkdirSync(path.dirname(out),{recursive:true});fs.writeFileSync(out,JSON.stringify({model:'Zero enemies; one prop deliberately within the real hit geometry. Counter armed. 12s timeout. Does not prove every position is hittable or simulate multiplayer loot.',rows},null,2));
assert.ok(rows.every(r=>r.damage>0),JSON.stringify(rows.filter(r=>!r.damage)));console.log('PASS PROP_HITS: '+rows.length+'/'+rows.length+' attacks damage breakable targets');
