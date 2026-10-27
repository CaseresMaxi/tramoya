// Estilo de la galería. Formato y perillas: referencias/estilos.md.
TRAMOYA.registrarEstilo({
  id: 'neon',
  nombre: 'Neón synth',
  descripcion: 'Grotesca ancha, magenta y cian que brillan sobre violeta noche, grilla de horizonte, muchas franjas alternadas y desenfoque.',
  etiquetas: ['oscuro', 'neón', 'synthwave', 'ancho', 'brillante'],
  referencia: 'Synthwave / retrowave: violeta profundo, magenta y cian con resplandor, grilla de horizonte, tipografía ancha, transiciones rápidas con estelas.',
  fuentes: [
    { familia: 'Unbounded', archivo: 'fuentes/unbounded.woff2', peso: '200 900' },
    { familia: 'Sora', archivo: 'fuentes/sora.woff2', peso: '100 800' },
  ],
  tipografia: {
    display: "'Unbounded', 'Arial Black', sans-serif", texto: "'Sora', system-ui, sans-serif", mono: "ui-monospace, Menlo, monospace",
    peso: 700, pesoAcento: 700, pesoTexto: 300, interletra: -0.03, alto: 1.06, italica: false,
  },
  forma: {
    radio: 0.6, borde: 1, numeral: true, trama: 80,
    sombra: '0 0 0 1px color-mix(in srgb, var(--accent) 30%, transparent), 0 0 60px color-mix(in srgb, var(--accent) 16%, transparent)',
    kicker: { fuente: 'texto', peso: 600, interletra: 0.3, mayusculas: true, barra: 46 },
  },
  temas: {
    synth: {
      nombre: 'Synth',
      vars: { bg: '#0d0716', panel: '#160d26', 'panel-2': '#1f1233', text: '#efe6ff', strong: '#ffffff', muted: '#a998c9', lead: '#ddd0f5',
        accent: '#ff4fd0', 'accent-2': '#3be8ff', line: '#3a2560', glow: 'rgba(255,79,208,.22)', 'glow-2': 'rgba(59,232,255,.16)',
        overlay: 'rgba(13,7,22,.84)', code: '#09040f', grid: 'rgba(255,79,208,.11)', dot: 'transparent' },
    },
    tron: {
      nombre: 'Tron',
      vars: { bg: '#03080e', panel: '#08131e', 'panel-2': '#0d1c2b', text: '#dff6ff', strong: '#ffffff', muted: '#86a9bb', lead: '#c9ecfa',
        accent: '#2de2ff', 'accent-2': '#ff9d2d', line: '#15334a', glow: 'rgba(45,226,255,.18)', 'glow-2': 'rgba(255,157,45,.10)',
        overlay: 'rgba(3,8,14,.84)', code: '#02060a', grid: 'rgba(45,226,255,.10)', dot: 'transparent' },
    },
    ocaso: {
      nombre: 'Ocaso',
      vars: { bg: '#1a0a14', panel: '#24101c', 'panel-2': '#311626', text: '#ffe9ee', strong: '#ffffff', muted: '#c79aab', lead: '#f7d6df',
        accent: '#ff8a3d', 'accent-2': '#ff3e88', line: '#4a2236', glow: 'rgba(255,138,61,.20)', 'glow-2': 'rgba(255,62,136,.16)',
        overlay: 'rgba(26,10,20,.84)', code: '#12060d', grid: 'rgba(255,138,61,.10)', dot: 'transparent' },
    },
  },
  marca: {
    base: { forma: 'onda', n: 3, grosor: 8, colorFranjas: 'degradado', peso: 700, tracking: -10 },
    variantes: { anillo: { forma: 'anillo', grosor: 6 } },
  },
  motion: { tema: 'synth', transicion: 'franjas', franjas: { n: 6, color: 'alternado', grosor: 0.55 }, entrada: 'expo', ritmo: 0.9, duracion: 1.3, recorrido: 1.2, velocidad: 1.05, desenfoque: true, grano: 0.05, cromo: true },
  reel: { bpm: 110, sonido: { activo: true, volumen: 0.9, progresion: 'epica', acordes: true, bombo: true, golpes: 'compas', riser: true } },
  // Resplandor en el acento y en las cifras
  css: `
    .accent, .figure, .claim h2 em{text-shadow:0 0 28px color-mix(in srgb, var(--accent) 65%, transparent)}
    .wipes i{box-shadow:0 0 40px currentColor}
    .points .pt{grid-template-columns:100px 1fr} .points.sm .pt{grid-template-columns:84px 1fr}`,
});
