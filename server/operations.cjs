/* Persistent admin switches. Authorization uses login identity, never nicknames. */
const {randomBytes}=require('node:crypto');
const admin=u=>u?.name?.toLowerCase()==='jyh9521';
function createOperations(db,error){
  db.exec('CREATE TABLE IF NOT EXISTS server_settings(key TEXT PRIMARY KEY,value TEXT NOT NULL)');
  const read=()=>{const r=db.prepare('SELECT value FROM server_settings WHERE key=?').get('operations');return r?JSON.parse(r.value):{draining:false,message:'',emergency:null};};
  function set(user,b){
    if(!admin(user))throw error(403,'仅管理员 jyh9521 可操作。');
    if(!['drain','resume','force'].includes(b.op))throw error(400,'Invalid operation');
    const text=typeof b.message==='string'?b.message.trim():'';
    if([...text].length>200||/[\p{Cc}\p{Cf}]/u.test(text))throw error(400,'公告限 200 字且不能含控制字符。');
    const next=read();next.message=text;
    if(b.op==='force'){
      if(b.confirm!=='jyh9521')throw error(400,'请确认紧急更新会结束当前对局。');
      next.draining=true;next.emergency={id:randomBytes(12).toString('hex'),at:Date.now(),deadline:Date.now()+10000};
    }else{next.draining=b.op==='drain';next.emergency=null;}
    db.prepare('INSERT INTO server_settings VALUES(?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value').run('operations',JSON.stringify(next));return next;
  }
  return {read,set,admin};
}
module.exports={createOperations,admin};
