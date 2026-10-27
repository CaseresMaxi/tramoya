// Estilo de la galería. Formato y perillas: referencias/estilos.md.
TRAMOYA.registrarEstilo({
  id: 'pastel',
  nombre: 'Juguetón pastel',
  descripcion: 'Redonda y gordita, rosa chicle y menta sobre crema, todo con esquinas muy redondas y sombra de color. Entra con resorte.',
  etiquetas: ['claro', 'oscuro', 'redondo', 'juguetón', 'pastel', 'infantil'],
  referencia: 'Ilustración de app para chicos / marca de helados: colores pastel, formas redondas, sombras planas de color, cosas que rebotan al llegar.',
  fuentes: [
    { familia: 'Fredoka', archivo: 'fuentes/fredoka.woff2', peso: '300 700' },
    { familia: 'Nunito', archivo: 'fuentes/nunito.woff2', peso: '200 1000' },
    { familia: 'Nunito', archivo: 'fuentes/nunito-italic.woff2', peso: '200 1000', estilo: 'italic' },
  ],
  tipografia: {
    display: "'Fredoka', 'Nunito', system-ui, sans-serif", texto: "'Nunito', system-ui, sans-serif", mono: "ui-monospace, Menlo, monospace",
    peso: 600, pesoAcento: 600, pesoTexto: 500, interletra: -0.01, alto: 1.05, italica: false,
  },
  forma: {
    radio: 1.8, borde: 3, numeral: true,
    sombra: '10px 10px 0 color-mix(in srgb, var(--accent) 28%, transparent)',
    kicker: { fuente: 'texto', peso: 800, interletra: 0.12, mayusculas: true, barra: 30 },
  },
  temas: {
    helado: {
      nombre: 'Helado', claro: true,
      vars: { bg: '#fff3e6', panel: '#ffffff', 'panel-2': '#ffe6d2', text: '#3b2a4a', strong: '#2b1840', muted: '#76627f', lead: '#47355a',
        accent: '#e8336f', 'accent-2': '#14a88e', line: '#f2d6c0', glow: 'rgba(232,51,111,.10)', 'glow-2': 'rgba(20,168,142,.12)',
        overlay: 'rgba(255,243,230,.88)', code: '#ffffff', grid: 'transparent', dot: 'rgba(59,42,74,.10)' },
    },
    menta: {
      nombre: 'Menta', claro: true,
      vars: { bg: '#e6f8f0', panel: '#ffffff', 'panel-2': '#d2f0e3', text: '#203a35', strong: '#0f2a25', muted: '#557069', lead: '#2b4741',
        accent: '#6a3df0', 'accent-2': '#ef5b8c', line: '#bfe6d6', glow: 'rgba(106,61,240,.10)', 'glow-2': 'rgba(239,91,140,.10)',
        overlay: 'rgba(230,248,240,.88)', code: '#ffffff', grid: 'transparent', dot: 'rgba(15,42,37,.08)' },
    },
    uva: {
      nombre: 'Uva',
      vars: { bg: '#2a1846', panel: '#35205a', 'panel-2': '#40286b', text: '#fff1fb', strong: '#ffffff', muted: '#cbb3e3', lead: '#f5e3f7',
        accent: '#ffb3d9', 'accent-2': '#8ef0cf', line: '#54377f', glow: 'rgba(255,179,217,.14)', 'glow-2': 'rgba(142,240,207,.10)',
        overlay: 'rgba(42,24,70,.86)', code: '#22123a', grid: 'transparent', dot: 'rgba(255,255,255,.08)' },
    },
  },
  marca: {
    base: { forma: 'puntos', grosor: 13, radio: 9, peso: 600, tracking: 0, isoEscala: 1.2 },
    variantes: { ondas: { forma: 'onda', n: 3, grosor: 10, colorFranjas: 'alternado' } },
  },
  motion: { tema: 'helado', transicion: 'franjas', franjas: { n: 5, color: 'alternado', grosor: 1.1 }, entrada: 'resorte', ritmo: 1.1, duracion: 1.4, recorrido: 1, velocidad: 1, desenfoque: true, grano: false, cromo: true },
  reel: { bpm: 126, sonido: { activo: true, volumen: 0.85, progresion: 'luminosa', acordes: true, bombo: true, golpes: 'compas', riser: false } },
  // Franjas y marcadores bien redondos
  css: `
    .wipes i{border-radius:999px}
    .kicker i, .pt::before{border-radius:999px}`,
});
