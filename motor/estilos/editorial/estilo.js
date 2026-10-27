// Estilo de la galería. Formato y perillas: referencias/estilos.md.
TRAMOYA.registrarEstilo({
  id: 'editorial',
  nombre: 'Editorial',
  descripcion: 'Revista impresa: serif de texto con itálicas finas para el acento, papel cálido, antetítulos en versalitas. Transformaciones lentas, sin cámara.',
  etiquetas: ['claro', 'oscuro', 'serif', 'revista', 'cálido', 'pausado'],
  referencia: 'Una revista cultural de papel ahuesado: titulares en serif con itálicas livianas, rojo óxido, mucho aire, las cosas se acomodan solas sin que la cámara se mueva.',
  fuentes: [
    { familia: 'Fraunces', archivo: 'fuentes/fraunces.woff2', peso: '100 900' },
    { familia: 'Fraunces', archivo: 'fuentes/fraunces-italic.woff2', peso: '100 900', estilo: 'italic' },
    { familia: 'Libre Franklin', archivo: 'fuentes/libre-franklin.woff2', peso: '100 900' },
    { familia: 'Libre Franklin', archivo: 'fuentes/libre-franklin-italic.woff2', peso: '100 900', estilo: 'italic' },
  ],
  tipografia: {
    display: "'Fraunces', Georgia, 'Times New Roman', serif", texto: "'Libre Franklin', 'Helvetica Neue', sans-serif", mono: "ui-monospace, Menlo, monospace",
    peso: 560, pesoAcento: 400, interletra: -0.02, alto: 1.04, italica: true,
  },
  forma: {
    radio: 0.25, borde: 1, numeral: false,
    kicker: { fuente: 'texto', peso: 600, interletra: 0.16, mayusculas: true, barra: false },
  },
  temas: {
    papel: {
      nombre: 'Papel', claro: true,
      vars: { bg: '#f3eee4', panel: '#fbf8f1', 'panel-2': '#e9e2d4', text: '#1f1b16', strong: '#14110d', muted: '#6a6157', lead: '#302a23',
        accent: '#9a2b1d', 'accent-2': '#1f4e5f', line: '#d6cdbd', glow: 'transparent', 'glow-2': 'transparent',
        overlay: 'rgba(243,238,228,.9)', code: '#fbf8f1', grid: 'transparent', dot: 'rgba(40,30,20,.05)' },
    },
    salvia: {
      nombre: 'Salvia', claro: true,
      vars: { bg: '#e5e9df', panel: '#f3f5ef', 'panel-2': '#d6ddcf', text: '#1b211b', strong: '#101510', muted: '#5b665a', lead: '#2a332a',
        accent: '#2f5b3a', 'accent-2': '#8a4b2a', line: '#c4cdbc', glow: 'transparent', 'glow-2': 'transparent',
        overlay: 'rgba(229,233,223,.9)', code: '#f3f5ef', grid: 'transparent', dot: 'rgba(20,40,20,.05)' },
    },
    tinta: {
      nombre: 'Tinta',
      vars: { bg: '#16181d', panel: '#1e2128', 'panel-2': '#262a33', text: '#ece6da', strong: '#fff8ec', muted: '#a39c90', lead: '#ddd6c9',
        accent: '#ec8a6e', 'accent-2': '#9cc3c9', line: '#333843', glow: 'transparent', 'glow-2': 'transparent',
        overlay: 'rgba(22,24,29,.86)', code: '#121418', grid: 'transparent', dot: 'rgba(255,255,255,.04)' },
    },
  },
  marca: {
    base: { forma: 'monograma', radio: 0, peso: 600, tracking: -10, isoEscala: 1.2 },
    variantes: { anillo: { forma: 'anillo', grosor: 4 } },
  },
  motion: { tema: 'papel', transicion: 'morph', entrada: 'suave', ritmo: 1.25, duracion: 1.6, velocidad: 0.9, desenfoque: false, grano: 0.05, cromo: true },
  reel: { bpm: 92, sonido: { activo: true, volumen: 0.8, progresion: 'melancolica', acordes: true, bombo: false, golpes: 'partes', riser: false } },
  // Itálica liviana para el acento y filete fino bajo el antetítulo
  css: `
    .scene .accent, .claim h2 em, h1 .accent, h2 .accent{font-style:italic}
    .scene .kicker{padding-bottom:12px; border-bottom:1px solid var(--line)}`,
});
