// Estilo de la galería. Formato y perillas: referencias/estilos.md.
TRAMOYA.registrarEstilo({
  id: 'minimal',
  nombre: 'Minimal',
  descripcion: 'Una sans, peso medio, casi monocromo: el acento es un gris. Sin barras, sin números de fondo, mucho aire. Las cosas se transforman en su lugar.',
  etiquetas: ['claro', 'oscuro', 'sans', 'minimal', 'monocromo', 'aire'],
  referencia: 'Presentación de producto estilo keynote minimalista: fondo blanco roto, texto negro en peso medio, el acento en gris, nada que sobre, transiciones que solo reacomodan.',
  fuentes: [
    { familia: 'DM Sans', archivo: 'fuentes/dm-sans.woff2', peso: '100 1000' },
    { familia: 'DM Sans', archivo: 'fuentes/dm-sans-italic.woff2', peso: '100 1000', estilo: 'italic' },
  ],
  tipografia: {
    display: "'DM Sans', system-ui, sans-serif", texto: "'DM Sans', system-ui, sans-serif", mono: "ui-monospace, Menlo, monospace",
    peso: 500, pesoAcento: 500, pesoTexto: 400, interletra: -0.035, alto: 1.06, italica: false,
  },
  forma: {
    radio: 0.5, borde: 1, numeral: false, marcador: false,
    kicker: { fuente: 'texto', peso: 500, interletra: 0.01, mayusculas: false, barra: false },
  },
  temas: {
    blanco: {
      nombre: 'Blanco', claro: true,
      vars: { bg: '#fafaf9', panel: '#ffffff', 'panel-2': '#f1f1ef', text: '#1c1c1b', strong: '#0a0a0a', muted: '#6c6c68', lead: '#2b2b2a',
        accent: '#76766f', 'accent-2': '#0a0a0a', line: '#e4e4e0', glow: 'transparent', 'glow-2': 'transparent',
        overlay: 'rgba(250,250,249,.9)', code: '#ffffff', grid: 'transparent', dot: 'transparent' },
    },
    grafito: {
      nombre: 'Grafito',
      vars: { bg: '#121212', panel: '#1a1a1a', 'panel-2': '#222222', text: '#e8e8e6', strong: '#ffffff', muted: '#8f8f8b', lead: '#d6d6d3',
        accent: '#9d9d97', 'accent-2': '#ffffff', line: '#2a2a2a', glow: 'transparent', 'glow-2': 'transparent',
        overlay: 'rgba(18,18,18,.88)', code: '#0d0d0d', grid: 'transparent', dot: 'transparent' },
    },
    arena: {
      nombre: 'Arena', claro: true,
      vars: { bg: '#efebe4', panel: '#f8f6f2', 'panel-2': '#e4dfd6', text: '#24211d', strong: '#141210', muted: '#6e675d', lead: '#34302a',
        accent: '#7d7466', 'accent-2': '#141210', line: '#dcd6cb', glow: 'transparent', 'glow-2': 'transparent',
        overlay: 'rgba(239,235,228,.9)', code: '#f8f6f2', grid: 'transparent', dot: 'transparent' },
    },
  },
  marca: {
    base: { forma: 'ninguna', layout: 'palabra', peso: 500, tracking: -40, colorPalabra: 'tinta' },
    variantes: { punto: { forma: 'anillo', grosor: 3 } },
  },
  motion: { tema: 'blanco', transicion: 'morph', entrada: 'suave', ritmo: 1.2, duracion: 1.4, recorrido: 1, velocidad: 1, desenfoque: false, grano: false, cromo: true, coreografias: ['tipo', 'sobria', 'quieta'] },
  reel: { bpm: 100, sonido: { activo: true, volumen: 0.7, progresion: 'luminosa', acordes: true, bombo: false, golpes: 'no', riser: false } },
  // Las tarjetas sin relleno, solo con filete
  css: `
    .card, .bars-card, .col-card, .scope-card{background:transparent}`,
});
