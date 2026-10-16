const test=require('node:test'),assert=require('node:assert/strict'),scene=require('./battle-fixture.cjs');
test('healers share a recipient cooldown and restore exactly five percent',()=>{
 const {G,enemy}=scene();G.Game={everyone:()=>[{atk:100,baseAtk:1}]};
 const a=enemy(0),b=enemy(1),target=enemy(2);a.behavior=b.behavior='healer';a.hp=b.hp=100;target.hp=100;
 a.healAround();b.healAround();assert.equal(target.hp,150);assert.equal(a.hp,100);assert.equal(b.hp,100);
 assert.equal(target.enemyHealT,3);target.enemyHealT=.01;a.healAround();assert.equal(target.hp,150);
 target.enemyHealT=0;b.healAround();assert.equal(target.hp,200);
});
test('healing chooses four lowest HP ratios, skips bosses, dead, full and cooling targets',()=>{
 const {G,enemy}=scene();G.Game={everyone:()=>[]};const caster=enemy(0);caster.behavior='healer';
 const targets=[.8,.2,.6,.1,.4,.3].map((f,i)=>{const e=enemy(i+1);e.hp=e.maxHp*f;return e;});
 const boss=enemy(8);boss.boss=true;boss.hp=1;const cooling=enemy(9);cooling.hp=1;cooling.enemyHealT=1;
 caster.healAround();assert.deepEqual(targets.map(e=>e.hp),[800,250,600,150,450,350]);assert.equal(boss.hp,1);assert.equal(cooling.hp,1);
 caster.remote=true;targets[0].hp=1;caster.healAround();assert.equal(targets[0].hp,1);
});
