# Presentación motion: referencia

`motion/index.html` · motor en `motion/motor.js` · tipos en `motion/tipos.js` (y
`proyecto/tipos.js`) · guion en `proyecto/escenas.js`.

## Uso

| Tecla | Qué hace |
|-------|----------|
| → · Espacio · clic | Reproduce hasta el próximo punto clave |
| ← | Rebobina al punto clave anterior |
| Shift + flecha | Salta sin animar |
| Inicio · Fin | Al principio · al final |
| P | Congela el cuadro |
| A | Automático: sigue solo después de cada pausa (`mantener`) |
| R | Repite el tramo hasta el punto clave actual |
| N | Notas del presentador |
| T | Cambia de tema |
| M | Desenfoque de movimiento sí/no |
| E | Editor |
| C | Marcar una corrección (Esc cancela) |
| F | Pantalla completa |
| H | Ayuda |

La barra de abajo se puede arrastrar: recorre el video cuadro a cuadro.

## URL

| Parámetro | Qué hace |
|-----------|----------|
| `?escena=4&paso=2` | Abre ese punto clave (desde 1) |
| `?t=18.9` | Congela ese instante de la línea de tiempo (`&amb=` fija el tiempo ambiente) |
| `&tema=papel` | Fuerza un tema |
| `&ui=0` | Sin controles (para capturas) |
| `?render` | Modo render: sin interfaz, sin reproducción, ignora lo guardado (`&guardado` lo usa); expone el contrato de render |
| `&pausaMax=3` | En modo render, ninguna pausa dura más de 3 s |

## Escenas

Cada escena de `proyecto/escenas.js` es un objeto con `tipo` y los campos de ese tipo.
Campos comunes:

| Campo | Qué es |
|-------|--------|
| `tipo` | Nombre del tipo (`portada`, `texto`, `tarjetas`, `flujo`, `imagen`, `senales`, `codigo`, `columnas`, `cifra`, `video`, `cita`, `cierre`, o uno propio) |
| `mantener` | Segundos de pausa en automático y en el video (se reparte entre los pasos) |
| `notas` | Notas del presentador (N) |
| `pasos` | `'uno'` (cada avance revela un punto) o `'todo'`; por defecto, el del tipo |
| `entrada` | Cómo llega la cámara: `derecha`, `izquierda`, `abajo`, `arriba`, `zoom` (por defecto alterna) |
| `logo` | Variante del logo para esta escena (tipos con `conLogo`) |
| `ocultar` | Lista de campos (`data-f`) que no se muestran |
| `cromo` | `false` para ocultar encabezado y pie en esta escena |
| `activa` | `false` para saltearla |
| `correcciones` | Las agrega el editor |

Texto: `*palabra*` va en color de acento. Campos `lines`: uno por línea. Campos `pairs`:
`título | detalle` por línea. Rutas de imágenes: relativas a la página
(`../proyecto/assets/img/…`).

## Tipos de escena

Un tipo es un objeto en `motion/tipos.js` (del motor) o en `proyecto/tipos.js` (del
proyecto, `window.TIPOS_PROYECTO`):

```js
miTipo: {
  nombre: 'Nombre en el editor',
  campos: [['clave', 'text' | 'area' | 'lines' | 'pairs' | 'image' | 'video' | 'number' | 'select', 'Etiqueta', opciones?]],
  ejemplo: { … },              // contenido de una escena nueva
  pasos: 'uno' | 'todo',       // si el tipo tiene puntos que se pueden revelar de a uno
  conLogo: true,               // muestra el logo y deja elegir la variante
  focos: (d) => [{ x, y, s }], // cámara dentro de la escena, uno por punto clave
  render: (d, ctx) => `HTML`,  // ctx.logo(tamaño), ctx.n
  tick: (raiz, t) => {},       // cada cuadro, con el tiempo ambiente
  onHold: (raiz) => {}, onLeave: (raiz) => {},
  css: `…`,                    // estilos propios
}
```

Ayudas en `window.MOTION.helpers`: `kicker(d, at)`, `titulo(d, at, clase)`,
`numeral(ctx)`, `lista(items, uno, base, build)`, `modo(d, def)`, `f2(x)`. Las clases
comunes (`.pad`, `.kicker`, `.points`, `.cards`, `.split2`, `.two`, …) están en
`motion/tipos.css`. El escenario mide 1920 × 1080: todo en px.

## Atributos de animación

| Atributo | Qué hace |
|----------|----------|
| `data-m` | Entrada: `up`, `left`, `right`, `fade`, `pop`, `zoom`, `wipe` (barrido con clip), `reveal` (cortina + zoom de la imagen interior), `draw` (trazo SVG), `count` (cuenta hasta `data-to`), `type` (se escribe), `words`, `letters` (texto cinético) |
| `data-s` | Punto clave en el que entra: 0 al llegar a la escena, 1, 2… en cada avance |
| `data-at` | Segundos desde que empieza ese punto clave |
| `data-dur` | Duración de la entrada |
| `data-stagger` | Desfase entre palabras o letras |
| `data-k` | Clave compartida: si la escena siguiente tiene la misma, el elemento viaja |
| `data-shape` | Cómo viaja: `text` (por defecto), `bar` (la barra de un punto de lista), `box` (tarjeta, panel), `img` (foto) |
| `data-par` | Paralaje durante el movimiento de cámara (1 = con la escena; 1,8 = más rápido; 0,45 = más lento) |
| `data-dim` | Se atenúa cuando entra el punto siguiente |
| `data-out` | Punto clave en el que se va: sirve para destacar una cosa por vez |
| `data-f` | Campo que muestra: con el editor abierto, un clic lo edita |

Claves que conviene repetir entre tipos para que haya morph: `kicker`, `titulo`,
`hero` (la imagen o panel principal) e `item-0`, `item-1`… (los puntos, tarjetas,
bloques o filas).

La salida de cada elemento es automática: lo que no viaja se va hacia donde se mueve
la cámara, con un pequeño escalonado por orden.

## Contrato de render

Con `?render`, la página expone:

- `window.ready`: promesa, se resuelve con las fuentes cargadas y la escena construida
- `window.DURACION`: duración del video (movimientos + pausas)
- `window.seek(v)`: dibuja el instante `v` del video
- `window.CLAVES`: `[{ v, escena, paso }]` un instante por punto clave

Lo usan `render/revisar.mjs` y `render/video.mjs`. El reel cumple el mismo contrato, y
cualquier pieza nueva que lo cumpla se puede revisar y renderizar igual.
