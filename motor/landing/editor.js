// Editor de la landing: textos en el lugar (contenteditable) y panel lateral.
// Lo carga landing/index.html recién cuando se abre (tecla E, botón «Editar» o ?editar):
// un visitante de la landing publicada no baja nada de esto. Trabaja sobre window.LANDING
// (doc, render, guardar, base, normalizar) y guarda con TRAMOYA.guardar('landing', doc).
(function () {
  const U = window.TRAMOYA, P = window.PROYECTO, L = window.LANDING;
  const $ = (id) => document.getElementById(id);
  const TIPOS = { texto: 'Texto', tarjetas: 'Tarjetas', imagen: 'Texto e imagen', libre: 'A medida (HTML)' };

  const CSS = `
    body.editando{padding-right:380px}
    body.editando [data-campo]{outline:1px dashed transparent; outline-offset:5px; border-radius:3px; cursor:text; transition:outline-color .15s}
    body.editando [data-campo]:hover{outline-color:color-mix(in srgb, var(--accent) 70%, transparent)}
    body.editando [data-campo]:focus{outline:2px solid var(--accent)}
    body.editando [data-campo]:empty::before{content:attr(data-ph); opacity:.35}
    body.editando .ed-marca{box-shadow:inset 3px 0 0 var(--accent)}
    .ed-panel{position:fixed; top:0; right:0; bottom:0; width:380px; z-index:100; display:none; flex-direction:column; background:#16161a; border-left:1px solid #2b2b31; color:#f4f1eb; font:14px/1.4 system-ui,sans-serif}
    body.editando .ed-panel{display:flex}
    .ed-panel header{padding:14px 16px; border-bottom:1px solid #2b2b31; display:flex; align-items:center; justify-content:space-between; gap:10px}
    .ed-panel header h2{font:800 20px var(--font-display); margin:0; color:#fff}
    .ed-panel header small{color:#8d877e; font-size:11.5px}
    .ed-scroll{flex:1; overflow:auto; padding:4px 16px 18px}
    .ed-panel .tr-panel h4{margin-top:16px}
    .ed-h4{font:700 11px/1 system-ui,sans-serif; letter-spacing:2px; text-transform:uppercase; color:#d7a54a; margin:20px 0 10px; display:flex; justify-content:space-between}
    .ed-sec{border:1px solid #2b2b31; border-radius:10px; background:#1b1b20; margin-bottom:8px}
    .ed-sec[open]{border-color:#4a4536}
    .ed-sec.sobre{border-color:#d7a54a; box-shadow:0 0 0 1px #d7a54a}
    .ed-sec summary{list-style:none; display:grid; grid-template-columns:auto 1fr auto; gap:8px; align-items:center; padding:8px 10px; cursor:pointer}
    .ed-sec summary::-webkit-details-marker{display:none}
    .ed-sec summary .n{color:#d7a54a; font-weight:700; font-size:12px; cursor:grab}
    .ed-sec summary b{font-size:13px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap}
    .ed-sec summary small{display:block; color:#8d877e; font-size:11px; font-weight:400}
    .ed-sec .acts{display:flex; gap:3px}
    .ed-sec .acts button{background:#24242a; border:1px solid #2b2b31; color:#f4f1eb; border-radius:6px; width:26px; height:26px; cursor:pointer; font-size:12px; padding:0}
    .ed-sec .acts button:hover{background:#2f2f36}
    .ed-sec .cuerpo{padding:0 10px 4px}
    .ed-fila{display:flex; flex-wrap:wrap; gap:6px; margin:8px 0}
    .ed-tools{display:flex; flex-wrap:wrap; gap:6px; padding:12px 16px; border-top:1px solid #2b2b31}
    .ed-foot{padding:0 16px 12px; color:#8d877e; font-size:11.5px; line-height:1.5; margin:0}`;
  const st = document.createElement('style'); st.textContent = CSS; document.head.appendChild(st);

  const panel = document.createElement('aside');
  panel.className = 'ed-panel';
  panel.innerHTML = `
    <header><div><h2>Landing</h2><small>Clic en un texto para editarlo · E cierra</small></div><button class="tr-btn" type="button" data-a="cerrar">Cerrar</button></header>
    <div class="ed-scroll">
      <div id="edGeneral"></div>
      <div id="edHero"></div>
      <div class="ed-h4"><span>Secciones</span></div>
      <div id="edSecs"></div>
      <div class="ed-fila">${Object.entries(TIPOS).map(([k, n]) => `<button class="tr-btn" type="button" data-nueva="${k}">+ ${n}</button>`).join('')}</div>
    </div>
    <div class="ed-tools">
      <button class="tr-btn" type="button" data-a="html" title="Un solo .html con los estilos adentro, listo para publicar">Descargar HTML</button>
      <button class="tr-btn" type="button" data-a="exportar">Exportar .json</button>
      <button class="tr-btn" type="button" data-a="importar">Importar .json</button>
      <button class="tr-btn" type="button" data-a="copiar">Copiar como PROYECTO.landing</button>
      <button class="tr-btn" type="button" data-a="restaurar">Restaurar</button>
    </div>
    <p class="ed-foot">Los textos aceptan <b>*acento*</b>. Lo editado se guarda solo (en el proyecto con <code>tramoya abrir</code>; si no, en este navegador). Para fijarlo en el proyecto: «Copiar como PROYECTO.landing» y pegarlo en proyecto/proyecto.js.</p>`;
  document.body.appendChild(panel);

  const cambio = () => { L.guardar(); L.render(); };
  const imagenes = (actual) => {
    const lista = [...new Set([...(window.MANIFIESTO?.imagenes || []), ...(actual ? [actual] : [])])];
    return { '': '— sin imagen —', ...Object.fromEntries(lista.map((u) => [u, u.split('/').pop()])) };
  };
  // Subida a proyecto/assets/img/ (solo con el servidor de `tramoya abrir`)
  function subir(obj, key) {
    const inp = Object.assign(document.createElement('input'), { type: 'file', accept: 'image/*' });
    inp.onchange = async () => {
      const f = inp.files[0]; if (!f) return;
      try { obj[key] = await U.subirArchivo(f, 'img'); cambio(); armar(); U.toast('Imagen subida: ' + obj[key].split('/').pop()); }
      catch (e) { U.toast(e.message || 'No se pudo subir'); }
    };
    inp.click();
  }
  const accionSubir = (obj, key) => ({ type: 'action', label: 'Subir imagen…', run: () => subir(obj, key), hint: 'Se copia a proyecto/assets/img/. Solo con el servidor (tramoya abrir); si no, copiá el archivo a mano y corré herramientas/generar_manifiesto.py.' });

  // ---------- Panel ----------
  const abiertas = new WeakSet();
  function armar() {
    const D = L.doc;
    U.panel({
      contenedor: $('edGeneral'), cfg: D, alCambiar: cambio,
      schema: [
        { group: 'Página' },
        { key: 'tema', label: 'Tema', type: 'select', options: Object.fromEntries(Object.entries(P.temas).map(([k, t]) => [k, t.nombre || k])) },
        { key: 'pie', label: 'Pie', type: 'text' },
      ],
    });
    U.panel({
      contenedor: $('edHero'), cfg: D.hero, alCambiar: cambio,
      schema: [
        { group: 'Portada' },
        { key: 'imagen', label: 'Imagen de fondo', type: 'select', options: () => imagenes(D.hero.imagen) },
        accionSubir(D.hero, 'imagen'),
        { key: 'cta', label: 'Botón (vacío = sin botón)', type: 'text' },
        { key: 'ctaUrl', label: 'Link del botón', type: 'url' },
      ],
    });
    const box = $('edSecs');
    box.innerHTML = '';
    D.secciones.forEach((s, i) => {
      const det = document.createElement('details');
      det.className = 'ed-sec'; det.dataset.i = i; det.open = abiertas.has(s);
      det.innerHTML = `<summary draggable="true"><span class="n" title="Arrastrá para reordenar">${U.nn(i + 1)}</span><b>${U.esc(U.plain(s.kicker || s.titulo) || 'Sin título')}<small>${TIPOS[s.tipo] || s.tipo}</small></b>
        <span class="acts"><button type="button" data-m="-1" title="Subir">↑</button><button type="button" data-m="1" title="Bajar">↓</button><button type="button" data-m="dup" title="Duplicar">⧉</button><button type="button" data-m="del" title="Borrar">✕</button></span></summary><div class="cuerpo"></div>`;
      det.addEventListener('toggle', () => {
        if (det.open) { abiertas.add(s); $('s' + i)?.scrollIntoView({ behavior: 'smooth', block: 'start' }); } else abiertas.delete(s);
      });
      const schema = [
        { key: 'tipo', label: 'Tipo', type: 'select', options: TIPOS },
        { key: 'kicker', label: 'Antetítulo (también es el link del menú)', type: 'text' },
        { key: 'titulo', label: 'Título', type: 'text' },
        { key: 'texto', label: 'Texto', type: 'textarea' },
      ];
      if (s.tipo === 'tarjetas') schema.push({ key: 'items', label: 'Tarjetas: «título | detalle», una por línea', type: 'textarea' });
      if (s.tipo === 'imagen') schema.push({ key: 'imagen', label: 'Imagen', type: 'select', options: () => imagenes(s.imagen) }, accionSubir(s, 'imagen'));
      if (s.tipo === 'libre') schema.push({ key: 'html', label: 'HTML de la sección ({{campo}} pone un campo editable)', type: 'textarea' }, { key: 'css', label: 'CSS de la sección', type: 'textarea' });
      U.panel({
        contenedor: det.querySelector('.cuerpo'), schema, cfg: s,
        alCambiar: (k) => {
          cambio();
          if (k === 'tipo') { if (s.tipo === 'tarjetas' && !s.items) s.items = 'Título | Detalle'; if (s.tipo === 'libre' && !s.html) s.html = '{{kicker}}{{titulo}}\n<p class="texto rv">{{texto}}</p>'; cambio(); armar(); }
          if (k === 'kicker' || k === 'titulo') det.querySelector('summary b').firstChild.textContent = U.plain(s.kicker || s.titulo) || 'Sin título';
        },
      });
      box.appendChild(det);
    });
  }

  // Acciones de cada sección (botones del resumen) y arrastre para reordenar
  const mover = (de, a) => {
    const S = L.doc.secciones;
    if (a < 0 || a >= S.length || a === de) return;
    S.splice(a, 0, S.splice(de, 1)[0]); cambio(); armar();
    $('s' + a)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };
  $('edSecs').addEventListener('click', (e) => {
    const b = e.target.closest('[data-m]'); if (!b) return;
    e.preventDefault(); e.stopPropagation();
    const i = +b.closest('.ed-sec').dataset.i, S = L.doc.secciones, m = b.dataset.m;
    if (m === 'dup') { const c = U.clone(S[i]); abiertas.add(c); S.splice(i + 1, 0, c); cambio(); armar(); }
    else if (m === 'del') { if (!confirm(`¿Borrar la sección ${i + 1}?`)) return; S.splice(i, 1); cambio(); armar(); }
    else mover(i, i + +m);
  });
  let arrastrada = null;
  $('edSecs').addEventListener('dragstart', (e) => { arrastrada = +e.target.closest('.ed-sec').dataset.i; e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('text/plain', String(arrastrada)); });
  $('edSecs').addEventListener('dragover', (e) => {
    const d = e.target.closest('.ed-sec'); if (!d || arrastrada == null) return;
    e.preventDefault();
    document.querySelectorAll('.ed-sec.sobre').forEach((x) => x !== d && x.classList.remove('sobre'));
    d.classList.add('sobre');
  });
  $('edSecs').addEventListener('dragleave', (e) => e.target.closest?.('.ed-sec')?.classList.remove('sobre'));
  $('edSecs').addEventListener('drop', (e) => {
    const d = e.target.closest('.ed-sec'); if (!d || arrastrada == null) return;
    e.preventDefault(); const de = arrastrada; arrastrada = null; mover(de, +d.dataset.i);
  });
  $('edSecs').addEventListener('dragend', () => { arrastrada = null; document.querySelectorAll('.ed-sec.sobre').forEach((x) => x.classList.remove('sobre')); });

  panel.querySelectorAll('[data-nueva]').forEach((b) => b.onclick = () => {
    const tipo = b.dataset.nueva;
    const s = { tipo, kicker: 'Sección', titulo: 'Un título *nuevo*.', texto: tipo === 'tarjetas' ? '' : 'Un párrafo corto que cuente de qué se trata.' };
    if (tipo === 'tarjetas') s.items = 'Primera | Un detalle breve.\nSegunda | Otro detalle.\nTercera | Y uno más.';
    if (tipo === 'imagen') s.imagen = window.MANIFIESTO?.imagenes?.[0] || '';
    if (tipo === 'libre') Object.assign(s, { texto: '', dato: '3×', html: '{{kicker}}{{titulo}}\n<p class="rv" style="font-size:120px; font-weight:800; color:var(--accent)">{{dato}}</p>', css: '' });
    L.doc.secciones.push(s); abiertas.add(s); cambio(); armar();
    $('s' + (L.doc.secciones.length - 1))?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });

  // ---------- Edición en el lugar ----------
  // Ruta "hero.titulo", "secciones.1.texto" o "secciones.0.items.2.t" (las tarjetas viven
  // en un texto «título | detalle» por línea: se leen y se vuelven a escribir con U.pairs)
  function ruta(campo) {
    const p = campo.split('.');
    if (p[2] === 'items') {
      const s = L.doc.secciones[+p[1]], k = +p[3], parte = p[4];
      return {
        get: () => U.pairs(s.items)[k]?.[parte] || '',
        set: (v) => { const it = U.pairs(s.items); if (!it[k]) return; it[k][parte] = parte === 't' ? v.replace(/\|/g, '/') : v; s.items = it.map((x) => (x.d ? `${x.t} | ${x.d}` : x.t)).join('\n'); },
      };
    }
    const obj = p.length === 1 ? L.doc : p[0] === 'hero' ? L.doc.hero : L.doc.secciones[+p[1]], key = p[p.length - 1];
    return { get: () => obj[key] || '', set: (v) => { obj[key] = v; } };
  }
  const pintar = (el) => { const v = ruta(el.dataset.campo).get(); el.innerHTML = 'plano' in el.dataset ? U.esc(v) : U.md(v); };
  let refrescar = 0;
  document.addEventListener('focusin', (e) => {
    const el = e.target.closest?.('[data-campo]'); if (!el || !L.editando) return;
    el.textContent = ruta(el.dataset.campo).get(); // crudo, con los *asteriscos*
    const m = el.dataset.campo.match(/^secciones\.(\d+)/);
    document.querySelectorAll('.ed-sec').forEach((d) => d.classList.toggle('ed-marca', !!m && d.dataset.i === m[1]));
    if (m) { const d = $('edSecs').children[+m[1]]; if (d && !d.open) d.open = true; d?.scrollIntoView({ block: 'nearest' }); }
  });
  document.addEventListener('input', (e) => {
    const el = e.target.closest?.('[data-campo]'); if (!el || !L.editando) return;
    ruta(el.dataset.campo).set(el.textContent.replace(/\s*\n\s*/g, ' '));
    L.guardar();
    if (/kicker$/.test(el.dataset.campo)) $('links').innerHTML = L.doc.secciones.map((s, i) => `<a href="#s${i}">${U.esc(U.plain(s.kicker))}</a>`).join('');
  });
  document.addEventListener('focusout', (e) => {
    const el = e.target.closest?.('[data-campo]'); if (!el || !L.editando) return;
    pintar(el);
    document.querySelectorAll('.ed-sec.ed-marca').forEach((d) => d.classList.remove('ed-marca'));
    clearTimeout(refrescar); refrescar = setTimeout(() => { if (!panel.contains(document.activeElement)) armar(); }, 50);
  });
  document.addEventListener('keydown', (e) => {
    const el = e.target.closest?.('[data-campo]'); if (!el) return;
    if (e.key === 'Enter' || e.key === 'Escape') { e.preventDefault(); el.blur(); }
  });
  // En el editor los links no navegan (el botón y el menú se editan, no se siguen)
  document.addEventListener('click', (e) => {
    if (!L.editando || panel.contains(e.target)) return;
    const a = e.target.closest('a[href]'); if (!a) return;
    if (a.closest('#links') || a.getAttribute('href').startsWith('#')) return;
    e.preventDefault();
  });
  // Pegar: solo texto
  document.addEventListener('paste', (e) => {
    const el = e.target.closest?.('[data-campo]'); if (!el) return;
    e.preventDefault(); document.execCommand('insertText', false, (e.clipboardData.getData('text/plain') || '').replace(/\s*\n\s*/g, ' '));
  });

  // ---------- Herramientas ----------
  const reemplazar = (doc) => { L.doc = L.normalizar(doc); cambio(); armar(); };
  const acciones = {
    cerrar: () => abrir(false),
    async restaurar() {
      if (!confirm('¿Volver a la landing de proyecto/proyecto.js? Se pierde lo editado.')) return;
      await U.borrar('landing'); L.doc = L.base(); L.render(); armar(); U.toast('Restaurada');
    },
    exportar: () => U.descargar(`${P.id}-landing.json`, JSON.stringify(L.doc, null, 2), 'application/json'),
    importar() {
      const inp = Object.assign(document.createElement('input'), { type: 'file', accept: '.json,application/json' });
      inp.onchange = async () => {
        try {
          const j = JSON.parse(await inp.files[0].text());
          const d = j?.estado?.landing?.v ?? j?.estado?.landing ?? (j && 'v' in j && j.rev ? j.v : j);
          if (!d || (!d.hero && !d.secciones)) throw new Error('El archivo no parece una landing (falta hero o secciones).');
          reemplazar(d); U.toast('Landing importada');
        } catch (e) { U.toast(e.message || 'No se pudo leer el archivo'); }
      };
      inp.click();
    },
    copiar: () => U.copiar('  landing: ' + JSON.stringify(L.doc, null, 2).replace(/\n/g, '\n  ') + ',', 'Copiado. Reemplazá la sección landing de proyecto/proyecto.js.'),
    html: descargarHTML,
  };
  panel.querySelectorAll('[data-a]').forEach((b) => b.onclick = () => acciones[b.dataset.a]());

  // ---------- Descargar HTML ----------
  // La página tal como se ve, sin el editor ni scripts: los estilos de la landing (con las
  // fuentes y las imágenes en base64 cuando el navegador las deja leer) y el logo en SVG.
  // Desde file:// Chrome no deja leer archivos: quedan las rutas relativas y se avisa.
  const aDataURL = (url) => new Promise((ok) => {
    const x = new XMLHttpRequest();
    try { x.open('GET', new URL(url, location.href).href); } catch (e) { return ok(null); }
    x.responseType = 'blob';
    x.onload = () => {
      if (x.status && x.status !== 200) return ok(null);
      const r = new FileReader(); r.onload = () => ok(r.result); r.onerror = () => ok(null); r.readAsDataURL(x.response);
    };
    x.onerror = () => ok(null);
    try { x.send(); } catch (e) { ok(null); }
  });
  async function descargarHTML() {
    const ed = L.editando;
    L.editando = false; L.render();
    const raiz = document.documentElement.cloneNode(true);
    L.editando = ed; L.render();
    raiz.classList.remove('js'); // sin JS no se oculta nada: todo visible de entrada
    raiz.querySelectorAll('script, .ed-panel, .ed-abrir, #tr-estado, #tr-toast, style:not([data-landing]), footer label').forEach((n) => n.remove());
    raiz.querySelectorAll('[data-landing]').forEach((n) => n.removeAttribute('data-landing'));
    raiz.querySelectorAll('.rv').forEach((n) => { n.classList.remove('rv', 'on'); n.removeAttribute('style'); if (!n.className) n.removeAttribute('class'); });
    const body = raiz.querySelector('body'); body.classList.remove('editando'); if (!body.className) body.removeAttribute('class');
    let faltan = 0;
    const cache = {};
    const incrustar = async (u) => { if (/^(data:|https?:|#)/.test(u)) return u; cache[u] ??= aDataURL(u); const d = await cache[u]; if (!d) faltan++; return d || u; };
    for (const img of raiz.querySelectorAll('img[src]')) img.setAttribute('src', await incrustar(img.getAttribute('src')));
    for (const s of raiz.querySelectorAll('style')) {
      let css = s.textContent;
      for (const [m, u] of [...css.matchAll(/url\(['"]?([^'")]+)['"]?\)/g)]) css = css.replace(m, `url('${await incrustar(u)}')`);
      s.textContent = css;
    }
    const ico = raiz.querySelector('link[rel=icon]');
    if (ico) { const d = await aDataURL(ico.getAttribute('href')); if (d) ico.setAttribute('href', d); else ico.remove(); }
    U.descargar(`${P.id}-landing.html`, '<!doctype html>\n' + raiz.outerHTML, 'text/html');
    U.toast(faltan ? 'Descargada. Imágenes y fuentes con ruta relativa: para incrustarlas, abrí el proyecto con tramoya abrir.' : 'Descargada, con imágenes y fuentes adentro.');
  }

  // ---------- Abrir y cerrar ----------
  function abrir(si) {
    if (document.activeElement?.dataset?.campo) document.activeElement.blur();
    L.editando = si;
    document.body.classList.toggle('editando', si);
    L.render();
    if (si) armar();
  }
  L.abrir = abrir;
  L.alCambiar = armar;
})();
