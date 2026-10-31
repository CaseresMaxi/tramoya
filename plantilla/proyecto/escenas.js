// Guion por defecto de la presentación motion: una escena por elemento, en orden.
// Campos comunes: tipo, mantener (segundos de pausa en automático y en el video), notas,
// pasos ('uno' | 'todo'), entrada (derecha | izquierda | abajo | arriba | zoom), logo, ocultar.
// Los campos de cada tipo están en motion/tipos.js (y en proyecto/tipos.js, los propios).
//
// El movimiento se decide por escena, según lo que dice (ver referencias/movimiento.md):
//   coreografia  cómo se mueve cada rol: sobria | editorial | cinetica | tecnica | impacto | quieta…
//   mov          por campo o por rol: { titulo: 'renglones', puntos: { m: 'pop', orden: 'centro' },
//                '@item': …, numero: { e: 'latir' } } · m entrada · e acento · x salida · s · at · dur
//   transicion   franjas | camara | morph | fundido | corte (o { tipo, dur })
//   focos        cámara dentro de la escena, uno por punto clave: [{ x, y, s }]
// Y si ningún tipo sirve: tipo 'libre' (el HTML a medida) o un tipo propio en proyecto/tipos.js.
//
// Desde el editor (tecla E) se puede editar todo y después "Copiar como escenas.js".
window.ESCENAS = [
  {
    tipo: 'portada', mantener: 7,
    kicker: 'Plantilla para contar proyectos',
    titulo: 'Tra*moya*',
    subtitulo: 'Presentaciones que se reproducen como un video, y todo lo demás desde los mismos datos.',
    autores: 'Tu equipo', contexto: 'Muestra de proyectos · 2026',
    imagen: '../proyecto/assets/img/escenario.webp',
    notas: 'Presentarse y decir en una frase de qué se trata.',
  },
  {
    tipo: 'texto', mantener: 9,
    kicker: 'La idea',
    titulo: 'Una línea de tiempo con *puntos clave*.',
    puntos: '→ reproduce hasta el próximo punto y ahí se detiene.\n← rebobina; con Shift salta sin animar.\nCada cuadro es una función del tiempo: se pausa, se recorre y se renderiza.',
    notas: 'Mostrar que se puede rebobinar en medio de una transición.',
  },
  {
    tipo: 'tarjetas', mantener: 9,
    kicker: 'Las piezas',
    titulo: 'Un proyecto, *cinco* salidas.',
    items: 'Presentación | Escenas con cámara, morph y editor sobre el escenario.\nReel | Pieza corta a tempo, con música generada en código.\nPóster | A1 a 300 dpi y PDF vectorial, con panel de parámetros.\nLanding | Una página con los mismos textos y la misma marca.\nMarca | Logo paramétrico con exportación a SVG, PNG y zip.\nVideo | Cualquier pieza a MP4 con desenfoque por subcuadros.',
    notas: 'Los puntos de la escena anterior viajan y se vuelven estas tarjetas.',
  },
  {
    tipo: 'flujo', mantener: 10,
    kicker: 'Cómo está armado',
    titulo: 'De los datos al *cuadro*.',
    bloques: 'Datos | proyecto.js | Marca, temas, textos\nDatos | escenas.js | El guion\nMotor | Tipos | Cómo se dibuja cada escena\nMotor | render(T) | Estado según el tiempo\nSalidas | Navegador | Presentar y editar\nSalidas | Video | render/video.mjs\nSalidas | Revisión | Un cuadro por punto clave',
    nota: 'La cámara recorre el diagrama: un avance por columna.',
    notas: 'Contar que el motor no sabe nada del proyecto: lee proyecto/.',
  },
  {
    tipo: 'imagen', mantener: 8, pasos: 'uno',
    kicker: 'Elementos compartidos',
    titulo: 'Lo que se repite, *viaja*.',
    puntos: 'Mismo data-k en dos escenas seguidas: el elemento se transforma.\nTexto: se escala y cruza su opacidad.\nCajas: un fantasma interpola tamaño, color y radio.',
    imagen: '../proyecto/assets/img/taller.webp',
    notas: 'Acá cada punto entra con un avance (pasos: uno).',
  },
  {
    tipo: 'senales', mantener: 9,
    kicker: 'Escenas vivas',
    titulo: 'Cosas que se mueven *solas*.',
    cuerpo: 'Un tipo puede tener tick(raíz, t): se llama en cada cuadro con el tiempo ambiente.',
    puntos: 'Señales simuladas.\nPulsos por los conectores.\nMonitores que corren.',
    senales: 'Posición\nVelocidad\nIntensidad', indicador: 'sube ▲ | baja ▼',
    notas: 'El tiempo ambiente también es determinístico en el render.',
  },
  {
    tipo: 'codigo', mantener: 10, coreografia: 'tecnica', transicion: 'corte',
    kicker: 'Atributos',
    titulo: 'El montaje se escribe en el *HTML*.',
    cuerpo: 'El motor lee atributos; no hay que programar animaciones.',
    tabla: 'Atributo | Qué hace | Ejemplo\ndata-m | Entrada | renglones\ndata-e | Acento | resaltar\ndata-s | Punto clave | 1\ndata-k | Viaja | titulo',
    codigo: '<h2 data-m="words" data-k="titulo">\n  Una idea por escena.\n</h2>\n<li data-m="left" data-s="1" data-dim>\n  Entra en el segundo avance.\n</li>',
    nota: 'La referencia completa está en referencias/motion.md de la skill.',
    notas: 'Coreografía técnica: el título se decodifica y el código se escribe solo.',
  },
  {
    tipo: 'columnas', mantener: 10,
    kicker: 'Dos usos',
    titulo: 'Presentar en vivo o *grabar*.',
    izqTitulo: 'En vivo',
    izq: 'Avanzás vos: cada → es un punto clave.\nNotas del presentador (N).\nEditor sobre el escenario (E).',
    derTitulo: 'Como video',
    der: 'Modo automático (A) con pausas por escena.\nrender/video.mjs → MP4 a 60 fps.\nUn cuadro por punto clave para revisar.',
    monitorTitulo: 'render/video.mjs',
    monitor: '▸ cargando motion/index.html?render\n▸ 1 080 cuadros · 60 fps · 3 subcuadros\n▸ escena 4 · paso 2\n▸ 50 %\n▸ escena 8 · paso 1\n▸ 100 % · listo: salida/motion.mp4',
    notas: 'El monitor de la derecha pasa en bucle.',
  },
  {
    tipo: 'hitos', mantener: 8, coreografia: 'cinetica',
    kicker: 'Un tipo propio',
    titulo: 'Cada proyecto suma *los suyos*.',
    hitos: 'Tipo | Se declara en proyecto/tipos.js\nCampos | Aparecen solos en el editor\nCSS | Viaja con el tipo\nListo | Se usa como cualquier otro',
    notas: 'Este tipo no es del motor: está en proyecto/tipos.js.',
  },
  {
    tipo: 'cifra', mantener: 8,
    kicker: 'Dependencias',
    titulo: 'Se abre con *doble clic*.',
    prefijo: '', numero: '0', unidad: '', texto: 'pasos de build: HTML, CSS y JS que el navegador abre desde file://.',
    barras: 'Para presentar | 0\nPara exportar video | 100',
    unidadBarras: '% de dependencias',
    nota: 'Para exportar: Node, playwright-core, Chrome y ffmpeg.',
    mov: { numero: { e: 'agrandar', es: 0 } },
    notas: 'La cifra cuenta desde cero (data-m="count").',
  },
  {
    tipo: 'libre', mantener: 8, transicion: 'fundido',
    kicker: 'A medida',
    titulo: 'El contenido *manda*.',
    antes: 'Elegir una plantilla y llenarla.',
    despues: 'Decidir qué tiene que entender quien mira, y moverlo para eso.',
    html: `<div class="pad">{{kicker}}{{titulo}}
  <p class="body" data-f="antes" data-m="fade" data-at=".6" style="margin-top:70px; font-size:44px">{{antes}}</p>
  <p class="body" data-f="despues" data-m="renglones" data-s="1" data-at=".5" style="font-size:56px; max-width:1300px; color:var(--strong)">{{despues}}</p>
  <div class="sello" data-m="sello" data-s="2" data-at=".1">a medida</div>
</div>`,
    css: '.sello{position:absolute; right:180px; bottom:200px; padding:18px 36px; border:6px solid var(--accent); color:var(--accent); font:800 52px var(--font-display); text-transform:uppercase; transform-origin:50% 50%}',
    mov: { antes: { e: 'tachar', es: 1 } },
    notas: 'Una escena libre: el HTML lo escribe el agente. Lo de antes se tacha cuando llega lo nuevo; el sello es un movimiento propio (proyecto/tipos.js).',
  },
  {
    tipo: 'cita', mantener: 7, coreografia: 'editorial',
    texto: 'Mirá el resultado en un *navegador real* antes de darlo por hecho.',
    autor: 'Regla de la casa', rol: 'referencias/aprendizajes.md',
    notas: 'La regla que más horas ahorró.',
  },
  {
    tipo: 'cierre', mantener: 12,
    kicker: 'Para empezar',
    titulo: 'Copiá, cambiá *proyecto/*, presentá.',
    puntos: 'tramoya nuevo mi-proyecto\nEditá proyecto/proyecto.js y proyecto/escenas.js.\ntramoya abrir: editor que guarda en archivos.',
    final: '¿Preguntas?',
    autores: 'Tu equipo', contexto: 'Muestra de proyectos · 2026',
    notas: 'Cierre y preguntas.',
  },
];
