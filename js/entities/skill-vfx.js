/* Layered pixel effects, bounded independently of simulation and network events. */
G.SkillVFX=(()=>{
  let effects=[];
  const hash=s=>[...s].reduce((h,c)=>(Math.imul(h,31)+c.charCodeAt(0))>>>0,7);
  const style=m=>({ 'ember':'flame','flamethrower':'jet','fire-spin':'vortex','heat-wave':'heat','flame-wheel':'wheel','will-o-wisp':'wisps','water-gun':'drops','hydro-pump':'jet','bubble':'bubbles','bubble-beam':'bubbles','razor-leaf':'blades','leaf-storm':'leaves','giga-drain':'vine','thunder-shock':'fork','thunderbolt':'strike','discharge':'radial','confusion':'sigil','psybeam':'prism','psycho-cut':'blades','rock-throw':'rock','rock-slide':'rain','spikes':'spikes','toxic-spikes':'spikes','ice-beam':'lance','powder-snow':'snow','hail':'rain','shadow-ball':'shadow','night-shade':'tendrils','dark-pulse':'ripple','fairy-wind':'petals','dazzling-gleam':'radial','draining-kiss':'hearts','dragon-rage':'dragon','sludge':'glob','sludge-bomb':'splash','poison-sting':'needles','toxic':'glob','mud-shot':'splash','bulldoze':'quake','meteor-mash':'rain','flash-cannon':'prism','bonemerang':'blades','hex':'sigil', 'vine-whip':'vine','surf':'wave','icy-wind':'frost','whirlpool':'vortex','leech-seed':'seed','stealth-rock':'rock','earth-power':'fissure','psychic':'sigil','counter':'claw','substitute':'decoy','explosion':'blast','hyper-beam':'charge','dragon-pulse':'dragon','bullet-seed':'seed','shadow-sneak':'shadow','aqua-jet':'wave','seed-bomb':'seed','dragon-darts':'fork','magical-leaf':'leaves','water-shuriken':'wheel','rollout':'rock','mystical-fire':'vortex','volt-tackle':'charge','spirit-shackle':'needles','last-resort':'impact','darkest-lariat':'wheel','clanging-scales':'radial','moongeist-beam':'prism','stone-edge':'spikes','spectral-thief':'shadow','play-rough':'hearts','sparkling-aria':'ripple','giga-impact':'quake','sunsteel-strike':'lance','natures-madness':'sigil','photon-geyser':'charge','metal-claw':'claw','wing-attack':'feather','lick':'tongue','body-slam':'impact','karate-chop':'claw','bite':'jaws','bug-bite':'jaws'}[m.id]||({fire:'flame',water:'wave',grass:'vine',electric:'fork',ice:'frost',rock:'rock',ground:'fissure',psychic:'sigil',ghost:'shadow',dragon:'dragon',flying:'feather',poison:'vortex',bug:'seed',steel:'claw',fighting:'impact',dark:'jaws',fairy:'sigil',normal:'impact'}[m.type]));
  function push(e){const quality=G.Settings.get('quality'),cap=quality==='potato'?20:[35,65,100][G.Settings.fx||0];if(effects.length>=cap)effects.shift();effects.push(e);}
  function cast(p,m,ghost=false){push({x:m.kind==='mark'&&p.target?p.target.x:p.x,y:(m.kind==='mark'&&p.target?p.target.y:p.y)-G.LIFT*.5,aim:p.aim,type:m.type,kind:style(m),id:m.id,seed:hash(m.id),r:Math.min(130,m.radius||60),t:0,life:m.kind==='mark'?(m.delay||.6):.45,ghost});}
  function form(p,kind){push({x:p.x,y:p.y-G.LIFT,aim:0,type:kind==='mega'?'psychic':kind==='max'?'dark':'electric',kind:'form',id:kind,seed:17,r:95,t:0,life:1,ghost:p.remote});}
  function update(dt){for(const e of effects)e.t+=dt;effects=effects.filter(e=>e.t<e.life);}
  function draw(ctx){const low=G.Settings.get('quality')==='potato';
    for(const e of effects){const q=e.t/e.life,k=e.kind,n=low?4:6+e.seed%5,r=e.r*(.25+q*.75);ctx.save();ctx.translate(e.x,e.y);ctx.rotate(e.aim);ctx.globalAlpha=(1-q)*(e.ghost?.3:.8);ctx.strokeStyle=G.U.TYPE_COLOR[e.type]||'#fff';ctx.fillStyle=ctx.strokeStyle;ctx.lineWidth=2;ctx.beginPath();
      for(let i=0;i<n;i++){const a=i/n*Math.PI*2+q*(1+e.seed%3),x=Math.cos(a)*r,y=Math.sin(a)*r*.55;
        if(['jet','lance','drops','needles'].includes(k)){const length=r*(.5+q),offset=(i-n/2)*3;ctx.moveTo(length*.2,offset);ctx.lineTo(length,offset+Math.sin(i+q*10)*4);ctx.fillRect(Math.round(length*(i/n)),Math.round(offset),k==='drops'?4:2,4);}
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
  return {cast,form,style,update,draw,drawPlayer,clear(){effects=[];},get count(){return effects.length;}};
})();
