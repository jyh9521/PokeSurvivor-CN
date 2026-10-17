/* Publish anonymous measured receipts, never account/session state. */
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..'),dir=path.join(root,'artifacts/balance-v2');
const read=n=>JSON.parse(fs.readFileSync(path.join(dir,n+'.json'),'utf8'));
const mean=a=>a.length?a.reduce((s,x)=>s+x,0)/a.length:null;
function run(r){
 const ev=r.telemetry.events.filter(x=>x.kind==='level');let last=0;
 const intervals=ev.map(e=>{const row={time:e.time,seconds:e.time-last,level:e.level};last=e.time;return row;});
 const h=Object.values(r.telemetry.htk||{}),hits=h.reduce((s,x)=>s+x.packets,0),kills=h.reduce((s,x)=>s+x.count,0);
 return {profile:r.profile,seed:r.seed,strong:r.strong,seconds:r.seconds,alive:r.alive,levels:r.levels,kps:r.kills/Math.max(1,r.seconds-r.from),damageTaken:r.damageTaken,maxCount:r.maxCount,xp:r.xpAudit,
 minute:r.milestones.map(x=>({time:x.time,level:x.level,enemies:x.enemies,kills:x.kills,damageTaken:x.damageTaken,xp:x.xpAudit,unpicked:x.xpUnpicked,moves:x.moves})),
 intervals,bands:[[0,180],[180,480],[480,900],[900,1320],[1320,1800]].map(([from,to])=>({from,to,samples:intervals.filter(x=>x.time>from&&x.time<=to).length,meanSeconds:mean(intervals.filter(x=>x.time>from&&x.time<=to).map(x=>x.seconds))})),
 htk:kills?hits/kills:null,skills:r.telemetry.skills,instances:r.telemetry.instances||{},pressure:{damage:r.telemetry.totals.pressureDamage||0,avoided:r.telemetry.totals.pressureAvoided||0},bosses:r.bosses};
}
const control=read('d-baseline-matrix-complete'),selected=read('d-verified-matrix');assert.ok(control.complete&&selected.complete);assert.equal(selected.cases,216);
function party(d,n){const a=d.rows.slice(0,192).filter(x=>x.players===n);return {cases:a.length,exposures:a.length*n,survivors:a.reduce((s,x)=>s+x.alive,0),meanKps:mean(a.map(x=>x.kills/(x.seconds-x.from))),meanDamagePerPlayer:mean(a.map(x=>x.damageTaken/n)),maxCount:Math.max(...a.map(x=>x.maxCount)),meanXpPerPlayer:mean(a.map(x=>x.perPlayer.reduce((s,p)=>s+p.xpGained,0)/n))};}
const perf=fs.readdirSync(path.join(dir,'performance')).filter(n=>/^full-frame-.*\.json$/.test(n)).map(n=>({file:n,...JSON.parse(fs.readFileSync(path.join(dir,'performance',n)))}));
const result={baseline:'2587c650b603d4351911efa8ba9e1e439e1af416',stages:{A:'a08068ed',B:'1008b634',C:'fb76cc70',D:"edf7923348d63d593fbfc5038b43fa2dce501ee6"},version:'0.17.0',protocol:16,saveSchema:3,
 provenance:{continuous:'Real engine, open terrain, seeded automated planned choices, no revives; not human win rates.',party:selected.model,partySourceSha256:selected.sourceSha256,driverSha256:selected.driverSha256,normalCases:192,standing:12,special:12},
 continuous:Object.fromEntries(['xp-baseline','xp-strong-baseline','d-final-free-seeds','d-final-strong'].map(n=>[n,read(n).rows.map(run)])),
 party:[1,2,3,4].map(n=>({players:n,before:party(control,n),after:party(selected,n)})),
 bossNormalWindowDifferences:selected.rows.slice(0,192).reduce((s,x,i)=>s+Number(JSON.stringify(x.bosses)!==JSON.stringify(control.rows[i].bosses)),0),
 specials:selected.rows.slice(-12).map(x=>({profile:x.profile,players:x.players,seconds:x.seconds,alive:x.alive,damage:x.perPlayer.map(p=>p.damage),formEvents:x.telemetry.events.filter(e=>e.kind==='special-use'||e.kind==='max')})),
 pressure:read('pressure-modified'),performance:perf,package:JSON.parse(fs.readFileSync(path.join(root,'artifacts/PACKAGE.json'))),
 unverified:['Physical controllers/phones','Public cross-region NAT and Cloudflare credential activation','Human 30-minute win rates','Universal reference upgrade cadence across all builds; HP-priority driver has long late intervals']};
const dest=path.join(root,'docs/data/balance-v2.json');fs.mkdirSync(path.dirname(dest),{recursive:true});fs.writeFileSync(dest,JSON.stringify(result,null,2)+'\n');console.log('PASS BALANCE_V2_REPORT: 216 paired windows, 24 continuous samples, anonymous numeric receipts -> '+dest);
