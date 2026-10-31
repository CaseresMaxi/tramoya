// Estilo de la galería. Formato y perillas: referencias/estilos.md.
TRAMOYA.registrarEstilo({
  id: 'noche-dorada',
  nombre: 'Noche dorada',
  descripcion: 'Serif de alto contraste con itálicas, dorado sobre negro cálido, franjas que barren. Teatral y elegante.',
  etiquetas: ['oscuro', 'serif', 'elegante', 'dorado', 'teatral'],
  referencia: 'Telón de teatro antes de la función: negro profundo, dorado, títulos en serif con itálicas, movimiento ágil pero con peso.',
  fuentes: [
    { familia: 'Playfair Display', archivo: 'fuentes/playfair.woff2', peso: '400 900' },
    { familia: 'Playfair Display', archivo: 'fuentes/playfair-italic.woff2', peso: '400 900', estilo: 'italic' },
    { familia: 'Inter', archivo: 'fuentes/inter.woff2', peso: '100 900' },
  ],
  tipografia: {
    display: "'Playfair Display', Georgia, serif", texto: "'Inter', system-ui, sans-serif", mono: "ui-monospace, 'JetBrains Mono', Menlo, monospace",
    peso: 800, interletra: -0.02, italica: true,
  },
  temas: {
    noche: {
      nombre: 'Noche',
      vars: { bg: '#0d0d0f', panel: '#151518', 'panel-2': '#1b1b20', text: '#f4f1eb', strong: '#ffffff', muted: '#b7b1a7', lead: '#e8e3db',
        accent: '#d7a54a', 'accent-2': '#e1c685', line: '#2b2b31', glow: 'rgba(215,165,74,.10)', 'glow-2': 'rgba(157,47,47,.12)',
        overlay: 'rgba(13,13,15,.86)', code: '#111114', grid: 'transparent', dot: 'rgba(255,255,255,.07)' },
    },
    carmin: {
      nombre: 'Carmín',
      vars: { bg: '#14090b', panel: '#1d1013', 'panel-2': '#2a161b', text: '#f7efe8', strong: '#fff7f2', muted: '#c9b4b0', lead: '#f0e2db',
        accent: '#e0605a', 'accent-2': '#e8c9a0', line: '#3d2328', glow: 'rgba(212,74,69,.16)', 'glow-2': 'rgba(232,201,160,.06)',
        overlay: 'rgba(20,9,11,.86)', code: '#100608', grid: 'transparent', dot: 'rgba(255,235,225,.07)' },
    },
    papel: {
      nombre: 'Papel (claro)', claro: true,
      vars: { bg: '#f3eadc', panel: '#fff8ee', 'panel-2': '#ece1d0', text: '#1c1612', strong: '#140f0c', muted: '#6b5e52', lead: '#3a322b',
        accent: '#8a5e17', 'accent-2': '#b07f2c', line: '#d9cbb8', glow: 'rgba(154,107,31,.10)', 'glow-2': 'rgba(140,42,42,.06)',
        overlay: 'rgba(243,234,220,.9)', code: '#fff8ee', grid: 'transparent', dot: 'rgba(60,40,20,.12)' },
    },
  },
  marca: {
    base: { forma: 'franjas', n: 4, grosor: 9, inclinacion: 5, colorFranjas: 'bandera', peso: 800, tracking: -20 },
    variantes: {
      anillo: { forma: 'anillo', grosor: 8 },
      monograma: { forma: 'monograma', radio: 8 },
      'mono blanco': { tinta: '#ffffff', acento: '#ffffff', fondo: '#0d0d0f', claro: { tinta: '#000000', acento: '#000000', fondo: '#ffffff' } },
    },
  },
  motion: { tema: 'noche', transicion: 'franjas', velocidad: 1, desenfoque: true, grano: true, cromo: true, coreografias: ['tipo', 'editorial', 'cinetica'] },
  reel: { bpm: 120, sonido: { activo: true, volumen: 0.9, progresion: 'epica', acordes: true, bombo: true, golpes: 'compas', riser: true } },
});
