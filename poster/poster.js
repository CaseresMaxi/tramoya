// Póster: parámetros, exportación y observaciones. Los valores por defecto salen de
// PROYECTO.poster; lo que se cambia en el panel se guarda en el navegador y viaja en el
// comando de exportación (base64url en el hash: #cfg=…).
(function () {
  const U = window.TRAMOYA, P = window.PROYECTO, M = U.marca, PP = P.poster || {};
  const $ = (id) => document.getElementById(id);
  const MANI = window.MANIFIESTO || { imagenes: [], logos: [] };
  document.title = `${U.plain(P.nombre)} — Póster`;

  // A1 en px CSS; los demás formatos A son el mismo diseño a otra escala
  const FORMATOS = { A0: [841, 1189], A1: [594, 841], A2: [420, 594], A3: [297, 420], A4: [210, 297] };
  const W = 2245, H = 3179;
  const imagenes = () => ['', ...MANI.imagenes];
  const logos = () => Object.fromEntries([['tema', 'Según el tema'], ['editor', 'Último diseño del editor de marca'], ...Object.entries(M.variantes()).map(([k, v]) => [k, v.nombre || k])]);

  const SCHEMA = [
    { group: 'Formato y color' },
    { key: 'formato', label: 'Formato de exportación', type: 'select', options: Object.keys(FORMATOS), def: PP.formato || 'A1', hint: 'Todos los A tienen la misma proporción: cambia la escala del PNG y del PDF, no el diseño.' },
    { key: 'tema', label: 'Tema', type: 'select', options: Object.fromEntries(Object.entries(P.temas).map(([k, t]) => [k, t.nombre || k])), def: PP.tema || P.estilo?.tema || Object.keys(P.temas)[0] },
    { key: 'logo', label: 'Logo', type: 'select', options: logos, def: 'tema' },
    { group: 'Marco del evento' },
    { key: 'evento', label: 'Nombre del evento', type: 'text', def: PP.evento || '' },
    { key: 'edicion', label: 'Edición (texto vertical)', type: 'text', def: PP.edicion || '' },
    { key: 'anio', label: 'Año (al pie)', type: 'text', def: PP.anio || '' },
    { key: 'logosInst', label: 'Logos institucionales (rutas, uno por línea)', type: 'textarea', def: (PP.logos || []).join('\n'), hint: 'Por ejemplo ../proyecto/assets/img/institucion.png, mejor con fondo transparente.' },
    { group: 'Textos' },
    { key: 'frase', label: 'Frase principal (*palabra* en itálica y color)', type: 'textarea', def: PP.frase || '' },
    { key: 'bajada', label: 'Bajada', type: 'text', def: PP.bajada || '' },
    { key: 'atributos', label: 'Atributos (separados por coma)', type: 'text', def: PP.atributos || '' },
    { key: 'equipo', label: 'Equipo', type: 'text', def: PP.equipo || P.autores || '' },
    { key: 'docentes', label: 'Docentes o tutores (vacío = no se muestra)', type: 'textarea', def: PP.docentes || '' },
    { group: 'QR' },
    { key: 'qrUrl', label: 'Link del QR (vacío = sin QR)', type: 'url', def: PP.qrUrl || '' },
    { key: 'qrTitulo', label: 'Título junto al QR', type: 'text', def: PP.qrTitulo || '' },
    { key: 'qrSub', label: 'Texto junto al QR', type: 'text', def: PP.qrSub || '' },
    { group: 'Foto' },
    { key: 'foto', label: 'Imagen', type: 'select', options: () => Object.fromEntries(imagenes().map((u) => [u, u ? u.split('/').pop() : '— sin foto —'])), def: PP.foto || '' },
    { key: 'fotoZoom', label: 'Zoom', type: 'range', min: 1, max: 2.5, step: 0.01, def: 1, css: '--hero-zoom', unit: '' },
    { key: 'fotoX', label: 'Encuadre horizontal', type: 'range', min: 0, max: 100, step: 1, def: 50, css: '--hero-x', unit: '%' },
    { key: 'fotoY', label: 'Encuadre vertical', type: 'range', min: 0, max: 100, step: 1, def: 50, css: '--hero-y', unit: '%' },
    { key: 'fotoTop', label: 'Posición de la foto', type: 'range', min: 450, max: 1400, step: 5, def: 900, css: '--hero-top', unit: 'px' },
    { key: 'fotoAlto', label: 'Alto de la foto', type: 'range', min: 600, max: 2200, step: 10, def: 1400, css: '--hero-h', unit: 'px' },
    { group: 'Tamaños y posiciones' },
    { key: 'eventoSize', label: 'Tamaño del nombre del evento', type: 'range', min: 50, max: 160, step: 2, def: 104, css: '--evento-size', unit: 'px' },
    { key: 'eventoAncho', label: 'Ancho del marco del evento', type: 'range', min: 500, max: 1800, step: 10, def: 900, css: '--evento-w', unit: 'px' },
    { key: 'logoTop', label: 'Posición del logo', type: 'range', min: 470, max: 1200, step: 5, def: 560, css: '--lockup-top', unit: 'px' },
    { key: 'logoAlto', label: 'Alto del logo', type: 'range', min: 100, max: 700, step: 5, def: 300, css: '--logo-alto', unit: 'px' },
    { key: 'fraseTop', label: 'Posición de la frase', type: 'range', min: 1200, max: 2700, step: 5, def: 2150, css: '--claim-top', unit: 'px' },
    { key: 'fraseSize', label: 'Tamaño de la frase', type: 'range', min: 80, max: 260, step: 2, def: 168, css: '--claim-size', unit: 'px' },
    { key: 'bajadaSize', label: 'Tamaño de la bajada', type: 'range', min: 30, max: 110, step: 1, def: 60, css: '--lead-size', unit: 'px' },
    { key: 'atributosTop', label: 'Posición de los atributos', type: 'range', min: 1800, max: 2850, step: 5, def: 2680, css: '--pillars-top', unit: 'px' },
    { key: 'atributosSize', label: 'Tamaño de los atributos', type: 'range', min: 24, max: 80, step: 1, def: 40, css: '--pillars-size', unit: 'px' },
    { key: 'equipoTop', label: 'Posición de equipo y QR', type: 'range', min: 2500, max: 2850, step: 5, def: 2800, css: '--credits-top', unit: 'px' },
    { group: 'Visibilidad' },
    { key: 'verMarco', label: 'Marco del evento y año', type: 'check', def: true },
    { key: 'verAtributos', label: 'Atributos', type: 'check', def: true },
    { key: 'verEquipo', label: 'Equipo', type: 'check', def: true },
  ];
  const DEFAULTS = U.panel.defaults(SCHEMA);

  let cfg = { ...DEFAULTS };
  const hash = new URLSearchParams(location.hash.slice(1)).get('cfg');
  if (hash) { try { cfg = { ...DEFAULTS, ...U.dec(hash) }; } catch (e) { console.error('cfg inválida', e); } }
  else cfg = { ...DEFAULTS, ...(U.leer('poster-cfg') || {}) };
  const q = new URLSearchParams(location.search);
  if (q.get('formato') && FORMATOS[q.get('formato')]) cfg.formato = q.get('formato');
  const saveCfg = () => U.guardar('poster-cfg', U.panel.diff(cfg, DEFAULTS));

  const poster = $('poster');
  function apply() {
    poster.dataset.theme = cfg.tema;
    U.panel.aplicarCSS(poster, SCHEMA, cfg);
    // Logo: el SVG completo de la marca, con los colores de la variante elegida
    const c = M.cfgDe(cfg.logo, cfg.tema);
    $('lockup').innerHTML = M.buildSVG({ ...c, layout: c.layout === 'isotipo' || c.layout === 'palabra' ? c.layout : 'horizontal', margen: 0, lienzo: 'ajustado' }, { background: null }).svg;
    $('claim').innerHTML = U.md(cfg.frase, 'em');
    $('lead').textContent = cfg.bajada;
    $('lead').style.display = cfg.bajada ? '' : 'none';
    $('pillars').innerHTML = cfg.atributos.split(',').map((t) => t.trim()).filter(Boolean).map((t) => `<span>${U.esc(t)}</span>`).join('<i></i>');
    $('pillars').style.display = cfg.verAtributos ? '' : 'none';
    $('evento').textContent = cfg.evento;
    $('edicion').textContent = cfg.edicion;
    $('edicion').style.display = cfg.edicion ? '' : 'none';
    $('year').textContent = cfg.anio;
    ['eventoBox', 'logos'].forEach((id) => { $(id).style.display = cfg.verMarco ? '' : 'none'; });
    $('year').parentElement.style.display = cfg.verMarco && cfg.anio ? '' : 'none';
    $('logos').innerHTML = U.lines(cfg.logosInst).map((u) => `<img src="${U.esc(u)}" alt="">`).join('');
    $('team').textContent = cfg.equipo;
    // Uno por línea (o separados por coma) → separados con « · », como el equipo
    const doc = (cfg.docentes || '').split(/\n|,/).map((d) => d.trim()).filter(Boolean).join(' · ');
    $('docentes').textContent = doc ? 'Docentes: ' + doc : '';
    $('teamBlock').style.visibility = cfg.verEquipo ? '' : 'hidden';
    $('heroImg').parentElement.style.display = cfg.foto ? '' : 'none';
    if (cfg.foto) $('heroImg').src = cfg.foto;
    $('qrTitle').textContent = cfg.qrTitulo;
    $('qrSub').textContent = cfg.qrSub;
    if (cfg.qrUrl && window.qrcode) {
      const qr = qrcode(0, 'M');
      qr.addData(cfg.qrUrl); qr.make();
      $('qrCode').innerHTML = qr.createSvgTag({ cellSize: 4, margin: 0, scalable: true });
      $('qr').style.display = '';
    } else $('qr').style.display = 'none';
  }

  const panel = U.panel({ contenedor: $('form'), schema: SCHEMA, cfg, alCambiar: () => { apply(); saveCfg(); } });

  $('btnReset').onclick = () => { if (!confirm('¿Volver a los valores por defecto?')) return; Object.keys(cfg).forEach((k) => delete cfg[k]); Object.assign(cfg, DEFAULTS); saveCfg(); apply(); panel.armar(); };
  $('btnExportCmd').onclick = () => {
    const d = U.panel.diff(cfg, DEFAULTS);
    U.copiar('node render/poster.mjs' + (Object.keys(d).length ? ' ' + U.enc(d) : ''), 'Comando copiado. Pegalo en la terminal, en la raíz del repo.');
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
    if (ajustar) {
      const s = getComputedStyle(viewport);
      scale = Math.min((viewport.clientWidth - parseFloat(s.paddingLeft) - parseFloat(s.paddingRight)) / W, (viewport.clientHeight - parseFloat(s.paddingTop) - parseFloat(s.paddingBottom)) / H);
    }
    scaler.style.transform = `scale(${scale})`;
    scaler.style.width = W * scale + 'px'; scaler.style.height = H * scale + 'px';
  }
  addEventListener('resize', applyScale);
  $('btnFit').onclick = () => { ajustar = true; applyScale(); };
  $('btnFull').onclick = () => { ajustar = false; scale = 1; applyScale(); };

  // ---------- Observaciones: marcas sobre el póster, para pegar en el chat ----------
  let obs = U.leer('poster-obs') || [], activa = null;
  const saveObs = () => U.guardar('poster-obs', obs);
  const toggleObs = () => { document.body.classList.toggle('obs-mode'); $('btnObs').classList.toggle('on', document.body.classList.contains('obs-mode')); };
  $('btnObs').onclick = toggleObs;
  document.addEventListener('keydown', (e) => { if (!e.target.closest('input, textarea, select') && /^[oO]$/.test(e.key)) toggleObs(); });
  $('posterWrap').addEventListener('click', (e) => {
    if (!document.body.classList.contains('obs-mode') || e.target.classList.contains('pin')) return;
    const r = poster.getBoundingClientRect(), x = (e.clientX - r.left) / r.width, y = (e.clientY - r.top) / r.height;
    const part = document.elementsFromPoint(e.clientX, e.clientY).map((el) => el.closest?.('[data-part]')).find(Boolean);
    const id = Date.now();
    obs.push({ id, x, y, part: part ? part.dataset.part : 'Fondo', text: '' });
    activa = id; saveObs(); renderObs();
    document.querySelector(`.item[data-id="${id}"] textarea`)?.focus();
  });
  function renderObs() {
    const pins = $('pins'), list = $('list');
    pins.innerHTML = '';
    list.innerHTML = obs.length ? '' : '<p class="hint" style="padding:0">Todavía no hay observaciones.</p>';
    obs.forEach((o, i) => {
      const p = document.createElement('div');
      p.className = 'pin' + (o.id === activa ? ' active' : '');
      p.style.left = o.x * 100 + '%'; p.style.top = o.y * 100 + '%'; p.textContent = i + 1;
      p.onclick = () => { activa = o.id; renderObs(); document.querySelector(`.item[data-id="${o.id}"] textarea`).focus(); };
      pins.appendChild(p);
      const it = document.createElement('div');
      it.className = 'item' + (o.id === activa ? ' active' : ''); it.dataset.id = o.id;
      it.innerHTML = `<div class="meta"><span><span class="num">#${i + 1}</span> · ${U.esc(o.part)}</span><button class="del">Borrar</button></div><textarea placeholder="¿Qué cambiarías acá?"></textarea>`;
      const ta = it.querySelector('textarea');
      ta.value = o.text;
      ta.oninput = () => { o.text = ta.value; saveObs(); };
      it.querySelector('.del').onclick = () => { obs = obs.filter((x) => x.id !== o.id); saveObs(); renderObs(); };
      list.appendChild(it);
    });
  }
  $('btnCopy').onclick = () => {
    if (!obs.length) return U.toast('No hay observaciones');
    U.copiar(`Observaciones del póster · ${U.plain(P.nombre)}:\n` + obs.map((o, i) => `${i + 1}. [${o.part} · x ${Math.round(o.x * 100)} %, y ${Math.round(o.y * 100)} %] ${o.text || '(sin texto)'}`).join('\n'), 'Copiado: pegalo en el chat.');
  };
  $('btnClear').onclick = () => { if (obs.length && confirm('¿Borrar todas las observaciones?')) { obs = []; saveObs(); renderObs(); } };

  // ---------- Contrato con render/poster.mjs ----------
  window.POSTER = { ancho: W, alto: H, mm: () => FORMATOS[cfg.formato] || FORMATOS.A1, formato: () => cfg.formato };
  window.ready = U.fuentesListas().then(() => {
    apply(); renderObs(); applyScale();
    const img = $('heroImg');
    return cfg.foto && !img.complete ? new Promise((ok) => { img.onload = img.onerror = () => ok(true); }) : true;
  });
})();
