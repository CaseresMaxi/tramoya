// Tipos de parte del reel. Un reel editable es una lista de partes; cada parte es de un
// tipo de acá (o de window.TIPOS_REEL, los del proyecto en proyecto/tipos.js).
//
//   nombre: 'Dato que cuenta',          lo que se ve en la línea de tiempo y en el menú
//   pulsos: 4,                          duración por defecto al agregarla
//   cola: 0.3,                          segundos que la salida sigue dibujándose dentro de la
//                                       parte siguiente (la salida empieza justo en el corte)
//   campos: [ … ],                      esquema de nucleo/panel.js. Extras:
//                                         color con def '' y tema: 'acento' → color del tema
//                                         imagen: true → el editor muestra las del manifiesto
//   resumen: (p) => 'texto corto',      opcional, para el bloque de la línea de tiempo
//   dibujar(tl, p, h, ctx) → SVG        tl: segundos desde que empieza la parte (puede pasar
//                                       de h.dur durante la cola) · p: los campos, con los
//                                       colores ya resueltos · h: ayudas de reel.js (kick,
//                                       blur, texto, medir, curvas, CX, CY, BEAT…) más dur,
//                                       pulsos, t0, col (bg, tinta, acento, muted, texto),
//                                       id('x') (ids únicos por parte, para clipPath) y
//                                       fuente('display'|'texto') · ctx: { i, partes, doc }
//
// Los tiempos de cada tipo están pensados en pulsos para lo que va con la música (cuándo
// entra cada cosa) y en segundos para los movimientos (cuánto tarda en llegar).
(function () {
  const U = window.TRAMOYA;
  const { cl, lerp, prog, exOut, exIn, spring, speed, r2, esc } = U;

  const color = (key, label, tema) => ({ key, label, type: 'color', def: '', tema });
  const FUENTES = { display: 'Tipografía de títulos', texto: 'Tipografía de texto' };

  // ---------- Frase con palabras que suben desde atrás de su máscara ----------
  // *texto* va en acento. Respeta los saltos de línea y corta lo que no entra en "ancho".
  function tokens(txt) {
    return String(txt || '').split('\n').map((par) => {
      const out = [];
      par.split(/(\*[^*]+\*)/).forEach((seg) => {
        if (!seg) return;
        const acc = seg.length > 2 && seg.startsWith('*') && seg.endsWith('*'), s = acc ? seg.slice(1, -1) : seg;
        s.split(/(\s+)/).forEach((w, j) => {
          if (!w) return;
          if (/^\s+$/.test(w)) { out.sp = true; return; }
          // Pegada a la anterior si no hubo espacio en medio (p. ej. "*muchas*,")
          out.push({ t: w, acc, pegado: out.length > 0 && !out.sp && j === 0 });
          out.sp = false;
        });
      });
      return out;
    });
  }
  function frase(tl, p, h, { x, y, ancho, alinear = 'centro', size, tinta, acento, salida = 'sube', escalon = 0.08, peso = 800, italica = true, fuente = 'display' }) {
    const { medir, texto, blur } = h, font = h.fuente(fuente);
    const opt = (w) => ({ italic: italica && w.acc, weight: peso, font });
    const sp = medir(' ', size, { weight: peso, font }), lh = size * 1.08;
    const lineas = [];
    tokens(p).forEach((par) => {
      let linea = [], w = 0;
      par.forEach((tk) => {
        const tw = medir(tk.t, size, opt(tk));
        const gap = linea.length && !tk.pegado ? sp : 0;
        if (linea.length && !tk.pegado && w + gap + tw > ancho) { lineas.push({ ws: linea, w }); linea = []; w = 0; }
        const g = linea.length && !tk.pegado ? sp : 0;
        linea.push({ ...tk, x: w + g, w: tw }); w += g + tw;
      });
      lineas.push({ ws: linea, w });
    });
    const out = exIn(prog(tl, h.dur, 0.3)), dx = salida === 'barrido' ? -2200 * out : 0;
    const vx = salida === 'barrido' ? speed((tt) => -2200 * exIn(prog(tt, h.dur, 0.3)), tl) : 0;
    let s = '', k = 0;
    lineas.forEach((L, li) => {
      const base = y - ((lineas.length - 1) * lh) / 2 + li * lh + size * 0.35;
      const x0 = alinear === 'centro' ? x - L.w / 2 : x, id = h.id('fr' + li);
      s += `<clipPath id="${id}"><rect x="-200" y="${r2(base - size * 0.98)}" width="2320" height="${r2(size * 1.32)}"/></clipPath><g clip-path="url(#${id})">`;
      L.ws.forEach((w) => {
        const d = exOut(prog(tl, 0.04 + k * escalon, 0.55));
        let dy = lh * (1 - d);
        if (salida === 'sube') dy -= lh * 1.1 * exIn(prog(tl, h.dur + k * 0.02, 0.3));
        s += `<g transform="translate(${r2(dx)} ${r2(dy)})">${texto(w.t, x0 + w.x, base, size, w.acc ? acento : tinta, opt(w))}</g>`;
        k++;
      });
      s += '</g>';
    });
    if (salida === 'corte' && tl >= h.dur) return '';
    return vx ? `<g${blur(vx)}>${s}</g>` : s;
  }

  // ---------- Logo por elementos (cada uno entra por su lado) y palabra aparte ----------
  const LOGOS = {};
  function logoDe(variante, tema, alto) {
    const key = [variante, tema, alto].join('|');
    if (LOGOS[key]) return LOGOS[key];
    const C = U.marca.cfgDe(variante, tema);
    const word = U.marca.palabra(C), cap = word.cap, k = alto / cap;
    const iso = C.forma === 'ninguna' ? '' : U.marca.isotipo(C);
    const elems = iso.match(/<(path|circle|rect)\b[^>]*\/>|<text\b[\s\S]*?<\/text>/g) || [];
    const ih = iso ? cap * C.isoEscala * k : 0, gap = iso ? cap * C.separacion * k : 0, b = word.box;
    const Wt = ih + gap + b.w * k, x0 = 960 - Wt / 2;
    return (LOGOS[key] = { word, k, elems, ih, gap, x0, Wt, wx: x0 + ih + gap - b.x * k, wy: 540 + (cap * k) / 2, b });
  }
  const variantes = () => ({ '': 'Según el tema', ...Object.fromEntries(Object.entries(U.marca?.variantes() || {}).filter(([k]) => !k.startsWith('tema:')).map(([k, v]) => [k, v.nombre || k])) });

  const TIPOS = {
    // Una barra late con el bombo y se abre en franjas, una vez por pulso; en el corte se
    // van hacia la derecha. Su primer cuadro es igual al cierre del logo (loop sin costura).
    barras: {
      nombre: 'Barras que se abren', pulsos: 4, cola: 0.4,
      campos: [
        { key: 'franjas', label: 'Franjas al final', type: 'range', min: 2, max: 8, step: 1, def: 4, hint: 'Se abre de a una por pulso: 1, 2, 4, 8…' },
        { key: 'ancho', label: 'Separación', type: 'range', min: 300, max: 1700, step: 10, def: 900, unit: 'px' },
        { key: 'alto', label: 'Alto', type: 'range', min: 200, max: 1000, step: 10, def: 620, unit: 'px' },
        { key: 'grosor', label: 'Grosor', type: 'range', min: 10, max: 160, step: 2, def: 54, unit: 'px' },
        { key: 'latido', label: 'Latido con el bombo', type: 'range', min: 0, max: 0.2, step: 0.01, def: 0.06 },
        color('acento', 'Color de los bordes', 'acento'), color('tinta', 'Color del medio', 'tinta'),
      ],
      resumen: (p) => `${p.franjas} franjas`,
      dibujar(tl, p, h) {
        const { CX, CY, BEAT, kick, blur } = h, n = Math.max(2, Math.round(p.franjas));
        const k = Math.max(0, Math.floor(tl / BEAT + 1e-9));
        const m = Math.min(n, 2 ** k), prev = Math.min(n, 2 ** Math.max(0, k - 1)), tb = k * BEAT;
        const slot = (g, mm) => CX + (g - (mm - 1) / 2) * (p.ancho / mm);
        const salida = (tt) => exIn(prog(tt, h.dur, 0.35)) * 2200;
        const hgt = p.alto * (1 + p.latido * kick(tl)), w = p.grosor;
        // Las del medio primero: cuando se superponen, se ven los bordes
        const orden = [...Array(n).keys()].filter((i) => i && i < n - 1).concat([0, n - 1]);
        let s = '';
        orden.forEach((i) => {
          const a = slot(Math.floor((i * prev) / n), prev), b = slot(Math.floor((i * m) / n), m), f = 1 + i * 0.15;
          const x = (m === 1 ? CX : lerp(a, b, exOut(prog(tl, tb, 0.32)))) + salida(tl) * f;
          const c = m === 1 || i === 0 || i === n - 1 ? p.acento : p.tinta;
          s += `<rect x="${r2(x - w / 2)}" y="${r2(CY - hgt / 2)}" width="${w}" height="${r2(hgt)}" rx="${r2(w / 9)}" fill="${c}"${blur(speed((tt) => salida(tt) * f, tl))}/>`;
        });
        return s;
      },
    },

    // Una palabra por pulso (o cada N pulsos); la anterior sube y se va
    palabras: {
      nombre: 'Palabras a tempo', pulsos: 4, cola: 0.3,
      campos: [
        { key: 'palabras', label: 'Palabras (una por línea)', type: 'textarea', def: 'Una\nidea\nen\nmovimiento.' },
        { key: 'cada', label: 'Pulsos por palabra', type: 'range', min: 0.5, max: 4, step: 0.5, def: 1 },
        { key: 'tamano', label: 'Tamaño', type: 'range', min: 80, max: 400, step: 5, def: 230, unit: 'px' },
        { key: 'ultima', label: 'La última en acento e itálica', type: 'check', def: true },
        { key: 'fuente', label: 'Tipografía', type: 'select', options: FUENTES, def: 'display' },
        color('tinta', 'Color', 'tinta'), color('acento', 'Color de acento', 'acento'),
      ],
      resumen: (p) => U.lines(p.palabras).join(' '),
      dibujar(tl, p, h) {
        const { CX, CY, BEAT, texto } = h, PAL = U.lines(p.palabras), BE = BEAT * p.cada, z = p.tamano / 230;
        if (!PAL.length) return '';
        const j = Math.min(PAL.length - 1, Math.max(0, Math.floor(tl / BE + 1e-9)));
        let s = '';
        [j - 1, j].forEach((i) => {
          if (i < 0) return;
          const t0 = i * BE, inn = exOut(prog(tl, t0, 0.3)), out = i < j ? exOut(prog(tl, t0 + BE, 0.3)) : exIn(prog(tl, h.dur, 0.25));
          const y = CY + 80 * z + 160 * z * (1 - inn) - 220 * z * out, last = p.ultima && i === PAL.length - 1;
          s += `<g opacity="${r2(inn * (1 - out))}">${texto(PAL[i], CX, y, p.tamano, last ? p.acento : p.tinta, { anchor: 'middle', italic: last, font: h.fuente(p.fuente) })}</g>`;
        });
        return s;
      },
    },

    // Un número que cuenta, se subraya y deja una bajada con barrido; en el corte, se va a la izquierda
    dato: {
      nombre: 'Dato que cuenta', pulsos: 4, cola: 0.3,
      campos: [
        { key: 'numero', label: 'Número', type: 'text', def: '100' },
        { key: 'unidad', label: 'Unidad (chica, arriba)', type: 'text', def: '%' },
        { key: 'texto', label: 'Texto debajo', type: 'text', def: 'de lo que importa' },
        { key: 'tamano', label: 'Tamaño', type: 'range', min: 140, max: 520, step: 5, def: 330, unit: 'px' },
        color('acento', 'Color del número', 'acento'), color('tinta', 'Color del texto', 'tinta'),
      ],
      resumen: (p) => `${p.numero}${p.unidad || ''} ${p.texto || ''}`,
      dibujar(tl, p, h) {
        const { CX, CY, texto, medir, blur } = h, size = p.tamano, z = size / 330;
        const raw = String(p.numero ?? '').trim(), coma = raw.includes(','), num = parseFloat(raw.replace(',', '.')) || 0;
        const dec = (raw.split(/[.,]/)[1] || '').length, fmt = (v) => { const t = v.toFixed(dec); return coma ? t.replace('.', ',') : t; };
        const str = fmt(num * spring(prog(tl, 0.05, 0.9))), out = exIn(prog(tl, h.dur, 0.25));
        const w = medir(fmt(num), size), uw = medir(p.unidad || '', size * 0.4);
        const x = CX - (w + uw) / 2, y = CY + 60 * z - 30 * (1 - exOut(prog(tl, 0, 0.4)));
        let s = `<g opacity="${r2(exOut(prog(tl, 0, 0.2)) * (1 - out))}" transform="translate(${r2(-900 * out)} 0)"${blur(speed((tt) => -900 * exIn(prog(tt, h.dur, 0.25)), tl))}>`;
        s += texto(str, x + w, y, size, p.acento, { anchor: 'end' }) + texto(p.unidad || '', x + w + 10, y - size * 0.42, size * 0.4, p.acento);
        const line = Math.max(700 * z, w + uw) * exOut(prog(tl, 0.6, 0.4)), yl = CY + 110 * z;
        s += `<rect x="${r2(CX - line / 2)}" y="${r2(yl)}" width="${r2(line)}" height="8" rx="4" fill="${p.tinta}"/>`;
        const tw = exOut(prog(tl, 1.0, 0.45)), id = h.id('dato');
        s += `<clipPath id="${id}"><rect x="0" y="${r2(yl + 30)}" width="${r2(1920 * tw)}" height="120"/></clipPath><g clip-path="url(#${id})">${texto(p.texto || '', CX, yl + 100, 54, p.tinta, { anchor: 'middle', italic: true, weight: 500 })}</g></g>`;
        return s;
      },
    },

    // El logo se arma (cada elemento del isotipo entra por su lado), aparece la palabra y la
    // bajada; con "cierre", todo se cierra en la barra del primer cuadro (para el loop).
    logo: {
      nombre: 'Logo con bajada', pulsos: 12, cola: 0.4,
      campos: [
        { key: 'variante', label: 'Logo', type: 'select', options: variantes, def: '' },
        { key: 'alto', label: 'Tamaño de la palabra', type: 'range', min: 80, max: 360, step: 5, def: 190, unit: 'px' },
        { key: 'bajada', label: 'Bajada', type: 'text', def: '' },
        { key: 'bajadaTamano', label: 'Tamaño de la bajada', type: 'range', min: 24, max: 110, step: 1, def: 50, unit: 'px' },
        { key: 'cierre', label: 'Cerrar en una barra (el loop no se nota si el reel empieza con barras)', type: 'check', def: true },
        color('tinta', 'Color de la bajada', 'tinta'), color('acento', 'Color de la barra del cierre', 'acento'),
      ],
      resumen: (p) => p.bajada || '',
      dibujar(tl, p, h, ctx) {
        const { CX, CY, BEAT, texto, medir, blur, kick } = h, dur = h.dur;
        const L = logoDe(p.variante, h.tema, p.alto), si = L.ih / 80 || 1;
        // Cierre: 3 pulsos antes del final se aplana; 2 pulsos antes crece la barra
        const tc = dur - 3 * BEAT, cierre = p.cierre ? exIn(prog(tl, tc, 0.7)) : 0;
        const salida = p.cierre ? 0 : exIn(prog(tl, dur, 0.35));
        const deriva = 1 + 0.02 * prog(tl, 0, Math.max(0.1, tc));
        let g = '';
        L.elems.forEach((el, i) => {
          const dy = (i % 2 ? -1 : 1) * 900 * (1 - spring(prog(tl, i * 0.1, 0.7), 8));
          g += `<g transform="translate(0 ${r2(dy / si)})">${el}</g>`;
        });
        let lockup = `<g transform="translate(${r2(L.x0)} ${r2(CY - L.ih / 2)}) scale(${r2(si)})">${g}</g>`;
        const ww = exOut(prog(tl, 2 * BEAT, 0.5)), bx = L.wx + L.b.x * L.k, idw = h.id('word'), ids = h.id('sub');
        lockup += `<clipPath id="${idw}"><rect x="${r2(bx - 10)}" y="0" width="${r2((L.b.w * L.k + 20) * ww)}" height="1080"/></clipPath>`;
        lockup += `<g clip-path="url(#${idw})"><g transform="translate(${r2(L.wx)} ${r2(L.wy)}) scale(${L.k.toFixed(5)})">${L.word.svg}</g></g>`;
        // Bajada con barrido
        const bs = p.bajadaTamano, bj = p.bajada || '', bw = medir(bj, bs, { italic: true, weight: 500 }), wb = exOut(prog(tl, 5 * BEAT, 0.5));
        const yb = CY + 150 + (p.alto - 190) * 0.5;
        if (bj) lockup += `<clipPath id="${ids}"><rect x="${r2(CX - bw / 2 - 10)}" y="${r2(yb)}" width="${r2((bw + 20) * wb)}" height="${r2(bs * 1.8)}"/></clipPath><g clip-path="url(#${ids})">${texto(bj, CX, yb + bs * 1.3, bs, p.tinta, { anchor: 'middle', italic: true, weight: 500, extra: 'fill-opacity=".75"' })}</g>`;
        const sx = deriva * (1 - cierre), up = -40 * exOut(prog(tl, 4.6 * BEAT, 0.6));
        let s = '';
        if (sx > 0.002 && salida < 1) s += `<g opacity="${r2(1 - salida)}" transform="translate(${CX} ${r2(CY + up)}) scale(${r2(sx)} ${r2(deriva)}) translate(${-CX} ${-CY})"${blur(speed((tt) => (p.cierre ? exIn(prog(tt, tc, 0.7)) : 0) * 1500, tl))}>${lockup}</g>`;
        // La barra del primer cuadro: crece cuando el logo termina de cerrarse y queda igual
        // que en t = 0 (si el reel empieza con barras, toma sus medidas y su color)
        if (p.cierre && tl > dur - 2 * BEAT) {
          const b0 = ctx.partes[0]?.tipo === 'barras' ? ctx.partes[0].p : { alto: 620, grosor: 54, latido: 0.06, acento: p.acento };
          const hgt = b0.alto * exOut(prog(tl, dur - 2 * BEAT, 0.4)) * (1 + b0.latido * kick(tl));
          s += `<rect x="${r2(CX - b0.grosor / 2)}" y="${r2(CY - hgt / 2)}" width="${b0.grosor}" height="${r2(hgt)}" rx="${r2(b0.grosor / 9)}" fill="${b0.acento}"/>`;
        }
        return s;
      },
    },

    // Una frase grande: las palabras suben de a una desde atrás de su máscara
    titulo: {
      nombre: 'Título', pulsos: 4, cola: 0.45,
      campos: [
        { key: 'texto', label: 'Frase (*palabra* en acento; Enter corta la línea)', type: 'textarea', def: 'Una frase *grande*.' },
        { key: 'tamano', label: 'Tamaño', type: 'range', min: 60, max: 320, step: 2, def: 150, unit: 'px' },
        { key: 'alinear', label: 'Alineación', type: 'select', options: { centro: 'Centrada', izquierda: 'A la izquierda' }, def: 'centro' },
        { key: 'y', label: 'Altura', type: 'range', min: -400, max: 400, step: 5, def: 0, unit: 'px' },
        { key: 'escalon', label: 'Retardo entre palabras', type: 'range', min: 0, max: 0.4, step: 0.01, def: 0.08, unit: ' s' },
        { key: 'salida', label: 'Salida en el corte', type: 'select', options: { sube: 'Suben y se van', barrido: 'Barrido a la izquierda', corte: 'Corte seco' }, def: 'sube' },
        { key: 'italica', label: 'Acento en itálica', type: 'check', def: true },
        { key: 'fuente', label: 'Tipografía', type: 'select', options: FUENTES, def: 'display' },
        color('tinta', 'Color', 'tinta'), color('acento', 'Color de acento', 'acento'),
      ],
      resumen: (p) => U.plain(p.texto),
      dibujar(tl, p, h) {
        const izq = p.alinear === 'izquierda';
        return frase(tl, p.texto, h, { x: izq ? 160 : h.CX, y: h.CY + p.y, ancho: izq ? 1600 : 1640, alinear: p.alinear, size: p.tamano, tinta: p.tinta, acento: p.acento, salida: p.salida, escalon: p.escalon, italica: p.italica, fuente: p.fuente });
      },
    },

    // Foto de pantalla completa con ken burns, oscurecida desde abajo y con una frase opcional
    imagen: {
      nombre: 'Imagen', pulsos: 8, cola: 0.4,
      campos: [
        { key: 'src', label: 'Imagen', type: 'select', imagen: true, options: () => Object.fromEntries([['', '— sin imagen —'], ...(window.MANIFIESTO?.imagenes || []).map((u) => [u, u.split('/').pop()])]), def: (window.MANIFIESTO?.imagenes || [])[0] || '' },
        { key: 'movimiento', label: 'Movimiento', type: 'select', options: { acerca: 'Se acerca', aleja: 'Se aleja', izquierda: 'Hacia la izquierda', derecha: 'Hacia la derecha', quieta: 'Quieta' }, def: 'acerca' },
        { key: 'zoom', label: 'Zoom', type: 'range', min: 1, max: 1.6, step: 0.01, def: 1.15 },
        { key: 'encuadre', label: 'Encuadre', type: 'select', options: { xMidYMid: 'Centro', xMidYMin: 'Arriba', xMidYMax: 'Abajo', xMinYMid: 'Izquierda', xMaxYMid: 'Derecha' }, def: 'xMidYMid' },
        { key: 'oscurecer', label: 'Oscurecer', type: 'range', min: 0, max: 0.9, step: 0.05, def: 0.45 },
        { key: 'entrada', label: 'Entrada', type: 'select', options: { barrido: 'Barrido', fundido: 'Fundido', corte: 'Corte seco' }, def: 'barrido' },
        { key: 'texto', label: 'Frase encima (opcional, *acento*)', type: 'textarea', def: '' },
        { key: 'tamano', label: 'Tamaño de la frase', type: 'range', min: 40, max: 220, step: 2, def: 110, unit: 'px' },
        color('tinta', 'Color de la frase', 'tinta'), color('acento', 'Color de acento', 'acento'), color('bg', 'Color del oscurecido', 'bg'),
      ],
      resumen: (p) => (p.src ? p.src.split('/').pop() : 'sin imagen') + (p.texto ? ' · ' + U.plain(p.texto) : ''),
      dibujar(tl, p, h) {
        const { W, H, CX, CY } = h, id = h.id('img'), gid = h.id('osc');
        const k = prog(tl, 0, h.dur + 0.4), z = p.zoom, mv = p.movimiento;
        const s = mv === 'acerca' ? lerp(1, z, k) : mv === 'aleja' ? lerp(z, 1, k) : z;
        const dx = mv === 'izquierda' ? lerp(1, -1, k) * (z - 1) * CX * 0.9 : mv === 'derecha' ? lerp(-1, 1, k) * (z - 1) * CX * 0.9 : 0;
        const inn = p.entrada === 'corte' ? 1 : exOut(prog(tl, 0, 0.6)), out = exIn(prog(tl, h.dur, 0.35));
        // Ventana visible: con barrido, su borde izquierdo viaja de W a 0 al entrar; al salir, el derecho de W a 0
        const x0 = p.entrada === 'barrido' ? W * (1 - inn) : 0, x1 = W * (1 - out);
        let g = `<clipPath id="${id}"><rect x="${r2(x0)}" y="0" width="${r2(Math.max(0, x1 - x0))}" height="${H}"/></clipPath>`;
        g += `<linearGradient id="${gid}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${p.bg}" stop-opacity="${r2(p.oscurecer * 0.35)}"/><stop offset="1" stop-color="${p.bg}" stop-opacity="${r2(Math.min(1, p.oscurecer * 1.6))}"/></linearGradient>`;
        g += `<g clip-path="url(#${id})" opacity="${r2(p.entrada === 'fundido' ? inn : 1)}">`;
        if (p.src) g += `<g transform="translate(${CX} ${CY}) scale(${s.toFixed(4)}) translate(${r2(-CX + dx)} ${-CY})"><image href="${esc(p.src)}" x="0" y="0" width="${W}" height="${H}" preserveAspectRatio="${esc(p.encuadre || 'xMidYMid')} slice"/></g>`;
        else g += `<rect width="${W}" height="${H}" fill="${p.tinta}" fill-opacity=".08"/>`;
        if (p.oscurecer > 0) g += `<rect width="${W}" height="${H}" fill="url(#${gid})"/>`;
        g += '</g>';
        if (p.texto) g += frase(tl - 0.25, p.texto, h, { x: 140, y: 840, ancho: 1500, alinear: 'izquierda', size: p.tamano, tinta: p.tinta, acento: p.acento, salida: 'barrido' });
        return g;
      },
      precargar: (p) => (p.src ? [p.src] : []),
    },

    // Una lista que aparece de a un ítem por pulso, con un título opcional
    lista: {
      nombre: 'Lista', pulsos: 8, cola: 0.5,
      campos: [
        { key: 'titulo', label: 'Título (opcional)', type: 'text', def: 'Tres cosas' },
        { key: 'items', label: 'Ítems (uno por línea)', type: 'textarea', def: 'Primera\nSegunda\nTercera' },
        { key: 'cada', label: 'Pulsos entre ítems', type: 'range', min: 0.5, max: 4, step: 0.5, def: 1 },
        { key: 'tamano', label: 'Tamaño', type: 'range', min: 30, max: 140, step: 1, def: 84, unit: 'px' },
        { key: 'marcador', label: 'Marcador', type: 'select', options: { barra: 'Barra', numero: 'Número', punto: 'Punto', nada: 'Nada' }, def: 'numero' },
        { key: 'fuente', label: 'Tipografía de los ítems', type: 'select', options: FUENTES, def: 'display' },
        color('tinta', 'Color de los ítems', 'tinta'), color('acento', 'Color del título y los marcadores', 'acento'),
      ],
      resumen: (p) => p.titulo || U.lines(p.items).join(' · '),
      dibujar(tl, p, h) {
        const { CY, BEAT, texto, blur } = h, items = U.lines(p.items), size = p.tamano, lh = size * 1.55;
        const ts = size * 1.15, th = p.titulo ? ts * 1.7 : 0, alto = th + items.length * lh, top = CY - alto / 2;
        const x0 = 260, xt = x0 + (p.marcador === 'nada' ? 0 : size * 1.5), font = h.fuente(p.fuente);
        const salida = (tt, k) => -1800 * exIn(prog(tt, h.dur + k * 0.04, 0.35));
        let s = '';
        if (p.titulo) {
          const d = exOut(prog(tl, 0, 0.55)), id = h.id('lt'), base = top + ts * 0.85;
          s += `<clipPath id="${id}"><rect x="0" y="${r2(base - ts)}" width="1920" height="${r2(ts * 1.3)}"/></clipPath><g clip-path="url(#${id})"><g transform="translate(${r2(salida(tl, 0))} ${r2(ts * 1.1 * (1 - d))})"${blur(speed((tt) => salida(tt, 0), tl))}>${texto(p.titulo, x0, base, ts, p.acento, { italic: true })}</g></g>`;
        }
        items.forEach((it, k) => {
          const t0 = (p.titulo ? BEAT : 0) + k * p.cada * BEAT, d = exOut(prog(tl, t0, 0.45));
          if (d <= 0) return;
          const y = top + th + k * lh + lh * 0.62, dx = salida(tl, k + 1) - 60 * (1 - d);
          let m = '';
          if (p.marcador === 'barra') m = `<rect x="${x0}" y="${r2(y - size * 0.38)}" width="${r2(size * 0.9 * d)}" height="${r2(Math.max(4, size * 0.09))}" rx="3" fill="${p.acento}"/>`;
          else if (p.marcador === 'punto') m = `<circle cx="${r2(x0 + size * 0.3)}" cy="${r2(y - size * 0.34)}" r="${r2(size * 0.16 * d)}" fill="${p.acento}"/>`;
          else if (p.marcador === 'numero') m = texto(U.nn(k + 1), x0, y, size * 0.7, p.acento, { italic: true });
          s += `<g opacity="${r2(d)}" transform="translate(${r2(dx)} 0)"${blur(speed((tt) => salida(tt, k + 1), tl))}>${m}${texto(it, xt, y, size, p.tinta, { weight: p.fuente === 'texto' ? 500 : 700, font })}</g>`;
        });
        return s;
      },
    },
  };

  U.reel.tipos = TIPOS;
  U.reel.frase = frase;
})();
