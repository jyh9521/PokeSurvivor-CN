/* Idempotence regression: source stays untouched and the packaged bytes repeat. */
const fs=require('node:fs'),assert=require('node:assert/strict'),{execFileSync}=require('node:child_process');
const crypto=require('node:crypto');
const source=crypto.createHash('sha256').update(fs.readFileSync('dev.html')).digest('hex');
const build=()=>{
  execFileSync(process.execPath,['tools/build-local.cjs'],{stdio:'inherit'});
  execFileSync(process.execPath,['tools/package-local.cjs'],{stdio:'inherit'});
  return JSON.parse(fs.readFileSync('artifacts/PACKAGE.json','utf8'));
};
const first=build(),second=build();assert.deepEqual(first,second);
assert.equal(source,crypto.createHash('sha256').update(fs.readFileSync('dev.html')).digest('hex'));
const result={result:'PASS REPRODUCIBLE: repeated production build and ZIP SHA256 identical',first,second,sourceUnchanged:true};
fs.mkdirSync('artifacts/verification',{recursive:true});
fs.writeFileSync('artifacts/verification/reproducible.json',JSON.stringify(result,null,2)+'\n');
console.log(result.result);
