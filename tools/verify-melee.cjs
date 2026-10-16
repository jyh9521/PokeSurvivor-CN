/* Reproducible source transaction. Only the marked, exact fixture is rolled back. */
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),assert=require('node:assert/strict'),{execFileSync,spawnSync}=require('node:child_process');
const ROOT=path.resolve(__dirname,'..'),OUT=path.join(ROOT,'artifacts/melee-rebalance');
const BASE='596322ad384e93db73afe94507bc1b1d2f56094f',FIXTURE=path.join(OUT,'rollback-fixture'),BASH=process.env.BASH||(process.platform==='win32'?'C:/Program Files/Git/bin/bash.exe':'/bin/bash');
fs.mkdirSync(OUT,{recursive:true});
const hash=b=>crypto.createHash('sha256').update(b).digest('hex'),git=(...args)=>execFileSync('git',args,{cwd:ROOT,maxBuffer:64*1024*1024});
const original=git('show',BASE+':js/systems/combat.js'),modified=fs.readFileSync(path.join(ROOT,'js/systems/combat.js'));
assert.notEqual(hash(original),hash(modified));
fs.writeFileSync(path.join(OUT,'ORIGINAL_FILE.js'),original);fs.writeFileSync(path.join(OUT,'MODIFIED_FILE.js'),modified);
const diff=git('diff','--binary',BASE);assert.ok(diff.length);fs.writeFileSync(path.join(OUT,'DIFF_FILE.patch'),diff);
const changed=git('diff','--name-only',BASE).toString().trim().split(/\r?\n/).filter(Boolean);
const existed=new Set(git('ls-tree','-r','--name-only',BASE).toString().split(/\r?\n/));
const added=changed.filter(p=>!existed.has(p));
fs.writeFileSync(path.join(OUT,'NEW_FILES.txt'),added.join('\n')+'\n');
const archive=path.join(OUT,'BASELINE.tar');git('archive','--format=tar','--output='+archive,BASE);
fs.mkdirSync(FIXTURE,{recursive:true});fs.writeFileSync(path.join(FIXTURE,'.melee-rebalance-fixture'),'isolated source rollback\n');
execFileSync('tar',['-xf',archive,'-C',FIXTURE]);
// A rerun after an interrupted modified phase must start from the same baseline.
for(const p of added){const dest=path.resolve(FIXTURE,p);assert.ok(dest.startsWith(FIXTURE+path.sep));if(fs.existsSync(dest))fs.unlinkSync(dest);}
if(!fs.existsSync(path.join(FIXTURE,'node_modules')))fs.symlinkSync(path.join(ROOT,'node_modules'),path.join(FIXTURE,'node_modules'),'junction');
const rollback=`#!/usr/bin/env bash
set -euo pipefail
HERE="$(cd "$(dirname "$0")" && pwd -P)"
TARGET="$(cd "$1" && pwd -P)"
test "$TARGET" = "$HERE/rollback-fixture"
test -f "$TARGET/.melee-rebalance-fixture"
while IFS= read -r relative; do
  test -n "$relative" || continue
  case "$relative" in /*|*..*|*\\*) echo 'Invalid relative fixture path'; exit 2;; esac
  rm -f -- "$TARGET/$relative"
done < "$HERE/NEW_FILES.txt"
tar -xf "$HERE/BASELINE.tar" -C "$TARGET"
echo 'PASS ROLLBACK: baseline source restored in marked fixture; main checkout unchanged'
`;
fs.writeFileSync(path.join(OUT,'ROLLBACK.sh'),rollback,{mode:0o755});
const slash=s=>s.replaceAll('\\','/');
execFileSync(BASH,['-c','chmod +x "$1" && test -x "$1"','_',slash(path.join(OUT,'ROLLBACK.sh'))]);
const lines=['BRANCH: main','CHANGED FIELDS: Moves.meleeRoles + common tuning; Combat melee geometry/combos/benefits; Enemy shared control; Player guard/haste; Coop mh/mb deduplication',
  'BASE COMMIT: '+git('rev-parse',BASE).toString().trim(),
  'ORIGINAL SHA256 js/systems/combat.js: '+hash(original),'MODIFIED SHA256 js/systems/combat.js: '+hash(modified),
  ...['MODIFIED_FILE.js','DIFF_FILE.patch','VERIFICATION.txt','ROLLBACK.sh'].map(p=>p+': '+path.join(OUT,p))];
function write(){fs.writeFileSync(path.join(OUT,'VERIFICATION.txt'),lines.join('\n')+'\n');}
function run(label,cmd,args){const r=spawnSync(cmd,args,{cwd:FIXTURE,encoding:'utf8',maxBuffer:64*1024*1024});
  fs.writeFileSync(path.join(OUT,label+'.log'),(r.stdout||'')+(r.stderr||''));lines.push(`${label} COMMAND: ${cmd} ${args.join(' ')}`,`${label} INPUT: cwd=${FIXTURE}; isolated temporary databases; no external accounts/saves`,`${label} STDOUT:\n${r.stdout||''}`,`${label} STDERR:\n${r.stderr||''}`,`${label} EXIT: ${r.status}`);write();assert.equal(r.status,0,label);console.log(label+': '+(r.stdout||'').split(/\r?\n/).filter(s=>/tests |pass |fail |PASS ROLLBACK/.test(s)).join('; '));}
run('BASELINE',process.execPath,['--test','tests/*.test.cjs']);
for(const p of changed){const src=path.join(ROOT,p),dst=path.join(FIXTURE,p);if(fs.existsSync(src)){fs.mkdirSync(path.dirname(dst),{recursive:true});fs.copyFileSync(src,dst);}else if(fs.existsSync(dst))fs.unlinkSync(dst);}
assert.equal(hash(fs.readFileSync(path.join(FIXTURE,'js/systems/combat.js'))),hash(modified));
run('MODIFIED',process.execPath,['--test','tests/*.test.cjs']);
run('RESTORE',BASH,[slash(path.join(OUT,'ROLLBACK.sh')),slash(FIXTURE)]);
assert.equal(hash(fs.readFileSync(path.join(FIXTURE,'js/systems/combat.js'))),hash(original));
for(const p of added)assert.equal(fs.existsSync(path.join(FIXTURE,p)),false,p);
run('ROLLBACK',process.execPath,['--test','tests/*.test.cjs']);
assert.equal(hash(fs.readFileSync(path.join(ROOT,'js/systems/combat.js'))),hash(modified));
lines.push('RESTORED BEHAVIOR: 0.10.0 original melee targeting/range/damage, no follow-up guard or skill roles, and 134 baseline tests restored in isolated fixture only.',
  'MAIN STATUS: modified 0.11.0 retained; production deployment and physical/public-network acceptance are not claimed.');
for(const log of ['eight-mixed.log','eight-relay.log','production.log','local-browser.log','build.log','reproducible.log','font.log']){const p=path.join(OUT,log);if(fs.existsSync(p))lines.push('ADDITIONAL EVIDENCE '+log+':\n'+fs.readFileSync(p,'utf8'));}
write();for(const p of ['MODIFIED_FILE.js','DIFF_FILE.patch','VERIFICATION.txt','ROLLBACK.sh'])assert.ok(fs.readFileSync(path.join(OUT,p)).length);
console.log('PASS MELEE_TRANSACTION: BASELINE/MODIFIED/ROLLBACK passed; four artifacts reopened; main remains modified');
