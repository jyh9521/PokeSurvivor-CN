#!/usr/bin/env python3
"""Pinned, additive SpriteCollab import. Originals/old seven actions stay intact.
Run: python -X utf8 tools/fetch_extra_animations.py [--limit N] [--workers N]
Every image includes full frame geometry/timing, raw and decoded pixel hashes,
and the original authors' credits. Only true extra source actions are imported.
"""
import argparse, concurrent.futures, hashlib, importlib.util, json, pathlib, time, urllib.request, urllib.error

ROOT = pathlib.Path(__file__).resolve().parent.parent
REV = '392fc81d5190ceca40c08ef4c754f226458b5f59'
BASE = 'https://raw.githubusercontent.com/PMDCollab/SpriteCollab/' + REV
CACHE = ROOT / 'tools/cache/extra-animations' / REV
ACTIONS = ['Strike', 'Swing', 'Double', 'Hop', 'Rotate']
spec = importlib.util.spec_from_file_location('original_sprite_tools', ROOT/'tools/fetch_sprites.py')
original = importlib.util.module_from_spec(spec)
spec.loader.exec_module(original)
sha = lambda b: hashlib.sha256(b).hexdigest()

def fetch(rel):
    target = CACHE / rel
    absent = pathlib.Path(str(target)+'.missing')
    if target.exists(): return target.read_bytes()
    if absent.exists(): return None
    for attempt in range(4):
        try:
            with urllib.request.urlopen(urllib.request.Request(BASE+'/'+rel, headers={'User-Agent':'PokeSurvivor-CN-assets'}), timeout=25) as r: data=r.read()
            target.parent.mkdir(parents=True, exist_ok=True); target.write_bytes(data); return data
        except urllib.error.HTTPError as e:
            if e.code == 404:
                absent.parent.mkdir(parents=True, exist_ok=True); absent.write_text('404 at '+REV); return None
            if attempt == 3: raise
        except Exception:
            if attempt == 3: raise
        time.sleep(attempt+1)

def species(dex):
    tag=f'sprite/{dex:04d}'
    xml=fetch(tag+'/AnimData.xml')
    if not xml: return {'dex':dex, 'normal':{}, 'shiny':{}}
    normal=original.parse_animdata(xml.decode('utf8'))[0]
    wanted=[a for a in ACTIONS if a in normal and 'copyOf' not in normal[a]]
    result={'dex':dex, 'normal':{}, 'shiny':{}}
    if not wanted: return result
    for shiny in [False,True]:
        if shiny and not (ROOT/f'assets/pokemon/{dex}/s').exists(): continue
        source=tag+('/0000/0001' if shiny else '')
        sx=fetch(source+'/AnimData.xml') if shiny else xml
        if not sx: continue
        anims=original.parse_animdata(sx.decode('utf8'))[0]
        entries={}
        credits=None
        for action in wanted:
            src,geom=original.resolve(anims,action)
            if not geom: continue
            # An alias to an old action adds no visual variety, so skip it.
            if src not in ACTIONS: continue
            png=fetch(source+'/'+src+'-Anim.png')
            if not png: continue
            if credits is None:
                credits=fetch(source+'/credits.txt')
                if not credits: raise ValueError('Missing authors: '+source)
            out=ROOT/f'assets/pokemon/{dex}'/('s/extra' if shiny else 'extra')
            out.mkdir(parents=True, exist_ok=True)
            target=out/(action+'.png')
            pending=target.with_suffix('.tmp.png')
            width,height=original.save_optimized(png,str(pending))
            if width%geom['w'] or height%geom['h'] or width//geom['w']!=geom['n'] or height//geom['h'] not in [1,8] or not geom['d'] or any(d<=0 for d in geom['d']):
                raise ValueError('Invalid complete sheet: '+source+'/'+src)
            shadow=fetch(source+'/'+src+'-Shadow.png')
            anchor=original.ground_anchor(shadow,geom['w'],geom['h']) if shadow else None
            if not anchor: raise ValueError('Missing foot anchor: '+source+'/'+src)
            from PIL import Image
            import io
            pixels=Image.open(io.BytesIO(png)).convert('RGBA').tobytes()
            assert pixels==Image.open(pending).convert('RGBA').tobytes(), 'Lossy conversion'
            pending.replace(target)
            entries[action]={**geom, 'r':height//geom['h'], 'ax':anchor[0], 'ay':anchor[1], 'file':'extra/'+action+'.png'}
            result.setdefault('sources',[]).append({'file':target.relative_to(ROOT).as_posix(),'source':source+'/'+src+'-Anim.png','sha256':sha(target.read_bytes()),'rawSha256':sha(png),'rgbaSha256':sha(pixels),'xmlSha256':sha(sx),'creditsSha256':sha(credits)})
        if entries:
            (out/'credits.txt').write_bytes(credits)
        result['shiny' if shiny else 'normal']=entries
    return result

def write_credits(rows):
    credits=['# Extra animation attribution','', 'Source: https://github.com/PMDCollab/SpriteCollab/tree/'+REV,'License: https://creativecommons.org/licenses/by-nc/4.0/','Full source sheets retained; lossless palette conversion only. No generated in-between art.','Original per-variant author records are in each extra/credits.txt.','']
    license=fetch('LICENSE.md')
    if not license: raise ValueError('Missing pinned asset license')
    (ROOT/'assets/pokemon/EXTRA-LICENSE.md').write_bytes(license)
    names=fetch('credit_names.txt')
    if not names: raise ValueError('Missing pinned author names')
    (ROOT/'assets/pokemon/extra-credit-names.txt').write_bytes(names)
    people={}
    for line in names.decode('utf-8-sig').splitlines()[1:]:
        parts=line.split('\t')
        if len(parts)>1: people[parts[1]]=parts[0]
    for r in rows:
        for variant,key in [('normal','normal'),('shiny','shiny')]:
            if not r[key]: continue
            rel=f"{r['dex']}/"+('s/' if variant=='shiny' else '')+'extra/credits.txt'
            ids={line.split('\t')[1] for line in (ROOT/'assets/pokemon'/rel).read_text(encoding='utf-8-sig').splitlines() if len(line.split('\t'))>1}
            authors=', '.join(sorted((people.get(uid) or uid) for uid in ids))
            credits.append(f"- #{r['dex']} {variant}: {', '.join(r[key])} — {authors} — [original records]({rel})")
    (ROOT/'assets/pokemon/EXTRA-CREDITS.md').write_text('\n'.join(credits)+'\n',encoding='utf8',newline='')

def main():
    p=argparse.ArgumentParser();p.add_argument('--limit',type=int);p.add_argument('--workers',type=int,default=16);args=p.parse_args()
    dexes=sorted(int(p.name) for p in (ROOT/'assets/pokemon').iterdir() if p.name.isdigit())
    if args.limit: dexes=dexes[:args.limit]
    rows=[]
    with concurrent.futures.ThreadPoolExecutor(max_workers=args.workers) as pool:
        jobs={pool.submit(species,d):d for d in dexes}
        for f in concurrent.futures.as_completed(jobs):
            row=f.result();rows.append(row)
            if len(rows)%25==0: print(f'{len(rows)}/{len(dexes)} species inspected',flush=True)
    rows.sort(key=lambda r:r['dex'])
    if args.limit:
        print(f'PASS IMPORT SAMPLE: inspected={len(rows)}; global metadata unchanged',flush=True)
        return
    payload={str(r['dex']):{'a':r['normal'],'sa':r['shiny']} for r in rows if r['normal']}
    (ROOT/'js/data/extra-animations.js').write_text('/* Generated by tools/fetch_extra_animations.py. SpriteCollab CC BY-NC 4.0; see assets/pokemon/EXTRA-CREDITS.md. */\nG.EXTRA_ANIMATIONS = '+json.dumps(payload,separators=(',',':'))+';\n',encoding='utf8',newline='')
    manifest={'repository':'PMDCollab/SpriteCollab','revision':REV,'license':'CC BY-NC 4.0','inspected':dexes,'sources':[s for r in rows for s in r.get('sources',[])]}
    (ROOT/'assets/pokemon/extra-animation-sources.json').write_text(json.dumps(manifest,indent=2)+'\n',encoding='utf8',newline='')
    write_credits(rows)
    print(f'PASS EXTRA IMPORT: inspected={len(rows)} species={len(payload)} sheets={len(manifest["sources"])} revision={REV}',flush=True)

if __name__=='__main__': main()
