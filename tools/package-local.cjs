const {execFileSync}=require('node:child_process');
execFileSync(process.env.PYTHON || 'python',['tools/package-local.py'],{
  cwd:require('node:path').resolve(__dirname,'..'),stdio:'inherit',env:{...process.env,PYTHONUTF8:'1'}
});
