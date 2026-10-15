/* Offline source rollback rehearsal. Never opens a production NAS data path. */
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),assert=require('node:assert/strict');
const {execFileSync,spawnSync}=require('node:child_process');
const ROOT=path.resolve(__dirname,'..'),OUT=path.join(ROOT,'artifacts/controller-hotfix'),BASE='b5e6fa8c6dd418e1fc52def53d36070c5e418ae5';
const bash='C:/Program Files/Git/bin/bash.exe',hash=p=>crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex');
const tests=['nas-backend','nas-rewards','coop-rift','relay-health','community-features','playability','gamepad','interaction'].map(n=>'tests/'+n+'.test.cjs');
const archivePaths=['js','server','tests','deploy','dev.html','index.html','package.json','css','docs','tools','zh','pokedex'];
const lines=['BRANCH: main','BASE: '+BASE,'CHANGED FIELDS: unified controller select portal / click toggle / linear navigation; readable upgrade cards; native dual-rumble and pulse fallback / status / test; accounts and saves unchanged'];
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
 const shell=`#!/usr/bin/env bash\nset -euo pipefail\nROOT="$(cd "$(dirname "$0")/../.." && pwd -P)"\nTARGET="$(cd "$1" && pwd -P)"\ntest "$TARGET" = "$ROOT/artifacts/controller-hotfix/rollback-fixture"\ntest -f "$TARGET/.rollback-fixture"\ngit -C "$ROOT" archive ${BASE} ${archivePaths.join(' ')} | tar -x -C "$TARGET"\necho 'PASS ROLLBACK: original 0.6.0 source restored on isolated copy; main checkout unchanged'\n`;
 fs.writeFileSync(path.join(OUT,'ROLLBACK.sh'),shell,{mode:0o755});execFileSync(bash,['-c','chmod +x "$1" && test -x "$1"','_',path.join(OUT,'ROLLBACK.sh').replaceAll('\\','/')]);
 lines.push('ORIGINAL SHA256: '+original,'MODIFIED SHA256: '+modified,...['MODIFIED_FILE.js','DIFF_FILE.patch','VERIFICATION.txt','ROLLBACK.sh'].map(n=>n+': '+path.join(OUT,n)));report();
 assert.match(run('BASELINE',process.execPath,['--test',...tests],baseline),/pass 45/);console.log('PASS BASELINE: 45 passed, 0 failed; exit=0');
 assert.match(run('MODIFIED',process.execPath,['--test',...tests,'tests/haptics.test.cjs']),/pass 51/);console.log('PASS MODIFIED: 51 passed, 0 failed; exit=0');
 // Place current source on another copy, seed real SQLite data, restore only code.
 for(const name of ['js','server','css'])fs.cpSync(path.join(ROOT,name),path.join(rollback,name),{recursive:true});
 fs.writeFileSync(path.join(rollback,'.rollback-fixture'),'isolated source rollback only\n');
 const data=path.join(rollback,'transaction-data');fs.mkdirSync(data,{recursive:true});const dbfile=path.join(data,'save-'+Date.now()+'.sqlite');
 const current=require('../server/store.cjs').createStore(dbfile),user=await current.credentials('RollbackPlayer','rollback-password',true);
 const seed={coins:73,owned:{1:{}},shiny:{},partner:1,pupg:{1:{hp:1}},pspent:{1:{hp:[60]}},stats:{runs:1},tickets:{t1:9,t10:1,fragments:30},profile:{favs:[],title:''},ach:{},legends:{}};
 const saved=current.putSave(user,seed,0);current.nickname(user,'回滚测试');current.close();
 run('ROLLBACK',bash,[path.join(OUT,'ROLLBACK.sh').replaceAll('\\','/'),rollback.replaceAll('\\','/')]);assert.equal(hash(path.join(rollback,'js/core/gamepad.js')),original);assert.ok(fs.readFileSync(path.join(rollback,'js/core/gamepad.js'),'utf8').includes("if(editing){const changed="));assert.ok(fs.readFileSync(path.join(rollback,'js/core/select-popup.js'),'utf8').includes('function open(s){close();'));
 assert.match(run('RESTORED_TEST',process.execPath,['--test',...tests],rollback),/pass 45/);
 const old=require(path.join(rollback,'server/store.cjs')).createStore(dbfile);assert.equal((await old.credentials('RollbackPlayer','rollback-password')).id,user.id);assert.deepEqual(old.getSave(user.id),saved);assert.equal(old.getUser(user.id).nick,'回滚测试');assert.equal(old.db.prepare('SELECT COUNT(*) AS n FROM reward_receipts WHERE uid=?').get(user.id).n,1);old.close();
 const oldUpgrades=require(path.join(rollback,'js/data/upgrades.js'));assert.equal(oldUpgrades.refundable(saved.save),30);assert.equal(require('../js/data/upgrades.js').refundable(saved.save),30);assert.equal(hash(path.join(ROOT,'js/core/gamepad.js')),modified);
 console.log('PASS ROLLBACK: 45 passed, 0 failed; login/save/gift preserved; main modified; exit=0');
 lines.push('RESTORED BEHAVIOR: original 0.6.0 inline select preview and playEffect-only haptics restored; 50% refund unchanged; account password/UID, exact save/revision, pspent, nickname and gift receipt preserved. Main remains modified 0.6.1.',
 'OBSERVED RESULT: PASS BASELINE: 45 passed, 0 failed; exit=0','OBSERVED RESULT: PASS MODIFIED: 51 passed, 0 failed; exit=0','OBSERVED RESULT: PASS ROLLBACK: 45 passed, 0 failed; login/save/gift preserved; main modified; exit=0');
 for(const [name,expected]of [['BROWSER.log','PASS CONTROLLER_HOTFIX_BROWSER: 18 checks'],['GAMEPAD.log','PASS GAMEPAD_BROWSER: 36 checks'],['INTERACTION.log','PASS INTERACTION_BROWSER: 44 checks'],['PRODUCTION.log','PASS NAS_PRODUCTION: 31 checks'],['LOCAL.log','pass 14'],['REPRODUCIBLE.log','PASS REPRODUCIBLE'],['UPDATE_SCRIPT.log','PASS update script: health']]){const value=fs.readFileSync(path.join(OUT,name),'utf8');assert.ok(value.includes(expected),name);lines.push(name+' CONTENT:\n'+value);}
 for(const name of ['RED.log','FONT.log'])lines.push(name+' CONTENT:\n'+fs.readFileSync(path.join(OUT,name),'utf8'));
 lines.push('HARDWARE: Gamepad API input and actuator calls simulated in real Chromium. Physical motor strength and wireless reconnect not accepted as tested.');report();
 for(const n of ['MODIFIED_FILE.js','DIFF_FILE.patch','VERIFICATION.txt','ROLLBACK.sh']){const bytes=fs.readFileSync(path.join(OUT,n));assert.ok(bytes.length);console.log('REOPEN '+n+' '+bytes.length+' bytes SHA256='+hash(path.join(OUT,n)));}
})().catch(e=>{lines.push('FAILED: '+e.stack);report();console.error(e);process.exitCode=1;});
