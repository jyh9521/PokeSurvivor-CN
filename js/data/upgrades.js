/* ============ upgrades.js — mejoras permanentes entre runs ============
 * Se compran con Pokémonedas en el menú. `per` es lo que da cada nivel.
 */
(function(factory){if(typeof module==='object'&&module.exports)module.exports=factory();else G.Upgrades=factory();})(()=>{
  const LIST = [
    { id: 'hp',     icon: 'heart', name: 'Vitalidad',      unit: '+8 vida',            max: 10, base: 60,  grow: 1.35 },
    { id: 'atk',    icon: 'fist', name: 'Fuerza',         unit: '+4% daño',           max: 10, base: 80,  grow: 1.38 },
    { id: 'spd',    icon: 'boot', name: 'Zancada',        unit: '+3% velocidad',      max: 8,  base: 70,  grow: 1.4 },
    { id: 'cd',     icon: 'clock', name: 'Reflejos',       unit: '-3% recarga',        max: 8,  base: 90,  grow: 1.42 },
    { id: 'def',    icon: 'shield', name: 'Coraza',         unit: '+2% defensa',        max: 8,  base: 80,  grow: 1.4 },
    { id: 'regen',  icon: 'sprout', name: 'Síntesis',       unit: '+0.2 vida/s',        max: 5,  base: 120, grow: 1.5 },
    { id: 'magnet', icon: 'magnet', name: 'Imán',           unit: '+12% recogida',      max: 6,  base: 50,  grow: 1.4 },
    { id: 'xp',     icon: 'book', name: 'Sabiduría',      unit: '+5% experiencia',    max: 8,  base: 100, grow: 1.42 },
    { id: 'coins',  icon: 'coin', name: 'Fortuna',        unit: '+8% Pokémonedas',    max: 8,  base: 120, grow: 1.45 },
    { id: 'moves',  icon: 'cards', name: 'Repertorio',     unit: 'Empiezas con 2 movimientos', max: 1, base: 1500, grow: 1 },
    { id: 'crit',   icon: 'star', name: 'Golpe Crítico',  unit: '+3% de críticos (x1,5 de daño)', max: 10, base: 90, grow: 1.4 },
    { id: 'reroll', icon: 'up', name: 'Cambio de cartas', unit: '+1 cambio de cartas de nivel por run', max: 5, base: 150, grow: 1.6 },
    { id: 'ban',    icon: 'ban', name: 'Veto',           unit: 'Bloquea 1 movimiento: no te sale en las cartas', max: 3, base: 300, grow: 1.9 }
  ];
  const BY = {};
  for (const u of LIST) BY[u.id] = u;

  function cost(id, lvl) {
    const u = BY[id];
    return Math.round(u.base * Math.pow(u.grow, lvl) / 10) * 10;
  }

  /** Niveles comprados -> modificadores para G.Player. */
  function perks(levels = {}) {
    // Nunca por encima del máximo (una partida editada a mano no da más poder).
    const L = id => Math.max(0, Math.min(BY[id].max, Math.floor(+levels[id] || 0)));
    return {
      hp: L('hp') * 8,
      atkMul: 1 + L('atk') * 0.04,
      spdMul: 1 + L('spd') * 0.03,
      cdMul: 1 - L('cd') * 0.03,
      dmgReduce: L('def') * 0.02,
      regen: L('regen') * 0.2,
      magnetMul: 1 + L('magnet') * 0.12,
      xpMul: 1 + L('xp') * 0.05,
      coinMul: 1 + L('coins') * 0.08,
      startMoves: 1 + L('moves'),
      crit: L('crit') * 0.03,
      rerolls: L('reroll'),
      bans: L('ban')
    };
  }

  function normalized(levels){const out={};for(const u of LIST)out[u.id]=Math.max(0,Math.min(u.max,Math.floor(+levels?.[u.id]||0)));return out;}
  // Immutable migration table for pre-ledger saves (0.5.0 prices). New purchases
  // record the amount actually deducted, never the current price at refund time.
  const LEGACY = {"hp":[60,80,110,150,200,270,360,490,660,890],"atk":[80,110,150,210,290,400,550,760,1050,1450],"spd":[70,100,140,190,270,380,530,740],"cd":[90,130,180,260,370,520,740,1050],"def":[80,110,160,220,310,430,600,840],"regen":[120,180,270,410,610],"magnet":[50,70,100,140,190,270],"xp":[100,140,200,290,410,580,820,1160],"coins":[120,170,250,370,530,770,1120,1620],"moves":[1500],"crit":[90,130,180,250,350,480,680,950,1330,1860],"reroll":[150,240,380,610,980],"ban":[300,570,1080]};
  function ensureLedger(save){
    save.pspent ||= {};
    for(const [dex,raw] of Object.entries(save.pupg||{})){
      const levels=normalized(raw),ledger=save.pspent[dex] ||= {};
      for(const [id,n]of Object.entries(levels)){
        const a=Array.isArray(ledger[id])?ledger[id].slice(0,n):[];
        while(a.length<n)a.push(LEGACY[id][a.length]);
        ledger[id]=a;
      }
    }
    return save.pspent;
  }
  function purchase(save,dex,id){
    if(!save.owned[dex]||!BY[id])throw Error('Pokémon no obtenido');
    ensureLedger(save);const levels=normalized(save.pupg[dex]),n=levels[id],price=cost(id,n);
    if(n>=BY[id].max||save.coins<price)return {count:0,spent:0};
    save.coins-=price;save.pupg[dex]={...save.pupg[dex],[id]:n+1};
    ((save.pspent[dex] ||= {})[id] ||= []).push(price);
    return {count:1,spent:price};
  }
  function bulk(save,dex){
    if(!save.owned[dex])throw Error('Pokémon no obtenido');
    const before=save.coins;let count=0;
    while(true){const levels=normalized(save.pupg[dex]),next=LIST.filter(u=>levels[u.id]<u.max).map(u=>({id:u.id,price:cost(u.id,levels[u.id])})).sort((a,b)=>a.price-b.price||a.id.localeCompare(b.id))[0];
      if(!next||next.price>save.coins)break;purchase(save,dex,next.id);count++;
    }
    return {count,spent:before-save.coins};
  }
  function refundable(save,dex){
    ensureLedger(save);let total=0;
    for(const [d,raw]of Object.entries(save.pupg||{}))if(dex==null||String(dex)===d)
      for(const [id,n]of Object.entries(normalized(raw)))
        for(const price of save.pspent[d]?.[id]?.slice(0,n)||[])total+=price;
    return Math.floor(total*.5);
  }
  function refund(save,dex){
    const coins=refundable(save,dex);
    if(!Number.isSafeInteger(coins)||save.coins+coins>1001000000)throw Error('Saldo fuera de rango');
    save.coins+=coins;
    for(const [d,l]of Object.entries(save.pupg))if(dex==null||String(dex)===d){
      const unknown=Object.fromEntries(Object.entries(l).filter(([id])=>!BY[id]));
      if(Object.keys(unknown).length)save.pupg[d]=unknown;else delete save.pupg[d];
      delete save.pspent[d];if(save.pban)delete save.pban[d];
    }
    if(dex==null){save.pspent={};save.pban={};}
    else{delete save.pspent[dex];if(save.pban)delete save.pban[dex];}
    save.pban ||= {};return {coins};
  }
  return { LIST, BY, cost, perks,bulk,purchase,refund,refundable,ensureLedger };
});
