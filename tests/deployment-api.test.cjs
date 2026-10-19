const {test}=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const {spawnSync}=require('node:child_process');
const {DatabaseSync}=require('node:sqlite');
const {createApp}=require('../server/app.cjs');
test('health exposes actual release tuple and starts without maintenance',async()=>{
  const dataDir=fs.mkdtempSync(path.join(os.tmpdir(),'deployment-api-'));
  const app=createApp({dataDir});
  try {
    await new Promise(resolve=>app.server.listen(0,'127.0.0.1',resolve));
    const h=await fetch('http://127.0.0.1:'+app.server.address().port+'/api/health').then(r=>r.json());
    assert.deepEqual({version:h.version,protocol:h.protocol,schema:h.schema},require('../server/deployment-version.cjs'));
    assert.equal(h.ok,true);assert.equal(h.draining,false);assert.equal(h.ready,false);
  } finally {await app.close();fs.rmSync(dataDir,{recursive:true,force:true});}
});
test('backup includes committed WAL and refuses to create a missing account database',()=>{
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'deployment-backup-'));
  const source=path.join(dir,'pokesurvivor.sqlite'),dest=path.join(dir,'backup.sqlite');
  let db;
  try {
    const invoke=()=>spawnSync(process.execPath,['server/backup.cjs',dest],{cwd:path.resolve(__dirname,'..'),env:{...process.env,DATA_DIR:dir},encoding:'utf8'});
    assert.notEqual(invoke().status,0);assert.equal(fs.existsSync(source),false);
    db=new DatabaseSync(source);db.exec('PRAGMA journal_mode=WAL; CREATE TABLE proof(value TEXT); INSERT INTO proof VALUES (\'committed\')');
    assert.equal(invoke().status,0);
    const snap=new DatabaseSync(dest,{readOnly:true});
    try {assert.equal(snap.prepare('SELECT value FROM proof').get().value,'committed');assert.equal(snap.prepare('PRAGMA quick_check').get().quick_check,'ok');}finally{snap.close();}
  } finally {if(db)db.close();fs.rmSync(dir,{recursive:true,force:true});}
});
