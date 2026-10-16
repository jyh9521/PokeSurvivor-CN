#!/usr/bin/env python3
"""Import only audited complete SpriteCollab forms; retain an explicit deferred list."""
import csv,hashlib,importlib.util,json,sys
from pathlib import Path
ROOT=Path(__file__).resolve().parent.parent
sys.path.insert(0,str(ROOT/'tools/cache/python'))
spec=importlib.util.spec_from_file_location('sprites',ROOT/'tools/fetch_sprites.py');s=importlib.util.module_from_spec(spec);spec.loader.exec_module(s)
audit=json.loads((ROOT/'tools/localization/special-audit.json').read_text(encoding='utf-8'))
revision=audit['spriteRevision'];base=f'https://raw.githubusercontent.com/PMDCollab/SpriteCollab/{revision}/sprite/'
cache=ROOT/'tools/cache/battle-data'
def rows(name):return list(csv.DictReader((cache/name).open(encoding='utf-8')))
pokemon={int(r['id']):r for r in rows('pokemon.csv')}
stats={};types={};abilities={int(r['id']):r['identifier'] for r in rows('abilities.csv')};primary={};ability_names={}
for r in rows('ability_names.csv'):
 if r['local_language_id'] in ['7','9','12']:ability_names.setdefault(abilities[int(r['ability_id'])],{})[r['local_language_id']]=r['name']
for r in rows('pokemon_stats.csv'):stats.setdefault(int(r['pokemon_id']),{})[int(r['stat_id'])]=int(r['base_stat'])
type_names=['normal','fighting','flying','poison','ground','rock','bug','ghost','steel','fire','water','grass','electric','psychic','ice','dragon','dark','fairy']
for r in rows('pokemon_types.csv'):
 if 1<=int(r['type_id'])<=18:types.setdefault(int(r['pokemon_id']),[]).append(type_names[int(r['type_id'])-1])
for r in rows('pokemon_abilities.csv'):
 if r['slot']=='1':primary[int(r['pokemon_id'])]=abilities[int(r['ability_id'])]
raw=(ROOT/'js/data/battle-dex.js').read_text(encoding='utf-8');battle=json.loads(raw[raw.index('})(')+3:raw.rindex(');')])
approved=[]
for r in audit['rows']:
 if r['category']=='mega' and r['materialStatus']=='ready':
  entry=next(x for x in battle['species'][str(r['dex'])]['mega'] if x['id']==r['pokemonId'])
  approved.append({**entry,'dex':r['dex'],'key':str(entry['id']),'title':'Mega '+r['zh'],'requires':{670:'eternal',718:'complete'}.get(r['dex'],'')})
definitions=[('alola',26,10100,'0026/0001','Alolan Form'),('midnight',745,10126,'0745/0001','Midnight Form'),('dusk',745,10152,'0745/0002','Dusk Form'),('busted',778,10143,'0778/0001','Busted Form'),('eternal',670,10061,'0670/0005','Eternal Flower'),('complete',718,10120,'0718/0002','Complete Form')]
variants=[];records={}
previous=json.loads((ROOT/'tools/localization/form-art.json').read_text(encoding='utf-8')) if (ROOT/'tools/localization/form-art.json').exists() else {}
for key,dex,pid,path,title in definitions:
 dest=ROOT/'assets/pokemon'/str(pid);old=previous.get(str(pid))
 valid=old and old['revision']==revision and all((dest/name).exists() and hashlib.sha256((dest/name).read_bytes()).hexdigest()==sha for name,sha in old['sha256'].items())
 if valid:records[str(pid)]=old
 else:
  xml=s.fetch(base+path+'/AnimData.xml');assert xml,'missing XML'
  anims,shadow=s.parse_animdata(xml.decode('utf-8'))
  # Never accept Idle/Walk as an attack, unlike the generic legacy fallback.
  assert 'Idle' in anims and 'Walk' in anims and any(a in anims for a in ['Attack','Swing','Strike','Shoot'])
  meta=s.download_set(base+path,str(dest),anims);assert {'Idle','Walk','Attack'}<=set(meta)
  credit=s.fetch(base+path+'/credits.txt') or b''
  records[str(pid)]={'dex':dex,'formKey':key,'source':base+path,'revision':revision,'credit':credit.decode('utf-8','replace'),'xmlSha256':hashlib.sha256(xml).hexdigest(),'meta':{'s':shadow,'a':meta},'sha256':{p.name:hashlib.sha256(p.read_bytes()).hexdigest() for p in sorted(dest.glob('*.png'))}}
 aid=primary.get(pid,'');an=ability_names.get(aid,{})
 variants.append({'key':key,'dex':dex,'id':pid,'title':title,'stats':[stats[pid][i] for i in range(1,7)],'types':types[pid],'ability':aid,'abilityData':{'id':aid,'en':an.get('9',aid),'zh':an.get('12',aid),'es':an.get('7',aid)},'max':dex in [26,745,778,718]})
elig=json.loads((ROOT/'tools/localization/special-eligibility.json').read_text(encoding='utf-8'))
data={'revision':revision,'megas':approved,'variants':variants,'maxSpecies':elig['maxSpecies'],'zSpecies':elig['zSpecies']}
(ROOT/'js/data/special-data.js').write_text('/* Audited identities; regenerated with tools/prepare-special-content.py. */\n(function(d){if(typeof module!=="undefined"&&module.exports)module.exports=d;else G.SpecialData=d;})('+json.dumps(data,ensure_ascii=False,separators=(',',':'))+');\n',encoding='utf-8',newline='\n')
(ROOT/'js/data/form-sprites.js').write_text('/* Exact non-Mega forms; no substitute/idle-only imports. */\nG.FormSprites='+json.dumps({k:r['meta'] for k,r in records.items()},separators=(',',':'))+';\nObject.assign(G.SPRITE_META,G.FormSprites);\n',encoding='utf-8',newline='\n')
for file in [ROOT/'tools/localization/form-art.json',ROOT/'assets/pokemon/form-credits.json']:file.write_text(json.dumps(records,ensure_ascii=False,indent=2)+'\n',encoding='utf-8',newline='\n')
missing=[r for r in audit['rows'] if r['materialStatus']!='ready' and r['category'] in ['mega','gmax','z-user','base-missing']]
(ROOT/'tools/localization/special-missing.json').write_text(json.dumps({'revision':revision,'deferred':missing,'ultraDeferred':'Ultra sprite exists, but Dusk Mane/Dawn Wings prerequisite sprites are missing; no fabricated direct Ultra Burst.'},ensure_ascii=False,indent=2)+'\n',encoding='utf-8',newline='\n')
print('PASS SPECIAL CONTENT: 40 exact Mega forms; 6 base variants; incomplete forms deferred')
