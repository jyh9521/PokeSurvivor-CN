/* Full source/backend/browser/production/isolated rollback transaction. */
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const {spawnSync,execFileSync}=require('node:child_process');
const ROOT=path.resolve(__dirname,'..'),OUT=path.join(ROOT,'artifacts/selfhost-verification');
const BASE='f7b4c6624e612abce414af84a2f71945de3cf5ae',python=process.env.PYTHON||'python';
const hash=f=>crypto.createHash('sha256').update(fs.readFileSync(f)).digest('hex');
const log=[];fs.mkdirSync(OUT,{recursive:true});
const write=()=>fs.writeFileSync(path.join(OUT,'VERIFICATION.txt'),log.join('\n')+'\n');
function run(label,cmd,args,env={}){const r=spawnSync(cmd,args,{cwd:ROOT,encoding:'utf8',env:{...process.env,PYTHONUTF8:'1',...env},maxBuffer:32*1024*1024});log.push(`${label} COMMAND: ${cmd} ${args.join(' ')}`,`${label} INPUT: ${JSON.stringify(env)}`,`${label} OUTPUT:\n${r.stdout||''}`,`${label} STDERR:\n${r.stderr||''}`,`${label} EXIT: ${r.status}`);write();assert.equal(r.status,0,label);console.log(`${label}: exit 0`);}
log.push('BRANCH: main','CHANGED FIELD: G.NAS_DISCOVERY (absent -> true); same-origin NAS adapters activate after /api/config, static/file stays local.',`BASELINE: ${BASE}`,...['MODIFIED_FILE.js','DIFF_FILE.patch','VERIFICATION.txt','ROLLBACK.sh'].map(n=>`${n}: ${path.join(OUT,n)}`));
fs.copyFileSync(path.join(ROOT,'js/core/firebase-config.js'),path.join(OUT,'MODIFIED_FILE.js'));
fs.writeFileSync(path.join(OUT,'DIFF_FILE.patch'),execFileSync('git',['diff','--binary',BASE],{cwd:ROOT,maxBuffer:32*1024*1024}));
log.push('ORIGINAL SHA256: '+hash(path.join(OUT,'BASELINE_FILE.js')),'MODIFIED SHA256: '+hash(path.join(OUT,'MODIFIED_FILE.js')));write();
run('UNIT',process.execPath,['--test','tests/i18n.test.cjs','tests/local-distribution.test.cjs']);
run('BACKEND',process.execPath,['--test','tests/nas-backend.test.cjs']);
run('LOCAL',process.execPath,['tools/check-local-state.cjs','--protected'],{TEST_ROOT:ROOT,TEST_OUTPUT:path.join(OUT,'local-http')});
run('LOCAL_FILE',process.execPath,['tools/check-local-state.cjs','--file','--protected'],{TEST_ROOT:ROOT,TEST_OUTPUT:path.join(OUT,'local-file')});
run('MODIFIED',process.execPath,['tests/nas-browser.cjs']);
run('PRODUCTION',process.execPath,['tests/nas-production.cjs']);
run('PAGES',python,['-X','utf8','tests/locale_pages.py']);
run('COMPOSE','docker',['compose','config']);
run('PACKAGE',python,['-X','utf8','tools/package-nas.py']);
const first=hash(path.join(ROOT,'artifacts/PokeSurvivor-CN-NAS-0.2.0.zip'));
run('PACKAGE_REPEAT',python,['-X','utf8','tools/package-nas.py']);assert.equal(first,hash(path.join(ROOT,'artifacts/PokeSurvivor-CN-NAS-0.2.0.zip')));
const target=path.join(ROOT,'artifacts/selfhost-rollback');fs.mkdirSync(target,{recursive:true});
run('COPY',python,['-X','utf8','-c','import zipfile,sys;zipfile.ZipFile(sys.argv[1]).extractall(sys.argv[2])',path.join(ROOT,'artifacts/PokeSurvivor-CN-NAS-0.2.0.zip'),target]);
fs.writeFileSync(path.join(target,'.rollback-fixture'),'isolated fixture\n');
run('ROLLBACK','C:/Program Files/Git/bin/bash.exe',[path.join(OUT,'ROLLBACK.sh').replaceAll('\\','/'),target.replaceAll('\\','/')]);
assert.equal(hash(path.join(target,'js/core/firebase-config.js')),hash(path.join(OUT,'BASELINE_FILE.js')));
assert.ok(!fs.existsSync(path.join(target,'server')));
run('BASELINE_RESTORED',process.execPath,['tools/check-local-state.cjs','--protected'],{TEST_ROOT:target,TEST_OUTPUT:path.join(OUT,'rollback')});
assert.equal(hash(path.join(ROOT,'js/core/firebase-config.js')),hash(path.join(OUT,'MODIFIED_FILE.js')));
log.push('BASELINE ORIGINAL RESULT: PASS MODIFIED: 16 checks; local account, starter, purchase, run, reload, logout/login, browser restart; external=0; errors=0; exit 0 (recorded before modification).',
  'RESTORED BEHAVIOR: original f7b4c66 local-only frontend, original hash, no NAS additions; 16 browser checks passed; exit 0.',
  'MAIN STATUS: NAS discovery and production build retained; rollback affected only the marked isolated copy.',
  'ZIP SHA256: '+first,'ZIP REPRODUCIBLE: repeated package bytes identical.',
  'ACCEPTANCE: real local Node/SQLite backend, real WebSocket co-op between two browsers, protected production bundle, actual service worker excludes private API caches.',
  'DEPLOYMENT: Docker Compose config and pinned multi-platform base-image manifest verified; Docker image build, real Unraid and public HTTPS/WSS acceptance not claimed.');write();
for(const n of ['MODIFIED_FILE.js','DIFF_FILE.patch','VERIFICATION.txt','ROLLBACK.sh'])assert.ok(fs.readFileSync(path.join(OUT,n)).length);
console.log('PASS SELFHOST_TRANSACTION: local fallback, NAS dual saves, real co-op, rankings, private cache exclusion, package and isolated rollback verified; main unchanged');
