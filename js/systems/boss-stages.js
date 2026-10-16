/* A single HP pool, no forced resurrection and no screen-wide hazard cleanup. */
G.BossStages=(()=>{
 const ready=chain=>chain.every(d=>G.DEX_BY[d]&&G.SPRITE_META[d]);
 const regular=()=>G.BossCatalog.regular.filter(ready);
 const starters=()=>G.BossCatalog.starters.filter(ready);
 function morph(e,dex,stage,scale){if(!G.DEX_BY[dex]||!G.SPRITE_META[dex])return false;
  e.dex=dex;e.bossStage=stage;const mon=G.DEX_BY[dex];e.types=mon.types.slice();e.atkType=e.types[0];e.name=mon.name;
  e.scale=(Number.isFinite(scale)?Math.max(1,Math.min(2,scale)):0)||Math.max(1,Math.min(2,Math.round(110/((G.Sprites.animMeta(dex,'Idle')?.ay||30)*G.Sprites.PX)*2)/2));
  e.anim=new G.Sprites.Animator(dex,e.scale,e.shiny&&G.Sprites.hasShiny(dex));e.r=G.Sprites.bodyRadius(dex,e.scale);e.bodyH=G.Sprites.bodyHeight(dex,e.scale);G.Sprites.preload([dex],8000,e.shiny);
  G.Hazards?.clearOwner?.(e.id,stage);G.Projectiles.removeEnemy?.(e.id,stage);return true;
 }
 function tick(e,dt){const chain=e.def.stageChain;if(!chain||!ready(chain)||e.dead||e.remote)return false;
  let stage=chain.length===3?(e.hp/e.maxHp<=1/3?2:e.hp/e.maxHp<=2/3?1:0):(e.hp/e.maxHp<=.5?1:0);
  stage=Math.max(e.bossStage||0,stage);
  if(stage>(e.bossStage||0)){morph(e,chain[stage],stage);e.ai.cast=null;e.ai.cd=.9;e.jump=null;e.jumpLift=0;e.kx=e.ky=0;e.transitionT=.75;
   G.FX.ring(e.x,e.y,10,110,G.U.TYPE_COLOR[e.atkType]||'#fff',.7,4);G.Spawner.say(G.T(e.name)+' · '+G.T('Phase')+' '+(stage+1)+'/'+chain.length,2.3);
  }
  const phase=chain.length===2&&stage===1?2:stage;
  const kits=[{melee:['dash'],ranged:['volley']},{melee:['leap'],ranged:['rain']},{melee:['slam'],ranged:['beam','nova']}];
  e.ai.melee=kits[phase].melee;e.ai.ranged=kits[phase].ranged;
  e.transitionT=Math.max(0,(e.transitionT||0)-dt);return e.transitionT>0;
 }
 function remote(e,dex,stage,scale){if(!e.remote||!Number.isInteger(stage)||stage<0||stage>2)return;if(Number.isInteger(e.bossStage)&&stage<e.bossStage)return;if(e.dex!==dex||e.bossStage!==stage)morph(e,dex,stage,scale);}
 return {regular,starters,ready,tick,morph,remote};
})();
