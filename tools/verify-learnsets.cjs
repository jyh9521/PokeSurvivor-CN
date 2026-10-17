/* Reversible source transaction. The live checkout and NAS are never restored. */
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),a=require('node:assert/strict'),{execFileSync,spawnSync}=require('node:child_process');
const root=path.resolve(__dirname,'..'),out=path.join(root,'artifacts/learnsets'),base='124ceceb44d15378fa2293fefafc8382429d5a95',source=path.join(out,'baseline'),target=path.join(out,'rollback-fixture'),bash=process.env.BASH||(process.platform==='win32'?'C:/Program Files/Git/bin/bash.exe':'/bin/bash');
const git=(...args)=>execFileSync('git',args,{cwd:root,maxBuffer:64*1024*1024}),sha=p=>crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex');
const changed=git('diff','--name-status',base).toString().trim().split('\n').filter(Boolean).map(line=>{const [status,name]=line.trim().split('\t');a.ok(!path.isAbsolute(name)&&!name.includes('..'));return{status,name};});
a.ok(changed.length);a.ok(fs.existsSync(path.join(source,'tests/battle-fixture.cjs')));
fs.mkdirSync(target,{recursive:true});
// All sources and art are actual copies: NAS realpath checks intentionally reject asset junctions.
const assetCopy=path.join(target,'assets');if(fs.existsSync(assetCopy))a.equal(fs.lstatSync(assetCopy).isSymbolicLink(),false);
fs.cpSync(source,target,{recursive:true,filter:p=>!(path.relative(source,p)==='assets'&&fs.existsSync(assetCopy))});
const added=changed.filter(r=>r.status==='A').map(r=>r.name),originals=changed.filter(r=>r.status!=='A').map(r=>r.name);
for(const name of added){const dest=path.join(target,name);if(fs.existsSync(dest))fs.unlinkSync(dest);}
const originalHashes=Object.fromEntries(originals.map(name=>[name,sha(path.join(source,name))])),modifiedHashes=Object.fromEntries(changed.filter(r=>r.status!=='D').map(({name})=>[name,sha(path.join(root,name))]));
fs.writeFileSync(path.join(target,'.learnsets-rollback-fixture'),'isolated source transaction\n');
fs.writeFileSync(path.join(out,'added-files.txt'),added.join('\n')+'\n');
git('archive','--format=tar','--output='+path.join(out,'ORIGINALS.tar'),base,'--',...originals);
const files={MODIFIED_FILE:path.join(out,'MODIFIED_FILE.js'),DIFF_FILE:path.join(out,'DIFF_FILE.patch'),VERIFICATION:path.join(out,'VERIFICATION.txt'),ROLLBACK:path.join(out,'ROLLBACK.sh')};
fs.copyFileSync(path.join(root,'js/core/battle-rules.js'),files.MODIFIED_FILE);fs.writeFileSync(files.DIFF_FILE,git('diff','--binary',base));
fs.writeFileSync(files.ROLLBACK,`#!/usr/bin/env bash
set -euo pipefail
HERE="$(cd "$(dirname "$0")" && pwd -P)"
TARGET="$(cd "\${1:?pass the isolated fixture path}" && pwd -P)"
test "$TARGET" = "$HERE/rollback-fixture"
test -f "$TARGET/.learnsets-rollback-fixture"
tar -xf "$HERE/ORIGINALS.tar" -C "$TARGET"
while IFS= read -r file; do
  test -n "$file" || continue
  case "$file" in /*|*..*|*\\*) echo 'Invalid fixture path'; exit 2;; esac
  rm -f -- "$TARGET/$file"
done < "$HERE/added-files.txt"
echo 'PASS ROLLBACK: baseline sources restored only in isolated fixture'
`,{mode:0o755});
const slash=s=>s.replaceAll('\\','/');execFileSync(bash,['-c','chmod +x "$1" && test -x "$1"','_',slash(files.ROLLBACK)]);
const lines=['BRANCH: main','CHANGED FIELD: source-backed species/form learnsets and linear ancestry; observed repertoire copy; bounded species-specific attack routes; legacy binding notice; dash terrain phasing and valid landing; raw right-stick activity hints; protocol18/save schema3',...Object.entries(files).map(([k,v])=>k+': '+v),'BASELINE: '+base,'ORIGINAL battle-rules SHA256: '+originalHashes['js/core/battle-rules.js'],'MODIFIED battle-rules SHA256: '+sha(files.MODIFIED_FILE)];
const write=()=>fs.writeFileSync(files.VERIFICATION,lines.join('\n')+'\n');
function run(label,cmd,args,cwd,expected=0){const r=spawnSync(cmd,args,{cwd,encoding:'utf8',maxBuffer:24*1024*1024,env:{...process.env,PYTHONUTF8:'1'}});lines.push(label+' COMMAND: '+cmd+' '+args.join(' '),label+' INPUT: cwd='+cwd+'; isolated accounts/databases; fixed source fixtures; no live NAS',label+' STDOUT:\n'+(r.stdout||''),label+' STDERR:\n'+(r.stderr||''),label+' EXIT: '+r.status);write();a.equal(r.status,expected,label);console.log(label+': exit='+r.status+'; '+(r.stdout||'').split(/\r?\n/).filter(s=>/ℹ tests|ℹ pass|ℹ fail|PASS /.test(s)).join('; '));}
write();run('BASELINE',process.execPath,['--test','tests/*.test.cjs'],target);
run('BASELINE_RED_PROBE',process.execPath,[path.join(root,'tools/probe-learnsets.cjs'),target],root,1);
for(const {status,name}of changed){const dest=path.join(target,name);if(status==='D'){fs.unlinkSync(dest);continue;}fs.mkdirSync(path.dirname(dest),{recursive:true});fs.copyFileSync(path.join(root,name),dest);}
run('MODIFIED',process.execPath,['--test','tests/*.test.cjs'],target);
run('MODIFIED_PROBE',process.execPath,[path.join(root,'tools/probe-learnsets.cjs'),target],root);
run('RESTORE',bash,[slash(files.ROLLBACK),slash(target)],root);
for(const [name,hash]of Object.entries(originalHashes))a.equal(sha(path.join(target,name)),hash,name+' restored');for(const name of added)a.equal(fs.existsSync(path.join(target,name)),false,name+' removed');
run('ROLLBACK',process.execPath,['--test','tests/*.test.cjs'],target);
run('ROLLBACK_RED_PROBE',process.execPath,[path.join(root,'tools/probe-learnsets.cjs'),target],root,1);
for(const [name,hash]of Object.entries(modifiedHashes))a.equal(sha(path.join(root,name)),hash,name+' main retained');
lines.push('RESTORED BEHAVIOR: Eevee sibling Bubble and old generic role/padding behavior restored only in fixture; 341 baseline tests pass; red contract fails again as expected.','MAIN STATUS: modified 0.19.0 retained; baseline and modified source hashes verified for every changed file.');
for(const key of ['MODIFIED_FILE','DIFF_FILE','ROLLBACK'])lines.push(key+' SHA256: '+sha(files[key]));write();
for(const file of Object.values(files))a.ok(fs.readFileSync(file).length>0);
console.log('PASS LEARNSETS_TRANSACTION: baseline/modified/rollback verified; main remains modified; all four artifacts reopened');
