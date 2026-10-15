/* ============ pathing.js — los enemigos rodean rocas y lagos ============
 * Un "campo de distancias" por jugador: cada pocas décimas se hace un
 * recorrido en anchura (BFS) por las casillas de alrededor del jugador,
 * apuntando cuántos pasos faltan desde cada casilla hasta él. Un enemigo
 * sólo tiene que ir hacia la casilla vecina con menos pasos, y así encuentra
 * el camino alrededor de paredes, rocas, árboles y charcos peligrosos.
 *
 *   - 8 vecinos, sin cortar esquinas (no se cuela entre dos rocas en diagonal).
 *   - Bloquean: paredes, objetos sólidos y lava/veneno/descarga.
 *     El agua se puede cruzar (sólo frena).
 *   - Los que flotan (G.Sprites.hovers) no lo necesitan: van en línea recta.
 *
 * Coste: R=28 casillas de radio → 57×57 = 3.249 casillas por jugador, cada
 * 0,35 s. Los enemigos fuera del campo (muy lejos) van en línea recta.
 */
G.Path = (() => {
  const R = 28, N = R * 2 + 1, EVERY = 0.35;
  const UNSEEN = 0x7fff;
  const fields = new Map();          // jugador -> { ox, oy, dist: Int16Array, t }
  const queue = new Int32Array(N * N);
  const D8 = [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]];
  let timer = 0;

  function build(pl) {
    const TS = G.World.TS;
    const px = Math.floor(pl.x / TS), py = Math.floor(pl.y / TS);
    const ox = px - R, oy = py - R;
    let f = fields.get(pl);
    if (!f) { f = { dist: new Int16Array(N * N) }; fields.set(pl, f); }
    f.ox = ox; f.oy = oy;
    const dist = f.dist;
    dist.fill(UNSEEN);
    // Casillas transitables del área (se consultan una vez).
    const open = f.open || (f.open = new Uint8Array(N * N));
    for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) open[j * N + i] = G.World.walkable(ox + i, oy + j) ? 1 : 0;

    const start = R * N + R;
    open[start] = 1;                 // donde está el jugador siempre cuenta
    dist[start] = 0;
    let head = 0, tail = 0;
    queue[tail++] = start;
    while (head < tail) {
      const c = queue[head++];
      const cx = c % N, cy = (c / N) | 0, d = dist[c] + 1;
      for (let k = 0; k < 8; k++) {
        const nx = cx + D8[k][0], ny = cy + D8[k][1];
        if (nx < 0 || ny < 0 || nx >= N || ny >= N) continue;
        const n = ny * N + nx;
        if (!open[n] || dist[n] !== UNSEEN) continue;
        // Diagonal: las dos casillas de al lado tienen que estar libres.
        if (k >= 4 && (!open[cy * N + nx] || !open[ny * N + cx])) continue;
        dist[n] = d;
        queue[tail++] = n;
      }
    }
  }

  /** Recalcula los campos de los jugadores vivos (lo llama el anfitrión / solitario). */
  function update(dt, players) {
    timer -= dt;
    if (timer > 0) return;
    timer = EVERY;
    for (const p of [...fields.keys()]) if (!players.includes(p)) fields.delete(p);
    for (const p of players) if (!p.dead) build(p);
  }

  /**
   * Dirección (normalizada) para que `e` llegue hasta `pl` rodeando
   * obstáculos, o null si no hace falta (cerca, fuera del campo o sin camino).
   */
  function dirFor(e, pl) {
    const f = fields.get(pl);
    if (!f) return null;
    const TS = G.World.TS;
    const tx = Math.floor(e.x / TS) - f.ox, ty = Math.floor(e.y / TS) - f.oy;
    if (tx < 0 || ty < 0 || tx >= N || ty >= N) return null;
    const here = f.dist[ty * N + tx];
    if (here <= 1 || here === UNSEEN) return null;   // pegado a ti, o sin camino: directo
    // Con vista despejada hasta el jugador, en línea recta (más natural).
    // Se comprueba cada 0,2 s por enemigo (es lo más caro).
    const now = performance.now();
    if (!e.losAt || now - e.losAt > 200) { e.losAt = now; e.los = clearLine(f, e.x, e.y, pl.x, pl.y, e.r); }
    if (e.los) return null;
    // Siguiente casilla del camino (la vecina con menos pasos, sin cortar esquinas).
    let bx = tx, by = ty, best = here;
    for (let k = 0; k < 8; k++) {
      const x = tx + D8[k][0], y = ty + D8[k][1];
      if (x < 0 || y < 0 || x >= N || y >= N) continue;
      const v = f.dist[y * N + x];
      if (v >= best) continue;
      if (k >= 4 && (!f.open[ty * N + x] || !f.open[y * N + tx])) continue;
      best = v; bx = x; by = y;
    }
    if (bx === tx && by === ty) return null;
    let gx = (f.ox + bx + 0.5) * TS, gy = (f.oy + by + 0.5) * TS;
    // Si va descentrado y el atajo hasta esa casilla roza un obstáculo,
    // primero al centro de la suya (así no se engancha en las esquinas).
    if (!clearLine(f, e.x, e.y, gx, gy, e.r)) { gx = (f.ox + tx + 0.5) * TS; gy = (f.oy + ty + 0.5) * TS; }
    return G.U.norm(gx - e.x, gy - e.y);
  }

  /** ¿Cabe un cuerpo de radio r en línea recta de (ax,ay) a (bx,by)? */
  function clearLine(f, ax, ay, bx, by, r) {
    const TS = G.World.TS;
    const len = Math.hypot(bx - ax, by - ay);
    if (len < 1) return true;
    const ux = (bx - ax) / len, uy = (by - ay) / len;
    const w = Math.min(r * 0.9, TS * 0.45);
    for (let d = 0; d <= len; d += TS * 0.4) {
      const cx = ax + ux * d, cy = ay + uy * d;
      for (const s of [-w, 0, w]) {
        const x = Math.floor((cx - uy * s) / TS) - f.ox, y = Math.floor((cy + ux * s) / TS) - f.oy;
        if (x < 0 || y < 0 || x >= N || y >= N) return false;
        if (!f.open[y * N + x]) return false;
      }
    }
    return true;
  }

  function clear() { fields.clear(); timer = 0; }

  // Bounded player route, independent of the enemy distance fields and their cadence.
  // Probe the existing collision solver with disposable coordinates, never move an entity.
  function route(from,goal) {
    const TS=G.World.TS,tx=Math.floor(goal.x/TS),ty=Math.floor(goal.y/TS);
    const sx=Math.floor(from.x/TS),sy=Math.floor(from.y/TS),ox=sx-R,oy=sy-R;
    if(Math.abs(tx-sx)>R||Math.abs(ty-sy)>R)return null;
    const fits=(x,y)=>G.World.walkable(Math.floor(x/TS),Math.floor(y/TS))&&!G.World.collide({x,y,r:from.r});
    if(!fits(goal.x,goal.y))return null;
    const line=(a,b)=>{const d=Math.hypot(b.x-a.x,b.y-a.y),steps=Math.max(1,Math.ceil(d/Math.max(2,Math.min(TS/4,from.r/2))));for(let i=1;i<=steps;i++)if(!fits(a.x+(b.x-a.x)*i/steps,a.y+(b.y-a.y)*i/steps))return false;return true;};
    if(line(from,goal))return [{x:goal.x,y:goal.y}];
    const parent=new Int32Array(N*N).fill(-1),open=new Int8Array(N*N).fill(-1),q=new Int32Array(N*N);
    const index=(x,y)=>(y-oy)*N+x-ox,start=index(sx,sy),end=index(tx,ty);
    const point=i=>({x:(ox+i%N+.5)*TS,y:(oy+Math.floor(i/N)+.5)*TS});
    const pass=i=>{if(open[i]<0){const p=point(i);open[i]=fits(p.x,p.y)?1:0;}return !!open[i];};
    let head=0,tail=0;parent[start]=start;open[start]=1;q[tail++]=start;
    while(head<tail&&parent[end]<0){const c=q[head++],x=c%N,y=Math.floor(c/N);
      for(const[dx,dy]of D8){const nx=x+dx,ny=y+dy;if(nx<0||nx>=N||ny<0||ny>=N)continue;const next=ny*N+nx;
        if(parent[next]>=0||!pass(next)||(dx&&dy&&(!pass(y*N+nx)||!pass(ny*N+x))))continue;
        if(!line(c===start?from:point(c),point(next)))continue;
        parent[next]=c;q[tail++]=next;
      }
    }
    if(parent[end]<0)return null;
    const points=[];for(let c=end;c!==start;c=parent[c])points.push(point(c));points.reverse();
    if(!points.length)return null;if(line(points.at(-1),goal))points.push({x:goal.x,y:goal.y});else return null;
    // Greedy visibility smoothing keeps the path natural without cutting collisions.
    const result=[];let current=from,i=0;while(i<points.length){let j=points.length-1;while(j>i&&!line(current,points[j]))j--;result.push(points[j]);current=points[j];i=j+1;}return result;
  }
  return { update, dirFor, clear, route };
})();
