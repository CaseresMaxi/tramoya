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
| Ctrl+Z · Ctrl+Shift+Z | Deshacer · rehacer lo editado (fuera de un campo de texto; también ↶ ↷ abajo a la izquierda) |
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
| `&estilo=cine` | Previsualiza un estilo de la galería (`proyecto:<id>` para uno propio) sin elegirlo |
| `&ui=0` | Sin controles (para capturas) |
| `?render` | Modo render: sin interfaz, sin reproducción; usa lo guardado en archivos (`proyecto/estado/`) pero no el borrador del navegador; expone el contrato de render |
| `&pausaMax=3` | En modo render, ninguna pausa dura más de 3 s |

## Escenas

Cada escena de `proyecto/escenas.js` es un objeto con `tipo` y los campos de ese tipo.
Campos comunes:

| Campo | Qué es |
|-------|--------|
| `tipo` | Nombre del tipo (`portada`, `texto`, `tarjetas`, `flujo`, `imagen`, `senales`, `codigo`, `columnas`, `cifra`, `video`, `cita`, `cierre`, `libre` (HTML a medida), o uno propio) |
| `mantener` | Segundos de pausa en automático y en el video (se reparte entre los pasos) |
| `notas` | Notas del presentador (N) |
| `pasos` | `'uno'` (cada avance revela un punto) o `'todo'`; por defecto, el del tipo |
| `entrada` | Hacia dónde viaja la cámara: `derecha`, `izquierda`, `abajo`, `arriba`, `zoom` (por defecto alterna) |
| `transicion` | Cómo llega esta escena: `franjas`, `camara`, `morph`, `fundido`, `corte` (o `{ tipo, dur }`); por defecto, la del estilo |
| `coreografia` | Cómo se mueve cada rol: `tipo`, `sobria`, `editorial`, `cinetica`, `tecnica`, `impacto`, `quieta` o una propia |
| `mov` | Movimiento por campo (`titulo`, `puntos.2`) o por rol (`@item`): `{ m, s, at, dur, stagger, orden, e, es, x }`. Ver `referencias/movimiento.md` |
| `focos` | Cámara dentro de la escena, uno por punto clave: `[{ x, y, s }]` (pisa los del tipo) |
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

El repertorio completo (y cuándo usar cada movimiento) está en `referencias/movimiento.md`;
los movimientos viven en `motion/movimientos.js` y un proyecto suma los suyos con
`MOTION.registrarMovimiento` en `proyecto/tipos.js`.

| Atributo | Qué hace |
|----------|----------|
| `data-m` | Entrada: `fade`, `up`, `down`, `left`, `right`, `zoom`, `pop`, `caer`, `desenfoque`, `girar`, `escala-x`, `crecer`, `wipe`, `barrido-v`, `abrir`, `circulo`, `reveal`, `draw`, `count`, `type`, `desordenar`, `seguir`, `words`, `letters`, `renglones`, `palabras-pop`, `palabras-fundido`, `letras-azar`, `quieto` o uno propio |
| `data-s` | Punto clave en el que entra: 0 al llegar a la escena, 1, 2… en cada avance |
| `data-at` | Segundos desde que empieza ese punto clave |
| `data-dur` | Duración de la entrada |
| `data-stagger` | Desfase entre palabras, letras o renglones |
| `data-orden` | Orden de las partes de un texto o de los ítems de un grupo: `normal`, `inverso`, `centro`, `bordes`, `azar` |
| `data-e` | Acento (`resaltar`, `subrayar`, `tachar`, `agrandar`, `atenuar`, `sacudir`) o bucle (`latir`, `flotar`, `respirar`, `oscilar`, `kenburns`) · `data-es` su punto clave · `data-eat` · `data-edur` |
| `data-x` | Salida: cualquier entrada, al revés (por defecto se va hacia donde va la cámara) |
| `data-r` | Rol para las coreografías (`kicker`, `titulo`, `texto`, `item`, `hero`, `dato`, `logo`, `numeral`); si falta, se deduce de `data-k` y `data-f` |
| `data-to` · `data-desde` | Para `count` · `data-camino` (path SVG que termina en `0 0`) para `seguir` |
| `data-k` | Clave compartida: si la escena siguiente tiene la misma, el elemento viaja |
| `data-shape` | Cómo viaja: `text` (por defecto), `bar` (la barra de un punto de lista), `box` (tarjeta, panel), `img` (foto) |
| `data-par` | Paralaje durante el movimiento de cámara (1 = con la escena; 1,8 = más rápido; 0,45 = más lento) |
| `data-dim` | Se atenúa cuando entra el punto siguiente |
| `data-out` | Punto clave en el que se va: sirve para destacar una cosa por vez |
| `data-f` | Campo que muestra: con el editor abierto, un clic lo edita (y elige su movimiento) |

Claves que conviene repetir entre tipos para que haya morph: `kicker`, `titulo`,
`hero` (la imagen o panel principal) e `item-0`, `item-1`… (los puntos, tarjetas,
bloques o filas).

La salida de cada elemento es automática (salvo `data-x`): lo que no viaja se va hacia
donde se mueve la cámara, con un pequeño escalonado por orden. En un `fundido` las capas
se cruzan enteras; en un `corte` no sale ni viaja nada.

## Escena libre

`tipo: 'libre'` con `html` y `css`: el HTML de la escena escrito a medida, con los mismos
atributos. `{{kicker}}` y `{{titulo}}` ponen los de siempre (viajan entre escenas);
`{{campo}}` pone ese campo de la escena como texto (con `*acento*`) y aparece en el editor.
Ejemplo en `referencias/movimiento.md` § 5.

## Contrato de render

Con `?render`, la página expone:

- `window.ready`: promesa, se resuelve con las fuentes cargadas y la escena construida
- `window.DURACION`: duración del video (movimientos + pausas)
- `window.seek(v)`: dibuja el instante `v` del video
- `window.CLAVES`: `[{ v, escena, paso }]` un instante por punto clave
- `window.PARTITURA`: por escena, tipo, coreografía, transición y movimiento de cada rol
  (`revisar` la escribe en `partitura.md` con avisos de repetición)

Lo usan `render/revisar.mjs` y `render/video.mjs`. El reel cumple el mismo contrato, y
cualquier pieza nueva que lo cumpla se puede revisar y renderizar igual.
