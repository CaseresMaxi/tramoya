// Estilo de la galería. Formato y perillas: referencias/estilos.md.
TRAMOYA.registrarEstilo({
  id: 'brutalista',
  nombre: 'Brutalista',
  descripcion: 'Mayúsculas grotescas, mono para el texto, bordes gruesos, sombras duras y el acento como bloque. Entra a saltos, sin suavizar.',
  etiquetas: ['claro', 'oscuro', 'grotesca', 'mono', 'crudo', 'alto contraste'],
  referencia: 'Web brutalista y fanzine: hormigón, negro, un naranja de seguridad, cajas con borde de 4 px y sombra sólida, títulos en mayúsculas, cortes secos.',
  fuentes: [
    { familia: 'Space Grotesk', archivo: 'fuentes/space-grotesk.woff2', peso: '300 700' },
    { familia: 'Space Mono', archivo: 'fuentes/space-mono-400.woff2', peso: '400' },
    { familia: 'Space Mono', archivo: 'fuentes/space-mono-700.woff2', peso: '700' },
    { familia: 'Space Mono', archivo: 'fuentes/space-mono-400-italic.woff2', peso: '400', estilo: 'italic' },
  ],
  tipografia: {
    display: "'Space Grotesk', 'Arial Black', sans-serif", texto: "'Space Mono', ui-monospace, monospace", mono: "'Space Mono', ui-monospace, monospace",
    peso: 700, pesoAcento: 700, interletra: -0.025, alto: 1.02, mayusculas: true, italica: false,
  },
  forma: {
    radio: 0, borde: 4, sombra: '12px 12px 0 var(--strong)', numeral: true,
    kicker: { fuente: 'mono', peso: 700, interletra: 0.06, mayusculas: true, barra: 30 },
  },
  temas: {
    hormigon: {
      nombre: 'Hormigón', claro: true,
      vars: { bg: '#e6e4dd', panel: '#ffffff', 'panel-2': '#d6d3ca', text: '#0a0a0a', strong: '#000000', muted: '#454540', lead: '#161616',
        accent: '#d42e00', 'accent-2': '#0038e0', line: '#0a0a0a', glow: 'transparent', 'glow-2': 'transparent',
        overlay: 'rgba(230,228,221,.9)', code: '#ffffff', grid: 'rgba(0,0,0,.09)', dot: 'transparent' },
    },
    amarillo: {
      nombre: 'Amarillo', claro: true,
      vars: { bg: '#ffe14d', panel: '#fff6c2', 'panel-2': '#f5d21c', text: '#000000', strong: '#000000', muted: '#3d3500', lead: '#111000',
        accent: '#0030d0', 'accent-2': '#d42e00', line: '#000000', glow: 'transparent', 'glow-2': 'transparent',
        overlay: 'rgba(255,225,77,.88)', code: '#fff6c2', grid: 'rgba(0,0,0,.1)', dot: 'transparent' },
    },
    negro: {
      nombre: 'Negro ácido',
      vars: { bg: '#0b0b0b', panel: '#161616', 'panel-2': '#222222', text: '#f2f2ec', strong: '#ffffff', muted: '#a6a69e', lead: '#e6e6df',
        accent: '#c8ff00', 'accent-2': '#ff4d00', line: '#f2f2ec', glow: 'transparent', 'glow-2': 'transparent',
        overlay: 'rgba(11,11,11,.88)', code: '#000000', grid: 'rgba(255,255,255,.08)', dot: 'transparent' },
    },
  },
  marca: {
    base: { forma: 'franjas', n: 3, grosor: 15, inclinacion: 0, colorFranjas: 'bandera', radio: 0, peso: 700, tracking: -10 },
    variantes: { bloque: { forma: 'monograma', radio: 0, peso: 700 } },
  },
  motion: { tema: 'hormigon', transicion: 'franjas', franjas: { n: 2, color: 'tinta', grosor: 1.7 }, entrada: 'escalon', ritmo: 0.75, duracion: 1, recorrido: 1, velocidad: 1.15, desenfoque: false, grano: false, cromo: true, coreografias: ['tipo', 'impacto', 'quieta'] },
  reel: { bpm: 140, sonido: { activo: true, volumen: 0.9, progresion: 'tension', acordes: false, bombo: true, golpes: 'compas', riser: true } },
  // El acento de los títulos como bloque de color (resaltador), en todas las piezas
  css: `
    .scene h2 .accent, .claim h2 em, .hero h1 .accent, section.sec h2 .accent{background:var(--accent); color:var(--bg); padding:0 .08em; -webkit-box-decoration-break:clone; box-decoration-break:clone}
    .stage .bullets li:not(.pt)::before{border-radius:0; box-shadow:none}
    .poster .claim .lead{font-size:calc(var(--lead-size, 60px) * .8)}
    .scene .mrow{font-size:25px; padding:16px 0 16px 36px} .scene .mrow::before{top:16px; bottom:16px}`,
});
