/* Persistent account/save module: optimistic revisions, history, no client clocks. */
const {DatabaseSync}=require('node:sqlite');
const Upgrades=require('../js/data/upgrades.js');
const {CAMPAIGNS}=require('./rewards.cjs');
const MAX_COINS=1e9+CAMPAIGNS.reduce((total,c)=>total+c.coins,0);
const {randomBytes,scrypt:rawScrypt,timingSafeEqual,createHash}=require('node:crypto');
const {promisify}=require('node:util');
const scrypt=promisify(rawScrypt),digest=s=>createHash('sha256').update(s).digest('hex');
function error(status,message,extra={}) { return Object.assign(Error(message),{status,...extra}); }
function validateSave(value,name) {
  if(!value || typeof value!=='object' || Array.isArray(value))throw error(400,'Invalid save');
  const s=JSON.parse(JSON.stringify(value));
  function scan(v,depth=0){if(depth>30)throw error(400,'Save nesting too deep');if(v&&typeof v==='object')for(const [k,x]of Object.entries(v)){if(['__proto__','constructor','prototype'].includes(k))throw error(400,'Invalid save key');scan(x,depth+1);}}
  scan(s);
  if(Buffer.byteLength(JSON.stringify(s))>512*1024)throw error(413,'Save too large');
  for(const key of ['coins'])if(!Number.isSafeInteger(s[key]) || s[key]<0 || s[key]>MAX_COINS)throw error(400,'Invalid '+key);
  for(const key of ['owned','shiny','pupg','stats','tickets'])if(!s[key] || typeof s[key]!=='object' || Array.isArray(s[key]))throw error(400,'Invalid '+key);
  for(const value of Object.values(s.stats))if(typeof value!=='number'||!Number.isFinite(value)||value<0||value>1e12)throw error(400,'Invalid stats');
  for(const [dex,levels]of Object.entries(s.pupg)){if(!s.owned[dex]||!levels||typeof levels!=='object'||Array.isArray(levels))throw error(400,'Invalid upgrades');for(const[id,n]of Object.entries(levels))if(!Number.isSafeInteger(n)||n<0||n>(Upgrades.BY[id]?.max||1000))throw error(400,'Invalid upgrade level');}
  if(s.pspent!==undefined){
    if(!s.pspent||typeof s.pspent!=='object'||Array.isArray(s.pspent))throw error(400,'Invalid upgrade spending');
    for(const [dex,ledger]of Object.entries(s.pspent)){
      if(!s.owned[dex]||!ledger||typeof ledger!=='object'||Array.isArray(ledger))throw error(400,'Invalid upgrade spending');
      for(const [id,prices]of Object.entries(ledger))if(!Upgrades.BY[id]||!Array.isArray(prices)||prices.length>(s.pupg[dex]?.[id]||0)||prices.some(p=>!Number.isSafeInteger(p)||p<0||p>1000000))throw error(400,'Invalid upgrade spending');
    }
  }
  s.profile ||= {favs:[],title:''};s.ach ||= {};s.legends ||= {};
  if(typeof s.profile!=='object'||Array.isArray(s.profile)||!Array.isArray(s.profile.favs)||s.profile.favs.length>3||typeof s.profile.title!=='string'||s.profile.title.length>128)throw error(400,'Invalid profile');
  for(const f of s.profile.favs)if(!f||!Number.isSafeInteger(f.dex)||f.dex<1||f.dex>1100||typeof f.shiny!=='boolean')throw error(400,'Invalid favorite');
  for(const key of ['ach','legends'])if(typeof s[key]!=='object'||Array.isArray(s[key]))throw error(400,'Invalid '+key);
  for(const key of ['t1','t10'])if(!Number.isSafeInteger(s.tickets[key])||s.tickets[key]<0||s.tickets[key]>1e8)throw error(400,'Invalid tickets');
  if(s.tickets.fragments!==undefined&&(!Number.isSafeInteger(s.tickets.fragments)||s.tickets.fragments<0||s.tickets.fragments>=100))throw error(400,'Invalid ticket fragments');
  for(const col of ['owned','shiny'])for(const key of Object.keys(s[col]))if(!/^\d{1,4}$/.test(key)||+key<1||+key>1100)throw error(400,'Invalid species');
  if(s.partner!=null && !s.owned[s.partner])throw error(400,'Partner not owned');
  s.name=name;s.updated=Date.now();return s;
}
function createStore(file,{campaigns=CAMPAIGNS}={}) {
  const db=new DatabaseSync(file);db.exec(`PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON; PRAGMA busy_timeout=5000;
    CREATE TABLE IF NOT EXISTS users(id TEXT PRIMARY KEY,name TEXT NOT NULL COLLATE NOCASE UNIQUE,lower TEXT NOT NULL UNIQUE,salt TEXT NOT NULL,hash TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS sessions(token TEXT PRIMARY KEY,uid TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,expires INTEGER NOT NULL);
    CREATE TABLE IF NOT EXISTS saves(uid TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,rev INTEGER NOT NULL,data TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS history(uid TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,rev INTEGER NOT NULL,data TEXT NOT NULL,at INTEGER NOT NULL,PRIMARY KEY(uid,rev));
    CREATE TABLE IF NOT EXISTS mutations(uid TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,id TEXT NOT NULL,rev INTEGER NOT NULL,hash TEXT NOT NULL,PRIMARY KEY(uid,id));
    CREATE TABLE IF NOT EXISTS friends(a TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,b TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,requester TEXT NOT NULL,status TEXT NOT NULL,PRIMARY KEY(a,b));
    CREATE TABLE IF NOT EXISTS scores(id TEXT PRIMARY KEY,mode TEXT NOT NULL,at INTEGER NOT NULL,data TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS reports(uid TEXT NOT NULL,score TEXT NOT NULL,at INTEGER NOT NULL,PRIMARY KEY(uid,score));
    CREATE TABLE IF NOT EXISTS reward_receipts(uid TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,campaign TEXT NOT NULL,coins INTEGER NOT NULL,at INTEGER NOT NULL,PRIMARY KEY(uid,campaign));`);
  if(!db.prepare('PRAGMA table_info(users)').all().some(c=>c.name==='lower')){
    db.exec('BEGIN IMMEDIATE');try{db.exec('ALTER TABLE users ADD COLUMN lower TEXT');for(const u of db.prepare('SELECT id,name FROM users').all())db.prepare('UPDATE users SET lower=? WHERE id=?').run(u.name.toLowerCase(),u.id);db.exec('CREATE UNIQUE INDEX users_lower ON users(lower); COMMIT');}catch(e){db.exec('ROLLBACK');db.close();throw e;}
  }
  if(!db.prepare('PRAGMA table_info(users)').all().some(c=>c.name==='nick'))db.exec('ALTER TABLE users ADD COLUMN nick TEXT');
  db.exec('PRAGMA user_version=3');
  const nickKey=v=>v.normalize('NFKC').toLowerCase();
  // Login names remain reserved even when their owner uses a different nickname.
  // Legacy duplicates keep their login, password and save; only the conflicting alias is cleared.
  db.exec('CREATE TABLE IF NOT EXISTS nickname_keys(key TEXT PRIMARY KEY,uid TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE); BEGIN IMMEDIATE');
  try {
    db.exec('DELETE FROM nickname_keys');
    const users=db.prepare('SELECT id,name,nick FROM users ORDER BY rowid').all();
    const claim=db.prepare('INSERT INTO nickname_keys VALUES(?,?)');
    for(const u of users)claim.run(nickKey(u.name),u.id);
    for(const u of users)if(u.nick){const key=nickKey(u.nick),owner=db.prepare('SELECT uid FROM nickname_keys WHERE key=?').get(key);
      if(owner&&owner.uid!==u.id)db.prepare('UPDATE users SET nick=NULL WHERE id=?').run(u.id);
      else if(!owner)claim.run(key,u.id);
    }
    db.exec('COMMIT');
  }catch(e){db.exec('ROLLBACK');db.close();throw e;}
  const getUser=id=>db.prepare('SELECT id,name,nick FROM users WHERE id=?').get(id);
  const getSave=uid=>{const r=db.prepare('SELECT rev,data FROM saves WHERE uid=?').get(uid);return r?{rev:r.rev,save:JSON.parse(r.data)}:{rev:0,save:null};};
  async function credentials(name,password,register=false) {
    name=typeof name==='string'?name.trim():'';
    if(!/^[A-Za-z0-9_ñÑáéíóúÁÉÍÓÚ]{3,16}$/.test(name)||typeof password!=='string'||password.length<8||password.length>64)throw error(400,'账号需 3–16 个字母、数字或下划线；密码需 8–64 个字符。');
    const row=db.prepare('SELECT * FROM users WHERE lower=?').get(name.toLowerCase());
    const salt=register?randomBytes(16).toString('hex'):(row?.salt||'00000000000000000000000000000000');
    const hash=(await scrypt(password,salt,64,{N:16384,r:8,p:1})).toString('hex');
    if(register) {
      if(row)throw error(409,'账号名称已存在。');
      const id=randomBytes(16).toString('hex');
      db.exec('BEGIN IMMEDIATE');
      try{db.prepare('INSERT INTO users(id,name,lower,salt,hash) VALUES(?,?,?,?,?)').run(id,name,name.toLowerCase(),salt,hash);db.prepare('INSERT INTO nickname_keys VALUES(?,?)').run(nickKey(name),id);db.exec('COMMIT');}catch{db.exec('ROLLBACK');throw error(409,'账号名称或公开昵称已存在。');}
      return getUser(id);
    }
    if(!row||!timingSafeEqual(Buffer.from(hash,'hex'),Buffer.from(row.hash,'hex')))throw error(401,'账号或密码错误。');
    return getUser(row.id);
  }
  function session(user) {
    db.prepare('DELETE FROM sessions WHERE expires<?').run(Date.now());
    const token=randomBytes(32).toString('hex');db.prepare('INSERT INTO sessions VALUES(?,?,?)').run(digest(token),user.id,Date.now()+30*86400e3);return token;
  }
  function authenticate(token) { if(!token)return null;return db.prepare('SELECT u.id,u.name,u.nick FROM sessions s JOIN users u ON s.uid=u.id WHERE s.token=? AND s.expires>?').get(digest(token),Date.now())||null; }
  function putSave(user,value,rev,mutation='') {
    if(!Number.isSafeInteger(rev)||rev<0)throw error(400,'Invalid revision');
    if(mutation&&!/^[a-f0-9]{32}$/.test(mutation))throw error(400,'Invalid mutation');
    const inputHash=digest(JSON.stringify(value)),s=validateSave(value,user.name);
    db.exec('BEGIN IMMEDIATE');
    try {
      const old=getSave(user.id),done=mutation&&db.prepare('SELECT rev,hash FROM mutations WHERE uid=? AND id=?').get(user.id,mutation);
      if(done){if(done.hash!==inputHash)throw error(400,'Mutation reused with different save');if(old.rev!==done.rev)throw error(409,'存档版本冲突，请保留并处理两份进度。',{current:old});db.exec('COMMIT');return old;}
      if(old.rev!==rev)throw error(409,'存档版本冲突，请保留并处理两份进度。',{current:old});
      const received=db.prepare('SELECT campaign AS id,coins FROM reward_receipts WHERE uid=? ORDER BY campaign').all(user.id);
      // A stale browser must reconcile the credited gift rather than overwrite it.
      if(received.some(r=>!Array.isArray(s.serverRewards)||!s.serverRewards.some(x=>x?.id===r.id)))throw error(409,'存档版本冲突，请保留并处理两份进度。',{current:old});
      for(const campaign of campaigns){
        if(received.some(r=>r.id===campaign.id))continue;
        if(!Number.isSafeInteger(campaign.coins)||campaign.coins<=0||s.coins+campaign.coins>MAX_COINS)throw error(400,'Invalid reward balance');
        s.coins+=campaign.coins;
        db.prepare('INSERT INTO reward_receipts VALUES(?,?,?,?)').run(user.id,campaign.id,campaign.coins,Date.now());
        received.push({id:campaign.id,coins:campaign.coins});
      }
      // Never accept receipt IDs or amounts invented by the client.
      s.serverRewards=received;const data=JSON.stringify(s);
      if(old.save)db.prepare('INSERT OR REPLACE INTO history VALUES(?,?,?,?)').run(user.id,old.rev,JSON.stringify(old.save),Date.now());
      db.prepare('INSERT INTO saves VALUES(?,?,?) ON CONFLICT(uid) DO UPDATE SET rev=excluded.rev,data=excluded.data').run(user.id,rev+1,data);
      db.prepare('DELETE FROM history WHERE uid=? AND rev NOT IN (SELECT rev FROM history WHERE uid=? ORDER BY rev DESC LIMIT 20)').run(user.id,user.id);
      if(mutation){db.prepare('INSERT INTO mutations VALUES(?,?,?,?)').run(user.id,mutation,rev+1,inputHash);db.prepare('DELETE FROM mutations WHERE uid=? AND id NOT IN (SELECT id FROM mutations WHERE uid=? ORDER BY rev DESC LIMIT 20)').run(user.id,user.id);}
      db.exec('COMMIT');return {rev:rev+1,save:s};
    }catch(e){db.exec('ROLLBACK');throw e;}
  }
  function nickname(user,value){
    const nick=typeof value==='string'?value.trim().normalize('NFKC'):'';
    if(!/^[\p{L}\p{N}_·-]{2,16}$/u.test(nick))throw error(400,'昵称需 2–16 个汉字、字母、数字或 _·-，不能含空格。');
    db.exec('BEGIN IMMEDIATE');try {
      const key=nickKey(nick),owner=db.prepare('SELECT uid FROM nickname_keys WHERE key=?').get(key);
      if(owner&&owner.uid!==user.id)throw error(409,'昵称已被使用，请换一个。');
      db.prepare('DELETE FROM nickname_keys WHERE uid=? AND key<>?').run(user.id,nickKey(getUser(user.id).name));
      db.prepare('INSERT OR IGNORE INTO nickname_keys VALUES(?,?)').run(key,user.id);
      db.prepare('UPDATE users SET nick=? WHERE id=?').run(nick,user.id);db.exec('COMMIT');return getUser(user.id);
    }catch(e){db.exec('ROLLBACK');throw e;}
  }
  const pair=(a,b)=>[a,b].sort();
  function request(user,name,uid) {
    if(!uid&&typeof name!=='string')throw error(400,'Invalid name');
    const other=uid?getUser(uid):db.prepare('SELECT id,name FROM users WHERE lower=?').get(name.trim().toLowerCase());
    if(!other||other.id===user.id)throw error(400,'找不到该玩家，或不能添加自己。');
    const [a,b]=pair(user.id,other.id),old=db.prepare('SELECT * FROM friends WHERE a=? AND b=?').get(a,b);
    if(!old)db.prepare('INSERT INTO friends VALUES(?,?,?,?)').run(a,b,user.id,'pending');
    return other;
  }
  function friendship(user,other,accept) {
    const [a,b]=pair(user.id,other),row=db.prepare('SELECT * FROM friends WHERE a=? AND b=?').get(a,b);
    if(!row)throw error(404,'好友请求不存在。');
    if(accept){if(row.requester===user.id)throw error(403,'不能接受自己发出的请求。');db.prepare('UPDATE friends SET status=? WHERE a=? AND b=?').run('ok',a,b);}
    else db.prepare('DELETE FROM friends WHERE a=? AND b=?').run(a,b);
  }
  const friendRows=uid=>db.prepare('SELECT * FROM friends WHERE a=? OR b=?').all(uid,uid);
  const areFriends=(a,b)=>{const ids=pair(a,b);return db.prepare('SELECT status FROM friends WHERE a=? AND b=?').get(...ids)?.status==='ok';};
  const scores=()=>db.prepare('SELECT id,mode,at,data FROM scores ORDER BY at DESC').all().map(r=>({...JSON.parse(r.data),id:r.id,mode:r.mode,at:r.at}));
  function addScore(mode,row){const id=row.uids.slice().sort().join('_')+':'+mode+':'+Date.now()+':'+randomBytes(4).toString('hex');db.prepare('INSERT INTO scores VALUES(?,?,?,?)').run(id,mode,Date.now(),JSON.stringify(row));return id;}
  // Existing saved accounts are credited on upgrade; empty/new accounts on first save.
  for(const row of db.prepare('SELECT u.id,u.name FROM users u JOIN saves s ON s.uid=u.id').all()){
    if(campaigns.some(c=>!db.prepare('SELECT 1 FROM reward_receipts WHERE uid=? AND campaign=?').get(row.id,c.id))){const old=getSave(row.id);putSave(row,old.save,old.rev);}
  }
  return {db,credentials,session,authenticate,getUser,getSave,putSave,nickname,request,friendship,friendRows,areFriends,scores,addScore,
    logout(token){db.prepare('DELETE FROM sessions WHERE token=?').run(digest(token));},
    history(uid){return db.prepare('SELECT rev,at FROM history WHERE uid=? ORDER BY rev DESC LIMIT 20').all(uid);},
    restore(user,revision,current){const row=db.prepare('SELECT data FROM history WHERE uid=? AND rev=?').get(user.id,revision);if(!row)throw error(404,'历史存档不存在。');return putSave(user,JSON.parse(row.data),current);},
    remove(user){db.prepare('DELETE FROM scores WHERE data LIKE ?').run('%'+user.id+'%');db.prepare('DELETE FROM reports WHERE uid=?').run(user.id);db.prepare('DELETE FROM users WHERE id=?').run(user.id);},
    close(){db.close();},error};
}
module.exports={createStore,validateSave,error};
