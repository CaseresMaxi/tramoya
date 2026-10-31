// Motor de la presentación motion: la presentación como un solo video.
//
// Hay una línea de tiempo continua con puntos clave. "Siguiente" reproduce hasta el
// próximo punto clave y ahí se detiene; "anterior" rebobina. Cada cuadro sale de
// render(T), función pura del tiempo: se puede pausar, rebobinar, recorrer y renderizar.
//
// Necesita, en este orden: nucleo/util.js, proyecto/proyecto.js, nucleo/marca.js,
// proyecto/manifiesto.js, proyecto/glifos.js, motion/movimientos.js, motion/tipos.js, proyecto/tipos.js,
// proyecto/escenas.js. El marcado del escenario y del editor está en motion/index.html.
(function () {
  const U = window.TRAMOYA, P = window.PROYECTO, M = U.marca;
  const { cl, lerp, exOut, exInOut, backOut, smooth, nn, esc, plain, rgba, mixRGBA } = U;
  const TIPOS = { ...window.MOTION.TIPOS, ...(window.TIPOS_PROYECTO || {}) };
  const ESCENAS = window.ESCENAS || [];
  const MANIFIESTO = window.MANIFIESTO || { imagenes: [], logos: [], videos: [] };
  const alSubir = (m) => { if (m) Object.assign(MANIFIESTO, m); };
  const $ = (id) => document.getElementById(id);
  const stage = $('stage');
  // SPAN: cuánto viaja la cámara (px). La duración de cada transición va en TR[i].D (estilo.duracion, o la de la escena).
  const W = 1920, CX = 960, CY = 540;
  let SPAN = 900;
  const q = new URLSearchParams(location.search);
  const RENDER = q.has('render');
  if (RENDER) document.body.classList.add('render');
  document.title = `${plain(P.nombre)} — Presentación`;

  // Estilos propios de los tipos del proyecto
  Object.values(TIPOS).forEach((t) => { if (t.css) { const s = document.createElement('style'); s.textContent = t.css; document.head.appendChild(s); } });

  // Desenfoque de movimiento direccional: filtros SVG precalculados (CSS blur no tiene dirección)
  $('blurDefs').innerHTML = Array.from({ length: 24 }, (_, i) => ['x', 'y'].map((ax) =>
    `<filter id="mb${ax}${i + 1}" x="-20%" y="-20%" width="140%" height="140%" color-interpolation-filters="sRGB"><feGaussianBlur stdDeviation="${ax === 'x' ? `${i + 1} 0` : `0 ${i + 1}`}"/></filter>`).join('')).join('');

  // ---------- Estado guardado ----------
  // Perillas de movimiento (las pone el estilo en PROYECTO.estilo; ver referencias/estilos.md):
  //   duracion   segundos de cada transición entre escenas · recorrido: cuánto viaja la cámara (1 = 900 px)
  //   entrada    curva de las entradas: expo | suave | resorte | lineal | escalon
  //   ritmo      multiplica duración, retardo y desfase de cada entrada (2 = el doble de lento)
  //   distancia  cuánto se desplaza lo que entra (up, left, right) · franjas: { n, color, grosor }
  //   coreografia  la de base (motion/movimientos.js) · coreografias: rotación cuando se repite el tipo · variar: false la apaga
  const ESTILO_DEF = { tema: Object.keys(P.temas)[0], logo: M.hayEditor() ? 'editor' : 'tema', transicion: 'franjas', desenfoque: true, velocidad: 1, grano: true, cromo: true, pie: '',
    duracion: 1.5, recorrido: 1, entrada: 'expo', ritmo: 1, distancia: 1, coreografia: 'tipo', variar: true, ...(P.estilo || {}) };
  ESTILO_DEF.franjas = { n: 4, color: 'mixto', grosor: 1, ...(P.estilo?.franjas || {}) };
  if (M.hayEditor() && !P.estilo?.logo) ESTILO_DEF.logo = 'editor';
  // El "look" lo trae el estilo: si lo guardado se hizo con otro estilo (o se está previsualizando
  // uno con ?estilo=), estas claves vuelven a las del estilo actual; el resto (pie, logo…) se queda.
  const LOOK = ['tema', 'transicion', 'velocidad', 'desenfoque', 'grano', 'cromo', 'duracion', 'recorrido', 'entrada', 'ritmo', 'distancia', 'franjas', 'coreografia', 'coreografias', 'variar'];
  const conEstilo = (e = {}) => {
    const out = { ...ESTILO_DEF, ...e };
    if (P.estiloPrueba || (e.estiloBase || null) !== (P.estiloId || null)) LOOK.forEach((k) => { out[k] = ESTILO_DEF[k] === undefined ? undefined : U.clone(ESTILO_DEF[k]); });
    out.tema = U.temaValido(out.tema);
    out.estiloBase = P.estiloId;
    return out;
  };
  const fresh = () => ({ escenas: U.clone(ESCENAS).map((s) => ({ activa: true, ...s })), estilo: conEstilo() });
  let doc = fresh();
  {
    const saved = U.leer('motion'); // en render, solo lo guardado en archivos (proyecto/estado.js)
    if (saved && Array.isArray(saved.escenas)) doc = { escenas: saved.escenas, estilo: conEstilo(saved.estilo) };
    // "Según el tema" que nadie eligió a mano: pasa al diseño del editor de marca
    if (M.hayEditor() && doc.estilo.logo === 'tema' && !doc.estilo.logoElegido) doc.estilo.logo = 'editor';
  }
  let saveTimer;
  const save = () => {
    if (RENDER) return;
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => { if (!U.guardar('motion', doc)) U.toast('No entra en el almacenamiento del navegador. Exportá el .json.'); }, 250);
  };

  function fit() {
    if (RENDER) return;
    const vp = $('viewport'), s = Math.min(vp.clientWidth / 1920, vp.clientHeight / 1080);
    stage.style.transform = `translate(-50%, -50%) scale(${s})`;
  }
  addEventListener('resize', fit);
  $('app').addEventListener('transitionend', fit);

  // ---------- Logo ----------
  const logoNombres = () => {
    const out = { tema: 'Según el tema', editor: 'Último diseño del editor de marca' };
    Object.entries(M.variantes()).forEach(([id, v]) => { out[id] = v.nombre || id; });
    return out;
  };
  // v: variante; sin valor, la de la presentación (cada escena puede tener la suya)
  const logoCfg = (v = doc.estilo.logo) => M.cfgDe(v, doc.estilo.tema);
  function logoHTML(size = '', v = '') {
    const own = !!v;
    v = v || doc.estilo.logo;
    if (v.startsWith('archivo:')) return `<span class="logo-iso ${size}"><img src="${esc(v.slice(8))}" alt=""></span>`;
    const c = logoCfg(v);
    if (!own) stage.style.setProperty('--logo-acc', c.acento);
    return `<span class="logo-iso ${size}">${M.isoSVG(c)}</span>`;
  }
  // Marca del encabezado: el logo horizontal completo
  function brandHTML(v = '') {
    v = v || doc.estilo.logo;
    if (v.startsWith('archivo:')) return logoHTML('', v);
    return M.buildSVG({ ...logoCfg(v), layout: 'horizontal', margen: 0, lienzo: 'ajustado' }, { background: null }).svg;
  }
  let brandFor = null;

  // ---------- Construcción: una capa por escena, medida una vez ----------
  const active = () => doc.escenas.filter((s) => s.activa !== false);
  const MOV = window.MOTION.MOVIMIENTOS, COREO = window.MOTION.COREOGRAFIAS, azar = window.MOTION.azar;
  // Curvas de entrada que puede elegir el estilo (motion.entrada)
  const CURVAS = {
    expo: exOut,
    suave: (x) => 1 - Math.pow(1 - cl(x), 3),
    resorte: (x) => backOut(cl(x)),
    lineal: (x) => cl(x),
    escalon: (x) => (x >= 1 ? 1 : Math.floor(cl(x) * 4) / 4),
  };
  let EASE = exOut;
  const DIRS = { derecha: [1, 0], izquierda: [-1, 0], abajo: [0, 1], arriba: [0, -1], zoom: [0, 0] };
  const AUTO = ['derecha', 'abajo', 'derecha', 'zoom', 'derecha', 'arriba'];
  // Transiciones entre escenas: el estilo pone la de siempre y cada escena puede pedir la suya
  //   franjas · camara (la cámara viaja) · morph (solo se transforma lo compartido) · fundido · corte (seco)
  const TRANS = ['franjas', 'camara', 'morph', 'fundido', 'corte'];
  const CAMARA = (tr) => tr && (tr.tipo === 'franjas' || tr.tipo === 'camara');
  let S = [], TR = [], KEYS = [], PAIRS = [], TOTAL = 0, PARTITURA = [];

  // Parte el texto en palabras (o letras), cada una con su máscara, sin tocar el marcado
  function splitText(el, letters) {
    const parts = [];
    const mk = (txt) => { const o = document.createElement('span'), i = document.createElement('span'); o.className = 'wm'; i.className = 'wi'; i.textContent = txt; o.appendChild(i); parts.push(i); return o; };
    const walk = (node) => [...node.childNodes].forEach((ch) => {
      if (ch.nodeType === 1) return walk(ch);
      if (ch.nodeType !== 3) return;
      // Puntuación pegada a un elemento anterior ("*palabra*,"): va con la última palabra de ese
      // elemento, para que no quede sola al principio de un renglón
      let txt = ch.textContent;
      const prev = ch.previousSibling, lead = txt.match(/^[^\s]+/)?.[0];
      const last = parts[parts.length - 1]?.parentElement;
      if (lead && prev?.nodeType === 1 && last && prev.contains(last)) {
        const glue = document.createElement('span'); glue.className = 'wl';
        last.replaceWith(glue); glue.appendChild(last);
        const p = mk(lead); p.style.color = getComputedStyle(ch.parentElement).color; p.style.fontStyle = getComputedStyle(ch.parentElement).fontStyle;
        glue.appendChild(p.parentElement || p);
        txt = txt.slice(lead.length);
      }
      const frag = document.createDocumentFragment();
      txt.split(/(\s+)/).forEach((tok) => {
        if (!tok) return;
        if (/^\s+$/.test(tok)) return frag.appendChild(document.createTextNode(tok));
        if (!letters) return frag.appendChild(mk(tok));
        const w = document.createElement('span'); w.className = 'wl';
        [...tok].forEach((c) => w.appendChild(mk(c)));
        frag.appendChild(w);
      });
      ch.replaceWith(frag);
    });
    walk(el);
    el._parts = parts;
  }

  // ---------- Qué movimiento lleva cada elemento ----------
  // Rol: lo declara el tipo con data-r, o se deduce de la clave compartida y del campo
  const TEXTOS = ['cuerpo', 'texto', 'subtitulo', 'nota', 'final'];
  function rolDe(e) {
    if (e.dataset.r) return e.dataset.r;
    const k = e.dataset.k || '', f = e.dataset.f || '';
    if (k === 'kicker' || k === 'titulo' || k === 'hero') return k;
    if (k.startsWith('item-')) return 'item';
    if (f === 'logo') return 'logo';
    if (e.classList.contains('numeral')) return 'numeral';
    if (e.dataset.m === 'count' || f === 'numero') return 'dato';
    if (TEXTOS.includes(f)) return 'texto';
    return 'otro';
  }
  // Coreografía de una escena: la que pide, la del estilo, o (si se repite el tipo de la
  // anterior sin que nadie haya elegido nada) la siguiente de la rotación, para no repetir
  function coreoDe(lista, i) {
    const d = lista[i], E = doc.estilo;
    if (d.coreografia && COREO[d.coreografia]) return d.coreografia;
    const base = COREO[E.coreografia] ? E.coreografia : 'tipo';
    // Una escena libre ya es a medida: no se rota
    if (E.variar === false || d.tipo === 'libre') return base;
    let run = 0;
    for (let j = i - 1; j >= 0 && lista[j].tipo === d.tipo; j--) run++;
    const rot = (E.coreografias || [base, 'editorial', 'cinetica', 'sobria']).filter((c) => COREO[c]);
    return rot.length ? rot[run % rot.length] : base;
  }
  // El movimiento se adapta al contenido: letras solo en textos cortos, palabras en lo que se lee
  // de un vistazo, renglones en los párrafos
  function adaptar(e, kind, avisos) {
    const n = (e.textContent || '').trim().length, words = (e.textContent || '').trim().split(/\s+/).length;
    let k = kind;
    if (MOV[k]?.partes === 'letras' && n > 28) k = words > 14 ? 'renglones' : 'words';
    else if (MOV[k]?.partes === 'palabras' && words > 24) k = 'renglones';
    if (k !== kind) avisos.push(`«${plain(e.textContent).trim().slice(0, 30)}…»: ${kind} → ${k} (texto largo)`);
    return k;
  }
  function resolverMov(el, d, coreo, avisos) {
    const mov = d.mov || {}, roles = COREO[coreo]?.roles || {}, idx = {};
    el.querySelectorAll('[data-m], [data-r], [data-f]').forEach((e) => {
      const f = e.dataset.f, i = f ? (idx[f] = (idx[f] ?? -1) + 1) : 0, rol = rolDe(e);
      // En la escena: por campo ("titulo", "puntos.2") o por rol ("@item"); si no, la coreografía
      let o = (f && (mov[`${f}.${i}`] ?? mov[f])) ?? mov['@' + rol];
      if (o === undefined && (e.dataset.m || e.dataset.r)) o = roles[rol];
      if (o === undefined) return;
      if (typeof o === 'string') o = { m: o };
      const set = (k, v) => { if (v !== undefined && v !== '' && v !== null) e.dataset[k] = v; };
      set('m', o.m); set('at', o.at); set('dur', o.dur); set('stagger', o.stagger); set('s', o.s); set('orden', o.orden);
      set('e', o.e); set('es', o.es); set('eat', o.eat); set('edur', o.edur); set('x', o.x);
      if (o.m && !MOV[o.m]) avisos.push(`movimiento desconocido: ${o.m}`);
    });
  }
  // Orden de las partes de un texto (o de los ítems de un grupo)
  function rangos(n, orden) {
    const mid = (n - 1) / 2, ix = [...Array(n).keys()];
    if (orden === 'inverso') return ix.map((j) => n - 1 - j);
    if (orden === 'centro') return ix.map((j) => Math.round(Math.abs(j - mid)));
    if (orden === 'bordes') return ix.map((j) => Math.round(mid - Math.abs(j - mid)));
    if (orden === 'azar') { const o = ix.slice().sort((a, b) => azar(a, n) - azar(b, n)); return ix.map((j) => o.indexOf(j)); }
    return ix;
  }
  // Los textos que se reescriben (type, desordenar) actúan sobre el texto, no sobre su decoración
  const blancoDeTexto = (e) => (e.children.length && ![...e.children].every((c) => c.matches('span.accent, em, b, strong, br')) ? e.querySelector('[data-texto]') || e.lastElementChild : e);

  function build() {
    const box = $('layers'), E = doc.estilo, R = +E.ritmo || 1;
    const DG = cl(+E.duracion || 1.5, 0.3, 4); SPAN = 900 * (E.recorrido ?? 1); EASE = CURVAS[E.entrada] || exOut;
    box.innerHTML = ''; $('ghosts').innerHTML = '';
    const lista = active();
    PARTITURA = [];
    S = lista.map((d, i) => {
      const tipo = TIPOS[d.tipo], el = document.createElement('section');
      el.className = 'scene scene-' + d.tipo;
      try { el.innerHTML = tipo ? tipo.render(d, { logo: (size) => logoHTML(size, d.logo), n: i + 1 }) : `<div class="pad"><h2>Tipo desconocido: ${esc(d.tipo)}</h2></div>`; }
      catch (e) { console.error(e); el.innerHTML = `<div class="pad"><h2>Error en la escena ${i + 1}</h2><p class="body">${esc(e.message)}</p></div>`; }
      if (d.logo && !d.logo.startsWith('archivo:')) el.style.setProperty('--logo-acc', logoCfg(d.logo).acento);
      // Elementos ocultos desde el editor
      (d.ocultar || []).forEach((f) => el.querySelectorAll(`[data-f="${f}"]`).forEach((x) => x.remove()));
      box.appendChild(el);
      const avisos = [], coreo = coreoDe(lista, i);
      resolverMov(el, d, coreo, avisos);
      el.querySelectorAll('[data-m]').forEach((e) => {
        if (!MOV[e.dataset.m]) { avisos.push(`movimiento desconocido: ${e.dataset.m}`); e.dataset.m = 'fade'; }
        e.dataset.m = adaptar(e, e.dataset.m, avisos);
        const def = MOV[e.dataset.m];
        if (!def.partes) return;
        splitText(e, def.partes === 'letras');
        // Renglones: las palabras que comparten altura forman una unidad
        if (def.partes === 'renglones') {
          const tops = e._parts.map((w) => Math.round(w.parentElement.offsetTop / 4));
          const u = [...new Set(tops)].sort((a, b) => a - b);
          e._unit = tops.map((t) => u.indexOf(t)); e._units = u.length;
        } else { e._unit = e._parts.map((_, j) => j); e._units = e._parts.length; }
      });
      const anims = [...el.querySelectorAll('[data-m], [data-e]')].map((e, order) => {
        const kind = e.dataset.m || 'quieto', def = MOV[kind], ds = e.dataset;
        const a = { e, kind, def, order, s: +ds.s || 0, at: (+ds.at || 0) * R, dur: +(ds.dur || def.dur || 0.9) * R, st: +(ds.stagger || def.st || 0) * R,
          par: +(ds.par || 1), dim: e.hasAttribute('data-dim'), out: ds.out ? +ds.out : null, parts: e._parts || null,
          x: MOV[ds.x] ? ds.x : null, txt: def.texto || kind === 'type' || kind === 'desordenar' ? blancoDeTexto(e) : e };
        if (a.parts) { a.unit = e._unit; a.rank = rangos(e._units, ds.orden || def.orden); a.maxRank = Math.max(0, ...a.rank); }
        if (ds.e && MOV[ds.e]) { const ad = MOV[ds.e]; a.acc = { def: ad, s: ds.es !== undefined ? +ds.es : a.s, at: ds.eat !== undefined ? +ds.eat * R : ds.es !== undefined ? 0.1 * R : a.at + a.dur, dur: +(ds.edur || ad.dur || 0.7) * R }; }
        else if (ds.e) avisos.push(`acento desconocido: ${ds.e}`);
        return a;
      });
      // Ítems de un mismo grupo (rol y punto clave) en el orden pedido: se reparten sus tiempos
      const grupos = {};
      anims.forEach((a) => { if (a.e.dataset.orden && !a.parts) (grupos[`${rolDe(a.e)}.${a.s}`] ??= []).push(a); });
      Object.values(grupos).forEach((g) => { const ts = g.map((a) => a.at).sort((x, y) => x - y), rk = rangos(g.length, g[0].e.dataset.orden); g.forEach((a, j) => { a.at = ts[rk[j]]; }); });
      const steps = 1 + Math.max(0, ...anims.map((a) => Math.max(a.s, a.acc ? a.acc.s : 0)));
      const fin = (a) => a.at + a.dur + (a.parts ? a.maxRank * a.st : 0);
      const intro = Array.from({ length: steps }, (_, s) => anims.reduce((m, a) => Math.max(m, a.s === s ? fin(a) : 0, a.acc && a.acc.s === s && a.acc.def.fase === 'acento' ? a.acc.at + a.acc.dur : 0), 0.6));
      const dir = DIRS[d.entrada] ? d.entrada : AUTO[(i + AUTO.length - 1) % AUTO.length];
      const trD = typeof d.transicion === 'object' && d.transicion ? d.transicion : { tipo: d.transicion };
      const trans = { tipo: TRANS.includes(trD.tipo) ? trD.tipo : TRANS.includes(E.transicion) ? E.transicion : 'franjas' };
      trans.D = trD.dur ? cl(+trD.dur, 0.05, 6) : trans.tipo === 'corte' ? 0.08 : trans.tipo === 'fundido' ? DG * 0.8 : DG;
      return { d, i, el, tipo, anims, steps, intro, dir, trans, coreo, avisos, foci: Array.isArray(d.focos) ? d.focos : tipo?.focos?.(d) || [], keyed: new Map(), sharedIn: new Set(), sharedOut: new Set() };
    });
    // Línea de tiempo: [transición] → punto clave → punto clave… → transición → …
    TR = []; KEYS = [];
    let cur = 0;
    S.forEach((sc, i) => {
      let base = 0;
      const tr = i > 0 ? { a: i - 1, b: i, start: cur, tipo: sc.trans.tipo, D: sc.trans.D } : null;
      if (tr) { TR.push(tr); base = cur + tr.D * (tr.tipo === 'corte' ? 1 : tr.tipo === 'fundido' ? 0.2 : 0.35); }
      sc.tIn = i > 0 ? cur : 0;
      sc.stepStart = []; sc.keyT = [];
      for (let s = 0; s < sc.steps; s++) {
        const intro = s === 0 && tr && tr.tipo !== 'corte' ? Math.max(sc.intro[0], tr.D * 0.65 + 0.2) : sc.intro[s];
        sc.stepStart[s] = base; base += intro; sc.keyT[s] = base;
        KEYS.push({ t: base, i, s });
      }
      cur = base;
    });
    S.forEach((sc, i) => { sc.tOut = i < S.length - 1 ? TR[i].start + TR[i].D : Infinity; });
    TOTAL = cur;
    worldPos.length = 0;
    measure();
    // Partitura: qué se mueve en cada escena, para revisar el ritmo del conjunto (lo que viaja
    // desde la escena anterior no entra: se transforma)
    PARTITURA = S.map((sc, i) => {
      const movs = {}, cuenta = {};
      sc.anims.forEach((a) => {
        const r = rolDe(a.e), k = sc.sharedIn.has(a.e) ? 'viaja' : a.kind;
        (movs[r] ??= new Set()).add(k + (a.acc ? '+' + a.acc.def.id : ''));
        cuenta[k] = (cuenta[k] || 0) + 1;
      });
      const roles = Object.fromEntries(Object.entries(movs).map(([r, v]) => [r, [...v]]));
      return { escena: i + 1, tipo: sc.d.tipo, coreografia: sc.coreo, transicion: i ? sc.trans.tipo : null, camara: i && CAMARA(sc.trans) ? sc.dir : null, pasos: sc.steps,
        roles, firma: Object.entries(roles).map(([r, v]) => `${r}:${v.join('/')}`).sort().join(' '), cuenta, elementos: sc.anims.length, avisos: sc.avisos };
    });
    window.PARTITURA = PARTITURA;
    buildPlan();
    if (!RENDER) buildTimeline();
    $('dots').innerHTML = S.map(() => '<i></i>').join('');
    $('cOf').textContent = '/ ' + nn(S.length);
    brandFor = null;
    $('chromeInst').textContent = doc.estilo.pie;
    markSel(); pinsKey = '';
  }

  // Posición de reposo de cada elemento compartido y pares que viajan en cada transición
  function measure() {
    const sr = stage.getBoundingClientRect(), k = sr.width / W;
    const accent = rgba(getComputedStyle(stage).getPropertyValue('--accent'));
    S.forEach((sc) => {
      sc.el.style.transform = 'none'; sc.el.style.filter = '';
      sc.keyed.clear(); sc.sharedIn.clear(); sc.sharedOut.clear();
      sc.el.querySelectorAll('[data-k]').forEach((e) => {
        e.style.transform = '';
        const r = e.getBoundingClientRect(), cs = getComputedStyle(e), shape = e.dataset.shape || 'text';
        const info = { e, shape, s: +e.dataset.s || 0, x: (r.left - sr.left) / k, y: (r.top - sr.top) / k, w: r.width / k, h: r.height / k,
          fs: parseFloat(cs.fontSize) || 16, bg: rgba(cs.backgroundColor), bd: rgba(cs.borderTopColor), rad: parseFloat(cs.borderTopLeftRadius) || 0,
          img: shape === 'img' ? e.querySelector('img')?.src || '' : '' };
        if (shape === 'bar') Object.assign(info, { w: 8, bg: accent, bd: accent, rad: 4 });
        sc.keyed.set(e.dataset.k, info);
      });
    });
    PAIRS = TR.map((tr) => {
      const A = S[tr.a], B = S[tr.b], out = [];
      B.keyed.forEach((b, key) => {
        const a = A.keyed.get(key);
        // Solo viaja lo que está a la vista en los dos extremos de la transición (en un corte, nada)
        if (tr.tipo === 'corte' || !a || b.s !== 0 || (a.shape === 'text') !== (b.shape === 'text')) return;
        out.push({ a, b, text: a.shape === 'text' });
        A.sharedOut.add(a.e); B.sharedIn.add(b.e);
      });
      return out;
    });
  }

  // ---------- Cámara ----------
  // Foco dentro de la escena (recorre un diagrama de punto clave en punto clave)
  function focusOf(sc, T) {
    const F = sc.foci;
    if (!F.length) return { s: 1, tx: 0, ty: 0 };
    let f = F[0];
    for (let s = 1; s < Math.min(sc.steps, F.length); s++) {
      const k = exInOut(cl((T - sc.stepStart[s]) / 1.1));
      if (k <= 0) break;
      f = { x: lerp(f.x, F[s].x, k), y: lerp(f.y, F[s].y, k), s: lerp(f.s, F[s].s, k) };
    }
    return { s: f.s, tx: (CX - f.x) * f.s, ty: (CY - f.y) * f.s };
  }
  // Movimiento entre escenas: la saliente se va en la dirección de la entrante
  function camOf(sc, T) {
    let s = 1, tx = 0, ty = 0;
    const tin = sc.i > 0 ? TR[sc.i - 1] : null, tout = TR[sc.i];
    if (CAMARA(tin) && T < tin.start + tin.D) {
      const e = exInOut(cl((T - tin.start) / tin.D));
      if (sc.dir === 'zoom') s = lerp(0.72, 1, e);
      else { const [dx, dy] = DIRS[sc.dir]; tx = dx * SPAN * (1 - e); ty = dy * SPAN * 0.6 * (1 - e); }
    }
    if (CAMARA(tout) && T > tout.start) {
      const e = exInOut(cl((T - tout.start) / tout.D)), dn = S[sc.i + 1].dir;
      if (dn === 'zoom') s *= lerp(1, 1.5, e);
      else { const [dx, dy] = DIRS[dn]; tx -= dx * SPAN * e; ty -= dy * SPAN * 0.6 * e; }
    }
    return { s, tx, ty };
  }
  function layerAt(sc, T) {
    const f = focusOf(sc, T), c = camOf(sc, T);
    return { s: f.s * c.s, tx: f.tx * c.s + c.tx, ty: f.ty * c.s + c.ty, cam: c };
  }
  const toScreen = (Lt, r) => ({ x: CX + Lt.tx + (r.x - CX) * Lt.s, y: CY + Lt.ty + (r.y - CY) * Lt.s, w: r.w * Lt.s, h: r.h * Lt.s });
  // Pone un elemento en una posición de pantalla, compensando el movimiento de su capa
  function place(e, Lc, x, y, z, op, r) {
    const lx = (x - CX - Lc.tx) / Lc.s + CX, ly = (y - CY - Lc.ty) / Lc.s + CY;
    e.style.transformOrigin = '0 0';
    e.style.transform = `translate(${lx - r.x}px, ${ly - r.y}px) scale(${z / Lc.s})`;
    e.style.opacity = op; e.style.clipPath = '';
    e._parts?.forEach((w) => { w.style.transform = ''; });
  }
  const blurOf = (vx, vy) => {
    if (!doc.estilo.desenfoque) return '';
    const n = Math.min(24, Math.round(Math.max(Math.abs(vx), Math.abs(vy)) / 320));
    return n ? `url(#mb${Math.abs(vx) >= Math.abs(vy) ? 'x' : 'y'}${n})` : '';
  };

  // ---------- Estado de un elemento según el tiempo ----------
  // t: segundos desde que empezó su entrada · x: progreso de su salida (0 → 1)
  const base = () => ({ op: 1, tr: '', clip: '', filter: '', origin: '', bg: null });
  // Progreso 0 → 1, con un margen para que el punto clave (t === dur, con redondeo) cuente como llegado
  const prog = (t, dur) => cl(t / dur + 1e-6);
  const unir = (r, o) => {
    r.op *= o.op; if (o.tr) r.tr = r.tr ? `${r.tr} ${o.tr}` : o.tr;
    if (o.clip) r.clip = o.clip; if (o.filter) r.filter = r.filter ? `${r.filter} ${o.filter}` : o.filter;
    if (o.origin && !r.origin) r.origin = o.origin; if (o.bg) r.bg = o.bg;
  };
  const escribir = (e, r) => {
    e.style.opacity = r.op; e.style.transform = r.tr; e.style.clipPath = r.clip; e.style.filter = r.filter; e.style.transformOrigin = r.origin;
  };
  function apply(a, t, x, sc, od) {
    const e = a.e, def = a.def, dz = doc.estilo.distancia ?? 1;
    const c = { el: a.txt, t, dur: a.dur, d: e.dataset, dz, amb, j: 0, n: 1, p: prog(t, a.dur) };
    c.e = EASE(c.p);
    let r = base();
    // Salida propia (data-x): ese movimiento al revés, sobre el elemento entero
    const salidaX = (rr) => { if (!a.x || x <= 0) return false; const o = base(), q = 1 - exOut(x); MOV[a.x].aplicar({ ...c, el: e, p: q, e: EASE(q), t: a.dur * q }, o); unir(rr, o); return true; };
    if (a.parts) {
      const nU = a.maxRank + 1;
      a.parts.forEach((w, j) => {
        const u = a.unit[j], rk = a.rank[u], tj = t - rk * a.st, pj = prog(tj, a.dur), rw = base();
        const cj = { ...c, el: w, t: tj, p: pj, e: EASE(pj), j: u, n: a.unit.length ? Math.max(...a.unit) + 1 : 1 };
        def.aplicar(cj, rw);
        if (x > 0 && !a.x) {
          const xj = exOut(cl((x - (rk / nU) * 0.5) / 0.5));
          if (def.salir) def.salir({ ...cj, x: xj }, rw);
          else { const q = 1 - xj, o = base(); def.aplicar({ ...cj, p: q, e: EASE(q) }, o); Object.assign(rw, o); }
        }
        escribir(w, rw);
      });
      salidaX(r);
    } else {
      def.aplicar(c, r);
      if (x > 0 && !salidaX(r)) {
        if (def.salir) def.salir({ ...c, x }, r);
        else { const xe = exOut(x); r.op *= 1 - xe; r.tr = `translate(${-od[0] * 90 * xe}px, ${-od[1] * 90 * xe}px) ` + r.tr; }
      }
    }
    // Acento (data-e): algo que le pasa a un elemento ya visible, o un bucle mientras se ve
    if (a.acc && sc.stepStart[a.acc.s] !== undefined) {
      const A = a.acc, ta = T_ - sc.stepStart[A.s] - A.at, pa = prog(ta, A.dur), o = base();
      if (A.def.fase !== 'bucle' || ta > 0) A.def.aplicar({ ...c, el: e, t: ta, p: pa, e: EASE(pa), dur: A.dur }, o);
      if (o.bg) {
        // Sobre las *palabras* en acento, si las hay; si no, sobre el elemento
        e._accT ??= (() => {
          const acc = [...e.querySelectorAll('.accent')];
          if (acc.length) return acc;
          if (getComputedStyle(e).display === 'inline') return [e];
          // Un bloque: el fondo va en un span que abraza solo el texto, renglón por renglón
          const w = document.createElement('span'); w.className = 'acc-t';
          while (e.firstChild) w.appendChild(e.firstChild);
          e.appendChild(w); return [w];
        })();
        const ts = e._accT;
        ts.forEach((el) => Object.assign(el.style, { backgroundImage: o.bg.image, backgroundSize: o.bg.size, backgroundPosition: o.bg.pos, backgroundRepeat: 'no-repeat', boxDecorationBreak: 'clone', webkitBoxDecorationBreak: 'clone' }));
        o.bg = null;
      }
      unir(r, o);
    }
    if (a.dim && sc.stepStart[a.s + 1] !== undefined) r.op *= 1 - 0.55 * exOut(cl((T_ - sc.stepStart[a.s + 1]) / 0.5));
    // data-out: se va del todo al empezar ese punto clave (para destacar una cosa por vez)
    if (a.out !== null && sc.stepStart[a.out] !== undefined) r.op *= 1 - exOut(cl((T_ - sc.stepStart[a.out]) / 0.4));
    if (a.par !== 1) r.tr = `translate(${(sc.L.cam.tx * (a.par - 1)) / sc.L.s}px, ${(sc.L.cam.ty * (a.par - 1)) / sc.L.s}px) ` + r.tr;
    escribir(e, r);
  }

  // ---------- Un cuadro ----------
  const trAt = (T) => TR.findIndex((tr) => T > tr.start && T < tr.start + tr.D);
  let T_ = 0, morphing = new Set();
  function render(T, vel = 0) {
    T_ = T;
    const ti = trAt(T);
    S.forEach((sc) => {
      const tin = sc.i > 0 ? TR[sc.i - 1] : null, tout = TR[sc.i];
      // En un corte, la escena nueva aparece recién cuando termina
      const vis = (sc.i === 0 ? T >= 0 : T > sc.tIn + (tin.tipo === 'corte' ? tin.D : 0)) && T < sc.tOut;
      sc.vis = vis;
      sc.el.style.visibility = vis ? 'visible' : 'hidden';
      if (!vis) return;
      sc.L = layerAt(sc, T);
      sc.el.style.transform = `translate(${sc.L.tx}px, ${sc.L.ty}px) scale(${sc.L.s})`;
      if (vel) { const c0 = camOf(sc, T - 0.01 * Math.sign(vel)); sc.el.style.filter = blurOf((sc.L.cam.tx - c0.tx) * 100 * Math.abs(vel), (sc.L.cam.ty - c0.ty) * 100 * Math.abs(vel)); }
      else sc.el.style.filter = '';
      const qIn = tin ? cl((T - tin.start) / tin.D) : 1, qOut = tout ? cl((T - tout.start) / tout.D) : 0;
      const od = tout ? DIRS[S[sc.i + 1].dir] : [0, 0];
      // Fundido: las capas se cruzan enteras; en el fundido y en el corte, nada sale por su cuenta
      sc.el.style.opacity = (tin?.tipo === 'fundido' ? smooth(0, 1, qIn) : 1) * (tout?.tipo === 'fundido' ? 1 - smooth(0, 1, qOut) : 1);
      const sale = tout && tout.tipo !== 'corte' && tout.tipo !== 'fundido';
      sc.anims.forEach((a) => {
        if (qIn < 1 && sc.sharedIn.has(a.e)) return;
        if (qOut > 0 && sc.sharedOut.has(a.e)) return;
        const t = sc.sharedIn.has(a.e) ? 1e9 : T - sc.stepStart[a.s] - a.at;
        apply(a, t, sale && qOut > 0 ? cl((qOut - a.order * 0.022) / 0.42) : 0, sc, od);
      });
    });

    // Elementos que viajan de una escena a la siguiente
    const now = new Set(), gbox = $('ghosts');
    let gi = 0;
    if (ti >= 0) {
      const tr = TR[ti], A = S[tr.a], B = S[tr.b], qq = (T - tr.start) / tr.D, m = exInOut(cl((qq - 0.04) / 0.9));
      const La = layerAt(A, tr.start), Lb = layerAt(B, tr.start + tr.D);
      PAIRS[ti].forEach(({ a, b, text }) => {
        const sa = toScreen(La, a), sb = toScreen(Lb, b), x = lerp(sa.x, sb.x, m), y = lerp(sa.y, sb.y, m);
        if (text) {
          // Texto: los dos se superponen y cruzan su opacidad mientras se escalan
          place(a.e, A.L, x, y, lerp(La.s, (b.fs * Lb.s) / a.fs, m), 1 - smooth(0.15, 0.6, m), a);
          place(b.e, B.L, x, y, lerp((a.fs * La.s) / b.fs, Lb.s, m), smooth(0.4, 0.85, m), b);
          return;
        }
        // Forma: un fantasma interpola caja, color y radio; el contenido cambia a mitad de camino
        let g = gbox.children[gi++];
        if (!g) { g = document.createElement('div'); g.className = 'ghost'; g.innerHTML = '<i></i><i></i>'; gbox.appendChild(g); }
        g.style.display = 'block';
        g.style.transform = `translate(${x}px, ${y}px)`;
        g.style.width = lerp(sa.w, sb.w, m) + 'px'; g.style.height = lerp(sa.h, sb.h, m) + 'px';
        g.style.background = mixRGBA(a.bg, b.bg, m); g.style.borderColor = mixRGBA(a.bd, b.bd, m);
        g.style.borderRadius = lerp(a.rad * La.s, b.rad * Lb.s, m) + 'px';
        [[g.children[0], a, 1 - m], [g.children[1], b, m]].forEach(([el, r, o]) => {
          el.style.display = r.img ? 'block' : 'none';
          if (r.img) { el.style.backgroundImage = `url("${r.img}")`; el.style.opacity = o; }
        });
        place(a.e, A.L, x, y, La.s, a.img ? 0 : 1 - smooth(0, 0.3, m), a);
        place(b.e, B.L, x, y, Lb.s, b.img ? 0 : smooth(0.62, 1, m), b);
        now.add(a.e); now.add(b.e);
      });
    }
    for (let i = gi; i < gbox.children.length; i++) gbox.children[i].style.display = 'none';
    morphing.forEach((e) => { if (!now.has(e)) e.classList.remove('morphing'); });
    now.forEach((e) => e.classList.add('morphing'));
    morphing = now;

    wipes(T, ti, vel);
    chrome(T, ti);
    world(T);
  }

  // Franjas que barren la pantalla en la dirección del movimiento. El estilo elige cuántas,
  // de qué color (mixto: acento afuera y tinta adentro · acento · tinta · alternado) y qué tan gruesas.
  const COLOR_FRANJA = {
    mixto: (j, n) => (j === 0 || j === n - 1 ? 'var(--accent)' : 'var(--strong)'),
    acento: () => 'var(--accent)', tinta: () => 'var(--strong)',
    alternado: (j) => (j % 2 ? 'var(--strong)' : 'var(--accent)'),
  };
  function wipes(T, ti, vel) {
    const box = $('wipes');
    if (ti < 0 || TR[ti].tipo !== 'franjas') { box.style.display = 'none'; return; }
    box.style.display = '';
    const F = doc.estilo.franjas || {}, n = cl(Math.round(F.n || 4), 1, 8), g = F.grosor || 1, mid = (n - 1) / 2, col = COLOR_FRANJA[F.color] || COLOR_FRANJA.mixto;
    while (box.children.length < n) box.appendChild(document.createElement('i'));
    while (box.children.length > n) box.lastChild.remove();
    const tr = TR[ti], D = tr.D, qq = (T - tr.start) / D, dn = S[tr.b].dir, [dx, dy] = DIRS[dn];
    const at = (q2, j) => {
      const e = exInOut(cl((q2 - j * (0.18 / n)) / 0.82)), open = Math.pow(Math.sin(Math.PI * e), 2);
      return { e, thick: (26 + 230 * open) * g * (4 / n) ** 0.5, gap: (j - mid) * (30 + 260 * open) * (4 / n) ** 0.5 };
    };
    [...box.children].forEach((bar, j) => {
      bar.style.background = col(j, n);
      const { e, thick, gap } = at(qq, j);
      if (dn === 'zoom') {
        const w = lerp(8, 420, e) * g, x = CX + (j - mid) * lerp(20, 1500, e) * (4 / n) ** 0.5;
        bar.style.cssText = `background:${col(j, n)}; width:${w}px; height:1080px; transform:translate(${x - w / 2}px, 0); opacity:${1 - smooth(0.75, 1, e)}`;
        return;
      }
      const pos = (ee, gg) => (dx ? CX + dx * (CX + 420) * (1 - 2 * ee) + gg : CY + dy * (CY + 420) * (1 - 2 * ee) + gg * 0.6);
      const p0 = at(qq - 0.01, j), v = ((pos(e, gap) - pos(p0.e, p0.gap)) * 100 * Math.abs(vel || 1)) / D;
      const c = pos(e, gap), f = vel ? blurOf(dx ? v : 0, dy ? v : 0) : '';
      bar.style.cssText = `background:${col(j, n)}; ` + (dx ? `width:${thick}px; height:1080px; transform:translate(${c - thick / 2}px, 0); filter:${f || 'none'}`
        : `width:1920px; height:${thick}px; transform:translate(0, ${c - thick / 2}px); filter:${f || 'none'}`);
    });
  }

  // Escena "actual" a los fines del cromo: la última que empezó
  const EPS = 1e-4;
  const sceneAt = (T) => { let i = 0; S.forEach((sc, k) => { if (k === 0 || T > sc.tIn + EPS) i = k; }); return i; };
  const stepAt = (sc, T) => { let s = 0; sc.stepStart.forEach((st, k) => { if (T >= st) s = k; }); return s; };
  function chrome(T, ti) {
    const ci = sceneAt(T), hidden = (sc) => (sc.d.tipo === 'portada' || sc.d.cromo === false || !doc.estilo.cromo ? 1 : 0);
    let f = ci, m = 0;
    if (ti >= 0) { m = exInOut(cl((T - TR[ti].start) / TR[ti].D)); f = ti + m; }
    const vis = ti >= 0 ? lerp(1 - hidden(S[ti]), 1 - hidden(S[ti + 1]), m) : 1 - hidden(S[ci]);
    $('chromeTop').style.opacity = $('chromeBottom').style.opacity = vis;
    const bv = S[Math.round(f)]?.d.logo || '';
    if (bv !== brandFor) { brandFor = bv; $('chromeBrand').innerHTML = brandHTML(bv); }
    // Contador que rueda como un odómetro
    const base = Math.floor(f + 1e-6), frac = f - base;
    $('cA').textContent = nn(base + 1); $('cB').textContent = nn(Math.min(S.length, base + 2));
    $('cA').parentElement.style.transform = `translateY(${-frac * 50}%)`;
    [...$('dots').children].forEach((d, j) => { const k = Math.max(0, 1 - Math.abs(f - j)); d.style.width = 10 + 34 * k + 'px'; d.classList.toggle('on', k > 0.5); });
    $('progress').style.transform = `scaleX(${TOTAL ? T / TOTAL : 0})`;
  }
  // La trama de fondo avanza con la cámara, más lenta: queda "lejos"
  const worldPos = [];
  function world(T) {
    if (worldPos.length !== S.length) { worldPos.length = 0; let x = 0, y = 0; S.forEach((sc, i) => { if (i && CAMARA(TR[i - 1])) { const [dx, dy] = DIRS[sc.dir]; x += dx * SPAN; y += dy * SPAN * 0.6; } worldPos.push([x, y]); }); }
    const ti = trAt(T);
    let [x, y] = worldPos[sceneAt(T)] || [0, 0];
    if (ti >= 0 && CAMARA(TR[ti])) {
      const e = exInOut(cl((T - TR[ti].start) / TR[ti].D)), a = worldPos[ti], b = worldPos[ti + 1];
      x = lerp(a[0], b[0], e); y = lerp(a[1], b[1], e);
    }
    $('world').style.backgroundPosition = `${-x * 0.3}px ${-y * 0.3}px`;
  }

  // ---------- Reproducción: el "video" corre hasta el próximo punto clave ----------
  let T = 0, target = 0, paused = false, auto = false, amb = 0, last = performance.now(), holdSince = null, startedAt = null, vel = 0;
  const keyAt = (t) => KEYS.find((k) => Math.abs(k.t - t) < EPS);
  function next(jumpTo = false) {
    const from = Math.max(T, target), k = KEYS.find((x) => x.t > from + EPS);
    if (!k) { if (auto) toggleAuto(false); return; }
    target = k.t; if (jumpTo) T = target;
    if (startedAt === null) startedAt = performance.now();
  }
  function prev(jumpTo = false) {
    const from = Math.min(T, target), ks = KEYS.filter((x) => x.t < from - EPS);
    target = ks.length ? ks[ks.length - 1].t : 0; if (jumpTo) T = target;
  }
  function seek(t, play = false) { T = cl(t, 0, TOTAL); target = play ? target : T; }
  // Repite el tramo que lleva al punto clave actual
  function replay() {
    const i = KEYS.findIndex((k) => k.t >= T - EPS), k = KEYS[Math.max(0, i)];
    const sc = S[k.i];
    T = k.s === 0 ? sc.tIn : sc.stepStart[k.s]; target = k.t;
  }
  // Cuánto se queda en cada punto clave en modo automático (y en el video renderizado)
  function holdFor(k) {
    const sc = S[k.i], m = +sc.d.mantener || 6;
    return k.s === sc.steps - 1 ? m : Math.max(2.5, m / sc.steps);
  }

  function ambient() {
    S.forEach((sc) => { if (sc.vis) sc.tipo?.tick?.(sc.el, amb); });
  }
  function loop(now) {
    const dt = Math.min(0.1, (now - last) / 1000);
    last = now; vel = 0;
    if (!paused) {
      amb += dt;
      if (Math.abs(target - T) > EPS) {
        const dir = target > T ? 1 : -1, sp = (dir > 0 ? 1 : 2.6) * doc.estilo.velocidad;
        T = dir > 0 ? Math.min(target, T + dt * sp) : Math.max(target, T - dt * sp);
        vel = sp * dir; holdSince = null;
      } else if (auto) {
        const k = keyAt(T);
        holdSince ??= now;
        if (k && now - holdSince > holdFor(k) * 1000) { holdSince = null; next(); }
      }
    }
    if (S.length) {
      render(T, vel);
      renderPins();
      ambient();
      S.forEach((sc) => {
        if (!sc.vis) return;
        // En el punto clave de su escena, el video corre; al moverse, se detiene
        const k = keyAt(T), hold = !paused && !vel && k && k.i === sc.i;
        if (hold && !sc.holding) { sc.holding = true; sc.tipo?.onHold?.(sc.el); }
        else if (!hold && sc.holding) { sc.holding = false; sc.tipo?.onLeave?.(sc.el); }
      });
      S.forEach((sc) => { if (!sc.vis && sc.holding) { sc.holding = false; sc.tipo?.onLeave?.(sc.el); } });
      updateUI();
    }
    requestAnimationFrame(loop);
  }

  // ---------- Como video: reproducción continua con las pausas del modo automático ----------
  // plan: tramos { v0, v1, T0, T1 } en tiempo de video v. Si T0 === T1 es una pausa en un punto clave.
  let PLAN = [];
  const pausaMax = parseFloat(q.get('pausaMax')) || Infinity;
  function buildPlan() {
    PLAN = [];
    let v = 0, T0 = 0;
    const sp = doc.estilo.velocidad || 1;
    KEYS.forEach((k) => {
      const mueve = (k.t - T0) / sp;
      if (mueve > 0) { PLAN.push({ v0: v, v1: v + mueve, T0, T1: k.t }); v += mueve; }
      const h = Math.min(pausaMax, holdFor(k));
      PLAN.push({ v0: v, v1: v + h, T0: k.t, T1: k.t, k }); v += h;
      T0 = k.t;
    });
  }
  function seekVideo(v) {
    const seg = PLAN.find((s) => v < s.v1) || PLAN[PLAN.length - 1];
    if (!seg) return;
    const k = seg.v1 > seg.v0 ? cl((v - seg.v0) / (seg.v1 - seg.v0)) : 1;
    const t = lerp(seg.T0, seg.T1, k), sp = seg.T1 > seg.T0 ? doc.estilo.velocidad || 1 : 0;
    T = target = t; amb = v;
    render(T, sp);
    ambient();
  }

  // ---------- Línea de tiempo ----------
  function buildTimeline() {
    const tl = $('tl');
    tl.innerHTML = '<div class="fill" id="tlFill"></div>';
    S.forEach((sc, i) => {
      const a = sc.tIn, b = i < S.length - 1 ? S[i + 1].tIn : TOTAL;
      const label = plain(sc.d.kicker || sc.d.titulo || TIPOS[sc.d.tipo]?.nombre || '');
      tl.insertAdjacentHTML('beforeend', `<div class="part" style="left:${(a / TOTAL) * 100}%; width:${((b - a) / TOTAL) * 100}%"><span>${i + 1}. ${esc(label)}</span></div>`);
    });
    KEYS.forEach((k) => tl.insertAdjacentHTML('beforeend', `<i class="key" style="left:${(k.t / TOTAL) * 100}%"></i>`));
    tl.insertAdjacentHTML('beforeend', '<div class="head" id="tlHead"></div>');
  }
  // Arrastrar sobre la barra recorre el video cuadro a cuadro
  {
    const tl = $('tl');
    let drag = false;
    const at = (e) => { const r = tl.getBoundingClientRect(); seek(((e.clientX - r.left) / r.width) * TOTAL); };
    tl.addEventListener('pointerdown', (e) => { e.stopPropagation(); drag = true; tl.setPointerCapture(e.pointerId); at(e); });
    tl.addEventListener('pointermove', (e) => drag && at(e));
    tl.addEventListener('pointerup', () => { drag = false; });
    tl.addEventListener('click', (e) => e.stopPropagation());
  }
  let notesFor = '', listFor = -1;
  function updateUI() {
    const k = TOTAL ? (T / TOTAL) * 100 : 0;
    $('tlFill').style.width = k + '%'; $('tlHead').style.left = k + '%';
    const ci = sceneAt(T), sc = S[ci], st = stepAt(sc, T);
    document.querySelectorAll('#tl .part').forEach((el, i) => el.classList.toggle('cur', i === ci));
    document.querySelectorAll('#tl .key').forEach((el, i) => el.classList.toggle('done', KEYS[i].t <= T + EPS));
    const secs = startedAt ? Math.floor((performance.now() - startedAt) / 1000) : 0;
    const state = paused ? 'congelado' : vel > 0 ? 'reproduciendo' : vel < 0 ? 'rebobinando' : keyAt(T) ? 'punto clave' : 'detenido';
    $('clock').textContent = `${ci + 1}/${S.length} · paso ${st + 1}/${sc.steps} · ${state} · ${nn(Math.floor(secs / 60))}:${nn(secs % 60)}`;
    if (notesFor !== `${ci}.${st}`) renderNotes(ci, st);
    if (listFor !== ci) { listFor = ci; renderSceneList(); if (editorOpen && currentTab === 'editar') renderSceneForm(); if (editorOpen && currentTab === 'assets') renderAssets(); }
  }
  function renderNotes(ci, st) {
    notesFor = `${ci}.${st}`;
    const sc = S[ci], n = S[ci + 1];
    $('notes').innerHTML = `<small>Escena ${ci + 1} · paso ${st + 1} de ${sc.steps} · ${esc(TIPOS[sc.d.tipo]?.nombre || '')}</small><p>${esc(sc.d.notas || 'Sin notas.')}</p>`
      + `<div class="next">Después: ${n ? esc(plain(n.d.kicker || n.d.titulo || '')) : '— fin —'}</div>`;
  }

  // ---------- Controles ----------
  function toggleAuto(v = !auto) { auto = v; holdSince = null; $('btnAuto').classList.toggle('on', auto); U.toast(auto ? 'Automático: sigue solo después de cada punto clave' : 'Modo presentador: avanzás vos'); if (auto && keyAt(T) === undefined && T === target) next(); }
  function togglePause(v = !paused) { paused = v; $('btnPause').textContent = paused ? '▶' : '❚❚'; }
  function cycleTheme() {
    const temas = Object.keys(P.temas);
    doc.estilo.tema = temas[(temas.indexOf(doc.estilo.tema) + 1) % temas.length];
    applyStyle(); save(); U.toast('Tema: ' + (P.temas[doc.estilo.tema].nombre || doc.estilo.tema));
  }
  const ACTIONS = {
    next: () => next(), prev: () => prev(), replay,
    first: () => { T = 0; target = KEYS[0]?.t || 0; },
    last: () => seek(TOTAL),
    pause: () => togglePause(), auto: () => toggleAuto(), theme: cycleTheme,
    notes: () => { $('notes').classList.toggle('on'); $('btnNotes').classList.toggle('on'); },
    help: () => $('help').classList.toggle('on'),
    full: () => (document.fullscreenElement ? document.exitFullscreen() : document.documentElement.requestFullscreen()),
    edit: () => toggleEditor(),
    mark: () => toggleMarking(),
  };
  document.querySelectorAll('[data-c]').forEach((b) => b.addEventListener('click', (e) => { e.stopPropagation(); ACTIONS[b.dataset.c](); }));
  // Clic en el escenario: marca una corrección, elige un elemento (editor abierto) o avanza
  stage.addEventListener('click', (e) => {
    if (RENDER) return;
    if (marking) return addCorrection(e);
    if (editorOpen) return selectAt(e);
    next();
  });
  addEventListener('keydown', (e) => {
    if (RENDER || e.target.closest?.('input, textarea, select')) return;
    const k = e.key;
    if (k === 'ArrowRight' || k === ' ' || k === 'PageDown') { e.preventDefault(); next(e.shiftKey); }
    else if (k === 'ArrowLeft' || k === 'PageUp') { e.preventDefault(); prev(e.shiftKey); }
    else if (k === 'Home') ACTIONS.first();
    else if (k === 'End') ACTIONS.last();
    else if (/^[pP]$/.test(k)) togglePause();
    else if (/^[aA]$/.test(k)) toggleAuto();
    else if (/^[rR]$/.test(k)) replay();
    else if (/^[nN]$/.test(k)) ACTIONS.notes();
    else if (/^[tT]$/.test(k)) cycleTheme();
    else if (/^[mM]$/.test(k)) { doc.estilo.desenfoque = !doc.estilo.desenfoque; save(); U.toast('Desenfoque de movimiento: ' + (doc.estilo.desenfoque ? 'sí' : 'no')); }
    else if (/^[eE]$/.test(k)) toggleEditor();
    else if (/^[cC]$/.test(k)) toggleMarking();
    else if (k === 'Escape' && marking) toggleMarking(false);
    else if (/^[fF]$/.test(k)) ACTIONS.full();
    else if (/^[hH?]$/.test(k)) ACTIONS.help();
    showControls();
  });
  let hideTimer;
  function showControls() {
    $('controls').classList.remove('hidden');
    clearTimeout(hideTimer);
    hideTimer = setTimeout(() => { if (!editorOpen) $('controls').classList.add('hidden'); }, 2600);
  }
  addEventListener('mousemove', () => { if (!RENDER) showControls(); });

  // ---------- Reconstrucción: mantiene el punto clave en el que estabas ----------
  function rebuild() {
    const ci = S.length ? sceneAt(T) : 0, st = S.length ? stepAt(S[ci], T) : 0;
    build();
    const sc = S[Math.min(ci, S.length - 1)];
    if (sc) { T = target = sc.keyT[Math.min(st, sc.steps - 1)]; }
    listFor = -1; notesFor = '';
  }
  // grano: true (la textura de siempre), false o un número (opacidad, 0–0.3)
  function grano(e = doc.estilo) {
    stage.classList.toggle('grain', !!e.grano);
    if (typeof e.grano === 'number') stage.style.setProperty('--grano', e.grano); else stage.style.removeProperty('--grano');
  }
  function applyStyle() {
    const e = doc.estilo;
    stage.dataset.theme = e.tema;
    grano(e);
    rebuild();
  }

  // ---------- Editor ----------
  let editorOpen = false, currentTab = 'escenas';
  function toggleEditor(v = !editorOpen) {
    editorOpen = v;
    $('app').classList.toggle('editing', v);
    $('btnEdit').classList.toggle('on', v);
    stage.classList.toggle('editing-on', v);
    if (!v) { selF = null; markSel(); }
    setTimeout(fit, 380);
    if (v) { renderSceneList(); renderSceneForm(); renderStyleForm(); renderInspector(); renderAssets(); renderCorrections(); showControls(); }
  }
  const openTab = (name) => document.querySelector(`#tabs [data-tab="${name}"]`).click();
  $('tabs').addEventListener('click', (e) => {
    const b = e.target.closest('button'); if (!b) return;
    currentTab = b.dataset.tab;
    document.querySelectorAll('#tabs button').forEach((x) => x.classList.toggle('on', x === b));
    document.querySelectorAll('.pane').forEach((p) => p.classList.toggle('on', p.id === 'pane-' + currentTab));
    ({ editar: renderSceneForm, elemento: renderInspector, assets: renderAssets, correcciones: renderCorrections })[currentTab]?.();
  });
  const goScene = (i) => { const sc = S[i]; if (sc) { T = sc.tIn; target = sc.keyT[0]; } };

  function renderSceneList() {
    if (!editorOpen) return;
    const box = $('sceneList'), cur = S[sceneAt(T)]?.d;
    box.innerHTML = '';
    doc.escenas.forEach((s, i) => {
      const it = document.createElement('div'), pend = (s.correcciones || []).filter((c) => !c.hecho).length;
      it.className = 'sitem' + (s === cur ? ' cur' : '') + (s.activa === false ? ' off' : '');
      it.innerHTML = `<input type="checkbox" ${s.activa !== false ? 'checked' : ''} title="Incluir">
        <div><b>${i + 1}. ${esc(plain(s.kicker || s.titulo || s.texto || ''))}</b><small>${esc(TIPOS[s.tipo]?.nombre || s.tipo)}${pend ? ` · <span style="color:#e5484d">${pend} ${pend > 1 ? 'correcciones' : 'corrección'}</span>` : ''}</small></div>
        <div class="acts"><button data-a="up" title="Subir">↑</button><button data-a="down" title="Bajar">↓</button><button data-a="dup" title="Duplicar">⧉</button><button data-a="del" title="Borrar">✕</button></div>`;
      it.querySelector('input').onclick = (e) => { e.stopPropagation(); s.activa = e.target.checked; save(); rebuild(); };
      it.querySelectorAll('[data-a]').forEach((b) => b.onclick = (e) => {
        e.stopPropagation();
        const a = b.dataset.a;
        if (a === 'up' && i > 0) [doc.escenas[i - 1], doc.escenas[i]] = [doc.escenas[i], doc.escenas[i - 1]];
        if (a === 'down' && i < doc.escenas.length - 1) [doc.escenas[i + 1], doc.escenas[i]] = [doc.escenas[i], doc.escenas[i + 1]];
        if (a === 'dup') doc.escenas.splice(i + 1, 0, U.clone(s));
        if (a === 'del') { if (!confirm('¿Borrar esta escena?')) return; doc.escenas.splice(i, 1); }
        save(); rebuild();
      });
      it.onclick = () => {
        if (s.activa === false) return U.toast('Esta escena está desactivada');
        goScene(active().indexOf(s));
        openTab('editar');
      };
      box.appendChild(it);
    });
  }

  const sel = $('newType');
  Object.keys(TIPOS).forEach((k) => sel.add(new Option(TIPOS[k].nombre || k, k)));
  $('addScene').onclick = () => {
    const s = { tipo: sel.value, activa: true, mantener: 8, notas: '', ...U.clone(TIPOS[sel.value].ejemplo || { kicker: 'Nueva escena', titulo: 'Título de la *escena*' }) };
    doc.escenas.splice(doc.escenas.indexOf(S[sceneAt(T)]?.d) + 1, 0, s);
    save(); build(); goScene(active().indexOf(s));
    openTab('editar');
  };

  const EXTRA = [
    ['logo', 'logo', 'Logo de esta escena'],
    ['pasos', 'select', 'Puntos clave', { '': 'Según el tipo de escena', uno: 'Uno por punto (cada avance suma uno)', todo: 'Todo junto' }],
    ['coreografia', 'select', 'Coreografía (cómo se mueve cada rol)', () => ({ '': 'Automática (la del estilo; varía si se repite el tipo)', ...Object.fromEntries(Object.values(COREO).map((c) => [c.id, c.nombre + (c.usar ? ' — ' + c.usar : '')])) })],
    ['transicion', 'select', 'Cómo llega esta escena', { '': 'La del estilo', franjas: 'Franjas que barren + cámara', camara: 'La cámara viaja', morph: 'Solo se transforma lo compartido', fundido: 'Fundido', corte: 'Corte seco' }],
    ['entrada', 'select', 'Hacia dónde viaja la cámara', { '': 'Automático', derecha: 'Desde la derecha', izquierda: 'Desde la izquierda', abajo: 'Desde abajo', arriba: 'Desde arriba', zoom: 'Zoom hacia adentro' }],
    ['mantener', 'number', 'Pausa en automático y en el video (segundos)'],
    ['notas', 'area', 'Notas del presentador'],
  ];
  const logoOptions = () => [...Object.entries(logoNombres()), ...MANIFIESTO.logos.map((p) => ['archivo:' + p, 'Archivo: ' + p.split('/').pop()]),
    ...userAssets.filter((a) => a.tipo === 'image').map((a) => ['archivo:' + a.url, 'Importado: ' + a.nombre])];
  const camposDe = (d) => TIPOS[d.tipo]?.camposDe?.(d) || TIPOS[d.tipo]?.campos || [];
  const campoDe = (d, f) => [...camposDe(d), ...EXTRA].find(([k]) => k === f) || [f, 'area', f];

  // Un campo ligado a s[key]: al cambiar, guarda y reconstruye manteniendo el punto clave
  let formTimer;
  function makeField(s, [key, type, label, opt], extraLabel = '') {
    const f = document.createElement('label');
    f.className = 'field';
    f.innerHTML = `<span>${esc(label)}${extraLabel}</span>`;
    let input;
    const val = Array.isArray(s[key]) ? s[key].join('\n') : s[key] && typeof s[key] === 'object' ? s[key].tipo ?? '' : (s[key] ?? '');
    const select = (opts) => { input = document.createElement('select'); opts.forEach(([v, n]) => input.add(new Option(n, v))); input.value = val; };
    if (type === 'image' || type === 'video') {
      const opts = type === 'image' ? [...MANIFIESTO.imagenes] : [...MANIFIESTO.videos];
      const own = userAssets.filter((a) => a.tipo === type).map((a) => a.url);
      if (val && !opts.includes(val) && !own.includes(val)) opts.unshift(val);
      select([['', '— ninguna —'], ...opts.map((o) => [o, o.split('/').pop()]), ...own.map((o) => [o, 'Archivo importado'])]);
    } else if (type === 'logo') select([['', 'Igual que la presentación'], ...logoOptions()]);
    else if (type === 'select') select(Object.entries(typeof opt === 'function' ? opt() : opt));
    else if (type === 'area' || type === 'lines' || type === 'pairs') {
      input = document.createElement('textarea');
      input.value = val;
      if (type !== 'area') input.rows = Math.max(4, String(val).split('\n').length + 1);
    } else {
      input = document.createElement('input');
      input.type = type === 'number' ? 'number' : 'text';
      input.value = val;
    }
    input.addEventListener('input', () => {
      s[key] = type === 'number' ? parseFloat(input.value) || 0 : input.value;
      if ((type === 'logo' || ['pasos', 'entrada', 'coreografia', 'transicion'].includes(key)) && !input.value) delete s[key];
      save();
      if (key === 'notas') { notesFor = ''; return; }
      if (key === 'mantener') return;
      clearTimeout(formTimer);
      formTimer = setTimeout(() => { rebuild(); if (key === 'kicker' || key === 'titulo') renderSceneList(); }, 160);
    });
    f.appendChild(input);
    return f;
  }

  function renderSceneForm() {
    if (!editorOpen) return;
    const box = $('sceneForm'), sc = S[sceneAt(T)], s = sc?.d;
    if (!s) { box.innerHTML = '<p class="hint">No hay escenas activas.</p>'; return; }
    box.innerHTML = `<h4>${esc(TIPOS[s.tipo]?.nombre || s.tipo)} · escena ${sc.i + 1}</h4><p class="hint">También podés hacer clic directo sobre un elemento del escenario para editar solo ese.</p>`;
    const extra = EXTRA.filter(([k]) => (k !== 'pasos' || TIPOS[s.tipo]?.pasos) && (k !== 'logo' || TIPOS[s.tipo]?.conLogo));
    [...camposDe(s), ...extra].forEach((c) => box.appendChild(makeField(s, c,
      c[0] === 'pasos' ? ` (por defecto: ${TIPOS[s.tipo].pasos === 'uno' ? 'uno por punto' : 'todo junto'})` : '')));
    // Elementos ocultos: se vuelven a mostrar desde acá
    if (s.ocultar?.length) {
      box.insertAdjacentHTML('beforeend', '<h4>Elementos ocultos</h4>');
      const row = document.createElement('div'); row.className = 'row-btns';
      s.ocultar.forEach((f) => {
        const b = document.createElement('button'); b.className = 'cbtn sm'; b.textContent = 'Mostrar: ' + campoDe(s, f)[2];
        b.onclick = () => { s.ocultar = s.ocultar.filter((x) => x !== f); save(); rebuild(); renderSceneForm(); };
        row.appendChild(b);
      });
      box.appendChild(row);
    }
    const tools = document.createElement('div');
    tools.className = 'row-btns';
    tools.innerHTML = '<button class="cbtn" data-a="in">↺ Ver la llegada</button><button class="cbtn" data-a="all">Ver completa</button>';
    tools.querySelector('[data-a=in]').onclick = () => goScene(sc.i);
    tools.querySelector('[data-a=all]').onclick = () => { T = target = sc.keyT[sc.steps - 1]; };
    box.appendChild(tools);
  }

  // ---------- Elemento: con el editor abierto, un clic en el escenario lo elige ----------
  let selF = null; // { d: escena, f: campo, i: cuál de los elementos con ese campo }
  function selectAt(e) {
    const sc = S[sceneAt(T)], el = e.target.closest?.('[data-f]');
    if (!el || !sc?.el.contains(el)) { selF = null; markSel(); renderInspector(); return; }
    selF = { d: sc.d, f: el.dataset.f, i: [...sc.el.querySelectorAll(`[data-f="${el.dataset.f}"]`)].indexOf(el) };
    markSel(); openTab('elemento');
  }
  function markSel() {
    stage.querySelectorAll('.f-sel').forEach((x) => x.classList.remove('f-sel'));
    const sc = selF && S.find((x) => x.d === selF.d);
    if (!sc) return;
    const all = sc.el.querySelectorAll(`[data-f="${selF.f}"]`);
    (all[selF.i] || all[0])?.classList.add('f-sel');
  }
  function logoGrid(cur, onPick, inherit = false) {
    const g = document.createElement('div'), bg = getComputedStyle(stage).getPropertyValue('--bg');
    g.className = 'thumbs';
    [...(inherit ? [['', 'Igual que la presentación']] : []), ...logoOptions()].forEach(([v, n]) => {
      const b = document.createElement('button');
      b.className = 'thumb' + (v === cur ? ' on' : '');
      b.innerHTML = `<div class="lg" style="background:${bg}">${v ? logoHTML('', v) : logoHTML('', doc.estilo.logo)}</div><span class="n">${esc(n)}</span>`;
      b.onclick = () => onPick(v);
      g.appendChild(b);
    });
    return g;
  }
  function imageGrid(cur, onPick) {
    const g = document.createElement('div');
    g.className = 'thumbs';
    [...MANIFIESTO.imagenes.map((u) => [u, u.split('/').pop()]), ...userAssets.filter((a) => a.tipo === 'image').map((a) => [a.url, a.nombre])].forEach(([u, n]) => {
      const b = document.createElement('button');
      b.className = 'thumb' + (u === cur ? ' on' : '');
      b.innerHTML = `<img src="${esc(u)}" alt="" loading="lazy"><span class="n">${esc(n)}</span>`;
      b.onclick = () => onPick(u);
      g.appendChild(b);
    });
    return g;
  }
  function renderInspector() {
    if (!editorOpen) return;
    const box = $('inspector');
    if (!selF || !active().includes(selF.d)) {
      box.innerHTML = '<p class="hint">Hacé clic sobre cualquier elemento de la escena (el logo, el título, una imagen, un punto, una tarjeta, un bloque) y se edita acá. Con el editor abierto, los elementos editables se marcan con un borde punteado al pasar el mouse.</p>';
      return;
    }
    const d = selF.d, f = selF.f, campo = campoDe(d, f), type = campo[1];
    box.innerHTML = `<h4>${esc(campo[2])} · escena ${active().indexOf(d) + 1} · ${esc(TIPOS[d.tipo]?.nombre || d.tipo)}</h4>`;
    const redo = () => { save(); rebuild(); renderInspector(); };
    if (type === 'logo') {
      box.insertAdjacentHTML('beforeend', '<p class="hint">Variante del logo para esta escena. "Igual que la presentación" sigue al logo general (pestañas Assets o Movimiento).</p>');
      box.appendChild(logoGrid(d.logo || '', (v) => { if (v) d.logo = v; else delete d.logo; redo(); }, true));
    } else if (type === 'image') {
      box.appendChild(imageGrid(d[f], (u) => { d[f] = u; redo(); }));
    } else {
      const fld = makeField(d, campo);
      box.appendChild(fld);
      // En una lista, el elemento elegido es una línea del texto: se deja seleccionada
      const ta = fld.querySelector('textarea');
      if (ta && (type === 'lines' || type === 'pairs') && selF.i >= 0) {
        const ls = ta.value.split('\n'), start = ls.slice(0, selF.i).reduce((a, l) => a + l.length + 1, 0);
        fld.querySelector('span').textContent += ` · línea ${selF.i + 1}`;
        setTimeout(() => { ta.focus(); ta.setSelectionRange(start, start + (ls[selF.i] || '').length); }, 30);
      }
    }
    const tools = document.createElement('div');
    tools.className = 'row-btns';
    tools.innerHTML = '<button class="cbtn" data-a="hide">Ocultar este elemento</button><button class="cbtn" data-a="mark">Anotar una corrección</button>';
    tools.querySelector('[data-a=hide]').onclick = () => {
      d.ocultar = [...new Set([...(d.ocultar || []), f])]; selF = null;
      save(); rebuild(); renderInspector(); U.toast('Oculto. Se vuelve a mostrar desde la pestaña Escena.');
    };
    tools.querySelector('[data-a=mark]').onclick = () => toggleMarking(true);
    box.appendChild(tools);
    box.appendChild(movPanel(d, f));
  }

  // Movimiento del elemento elegido: se guarda en escena.mov[campo] (o campo.n, solo ese)
  function movPanel(d, f) {
    const wrap = document.createElement('div'), sc = S.find((x) => x.d === d);
    const els = sc ? [...sc.el.querySelectorAll(`[data-f="${f}"]`)] : [], el = els[selF.i] || els[0];
    const varios = els.length > 1, soloKey = `${f}.${Math.max(0, selF.i)}`;
    let key = d.mov?.[soloKey] ? soloKey : f;
    const fases = (ph) => Object.values(MOV).filter((m) => ph.includes(m.fase)).map((m) => [m.id, m.nombre + (m.usar ? ' — ' + m.usar : '')]);
    const ahora = el?.dataset.m ? `${MOV[el.dataset.m]?.nombre || el.dataset.m}` : 'sin movimiento';
    wrap.innerHTML = `<h4>Movimiento</h4><p class="hint">Ahora entra con: <b>${esc(ahora)}</b>${el?.dataset.e ? ` · acento: <b>${esc(MOV[el.dataset.e]?.nombre || el.dataset.e)}</b>` : ''}. Elegí el que cuente mejor lo que dice este elemento; al cambiarlo se reproduce.</p>${el && sc?.sharedIn.has(el) ? '<p class="hint">Este elemento <b>viaja desde la escena anterior</b> (se transforma en lugar de entrar): su entrada solo se ve si la anterior no lo tiene o si esta escena llega con un corte.</p>' : ''}`;
    const o = () => { const v = d.mov?.[key]; return typeof v === 'string' ? { m: v } : { ...(v || {}) }; };
    const pasoOpts = { '': 'El de siempre', ...Object.fromEntries(Array.from({ length: (sc?.steps || 1) + 1 }, (_, k) => [k, k ? `Punto clave ${k + 1} (en el avance ${k})` : 'Al llegar a la escena'])) };
    const campos = [
      ['m', 'Entrada', [['', 'La de la escena'], ...fases(['entrada'])]],
      ['s', 'Cuándo entra', Object.entries(pasoOpts)],
      ['at', 'Retardo (s)', 'num'], ['dur', 'Duración (s)', 'num'],
      ['orden', 'Orden de las partes o del grupo', [['', 'El del movimiento'], ['normal', 'En orden'], ['inverso', 'Al revés'], ['centro', 'Desde el centro'], ['bordes', 'Desde los bordes'], ['azar', 'Al azar']]],
      ['e', 'Acento (cuando ya se ve)', [['', 'Ninguno'], ...fases(['acento', 'bucle'])]],
      ['es', 'Cuándo el acento', Object.entries(pasoOpts)],
      ['x', 'Salida', [['', 'Automática (hacia donde va la cámara)'], ...fases(['entrada'])]],
    ];
    const guardar = (k, v) => {
      const cur = o();
      if (v === '' || v === undefined) delete cur[k]; else cur[k] = k === 'at' || k === 'dur' || k === 's' || k === 'es' ? +v : v;
      d.mov = { ...(d.mov || {}) };
      if (Object.keys(cur).length) d.mov[key] = cur; else delete d.mov[key];
      if (!Object.keys(d.mov).length) delete d.mov;
      save(); rebuild(); renderInspector();
      const nsc = S.find((x) => x.d === d);
      if (nsc) { const st = cl(+(cur.s ?? 0), 0, nsc.steps - 1); T = st ? nsc.stepStart[st] : nsc.tIn; target = nsc.keyT[Math.max(st, cur.es !== undefined ? cl(cur.es, 0, nsc.steps - 1) : st)]; }
    };
    if (varios) {
      const l = document.createElement('label'); l.className = 'field check';
      l.innerHTML = `<input type="checkbox" ${key === soloKey ? 'checked' : ''}><span>Solo este (si no, todos los «${esc(campoDe(d, f)[2])}»)</span>`;
      l.querySelector('input').onchange = (e) => {
        const v = d.mov?.[key]; d.mov = { ...(d.mov || {}) };
        const nk = e.target.checked ? soloKey : f;
        if (v !== undefined) { delete d.mov[key]; d.mov[nk] = v; }
        key = nk; save(); rebuild(); renderInspector();
      };
      wrap.appendChild(l);
    }
    campos.forEach(([k, label, opts]) => {
      const l = document.createElement('label'); l.className = 'field';
      l.innerHTML = `<span>${esc(label)}</span>`;
      let input;
      if (opts === 'num') { input = document.createElement('input'); input.type = 'number'; input.step = '0.05'; input.min = '0'; input.value = o()[k] ?? ''; input.placeholder = 'el de siempre'; }
      else { input = document.createElement('select'); opts.forEach(([v, n]) => input.add(new Option(n, v))); input.value = o()[k] ?? ''; }
      input.addEventListener('change', () => guardar(k, input.value));
      l.appendChild(input); wrap.appendChild(l);
    });
    const row = document.createElement('div'); row.className = 'row-btns';
    row.innerHTML = '<button class="cbtn" data-a="ver">↺ Ver cómo entra</button><button class="cbtn" data-a="quitar">Volver al de la escena</button>';
    row.querySelector('[data-a=ver]').onclick = () => { const st = +(el?.dataset.s || 0); T = st ? sc.stepStart[st] : sc.tIn; target = sc.keyT[Math.min(sc.steps - 1, Math.max(st, +(el?.dataset.es ?? st)))]; };
    row.querySelector('[data-a=quitar]').onclick = () => { if (d.mov) { delete d.mov[key]; if (!Object.keys(d.mov).length) delete d.mov; } save(); rebuild(); renderInspector(); };
    wrap.appendChild(row);
    return wrap;
  }

  // ---------- Assets ----------
  const userAssets = []; // archivos importados: solo viven en esta sesión
  function renderAssets() {
    if (!editorOpen) return;
    const d = S[sceneAt(T)]?.d;
    // Destino de las imágenes: el elemento elegido, o la imagen de la escena actual
    const imgKey = (s) => (TIPOS[s.tipo]?.campos || []).find(([, t]) => t === 'image')?.[0];
    const dest = selF && campoDe(selF.d, selF.f)[1] === 'image' ? [selF.d, selF.f] : d && imgKey(d) ? [d, imgKey(d)] : null;
    const ti = $('thumbsImg'); ti.innerHTML = '';
    ti.appendChild(imageGrid(dest ? dest[0][dest[1]] : '', (u) => {
      if (!dest) return U.toast('Esta escena no tiene imagen');
      dest[0][dest[1]] = u; save(); rebuild(); renderAssets(); U.toast('Imagen aplicada a la escena');
    }));
    const tl = $('thumbsLogo'); tl.innerHTML = '';
    tl.appendChild(logoGrid(doc.estilo.logo, (v) => { doc.estilo.logo = v; doc.estilo.logoElegido = true; save(); applyStyle(); renderAssets(); renderStyleForm(); U.toast('Logo de la presentación cambiado'); }));
    const tu = $('thumbsUser');
    tu.innerHTML = userAssets.length ? '<p class="hint" style="grid-column:1/-1">Las imágenes importadas aparecen arriba, entre las imágenes y los logos.</p>' : '<p class="hint">Todavía no importaste nada.</p>';
    userAssets.filter((a) => a.tipo === 'video').forEach((a) => {
      const b = document.createElement('button');
      b.className = 'thumb'; b.innerHTML = `<span class="n" style="padding:20px 6px">🎞 ${esc(a.nombre)}</span>`;
      b.onclick = () => { if (d?.tipo !== 'video') return U.toast('Andá a una escena de video'); d.video = a.url; save(); rebuild(); };
      tu.appendChild(b);
    });
  }
  $('uploadAsset').onclick = () => $('assetFile').click();
  $('assetFile').onchange = async (e) => {
    const file = e.target.files[0]; if (!file) return;
    e.target.value = '';
    const tipo = file.type.startsWith('video') ? 'video' : 'image';
    // Con el servidor de `tramoya abrir`, el archivo queda en proyecto/assets/ y en el manifiesto
    if (await U.servidor) {
      try { await U.subirArchivo(file, tipo === 'video' ? 'video' : 'img'); alSubir(window.MANIFIESTO); renderAssets(); renderInspector(); return U.toast('Guardado en proyecto/assets/'); }
      catch (err) { U.toast(err.message); }
    }
    // Sin servidor: URL de sesión (no se guarda); para dejarlo fijo, copialo a proyecto/assets/ y corré `tramoya manifiesto`
    userAssets.push({ tipo, nombre: file.name, url: URL.createObjectURL(file) });
    renderAssets(); renderInspector(); U.toast('Importado solo por esta sesión. Abrí con `tramoya abrir` para que quede en el proyecto.');
  };

  // ---------- Correcciones: una marca sobre un punto de la escena ----------
  let marking = false, showPins = true, pinsKey = '', corrCur = null;
  const corrections = () => {
    const out = [];
    active().forEach((d, si) => (d.correcciones || []).forEach((c) => out.push({ c, d, si, n: out.length + 1 })));
    return out;
  };
  function toggleMarking(v = !marking) {
    marking = v;
    stage.classList.toggle('marking', v);
    $('btnMark').classList.toggle('on', v);
    if (v) { target = T; showControls(); }
  }
  function addCorrection(e) {
    const sc = S[sceneAt(T)], r = stage.getBoundingClientRect(), k = r.width / W;
    const near = e.target.closest?.('[data-f]');
    const c = { x: Math.round((e.clientX - r.left) / k), y: Math.round((e.clientY - r.top) / k), paso: stepAt(sc, T) + 1, texto: '', hecho: false,
      elemento: near ? campoDe(sc.d, near.dataset.f)[2] : '', cita: near ? near.innerText.replace(/\s+/g, ' ').trim().slice(0, 90) : '',
      fecha: new Date().toLocaleString('es-AR') };
    (sc.d.correcciones ||= []).push(c);
    save(); toggleMarking(false);
    corrCur = c; pinsKey = '';
    if (!editorOpen) toggleEditor(true);
    openTab('correcciones'); renderSceneList();
    setTimeout(() => $('corrList').querySelector('.corr.cur textarea')?.focus(), 60);
  }
  function goCorr(c, d) {
    const sc = S.find((x) => x.d === d);
    corrCur = c; pinsKey = '';
    if (sc) T = target = sc.keyT[Math.min(c.paso, sc.steps) - 1];
    $('corrList').querySelectorAll('.corr').forEach((el) => el.classList.toggle('cur', el._c === c));
  }
  // Marcas de la escena actual, solo con la imagen quieta (las coordenadas son de ese cuadro)
  function renderPins() {
    if (!S.length) return;
    const ci = sceneAt(T), sc = S[ci], st = stepAt(sc, T), show = showPins && !vel && trAt(T) < 0;
    const key = `${ci}.${st}.${show}`;
    if (key === pinsKey) return;
    pinsKey = key;
    $('pins').innerHTML = !show ? '' : corrections().filter((o) => o.d === sc.d).map((o) =>
      `<button class="pin${o.c.hecho ? ' done' : ''}${o.c.paso - 1 !== st ? ' other' : ''}${o.c === corrCur ? ' cur' : ''}" data-n="${o.n}" style="left:${o.c.x}px; top:${o.c.y}px" title="${esc(o.c.texto || 'Sin texto todavía')}">${o.n}</button>`).join('');
  }
  $('pins').addEventListener('click', (e) => {
    const b = e.target.closest('.pin'); if (!b) return;
    e.stopPropagation();
    corrCur = corrections()[b.dataset.n - 1]?.c; pinsKey = '';
    if (!editorOpen) toggleEditor(true);
    openTab('correcciones');
  });
  function renderCorrections() {
    if (!editorOpen) return;
    const box = $('corrList'), all = corrections();
    box.innerHTML = all.length ? '' : '<p class="hint">Todavía no hay correcciones.</p>';
    all.forEach(({ c, d, si, n }) => {
      const it = document.createElement('div');
      it._c = c;
      it.className = 'corr' + (c === corrCur ? ' cur' : '') + (c.hecho ? ' done' : '');
      it.innerHTML = `<header><b>${n}</b><span>Escena ${si + 1} · ${esc(plain(d.kicker || TIPOS[d.tipo]?.nombre || ''))} · paso ${c.paso}${c.elemento ? ' · ' + esc(c.elemento) : ''}</span></header>
        ${c.cita ? `<div class="cita">«${esc(c.cita)}»</div>` : ''}
        <textarea placeholder="¿Qué hay que cambiar?">${esc(c.texto)}</textarea>
        <div class="row-btns"><button class="cbtn sm" data-a="go">Ir al punto</button><button class="cbtn sm" data-a="ok">${c.hecho ? 'Reabrir' : '✓ Hecha'}</button><button class="cbtn sm" data-a="del">Borrar</button></div>`;
      const ta = it.querySelector('textarea');
      ta.oninput = () => { c.texto = ta.value; save(); pinsKey = ''; };
      ta.onfocus = () => { if (corrCur !== c) goCorr(c, d); };
      it.querySelector('[data-a=go]').onclick = () => goCorr(c, d);
      it.querySelector('[data-a=ok]').onclick = () => { c.hecho = !c.hecho; save(); pinsKey = ''; renderCorrections(); renderSceneList(); };
      it.querySelector('[data-a=del]').onclick = () => {
        if (!confirm('¿Borrar esta corrección?')) return;
        d.correcciones.splice(d.correcciones.indexOf(c), 1); save(); pinsKey = ''; renderCorrections(); renderSceneList();
      };
      box.appendChild(it);
    });
  }
  // Texto para pegar en el chat (o .md): solo las pendientes, con escena, paso y punto (x, y)
  function corrText(asMd = false) {
    const all = corrections().filter((o) => !o.c.hecho), head = `Correcciones · ${plain(P.nombre)}, presentación motion · ${new Date().toLocaleDateString('es-AR')}`;
    return [asMd ? '# ' + head : head, '', ...all.map(({ c, d, si, n }) =>
      `${asMd ? '- ' : ''}#${n} · Escena ${si + 1} «${plain(d.kicker || TIPOS[d.tipo]?.nombre || '')}» · paso ${c.paso}${c.elemento ? ' · ' + c.elemento : ''}${c.cita ? ` («${c.cita}»)` : ''} · punto ${c.x}, ${c.y}\n  ${c.texto || '(sin texto)'}`)].join('\n');
  }
  $('corrMark').onclick = () => toggleMarking(true);
  $('corrCopy').onclick = () => {
    if (!corrections().some((o) => !o.c.hecho)) return U.toast('No hay correcciones pendientes');
    U.copiar(corrText(), 'Copiadas: pegalas en el chat');
  };
  $('corrMd').onclick = () => U.descargar(`${P.id}-correcciones.md`, corrText(true), 'text/markdown');
  $('corrClean').onclick = () => {
    if (!confirm('¿Borrar las correcciones marcadas como hechas?')) return;
    doc.escenas.forEach((d) => { if (d.correcciones) d.correcciones = d.correcciones.filter((c) => !c.hecho); });
    save(); pinsKey = ''; renderCorrections(); renderSceneList();
  };
  $('corrShow').onchange = (e) => { showPins = e.target.checked; pinsKey = ''; };

  function renderStyleForm() {
    const box = $('styleForm'), e = doc.estilo;
    const logoOpts = { ...logoNombres() };
    MANIFIESTO.logos.forEach((p) => { logoOpts['archivo:' + p] = 'Archivo: ' + p.split('/').pop(); });
    const fields = [
      ['tema', 'select', 'Tema', Object.fromEntries(Object.entries(P.temas).map(([k, t]) => [k, t.nombre || k]))],
      ['logo', 'select', 'Logo', logoOpts],
      ['transicion', 'select', 'Entre escenas (cada escena puede pedir otra)', { franjas: 'Franjas que barren + cámara', camara: 'Solo cámara', morph: 'Solo transformación (sin cámara)', fundido: 'Fundido', corte: 'Corte seco' }],
      ['coreografia', 'select', 'Coreografía base (cada escena puede pedir otra)', Object.fromEntries(Object.values(COREO).map((c) => [c.id, c.nombre]))],
      ['variar', 'check', 'Variar la coreografía cuando se repite el tipo de escena'],
      ['velocidad', 'range', 'Velocidad de reproducción', [0.5, 2, 0.05]],
      ['desenfoque', 'check', 'Desenfoque de movimiento'],
      ['pie', 'text', 'Texto del pie'],
      ['grano', 'check', 'Textura de grano'],
      ['cromo', 'check', 'Encabezado, contador y pie'],
      ['entrada', 'select', 'Curva de las entradas', { expo: 'Exponencial (frena al llegar)', suave: 'Suave', resorte: 'Resorte (se pasa y vuelve)', lineal: 'Lineal', escalon: 'A saltos' }],
      ['ritmo', 'range', 'Ritmo de las entradas (más = más lento)', [0.5, 2, 0.05]],
      ['duracion', 'range', 'Duración de cada transición (s)', [0.5, 3, 0.05]],
      ['recorrido', 'range', 'Recorrido de la cámara', [0, 2, 0.05]],
    ];
    box.innerHTML = `<h4>Movimiento y estilo</h4><p class="hint">Estilo: <b>${esc(P.estiloNombre || 'sin estilo')}</b>. Lo que cambies acá se guarda en esta presentación; si después se elige otro estilo, el tema y el movimiento vuelven a los del estilo nuevo.</p>`;
    fields.forEach(([key, type, label, opt]) => {
      const f = document.createElement('label');
      f.className = 'field' + (type === 'check' ? ' check' : '');
      let input;
      if (type === 'select') { input = document.createElement('select'); Object.entries(opt).forEach(([v, n]) => input.add(new Option(n, v))); input.value = e[key]; }
      else if (type === 'range') { input = document.createElement('input'); input.type = 'range'; [input.min, input.max, input.step] = opt; input.value = e[key]; }
      else if (type === 'check') { input = document.createElement('input'); input.type = 'checkbox'; input.checked = !!e[key]; }
      else { input = document.createElement('input'); input.type = 'text'; input.value = e[key]; }
      const span = document.createElement('span'); span.textContent = label + (type === 'range' ? ` · ${e[key]}×` : '');
      if (type === 'check') f.append(input, span); else f.append(span, input);
      input.addEventListener('input', () => {
        e[key] = type === 'check' ? input.checked : type === 'range' ? parseFloat(input.value) : input.value;
        if (key === 'logo') e.logoElegido = true;
        if (type === 'range') span.textContent = `${label} · ${e[key]}×`;
        save();
        if (key === 'velocidad') buildPlan();
        else if (key !== 'desenfoque') applyStyle();
      });
      box.appendChild(f);
    });
    box.insertAdjacentHTML('beforeend', `<p class="hint">Cada escena viaja a la siguiente: el antetítulo, el título, los puntos (que salen de su barra y se vuelven tarjetas, bloques o filas) y la imagen o panel principal se transforman en lugar de cortarse. En cada escena, "Cómo llega la cámara" cambia la dirección.</p>`);
  }

  // ---------- Exportar / importar ----------
  const replaceDoc = (data, msg) => { doc = { escenas: data.escenas, estilo: conEstilo(data.estilo) }; save(); stage.dataset.theme = doc.estilo.tema; build(); T = 0; target = KEYS[0]?.t || 0; renderSceneList(); renderStyleForm(); U.toast(msg); };
  // Deshacer / rehacer (Ctrl+Z): se rearma con lo restaurado y se queda en el mismo punto clave
  U.alRestaurar('motion', (v) => {
    doc = v && Array.isArray(v.escenas) ? { escenas: v.escenas, estilo: conEstilo(v.estilo) } : fresh();
    stage.dataset.theme = doc.estilo.tema; grano();
    if (selF && !doc.escenas.includes(selF.d)) selF = null;
    rebuild(); renderSceneList(); renderSceneForm(); renderStyleForm(); renderInspector(); renderCorrections();
  });
  $('exportJson').onclick = () => U.descargar(`${P.id}-motion.json`, JSON.stringify(doc, null, 2), 'application/json');
  $('importJson').onclick = () => $('importFile').click();
  $('importFile').onchange = async (e) => {
    const file = e.target.files[0]; if (!file) return;
    try {
      const data = JSON.parse(await file.text());
      if (!Array.isArray(data.escenas)) throw new Error();
      replaceDoc(data, 'Presentación importada');
    } catch (err) { U.toast('El archivo no es una presentación válida'); }
    e.target.value = '';
  };
  $('copyJson').onclick = () => U.copiar(JSON.stringify(doc, null, 2), 'JSON copiado');
  // Las escenas como código, listas para pegar en proyecto/escenas.js
  $('copyCode').onclick = () => U.copiar('window.ESCENAS = ' + JSON.stringify(doc.escenas.map(({ activa, correcciones, ...s }) => (activa === false ? { ...s, activa } : s)), null, 2) + ';\n', 'Copiado: reemplazá con esto el contenido de proyecto/escenas.js');
  $('resetAll').onclick = () => { if (confirm('¿Volver a la presentación original? Se pierden los cambios.')) replaceDoc(fresh(), 'Restaurada'); };

  // ---------- Arranque ----------
  // ?escena=4&paso=2 (desde 1) abre ese punto clave · ?t=12.5 congela ese instante · &tema= · &ui=0
  // ?render: sin interfaz y sin reproducción; render/video.mjs maneja el tiempo con window.seek(v)
  if (q.get('tema') && P.temas[q.get('tema')]) doc.estilo.tema = q.get('tema');
  if (q.get('ui') === '0') $('controls').style.display = 'none';
  stage.dataset.theme = doc.estilo.tema;
  grano();
  fit();
  window.ready = U.fuentesListas().then(() => {
    build();
    if (RENDER) {
      const fin = PLAN.length ? PLAN[PLAN.length - 1].v1 : 0;
      window.DURACION = fin;
      // Un cuadro por punto clave, justo cuando llega (para revisar sin mirar todo el video)
      window.CLAVES = PLAN.filter((s) => s.k).map((s) => ({ v: +(s.v0 + 0.05).toFixed(3), escena: s.k.i + 1, paso: s.k.s + 1 }));
      window.seek = seekVideo;
      seekVideo(0);
      return true;
    }
    if (q.has('t')) { T = target = cl(parseFloat(q.get('t')) || 0, 0, TOTAL); if (q.has('amb')) amb = parseFloat(q.get('amb')) || 0; }
    else if (q.has('escena')) {
      const sc = S[cl((parseInt(q.get('escena'), 10) || 1) - 1, 0, S.length - 1)];
      T = target = sc.keyT[cl((parseInt(q.get('paso'), 10) || sc.steps) - 1, 0, sc.steps - 1)];
    } else target = KEYS[0]?.t || 0;
    if (q.get('ui') !== '0') showControls();
    if (q.has('editor') && q.get('ui') !== '0') toggleEditor(true);
    requestAnimationFrame(loop);
    return true;
  });
})();
