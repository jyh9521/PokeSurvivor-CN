/* Six deterministic original chiptune miniatures. CC0-1.0, no sampled audio. */
const fs=require('fs'),crypto=require('crypto');
const tracks=[
 ['lantern-garden','Lantern Garden','menu',92,[60,65,57,67],[0,4,7,11,7,4,2,7]],
 ['harbor-lights','Harbor Lights','menu',104,[62,59,67,57],[7,4,2,0,4,9,7,2]],
 ['canopy-run','Canopy Run','battle',128,[64,60,67,62],[0,7,4,12,9,7,4,2]],
 ['crystal-current','Crystal Current','battle',116,[57,62,65,64],[0,3,7,10,12,7,5,3]],
 ['ember-trail','Ember Trail','battle',140,[62,58,65,60],[0,7,10,12,7,3,5,10]],
 ['summit-trial','Summit Trial','boss',152,[52,55,50,57],[0,7,12,10,7,3,2,7]]
],rate=22050,credits=[];
const freq=n=>440*2**((n-69)/12);
for(const[id,title,group,bpm,chords,melody]of tracks){
 const beat=60/bpm,duration=beat*96,n=Math.ceil(duration*rate),mix=new Float32Array(n);let noise=17;
 function tone(at,len,note,amp,kind){const start=Math.floor(at*rate),count=Math.floor(len*rate),f=freq(note);for(let i=0;i<count&&start+i<n;i++){const t=i/rate,env=Math.min(1,t/.008)*Math.exp(-t/(len*.45))*Math.min(1,(len-t)/.025),phase=t*f;let w=kind==='bass'?Math.sin(2*Math.PI*phase):2/Math.PI*Math.asin(Math.sin(2*Math.PI*phase));mix[start+i]+=w*amp*env;}}
 for(let step=0;step<384;step++){
  const at=step*beat/4,ch=chords[Math.floor(step/16)%4],phrase=Math.floor(step/64);
  if(step%2===0)tone(at,beat*.38,ch+12+melody[(step/2+phrase)%melody.length],.19,'lead');
  if(step%4===0)tone(at,beat*.8,ch-12+(step%8?7:0),.22,'bass');
  if(step%8===2||step%8===6)for(const off of [0,4,7])tone(at,beat*.75,ch+off,.045,'chord');
  const start=Math.floor(at*rate);for(let i=0;i<rate*.075&&start+i<n;i++){const t=i/rate;noise=(Math.imul(noise,1664525)+1013904223)>>>0;const env=Math.exp(-t*65),hat=(noise/4294967296*2-1)*.035;const kick=step%4===0?Math.sin(2*Math.PI*(85*t+30*(1-Math.exp(-t*25))/25))*.22:0;const snare=step%8===4?(noise/4294967296*2-1)*.1:0;mix[start+i]+=(hat+kick+snare)*env;}
 }
 const b=Buffer.alloc(44+n*2);b.write('RIFF');b.writeUInt32LE(b.length-8,4);b.write('WAVEfmt ',8);b.writeUInt32LE(16,16);b.writeUInt16LE(1,20);b.writeUInt16LE(1,22);b.writeUInt32LE(rate,24);b.writeUInt32LE(rate*2,28);b.writeUInt16LE(2,32);b.writeUInt16LE(16,34);b.write('data',36);b.writeUInt32LE(n*2,40);
 for(let i=0;i<n;i++){const fade=Math.min(1,i/(rate*.04),(n-i)/(rate*.15));b.writeInt16LE(Math.round(Math.tanh(mix[i])*fade*28000),44+i*2);}
 const file='assets/music/'+id+'.wav';fs.writeFileSync(file,b);credits.push({title,file,group,bpm,duration,bytes:b.length,sha256:crypto.createHash('sha256').update(b).digest('hex')});
}
fs.writeFileSync('assets/music/originals.json',JSON.stringify({license:'CC0-1.0',author:'PokeSurvivor-CN contributors',source:'tools/generate-original-music.cjs; original procedural compositions, no external samples',tracks:credits},null,2)+'\n');console.log('PASS ORIGINAL_MUSIC: six original reproducible PCM tracks');
