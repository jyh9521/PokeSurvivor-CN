const {test}=require('node:test'),a=require('node:assert/strict'),fixture=require('./battle-fixture.cjs');
test('learning keeps the selected move, cooldown and orbit without selection effects',()=>{
 const {G,player}=fixture(),p=player(); const old=p.activeGroup(); old[0].t=2.5;
 let selections=0,clears=0;G.Audio.sfx=()=>selections++;G.Projectiles.clearOrbs=()=>clears++;
 a.equal(p.addMove('ember'),true);a.equal(p.activeGroup(),old);a.equal(old[0].t,2.5);a.equal(selections,0);a.equal(clears,0);
 p.setActive(p.slots.findIndex(g=>g[0].id==='ember'));a.equal(p.activeMove().id,'ember');a.equal(selections,1);a.equal(clears,1);
});
test('learning preserves active group through shortcut rearrangement and handles first/duplicate/full slots',()=>{
 const {G}=fixture(),p=new G.Player(G.DEX_BY[6]);p.bind={ember:0,tackle:3};
 a.equal(p.addMove('tackle'),true);a.equal(p.activeMove().id,'tackle');const group=p.activeGroup();
 a.equal(p.addMove('ember'),true);a.equal(p.activeGroup(),group);a.equal(p.active,1);
 const snapshot=p.slots.length;a.equal(p.addMove('ember'),false);a.equal(p.slots.length,snapshot);
 p.maxMoves=2;a.equal(p.addMove('watergun'),false);a.equal(p.activeGroup(),group);
});
test('learning preserves a bonded active slot and Choice Band selection',()=>{
 const {player}=fixture();for(const bonded of [false,true]){const p=player();
 if(bonded)p.activeGroup().push({...p.moves[0],id:'bond-test'});p.hasItem=()=>true;
 const group=p.activeGroup();a.equal(p.addMove('ember'),true);a.equal(p.activeGroup(),group);
 }
});
