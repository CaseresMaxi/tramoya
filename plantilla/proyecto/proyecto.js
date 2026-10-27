// Datos del proyecto: lo único que cambia de un proyecto a otro (junto con escenas.js,
// tipos.js y assets/). Todas las piezas leen de acá: presentación, póster, reel,
// landing y editor de marca.
//
// Este proyecto de ejemplo es Tramoya hablando de sí misma. Para un proyecto nuevo,
// `tramoya nuevo <carpeta>` copia el motor y este ejemplo; después se cambia lo de acá.
window.PROYECTO = {
  // Prefijo del estado guardado en el navegador (localStorage) y de los archivos exportados.
  // Cambialo en cada proyecto: dos proyectos con el mismo id comparten el estado.
  id: 'tramoya',
  nombre: 'Tra*moya*', // *parte* en acento
  descripcion: 'Presentaciones, videos y piezas gráficas en HTML, a partir de un mismo proyecto.',
  autores: 'Tu equipo',
  contexto: 'Plantilla de ejemplo · 2026',

  // ---------- Look: lo pone el estilo ----------
  // Tipografía, temas (colores), marca (forma del isotipo, peso…), ritmo del motion y banda
  // del reel salen del estilo elegido (proyecto/estilo/, ver estilos/index.html o
  // `tramoya estilos`). Acá solo va el contenido. Si un proyecto necesita pisar algo del
  // estilo, puede declarar acá temas, fuentes, tipografia, forma, marca.base o estilo:
  // lo de este archivo manda sobre el estilo (ver referencias/estilos.md).

  // ---------- Marca ----------
  // La palabra es contenido; el resto del diseño lo trae el estilo (y el editor de marca).
  marca: {
    base: { palabra: 'Tra*moya*' },
  },

  // ---------- Presentación motion ----------
  estilo: { pie: 'Tramoya · plantilla de ejemplo' },

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

  // ---------- Reel (ver reel/index.html; se edita con la tecla E) ----------
  // Una lista de partes; cada una dura sus pulsos (a 120 BPM, 4 pulsos = 2 s). Los tipos y
  // sus campos están en reel/tipos.js; los propios del proyecto, en proyecto/tipos.js.
  // El tempo (bpm), el tema y la banda (sonido) los trae el estilo; se pueden pisar acá.
  reel: {
    partes: [
      { tipo: 'barras', pulsos: 4 },
      { tipo: 'palabras', pulsos: 4, palabras: 'Una\nidea,\nmuchas\npiezas.' },
      { tipo: 'dato', pulsos: 4, numero: '15', unidad: 's', texto: 'de video, cuadro por cuadro' },
      { tipo: 'logo', pulsos: 12, bajada: 'Presentaciones, videos y piezas gráficas en HTML', cierre: true },
    ],
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
