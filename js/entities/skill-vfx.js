/* Layered pixel effects, bounded independently of simulation and network events. */
G.SkillVFX=(()=>{
  let effects=[];
  const hash=s=>[...s].reduce((h,c)=>(Math.imul(h,31)+c.charCodeAt(0))>>>0,7);
  const baseStyle=m=>({ 'ember':'flame','flamethrower':'jet','fire-spin':'vortex','heat-wave':'heat','flame-wheel':'wheel','will-o-wisp':'wisps','water-gun':'drops','hydro-pump':'pressure-jet','bubble':'bubble-cloud','bubble-beam':'bubble-lance','razor-leaf':'blades','leaf-storm':'leaves','giga-drain':'vine','thunder-shock':'fork','thunderbolt':'strike','discharge':'radial','confusion':'mind-orbs','psybeam':'prism','psycho-cut':'blades','rock-throw':'rock','rock-slide':'boulder-fall','spikes':'spikes','toxic-spikes':'spikes','ice-beam':'ice-lance','powder-snow':'snow','hail':'ice-rain','shadow-ball':'shadow','night-shade':'tendrils','dark-pulse':'ripple','fairy-wind':'petals','dazzling-gleam':'radial','draining-kiss':'hearts','dragon-rage':'dragon','sludge':'glob','sludge-bomb':'splash','poison-sting':'needles','toxic':'glob','mud-shot':'splash','bulldoze':'quake','meteor-mash':'metal-fall','flash-cannon':'prism','bonemerang':'blades','hex':'sigil', 'vine-whip':'vine','surf':'wave','icy-wind':'frost','whirlpool':'vortex','leech-seed':'seed','stealth-rock':'rock','earth-power':'fissure','psychic':'mind-crush','counter':'claw','substitute':'decoy','explosion':'blast','hyper-beam':'charge','dragon-pulse':'dragon','bullet-seed':'seed','shadow-sneak':'shadow','aqua-jet':'wave','seed-bomb':'seed','dragon-darts':'fork','magical-leaf':'leaves','water-shuriken':'wheel','rollout':'rock','mystical-fire':'vortex','volt-tackle':'charge','spirit-shackle':'needles','last-resort':'impact','darkest-lariat':'wheel','clanging-scales':'radial','moongeist-beam':'prism','stone-edge':'spikes','spectral-thief':'shadow','play-rough':'hearts','sparkling-aria':'ripple','giga-impact':'quake','sunsteel-strike':'lance','natures-madness':'sigil','photon-geyser':'charge','metal-claw':'claw','wing-attack':'feather','lick':'tongue','body-slam':'impact','karate-chop':'claw','bite':'jaws','bug-bite':'jaws'}[m.id]||({fire:'flame',water:'wave',grass:'vine',electric:'fork',ice:'frost',rock:'rock',ground:'fissure',psychic:'sigil',ghost:'shadow',dragon:'dragon',flying:'feather',poison:'vortex',bug:'seed',steel:'claw',fighting:'impact',dark:'jaws',fairy:'sigil',normal:'impact'}[m.type]));
  const style=m=>identities[m.id]||baseStyle(m);
  // Independent silhouettes and timing, not palette aliases. Drawing primitives
  // remain bounded (one glyph per cast); damage geometry stays in Combat.
  const identities={
    'tackle':'shoulder','wing-attack':'wings','body-slam':'body-drop','karate-chop':'chop-plane','metal-claw':'metal-talons',
    'quick-attack':'speed-lines','aerial-ace':'aerial-cross','water-gun':'water-stream','poison-sting':'barbed-sting','spirit-shackle':'shackle-arrow',
    'vine-whip':'whip-leaves','lick':'curl-tongue','razor-leaf':'serrated-leaf','bonemerang':'bone-return','psycho-cut':'psi-crescent',
    'discharge':'electric-burst','dazzling-gleam':'star-flare','psybeam':'sine-prism','flash-cannon':'metal-rail','moongeist-beam':'lunar-channel',
    'bug-bite':'mandibles','bite':'closing-fangs','rock-throw':'tumble-rock','bullet-seed':'seed-burst','spikes':'ground-spikes','toxic-spikes':'poison-barbs',
    'air-slash':'air-scissors','last-resort':'final-star','leech-seed':'root-seed','stealth-rock':'orbit-stones','natures-madness':'guardian-jaws',
    'hyper-beam':'horizontal-charge','photon-geyser':'rising-prism','shadow-sneak':'shadow-steps','aqua-jet':'jet-wake','spectral-thief':'spectral-hand'
  };
  const polygon=(c,points)=>{c.moveTo(...points[0]);for(const p of points.slice(1))c.lineTo(...p);c.closePath();};
  const star=(c,x,y,r,n=4)=>polygon(c,Array.from({length:n*2},(_,i)=>{const a=i*Math.PI/n;return[x+Math.cos(a)*r*(i%2?.3:1),y+Math.sin(a)*r*(i%2?.3:1)];}));
  const glyphs={
    shoulder(c,r,q){polygon(c,[[r*.2,-20],[r,-8],[r+12,0],[r,8],[r*.2,20]]);c.moveTo(0,-12);c.lineTo(r*.6,-6);},
    wings(c,r,q){for(const sign of [-1,1]){c.moveTo(0,0);c.quadraticCurveTo(r*.3,sign*r*.75,r,sign*8);for(let j=1;j<5;j++){c.moveTo(r*j/5,sign*r*.24);c.lineTo(r*j/5-12,sign*r*.48);}}},
    'body-drop'(c,r,q){c.ellipse(0,0,r,r*.3,0,0,Math.PI*2);c.moveTo(-r*.55,-40*(1-q));c.lineTo(r*.55,-40*(1-q));c.lineTo(r*.4,0);c.lineTo(-r*.4,0);c.closePath();},
    'chop-plane'(c,r,q){polygon(c,[[r*.4,-r*.65],[r*.6,-r*.65],[r,15],[r*.8,15]]);c.moveTo(r*.3,-r*.4);c.lineTo(r*.65,12);},
    'metal-talons'(c,r,q){for(let j=-1;j<=1;j++){c.moveTo(0,j*14);c.quadraticCurveTo(r*.65,j*14-25,r,j*9);c.lineTo(r*.65,j*9+8);}},
    'speed-lines'(c,r,q){for(let j=-2;j<=2;j++){c.moveTo(-r*(1-q),j*7);c.lineTo(r*(.8-q*.3)-Math.abs(j)*9,j*7);}c.moveTo(r*.6,-17);c.lineTo(r,0);c.lineTo(r*.6,17);},
    'aerial-cross'(c,r,q){c.moveTo(0,-r*.5);c.quadraticCurveTo(r*.4,r*.5,r,-r*.2);c.moveTo(0,r*.5);c.quadraticCurveTo(r*.4,-r*.5,r,r*.2);},
    'water-stream'(c,r,q){for(let j=0;j<5;j++){const x=r*j/5; c.moveTo(x,Math.sin(j+q*6)*6);c.quadraticCurveTo(x+10,-10,x+16,0);c.arc(x+12,0,4,0,Math.PI);}},
    'barbed-sting'(c,r,q){polygon(c,[[0,-3],[r,-1],[r+12,0],[r,1],[0,3]]);for(let j=1;j<4;j++){c.moveTo(r*j/4,-3);c.lineTo(r*j/4-7,-10);c.moveTo(r*j/4,3);c.lineTo(r*j/4-7,10);}},
    'shackle-arrow'(c,r,q){c.moveTo(0,0);c.lineTo(r,0);polygon(c,[[r-12,-10],[r+8,0],[r-12,10]]);for(let j=0;j<4;j++){c.moveTo(j*12+8,0);c.ellipse(j*12,0,8,4,j%2?1:0,0,Math.PI*2);}},
    'whip-leaves'(c,r,q){c.moveTo(0,0);c.bezierCurveTo(r*.4,-r*.5,r*.7,r*.5,r,0);for(let j=1;j<4;j++)polygon(c,[[r*j/4,0],[r*j/4+8,-16],[r*j/4+12,0]]);},
    'curl-tongue'(c,r,q){c.moveTo(0,-7);c.lineTo(r*.65,-7);c.arc(r*.65,0,7,-Math.PI/2,Math.PI*1.5);c.lineTo(0,7);c.moveTo(r*.2,0);c.lineTo(r*.6,0);},
    'serrated-leaf'(c,r,q){const points=[[0,0]];for(let j=1;j<7;j++)points.push([r*j/7,-(j%2?12:5)]);points.push([r,0]);for(let j=6;j>0;j--)points.push([r*j/7,j%2?12:5]);polygon(c,points);c.moveTo(0,0);c.lineTo(r,0);},
    'bone-return'(c,r,q){c.save();c.translate(r*.55,0);c.rotate(q*Math.PI*2);polygon(c,[[-25,-5],[18,-5],[25,-12],[32,-5],[27,0],[32,5],[25,12],[18,5],[-25,5],[-30,12],[-37,5],[-32,0],[-37,-5],[-30,-12]]);c.restore();},
    'psi-crescent'(c,r,q){c.arc(r*.4,0,r*.55,-1.2,1.2);c.quadraticCurveTo(r*.55,0,r*.4+Math.cos(-1.2)*r*.55,Math.sin(-1.2)*r*.55);},
    'electric-burst'(c,r,q){for(let j=0;j<8;j++){const a=j*Math.PI/4;c.moveTo(0,0);c.lineTo(Math.cos(a)*r*.4,Math.sin(a)*r*.4);c.lineTo(Math.cos(a+.18)*r*.65,Math.sin(a+.18)*r*.65);c.lineTo(Math.cos(a)*r,Math.sin(a)*r);}},
    'star-flare'(c,r,q){star(c,0,0,r,4);c.moveTo(r*.5+9,r*.4);star(c,r*.5,r*.4,9,4);},
    'sine-prism'(c,r,q){for(const sign of [-1,1]){c.moveTo(0,0);for(let j=1;j<=24;j++)c.lineTo(r*j/24,sign*Math.sin(j/24*Math.PI*4+q*6)*11);}c.moveTo(0,-18);c.lineTo(0,18);},
    'metal-rail'(c,r,q){c.moveTo(0,-9);c.lineTo(r,-9);c.moveTo(0,9);c.lineTo(r,9);for(let j=0;j<4;j++){const x=r*(j+q)/4;polygon(c,[[x,-17],[x+8,-9],[x+8,9],[x,17],[x-8,9],[x-8,-9]]);}},
    'lunar-channel'(c,r,q){for(const sign of [-1,1]){c.moveTo(0,sign*15);c.quadraticCurveTo(r*.5,sign*5,r,sign*15);}c.arc(r,0,20,-1.5,1.5);c.quadraticCurveTo(r-2,0,r+Math.cos(-1.5)*20,Math.sin(-1.5)*20);},
    mandibles(c,r,q){for(const sign of [-1,1])polygon(c,[[0,sign*25],[r*.6,sign*17*(1-q)],[r,0],[r*.55,sign*7],[10,sign*12]]);},
    'closing-fangs'(c,r,q){const gap=24*(1-q);for(const sign of [-1,1]){c.moveTo(0,sign*(gap+8));for(let j=0;j<4;j++){c.lineTo(j*r/4,sign*gap);c.lineTo((j+.5)*r/4,sign*(gap+12));}c.lineTo(r,sign*gap);}},
    'tumble-rock'(c,r,q){c.save();c.translate(r*q,0);c.rotate(q*5);polygon(c,[[-18,-8],[-8,-20],[14,-14],[21,5],[7,18],[-15,11]]);c.moveTo(-8,-20);c.lineTo(0,3);c.lineTo(21,5);c.restore();},
    'seed-burst'(c,r,q){for(let j=0;j<5;j++){const x=r*(j+q)/5,y=(j%2?1:-1)*7;c.moveTo(x+6,y);c.ellipse(x,y,6,3,0,0,Math.PI*2);c.moveTo(x-14,y);c.lineTo(x-8,y);}},
    'ground-spikes'(c,r,q){for(let j=-1;j<=1;j++){const x=j*r*.6;polygon(c,[[x-12,8],[x,-24*q-8],[x+12,8]]);}c.moveTo(-r,10);c.lineTo(r,10);},
    'poison-barbs'(c,r,q){c.ellipse(0,9,r,r*.23,0,0,Math.PI*2);for(let j=-1;j<=1;j++){const x=j*r*.5;polygon(c,[[x-9,0],[x,-20],[x+9,0],[x,-7]]);c.moveTo(x,7);c.lineTo(x,18*q);}},
    'air-scissors'(c,r,q){c.moveTo(0,-r*.4);c.lineTo(r,r*.4);c.quadraticCurveTo(r*.6,0,0,-r*.4);c.moveTo(0,r*.4);c.lineTo(r,-r*.4);c.quadraticCurveTo(r*.6,0,0,r*.4);},
    'final-star'(c,r,q){star(c,r*.5,0,r*.65,6);c.moveTo(r*.5+r*.8,0);c.arc(r*.5,0,r*.8,0,Math.PI*2);},
    'root-seed'(c,r,q){c.ellipse(0,0,9,13,0,0,Math.PI*2);for(let j=0;j<5;j++){const a=j*Math.PI*2/5;c.moveTo(0,0);c.quadraticCurveTo(Math.cos(a+.5)*r*.5,Math.sin(a+.5)*r*.5,Math.cos(a)*r*(1-q*.5),Math.sin(a)*r*(1-q*.5));}},
    'orbit-stones'(c,r,q){for(let j=0;j<4;j++){const a=j*Math.PI/2+q*3,x=Math.cos(a)*r,y=Math.sin(a)*r*.5;polygon(c,[[x-7,y-9],[x+7,y-5],[x+11,y+6],[x-5,y+10],[x-10,y]]);}},
    'guardian-jaws'(c,r,q){for(const sign of [-1,1]){c.moveTo(-r,sign*r*(1-q));c.lineTo(-r*.6,sign*8);c.lineTo(0,sign*20);c.lineTo(r*.6,sign*8);c.lineTo(r,sign*r*(1-q));}star(c,0,0,9,3);},
    'horizontal-charge'(c,r,q){c.arc(0,0,20*(1-q)+4,0,Math.PI*2);if(q>.25){c.moveTo(0,-r*.12);c.lineTo(r,-r*.06);c.lineTo(r,r*.06);c.lineTo(0,r*.12);}},
    'rising-prism'(c,r,q){polygon(c,[[-18,12],[0,-8],[18,12],[0,26]]);for(let j=-1;j<=1;j++){c.moveTo(j*12,0);c.lineTo(j*20,-r*(.3+q));}},
    'shadow-steps'(c,r,q){for(let j=0;j<4;j++){c.moveTo(r*j/4+8,j%2?10:-10);c.ellipse(r*j/4,j%2?10:-10,8,4,0,0,Math.PI*2);}c.moveTo(0,20);c.quadraticCurveTo(r*.5,-15,r,20);},
    'jet-wake'(c,r,q){polygon(c,[[0,-18],[r,0],[0,18],[r*.25,0]]);for(let j=0;j<3;j++){c.moveTo(-j*12,0);c.arc(-j*12,0,5+j*2,-1.3,1.3);}},
    'spectral-hand'(c,r,q){c.moveTo(0,12);c.lineTo(r*.5,12);for(let j=0;j<4;j++){c.lineTo(r*.5+j*8,-20+(j%2)*5);c.lineTo(r*.5+j*8+4,3);}c.lineTo(r+10,15);c.lineTo(r*.6,30);c.lineTo(0,20);}
  };
  function push(e){const quality=G.Settings.get('quality'),cap=quality==='potato'?10:[16,50,100][G.Settings.fx||0];if(effects.length>=cap){const i=effects.findIndex(x=>x.kind!=='z-burst');if(i>=0)effects.splice(i,1);else if(e.kind!=='z-burst')return;else effects.shift();}effects.push(e);}
  function cast(p,m,ghost=false){push({x:m.kind==='mark'&&p.target?p.target.x:p.x,y:(m.kind==='mark'&&p.target?p.target.y:p.y)-G.LIFT*.5,aim:p.aim,type:m.type,kind:style(m),id:m.id,seed:hash(m.id),r:Math.min(130,m.radius||60),t:0,life:m.kind==='mark'?(m.delay||.6):.45,ghost});}
  function z(p,m,ghost=false){push({x:p.x,y:p.y-G.LIFT,aim:0,type:m.type,kind:'z-burst',id:m.id,seed:0,r:175,t:0,life:1.1,ghost});if(!ghost){G.Camera.kick?.(.18);G.Audio.sfx('legend');}}
  function form(p,kind){push({x:p.x,y:p.y-G.LIFT,aim:0,type:kind==='mega'?'psychic':kind==='max'?'dark':'electric',kind:'form',id:kind,seed:17,r:95,t:0,life:1,ghost:p.remote});}
  function update(dt){for(const e of effects)e.t+=dt;effects=effects.filter(e=>e.t<e.life);}
  function draw(ctx){const low=G.Settings.fx===0;
    for(const e of effects){if(!G.Camera.sees(e.x,e.y,e.r+40))continue;const q=e.t/e.life,k=e.kind,n=low?4:6+e.seed%5,r=e.r*(.25+q*.75);ctx.save();ctx.translate(e.x,e.y);ctx.rotate(e.aim);ctx.globalAlpha=(1-q)*(G.Settings.get(e.ghost?'allyShotOpacity':'ownShotOpacity')??.55);ctx.strokeStyle=G.U.TYPE_COLOR[e.type]||'#fff';ctx.fillStyle=ctx.strokeStyle;ctx.lineWidth=2;ctx.beginPath();
      if(k==='z-burst'){
        ctx.globalAlpha=(1-q)*(e.ghost?.6:.95);ctx.strokeStyle='#fff0a8';ctx.lineWidth=low?3:4;
        for(const scale of [1,.65]){ctx.moveTo(r*scale,0);ctx.ellipse(0,0,r*scale,r*scale*.65,0,0,Math.PI*2);}ctx.stroke();ctx.beginPath();ctx.strokeStyle=G.U.TYPE_COLOR[e.type]||'#fff';
        for(let j=0;j<(low?6:12);j++){const a=j*Math.PI*2/(low?6:12)+q*.8;ctx.moveTo(Math.cos(a)*r*.45,Math.sin(a)*r*.45);ctx.lineTo(Math.cos(a)*r*1.15,Math.sin(a)*r*1.15);}ctx.stroke();
        ctx.font='bold '+Math.round(40+q*25)+'px sans-serif';ctx.textAlign='center';ctx.fillStyle='#fff0a8';ctx.fillText('Z',0,18);ctx.restore();continue;
      }
      if(glyphs[k]){glyphs[k](ctx,r,q);ctx.stroke();ctx.restore();continue;}
      for(let i=0;i<n;i++){const a=i/n*Math.PI*2+q*(1+e.seed%3),x=Math.cos(a)*r,y=Math.sin(a)*r*.55;
        if(k==='pressure-jet'){const xx=r*i/n;ctx.moveTo(xx,-8-q*6);ctx.lineTo(xx+12,8+q*6);ctx.moveTo(xx+8,-8-q*6);ctx.lineTo(xx+20,8+q*6);}
        else if(k==='bubble-cloud'){const rr=3+i%4;ctx.moveTo(x+rr,y-q*25);ctx.arc(x,y-q*25,rr,0,Math.PI*2);}
        else if(k==='bubble-lance'){const xx=r*i/n;ctx.moveTo(xx+4,Math.sin(i)*4);ctx.arc(xx,Math.sin(i)*4,4,0,Math.PI*2);}
        else if(k==='ice-lance'){const xx=r*i/n;ctx.moveTo(xx,0);ctx.lineTo(xx+8,-10);ctx.lineTo(xx+12,0);ctx.lineTo(xx+8,10);ctx.lineTo(xx,0);}
        else if(k==='mind-orbs'){ctx.moveTo(x+8,y);ctx.ellipse(x,y,8,3,q*3,0,Math.PI*2);}
        else if(k==='mind-crush'){const inward=r*(1-q),xx=Math.cos(a)*inward,yy=Math.sin(a)*inward*.6;ctx.moveTo(xx,yy-8);ctx.lineTo(xx+6,yy);ctx.lineTo(xx,yy+8);ctx.moveTo(xx-6,yy);ctx.lineTo(xx+6,yy);}
        else if(k==='boulder-fall'){const xx=(i-n/2)*13,yy=-55*(1-q);ctx.rect(xx,yy,9+i%3,9+i%3);ctx.moveTo(xx-3,yy-10);ctx.lineTo(xx+2,yy-3);}
        else if(k==='ice-rain'){const xx=(i-n/2)*13,yy=-60*(1-q);ctx.moveTo(xx-5,yy);ctx.lineTo(xx+5,yy);ctx.moveTo(xx,yy-7);ctx.lineTo(xx,yy+7);ctx.moveTo(xx-4,yy-4);ctx.lineTo(xx+4,yy+4);}
        else if(k==='metal-fall'){const xx=(i-n/2)*14,yy=-60*(1-q);ctx.moveTo(xx,yy-8);ctx.lineTo(xx+8,yy);ctx.lineTo(xx,yy+8);ctx.lineTo(xx-8,yy);ctx.closePath();ctx.moveTo(xx,yy+8);ctx.lineTo(xx,yy+20);}
        else if(['jet','lance','drops','needles'].includes(k)){const length=r*(.5+q),offset=(i-n/2)*3;ctx.moveTo(length*.2,offset);ctx.lineTo(length,offset+Math.sin(i+q*10)*4);ctx.fillRect(Math.round(length*(i/n)),Math.round(offset),k==='drops'?4:2,4);}
        else if(['strike','rain'].includes(k)){const px=(i-n/2)*12,py=-70*(1-q);ctx.moveTo(px,py);ctx.lineTo(px+4,py+18);ctx.lineTo(px-3,py+28);ctx.lineTo(px+3,0);if(k==='rain')ctx.fillRect(px,py,7,9);}
        else if(['bubbles','glob','wisps'].includes(k)){const px=Math.cos(a)*r*.6+r*.35,py=Math.sin(a)*r*.4-q*15;ctx.moveTo(px+5,py);ctx.arc(px,py,3+(i%3)*2,0,Math.PI*2);if(k==='wisps')ctx.fillRect(px,py-4,3,5);}
        else if(['blades','leaves','petals'].includes(k)){const px=Math.cos(a)*r,py=Math.sin(a)*r*.6;ctx.moveTo(px-8,py+4);ctx.quadraticCurveTo(px,py-10,px+8,py-4);ctx.lineTo(px-8,py+4);}
        else if(k==='hearts'){const px=Math.cos(a)*r*.6,py=Math.sin(a)*r*.5-q*15;ctx.moveTo(px,py+5);ctx.lineTo(px-6,py-1);ctx.lineTo(px-3,py-5);ctx.lineTo(px,py-2);ctx.lineTo(px+3,py-5);ctx.lineTo(px+6,py-1);ctx.closePath();}
        else if(['drain','tendrils'].includes(k)){const radius=r*(k==='drain'?1-q:q);ctx.moveTo(Math.cos(a)*radius,Math.sin(a)*radius*.5);ctx.lineTo(Math.cos(a+.3)*radius,Math.sin(a+.3)*radius*.5-18*q);}
        else if(['radial','spikes','quake','snow'].includes(k)){ctx.moveTo(x*.5,y*.5);ctx.lineTo(x,y);ctx.lineTo(x+Math.cos(a+.8)*7,y+Math.sin(a+.8)*7);if(k==='snow'){ctx.moveTo(x-4,y-4);ctx.lineTo(x+4,y+4);}}
        else if(['wheel','ripple','heat','prism'].includes(k)){ctx.moveTo(Math.cos(a)*r,Math.sin(a)*r*.6);ctx.lineTo(Math.cos(a+.5)*r,Math.sin(a+.5)*r*.6);if(k==='prism'){ctx.moveTo(x,y);ctx.lineTo(x+r*.6,y);}}
        else if(k==='jaws'){const opening=18*(1-q);ctx.moveTo((i/n)*r*.6,-opening);ctx.lineTo((i/n)*r*.6+4,0);ctx.lineTo((i/n)*r*.6+8,opening);}
        else if(['vine','tongue','flame','dragon'].includes(k)){const length=r*(.8+(e.seed%4)*.1),bend=Math.sin(q*8+i)*12;ctx.moveTo(0,(i-n/2)*2);ctx.quadraticCurveTo(length*.5,bend,length,(i-n/2)*4);}
        else if(['fork','fissure','charge'].includes(k)){ctx.moveTo(0,0);ctx.lineTo(r*.35,(i-n/2)*6);ctx.lineTo(r*.55,(i%2?1:-1)*14);ctx.lineTo(r,(i-n/2)*9);}
        else if(['claw','feather','jaws','impact'].includes(k)){ctx.moveTo(r*.2,(i-n/2)*7);ctx.lineTo(r*.7,(i-n/2)*10-12);ctx.lineTo(r,(i-n/2)*5);}
        else if(['sigil','frost','seed','rock'].includes(k)){ctx.moveTo(x,y-5);ctx.lineTo(x+5,y);ctx.lineTo(x,y+5);ctx.lineTo(x-5,y);ctx.lineTo(x,y-5);if(k==='rock')ctx.fillRect(Math.round(x),Math.round(y-25*(1-q)),5,5);}
        else if(['wave','vortex','shadow'].includes(k)){ctx.moveTo(x,y);ctx.lineTo(Math.cos(a+.5)*(r+8),Math.sin(a+.5)*(r+8)*.55);ctx.lineTo(Math.cos(a+1)*r,Math.sin(a+1)*r*.55);}
        else if(k==='decoy'){ctx.rect(-10,-20,20,23);ctx.moveTo(-10,-20);ctx.lineTo(-14,-29);ctx.moveTo(10,-20);ctx.lineTo(14,-29);}
        else{ctx.moveTo(x*.3,y*.3);ctx.lineTo(x,y);ctx.fillRect(Math.round(x),Math.round(y),4,4);}
      }ctx.stroke();ctx.restore();
    }
  }
  function drawPlayer(ctx,p){const b=p.battle;if(!b||p.dead)return;ctx.save();ctx.globalAlpha=p.remote?.35:.65;ctx.lineWidth=2;
    if(b.shield>0||b.block){ctx.strokeStyle=b.block?'#fff4a8':'#83dcff';ctx.beginPath();ctx.ellipse(p.x,p.y-p.bodyH*.5,p.r*1.7,p.bodyH*.7,0,0,Math.PI*2);ctx.stroke();}
    if(b.form){ctx.strokeStyle=b.form==='max'?'#ff647c':'#df99ff';const radius=p.r*(b.form==='max'?2.6:2);ctx.beginPath();for(let i=0;i<8;i++){const a=i*Math.PI/4+performance.now()/900;ctx.moveTo(p.x+Math.cos(a)*radius,p.y+Math.sin(a)*radius*.5);ctx.lineTo(p.x+Math.cos(a)*(radius+7),p.y+Math.sin(a)*(radius+7)*.5);}ctx.stroke();ctx.font='bold 10px sans-serif';ctx.fillStyle=ctx.strokeStyle;ctx.textAlign='center';ctx.fillText(b.form==='max'?G.T('Dynamax'):'Mega',p.x,p.y-p.bodyH-15);}
    ctx.restore();
  }
  return {z,cast,form,style,update,draw,drawPlayer,clear(){effects=[];},get count(){return effects.length;}};
})();
