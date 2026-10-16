/* Repeatable acceptance gates on actual earned 30-minute runs, not static DPS. */
const fs=require('node:fs'),path=require('node:path'),a=require('node:assert/strict');
const out=path.resolve(__dirname,'../artifacts/balance-0165');
const name=process.argv[2]||'final-waves',data=JSON.parse(fs.readFileSync(path.join(out,name+'.json'),'utf8'));
a.equal(data.rows.length,9,'three roles by three seeds');
for(const profile of ['ranged','melee','tank']){
 const rows=data.rows.filter(r=>r.profile===profile);a.equal(rows.length,3);a.ok(rows.filter(r=>r.alive).length>=(profile==='melee'?3:2),profile+' broad viability without promising every draft wins');
 for(const r of rows){a.equal(r.error,null);a.equal(r.fixedBuild,false);a.equal(r.from,0);a.equal(r.requested,1800);a.equal(r.policy,'legacy');a.equal(r.milestones[0].level,1,'earned build starts at level one');if(r.alive)a.ok(r.seconds>=1799.9);a.ok(r.maxCount<=64,'total entity budget');a.equal(r.bosses.length,5,'all five scheduled bosses reached');
  for(const b of r.bosses){a.ok(b.dead!==null,'boss '+b.dex+' must die, not be censored out');a.ok(b.firstHit!==null);a.ok(b.dead-b.firstHit<=(profile==='tank'?240:180),profile+'/'+r.seed+' boss '+b.dex+' must finish within the explicit offensive/defensive role budget');}
 }
}
if(!process.argv[2]){
 const idle=JSON.parse(fs.readFileSync(path.join(out,'final-idle.json'),'utf8'));a.equal(idle.rows.length,9);for(const r of idle.rows)a.ok(r.damageTaken>0,'idle is not damage-free');
 const fixed=JSON.parse(fs.readFileSync(path.join(out,'final-endgame.json'),'utf8'));a.equal(fixed.rows.length,3);a.ok(fixed.rows.filter(r=>r.alive).length>=2,'fixed L45 late-game viability, not guaranteed immortality');a.equal(fixed.sourceSha256,data.sourceSha256);
}
console.log('PASS LONG_BALANCE: '+data.rows.filter(r=>r.alive).length+'/9 earned runs reach 30min; 45/45 bosses finish within role budgets (offense/melee 180s, pure-defense tank 240s); entity cap 64; idle takes damage; fixed late-game >=2/3');
