const {test}=require('node:test'),a=require('node:assert/strict'),Q=require('../js/net/network-quality.js');
test('NAS solo ignores stale RTC peers while real multiplayer preserves TURN and missing-ICE status',()=>{
 const stale={connected:true,p2pOnly:true,directPeers:2,turnPeers:1,peerLinks:[{mode:'turn',path:{rttMs:90}}],nasRttMs:12};
 const solo=Q.session(stale,null,'me');a.equal(Q.describe(solo).transport,'nas');a.equal(Q.describe(solo).rttMs,12);a.equal(solo.peerLinks.length,0);
 const room={members:[{uid:'me'},{uid:'other'}]};a.equal(Q.describe(Q.session(stale,room,'me')).transport,'mixed');a.equal(Q.describe(Q.session({...stale,directPeers:0,turnPeers:0,peerLinks:[]},room,'me')).transport,'connecting');
 a.equal(Q.describe(Q.session(stale,{members:[{uid:'me'}]},'me')).transport,'nas');
});
