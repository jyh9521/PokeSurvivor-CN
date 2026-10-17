#!/usr/bin/env python3
"""Independently check every retained source tuple against locked CSV records."""
import csv,hashlib,json
from collections import defaultdict
from pathlib import Path
root=Path(__file__).resolve().parent.parent
cache=root/'tools/cache/battle-data'
lock=json.loads((root/'tools/localization/battle-inputs.json').read_text())
def rows(name):
    raw=(cache/name).read_bytes()
    assert hashlib.sha256(raw).hexdigest()==lock['sha256'][name],name
    return csv.DictReader(raw.decode('utf-8').splitlines())
moves={int(r['id']):r['identifier'] for r in rows('moves.csv')}
native=defaultdict(set)
for r in rows('pokemon_moves.csv'):
    native[(int(r['pokemon_id']),moves[int(r['move_id'])],int(r['pokemon_move_method_id']))].add(int(r['version_group_id']))
text=(root/'js/data/battle-dex.js').read_text(encoding='utf-8')
data=json.loads(text[text.index('})(')+3:text.rindex(');')])['learnsets']
count=0
for scope in ['species','forms']:
    for key,repertoire in data[scope].items():
        for move,sources in repertoire.items():
            assert sources,(scope,key,move)
            for pid,method,versions in sources:
                assert set(versions)==native[(pid,move,method)],(scope,key,move,pid,method)
                count+=len(versions)
assert data['commit']==lock['commit']
print(f'PASS LEARNSET_SOURCES: {count} version-specific source references; fabricated=0; input hashes verified')
