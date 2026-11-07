# Las otras piezas

El look de todas (tipografía, temas, marca, ritmo, banda) lo pone el estilo elegido: ver
`referencias/estilos.md`. Todas aceptan `?estilo=<id>` para previsualizar otro.

## Reel (`reel/`)

Pieza corta a tempo, con música generada en código. `reel/index.html` es un reel
editable: una lista de partes que sale de `PROYECTO.reel` (o de lo editado).

```js
reel: {
  bpm: 120, tema: 'noche', fondo: '',          // opcionales: bpm, tema y sonido los trae el estilo; '' = fondo del tema
  sonido: { activo: true, volumen: 0.9, progresion: 'epica', acordes: true,
            bombo: true, golpes: 'compas', riser: true },
  partes: [
    { tipo: 'barras', pulsos: 4 },
    { tipo: 'dato', pulsos: 4, numero: '15', unidad: 's', texto: 'de video' },
    { tipo: 'logo', pulsos: 12, bajada: '…', cierre: true },
  ],
}
```

La duración es la suma de los pulsos (a 120 BPM, 4 pulsos = 2 s). Lo que una parte no
trae toma el valor por defecto del campo; los colores vacíos, los del tema.

- **Tipos** (`reel/tipos.js`): `barras`, `palabras`, `dato`, `logo` (con bajada y
  cierre en la barra del primer cuadro, para que el loop no se note), `titulo`,
  `imagen` (ken burns, de `MANIFIESTO.imagenes`), `lista` e `ilustracion` (un SVG a
  medida de 1920 × 1080 que se arma por trazo, escala, fundido, barrido o subiendo, y
  puede latir con el bombo). `titulo` y `palabras` tienen `entrada` (`sube`, `cae`,
  `escala`, `enfoca`, `golpe`): elegila por lo que dice la frase, no la misma en todas
  (la partitura de `revisar reel` avisa). Cada uno es
  `{ nombre, pulsos, cola, campos, dibujar(tl, p, h, ctx) }`: `tl` es el tiempo dentro
  de la parte, `campos` el esquema de `nucleo/panel.js`. La salida empieza en el corte
  y dura `cola` segundos dentro de la parte siguiente. Tipos propios:
  `window.TIPOS_REEL` en `proyecto/tipos.js` (hay un ejemplo comentado).
- **Editor:** tecla E, el botón "Editor" o `?editor` (`?editor&parte=3` abre con esa
  parte elegida). Línea de tiempo con un bloque por parte: clic elige, arrastrar el
  borde derecho cambia los pulsos (con Mayúsculas, de a compás), arrastrar el bloque lo
  mueve, arrastrar sobre la regla recorre el tiempo; Supr borra, Esc suelta. A la
  derecha, los campos de la parte o, sin parte elegida, tempo, tema, fondo y sonido.
- **Guardado:** `TRAMOYA.guardar('reel')`. Restaurar vuelve a `PROYECTO.reel`;
  Exportar/Importar .json; "Copiar como PROYECTO.reel" arma el texto para pegar en
  `proyecto/proyecto.js`.

Atajos: Espacio reproduce, ← → de a pulso, P pausa al final de cada parte, L loop,
S sonido, F pantalla completa.

**Reel a mano** (sin partes ni editor): `TRAMOYA.reel({ duracion, bpm, fondo,
partes: ['Gancho', …], dibujar(t, h), audio(ac, h) })` en otro .html. `h` trae `W, H,
CX, CY, BEAT, BAR, DUR`, `kick(t)`, `blur(vx, vy)`, `medir`, `texto` y las curvas de
`nucleo/util.js`; `TRAMOYA.reel.sonido` trae `master`, `ruido`, `bombo`, `acorde`,
`golpe` y `riser`. `node render/video.mjs reel/lanzamiento.html` lo exporta.

## Póster (`poster/`)

Panel de parámetros (textos, foto y encuadre, posiciones, tamaños, tema, logo) y
pestaña de observaciones. Los valores por defecto salen de `PROYECTO.poster`.

- **Exportar:** `tramoya poster` → `salida/poster-A1.png` (300 dpi) y `.pdf`, con lo
  guardado en `proyecto/estado/poster-cfg.json`. Sin servidor (lo editado quedó en el
  navegador): "Copiar comando de exportación", que lleva los cambios adentro
  (`node render/poster.mjs <cfg>`).
- **Otro formato:** el selector "Formato" o `--formato A3`. Toda la serie A tiene la
  misma proporción: cambia la escala, no el diseño.
- **Observaciones:** "Marcar" (tecla O), clic sobre el póster, escribir. Quedan en
  `estado/poster-obs.json` (`{ part, x, y, text, hecho }`, x e y de 0 a 1) y las lista
  `tramoya estado`; "✓ Hecha" (o `"hecho": true`) la da por resuelta. "Copiar para el
  chat" arma la lista de las pendientes.
- Para otro diseño de póster: copiá `poster/index.html`; el maquetado está en px de un
  A1 (2245 × 3179) y los parámetros en el esquema de `poster/poster.js`. Un diseño propio
  se exporta con `tramoya poster --pagina <nombre>` (`poster/<nombre>.html`) si expone
  `window.POSTER = { ancho, alto, mm(), formato(), archivo }` (`archivo` da el nombre del PNG).

### Hoja de ruta (`poster/ruta.html`)

La presentación momento a momento, en un A1 vertical: una fila por escena activa (número,
nombre y **qué pasa en escena**; el libreto —**qué se dice**— es opcional y viene apagado) y,
abajo, las escenas de anexo. Sale de
las escenas y de sus `notas`, así que sigue al contenido: si cambia la presentación,
cambia la hoja.

- **De las notas:** lo que va entre `«comillas»` es lo que se dice; un `(→)` o
  `(→ comentario)` es un avance dentro de la escena (se muestra como →); el resto es lo
  que pasa en escena. Si una escena repite el título de otra, el campo `ruta` le da el
  nombre que lleva en la hoja. `anexo: true` la manda al recuadro de abajo.
- **Parámetros:** textos (rótulo, título, bajada, cómo se maneja, anexo, pie), qué mostrar
  (el libreto se prende con «Qué se dice») y tamaños. Los valores por defecto salen de `PROYECTO.ruta` y lo editado queda en
  `estado/ruta-cfg.json`; las observaciones, en `estado/ruta-obs.json`.
- **Exportar:** `tramoya poster --pagina ruta [--formato A3]` → `salida/hoja-de-ruta-A1.png`
  y `.pdf` (en el tablero, Salidas → Póster → «Hoja de ruta»).
- **Más de una cara** (frente y dorso): la de adelante es la ruta; las demás las pone el
  proyecto con `window.RUTA_CARAS` en `proyecto/tipos.js` (se carga también en esta
  página, y el `if (!window.MOTION) return` de ese archivo cuida lo de la presentación):

  ```js
  window.RUTA_CARAS = (window.RUTA_CARAS || []).concat([{
    id: 'dorso', nombre: 'Dorso',
    campos: [{ group: 'Dorso' }, { key: 'dorsoTitulo', label: 'Título', type: 'text', def: '…' }], // opcional: parámetros del panel
    css: '.poster[data-cara="dorso"] { … }',                                                       // opcional
    render({ U, P, cfg, escenas }) { return '<header>…</header>'; },                               // HTML, o null = sin esa cara
  }]);
  ```

  `escenas` son las escenas activas (así una cara puede dibujar lo que muestra una escena, por
  ejemplo una hoja de datos, y seguir al contenido). El editor tiene una barra Frente / Dorso;
  al exportar sale **un PNG por cara** (`hoja-de-ruta-A1-frente.png`, `…-dorso.png`) y **un
  PDF con una página por cara**, listo para imprimir de los dos lados (volteando por el
  borde largo). Un diseño propio de póster hace lo mismo declarando
  `window.POSTER.caras = () => ['frente', 'dorso']` y una `.poster[data-cara="…"]` por cara.
- **Impresión en la hoja:** cada cara es un A1 vertical y la hoja es el papel del formato
  elegido. El grupo «Impresión en la hoja» del panel decide cuántas **copias por hoja** entran
  (1, 2, 4, 6, 8, 9, 12 o 16, para imprimir y cortar): la rejilla (columnas × filas) y la
  orientación se eligen solas para que queden lo más grandes posible (2 → apaisada 2 × 1,
  4 → vertical 2 × 2, 8 → apaisada 4 × 2…), o se fuerza la orientación. Además: **margen** (en
  mm; las impresoras comunes no llegan al borde, 5 a 8 mm suelen alcanzar), **separación** entre
  copias y **líneas de corte**. «Qué lleva cada hoja»: *una sola cara, repetida* (cada cara en
  sus hojas: la del dorso queda justo detrás de la del frente al imprimir de los dos lados, y al
  cortar cada copia tiene frente y dorso) o *frente y dorso mezclados* en la misma hoja.
  Cada copia se achica (nunca se estira) para entrar, centrada; con margen 0 y una por hoja es la
  cara tal cual. En el editor, el botón «En la hoja» de la barra de arriba muestra el resultado
  y cuánto mide cada copia; el PNG, el PDF y Ctrl+P salen de ese mismo armado (un PNG y una
  página por hoja). Un diseño propio lo usa declarando `window.POSTER.hojas = () => ['frente',
  'dorso']` (o `['hoja']`) y un `.hoja[data-hoja="…"]` por hoja, más `window.POSTER.horizontal()`
  si el papel va girado: `render/poster.mjs` exporta una unidad por hoja.

## Marca (`marca/`)

Editor del logo con todos los parámetros de `nucleo/marca.js`: palabra (con la parte
en acento entre asteriscos), versión (horizontal, vertical, isotipo, palabra), forma
del isotipo (franjas, anillo, monograma, puntos, ondas), colores, peso y espaciado.

- Lo que se diseña se guarda en `estado/marca-editor.json` y lo usan las otras piezas
  como "Último diseño del editor de marca".
- **«Guardar como variante…»** le pone nombre (`estado/marca-variantes.json`): aparece
  en la tira de abajo y en los selectores de logo de las otras piezas. Las variantes
  fijas del proyecto van en `marca.variantes` de `proyecto.js` (y el diseño por defecto
  en `marca.base`; "Copiar ajustes" da el JSON para pegar).
- **Archivos:** `tramoya marca [--png]` escribe los SVG (y PNG) de cada variante (la
  "actual" es lo del editor) y el favicon en `proyecto/assets/logo/`. En el navegador,
  "Todas las variantes (.zip)" (necesita internet para JSZip).
- **Palabra en curvas:** `python3 herramientas/generar_glifos.py` (necesita
  `pip install fonttools brotli`) toma la primera fuente del estilo elegido
  (`proyecto/estilo/`) y la palabra de la marca de `proyecto.js` y escribe
  `proyecto/glifos.js`, con la familia anotada. Si después se elige un estilo con otra
  fuente de títulos, la marca ignora esos glifos y usa `<text>` hasta que se regeneren;
  si falta alguna letra, también.
- **Forma por estilo:** `marca.base` del estilo pone isotipo, peso y tracking; el
  proyecto pone la palabra (y puede pisar el resto). Los colores salen del tema.
- **Un isotipo propio:** si las formas no alcanzan, sumá un `case` en `isotipo()` de
  `nucleo/marca.js` (viewBox 0 0 80 80) o usá un archivo: en la presentación, el logo
  puede ser `archivo:../proyecto/assets/logo/mi-logo.svg`.

## Landing (`landing/`)

Una página con portada, secciones (texto, tarjetas, texto e imagen, o a medida) y pie. Usa los
temas y la marca. El documento sale de `PROYECTO.landing` (más `tema`) hasta que se
edita; desde ahí vive en `TRAMOYA.leer('landing')`:

```js
{ tema, hero: { kicker, titulo, bajada, cta, ctaUrl, imagen },
  secciones: [{ tipo: 'texto' | 'tarjetas' | 'imagen' | 'libre', kicker, titulo, texto, items, imagen, html, css }],
  pie }
```

`items` es «título | detalle», uno por línea. Sin `tipo` se deduce (`items` → tarjetas).
Una sección `libre` es HTML a medida: `{{kicker}}` y `{{titulo}}` ponen los de siempre,
`{{campo}}` pone ese campo de la sección (editable en el lugar), la clase `rv` aparece al
entrar en pantalla y `css` va con la sección. Usala cuando el contenido no tenga la forma
de las otras tres.

**Editor** (`landing/editor.js`, se carga recién al abrirlo): tecla **E** o el botón
chico «Editar», que solo aparecen en local (`file://`, `localhost`); en un hosting, con
`?editar`. Nunca con `?render`. Los textos se editan en el lugar (con los `*asteriscos*`
a la vista; Enter o Esc terminan); el panel tiene tema, pie, imagen y botón de la
portada, y las secciones (arrastrar o ↑ ↓ para reordenar, duplicar, borrar, agregar).
«Subir imagen…» necesita `tramoya abrir`. Exportar/Importar .json, «Copiar como
PROYECTO.landing» (para fijarlo en `proyecto.js`) y Restaurar.

**Publicar**: «Descargar HTML» baja un único `.html` sin scripts ni editor, con los
estilos adentro y las imágenes y fuentes en base64 (si la página se abrió con
`tramoya abrir`; desde `file://` quedan las rutas relativas y avisa). También sirve
subir el repo (o `landing/`, `nucleo/` y `proyecto/`) a cualquier hosting estático.
El selector de tema del pie, para un visitante, cambia el tema solo en esa visita.

## Render y revisión

Con el CLI (`tramoya <comando>`, o `node herramientas/tramoya.mjs <comando>` dentro del
proyecto), que antes regenera `proyecto/estado.js` y el manifiesto y encuentra
playwright-core solo. Necesitan Google Chrome o Chromium (`CHROME=/ruta` si no está en
el lugar de siempre), ffmpeg para video e ImageMagick (opcional) para la densidad del
PNG del póster. Usan lo guardado en `proyecto/estado/`, no el borrador del navegador.

| Comando | Qué hace |
|---------|----------|
| `tramoya revisar motion` | Un PNG por punto clave en `salida/revision/motion/` y los errores de consola |
| `tramoya revisar motion --query 'escena=4&paso=2&ui=0'` | Ese cuadro, como se ve en el navegador |
| `tramoya revisar reel --cada 0.5` | Un PNG cada medio segundo |
| `tramoya revisar landing` | Captura de página completa |
| `tramoya video reel` | `salida/reel.mp4`, 60 fps, 3 subcuadros, con audio |
| `tramoya video motion --pausaMax 3` | La presentación entera como video |
| `tramoya video motion --desde 20 --hasta 40 --fps 30 --sub 1` | Un tramo, rápido |
| `tramoya poster [cfg] [--formato A3] [--dpi 150]` | PNG y PDF del póster |
| `tramoya marca [--png]` | Archivos de la marca en `proyecto/assets/logo/` |

`revisar` termina con código 1 si hubo errores de consola: sirve como prueba
automática. Los scripts están en `render/` y se pueden correr directo
(`node render/revisar.mjs motion`) con `PLAYWRIGHT_DIR` apuntando a un `node_modules`.
