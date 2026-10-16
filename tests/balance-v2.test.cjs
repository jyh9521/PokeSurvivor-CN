const {test}=require('node:test'),a=require('node:assert/strict'),Q=require('../js/net/network-quality.js');
test('NAS solo ignores stale RTC peers while real multiplayer preserves TURN and missing-ICE status',()=>{
 const stale={connected:true,p2pOnly:true,directPeers:2,turnPeers:1,peerLinks:[{mode:'turn',path:{rttMs:90}}],nasRttMs:12};
 const solo=Q.session(stale,null,'me');a.equal(Q.describe(solo).transport,'nas');a.equal(Q.describe(solo).rttMs,12);a.equal(solo.peerLinks.length,0);
 const room={members:[{uid:'me'},{uid:'other'}]};a.equal(Q.describe(Q.session(stale,room,'me')).transport,'mixed');a.equal(Q.describe(Q.session(stale,room,'me',true)).transport,'nas');a.equal(Q.describe(Q.session({...stale,directPeers:0,turnPeers:0,peerLinks:[]},room,'me')).transport,'connecting');
 a.equal(Q.describe(Q.session(stale,{members:[{uid:'me'}]},'me')).transport,'nas');
});
const scene=require('./battle-fixture.cjs'),B=require('../js/core/battle-balance.js');
test('pressure interpolates smoothly, remains raw not pure, and only scales pressure special armor',()=>{
 for(const [t,r]of [[0,.08],[180,.08],[600,.13],[1200,.18],[1800,.23]]){a.equal(B.pressureRate(t),r);a.ok(Math.abs(B.pressureRate(t+.001)-B.pressureRate(t-.001))<.00001);}
 for(let L=1;L<500;L++)a.ok(B.xpFor(L+1)>B.xpFor(L));a.equal(B.XP.catchup,false);
 const {G,player}=scene(),p=player(143);for(let i=0;i<18;i++)G.Battle.learn(p,'vitality');for(let i=0;i<6;i++)G.Battle.learn(p,'light-screen');p.battle.block=0;
 const normal=G.Battle.defend(p,100,false,'special',0),pressure=G.Battle.defend(p,100,false,'special',0,false,true);a.ok(pressure>normal&&pressure<100);a.equal(G.Battle.defend(p,100,true,'special',0,false,true),100);
 p.battle.shield=1e4;a.equal(G.Battle.defend(p,100,false,'special',0,false,true),0);a.ok(p.battle.shield<1e4);
});
test('pressure ignores ordinary contact grace, hits once across overlapping zones, and is fully avoidable',()=>{
 const {G,player}=scene(),p=player(6);G.Game={player:p,st:{time:1200}};G.Camera.sees=()=>false;G.Telemetry.start(p);p.invuln=9;
 const make=()=>G.Hazards.add({kind:'zone',x:0,y:0,r:68,delay:1.8,dmg:36,pct:.18,pressure:true,damageClass:'special'});make();make();G.Hazards.update(1.81);const hp=p.hp;a.ok(hp<p.maxHp);a.ok(p.telemetry.totals.pressureDamage>0);G.Hazards.update(.01);a.equal(p.hp,hp);
 G.Hazards.clear();G.Battle.tick(p,1.1);p.invuln=0;make();p.x=200;G.Hazards.update(1.81);a.equal(p.hp,hp);a.equal(p.telemetry.totals.pressureAvoided,1);
 let packet;G.Coop.isHost=true;G.Coop.broadcast=e=>packet=e;make();a.equal(packet[1].pressure,true);a.equal(packet[1].pct,.18);
});
