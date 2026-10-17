/* Red-capable contract probe. Source root is deliberately injectable. */
const path=require('node:path'),a=require('node:assert/strict');
const root=path.resolve(process.argv[2]||'.');process.chdir(root);
const {G}=require(path.join(root,'tests/battle-fixture.cjs'))();
a.equal(G.Moves.poolFor(G.DEX_BY[133]).includes('bubble'),false,'Eevee must not inherit a sibling evolution attack');
a.equal(G.Moves.poolFor(G.DEX_BY[25]).includes('icy-wind'),false,'role must not grant Pikachu Icy Wind');
a.equal(G.Moves.poolFor(G.DEX_BY[129]).includes('flamethrower'),false,'Magikarp must not borrow its descendant attacks');
a.equal(G.Moves.poolFor(G.DEX_BY[201]).join(','),'hidden-power','Unown must not receive a generic kit');
console.log('PASS LEARNSET_PROBE: sibling=0; role=0; descendant=0; Unown=hidden-power');
