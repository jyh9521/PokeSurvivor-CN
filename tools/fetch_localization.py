#!/usr/bin/env python3
"""Download pinned localization inputs; never runs in the browser."""
import concurrent.futures
import hashlib
import json
from pathlib import Path
import urllib.request
import sys

ROOT = Path(__file__).resolve().parent.parent
CACHE = ROOT / 'tools/cache/localization'
POKE_REV = '81d20919845b6a445969b9265aab5cec6b04cece'
LOCK = json.loads((ROOT / 'tools/localization/input-lock.json').read_text(encoding='utf-8'))
INPUTS = {name: row['url'] for name, row in LOCK.items()}

def fetch(pair):
    name, url = pair
    dest = CACHE / name
    if not dest.exists():
        req = urllib.request.Request(url, headers={'User-Agent': 'PokéSurvivor-localization/1.0'})
        with urllib.request.urlopen(req, timeout=90) as response:
            dest.write_bytes(response.read())
    digest = hashlib.sha256(dest.read_bytes()).hexdigest()
    if digest != LOCK[name]['sha256']:
        raise ValueError(f'Input hash mismatch: {name}; audit and update input-lock.json explicitly')
    return name, {'url': url, 'sha256': digest}

if __name__ == '__main__':
    CACHE.mkdir(parents=True, exist_ok=True)
    with concurrent.futures.ThreadPoolExecutor(max_workers=6) as pool:
        selected = {k: v for k, v in INPUTS.items() if not '--fonts' in sys.argv or k.startswith('Noto')}
        manifest = dict(pool.map(fetch, selected.items()))
    (CACHE / 'manifest.json').write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    print('Downloaded', len(manifest), 'localization inputs to', CACHE)
