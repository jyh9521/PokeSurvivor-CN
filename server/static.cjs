/* Public static responses only. The caller owns path confinement and MIME lookup.
 * No cookies, private API bodies or WebSocket packets enter this cache. */
const fs=require('node:fs/promises'),path=require('node:path'),crypto=require('node:crypto');
const zlib=require('node:zlib'),{promisify}=require('node:util');
const gzip=promisify(zlib.gzip),brotli=promisify(zlib.brotliCompress);
function encoding(header,compressible=true){
  const values=new Map();for(const token of String(header||'').split(',')){
    const [name,...params]=token.trim().toLowerCase().split(';');if(!name)continue;
    const qpart=params.find(p=>p.trim().startsWith('q=')),q=qpart?Number(qpart.trim().slice(2)):1;
    values.set(name,Number.isFinite(q)&&q>=0&&q<=1?q:0);
  }
  const q=k=>values.has(k)?values.get(k):values.get('*')||0;
  const best=(compressible?['br','gzip']:[]).filter(k=>q(k)>0).sort((a,b)=>q(b)-q(a))[0];
  if(best&&(!values.has('identity')||values.get('identity')<=q(best)))return best;
  return (values.get('identity')??(values.get('*')===0&&values.has('*')?0:1))>0?'identity':null;
}
function createStatic(){
  const compressed=new Map();let bytes=0;
  async function pack(key,data,codec){
    let entry=compressed.get(key);if(entry){compressed.delete(key);compressed.set(key,entry);return entry.promise;}
    entry={size:0,promise:null};compressed.set(key,entry);
    entry.promise=(codec==='br'?brotli(data,{params:{[zlib.constants.BROTLI_PARAM_QUALITY]:5}}):gzip(data,{level:6})).then(b=>{
      if(compressed.get(key)===entry){entry.size=b.length;bytes+=b.length;while(compressed.size>64||bytes>16*1024*1024){const k=compressed.keys().next().value,old=compressed.get(k);compressed.delete(k);bytes-=old.size;}}
      return b;
    },err=>{if(compressed.get(key)===entry)compressed.delete(key);throw err;});
    return entry.promise;
  }
  return async function serve(req,res,file,type,url){
    const raw=await fs.readFile(file),hash=crypto.createHash('sha1').update(raw).digest('hex');
    const text=/^(text\/|application\/(javascript|json|manifest\+json))/.test(type);
    const codec=encoding(req.headers['accept-encoding'],text);
    if(!codec){res.writeHead(406,{'cache-control':'no-store','vary':'Accept-Encoding'});res.end();return;}
    // Long cache lifetime requires a verified content fingerprint, not any ?v=.
    const versioned=url.searchParams.get('v')===hash.slice(0,10)&&['.js','.css'].includes(path.extname(file));
    const headers={'content-type':type,'cache-control':versioned?'public, max-age=31536000, immutable':'no-cache',
      'etag':'"'+hash+'-'+codec+'"','x-content-type-options':'nosniff'};
    if(text)headers.vary='Accept-Encoding';
    if(codec!=='identity')headers['content-encoding']=codec;
    const tags=String(req.headers['if-none-match']||'').split(',').map(t=>t.trim().replace(/^W\//,''));
    if(tags.includes('*')||tags.includes(headers.etag)){res.writeHead(304,headers);res.end();return;}
    const data=codec==='identity'?raw:await pack(hash+'-'+codec,raw,codec);
    headers['content-length']=data.length;res.writeHead(200,headers);res.end(req.method==='HEAD'?undefined:data);
  };
}
module.exports={createStatic,encoding};
