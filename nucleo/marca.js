// Marca del proyecto: isotipo paramétrico + palabra, armados como SVG.
// Lo usan el editor (marca/index.html), la presentación motion, el póster, el reel y la landing.
//
// La palabra se dibuja en curvas si hay glifos generados (proyecto/glifos.js, con
// herramientas/generar_glifos.py); si no, como <text> con la fuente del proyecto. En
// pantalla da igual; un SVG exportado con <text> depende de que la fuente esté instalada.
(function () {
  const U = window.TRAMOYA;
  const P = window.PROYECTO || {};
  const r = (n) => +(+n).toFixed(2);

  const SCHEMA = [
    { group: 'Composición' },
    { key: 'palabra', label: 'Palabra (*parte* en acento)', type: 'text', def: 'Mar*ca*' },
    { key: 'layout', label: 'Versión', type: 'select', options: { horizontal: 'Horizontal', vertical: 'Vertical', isotipo: 'Solo isotipo', palabra: 'Solo palabra' }, def: 'horizontal' },
    { key: 'isoEscala', label: 'Tamaño del isotipo', type: 'range', min: 0.6, max: 2.4, step: 0.05, def: 1.25 },
    { key: 'separacion', label: 'Separación', type: 'range', min: 0.1, max: 1.2, step: 0.02, def: 0.4 },
    { key: 'margen', label: 'Margen', type: 'range', min: 0, max: 30, step: 1, def: 8, unit: '%' },
    { group: 'Colores' },
    { key: 'tinta', label: 'Tinta', type: 'color', def: '#f4f1eb' },
    { key: 'acento', label: 'Acento', type: 'color', def: '#d7a54a' },
    { key: 'colorPalabra', label: 'Palabra en', type: 'select', options: { tinta: 'Tinta (la parte marcada en acento)', acento: 'Acento (la parte marcada en tinta)' }, def: 'tinta' },
    { group: 'Isotipo' },
    { key: 'forma', label: 'Forma', type: 'select', options: { franjas: 'Franjas', anillo: 'Anillo con centro', monograma: 'Monograma', puntos: 'Grilla de puntos', onda: 'Ondas', ninguna: 'Sin isotipo' }, def: 'franjas' },
    { key: 'n', label: 'Cantidad (franjas, ondas)', type: 'range', min: 2, max: 7, step: 1, def: 4 },
    { key: 'grosor', label: 'Grosor', type: 'range', min: 2, max: 16, step: 0.5, def: 9 },
    { key: 'inclinacion', label: 'Perspectiva de las franjas', type: 'range', min: 0, max: 14, step: 0.5, def: 5 },
    { key: 'colorFranjas', label: 'Color de las franjas', type: 'select', options: { degradado: 'Degradado de tinta a acento', bandera: 'Acento afuera, tinta adentro', alternado: 'Alternado', tinta: 'Todo tinta', acento: 'Todo acento' }, def: 'bandera' },
    { key: 'radio', label: 'Redondeo', type: 'range', min: 0, max: 20, step: 0.5, def: 3 },
    { key: 'iniciales', label: 'Iniciales del monograma (vacío = de la palabra)', type: 'text', def: '' },
    { group: 'Fondo y lienzo' },
    { key: 'fondo', label: 'Color de fondo', type: 'color', def: '#0d0d0f' },
    { key: 'fondoExport', label: 'Fondo al exportar', type: 'select', options: { transparente: 'Sin fondo (transparente)', elegido: 'Con el color de fondo', blanco: 'Blanco', negro: 'Negro' }, def: 'transparente' },
    { key: 'lienzo', label: 'Lienzo', type: 'select', options: { ajustado: 'Ajustado al logo', cuadrado: 'Cuadrado (avatar, redes)', ancho: '16:9 (portada, slide)', posteo: '4:5 (posteo)' }, def: 'ajustado' },
    { key: 'radioFondo', label: 'Esquinas del fondo', type: 'range', min: 0, max: 50, step: 1, def: 0, unit: '%' },
    { group: 'Palabra' },
    { key: 'peso', label: 'Peso', type: 'range', min: 400, max: 900, step: 100, def: 800 },
    { key: 'tracking', label: 'Espaciado entre letras', type: 'range', min: -60, max: 80, step: 2, def: -20 },
  ];
  const FIELDS = SCHEMA.filter((f) => f.key);
  const DEFAULTS = { ...Object.fromEntries(FIELDS.map((f) => [f.key, f.def])), ...(P.marca?.base || {}) };
  FIELDS.forEach((f) => { f.def = DEFAULTS[f.key]; });

  // ---------- Variantes ----------
  // Una por tema (toma tinta, acento y fondo del tema) más las del proyecto
  function variantes() {
    const out = {};
    Object.entries(P.temas || {}).forEach(([id, t]) => {
      out['tema:' + id] = { nombre: 'Tema ' + (t.nombre || id), tinta: t.vars.strong, acento: t.vars.accent, fondo: t.vars.bg };
    });
    Object.entries(P.marca?.variantes || {}).forEach(([id, v]) => { out[id] = { nombre: id, ...v }; });
    return out;
  }
  const esClaro = (tema) => !!P.temas?.[tema]?.claro;
  // Configuración completa de una variante para un tema dado.
  //   ''|'tema' → la del tema · 'editor' → el último diseño del editor · id → variante del proyecto
  function cfgDe(v = '', tema = P.estilo?.tema) {
    const V = variantes();
    if (v === 'editor') { const e = U.leer('marca-editor'); if (e) return { ...DEFAULTS, ...e }; }
    if (!v || v === 'tema' || v === 'editor' || !V[v]) return { ...DEFAULTS, ...(V['tema:' + tema] || {}) };
    const base = { ...DEFAULTS, ...V[v] };
    // Una variante puede traer su versión para fondo claro
    return esClaro(tema) && V[v].claro ? { ...base, ...V[v].claro } : base;
  }
  const hayEditor = () => !!U.leer('marca-editor');

  // ---------- Isotipo (viewBox 0 0 80 80) ----------
  let uid = 0;
  const isoBox = (c) => (c.forma === 'ninguna' ? { x: 0, w: 0 } : { x: 0, w: 80 });
  const segmentos = (txt) => {
    const out = [];
    String(txt || '').split(/(\*[^*]+\*)/).forEach((s) => { if (!s) return; const acc = s.startsWith('*') && s.endsWith('*'); out.push({ t: acc ? s.slice(1, -1) : s, acc }); });
    return out;
  };
  const iniciales = (c) => (c.iniciales || segmentos(c.palabra).map((s) => s.t.trim()[0] || '').join('')).slice(0, 3);

  function isotipo(c) {
    const { tinta, acento } = c, n = Math.round(c.n), g = c.grosor;
    const colorDe = (i, k) => (c.colorFranjas === 'tinta' ? tinta : c.colorFranjas === 'acento' ? acento
      : c.colorFranjas === 'alternado' ? (i % 2 ? acento : tinta)
      : c.colorFranjas === 'bandera' ? (i === 0 || i === k - 1 ? acento : tinta) : U.mixHex(tinta, acento, k > 1 ? i / (k - 1) : 1));
    switch (c.forma) {
      case 'franjas': {
        // Franjas entre x 8 y 72: cada una se achica del lado izquierdo, como un fuelle visto en perspectiva
        const s = c.inclinacion, pitch = n > 1 ? (64 - g) / (n - 1) : 0;
        return Array.from({ length: n }, (_, i) => {
          const x = 8 + i * pitch;
          return `<path fill="${colorDe(i, n)}" d="M${r(x)} ${r(8 + s)} L${r(x + g)} 8 V72 L${r(x)} ${r(72 - s)}Z"/>`;
        }).join('');
      }
      case 'anillo':
        return `<circle cx="40" cy="40" r="${r(32 - g / 2)}" fill="none" stroke="${tinta}" stroke-width="${g}"/><circle cx="40" cy="40" r="${r(Math.max(4, 14 - g / 4))}" fill="${acento}"/>`;
      case 'monograma': {
        const id = 'mono' + (++uid), ini = U.esc(iniciales(c));
        return `<rect x="4" y="4" width="72" height="72" rx="${r(c.radio * 1.6)}" fill="${tinta}"/>`
          + `<text id="${id}" x="40" y="40" dy=".36em" text-anchor="middle" font-family="${fontFam()}" font-weight="${c.peso}" font-size="${ini.length > 2 ? 30 : ini.length > 1 ? 40 : 52}" fill="${acento}">${ini}</text>`;
      }
      case 'puntos': {
        const rr = Math.max(2, g / 1.6), pos = [16, 40, 64];
        return pos.flatMap((y, j) => pos.map((x, i) => `<rect x="${r(x - rr)}" y="${r(y - rr)}" width="${r(rr * 2)}" height="${r(rr * 2)}" rx="${r(Math.min(rr, c.radio))}" fill="${i === 2 && j === 0 ? acento : tinta}"/>`)).join('');
      }
      case 'onda': {
        const pitch = n > 1 ? 52 / (n - 1) : 0;
        return Array.from({ length: n }, (_, i) => {
          const y = 14 + i * pitch, a = 7;
          return `<path fill="none" stroke="${colorDe(i, n)}" stroke-width="${r(g / 2)}" stroke-linecap="round" d="M8 ${r(y)} C24 ${r(y - a)} 28 ${r(y - a)} 40 ${r(y)} S56 ${r(y + a)} 72 ${r(y)}"/>`;
        }).join('');
      }
      default: return '';
    }
  }

  // ---------- Palabra ----------
  const fontFam = () => (P.tipografia?.display || 'Georgia, serif').replace(/"/g, "'");
  const bboxCache = {};
  function medir(svgInner) {
    let m = document.getElementById('tr-medir');
    if (!m) {
      m = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      m.id = 'tr-medir'; m.setAttribute('aria-hidden', 'true');
      m.style.cssText = 'position:absolute;left:-9999px;top:0;width:10px;height:10px;overflow:hidden';
      document.body.appendChild(m);
    }
    m.innerHTML = `<g>${svgInner}</g>`;
    const b = m.firstChild.getBBox();
    return { x: b.x, y: b.y, w: b.width, h: b.height };
  }
  function palabra(c) {
    const segs = segmentos(c.palabra), col = (acc) => ((c.colorPalabra === 'acento') !== acc ? c.acento : c.tinta);
    const G = window.GLIFOS?.[c.peso];
    const todo = segs.map((s) => s.t).join('');
    let svg, cap;
    if (G && [...todo].every((ch) => G.letters[ch])) {
      // En curvas: no depende de la fuente
      let x = 0;
      svg = segs.map((s) => `<g fill="${col(s.acc)}">${[...s.t].map((ch) => {
        const gl = G.letters[ch], p = gl.d ? `<path transform="translate(${r(x)} 0)" d="${gl.d}"/>` : '';
        x += gl.adv + c.tracking; return p;
      }).join('')}</g>`).join('');
      cap = G.cap;
    } else {
      svg = `<text x="0" y="0" font-family="${fontFam()}" font-weight="${c.peso}" font-size="1000" letter-spacing="${c.tracking}" style="white-space:pre">${segs.map((s) => `<tspan fill="${col(s.acc)}">${U.esc(s.t)}</tspan>`).join('')}</text>`;
      const kc = 'cap|' + c.peso;
      cap = bboxCache[kc] ??= -medir(`<text font-family="${fontFam()}" font-weight="${c.peso}" font-size="1000">H</text>`).y;
    }
    const key = [c.palabra, c.peso, c.tracking, !!G].join('|');
    const box = bboxCache[key] ??= medir(svg);
    return { svg, box, cap };
  }

  // ---------- Composición ----------
  const exportBg = (c) => ({ transparente: null, elegido: c.fondo, blanco: '#ffffff', negro: '#000000' })[c.fondoExport] ?? null;
  const RATIOS = { cuadrado: 1, ancho: 16 / 9, posteo: 4 / 5 };

  function buildSVG(c, { background = exportBg(c) } = {}) {
    c = { ...DEFAULTS, ...c };
    if (c.forma === 'ninguna' && c.layout !== 'palabra') c = { ...c, layout: 'palabra' };
    const word = palabra(c), iso = isotipo(c), B = isoBox(c);
    const { cap } = word, b = word.box;
    let body, W, H, x0 = 0, y0 = 0;
    if (c.layout === 'isotipo') {
      body = iso; x0 = B.x; W = B.w; H = 80;
    } else if (c.layout === 'palabra') {
      body = word.svg; x0 = b.x; y0 = b.y; W = b.w; H = b.h;
    } else if (c.layout === 'horizontal') {
      // El isotipo se centra en la altura de las mayúsculas
      const s = (cap * c.isoEscala) / 80, iw = B.w * s, ih = 80 * s, gap = cap * c.separacion, iy = -cap / 2 - ih / 2;
      const top = Math.min(iy, b.y), bottom = Math.max(iy + ih, b.y + b.h);
      body = `<g transform="translate(${r(-B.x * s)} ${r(iy)}) scale(${s.toFixed(4)})">${iso}</g><g transform="translate(${r(iw + gap - b.x)} 0)">${word.svg}</g>`;
      y0 = top; W = iw + gap + b.w; H = bottom - top;
    } else {
      const ih = cap * c.isoEscala * 1.9, s = ih / 80, iw = B.w * s, gap = cap * c.separacion * 1.3, W0 = Math.max(iw, b.w);
      body = `<g transform="translate(${r((W0 - iw) / 2 - B.x * s)} 0) scale(${s.toFixed(4)})">${iso}</g><g transform="translate(${r((W0 - b.w) / 2 - b.x)} ${r(ih + gap - b.y)})">${word.svg}</g>`;
      W = W0; H = ih + gap + b.h;
    }
    const m = (Math.max(W, H) * c.margen) / 100;
    let vx = x0 - m, vy = y0 - m, vw = W + 2 * m, vh = H + 2 * m;
    // Lienzo con proporción fija: se agranda el lado corto y el logo queda centrado
    const ratio = RATIOS[c.lienzo];
    if (ratio) {
      if (vw / vh < ratio) { const nw = vh * ratio; vx -= (nw - vw) / 2; vw = nw; }
      else { const nh = vw / ratio; vy -= (nh - vh) / 2; vh = nh; }
    }
    const vb = [vx, vy, vw, vh].map(r), rad = r(((Math.min(vw, vh) / 2) * c.radioFondo) / 50);
    const bg = background ? `<rect x="${vb[0]}" y="${vb[1]}" width="${vb[2]}" height="${vb[3]}" rx="${rad}" fill="${background}"/>` : '';
    const nombre = U.esc(U.plain(c.palabra));
    return { svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${vb.join(' ')}" role="img" aria-label="${nombre}">\n<title>${nombre}</title>\n${bg}\n${body}\n</svg>\n`, ratio: vb[2] / vb[3] };
  }
  // Solo el isotipo, como <svg> listo para insertar en HTML
  const isoSVG = (c) => { c = { ...DEFAULTS, ...c }; const B = isoBox(c); return B.w ? `<svg viewBox="${B.x} 0 ${B.w} 80" aria-hidden="true">${isotipo(c)}</svg>` : ''; };

  // SVG → PNG del ancho pedido (para exportar)
  async function aPNG(svg, ancho = 2048) {
    const img = new Image(), url = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml' }));
    await new Promise((ok, mal) => { img.onload = ok; img.onerror = mal; img.src = url; });
    const vb = svg.match(/viewBox="([^"]+)"/)[1].split(' ').map(Number), alto = Math.round((ancho * vb[3]) / vb[2]);
    const cv = Object.assign(document.createElement('canvas'), { width: ancho, height: alto });
    cv.getContext('2d').drawImage(img, 0, 0, ancho, alto);
    URL.revokeObjectURL(url);
    return new Promise((ok) => cv.toBlob(ok, 'image/png'));
  }

  U.marca = { SCHEMA, FIELDS, DEFAULTS, variantes, cfgDe, hayEditor, esClaro, segmentos, iniciales, isotipo, isoBox, isoSVG, palabra, buildSVG, exportBg, aPNG };
})();
