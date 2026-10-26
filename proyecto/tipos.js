// Tipos de escena propios del proyecto. Se suman a los de motion/tipos.js (y pisan a
// uno con el mismo nombre). Mismo formato: ver el comentario al principio de ese archivo.
//
// Ejemplo: una línea de tiempo con hitos, que se recorre de a uno por avance.
(function () {
  const { md, esc, pairs } = window.TRAMOYA;
  const { kicker, titulo, modo } = window.MOTION.helpers;

  window.TIPOS_PROYECTO = {
    hitos: {
      nombre: 'Línea de tiempo (hitos)', pasos: 'uno',
      campos: [['kicker', 'text', 'Antetítulo'], ['titulo', 'area', 'Título'], ['hitos', 'pairs', 'Hitos: "fecha | qué pasó" por línea']],
      ejemplo: { kicker: 'Recorrido', titulo: 'Cómo *llegamos*.', hitos: 'Marzo | Idea\nJunio | Prototipo\nOctubre | Muestra' },
      css: `
        .hitos{position:absolute; left:300px; right:300px; top:560px; height:4px; background:var(--line)}
        .hitos .h{position:absolute; top:-14px; width:32px; height:32px; margin-left:-16px; border-radius:50%; background:var(--bg); border:6px solid var(--accent)}
        .hitos .lbl{position:absolute; top:60px; width:300px; margin-left:-150px; text-align:center}
        .hitos .lbl b{display:block; font:italic 800 54px/1 var(--font-display); color:var(--accent)}
        .hitos .lbl span{display:block; margin-top:14px; font-size:30px; line-height:1.35; color:var(--lead)}`,
      render: (d) => {
        const H = pairs(d.hitos), n = H.length, uno = modo(d, 'uno') === 'uno';
        const x = (i) => (n > 1 ? (i / (n - 1)) * 100 : 50);
        return `
        <div class="pad">${kicker(d)}${titulo(d)}</div>
        <div class="hitos"><div class="wipe-line" data-m="wipe" data-dur="1.6" data-at=".4" style="position:absolute; inset:0; background:var(--accent)"></div>
          ${H.map((h, i) => {
            const a = uno ? `data-s="${i}" data-at="${i ? 0.1 : 0.9}"` : `data-at="${(0.9 + i * 0.25).toFixed(2)}"`;
            return `<i class="h" style="left:${x(i)}%" data-m="pop" ${a}></i>
            <div class="lbl" data-f="hitos" style="left:${x(i)}%" data-m="up" ${a}><b>${esc(h.t)}</b><span>${md(h.d)}</span></div>`;
          }).join('')}
        </div>`;
      },
    },
  };
})();
