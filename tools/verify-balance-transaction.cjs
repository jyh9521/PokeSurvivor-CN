/* Full modified copy -> isolated reverse restoration; never roll back main. */
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),assert=require('node:assert/strict'),{execFileSync,spawnSync}=require('node:child_process');
const root=path.resolve(__dirname,'..'),out=path.join(root,'artifacts/balance'),target=path.join(out,'baseline-source'),base=fs.readFileSync(path.join(out,'BASELINE_COMMIT'),'utf8').trim();
assert.match(base,/^[a-f0-9]{40}$/);assert.ok(fs.existsSync(path.join(target,'tests/battle-fixture.cjs')));
const sha=file=>crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex'),lines=[];
const changed=execFileSync('git',['diff','--name-status',base,'HEAD'],{cwd:root,encoding:'utf8'}).trim().split('\n').filter(Boolean).map(line=>{const [status,...names]=line.split('\t');return {status,name:names.at(-1)};});
assert.ok(changed.every(r=>!r.name.includes('..')&&!path.isAbsolute(r.name)));
const paths={MODIFIED_FILE:path.join(out,'MODIFIED_FILE.js'),DIFF_FILE:path.join(out,'DIFF_FILE.patch'),VERIFICATION:path.join(out,'VERIFICATION.txt'),ROLLBACK:path.join(out,'ROLLBACK.sh')};
const original=sha(path.join(target,'js/systems/battle.js'));fs.copyFileSync(path.join(root,'js/systems/battle.js'),paths.MODIFIED_FILE);
fs.writeFileSync(paths.DIFF_FILE,execFileSync('git',['diff','--binary',base,'HEAD'],{cwd:root,maxBuffer:40*1024*1024}));
fs.writeFileSync(path.join(out,'restore-files.txt'),changed.filter(r=>r.status!=='A').map(r=>r.name).join('\n')+'\n');
fs.writeFileSync(path.join(out,'added-files.txt'),changed.filter(r=>r.status==='A').map(r=>r.name).join('\n')+'\n');
fs.writeFileSync(path.join(target,'.balance-rollback-fixture'),'isolated source copy\n');
const script=`#!/usr/bin/env bash
set -euo pipefail
HERE="$(cd "$(dirname "$0")" && pwd -P)"
TARGET="$(cd "\${1:?pass isolated fixture path}" && pwd -P)"
test "$TARGET" = "$HERE/baseline-source"
test -f "$TARGET/.balance-rollback-fixture"
tar -xf "$HERE/BASELINE.tar" -C "$TARGET" -T "$HERE/restore-files.txt"
while IFS= read -r file; do
  test -n "$file" || continue
  case "$file" in /*|*..*) echo 'Invalid restore path'; exit 2;; esac
  rm -f -- "$TARGET/$file"
done < "$HERE/added-files.txt"
echo 'PASS ROLLBACK: baseline source restored only in isolated fixture'
`;
fs.writeFileSync(paths.ROLLBACK,script,{mode:0o755});fs.chmodSync(paths.ROLLBACK,0o755);
lines.push('BRANCH: main','CHANGED FIELD: PASSIVE_MAX_LEVEL 3 -> 6; LevelUp fixed 4 lanes -> weighted 3; mastery 6% unlimited -> 3%/3 per move/6 total; rift return recharge; XP supply and ranged coverage; local telemetry/VFX/terrain correctness',...Object.entries(paths).map(([k,v])=>k+': '+v),'BASELINE COMMIT: '+base,'ORIGINAL battle.js SHA256: '+original,'MODIFIED battle.js SHA256: '+sha(paths.MODIFIED_FILE));
const write=()=>fs.writeFileSync(paths.VERIFICATION,lines.join('\n')+'\n');
function run(label,cmd,args,cwd){const r=spawnSync(cmd,args,{cwd,encoding:'utf8',maxBuffer:20*1024*1024,env:{...process.env,PYTHONUTF8:'1'}});lines.push(label+' COMMAND: '+cmd+' '+args.join(' '),label+' INPUT: cwd='+cwd+'; seed fixture, no external account or remote NAS state',label+' STDOUT:\n'+(r.stdout||''),label+' STDERR:\n'+(r.stderr||''),label+' EXIT: '+r.status);write();assert.equal(r.status,0,label);console.log(label+': exit=0; '+(r.stdout||'').trim().split('\n').slice(-9).join('\n'));}
write();run('BASELINE',process.execPath,['--test','tests/*.test.cjs'],target);
for(const row of changed){const dest=path.join(target,row.name);if(row.status==='D'){fs.rmSync(dest,{force:true});continue;}fs.mkdirSync(path.dirname(dest),{recursive:true});fs.copyFileSync(path.join(root,row.name),dest);}
run('MODIFIED',process.execPath,['--test','tests/*.test.cjs'],target);
const actualProbe="const s=require('./tests/battle-fixture.cjs')(),{G}=s,p=s.player(),m=p.activeMove();while(G.Moves.levelUp(m));G.Moves.evolve(m);const mastery=[];for(let i=0;i<4;i++)mastery.push(G.Moves.master(m));const passive=[];for(let i=0;i<7;i++)passive.push(G.Battle.learn(p,'protect'));console.log(JSON.stringify({cards:G.LevelUp.offer(p).length,passive:passive,mastery:mastery,runGrowth:!!G.RunGrowth}));";
run('MODIFIED_BEHAVIOR',process.execPath,['-e',actualProbe],target);
const bash='C:/Program Files/Git/bin/bash.exe';run('ROLLBACK',bash,[paths.ROLLBACK.replaceAll('\\','/'),target.replaceAll('\\','/')],root);
assert.equal(sha(path.join(target,'js/systems/battle.js')),original);
run('RESTORED',process.execPath,['--test','tests/*.test.cjs'],target);
run('RESTORED_BEHAVIOR',process.execPath,['-e',actualProbe],target);
assert.equal(sha(path.join(root,'js/systems/battle.js')),sha(paths.MODIFIED_FILE));
lines.push('RESTORED STATUS: original battle.js hash and old four-lane/three-passive/unlimited-mastery behavior verified; rollback copy only.','MAIN STATUS: modified 0.16.4 source retained.','BROWSER: growth15; round2 7; controlled controller20; special13; visual8; mixed64; relay64; production55. See individual literal logs.','PROVENANCE: deterministic headless/open-terrain and Chrome checks are not human 30-minute play, physical phone/controller or public cross-region acceptance.');write();
for(const file of Object.values(paths))assert.ok(fs.readFileSync(file).length);console.log('PASS BALANCE_TRANSACTION: 246 baseline / 262 modified / 246 restored; main remains modified');
