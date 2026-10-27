// Estilo de la galería. Formato y perillas: referencias/estilos.md.
TRAMOYA.registrarEstilo({
  id: 'terminal',
  nombre: 'Terminal',
  descripcion: 'Todo en monoespaciada, fósforo verde o ámbar sobre negro, líneas de barrido y entradas a saltos como un teletipo.',
  etiquetas: ['oscuro', 'claro', 'mono', 'técnico', 'retro', 'verde'],
  referencia: 'Una consola CRT de los 80: texto monoespaciado verde fósforo, barrido de líneas, prompt con cursor, todo aparece de golpe como si lo tipeara alguien.',
  fuentes: [
    { familia: 'JetBrains Mono', archivo: 'fuentes/jetbrains-mono.woff2', peso: '100 800' },
    { familia: 'JetBrains Mono', archivo: 'fuentes/jetbrains-mono-italic.woff2', peso: '100 800', estilo: 'italic' },
  ],
  tipografia: {
    display: "'JetBrains Mono', ui-monospace, monospace", texto: "'JetBrains Mono', ui-monospace, monospace", mono: "'JetBrains Mono', ui-monospace, monospace",
    peso: 700, pesoAcento: 700, pesoTexto: 400, interletra: -0.03, alto: 1.12, italica: false,
  },
  forma: {
    radio: 0, borde: 1, numeral: false, trama: 40,
    kicker: { fuente: 'mono', peso: 500, interletra: 0.02, mayusculas: false, barra: false },
  },
  temas: {
    fosforo: {
      nombre: 'Fósforo',
      vars: { bg: '#070c08', panel: '#0d160f', 'panel-2': '#122015', text: '#b9f5c5', strong: '#e0ffe6', muted: '#6fa57b', lead: '#a8e8b4',
        accent: '#3dff7f', 'accent-2': '#ffd23f', line: '#1d3a24', glow: 'rgba(61,255,127,.08)', 'glow-2': 'rgba(61,255,127,.04)',
        overlay: 'rgba(7,12,8,.88)', code: '#050905', grid: 'rgba(61,255,127,.05)', dot: 'transparent' },
    },
    ambar: {
      nombre: 'Ámbar',
      vars: { bg: '#100b03', panel: '#1a1207', 'panel-2': '#24190a', text: '#ffd79a', strong: '#ffe8c2', muted: '#b08a52', lead: '#f5cc8c',
        accent: '#ffb000', 'accent-2': '#ff6a3d', line: '#3a2a10', glow: 'rgba(255,176,0,.08)', 'glow-2': 'rgba(255,106,61,.04)',
        overlay: 'rgba(16,11,3,.88)', code: '#0b0702', grid: 'rgba(255,176,0,.05)', dot: 'transparent' },
    },
    papel: {
      nombre: 'Papel continuo', claro: true,
      vars: { bg: '#f1f0e8', panel: '#fbfaf4', 'panel-2': '#e4e3d8', text: '#1a1a18', strong: '#000000', muted: '#5d5d55', lead: '#2a2a26',
        accent: '#0a7a33', 'accent-2': '#a14b00', line: '#cfcec2', glow: 'transparent', 'glow-2': 'transparent',
        overlay: 'rgba(241,240,232,.9)', code: '#fbfaf4', grid: 'rgba(10,122,51,.07)', dot: 'transparent' },
    },
  },
  marca: {
    base: { forma: 'puntos', grosor: 9, radio: 0, peso: 700, tracking: 0, colorPalabra: 'tinta' },
    variantes: { monograma: { forma: 'monograma', radio: 0 } },
  },
  motion: { tema: 'fosforo', transicion: 'camara', entrada: 'escalon', ritmo: 0.8, duracion: 1, recorrido: 0.7, velocidad: 1, desenfoque: false, grano: 0.08, cromo: true },
  reel: { bpm: 124, sonido: { activo: true, volumen: 0.8, progresion: 'fija', acordes: false, bombo: true, golpes: 'compas', riser: false } },
  // Prompt delante del antetítulo, cursor al final del título y líneas de barrido sobre el escenario
  css: `
    .kicker span::before{content:'> '; color:var(--muted)}
    /* La mono es más ancha: la tabla y la bajada del póster, más compactas */
    .poster .claim .lead{font-size:calc(var(--lead-size, 60px) * .78)}
    .scene .mrow{font-size:25px; padding:16px 0 16px 36px} .scene .mrow::before{top:16px; bottom:16px}
    .scene h2::after{content:'_'; color:var(--accent); margin-left:.1em}
    .stage:not(.marking)::before{content:""; position:absolute; inset:0; z-index:29; pointer-events:none;
      background:repeating-linear-gradient(0deg, rgba(0,0,0,.16) 0 2px, transparent 2px 4px)}`,
});
