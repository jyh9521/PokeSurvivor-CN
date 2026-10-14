/* Monotonic RTT probes and bounded, identifier-free diagnostic summaries. */
(function(factory){if(typeof module==='object'&&module.exports)module.exports=factory();else G.RelayHealth=factory();})(()=>{
  function create({now=()=>performance.now(),timeout=5000}={}){
    const started=now(),pending=new Map(),samples=new Map(),tx=new Map(),rx=new Map(),frames=[];
    let seq=0,timeouts=0,replies=0;
    const prune=a=>{while(a.length&&a[0]<now()-2000)a.shift();};
    function note(map,key){const a=map.get(key)||[];a.push(now());prune(a);map.set(key,a);}
    function probe(peer){if([...pending.values()].some(p=>p.peer===peer))return null;const id=String(++seq);pending.set(id,{peer,at:now()});return id;}
    function pong(peer,id){const p=pending.get(id);if(!p||p.peer!==peer)return false;pending.delete(id);if(now()-p.at>=timeout){timeouts++;return false;}const a=samples.get(peer)||[];a.push(now()-p.at);if(a.length>20)a.shift();samples.set(peer,a);replies++;return true;}
    function sweep(){for(const [id,p]of pending)if(now()-p.at>=timeout){pending.delete(id);timeouts++;}}
    const median=a=>{if(!a?.length)return null;const b=a.slice().sort((x,y)=>x-y);return b[Math.floor(b.length/2)];};
    const rate=map=>{let n=0;for(const a of map.values()){prune(a);n=Math.max(n,a.length);}return now()-started<2000?null:n/2;};
    function sample(extra={}){
      sweep();prune(frames);const nas=samples.get('nas')||[],peers=[...samples].filter(([k])=>k!=='nas').map(([,a])=>median(a));
      const jitter=nas.length<2?null:nas.slice(1).reduce((s,x,i)=>s+Math.abs(x-nas[i]),0)/(nas.length-1);
      return {transport:'websocket-relay',nasRttMs:median(nas),peerRttMs:peers.length?Math.max(...peers):null,jitterMs:jitter,probeTimeouts:timeouts,probeReplies:replies,sendHz:rate(tx),receiveHz:rate(rx),fps:now()-started<2000?null:frames.length/2,...extra};
    }
    return {probe,pong,sweep,clearPeers(){for(const k of samples.keys())if(k!=='nas')samples.delete(k);for(const[id,p]of pending)if(p.peer!=='nas')pending.delete(id);tx.clear();rx.clear();},tx:k=>note(tx,k),rx:k=>note(rx,k),frame:()=>{frames.push(now());prune(frames);},sample};
  }
  return {create};
});
