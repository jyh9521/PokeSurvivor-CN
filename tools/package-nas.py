"""Self-contained Unraid build context; no database, cookies, cache or secrets."""
from pathlib import Path
import zipfile,json,hashlib
ROOT=Path(__file__).resolve().parent.parent
names=['Dockerfile','.dockerignore','compose.yaml','package.json','package-lock.json','README.md','README-LOCAL.md','LICENSE','CREDITS.md','index.html','dev.html','manifest.webmanifest','sw.js','version.json','favicon.ico','robots.txt','sitemap.xml','Start-Local.cmd','tools/preview.js','docs/UNRAID.md','deploy/nas.env.example']
folders=['server','assets','css','js','en','zh','guia','pokedex','legendarios','shinies','tipos','movimientos','objetos','logros','novedades','apoyar','contacto']
files={ROOT/n for n in names}
for name in folders:files.update(p for p in (ROOT/name).rglob('*') if p.is_file())
out=ROOT/'artifacts/PokeSurvivor-CN-NAS-0.2.0.zip'
with zipfile.ZipFile(out,'w',compression=zipfile.ZIP_DEFLATED,compresslevel=6)as z:
    for file in sorted(files):
        name=file.relative_to(ROOT).as_posix();entry=zipfile.ZipInfo(name,(2026,10,14,0,0,0));entry.compress_type=zipfile.ZIP_DEFLATED;entry.external_attr=0o644<<16
        z.writestr(entry,file.read_bytes())
with zipfile.ZipFile(out)as z:
    assert z.testzip() is None
    assert not any(n.endswith(('.sqlite','.env')) or n.startswith(('data/','node_modules/','.git/'))for n in z.namelist())
    count=len(z.namelist())
result={'file':out.name,'files':count,'bytes':out.stat().st_size,'sha256':hashlib.sha256(out.read_bytes()).hexdigest()}
(ROOT/'artifacts/NAS_PACKAGE.json').write_text(json.dumps(result,indent=2)+'\n',encoding='utf-8')
print(f'PASS NAS_PACKAGE: {count} files; no database or secrets; SHA256={result["sha256"]}')
