// Tipos de escena de la presentación motion. Cada tipo dice qué campos se editan, cómo se
// dibuja y, si hace falta, qué se mueve solo (tick) o qué pasa en sus puntos clave.
//
//   nombre     cómo se llama en el editor
//   campos     [[clave, tipo, etiqueta, opciones?], ...] · tipos: text, area, lines (uno por línea),
//              pairs ("título | detalle" por línea), image, video, number, select
//   ejemplo    contenido con el que nace una escena nueva de este tipo
//   pasos      'uno' (cada avance revela un punto) o 'todo'; la escena puede cambiarlo
//   conLogo    la escena muestra el logo y deja elegir su variante
//   focos(d)   cámara dentro de la escena, un foco por punto clave: [{ x, y, s }]
//   render(d, ctx)  HTML de la escena · ctx.logo(tamaño) · ctx.n (número de escena)
//   tick(raíz, t)   se llama en cada cuadro con el tiempo ambiente (señales, monitores…)
//   onHold / onLeave(raíz)  al detenerse en un punto clave de la escena / al irse
//   css        estilos propios del tipo (se instalan una vez)
//
// Atributos que lee el motor en el HTML:
//   data-m      entrada: up | left | right | fade | pop | zoom | wipe | reveal | draw | count | type | words | letters
//   data-s      punto clave en el que entra (0 = al llegar a la escena; 1, 2… = cada avance)
//   data-at     segundos desde que empieza ese punto clave · data-dur duración · data-stagger desfase entre palabras
//   data-k      clave compartida: si la escena siguiente tiene la misma, el elemento viaja de una a la otra
//   data-shape  cómo viaja: text (se escala, por defecto) | bar (barra de un punto) | box (tarjeta) | img (foto)
//   data-par    paralaje durante el movimiento de cámara (1 = se mueve con la escena)
//   data-dim    se atenúa cuando entra el punto siguiente
//   data-out    punto clave en el que se va (sale con un fundido)
//   data-f      campo de la escena que muestra: con el editor abierto, un clic lo edita
//
// Para sumar tipos propios de un proyecto: proyecto/tipos.js (window.TIPOS_PROYECTO), mismo formato.
(function () {
  const { md, esc, lines, pairs, nn } = window.TRAMOYA;
  const f2 = (x) => x.toFixed(2);
  const modo = (d, def) => (d.pasos === 'uno' || d.pasos === 'todo' ? d.pasos : def);
  const KT = ['kicker', 'text', 'Antetítulo'], TT = ['titulo', 'area', 'Título (*palabra* en acento)'];

  // Piezas que comparten varios tipos: viajan entre escenas porque llevan la misma data-k
  const kicker = (d, at = 0) => `<div class="kicker" data-f="kicker" data-k="kicker" data-m="wipe" data-at="${at}" data-dur=".8"><i></i><span>${md(d.kicker)}</span></div>`;
  const titulo = (d, at = 0.12, cls = '') => `<h2 class="${cls}" data-f="titulo" data-k="titulo" data-m="words" data-at="${at}">${md(d.titulo)}</h2>`;
  const numeral = (ctx) => `<div class="numeral" data-m="fade" data-dur="1.4" data-par="1.8">${nn(ctx.n)}</div>`;
  // Puntos de una lista: todos juntos, o uno por punto clave
  const lista = (items, uno, base, build) => items.map((x, i) => build(x, i, uno ? `data-s="${i + 1}" data-at=".05" data-dim` : `data-at="${f2(base + i * 0.16)}"`)).join('');

  const TIPOS = {
    portada: {
      nombre: 'Portada', conLogo: true,
      campos: [KT, ['titulo', 'text', 'Título (*parte* en acento)'], ['subtitulo', 'area', 'Subtítulo'], ['autores', 'text', 'Autores'], ['contexto', 'text', 'Contexto (evento, institución, fecha)'], ['imagen', 'image', 'Imagen de fondo']],
      ejemplo: { kicker: 'Antetítulo', titulo: 'Nom*bre*', subtitulo: 'Una frase que diga de qué se trata.', autores: 'Equipo', contexto: 'Evento · Año' },
      render: (d, ctx) => `
        ${d.imagen ? `<div class="bg-photo" data-f="imagen" data-k="hero" data-shape="img" data-m="reveal" data-dur="1.8" data-par=".45"><img src="${esc(d.imagen)}" alt=""></div>
        <div class="bg-shade" data-m="fade" data-at=".3" data-dur="1.4"></div>` : ''}
        <div class="cover">
          ${kicker(d, 0.6)}
          <div class="lockup"><div class="lk-logo" data-f="logo" data-m="pop" data-at=".8" data-dur="1.1">${ctx.logo()}</div><h1 data-f="titulo" data-m="letters" data-at="1">${md(d.titulo)}</h1></div>
          <p class="sub" data-f="subtitulo" data-m="words" data-at="1.7" data-dur=".6" data-stagger=".022">${md(d.subtitulo)}</p>
          <div class="meta" data-f="autores" data-m="up" data-at="2.4"><b>${esc(d.autores)}</b><span>${esc(d.contexto)}</span></div>
        </div>`,
    },

    texto: {
      nombre: 'Texto con puntos', pasos: 'uno',
      campos: [KT, TT, ['cuerpo', 'area', 'Párrafo (opcional)'], ['puntos', 'lines', 'Puntos (uno por línea)']],
      ejemplo: { kicker: 'Tema', titulo: 'Una idea por *escena*.', puntos: 'Primer punto.\nSegundo punto.\nTercer punto.' },
      render: (d, ctx) => `${numeral(ctx)}
        <div class="pad">${kicker(d)}${titulo(d)}
          ${d.cuerpo ? `<p class="body" data-f="cuerpo" data-m="up" data-at=".7">${md(d.cuerpo)}</p>` : ''}
          <ol class="points">${lista(lines(d.puntos), modo(d, 'uno') === 'uno', 0.9, (p, i, a) => `
            <li class="pt" data-f="puntos" data-k="item-${i}" data-shape="bar" data-m="left" ${a}><span class="num">${nn(i + 1)}</span><span>${md(p)}</span></li>`)}
          </ol>
        </div>`,
    },

    tarjetas: {
      nombre: 'Tarjetas', pasos: 'todo',
      campos: [KT, TT, ['items', 'pairs', 'Tarjetas: "título | detalle" por línea']],
      ejemplo: { kicker: 'Tres cosas', titulo: 'Lo que hay que *saber*.', items: 'Uno | Detalle del primero.\nDos | Detalle del segundo.\nTres | Detalle del tercero.' },
      render: (d, ctx) => {
        const it = pairs(d.items);
        return `${numeral(ctx)}
        <div class="pad">${kicker(d)}${titulo(d)}
          <div class="cards" style="--cols:${Math.min(4, Math.max(1, it.length > 4 ? Math.ceil(it.length / 2) : it.length))}">${lista(it, modo(d, 'todo') === 'uno', 0.8, (x, i, a) => `
            <div class="card" data-f="items" data-k="item-${i}" data-shape="box" data-m="up" ${a}><i></i><b>${md(x.t)}</b><span>${md(x.d)}</span></div>`)}
          </div>
        </div>`;
      },
    },

    flujo: {
      nombre: 'Diagrama de flujo', pasos: 'uno',
      campos: [KT, TT, ['bloques', 'lines', 'Bloques: "columna | título | detalle" por línea, en orden'],
        ['conexiones', 'text', 'Conexiones (opcional): "1>3, 2>3" por número de bloque; vacío = automáticas'], ['nota', 'text', 'Nota al pie']],
      ejemplo: { kicker: 'Cómo funciona', titulo: 'De la entrada a la *salida*.', bloques: 'Entradas | Datos | Lo que llega\nProceso | Motor | Lo que transforma\nSalidas | Resultado | Lo que sale' },
      // Columnas y cajas a partir del texto: se reparten solas en el escenario
      layout(d) {
        const raw = lines(d.bloques).map((l) => { const [c, t, ...x] = l.split('|').map((s) => s.trim()); return { col: c || '', t: t || '', d: x.join(' | ') }; });
        const cols = [...new Set(raw.map((b) => b.col))], C = Math.max(1, cols.length);
        const BW = Math.min(380, (1640 - (C - 1) * 90) / C), X = (k) => (C === 1 ? 960 - BW / 2 : 140 + (k * (1640 - BW)) / (C - 1));
        const boxes = [];
        cols.forEach((name, k) => {
          const mine = raw.filter((b) => b.col === name), n = mine.length;
          const BH = Math.min(130, (580 - (n - 1) * 24) / n), gap = n > 1 ? Math.min(80, (580 - n * BH) / (n - 1)) : 0, y0 = 650 - (n * BH + (n - 1) * gap) / 2;
          mine.forEach((b, j) => boxes.push({ ...b, k, j, n, x: X(k), y: y0 + j * (BH + gap), w: BW, h: BH }));
        });
        // Conexiones: las pedidas, o cada caja con la más cercana (en proporción) de la columna siguiente
        let links = [];
        const pedidas = String(d.conexiones || '').match(/\d+\s*>\s*\d+/g);
        if (pedidas) links = pedidas.map((p) => p.split('>').map((x) => +x - 1)).filter(([a, b]) => boxes[a] && boxes[b]);
        else for (let k = 0; k < C - 1; k++) {
          const A = boxes.filter((b) => b.k === k), B = boxes.filter((b) => b.k === k + 1), set = new Set();
          const at = (i, n, m) => (n > 1 ? Math.round((i * (m - 1)) / (n - 1)) : Math.floor((m - 1) / 2));
          A.forEach((a, i) => set.add(`${boxes.indexOf(a)}>${boxes.indexOf(B[at(i, A.length, B.length)])}`));
          B.forEach((b, j) => set.add(`${boxes.indexOf(A[at(j, B.length, A.length)])}>${boxes.indexOf(b)}`));
          links.push(...[...set].map((s) => s.split('>').map(Number)));
        }
        return { cols, C, boxes, links, X, BW };
      },
      // La cámara recorre el diagrama de izquierda a derecha y al final lo muestra entero
      focos(d) {
        const { C } = TIPOS.flujo.layout(d);
        if (modo(d, 'uno') !== 'uno' || C < 2) return [];
        return Array.from({ length: C }, (_, s) => ({ x: 620 + (340 * s) / (C - 1), y: 500, s: 1.12 - (0.12 * s) / (C - 1) }));
      },
      render(d) {
        const { cols, C, boxes, links, X } = TIPOS.flujo.layout(d), uno = modo(d, 'uno') === 'uno';
        const st = (s, at) => (uno ? `data-s="${s}" data-at="${at}"` : `data-at="${f2(0.6 + s * 0.8 + at * 0.5)}"`);
        const cls = (k) => (k === 0 ? 'c0' : k === C - 1 ? 'last' : 'mid');
        const link = ([a, c]) => {
          const A = boxes[a], B = boxes[c], x1 = A.x + A.w, y1 = A.y + A.h / 2, x2 = B.x, y2 = B.y + B.h / 2, mx = (x1 + x2) / 2;
          return `<path data-m="draw" data-dur=".7" ${st(Math.max(A.k, B.k), 0)} d="M${f2(x1)} ${f2(y1)} C${f2(mx)} ${f2(y1)} ${f2(mx)} ${f2(y2)} ${f2(x2)} ${f2(y2)}"/>`;
        };
        return `
        <div class="pad">${kicker(d)}${titulo(d, 0.12, 'md wide')}</div>
        ${cols.map((c, k) => `<div class="alabel" style="left:${f2(X(k))}px; top:${f2(Math.min(...boxes.filter((b) => b.k === k).map((b) => b.y)) - 50)}px" data-m="wipe" ${st(k, k ? 0 : 0.5)}>${esc(c)}</div>`).join('')}
        <svg class="links" viewBox="0 0 1920 1080">${links.map(link).join('')}<g class="packets"></g></svg>
        ${boxes.map((b, i) => `
          <div class="abox ${cls(b.k)}" data-f="bloques" style="left:${f2(b.x)}px; top:${f2(b.y)}px; width:${f2(b.w)}px; height:${f2(b.h)}px" data-k="item-${i}" data-shape="box" data-m="pop" ${st(b.k, f2((b.k ? 0.15 : 0.7) + b.j * 0.15))}><b>${esc(b.t)}</b>${b.d ? `<span>${esc(b.d)}</span>` : ''}</div>`).join('')}
        ${d.nota ? `<p class="anota" data-f="nota" data-m="up" ${st(C - 1, 1.1)}>${md(d.nota)}</p>` : ''}`;
      },
      // Pulsos que recorren cada conector ya dibujado
      tick(root, t) {
        const g = root.querySelector('.packets');
        if (!g) return;
        const paths = [...root.querySelectorAll('.links path')];
        if (!g.childElementCount) paths.forEach(() => g.appendChild(document.createElementNS('http://www.w3.org/2000/svg', 'circle')).setAttribute('r', 7));
        paths.forEach((p, i) => {
          const c = g.children[i];
          if (!(p._p >= 1)) { c.style.opacity = 0; return; }
          const len = p._len || (p._len = p.getTotalLength()), pt = p.getPointAtLength(len * ((t * 0.45 + i * 0.17) % 1));
          c.setAttribute('cx', pt.x); c.setAttribute('cy', pt.y); c.style.opacity = p.style.opacity;
        });
      },
    },

    imagen: {
      nombre: 'Imagen y puntos', pasos: 'todo',
      campos: [KT, TT, ['puntos', 'lines', 'Puntos (uno por línea)'], ['imagen', 'image', 'Imagen']],
      ejemplo: { kicker: 'Mirá', titulo: 'Una imagen, *tres* ideas.', puntos: 'Primera.\nSegunda.\nTercera.' },
      render: (d) => `
        <div class="photo-half" data-f="imagen" data-k="hero" data-shape="img" data-m="reveal" data-dur="1.4"><img src="${esc(d.imagen)}" alt=""></div>
        <div class="side">${kicker(d, 0.35)}${titulo(d, 0.5)}
          <ul class="bullets">${lista(lines(d.puntos), modo(d, 'todo') === 'uno', 1.0, (p, i, a) => `
            <li class="pt" data-f="puntos" data-k="item-${i}" data-shape="bar" data-m="up" ${a}>${md(p)}</li>`)}
          </ul>
        </div>`,
    },

    senales: {
      nombre: 'Señales en vivo', pasos: 'todo',
      campos: [KT, TT, ['cuerpo', 'area', 'Párrafo'], ['puntos', 'lines', 'Puntos (uno por línea)'],
        ['senales', 'lines', 'Señales: una etiqueta por línea (hasta 3)'], ['indicador', 'text', 'Indicador: "cuando sube | cuando baja"']],
      ejemplo: { kicker: 'En vivo', titulo: 'Lo que mide, *en tiempo real*.', cuerpo: 'Tres lecturas derivadas de un mismo sensor.', puntos: 'Posición.\nVelocidad.\nIntensidad.', senales: 'Posición\nVelocidad\nIntensidad', indicador: 'sube ▲ | baja ▼' },
      render: (d) => {
        const L = lines(d.senales).slice(0, 3);
        return `
        <div class="split2">
          <div>${kicker(d)}${titulo(d)}
            ${d.cuerpo ? `<p class="body" data-f="cuerpo" data-m="up" data-at=".6">${md(d.cuerpo)}</p>` : ''}
            <ul class="bullets">${lista(lines(d.puntos), modo(d, 'todo') === 'uno', 1.0, (p, i, a) => `
              <li class="pt" data-f="puntos" data-k="item-${i}" data-shape="bar" data-m="up" ${a}>${md(p)}</li>`)}
            </ul>
          </div>
          <div class="scope-card" data-f="senales" data-k="hero" data-shape="box" data-m="pop" data-at=".5" data-dur="1">
            <svg class="scope" viewBox="0 0 900 700">
              ${L.map((l, i) => `<g transform="translate(0 ${30 + i * 230})"><text x="0" y="0" class="ll">${esc(l)}</text><path class="sig s${i}"/><line x1="0" x2="900" y1="${i === 2 ? 160 : 100}" y2="${i === 2 ? 160 : 100}" class="axis"/></g>`).join('')}
              <line class="playhead" x1="840" x2="840" y1="10" y2="690"/>
              <text class="dir" x="830" y="250" text-anchor="end"></text>
            </svg>
          </div>
        </div>`;
      },
      // Señal simulada: una posición, su derivada y una intensidad suavizada
      tick(root, t) {
        const pos = (x) => Math.sin(x * 1.1) * 0.75 + Math.sin(x * 2.3 + 1) * 0.2;
        const vel = (x) => (pos(x + 0.01) - pos(x - 0.01)) / 0.02;
        const W = 840, span = 7, N = 140;
        const pts = (f, base, amp) => Array.from({ length: N + 1 }, (_, i) => `${i ? 'L' : 'M'}${((i / N) * W).toFixed(1)} ${(base - f(t - span + (i / N) * span) * amp).toFixed(1)}`).join(' ');
        const set = (sel, d) => { const p = root.querySelector(sel); if (p) p.setAttribute('d', d); };
        set('.s0', pts(pos, 100, 80));
        set('.s1', pts((x) => vel(x) / 1.6, 100, 80));
        set('.s2', pts((x) => Math.min(1, Math.abs(vel(x)) / 1.4), 160, 130));
        const dir = root.querySelector('.dir'), ind = (root._ind ??= (root.querySelector('.scope-card')?.dataset.ind || 'sube ▲|baja ▼').split('|'));
        if (dir) dir.textContent = (vel(t) >= 0 ? ind[0] : ind[1] || '').trim();
      },
    },

    codigo: {
      nombre: 'Tabla y código', pasos: 'uno',
      campos: [KT, TT, ['cuerpo', 'area', 'Párrafo'], ['tabla', 'lines', 'Tabla: "a | b | c" por línea; la primera es el encabezado'], ['codigo', 'area', 'Código (se escribe solo)'], ['nota', 'text', 'Nota al pie']],
      ejemplo: { kicker: 'Detalle', titulo: 'Cómo se *traduce*.', cuerpo: 'Cada fila, una regla.', tabla: 'Entrada | A | B\nUno | 1 | 2\nDos | 3 | 4', codigo: 'si entrada == "uno":\n  salida = 1' },
      // El panel llega con la tabla; en el punto clave siguiente se escribe el código
      render: (d, ctx) => {
        const uno = modo(d, 'uno') === 'uno', s1 = (at) => (uno ? `data-s="1" data-at="${at}"` : `data-at="${f2(at + 1.6)}"`);
        const [head, ...rows] = lines(d.tabla).map((l) => l.split('|').map((x) => x.trim()));
        const n = Math.max(1, head?.length || 1), cols = `style="grid-template-columns:1.2fr repeat(${n - 1}, 1fr)"`;
        return `${numeral(ctx)}
        <div class="pad">${kicker(d)}${titulo(d, 0.12, 'md')}
          ${d.cuerpo ? `<p class="body" data-f="cuerpo" data-m="up" data-at=".6">${md(d.cuerpo)}</p>` : ''}
          <div class="two">
            <div class="maprows">
              ${head ? `<div class="mhead" ${cols} data-m="fade" data-at=".9">${head.map((h) => `<span>${esc(h)}</span>`).join('')}</div>` : ''}
              ${rows.map((r, i) => `
              <div class="pt mrow" ${cols} data-f="tabla" data-k="item-${i}" data-shape="bar" data-m="left" data-at="${f2(1.05 + i * 0.16)}">${Array.from({ length: n }, (_, j) => `<span>${esc(r[j] || '')}</span>`).join('')}</div>`).join('')}
            </div>
            <pre class="code" data-f="codigo" data-k="hero" data-shape="box" data-m="up" data-at="1"><code data-m="type" ${s1(0.15)} data-dur="2.6">${esc(d.codigo)}</code></pre>
          </div>
          ${d.nota ? `<p class="foot-note" data-f="nota" data-m="fade" ${s1(1.4)}>${md(d.nota)}</p>` : ''}
        </div>`;
      },
    },

    columnas: {
      nombre: 'Dos columnas comparadas', pasos: 'uno',
      campos: [KT, TT, ['izqTitulo', 'text', 'Título izquierda'], ['izq', 'lines', 'Puntos izquierda'], ['derTitulo', 'text', 'Título derecha'], ['der', 'lines', 'Puntos derecha'],
        ['monitorTitulo', 'text', 'Título del monitor (vacío = sin monitor)'], ['monitor', 'lines', 'Líneas del monitor (pasan en bucle)']],
      ejemplo: { kicker: 'Dos modos', titulo: 'Así o *asá*.', izqTitulo: 'Modo A', izq: 'Una ventaja.\nOtra ventaja.', derTitulo: 'Modo B', der: 'Una ventaja.\nOtra ventaja.' },
      render: (d, ctx) => `${numeral(ctx)}
        <div class="pad">${kicker(d)}${titulo(d)}
          <div class="two even">
            <div class="col-card" data-f="izq" data-k="item-0" data-shape="box" data-m="left" data-at=".6"><h3>${md(d.izqTitulo)}</h3><ul class="bullets">${lines(d.izq).map((p) => `<li>${md(p)}</li>`).join('')}</ul></div>
            <div class="col-card" data-f="der" data-k="item-1" data-shape="box" data-m="right" ${modo(d, 'uno') === 'uno' ? 'data-s="1" data-at=".1"' : 'data-at="1"'}><h3>${md(d.derTitulo)}</h3><ul class="bullets">${lines(d.der).map((p) => `<li>${md(p)}</li>`).join('')}</ul>
              ${d.monitorTitulo ? `<div class="monitor" data-f="monitor"><small>${md(d.monitorTitulo)}</small><pre data-lines="${esc(JSON.stringify(lines(d.monitor)))}"></pre></div>` : ''}</div>
          </div>
        </div>`,
      // El monitor muestra las últimas cuatro líneas, una nueva cada ~0,45 s
      tick(root, t) {
        const pre = root.querySelector('.monitor pre');
        if (!pre) return;
        const L = (pre._l ??= JSON.parse(pre.dataset.lines || '[]'));
        if (!L.length) return;
        const k = Math.floor(t * 2.2), rows = [];
        for (let i = Math.max(0, k - 3); i <= k; i++) rows.push(L[i % L.length]);
        pre.textContent = rows.join('\n');
      },
    },

    cifra: {
      nombre: 'Cifra y barras',
      campos: [KT, TT, ['prefijo', 'text', 'Antes del número (≈, +, $…)'], ['numero', 'text', 'Número'], ['unidad', 'text', 'Unidad (%, x, k…)'], ['texto', 'area', 'Texto'],
        ['barras', 'pairs', 'Barras: "etiqueta | valor de 0 a 100" por línea'], ['unidadBarras', 'text', 'Unidad de las barras'], ['nota', 'text', 'Nota']],
      ejemplo: { kicker: 'Un dato', titulo: 'El número que *importa*.', numero: '40', unidad: '%', texto: 'menos que la alternativa.', barras: 'Alternativa | 100\nNosotros | 60', unidadBarras: '%' },
      render: (d) => `
        <div class="pad">${kicker(d)}${titulo(d)}
          <div class="two">
            <div><div class="figure" data-f="numero" data-m="pop" data-at=".6" data-dur="1.1">${esc(d.prefijo)}<span data-m="count" data-at=".7" data-dur="1.6" data-to="${esc(d.numero)}">0</span><small>${esc(d.unidad)}</small></div>
              <p class="body" data-f="texto" data-m="up" data-at="1.1">${md(d.texto)}</p></div>
            <div class="bars-card" data-f="barras" data-k="hero" data-shape="box" data-m="up" data-at=".8">${pairs(d.barras).map((b, i) => `
              <div class="bar"><div class="bl"><span>${esc(b.t)}</span><span>${esc(b.d)} ${esc(d.unidadBarras ?? '%')}</span></div>
                <div class="track"><i data-m="wipe" data-at="${f2(1.2 + i * 0.35)}" data-dur="1.3" style="width:${Math.min(100, parseFloat(b.d) || 0)}%"></i></div></div>`).join('')}
              ${d.nota ? `<p class="bnote" data-f="nota" data-m="fade" data-at="2.2">${md(d.nota)}</p>` : ''}
            </div>
          </div>
        </div>`,
    },

    video: {
      nombre: 'Video',
      campos: [KT, TT, ['video', 'video', 'Video'], ['imagen', 'image', 'Póster (cuadro antes de reproducir)']],
      ejemplo: { kicker: 'Demostración', titulo: 'Así *funciona*.' },
      render: (d) => `
        <div class="pad center">${kicker(d)}${titulo(d, 0.12, 'md')}
          <div class="player" data-f="video" data-k="hero" data-shape="box" data-m="pop" data-at=".5" data-dur="1"><video src="${esc(d.video)}" poster="${esc(d.imagen)}" preload="metadata" playsinline controls></video></div>
        </div>`,
      // En el punto clave arranca el video; al moverse, se detiene
      onHold(root) { const v = root.querySelector('video'); if (v && v.currentSrc) v.play().catch(() => {}); },
      onLeave(root) { const v = root.querySelector('video'); if (v) v.pause(); },
    },

    cita: {
      nombre: 'Cita',
      campos: [['texto', 'area', 'Cita (*palabra* en acento)'], ['autor', 'text', 'Quién lo dice'], ['rol', 'text', 'Rol o fuente']],
      ejemplo: { texto: 'Una frase que valga la pena *repetir*.', autor: 'Alguien', rol: 'Rol' },
      render: (d) => `
        <div class="quote">
          <div class="mark" data-m="pop" data-dur="1">“</div>
          <blockquote data-f="texto" data-k="titulo" data-m="words" data-at=".35" data-stagger=".05">${md(d.texto)}</blockquote>
          <div class="who" data-f="autor" data-m="left" data-at="1.4"><i></i><b>${esc(d.autor)}</b><span>${esc(d.rol)}</span></div>
        </div>`,
    },

    cierre: {
      nombre: 'Cierre', pasos: 'uno', conLogo: true,
      campos: [KT, TT, ['puntos', 'lines', 'Conclusiones (una por línea)'], ['final', 'text', 'Frase final'], ['autores', 'text', 'Autores'], ['contexto', 'text', 'Contexto']],
      ejemplo: { kicker: 'Conclusiones', titulo: 'Lo que nos *llevamos*.', puntos: 'Una.\nOtra.', final: '¿Preguntas?' },
      // Conclusiones primero; el logo y la frase final en el punto clave siguiente
      render: (d, ctx) => {
        const s = (at) => (modo(d, 'uno') === 'uno' ? `data-s="1" data-at="${at}"` : `data-at="${f2(at + 1.6)}"`);
        return `
        <div class="split2">
          <div>${kicker(d)}${titulo(d, 0.12, 'md')}
            <ol class="points sm">${lines(d.puntos).map((p, i) => `
              <li class="pt" data-f="puntos" data-k="item-${i}" data-shape="bar" data-m="left" data-at="${f2(0.7 + i * 0.2)}"><span class="num">${nn(i + 1)}</span><span>${md(p)}</span></li>`).join('')}
            </ol>
          </div>
          <div class="closing">
            <div class="cl-logo" data-f="logo" data-m="pop" data-dur="1.2" ${s(0.1)}>${ctx.logo('big')}</div>
            <div class="final" data-f="final" data-m="letters" ${s(0.5)}>${md(d.final)}</div>
            <div class="meta" data-f="autores" data-m="up" ${s(1)}><b>${esc(d.autores)}</b><span>${esc(d.contexto)}</span></div>
          </div>
        </div>`;
      },
    },
  };

  // El indicador de "señales" viaja en un data-attribute (tick no recibe los datos)
  const senalesRender = TIPOS.senales.render;
  TIPOS.senales.render = (d, ctx) => senalesRender(d, ctx).replace('class="scope-card"', `class="scope-card" data-ind="${esc(d.indicador || 'sube ▲ | baja ▼')}"`);

  window.MOTION = { TIPOS, helpers: { kicker, titulo, numeral, lista, modo, f2 } };
})();
