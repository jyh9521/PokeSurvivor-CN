/* Visibility aid, not a second opaque player. Ground-foot Y sorting remains the
 * authority. Only pixels covered by foreground prop art receive a faint ghost.
 * Scratch canvases are bounded to each animation's frame, not the viewport. */
G.Occlusion=(()=>{
  const buffers=new WeakMap();
  function draw(ctx,actors,props,t,dt){
    if(!G.Settings.get('playerOutline'))return;
    for(const actor of actors){if(!actor?.anim?.bounds||actor.dead)continue;
      const b=actor.anim.bounds(actor.x,actor.y),front=props.filter(p=>!p.flat&&p.y>actor.y&&G.World.propBounds(p).some(r=>r.x<b.x+b.w&&r.x+r.w>b.x&&r.y<b.y+b.h&&r.y+r.h>b.y));
      let state=buffers.get(actor);if(!state){state={image:document.createElement('canvas'),mask:document.createElement('canvas'),alpha:0};buffers.set(actor,state);}
      state.alpha+=( (front.length ? .28 : 0)-state.alpha)*(1-Math.exp(-Math.min(.1,dt||1/60)*14));
      if(state.alpha<.001||!front.length)continue;
      const width=Math.ceil(b.w),height=Math.ceil(b.h);
      for(const c of [state.image,state.mask]){if(c.width!==width)c.width=width;if(c.height!==height)c.height=height;}
      const image=state.image.getContext('2d'),mask=state.mask.getContext('2d');
      image.setTransform(1,0,0,1,0,0);image.clearRect(0,0,width,height);image.imageSmoothingEnabled=false;image.save();image.translate(-b.x,-b.y);actor.anim.draw(image,actor.x,actor.y,{outline:true});image.restore();
      mask.setTransform(1,0,0,1,0,0);mask.clearRect(0,0,width,height);mask.imageSmoothingEnabled=false;mask.save();mask.translate(-b.x,-b.y);for(const p of front)G.World.drawOccluder(mask,p,t);mask.restore();
      image.globalCompositeOperation='destination-in';image.drawImage(state.mask,0,0);image.globalCompositeOperation='source-over';
      ctx.save();ctx.globalAlpha*=state.alpha;ctx.drawImage(state.image,b.x,b.y);ctx.restore();
    }
  }
  return {draw};
})();
