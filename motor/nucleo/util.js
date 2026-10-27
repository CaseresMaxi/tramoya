// Utilidades compartidas por todas las piezas: curvas, colores, texto, estado y fuentes.
// No depende de nada. Se carga primero, antes que proyecto/proyecto.js.
(function () {
  // Raíz del proyecto (donde están index.html, nucleo/, proyecto/…), a partir de este script
  const BASE = (document.currentScript?.src || '').replace(/nucleo\/util\.js(\?.*)?$/, '');
  const Q = new URLSearchParams(location.search);
  // ---------- Curvas ----------
  // Todo se anima con funciones del tiempo: f(T) → estado. Nada de animaciones CSS ni
  // timers, así cualquier cuadro se puede pausar, rebobinar y renderizar igual.
  const cl = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
  const lerp = (a, b, k) => a + (b - a) * k;
  const prog = (t, a, d) => cl((t - a) / d);
  const N10 = 1 - Math.pow(2, -10);
  const exOut = (x) => (x <= 0 ? 0 : x >= 1 ? 1 : (1 - Math.pow(2, -10 * x)) / N10);
  const exIn = (x) => (x <= 0 ? 0 : x >= 1 ? 1 : (Math.pow(2, 10 * x - 10) - Math.pow(2, -10)) / N10);
  const exInOut = (x) => (x <= 0 ? 0 : x >= 1 ? 1 : x < 0.5 ? Math.pow(2, 20 * x - 10) / 2 : (2 - Math.pow(2, -20 * x + 10)) / 2);
  const backOut = (x) => { x = cl(x); return 1 + 2.5 * Math.pow(x - 1, 3) + 1.5 * Math.pow(x - 1, 2); };
  // Resorte críticamente amortiguado: llega sin rebotar
  const spring = (x, w = 9) => (x <= 0 ? 0 : x >= 1 ? 1 : (1 - (1 + w * x) * Math.exp(-w * x)) / (1 - (1 + w) * Math.exp(-w)));
  const smooth = (a, b, x) => { const k = cl((x - a) / (b - a)); return k * k * (3 - 2 * k); };
  // Fotogramas clave con salida exponencial: kf(t, [[t0, v0], [t1, v1], ...])
  const kf = (t, keys, ease = exOut) => {
    if (t <= keys[0][0]) return keys[0][1];
    for (let i = 0; i < keys.length - 1; i++) {
      const [t0, v0] = keys[i], [t1, v1] = keys[i + 1];
      if (t < t1) return lerp(v0, v1, ease((t - t0) / (t1 - t0)));
    }
    return keys[keys.length - 1][1];
  };
  // Velocidad de una función del tiempo (unidades por segundo), para el desenfoque
  const speed = (f, t, h = 1 / 240) => (f(t) - f(t - h)) / h;

  // ---------- Colores ----------
  // Acepta #rgb, #rrggbb, rgb(), rgba() y color(srgb …), que es lo que devuelve
  // getComputedStyle cuando el color sale de color-mix().
  function rgba(s) {
    s = String(s).trim();
    if (s[0] === '#') { const h = s.length === 4 ? [...s.slice(1)].map((c) => c + c).join('') : s.slice(1); return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16)).concat(1); }
    const n = (s.match(/[\d.]+/g) || [0, 0, 0, 0]).map(Number);
    if (s.startsWith('color(srgb')) return [n[0] * 255, n[1] * 255, n[2] * 255, n[3] ?? 1];
    return [n[0], n[1], n[2], n[3] ?? 1];
  }
  // Mezcla dos colores [r, g, b, a]; un transparente toma el tono del otro (no pasa por gris)
  const mixRGBA = (a, b, k) => {
    if (a[3] === 0) a = [...b.slice(0, 3), 0];
    if (b[3] === 0) b = [...a.slice(0, 3), 0];
    const c = a.map((x, i) => lerp(x, b[i], k));
    return `rgba(${c[0] | 0},${c[1] | 0},${c[2] | 0},${c[3].toFixed(3)})`;
  };
  // Mezcla de dos hex → hex
  const mixHex = (a, b, k) => {
    const pa = rgba(a), pb = rgba(b);
    return '#' + pa.slice(0, 3).map((x, i) => Math.round(lerp(x, pb[i], cl(k))).toString(16).padStart(2, '0')).join('');
  };

  // ---------- Texto ----------
  const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
  // *texto* va en color de acento (clase .accent); con tag='em', en itálica
  const md = (s, tag = 'span') => esc(s).replace(/\*(.+?)\*/g, tag === 'em' ? '<em>$1</em>' : '<span class="accent">$1</span>');
  const plain = (s) => String(s ?? '').replace(/\*/g, '');
  // Listas en textareas: una por línea, o "título | detalle" por línea
  const lines = (v) => (Array.isArray(v) ? v : String(v || '').split('\n')).map((x) => String(x).trim()).filter(Boolean);
  const pairs = (v) => lines(v).map((l) => { const [t, ...d] = l.split('|'); return { t: t.trim(), d: d.join('|').trim() }; });
  const nn = (i) => String(i).padStart(2, '0');
  const r2 = (n) => Math.round(n * 100) / 100;

  // ---------- Estado: lo que se edita en las páginas ----------
  // Dos lugares, de más firme a más volátil:
  //   1. proyecto/estado.js (window.ESTADO = { sub: { rev, v } }): lo guardado en archivos.
  //      Lo escribe el servidor de `tramoya abrir` cada vez que se guarda, junto con
  //      proyecto/estado/<sub>.json (lo que lee el agente). Con doble clic se lee igual.
  //   2. localStorage, con el id del proyecto como prefijo: el borrador de este navegador,
  //      cuando la página no se abrió con el servidor.
  // leer() devuelve el más nuevo de los dos; con ?render, solo lo de archivos (así un render
  // sale igual en cualquier máquina).
  const clave = (sub) => `${window.PROYECTO?.id || 'tramoya'}-${sub}`;
  // estado.js se carga después de este archivo: se lee window.ESTADO en cada acceso
  const est = () => (window.ESTADO ||= {});
  const RENDER = /[?&]render(=|&|$)/.test(location.search);
  const ls = {
    get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
    set(k, v) { try { localStorage.setItem(k, v); return true; } catch (e) { return false; } },
    del(k) { try { localStorage.removeItem(k); } catch (e) {} },
  };
  const leidos = new Set();
  function leer(sub, def = null) {
    leidos.add(sub);
    const f = est()[sub], crudo = RENDER ? null : ls.get(clave(sub));
    if (crudo == null) return f ? clone(f.v) : def;
    let v; try { v = JSON.parse(crudo); } catch (e) { return f ? clone(f.v) : def; }
    if (!f) return v;
    return (+ls.get(clave(sub) + '@rev') || 0) > f.rev ? v : clone(f.v);
  }
  // Servidor local (tramoya abrir): si está, cada guardado se escribe también en archivos
  // La API del servidor cuelga de la raíz del proyecto (el estudio sirve varios en /p/<id>/)
  const API = (BASE ? new URL('__tramoya', BASE).pathname : '/__tramoya');
  const servidor = /^https?:$/.test(location.protocol)
    ? fetch(API + '/hola').then((r) => r.ok && r.json()).then((j) => !!j?.tramoya).catch(() => false)
    : Promise.resolve(false);
  const pendientes = {}, TAB = Math.random().toString(36).slice(2);
  let enVuelo = 0, ultimoError = '';
  // Cuando el agente (u otra pestaña) cambia archivos del proyecto, la página se recarga sola.
  // Lo que guarda esta misma pestaña no la recarga. Una página puede desactivarlo con
  // TRAMOYA.sinRecarga = true o decidir qué hacer con TRAMOYA.alCambiarProyecto(ev).
  servidor.then((ok) => {
    // Las muestras (?ui=0, p. ej. las de la galería) no escuchan: cada EventSource ocupa una de las
    // 6 conexiones por servidor del navegador y, con varias muestras, las demás pedidas quedan esperando
    if (!ok || RENDER || SIN_UI || typeof EventSource === 'undefined') return;
    // Solo la pestaña visible escucha: Chrome deja 6 conexiones por servidor y cada pestaña
    // abierta del estudio ocuparía una. Al volver a la pestaña, si algo cambió, se recarga.
    let es = null, perdido = false;
    const abrir = () => { if (es) return; es = new EventSource(API + '/eventos'); es.onmessage = recibir; es.onopen = () => { if (perdido && !Object.keys(pendientes).length && !enVuelo && !TRAMOYA.sinRecarga) location.reload(); }; };
    const cerrar = () => { if (es) { es.close(); es = null; } };
    let ultimaVista = Date.now();
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) { cerrar(); ultimaVista = Date.now(); return; }
      // ¿Cambió algo de proyecto/ mientras no se miraba?
      fetch(API + '/hola').then((r) => r.json()).then((j) => { perdido = j.cambio && j.cambio > ultimaVista; abrir(); }).catch(abrir);
    });
    if (!document.hidden) abrir();
    function recibir(m) {
      let ev; try { ev = JSON.parse(m.data); } catch (e) { return; }
      if (ev.tab === TAB || (ev.tipo === 'estado' && !leidos.has(ev.sub)) || TRAMOYA.sinRecarga || Object.keys(pendientes).length || enVuelo) return;
      if (typeof TRAMOYA.alCambiarProyecto === 'function' && TRAMOYA.alCambiarProyecto(ev) === false) return;
      location.reload();
    }
  });
  function guardar(sub, v) {
    if (RENDER) return true;
    const rev = Date.now();
    const ok = ls.set(clave(sub), JSON.stringify(v)) && ls.set(clave(sub) + '@rev', String(rev));
    clearTimeout(pendientes[sub]);
    pendientes[sub] = setTimeout(() => subir(sub, { rev, v }), 300);
    indicador();
    return ok;
  }
  async function subir(sub, dato) {
    delete pendientes[sub];
    if (!(await servidor)) return indicador();
    enVuelo++; indicador();
    try {
      const r = await fetch(`${API}/estado/${encodeURIComponent(sub)}`, { method: 'PUT', headers: { 'content-type': 'application/json', 'x-tramoya-tab': TAB }, body: JSON.stringify(dato) });
      if (!r.ok) throw new Error(await r.text());
      est()[sub] = dato; ultimoError = '';
    } catch (e) { ultimoError = e.message || 'sin conexión'; }
    enVuelo--; indicador();
  }
  async function borrar(sub) {
    ls.del(clave(sub)); ls.del(clave(sub) + '@rev');
    delete est()[sub];
    if (await servidor) await fetch(`${API}/estado/${encodeURIComponent(sub)}`, { method: 'DELETE', headers: { 'x-tramoya-tab': TAB } }).catch(() => {});
    indicador();
  }
  // Todo el estado junto (para llevarlo a otra máquina sin servidor) y su vuelta
  function exportarEstado() {
    const pre = clave(''), subs = new Set(Object.keys(est()));
    try { for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); if (k.startsWith(pre) && !k.endsWith('@rev')) subs.add(k.slice(pre.length)); } } catch (e) {}
    const out = {};
    subs.forEach((s) => { const v = leer(s); if (v != null) out[s] = { rev: Math.max(est()[s]?.rev || 0, +ls.get(clave(s) + '@rev') || 0), v }; });
    return { tramoya: 1, proyecto: window.PROYECTO?.id, exportado: new Date().toISOString(), estado: out };
  }
  function importarEstado(obj) {
    const e = obj?.estado || obj;
    Object.entries(e || {}).forEach(([s, d]) => guardar(s, d && 'v' in d ? d.v : d));
    return Object.keys(e || {}).length;
  }
  // Sube un archivo a proyecto/assets/<carpeta>/ (solo con servidor) y devuelve la ruta
  // relativa a las páginas, lista para usar en los datos. Actualiza el manifiesto.
  async function subirArchivo(file, carpeta = 'img') {
    if (!(await servidor)) throw new Error('Para subir archivos, abrí el proyecto con `tramoya abrir`.');
    const r = await fetch(`${API}/subir?carpeta=${encodeURIComponent(carpeta)}&nombre=${encodeURIComponent(file.name)}`, { method: 'PUT', body: file });
    if (!r.ok) throw new Error(await r.text());
    const j = await r.json();
    if (j.manifiesto) window.MANIFIESTO = j.manifiesto;
    return j.ruta;
  }
  // Indicador chico de dónde quedó lo editado (abajo a la izquierda; no aparece en render)
  async function indicador() {
    if (RENDER || TRAMOYA.sinIndicador || !document.body) return;
    let el = document.getElementById('tr-estado');
    if (!el) {
      el = document.createElement('div'); el.id = 'tr-estado';
      el.style.cssText = 'position:fixed;left:10px;bottom:8px;z-index:999;font:500 11px system-ui,sans-serif;color:#b7b1a7;background:rgba(14,14,16,.82);border:1px solid #2b2b31;border-radius:20px;padding:4px 10px 4px 8px;display:flex;align-items:center;gap:6px;pointer-events:auto;opacity:.75';
      el.onmouseenter = () => { el.style.opacity = 1; }; el.onmouseleave = () => { el.style.opacity = 0.75; };
      document.body.appendChild(el);
    }
    const srv = await servidor, esperando = enVuelo || Object.keys(pendientes).length;
    const [color, txt, tip] = ultimoError ? ['#e0605a', 'No se pudo guardar', ultimoError]
      : esperando ? ['#d7a54a', 'Guardando…', '']
      : srv ? ['#5fbf7a', 'Guardado en el proyecto', 'Se escribe en proyecto/estado/ (el agente lo lee de ahí)']
      : ['#8d877e', 'Solo en este navegador', 'Abrí el proyecto con `tramoya abrir` para que lo editado se guarde en archivos. Mientras tanto: Exportar estado en la portada.'];
    el.innerHTML = `<i style="width:7px;height:7px;border-radius:50%;background:${color};display:inline-block"></i>${txt}`;
    el.title = tip;
  }
  if (!RENDER) addEventListener('DOMContentLoaded', () => indicador());
  // base64url: para pasar una configuración por la URL sin problemas de comillas
  const enc = (o) => btoa(unescape(encodeURIComponent(JSON.stringify(o)))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  const dec = (t) => JSON.parse(decodeURIComponent(escape(atob(t.replace(/-/g, '+').replace(/_/g, '/')))));
  const clone = (o) => JSON.parse(JSON.stringify(o));

  // ---------- Archivos ----------
  function descargar(nombre, contenido, tipo = 'application/octet-stream') {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(contenido instanceof Blob ? contenido : new Blob([contenido], { type: tipo }));
    a.download = nombre; a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  }
  async function copiar(txt, aviso) {
    try { await navigator.clipboard.writeText(txt); if (aviso) toast(aviso); }
    catch (e) { prompt('Copiá este texto:', txt); }
  }
  function toast(msg) {
    let el = document.getElementById('tr-toast');
    if (!el) {
      el = document.createElement('div'); el.id = 'tr-toast';
      el.style.cssText = 'position:fixed;bottom:100px;left:50%;transform:translateX(-50%);background:#d7a54a;color:#111;padding:10px 16px;border-radius:8px;font:600 14px system-ui,sans-serif;opacity:0;transition:opacity .2s;pointer-events:none;z-index:1000';
      document.body.appendChild(el);
    }
    el.textContent = msg; el.style.opacity = 1;
    clearTimeout(el._t); el._t = setTimeout(() => { el.style.opacity = 0; }, 2400);
  }

  // ---------- Fuentes y temas del proyecto ----------
  // Las fuentes van con font-display:block: si se mide texto antes de que carguen, las
  // posiciones salen con la fuente de reemplazo y el morph queda corrido.
  function instalarFuentes(base = '../') {
    const P = resolverEstilo();
    const css = (P.fuentes || []).map((f) => `@font-face{font-family:'${f.familia}';src:url('${f.url || base + f.archivo}') format('woff2');font-weight:${f.peso || '100 900'};font-style:${f.estilo || 'normal'};font-display:block}`).join('\n');
    const raiz = `:root{--font-display:${P.tipografia?.display || "Georgia, serif"};--font-body:${P.tipografia?.texto || 'system-ui, sans-serif'};--font-mono:${P.tipografia?.mono || 'ui-monospace, monospace'}}`;
    const st = document.createElement('style'); st.textContent = css + '\n' + raiz;
    document.head.prepend(st);
  }
  // Cada tema es un mapa de variables CSS; se declaran para el selector dado
  function instalarTemas(selector = '[data-theme]') {
    resolverEstilo();
    const T = window.PROYECTO?.temas || {};
    const css = Object.entries(T).map(([id, t]) => `${selector.replace('[data-theme]', `[data-theme="${id}"]`)}{${Object.entries(t.vars).map(([k, v]) => `--${k}:${v}`).join(';')}}`).join('\n');
    const st = document.createElement('style'); st.textContent = css;
    document.head.appendChild(st);
  }
  // Espera las fuentes declaradas (no solo document.fonts.ready, que no carga las que nadie usó todavía)
  function fuentesListas() {
    const P = window.PROYECTO || {};
    return Promise.all((P.fuentes || []).map((f) => document.fonts.load(`${f.estilo === 'italic' ? 'italic ' : ''}${String(f.peso || 400).split(' ').pop()} 40px '${f.familia}'`).catch(() => {})))
      .then(() => document.fonts.ready);
  }

  // ---------- Estilos ----------
  // Un estilo es una carpeta con estilo.js (+ fuentes/): temas, tipografía, marca, ritmo del
  // motion y del reel, y CSS extra. Ninguno viene por defecto: el proyecto usa el que se eligió
  // (copiado en proyecto/estilo/ por `tramoya estilo <id>` o desde la galería) y, si no hay,
  // uno neutro. El estilo pone la base; lo que defina proyecto.js lo pisa.
  //   ?estilo=<id>            previsualiza un estilo de la galería (estilos/<id>/) en cualquier pieza
  //   ?estilo=proyecto:<id>   uno propio del proyecto (proyecto/estilos/<id>/)
  const ESTILOS = {};
  let elegido = null, resuelto = false;
  function registrarEstilo(def) {
    const dir = (document.currentScript?.src || location.href).replace(/[^/]*([?#].*)?$/, '');
    const e = { ...def, dir, fuentes: (def.fuentes || []).map((f) => ({ ...f, url: new URL(f.archivo, dir).href })) };
    ESTILOS[def.id] = e;
    // proyecto/estilo/estilo.js es el elegido del proyecto
    if (/\/proyecto\/estilo\/$/.test(dir)) elegido = def.id;
    return e;
  }
  const PRUEBA = Q.get('estilo');
  if (PRUEBA && /^(proyecto:)?[a-z0-9-]+$/.test(PRUEBA) && BASE) {
    const [, propio, id] = PRUEBA.match(/^(proyecto:)?(.+)$/);
    document.write(`<script src="${BASE}${propio ? 'proyecto/estilos' : 'estilos'}/${id}/estilo.js"><\/script>`);
  }
  // Sin estilo elegido: neutro, con fuentes del sistema (que se note que falta elegir uno)
  const NEUTRO = {
    id: 'neutro', nombre: 'Sin estilo', descripcion: 'Todavía no se eligió un estilo: abrí la galería.',
    tipografia: { display: "system-ui, -apple-system, 'Segoe UI', sans-serif", texto: "system-ui, -apple-system, 'Segoe UI', sans-serif", mono: 'ui-monospace, monospace' },
    temas: {
      oscuro: { nombre: 'Oscuro', vars: { bg: '#111113', panel: '#19191c', 'panel-2': '#202024', text: '#e9e9ec', strong: '#ffffff', muted: '#9a9aa3', lead: '#d8d8de', accent: '#c8c8d0', 'accent-2': '#8f8f99', line: '#2c2c31', glow: 'transparent', 'glow-2': 'transparent', overlay: 'rgba(17,17,19,.86)', code: '#0c0c0e', grid: 'transparent', dot: 'rgba(255,255,255,.06)' } },
      claro: { nombre: 'Claro', claro: true, vars: { bg: '#f4f4f5', panel: '#ffffff', 'panel-2': '#e9e9ec', text: '#1b1b1f', strong: '#000000', muted: '#6b6b74', lead: '#34343a', accent: '#3a3a42', 'accent-2': '#6b6b74', line: '#d6d6dc', glow: 'transparent', 'glow-2': 'transparent', overlay: 'rgba(244,244,245,.9)', code: '#ffffff', grid: 'transparent', dot: 'rgba(0,0,0,.08)' } },
    },
    motion: { transicion: 'camara', grano: false, desenfoque: true, velocidad: 1 },
  };
  function estiloActual() { return ESTILOS[PRUEBA?.replace(/^proyecto:/, '')] || ESTILOS[elegido] || NEUTRO; }
  // Combina el estilo con PROYECTO (una sola vez, antes de fuentes, temas y marca)
  function resolverEstilo() {
    if (resuelto) return window.PROYECTO;
    resuelto = true;
    const P = (window.PROYECTO ||= {}), S = estiloActual(), prueba = S === ESTILOS[PRUEBA?.replace(/^proyecto:/, '')];
    P.estiloId = S.id; P.estiloNombre = S.nombre;
    // En una previsualización mandan los temas del estilo; si no, se suman los del proyecto
    P.temas = prueba ? { ...S.temas } : { ...(S.temas || {}), ...(P.temas || {}) };
    if (!Object.keys(P.temas).length) P.temas = { ...NEUTRO.temas };
    P.fuentes = [...(S.fuentes || []), ...(P.fuentes || [])];
    P.tipografia = { ...(S.tipografia || {}), ...(prueba ? {} : P.tipografia || {}) };
    // En una previsualización, del proyecto solo queda el contenido (la palabra de la marca, el pie)
    const solo = (o, claves) => Object.fromEntries(Object.entries(o || {}).filter(([k]) => claves.includes(k)));
    const mb = prueba ? solo(P.marca?.base, ['palabra', 'iniciales']) : P.marca?.base || {};
    P.marca = { ...(P.marca || {}), base: { ...(S.marca?.base || {}), ...mb }, variantes: { ...(S.marca?.variantes || {}), ...(P.marca?.variantes || {}) } };
    P.estilo = { ...(S.motion || {}), ...(prueba ? solo(P.estilo, ['pie', 'logo']) : P.estilo || {}) };
    if (!P.temas[P.estilo.tema]) P.estilo.tema = (S.motion?.tema && P.temas[S.motion.tema]) ? S.motion.tema : Object.keys(P.temas)[0];
    if (S.reel) P.reel = prueba ? { ...(P.reel || {}), ...S.reel, sonido: { ...(S.reel.sonido || {}) } }
      : { ...S.reel, ...(P.reel || {}), sonido: { ...(S.reel.sonido || {}), ...(P.reel?.sonido || {}) } };
    P.forma = { ...(S.forma || {}), ...(prueba ? {} : P.forma || {}) };
    P.estiloPrueba = prueba;
    const st = document.createElement('style'); st.dataset.estilo = S.id;
    st.textContent = `:root{${perillas(P).map(([k, v]) => `${k}:${v}`).join(';')}}\n${S.css || ''}`;
    document.head.appendChild(st);
    return P;
  }
  // Perillas del estilo → variables CSS que respetan motion, póster, landing y portada.
  // Sin estilo (o sin la perilla), cada pieza usa su valor de siempre (el var(--x, defecto) del CSS).
  const FUENTE = { display: 'var(--font-display)', texto: 'var(--font-body)', mono: 'var(--font-mono)' };
  const em = (v) => (typeof v === 'number' ? v + 'em' : v);
  function perillas(P) {
    const T = P.tipografia || {}, F = P.forma || {}, K = F.kicker || {}, out = [];
    const si = (k, v) => { if (v !== undefined && v !== null && v !== '') out.push([k, v]); };
    si('--titulo-peso', T.peso);
    si('--titulo-interletra', em(T.interletra));
    si('--titulo-alto', T.alto);
    si('--titulo-caja', T.mayusculas === undefined ? undefined : T.mayusculas ? 'uppercase' : 'none');
    si('--titulo-estilo', T.italicaTitulos === undefined ? undefined : T.italicaTitulos ? 'italic' : 'normal');
    si('--acento-estilo', T.italica === undefined ? undefined : T.italica ? 'italic' : 'normal');
    si('--texto-peso', T.pesoTexto);
    si('--acento-peso', T.pesoAcento);
    si('--kicker-fuente', FUENTE[K.fuente]);
    si('--kicker-peso', K.peso);
    si('--kicker-interletra', em(K.interletra));
    si('--kicker-caja', K.mayusculas === undefined ? undefined : K.mayusculas ? 'uppercase' : 'none');
    si('--kicker-barra', K.barra === undefined ? undefined : K.barra === false ? '0px' : K.barra === true ? undefined : K.barra + 'px');
    si('--kicker-barra-display', K.barra === false ? 'none' : undefined);
    si('--radio', F.radio);
    si('--borde', F.borde === undefined ? undefined : F.borde + 'px');
    si('--sombra', F.sombra);
    si('--numeral', F.numeral === undefined ? undefined : F.numeral ? 'block' : 'none');
    si('--marcador', F.marcador === undefined ? undefined : F.marcador ? 'block' : 'none');
    si('--trama', F.trama === undefined ? undefined : F.trama + 'px');
    const g = P.estilo?.grano;
    si('--grano', typeof g === 'number' ? g : undefined);
    Object.entries(F.vars || {}).forEach(([k, v]) => si(k.startsWith('--') ? k : '--' + k, v));
    return out;
  }
  // ?ui=0 (las muestras de la galería, capturas): sin el indicador de guardado
  const SIN_UI = Q.get('ui') === '0';
  // Si lo guardado en una pieza apunta a un tema que este estilo no tiene, el primero
  const temaValido = (t) => (window.PROYECTO?.temas?.[t] ? t : window.PROYECTO?.estilo?.tema || Object.keys(window.PROYECTO?.temas || {})[0]);

  window.TRAMOYA = Object.assign(window.TRAMOYA || {}, {
    BASE, registrarEstilo, resolverEstilo, estiloActual, temaValido, ESTILOS, NEUTRO, estiloPrueba: PRUEBA, perillas,
    ...(SIN_UI ? { sinIndicador: true } : {}),
    cl, lerp, prog, exOut, exIn, exInOut, backOut, spring, smooth, kf, speed,
    rgba, mixRGBA, mixHex, esc, md, plain, lines, pairs, nn, r2,
    clave, leer, guardar, borrar, enc, dec, clone, descargar, copiar, toast,
    RENDER, servidor, exportarEstado, importarEstado, subirArchivo,
    instalarFuentes, instalarTemas, fuentesListas,
  });
})();
