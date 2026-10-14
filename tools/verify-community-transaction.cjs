/* Reproducible baseline/modified/isolated rollback evidence. Never touches NAS data. */
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),vm=require('node:vm');
const {execFileSync,spawnSync}=require('node:child_process'),assert=require('node:assert/strict');
const ROOT=path.resolve(__dirname,'..'),OUT=path.join(ROOT,'artifacts/community-update');
const BASE='5c4046225600167df722cab344907bc766a32484';
const tests=['tests/nas-backend.test.cjs','tests/nas-rewards.test.cjs','tests/coop-rift.test.cjs','tests/relay-health.test.cjs'];
const bash=process.env.BASH||'C:/Program Files/Git/bin/bash.exe';
const hash=p=>crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex');
const lines=[];const record=()=>fs.writeFileSync(path.join(OUT,'VERIFICATION.txt'),lines.join('\n')+'\n');
function run(label,command,args,cwd=ROOT){const r=spawnSync(command,args,{cwd,encoding:'utf8',maxBuffer:32*1024*1024});
  lines.push(label+' COMMAND: '+command+' '+args.join(' '),label+' INPUT: cwd='+cwd+'; test-local accounts only; no production NAS access',label+' STDOUT:\n'+r.stdout,label+' STDERR:\n'+r.stderr,label+' EXIT: '+r.status);record();assert.equal(r.status,0,label);return r.stdout;
}
function extract(target){fs.mkdirSync(target,{recursive:true});execFileSync(process.env.PYTHON||'python',['-c','import zipfile,sys; zipfile.ZipFile(sys.argv[1]).extractall(sys.argv[2])',path.join(OUT,'BASELINE.zip'),target]);}
(async()=>{
  fs.mkdirSync(OUT,{recursive:true});if(!fs.existsSync(path.join(OUT,'BASELINE.zip')))execFileSync('git',['archive',BASE,'-o',path.join(OUT,'BASELINE.zip')],{cwd:ROOT});
  const baseline=path.join(OUT,'baseline-fixture'),rollback=path.join(OUT,'rollback-fixture');extract(baseline);extract(rollback);
  fs.copyFileSync(path.join(baseline,'js/net/nas.js'),path.join(OUT,'BASELINE_FILE.js'));
  fs.copyFileSync(path.join(ROOT,'js/net/nas.js'),path.join(OUT,'MODIFIED_FILE.js'));
  fs.writeFileSync(path.join(OUT,'DIFF_FILE.patch'),execFileSync('git',['diff','--binary',BASE],{cwd:ROOT,maxBuffer:32*1024*1024}));
  const rollbackSh=`#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../.." && pwd -P)"
TARGET="$(cd "$1" && pwd -P)"
test "$TARGET" = "$ROOT/artifacts/community-update/rollback-fixture"
test -f "$TARGET/.rollback-fixture"
git -C "$ROOT" archive ${BASE} | tar -x -C "$TARGET"
echo 'PASS ROLLBACK: original source restored on isolated copy; main checkout unchanged'
`;
  fs.writeFileSync(path.join(OUT,'ROLLBACK.sh'),rollbackSh,{mode:0o755});execFileSync(bash,['-c','chmod +x "$1" && test -x "$1"','_',path.join(OUT,'ROLLBACK.sh').replaceAll('\\','/')]);
  const original=hash(path.join(OUT,'BASELINE_FILE.js')),modified=hash(path.join(ROOT,'js/net/nas.js'));
  lines.push('BRANCH: main','BASE COMMIT: '+BASE,'CHANGED FIELDS: authenticated room-scoped WebRTC / relay fallback, event ACK/sequence, 30s room grace, runtime client identity, users.nick (schema 3), tickets.fragments and unique five-star pool, team markers and multi-helper revival, ranking online[] and UID friend request',
    'ORIGINAL SHA256: '+original,'MODIFIED SHA256: '+modified,...['MODIFIED_FILE.js','DIFF_FILE.patch','VERIFICATION.txt','ROLLBACK.sh'].map(n=>n+': '+path.join(OUT,n)));record();
  const before=run('BASELINE',process.execPath,['--test',...tests],baseline);assert.match(before,/pass 19/);console.log('PASS BASELINE: 19 passed, 0 failed; exit=0');
  const after=run('MODIFIED',process.execPath,['--test',...tests,'tests/community-features.test.cjs']);assert.match(after,/pass 28/);console.log('PASS MODIFIED: 28 passed, 0 failed; exit=0');
  // Start an isolated copy with the actually modified files and a schema-3 save.
  for(const f of ['server/app.cjs','server/store.cjs','js/net/nas.js','js/net/direct-link.js','js/systems/gacha.js','dev.html'])fs.copyFileSync(path.join(ROOT,f),path.join(rollback,f));
  fs.writeFileSync(path.join(rollback,'.rollback-fixture'),'isolated test only\n');
  const data=path.join(rollback,'transaction-data');fs.mkdirSync(data,{recursive:true});const file=path.join(data,'pokesurvivor.sqlite');
  // Use a fresh database per run without deleting previous fixtures.
  const dbfile=file+'.'+Date.now();const {createStore}=require('../server/store.cjs');const current=createStore(dbfile);const user=await current.credentials('RollbackPlayer','rollback-password',true);
  const seed={coins:73,owned:{1:{}},shiny:{},partner:1,pupg:{},stats:{runs:1},tickets:{t1:9,t10:1,fragments:30},profile:{favs:[],title:''},ach:{},legends:{}};
  const saved=current.putSave(user,seed,0);current.nickname(user,'回滚测试');current.close();
  run('ROLLBACK',bash,[path.join(OUT,'ROLLBACK.sh').replaceAll('\\','/'),rollback.replaceAll('\\','/')]);assert.equal(hash(path.join(rollback,'js/net/nas.js')),original);
  const restored=run('RESTORED_TEST',process.execPath,['--test',...tests],rollback);assert.match(restored,/pass 19/);
  const old=require(path.join(rollback,'server/store.cjs')).createStore(dbfile);assert.equal((await old.credentials('RollbackPlayer','rollback-password')).id,user.id);assert.deepEqual(old.getSave(user.id),saved);assert.equal(old.db.prepare('SELECT nick FROM users WHERE id=?').get(user.id).nick,'回滚测试');assert.equal(old.db.prepare('SELECT COUNT(*) AS n FROM reward_receipts WHERE uid=?').get(user.id).n,1);old.close();
  const G={DEX:[{dex:1,gen:1,rarity:1}],SPRITE_META:{1:{}},Sprites:{hasShiny:()=>false},U:{pick:a=>a[0]}};vm.runInNewContext(fs.readFileSync(path.join(rollback,'js/systems/gacha.js'),'utf8'),{G,Math:Object.assign(Object.create(Math),{random:()=>0}),Date});const sample={coins:73,owned:{1:{}},shiny:{},stats:{},tickets:{t1:9,t10:1}};assert.equal(G.Gacha.pull(sample,1)[0].refund,15);assert.equal(sample.coins,88);assert.equal(sample.tickets.t1,8);
  assert.equal(hash(path.join(ROOT,'js/net/nas.js')),modified);console.log('PASS ROLLBACK: 19 passed, 0 failed; login/save/gift preserved; main modified; exit=0');
  lines.push('RESTORED BEHAVIOR: NAS-only original adapter hash; original duplicate compensation gives +15 coins, not fragments. Isolated schema-3 account authenticates with original password/UID, identical save/revision/wallet/tickets/gift receipt; nickname column remains present.',
    'MAIN STATUS: changed 0.3.0 source retained; no production accounts, saves or NAS containers modified.',
    'OBSERVED RESULT: PASS BASELINE: 19 passed, 0 failed; exit=0', 'OBSERVED RESULT: PASS MODIFIED: 28 passed, 0 failed; exit=0', 'OBSERVED RESULT: PASS ROLLBACK: 19 passed, 0 failed; login/save/gift preserved; main modified; exit=0');
  for(const [n,expected]of [['MODIFIED-browser-final.log','PASS COMMUNITY_BROWSER: 22 checks; errors=0'],['MODIFIED-regression-final.log','PASS NAS_BROWSER: 33 checks'],['PRODUCTION-final.log','PASS NAS_PRODUCTION: 19 checks'],['LOCAL.log','pass 14'],['REPRODUCIBLE.log','PASS REPRODUCIBLE']]){const text=fs.readFileSync(path.join(OUT,n),'utf8');assert.ok(text.includes(expected),n);lines.push(n+' CONTENT:\n'+text);}
  for(const n of ['UPDATE_SCRIPT.log','BUILD-final.log','FONT-final.log'])lines.push(n+' CONTENT:\n'+fs.readFileSync(path.join(OUT,n),'utf8'));
  record();for(const n of ['MODIFIED_FILE.js','DIFF_FILE.patch','VERIFICATION.txt','ROLLBACK.sh']){const bytes=fs.readFileSync(path.join(OUT,n));assert.ok(bytes.length);console.log('REOPEN '+n+' '+bytes.length+' bytes '+hash(path.join(OUT,n)));}
})().catch(e=>{lines.push('FAILED: '+e.stack);record();console.error(e);process.exitCode=1;});
