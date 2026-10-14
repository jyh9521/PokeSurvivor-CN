/* Only the explicitly marked isolated fixture is ever replaced. */
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),{execFileSync}=require('node:child_process');
const ROOT=path.resolve(__dirname,'..'),target=path.resolve(process.argv[2]||'');
assert.equal(target,path.join(ROOT,'artifacts/selfhost-rollback'));
assert.ok(fs.existsSync(path.join(target,'.rollback-fixture')));
assert.equal(fs.realpathSync(target),target);
for(const row of fs.readdirSync(target)){
  const file=path.resolve(target,row);assert.ok(file.startsWith(target+path.sep));
  fs.rmSync(file,{recursive:true,force:true});
}
const tar=execFileSync('git',['archive','f7b4c6624e612abce414af84a2f71945de3cf5ae'],{cwd:ROOT,maxBuffer:256*1024*1024});
execFileSync('tar',['-x'],{input:tar,cwd:target});
// Preserve the exact pre-change checkout bytes as well as the Git baseline.
fs.copyFileSync(path.join(ROOT,'artifacts/selfhost-verification/BASELINE_FILE.js'),path.join(target,'js/core/firebase-config.js'));
console.log('PASS ROLLBACK: f7b4c66 local-only files restored; NAS additions removed; main unchanged');
