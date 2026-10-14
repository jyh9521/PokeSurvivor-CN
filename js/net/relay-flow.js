/* Shared bounded flow control. Only event-free snapshots may be replaced. */
(function(factory){if(typeof module==='object'&&module.exports)module.exports=factory();else G.RelayFlow=factory();})(()=>{
  function create({softLimit=65536,hardLimit=524288,closeCode=4008,maxPending=4,onSent=()=>{}}={}){
    const pending=new Map();let coalesced=0,closed=0;
    const congested=socket=>!!socket&&socket.bufferedAmount>=softLimit;
    function send(socket,value,{key='',scope='',replaceable=false}={}){
      if(!socket||socket.readyState!==1)return 'offline';
      if(socket.bufferedAmount>=hardLimit){pending.clear();closed++;socket.close(closeCode,'Send queue full');return 'closed';}
      if(replaceable&&congested(socket)){pending.set(key,{value,scope});while(pending.size>maxPending)pending.delete(pending.keys().next().value);coalesced++;return 'coalesced';}
      // Never flush a snapshot older than a subsequently sent event/frame.
      pending.delete(key);
      try{socket.send(JSON.stringify(value));onSent(value);return 'sent';}catch{pending.clear();closed++;try{socket.close(closeCode,'Send failed');}catch{}return 'closed';}
    }
    function drain(socket,valid=()=>true){
      if(!socket||socket.readyState!==1){pending.clear();return;}
      for(const [key,row]of pending){
        if(!valid(row.value,key,row.scope)){pending.delete(key);continue;}
        if(congested(socket))break;
        pending.delete(key);send(socket,row.value,{key,scope:row.scope,replaceable:true});
      }
    }
    return {send,drain,congested,clear:()=>pending.clear(),stats:()=>({pending:pending.size,coalesced,closed})};
  }
  return {create};
});
