/* Paired catalog + native dynamic evidence; all input roots are explicit. */
const fs=require('node:fs'),path=require('node:path'),a=require('node:assert/strict');
const ROOT=path.resolve(__dirname,'..'),out=path.join(ROOT,'artifacts/learnsets');fs.mkdirSync(out,{recursive:true});
const base=path.resolve(process.argv[2]||path.join(out,'baseline'));
function load(root){process.chdir(root);return require(path.join(root,'tests/battle-fixture.cjs'))();}
const old=load(base).G,now=load(ROOT).G;
const rows=now.DEX.map(mon=>{const before=Array.from(old.Moves.poolFor(old.DEX_BY[mon.dex])),after=Array.from(now.Moves.poolFor(mon));return{dex:mon.dex,name:mon.name,types:mon.types,before,after,removed:before.filter(id=>!after.includes(id)),added:after.filter(id=>!before.includes(id)),openingBefore:old.Moves.startFor(old.DEX_BY[mon.dex]),openingAfter:now.Moves.startFor(mon),sources:Object.fromEntries(after.map(id=>[id,now.BattleRules.sources(mon,id,now.BattleDex)])),adaptation:now.BattleRules.ADAPTATIONS[mon.dex]||null};});
const verified=r=>r.after.every(id=>r.adaptation?.includes(id)||r.dex===235||r.sources[id].length);
a.ok(rows.every(verified));
const summary={baseline:'124ceceb44d15378fa2293fefafc8382429d5a95',species:rows.length,beforePairs:rows.reduce((n,r)=>n+r.before.length,0),afterPairs:rows.reduce((n,r)=>n+r.after.length,0),removedPairs:rows.reduce((n,r)=>n+r.removed.length,0),addedPairs:rows.reduce((n,r)=>n+r.added.length,0),under12Before:rows.filter(r=>r.before.length<12).length,under12After:rows.filter(r=>r.after.length<12).length,sourceOrExplicitException:rows.filter(verified).length,versionGroups:now.BattleDex.learnsets.versionGroups,sourceCommit:now.BattleDex.learnsets.commit};
fs.writeFileSync(path.join(out,'catalog.json'),JSON.stringify({summary,rows},null,2));
const esc=v=>'"'+String(v).replaceAll('"','""')+'"';
fs.writeFileSync(path.join(out,'catalog.csv'),'Dex,Name,Types,BeforeCount,AfterCount,OpeningBefore,OpeningAfter,Removed,Added,After\n'+rows.map(r=>[r.dex,r.name,r.types.join('/'),r.before.length,r.after.length,r.openingBefore,r.openingAfter,r.removed.join(' '),r.added.join(' '),r.after.join(' ')].map(esc).join(',')).join('\n')+'\n');
const dynamics=[];
for(const [label,root]of [['baseline',base],['modified',ROOT]]){
 process.chdir(root);const scene=require(path.join(root,'tests/battle-fixture.cjs')),dynamic=require(path.join(ROOT,'tests/dynamic-combat-fixture.cjs'));
 for(const dex of [25,129,132,133,134,151,201,235,865,870,999,1025,202,824])for(const seed of [1,17,101])for(const kind of ['moving','surround','boss']){
   const sample=scene().G,id=sample.Moves.startFor(sample.DEX_BY[dex]);let build;
   const r=dynamic(scene,id,kind,seed,{dex,moveLevel:1,configure(p,G){G.Progress={event(){},kill(){}};let rand=seed>>>0;const rng=()=>((rand=(Math.imul(rand,1664525)+1013904223)>>>0)/4294967296);for(let i=0;i<24;i++){p.level=i+2;const cs=G.LevelUp.offer(p,rng);a.ok(cs.length);a.notEqual(cs[0].apply(p),false);}build=p.moves.map(m=>({id:m.id,level:m.lvl,evolved:!!m.evolved,training:m.training||0}));}});
   a.equal(r.error,null,label+':'+dex);dynamics.push({...r,label,build});
 }
 console.log('PASS NATIVE_DYNAMIC '+label+': '+dynamics.filter(r=>r.label===label).length+' windows; errors=0');
}
process.chdir(ROOT);
fs.writeFileSync(path.join(out,'dynamic.json'),JSON.stringify({model:'Actual pursuit/collision/status/boss AI; 24s, 3 seeds, 14 species, three scenarios. 24 actual randomly offered rewards before encounter, choose first card, no forced invulnerability/HP reset. Same fixed movement policy, not a human win rate. Ditto/Sketch observe targets in arena; own stats retained. Infinite vitality cap is unchanged.',summary,dynamics},null,2));
const staticMeasure=require(path.join(ROOT,'tests/move-growth-fixture.cjs')),statics=[];
for(const id of ['hidden-power','struggle','brick-break','sludge-bomb'])for(const stage of [1,2,3,4,5,'evolved','training','mastery','full'])for(const dex of [68,65])for(const scenario of ['single','crowd','elite','boss']){const r=staticMeasure(()=>load(ROOT),id,stage,dex,scenario);a.equal(r.error,null);statics.push(r);}
fs.writeFileSync(path.join(out,'new-moves-static.json'),JSON.stringify({model:'Existing native 12-second static harness; two offensive axes, nine stages, four target fixtures; diagnostic DPS/KPS, not win rate.',rows:statics},null,2));
console.log('PASS LEARNSETS_REPORT '+JSON.stringify(summary)+'; static='+statics.length+'; dynamic='+dynamics.length);
