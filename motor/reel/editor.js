// Reel editable: un documento con partes (tipos de reel/tipos.js y window.TIPOS_REEL),
// una banda armada con parámetros simples y un editor con línea de tiempo y panel.
//
//   TRAMOYA.reel.editable({
//     defecto: PROYECTO.reel,     documento por defecto (es lo que se restaura)
//     clave: 'reel',              dónde se guarda lo editado (TRAMOYA.guardar / leer)
//     tipos: { … },               opcional: más tipos solo para este reel
//   })
//
// Documento:
//   { bpm, tema, fondo ('' = el del tema),
//     sonido: { activo, volumen, progresion, bombo, acordes, golpes, riser },
//     partes: [{ tipo, pulsos, …campos del tipo }] }
// La duración es la suma de los pulsos. Lo que no está en una parte toma el valor por
// defecto del campo; los colores vacíos, los del tema.
//
// Editor: tecla E o el botón "Editor" (o ?editor en la URL). En la línea de tiempo, clic
// elige una parte, arrastrar el borde derecho cambia los pulsos (Mayúsculas: de a compás),
// arrastrar el bloque la mueve y arrastrar sobre la regla recorre el tiempo.
(function () {
  const U = window.TRAMOYA, P = window.PROYECTO || {};
  const R = U.reel;

  // ---------- Banda ----------
  const N = { la: [220, 261.6, 329.6], fa: [174.6, 220, 261.6], do: [261.6, 329.6, 392], sol: [196, 246.9, 293.7], mi: [164.8, 207.7, 246.9], re: [146.8, 174.6, 220], mim: [164.8, 196, 246.9] };
  const PROGRESIONES = {
    epica: { nombre: 'Épica en menor (La m · Fa · Do · Sol)', acordes: [N.la, N.fa, N.do, N.sol, N.la, N.fa] },
    luminosa: { nombre: 'Luminosa en mayor (Do · Sol · La m · Fa)', acordes: [N.do, N.sol, N.la, N.fa] },
    tension: { nombre: 'Tensión (La m · La m · Fa · Mi)', acordes: [N.la, N.la, N.fa, N.mi] },
    melancolica: { nombre: 'Melancólica (La m · Re m · Mi m · La m)', acordes: [N.la, N.re, N.mim, N.la] },
    fija: { nombre: 'Un solo acorde (La m)', acordes: [N.la] },
  };
  const SONIDO = [
    { key: 'activo', label: 'Con música', type: 'check', def: true },
    { key: 'volumen', label: 'Volumen', type: 'range', min: 0, max: 1, step: 0.05, def: 0.9 },
    { key: 'progresion', label: 'Acordes', type: 'select', options: Object.fromEntries(Object.entries(PROGRESIONES).map(([k, v]) => [k, v.nombre])), def: 'epica' },
    { key: 'acordes', label: 'Acorde en cada pulso', type: 'check', def: true },
    { key: 'bombo', label: 'Bombo en cada pulso', type: 'check', def: true },
    { key: 'golpes', label: 'Golpes de corte', type: 'select', options: { compas: 'En cada compás', partes: 'En cada cambio de parte', no: 'Sin golpes' }, def: 'compas' },
    { key: 'riser', label: 'Subida antes del final (2 compases)', type: 'check', def: true },
  ];
  // Bombo y acorde en cada pulso, golpe en cada compás (o corte), subida al final; la
  // última parte arranca con un golpe fuerte y su primer compás suena más brillante.
  async function banda(ac, h, doc, L) {
    const so = doc.sonido, S = R.sonido, out = S.master(ac, so.volumen), ruido = S.ruido(ac);
    const ACORDES = (PROGRESIONES[so.progresion] || PROGRESIONES.epica).acordes;
    const ultima = L.length ? L[L.length - 1].t0 : 0, barUlt = Math.round(ultima / h.BAR);
    const nb = Math.round(h.DUR / h.BEAT);
    for (let b = 0; b < nb; b++) {
      const t0 = b * h.BEAT, bar = Math.floor(b / 4);
      if (so.bombo) S.bombo(ac, out, t0, b % 4 === 0 ? 1 : 0.75);
      if (so.acordes) S.acorde(ac, out, t0, ACORDES[bar % ACORDES.length], { vol: b % 4 === 0 ? 0.1 : 0.065, corte: L.length > 1 && bar === barUlt ? 2600 : 1700 });
    }
    const riser = so.riser && h.DUR >= 3 * h.BAR, finRiser = h.DUR - h.BAR;
    const fuerte = (t) => (L.length > 1 && Math.abs(t - ultima) < 1e-3) || (riser && Math.abs(t - finRiser) < 1e-3);
    if (so.golpes === 'compas') for (let b = 1; b < nb / 4 - 1e-6; b++) S.golpe(ac, out, b * h.BAR, ruido, fuerte(b * h.BAR));
    if (so.golpes === 'partes') L.slice(1).forEach((l) => S.golpe(ac, out, l.t0, ruido, fuerte(l.t0)));
    if (riser) S.riser(ac, out, h.DUR - 2 * h.BAR, finRiser, ruido);
  }

  // ---------- Documento ----------
  const temaDef = () => (P.temas?.[P.estilo?.tema] ? P.estilo.tema : Object.keys(P.temas || {})[0] || '');
  // Formato viejo de PROYECTO.reel ({ palabras, dato, bajada }): se arma el reel de ejemplo con esos textos
  function desdeViejo(r = {}) {
    return {
      bpm: r.bpm || 120,
      partes: [
        { tipo: 'barras', pulsos: 4 },
        { tipo: 'palabras', pulsos: 4, ...(r.palabras ? { palabras: U.lines(r.palabras).join('\n') } : {}) },
        { tipo: 'dato', pulsos: 4, ...(r.dato ? { numero: String(r.dato.numero ?? ''), unidad: r.dato.unidad || '', texto: r.dato.texto || '' } : {}) },
        { tipo: 'logo', pulsos: 12, bajada: r.bajada || '' },
      ],
    };
  }
  function normalizar(d) {
    d = U.clone(d || {});
    if (!Array.isArray(d.partes)) d = { ...desdeViejo(d), ...(d.tema ? { tema: d.tema } : {}) };
    d.bpm = U.cl(+d.bpm || 120, 40, 240);
    // Al previsualizar otro estilo (?estilo=) mandan su tema, su tempo y su banda
    if (P.estiloPrueba) { d.tema = temaDef(); d.bpm = P.reel?.bpm || d.bpm; d.sonido = { ...(d.sonido || {}), ...(P.reel?.sonido || {}) }; }
    if (!P.temas?.[d.tema]) d.tema = temaDef();
    d.fondo = d.fondo || '';
    d.sonido = { ...U.panel.defaults(SONIDO), ...(d.sonido || {}) };
    d.partes = d.partes.filter((p) => p && p.tipo).map((p) => ({ ...p, pulsos: Math.max(0.5, +p.pulsos || 4) }));
    return d;
  }

  function editable(op = {}) {
    const TIPOS = { ...R.tipos, ...(window.TIPOS_REEL || {}), ...(op.tipos || {}) };
    const CLAVE = op.clave || 'reel';
    const DEF = normalizar(op.defecto || P.reel);
    let doc = normalizar(U.leer(CLAVE) || DEF);
    const q = new URLSearchParams(location.search);

    // Colores del tema y valores de cada parte (con los colores ya resueltos)
    let col = {}, L = [], BEAT = 0.5;
    function colores(tema) {
      const T = P.temas?.[tema] || { vars: {} }, C = U.marca ? U.marca.cfgDe('', tema) : {};
      return { bg: T.vars.bg || '#000', tinta: C.tinta || T.vars.strong || '#fff', acento: C.acento || T.vars.accent || '#fc0', muted: T.vars.muted || '#888', texto: T.vars.text || '#eee' };
    }
    const camposDe = (tipo) => TIPOS[tipo]?.campos || [];
    function valores(parte) {
      const p = { ...U.panel.defaults(camposDe(parte.tipo)), ...parte };
      camposDe(parte.tipo).forEach((f) => { if (f.type === 'color' && !p[f.key]) p[f.key] = col[f.tema] || col.tinta; });
      return p;
    }
    const nombreDe = (parte) => TIPOS[parte.tipo]?.nombre || `¿${parte.tipo}?`;
    function derivar() {
      BEAT = 60 / doc.bpm; col = colores(doc.tema);
      let t = 0;
      L = doc.partes.map((parte, i) => { const dur = parte.pulsos * BEAT, l = { i, parte, tipo: parte.tipo, T: TIPOS[parte.tipo], p: valores(parte), t0: t, t1: t + dur, dur }; t += dur; return l; });
      Object.assign(cfg, {
        duracion: Math.max(t, 4 * BEAT), bpm: doc.bpm, fondo: doc.fondo || col.bg,
        partes: L.map((l) => ({ nombre: nombreDe(l.parte), desde: l.t0, hasta: l.t1 })),
        audio: doc.sonido.activo ? (ac, h) => banda(ac, h, doc, L) : null,
      });
    }

    // ---------- Dibujo: cada parte en su ventana, más su cola dentro de la siguiente ----------
    const fuente = (f) => (f === 'texto' ? P.tipografia?.texto || 'system-ui, sans-serif' : P.tipografia?.display || 'Georgia, serif');
    const errores = new Set();
    const cfg = {
      titulo: `${U.plain(P.nombre || 'Tramoya')} — Reel`,
      dibujar(t, h) {
        let s = '';
        L.forEach((l, i) => {
          const cola = l.T?.cola ?? 0.4, ultima = i === L.length - 1;
          if (!l.T || t < l.t0 - 1e-9 || (t >= l.t1 + cola && !ultima)) return;
          const hh = Object.assign(Object.create(h), { dur: l.dur, pulsos: l.parte.pulsos, t0: l.t0, t, col, tema: doc.tema, fuente, id: (n) => `p${i}-${n}` });
          try { s += l.T.dibujar(t - l.t0, l.p, hh, { i, partes: L, doc }) || ''; }
          catch (e) { const k = l.tipo + ': ' + e.message; if (!errores.has(k)) { errores.add(k); console.error(e); } }
        });
        return s;
      },
      // Un cuadro por pulso (a mitad de la entrada) con la parte a la que pertenece, y el último
      claves(h) {
        const n = Math.round(h.DUR / h.BEAT), parteEn = (v) => L.findIndex((l) => v >= l.t0 && v < l.t1) + 1;
        return [...Array.from({ length: n }, (_, b) => { const v = +(b * h.BEAT + 0.2).toFixed(3); return { v, pulso: b + 1, parte: parteEn(v) }; }), { v: h.DUR - 0.01, pulso: 'fin' }];
      },
    };
    // Las imágenes se cargan antes de dibujar (si no, el primer cuadro sale sin foto)
    const cargadas = {};
    const precargar = () => Promise.all(L.flatMap((l) => l.T?.precargar?.(l.p) || []).filter((u) => !cargadas[u]).map((u) => (cargadas[u] = new Promise((ok) => { const im = new Image(); im.onload = im.onerror = () => (im.decode ? im.decode().catch(() => {}).then(ok) : ok()); im.src = u; }))));
    derivar();
    cfg.antes = precargar();
    const api = R(cfg);
    if (U.RENDER || q.has('render')) return api;
    cfg.alListo = () => editor(api);
    return api;

    // ---------- Editor ----------
    function editor(api) {
      let abierto = false, sel = -1, tab = 'reel', ppp = 20, arrastre = null;
      const $ = (id) => document.getElementById(id);
      const st = document.createElement('style');
      st.textContent = CSS;
      document.head.appendChild(st);
      api.el.app.insertAdjacentHTML('beforeend', `
        <aside class="rl-editor" id="rlEditor">
          <header><h2>Reel</h2><span class="rl-dur" id="rlDur"></span><button class="tr-btn" id="rlCerrar" title="Cerrar (E)">Cerrar</button></header>
          <div class="rl-tabs" id="rlTabs"><button data-tab="parte">Parte</button><button data-tab="reel">Reel y sonido</button></div>
          <div class="rl-pane" id="rlPaneParte"></div>
          <div class="rl-pane" id="rlPaneReel"><div id="rlFormReel"></div><div id="rlFormSonido"></div></div>
          <div class="rl-tools">
            <button class="tr-btn" id="rlCopiar" title="Para pegar en proyecto/proyecto.js">Copiar como PROYECTO.reel</button>
            <button class="tr-btn" id="rlExportar">Exportar .json</button>
            <button class="tr-btn" id="rlImportar">Importar .json</button>
            <button class="tr-btn" id="rlRestaurar">Restaurar</button>
            <input type="file" id="rlArchivo" accept=".json,application/json" hidden>
          </div>
        </aside>`);
      api.el.player.insertAdjacentHTML('afterbegin', `
        <div class="rl-dock" id="rlDock">
          <div class="rl-bar">
            <select id="rlTipo" title="Tipo de la parte nueva"></select><button class="btn" id="rlAgregar">+ Agregar parte</button>
            <button class="btn" id="rlDup" title="Duplicar la parte elegida">Duplicar</button>
            <button class="btn" id="rlIzq" title="Mover a la izquierda">←</button><button class="btn" id="rlDer" title="Mover a la derecha">→</button>
            <button class="btn" id="rlBorrar" title="Borrar la parte elegida (Supr)">Borrar</button>
            <span class="rl-info" id="rlInfo"></span>
          </div>
          <div class="rl-scroll" id="rlScroll"><div class="rl-lane" id="rlLane">
            <div class="rl-ruler" id="rlRuler"></div>
            <div class="rl-track" id="rlTrack"></div>
            <div class="rl-ins" id="rlIns"></div>
            <div class="rl-head" id="rlHead"></div>
          </div></div>
        </div>`);
      api.el.fila.querySelector('.spacer').insertAdjacentHTML('afterend', '<button class="btn" id="rlBtnEditor" title="Editor (E)">Editor</button>');
      Object.entries(TIPOS).forEach(([k, T]) => $('rlTipo').add(new Option(T.nombre || k, k)));

      // Cambios: se vuelve a derivar, a dibujar y a guardar
      const guardar = () => U.guardar(CLAVE, doc);
      function cambio({ audio = false, estructura = false, panel = false, guarda = true } = {}) {
        derivar();
        precargar().then(() => api.seek(api.tiempo()));
        api.actualizar({ audio });
        if (guarda) guardar();
        linea();
        if (estructura || panel) armarPanel();
        info();
      }

      function toggle(v = !abierto) {
        abierto = v;
        api.el.app.classList.toggle('rl-editing', v);
        $('rlBtnEditor').classList.toggle('on', v);
        api.fijo = v;
        api.mostrar();
        if (v) { linea(); armarPanel(); info(); }
      }
      $('rlBtnEditor').onclick = (e) => { e.stopPropagation(); toggle(); };
      $('rlCerrar').onclick = () => toggle(false);
      // Clics en el editor no llegan al escenario ni al reproductor
      [$('rlEditor'), $('rlDock')].forEach((el) => el.addEventListener('click', (e) => e.stopPropagation()));

      // ---------- Línea de tiempo ----------
      const totalPulsos = () => doc.partes.reduce((a, p) => a + p.pulsos, 0);
      const escala = () => { const w = $('rlScroll').clientWidth - 24; return Math.max(8, w / Math.max(8, totalPulsos() + 4)); };
      const tono = (tipo) => { let x = 0; for (const c of tipo) x = (x * 31 + c.charCodeAt(0)) % 360; return x; };
      function linea() {
        if (!abierto) return;
        if (!arrastre) ppp = escala();
        const tp = totalPulsos(), ancho = Math.max($('rlScroll').clientWidth - 24, (tp + 4) * ppp);
        $('rlLane').style.width = ancho + 'px';
        let r = '';
        for (let b = 0; b <= Math.ceil(ancho / ppp); b++) {
          const bar = b % 4 === 0;
          r += `<i class="${bar ? 'bar' : ''}" style="left:${b * ppp}px"></i>`;
          if (bar && b * ppp < ancho - 30) r += `<span style="left:${b * ppp + 4}px">${b / 4 + 1}<em>${U.r2(b * BEAT).toFixed(1)} s</em></span>`;
        }
        $('rlRuler').innerHTML = r;
        $('rlTrack').innerHTML = L.map((l) => {
          const x = (l.t0 / BEAT) * ppp, w = l.parte.pulsos * ppp, res = l.T?.resumen ? U.plain(l.T.resumen(l.p)) : '';
          return `<div class="rl-blk${l.i === sel ? ' sel' : ''}${l.T ? '' : ' mal'}" data-i="${l.i}" style="left:${x}px; width:${w}px; --h:${tono(l.tipo)}" title="${U.esc(nombreDe(l.parte))} · ${l.parte.pulsos} pulsos">
            <b>${l.i + 1}. ${U.esc(nombreDe(l.parte))}</b><small>${U.esc(res)}</small><em>${l.parte.pulsos} p · ${l.dur.toFixed(2)} s</em><i class="rl-rs" title="Arrastrá para cambiar la duración"></i></div>`;
        }).join('') + `<div class="rl-end" style="left:${tp * ppp}px"></div>`;
        cabezal();
      }
      function cabezal() {
        if (!abierto) return;
        $('rlHead').style.left = (api.tiempo() / BEAT) * ppp + 'px';
        L.forEach((l) => $('rlTrack').children[l.i]?.classList.toggle('cur', api.tiempo() >= l.t0 && api.tiempo() < l.t1));
      }
      (function loop() { cabezal(); requestAnimationFrame(loop); })();
      function info() {
        const tp = totalPulsos(), dur = tp * BEAT;
        $('rlDur').textContent = `${dur.toFixed(2)} s · ${tp} pulsos · ${doc.bpm} BPM`;
        $('rlInfo').textContent = sel >= 0 && L[sel] ? `Parte ${sel + 1}: ${nombreDe(L[sel].parte)} · ${L[sel].parte.pulsos} pulsos (${L[sel].dur.toFixed(2)} s) · desde ${L[sel].t0.toFixed(2)} s` : 'Clic en una parte para editarla · borde derecho: duración · arrastrar: mover';
        ['rlDup', 'rlIzq', 'rlDer', 'rlBorrar'].forEach((id) => { $(id).disabled = sel < 0; });
      }
      function elegir(i, { ir = true } = {}) {
        sel = i;
        tab = i >= 0 ? 'parte' : 'reel';
        // Si el cabezal no está en la parte, va a verla (un poco después de que entra)
        const l = L[i];
        if (ir && l && !(api.tiempo() >= l.t0 && api.tiempo() < l.t1)) api.go(l.t0 + Math.min(l.dur * 0.5, 4 * BEAT));
        linea(); armarPanel(); info();
      }

      // Regla: arrastrar recorre el tiempo
      const tiempoEn = (x) => U.cl((x / ppp) * BEAT, 0, totalPulsos() * BEAT);
      const xEn = (e) => e.clientX - $('rlLane').getBoundingClientRect().left;
      $('rlRuler').addEventListener('pointerdown', (e) => {
        const sonaba = api.reproduciendo();
        api.pause(); api.go(tiempoEn(xEn(e)));
        $('rlRuler').setPointerCapture(e.pointerId);
        const mv = (ev) => api.go(tiempoEn(xEn(ev)));
        const up = () => { $('rlRuler').removeEventListener('pointermove', mv); $('rlRuler').removeEventListener('pointerup', up); if (sonaba) api.play(); };
        $('rlRuler').addEventListener('pointermove', mv); $('rlRuler').addEventListener('pointerup', up);
      });

      // Bloques: borde derecho → duración; cuerpo → mover; clic → elegir; vacío → nada elegido
      $('rlTrack').addEventListener('pointerdown', (e) => {
        const blk = e.target.closest('.rl-blk');
        if (!blk) { elegir(-1, { ir: false }); return; }
        e.preventDefault();
        const i = +blk.dataset.i, parte = doc.partes[i], x0 = e.clientX;
        $('rlTrack').setPointerCapture(e.pointerId);
        arrastre = { modo: e.target.classList.contains('rl-rs') ? 'dur' : 'click', i, pulsos: parte.pulsos, destino: i };
        if (arrastre.modo === 'dur') { blk.classList.add('rs'); if (sel !== i) { sel = i; tab = 'parte'; } }
        const mv = (ev) => {
          const dx = ev.clientX - x0, A = arrastre;
          if (A.modo === 'dur') {
            const paso = ev.shiftKey ? 4 : 1, n = Math.max(1, Math.round((A.pulsos + dx / ppp) / paso) * paso);
            if (n !== parte.pulsos) { parte.pulsos = n; cambio({ guarda: false }); $('rlTrack').children[i]?.classList.add('rs'); }
            return;
          }
          if (A.modo === 'click' && Math.abs(dx) > 5) { A.modo = 'mover'; blk.classList.add('drag'); }
          if (A.modo === 'mover') {
            blk.style.transform = `translateX(${dx}px)`;
            // Destino: cuántos bloques (sin contar este) quedan a la izquierda del centro arrastrado
            const c = (L[i].t0 / BEAT) * ppp + dx + (parte.pulsos * ppp) / 2;
            const otros = L.filter((l) => l.i !== i), d = otros.filter((l) => (l.t0 / BEAT + l.parte.pulsos / 2) * ppp < c).length;
            A.destino = d;
            const xIns = d < otros.length ? (otros[d].t0 / BEAT) * ppp - (otros[d].i > i ? parte.pulsos * ppp : 0) : (totalPulsos() - parte.pulsos) * ppp;
            Object.assign($('rlIns').style, { display: 'block', left: xIns + 'px' });
          }
        };
        const up = () => {
          $('rlTrack').removeEventListener('pointermove', mv); $('rlTrack').removeEventListener('pointerup', up);
          const A = arrastre; arrastre = null; $('rlIns').style.display = 'none';
          if (A.modo === 'dur') { cambio({ audio: true, panel: true }); return; }
          if (A.modo === 'mover') {
            if (A.destino !== i) { const [p] = doc.partes.splice(i, 1); doc.partes.splice(A.destino, 0, p); sel = A.destino; tab = 'parte'; cambio({ audio: true, estructura: true }); }
            else linea();
            return;
          }
          elegir(i);
        };
        $('rlTrack').addEventListener('pointermove', mv); $('rlTrack').addEventListener('pointerup', up);
      });
      addEventListener('resize', () => linea());
      new ResizeObserver(() => linea()).observe($('rlScroll'));

      // Barra: agregar, duplicar, mover, borrar
      function nuevaParte(tipo) {
        const T = TIPOS[tipo], defs = U.panel.defaults(T.campos || []);
        Object.keys(defs).forEach((k) => { if (defs[k] === '' || (T.campos.find((f) => f.key === k)?.type === 'color')) delete defs[k]; });
        return { tipo, pulsos: T.pulsos || 4, ...defs };
      }
      $('rlAgregar').onclick = () => { const i = sel >= 0 ? sel + 1 : doc.partes.length; doc.partes.splice(i, 0, nuevaParte($('rlTipo').value)); sel = i; tab = 'parte'; cambio({ audio: true, estructura: true }); elegir(i); };
      $('rlDup').onclick = () => { if (sel < 0) return; doc.partes.splice(sel + 1, 0, U.clone(doc.partes[sel])); sel++; cambio({ audio: true, estructura: true }); };
      const mover = (d) => { const j = sel + d; if (sel < 0 || j < 0 || j >= doc.partes.length) return; [doc.partes[sel], doc.partes[j]] = [doc.partes[j], doc.partes[sel]]; sel = j; cambio({ audio: true, estructura: true }); };
      $('rlIzq').onclick = () => mover(-1);
      $('rlDer').onclick = () => mover(1);
      function borrar() {
        if (sel < 0 || !confirm(`¿Borrar la parte ${sel + 1} (${nombreDe(doc.partes[sel])})?`)) return;
        doc.partes.splice(sel, 1); sel = Math.min(sel, doc.partes.length - 1); if (sel < 0) tab = 'reel';
        cambio({ audio: true, estructura: true });
      }
      $('rlBorrar').onclick = borrar;

      // ---------- Panel lateral ----------
      $('rlTabs').addEventListener('click', (e) => { const b = e.target.closest('button'); if (b) { tab = b.dataset.tab; armarPanel(); } });
      function armarPanel() {
        if (!abierto) return;
        document.querySelectorAll('#rlTabs button').forEach((b) => b.classList.toggle('on', b.dataset.tab === tab));
        $('rlPaneParte').classList.toggle('on', tab === 'parte');
        $('rlPaneReel').classList.toggle('on', tab === 'reel');
        if (tab === 'parte') armarParte(); else armarReel();
      }
      // Panel ligado a un objeto: muestra los valores efectivos y guarda solo lo que se toca
      function formulario(box, schema, destino, vista, alCambiar) {
        U.panel({ contenedor: box, schema, cfg: vista, alCambiar: (k, v) => { destino[k] = v; alCambiar(k, v); } });
      }
      function armarParte() {
        const box = $('rlPaneParte'), l = L[sel];
        box.innerHTML = '';
        if (!l) { box.innerHTML = '<p class="rl-hint">Elegí una parte en la línea de tiempo (abajo) para editarla. Sin nada elegido, la pestaña <b>Reel y sonido</b> tiene el tempo, el tema y la banda.</p>'; return; }
        const parte = l.parte, T = l.T;
        box.insertAdjacentHTML('beforeend', `<div class="rl-head2"><b>Parte ${sel + 1}</b><span>${l.t0.toFixed(2)} – ${l.t1.toFixed(2)} s</span></div>`);
        const cab = document.createElement('div'); box.appendChild(cab);
        const tipos = Object.fromEntries(Object.entries(TIPOS).map(([k, t]) => [k, t.nombre || k]));
        formulario(cab, [
          { key: 'tipo', label: 'Tipo', type: 'select', options: tipos },
          { key: 'pulsos', label: 'Duración en pulsos', type: 'range', min: 1, max: 48, step: 1, unit: ' p' },
        ], {}, { tipo: parte.tipo, pulsos: parte.pulsos }, (k, v) => {
          if (k === 'tipo') {
            // Cambia el tipo: se quedan la duración y los campos que se llaman igual
            const n = nuevaParte(v), viejo = parte;
            (TIPOS[v].campos || []).forEach((f) => { if (f.key in viejo) n[f.key] = viejo[f.key]; });
            n.pulsos = viejo.pulsos;
            doc.partes[sel] = n;
            return cambio({ estructura: true });
          }
          parte.pulsos = v; cambio({ audio: true });
        });
        if (!T) return box.insertAdjacentHTML('beforeend', `<p class="rl-hint">El tipo "${U.esc(parte.tipo)}" no existe en reel/tipos.js ni en proyecto/tipos.js.</p>`);
        const form = document.createElement('div'); box.appendChild(form);
        const campos = T.campos || [];
        const acciones = campos.some((f) => f.type === 'color' && parte[f.key]) ? [{ type: 'action', label: 'Volver a los colores del tema', run: () => { campos.forEach((f) => { if (f.type === 'color') delete parte[f.key]; }); cambio({ panel: true }); } }] : [];
        formulario(form, [{ group: T.nombre || parte.tipo }, ...campos, ...acciones], parte, { ...l.p }, (k) => {
          cambio({ panel: campos.find((f) => f.key === k)?.type === 'color' && acciones.length === 0 });
        });
        // Imágenes del manifiesto, para elegir con un clic
        const fi = campos.find((f) => f.imagen);
        const imgs = window.MANIFIESTO?.imagenes || [];
        if (fi && imgs.length) {
          box.insertAdjacentHTML('beforeend', '<h4 class="rl-h4">Imágenes del proyecto</h4>');
          const g = document.createElement('div'); g.className = 'rl-thumbs';
          imgs.forEach((u) => {
            const b = document.createElement('button');
            b.className = 'rl-thumb' + (l.p[fi.key] === u ? ' on' : '');
            b.innerHTML = `<img src="${U.esc(u)}" alt=""><span>${U.esc(u.split('/').pop())}</span>`;
            b.onclick = () => { parte[fi.key] = u; cambio({ panel: true }); };
            g.appendChild(b);
          });
          box.appendChild(g);
        }
        const tools = document.createElement('div'); tools.className = 'rl-row';
        tools.innerHTML = '<button class="tr-btn" data-a="ir">Ver desde el principio</button><button class="tr-btn" data-a="dup">Duplicar</button><button class="tr-btn" data-a="del">Borrar</button>';
        tools.querySelector('[data-a=ir]').onclick = () => { api.go(l.t0); api.play(); };
        tools.querySelector('[data-a=dup]').onclick = () => $('rlDup').click();
        tools.querySelector('[data-a=del]').onclick = borrar;
        box.appendChild(tools);
      }
      function armarReel() {
        const temas = Object.fromEntries(Object.entries(P.temas || {}).map(([k, t]) => [k, t.nombre || k]));
        const acciones = doc.fondo ? [{ type: 'action', label: 'Usar el fondo del tema', run: () => { doc.fondo = ''; cambio({ panel: true }); } }] : [];
        formulario($('rlFormReel'), [
          { group: 'Reel' },
          { key: 'bpm', label: 'Tempo', type: 'range', min: 60, max: 180, step: 1, unit: ' BPM', hint: 'Cambia la duración de todas las partes: se miden en pulsos.' },
          { key: 'tema', label: 'Tema (colores por defecto)', type: 'select', options: temas },
          { key: 'fondo', label: 'Fondo', type: 'color' },
          ...acciones,
        ], doc, { bpm: doc.bpm, tema: doc.tema, fondo: doc.fondo || col.bg }, (k) => cambio({ audio: k === 'bpm', panel: k === 'tema' || (k === 'fondo' && !acciones.length) }));
        formulario($('rlFormSonido'), [{ group: 'Sonido' }, ...SONIDO], doc.sonido, { ...doc.sonido }, (k) => cambio({ audio: true }));
      }

      // ---------- Archivo ----------
      const literal = () => 'reel: ' + JSON.stringify(doc, null, 2).replace(/"([a-zA-Z_$][\w$]*)":/g, '$1:').replace(/\n/g, '\n  ') + ',';
      $('rlCopiar').onclick = () => U.copiar(literal(), 'Copiado: pegalo en proyecto/proyecto.js en lugar de la sección reel');
      $('rlExportar').onclick = () => U.descargar(`${P.id || 'tramoya'}-reel.json`, JSON.stringify(doc, null, 2), 'application/json');
      $('rlImportar').onclick = () => $('rlArchivo').click();
      $('rlArchivo').onchange = async (e) => {
        const f = e.target.files[0]; e.target.value = '';
        if (!f) return;
        try { const j = JSON.parse(await f.text()); doc = normalizar(j.reel || j); sel = -1; tab = 'reel'; cambio({ audio: true, estructura: true }); U.toast('Reel importado'); }
        catch (err) { U.toast('No es un .json de reel: ' + err.message); }
      };
      $('rlRestaurar').onclick = async () => {
        if (!confirm('¿Volver al reel del proyecto? Se pierde lo editado.')) return;
        await U.borrar(CLAVE);
        doc = normalizar(DEF); sel = -1; tab = 'reel';
        cambio({ audio: true, estructura: true, guarda: false });
        U.toast('Restaurado');
      };

      // ---------- Teclado ----------
      addEventListener('keydown', (e) => {
        if (/^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName) || e.target.isContentEditable || e.ctrlKey || e.metaKey || e.altKey) return;
        if (/^[eE]$/.test(e.key)) toggle();
        else if (abierto && (e.key === 'Delete' || e.key === 'Backspace') && sel >= 0) { e.preventDefault(); borrar(); }
        else if (abierto && e.key === 'Escape') elegir(-1, { ir: false });
      });

      if (q.has('editor')) {
        // Abierto desde la URL: sin la transición del ancho (así la primera captura ya está armada)
        api.el.app.style.transition = 'none'; toggle(true);
        requestAnimationFrame(() => requestAnimationFrame(() => { api.el.app.style.transition = ''; }));
        if (q.get('parte')) elegir(+q.get('parte') - 1);
      }
      window.REEL = { get doc() { return doc; }, api, elegir, toggle };
    }
  }

  const CSS = `
    .rl-app{transition:grid-template-columns .35s ease}
    .rl-app.rl-editing{grid-template-columns:minmax(0,1fr) 400px}
    .rl-app.rl-editing .player{position:relative; left:auto; bottom:auto; transform:none; width:auto; margin:0 12px 34px; border-radius:14px; background:#141417; backdrop-filter:none}
    .rl-app.rl-editing .player .tl{display:none}
    .rl-dock{display:none; gap:8px}
    .rl-app.rl-editing .rl-dock{display:grid}
    .rl-bar{display:flex; align-items:center; gap:6px; flex-wrap:wrap}
    .rl-bar select{background:#0f0f12; color:#f4f1eb; border:1px solid #2b2b31; border-radius:9px; padding:7px 9px; font:inherit}
    .rl-bar .btn:disabled{opacity:.4; cursor:default}
    .rl-info{color:#b7b1a7; font-size:12px; margin-left:6px; font-variant-numeric:tabular-nums}
    .rl-scroll{overflow-x:auto; overflow-y:hidden; border-radius:10px; background:#0f0f12; border:1px solid #23232a; padding:0 12px}
    .rl-lane{position:relative; height:138px}
    .rl-ruler{position:absolute; left:0; right:0; top:0; height:26px; cursor:ew-resize; border-bottom:1px solid #2b2b31; touch-action:none}
    .rl-ruler i{position:absolute; bottom:0; width:1px; height:6px; background:#3a3a42; pointer-events:none}
    .rl-ruler i.bar{height:12px; background:#6a6a72}
    .rl-ruler span{position:absolute; top:3px; font-size:11px; color:#d8d2c8; font-weight:600; pointer-events:none; white-space:nowrap}
    .rl-ruler span em{font-style:normal; color:#7d776f; font-weight:400; margin-left:5px}
    .rl-track{position:absolute; left:0; right:0; top:34px; height:96px; touch-action:none}
    .rl-blk{position:absolute; top:0; height:96px; box-sizing:border-box; border-radius:9px; padding:8px 14px 8px 10px; overflow:hidden; cursor:grab; user-select:none;
      background:hsl(var(--h) 28% 20%); border:1px solid hsl(var(--h) 30% 32%); border-top:4px solid hsl(var(--h) 55% 55%); display:flex; flex-direction:column; gap:3px; transition:box-shadow .15s}
    .rl-blk:hover{border-color:hsl(var(--h) 40% 48%)}
    .rl-blk.sel{box-shadow:0 0 0 2px #d7a54a; border-color:#d7a54a}
    .rl-blk.cur b{color:#fff}
    .rl-blk.mal{background:#3a1c1c; border-color:#e5484d}
    .rl-blk.drag{cursor:grabbing; z-index:5; opacity:.85; box-shadow:0 10px 30px rgba(0,0,0,.6), 0 0 0 2px #d7a54a}
    .rl-blk b{font-size:12.5px; color:#efe9df; white-space:nowrap; overflow:hidden; text-overflow:ellipsis}
    .rl-blk small{font-size:11px; color:#b7b1a7; line-height:1.3; overflow:hidden; display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical}
    .rl-blk em{margin-top:auto; font-style:normal; font-size:10.5px; color:#8d877e; white-space:nowrap; font-variant-numeric:tabular-nums}
    .rl-rs{position:absolute; right:0; top:0; bottom:0; width:10px; cursor:ew-resize; background:linear-gradient(90deg, transparent 3px, rgba(255,255,255,.18) 3px, rgba(255,255,255,.18) 5px, transparent 5px)}
    .rl-blk:hover .rl-rs, .rl-blk.rs .rl-rs{background:linear-gradient(90deg, transparent 2px, #d7a54a 2px, #d7a54a 6px, transparent 6px)}
    .rl-end{position:absolute; top:-4px; bottom:-4px; width:0; border-left:2px dashed #5a5a62; pointer-events:none}
    .rl-ins{position:absolute; top:30px; height:104px; width:4px; margin-left:-2px; border-radius:2px; background:#d7a54a; display:none; pointer-events:none; z-index:6}
    .rl-head{position:absolute; top:0; bottom:0; width:2px; margin-left:-1px; background:#d7a54a; pointer-events:none; z-index:7}
    .rl-head::before{content:""; position:absolute; top:0; left:-5px; border:6px solid transparent; border-top:8px solid #d7a54a}
    .rl-editor *, .rl-dock *{box-sizing:border-box}
    .rl-editor{background:#16161a; border-left:1px solid #2b2b31; display:flex; flex-direction:column; min-width:0; overflow:hidden; color:#f4f1eb; font:14px system-ui,sans-serif}
    .rl-editor header{padding:12px 16px; border-bottom:1px solid #2b2b31; display:flex; align-items:center; gap:10px}
    .rl-editor header h2{font:800 22px var(--font-display, Georgia); margin:0}
    .rl-dur{flex:1; color:#b7b1a7; font-size:12px; font-variant-numeric:tabular-nums}
    .rl-tabs{display:flex; border-bottom:1px solid #2b2b31}
    .rl-tabs button{flex:1; background:none; border:none; border-bottom:2px solid transparent; color:#b7b1a7; padding:11px 7px; font:inherit; font-size:12.5px; font-weight:600; cursor:pointer}
    .rl-tabs button.on{color:#fff; border-bottom-color:#d7a54a}
    .rl-pane{display:none; flex:1; overflow:auto; padding:4px 16px 20px}
    .rl-pane.on{display:block}
    .rl-head2{display:flex; justify-content:space-between; align-items:baseline; margin:14px 0 10px}
    .rl-head2 b{font-size:15px}
    .rl-head2 span{color:#b7b1a7; font-size:12px; font-variant-numeric:tabular-nums}
    .rl-hint{color:#b7b1a7; font-size:13px; line-height:1.5; margin:16px 0}
    .rl-h4{font:700 11px/1 system-ui,sans-serif; letter-spacing:2px; text-transform:uppercase; color:#d7a54a; margin:18px 0 10px}
    .rl-thumbs{display:grid; grid-template-columns:repeat(3, 1fr); gap:8px}
    .rl-thumb{border:1px solid #2b2b31; border-radius:8px; overflow:hidden; background:#0f0f12; cursor:pointer; display:flex; flex-direction:column; padding:0; color:inherit; font:inherit; text-align:left}
    .rl-thumb:hover{border-color:#d7a54a}
    .rl-thumb.on{border-color:#d7a54a; box-shadow:0 0 0 2px #d7a54a}
    .rl-thumb img{width:100%; aspect-ratio:16/9; object-fit:cover; display:block; background:#222}
    .rl-thumb span{font-size:10px; color:#b7b1a7; padding:4px 6px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap}
    .rl-row{display:flex; flex-wrap:wrap; gap:6px; margin-top:14px}
    .rl-tools{display:flex; flex-wrap:wrap; gap:6px; padding:12px 16px; border-top:1px solid #2b2b31}`;

  R.editable = editable;
  R.editable.normalizar = normalizar;
  R.editable.progresiones = PROGRESIONES;
})();
