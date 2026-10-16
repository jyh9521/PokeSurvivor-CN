"""Import selected CC0 hyperpixel loops from the author's public preview files."""
from pathlib import Path
from urllib.request import Request,urlopen
from urllib.parse import quote
import hashlib,json
ROOT=Path(__file__).resolve().parent.parent
BASE='https://html-classic.itch.zone/html/13984483/equalized_ogg/'
TRACKS={'menu':['02 Knight dawn town','08 Knight day town','19 Party day encampment'],'battle':['04 Knight morning road','06 Knight morning hills','21 Party day forest','28 Robot morning training'],'boss':['17 Knight midnight castle','33 Robot night alert']}
out=ROOT/'assets/music';out.mkdir(parents=True,exist_ok=True)
lock=json.loads((out/'credits.json').read_text()) if (out/'credits.json').exists() else {}
expected={t['file']:t['sha256'] for t in lock.get('tracks',[])}
manifest={'author':'hyperpixel','license':'CC0-1.0','source':'https://hyperpixel.itch.io/33-free-chiptune-loops','tracks':[]};runtime={}
for group,names in TRACKS.items():
 runtime[group]=[]
 for title in names:
  file=title[:2]+'.ogg';url=BASE+quote(title+'.ogg');dest=out/file
  if not dest.exists(): dest.write_bytes(urlopen(Request(url,headers={'User-Agent':'Mozilla/5.0'}),timeout=45).read())
  b=dest.read_bytes();assert b[:4]==b'OggS'
  if 'assets/music/'+file in expected: assert hashlib.sha256(b).hexdigest()==expected['assets/music/'+file], 'Music source hash mismatch'
  row={'title':title,'file':'assets/music/'+file,'sha256':hashlib.sha256(b).hexdigest(),'bytes':len(b),'source':url,'group':group}
  manifest['tracks'].append(row);runtime[group].append({'title':title,'file':row['file']});print('IMPORTED',group,file,len(b))
(out/'credits.json').write_text(json.dumps(manifest,indent=2)+'\n',encoding='utf-8')
(out/'LICENSE.txt').write_text('33 Free Chiptune Loops — hyperpixel\nSource: https://hyperpixel.itch.io/33-free-chiptune-loops\nLicense: CC0 1.0 Universal\nhttps://creativecommons.org/publicdomain/zero/1.0/\nOriginal titles and download hashes are recorded in credits.json.\n',encoding='utf-8')
(ROOT/'js/data/bgm-tracks.js').write_text('/* Original CC0 loops by hyperpixel; see assets/music/credits.json. */\nG.BGM_TRACKS='+json.dumps(runtime,indent=2)+';\n',encoding='utf-8')
print('PASS MUSIC_IMPORT:',len(manifest['tracks']),'local tracks; CC0 source and SHA256 recorded')
