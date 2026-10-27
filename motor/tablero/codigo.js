// Editor de código del tablero: un textarea transparente sobre un <pre> resaltado, con
// números de línea. Hecho a mano y sin dependencias (anda offline). Resalta JS, JSON, CSS,
// HTML/SVG y Markdown con expresiones regulares: alcanza para leer, no pretende ser un IDE.
//
//   const ed = EditorCodigo.crear(contenedor, { alCambiar, alGuardar, alMover })
//   ed.poner(texto, { lenguaje: 'js', soloLectura })  ·  ed.texto()  ·  ed.irA(linea)
//   ed.error(linea | null)  ·  ed.linea()  ·  ed.foco()
(function () {
  const esc = (s) => s.replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' })[c]);
  // Cada lenguaje: una regex con grupos; el número del grupo que coincide elige la clase
  const LENG = {
    js: [/(\/\/[^\n]*|\/\*[\s\S]*?(?:\*\/|$))|('(?:\\[\s\S]|[^'\\\n])*'?|"(?:\\[\s\S]|[^"\\\n])*"?|`(?:\\[\s\S]|[^`\\])*`?)|\b(0x[\da-fA-F]+|\d+\.?\d*(?:[eE][+-]?\d+)?)\b|\b(const|let|var|function|return|if|else|for|while|do|switch|case|break|continue|new|typeof|instanceof|in|of|class|extends|import|export|from|default|try|catch|finally|throw|async|await|yield|this|delete|void)\b|\b(true|false|null|undefined|NaN|Infinity)\b|([A-Za-z_$][\w$]*)(?=\s*:(?!:))/g,
      [null, 'c', 's', 'n', 'k', 'l', 'p']],
    json: [/("(?:\\.|[^"\\\n])*")(?=\s*:)|("(?:\\.|[^"\\\n])*"?)|(-?\b\d+\.?\d*(?:[eE][+-]?\d+)?\b)|\b(true|false|null)\b/g, [null, 'p', 's', 'n', 'l']],
    css: [/(\/\*[\s\S]*?(?:\*\/|$))|('(?:\\.|[^'\\\n])*'?|"(?:\\.|[^"\\\n])*"?)|(@[\w-]+)|(--[\w-]+)|(#[\da-fA-F]{3,8}\b|-?\b\d+\.?\d*(?:px|em|rem|%|vh|vw|s|ms|deg|fr)?\b)|([\w-]+)(?=\s*:[^{};]*[;}])/g, [null, 'c', 's', 'k', 'p', 'n', 'a']],
    html: [/(<!--[\s\S]*?(?:-->|$))|(<\/?[\w:-]+|\/?>)|("[^"]*"?|'[^']*'?)|([\w:-]+)(?==)|(&\w+;)/g, [null, 'c', 't', 's', 'a', 'n']],
    md: [/^(#{1,6} [^\n]*)|(`[^`\n]+`|^```[^\n]*)|(\*\*[^*\n]+\*\*|\*[^*\n]+\*|_[^_\n]+_)|(\[[^\]\n]*\]\([^)\n]*\))|^(\s*(?:[-*+]|\d+\.) )/gm, [null, 'h', 's', 'k', 'p', 'k']],
  };
  const lenguajeDe = (ruta) => {
    const e = (String(ruta).match(/\.(\w+)$/) || [])[1]?.toLowerCase();
    return { js: 'js', mjs: 'js', cjs: 'js', json: 'json', css: 'css', html: 'html', htm: 'html', svg: 'html', md: 'md' }[e] || 'txt';
  };
  function resaltar(txt, leng) {
    const L = LENG[leng];
    if (!L || txt.length > 300000) return esc(txt);
    const [re, clases] = L;
    re.lastIndex = 0;
    let out = '', i = 0, m;
    while ((m = re.exec(txt))) {
      if (m[0] === '') { re.lastIndex++; continue; }
      const g = m.findIndex((x, k) => k > 0 && x !== undefined);
      out += esc(txt.slice(i, m.index)) + `<span class="${clases[g] || ''}">${esc(m[0])}</span>`;
      i = m.index + m[0].length;
    }
    return out + esc(txt.slice(i));
  }

  function crear(cont, { alCambiar = () => {}, alGuardar = () => {}, alMover = () => {} } = {}) {
    cont.classList.add('ed');
    cont.innerHTML = '<pre class="nums" aria-hidden="true"></pre><div class="zona"><pre class="hl" aria-hidden="true"></pre><textarea spellcheck="false" autocapitalize="off" autocomplete="off" wrap="off" aria-label="Código"></textarea></div>';
    const nums = cont.querySelector('.nums'), hl = cont.querySelector('.hl'), ta = cont.querySelector('textarea');
    let leng = 'txt', lineaError = null, nLineas = 0, cuadro = 0, lineaCur = 1;

    function dibujar() {
      cuadro = 0;
      const v = ta.value;
      hl.innerHTML = resaltar(v, leng) + '\n ';
      const n = v.split('\n').length;
      if (n !== nLineas || nums.dataset.err !== String(lineaError) || nums.dataset.cur !== String(lineaCur)) {
        nLineas = n;
        nums.dataset.err = String(lineaError); nums.dataset.cur = String(lineaCur);
        let s = '';
        for (let k = 1; k <= n; k++) s += k === lineaError ? `<span class="err">${k}</span>\n` : k === lineaCur ? `<span class="cur">${k}</span>\n` : k + '\n';
        nums.innerHTML = s + ' ';
      }
      sincronizar();
    }
    const pedir = () => { if (!cuadro) cuadro = requestAnimationFrame(dibujar); };
    function sincronizar() { hl.scrollTop = ta.scrollTop; hl.scrollLeft = ta.scrollLeft; nums.scrollTop = ta.scrollTop; }
    function posicion() {
      const antes = ta.value.slice(0, ta.selectionStart), l = antes.split('\n');
      const nueva = l.length;
      if (nueva !== lineaCur) { lineaCur = nueva; pedir(); }
      alMover({ linea: l.length, columna: l[l.length - 1].length + 1, desde: ta.selectionStart });
    }
    // insertText conserva el deshacer del navegador; si no está, setRangeText
    function insertar(txt, desde = ta.selectionStart, hasta = ta.selectionEnd) {
      ta.setSelectionRange(desde, hasta);
      if (!document.execCommand || !document.execCommand('insertText', false, txt)) { ta.setRangeText(txt, desde, hasta, 'end'); ta.dispatchEvent(new Event('input')); }
    }
    ta.addEventListener('input', () => { if (lineaError) lineaError = null; pedir(); alCambiar(ta.value); posicion(); });
    ta.addEventListener('scroll', sincronizar);
    ['keyup', 'click', 'select'].forEach((e) => ta.addEventListener(e, posicion));
    ta.addEventListener('keydown', (e) => {
      const mod = e.ctrlKey || e.metaKey;
      if (mod && e.key.toLowerCase() === 's') { e.preventDefault(); return alGuardar(); }
      if (ta.readOnly) return;
      const v = ta.value, a = ta.selectionStart, b = ta.selectionEnd;
      const iniLinea = v.lastIndexOf('\n', a - 1) + 1;
      if (e.key === 'Tab') {
        e.preventDefault();
        if (a === b && !e.shiftKey) return insertar('  ');
        // Varias líneas: indentar o desindentar el bloque
        const fin = v.indexOf('\n', b - (b > a && v[b - 1] === '\n' ? 1 : 0)), hastaL = fin < 0 ? v.length : fin;
        const bloque = v.slice(iniLinea, hastaL);
        const nuevo = e.shiftKey ? bloque.replace(/^ {1,2}/gm, '') : bloque.replace(/^/gm, '  ');
        insertar(nuevo, iniLinea, hastaL);
        ta.setSelectionRange(iniLinea, iniLinea + nuevo.length);
        return;
      }
      if (e.key === 'Enter' && !mod && !e.altKey) {
        e.preventDefault();
        const ind = (v.slice(iniLinea, a).match(/^[ \t]*/) || [''])[0];
        const prev = v.slice(iniLinea, a).trimEnd().slice(-1), sig = v[b];
        if ('{[('.includes(prev) && prev && ({ '{': '}', '[': ']', '(': ')' })[prev] === sig) {
          insertar('\n' + ind + '  ' + '\n' + ind);
          const p = a + 1 + ind.length + 2; ta.setSelectionRange(p, p);
          return;
        }
        return insertar('\n' + ind + ('{[('.includes(prev) && prev ? '  ' : ''));
      }
      if (mod && e.key === '/' && (leng === 'js' || leng === 'css')) {
        e.preventDefault();
        const fin = v.indexOf('\n', b), hastaL = fin < 0 ? v.length : fin, bloque = v.slice(iniLinea, hastaL);
        let nuevo;
        if (leng === 'js') nuevo = /^\s*\/\/ ?/.test(bloque.split('\n')[0]) ? bloque.replace(/^(\s*)\/\/ ?/gm, '$1') : bloque.replace(/^(\s*)/gm, '$1// ');
        else nuevo = /^\s*\/\*.*\*\/\s*$/.test(bloque) ? bloque.replace(/\/\* ?| ?\*\//g, '') : `/* ${bloque} */`;
        insertar(nuevo, iniLinea, hastaL);
      }
    });

    return {
      el: ta,
      poner(texto, { lenguaje = 'txt', soloLectura = false } = {}) {
        leng = lenguaje; lineaError = null; lineaCur = 1; nLineas = -1;
        ta.value = texto; ta.readOnly = soloLectura;
        ta.scrollTop = 0; ta.scrollLeft = 0; ta.setSelectionRange(0, 0);
        dibujar();
      },
      texto: () => ta.value,
      linea: () => lineaCur,
      desde: () => ta.selectionStart,
      foco: () => ta.focus(),
      error(l) { lineaError = l || null; nLineas = -1; dibujar(); if (l) this.irA(l, false); },
      irA(l, enfocar = true) {
        const ls = ta.value.split('\n'); l = Math.max(1, Math.min(l, ls.length));
        const p = ls.slice(0, l - 1).reduce((s, x) => s + x.length + 1, 0);
        if (enfocar) ta.focus();
        ta.setSelectionRange(p, p);
        ta.scrollTop = Math.max(0, (l - 6) * 20);
        lineaCur = l; nLineas = -1; dibujar();
      },
    };
  }
  window.EditorCodigo = { crear, resaltar, lenguajeDe };
})();
