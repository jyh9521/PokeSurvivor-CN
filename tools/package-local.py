"""Package only playable static files and the loopback launcher, reproducibly."""
from pathlib import Path
import hashlib
import json
import zipfile

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / 'artifacts'
OUT.mkdir(exist_ok=True)
FOLDERS = ['assets', 'css', 'js', 'en', 'zh', 'guia', 'pokedex', 'legendarios',
           'shinies', 'tipos', 'movimientos', 'objetos', 'logros', 'novedades', 'apoyar', 'contacto']
FILES = ['index.html', 'manifest.webmanifest', 'sw.js', 'version.json', 'favicon.ico',
         'Start-Local.cmd', 'README-LOCAL.md', 'LICENSE', 'CREDITS.md', 'tools/preview.js']
files = {ROOT / name for name in FILES}
for directory in FOLDERS:
    files.update(p for p in (ROOT / directory).rglob('*') if p.is_file())
archive = OUT / 'PokeSurvivor-CN-local-0.1.0.zip'
with zipfile.ZipFile(archive, 'w', compression=zipfile.ZIP_DEFLATED, compresslevel=6) as z:
    for file in sorted(files):
        name = file.relative_to(ROOT).as_posix()
        entry = zipfile.ZipInfo(name, date_time=(2026, 10, 14, 0, 0, 0))
        entry.compress_type = zipfile.ZIP_DEFLATED
        entry.external_attr = 0o644 << 16
        z.writestr(entry, file.read_bytes())
with zipfile.ZipFile(archive) as z:
    assert z.testzip() is None
    assert b'G.FIREBASE_CONFIG = null' in z.read('js/core/firebase-config.js')
    assert b'FIREBASE_CONFIG' not in z.read('tools/preview.js')
    assert not any(name.startswith(('.git/', 'node_modules/', 'functions/', 'cloudflare/')) for name in z.namelist())
    count = len(z.namelist())
result = {'file': archive.name, 'bytes': archive.stat().st_size,
          'sha256': hashlib.sha256(archive.read_bytes()).hexdigest(), 'files': count,
          'upstream': '537440510dcdadf8ed711ec3dea7ae795533a662',
          'simplifiedChinese': 'a23065deefa1dd4d23557c7b10f6d8d99af42dbc'}
(OUT / 'PACKAGE.json').write_text(json.dumps(result, indent=2) + '\n', encoding='utf-8')
print(f'PASS package: {count} files; zip integrity OK; SHA256={result["sha256"]}')
