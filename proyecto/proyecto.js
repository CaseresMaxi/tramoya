// Datos del proyecto: lo único que cambia de un proyecto a otro (junto con escenas.js,
// tipos.js y assets/). Todas las piezas leen de acá: presentación, póster, reel,
// landing y editor de marca.
//
// Este proyecto de ejemplo es Tramoya hablando de sí misma. Para un proyecto nuevo,
// `bash herramientas/nuevo-proyecto.sh ../mi-proyecto` copia el motor y este ejemplo.
window.PROYECTO = {
  // Prefijo del estado guardado en el navegador (localStorage) y de los archivos exportados.
  // Cambialo en cada proyecto: dos proyectos con el mismo id comparten el estado.
  id: 'tramoya',
  nombre: 'Tra*moya*', // *parte* en acento
  descripcion: 'Presentaciones, videos y piezas gráficas en HTML, a partir de un mismo proyecto.',
  autores: 'Tu equipo',
  contexto: 'Plantilla de ejemplo · 2026',

  // ---------- Tipografía ----------
  fuentes: [
    { familia: 'Playfair Display', archivo: 'proyecto/assets/fonts/playfair-latin.woff2', peso: '400 900' },
    { familia: 'Playfair Display', archivo: 'proyecto/assets/fonts/playfair-latin-italic.woff2', peso: '400 900', estilo: 'italic' },
    { familia: 'Inter', archivo: 'proyecto/assets/fonts/inter-latin.woff2', peso: '100 900' },
  ],
  tipografia: { display: "'Playfair Display', Georgia, serif", texto: "'Inter', system-ui, sans-serif" },

  // ---------- Temas ----------
  // Cada tema es un juego de variables CSS. "claro" avisa que el fondo es claro (el logo
  // usa su versión para fondo claro, si la variante la tiene).
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
        accent: '#d44a45', 'accent-2': '#e8c9a0', line: '#3d2328', glow: 'rgba(212,74,69,.16)', 'glow-2': 'rgba(232,201,160,.06)',
        overlay: 'rgba(20,9,11,.86)', code: '#100608', grid: 'transparent', dot: 'rgba(255,235,225,.07)' },
    },
    papel: {
      nombre: 'Papel (claro)', claro: true,
      vars: { bg: '#f3eadc', panel: '#fff8ee', 'panel-2': '#ece1d0', text: '#1c1612', strong: '#140f0c', muted: '#6b5e52', lead: '#3a322b',
        accent: '#9a6b1f', 'accent-2': '#c4923a', line: '#d9cbb8', glow: 'rgba(154,107,31,.10)', 'glow-2': 'rgba(140,42,42,.06)',
        overlay: 'rgba(243,234,220,.9)', code: '#fff8ee', grid: 'transparent', dot: 'rgba(60,40,20,.12)' },
    },
    plano: {
      nombre: 'Plano técnico',
      vars: { bg: '#0b1724', panel: '#102033', 'panel-2': '#142940', text: '#e6eef7', strong: '#ffffff', muted: '#93a9c0', lead: '#d4e2f0',
        accent: '#74acdf', 'accent-2': '#f6b40e', line: '#1f3a57', glow: 'rgba(116,172,223,.12)', 'glow-2': 'rgba(246,180,14,.05)',
        overlay: 'rgba(11,23,36,.86)', code: '#08121d', grid: 'rgba(116,172,223,.08)', dot: 'rgba(116,172,223,.12)' },
    },
  },

  // ---------- Marca ----------
  // base: el diseño por defecto (ver los campos en nucleo/marca.js o en marca/index.html).
  // variantes: versiones con nombre; cada una pisa lo que quiera de la base y puede
  // traer "claro" con lo que cambia sobre fondo claro. Además hay una variante por tema.
  marca: {
    base: { palabra: 'Tra*moya*', forma: 'franjas', n: 4, grosor: 9, inclinacion: 5, colorFranjas: 'bandera', peso: 800, tracking: -20 },
    variantes: {
      'celeste': { tinta: '#ffffff', acento: '#74acdf', fondo: '#0d0d0f', claro: { tinta: '#140f0c', acento: '#3f86c6', fondo: '#f3eadc' } },
      'anillo': { forma: 'anillo', grosor: 8, tinta: '#f4f1eb', acento: '#d7a54a', fondo: '#0d0d0f', claro: { tinta: '#140f0c', acento: '#9a6b1f' } },
      'monograma': { forma: 'monograma', radio: 8 },
      'mono blanco': { tinta: '#ffffff', acento: '#ffffff', fondo: '#0d0d0f', claro: { tinta: '#000000', acento: '#000000', fondo: '#ffffff' } },
      'mono negro': { tinta: '#000000', acento: '#000000', fondo: '#ffffff' },
    },
  },

  // ---------- Presentación motion (valores por defecto del estilo) ----------
  estilo: { tema: 'noche', transicion: 'franjas', pie: 'Tramoya · plantilla de ejemplo' },

  // ---------- Póster (valores por defecto del panel; ver poster/poster.js) ----------
  poster: {
    formato: 'A1',
    evento: 'MUESTRA DE PROYECTOS', edicion: 'PRIMERA EDICIÓN', anio: '2026',
    frase: 'Una idea, *muchas* piezas.',
    bajada: 'Presentación, video, póster y landing desde los mismos datos.',
    atributos: 'HTML estático, Función del tiempo, Sin build',
    equipo: 'Tu equipo', docentes: '',
    qrUrl: '', qrTitulo: 'Miralo.', qrSub: 'Escaneá y abrí la presentación.',
    foto: '../proyecto/assets/img/escenario.webp',
  },

  // ---------- Reel (ver reel/index.html) ----------
  reel: {
    bpm: 120,
    palabras: ['Una', 'idea,', 'muchas', 'piezas.'],
    dato: { numero: 15, unidad: 's', texto: 'de video, cuadro por cuadro' },
    bajada: 'Presentaciones, videos y piezas gráficas en HTML',
  },

  // ---------- Landing (ver landing/index.html) ----------
  landing: {
    hero: { kicker: 'Plantilla', titulo: 'Contá tu proyecto *en movimiento*.', bajada: 'Una presentación que se reproduce como un video, un reel exportable a MP4, un póster a 300 dpi y esta landing. Todo en HTML, todo desde los mismos datos.', cta: 'Ver la presentación', ctaUrl: '../motion/index.html', imagen: '../proyecto/assets/img/escenario.webp' },
    secciones: [
      { kicker: 'Piezas', titulo: 'Un proyecto, *cinco* salidas.', items: 'Presentación motion | Puntos clave, cámara y morph entre escenas.\nReel | Pieza corta con música generada, exportable a MP4.\nPóster | A1 a 300 dpi y PDF vectorial.\nLanding | Esta página.\nMarca | Editor del logo con exportación a SVG y PNG.' },
      { kicker: 'Cómo', titulo: 'El tiempo es *la única entrada*.', texto: 'Cada cuadro sale de una función del tiempo. Por eso se puede pausar, rebobinar, revisar cuadro por cuadro y renderizar a video con el mismo código que se ve en el navegador.' },
    ],
    pie: 'Tramoya · plantilla de ejemplo',
  },
};
