/* Geometry-only directional navigation, shared by browser and node tests. */
(function(factory){if(typeof module==='object'&&module.exports)module.exports=factory();else G.PadNav=factory();})(()=>{
  function next(from,items,dir){
    const horizontal=dir==='left'||dir==='right',sign=dir==='left'||dir==='up'?-1:1;
    const center=r=>[(r.left+r.right)/2,(r.top+r.bottom)/2],origin=center(from);
    let best=null,score=Infinity;
    for(const item of items){const r=item.rect,c=center(r),main=(c[horizontal?0:1]-origin[horizontal?0:1])*sign;
      if(main<=2)continue;
      const cross=Math.abs(c[horizontal?1:0]-origin[horizontal?1:0]);
      if(main<cross*.5)continue; // Reject almost-perpendicular jumps into distant toolbars.
      const overlap=horizontal?Math.min(from.bottom,r.bottom)-Math.max(from.top,r.top):Math.min(from.right,r.right)-Math.max(from.left,r.left);
      const value=main+cross*.35+Math.max(0,-overlap)*3;
      if(value<score){best=item;score=value;}
    }
    return best;
  }
  return {next};
});
