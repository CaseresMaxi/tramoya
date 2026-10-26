// Armazón de un reel: pieza corta de motion a tempo, dibujada en SVG a partir del tiempo.
//
//   TRAMOYA.reel({
//     duracion: 12,                    segundos
//     bpm: 120,                        el pulso marca los cortes y la música
//     partes: ['Gancho', ...],         nombres por compás (4 pulsos) para la línea de tiempo
//     fondo: '#0d0d0f',
//     dibujar(t, h) → string,          el contenido SVG del instante t (sin <svg>)
//     audio: async (ac, h) => {},      opcional: arma la banda en un OfflineAudioContext
//   })
//
// Todo se calcula dentro de seek(t): sin animaciones CSS, sin timers y sin estado entre
// cuadros. El reproductor usa el reloj del audio cuando hay sonido (así la imagen no se
// desfasa de la música) y el del navegador cuando no.
// Con ?render no hay interfaz y el escenario queda fijo en 1920×1080 (render/video.mjs).
(function () {
  const U = window.TRAMOYA;
  const W = 1920, H = 1080, CX = 960, CY = 540;

  // ---------- Ayudas para dibujar ----------
  const r2 = U.r2;
  // Desenfoque direccional precalculado: blur(vx) devuelve el atributo filter según la velocidad (px/s)
  const DEFS = '<defs>' + Array.from({ length: 40 }, (_, i) => `<filter id="hb${i + 1}" x="-50%" y="-10%" width="200%" height="120%"><feGaussianBlur stdDeviation="${i + 1} 0"/></filter>`
    + `<filter id="vb${i + 1}" x="-10%" y="-50%" width="120%" height="200%"><feGaussianBlur stdDeviation="0 ${i + 1}"/></filter>`).join('') + '</defs>';
  const blur = (vx, vy = 0) => {
    const ax = Math.abs(vx) >= Math.abs(vy), s = Math.min(40, Math.round(Math.max(Math.abs(vx), Math.abs(vy)) / 260));
    return s >= 1 ? ` filter="url(#${ax ? 'h' : 'v'}b${s})"` : '';
  };
  // Medición de texto: determinística porque la fuente ya está cargada cuando se dibuja
  const ctx2d = document.createElement('canvas').getContext('2d');
  const familia = () => window.PROYECTO?.tipografia?.display || 'Georgia, serif';
  const medir = (str, size, { italic = false, weight = 800, font = familia() } = {}) => { ctx2d.font = `${italic ? 'italic ' : ''}${weight} ${size}px ${font}`; return ctx2d.measureText(str).width; };
  const texto = (str, x, y, size, fill, { italic = false, weight = 800, anchor = 'start', extra = '', ls = 0, font = familia() } = {}) =>
    `<text x="${r2(x)}" y="${r2(y)}" font-family="${font.replace(/"/g, "'")}" font-size="${size}" font-weight="${weight}" font-style="${italic ? 'italic' : 'normal'}" fill="${fill}" text-anchor="${anchor}" letter-spacing="${ls}" ${extra}>${U.esc(str)}</text>`;

  function reel(cfg) {
    const DUR = cfg.duracion, BEAT = 60 / (cfg.bpm || 120), BAR = BEAT * 4;
    const isRender = new URLSearchParams(location.search).has('render');
    // Pulso del bombo: 0 en el golpe, pico a los 30 ms y decae (para "latir" con la música)
    const kick = (t) => { const dt = t - Math.floor(t / BEAT + 1e-9) * BEAT; return (dt / 0.03) * Math.exp(1 - dt / 0.03); };
    const h = { W, H, CX, CY, BEAT, BAR, DUR, kick, blur, medir, texto, r2, ...U };

    // ---------- Escenario e interfaz ----------
    document.title = cfg.titulo || document.title;
    const css = document.createElement('style');
    css.textContent = `
      html,body{margin:0; height:100%; background:#050506; overflow:hidden}
      #root{position:absolute; left:50%; top:50%; width:${W}px; height:${H}px; transform-origin:center; cursor:pointer}
      body.render #root{left:0; top:0; transform:none !important}
      body.render .player{display:none}
      #root svg{display:block}
      .player{position:fixed; left:50%; bottom:18px; transform:translateX(-50%); width:min(1100px, calc(100% - 32px)); background:rgba(14,14,16,.9); backdrop-filter:blur(14px);
        border:1px solid #2b2b31; border-radius:16px; padding:10px 14px 12px; color:#f4f1eb; font:13px system-ui,sans-serif; display:grid; gap:8px; transition:opacity .4s, transform .4s; z-index:10}
      .player.hidden{opacity:0; transform:translate(-50%, 20px); pointer-events:none}
      .player .row{display:flex; align-items:center; gap:6px; flex-wrap:wrap}
      .player .spacer{flex:1}
      .player .btn{background:#24242a; color:#f4f1eb; border:1px solid #2b2b31; border-radius:9px; padding:7px 11px; font:inherit; cursor:pointer}
      .player .btn:hover{background:#2f2f36}
      .player .btn.on{background:#d7a54a; color:#111; border-color:#d7a54a}
      .tl{position:relative; height:38px; border-radius:8px; background:#1b1b20; cursor:pointer; overflow:hidden}
      .tl .part{position:absolute; top:0; bottom:0; border-right:2px solid #0e0e10}
      .tl .part span{position:absolute; left:8px; top:5px; font-size:11px; color:#b7b1a7; white-space:nowrap}
      .tl .part.cur span{color:#fff}
      .tl .beat{position:absolute; bottom:4px; width:2px; height:8px; background:#3a3a42}
      .tl .beat.down{height:14px; background:#5a5a62}
      .tl .fill{position:absolute; left:0; top:0; bottom:0; background:rgba(215,165,74,.25); pointer-events:none}
      .tl .head{position:absolute; top:0; bottom:0; width:2px; background:#d7a54a; pointer-events:none}
      .clock{font-variant-numeric:tabular-nums; color:#b7b1a7; min-width:220px}`;
    document.head.appendChild(css);
    document.body.insertAdjacentHTML('beforeend', `
      <div id="root"></div>
      <div class="player" id="player">
        <div class="tl" id="tl"></div>
        <div class="row">
          <button class="btn" data-a="start" title="Inicio">⏮</button>
          <button class="btn" data-a="back" title="Pulso anterior (←)">◀</button>
          <button class="btn" data-a="play" id="bPlay" title="Reproducir / pausar (Espacio)">▶</button>
          <button class="btn" data-a="fwd" title="Pulso siguiente (→)">▶▶</button>
          <span class="clock" id="clock"></span><span class="spacer"></span>
          <button class="btn on" data-a="sound" id="bSound" title="Sonido (S)">Sonido</button>
          <button class="btn" data-a="parts" id="bParts" title="Pausa al final de cada parte (P)">Pausa por parte</button>
          <button class="btn on" data-a="loop" id="bLoop" title="Repetir (L)">Loop</button>
          <button class="btn" data-a="full" title="Pantalla completa (F)">⛶</button>
        </div>
      </div>`);
    if (isRender) document.body.classList.add('render');
    const $ = (id) => document.getElementById(id);

    const seek = (t) => {
      t = U.cl(t, 0, DUR);
      let inner = '';
      try { inner = cfg.dibujar(t, h); } catch (e) { console.error(e); }
      $('root').innerHTML = `<svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg">${DEFS}<rect width="${W}" height="${H}" fill="${cfg.fondo || '#000'}"/>${inner}</svg>`;
    };

    // ---------- Audio: se arma una vez en un OfflineAudioContext ----------
    async function buildAudio() {
      const SR = 48000, ac = new OfflineAudioContext(2, Math.ceil(SR * DUR), SR);
      await cfg.audio(ac, h);
      return ac.startRendering();
    }
    let actx = null, abuf = null, src = null, startedAt = 0, startT = 0;
    let playing = false, cur = 0, sound = !!cfg.audio, loop = true, partPause = false, lastFrameT = performance.now();
    async function ensureAudio() {
      if (!actx) actx = new AudioContext();
      if (!abuf) abuf = await buildAudio();
      if (actx.state === 'suspended') await actx.resume();
    }
    const stopSource = () => { if (src) { try { src.stop(); } catch (e) {} src.disconnect(); src = null; } };
    async function play() {
      if (cur >= DUR - 0.01) cur = 0;
      playing = true; $('bPlay').textContent = '❚❚'; startT = cur;
      if (sound) {
        await ensureAudio(); stopSource();
        src = actx.createBufferSource(); src.buffer = abuf; src.connect(actx.destination);
        startedAt = actx.currentTime; src.start(0, cur);
      }
      lastFrameT = performance.now();
    }
    function pause() { playing = false; $('bPlay').textContent = '▶'; stopSource(); }
    function go(t) { const was = playing; pause(); cur = U.cl(t, 0, DUR); seek(cur); updateUI(); if (was) play(); }

    function tick(now) {
      if (playing) {
        const t = sound && src ? startT + (actx.currentTime - startedAt) : cur + (now - lastFrameT) / 1000;
        const edge = (Math.floor(cur / BAR + 1e-6) + 1) * BAR;
        if (partPause && t >= edge && edge < DUR) { cur = edge - 0.001; seek(cur); pause(); }
        else if (t >= DUR) { if (loop) { cur = 0; seek(0); pause(); play(); } else { cur = DUR; seek(DUR); pause(); } }
        else { cur = t; seek(cur); }
      }
      lastFrameT = now;
      updateUI();
      requestAnimationFrame(tick);
    }
    const PARTS = cfg.partes || [];
    function buildTimeline() {
      const tl = $('tl');
      tl.innerHTML = '<div class="fill" id="tlFill"></div>';
      PARTS.forEach((p, i) => {
        const a = i * BAR, b = Math.min(DUR, a + BAR);
        tl.insertAdjacentHTML('beforeend', `<div class="part" style="left:${(a / DUR) * 100}%; width:${((b - a) / DUR) * 100}%"><span>${i + 1}. ${U.esc(p)}</span></div>`);
      });
      for (let b = 0; b < DUR / BEAT; b++) tl.insertAdjacentHTML('beforeend', `<i class="beat${b % 4 === 0 ? ' down' : ''}" style="left:${((b * BEAT) / DUR) * 100}%"></i>`);
      tl.insertAdjacentHTML('beforeend', '<div class="head" id="tlHead"></div>');
      tl.addEventListener('click', (e) => { e.stopPropagation(); const r = tl.getBoundingClientRect(); go(((e.clientX - r.left) / r.width) * DUR); });
    }
    function updateUI() {
      const k = (cur / DUR) * 100;
      $('tlFill').style.width = k + '%'; $('tlHead').style.left = k + '%';
      const part = Math.min(PARTS.length - 1, Math.floor(cur / BAR));
      document.querySelectorAll('.tl .part').forEach((el, i) => el.classList.toggle('cur', i === part));
      $('clock').textContent = `${cur.toFixed(2)} s · pulso ${Math.min(Math.round(DUR / BEAT), Math.floor(cur / BEAT) + 1)}/${Math.round(DUR / BEAT)}${PARTS[part] ? ' · ' + PARTS[part] : ''}`;
    }
    const ACT = {
      play: () => (playing ? pause() : play()),
      start: () => go(0),
      back: () => go(Math.ceil(cur / BEAT - 1.001) * BEAT),
      fwd: () => go(Math.floor(cur / BEAT + 1.001) * BEAT),
      sound: () => { if (!cfg.audio) return; sound = !sound; $('bSound').classList.toggle('on', sound); if (playing) { pause(); play(); } },
      loop: () => { loop = !loop; $('bLoop').classList.toggle('on', loop); },
      parts: () => { partPause = !partPause; $('bParts').classList.toggle('on', partPause); },
      full: () => (document.fullscreenElement ? document.exitFullscreen() : document.documentElement.requestFullscreen()),
    };
    if (!cfg.audio) $('bSound').style.display = 'none';
    document.querySelectorAll('[data-a]').forEach((b) => b.addEventListener('click', (e) => { e.stopPropagation(); ACT[b.dataset.a](); }));
    $('root').addEventListener('click', () => ACT.play());
    addEventListener('keydown', (e) => {
      const k = e.key;
      if (k === ' ') { e.preventDefault(); ACT.play(); }
      else if (k === 'ArrowRight') ACT.fwd();
      else if (k === 'ArrowLeft') ACT.back();
      else if (k === 'Home') ACT.start();
      else if (/^[sS]$/.test(k)) ACT.sound();
      else if (/^[lL]$/.test(k)) ACT.loop();
      else if (/^[pP]$/.test(k)) ACT.parts();
      else if (/^[fF]$/.test(k)) ACT.full();
      showPlayer();
    });
    let hideTimer;
    function showPlayer() { $('player').classList.remove('hidden'); clearTimeout(hideTimer); hideTimer = setTimeout(() => playing && $('player').classList.add('hidden'), 2500); }
    addEventListener('mousemove', showPlayer);
    const fit = () => { if (!isRender) $('root').style.transform = `translate(-50%, -50%) scale(${Math.min(innerWidth / W, innerHeight / H)})`; };
    addEventListener('resize', fit);

    // ---------- Contrato de render (ver render/comun.mjs) ----------
    window.DURACION = DUR;
    // Para revisar: un cuadro por pulso, a mitad del movimiento de entrada, más el último
    window.CLAVES = [...Array.from({ length: Math.round(DUR / BEAT) }, (_, b) => ({ v: +(b * BEAT + 0.2).toFixed(3), pulso: b + 1 })), { v: DUR - 0.01, pulso: 'fin' }];
    window.seek = seek;
    if (cfg.audio) window.renderAudio = async () => wavBase64(await buildAudio());
    window.ready = U.fuentesListas().then(() => {
      seek(0);
      if (!isRender) { fit(); buildTimeline(); updateUI(); showPlayer(); requestAnimationFrame(tick); }
      return true;
    });
  }

  // AudioBuffer → WAV 16 bits estéreo en base64 (para pasarlo de la página a Node)
  function wavBase64(buf) {
    const SR = buf.sampleRate, L = buf.getChannelData(0), R = buf.numberOfChannels > 1 ? buf.getChannelData(1) : L, n = L.length;
    const bytes = new DataView(new ArrayBuffer(44 + n * 4));
    const str = (o, s) => [...s].forEach((c, i) => bytes.setUint8(o + i, c.charCodeAt(0)));
    str(0, 'RIFF'); bytes.setUint32(4, 36 + n * 4, true); str(8, 'WAVEfmt '); bytes.setUint32(16, 16, true); bytes.setUint16(20, 1, true);
    bytes.setUint16(22, 2, true); bytes.setUint32(24, SR, true); bytes.setUint32(28, SR * 4, true); bytes.setUint16(32, 4, true); bytes.setUint16(34, 16, true);
    str(36, 'data'); bytes.setUint32(40, n * 4, true);
    for (let i = 0; i < n; i++) { bytes.setInt16(44 + i * 4, U.cl(L[i], -1, 1) * 32767, true); bytes.setInt16(46 + i * 4, U.cl(R[i], -1, 1) * 32767, true); }
    let bin = ''; const u8 = new Uint8Array(bytes.buffer);
    for (let i = 0; i < u8.length; i += 0x8000) bin += String.fromCharCode.apply(null, u8.subarray(i, i + 0x8000));
    return btoa(bin);
  }

  // ---------- Instrumentos sencillos para la banda (sobre un OfflineAudioContext) ----------
  const env = (g, t0, a, peak, dec) => { g.gain.setValueAtTime(0, t0); g.gain.linearRampToValueAtTime(peak, t0 + a); g.gain.exponentialRampToValueAtTime(0.0008, t0 + a + dec); };
  const sonido = {
    // Salida con compresor; devuelve el nodo al que se conecta todo
    master(ac, vol = 0.9) {
      const comp = ac.createDynamicsCompressor(); comp.threshold.value = -10; comp.ratio.value = 4; comp.connect(ac.destination);
      const g = ac.createGain(); g.gain.value = vol; g.connect(comp); return g;
    },
    ruido(ac, seg = 3) {
      const b = ac.createBuffer(1, ac.sampleRate * seg, ac.sampleRate), d = b.getChannelData(0);
      let s = 1234567; for (let i = 0; i < d.length; i++) { s = (s * 16807) % 2147483647; d[i] = (s / 2147483647) * 2 - 1; } // determinístico
      return b;
    },
    bombo(ac, out, t0, vol = 1) {
      const o = ac.createOscillator(), g = ac.createGain();
      o.frequency.setValueAtTime(150, t0); o.frequency.exponentialRampToValueAtTime(45, t0 + 0.12);
      env(g, t0, 0.004, vol, 0.32); o.connect(g); g.connect(out); o.start(t0); o.stop(t0 + 0.4);
    },
    // Acorde en marcato: dos sierras desafinadas por nota, con pasabajos
    acorde(ac, out, t0, notas, { vol = 0.08, dur = 0.2, corte = 1700 } = {}) {
      const lp = ac.createBiquadFilter(), g = ac.createGain();
      lp.type = 'lowpass'; lp.frequency.value = corte; env(g, t0, 0.01, vol, dur); lp.connect(g); g.connect(out);
      notas.forEach((f) => [0, 7].forEach((cents) => { const o = ac.createOscillator(); o.type = 'sawtooth'; o.frequency.value = f; o.detune.value = cents; o.connect(lp); o.start(t0); o.stop(t0 + dur + 0.1); }));
    },
    // Golpe de corte: ruido agudo + caída grave
    golpe(ac, out, t0, ruido, fuerte = false) {
      const n = ac.createBufferSource(), hp = ac.createBiquadFilter(), gn = ac.createGain();
      n.buffer = ruido; hp.type = 'highpass'; hp.frequency.value = 1800; env(gn, t0, 0.002, fuerte ? 0.5 : 0.28, fuerte ? 0.6 : 0.25);
      n.connect(hp); hp.connect(gn); gn.connect(out); n.start(t0, 0.5); n.stop(t0 + 0.8);
      const o = ac.createOscillator(), g = ac.createGain();
      o.frequency.setValueAtTime(fuerte ? 70 : 90, t0); o.frequency.exponentialRampToValueAtTime(38, t0 + 0.4);
      env(g, t0, 0.003, fuerte ? 0.9 : 0.5, fuerte ? 0.9 : 0.45); o.connect(g); g.connect(out); o.start(t0); o.stop(t0 + 1);
    },
    // Subida de tensión entre t0 y t1 (ruido filtrado + sierra que sube)
    riser(ac, out, t0, t1, ruido) {
      const n = ac.createBufferSource(), bp = ac.createBiquadFilter(), g = ac.createGain();
      n.buffer = ruido; n.loop = true; bp.type = 'bandpass'; bp.Q.value = 4;
      bp.frequency.setValueAtTime(300, t0); bp.frequency.exponentialRampToValueAtTime(7000, t1);
      g.gain.setValueAtTime(0, t0); g.gain.linearRampToValueAtTime(0.3, t1 - 0.05); g.gain.linearRampToValueAtTime(0, t1);
      n.connect(bp); bp.connect(g); g.connect(out); n.start(t0); n.stop(t1 + 0.05);
      const o = ac.createOscillator(), lp = ac.createBiquadFilter(), go = ac.createGain();
      o.type = 'sawtooth'; o.frequency.setValueAtTime(110, t0); o.frequency.exponentialRampToValueAtTime(880, t1);
      lp.type = 'lowpass'; lp.frequency.setValueAtTime(400, t0); lp.frequency.exponentialRampToValueAtTime(5000, t1);
      go.gain.setValueAtTime(0, t0); go.gain.linearRampToValueAtTime(0.07, t1 - 0.05); go.gain.linearRampToValueAtTime(0, t1);
      o.connect(lp); lp.connect(go); go.connect(out); o.start(t0); o.stop(t1 + 0.05);
    },
  };

  U.reel = reel;
  U.reel.sonido = sonido;
  U.reel.dibujo = { DEFS, blur, medir, texto };
})();
