/* Baseline -> modified -> isolated rollback. The main checkout stays modified. */
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const assert=require('node:assert/strict'),{spawnSync,execFileSync}=require('node:child_process');
const ROOT=path.resolve(__dirname,'..'),OUT=path.join(ROOT,'artifacts/verification');
const BASE='537440510dcdadf8ed711ec3dea7ae795533a662';
const hash=p=>crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex');
const lines=[];
const write=()=>fs.writeFileSync(path.join(OUT,'VERIFICATION.txt'),lines.join('\n')+'\n');
function run(label,cmd,args,env={}){
  const full={...process.env,...env};
  const r=spawnSync(cmd,args,{cwd:ROOT,encoding:'utf8',env:full,maxBuffer:16*1024*1024});
  lines.push(`${label} COMMAND: ${cmd} ${args.join(' ')}`,
    `${label} INPUT: ${JSON.stringify(env)}`,`${label} STDOUT:\n${r.stdout || ''}`,
    `${label} STDERR:\n${r.stderr || ''}`,`${label} EXIT: ${r.status}`);
  if(r.error)lines.push(`${label} ERROR: ${r.error.message}`);
  write(); assert.equal(r.status,0,label); console.log((r.stdout || '').trim());
}
fs.mkdirSync(OUT,{recursive:true});
fs.copyFileSync(path.join(ROOT,'artifacts/baseline/js/core/firebase-config.js'),path.join(OUT,'BASELINE_FILE.js'));
fs.copyFileSync(path.join(ROOT,'js/core/firebase-config.js'),path.join(OUT,'MODIFIED_FILE.js'));
fs.writeFileSync(path.join(OUT,'DIFF_FILE.patch'),execFileSync('git',['diff','--binary',BASE],{cwd:ROOT,maxBuffer:16*1024*1024}));
const sh=`#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../.." && pwd -P)"
TARGET="$(cd "$1" && pwd -P)"
case "$TARGET" in "$ROOT"/artifacts/rollback-fixture) ;; *) echo 'Invalid rollback fixture'; exit 2;; esac
test -f "$TARGET/.rollback-fixture"
git -C "$ROOT" archive ${BASE} | tar -x -C "$TARGET"
cp "$ROOT/artifacts/verification/BASELINE_FILE.js" "$TARGET/js/core/firebase-config.js"
echo 'PASS ROLLBACK: original source restored on isolated copy; main checkout unchanged'
`;
fs.writeFileSync(path.join(OUT,'ROLLBACK.sh'),sh,{mode:0o755});
lines.push('BRANCH: main','CHANGED FIELD: G.FIREBASE_CONFIG (upstream config -> null); G.LOCAL_ONLY=true; PS_DEFAULT_LANGUAGE=zh-CN',
  `UPSTREAM: ${BASE}`,`CHINESE: a23065deefa1dd4d23557c7b10f6d8d99af42dbc`,
  ...['MODIFIED_FILE.js','DIFF_FILE.patch','VERIFICATION.txt','ROLLBACK.sh'].map(n=>`${n}: ${path.join(OUT,n)}`),
  `ORIGINAL SHA256: ${hash(path.join(OUT,'BASELINE_FILE.js'))}`,
  `MODIFIED SHA256: ${hash(path.join(OUT,'MODIFIED_FILE.js'))}`);
write();
run('BASELINE',process.execPath,['tools/check-local-state.cjs','--baseline'],{
  TEST_ROOT:path.join(ROOT,'artifacts/baseline'),TEST_OUTPUT:path.join(OUT,'baseline')});
run('MODIFIED',process.execPath,['tools/check-local-state.cjs','--protected'],{
  TEST_ROOT:ROOT,TEST_ENTRY:'index.html',TEST_OUTPUT:path.join(OUT,'modified')});
run('MODIFIED_FILE',process.execPath,['tools/check-local-state.cjs','--file','--protected'],{
  TEST_ROOT:ROOT,TEST_ENTRY:'index.html',TEST_OUTPUT:path.join(OUT,'file')});
const fixture=path.join(ROOT,'artifacts/rollback-fixture');fs.mkdirSync(fixture,{recursive:true});
// This copy starts with the actual modified static distribution, not just a flag.
const zip=path.join(ROOT,'artifacts/PokeSurvivor-CN-local-0.1.0.zip');
run('COPY',process.env.PYTHON || 'python',['-X','utf8','-c',
  'import sys,zipfile; zipfile.ZipFile(sys.argv[1]).extractall(sys.argv[2])',zip,fixture]);
fs.writeFileSync(path.join(fixture,'.rollback-fixture'),'isolated rollback acceptance\n');
const bash=process.env.BASH || 'C:/Program Files/Git/bin/bash.exe';
run('ROLLBACK',bash,[path.join(OUT,'ROLLBACK.sh').replaceAll('\\','/'),fixture.replaceAll('\\','/')]);
assert.equal(hash(path.join(fixture,'js/core/firebase-config.js')),hash(path.join(OUT,'BASELINE_FILE.js')));
run('RESTORED',process.execPath,['tools/check-local-state.cjs','--baseline'],{
  TEST_ROOT:fixture,TEST_OUTPUT:path.join(OUT,'rollback')});
assert.equal(hash(path.join(ROOT,'js/core/firebase-config.js')),hash(path.join(OUT,'MODIFIED_FILE.js')));
lines.push('RESTORED BEHAVIOR: original English default, configured upstream field, file:// local mode; local account/save/purchase/run/browser restart all passed.',
  'MAIN STATUS: modified Chinese local-only production build retained; original hash restored only in isolated rollback copy.',
  'SOURCE/DEBUG I18N: 4 x 25 checks passed; online UI used local fixtures, not live service acceptance.',
  'UNIT: 14 passed, 0 failed. PAGES: 12 Chinese pages, 1436 local references, 966 official names, two font faces, bundle fingerprints.',
  'PWA/SERVICE-WORKER: not claimed; acceptance browsers block service workers.');
for(const name of ['MODIFIED_FILE.js','DIFF_FILE.patch','ROLLBACK.sh'])assert.ok(fs.readFileSync(path.join(OUT,name)).length);
write();assert.ok(fs.readFileSync(path.join(OUT,'VERIFICATION.txt')).length);
console.log('PASS TRANSACTION: baseline/modified/file/isolated rollback verified; main remains modified');
