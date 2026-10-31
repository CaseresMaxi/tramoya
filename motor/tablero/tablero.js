// Tablero del proyecto: el entorno de trabajo en el navegador. Seis secciones (Piezas,
// Estilo, Pedidos al agente, Código, Salidas, Llevar), cada una se arma la primera vez
// que se abre. Habla con el servidor local por <raíz del proyecto>/__tramoya/*; sin
// servidor (doble clic) se abren las piezas y lo demás muestra el comando a correr.
(function () {
  const U = window.TRAMOYA, P = window.PROYECTO || {};
  const API = U.BASE ? new URL('__tramoya', U.BASE).pathname : '/__tramoya';
  const CLI = 'node herramientas/tramoya.mjs';
  const RENDER = U.RENDER;
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const esc = U.esc;
  const nodo = (html) => { const t = document.createElement('template'); t.innerHTML = html.trim(); return t.content.firstElementChild; };
  const tam = (b) => (b < 1024 ? b + ' B' : b < 1048576 ? (b / 1024).toFixed(0) + ' KB' : (b / 1048576).toFixed(1) + ' MB');
  const hace = (t) => {
    if (!t) return '';
    const s = (Date.now() - new Date(t).getTime()) / 1000;
    if (s < 60) return 'recién'; if (s < 3600) return `hace ${Math.round(s / 60)} min`; if (s < 86400) return `hace ${Math.round(s / 3600)} h`;
    return new Date(t).toLocaleDateString('es-AR', { day: 'numeric', month: 'short' });
  };
  const cmd = (c) => `<code class="cmd" title="Clic para copiar">${esc(c)}</code>`;
  document.addEventListener('click', (e) => { const c = e.target.closest('code.cmd'); if (c) U.copiar(c.textContent, 'Copiado'); });

  // Llamada a la API del proyecto: JSON o un Error con el mensaje del servidor
  async function api(ruta, op = {}) {
    const r = await fetch(`${API}/${ruta}`, op);
    const j = await r.json().catch(() => ({}));
    if (!r.ok) throw Object.assign(new Error(j.error || `Error ${r.status}`), { status: r.status, datos: j });
    return j;
  }
  const apiJSON = (ruta, metodo, cuerpo) => api(ruta, { method: metodo, headers: { 'content-type': 'application/json' }, body: JSON.stringify(cuerpo) });

  let SRV = false, INFO = null;
  const SIN_SERVIDOR = () => `<div class="aviso info"><span>Esto necesita el servidor local. En la carpeta del proyecto: doble clic en <b>Abrir estudio</b>, o ${cmd(CLI + ' estudio')}</span></div>`;

  // ---------- Identidad ----------
  document.title = `${U.plain(P.nombre || 'Proyecto')} · Tramoya`;
  $('#pid').textContent = P.id ? `${P.id}` : '';
  const temaOscuro = Object.keys(P.temas || {}).find((k) => !P.temas[k].claro) || P.estilo?.tema || Object.keys(P.temas || {})[0];
  U.fuentesListas().then(() => {
    try { $('#logo').innerHTML = U.marca.buildSVG({ ...U.marca.cfgDe(U.marca.hayEditor() ? 'editor' : 'tema', temaOscuro), layout: 'horizontal', margen: 0 }, { background: null }).svg; }
    catch (e) { $('#logo').innerHTML = `<b style="font:700 20px var(--font-display)">${esc(U.plain(P.nombre || ''))}</b>`; }
  });

  // ---------- Piezas ----------
  const PIEZAS = [
    { id: 'motion', nombre: 'Presentación', ruta: 'motion/index.html', editor: 'motion/index.html', w: 1920, h: 1080, estado: ['motion'],
      desc: 'Línea de tiempo con puntos clave, cámara y morph entre escenas. Se presenta como un video y se exporta a MP4.',
      teclas: '<kbd>E</kbd> abre el editor · <kbd>C</kbd> marca una corrección · <kbd>→</kbd> avanza',
      mini: () => (SRV ? '?render' : '?ui=0&escena=1'), t: (w) => w.CLAVES?.[0]?.v ?? 0 },
    { id: 'reel', nombre: 'Reel', ruta: 'reel/index.html', editor: 'reel/index.html?editor', w: 1920, h: 1080, estado: ['reel'],
      desc: 'Pieza corta a tempo, con música generada en código. Exportable a MP4.',
      teclas: '<kbd>E</kbd> abre la línea de tiempo editable', mini: () => '?render', t: (w) => (w.DURACION || 0) * 0.42 },
    { id: 'poster', nombre: 'Póster', ruta: 'poster/index.html', editor: 'poster/index.html', w: 2245, h: 3179, arriba: true, estado: ['poster-cfg', 'poster-obs'],
      desc: 'A1 (o cualquier A) con panel de parámetros. PNG a 300 dpi y PDF vectorial.',
      teclas: 'Panel de parámetros a la derecha · <kbd>O</kbd> marca observaciones', mini: () => (SRV ? '?render&export' : '?export') },
    { id: 'landing', nombre: 'Landing', ruta: 'landing/index.html', editor: 'landing/index.html?editar', w: 1440, h: 900, arriba: true, estado: ['landing'],
      desc: 'Una página con los mismos textos, temas y marca. Se descarga como un único .html.',
      teclas: '<kbd>E</kbd> edita los textos en el lugar', mini: () => (SRV ? '?render' : '') },
    { id: 'marca', nombre: 'Marca', ruta: 'marca/index.html', editor: 'marca/index.html', w: 1440, h: 900, logo: true, estado: ['marca-editor', 'marca-variantes'],
      desc: 'Logo paramétrico con variantes con nombre. SVG, PNG y zip.', teclas: 'La página es el editor: parámetros y variantes' },
  ];
  const editada = (p) => p.estado.some((s) => U.leer(s) != null);
  // Iframe escalado de una pieza: cubre la caja (o se ajusta adentro, con contener)
  function escalar(caja, ifr, w, h, { arriba = false, contener = false } = {}) {
    const cw = caja.clientWidth, ch = caja.clientHeight; if (!cw || !ch) return;
    const s = contener ? Math.min(cw / w, ch / h) : Math.max(cw / w, ch / h);
    ifr.style.width = w + 'px'; ifr.style.height = h + 'px';
    ifr.style.transform = `translate(${(cw - w * s) / 2}px, ${arriba && !contener ? 0 : (ch - h * s) / 2}px) scale(${s})`;
  }
  const alVer = new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) { alVer.unobserve(e.target); e.target._cargar?.(); } }), { rootMargin: '200px' });
  const miniaturas = [];
  function miniatura(caja, p) {
    if (p.logo) {
      const dibujar = () => { try { caja.innerHTML = `<div class="logo">${U.marca.buildSVG({ ...U.marca.cfgDe(U.marca.hayEditor() ? 'editor' : 'tema', temaOscuro), layout: 'vertical', margen: 0 }, { background: null }).svg}</div>`; } catch (e) { caja.innerHTML = '<div class="carga">Marca</div>'; } };
      U.fuentesListas().then(dibujar); miniaturas.push({ recargar: dibujar }); return;
    }
    caja.innerHTML = '<div class="carga">Cargando…</div>';
    caja._cargar = () => {
      const ifr = document.createElement('iframe');
      ifr.loading = 'lazy'; ifr.tabIndex = -1; ifr.setAttribute('aria-hidden', 'true'); ifr.style.opacity = 0;
      ifr.src = p.ruta + (p.mini ? p.mini() : '');
      caja.appendChild(ifr);
      const ajustar = () => escalar(caja, ifr, p.w, p.h, { arriba: p.arriba });
      ajustar(); new ResizeObserver(ajustar).observe(caja);
      ifr.onload = async () => {
        try {
          const w = ifr.contentWindow; w.TRAMOYA && (w.TRAMOYA.sinIndicador = true);
          await w.ready; if (p.t && typeof w.seek === 'function') w.seek(p.t(w));
        } catch (e) { /* sin servidor el iframe es de otro origen: queda como abrió */ }
        caja.querySelector('.carga')?.remove(); ifr.style.opacity = 1;
      };
      miniaturas.push({ recargar: () => { try { ifr.contentWindow.location.reload(); } catch (e) { ifr.src = ifr.src; } } });
    };
    alVer.observe(caja);
  }
  function secPiezas(s) {
    s.innerHTML = `
      <div class="cab"><div><h1>${esc(U.plain(P.nombre || 'Proyecto'))}</h1><p>${esc(P.descripcion || '')}</p></div>
        <div class="acc"><a class="btn" href="#codigo">Editar datos</a><a class="btn" href="#salidas">Exportar</a></div></div>
      <div id="avisoEstilo"></div>
      <div class="piezas"></div>
      <p class="nota" style="margin-top:22px">Todo lo que se edita en una pieza se guarda solo en <code>proyecto/estado/</code> (con el servidor) y manda sobre los datos de <code>proyecto/*.js</code>. Los datos y el guion se editan en <a href="#codigo">Código</a>.</p>`;
    const grid = $('.piezas', s);
    for (const p of PIEZAS) {
      const el = nodo(`<article class="pieza">
        <a class="mini" href="${p.ruta}" title="Abrir ${esc(p.nombre)}"></a>
        <div class="cuerpo">
          <div class="tit"><b>${esc(p.nombre)}</b>${editada(p) ? '<span class="chip acento" title="Tiene cambios hechos en su editor (proyecto/estado/)">editada</span>' : ''}</div>
          <p>${p.desc}</p>
          <p class="nota">${p.teclas}</p>
          <div class="acc"><a class="btn pri" href="${p.ruta}">Abrir</a>${p.editor !== p.ruta ? `<a class="btn" href="${p.editor}">Abrir el editor</a>` : ''}<a class="btn" href="${p.ruta}" target="_blank" rel="noopener">Pestaña nueva</a></div>
        </div></article>`);
      grid.appendChild(el);
      miniatura($('.mini', el), p);
    }
    avisoEstilo();
  }
  function avisoEstilo() {
    const el = $('#avisoEstilo'); if (!el) return;
    el.innerHTML = sinEstilo() ? `<div class="aviso"><span><b>Sin estilo todavía.</b> El proyecto se ve con el neutro: elegí un estilo en la galería y todas las piezas lo toman.</span><a class="btn pri" href="estilos/index.html">Elegir un estilo</a></div>` : '';
  }

  // ---------- Estilo ----------
  const sinEstilo = () => !P.estiloId || P.estiloId === 'neutro';
  function secEstilo(s) {
    const temas = Object.entries(P.temas || {});
    s.innerHTML = `
      <div class="cab"><div><h1>Estilo</h1><p>El estilo pone temas de color, tipografía, la base de la marca y el ritmo de la presentación y del reel. Se copia a <code>proyecto/estilo/</code>; lo que definan los datos del proyecto lo pisa.</p></div>
        <div class="acc"><a class="btn pri" href="estilos/index.html">Abrir la galería de estilos</a></div></div>
      ${sinEstilo() ? '<div class="aviso"><span><b>Todavía no elegiste un estilo.</b> En la galería ves cada uno aplicado a tus piezas y lo elegís con un clic.</span><a class="btn pri" href="estilos/index.html">Elegir un estilo</a></div>' : ''}
      <div class="estilo-act">
        <div>
          <span class="chip ${sinEstilo() ? '' : 'acento'}">${sinEstilo() ? 'neutro' : esc(P.estiloId)}</span>
          <div class="nom">${esc(P.estiloNombre || 'Sin estilo')}</div>
          <p class="nota">${sinEstilo() ? 'Fuentes del sistema y grises: se nota que falta elegir uno.' : `Elegido para este proyecto. Para cambiarlo: la galería, o ${cmd(CLI + ' estilo <id>')}`}</p>
          <div class="temas">${temas.map(([id, t]) => `<div class="tema" title="${esc(id)}"><div class="m" style="background:${esc(t.vars?.bg || '#111')};color:${esc(t.vars?.text || '#eee')}"><b style="font-family:var(--font-display);color:${esc(t.vars?.strong || t.vars?.text || '#fff')}">Aa</b><i><s style="background:${esc(t.vars?.accent || '#888')}"></s><s style="background:${esc(t.vars?.['accent-2'] || t.vars?.muted || '#666')}"></s><s style="background:${esc(t.vars?.panel || '#222')};outline:1px solid ${esc(t.vars?.line || '#333')}"></s></i></div><span>${esc(t.nombre || id)}${t.claro ? ' · claro' : ''}</span></div>`).join('')}</div>
        </div>
        <div class="muestra-tipo">
          <h2 style="margin-top:0">Tipografía</h2>
          <div class="d" style="font-family:var(--font-display)">${esc(U.plain(P.nombre || 'Título'))}</div>
          <p style="font-family:var(--font-body);color:var(--t-suave);margin:0 0 10px">${esc(P.descripcion || 'El texto corrido se ve así: claro, con buen interlineado.')}</p>
          <p class="nota">Títulos: <code>${esc(P.tipografia?.display || '—')}</code><br>Texto: <code>${esc(P.tipografia?.texto || '—')}</code></p>
        </div>
      </div>
      <h2>Estilos disponibles</h2>
      <div id="listaEstilos">${SRV ? '<p class="nota">Cargando…</p>' : `<p class="nota">La galería se abre igual sin servidor. Para elegir desde acá, abrí el estudio; o desde la terminal: ${cmd(CLI + ' estilos')}</p>`}</div>`;
    if (!SRV) return;
    api('galeria').then((g) => {
      const ids = [...(g.motor || []), ...(g.proyecto || []).map((x) => 'proyecto:' + x)];
      const cont = $('#listaEstilos', s);
      if (!ids.length) { cont.innerHTML = '<p class="nota">No hay estilos en la galería de este motor todavía.</p>'; return; }
      cont.innerHTML = `<div class="lista-estilos">${ids.map((id) => `<div class="est ${id === g.elegido || id === 'proyecto:' + g.elegido ? 'on' : ''}"><b>${esc(g.info?.[id]?.nombre || id.replace(/^proyecto:/, ''))}</b>${g.info?.[id]?.descripcion ? `<p class="nota" style="margin:0">${esc(g.info[id].descripcion)}</p>` : ''}${id.startsWith('proyecto:') ? '<span class="chip">propio</span>' : ''}<div class="acc"><a class="btn chico" href="motion/index.html?estilo=${encodeURIComponent(id)}" target="_blank" rel="noopener">Probar</a>${id === g.elegido ? '<span class="chip ok">elegido</span>' : `<button class="btn chico pri" data-elegir="${esc(id)}">Elegir</button>`}</div></div>`).join('')}</div>`;
      $$('[data-elegir]', cont).forEach((b) => (b.onclick = async () => {
        b.disabled = true;
        try { await apiJSON('estilo', 'PUT', { id: b.dataset.elegir }); U.toast('Estilo aplicado'); setTimeout(() => location.reload(), 400); }
        catch (e) { U.toast(e.message); b.disabled = false; }
      }));
    }).catch((e) => { $('#listaEstilos', s).innerHTML = `<div class="aviso mal">${esc(e.message)}</div>`; });
  }
  // La primera vez sin estilo, el tablero lleva a elegir uno
  function primeraVezEstilo() {
    const k = U.clave('tablero-estilo-visto');
    if (RENDER || !sinEstilo() || localStorage.getItem(k)) return;
    const v = nodo(`<div class="velo"><div class="dialogo" role="dialog" aria-modal="true">
      <h3>Primero, un estilo</h3>
      <p>Tu proyecto todavía no tiene estilo: se ve con el neutro. En la galería ves cada estilo aplicado a tus piezas (presentación, reel, póster, landing y marca) y elegís uno con un clic. Se puede cambiar cuando quieras.</p>
      <div class="acc"><button class="btn" data-x>Más tarde</button><a class="btn pri" href="estilos/index.html">Ir a la galería</a></div></div></div>`);
    const cerrar = () => { try { localStorage.setItem(k, '1'); } catch (e) {} v.remove(); };
    $('[data-x]', v).onclick = cerrar; $('a', v).addEventListener('click', () => { try { localStorage.setItem(k, '1'); } catch (e) {} });
    v.addEventListener('click', (e) => { if (e.target === v) cerrar(); });
    document.body.appendChild(v);
  }

  // ---------- Pedidos al agente ----------
  const TIPOS_PEDIDO = { general: 'General', estilo: 'Estilo', motion: 'Presentación', reel: 'Reel', poster: 'Póster', landing: 'Landing', marca: 'Marca' };
  const deRaiz = (r) => String(r || '').replace(/^\.\.\//, ''); // rutas de los datos (relativas a las piezas) → relativas al tablero
  function todosLosPendientes() {
    const out = [];
    (U.leer('pedidos', []) || []).forEach((o) => out.push({ clase: 'pedido', ...o }));
    const m = U.leer('motion');
    (m?.escenas || []).filter((x) => x.activa !== false).forEach((sc, i) => (sc.correcciones || []).forEach((x) => out.push({ clase: 'motion', escena: i + 1, ...x })));
    (U.leer('poster-obs', []) || []).forEach((o) => out.push({ clase: 'poster', ...o }));
    return out;
  }
  function contar() {
    const n = todosLosPendientes().filter((x) => !x.hecho).length;
    $('#cPedidos').textContent = n ? String(n) : '';
    $('#cEstilo').textContent = sinEstilo() ? '!' : '';
  }
  let refs = [], filtro = 'pendientes';
  function secPedidos(s) {
    s.innerHTML = `
      <div class="cab"><div><h1>Pedidos al agente</h1><p>Escribí lo que querés cambiar o agregar, con links e imágenes de referencia. El agente los lee con ${cmd('tramoya estado')} (decile «mirá los pedidos del tablero») y los marca hechos cuando termina.</p></div></div>
      ${SRV ? '' : '<div class="aviso"><span><b>Sin servidor:</b> lo que escribas queda solo en este navegador y el agente no lo ve. Abrí el estudio para que se guarde en el proyecto.</span></div>'}
      <div class="pedidos">
        <form class="form" id="fPedido">
          <label class="campo"><span>Sobre qué</span><select name="tipo">${Object.entries(TIPOS_PEDIDO).map(([k, v]) => `<option value="${k}">${v}</option>`).join('')}</select></label>
          <label class="campo"><span>Qué querés</span><textarea name="texto" rows="6" placeholder="Ej.: que la portada tenga la foto del equipo y el título más grande. Pegá capturas con Ctrl+V." required></textarea></label>
          <label class="campo"><span>Links de referencia (uno por línea)</span><textarea name="links" rows="2" placeholder="https://…"></textarea></label>
          <div class="campo"><span>Imágenes o capturas de referencia</span>
            <div class="soltar" id="soltar" tabindex="0">${SRV ? 'Arrastrá imágenes acá, pegalas (Ctrl+V) o hacé clic para elegir' : 'Subir imágenes necesita el servidor'}</div>
            <input type="file" id="fRefs" accept="image/*" multiple hidden>
            <div class="refs" id="refs"></div>
          </div>
          <button class="btn pri" type="submit">Enviar pedido</button>
        </form>
        <div>
          <div class="filtros" id="filtros"><button data-f="pendientes">Pendientes</button><button data-f="hechos">Hechos</button><button data-f="todo">Todo</button></div>
          <div class="items" id="items"></div>
        </div>
      </div>`;
    const f = $('#fPedido', s), zona = $('#soltar', s), inp = $('#fRefs', s);
    const pintarRefs = () => { $('#refs', s).innerHTML = refs.map((r, i) => `<figure class="${r.subiendo ? 'subiendo' : ''}"><img src="${esc(r.vista)}" alt=""><button type="button" data-q="${i}" title="Quitar">×</button></figure>`).join(''); };
    $('#refs', s).onclick = (e) => { const b = e.target.closest('[data-q]'); if (b) { refs.splice(+b.dataset.q, 1); pintarRefs(); } };
    async function subir(files) {
      if (!SRV) return U.toast('Subir imágenes necesita el servidor (tramoya estudio)');
      for (const file of files) {
        if (!/^image\//.test(file.type)) continue;
        if (file.size > 25 << 20) { U.toast(`${file.name}: muy pesada (máximo 25 MB)`); continue; }
        const nombre = `${new Date().toISOString().slice(0, 10)}-${Math.random().toString(36).slice(2, 6)}-${(file.name || 'captura.png').replace(/^image\./, 'captura.')}`;
        const r = { vista: URL.createObjectURL(file), subiendo: true };
        refs.push(r); pintarRefs();
        try { r.ruta = await U.subirArchivo(new File([file], nombre, { type: file.type }), 'referencias'); r.subiendo = false; }
        catch (e) { refs = refs.filter((x) => x !== r); U.toast('No se pudo subir: ' + e.message); }
        pintarRefs();
      }
    }
    zona.onclick = () => SRV && inp.click();
    zona.onkeydown = (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); zona.click(); } };
    inp.onchange = () => { subir([...inp.files]); inp.value = ''; };
    ['dragenter', 'dragover'].forEach((ev) => zona.addEventListener(ev, (e) => { e.preventDefault(); zona.classList.add('sobre'); }));
    ['dragleave', 'drop'].forEach((ev) => zona.addEventListener(ev, () => zona.classList.remove('sobre')));
    zona.addEventListener('drop', (e) => { e.preventDefault(); subir([...e.dataTransfer.files]); });
    f.addEventListener('paste', (e) => { const fs = [...(e.clipboardData?.files || [])].filter((x) => /^image\//.test(x.type)); if (fs.length) { e.preventDefault(); subir(fs); } });
    f.onsubmit = (e) => {
      e.preventDefault();
      if (refs.some((r) => r.subiendo)) return U.toast('Esperá a que terminen de subir las imágenes');
      const texto = f.texto.value.trim();
      if (!texto) return f.texto.focus();
      const pedido = { id: 'p' + Date.now().toString(36), tipo: f.tipo.value, texto, links: U.lines(f.links.value), imagenes: refs.map((r) => r.ruta).filter(Boolean), fecha: new Date().toISOString(), hecho: false };
      const lista = U.leer('pedidos', []) || [];
      lista.push(pedido); U.guardar('pedidos', lista);
      f.texto.value = ''; f.links.value = ''; refs = []; pintarRefs();
      U.toast(SRV ? 'Pedido guardado: el agente lo ve con «tramoya estado»' : 'Guardado en este navegador');
      filtro = 'pendientes'; pintarPedidos(); contar();
    };
    $('#filtros', s).onclick = (e) => { const b = e.target.closest('[data-f]'); if (b) { filtro = b.dataset.f; pintarPedidos(); } };
    pintarPedidos();
  }
  function pintarPedidos() {
    const cont = $('#items'); if (!cont) return;
    $$('#filtros button').forEach((b) => b.classList.toggle('on', b.dataset.f === filtro));
    const todos = todosLosPendientes().filter((x) => filtro === 'todo' || (filtro === 'hechos' ? x.hecho : !x.hecho));
    todos.sort((a, b) => String(b.fecha || '').localeCompare(String(a.fecha || '')));
    if (!todos.length) { cont.innerHTML = `<div class="vacio">${filtro === 'hechos' ? 'Nada marcado como hecho todavía.' : 'No hay pedidos pendientes. Las correcciones que marques en la presentación (tecla C) y las observaciones del póster (tecla O) también aparecen acá.'}</div>`; return; }
    cont.innerHTML = todos.map((x) => {
      if (x.clase === 'pedido') return `<div class="item ${x.hecho ? 'hecho' : ''}">
        <div class="linea1"><span class="chip acento">Pedido · ${esc(TIPOS_PEDIDO[x.tipo] || x.tipo || 'General')}</span>${x.hecho ? '<span class="chip ok">hecho</span>' : ''}<span class="fecha">${esc(hace(x.fecha))}</span></div>
        <div class="txt">${esc(x.texto)}</div>
        ${x.links?.length ? `<div class="links">${x.links.map((l) => `<a href="${esc(/^https?:/i.test(l) ? l : 'https://' + l)}" target="_blank" rel="noopener noreferrer">${esc(l)}</a>`).join('')}</div>` : ''}
        ${x.imagenes?.length ? `<div class="imgs">${x.imagenes.map((r) => `<a href="${esc(deRaiz(r))}" target="_blank"><img src="${esc(deRaiz(r))}" alt="" loading="lazy"></a>`).join('')}</div>` : ''}
        <div class="acc"><button class="btn chico" data-hecho="${esc(x.id)}">${x.hecho ? 'Volver a pendiente' : 'Marcar hecho'}</button><button class="btn chico mal" data-borrar="${esc(x.id)}">Borrar</button></div></div>`;
      if (x.clase === 'motion') return `<div class="item ${x.hecho ? 'hecho' : ''}">
        <div class="linea1"><span class="chip">Presentación · escena ${x.escena} · paso ${x.paso ?? '?'}</span>${x.elemento ? `<span class="chip">${esc(x.elemento)}</span>` : ''}${x.hecho ? '<span class="chip ok">hecha</span>' : ''}<span class="fecha">${x.x != null ? `(${Math.round(x.x)}, ${Math.round(x.y)})` : ''}</span></div>
        <div class="txt">${esc(x.texto || '(sin texto)')}</div>${x.cita ? `<div class="cita">«${esc(x.cita)}»</div>` : ''}
        <div class="acc"><a class="btn chico" href="motion/index.html?escena=${x.escena}&paso=${x.paso || 1}">Ver ese cuadro</a></div></div>`;
      return `<div class="item ${x.hecho ? 'hecho' : ''}">
        <div class="linea1"><span class="chip">Póster${x.part ? ' · ' + esc(x.part) : ''}</span>${x.hecho ? '<span class="chip ok">hecha</span>' : ''}<span class="fecha">${x.x != null ? `(${Math.round(x.x * 100)}%, ${Math.round(x.y * 100)}%)` : ''}</span></div>
        <div class="txt">${esc(x.text || '(sin texto)')}</div>
        <div class="acc"><a class="btn chico" href="poster/index.html">Abrir el póster</a></div></div>`;
    }).join('');
    $$('[data-hecho]', cont).forEach((b) => (b.onclick = () => { const l = U.leer('pedidos', []) || [], o = l.find((p) => p.id === b.dataset.hecho); if (o) { o.hecho = !o.hecho; U.guardar('pedidos', l); pintarPedidos(); contar(); } }));
    $$('[data-borrar]', cont).forEach((b) => (b.onclick = () => { if (!confirm('¿Borrar este pedido?')) return; U.guardar('pedidos', (U.leer('pedidos', []) || []).filter((p) => p.id !== b.dataset.borrar)); pintarPedidos(); contar(); }));
  }

  // ---------- Código ----------
  let ed = null, actual = null, archivos = [], prevPieza = 'motion', prevVisible = true, guardadoRecien = 0;
  const sucio = () => !!actual && !actual.generado && ed.texto() !== actual.original;
  const PREV = { motion: 'Presentación', reel: 'Reel', poster: 'Póster', landing: 'Landing', marca: 'Marca' };
  const piezaDeArchivo = (r) => (r === 'escenas.js' || r === 'tipos.js' || r === 'estado/motion.json' ? 'motion'
    : /^estado\/(reel|landing)\.json$/.test(r) ? r.slice(7, -5) : /^estado\/poster/.test(r) ? 'poster' : /^estado\/marca/.test(r) ? 'marca' : null);
  function secCodigo(s) {
    if (!SRV) { s.classList.remove('ancha'); s.innerHTML = `<div class="cab"><div><h1>Código</h1><p>El editor de los archivos de <code>proyecto/</code> (datos, guion, tipos propios, estado) necesita el servidor local.</p></div></div>${SIN_SERVIDOR()}<p class="nota">Mientras tanto podés editar <code>proyecto/proyecto.js</code> y <code>proyecto/escenas.js</code> con cualquier editor de texto.</p>`; return; }
    s.innerHTML = `
      <div class="cod" id="cod">
        <div class="arbol" id="arbol"><div class="raiz">proyecto/<button class="btn chico" id="bNuevoArch" title="Archivo nuevo">+</button></div><div id="arbolLista"></div></div>
        <div class="edcol">
          <div class="edbar"><span class="ruta" id="edRuta">Elegí un archivo</span>
            <button class="btn chico" id="bRecargar" title="Volver a leer del disco">Recargar</button>
            <button class="btn chico" id="bPrev">Vista previa</button>
            <button class="btn chico pri" id="bGuardar" title="Ctrl+S">Guardar</button></div>
          <div id="edAvisos"></div>
          <div id="ed"></div>
          <div class="edpie"><span id="edPos">—</span><span id="edLeng"></span><span id="edEstado"></span></div>
        </div>
        <div class="prev">
          <div class="edbar"><span class="ruta">Vista previa</span><select id="prevPieza" style="width:auto">${Object.entries(PREV).map(([k, v]) => `<option value="${k}">${v}</option>`).join('')}</select><a class="btn chico" id="prevAbrir" target="_blank" rel="noopener">Abrir</a></div>
          <div class="marco" id="marco"><iframe id="prevIfr" title="Vista previa"></iframe></div>
        </div>
      </div>`;
    const zona = $('#ed', s); zona.style.flex = '1'; zona.style.minHeight = '0';
    ed = EditorCodigo.crear(zona, {
      alCambiar: () => estadoEd(),
      alGuardar: () => guardarArchivo(),
      alMover: ({ linea, columna }) => { $('#edPos').textContent = `línea ${linea}, col ${columna}`; },
    });
    zona.insertAdjacentHTML('beforeend', '<div class="vacio-ed" id="edVacio">Elegí un archivo de la izquierda.<br><span class="nota">Los datos del proyecto están en proyecto.js; el guion de la presentación, en escenas.js.</span></div>');
    $('#bGuardar').onclick = () => guardarArchivo();
    $('#bRecargar').onclick = () => actual && abrirArchivo(actual.ruta, { forzar: true });
    $('#bPrev').onclick = () => { prevVisible = !prevVisible; $('#cod').classList.toggle('sin-prev', !prevVisible); $('#bPrev').classList.toggle('on', prevVisible); if (prevVisible) recargarPrev(); else $('#prevIfr').src = 'about:blank'; };
    $('#bPrev').classList.toggle('on', prevVisible);
    $('#prevPieza').onchange = (e) => { prevPieza = e.target.value; recargarPrev(); };
    $('#bNuevoArch').onclick = async () => {
      const r = prompt('Ruta del archivo nuevo dentro de proyecto/ (por ejemplo: notas.md, estilos/mio/estilo.js):');
      if (!r) return;
      try { await api(`archivo?ruta=${encodeURIComponent(r)}`, { method: 'PUT', body: '' }); await cargarArbol(); abrirArchivo(r.replace(/^\/+/, '')); }
      catch (e) { U.toast(e.message); }
    };
    new ResizeObserver(ajustarPrev).observe($('#marco'));
    cargarArbol().then(() => {
      const pedido = decodeURIComponent((location.hash.match(/^#codigo\/(.+)$/) || [])[1] || '');
      abrirArchivo(archivos.some((a) => a.ruta === pedido) ? pedido : archivos.some((a) => a.ruta === 'escenas.js') ? 'escenas.js' : archivos[0]?.ruta);
    });
  }
  async function cargarArbol() {
    try { archivos = (await api('archivos')).archivos; } catch (e) { $('#arbolLista').innerHTML = `<p class="nota">${esc(e.message)}</p>`; return; }
    // Arriba lo que más se toca; las carpetas abajo (assets/ cerrada)
    const ORDEN = ['proyecto.js', 'escenas.js', 'tipos.js'];
    const raiz = { dirs: {}, files: [] };
    for (const a of archivos) { const partes = a.ruta.split('/'); let n = raiz; partes.slice(0, -1).forEach((d) => { n = n.dirs[d] ||= { dirs: {}, files: [] }; }); n.files.push(a); }
    const hoja = (a) => `<a data-ruta="${esc(a.ruta)}" class="${a.generado ? 'gen' : ''}" title="proyecto/${esc(a.ruta)}${a.generado ? ' (generado, solo lectura)' : ''}">${esc(a.ruta.split('/').pop())}${a.generado ? '<em>generado</em>' : ''}</a>`;
    const rama = (n, base = '') => {
      const fs = [...n.files].sort((a, b) => (ORDEN.indexOf(a.ruta) + 1 || 99) - (ORDEN.indexOf(b.ruta) + 1 || 99) || (a.generado - b.generado) || a.ruta.localeCompare(b.ruta));
      return fs.map(hoja).join('') + Object.keys(n.dirs).sort().map((d) => `<details ${base + d === 'assets' || (base + d).startsWith('assets/') ? '' : 'open'}><summary>${esc(d)}/</summary><div>${rama(n.dirs[d], base + d + '/')}</div></details>`).join('');
    };
    $('#arbolLista').innerHTML = rama(raiz);
    $('#arbolLista').onclick = (e) => { const a = e.target.closest('[data-ruta]'); if (a) { e.preventDefault(); abrirArchivo(a.dataset.ruta); } };
    marcarArbol();
  }
  function marcarArbol() { $$('#arbolLista [data-ruta]').forEach((a) => { a.classList.toggle('on', a.dataset.ruta === actual?.ruta); a.classList.toggle('sucio', a.dataset.ruta === actual?.ruta && sucio()); }); }
  async function abrirArchivo(ruta, { forzar = false } = {}) {
    if (!ruta) return;
    if (!forzar && actual && ruta !== actual.ruta && sucio() && !confirm(`proyecto/${actual.ruta} tiene cambios sin guardar. ¿Descartarlos?`)) return;
    if (forzar && sucio() && !confirm('¿Descartar tus cambios y volver a leer el archivo del disco?')) return;
    let j;
    try { j = await api(`archivo?ruta=${encodeURIComponent(ruta)}`); } catch (e) { return U.toast(e.message); }
    actual = { ruta, mtime: j.mtime, original: j.texto, generado: j.generado, error: null, enDisco: false };
    const leng = EditorCodigo.lenguajeDe(ruta);
    ed.poner(j.texto, { lenguaje: leng, soloLectura: j.generado });
    $('#edVacio')?.remove();
    $('#edRuta').innerHTML = `proyecto/<b>${esc(ruta)}</b>${j.generado ? ' <span class="chip">generado · solo lectura</span>' : ''}`;
    $('#edLeng').textContent = { js: 'JavaScript', json: 'JSON', css: 'CSS', html: 'HTML/SVG', md: 'Markdown' }[leng] || 'Texto';
    history.replaceState(null, '', '#codigo/' + encodeURIComponent(ruta));
    const p = piezaDeArchivo(ruta); if (p && p !== prevPieza) { prevPieza = p; $('#prevPieza').value = p; }
    estadoEd(); avisosEd(); recargarPrev();
  }
  function estadoEd() {
    if (!actual) return;
    $('#edEstado').textContent = actual.generado ? 'solo lectura' : sucio() ? '● sin guardar' : 'guardado';
    $('#bGuardar').disabled = actual.generado;
    marcarArbol();
  }
  // Avisos arriba del editor: error de sintaxis, cambio en disco, y si lo editado en una pieza tapa este archivo
  function avisosEd() {
    const c = $('#edAvisos'); if (!c || !actual) return;
    let h = '';
    if (actual.error) h += `<div class="edaviso mal" data-linea="${actual.error.linea || ''}"><b>No se guardó.</b> ${esc(actual.error.error)}${actual.error.linea ? ` <u>Ir a la línea ${actual.error.linea}</u>` : ''}</div>`;
    if (actual.enDisco) h += `<div class="edaviso">El archivo cambió en el disco (¿lo editó el agente?). <button class="btn chico" data-recargar>Ver la versión del disco</button></div>`;
    if (actual.ruta === 'escenas.js' && U.leer('motion') != null) h += `<div class="edaviso">Ojo: lo editado en el editor de la presentación (<code>estado/motion.json</code>) manda sobre <code>escenas.js</code>; lo que cambies acá no se ve hasta que ese estado se borre o se edite. <button class="btn chico" data-abrir="estado/motion.json">Abrir estado/motion.json</button></div>`;
    c.innerHTML = h;
    $('[data-linea]', c)?.addEventListener('click', (e) => { const l = +e.currentTarget.dataset.linea; if (l) ed.irA(l); });
    $('[data-recargar]', c)?.addEventListener('click', () => abrirArchivo(actual.ruta, { forzar: true }));
    $('[data-abrir]', c)?.addEventListener('click', (e) => abrirArchivo(e.currentTarget.dataset.abrir));
  }
  async function guardarArchivo({ forzar = false } = {}) {
    if (!actual || actual.generado) return;
    const txt = ed.texto();
    $('#edEstado').textContent = 'guardando…';
    try {
      const j = await api(`archivo?ruta=${encodeURIComponent(actual.ruta)}${forzar ? '&forzar=1' : ''}`, { method: 'PUT', headers: { 'content-type': 'text/plain; charset=utf-8', 'x-tramoya-mtime': String(actual.mtime) }, body: txt });
      Object.assign(actual, { mtime: j.mtime, original: txt, error: null, enDisco: false });
      guardadoRecien = Date.now();
      ed.error(null); U.toast('Guardado'); estadoEd(); avisosEd();
      if (/^estado\//.test(actual.ruta)) refrescarEstado();
      recargarPrev();
    } catch (e) {
      if (e.status === 409) {
        if (confirm(`${e.message}\n\n¿Guardar igual tu versión encima? (Cancelar: no se guarda; podés ver la del disco con «Recargar».)`)) return guardarArchivo({ forzar: true });
        actual.enDisco = true;
      } else if (e.status === 422) { actual.error = e.datos; ed.error(e.datos.linea); }
      else actual.error = { error: e.message };
      estadoEd(); avisosEd(); $('#edEstado').textContent = 'sin guardar';
    }
  }
  const DIM = { motion: [1920, 1080], reel: [1920, 1080], poster: [2245, 3179], landing: [1440, 900], marca: [1440, 900] };
  function urlPrev() {
    const p = PIEZAS.find((x) => x.id === prevPieza);
    let q = '';
    if (prevPieza === 'motion') {
      // La escena donde está el cursor (si se está editando escenas.js): objetos con dos espacios de sangría
      if (actual?.ruta === 'escenas.js') { const n = (ed.texto().slice(0, ed.desde()).match(/\n  \{/g) || []).length; q = `?escena=${Math.max(1, n)}`; }
      else q = '?escena=1';
    }
    return p.ruta + q;
  }
  function ajustarPrev() { const m = $('#marco'), f = $('#prevIfr'); if (m && f) { const [w, h] = DIM[prevPieza]; escalar(m, f, w, h, { contener: true }); } }
  function recargarPrev() {
    const f = $('#prevIfr'); if (!f || !prevVisible) return;
    const u = urlPrev();
    $('#prevAbrir').href = u;
    ajustarPrev();
    f.onload = () => { try { f.contentWindow.TRAMOYA.sinRecarga = true; f.contentWindow.TRAMOYA.sinIndicador = true; } catch (e) {} };
    if (f.getAttribute('src') === u) { try { f.contentWindow.location.reload(); } catch (e) { f.src = u; } } else f.src = u;
  }

  // ---------- Salidas ----------
  let tarea = null, sondeo = null, visto = 0;
  function secSalidas(s) {
    if (!SRV) {
      s.innerHTML = `<div class="cab"><div><h1>Salidas</h1><p>Revisar las piezas cuadro por cuadro y exportarlas a MP4, PNG, PDF y SVG.</p></div></div>${SIN_SERVIDOR()}
        <p class="nota">O desde la terminal, en la carpeta del proyecto:</p>
        <p>${cmd(CLI + ' revisar motion')} ${cmd(CLI + ' video reel')} ${cmd(CLI + ' poster')} ${cmd(CLI + ' marca --png')} ${cmd(CLI + ' empaquetar')}</p>
        <p class="nota">Lo que sale queda en <code>salida/</code> (la marca, en <code>proyecto/assets/logo/</code>).</p>`;
      return;
    }
    s.innerHTML = `
      <div class="cab"><div><h1>Salidas</h1><p>Se renderizan con Chrome sin ventana, con el mismo código que ves en pantalla. Una tarea a la vez; quedan en <code>salida/</code>.</p></div>
        <div class="acc"><button class="btn" id="bDiag">Revisar requisitos</button></div></div>
      <div class="diag" id="diag"></div>
      <div id="diagAviso"></div>
      <div class="acciones">
        <form class="accion" data-cmd="revisar"><b>Revisar</b><p>Un PNG por punto clave y los errores de consola. Lo primero antes de exportar.</p>
          <div class="fila"><select name="pieza"><option value="motion">Presentación</option><option value="reel">Reel</option><option value="poster">Póster</option><option value="landing">Landing</option><option value="marca">Marca</option></select></div>
          <div class="fila"><input type="text" name="query" placeholder="Un instante: escena=4&amp;paso=2&amp;ui=0 (opcional)"></div>
          <button class="btn pri">Revisar</button></form>
        <form class="accion" data-cmd="video"><b>Video (MP4)</b><p>La presentación como video o el reel con su música.</p>
          <div class="fila"><select name="pieza"><option value="motion">Presentación</option><option value="reel">Reel</option></select><select name="calidad"><option value="final">Final (60 fps)</option><option value="rapida">Rápida (30 fps)</option></select></div>
          <div class="fila"><label class="chk">Pausa máx. en la presentación <input type="number" name="pausaMax" value="3" min="0" step="0.5" style="width:70px"> s</label></div>
          <button class="btn pri">Exportar video</button></form>
        <form class="accion" data-cmd="poster"><b>Póster</b><p>PNG para imprimir y PDF vectorial.</p>
          <div class="fila"><select name="formato"><option>A1</option><option>A2</option><option>A3</option><option>A4</option></select><select name="dpi"><option value="300">300 dpi</option><option value="150">150 dpi</option></select></div>
          <button class="btn pri">Exportar póster</button></form>
        <form class="accion" data-cmd="marca"><b>Marca</b><p>SVG de cada variante del logo y el favicon, en <code>proyecto/assets/logo/</code>.</p>
          <div class="fila"><label class="chk"><input type="checkbox" name="png"> También PNG de 2048 px</label></div>
          <button class="btn pri">Exportar marca</button></form>
        <form class="accion" data-cmd="empaquetar"><b>Paquete (.zip)</b><p>El proyecto entero para llevar: se abre con doble clic en cualquier máquina.</p>
          <div class="fila"><label class="chk"><input type="checkbox" name="solo"> Solo proyecto/ (liviano)</label></div>
          <button class="btn pri">Empaquetar</button></form>
      </div>
      <div class="consola" id="consola" hidden><header><span class="chip" id="tEstado"></span><code id="tCmd"></code><span class="nota" id="tTiempo"></span><button class="btn chico mal" id="bCancelar">Cancelar</button></header><pre id="tLog"></pre></div>
      <div class="galeria" id="galeria"></div>`;
    $('#bDiag').onclick = () => diagnostico(true);
    $$('form.accion', s).forEach((f) => (f.onsubmit = (e) => { e.preventDefault(); lanzar(f.dataset.cmd, argsDe(f)); }));
    $('#bCancelar').onclick = async () => { try { await api('tarea', { method: 'DELETE' }); } catch (e) { U.toast(e.message); } };
    diagnostico();
    api('tarea').then(({ tarea: t }) => { if (t) { tarea = t; visto = 0; $('#tLog').textContent = ''; mostrarTarea(t); if (t.corriendo) seguir(); else traerLog(); } });
    cargarGaleria();
  }
  function argsDe(f) {
    const c = f.dataset.cmd, v = (n) => f.elements[n]?.value?.trim();
    if (c === 'revisar') return [v('pieza'), ...(v('query') ? ['--query', v('query')] : [])];
    if (c === 'video') return [v('pieza'), ...(v('calidad') === 'rapida' ? ['--fps', '30', '--sub', '1'] : []), ...(v('pieza') === 'motion' && v('pausaMax') ? ['--pausaMax', v('pausaMax')] : [])];
    if (c === 'poster') return ['--formato', v('formato'), '--dpi', v('dpi')];
    if (c === 'marca') return f.elements.png.checked ? ['--png'] : [];
    if (c === 'empaquetar') return f.elements.solo.checked ? ['--solo-proyecto'] : [];
    return [];
  }
  async function diagnostico(avisar = false) {
    try {
      const { items } = await api('doctor');
      $('#diag').innerHTML = items.map((d) => `<span class="chip ${d.ok ? 'ok' : d.opcional ? '' : 'mal'}" title="${esc(d.ok ? d.texto : d.ayuda || '')}">${d.ok ? '✓' : d.opcional ? '·' : '✗'} ${esc(d.nombre || d.texto)}</span>`).join('');
      const faltan = items.filter((d) => !d.ok && !d.opcional);
      $('#diagAviso').innerHTML = faltan.length ? `<div class="aviso"><div><b>Falta algo para exportar.</b>${faltan.map((d) => `<div style="margin-top:6px">${esc(d.texto)}${d.para ? ` <span class="nota">(para ${esc(d.para)})</span>` : ''}: ${/^npm |^brew |^winget /.test(d.ayuda) ? cmd(d.ayuda) : esc(d.ayuda)}</div>`).join('')}<div class="nota" style="margin-top:6px">El editor y las piezas andan igual. Detalle: ${cmd(CLI + ' doctor')}</div></div></div>` : '';
      if (avisar) U.toast(faltan.length ? `Faltan ${faltan.length} requisito(s)` : 'Todo listo para exportar');
    } catch (e) { $('#diag').innerHTML = `<span class="chip mal">${esc(e.message)}</span>`; }
  }
  async function lanzar(c, args) {
    try {
      const { tarea: t } = await apiJSON('tarea', 'POST', { cmd: c, args });
      tarea = t; visto = 0; $('#tLog').textContent = ''; mostrarTarea(t); seguir();
      $('#consola').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    } catch (e) {
      if (e.status === 424) { diagnostico(); U.toast(e.message); }
      else U.toast(e.message);
    }
  }
  function mostrarTarea(t) {
    $('#consola').hidden = false;
    $('#tCmd').textContent = `tramoya ${t.cmd} ${t.args.map((a) => (/[\s&]/.test(a) ? `'${a}'` : a)).join(' ')}`;
    const e = $('#tEstado');
    e.className = 'chip ' + (t.corriendo ? 'acento' : t.codigo === 0 ? 'ok' : 'mal');
    e.textContent = t.corriendo ? 'corriendo…' : t.cancelada ? 'cancelada' : t.codigo === 0 ? 'terminó bien' : `terminó con error (${t.codigo})`;
    $('#bCancelar').hidden = !t.corriendo;
    $('#tTiempo').textContent = `${Math.round(((t.fin || Date.now()) - t.inicio) / 1000)} s`;
    $$('form.accion .btn.pri').forEach((b) => (b.disabled = !!t.corriendo));
  }
  async function traerLog() {
    try {
      const { tarea: t } = await api(`tarea?desde=${visto}`);
      if (!t) return null;
      if (t.id !== tarea?.id) { visto = 0; $('#tLog').textContent = ''; }
      tarea = t;
      const pre = $('#tLog'), abajo = pre.scrollHeight - pre.scrollTop - pre.clientHeight < 30;
      if (t.log) { pre.textContent += t.log; visto = t.total; }
      if (abajo) pre.scrollTop = pre.scrollHeight;
      mostrarTarea(t);
      return t;
    } catch (e) { return null; }
  }
  function seguir() {
    clearTimeout(sondeo);
    const paso = async () => {
      const t = await traerLog();
      if (t?.corriendo) sondeo = setTimeout(paso, 700);
      else if (t) { cargarGaleria(); U.toast(t.codigo === 0 ? `${t.cmd}: listo` : t.cancelada ? `${t.cmd}: cancelada` : `${t.cmd}: terminó con errores (mirá el registro)`); }
    };
    sondeo = setTimeout(paso, 300);
  }
  async function cargarGaleria() {
    const g = $('#galeria'); if (!g) return;
    let lista;
    try { lista = (await api('salidas')).archivos; } catch (e) { g.innerHTML = `<div class="aviso mal">${esc(e.message)}</div>`; return; }
    if (!lista.length) { g.innerHTML = '<h2>En salida/</h2><div class="vacio">Todavía no hay nada exportado.</div>'; return; }
    const grupos = new Map(), poner = (k, a) => { if (!grupos.has(k)) grupos.set(k, []); grupos.get(k).push(a); };
    for (const a of lista) {
      const m = a.ruta.match(/^salida\/revision\/([^/]+)\//);
      if (m) poner('Revisión · ' + m[1], a);
      else if (/\.(mp4|webm|mov)$/i.test(a.ruta)) poner('Videos', a);
      else if (/\.(png|jpe?g|webp|svg|gif)$/i.test(a.ruta)) poner('Imágenes', a);
      else if (/\.pdf$/i.test(a.ruta)) poner('PDF', a);
      else if (/\.zip$/i.test(a.ruta)) poner('Paquetes', a);
      else poner('Otros', a);
    }
    const ord = ['Videos', 'Imágenes', 'PDF', 'Paquetes'];
    for (const [k, as] of grupos) if (k.startsWith('Revisión')) as.sort((a, b) => a.ruta.localeCompare(b.ruta));
    const claves = [...grupos.keys()].sort((a, b) => (ord.indexOf(a) + 1 || 50) - (ord.indexOf(b) + 1 || 50) || a.localeCompare(b));
    const url = (a) => `${a.ruta.split('/').map(encodeURIComponent).join('/')}?v=${a.mtime}`;
    const vista = (a) => (/\.(mp4|webm|mov)$/i.test(a.ruta) ? `<video src="${url(a)}" controls preload="metadata"></video>`
      : /\.(png|jpe?g|webp|svg|gif)$/i.test(a.ruta) ? `<a href="${url(a)}" target="_blank"><img src="${url(a)}" alt="" loading="lazy"></a>`
      : `<a class="ico" href="${url(a)}" target="_blank" style="text-decoration:none">${esc((a.ruta.match(/\.(\w+)$/) || [, '?'])[1].toUpperCase())}</a>`);
    g.innerHTML = '<h2>En salida/</h2>' + claves.map((k) => {
      const as = grupos.get(k), chica = k.startsWith('Revisión');
      return `<h3>${esc(k)} <span class="chip">${as.length}</span>${chica ? `<span class="nota">${esc(hace(as[0].mtime))}</span>` : ''}</h3><div class="grid ${chica ? 'chica' : ''}">${as.map((a) => `<div class="sal"><div class="vista">${vista(a)}</div><div class="pie"><span title="${esc(a.ruta)}">${esc(a.ruta.split('/').pop())}</span><small>${tam(a.tam)}</small><a href="${url(a)}&descargar" title="Descargar">↓</a></div></div>`).join('')}</div>`;
    }).join('');
  }

  // ---------- Llevar ----------
  function secLlevar(s) {
    s.innerHTML = `
      <div class="cab"><div><h1>Llevar</h1><p>Cada proyecto es una carpeta autocontenida: se versiona, se zipea y se abre en otra máquina o en otro repo.</p></div></div>
      <div class="bloques">
        <div class="bloque"><b>El proyecto entero (.zip)</b><p>Motor y proyecto: se descomprime y se abre con doble clic en <code>index.html</code>, en cualquier máquina, sin instalar nada. «Solo proyecto» es liviano y se abre con <code>tramoya importar</code>.</p>
          ${SRV ? '<div class="acc"><button class="btn pri" id="bZip">Descargar .zip</button><button class="btn" id="bZipSolo">Solo proyecto/</button></div>' : `<p class="nota">Sin servidor: ${cmd(CLI + ' empaquetar')}</p>`}</div>
        <div class="bloque"><b>Lo editado (.json)</b><p>${SRV ? 'Lo editado en las piezas ya está en proyecto/estado/. Esto es para pasarlo a mano a otra copia.' : 'Abriste con doble clic: lo editado vive en este navegador. Exportalo para llevarlo a otra máquina o al proyecto.'}</p>
          <div class="acc"><button class="btn" id="bExp">Exportar lo editado</button><button class="btn" id="bImp">Importar…</button></div></div>
        <div class="bloque"><b>Deshacer y versiones anteriores</b><p>En cada pieza, <b>Ctrl+Z</b> deshace y <b>Ctrl+Shift+Z</b> rehace (o ↶ ↷ abajo a la izquierda). Además, cada vez que se guarda, la versión anterior queda acá: se puede volver a cualquiera, y la que había queda guardada también.</p>
          ${SRV ? '<div id="historial"><p class="nota">Cargando…</p></div>' : `<p class="nota">Las versiones las guarda el servidor: abrí el proyecto con ${cmd(CLI + ' estudio')}</p>`}</div>
        <div class="bloque"><b>Abrir este proyecto otra vez</b>
          <ol><li>Doble clic en <b>Abrir estudio</b> dentro de la carpeta (<code>.command</code> en macOS, <code>.bat</code> en Windows, <code>abrir-estudio.sh</code> en Linux).</li>
          <li>O en una terminal, en la carpeta: ${cmd(CLI + ' estudio')}</li>
          <li>Sin Node: doble clic en <code>index.html</code> (se ve y se edita; se guarda en el navegador).</li></ol>
          ${INFO?.carpeta ? `<p class="nota">Carpeta: <code>${esc(INFO.carpeta)}</code></p>` : ''}</div>
        <div class="bloque"><b>Instalar la skill (para que el agente lo trabaje)</b>
          <ol><li>Con Node 18+: ${cmd('npx github:CaseresMaxi/tramoya iniciar')} en la carpeta de tu proyecto: crea <code>./tramoya</code> y abre el estudio.</li>
          <li>Para tu agente (Claude Code, Codex, Cursor…): ${cmd('npx github:CaseresMaxi/tramoya instalar')}</li>
          <li>Que el repo la lleve: ${cmd('npx github:CaseresMaxi/tramoya iniciar --skill-local')} (copia la skill en <code>.claude/skills</code> y <code>.agents/skills</code>).</li></ol></div>
      </div>`;
    if (SRV) { $('#bZip').onclick = () => { location.href = `${API}/paquete.zip`; }; $('#bZipSolo').onclick = () => { location.href = `${API}/paquete.zip?solo-proyecto`; }; pintarHistorial(); }
    $('#bExp').onclick = () => U.descargar(`${P.id}-estado.json`, JSON.stringify(U.exportarEstado(), null, 2), 'application/json');
    $('#bImp').onclick = () => $('#fImp').click();
  }
  const NOMBRES = { motion: 'Presentación', reel: 'Reel', landing: 'Landing', 'poster-cfg': 'Póster', 'poster-obs': 'Observaciones del póster', 'marca-editor': 'Marca', 'marca-variantes': 'Variantes de la marca', pedidos: 'Pedidos al agente' };
  async function pintarHistorial() {
    const box = $('#historial'); if (!box) return;
    let H; try { H = await api('historial'); } catch (e) { box.innerHTML = `<p class="nota">${esc(e.message)}</p>`; return; }
    const subs = Object.keys(H).filter((k) => H[k].length);
    if (!subs.length) { box.innerHTML = '<p class="nota">Todavía no hay versiones anteriores: aparecen cuando se edita una pieza.</p>'; return; }
    box.innerHTML = subs.map((sub) => `<details class="hist"><summary>${esc(NOMBRES[sub] || sub)} <span class="nota">· ${H[sub].length} versión(es)</span></summary>
      <ul>${H[sub].slice(0, 12).map((v) => `<li>${esc(new Date(v.t).toLocaleString())}${v.igual ? ' <span class="nota">(igual a la actual)</span>' : ` <button class="btn" data-volver="${esc(sub)}" data-n="${v.n}">Volver a esta</button>`}</li>`).join('')}</ul></details>`).join('');
    $$('[data-volver]', box).forEach((b) => (b.onclick = async () => {
      const sub = b.dataset.volver, nombre = NOMBRES[sub] || sub;
      if (!confirm(`¿Volver «${nombre}» a la versión del ${b.parentElement.firstChild.textContent}? Lo que hay ahora queda guardado como otra versión.`)) return;
      try { await apiJSON('restaurar', 'POST', { sub, n: +b.dataset.n }); U.toast(`${nombre}: versión restaurada`); await refrescarEstado(); pintarHistorial(); }
      catch (e) { U.toast(e.message); }
    }));
  }
  $('#fImp').onchange = async (e) => {
    const f = e.target.files[0]; if (!f) return;
    try { const n = U.importarEstado(JSON.parse(await f.text())); U.toast(`${n} pieza(s) importada(s)`); contar(); }
    catch (err) { U.toast('No es un estado de Tramoya válido'); }
    e.target.value = '';
  };

  // ---------- Navegación ----------
  const SECCIONES = { piezas: secPiezas, estilo: secEstilo, pedidos: secPedidos, codigo: secCodigo, salidas: secSalidas, llevar: secLlevar };
  const armadas = new Set();
  function ir() {
    const id = (location.hash.slice(1).split('/')[0] || 'piezas');
    const sec = SECCIONES[id] ? id : 'piezas';
    $$('main > section').forEach((s) => (s.hidden = s.id !== 's-' + sec));
    $$('#nav a').forEach((a) => a.classList.toggle('on', a.dataset.s === sec));
    if (!armadas.has(sec)) { armadas.add(sec); SECCIONES[sec]($('#s-' + sec)); }
    else if (sec === 'pedidos') pintarPedidos();
    else if (sec === 'salidas') cargarGaleria();
    $('#main').scrollTop = 0;
  }
  addEventListener('hashchange', ir);
  addEventListener('beforeunload', (e) => { if (ed && sucio()) { e.preventDefault(); e.returnValue = ''; } });

  // ---------- Cambios en el proyecto (el agente, otra pestaña) ----------
  // En vez de recargar la página entera, se refresca lo que cambió
  async function refrescarEstado() { try { window.ESTADO = await api('estado'); } catch (e) {} contar(); pintarPedidos(); }
  let tRef;
  U.alCambiarProyecto = (ev) => {
    clearTimeout(tRef);
    tRef = setTimeout(async () => {
      await refrescarEstado();
      if (ev.tipo === 'archivo' && /^(estilo|proyecto\.js)/.test(ev.archivo || '') && !(ed && sucio())) { location.reload(); return; }
      if (ev.tipo === 'archivo' || ev.sub !== 'pedidos') miniaturas.forEach((m) => m.recargar());
      if (actual && ev.tipo === 'archivo' && ev.archivo === actual.ruta) {
        try { const j = await api(`archivo?ruta=${encodeURIComponent(actual.ruta)}`); if (j.mtime !== actual.mtime) { if (sucio()) { actual.enDisco = true; avisosEd(); } else abrirArchivo(actual.ruta, { forzar: true }); } } catch (e) {}
      } else if (actual) avisosEd();
      if (ev.tipo === 'archivo' && armadas.has('codigo')) { cargarArbol(); if (prevVisible && Date.now() - guardadoRecien > 2000) recargarPrev(); }
    }, 200);
    return false;
  };

  // ---------- Arranque ----------
  // Las piezas que el tablero lee (así sus cambios llegan por el canal de eventos)
  ['pedidos', 'motion', 'poster-obs'].forEach((s) => U.leer(s));
  U.servidor.then(async (ok) => {
    SRV = ok;
    const srv = $('#srv');
    if (ok) {
      try { INFO = await api('hola'); } catch (e) {}
      srv.className = 'srv ok';
      srv.innerHTML = `<b><i></i>Guardando en el proyecto</b>Lo que se edita va a <code>proyecto/estado/</code>.`;
      if (/^\/p\/[^/]+\//.test(location.pathname)) fetch('/__estudio/hola').then((r) => r.ok && r.json()).then((j) => { if (j?.estudio) $('#volver').hidden = false; }).catch(() => {});
    } else {
      srv.className = 'srv no';
      srv.innerHTML = `<b><i></i>Sin servidor</b>Lo editado queda en este navegador. Para guardar en archivos: doble clic en <b>Abrir estudio</b> o ${cmd(CLI + ' estudio')}`;
    }
    contar(); ir(); primeraVezEstilo();
    window.ready = Promise.resolve(true);
  });
})();
