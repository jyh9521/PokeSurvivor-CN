/* Actual published local edition, including persistent browser restart. */
require('node:child_process').execFileSync(process.execPath,
  [require('node:path').join(__dirname,'../tools/check-local-state.cjs'),'--file'],{stdio:'inherit'});
