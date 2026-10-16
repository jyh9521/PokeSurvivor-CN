/* Identical executable probe for baseline, modified and isolated rollback trees. */
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.resolve(process.argv[2]||'.');process.chdir(root);
const s=require(path.join(root,'tests/battle-fixture.cjs'))(),{G}=s;
const p=s.player();p.moves=[G.Moves.instance('ember')];p.slots=[p.moves];p.hp=p.maxHp=100;p.hurt(10000,null,false,'physical','contact');
const q=s.player();q.hp=q.maxHp=100;q.hurt(10000,null,false,'physical','contact');
const e=s.enemy(100);e.bossInit();e.ai.mode='far';e.ai.modeT=9;e.bossEnd();
vm.runInContext(fs.readFileSync('js/systems/spawner.js','utf8'),s.ctx);
const m=G.Moves.instance('ember',5);G.Moves.evolve(m);
console.log(JSON.stringify({rangedContactHp:p.hp,meleeContactHp:q.hp,bossFarSeconds:e.ai.modeT,spawnRate1750:+G.Spawner.rate(1750).toFixed(2),emberEvolutionDamage:+m.dmg.toFixed(2)}));
