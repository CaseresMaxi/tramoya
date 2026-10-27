// Panel de parámetros a partir de un esquema. Lo usan el editor de marca y el póster.
//
// Cada entrada del esquema es un grupo ({ group }), una acción ({ type:'action', label, run, hint })
// o un campo { key, label, type, def, ... } con type:
//   text · url · textarea · color · check · select (options: array u objeto valor → nombre)
//   range (min, max, step, unit)
// Opcional: css (variable CSS que recibe el valor + unit), hint.
(function () {
  const U = window.TRAMOYA;

  const CSS = `
    .tr-panel h4{font:700 11px/1 system-ui,sans-serif; letter-spacing:2px; text-transform:uppercase; color:#d7a54a; margin:18px 0 10px}
    .tr-panel .field{display:grid; gap:5px; margin-bottom:12px}
    .tr-panel .field > span{color:#b7b1a7; font-size:12px; display:flex; justify-content:space-between; gap:8px}
    .tr-panel .field output{color:#f4f1eb; font-variant-numeric:tabular-nums}
    .tr-panel input[type=text], .tr-panel input[type=url], .tr-panel textarea, .tr-panel select{width:100%; background:#0f0f12; color:#f4f1eb; border:1px solid #2b2b31; border-radius:7px; padding:8px 9px; font:inherit; font-size:13px}
    .tr-panel textarea{min-height:64px; resize:vertical; line-height:1.45}
    .tr-panel input[type=range]{accent-color:#d7a54a; width:100%}
    .tr-panel input[type=color]{width:100%; height:32px; background:none; border:1px solid #2b2b31; border-radius:7px; padding:2px}
    .tr-panel .field.check{grid-template-columns:auto 1fr; align-items:center}
    .tr-panel .field.check > span{color:#f4f1eb; font-size:13px}
    .tr-panel small{color:#8d877e; font-size:11.5px; line-height:1.45}
    .tr-btn{background:#24242a; color:#f4f1eb; border:1px solid #2b2b31; border-radius:9px; padding:7px 11px; font:inherit; font-size:13px; cursor:pointer; white-space:nowrap}
    .tr-btn:hover{background:#2f2f36}
    .tr-btn.on{background:#d7a54a; color:#111; border-color:#d7a54a}`;
  let instalado = false;

  const opciones = (o) => (Array.isArray(o) ? o.map((v) => [v, v]) : Object.entries(o || {}));

  function panel({ contenedor, schema, cfg, alCambiar = () => {} }) {
    if (!instalado) { instalado = true; const st = document.createElement('style'); st.textContent = CSS; document.head.appendChild(st); }
    contenedor.classList.add('tr-panel');
    function armar() {
      contenedor.innerHTML = '';
      schema.forEach((f) => {
        if (f.group) return contenedor.insertAdjacentHTML('beforeend', `<h4>${U.esc(f.group)}</h4>`);
        if (f.type === 'action') {
          const wrap = document.createElement('div'), b = document.createElement('button');
          wrap.className = 'field'; b.type = 'button'; b.className = 'tr-btn'; b.textContent = f.label; b.onclick = f.run;
          wrap.append(b);
          if (f.hint) wrap.insertAdjacentHTML('beforeend', `<small>${U.esc(f.hint)}</small>`);
          return contenedor.appendChild(wrap);
        }
        const wrap = document.createElement('label');
        wrap.className = 'field' + (f.type === 'check' ? ' check' : '');
        let input;
        if (f.type === 'textarea') input = document.createElement('textarea');
        else if (f.type === 'select') { input = document.createElement('select'); opciones(typeof f.options === 'function' ? f.options() : f.options).forEach(([v, n]) => input.add(new Option(n, v))); }
        else {
          input = document.createElement('input');
          input.type = f.type === 'check' ? 'checkbox' : f.type || 'text';
          if (f.type === 'range') Object.assign(input, { min: f.min, max: f.max, step: f.step });
        }
        const label = document.createElement('span'), out = document.createElement('output');
        label.textContent = f.label;
        if (f.type === 'range') label.appendChild(out);
        const show = () => { out.textContent = cfg[f.key] + (f.unit && f.unit !== 'px' ? f.unit : ''); };
        if (f.type === 'check') input.checked = !!cfg[f.key];
        else input.value = cfg[f.key] ?? '';
        show();
        input.addEventListener('input', () => {
          cfg[f.key] = f.type === 'check' ? input.checked : f.type === 'range' ? parseFloat(input.value) : input.value;
          show(); alCambiar(f.key, cfg[f.key]);
        });
        if (f.type === 'check') wrap.append(input, label); else wrap.append(label, input);
        if (f.hint) wrap.insertAdjacentHTML('beforeend', `<small>${U.esc(f.hint)}</small>`);
        contenedor.appendChild(wrap);
      });
    }
    armar();
    return { armar };
  }

  // Valores por defecto de un esquema, y solo lo que difiere de ellos (para URLs cortas)
  const defaults = (schema) => Object.fromEntries(schema.filter((f) => f.key).map((f) => [f.key, f.def]));
  const diff = (cfg, defs) => Object.fromEntries(Object.entries(cfg).filter(([k, v]) => v !== defs[k]));
  // Aplica las variables CSS declaradas en el esquema sobre un elemento
  const aplicarCSS = (el, schema, cfg) => schema.filter((f) => f.css).forEach((f) => el.style.setProperty(f.css, cfg[f.key] + (f.unit || '')));

  U.panel = panel;
  Object.assign(U.panel, { defaults, diff, aplicarCSS });
})();
