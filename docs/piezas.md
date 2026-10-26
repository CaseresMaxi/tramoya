# Las otras piezas

## Reel (`reel/`)

`reel/reel.js` es el armazón: reproductor con línea de tiempo por pulso, atajos,
contrato de render y audio. `reel/index.html` es un reel de ejemplo de 12 s a 120 BPM
que usa la marca y los textos de `PROYECTO.reel`.

```js
TRAMOYA.reel({
  duracion: 12, bpm: 120, fondo: '#0d0d0f',
  partes: ['Gancho', 'Palabras', …],       // una por compás (4 pulsos)
  dibujar(t, h) { return '<rect …/>'; },   // SVG del instante t
  async audio(ac, h) { … },                // opcional: OfflineAudioContext
});
```

`h` trae `W, H, CX, CY, BEAT, BAR, DUR`, `kick(t)` (pulso del bombo), `blur(vx, vy)`
(atributo de desenfoque direccional), `medir(texto, tamaño, opciones)`,
`texto(str, x, y, tamaño, color, opciones)` y todas las curvas de `nucleo/util.js`
(`exOut`, `spring`, `kf`, `prog`, `speed`…). Para la banda,
`TRAMOYA.reel.sonido` trae `master`, `ruido`, `bombo`, `acorde`, `golpe` y `riser`.

Atajos: Espacio reproduce, ← → de a pulso, P pausa al final de cada parte, L loop,
S sonido, F pantalla completa.

Para otro reel: copiá `reel/index.html` (por ejemplo a `reel/lanzamiento.html`) y
cambiá `dibujar`. `node render/video.mjs reel/lanzamiento.html` lo exporta.

## Póster (`poster/`)

Panel de parámetros (textos, foto y encuadre, posiciones, tamaños, tema, logo) y
pestaña de observaciones. Los valores por defecto salen de `PROYECTO.poster`.

- **Exportar:** "Copiar comando de exportación" y pegarlo en la terminal, en la raíz
  del repo. El comando lleva los cambios adentro:
  `node render/poster.mjs <cfg>` → `salida/poster-A1.png` (300 dpi) y `.pdf`.
- **Otro formato:** el selector "Formato" o `--formato A3`. Toda la serie A tiene la
  misma proporción: cambia la escala, no el diseño.
- **Observaciones:** "Marcar" (tecla O), clic sobre el póster, escribir. "Copiar para
  el chat" arma la lista con la parte y la posición en %.
- Para otro diseño de póster: copiá `poster/index.html`; el maquetado está en px de un
  A1 (2245 × 3179) y los parámetros en el esquema de `poster/poster.js`.

## Marca (`marca/`)

Editor del logo con todos los parámetros de `nucleo/marca.js`: palabra (con la parte
en acento entre asteriscos), versión (horizontal, vertical, isotipo, palabra), forma
del isotipo (franjas, anillo, monograma, puntos, ondas), colores, peso y espaciado.

- Lo que se diseña queda en el navegador y lo usan las otras piezas como "Último
  diseño del editor de marca".
- Para fijarlo en el proyecto: "Copiar ajustes" y pegarlo en `marca.base` de
  `proyecto/proyecto.js`. Las variantes con nombre van en `marca.variantes`.
- **Archivos:** "Todas las variantes (.zip)" en el navegador (necesita internet para
  JSZip) o, sin internet, `node render/marca.mjs [--png]`, que escribe los SVG (y PNG)
  de cada variante y el favicon en `proyecto/assets/logo/`.
- **Palabra en curvas:** `python3 herramientas/generar_glifos.py` (necesita
  `pip install fonttools brotli`) toma la primera fuente y la palabra de la marca de
  `proyecto.js` y escribe `proyecto/glifos.js`. Hay que correrlo de nuevo si cambia la
  palabra o la fuente; si falta alguna letra, la marca usa `<text>`.
- **Un isotipo propio:** si las formas no alcanzan, sumá un `case` en `isotipo()` de
  `nucleo/marca.js` (viewBox 0 0 80 80) o usá un archivo: en la presentación, el logo
  puede ser `archivo:../proyecto/assets/logo/mi-logo.svg`.

## Landing (`landing/`)

Una página con hero, secciones (texto o tarjetas) y pie, a partir de
`PROYECTO.landing`. Usa los temas (selector en el pie) y la marca. Para publicarla,
cualquier hosting estático: subí el repo (o `landing/`, `nucleo/` y `proyecto/`).

## Render y revisión (`render/`)

Necesitan Node, `npm install` (instala `playwright-core`), Google Chrome o Chromium
(`CHROME=/ruta` si no está en el lugar de siempre), ffmpeg para video e ImageMagick
(opcional) para la densidad del PNG del póster.

| Comando | Qué hace |
|---------|----------|
| `node render/revisar.mjs motion` | Un PNG por punto clave en `salida/revision/motion/` y los errores de consola |
| `node render/revisar.mjs reel --cada 0.5` | Un PNG cada medio segundo |
| `node render/revisar.mjs landing` | Captura de página completa |
| `node render/video.mjs reel` | `salida/reel.mp4`, 60 fps, 3 subcuadros, con audio |
| `node render/video.mjs motion --pausaMax 3` | La presentación entera como video |
| `node render/video.mjs motion --desde 20 --hasta 40 --fps 30 --sub 1` | Un tramo, rápido |
| `node render/poster.mjs [cfg] [--formato A3] [--dpi 150]` | PNG y PDF del póster |
| `node render/marca.mjs [--png]` | Archivos de la marca en `proyecto/assets/logo/` |

`revisar.mjs` termina con código 1 si hubo errores de consola: sirve como prueba
automática.
