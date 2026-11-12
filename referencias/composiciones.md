# Composiciones (formato HyperFrames)

Una **composición** es un HTML suelto con el formato de
[HyperFrames](https://github.com/heygen-com/hyperframes) (HeyGen, Apache-2.0): clips con
`data-start` / `data-duration`, una línea de GSAP en pausa, videos y audios con atributos.
Tramoya la reproduce, edita sus variables y la exporta con su propio motor
(`nucleo/composicion.js`), sin instalar HyperFrames. Sirve para lo que no tiene forma de
escena ni de parte de reel:

- un spot cuadrado (1080 × 1080) o vertical (1080 × 1920) para redes;
- algo hecho con otra herramienta: GSAP con todos sus plugins, three.js, d3, Lottie,
  canvas, anime.js;
- un bloque del catálogo de HyperFrames (unos 200: mockups de interfaz, gráficos que
  crecen, tipografía cinética, mapas, carruseles…), traído con un comando y editado;
- un pedazo de video con cortes, recortes, volumen y fundidos de audio.

Y una composición entra **como escena de la presentación** (`tipo: 'composicion'`), así
un momento puede tener su propio lenguaje sin dejar de ser parte del relato.

Antes de crear una, la pregunta de siempre (`movimiento.md`): ¿qué tiene que entender
quien mira, y qué movimiento lo explica? Una composición es la puerta para cuando la
respuesta no cabe en lo que ya hay. No la uses para algo que ya resuelve una escena.

## Comandos

```bash
tramoya composicion nueva intro                      # 1920×1080, 6 s, GSAP (se baja a proyecto/assets/vendor/)
tramoya composicion nueva spot --ancho 1080 --alto 1920 --dur 12 --fps 30
tramoya composicion importar hf:bar-chart-race       # un bloque del catálogo de HyperFrames, por nombre
tramoya composicion importar ~/descargas/x.html      # un HTML suelto (con los archivos relativos que use)
tramoya composicion importar ./mi-proyecto-hf        # un proyecto de HyperFrames entero (carpeta con index.html)
tramoya composicion local intro                      # baja lo que carga de internet (CDN) para exportar sin conexión
tramoya composiciones                                # la lista
tramoya abrir proyecto/composiciones/intro.html      # mirarla y editar sus variables
tramoya revisar proyecto/composiciones/intro.html    # PNG + determinismo + avisos de formato
tramoya video proyecto/composiciones/intro.html      # MP4 con su tamaño, sus fps y su audio
```

Viven en `proyecto/composiciones/<id>.html` (o `<id>/index.html` si es un proyecto
entero). Al crearlas o importarlas se les agrega un bloque `<!-- tramoya --> … <!-- /tramoya -->`
que carga el motor; el resto del HTML no se toca y sigue siendo HyperFrames válido
(`npx hyperframes render` también lo renderiza). Los bloques importados quedan anotados,
con su licencia y autor, en `proyecto/composiciones/LICENCIAS.md`.

Catálogo: <https://github.com/heygen-com/hyperframes/tree/main/registry/blocks> (cada
carpeta es un nombre para `importar hf:<nombre>`; su `registry-item.json` dice qué hace,
cuánto dura, su tamaño y sus variables).

## El formato

```html
<!doctype html>
<html data-tramoya-estilo
  data-composition-variables='[{ "id": "titulo", "type": "string", "label": "Título", "default": "Hola" }]'>
<head>
  <!-- tramoya --> … <!-- /tramoya -->
  <script src="../assets/vendor/cdn.jsdelivr.net/npm/gsap@3.14.2/dist/gsap.min.js"></script>
  <style>html, body { margin: 0; width: 1920px; height: 1080px; overflow: hidden } .clip { position: absolute; inset: 0 }</style>
</head>
<body>
  <div id="raiz" data-composition-id="intro" data-start="0" data-duration="8" data-width="1920" data-height="1080" data-fps="30">
    <section id="a" class="clip" data-start="0" data-duration="4">
      <h1 id="t" data-var-text="titulo">Hola</h1>
    </section>
    <section id="b" class="clip" data-start="a + 0.5" data-duration="3">…</section>
    <video src="assets/toma.mp4" data-start="1" data-duration="3" data-media-start="12" muted></video>
    <audio src="assets/musica.mp3" data-start="0" data-volume="0.6" data-fade-in="1" data-fade-out="2"></audio>
    <div data-composition-src="otra.html" data-composition-id="otra" data-start="4" data-duration="4"
         data-variable-values='{"color": "#f40"}'></div>
  </div>
  <script>
    window.__timelines = window.__timelines || {};
    const tl = gsap.timeline({ paused: true });
    tl.from('#t', { y: 60, opacity: 0, duration: 0.8, ease: 'power3.out' }, 0.2);
    window.__timelines['intro'] = tl;          // la clave = data-composition-id
  </script>
</body>
</html>
```

| Atributo | Dónde | Qué |
|---|---|---|
| `data-composition-id` | raíz (obligatorio) | id; también la clave en `window.__timelines` |
| `data-width` · `data-height` | raíz | tamaño del escenario (si no, 1920 × 1080) |
| `data-duration` | raíz | duración (si no, la de la línea más larga, los clips y los medios) |
| `data-fps` | raíz | cuadros por segundo por defecto al exportar (`30000/1001` vale) |
| `data-no-timeline` | raíz | no usa GSAP: no esperar una línea |
| `data-start` | clip | segundos, o `"id"` / `"id + 0.5"` / `"id - 0.5"`: relativo al **final** de otro clip |
| `data-duration` | clip | cuánto se ve (si no, hasta que termina su clip padre) |
| `data-media-start` | video, audio | desde qué segundo del archivo |
| `data-playback-rate` · `data-volume` · `data-fade-in` · `data-fade-out` | video, audio | velocidad, volumen (0–4), fundidos en segundos |
| `muted` / `data-has-audio` | video | si su sonido va al video |
| `data-composition-src` | anfitrión | otra composición adentro (el archivo envuelve lo suyo en un `<template>`); su línea se busca en su propio tiempo y se queda en el último cuadro |
| `data-variable-values` | anfitrión | variables para la anidada |
| `data-composition-variables` | `<html>` | variables (JSON): `string`, `number`, `color`, `boolean`, `enum` (con `options`) |
| `data-var-text` · `data-var-src` | cualquier elemento | texto o `src` (img, video, audio) de una variable; también `var(--id)` en CSS y `__hyperframes.getVariables()` en JS |
| `data-tramoya-estilo` | `<html>` | las fuentes y los colores del estilo del proyecto como variables CSS (`--font-display`, `--font-body`, `--bg`, `--text`, `--accent`…); con un valor, ese tema |

### Qué se mueve con el tiempo

Al exportar, cada cuadro sale de `seek(t)`. El motor busca en el tiempo:

- **GSAP**: cada `window.__timelines[id]` (en pausa; la raíz en su tiempo, las anidadas
  en el suyo). Es la forma recomendada.
- **CSS `@keyframes` y WAAPI** (`el.animate(…)`): relativas al inicio de su clip. Con
  iteraciones finitas y `fill-mode: both`.
- **Lottie**: `autoplay: false` y la instancia en `window.__hfLottie.push(anim)`.
- **anime.js**: `window.__hfAnime.push(anim)`.
- **Lo propio** (canvas, three.js, p5, d3): dibujar en el evento
  `addEventListener('hf-seek', (e) => dibujar(e.detail.time))`; si algo tarda,
  `e.detail.waitUntil(promesa)`.
- **Videos**: el motor pone cada uno en el cuadro justo y espera a que llegue; nunca
  `play()` ni `currentTime` en el código.
- **Audio**: de `<audio>` y de `<video data-has-audio>`; ffmpeg lo mezcla al exportar con
  su inicio, recorte, volumen y fundidos.

### Reglas (las revisa `revisar`)

- Nada de `Math.random()` sin semilla, `Date.now()`, `performance.now()`,
  `requestAnimationFrame`, `setInterval` ni transiciones CSS: dependen del reloj real, no
  del tiempo de la composición. Un azar con semilla (mulberry32) calculado una vez está bien.
- Tweens finitos (sin `repeat: -1`).
- La línea se registra **después** de cargar lo que necesita (fuentes, datos).
- Sin internet al exportar: `tramoya composicion local <id>` baja las CDN a
  `proyecto/assets/vendor/` (`importar` y `nueva` ya lo hacen).

`revisar` además vuelve a tres instantes en otro orden y avisa si el cuadro cambia: si
`seek(t)` depende del cuadro anterior, el video (y los hilos) salen distintos de lo que
se ve. Vale para cualquier pieza, no solo las composiciones.

## Como escena de la presentación

```js
{ tipo: 'composicion', composicion: 'bar-chart-race', mantener: 10 }                       // entera, con bordes si no es 16:9
{ tipo: 'composicion', composicion: 'intro', encaje: 'cubrir', titulo: 'Así *crece*.' }      // cubre la pantalla, título encima
{ tipo: 'composicion', composicion: 'ai-answer-rank', encaje: 'marco', kicker: 'Antes', titulo: 'Lo que *cambió*.',
  variables: { brand: 'Tramoya' }, desde: 0, velocidad: 1, transicion: 'fundido' }          // en un marco, con el título al lado
```

La composición corre con el **reloj de la escena**: desde que la escena aparece, también
durante la pausa en su punto clave (`mantener`: dale tiempo para terminar). `desde`
arranca más adelante; `velocidad` la acelera o la frena; `variables` pisa las suyas solo
en esta escena. En el editor de la presentación se elige de una lista.

El mismo gancho sirve para un tipo propio: `reloj(raíz, t, { render })` en un tipo de
escena recibe los segundos desde que la escena aparece y puede devolver una promesa
(`motion/tipos.js`; el tipo `video` lo usa para exportar el cuadro justo).

## Exportar más rápido

`tramoya video <pieza> --hilos 4` reparte los cuadros entre varios Chrome y ffmpeg une
los tramos sin volver a codificar. Por defecto usa hasta 4 (la mitad de los núcleos)
cuando el video es largo. Funciona con cualquier pieza porque `seek(t)` no depende del
cuadro anterior (lo que `revisar` comprueba).
