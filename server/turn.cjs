/* NAS credential broker only: Cloudflare carries TURN datagrams, never this server.
 * Analytics failure, malformed usage and quota exhaustion all fail closed. */
const {createHash}=require('node:crypto');
const fault=code=>Object.assign(Error(code),{code});
function createTurn({keyId='',apiToken='',accountId='',analyticsToken='',capGB=100,otherUsageGB=0,fetcher=fetch,clock=()=>Date.now()}={}){
  const configured=!!(keyId&&apiToken&&accountId&&analyticsToken),valid=/^[a-f0-9]{32}$/i.test(keyId)&&/^[a-f0-9]{32}$/i.test(accountId)&&Number.isFinite(+capGB)&&+capGB>0&&+capGB<=900&&Number.isFinite(+otherUsageGB)&&+otherUsageGB>=0;
  const leases=new Map();let usage=null,checking=null;const TTL=10800;
  async function request(url,token,body){try{const r=await fetcher(url,{method:'POST',headers:{Authorization:'Bearer '+token,'content-type':'application/json'},body:JSON.stringify(body),signal:AbortSignal.timeout(3000)});if(!r.ok)throw fault('turn-provider-unavailable');const data=await r.json();if(data.errors?.length)throw fault('turn-usage-unavailable');return data;}catch(e){throw fault(e.code?.startsWith('turn-')?e.code:'turn-provider-unavailable');}}
  async function budget(){
    if(!configured||!valid)throw fault('turn-not-configured');const month=new Date(clock()).toISOString().slice(0,7);if(usage?.month===month&&clock()-usage.at<30000)return usage;if(checking)return checking;
    checking=(async()=>{try{const today=new Date(clock()).toISOString().slice(0,10),query=`{ viewer { accounts(filter: { accountTag: "${accountId}" }) { callsTurnUsageAdaptiveGroups(limit: 1, filter: { date_geq: "${month}-01", date_leq: "${today}" }) { sum { egressBytes } } } } }`;
      const data=await request('https://api.cloudflare.com/client/v4/graphql',analyticsToken,{query}),accounts=data.data?.viewer?.accounts;if(!Array.isArray(accounts)||accounts.length!==1)throw fault('turn-usage-unavailable');const rows=accounts[0].callsTurnUsageAdaptiveGroups;if(!Array.isArray(rows)||rows.length>1)throw fault('turn-usage-unavailable');let bytes=0;for(const row of rows){const n=row?.sum?.egressBytes;if(!Number.isFinite(n)||n<0)throw fault('turn-usage-unavailable');bytes+=n;}usage={at:clock(),month,usedGB:bytes/1e9+ +otherUsageGB,capGB:+capGB};return usage;
    }catch{usage=null;throw fault('turn-usage-unavailable');}finally{checking=null;}})();return checking;
  }
  async function credentials(uid,room,{refresh=false}={}){const b=await budget();if(b.usedGB>=b.capGB)throw fault('turn-budget-exhausted');if(leases.size>=2048&&!leases.has(uid+':'+room)){prune();if(leases.size>=2048)throw fault('turn-provider-unavailable');}const key=uid+':'+room,old=leases.get(key);if(!refresh&&old?.value&&old.expiresAt-clock()>7500000)return old.value;if(!refresh&&old?.pending)return old.pending;
    const pending=(async()=>{const data=await request(`https://rtc.live.cloudflare.com/v1/turn/keys/${keyId}/credentials/generate-ice-servers`,apiToken,{ttl:TTL,customIdentifier:createHash('sha256').update(room+':'+uid).digest('hex').slice(0,24)});const ice=[];
      for(const s of Array.isArray(data.iceServers)?data.iceServers:[]){const urls=(Array.isArray(s.urls)?s.urls:[s.urls]).filter(u=>typeof u==='string'&&/^(?:turn|turns):turn\.cloudflare\.com:(3478|443|80|5349)\?transport=(udp|tcp)$/.test(u));if(urls.length&&typeof s.username==='string'&&s.username.length<2048&&typeof s.credential==='string'&&s.credential.length<4096)ice.push({urls,username:s.username,credential:s.credential});}
      if(!ice.length)throw fault('turn-provider-unavailable');const expiresAt=clock()+TTL*1000,value={iceServers:ice,expiresAt,provider:'cloudflare',budget:{usedGB:b.usedGB,capGB:b.capGB}};leases.set(key,{value,expiresAt});return value;})();leases.set(key,{pending,expiresAt:clock()+TTL*1000});try{return await pending;}catch(e){leases.delete(key);throw e;}
  }
  function prune(){for(const[k,l]of leases)if(l.expiresAt<clock())leases.delete(k);}
  return {credentials,prune,status:()=>({configured:configured&&valid,provider:'cloudflare',guard:'fail-closed',capGB:+capGB||100})};
}
function fromEnv(env=process.env){return createTurn({keyId:env.CF_TURN_KEY_ID,apiToken:env.CF_TURN_KEY_API_TOKEN,accountId:env.CF_ACCOUNT_ID,analyticsToken:env.CF_ANALYTICS_TOKEN,capGB:env.CF_TURN_CAP_GB===undefined?100:Number(env.CF_TURN_CAP_GB),otherUsageGB:env.CF_TURN_OTHER_USAGE_GB===undefined?0:Number(env.CF_TURN_OTHER_USAGE_GB)});}
module.exports={createTurn,fromEnv};
