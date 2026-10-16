/* Normalize browser-exposed standard and unmapped USB controllers. No HID access. */
(function(factory){const api=factory();if(typeof module!=='undefined'&&module.exports)module.exports=api;else G.PadDevice=api;})(()=>{
  const value=b=>Math.max(0,Math.min(1,typeof b==='number'?b:Number(b?.value)||(b?.pressed?1:0)));
  const connected=p=>!!p&&p.connected!==false&&p.mapping!=='xr-standard'&&(p.buttons?.length||p.axes?.length);
  function read(nav){const fn=nav.getGamepads||nav.webkitGetGamepads;if(typeof fn!=='function')return{supported:false,pads:[],error:null};try{return{supported:true,pads:Array.from(fn.call(nav)||[]).filter(connected),error:null};}catch(e){return{supported:true,pads:[],error:e?.name||'Error'};}}
  function select(pads,current){return pads.find(p=>p.index===current?.index&&p.id===current?.id)||pads.find(p=>p.mapping==='standard')||pads[0]||null;}
  function key(p){let h=2166136261;for(const c of String(p.id)+'|'+p.mapping+'|'+(p.buttons?.length||0)+'|'+(p.axes?.length||0)){h^=c.charCodeAt(0);h=Math.imul(h,16777619);}return(h>>>0).toString(16);}
  function normalize(p,profile){const raw=Array.from(p.buttons||[],value),axes=Array.from(p.axes||[],n=>Math.max(-1,Math.min(1,(Number.isFinite(Number(n))?Number(n):0))));
    const buttons=Array.from({length:18},(_,i)=>{const chosen=profile?.buttons?.[i],j=Number.isInteger(chosen)&&chosen>=0&&chosen<64?chosen:i,v=raw[j]||0;return{value:v,pressed:v>.5};});
    const readAxis=(i)=>{const rule=profile?.axes?.[i],j=Number.isInteger(rule?.index)&&rule.index>=0&&rule.index<64?rule.index:i;return(axes[j]||0)*(rule?.sign===-1?-1:1);};
    return{index:p.index,id:p.id,mapping:p.mapping,connected:true,axes:[readAxis(0),readAxis(1)],buttons};
  }
  return{read,select,key,normalize,value};
});
