// Estilo de la galería. Formato y perillas: referencias/estilos.md.
TRAMOYA.registrarEstilo({
  id: 'cine',
  nombre: 'Cine',
  descripcion: 'Condensada en mayúsculas, franjas de cinemascope, grano fuerte y una cámara que viaja lenta y lejos. Naranja y verde azulado.',
  etiquetas: ['oscuro', 'claro', 'condensada', 'cinematográfico', 'grano', 'dramático'],
  referencia: 'Tráiler de película: títulos condensados enormes en mayúsculas, letterbox negro, grano de 35 mm, gradación naranja y verde azulado, travellings largos.',
  fuentes: [
    { familia: 'Oswald', archivo: 'fuentes/oswald.woff2', peso: '200 700' },
    { familia: 'Work Sans', archivo: 'fuentes/work-sans.woff2', peso: '100 900' },
    { familia: 'Work Sans', archivo: 'fuentes/work-sans-italic.woff2', peso: '100 900', estilo: 'italic' },
  ],
  tipografia: {
    display: "'Oswald', 'Arial Narrow', sans-serif", texto: "'Work Sans', system-ui, sans-serif", mono: "ui-monospace, Menlo, monospace",
    peso: 600, pesoAcento: 600, pesoTexto: 300, interletra: 0.01, alto: 1, mayusculas: true, italica: false,
  },
  forma: {
    radio: 0, borde: 1, numeral: true,
    kicker: { fuente: 'texto', peso: 500, interletra: 0.45, mayusculas: true, barra: 80 },
  },
  temas: {
    sala: {
      nombre: 'Sala',
      vars: { bg: '#0b0a09', panel: '#151311', 'panel-2': '#1d1a17', text: '#ece4d8', strong: '#fff7ea', muted: '#9d9385', lead: '#d9d0c2',
        accent: '#ff8a3d', 'accent-2': '#3fc1c9', line: '#2c2723', glow: 'rgba(255,138,61,.10)', 'glow-2': 'rgba(63,193,201,.08)',
        overlay: 'rgba(11,10,9,.8)', code: '#080706', grid: 'transparent', dot: 'transparent' },
    },
    noir: {
      nombre: 'Noir',
      vars: { bg: '#0c0c0c', panel: '#161616', 'panel-2': '#1f1f1f', text: '#e6e6e6', strong: '#ffffff', muted: '#8f8f8f', lead: '#d2d2d2',
        accent: '#e0263f', 'accent-2': '#bdbdbd', line: '#2a2a2a', glow: 'rgba(255,255,255,.05)', 'glow-2': 'rgba(224,38,63,.06)',
        overlay: 'rgba(12,12,12,.8)', code: '#070707', grid: 'transparent', dot: 'transparent' },
    },
    sepia: {
      nombre: 'Sepia', claro: true,
      vars: { bg: '#e8dcc8', panel: '#f3ead9', 'panel-2': '#dccdb4', text: '#2a2118', strong: '#1a140e', muted: '#6a5a47', lead: '#3a2f23',
        accent: '#9c3d14', 'accent-2': '#2f6a6e', line: '#c9b89c', glow: 'transparent', 'glow-2': 'transparent',
        overlay: 'rgba(232,220,200,.86)', code: '#f3ead9', grid: 'transparent', dot: 'transparent' },
    },
  },
  marca: {
    base: { forma: 'franjas', n: 5, grosor: 5, inclinacion: 10, colorFranjas: 'degradado', peso: 600, tracking: 30 },
    variantes: { anillo: { forma: 'anillo', grosor: 5 } },
  },
  // Sin cromo: el letterbox ocupa el lugar del encabezado y el pie
  motion: { tema: 'sala', transicion: 'camara', entrada: 'suave', ritmo: 1.35, duracion: 2, recorrido: 1.4, velocidad: 0.9, desenfoque: true, grano: 0.16, cromo: false, coreografias: ['tipo', 'editorial', 'sobria'] },
  reel: { bpm: 84, sonido: { activo: true, volumen: 0.95, progresion: 'tension', acordes: true, bombo: true, golpes: 'partes', riser: true } },
  // Franjas de cinemascope arriba y abajo del escenario
  css: `
    .stage:not(.marking)::before{content:""; position:absolute; inset:0; z-index:24; pointer-events:none; box-shadow:inset 0 64px 0 #000, inset 0 -64px 0 #000}`,
});
