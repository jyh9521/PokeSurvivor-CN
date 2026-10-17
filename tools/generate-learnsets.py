#!/usr/bin/env python3
"""Attach historical, source-addressable learnsets without changing species identity.

Only exact catalog forms and their linear pre-evolutions qualify. Descendants,
siblings, role kits and minimum-count padding never confer compatibility.
"""
import csv
import hashlib
import json
from collections import defaultdict
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
CACHE = ROOT / 'tools/cache/battle-data'
LOCK = json.loads((ROOT/'tools/localization/battle-inputs.json').read_text())

def rows(name):
    raw = (CACHE/name).read_bytes()
    assert hashlib.sha256(raw).hexdigest() == LOCK['sha256'][name], name
    return csv.DictReader(raw.decode('utf-8').splitlines())

def build():
    import re
    path = ROOT/'js/data/battle-dex.js'
    raw = path.read_text(encoding='utf-8')
    data = json.loads(raw[raw.index('})(')+3:raw.rindex(');')])
    catalog = [json.loads(m[1]) for m in re.finditer(r'^\s*(\{"dex".*\}),?$', (ROOT/'js/data/pokedex.js').read_text(encoding='utf-8'), re.M)]
    species = {int(r['id']):r for r in rows('pokemon_species.csv')}
    pokemon = {int(r['id']):r for r in rows('pokemon.csv')}
    moves = {int(r['id']):r['identifier'] for r in rows('moves.csv')}
    implemented = set()
    for file in ['moves.js','battle-moves.js','expansion-moves.js']:
        implemented.update(re.findall(r"id:\s*'([a-z0-9-]+)'",(ROOT/'js/data'/file).read_text(encoding='utf-8')))
    implemented.update(['petal-blizzard','grass-knot','transform','sketch','hidden-power','struggle','splash','teleport','sticky-thread'])
    native = defaultdict(lambda:defaultdict(lambda:defaultdict(set)))
    versions = set()
    for r in rows('pokemon_moves.csv'):
        v,method = int(r['version_group_id']),int(r['pokemon_move_method_id'])
        versions.add(v)
        move = moves[int(r['move_id'])]
        if move in implemented:
            native[int(r['pokemon_id'])][move][method].add(v)
    regional_pre = {862:[10175,10174],863:[10161],864:[10173],865:[10166],
        866:[10168,439],867:[10179],902:[10247],903:[10235],904:[10234],980:[10253]}
    records = {}
    def record(mon):
        dex,pid = mon['dex'],mon.get('battleId',mon['dex'])
        sources = [pid]
        if dex in regional_pre:
            sources.extend(regional_pre[dex])
        else:
            pre = species[dex]['evolves_from_species_id']
            while pre:
                sources.append(int(pre))
                pre = species[int(pre)]['evolves_from_species_id']
        return {move:[[source,method,sorted(vs)]
            for source in sources for method,vs in native[source].get(move,{}).items()]
            for move in sorted(set().union(*(set(native[s]) for s in sources)))}
    for mon in catalog:
        records[str(mon['dex'])] = record(mon)
    special_raw=(ROOT/'js/data/special-data.js').read_text(encoding='utf-8')
    variants=json.loads(special_raw[special_raw.index('})(')+3:special_raw.rindex(');')])['variants']
    forms={}
    # Battle-only cosmetic/state forms preserve their base's acquired learnset.
    inherited_form={10143:778,10120:718}
    for form in variants:
        pid=inherited_form.get(form['id'],form['id'])
        forms[str(form['id'])]=record({'dex':form['dex'],'battleId':pid})
    data['learnsets'] = {'schema':1,'commit':LOCK['commit'],
        'policy':'historical-union-exact-form-and-linear-ancestors',
        'versionGroups':sorted(versions),
        'methods':{'1':'level-up','2':'egg','3':'tutor','4':'machine',
            '5':'stadium-surfing-pikachu','6':'light-ball-egg',
            '7':'colosseum-purification','8':'xd-shadow','9':'xd-purification',
            '10':'form-change','11':'zygarde-cube','12':'train'},
        'regionalAncestors':regional_pre,'species':records,'forms':forms,
        'pokemonNames':{str(pid):r['identifier'] for pid,r in pokemon.items()}}
    path.write_text('/* Generated offline battle identity + source-addressable historical learnsets. */\n'
        '(function(d){if(typeof module!=="undefined"&&module.exports)module.exports=d;else G.BattleDex=d;})('
        +json.dumps(data,ensure_ascii=False,separators=(',',':'))+');\n',encoding='utf-8')
    print('PASS LEARNSET_DATA:',len(records),'species;',sum(map(len,records.values())),
          'source-backed species/moves; version groups',min(versions),'-',max(versions))

if __name__ == '__main__':
    build()
