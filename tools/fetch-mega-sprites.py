#!/usr/bin/env python3
"""Cache audited SpriteCollab Mega animations without replacing ordinary species art."""
import csv, hashlib, importlib.util, json, sys
from pathlib import Path
from concurrent.futures import ThreadPoolExecutor
ROOT=Path(__file__).resolve().parent.parent
sys.path.insert(0,str(ROOT/'tools/cache/python'))
spec=importlib.util.spec_from_file_location('sprite_tools',ROOT/'tools/fetch_sprites.py')
s=importlib.util.module_from_spec(spec);spec.loader.exec_module(s)
cache=ROOT/'tools/cache/battle-data'
tracker=json.loads((cache/'sprite-tracker.json').read_text(encoding='utf-8'))
pokemon={int(r['id']):r for r in csv.DictReader((cache/'pokemon.csv').open())}
jobs=[]
for r in csv.DictReader((cache/'pokemon_forms.csv').open()):
    if r['is_mega']!='1':continue
    pid=int(r['pokemon_id']);dex=int(pokemon[pid]['species_id']);name=r['form_identifier'].replace('-','_').lower()
    for key,node in tracker.get(f'{dex:04d}',{}).get('subgroups',{}).items():
        if node.get('name','').lower()==name and node.get('sprite_files'):
            jobs.append((pid,dex,key,node));break
def work(job):
    pid,dex,key,node=job;dest=ROOT/'assets/pokemon'/str(pid);record=cache/f'mega-{pid}.json'
    if record.exists():
        old=json.loads(record.read_text());
        if all((dest/f'{name}.png').exists() for name in old['meta']['a']):return pid,old
    url=f'{s.BASE}/{dex:04d}/{key}'
    xml=s.fetch(url+'/AnimData.xml')
    if not xml:return pid,None
    animations,shadow=s.parse_animdata(xml.decode('utf-8'))
    meta=s.download_set(url,str(dest),animations)
    if not {'Idle','Walk','Attack'}<=set(meta):return pid,None
    credit=s.fetch(url+'/credits.txt') or b''
    row={'dex':dex,'form':node['name'],'source':url,'license':'CC BY-NC 4.0; existing SpriteCollab asset terms',
         'credit':credit.decode('utf-8','replace'),'trackerCredit':node.get('sprite_credit'),
         'meta':{'s':shadow,'a':meta},'sha256':{p.name:hashlib.sha256(p.read_bytes()).hexdigest() for p in sorted(dest.glob('*.png'))}}
    record.write_text(json.dumps(row,ensure_ascii=False),encoding='utf-8');print('Mega art',pid,dex,flush=True);return pid,row
records={pid:r for pid,r in ThreadPoolExecutor(max_workers=6).map(work,jobs) if r}
meta={pid:r['meta'] for pid,r in records.items()}
(ROOT/'js/data/mega-sprites.js').write_text('/* Generated audited SpriteCollab forms; see tools/localization/mega-art.json. */\nG.MegaSprites='+json.dumps(meta,separators=(',',':'))+';\nObject.assign(G.SPRITE_META,G.MegaSprites);\n',encoding='utf-8')
(ROOT/'tools/localization/mega-art.json').write_text(json.dumps(records,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
(ROOT/'assets/pokemon/mega-credits.json').write_text(json.dumps({pid:{k:v for k,v in r.items() if k in ['dex','form','source','license','credit','trackerCredit']} for pid,r in records.items()},ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
print('PASS MEGA_ART:',len(records),'animated forms; other Mega forms retain species art with a procedural transformation aura',flush=True)
