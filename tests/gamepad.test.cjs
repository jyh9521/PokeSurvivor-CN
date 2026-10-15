const {test}=require('node:test'),assert=require('node:assert/strict'),N=require('../js/core/gamepad-nav.js');
const box=(id,x,y,w=40,h=30)=>({id,rect:{left:x,top:y,right:x+w,bottom:y+h}});
test('spatial navigation follows positions, not shuffled DOM order',()=>{const a=box('a',0,0),b=box('b',80,0),c=box('c',0,60),d=box('d',80,60),items=[d,b,c,a];assert.equal(N.next(c.rect,items,'up').id,'a');assert.equal(N.next(a.rect,items,'right').id,'b');assert.equal(N.next(b.rect,items,'down').id,'d');assert.equal(N.next(d.rect,items,'left').id,'c');});
test('edges do not wrap to unrelated controls',()=>{const a=box('a',0,0),b=box('b',80,0);assert.equal(N.next(a.rect,[a,b],'left'),null);assert.equal(N.next(a.rect,[a,b],'up'),null);});
test('aligned cards win against diagonal controls',()=>{const a=box('a',0,0,200,80),b=box('b',0,100,200,80),other=box('other',260,20);assert.equal(N.next(a.rect,[other,b],'down').id,'b');});
test('spatial navigation handles horizontal responsive cards and subpixel noise',()=>{const a=box('a',10,10,150,200),b=box('b',180,10,150,200);assert.equal(N.next(a.rect,[a,b],'right').id,'b');assert.equal(N.next(a.rect,[box('noise',10.1,10.1,150,200)],'down'),null);});
test('navigation accepts only candidates supplied by the visible/enabled UI scope',()=>{const a=box('a',0,0),c=box('c',120,0);assert.equal(N.next(a.rect,[c],'right').id,'c');assert.equal(N.next(a.rect,[],'right'),null);});

test('direction cone rejects a distant toolbar almost perpendicular to the press',()=>{const a=box('a',400,300),bar=box('toolbar',430,0);assert.equal(N.next(a.rect,[bar],'right'),null);});
