// Composiciones: una pieza libre en HTML con el formato de HyperFrames (HeyGen, Apache-2.0),
// que Tramoya reproduce, edita y exporta con su propio motor. Sirve para lo que no entra en
// la presentación ni en el reel: un bloque animado con GSAP, una escena 3D, un mapa con d3,
// un spot cuadrado o vertical… y se puede meter como escena de la presentación (tipo
// `composicion`).
//
// El formato (resumido; ver referencias/composiciones.md):
//   <div data-composition-id="intro" data-start="0" data-duration="8" data-width="1920" data-height="1080">
//     <section class="clip" data-start="0" data-duration="4">…</section>      visible de 0 a 4 s
//     <section class="clip" data-start="intro-a + 0.5" data-duration="3">…    medio segundo después de que termina #intro-a
//     <video src="…" data-start="2" data-media-start="1" muted></video>        el motor lo pone en el cuadro justo
//     <audio src="…" data-start="0" data-volume="0.6" data-fade-out="1"></audio>  se mezcla al exportar
//     <div data-composition-src="otra.html" data-composition-id="otra" data-start="4" data-duration="4"></div>
//   </div>
//   window.__timelines["intro"] = gsap.timeline({ paused: true })…            cualquier línea de GSAP, en pausa
//
// También se buscan en el tiempo: animaciones CSS y WAAPI (relativas a su clip), Lottie
// (window.__hfLottie), anime.js (window.__hfAnime) y lo propio (canvas, three.js…) con
// addEventListener('hf-seek', e => dibujar(e.detail.time)). Variables:
// <html data-composition-variables='[{ "id": "titulo", "type": "string", "default": "…" }]'>
// → __hyperframes.getVariables(), data-var-text, data-var-src y var(--titulo); el panel las
// edita y quedan en proyecto/estado/composicion-<id>.json.
//
// Contrato de Tramoya: window.ready, seek(t) (devuelve una promesa si espera videos),
// DURACION, CLAVES, TAMANO, FPS, PISTAS (audio que mezcla render/video.mjs). Y el de
// HyperFrames: window.__hf = { duration, seek } y __renderReady, así el mismo HTML lo
// renderiza `npx hyperframes render`.
//
// ?render: sin interfaz · ?embebida: dentro de una escena (la escena maneja el tiempo) · ?t=3.2
(function () {
  const Q = new URLSearchParams(location.search);
  const RENDER = Q.has('render'), EMBEBIDA = Q.has('embebida') || Q.get('ui') === '0';
  const U = window.TRAMOYA || null;
  window.__timelines = window.__timelines || {};
  window.__hfLottie = window.__hfLottie || [];
  window.__hfAnime = window.__hfAnime || [];
  const num = (v, d = 0) => (v == null || v === '' || isNaN(+v) ? d : +v);
  const cl = (x, a, b) => Math.min(b, Math.max(a, x));

  // ---------- Variables ----------
  const kebab = (id) => String(id).replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase().replace(/[^a-z0-9-]+/g, '-');
  function declaradas(el = document.documentElement) {
    const out = [];
    const leerDe = (x) => { try { const v = JSON.parse(x.getAttribute('data-composition-variables')); if (Array.isArray(v)) out.push(...v); } catch (e) { console.warn('data-composition-variables no es JSON válido'); } };
    if (el.hasAttribute?.('data-composition-variables')) leerDe(el);
    return out;
  }
  const idRaiz = () => document.querySelector('[data-composition-id]')?.getAttribute('data-composition-id') || (location.pathname.split('/').pop() || 'composicion').replace(/\.html?$/, '');
  const SUB = () => 'composicion-' + idRaiz().replace(/[^\w-]+/g, '-');
  let guardadas = null;
  function valoresGuardados() {
    if (guardadas) return guardadas;
    let v = {};
    try { if (Q.get('vars')) v = JSON.parse(Q.get('vars')); } catch (e) {}
    const g = U ? U.leer(SUB(), {}) : (() => { try { return JSON.parse(localStorage.getItem('tramoya-' + SUB()) || '{}'); } catch (e) { return {}; } })();
    return (guardadas = { ...g, ...v });
  }
  // Las de una composición anidada: sus valores por defecto + data-variable-values del anfitrión
  let ambito = null;
  function getVariables() {
    if (ambito) return { ...ambito };
    const def = {};
    declaradas().forEach((d) => { if (d && d.id != null) def[d.id] = d.default; });
    return { ...def, ...(window.__hfVariables || {}), ...valoresGuardados() };
  }
  const SRC_OK = new Set(['IMG', 'VIDEO', 'AUDIO', 'SOURCE']);
  function aplicarVariables(raiz, vars) {
    Object.entries(vars).forEach(([k, v]) => { if (v != null && typeof v !== 'object') raiz.style?.setProperty('--' + kebab(k), String(v)); });
    raiz.querySelectorAll('[data-var-text]').forEach((el) => { const v = vars[el.getAttribute('data-var-text')]; if (v != null) el.textContent = String(v); });
    raiz.querySelectorAll('[data-var-src]').forEach((el) => {
      const v = vars[el.getAttribute('data-var-src')], url = typeof v === 'string' ? v : v?.url;
      if (url && SRC_OK.has(el.tagName)) el.setAttribute('src', url);
    });
  }
  window.__hyperframes = Object.assign(window.__hyperframes || {}, {
    getVariables,
    // Achica la letra hasta que el texto entra en el ancho (y alto) de su caja
    fitTextFontSize(el, { max = 200, min = 12, ancho, alto } = {}) {
      if (!el) return min;
      const w = ancho ?? el.clientWidth, h = alto ?? el.parentElement?.clientHeight ?? Infinity;
      let a = min, b = max;
      for (let i = 0; i < 14; i++) { const m = (a + b) / 2; el.style.fontSize = m + 'px'; if (el.scrollWidth <= w + 0.5 && el.scrollHeight <= h + 0.5) a = m; else b = m; }
      el.style.fontSize = a + 'px';
      return a;
    },
  });

  // ---------- Estilo del proyecto (opcional) ----------
  // <html data-tramoya-estilo> pone las fuentes y los colores del estilo del proyecto como
  // variables CSS (--font-display, --font-body, --bg, --ink, --accent…), con el tema elegido.
  if (U && document.documentElement.hasAttribute('data-tramoya-estilo')) {
    U.instalarFuentes(U.BASE);
    const tema = document.documentElement.getAttribute('data-tramoya-estilo') || U.temaValido?.();
    const vars = window.PROYECTO?.temas?.[tema]?.vars || {};
    const st = document.createElement('style');
    st.textContent = `:root{${Object.entries(vars).map(([k, v]) => `--${k}:${v}`).join(';')}}`;
    document.head.appendChild(st);
  }

  // ---------- Tiempos ----------
  const ESTILO = document.createElement('style');
  ESTILO.textContent = '[data-hf-fuera]{visibility:hidden!important}';
  document.head.appendChild(ESTILO);
  let ROOT = null, CLIPS = [], MEDIOS = [], ANIDADAS = [];
  const MEDIA = (el) => el.tagName === 'VIDEO' || el.tagName === 'AUDIO';
  const inicios = new Map();
  function inicio(el, pila = new Set()) {
    if (inicios.has(el)) return inicios.get(el);
    const raw = (el.getAttribute('data-start') || '').trim();
    let v = 0;
    const m = raw.match(/^([A-Za-z_][\w-]*)\s*(?:([+-])\s*([\d.]+))?$/);
    if (m && !/^\d/.test(raw)) {
      const ref = document.getElementById(m[1]);
      if (!ref || pila.has(ref)) console.warn(`data-start="${raw}": no encuentro #${m[1]} (o es circular)`);
      else { pila.add(el); v = inicio(ref, pila) + duracion(ref, pila) + (m[2] === '-' ? -1 : 1) * num(m[3]); }
    } else if (raw) v = num(raw);
    else if (MEDIA(el)) { const c = el.parentElement?.closest('[data-start]'); v = c && c !== ROOT ? inicio(c) : 0; }
    inicios.set(el, v);
    return v;
  }
  function duracion(el, pila) {
    const d = el.getAttribute('data-duration');
    if (d != null && d !== '') return num(d);
    if (el.getAttribute('data-end') != null) return num(el.getAttribute('data-end')) - inicio(el, pila);
    if (MEDIA(el) && isFinite(el.duration)) return Math.max(0, (el.duration - num(el.getAttribute('data-media-start') ?? el.getAttribute('data-playback-start'))) / num(el.getAttribute('data-playback-rate'), 1));
    if (el.tagName === 'IMG') return 3;
    if (el === ROOT) return Infinity;
    const c = el.parentElement?.closest('[data-start]');
    return c ? inicio(c) + duracion(c) - inicio(el, pila) : Infinity;
  }

  // ---------- Composiciones anidadas ----------
  // El archivo de la anidada envuelve lo suyo en un <template> (o no: se toma el body). Sus
  // scripts corren en orden, con sus variables (las suyas + data-variable-values del anfitrión).
  function traer(url) {
    return new Promise((res, rej) => { const x = new XMLHttpRequest(); x.open('GET', url); x.onload = () => (x.status === 0 || x.status < 400 ? res(x.responseText) : rej(new Error(x.status))); x.onerror = () => rej(new Error('no cargó ' + url)); x.send(); });
  }
  async function cargarAnidada(host) {
    const src = host.getAttribute('data-composition-src');
    const url = new URL(src, location.href).href;
    let html;
    try { html = await traer(url); } catch (e) { console.error(`No cargó la composición ${src}: ${e.message}`); return; }
    const doc = new DOMParser().parseFromString(html, 'text/html');
    const tpl = doc.querySelector('template');
    const frag = tpl ? tpl.content : doc.body;
    const base = (u) => (u && !/^([a-z]+:|\/|#|data:)/i.test(u) ? new URL(u, url).href : u);
    frag.querySelectorAll('[src]').forEach((n) => n.setAttribute('src', base(n.getAttribute('src'))));
    frag.querySelectorAll('link[href]').forEach((n) => n.setAttribute('href', base(n.getAttribute('href'))));
    const scripts = [...frag.querySelectorAll('script')];
    scripts.forEach((s) => s.remove());
    doc.head.querySelectorAll('style, link[rel=stylesheet]').forEach((s) => host.appendChild(document.importNode(s, true)));
    host.appendChild(document.importNode(frag, true));
    const vars = {};
    declaradas(doc.documentElement).forEach((d) => { if (d?.id != null) vars[d.id] = d.default; });
    host.querySelectorAll('[data-composition-variables]').forEach((el) => declaradas(el).forEach((d) => { if (d?.id != null && !(d.id in vars)) vars[d.id] = d.default; }));
    try { Object.assign(vars, JSON.parse(host.getAttribute('data-variable-values') || '{}')); } catch (e) {}
    aplicarVariables(host, vars);
    for (const s of [...doc.head.querySelectorAll('script'), ...scripts]) {
      const n = document.createElement('script');
      [...s.attributes].forEach((a) => n.setAttribute(a.name, a.name === 'src' ? base(a.value) : a.value));
      if (n.src) {
        if ([...document.scripts].some((x) => x.src === n.src)) continue;
        await new Promise((r) => { n.onload = n.onerror = r; document.head.appendChild(n); });
      } else {
        n.textContent = s.textContent;
        ambito = vars;
        try { host.appendChild(n); } finally { ambito = null; }
      }
    }
    // Las anidadas de la anidada
    await Promise.all([...host.querySelectorAll('[data-composition-src]')].filter((h) => !h.dataset.hfCargada).map((h) => { h.dataset.hfCargada = '1'; return cargarAnidada(h); }));
  }

  // ---------- Buscar en el tiempo ----------
  let DUR = 0, T = 0;
  const clipDe = (el) => el.closest?.('[data-start]');
  function timelineDe(id) { const tl = window.__timelines[id]; return tl && typeof tl.totalTime === 'function' ? tl : null; }
  function seek(t) {
    T = t = Math.max(0, +t || 0);
    const esperas = [];
    {
      CLIPS.forEach((c) => {
        const a = inicio(c), fin = a + duracion(c);
        if (t >= a && t < fin) c.removeAttribute('data-hf-fuera'); else c.setAttribute('data-hf-fuera', '');
      });
      // GSAP: la raíz en su tiempo; cada anidada en el suyo (y se queda en su último cuadro)
      const ids = new Set(ANIDADAS.map((h) => h.getAttribute('data-composition-id')));
      Object.keys(window.__timelines).forEach((id) => { const tl = timelineDe(id); if (tl && !ids.has(id)) { tl.paused?.(true); tl.totalTime(Math.min(t, tl.totalDuration?.() ?? t), true); } });
      ANIDADAS.forEach((h) => {
        const tl = timelineDe(h.getAttribute('data-composition-id'));
        if (!tl) return;
        const loc = cl(t - inicio(h), 0, Math.min(duracion(h), tl.totalDuration?.() ?? Infinity));
        tl.paused?.(true); tl.totalTime(loc, true);
      });
      // CSS y WAAPI, relativas al clip que las contiene
      document.getAnimations?.().forEach((an) => {
        const el = an.effect?.target;
        if (!el || el.closest?.('.hf-ui')) return;
        const c = clipDe(el.nodeType === 1 ? el : el.parentElement);
        an.pause();
        an.currentTime = Math.max(0, t - (c ? inicio(c) : 0)) * 1000;
      });
      window.__hfLottie.forEach((a) => { try { a.goToAndStop ? a.goToAndStop(t * 1000, false) : a.setCurrentRawFrameValue?.(t * (a.frameRate || 30)); } catch (e) {} });
      window.__hfAnime.forEach((a) => { try { a.seek(t * 1000); } catch (e) {} });
      // Lo propio (canvas, three.js…): addEventListener('hf-seek', e => … e.detail.waitUntil(promesa))
      window.dispatchEvent(new CustomEvent('hf-seek', { detail: { time: t, waitUntil: (p) => esperas.push(Promise.resolve(p)) } }));
      // Videos y audios: el cuadro justo, sin reproducir (al exportar) o en sincronía (al mirar)
      MEDIOS.forEach((m) => {
        const a = inicio(m), d = duracion(m), rate = num(m.getAttribute('data-playback-rate'), 1);
        const dentro = t >= a && t < a + d;
        const loc = (t - a) * rate + num(m.getAttribute('data-media-start') ?? m.getAttribute('data-playback-start'));
        m.playbackRate = rate;
        if (m.tagName === 'VIDEO') m.style.visibility = dentro ? '' : 'hidden';
        if (!dentro) { if (!m.paused) m.pause(); return; }
        if (sonando && !RENDER) {
          if (m.tagName === 'AUDIO' || m.hasAttribute('data-has-audio')) m.volume = cl(volumenEn(m, t), 0, 1);
          if (Math.abs(m.currentTime - loc) > 0.25) m.currentTime = loc;
          if (m.paused) m.play().catch(() => {});
          return;
        }
        if (!m.paused) m.pause();
        if (m.dataset.hfSinCargar) return;
        if (Math.abs(m.currentTime - loc) > 0.5 / 120 && m.readyState >= 1) {
          esperas.push(new Promise((r) => { const fin = () => { m.removeEventListener('seeked', fin); r(); }; m.addEventListener('seeked', fin); setTimeout(fin, 3000); m.currentTime = loc; }));
        }
      });
    }
    if (!RENDER && !EMBEBIDA) pintarUI();
    return esperas.length ? Promise.all(esperas).then(() => true) : true;
  }
  function volumenEn(m, t) {
    const a = inicio(m), d = duracion(m), v = num(m.getAttribute('data-volume'), 1);
    const fi = num(m.getAttribute('data-fade-in')), fo = num(m.getAttribute('data-fade-out'));
    let k = 1;
    if (fi > 0) k = Math.min(k, (t - a) / fi);
    if (fo > 0) k = Math.min(k, (a + d - t) / fo);
    return v * cl(k, 0, 1);
  }

  // ---------- Arranque ----------
  const cargado = new Promise((r) => (document.readyState === 'complete' ? r() : addEventListener('load', r)));
  const metadatos = (m) => (m.readyState >= 1 ? Promise.resolve() : new Promise((r) => { m.addEventListener('loadedmetadata', r, { once: true }); m.addEventListener('error', () => { console.error('No cargó ' + (m.currentSrc || m.src)); r(); }, { once: true }); setTimeout(r, 8000); }));
  window.ready = (async () => {
    await cargado;
    ROOT = document.querySelector('[data-composition-id]');
    if (!ROOT) { console.error('Falta el elemento raíz con data-composition-id'); ROOT = document.body; }
    aplicarVariables(document.documentElement, getVariables());
    const hosts = [...document.querySelectorAll('[data-composition-src]')];
    hosts.forEach((h) => (h.dataset.hfCargada = '1'));
    await Promise.all(hosts.map(cargarAnidada));
    ANIDADAS = [...document.querySelectorAll('[data-composition-src]')];
    // La línea de GSAP de la raíz puede registrarse tarde (al cargar fuentes o datos)
    const id = ROOT.getAttribute('data-composition-id');
    if (!ROOT.hasAttribute('data-no-timeline') && window.gsap) {
      for (let i = 0; i < 100 && !timelineDe(id); i++) await new Promise((r) => setTimeout(r, 50));
      if (!timelineDe(id) && !Object.keys(window.__timelines).length) console.warn(`No hay window.__timelines["${id}"]: registrala al final del script (o poné data-no-timeline)`);
    }
    if (window.__hf?.buildReady) await Promise.all(Object.values(window.__hf.buildReady));
    MEDIOS = [...document.querySelectorAll('video, audio')].filter((m) => !m.closest('.hf-ui'));
    // Al exportar, el audio lo mezcla ffmpeg: el navegador no necesita cargarlo (salvo para saber cuánto dura)
    MEDIOS.forEach((m) => { if (RENDER && m.tagName === 'AUDIO' && m.hasAttribute('data-duration')) { m.preload = 'none'; m.dataset.hfSinCargar = '1'; } });
    MEDIOS.forEach((m) => { if (m.dataset.hfSinCargar) return; m.preload = 'auto'; m.autoplay = false; m.removeAttribute('autoplay'); m.pause(); if (m.tagName === 'VIDEO' && !m.hasAttribute('data-has-audio')) m.muted = true; });
    await Promise.all(MEDIOS.filter((m) => !m.dataset.hfSinCargar).map(metadatos));
    await (U?.fuentesListas?.() || document.fonts.ready);
    CLIPS = [...ROOT.querySelectorAll('[data-start]')].filter((c) => !MEDIA(c));
    // Duración: la de la raíz; si no, la de la línea más larga, los clips y los medios
    const dRaiz = num(ROOT.getAttribute('data-duration'), NaN);
    if (isFinite(dRaiz) && dRaiz > 0) DUR = dRaiz;
    else {
      const fines = [...CLIPS, ...MEDIOS].map((c) => inicio(c) + duracion(c)).filter(isFinite);
      const tls = Object.values(window.__timelines).map((tl) => tl?.totalDuration?.() || 0);
      DUR = Math.max(0, ...fines, ...tls) || 5;
    }
    const W = num(ROOT.getAttribute('data-width'), 1920), H = num(ROOT.getAttribute('data-height'), 1080);
    window.DURACION = DUR;
    window.TAMANO = { ancho: W, alto: H };
    window.FPS = (() => { const f = String(ROOT.getAttribute('data-fps') || ''); const [a, b] = f.split('/'); return b ? +a / +b : +a || undefined; })();
    // Puntos clave para revisar: el arranque de cada clip, a mitad de su entrada
    const ts = [...new Set([0.5, ...CLIPS.map((c) => inicio(c) + Math.min(1, duracion(c) / 2)), DUR - 0.05].map((x) => +cl(x, 0, DUR - 0.01).toFixed(2)))].sort((a, b) => a - b);
    window.CLAVES = ts.map((v) => ({ v, clip: (CLIPS.find((c) => v >= inicio(c) && v < inicio(c) + duracion(c))?.id) || '' }));
    // Audio para mezclar al exportar (render/video.mjs)
    window.PISTAS = MEDIOS.filter((m) => m.tagName === 'AUDIO' || m.hasAttribute('data-has-audio')).map((m) => ({
      src: m.currentSrc || m.src, inicio: inicio(m), dur: Math.min(duracion(m), DUR - inicio(m)),
      recorte: num(m.getAttribute('data-media-start') ?? m.getAttribute('data-playback-start')), velocidad: num(m.getAttribute('data-playback-rate'), 1),
      volumen: num(m.getAttribute('data-volume'), 1), fadeIn: num(m.getAttribute('data-fade-in')), fadeOut: num(m.getAttribute('data-fade-out')),
    }));
    window.seek = seek;
    window.__hf = Object.assign(window.__hf || {}, { duration: DUR, seek: (t) => seek(t) });
    await seek(Q.has('t') ? num(Q.get('t')) : 0);
    window.__renderReady = true;
    window.__playerReady = true;
    if (!RENDER && !EMBEBIDA) armarUI(W, H);
    return true;
  })().catch((e) => { window.__hfStartupError = String(e?.message || e); console.error(e); throw e; });

  // ---------- Mirar y editar (abierta directo en el navegador) ----------
  let sonando = false, ui = null, ultimo = 0;
  function encajar(W, H) {
    const s = Math.min(innerWidth / W, (innerHeight - 64) / H);
    Object.assign(document.body.style, { transformOrigin: '0 0', transform: `translate(${(innerWidth - W * s) / 2}px, ${(innerHeight - 64 - H * s) / 2}px) scale(${s})`, width: W + 'px', height: H + 'px', overflow: 'visible' });
    document.documentElement.style.cssText += ';overflow:hidden;background:#111';
  }
  const fmt = (t) => `${Math.floor(t / 60)}:${(t % 60).toFixed(1).padStart(4, '0')}`;
  function armarUI(W, H) {
    encajar(W, H);
    addEventListener('resize', () => encajar(W, H));
    ui = document.createElement('div');
    ui.className = 'hf-ui';
    ui.innerHTML = `<style>
      .hf-ui{position:fixed;left:0;right:0;bottom:0;height:64px;display:flex;gap:12px;align-items:center;padding:0 16px;background:#0b0b0cee;color:#eee;font:13px system-ui,sans-serif;z-index:2147483646}
      .hf-ui button{background:#222;color:#eee;border:1px solid #333;border-radius:8px;padding:8px 12px;font:inherit;cursor:pointer}
      .hf-ui button:hover{background:#2c2c2c}.hf-ui input[type=range]{flex:1;accent-color:#e0b04a}
      .hf-ui .t{font-variant-numeric:tabular-nums;min-width:96px;text-align:right;opacity:.8}
      .hf-vars{position:fixed;right:16px;bottom:76px;width:min(380px,90vw);max-height:70vh;overflow:auto;background:#141416;color:#eee;border:1px solid #2a2a2e;border-radius:12px;padding:14px;font:13px system-ui,sans-serif;z-index:2147483647;display:none}
      .hf-vars.on{display:block}.hf-vars label{display:block;margin:0 0 10px}.hf-vars label span{display:block;opacity:.7;margin-bottom:4px}
      .hf-vars input,.hf-vars select,.hf-vars textarea{width:100%;box-sizing:border-box;background:#0d0d0f;color:#eee;border:1px solid #333;border-radius:6px;padding:6px 8px;font:inherit}
      .hf-vars input[type=color]{height:34px;padding:2px}.hf-vars small{display:block;opacity:.5;margin-top:3px}
    </style>
    <button data-a="play" title="Espacio">▶</button>
    <input type="range" min="0" max="${DUR}" step="0.001" value="${T}">
    <span class="t"></span>
    ${declaradas().length ? '<button data-a="vars">Variables</button>' : ''}
    <button data-a="ayuda" title="Exportar">⤓</button>
    <div class="hf-vars"></div>`;
    document.documentElement.appendChild(ui);
    const rango = ui.querySelector('input[type=range]');
    rango.oninput = () => { parar(); seek(+rango.value); };
    ui.querySelector('[data-a=play]').onclick = () => (sonando ? parar() : tocar());
    ui.querySelector('[data-a=ayuda]').onclick = () => {
      const ruta = location.pathname.replace(/^.*?\/(proyecto\/)/, '$1');
      const msg = `Para exportar: tramoya video ${ruta}  (o revisar ${ruta})`;
      (U?.copiar ? U.copiar(msg.split(': ')[1].trim(), msg) : alert(msg));
    };
    const panel = ui.querySelector('.hf-vars');
    ui.querySelector('[data-a=vars]')?.addEventListener('click', () => { panel.classList.toggle('on'); if (panel.classList.contains('on')) pintarVariables(panel); });
    addEventListener('keydown', (e) => {
      if (e.target.closest?.('input, textarea, select')) return;
      if (e.code === 'Space') { e.preventDefault(); sonando ? parar() : tocar(); }
      if (e.key === 'ArrowRight') { parar(); seek(Math.min(DUR, T + (e.shiftKey ? 1 : 1 / 30))); }
      if (e.key === 'ArrowLeft') { parar(); seek(Math.max(0, T - (e.shiftKey ? 1 : 1 / 30))); }
      if (e.key === 'Home') { parar(); seek(0); }
    });
    U?.alRestaurar?.(SUB(), () => recargarEn(T));
    pintarUI();
  }
  function pintarUI() {
    if (!ui) return;
    ui.querySelector('input[type=range]').value = T;
    ui.querySelector('.t').textContent = `${fmt(T)} / ${fmt(DUR)}`;
    ui.querySelector('[data-a=play]').textContent = sonando ? '❚❚' : '▶';
  }
  function tocar() {
    if (T >= DUR - 0.01) seek(0);
    sonando = true; ultimo = performance.now();
    const paso = (now) => {
      if (!sonando) return;
      const t = T + (now - ultimo) / 1000; ultimo = now;
      if (t >= DUR) { seek(DUR - 0.001); parar(); return; }
      seek(t);
      requestAnimationFrame(paso);
    };
    requestAnimationFrame(paso);
  }
  function parar() { sonando = false; MEDIOS.forEach((m) => m.pause()); pintarUI(); }
  function recargarEn(t) { const u = new URL(location.href); u.searchParams.set('t', t.toFixed(3)); location.replace(u.href); }
  function pintarVariables(panel) {
    const vals = getVariables(), D = declaradas();
    panel.innerHTML = `<b style="display:block;margin-bottom:10px">Variables</b>` + D.map((d) => {
      const v = vals[d.id] ?? '', id = 'hfv-' + d.id, nota = d.description ? `<small>${U?.esc ? U.esc(d.description) : ''}</small>` : '';
      const lab = U?.esc ? U.esc(d.label || d.id) : d.id;
      let campo;
      if (d.type === 'color') campo = `<input id="${id}" type="color" value="${/^#[0-9a-f]{6}$/i.test(v) ? v : '#000000'}">`;
      else if (d.type === 'enum') campo = `<select id="${id}">${(d.options || []).map((o) => { const ov = typeof o === 'object' ? o.value : o, ol = typeof o === 'object' ? o.label || o.value : o; return `<option value="${ov}" ${String(ov) === String(v) ? 'selected' : ''}>${ol}</option>`; }).join('')}</select>`;
      else if (d.type === 'number') campo = `<input id="${id}" type="number" step="any" value="${v}">`;
      else if (d.type === 'boolean') campo = `<input id="${id}" type="checkbox" ${v ? 'checked' : ''} style="width:auto">`;
      else campo = String(v).length > 40 ? `<textarea id="${id}" rows="3"></textarea>` : `<input id="${id}" type="text">`;
      return `<label><span>${lab}</span>${campo}${nota}</label>`;
    }).join('') + `<button data-a="def" style="margin-top:4px">Volver a los valores del archivo</button>`;
    D.forEach((d) => {
      const el = panel.querySelector('#hfv-' + CSS.escape(d.id));
      if (!el) return;
      if (el.type === 'text' || el.tagName === 'TEXTAREA') el.value = vals[d.id] ?? '';
      el.addEventListener('change', () => {
        const v = el.type === 'checkbox' ? el.checked : d.type === 'number' ? +el.value : el.value;
        guardar({ ...valoresGuardados(), [d.id]: v });
      });
    });
    panel.querySelector('[data-a=def]').onclick = () => guardar({});
  }
  function guardar(v) {
    guardadas = v;
    if (U) U.guardar(SUB(), v); else localStorage.setItem('tramoya-' + SUB(), JSON.stringify(v));
    // Los scripts leen las variables al arrancar: se vuelve a cargar en el mismo instante
    setTimeout(() => recargarEn(T), U ? 1200 : 0);
  }
})();
