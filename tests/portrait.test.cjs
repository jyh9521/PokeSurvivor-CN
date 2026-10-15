const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
function context(){const G={Settings:{get:()=>false}};for(const p of ['js/core/camera.js','js/ui/hud.js'])vm.runInNewContext(fs.readFileSync(p,'utf8'),{G});return G;}
test('portrait camera keeps a readable world width while landscape retains original framing',()=>{const G=context();G.Camera.resize(390,844,1);assert.equal(G.Camera.w,480);G.Camera.resize(844,390,1);assert.equal(G.Camera.scale,Math.min(844/768,390/420));});
test('portrait HUD rectangles fit safe area and separate equipment, moves and pause',()=>{const G=context();for(const w of [320,360,390,430]){const l=G.HUD.layout(w,844,4,true,{top:44,bottom:34,left:0,right:0});assert.equal(l.portrait,true);for(const r of [l.item,l.pause,...l.slots]){assert.ok(r.x>=0&&r.x+r.w<=w);assert.ok(r.y>=44&&r.y+r.h<=844-34);}assert.ok(l.item.y+l.item.h<l.slots[0].y);assert.ok(l.pause.w>=44);assert.ok(l.clockY>l.py+28);}});
test('landscape HUD retains slot size and equipment position',()=>{const l=context().HUD.layout(844,390,4,true,{top:0,bottom:0,left:0,right:0});assert.equal(l.portrait,false);assert.equal(l.slots[0].w,54);assert.equal(l.item.x,l.slots[0].x-72);});

test('installed PWA permits both orientations',()=>{assert.equal(JSON.parse(fs.readFileSync('manifest.webmanifest','utf8')).orientation,'any');});
