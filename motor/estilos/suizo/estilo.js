// Estilo de la galería. Formato y perillas: referencias/estilos.md.
TRAMOYA.registrarEstilo({
  id: 'suizo',
  nombre: 'Suizo',
  descripcion: 'Estilo tipográfico internacional: grotesca apretada, grilla a la vista, rojo puro, sin adornos. Cámara rápida y precisa.',
  etiquetas: ['claro', 'oscuro', 'grotesca', 'grilla', 'rojo', 'sobrio'],
  referencia: 'Afiches de Müller-Brockmann y Experimental Jetset: retícula visible, alineado a la izquierda, una sola grotesca en negrita, rojo y negro sobre blanco, movimiento seco y exacto.',
  fuentes: [
    { familia: 'Inter Tight', archivo: 'fuentes/inter-tight.woff2', peso: '100 900' },
    { familia: 'Inter', archivo: 'fuentes/inter.woff2', peso: '100 900' },
  ],
  tipografia: {
    display: "'Inter Tight', 'Helvetica Neue', Arial, sans-serif", texto: "'Inter', 'Helvetica Neue', Arial, sans-serif", mono: "ui-monospace, Menlo, monospace",
    peso: 700, pesoAcento: 700, interletra: -0.04, alto: 0.98, italica: false,
  },
  forma: {
    radio: 0, borde: 1, numeral: true, trama: 120,
    kicker: { fuente: 'texto', peso: 600, interletra: 0.01, mayusculas: false, barra: 24 },
  },
  temas: {
    blanco: {
      nombre: 'Blanco', claro: true,
      vars: { bg: '#f2f2ee', panel: '#ffffff', 'panel-2': '#e6e6e1', text: '#141414', strong: '#000000', muted: '#5a5a58', lead: '#232323',
        accent: '#d6000f', 'accent-2': '#000000', line: '#c9c9c4', glow: 'transparent', 'glow-2': 'transparent',
        overlay: 'rgba(242,242,238,.92)', code: '#ffffff', grid: 'rgba(0,0,0,.07)', dot: 'transparent' },
    },
    negro: {
      nombre: 'Negro',
      vars: { bg: '#0e0e0e', panel: '#171717', 'panel-2': '#202020', text: '#efefec', strong: '#ffffff', muted: '#9c9c98', lead: '#deded9',
        accent: '#ff3b30', 'accent-2': '#ffffff', line: '#303030', glow: 'transparent', 'glow-2': 'transparent',
        overlay: 'rgba(14,14,14,.88)', code: '#090909', grid: 'rgba(255,255,255,.06)', dot: 'transparent' },
    },
    rojo: {
      nombre: 'Rojo',
      vars: { bg: '#d0000e', panel: '#9e000a', 'panel-2': '#86000a', text: '#ffffff', strong: '#ffffff', muted: '#ffe6e3', lead: '#fff1f0',
        accent: '#111111', 'accent-2': '#ffffff', line: '#ef5a55', glow: 'transparent', 'glow-2': 'transparent',
        overlay: 'rgba(208,0,14,.9)', code: '#9e000a', grid: 'rgba(255,255,255,.12)', dot: 'transparent' },
    },
  },
  marca: {
    base: { forma: 'puntos', grosor: 10, radio: 0, colorFranjas: 'bandera', peso: 700, tracking: -40, isoEscala: 1.1 },
    variantes: { franjas: { forma: 'franjas', n: 3, grosor: 14, inclinacion: 0, colorFranjas: 'acento' } },
  },
  motion: { tema: 'blanco', transicion: 'camara', entrada: 'expo', ritmo: 0.85, duracion: 1.1, recorrido: 1.2, velocidad: 1, desenfoque: true, grano: false, cromo: true },
  reel: { bpm: 128, sonido: { activo: true, volumen: 0.85, progresion: 'fija', acordes: false, bombo: true, golpes: 'compas', riser: false } },
});
