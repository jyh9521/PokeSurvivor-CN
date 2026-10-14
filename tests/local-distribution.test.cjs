const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const ROOT=path.resolve(__dirname,'..');
const read=p=>fs.readFileSync(path.join(ROOT,p),'utf8');
test('fork ships null Firebase, local-only flag and independent repository',()=>{
  const c={G:{}};vm.runInNewContext(read('js/core/firebase-config.js'),c);
  assert.equal(c.G.FIREBASE_CONFIG,null);assert.equal(c.G.LOCAL_ONLY,true);
  assert.equal(c.G.PROJECT_REPO,'https://github.com/jyh9521/PokeSurvivor-CN');
});
test('all playable entries use Chinese distribution defaults and no upstream preconnect',()=>{
  for(const p of ['dev.html','index.html','en/index.html','zh/index.html']) {
    const s=read(p);assert.ok(s.includes("window.PS_DEFAULT_LANGUAGE = 'zh-CN'"),p);
    assert.ok(!s.includes('rel="preconnect"'),p);
    if(p!=='dev.html') assert.ok(!s.includes('rel="canonical"'),p);
    if(p.startsWith('en/') || p.startsWith('zh/')) assert.ok(s.includes('<base href="../">'),p);
  }
});
test('preview has no config interception and does not expose repository internals',()=>{
  const s=read('tools/preview.js');assert.ok(!s.includes('FIREBASE_CONFIG'));
  assert.ok(s.includes('127.0.0.1'));assert.ok(s.includes('ALLOWED'));
});
test('language and build inputs remain pinned',()=>{
  const lock=JSON.parse(read('tools/localization/input-lock.json'));
  for(const [name,row]of Object.entries(lock)){
    assert.match(row.sha256,/^[a-f0-9]{64}$/);
    if(name.startsWith('Noto')) assert.ok(!row.url.includes('/main/'));
  }
  assert.ok(read('tools/fetch_localization.py').includes('Input hash mismatch'));
  assert.ok(read('tools/make_zh_font.py').includes('Input hash mismatch'));
  assert.ok(!read('js/data/lang-zh-cn.js').includes('暱称'));
  assert.ok(read('tools/build.js').includes("require.resolve('terser/package.json')"));
});
test('privacy and guest persistence behavior are explicit',()=>{
  assert.ok(read('dev.html').includes('No se envían a Firebase'));
  assert.ok(read('js/ui/login.js').includes('El modo invitado no guarda'));
  assert.ok(read('js/ui/menu.js').includes("['friends', 'rank']"));
  assert.equal((read('contacto/index.html').match(/class="local-edition"/g)||[]).length,1);
});
