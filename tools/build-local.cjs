/* Source -> standalone static local-save distribution; no cloud deployment. */
const { execFileSync } = require('node:child_process');
const fs = require('node:fs'), path = require('node:path');
const ROOT = path.resolve(__dirname,'..');
const epoch = process.env.SOURCE_DATE_EPOCH || String(require('../package.json').buildEpoch);
const run = (cmd,args)=>execFileSync(cmd,args,{cwd:ROOT,stdio:'inherit',env:{...process.env,PYTHONUTF8:'1',SOURCE_DATE_EPOCH:epoch}});
run(process.execPath,['tools/build.js',...process.argv.slice(2)]);
run(process.execPath,['tools/export_data.js']);
run(process.env.PYTHON || 'python',['tools/make_seo_pages.py']);
// Shared source generators stay locale-neutral; fork distribution changes live here.
function pages(dir) {
  for(const row of fs.readdirSync(dir,{withFileTypes:true})) {
    if(row.name.startsWith('.') || ['node_modules','artifacts','test-results','tools','docs'].includes(row.name)) continue;
    const file=path.join(dir,row.name);
    if(row.isDirectory()) pages(file);
    else if(row.name.endsWith('.html') && row.name !== 'dev.html') {
      let html=fs.readFileSync(file,'utf8');
      html=html.replace(/<aside class="local-edition"[\s\S]*?<\/aside>/g,'');
      html=html.replace(/<link rel="(?:canonical|alternate|preconnect)"[^>]*>\s*/g,'');
      html=html.replace(/<meta property="og:url"[^>]*>\s*/g,'');
      html=html.replace(/<script type="application\/ld\+json">[\s\S]*?<\/script>\s*/g,'');
      html=html.replace(/href="https:\/\/pokesurvivor\.com\/([^"?#]*)"/g,(_,p)=>`href="${path.relative(path.dirname(file),path.join(ROOT,p || 'index.html')).split(path.sep).join('/') || 'index.html'}"`);
      if(file===path.join(ROOT,'index.html')) {
        html=html.replace('<html lang="es">','<html lang="zh-CN">');
        html=html.replace(/<title>[^<]*<\/title>/,'<title>PokéSurvivor 中文本地版</title>');
        html=html.replace(/<meta name="description"[^>]*>/,'<meta name="description" content="免费的宝可梦生存游戏中文本地版；创建本地账号保存进度，访客模式不保存。">');
      }
      if(html.includes('id="game"')) {
        const lang = file===path.join(ROOT,'en/index.html') ? 'en_US' : 'zh_CN';
        html=html.replace(/<meta property="og:locale"[^>]*>\s*/g,'');
        html=html.replace('<meta charset="utf-8">',`<meta charset="utf-8">\n<meta property="og:locale" content="${lang}">`);
        const desc=file===path.join(ROOT,'en/index.html') ? 'Free local-save edition. Create a local account to save in this browser; guest progress is not saved. Online features depend on the hosting backend.' : '免费的宝可梦生存游戏中文本地版；创建本地账号保存进度，访客不保存；在线功能取决于部署的后端。';
        html=html.replace(/(<meta (?:name="description"|property="(?:og|twitter):description"|name="twitter:description") content=")[^"]*(">)/g,(_,a,b)=>a+desc+b);
        html=html.replace(/https:\/\/pokesurvivor\.com\/assets\/og-image\.jpg/g,'assets/og-image.jpg');
        html=html.replace(/<meta name="robots"[^>]*>/g,'<meta name="robots" content="noindex, nofollow">');
      }
      html=html.replace('<body>','<body><aside class="local-edition" style="padding:6px;text-align:center;font:14px sans-serif;background:#17243b;color:#fff">中文社区版 · 账号与存档状态请在游戏内「设置 → 账号」查看</aside>');
      if(html.includes('id="game"')) html=html.replace(/<aside class="local-edition"[\s\S]*?<\/aside>/,'');
      fs.writeFileSync(file,html);
    }
  }
}
pages(ROOT);
fs.writeFileSync(path.join(ROOT,'robots.txt'),'User-agent: *\nDisallow: /\n');
fs.writeFileSync(path.join(ROOT,'sitemap.xml'),'<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"/>\n');
console.log('PASS build: standalone local-save pages; no upstream canonical or cloud configuration');
