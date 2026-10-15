/* Loopback static server. It serves the actual build without config injection. */
const http=require('node:http'),fs=require('node:fs'),path=require('node:path');
const {spawn}=require('node:child_process');
const ROOT=path.resolve(__dirname,'..');
const ALLOWED=new Set(['assets','css','js','en','zh','guia','pokedex','legendarios','shinies','tipos','movimientos','objetos','logros','novedades','apoyar','contacto']);
const FILES=new Set(['index.html','dev.html','404.html','sw.js','version.json','manifest.webmanifest','favicon.ico','robots.txt','sitemap.xml','LICENSE','LICENSE-NONCOMMERCIAL.md','UPSTREAM-NOTICES.md']);
const MIME={'.md':'text/plain; charset=utf-8','.html':'text/html; charset=utf-8','.js':'application/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json; charset=utf-8','.webmanifest':'application/manifest+json','.png':'image/png','.jpg':'image/jpeg','.ico':'image/x-icon','.ttf':'font/ttf','.woff2':'font/woff2'};
const PORT=Number(process.env.PORT || 8765);
const server=http.createServer((req,res)=>{
  try {
    if(!['GET','HEAD'].includes(req.method)){res.writeHead(405).end();return;}
    const u=new URL(req.url,'http://localhost');
    const f=path.resolve(ROOT,'.'+decodeURIComponent(u.pathname));
    const rel=path.relative(ROOT,f).split(path.sep);
    if((f!==ROOT&&!f.startsWith(ROOT+path.sep))||rel.some(x=>x.startsWith('.'))||
      (f!==ROOT&&!ALLOWED.has(rel[0])&&!FILES.has(rel.join('/')))){res.writeHead(403).end();return;}
    const file=fs.statSync(f).isDirectory()?path.join(f,'index.html'):f;
    const body=fs.readFileSync(file);
    res.setHeader('Content-Type',MIME[path.extname(file)]||'application/octet-stream');
    res.setHeader('Cache-Control','no-store');
    res.setHeader('X-Content-Type-Options','nosniff');
    res.end(req.method==='HEAD'?undefined:body);
  } catch {res.writeHead(404).end('Not found');}
});
server.on('error',e=>{console.error(e.message);process.exitCode=1;});
server.listen(PORT,'127.0.0.1',()=>{
  const url=`http://127.0.0.1:${PORT}/`;
  console.log('PokéSurvivor 中文本地版: '+url);
  console.log('创建本地账号保存进度；访客不保存。Ctrl+C 关闭服务器。');
  if(process.argv.includes('--open')) {
    const cmd=process.platform==='win32'?'powershell.exe':process.platform==='darwin'?'open':'xdg-open';
    const args=process.platform==='win32'?['-NoProfile','-Command',`Start-Process '${url}'`]:[url];
    spawn(cmd,args,{stdio:'ignore',windowsHide:true}).unref();
  }
});
