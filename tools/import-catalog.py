#!/usr/bin/env python3
"""Add reviewed SpriteCollab species only. Pinned inputs, cached hashes and credits.
Run from the repository root: python -X utf8 tools/import-catalog.py
Existing species, sheets, progression IDs and saves are never rewritten.
"""
import concurrent.futures,csv,hashlib,importlib.util,io,json,re,threading,urllib.request
from pathlib import Path
from PIL import Image
ROOT=Path(__file__).resolve().parent.parent
CONFIG=ROOT/'tools/localization/catalog-expansion.json'
cfg=json.loads(CONFIG.read_text());REV=cfg['revision'];CACHE=ROOT/'tools/cache/catalog-expansion/raw';CACHE.mkdir(parents=True,exist_ok=True)
BASE=f'https://raw.githubusercontent.com/PMDCollab/SpriteCollab/{REV}'
LOCK=ROOT/'tools/localization/catalog-assets.json';old=json.loads(LOCK.read_text()) if LOCK.exists() else {};hashes={};mutex=threading.Lock()
def fetch(rel):
    path=CACHE/rel;path.parent.mkdir(parents=True,exist_ok=True)
    raw=path.read_bytes() if path.exists() else urllib.request.urlopen(urllib.request.Request(BASE+'/'+rel,headers={'User-Agent':'PokeSurvivor-catalog-import'}),timeout=90).read()
    h=hashlib.sha256(raw).hexdigest()
    if rel in old.get('sources',{}):assert h==old['sources'][rel], 'Pinned source changed: '+rel
    path.write_bytes(raw)
    with mutex:hashes[rel]=h
    return raw
spec=importlib.util.spec_from_file_location('sprites',ROOT/'tools/fetch_sprites.py');sprite=importlib.util.module_from_spec(spec);spec.loader.exec_module(sprite)
sprite.fetch=lambda url,*args:fetch(url.split(BASE+'/')[1])
ATTACK=['Attack','Strike','Swing','Shoot','Double'];WANT=sprite.WANT+['Strike','Swing','Double','Hop','Rotate']
files=[];records=[]
def import_set(dex,path,shiny=False,ref=None):
    prefix='sprite/'+path;xml=fetch(prefix+'/AnimData.xml');anims,shadow=sprite.parse_animdata(xml.decode('utf-8'))
    assert sprite.resolve(anims,'Idle')[1] and sprite.resolve(anims,'Walk')[1]
    attack=next((n for n in ATTACK if sprite.resolve(anims,n)[1]),None);assert attack, 'No real attack: '+path
    out={};dest=ROOT/'assets/pokemon'/str(dex)/('s' if shiny else '');dest.mkdir(parents=True,exist_ok=True)
    for want in WANT:
        candidates=([attack] if want=='Attack' else [want]+sprite.FALLBACK.get(want,[]))
        source,geom=next(((s,g) for n in candidates for s,g in [sprite.resolve(anims,n)] if g),(None,None))
        if not geom:continue
        raw=fetch(prefix+'/'+source+'-Anim.png');im=Image.open(io.BytesIO(raw)).convert('RGBA');w,h=im.size
        assert geom['w']>0 and geom['h']>0 and w%geom['w']==0 and h%geom['h']==0 and h//geom['h']>=8
        assert geom['n']>0 and len(geom['d'])==geom['n'] and min(geom['d'])>0 and geom['n']<=w//geom['w']
        # SpriteCollab action files include same-sized shadow sheets.
        shadow_raw=fetch(prefix+'/'+source+'-Shadow.png');anchor=sprite.ground_anchor(shadow_raw,geom['w'],geom['h'])
        ax,ay=anchor or (geom['w']/2,geom['h']*.78)
        target=dest/(want+'.png');sprite.save_optimized(raw,str(target))
        meta={'w':geom['w'],'h':geom['h'],'n':geom['n'],'r':h//geom['h'],'d':geom['d'],'ax':ax,'ay':ay};out[want]=meta
        with mutex:files.append({'file':target.relative_to(ROOT).as_posix(),'sha256':hashlib.sha256(target.read_bytes()).hexdigest(),'source':prefix+'/'+source+'-Anim.png','sourceAction':source,'action':want,'shiny':shiny,'dex':dex,'w':w,'h':h})
    assert {'Idle','Walk','Attack'}<=set(out)
    credit=fetch(prefix+'/credits.txt').decode('utf-8');return out,shadow,credit,attack

def one(row):
    dex=row['dex'];normal,shadow,credits,attack=import_set(dex,row['path']);meta={'s':shadow,'a':normal}
    shinycredits=''
    if row.get('shiny'):
        shiny,_,shinycredits,_=import_set(dex,row['shiny'],True,normal);meta['sh']=1
        different={k:v for k,v in shiny.items() if normal.get(k)!=v}
        if different:meta['sa']=different
        missing=[k for k in normal if k not in shiny]
        if missing:meta['sm']=missing
    idle=normal['Idle'];im=Image.open(ROOT/f'assets/pokemon/{dex}/Idle.png').convert('RGBA').crop((0,0,idle['w'],idle['h']));box=im.getchannel('A').point(lambda a:255 if a>40 else 0).getbbox()
    if box and idle['ay']-(box[3]-1)>=1:meta['hv']=1
    records.append({'dex':dex,'path':row['path'],'shiny':row.get('shiny'),'attack':attack,'credits':credits,'shinyCredits':shinycredits})
    print('IMPORTED',dex,row['path'],'shiny',bool(row.get('shiny')),flush=True);return dex,meta
metas=dict(concurrent.futures.ThreadPoolExecutor(max_workers=5).map(one,cfg['additions']))
# Preserve every old row byte-for-byte; replace only these reviewed IDs on reruns.
p=ROOT/'js/data/sprites-meta.js';raw=p.read_bytes();lines=raw.splitlines(keepends=True);ids=set(metas)
lines=[ln for ln in lines if not (m:=re.match(rb'\s*(\d+):',ln)) or int(m[1]) not in ids]
idx=next(i for i,ln in enumerate(lines) if ln.strip()==b'};');lines[idx:idx]=[(f'  {d}: '+json.dumps(m,separators=(',',':'))+',\n').encode() for d,m in sorted(metas.items())];p.write_bytes(b''.join(lines))
# Read the existing pinned PokeAPI tables, not ad-hoc invented base stats.
battle=ROOT/'tools/cache/battle-data'
inputlock=json.loads((ROOT/'tools/localization/battle-inputs.json').read_text())
for name,h in inputlock['sha256'].items():assert hashlib.sha256((battle/name).read_bytes()).hexdigest()==h,name
def table(name):return list(csv.DictReader((battle/name).open(encoding='utf-8')))
pokemon={int(r['id']):r for r in table('pokemon.csv')};species={int(r['id']):r for r in table('pokemon_species.csv')};stats={};types={}
for r in table('pokemon_stats.csv'):stats.setdefault(int(r['pokemon_id']),{})[int(r['stat_id'])]=int(r['base_stat'])
typenames=['','normal','fighting','flying','poison','ground','rock','bug','ghost','steel','fire','water','grass','electric','psychic','ice','dragon','dark','fairy']
for r in table('pokemon_types.csv'):
 if 0<int(r['type_id'])<len(typenames):types.setdefault(int(r['pokemon_id']),[]).append(typenames[int(r['type_id'])])
namefile=CACHE/'species-names.csv';loclock=json.loads((ROOT/'tools/localization/input-lock.json').read_text())['pokemon_species_names.csv']
if not namefile.exists():namefile.write_bytes(urllib.request.urlopen(loclock['url'],timeout=60).read())
assert hashlib.sha256(namefile.read_bytes()).hexdigest()==loclock['sha256']
names={}
for r in csv.DictReader(namefile.open(encoding='utf-8')):names.setdefault(int(r['pokemon_species_id']),{})[r['local_language_id']]=r['name']
p=ROOT/'js/data/pokedex.js';lines=p.read_bytes().splitlines(keepends=True);lines=[ln for ln in lines if not (m:=re.search(rb'"dex":(\d+)',ln)) or int(m[1]) not in ids]
idx=next(i for i,ln in enumerate(lines) if ln.strip()==b'];');rows=[]
for r in cfg['additions']:
    d=r['dex'];pid=r['battleId'];st=stats[pid];bst=sum(st.values());s=species[d];leg=s['is_legendary']=='1' or s['is_mythical']=='1'
    row={'dex':d,'name':names[d].get('7',pokemon[pid]['identifier']),'types':types[pid],'hp':round(70+st[1]*.45),'spd':round(78+st[6]*.42),'atk':round(.70+max(st[2],st[4])*.0055,2),'rarity':5 if leg or bst>=580 else 4 if bst>=495 else 3 if bst>=410 else 2 if bst>=320 else 1,'bst':bst,'starter':False,'gen':next(i for i,end in enumerate([151,251,386,493,649,721,809,905,1025],1) if d<=end),'battleId':pid,'skillPool':r['skillPool'],'opening':r['opening']}
    if leg:row['leg']=True
    if r['spriteForm']:row['spriteForm']=r['spriteForm']
    rows.append(row)
lines[idx:idx]=[('  '+json.dumps(r,ensure_ascii=False,separators=(',',':'))+',\n').encode() for r in rows];p.write_bytes(b''.join(lines))
# Artist names and path-specific credits (including nested female/shiny folders).
artist_names={}
for line in fetch('credit_names.txt').decode('utf-8').splitlines()[1:]:
    parts=line.split('\t')
    if len(parts)>=3:artist_names[parts[1].strip()]=(parts[0].strip(),parts[2].strip())
credit=['# Additional catalog sprite credits','','Source: https://github.com/PMDCollab/SpriteCollab/tree/'+REV,'','License: CC BY-NC 4.0. Original authors retain attribution.','']
for r in sorted(records,key=lambda x:x['dex']):
    credit.append('## #'+str(r['dex'])+' — '+r['path'])
    authors=set()
    for line in (r['credits']+'\n'+r['shinyCredits']).splitlines():
        parts=line.split('\t')
        if len(parts)>1:authors.add(parts[1].strip())
    for author in sorted(authors):
        name,url=artist_names.get(author,(author,''));credit.append('- '+name+(' — '+url if url else ''))
    credit.append('')
(ROOT/'assets/pokemon/CATALOG-CREDITS.md').write_bytes(('\n'.join(credit).rstrip()+'\n').encode('utf-8'))
LOCK.write_text(json.dumps({'revision':REV,'sources':dict(sorted(hashes.items())),'files':sorted(files,key=lambda r:r['file']),'species':sorted(records,key=lambda r:r['dex'])},ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
# Add name mappings without disturbing the previously reviewed 966 names.
terms_path=ROOT/'tools/localization/zh-cn-terms.json';terms=json.loads(terms_path.read_text())
name_map={};context={}
for r in rows:
    zh=names[r['dex']]['12'];name_map[r['name']]=zh;context[str(r['dex'])]=zh;terms['species'][str(r['dex'])]={'source':r['name'],'zh':zh}
terms.setdefault('contexts',{}).setdefault('pokemon',{}).update(context)
terms_path.write_bytes((json.dumps(terms,ensure_ascii=False,indent=2)+'\n').encode('utf-8'))
marker='/* catalog-expansion names */';p=ROOT/'js/data/lang-zh-cn-names.js';text=p.read_text().split(marker)[0].rstrip();text+='\n'+marker+'\nG.I18n.add('+json.dumps(name_map,ensure_ascii=False,separators=(',',':'))+', "zh-CN");\nG.I18n.add('+json.dumps(context,ensure_ascii=False,separators=(',',':'))+', "zh-CN", "pokemon");\n';p.write_bytes(text.encode('utf-8'))
print('PASS CATALOG IMPORT:',len(rows),'species;',len(files),'sheets; pinned sources and path-specific credits recorded')

# National-number ordering without rewriting existing row contents.
for name,pattern in [('pokedex.js',rb'"dex":(\d+)'),('sprites-meta.js',rb'^\s*(\d+):')]:
    p=ROOT/'js/data'/name;lines=p.read_bytes().splitlines(keepends=True)
    positions=[i for i,line in enumerate(lines) if re.search(pattern,line)]
    rows=sorted((lines[i] for i in positions),key=lambda line:int(re.search(pattern,line)[1]))
    for i,line in zip(positions,rows):lines[i]=line
    p.write_bytes(b''.join(lines))
