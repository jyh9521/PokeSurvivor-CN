/* Offline source rollback rehearsal. Never opens a production NAS data path. */
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),assert=require('node:assert/strict');
const {execFileSync,spawnSync}=require('node:child_process');
const ROOT=path.resolve(__dirname,'..'),OUT=path.join(ROOT,'artifacts/interaction'),BASE='c819ce24bc7af427fd24f5b4eb6db4e36d98c7de';
const bash='C:/Program Files/Git/bin/bash.exe',hash=p=>crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex');
const tests=['nas-backend','nas-rewards','coop-rift','relay-health','community-features','playability','gamepad'].map(n=>'tests/'+n+'.test.cjs');
const archivePaths=['js','server','tests','deploy','dev.html','index.html','package.json','css','docs','tools','zh','pokedex'];
const lines=['BRANCH: main','BASE: '+BASE,'CHANGED FIELDS: UI layer ownership and restore; device hints, rumble and reroll; claim-all; select portal; pspent and 50% refund; ring / Y-sorted occlusion'];
const report=()=>fs.writeFileSync(path.join(OUT,'VERIFICATION.txt'),lines.join('\n')+'\n');
function run(label,cmd,args,cwd=ROOT,expected=0){const r=spawnSync(cmd,args,{cwd,encoding:'utf8',maxBuffer:32*1024*1024});lines.push(label+' COMMAND: '+cmd+' '+args.join(' '),label+' INPUT: cwd='+cwd+'; isolated test accounts only',label+' LITERAL OUTPUT:\n'+r.stdout+'\n'+r.stderr,label+' EXIT: '+r.status);report();assert.equal(r.status,expected,label);return r.stdout;}
(async()=>{
 fs.mkdirSync(OUT,{recursive:true});const zip=path.join(OUT,'BASELINE.zip');execFileSync('git',['archive',BASE,'-o',zip,...archivePaths],{cwd:ROOT});
 const baseline=path.join(OUT,'baseline-fixture'),rollback=path.join(OUT,'rollback-fixture');
 for(const target of [baseline,rollback]){fs.mkdirSync(target,{recursive:true});execFileSync('python',['-c','import zipfile,sys;zipfile.ZipFile(sys.argv[1]).extractall(sys.argv[2])',zip,target]);}
 fs.copyFileSync(path.join(baseline,'js/core/gamepad.js'),path.join(OUT,'BASELINE_FILE.js'));
 fs.copyFileSync(path.join(ROOT,'js/core/gamepad.js'),path.join(OUT,'MODIFIED_FILE.js'));
 fs.writeFileSync(path.join(OUT,'DIFF_FILE.patch'),execFileSync('git',['diff','--binary',BASE],{cwd:ROOT,maxBuffer:32*1024*1024}));
 const original=hash(path.join(OUT,'BASELINE_FILE.js')),modified=hash(path.join(OUT,'MODIFIED_FILE.js'));
 const shell=`#!/usr/bin/env bash\nset -euo pipefail\nROOT="$(cd "$(dirname "$0")/../.." && pwd -P)"\nTARGET="$(cd "$1" && pwd -P)"\ntest "$TARGET" = "$ROOT/artifacts/interaction/rollback-fixture"\ntest -f "$TARGET/.rollback-fixture"\ngit -C "$ROOT" archive ${BASE} ${archivePaths.join(' ')} | tar -x -C "$TARGET"\necho 'PASS ROLLBACK: original 0.5.0 source restored on isolated copy; main checkout unchanged'\n`;
 fs.writeFileSync(path.join(OUT,'ROLLBACK.sh'),shell,{mode:0o755});execFileSync(bash,['-c','chmod +x "$1" && test -x "$1"','_',path.join(OUT,'ROLLBACK.sh').replaceAll('\\','/')]);
 lines.push('ORIGINAL SHA256: '+original,'MODIFIED SHA256: '+modified,...['MODIFIED_FILE.js','DIFF_FILE.patch','VERIFICATION.txt','ROLLBACK.sh'].map(n=>n+': '+path.join(OUT,n)));report();
 assert.match(run('BASELINE',process.execPath,['--test',...tests],baseline),/pass 38/);console.log('PASS BASELINE: 38 passed, 0 failed; exit=0');
 assert.match(run('MODIFIED',process.execPath,['--test',...tests,'tests/interaction.test.cjs']),/pass 45/);console.log('PASS MODIFIED: 45 passed, 0 failed; exit=0');
 // Place current source on another copy, seed real SQLite data, restore only code.
 for(const name of ['js','server'])fs.cpSync(path.join(ROOT,name),path.join(rollback,name),{recursive:true});
 fs.writeFileSync(path.join(rollback,'.rollback-fixture'),'isolated source rollback only\n');
 const data=path.join(rollback,'transaction-data');fs.mkdirSync(data,{recursive:true});const dbfile=path.join(data,'save-'+Date.now()+'.sqlite');
 const current=require('../server/store.cjs').createStore(dbfile),user=await current.credentials('RollbackPlayer','rollback-password',true);
 const seed={coins:73,owned:{1:{}},shiny:{},partner:1,pupg:{1:{hp:1}},pspent:{1:{hp:[60]}},stats:{runs:1},tickets:{t1:9,t10:1,fragments:30},profile:{favs:[],title:''},ach:{},legends:{}};
 const saved=current.putSave(user,seed,0);current.nickname(user,'回滚测试');current.close();
 run('ROLLBACK',bash,[path.join(OUT,'ROLLBACK.sh').replaceAll('\\','/'),rollback.replaceAll('\\','/')]);assert.equal(hash(path.join(rollback,'js/core/gamepad.js')),original);
 assert.match(run('RESTORED_TEST',process.execPath,['--test',...tests],rollback),/pass 38/);
 const old=require(path.join(rollback,'server/store.cjs')).createStore(dbfile);assert.equal((await old.credentials('RollbackPlayer','rollback-password')).id,user.id);assert.deepEqual(old.getSave(user.id),saved);assert.equal(old.getUser(user.id).nick,'回滚测试');assert.equal(old.db.prepare('SELECT COUNT(*) AS n FROM reward_receipts WHERE uid=?').get(user.id).n,1);old.close();
 const oldUpgrades=require(path.join(rollback,'js/data/upgrades.js'));assert.equal(oldUpgrades.refundable(saved.save),60);assert.equal(require('../js/data/upgrades.js').refundable(saved.save),30);assert.equal(hash(path.join(ROOT,'js/core/gamepad.js')),modified);
 console.log('PASS ROLLBACK: 38 passed, 0 failed; login/save/gift preserved; main modified; exit=0');
 lines.push('RESTORED BEHAVIOR: original 0.5.0 input and full-cost refund (60 vs modified 30) restored; account password/UID, exact save/revision, pspent, nickname and gift receipt preserved. Main remains modified 0.6.0.',
 'OBSERVED RESULT: PASS BASELINE: 38 passed, 0 failed; exit=0','OBSERVED RESULT: PASS MODIFIED: 45 passed, 0 failed; exit=0','OBSERVED RESULT: PASS ROLLBACK: 38 passed, 0 failed; login/save/gift preserved; main modified; exit=0');
 for(const name of ['browser.log','gamepad.log','PLAYABILITY.log','NAS-REGRESSION.log','PRODUCTION.log','LOCAL.log','REPRODUCIBLE.log','UPDATE_SCRIPT.log','FONT.log']){if(fs.existsSync(path.join(OUT,name)))lines.push(name+' CONTENT:\n'+fs.readFileSync(path.join(OUT,name),'utf8'));}
 lines.push('HARDWARE: Gamepad API input and actuator calls simulated in real Chromium. Physical motor strength and wireless reconnect not accepted as tested.');report();
 for(const n of ['MODIFIED_FILE.js','DIFF_FILE.patch','VERIFICATION.txt','ROLLBACK.sh']){const bytes=fs.readFileSync(path.join(OUT,n));assert.ok(bytes.length);console.log('REOPEN '+n+' '+bytes.length+' bytes SHA256='+hash(path.join(OUT,n)));}
})().catch(e=>{lines.push('FAILED: '+e.stack);report();console.error(e);process.exitCode=1;});
