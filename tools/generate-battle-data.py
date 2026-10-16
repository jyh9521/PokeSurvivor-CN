#!/usr/bin/env python3
"""Rebuild offline battle data from cached, hash-locked PokeAPI CSV inputs."""
import csv, hashlib, json, re, sys, urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
CACHE = ROOT / 'tools/cache/battle-data'
FILES = ['pokemon.csv', 'pokemon_stats.csv', 'pokemon_species.csv', 'pokemon_abilities.csv',
         'abilities.csv', 'ability_names.csv', 'moves.csv', 'move_names.csv', 'pokemon_moves.csv', 'pokemon_forms.csv', 'pokemon_types.csv', 'languages.csv']
lock_path = ROOT / 'tools/localization/battle-inputs.json'
if '--download' in sys.argv:
    lock=json.loads((ROOT/'tools/localization/battle-inputs.json').read_text())
    CACHE.mkdir(parents=True,exist_ok=True)
    for name,expected in lock['sha256'].items():
        dest=CACHE/name
        if dest.exists() and hashlib.sha256(dest.read_bytes()).hexdigest()==expected: continue
        url=f"https://raw.githubusercontent.com/PokeAPI/pokeapi/{lock['commit']}/data/v2/csv/{name}"
        raw=urllib.request.urlopen(url,timeout=90).read()
        assert hashlib.sha256(raw).hexdigest()==expected, 'Downloaded source hash mismatch: '+name
        dest.write_bytes(raw)
hashes = {f: hashlib.sha256((CACHE/f).read_bytes()).hexdigest() for f in FILES}
if lock_path.exists():
    assert json.loads(lock_path.read_text())['sha256'] == hashes, 'Battle input hash mismatch'
else:
    lock_path.write_text(json.dumps({'source':'https://github.com/PokeAPI/pokeapi/tree/master/data/v2/csv', 'sha256':hashes}, indent=2)+'\n')
def rows(f):
    return list(csv.DictReader((CACHE/f).open(encoding='utf-8', newline='')))
pokemon = {int(r['id']):r for r in rows('pokemon.csv')}
species = {int(r['id']):r for r in rows('pokemon_species.csv')}
stats = {}
for r in rows('pokemon_stats.csv'):
    stats.setdefault(int(r['pokemon_id']), {})[int(r['stat_id'])] = int(r['base_stat'])
abilities = {int(r['id']):r['identifier'] for r in rows('abilities.csv')}
ability_names = {}
for r in rows('ability_names.csv'):
    if r['local_language_id'] in ['7','9','12']:
        ability_names.setdefault(int(r['ability_id']), {})[r['local_language_id']] = r['name']
primary = {}
for r in rows('pokemon_abilities.csv'):
    if r['slot'] == '1': primary[int(r['pokemon_id'])] = int(r['ability_id'])
moves = {int(r['id']):r for r in rows('moves.csv')}
move_names = {}
for r in rows('move_names.csv'):
    if r['local_language_id'] in ['7','9','12']:
        move_names.setdefault(moves[int(r['move_id'])]['identifier'], {})[r['local_language_id']] = r['name']
implemented = set(re.findall(r"id: '([a-z0-9-]+)'", (ROOT/'js/data/moves.js').read_text(encoding='utf-8')))
implemented.update(['protect','double-team','iron-defense','light-screen','focus-energy','ingrain','recover','counter','substitute','leech-seed','wish','icy-wind','surf','whirlpool','stealth-rock','shadow-sneak','hyper-beam','psychic','explosion','earth-power','air-slash','bullet-seed','dragon-pulse','aqua-jet'])
aliases={'petal-blizzard':'leaf-storm','grass-knot':'giga-drain'}
learned = {}
for r in rows('pokemon_moves.csv'):
    move = moves[int(r['move_id'])]['identifier']
    if move in aliases.values(): continue
    move=aliases.get(move,move)
    if move in implemented: learned.setdefault(int(r['pokemon_id']),set()).add(move)
types_by_id = dict(enumerate(['normal','fighting','flying','poison','ground','rock','bug','ghost','steel','fire','water','grass','electric','psychic','ice','dragon','dark','fairy'],1))
types = {}
for r in rows('pokemon_types.csv'):
    if int(r['type_id']) in types_by_id: types.setdefault(int(r['pokemon_id']),[]).append(types_by_id[int(r['type_id'])])
mega = {}
for r in rows('pokemon_forms.csv'):
    if r['is_mega'] != '1': continue
    pid=int(r['pokemon_id']);dex=int(pokemon[pid]['species_id'])
    mega.setdefault(dex,[]).append({'id':pid,'name':r['form_identifier'],'stats':[stats[pid][i] for i in range(1,7)],'types':types.get(pid,[]),'ability':{'id':abilities.get(primary.get(pid),''),'en':ability_names.get(primary.get(pid),{}).get('9',''),'es':ability_names.get(primary.get(pid),{}).get('7',''),'zh':ability_names.get(primary.get(pid),{}).get('12','')}})
dexes = [int(d) for d in re.findall(r'"dex":(\d+)', (ROOT/'js/data/pokedex.js').read_text(encoding='utf-8'))]
out = {}
for dex in dexes:
    aid=primary[dex]; names=ability_names[aid]
    out[dex]={'stats':[stats[dex][i] for i in range(1,7)],'name':pokemon[dex]['identifier'],
              'family':int(species[dex]['evolution_chain_id']), 'height':int(pokemon[dex]['height']), 'weight':int(pokemon[dex]['weight']),
              'ability':{'id':abilities[aid],'en':names.get('9',abilities[aid]),'es':names.get('7',names.get('9','')),'zh':names.get('12',names.get('9',''))},
              'learned':sorted(learned.get(dex,set())), 'mega':mega.get(dex,[])}
data={'species':out,'moveClasses':{r['identifier']:['status','physical','special'][int(r['damage_class_id'])-1] for r in moves.values()},'moveNames':{k:v for k,v in move_names.items() if k in implemented}}
for canonical,legacy in aliases.items(): data['moveClasses'][legacy]=data['moveClasses'][canonical]
data['legacyAliases']=aliases
text=json.dumps(data,ensure_ascii=False,separators=(',',':'))
(ROOT/'js/data/battle-dex.js').write_text('/* Generated by tools/generate-battle-data.py; offline PokeAPI source, see battle-inputs.json. */\n(function(d){if(typeof module!=="undefined"&&module.exports)module.exports=d;else G.BattleDex=d;})('+text+');\n',encoding='utf-8')
print(f'PASS BATTLE_DATA: {len(out)} species; six exact base stats; primary abilities; learned moves; {sum(bool(v["mega"]) for v in out.values())} Mega-capable species')
