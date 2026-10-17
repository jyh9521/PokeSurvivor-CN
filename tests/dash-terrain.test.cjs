const {test}=require('node:test'),a=require('node:assert/strict'),scene=require('./battle-fixture.cjs');
function run(id,blocked,opt={}){const s=scene(),{G,player,enemy}=s,p=player(),m=G.Moves.instance(id,opt.level||1);if(opt.evolved)G.Moves.evolve(m);p.moves=[m];p.slots=[[m]];p.target=enemy(30);p.aim=opt.angle||0;p.walking=false;G.Camera.kick=()=>{};G.World.isFree=(x,y,r)=>!blocked(x,y,r);if(opt.arena){G.Tiles={T:16};G.World.arena=opt.arena;}G.Combat.tick(.01,p,0);return{...s,p,m};}
test('all displacement moves phase through walls, trees, rocks and consecutive solid props',()=>{
 const {G}=scene();const ids=G.Moves.ALL.filter(m=>m.kind==='dash'&&!m.specialOnly).map(m=>m.id);a.ok(ids.length>=4);
 for(const id of ids)for(const kind of ['wall','tree','rock','mixed']){const block=(x,y,r)=>kind==='wall'?x+r>24&&x-r<48:kind==='mixed'?(Math.hypot(x-30,y)<r+9||Math.hypot(x-60,y)<r+10):Math.hypot(x-35,y)<r+14;const {p,m,G}=run(id,block);a.ok(p.x>60,id+':'+kind);a.ok(p.x<=m.radius+1e-8);a.ok(G.World.isFree(p.x,p.y,p.r,true));a.ok(p.invuln>0);a.equal(p.riftSweeps.length,1);}
});
test('blocked full endpoint searches back to a full-body free landing without extra range',()=>{
 const {p,m,G}=run('aerial-ace',(x,y,r)=>x+r>90);a.ok(p.x>0&&p.x+p.r<=90);a.ok(p.x<=m.radius);a.ok(G.World.isFree(p.x,p.y,p.r,true));a.deepEqual({...p.lastFree},{x:p.x,y:p.y});
});
test('an obstacle thicker than dash range cannot strand the player or grant blocked movement invulnerability',()=>{
 const {p}=run('aerial-ace',(x,y,r)=>x>0);a.equal(p.x,0);a.equal(p.y,0);a.equal(p.invuln,0);a.equal(p.riftSweeps,undefined);
});
test('diagonal phase uses full body radius and remains inside sealed arenas',()=>{
 const {p,m,G}=run('aerial-ace',(x,y,r)=>Math.hypot(x-30,y-30)<r+15,{angle:Math.PI/4});a.ok(p.x>45&&p.y>45);a.ok(Math.hypot(p.x,p.y)<=m.radius+1e-8);a.ok(G.World.isFree(p.x,p.y,p.r,true));
 const bound=run('aerial-ace',()=>false,{level:5,evolved:true,arena:{tx:0,ty:0,r:3}});a.ok(Math.hypot(bound.p.x-16,bound.p.y-16)<=64-bound.p.r);
});
test('ghost phase effects never move a remote player, hurt targets or damage props',()=>{
 const {G,player,enemy}=scene(),p=player(),e=enemy(65);let propDamage=0;G.World.isFree=(x,y,r)=>!(x+r>20&&x-r<40);G.World.damageProp=()=>propDamage++;G.Camera.kick=()=>{};p.aim=0;const hp=e.hp;G.Combat.ghostCast(p,'aerial-ace',1,0,false);a.equal(p.x,0);a.equal(p.y,0);a.equal(e.hp,hp);a.equal(propDamage,0);a.equal(p.invuln,0);
});
