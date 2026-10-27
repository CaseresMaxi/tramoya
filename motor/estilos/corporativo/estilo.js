// Estilo de la galería. Formato y perillas: referencias/estilos.md.
TRAMOYA.registrarEstilo({
  id: 'corporativo',
  nombre: 'Corporativo claro',
  descripcion: 'Sans geométrica amable, azul confiable sobre blanco, tarjetas con sombra suave y antetítulo en pastilla. Movimiento suave y corto.',
  etiquetas: ['claro', 'oscuro', 'sans', 'limpio', 'azul', 'empresa'],
  referencia: 'Producto SaaS / informe de directorio: fondo casi blanco, azul de marca con un verde de apoyo, tarjetas redondeadas con sombra suave, todo prolijo y sin sobresaltos.',
  fuentes: [
    { familia: 'Plus Jakarta Sans', archivo: 'fuentes/plus-jakarta.woff2', peso: '200 800' },
    { familia: 'Plus Jakarta Sans', archivo: 'fuentes/plus-jakarta-italic.woff2', peso: '200 800', estilo: 'italic' },
    { familia: 'Inter', archivo: 'fuentes/inter.woff2', peso: '100 900' },
  ],
  tipografia: {
    display: "'Plus Jakarta Sans', 'Segoe UI', system-ui, sans-serif", texto: "'Inter', 'Segoe UI', system-ui, sans-serif", mono: "ui-monospace, Menlo, monospace",
    peso: 700, pesoAcento: 700, interletra: -0.03, alto: 1.08, italica: false,
  },
  forma: {
    radio: 1.1, borde: 1, numeral: false,
    sombra: '0 24px 60px -20px rgba(16,24,40,.22)',
    kicker: { fuente: 'texto', peso: 600, interletra: 0.06, mayusculas: true, barra: false },
  },
  temas: {
    claro: {
      nombre: 'Claro', claro: true,
      vars: { bg: '#f6f7fb', panel: '#ffffff', 'panel-2': '#eef1f7', text: '#1d2433', strong: '#0b1220', muted: '#5b6577', lead: '#2c3547',
        accent: '#2456e8', 'accent-2': '#0f9f76', line: '#dfe3ec', glow: 'rgba(36,86,232,.08)', 'glow-2': 'rgba(15,159,118,.05)',
        overlay: 'rgba(246,247,251,.9)', code: '#ffffff', grid: 'transparent', dot: 'rgba(11,18,32,.06)' },
    },
    marino: {
      nombre: 'Marino',
      vars: { bg: '#0b1426', panel: '#111d35', 'panel-2': '#172643', text: '#e6ecf7', strong: '#ffffff', muted: '#93a1bd', lead: '#d1daea',
        accent: '#6b96ff', 'accent-2': '#3ddc97', line: '#22345a', glow: 'rgba(107,150,255,.14)', 'glow-2': 'rgba(61,220,151,.06)',
        overlay: 'rgba(11,20,38,.86)', code: '#08101f', grid: 'transparent', dot: 'rgba(255,255,255,.05)' },
    },
    menta: {
      nombre: 'Menta', claro: true,
      vars: { bg: '#f2f8f6', panel: '#ffffff', 'panel-2': '#e2efea', text: '#15302a', strong: '#0a201b', muted: '#4f6b64', lead: '#21403a',
        accent: '#0a7f63', 'accent-2': '#2456e8', line: '#d3e4de', glow: 'rgba(10,127,99,.08)', 'glow-2': 'rgba(36,86,232,.05)',
        overlay: 'rgba(242,248,246,.9)', code: '#ffffff', grid: 'transparent', dot: 'rgba(10,32,27,.06)' },
    },
  },
  marca: {
    base: { forma: 'anillo', grosor: 10, peso: 700, tracking: -20, isoEscala: 1.15 },
    variantes: { puntos: { forma: 'puntos', radio: 6 } },
  },
  motion: { tema: 'claro', transicion: 'camara', entrada: 'suave', ritmo: 1, duracion: 1.3, recorrido: 0.8, velocidad: 1, desenfoque: false, grano: false, cromo: true },
  reel: { bpm: 116, sonido: { activo: true, volumen: 0.8, progresion: 'luminosa', acordes: true, bombo: true, golpes: 'partes', riser: true } },
  // Antetítulo en pastilla
  css: `
    .kicker{width:max-content; max-width:100%; background:color-mix(in srgb, var(--accent) 11%, transparent); padding:.55em 1.1em; border-radius:999px; letter-spacing:.06em}`,
});
