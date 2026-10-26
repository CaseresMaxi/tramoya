// Utilidades compartidas por todas las piezas: curvas, colores, texto, estado y fuentes.
// No depende de nada. Se carga primero, antes que proyecto/proyecto.js.
(function () {
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

  // ---------- Estado en el navegador ----------
  // Lo que se edita en las páginas vive en localStorage, con el id del proyecto como prefijo.
  const clave = (sub) => `${window.PROYECTO?.id || 'tramoya'}-${sub}`;
  const leer = (sub, def = null) => { try { const v = localStorage.getItem(clave(sub)); return v == null ? def : JSON.parse(v); } catch (e) { return def; } };
  const guardar = (sub, v) => { try { localStorage.setItem(clave(sub), JSON.stringify(v)); return true; } catch (e) { return false; } };
  const borrar = (sub) => { try { localStorage.removeItem(clave(sub)); } catch (e) {} };
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
    const P = window.PROYECTO || {};
    const css = (P.fuentes || []).map((f) => `@font-face{font-family:'${f.familia}';src:url('${base}${f.archivo}') format('woff2');font-weight:${f.peso || '100 900'};font-style:${f.estilo || 'normal'};font-display:block}`).join('\n');
    const raiz = `:root{--font-display:${P.tipografia?.display || "Georgia, serif"};--font-body:${P.tipografia?.texto || 'system-ui, sans-serif'}}`;
    const st = document.createElement('style'); st.textContent = css + '\n' + raiz;
    document.head.prepend(st);
  }
  // Cada tema es un mapa de variables CSS; se declaran para el selector dado
  function instalarTemas(selector = '[data-theme]') {
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

  window.TRAMOYA = Object.assign(window.TRAMOYA || {}, {
    cl, lerp, prog, exOut, exIn, exInOut, backOut, spring, smooth, kf, speed,
    rgba, mixRGBA, mixHex, esc, md, plain, lines, pairs, nn, r2,
    clave, leer, guardar, borrar, enc, dec, clone, descargar, copiar, toast,
    instalarFuentes, instalarTemas, fuentesListas,
  });
})();
