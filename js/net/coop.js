/* ============ coop.js — partida cooperativa (hasta 4 jugadores) ============
 *
 * Quién manda en qué:
 *   ANFITRIÓN   enemigos (aparición, IA, vida, muerte), objetos del suelo,
 *               experiencia y nivel del equipo, reloj, fin de la partida.
 *   CADA UNO    su propio Pokémon: posición, vida, ataques y lo que le golpea.
 *               Sus golpes a enemigos se mandan al anfitrión, que los aplica.
 *
 * Los invitados ven COPIAS de los enemigos del anfitrión (enemy.remote) y los
 * ataques de los compañeros como "fantasmas" que no hacen daño (ver combat.js).
 *
 * Quién está eligiendo (objeto o vínculo) y quién ha elegido carta de nivel va
 * además en CADA envío (no sólo en un aviso suelto): si un aviso se pierde
 * porque la conexión parpadea, el siguiente envío lo arregla y nadie se queda
 * esperando a otro para siempre (pasaba en 2026-10).
 *
 * Mensajes (por net.js, unas 15 veces por segundo; 5 si va por el relé):
 *   invitado -> anfitrión  { k:'f', p:[estado], ev:[eventos] }
 *   anfitrión -> invitado  { k:'f', t, lv, xp, xn, ki, bo, co, p:{uid:[estado]},
 *                            e:[[id,x,y,vida,anim,dir,estados]], ev:[eventos],
 *                            ja:[x,y,anim,dir] (Arceus, sólo en la Sentencia) }
 *   anfitrión -> todos     { k:'start', seed, host, members:[{uid,name,dex,shiny}] }
 */
G.Coop = (() => {
  const ANIMS = ['Idle', 'Walk', 'Attack', 'Shoot', 'Charge', 'Hurt', 'Faint','Strike','Swing','Double','Hop','Rotate'];
  const COLORS = ['#ffcb3d', '#5fc8ff', '#7ee07a', '#ff8ad8', '#c7a0ff', '#ff9c55', '#70e3d1', '#d8e878'];
  // Mensajes por segundo: 15 directo, 4 por el TURN de Cloudflare (se paga por
  // GB: era 7 y se iban unos 110 GB al día, el 12-10-2026) y 3 por el relé de
  // la Realtime Database (1 $ el GB: sólo si todo lo demás falla).
  const RATE_FAST = 1 / 15, RATE_TURN = 1 / 4, RATE_SLOW = 1 / 3;
  const rateFor = u => {
    const interval=typeof G.Net.interval==='function'?G.Net.interval(u):null;
    return Number.isFinite(interval)&&interval>0?interval:(G.Net.slow(u)?RATE_SLOW:G.Net.viaTurn(u)?RATE_TURN:RATE_FAST);
  };
  const NEAR = 950;                     // radio de enemigos que se mandan a cada uno

  let active = false, host = false, me = null, hostUid = null;
  let local = null;                     // tu Player
  const mates = new Map();              // uid -> { uid, name, color, pl, connected, q:[], flushT, xpMul }
  let outEv = [];                       // invitado: eventos para el anfitrión
  let flushT = 0;
  let meleeSeq = 0, meleeAck = 0, battleSeq=0,battleAck=0;
  let hitFrom = null;                   // invitado cuyo golpe se está aplicando (no repetirle el número)
  let api = {};                         // callbacks del juego (game.js)
  let waiting = new Set();              // subida de nivel: quién falta por elegir
  let holds = new Set();                // quién está eligiendo una fusión (la partida se para para todos)
  // El anfitrión mueve a los enemigos: si cambia de pestaña (o se le congela),
  // todo se para para todos. Antes los enemigos se quedaban quietos y los demás
  // seguían jugando con una ventaja enorme.
  let hostAway = false, stalled = false, lastHostAt = 0;
  // Cartas de nivel: número de la ronda (anfitrión), la última que te ha llegado
  // y la última que has elegido (invitado). Y el último "quién elige" aplicado.
  let levelSeq = 0, levelNow = 1, seenSeq = 0, doneSeq = 0, lastHo = '';
  const STALL_MS = 2500;
  let members = [];let teamStats=null;
  const reconnecting=new Set(),marks=new Map();let pingAt=-Infinity;

  // ---------------- escalado de dificultad ----------------

  const scaleRate = n => 1 + 0.75 * Math.max(0, n - 1);
  const scaleHp = n => 1 + 0.3 * Math.max(0, n - 1);

  // ---------------- arranque / fin ----------------

  /**
   * @param cfg   { seed, host, members }
   * @param pl    tu Player (ya creado)
   * @param cb    { levelStart(lv), resume(), waiting(names), over(data), lost(msg), team(t), shiny(dex) }
   */
  function begin(cfg, pl, cb) {
    meleeSeq=0; meleeAck=0;battleSeq=0;battleAck=0;
    active = true;reconnecting.clear();marks.clear();pingAt=-Infinity;
    me = G.Net.uid; hostUid = cfg.host;
    host = me === hostUid;
    local = pl;
    api = cb;
    members = cfg.members;teamStats=G.TeamStats.create(members);
    mates.clear();
    outEv = []; flushT = 0; waiting = new Set(); holds = new Set();
    hostAway = false; stalled = false; lastHostAt = performance.now();
    levelSeq = 0; levelNow = 1; seenSeq = 0; doneSeq = 0; lastHo = '';
    cfg.members.forEach((m, i) => {
      const x = (i - (cfg.members.length - 1) / 2) * 34, y = 0;
      if (m.uid === me) { pl.x = x; pl.y = y; pl.uid = me; pl.coopHost = host; pl.tagColor = COLORS[i]; return; }
      const mon = G.DEX_BY[m.dex] || G.DEX_BY[25];
      const p = new G.Player(mon, {}, !!m.shiny);
      p.remote = true; p.uid = m.uid; p.tag = m.name; p.tagColor = COLORS[i]; p.revLabel = 'Quédate a su lado';
      p.x = x; p.y = y;
      p.net = { x, y, ang: Math.PI / 2, walk: 0, hp: p.maxHp, maxHp: p.maxHp, dead: 0, mv: G.startMoveOf(mon.dex), ml: 1, mag: 78, aim: Math.PI / 2, rev: 0 };
      G.Sprites.preload([mon.dex], 8000, p.shiny);
      mates.set(m.uid, { uid: m.uid, name: m.name, color: COLORS[i], pl: p, connected: true, lastAt:performance.now(), q: [], flushT: 0, xpMul: 1 });
    });
  }

  function end() {
    active = false; host = false; local = null;reconnecting.clear();marks.clear();
    mates.clear(); outEv = []; waiting = new Set(); holds = new Set();
  }

  /** Te vas de la partida (los demás siguen). */
  function leave() {
    if (!active) return;
    if (host) {
      // Si se va el anfitrión, la partida termina para todos.
      emit(['ov', Object.assign(api.summary ? api.summary() : {}, { why: 'host',teamStats:teamStats?.snapshot() })]);
      flushAll();
    } else {
      outEv.push(['bye']);
      flushClient(true);
    }
    end();
  }

  // ---------------- lista de jugadores ----------------

  function players() {
    const out = [local];
    for (const m of mates.values()) if (m.connected) out.push(m.pl);
    return out;
  }
  function puppets() { const out = []; for (const m of mates.values()) if (m.connected) out.push(m.pl); return out; }

  /**
   * Multiplicador de la experiencia del equipo: la media de los bonus de
   * cada uno, y repartida entre los que sois (en grupo cae mucho más, y si no
   * se subiría de nivel el triple de rápido que en solitario).
   */
  function xpFactor() {
    let s = local.xpMul, n = 1;
    for (const m of mates.values()) if (m.connected) { s += m.xpMul || 1; n++; }
    return (s / n) / local.xpMul / (1 + 0.6 * (n - 1));
  }

  // ---------------- estado de un jugador ----------------

  const r1 = v => Math.round(v), r2 = v => Math.round(v * 100) / 100;

  function myState() {
    // Con un vínculo se manda la órbita si la hay (es lo único que los demás no ven por los 'c').
    const g = local.activeGroup();
    const m = g.find(x => x.kind === 'orbit') || g[0];
    return [r1(local.x), r1(local.y), r2(local.moveAngle), local.walking ? 1 : 0, r1(local.hp), r1(local.maxHp),
            local.dead ? 1 : 0, m ? m.id : '', m ? m.lvl : 1, r1(local.magnet), r2(local.aim), r2(local.xpMul),
            r2(local.reviveT || 0), api.choosing && api.choosing() ? 1 : 0, doneSeq,local.anim?.snapshot?.()||null,G.Battle?.net(local)||null];
  }

  function readState(a) {
    return { x: a[0], y: a[1], ang: a[2], walk: a[3], hp: a[4], maxHp: a[5], dead: a[6], mv: a[7], ml: a[8],
             mag: a[9], aim: a[10], xpMul: a[11], rev: a[12], ch: a[13], ld: a[14],pose:a[15],battle:a[16],poseAt:performance.now() };
  }

  // ---------------- envío ----------------

  /** Anfitrión: evento para todos los invitados (menos `except`). */
  function emit(ev, except) {
    if (!host) return;
    for (const m of mates.values()) if (m.connected && m.uid !== except) m.q.push(ev);
  }

  /** Anfitrión: evento sólo para los que están cerca (números de daño). */
  function emitNear(ev, x, y, except) {
    for (const m of mates.values()) {
      if (!m.connected || m.uid === except) continue;
      if (G.U.dist2(m.pl.x, m.pl.y, x, y) > 700 * 700) continue;
      if (m.q.length > 400) continue;
      m.q.push(ev);
    }
  }

  function enemyList(near) {
    const out = [];
    const r2n = NEAR * NEAR;
    for (const e of G.EnemyMgr.all()) {
      if (e.dead || G.U.dist2(e.x, e.y, near.x, near.y) > r2n) continue;
      const a = ANIMS.indexOf(e.anim.cur);
      out.push([e.id, r1(e.x), r1(e.y), Math.ceil(e.hp), a < 0 ? 0 : a, e.anim.dir,
                (e.burn > 0 ? 1 : 0) | (e.poison > 0 ? 2 : 0) | (e.shield > 0 ? 4 : 0) | (e.staggerT > 0 ? 8 : 0) | (!G.BattleBalance.bodyContact(e)?16:0) | (e.elite?32:0),e.anim.serial||0,Math.round((e.anim.elapsed||0)*10)/10,Math.round(e.anim.speed*100)/100,e.dex,e.bossStage||0,e.scale||1]);
    }
    return out;
  }

  function hostFrame(m) {
    const st = api.team();
    const p = { [me]: myState() };
    for (const o of mates.values()) {
      if (o.connected && o.uid !== m.uid && o.state) p[o.uid] = o.state;
    }
    const ev = m.q; m.q = [];
    const f = { k: 'f', t: r2(st.time), lv: st.level, xp: r2(st.xp), xn: st.xpNext, ki: st.kills, bo: st.bosses, co: st.coins, tk: [st.t1, st.t10],
                p, e: enemyList(m.pl), ev, ts:teamStats?.snapshot() };
    const ja = G.Judgment.netState();       // Arceus en la Sentencia
    if (ja) f.ja = ja;
    // Siempre: quién está eligiendo y, si hay cartas de nivel, cuáles (ver arriba).
    f.ho = holdNames();f.aw=hostAway||reconnecting.size>0;
    // Repair enemy creation after a brief connection outage without restarting a run.
    if(!m.repairAt||performance.now()>m.repairAt){m.repairAt=performance.now()+2000;f.meta=f.e.map(a=>{const e=G.EnemyMgr.get(a[0]);return [e.id,e.dex,e.maxHp,e.dmg,e.boss?1:0,e.shiny?1:0,e.behavior];});}
    if (waiting.size) f.lu = [levelSeq, levelNow];
    return f;
  }

  function flushAll() { for (const m of mates.values()) if (m.connected) G.Net.send(m.uid, hostFrame(m)); }

  function flushClient(force) {
    if (!force && !outEv.length && flushT > 0) return;
    G.Net.toHost({ k: 'f', p: myState(), ev: outEv });
    outEv = [];
  }

  /** Cada fotograma (también en la pantalla de subida de nivel). */
  function tick(dt) {
    if (!active) return;
    if (host) {
      for (const m of mates.values()) {
        if (!m.connected) continue;
        if(performance.now()-m.lastAt>STALL_MS&&!reconnecting.has(m.uid)){reconnecting.add(m.uid);updateAway();}
        m.flushT -= dt;
        if (m.flushT > 0) continue;
        m.flushT = Math.max(0,m.flushT + rateFor(m.uid));
        G.Net.send(m.uid, hostFrame(m));
      }
    } else {
      if (!stalled && performance.now() - lastHostAt > STALL_MS) { stalled = true; updateAway(); }
      flushT -= dt;
      if (flushT <= 0) {
        flushT = Math.max(0,flushT + rateFor(hostUid));
        G.Net.toHost({ k: 'f', p: myState(), ev: outEv });
        outEv = [];
      }
    }
  }

  // ---------------- recepción ----------------

  G.Net.on((from, msg) => {
    if (!msg) return;
    if (msg.k === 'start') { if (G.Flow.startCoop) G.Flow.startCoop(msg); return; }
    if (!active || msg.k !== 'f') return;
    if (host) onClientFrame(from, msg); else if (from === hostUid) onHostFrame(msg);
  });

  G.Net.onPeer((u, mode) => {
    if(!active)return;
    if(mode==='reconnecting'){reconnecting.add(u);updateAway();return;}
    if(mode==='relay'||mode==='direct'){reconnecting.delete(u);const m=mates.get(u);if(m)m.repairAt=0;updateAway();return;}
    reconnecting.delete(u);updateAway();
    if(mode!=='closed'&&mode!=='failed')return;
    if (host) mateGone(u);
    else if (u === hostUid) { const cb = api.lost; end(); if (cb) cb('Se ha perdido la conexión con el anfitrión.'); }
  });

  function mateGone(u) {
    const m = mates.get(u);
    if (!m || !m.connected) return;
    m.connected = false;
    G.Projectiles.clearOrbs(m.pl);
    G.Spawner.say(m.name + ' ha dejado la partida', 2.6);
    if (waiting.has(u)) picked(u);
    if (holds.has(u)) holdOff(u);
    if (api.mateLeft) api.mateLeft(m);
  }

  // --- en el anfitrión ---

  function onClientFrame(from, msg) {
    const m = mates.get(from);
    if (!m || !m.connected) return;
    if(msg.p&&m.pl.net?.dead&&!readState(msg.p).dead)rescued(from);
    if (msg.p) {m.lastAt=performance.now();if(reconnecting.delete(from))updateAway();m.state = msg.p; m.pl.net = readState(msg.p); m.xpMul = m.pl.net.xpMul || 1; reconcile(from, m.pl.net); }
    for (const ev of msg.ev || []) {
      switch (ev[0]) {
        case 'h': {
          const e = G.EnemyMgr.get(ev[1]);
          if (!e || e.dead || e.remote) break;
          hitFrom = from;
          e.hurt(ev[2], ev[3], ev[4], ev[5], ev[6],null,from);
          hitFrom = null;
          break;
        }
        case 'bh': {
          if(!G.Battle||!Number.isSafeInteger(ev[1])||ev[1]<=(m.battleSeen||0))break;m.battleSeen=ev[1];
          const e=G.EnemyMgr.get(ev[2]),move=G.Moves.BY_ID[ev[8]];
          if(!e||e.dead||e.remote||!move||![ev[3],ev[5],ev[6],ev[7]].every(Number.isFinite)||ev[3]<=0)break;
          hitFrom=null;const result=G.Battle.accept(m.pl,e,ev[3],ev[4],ev[5],ev[6],ev[7],move,ev[9]);
          if(result.dealt>0)m.q.push(['bb',ev[1],move.id,result.dealt,result.killed]);break;
        }
        case 'fc':if(G.Combat.special(m.pl,ev[1],true,ev[2]))G.Combat.specialEnvironment?.(m.pl,ev[2]);emit(['fc',from,ev[1],ev[2]],from);break;
        case 'mh': {
          if (!Number.isSafeInteger(ev[1]) || ev[1] <= (m.meleeSeen || 0)) break;
          m.meleeSeen=ev[1];
          const e=G.EnemyMgr.get(ev[2]), def=G.Moves.BY_ID[ev[7]];
          if (!e || e.dead || e.remote || !['melee','counter'].includes(def?.kind) || !Number.isFinite(ev[3]) || ev[3]<=0 || !Number.isFinite(ev[5]) || !Number.isFinite(ev[6])) break;
          const move=G.Moves.instance(def.id,Math.max(1,Math.min(def.maxLvl,ev[8]|0)));
          if (ev[9]) G.Moves.evolve(move);
          // No local damage prediction for melee: send confirmed hit feedback to the attacker too.
          G.Battle?.ingest(m.pl,m.pl.net?.battle);if(m.pl.net){m.pl.hp=m.pl.net.hp;m.pl.maxHp=m.pl.net.maxHp;}
          hitFrom=null;
          const eff=['crit','super','weak'].includes(ev[10])?ev[10]:null;
          const result=G.Combat.acceptMeleeHit(m.pl,e,ev[3],ev[4],ev[5],ev[6],move,eff);
          hitFrom=null;
          if (result.dealt>0) m.q.push(['mb',ev[1],move.id,result.killed,result.dealt]);
          break;
        }
        case 's': {
          const e = G.EnemyMgr.get(ev[1]);
          if (!e || e.dead) break;
          if (ev[2] === 'b') e.applyBurn(ev[3]);
          else if (ev[2] === 'p') e.applyPoison(ev[3]);
          else if (ev[2] === 's') e.applySlow(ev[3]);
          break;
        }
        case 'c':
          G.Combat.ghostCast(m.pl, ev[1], ev[2], ev[3], ev[4],ev[5],ev[6]);
          if(G.Moves.BY_ID[ev[1]]?.kind==='decoy')G.Combat.authorizeDecoy?.(m.pl);
          emit(['c', from, ev[1], ev[2], ev[3], ev[4],ev[5],ev[6]], from);
          break;
        case 'pb':
          G.World.breakAt(ev[1], ev[2]);
          emit(['pb', ev[1], ev[2]], from);
          break;
        case 'mark':acceptMark(from,ev[1],ev[2],ev[3]);break;
        case 'lp': picked(from); break;
        case 'hs': holdOn(from); break;
        case 'he': holdOff(from); break;
        case 're': G.Rift.enterRequest(); break;
        case 'bye': mateGone(from); break;
      }
    }
  }

  /** Anfitrión: lo que dice cada envío del invitado manda sobre avisos que se hayan perdido. */
  function reconcile(from, n) {
    if (n.ch === undefined) return;                        // versión vieja del juego
    if (n.ch && !holds.has(from)) holdOn(from);
    else if (!n.ch && holds.has(from)) holdOff(from);
    if (waiting.has(from) && n.ld >= levelSeq) picked(from);
  }

  // --- en el invitado ---

  /** Invitado: se para (o sigue) según si el anfitrión está. */
  function updateAway(){if(api.away)api.away(reconnecting.size?[...reconnecting].map(nameOf).join(', '):hostAway||stalled?nameOf(hostUid):null);}

  // Anfitrión: al irse de la pestaña avisa a todos al momento (después ya no
  // podrá mandar nada) y al volver, que sigue.
  document.addEventListener('visibilitychange', () => {
    if (!active || !host) return;
    emit(['ha', document.hidden ? 1 : 0]);
    flushAll();
  });

  function onHostFrame(msg) {
    lastHostAt = performance.now();
    if (stalled) { stalled = false; updateAway(); }
    if(msg.ts)teamStats?.ingest(msg.ts);
    for (const ev of msg.ev || []) applyHostEvent(ev);
    if(msg.t===undefined)return;
    hostAway=!!msg.aw;updateAway();
    for(const a of msg.meta||[])if(!G.EnemyMgr.get(a[0])){const state=(msg.e||[]).find(e=>e[0]===a[0]);if(state)G.EnemyMgr.addRemote({id:a[0],dex:a[1],hp:a[2],dmg:a[3],boss:!!a[4],shiny:!!a[5],beh:a[6],x:state[1],y:state[2]});}
    if (msg.ja) G.Judgment.netApply(msg.ja);
    // Quién elige y las cartas de nivel, aunque se haya perdido algún aviso.
    if (msg.ho) {
      const k = msg.ho.join('|');
      if (k !== lastHo) { lastHo = k; api.hold && api.hold(msg.ho); }
      if (msg.lu && msg.lu[0] > seenSeq) { seenSeq = msg.lu[0]; api.levelStart(msg.lu[1]); }
      else if (!msg.lu && api.inLevelUp && api.inLevelUp()) api.resume();
    }
    api.syncTeam({ time: msg.t, level: msg.lv, xp: msg.xp, xpNext: msg.xn, kills: msg.ki, bosses: msg.bo, coins: msg.co,
                   t1: (msg.tk || [])[0], t10: (msg.tk || [])[1] });
    for (const u in msg.p || {}) {
      const m = mates.get(u);
      if (m) m.pl.net = readState(msg.p[u]);
    }
    const now = performance.now();
    for (const a of msg.e || []) {
      const e = G.EnemyMgr.get(a[0]);
      if (!e || !e.remote || e.dead) continue;
      G.BossStages?.remote(e,a[10],a[11],a[12]);
      const n = e.net;
      const dts = (now - (n.last || now)) / 1000;
      if (dts > 0.02 && dts < 1) {
        n.vx = G.U.clamp((a[1] - n.x) / dts, -600, 600);
        n.vy = G.U.clamp((a[2] - n.y) / dts, -600, 600);
      } else { n.vx = 0; n.vy = 0; }
      n.x = a[1]; n.y = a[2]; n.age = 0; n.last = now;
      e.hp = Math.min(e.maxHp, a[3]);
      e.elite=!!(a[6]&32);
      n.anim = a[4]; n.dir = a[5]; n.st = a[6];n.pose=Number.isSafeInteger(a[7])?[a[7],ANIMS[a[4]],a[8],a[9],a[4]>1?1:0,a[4]===6?1:0,a[4]===0?'Idle':'Walk',1,a[5]]:null;n.poseAt=now;
    }
  }

  function applyHostEvent(ev) {
    switch (ev[0]) {
      case 'ne':
        G.EnemyMgr.addRemote({ id: ev[1], dex: ev[2], x: ev[3], y: ev[4], boss: !!ev[5], shiny: !!ev[6], hp: ev[7], dmg: ev[8], beh: ev[9],elite:!!ev[10] });
        break;
      case 'ed': G.EnemyMgr.removeRemote(ev[1], true); break;
      case 'eg': G.EnemyMgr.removeRemote(ev[1], false); break;
      case 'hn': { const e = G.EnemyMgr.get(ev[1]); if (e && !e.dead) e.showHurt(ev[2], ev[3],0,0,ev[4] || null); break; }
      case 'es':
        G.Projectiles.spawn({ x: ev[1], y: ev[2], vx: ev[3], vy: ev[4], dmg: ev[5], r: ev[6], life: ev[7],
                              friendly: false, fromNet:true, color: '#ff7a9e', vis: G.VFX.forType(ev[8]), mtype: ev[8],enemyId:ev[9],enemyStage:ev[10] });
        break;
      case 'c': { const m = mates.get(ev[1]); if (m) G.Combat.ghostCast(m.pl, ev[2], ev[3], ev[4], ev[5],ev[6],ev[7]); break; }
      case 'mark':marks.set(ev[1],{uid:ev[1],kind:ev[2],x:ev[3],y:ev[4],at:performance.now()});break;
      case 'item': api.item(ev[1]); break;
      case 'pk': G.Pickups.addRemote(ev[1], ev[2], ev[3], ev[4], ev[5]); break;
      case 'pc': G.Pickups.removeId(ev[1]); break;
      case 'mag': G.Pickups.pullAll(); G.FX.ring(local.x, local.y, 10, 420, '#ff9ed8', 0.6, 4); break;
      case 'bomb':
        G.FX.ring(ev[1], ev[2], 20, G.Camera.outerRadius(), '#ff7b3d', 0.5, 6);
        if (G.U.dist2(ev[1], ev[2], local.x, local.y) < 500 * 500) G.Camera.kick(0.8);
        G.Audio.sfx('break');
        break;
      case 'pb': G.World.breakAt(ev[1], ev[2]); break;
      case 'say': G.Spawner.say(ev[1], ev[2]); break;
      case 'zc': G.Hazards.clearAround?.(ev[1],ev[2],ev[3]);break;
      case 'fc': {const mate=mates.get(ev[1]);if(mate)G.Combat.special(mate.pl,ev[2],true,ev[3]);break;}
      case 'bb': {
        if(!G.Battle||!Number.isSafeInteger(ev[1])||ev[1]<=battleAck)break;battleAck=ev[1];const move=G.Moves.BY_ID[ev[2]];if(move)G.Battle.credit(local,move,ev[3],ev[4]===true);break;
      }
      case 'mb': {
        if (!Number.isSafeInteger(ev[1]) || ev[1]<=meleeAck) break;
        meleeAck=ev[1];
        const m=G.Moves.BY_ID[ev[2]];
        if (['melee','counter'].includes(m?.kind)) G.Combat.meleeBenefits(local,m,ev[3]===true,ev[4]);
        break;
      }
      case 'heal': if (!local.dead) { local.heal(local.maxHp * ev[1]); G.FX.ring(local.x, local.y, 6, 60, '#5fe08a', 0.4, 3); } break;
      case 'lu': if (!ev[2] || ev[2] > seenSeq) { seenSeq = ev[2] || seenSeq; api.levelStart(ev[1]); } break;
      case 'lw': api.waiting(ev[1]); break;
      case 'lr': api.resume(); break;
      case 'hp': lastHo = (ev[1] || []).join('|'); api.hold && api.hold(ev[1]); break;
      case 'ha': hostAway = !!ev[1]; updateAway(); break;
      case 'sh': api.shiny(ev[1]); break;
      case 'ov': { const cb = api.over; const d = ev[1];if(d.teamStats)teamStats?.ingest(d.teamStats);end(); cb(d); break; }
      case 'mr': G.RunGrowth.reward(local,ev[1]); break;
      case 'rift': case 'riftx': case 'arena': case 'aw': case 'al': G.Rift.onEvent(ev); break;
      case 'jd': case 'jk': G.Judgment.onEvent(ev); break;
      case 'wx': G.Weather.onEvent(ev); break;
      case 'ev': G.Events.onNet(ev); break;
      case 'hz': G.Hazards.add(ev[1], true); break;
      case 'fxr': G.FX.ring(ev[1], ev[2], 8, ev[3], ev[4], 0.5, 3); break;
    }
  }

  // ---------------- ganchos que llaman los módulos del juego ----------------

  /** Tu ataque: los demás lo repiten como fantasma. */
  function cast(pl, m) {
    if (!active || pl !== local) return;
    const target=pl.target?[r1(pl.target.x),r1(pl.target.y),pl.target.id||0,pl.target.bodyH||20]:null;
    if (host) emit(['c', me, m.id, m.lvl, r2(pl.aim), m.evolved ? 1 : 0,pl.anim.snapshot(),target]);
    else outEv.push(['c', m.id, m.lvl, r2(pl.aim), m.evolved ? 1 : 0,pl.anim.snapshot(),target]);
  }

  // invitado
  function hit(e, d, color, dx, dy, knock) { outEv.push(['h', e.id, d, color, r1(dx), r1(dy), knock || 0]); }
  function status(e, kind, val) { outEv.push(['s', e.id, kind, val]); }

  function meleeHit(e,d,color,dx,dy,m,eff=null) {
    if (!active || host || !Number.isFinite(d) || d<=0) return;
    outEv.push(['mh',++meleeSeq,e.id,d,color,r1(dx),r1(dy),m.id,m.lvl,m.evolved?1:0,eff]);
  }

  function battleHit(e,d,col,dx,dy,knock,m,eff){if(!active||host)return;outEv.push(['bh',++battleSeq,e.id,d,col,r1(dx),r1(dy),knock||0,m.id,eff]);}
  function formCast(pl,kind,cast){if(!active||pl!==local)return;if(host)emit(['fc',me,kind,cast]);else outEv.push(['fc',kind,cast]);}

  // anfitrión
  function hurtShown(e, d, color, eff=null) { emitNear(['hn', e.id, d, color, eff], e.x, e.y, hitFrom); }
  function enemyAdded(e) {
    emit(['ne', e.id, e.dex, r1(e.x), r1(e.y), e.boss ? 1 : 0, e.shiny ? 1 : 0, Math.ceil(e.maxHp), r2(e.dmg), e.behavior,e.elite?1:0]);
  }
  function enemyGone(e, died) { teamStats?.forget(e.id);emit([died ? 'ed' : 'eg', e.id]); }
  function enemyShot(p, type) { emit(['es', r1(p.x), r1(p.y), r1(p.vx), r1(p.vy), r2(p.dmg), p.r, p.life, type,p.enemyId,p.enemyStage]); }
  function pickupAdded(o) { emit(['pk', o.id, o.kind, r1(o.x), r1(o.y), o.value]); }
  function pickupGone(id) { emit(['pc', id]); }
  function say(text, secs) { emit(['say', text, secs]); }

  function propBroken(p) {
    if (host) emit(['pb', p.tx, p.ty]);
    else outEv.push(['pb', p.tx, p.ty]);
  }

  /** Anfitrión: alguien ha cogido un objeto. Devuelve true si es para ti. */
  function collected(p, who) {
    emit(['pc', p.id]);
    if (p.kind === 'magnet') emit(['mag']);
    if (p.kind === 'bomb') emit(['bomb', r1(who.x), r1(who.y)]);
    if ((p.kind === 'heal' || p.kind === 'item') && who !== local) {
      const m = mates.get(who.uid);
      if (m) m.q.push(p.kind === 'heal' ? ['heal', 0.3] : ['item', p.value]);
    }
  }

  function shinyCaught(e) { emit(['sh', e.dex]); }

  // ---------------- subida de nivel compartida ----------------

  function levelStart(level) {
    waiting = new Set([me]);
    for (const m of mates.values()) if (m.connected) waiting.add(m.uid);
    levelSeq++; levelNow = level;
    emit(['lu', level, levelSeq]);
    flushAll();
    api.levelStart(level);
    sendWaiting();
  }

  function nameOf(u) { return u === me ? (G.Social.me ? G.Social.me.name : 'Tú') : (mates.get(u) || {}).name || '?'; }

  function sendWaiting() {
    const names = [...waiting].map(nameOf);
    emit(['lw', names]);
    api.waiting(names);
  }

  /** Alguien ha elegido carta (anfitrión). */
  function picked(u) {
    if (!waiting.delete(u)) return;
    if (waiting.size) { sendWaiting(); return; }
    emit(['lr']);
    flushAll();
    api.resume();
  }

  // ---------------- fusiones: pausa para todos ----------------
  // Mientras alguien elige qué movimientos fusiona (vínculo de un legendario),
  // la partida se para para todos, como con las cartas de nivel.

  function holdNames() { return [...holds].map(nameOf); }

  /** Anfitrión: `u` empieza a elegir. */
  function holdOn(u) {
    holds.add(u);
    emit(['hp', holdNames()]); flushAll();
    api.hold && api.hold(holdNames());
  }

  /** Anfitrión: `u` ha terminado (o se ha ido). */
  function holdOff(u) {
    if (!holds.delete(u)) return;
    emit(['hp', holdNames()]); flushAll();
    api.hold && api.hold(holdNames());
  }

  /** Tú empiezas / terminas de elegir fusión. */
  function holdStart() { if (host) holdOn(me); else { outEv.push(['hs']); flushClient(true); } }
  function holdEnd() { if (host) holdOff(me); else { outEv.push(['he']); flushClient(true); } }

  /** Has elegido tu carta. */
  function localPicked() {
    if (host) picked(me);
    else { doneSeq = seenSeq; outEv.push(['lp']); flushClient(true); }
  }

  /** Anfitrión: se acabó para todos. */
  function over(data) {
    data.teamStats=teamStats?.snapshot();
    emit(['ov', data]);
    flushAll();
    end();
  }

  function acceptMark(uid,kind,x,y){const p=uid===me?local:mates.get(uid)?.pl;if(!p||!['gather','help','danger'].includes(kind)||!Number.isFinite(x)||!Number.isFinite(y)||G.U.dist2(p.x,p.y,x,y)>160*160)return;const last=marks.get(uid);if(last&&performance.now()-last.at<2500)return;marks.set(uid,{uid,kind,x,y,at:performance.now()});emit(['mark',uid,kind,x,y]);}
  function ping(kind='gather'){if(!active||performance.now()-pingAt<3000)return false;pingAt=performance.now();if(host)acceptMark(me,kind,r1(local.x),r1(local.y));else{outEv.push(['mark',kind,r1(local.x),r1(local.y)]);flushClient(true);}return true;}

  function rescued(victim){if(!active||!host)return;const v=victim===me?local:mates.get(victim)?.pl;if(!v)return;teamStats?.rescue(players().filter(p=>p&&p.uid!==victim&&!p.dead&&G.U.dist2(p.x,p.y,v.x,v.y)<56*56).map(p=>p.uid));}
  return {
    rescued,noteDamage(e,uid,damage,killed){if(active&&host)teamStats?.hit(e.id,uid,damage,killed);},get teamStats(){return teamStats?.snapshot()||[];},
    ping,get marks(){return [...marks.values()].filter(m=>performance.now()-m.at<8000);},
    ANIMS, COLORS, begin, end, leave, tick, players, puppets, xpFactor, scaleRate, scaleHp,
    battleHit,formCast,cast, hit, meleeHit, status, hurtShown, enemyAdded, enemyGone, enemyShot, pickupAdded, pickupGone, say,
    propBroken, collected, shinyCaught, levelStart, localPicked, over, holdStart, holdEnd,
    /** Anfitrión: evento para todos. Invitado: evento para el anfitrión. */
    broadcast(ev) { emit(ev); },
    toHost(ev) { if (active && !host) { outEv.push(ev); flushClient(true); } },
    mate(u) { return mates.get(u); },
    get mates() { return [...mates.values()]; },
    get members() { return members; },
    get active() { return active; },
    get isHost() { return active && host; },
    get local() { return local; }
  };
})();
