/* Monotonic deadline derived from server time; no dependence on client wall clock. */
(function(factory){if(typeof module==='object'&&module.exports)module.exports=factory();else G.ChallengeCycle=factory();})(()=>{
  function create({now=()=>performance.now(),schedule=setTimeout,cancel=clearTimeout,visible=()=>true,expired=()=>{}}={}){
    let timer=null,deadline=Infinity,fired=false;
    function check(){cancel(timer);timer=null;if(fired)return;if(now()>=deadline){if(visible()){fired=true;expired();}return;}timer=schedule(check,Math.min(2147483647,Math.max(50,deadline-now()+50)));}
    return {configure(end,serverNow){cancel(timer);deadline=now()+Math.max(0,end-serverNow);fired=false;check();},check,stop(){cancel(timer);timer=null;deadline=Infinity;fired=true;},get due(){return now()>=deadline;}};
  }
  return {create};
});
