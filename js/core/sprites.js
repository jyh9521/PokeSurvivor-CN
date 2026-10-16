/* ============ sprites.js — sprites estilo Mundo Misterioso (locales) ============
 * Hojas de SpriteCollab en assets/pokemon/{dex}/{Anim}.png, geometría en
 * G.SPRITE_META (js/data/sprites-meta.js, generado por tools/fetch_sprites.py).
 *
 *   columnas = fotogramas · filas = 8 direcciones
 *   0 Down · 1 DownRight · 2 Right · 3 UpRight · 4 Up · 5 UpLeft · 6 Left · 7 DownLeft
 *
 * Cada animación tiene su propio tamaño de fotograma, así que se alinean por el
 * ancla al suelo (ax, ay): ese píxel cae siempre en los pies de la entidad y
 * el sprite no "salta" al pasar de Walk a Attack.
 */
G.Sprites = (() => {
  /** Unidades de mundo por píxel de arte. Tiles y sprites comparten escala. */
  const PX = 2;
  const EXTRA=['Strike','Swing','Double','Hop','Rotate'];
  for(const [dex,entry] of Object.entries(G.EXTRA_ANIMATIONS||{})){
    const m=G.SPRITE_META[dex];if(!m)continue;Object.assign(m.a,entry.a);
    if(m.sh){m.sa||={};m.sm||=[];for(const name of Object.keys(entry.a)){if(entry.sa[name])m.sa[name]=entry.sa[name];else if(!m.sm.includes(name))m.sm.push(name);}}
  }
  const totalCache=new WeakMap(),total=m=>{if(!m)return 1;let n=totalCache.get(m);if(!n){n=m.d.slice(0,m.n).reduce((a,b)=>a+b,0)||1;totalCache.set(m,n);}return n;};
  const mobile=()=>G.Settings?.get('quality')==='potato'||(typeof matchMedia==='function'&&matchMedia('(pointer:coarse)').matches);
  function actionFor(dex,move,shiny=false){
    const m=meta(dex);if(!m)return 'Attack';
    const special={'swords-dance':['Rotate','Charge'],'dragon-dance':['Rotate','Charge'],'body-slam':['Hop','Attack'],'wing-attack':['Swing','Attack'],'vine-whip':['Swing','Attack'],'karate-chop':['Strike','Attack'],'metal-claw':['Strike','Attack']};
    const kinds={melee:['Strike','Attack'],dash:['Hop','Attack'],nova:['Swing','Shoot','Attack'],boomerang:['Swing','Shoot'],chain:['Double','Shoot'],buff:['Charge'],aura:['Charge'],trail:['Walk'],orbit:['Charge'],mine:['Charge'],meteor:['Charge'],turret:['Charge']};
    return (special[move.id]||kinds[move.kind]||['Shoot','Attack']).find(a=>{const g=shiny&&m.sa?.[a]||m.a[a];return has(m,a,shiny)&&(!EXTRA.includes(a)||!mobile()||g.w*g.h*g.n*g.r*4<=8*1024*1024);})||'Attack';
  }
  function prepareAction(dex,move,shiny=false){const a=actionFor(dex,move,shiny);if(EXTRA.includes(a))sheet(dex,a,shiny);}

  const sheets = new Map();          // "dex/Anim[/s]" -> {img, ready, failed}

  function meta(dex) { return G.SPRITE_META[dex] || null; }

  /** ¿Flota en su sprite? (tools/hover_flags.py) Pasa por encima de rocas y agua. */
  function hovers(dex) { const m = meta(dex); return !!(m && m.hv); }

  /**
   * Versión blanca de una imagen (para el destello al recibir un golpe).
   * Se hace una vez por hoja con composición "source-in": mucho más barato
   * que ctx.filter en cada dibujo, que era lo que más ralentizaba con muchos
   * enemigos a la vez.
   */
  const whites = new WeakMap();
  function white(img) {
    let c = whites.get(img);
    if (c) return c;
    c = document.createElement('canvas');
    c.width = img.width; c.height = img.height;
    const x = c.getContext('2d');
    x.drawImage(img, 0, 0);
    x.globalCompositeOperation = 'source-in';
    x.fillStyle = '#ffffff';
    x.fillRect(0, 0, c.width, c.height);
    whites.set(img, c);
    for(const s of sheets.values())if(s.img===img){s.whiteBytes=c.width*c.height*4;evict(s);break;}
    return c;
  }

  /** ¿Tiene versión shiny? (assets/pokemon/{dex}/s/) */
  function hasShiny(dex) { const m = meta(dex); return !!(m && m.sh); }

  /** Animaciones disponibles para esa variante. */
  function has(m, anim, shiny) {
    return !!m.a[anim] && !(shiny && m.sm && m.sm.includes(anim));
  }

  function animName(dex, anim, shiny = false) {
    const m = meta(dex);
    if (!m) return null;
    shiny = shiny && !!m.sh;
    if (has(m, anim, shiny)) return anim;
    return has(m, 'Idle', shiny) ? 'Idle' : 'Walk';
  }

  /** Geometría de una animación (la shiny sólo difiere en casos raros). */
  function animMeta(dex, anim, shiny = false) {
    const m = meta(dex);
    if (!m) return null;
    const name = animName(dex, anim, shiny);
    if (shiny && m.sh && m.sa && m.sa[name]) return m.sa[name];
    return m.a[name] || null;
  }

  // Hojas en memoria como mucho. Antes no se soltaba ninguna: en partidas de
  // más de una hora pasaban cientos de especies, se llenaba la memoria gráfica
  // y la pantalla se quedaba en negro hasta que el navegador recargaba la página.
  const MAX_SHEETS = 200;
  const budget=()=> (G.Settings?.get('quality')==='potato'?32:mobile()?64:128)*1024*1024;
  const bytes=s=>(s.bytes||0)+(s.whiteBytes||0);
  function cacheStats(){return {sheets:sheets.size,bytes:[...sheets.values()].reduce((n,s)=>n+bytes(s),0),budget:budget()};}
  function evict(protect){
    let size=cacheStats().bytes;
    const old=[...sheets].filter(([,s])=>s!==protect).sort((a,b)=>a[1].at-b[1].at);
    for(const [key,s] of old){
      if(sheets.size<MAX_SHEETS&&size<=budget())break;
      size-=bytes(s);sheets.delete(key);whites.delete(s.img);
      s.img.onload=s.img.onerror=null;s.img.src='';s.ready=false;
    }
  }

  function sheet(dex, anim, shiny = false) {
    const m = meta(dex);
    shiny = shiny && !!(m && m.sh);
    const name = animName(dex, anim, shiny);
    if (!name) return null;
    const k = dex + '/' + name + (shiny ? '/s' : '');
    let s = sheets.get(k);
    const now = Date.now();
    if (s) {
      s.at = now;
      // Si la descarga se cortó (red mala, servidor saturado), reintenta más tarde.
      if (s.failed && performance.now() > s.retryAt) { s.failed = false; s.img.src = s.src + '?r=' + s.tries; }
      return s;
    }
    if (sheets.size >= MAX_SHEETS) evict(null);
    s = { ready: false, failed: false, img: new Image(), tries: 0, retryAt: 0, at: now,
          src: `assets/pokemon/${dex}/${shiny ? 's/' : ''}${animMeta(dex,name,shiny)?.file||name+'.png'}` };
    s.img.onload = () => { s.ready = true;s.bytes=s.img.width*s.img.height*4;evict(s); };
    s.img.onerror = () => { s.failed = true; s.retryAt = performance.now() + 1000 * Math.min(8, 2 ** s.tries++); };
    s.img.src = s.src;
    sheets.set(k, s);
    return s;
  }

  G.Settings?.on?.(key=>{if(key==='quality')evict(null);});

  const ANIMS = ['Idle', 'Walk', 'Attack', 'Shoot', 'Charge', 'Hurt', 'Faint'];

  /** Precarga todas las animaciones de esos Pokémon. */
  function preload(dexes, timeout = 8000, shiny = false) {
    const hs = [];
    for (const d of dexes) for (const a of ANIMS) { const s = sheet(d, a, shiny); if (s) hs.push(s); }
    return new Promise(res => {
      const t0 = performance.now();
      (function check() {
        if (hs.every(h => h.ready || h.failed) || performance.now() - t0 > timeout) return res();
        setTimeout(check, 50);
      })();
    });
  }

  /** Ángulo de pantalla (atan2(dy,dx)) -> fila de dirección 0..7. */
  function dirFromAngle(a) {
    return ((Math.round((Math.PI / 2 - a) / (Math.PI / 4)) % 8) + 8) % 8;
  }

  /** Radio de colisión aproximado a partir del tamaño del sprite. */
  function bodyRadius(dex, scale = 1) {
    const m = animMeta(dex, 'Idle');
    const w = m ? m.w : 32;
    return G.U.clamp(w * 0.22, 5, 26) * PX * scale;
  }

  /** Alto visual aproximado (para barras de vida y números de daño). */
  function bodyHeight(dex, scale = 1) {
    const m = animMeta(dex, 'Idle');
    return (m ? m.ay : 24) * PX * scale;
  }

  /** Sombra elíptica bajo los pies, tamaño según el ShadowSize de PMD. */
  function drawShadow(ctx, dex, x, y, scale = 1) {
    const m = meta(dex);
    const s = m ? m.s : 1;
    const rx = [5, 8, 12][G.U.clamp(s, 0, 2)] * PX * scale;
    ctx.fillStyle = 'rgba(0,0,0,.34)';
    ctx.beginPath();
    ctx.ellipse(x, y, rx, rx * 0.42, 0, 0, 6.2832);
    ctx.fill();
  }

  // ---------------- Animator ----------------

  /**
   * Reproduce las animaciones de un Pokémon.
   *   loop(anim)        animación de fondo (Idle / Walk); no reinicia si ya suena
   *   play(anim, opts)  animación de una vez (Attack, Shoot, Hurt...) que tapa
   *                     a la de fondo hasta que termina
   */
  class Animator {
    constructor(dex, scale = 1, shiny = false) {
      this.dex = dex;
      this.shiny = shiny && hasShiny(dex);
      this.scale = scale;
      this.base = 'Idle';
      this.cur = 'Idle';
      this.frame = 0;
      this.t = 0;              // tiempo dentro del fotograma, en 1/60 s
      this.speed = 1;
      this.once = false;
      this.hold = false;       // se queda en el último fotograma (Faint)
      this.done = false;
      this.dir = 0;this.serial=0;this.elapsed=0;this.baseSpeed=1;this.loops={};this.pending=null;this.remoteSerial=-1;this.remotePose=null;
      // Las hojas se cargan al dibujarse por primera vez; la run las precarga
      // todas con preload() para que no parpadeen al primer ataque.
    }

    loop(anim, speed = 1) {
      this.base=animName(this.dex,anim,this.shiny)||'Idle';this.baseSpeed=Math.max(.1,Math.min(6,Number(speed)||1));
      if(!this.once){if(this.cur!==this.base)this._start(this.base,false);this.speed=this.baseSpeed;}
    }
    play(anim,opts={}) {this.pending=null;this._start(anim,true);this.speed=Math.max(.1,Math.min(6,Number(opts.speed)||1));this.hold=!!opts.hold;}
    request(anim,opts={}) {
      if(this.hold&&this.cur==='Faint')return false;
      const next={anim,speed:Math.max(1,Math.min(3,Number(opts.speed)||1))};
      if(this.busy()){this.pending=next;return false;}
      this.play(next.anim,{speed:next.speed});return true;
    }
    busy(){return this.once&&!this.done;}
    progress(){const m=animMeta(this.dex,this.cur,this.shiny);return m?Math.min(1,this.elapsed/total(m)):1;}
    _seek(value){const m=animMeta(this.dex,this.cur,this.shiny);if(!m)return;
      this.elapsed=Math.max(0,value);let t=this.once?Math.min(this.elapsed,total(m)-.0001):this.elapsed%total(m);
      if(!this.once)this.elapsed=t;let frame=0;while(frame<m.n-1&&t>=m.d[frame])t-=m.d[frame++];this.frame=frame;this.t=t;
    }
    _start(anim,once){if(!this.once)this.loops[this.cur]=this.elapsed;
      this.cur=animName(this.dex,anim,this.shiny)||'Idle';this.once=once;this.done=false;this.hold=false;this.serial++;this._seek(once?0:this.loops[this.cur]||0);
    }
    update(dt){if(this.done||!Number.isFinite(dt)||dt<=0)return;let remaining=Math.min(1,dt);
      while(remaining>0){const m=animMeta(this.dex,this.cur,this.shiny);if(!m)return;
        if(!this.once){this._seek(this.elapsed+remaining*60*this.speed);return;}
        const seconds=Math.max(0,(total(m)-this.elapsed)/(60*this.speed)),used=Math.min(remaining,seconds);
        const base=animMeta(this.dex,this.base,this.shiny);if(base)this.loops[this.base]=((this.loops[this.base]||0)+used*60*this.baseSpeed)%total(base);
        this._seek(this.elapsed+used*60*this.speed);remaining-=used;
        if(used<seconds-1e-8)return;
        if(this.hold){this.frame=m.n-1;this.elapsed=total(m);this.done=true;this.pending=null;return;}
        const next=this.pending;this.pending=null;if(next)this.play(next.anim,{speed:next.speed});else{this._start(this.base,false);this.speed=this.baseSpeed;}
      }
    }
    snapshot(){return [this.serial,this.cur,Math.round(this.elapsed*10)/10,Math.round(this.speed*100)/100,this.once?1:0,this.hold?1:0,this.base,Math.round(this.baseSpeed*100)/100,this.dir];}
    sync(pose,age=0){
      if(!Array.isArray(pose)||pose.length!==9||pose===this.remotePose)return false;
      const [seq,name,phase,speed,once,hold,base,baseSpeed,dir]=pose;
      if(!Number.isSafeInteger(seq)||seq<0||seq<this.remoteSerial||![...ANIMS,...EXTRA].includes(name)||!['Walk','Idle'].includes(base)||!Number.isFinite(phase)||phase<0||phase>60000||!Number.isFinite(speed)||speed<.1||speed>6||!Number.isFinite(baseSpeed)||baseSpeed<.1||baseSpeed>6||![0,1].includes(once)||![0,1].includes(hold)||!Number.isInteger(dir)||dir<0||dir>7)return false;
      this.remotePose=pose;this.base=base;this.baseSpeed=baseSpeed;this.dir=dir;
      const target=phase+(Number.isFinite(age)?Math.max(0,Math.min(.25,age)):0)*60*speed,nameHere=animName(this.dex,name,this.shiny);
      if(seq!==this.remoteSerial){this.remoteSerial=seq;this.pending=null;this._start(name,!!once);this.speed=speed;this.hold=!!hold;this._seek(target);if(once&&target>=total(animMeta(this.dex,name,this.shiny)))this.update(.00001);}
      else if(this.cur===nameHere&&!this.done){this.speed=speed;const delta=target-this.elapsed;if(delta>3)this._seek(this.elapsed+Math.min(1.5,delta));}
      return true;
    }

    /** Dibuja con los pies en (x, y). opts: { flash, alpha } */
    bounds(x,y){
      const m=animMeta(this.dex,this.cur,this.shiny)||animMeta(this.dex,'Idle',this.shiny),idle=animMeta(this.dex,'Idle',this.shiny),k=PX*this.scale;
      const frames=[m,idle].filter(Boolean);if(!frames.length)return {x:x-32,y:y-64,w:64,h:64};
      const left=Math.min(...frames.map(f=>x-f.ax*k))-4,top=Math.min(...frames.map(f=>y-f.ay*k))-4;
      return {x:Math.floor(left),y:Math.floor(top),w:Math.ceil(Math.max(...frames.map(f=>x+(f.w-f.ax)*k))+4-left),h:Math.ceil(Math.max(...frames.map(f=>y+(f.h-f.ay)*k))+4-top)};
    }

    draw(ctx, x, y, opts = {}) {
      let m = animMeta(this.dex, this.cur, this.shiny);
      let s = sheet(this.dex, this.cur, this.shiny);
      const k = PX * this.scale;
      if (s && !s.ready) {
        // Mientras carga esta animación, enseña Idle si ya está.
        const idle = sheet(this.dex, 'Idle', this.shiny);
        if (idle && idle.ready) { s = idle; m = animMeta(this.dex, 'Idle', this.shiny); }
      }
      const frame = s === sheet(this.dex, this.cur, this.shiny) ? this.frame : 0;
      if (!m || !s || !s.ready) {
        // Respaldo: bolita, por si falta el fichero.
        ctx.fillStyle = opts.color || '#6b7a94';
        ctx.beginPath(); ctx.arc(x, y - 12 * k, 8 * k, 0, 6.2832); ctx.fill();
        return;
      }
      const row = Math.min(this.dir, m.r - 1);
      const alpha = opts.alpha == null ? 1 : opts.alpha;
      if (alpha <= 0) return;
      const sx = Math.min(frame, m.n - 1) * m.w, sy = row * m.h;
      const dx = Math.round(x - m.ax * k), dy = Math.round(y - m.ay * k);
      const prev = ctx.globalAlpha;
      if (alpha < 1) ctx.globalAlpha = prev * alpha;
      if(opts.outline){ctx.globalAlpha=prev*alpha*.9;const img=white(s.img);for(const [ox,oy]of [[-2,0],[2,0],[0,-2],[0,2]])ctx.drawImage(img,sx,sy,m.w,m.h,dx+ox,dy+oy,m.w*k,m.h*k);ctx.globalAlpha=prev*alpha;}
      // Destello: blanco entero (enemigos) o medio blanco encima (tu Pokémon).
      if (!opts.flash || opts.softFlash) ctx.drawImage(s.img, sx, sy, m.w, m.h, dx, dy, m.w * k, m.h * k);
      if (opts.flash) {
        if (opts.softFlash) ctx.globalAlpha = prev * alpha * 0.55;
        ctx.drawImage(white(s.img), sx, sy, m.w, m.h, dx, dy, m.w * k, m.h * k);
      }
      ctx.globalAlpha = prev;
    }
  }

  return { cacheStats,actionFor,prepareAction,EXTRA,PX, meta, hasShiny, hovers, white, animMeta, sheet, preload, dirFromAngle, bodyRadius, bodyHeight,
           drawShadow, Animator, ANIMS, get sheetCount() { return sheets.size; } };
})();
