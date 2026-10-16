/* Six-stat catalog radar. Display only: no combat data or saves are changed. */
(function(factory){const api=factory();if(typeof module!=='undefined'&&module.exports)module.exports=api;else G.StatRadar=api;})(()=>{
  const ORDER=[0,1,2,5,4,3],KEYS=['hp','attack','defense','special-attack','special-defense','speed'];
  const LABELS=['HP','Attack','Defense','Sp. Atk','Sp. Def','Speed'];
  const FULL=['HP','Attack','Defense','Special Attack','Special Defense','Speed'];
  const escape=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const round=n=>Math.round(n*100)/100;
  function geometry(stats=[]){
    const cx=180,cy=138,radius=86,max=255;
    const point=(i,f)=>{const angle=-Math.PI/2+i*Math.PI/3;return [round(cx+Math.cos(angle)*radius*f),round(cy+Math.sin(angle)*radius*f)];};
    const axes=ORDER.map((index,i)=>{const n=Number(stats[index]),value=Number.isFinite(n)?Math.max(0,Math.min(max,n)):0;return {index,key:KEYS[index],value,point:point(i,value/max),outer:point(i,1)};});
    return {cx,cy,radius,max,axes,rings:[.25,.5,.75,1].map(f=>ORDER.map((_,i)=>point(i,f)))};
  }
  const points=rows=>rows.map(p=>p.join(',')).join(' ');
  function html(stats,t=s=>s){
    const g=geometry(stats),positions=[[180,22,'middle'],[270,88,'start'],[270,184,'start'],[180,252,'middle'],[90,184,'end'],[90,88,'end']];
    const description=g.axes.map(a=>t(FULL[a.index])+': '+a.value).join(', ');
    return `<figure class="six-stats stat-radar"><svg viewBox="0 0 360 288" role="img" aria-label="${escape(description)}" xmlns="http://www.w3.org/2000/svg">
      <title>${escape(description)}</title>
      <g class="radar-grid" aria-hidden="true">${g.rings.map(r=>`<polygon points="${points(r)}"/>`).join('')}${g.axes.map(a=>`<line x1="${g.cx}" y1="${g.cy}" x2="${a.outer[0]}" y2="${a.outer[1]}"/>`).join('')}</g>
      <polygon class="radar-area" points="${points(g.axes.map(a=>a.point))}" aria-hidden="true"/>
      <g class="radar-dots" aria-hidden="true">${g.axes.map(a=>`<circle cx="${a.point[0]}" cy="${a.point[1]}" r="2.5"/>`).join('')}</g>
      ${g.axes.map((a,i)=>{const [x,y,anchor]=positions[i];return `<text class="radar-label" data-stat="${a.key}" data-value="${a.value}" x="${x}" y="${y}" text-anchor="${anchor}" aria-hidden="true">${escape(t(LABELS[a.index]))}<tspan class="radar-value" x="${x}" dy="19">${a.value}</tspan></text>`;}).join('')}
    </svg><figcaption>${escape(t('Base stats · shared scale 0–255'))}</figcaption></figure>`;
  }
  return {geometry,html};
});
