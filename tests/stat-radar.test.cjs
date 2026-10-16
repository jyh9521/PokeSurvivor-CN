const {test}=require('node:test'),a=require('node:assert/strict'),Radar=require('../js/ui/stat-radar.js');
test('radar follows HP, Attack, Defense, Speed, Special Defense, Special Attack clockwise',()=>{
 const input=[10,20,30,40,50,60],before=[...input],g=Radar.geometry(input);
 a.deepEqual(g.axes.map(x=>x.index),[0,1,2,5,4,3]);a.deepEqual(g.axes.map(x=>x.value),[10,20,30,60,50,40]);a.deepEqual(input,before);
 a.ok(g.axes[0].point[1]<g.cy);a.ok(g.axes[1].point[0]>g.cx);a.ok(g.axes[3].point[1]>g.cy);
});
test('all species share a fixed linear 255 scale; malformed data stays finite and bounded',()=>{
 const g=Radar.geometry([255,127.5,0,-1,Infinity,NaN]);a.equal(g.max,255);
 for(const ax of g.axes)a.ok(ax.point.every(Number.isFinite)&&Math.hypot(ax.point[0]-g.cx,ax.point[1]-g.cy)<=g.radius+.01);
 a.equal(g.axes[0].point[1],g.cy-g.radius);a.deepEqual(g.axes[2].point,[g.cx,g.cy]);
 const lo=Radar.geometry([45,49,49,65,65,45]),hi=Radar.geometry([90,49,49,65,65,45]);
 a.ok(Math.abs((lo.cy-lo.axes[0].point[1])*2-(hi.cy-hi.axes[0].point[1]))<.02);
});
test('radar includes six exact values, accessible name and escaped translations without handlers',()=>{
 const html=Radar.html([45,49,49,65,65,45],s=>s==='HP'?'<script>HP</script>':s);
 a.equal((html.match(/data-stat=/g)||[]).length,6);a.ok(html.includes('role="img"'));a.ok(html.includes('aria-label='));a.ok(html.includes('0–255'));a.ok(html.includes('&lt;script&gt;HP&lt;/script&gt;'));a.ok(!html.includes('<script>'));a.ok(!html.includes('onclick'));
});
test('all 966 catalog entries produce six finite points without changing their base stats',()=>{
 const {G}=require('./battle-fixture.cjs')();for(const p of G.DEX){const stats=G.BattleRules.stats(p,G.BattleDex),before=[...stats],g=Radar.geometry(stats);a.deepEqual(Array.from(stats),before);a.equal(g.axes.length,6);a.ok(g.axes.every(ax=>ax.point.every(Number.isFinite)));}
});
