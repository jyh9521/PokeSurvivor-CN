/* Bounded trajectories. Split siblings share their hit set, never exponential children. */
G.AdvancedShots=(()=>{
 const kinds=new Set(['curve','split','spiral','ricochet','rolling']);
 function fire(p,m,ghost){const n=Math.min(8,Math.max(1,m.count||1));for(let i=0;i<n;i++){
  if(G.Projectiles.all().filter(q=>q.owner===p&&!q.orb).length>=80||G.Projectiles.count>=480)break;
  const a=p.aim+(i===0?0:Math.ceil(i/2)*(i%2?1:-1)*.16),sp=m.speed||220;
  G.Projectiles.spawn({x:p.x,y:p.y,vx:Math.cos(a)*sp,vy:Math.sin(a)*sp,moveData:{nativeDmg:m.def?.nativeDmg||m.nativeDmg||m.def?.dmg||m.dmg,id:m.id,instanceId:m.instanceId,type:m.type,kind:m.kind,damageClass:m.damageClass,training:m.training||0,mastery:m.mastery||0,ignoreArmor:m.ignoreArmor,skinBoost:m.skinBoost,dmg:m.dmg},dmg:m.dmg*p.atk,r:m.size||6,life:m.life||1.6,pierce:m.pierce||3,color:G.U.TYPE_COLOR[m.type],vis:G.VFX.forMove(m),hits:new Set(),owner:p,ghost,mtype:m.type,moveId:m.id,damageClass:m.damageClass,ignoreArmor:m.ignoreArmor,skinBoost:m.skinBoost,burn:m.burn||0,slow:m.slow||0,knock:m.knock||0,trajectory:m.kind,turn:i%2?-1:1,bounces:0,child:false});
 }}
 function step(p,dt,enemies){if(!kinds.has(p.trajectory))return;
  if(p.trajectory==='curve'||p.trajectory==='spiral'){
   const da=(p.trajectory==='curve'?.9:2.5)*p.turn*dt,c=Math.cos(da),s=Math.sin(da),vx=p.vx;p.vx=vx*c-p.vy*s;p.vy=vx*s+p.vy*c;
  }
  if(p.trajectory==='split'&&!p.child&&p.t>=.35&&!p.splitDone){p.splitDone=true;p.life=Math.min(p.life,p.t+.02);
   for(const da of [-.45,0,.45])if(G.Projectiles.count<480){const a=Math.atan2(p.vy,p.vx)+da,sp=Math.hypot(p.vx,p.vy),{id,...child}=p;G.Projectiles.spawn({...child,t:0,px:undefined,py:undefined,vx:Math.cos(a)*sp,vy:Math.sin(a)*sp,dmg:p.dmg*.55,life:1,child:true,trajectory:'',phits:new Set()});}
  }
  if(p.trajectory==='ricochet'&&p.hits.size>(p.lastHits||0)&&p.bounces<3){p.lastHits=p.hits.size;p.bounces++;
   const tg=enemies.filter(e=>!e.dead&&!p.hits.has(e.id)).sort((a,b)=>G.U.dist2(a.x,a.y,p.x,p.y)-G.U.dist2(b.x,b.y,p.x,p.y))[0];
   if(tg&&G.U.dist2(tg.x,tg.y,p.x,p.y)<260**2){const a=Math.atan2(tg.y-p.y,tg.x-p.x),sp=Math.hypot(p.vx,p.vy);p.vx=Math.cos(a)*sp;p.vy=Math.sin(a)*sp;}
  }
 }
 function wall(p){if(!['ricochet','rolling'].includes(p.trajectory)||p.bounces>=3)return false;p.bounces++;p.x=p.px??p.x;p.y=p.py??p.y;p.vx=-p.vx;p.vy=-p.vy;p.px=p.x;p.py=p.y;return true;}
 return {fire,step,wall,kinds};
})();
