// Hoja de ruta: la presentación, momento a momento, como póster. Sale de las escenas (las que
// están activas, en orden) y de sus notas del presentador; las de anexo van aparte. Así sigue
// al contenido: si cambia la presentación, cambia la hoja. Lo que se cambia en el panel se
// guarda como estado (proyecto/estado/ruta-cfg.json o el navegador) y viaja en el comando de
// exportación (#cfg=…), igual que poster/index.html. Los valores por defecto salen de PROYECTO.ruta.
//
// Qué lee de cada escena:
//   titulo · kicker      el nombre del momento (`ruta`, si la escena lo tiene, manda sobre el título)
//   notas                «lo que se dice» entre comillas angulares; lo demás es lo que pasa en escena;
//                        un (→) o (→ comentario) es un avance dentro de la escena
//   anexo: true          la escena es de anexo (para las preguntas): va en el recuadro de abajo
//
// Caras: el póster puede ser de dos (o más) lados. La de adelante es la ruta; las demás las
// pone el proyecto con window.RUTA_CARAS (en proyecto/tipos.js), cada una así:
//   { id, nombre, campos?, css?, render({ U, P, cfg, escenas }) → HTML | null }
// `campos` suma parámetros al panel (mismo formato que el esquema de abajo), `css` va con la
// página (conviene acotarlo con .poster[data-cara="id"]) y `render` devuelve el contenido de la
// cara (o null si no corresponde: la cara no se muestra). En el editor se elige con la barra de
// arriba; al exportar salen todas (un PNG por hoja y un PDF con una página por hoja).
//
// Hojas: cada cara es un A1 vertical y la hoja es el papel del formato elegido. «Impresión en la hoja»
// decide cuántas copias entran en cada hoja (1, 2, 4, 6, 8…: la rejilla y la orientación se eligen solas para
// que queden lo más grandes posible), con margen, separación y líneas de corte; y si la hoja repite una sola
// cara o mezcla frente y dorso. La vista «En la hoja» del editor, el PNG, el PDF y Ctrl+P salen del mismo
// armado (plano()).
(function () {
  const U = window.TRAMOYA, P = window.PROYECTO, PR = P.ruta || {};
  const $ = (id) => document.getElementById(id);
  document.title = `${U.plain(P.nombre)} — Hoja de ruta`;

  // A1 en px CSS; los demás formatos A son el mismo diseño a otra escala
  const FORMATOS = { A0: [841, 1189], A1: [594, 841], A2: [420, 594], A3: [297, 420], A4: [210, 297] };
  const W = 2245, H = 3179;

  const COPIAS = [1, 2, 4, 6, 8, 9, 12, 16]; // copias por hoja que ofrece el panel
  const SCHEMA = [
    { group: 'Formato y color' },
    { key: 'formato', label: 'Formato de exportación', type: 'select', options: Object.keys(FORMATOS), def: PR.formato || 'A1', hint: 'Todos los A tienen la misma proporción: cambia la escala del PNG y del PDF, no el diseño.' },
    { key: 'tema', label: 'Tema', type: 'select', options: Object.fromEntries(Object.entries(P.temas).map(([k, t]) => [k, t.nombre || k])), def: PR.tema || P.estilo?.tema || Object.keys(P.temas)[0] },
    { group: 'Impresión en la hoja' },
    { key: 'porHoja', label: 'Copias por hoja', type: 'select', options: Object.fromEntries(COPIAS.map((n) => [String(n), n === 1 ? '1 (una sola)' : String(n)])), def: String(PR.porHoja || 1), hint: 'Cuántas copias de la cara entran en cada hoja del formato elegido (el papel). Con 2 o 4, por ejemplo, se imprime la hoja y se corta. Se acomodan solas para quedar lo más grandes posible; en la barra de arriba, junto a «En la hoja», ves cuánto mide cada una.' },
    { key: 'orientacion', label: 'Orientación de la hoja', type: 'select', options: { auto: 'La que deje más grandes las copias', vertical: 'Vertical', apaisada: 'Apaisada' }, def: PR.orientacion || 'auto' },
    { key: 'hoja', label: 'Qué lleva cada hoja', type: 'select', options: { una: 'Una sola cara, repetida (frente y dorso en hojas distintas)', juntas: 'Frente y dorso mezclados en la misma hoja' }, def: PR.hoja || 'una', hint: 'Con una sola cara repetida, la hoja del dorso queda justo detrás de la del frente al imprimir de los dos lados, y al cortar cada copia tiene frente y dorso.' },
    { key: 'margen', label: 'Margen de la hoja', type: 'range', min: 0, max: 25, step: 0.5, unit: ' mm', def: PR.margen ?? 0, hint: 'Lo que queda libre alrededor. Las impresoras comunes no llegan al borde: 5 a 8 mm suelen alcanzar. En 0, una copia llena el papel.' },
    { key: 'separacion', label: 'Separación entre copias', type: 'range', min: 0, max: 40, step: 0.5, unit: ' mm', def: PR.separacion ?? 0, hint: 'Solo con más de una copia por hoja.' },
    { key: 'marcas', label: 'Líneas de corte entre las copias', type: 'check', def: PR.marcas ?? false },
    { group: 'Textos' },
    { key: 'rotulo', label: 'Rótulo', type: 'text', def: PR.rotulo || 'Hoja de ruta' },
    { key: 'titulo', label: 'Título (*palabra* en acento)', type: 'text', def: PR.titulo || P.nombre || '' },
    { key: 'bajada', label: 'Bajada', type: 'text', def: PR.bajada || 'La presentación, momento a momento.' },
    { key: 'leyenda', label: 'Cómo se maneja', type: 'text', def: PR.leyenda || '→ avanza · ← vuelve · N muestra las notas del presentador' },
    { key: 'anexoTitulo', label: 'Título del anexo', type: 'text', def: PR.anexoTitulo || 'Para las preguntas' },
    { key: 'anexoNota', label: 'Nota del anexo', type: 'text', def: PR.anexoNota || 'Escenas de apoyo: se muestran solo si hacen falta.' },
    { key: 'equipo', label: 'Equipo (al pie)', type: 'text', def: PR.equipo || P.autores || '' },
    { key: 'contexto', label: 'Contexto (al pie)', type: 'text', def: PR.contexto || P.contexto || '' },
    { group: 'Contenido' },
    { key: 'verDice', label: 'Qué se dice', type: 'check', def: true },
    { key: 'verPasa', label: 'Qué pasa en escena', type: 'check', def: true },
    { key: 'verAnexo', label: 'Escenas de anexo', type: 'check', def: true },
    { group: 'Tamaños' },
    { key: 'titSize', label: 'Tamaño del título', type: 'range', min: 90, max: 280, step: 2, def: 170, css: '--tit-size', unit: 'px' },
    { key: 'estSize', label: 'Tamaño del nombre de cada momento', type: 'range', min: 40, max: 110, step: 1, def: 62, css: '--est-size', unit: 'px' },
    { key: 'diceSize', label: 'Tamaño del texto', type: 'range', min: 22, max: 48, step: 1, def: 30, css: '--dice-size', unit: 'px' },
  ];
  // Las caras que suma el proyecto: sus parámetros van al panel, después de los de la ruta
  const CARAS = (window.RUTA_CARAS || []).filter((c) => c && c.id && c.id !== 'frente' && typeof c.render === 'function');
  CARAS.forEach((c) => (c.campos || []).forEach((f) => SCHEMA.push(f)));
  const DEFAULTS = U.panel.defaults(SCHEMA);

  let cfg = { ...DEFAULTS };
  const hash = new URLSearchParams(location.hash.slice(1)).get('cfg');
  if (hash) { try { cfg = { ...DEFAULTS, ...U.dec(hash) }; } catch (e) { console.error('cfg inválida', e); } }
  else cfg = { ...DEFAULTS, ...(U.leer('ruta-cfg') || {}) };
  cfg.tema = P.estiloPrueba && !hash ? DEFAULTS.tema : U.temaValido(cfg.tema);
  const q = new URLSearchParams(location.search);
  if (q.get('tema') && P.temas[q.get('tema')]) cfg.tema = q.get('tema');
  if (q.get('formato') && FORMATOS[q.get('formato')]) cfg.formato = q.get('formato');
  const saveCfg = () => U.guardar('ruta-cfg', U.panel.diff(cfg, DEFAULTS));

  // ---------- Las escenas y sus notas ----------
  // En render solo cuenta lo guardado en archivos; sin nada guardado, las escenas del proyecto
  const escenas = () => {
    const g = U.leer('motion');
    return (g && Array.isArray(g.escenas) ? g.escenas : window.ESCENAS || []).filter((s) => s && s.activa !== false);
  };
  const corto = (s, n) => (s.length <= n ? s : s.slice(0, n).replace(/[\s,;:.¿¡(—-]+\S*$/, '') + '…');
  const limpio = (s) => String(s || '').replace(/\s+/g, ' ').trim();
  // Notas → { dice: [tramos entre avances], pasa }. «Entre comillas» se dice; (→) avanza dentro de la
  // escena (y su comentario, si lo tiene, es una indicación); el resto es lo que pasa en escena.
  function leerNotas(notas) {
    const partes = String(notas || '').split(/\(→([^)]*)\)/); // [texto, comentario, texto, comentario, …]
    const dice = [], resto = [];
    partes.forEach((p, i) => {
      if (i % 2) { const c = limpio(p); if (c) resto.push('→ ' + c); return; }
      const citas = [...p.matchAll(/«([^»]+)»/g)].map((m) => limpio(m[1]));
      if (citas.length) dice.push(citas.join(' '));
      resto.push(p.replace(/«[^»]*»/g, ' '));
    });
    return { dice, pasa: limpio(resto.join(' ')) };
  }
  const titulo = (s) => s.ruta || s.titulo || s.kicker || '';
  const rotuloDe = (s) => (s.ruta && s.kicker ? s.kicker : s.titulo && s.kicker ? s.kicker : '');

  const poster = $('poster');
  function apply() {
    poster.dataset.theme = cfg.tema;
    U.panel.aplicarCSS(poster, SCHEMA, cfg);
    $('rotulo').textContent = cfg.rotulo;
    $('rotulo').style.display = cfg.rotulo ? '' : 'none';
    $('titulo').innerHTML = U.md(cfg.titulo, 'em');
    $('bajada').textContent = cfg.bajada;
    $('bajada').style.display = cfg.bajada ? '' : 'none';
    $('leyenda').textContent = cfg.leyenda;
    $('leyenda').style.display = cfg.leyenda ? '' : 'none';

    const todas = escenas(), ruta = todas.filter((s) => !s.anexo), anexo = todas.filter((s) => s.anexo);
    $('ruta').innerHTML = ruta.map((s, i) => {
      const { dice, pasa } = leerNotas(s.notas), k = rotuloDe(s);
      const presupuesto = Math.floor(200 / Math.max(1, dice.length));
      const habla = dice.map((d) => `«${U.esc(corto(d, presupuesto))}»`).join('<span class="fl">→</span>');
      return `<article class="est" data-part="Momento ${i + 1}">
        <div class="nodo"><b>${U.nn(i + 1)}</b></div>
        <div class="tit">${k ? `<small>${U.esc(U.plain(k))}</small>` : ''}<h2>${U.md(titulo(s), 'em')}</h2></div>
        <div class="txt">
          ${cfg.verDice && dice.length ? `<p class="dice"><span class="tag">Se dice</span>${habla}</p>` : ''}
          ${cfg.verPasa && pasa ? `<p class="pasa"><span class="tag">En escena</span>${U.esc(corto(pasa, 150))}</p>` : ''}
        </div>
      </article>`;
    }).join('');
    const hayAnexo = cfg.verAnexo && anexo.length;
    $('anexo').style.display = hayAnexo ? '' : 'none';
    $('anexoTitulo').textContent = cfg.anexoTitulo;
    $('anexoNota').textContent = cfg.anexoNota;
    $('anexoNota').style.display = cfg.anexoNota ? '' : 'none';
    $('anexoLista').innerHTML = anexo.map((s, i) => `<li><em>${U.nn(i + 1)}</em>${U.esc(U.plain(s.ruta || s.kicker || s.titulo || ''))}</li>`).join('');
    $('equipo').innerHTML = cfg.equipo ? `<b>${U.esc(cfg.equipo)}</b>` : '';
    $('contexto').textContent = cfg.contexto;
    armarCaras(todas);
  }

  // ---------- La hoja: cuántas copias entran en el papel ----------
  // Todo en px del diseño (la cara es W × H). El papel es el formato, vertical o girado; margen y separación
  // se piden en mm del papel y se pasan a px con `pxmm`. Las copias van en una rejilla de columnas × filas:
  // se prueba cada una (y cada orientación) y gana la que deja las copias más grandes. Cada copia se achica
  // (nunca se estira) para entrar en su lugar, centrada. Con margen 0 y una por hoja es la cara tal cual.
  // Con una sola cara repetida, la hoja del dorso queda justo detrás de la del frente (la rejilla es simétrica).
  const GAP_HOJAS = 60; // entre hoja y hoja en la vista del editor
  function plano() {
    const mm = FORMATOS[cfg.formato] || FORMATOS.A1;
    const n = COPIAS.includes(+cfg.porHoja) ? +cfg.porHoja : 1;
    const pxmm = W / mm[0];
    const m = (+cfg.margen || 0) * pxmm, g = (+cfg.separacion || 0) * pxmm;
    let r = null;
    for (const giro of cfg.orientacion === 'vertical' ? [false] : cfg.orientacion === 'apaisada' ? [true] : [false, true]) {
      const hw = giro ? H : W, hh = giro ? W : H;
      for (let cols = 1; cols <= n; cols++) {
        if (n % cols) continue;
        const rows = n / cols;
        const cw = Math.max(40, (hw - 2 * m - g * (cols - 1)) / cols), ch = Math.max(40, (hh - 2 * m - g * (rows - 1)) / rows);
        const s = Math.min(cw / W, ch / H);
        if (!r || s > r.s + 1e-6) r = { giro, hw, hh, cols, rows, cw, ch, s };
      }
    }
    const { hw, hh, cols, rows, cw, ch, s: sc } = r;
    const mezcla = (cfg.hoja === 'juntas' || cfg.hoja === 'lado') && caras.length > 1;
    const cortesX = Array.from({ length: cols - 1 }, (_, c) => m + (c + 1) * cw + c * g + g / 2);
    const cortesY = Array.from({ length: rows - 1 }, (_, f) => m + (f + 1) * ch + f * g + g / 2);
    const hojas = (mezcla ? [{ id: 'hoja', caras }] : caras.map((id) => ({ id, caras: [id] }))).map((h) => ({
      id: h.id, cortesX, cortesY,
      puestos: Array.from({ length: n }, (_, i) => ({ id: h.caras[i % h.caras.length], s: sc,
        x: m + (i % cols) * (cw + g) + (cw - W * sc) / 2, y: m + Math.floor(i / cols) * (ch + g) + (ch - H * sc) / 2 })),
    }));
    return { hw, hh, horizontal: r.giro, hojas, mm, n, cols, rows, copia: [W * sc / pxmm, H * sc / pxmm] };
  }
  // Cuánto mide cada copia en el papel, para ajustar sin adivinar
  function infoHoja() {
    const pl = plano(), [a, b] = pl.copia.map((v) => Math.round(v));
    return `<span class="info">${pl.n === 1 ? 'Una por hoja' : `${pl.n} por hoja (${pl.cols} × ${pl.rows})`} · ${pl.horizontal ? 'apaisada' : 'vertical'} · cada copia ${a} × ${b} mm</span>`;
  }
  let hojasPlano = null;
  function armarHojas() {
    const pl = hojasPlano = plano();
    // El tamaño y la orientación del papel para Ctrl+P (render/poster.mjs los pide por su cuenta)
    $('paginaCss').textContent = `@page{size:${(pl.hw * 25.4 / 96).toFixed(1)}mm ${(pl.hh * 25.4 / 96).toFixed(1)}mm; margin:0}`;
    // Una copia de cada cara en su lugar (los id se renombran para que no choquen con los de la cara original)
    const copia = (id) => {
      const src = document.querySelector(`.poster-wrap[data-cara-wrap="${id}"] .poster`);
      return src ? src.outerHTML.replace(/\bid="([^"]+)"/g, 'id="$1-h"').replace(/url\(#([^)]+)\)/g, 'url(#$1-h)').replace(/href="#([^"]+)"/g, 'href="#$1-h"') : '';
    };
    $('hojas').innerHTML = pl.hojas.map((h) => `<div class="hoja" data-hoja="${h.id}" style="width:${pl.hw}px; height:${pl.hh}px">`
      + h.puestos.map((p) => `<div class="puesto" style="left:${p.x}px; top:${p.y}px; width:${W}px; height:${H}px; transform:scale(${p.s})">${copia(p.id)}</div>`).join('')
      + (cfg.marcas ? h.cortesX.map((x) => `<i class="corte" style="left:${x}px"></i>`).join('') + h.cortesY.map((y) => `<i class="corte h" style="top:${y}px"></i>`).join('') : '')
      + '</div>').join('');
  }

  // ---------- Las demás caras (las pone el proyecto) ----------
  let caras = ['frente'], nombres = { frente: 'Frente' }, caraActual = 'frente';
  function armarCaras(todas) {
    caras = ['frente']; nombres = { frente: 'Frente' };
    CARAS.forEach((c) => {
      let html = null;
      try { html = c.render({ U, P, cfg, escenas: todas }); } catch (e) { console.error(`Cara «${c.id}»:`, e); }
      let wrap = document.querySelector(`[data-cara-wrap="${c.id}"]`);
      if (html == null) { wrap?.remove(); return; }
      if (!wrap) {
        wrap = document.createElement('div');
        wrap.className = 'poster-wrap'; wrap.dataset.caraWrap = c.id;
        wrap.innerHTML = `<div class="poster" data-cara="${c.id}"></div><div class="pins"></div>`;
        $('scaler').appendChild(wrap);
      }
      const p = wrap.querySelector('.poster');
      p.dataset.theme = cfg.tema;
      U.panel.aplicarCSS(p, SCHEMA, cfg);
      p.innerHTML = html;
      caras.push(c.id); nombres[c.id] = c.nombre || c.id;
    });
    $('carasCss').textContent = CARAS.map((c) => c.css || '').join('\n');
    const bar = $('carasBar');
    bar.hidden = false;
    bar.innerHTML = caras.map((id) => `<button data-cara="${id}">${U.esc(nombres[id])}</button>`).join('') + '<button data-cara="hoja" title="Cómo salen las caras en el papel (Impresión en la hoja)">En la hoja</button>' + infoHoja();
    bar.querySelectorAll('button').forEach((b) => (b.onclick = () => mostrarCara(b.dataset.cara)));
    armarHojas();
    mostrarCara(caras.includes(caraActual) || caraActual === 'hoja' ? caraActual : 'frente');
  }
  function mostrarCara(id) {
    caraActual = id;
    document.body.classList.toggle('vista-hoja', id === 'hoja');
    document.querySelectorAll('.poster-wrap').forEach((w) => w.classList.toggle('on', w.dataset.caraWrap === id));
    document.querySelectorAll('#carasBar button').forEach((b) => b.classList.toggle('on', b.dataset.cara === id));
    if (typeof applyScale === 'function') applyScale();
  }

  const panel = U.panel({ contenedor: $('form'), schema: SCHEMA, cfg, alCambiar: () => { apply(); saveCfg(); } });

  $('btnReset').onclick = () => { if (!confirm('¿Volver a los valores por defecto?')) return; Object.keys(cfg).forEach((k) => delete cfg[k]); Object.assign(cfg, DEFAULTS); saveCfg(); apply(); panel.armar(); };
  $('btnExportCmd').onclick = () => {
    const d = U.panel.diff(cfg, DEFAULTS);
    U.copiar('node render/poster.mjs --pagina ruta' + (Object.keys(d).length ? ' ' + U.enc(d) : ''), 'Comando copiado. Pegalo en la terminal, en la raíz del repo.');
  };
  $('btnJson').onclick = () => U.copiar(JSON.stringify(U.panel.diff(cfg, DEFAULTS), null, 2), 'JSON copiado (solo lo que cambiaste).');
  document.querySelectorAll('.tabs button').forEach((b) => b.onclick = () => {
    document.querySelectorAll('.tabs button').forEach((x) => x.classList.toggle('on', x === b));
    document.querySelectorAll('.tab').forEach((t) => t.classList.toggle('on', t.id === 'tab-' + b.dataset.tab));
  });

  // ---------- Escala en pantalla ----------
  if (q.has('export')) document.body.classList.add('export');
  const viewport = $('viewport'), scaler = $('scaler');
  let scale = 1, ajustar = true;
  function applyScale() {
    if (document.body.classList.contains('export')) return;
    // Una cara es W × H; la vista «En la hoja» son las hojas una al lado de la otra
    const n = hojasPlano ? hojasPlano.hojas.length : 1;
    const dw = caraActual === 'hoja' && hojasPlano ? n * hojasPlano.hw + (n - 1) * GAP_HOJAS : W, dh = caraActual === 'hoja' && hojasPlano ? hojasPlano.hh : H;
    if (ajustar) {
      const s = getComputedStyle(viewport);
      scale = Math.min((viewport.clientWidth - parseFloat(s.paddingLeft) - parseFloat(s.paddingRight)) / dw, (viewport.clientHeight - parseFloat(s.paddingTop) - parseFloat(s.paddingBottom)) / dh);
    }
    scaler.style.transform = `scale(${scale})`;
    scaler.style.width = dw * scale + 'px'; scaler.style.height = dh * scale + 'px';
  }
  addEventListener('resize', applyScale);
  $('btnFit').onclick = () => { ajustar = true; applyScale(); };
  $('btnFull').onclick = () => { ajustar = false; scale = 1; applyScale(); };

  // ---------- Observaciones: marcas sobre el póster, para pegar en el chat ----------
  let obs = U.leer('ruta-obs') || [], activa = null;
  const saveObs = () => U.guardar('ruta-obs', obs);
  const toggleObs = () => { document.body.classList.toggle('obs-mode'); $('btnObs').classList.toggle('on', document.body.classList.contains('obs-mode')); };
  $('btnObs').onclick = toggleObs;
  document.addEventListener('keydown', (e) => { if (!e.target.closest('input, textarea, select') && /^[oO]$/.test(e.key)) toggleObs(); });
  $('scaler').addEventListener('click', (e) => {
    if (!document.body.classList.contains('obs-mode') || e.target.classList.contains('pin')) return;
    const wrap = e.target.closest('.poster-wrap'); if (!wrap) return;
    const r = wrap.querySelector('.poster').getBoundingClientRect(), x = (e.clientX - r.left) / r.width, y = (e.clientY - r.top) / r.height;
    const part = document.elementsFromPoint(e.clientX, e.clientY).map((el) => el.closest?.('[data-part]')).find(Boolean);
    const id = Date.now();
    obs.push({ id, cara: wrap.dataset.caraWrap, x, y, part: part ? part.dataset.part : 'Fondo', text: '' });
    activa = id; saveObs(); renderObs();
    document.querySelector(`.item[data-id="${id}"] textarea`)?.focus();
  });
  function renderObs() {
    const list = $('list');
    document.querySelectorAll('.poster-wrap .pins').forEach((p) => (p.innerHTML = ''));
    list.innerHTML = obs.length ? '' : '<p class="hint" style="padding:0">Todavía no hay observaciones.</p>';
    obs.forEach((o, i) => {
      const p = document.createElement('div');
      p.className = 'pin' + (o.id === activa ? ' active' : '') + (o.hecho ? ' hecho' : '');
      p.style.left = o.x * 100 + '%'; p.style.top = o.y * 100 + '%'; p.textContent = i + 1;
      p.onclick = () => { activa = o.id; renderObs(); document.querySelector(`.item[data-id="${o.id}"] textarea`).focus(); };
      document.querySelector(`[data-cara-wrap="${o.cara || 'frente'}"] .pins`)?.appendChild(p);
      const it = document.createElement('div');
      it.className = 'item' + (o.id === activa ? ' active' : '') + (o.hecho ? ' hecho' : ''); it.dataset.id = o.id;
      it.innerHTML = `<div class="meta"><span><span class="num">#${i + 1}</span> · ${caras.length > 1 ? U.esc(nombres[o.cara || 'frente'] || o.cara) + ' · ' : ''}${U.esc(o.part)}</span><span><button class="ok" title="Marcar como resuelta">${o.hecho ? '↺ Reabrir' : '✓ Hecha'}</button><button class="del">Borrar</button></span></div><textarea placeholder="¿Qué cambiarías acá?"></textarea>`;
      it.querySelector('.ok').onclick = () => { o.hecho = !o.hecho; saveObs(); renderObs(); };
      const ta = it.querySelector('textarea');
      ta.value = o.text;
      ta.oninput = () => { o.text = ta.value; saveObs(); };
      it.querySelector('.del').onclick = () => { obs = obs.filter((x) => x.id !== o.id); saveObs(); renderObs(); };
      list.appendChild(it);
    });
  }
  $('btnCopy').onclick = () => {
    if (!obs.length) return U.toast('No hay observaciones');
    U.copiar(`Observaciones de la hoja de ruta · ${U.plain(P.nombre)}:\n` + obs.filter((o) => !o.hecho).map((o, i) => `${i + 1}. [${caras.length > 1 ? (nombres[o.cara || 'frente'] || o.cara) + ' · ' : ''}${o.part} · x ${Math.round(o.x * 100)} %, y ${Math.round(o.y * 100)} %] ${o.text || '(sin texto)'}`).join('\n'), 'Observaciones copiadas');
  };
  $('btnClear').onclick = () => { if (obs.length && confirm('¿Borrar todas las observaciones?')) { obs = []; saveObs(); renderObs(); } };

  // ---------- Contrato con render/poster.mjs ----------
  // hojas(): una por página del PDF (y por PNG); horizontal(): si el papel va girado (caras lado a lado)
  window.POSTER = { ancho: W, alto: H, mm: () => FORMATOS[cfg.formato] || FORMATOS.A1, formato: () => cfg.formato, archivo: 'hoja-de-ruta', caras: () => caras,
    hojas: () => plano().hojas.map((h) => h.id), horizontal: () => plano().horizontal };
  window.ready = U.fuentesListas().then(() => { apply(); renderObs(); applyScale(); return true; });
})();
