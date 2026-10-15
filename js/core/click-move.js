/* Mouse intent at the existing player input seam; physics and combat stay unchanged. */
G.ClickMove=(()=>{
  let arena=false,canvas=null,target=null,owner=null,path=[],held=false,pointer=null,cursor=null,last=null,stuck=0,planAt=0,followAt=0;
  const now=()=>performance.now();
  function allowed(){const p=G.Game?.player;return G.Settings.get('clickMove')&&G.Game?.state==='playing'&&p&&!p.dead&&!p.frozen&&!document.hidden&&!G.Dialog?.open&&!G.UIFocus?.top();}
  function cancel(){target=null;owner=null;path=[];held=false;pointer=null;last=null;stuck=0;}
  function destination(x,y,quiet=false){if(!allowed()||!Number.isFinite(x)||!Number.isFinite(y)){cancel();return false;}
    const p=G.Game.player,route=G.Path.route(p,{x,y});if(!route){cancel();if(!quiet)G.UI.toast(G.T('Destino no alcanzable'));return false;}
    target={x,y};owner=p;arena=!!G.Rift?.inArena;path=route;last={x:p.x,y:p.y};stuck=0;planAt=now()+350;return true;
  }
  function worldPoint(e){const r=canvas.getBoundingClientRect(),sx=Math.max(0,Math.min(r.width,e.clientX-r.left))*canvas.clientWidth/r.width,sy=Math.max(0,Math.min(r.height,e.clientY-r.top))*canvas.clientHeight/r.height;
    return {x:G.Camera.left()-(G.Camera._sx||0)+sx/G.Camera.scale,y:G.Camera.top()-(G.Camera._sy||0)+sy/G.Camera.scale};}
  function down(e){if(e.pointerType!=='mouse')return;if(e.button===2){cancel();return;}if(e.button!==0)return;
    if(G.Touch.overButton(e.clientX,e.clientY)||!allowed()){cancel();return;}const point=worldPoint(e);if(!destination(point.x,point.y))return;
    cursor={clientX:e.clientX,clientY:e.clientY};held=true;pointer=e.pointerId;followAt=now()+150;e.preventDefault();try{canvas.setPointerCapture(e.pointerId);}catch{}
  }
  function tick(){for(const el of document.querySelectorAll('[data-mouse-hint]'))el.classList.toggle('hidden',!G.Settings.get('clickMove'));if(target&&(!allowed()||(owner&&owner!==G.Game.player)||arena!==!!G.Rift?.inArena))cancel();}
  function vector(dt=1/60){tick();if(!target)return null;const p=owner;
    if(held&&cursor&&now()>=followAt){const point=worldPoint(cursor);if(Math.hypot(point.x-target.x,point.y-target.y)>8){const id=pointer,position=cursor;if(!destination(point.x,point.y,true))return null;held=true;pointer=id;cursor=position;}followAt=now()+150;}
    if(held&&Math.hypot(p.x-target.x,p.y-target.y)<=Math.max(2,p.spd*dt)){stuck=0;last={x:p.x,y:p.y};return [0,0];}
    if(last){const step=Math.hypot(p.x-last.x,p.y-last.y);if(step>Math.max(100,p.spd*dt*4)){cancel();return null;}stuck=step<.05?stuck+dt:0;}last={x:p.x,y:p.y};
    if(stuck>.65){cancel();return null;}
    if(now()>=planAt){const route=G.Path.route(p,target);if(!route){cancel();return null;}path=route;planAt=now()+350;}
    while(path.length&&Math.hypot(path[0].x-p.x,path[0].y-p.y)<=Math.max(2,p.spd*dt))path.shift();
    if(!path.length){if(!held)cancel();return [0,0];}
    const point=path[0],dx=point.x-p.x,dy=point.y-p.y,d=Math.hypot(dx,dy),k=Math.min(1,d/Math.max(1,p.spd*dt));return [dx/d*k,dy/d*k];
  }
  function init(cv){canvas=cv;cv.addEventListener('pointerdown',down);cv.addEventListener('pointermove',e=>{if(held&&e.pointerId===pointer)cursor={clientX:e.clientX,clientY:e.clientY};});cv.addEventListener('pointerup',e=>{if(e.pointerId===pointer){held=false;pointer=null;}});cv.addEventListener('pointercancel',cancel);cv.addEventListener('lostpointercapture',()=>{if(held)cancel();});
    document.addEventListener('pointerdown',e=>{if(e.target!==cv)cancel();},true);window.addEventListener('blur',cancel);document.addEventListener('visibilitychange',cancel);
    window.addEventListener('keydown',e=>{if(['KeyW','KeyA','KeyS','KeyD','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.code))cancel();});
    G.Settings.on(k=>{if(k==='clickMove')cancel();});
  }
  function draw(ctx){if(!target||!allowed())return;ctx.save();ctx.strokeStyle='#ffe680';ctx.lineWidth=1.5;ctx.globalAlpha=.8;ctx.beginPath();ctx.arc(target.x,target.y,7,0,Math.PI*2);ctx.moveTo(target.x-11,target.y);ctx.lineTo(target.x+11,target.y);ctx.moveTo(target.x,target.y-11);ctx.lineTo(target.x,target.y+11);ctx.stroke();ctx.restore();}
  return {init,tick,vector,cancel,draw,setTarget:destination,get target(){return target?{...target}:null;}};
})();
