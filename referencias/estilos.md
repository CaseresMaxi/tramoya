# Estilos

Un **estilo** es el look completo de un proyecto: tipografías, temas de color, forma de
la marca, ritmo y transiciones de la presentación, tempo y banda del reel, y unas
perillas de forma (radios, bordes, antetítulos…). El contenido (`proyecto.js`,
`escenas.js`) no cambia al cambiar de estilo.

**No hay estilo por defecto.** Un proyecto nuevo usa el *neutro* (fuentes del sistema,
grises) hasta que se elige uno. Nunca asumas un estilo: mostrá la galería, preguntá, o
creá uno a partir de las referencias del usuario.

## Dónde está cada cosa

| Ruta | Qué es |
|------|--------|
| `estilos/<id>/` | Galería del motor: `estilo.js`, `fuentes/*.woff2`, `LICENCIAS.md` |
| `estilos/index.html` | Galería: muestras vivas, filtro, probar, elegir, **pedir un estilo** |
| `proyecto/estilos/<id>/` | Estilos propios del proyecto (los que crea el agente). En la galería, con la etiqueta *propio* |
| `proyecto/estilo/` | **El elegido**, copiado (con sus fuentes): queda fijo aunque la galería cambie |
| `proyecto/galeria.js` | Lista generada de estilos (desde `file://` no se pueden listar carpetas) |
| `proyecto/assets/referencias/` | Capturas e imágenes de referencia que subió el usuario |

Comandos: `tramoya estilos` (lista; `--json`), `tramoya estilo <id>` (elige; uno propio:
`proyecto:<id>`), `tramoya regenerar` (rehace `galeria.js`). Con `tramoya abrir`, el
botón «Elegir este estilo» de la galería hace lo mismo (`PUT __tramoya/estilo`) y las
páginas abiertas se recargan.

**Previsualizar sin elegir:** cualquier pieza con `?estilo=<id>` (o
`?estilo=proyecto:<id>`): `motion/index.html?estilo=cine`,
`tramoya revisar poster --query 'render&export&estilo=suizo' --ancho 2245 --alto 3179`.
En la previsualización mandan el tema, el ritmo, la marca y la banda del estilo (no lo
guardado en las piezas ni el diseño del editor de marca); del proyecto queda solo el
contenido (la palabra de la marca, el pie).

## Galería

| id | Nombre | Títulos · texto | Temas | Movimiento | Reel |
|----|--------|-----------------|-------|------------|------|
| `noche-dorada` | Noche dorada | Playfair Display · Inter | noche, carmín, papel | franjas, expo | 120, épica |
| `suizo` | Suizo | Inter Tight · Inter | blanco, negro, rojo | cámara rápida, grilla | 128, un acorde, sin acordes |
| `brutalista` | Brutalista | Space Grotesk (mayúsculas) · Space Mono | hormigón, amarillo, negro ácido | 2 franjas de tinta, a saltos | 140, tensión |
| `editorial` | Editorial | Fraunces · Libre Franklin | papel, salvia, tinta | morph lento, suave, grano leve | 92, melancólica, sin bombo |
| `terminal` | Terminal | JetBrains Mono | fósforo, ámbar, papel continuo | cámara corta, a saltos, barrido CRT | 124, un acorde |
| `neon` | Neón synth | Unbounded · Sora | synth, tron, ocaso | 6 franjas alternadas, resplandor | 110, épica |
| `corporativo` | Corporativo claro | Plus Jakarta Sans · Inter | claro, marino, menta | cámara suave y corta | 116, luminosa |
| `pastel` | Juguetón pastel | Fredoka · Nunito | helado, menta, uva | franjas redondas, resorte | 126, luminosa |
| `cine` | Cine | Oswald (mayúsculas) · Work Sans | sala, noir, sepia | travelling largo, letterbox, grano fuerte | 84, tensión |
| `minimal` | Minimal | DM Sans | blanco, grafito, arena | morph, suave, sin marcadores | 100, luminosa, sin bombo |

Todas las fuentes son SIL Open Font License 1.1 (subconjunto `latin` de Google Fonts);
cada estilo anota autores y archivos en su `LICENCIAS.md`.

## El formato

```js
// estilos/<id>/estilo.js (o proyecto/estilos/<id>/estilo.js)
TRAMOYA.registrarEstilo({
  id: 'mi-estilo',                       // primero: lo lee el CLI. [a-z0-9-]
  nombre: 'Mi estilo',
  descripcion: 'Una línea que diga cómo se ve y cómo se mueve.',
  etiquetas: ['oscuro', 'serif', …],     // para el filtro de la galería
  referencia: 'El prompt o la descripción de la que salió (opcional)',

  fuentes: [                             // archivo: relativo a la carpeta del estilo
    { familia: 'Fraunces', archivo: 'fuentes/fraunces.woff2', peso: '100 900' },
    { familia: 'Fraunces', archivo: 'fuentes/fraunces-italic.woff2', peso: '100 900', estilo: 'italic' },
  ],
  tipografia: {
    display: "'Fraunces', Georgia, serif",   // títulos, cifras, marca
    texto: "'Libre Franklin', sans-serif",   // cuerpo
    mono: "ui-monospace, Menlo, monospace",  // código, monitores
    // perillas (todas opcionales; ver la tabla)
    peso: 560, pesoTexto: 400, pesoAcento: 400, interletra: -0.02, alto: 1.04,
    mayusculas: false, italica: true, italicaTitulos: false,
  },
  forma: {                               // perillas de forma (opcionales)
    radio: 0.25, borde: 1, sombra: 'none', numeral: false, marcador: true, trama: 60,
    kicker: { fuente: 'texto', peso: 600, interletra: 0.16, mayusculas: true, barra: false },
    vars: { 'mi-variable': '…' },        // variables CSS sueltas, para el css de abajo
  },
  temas: {                               // 2–3; el primero o motion.tema es el de arranque
    papel: { nombre: 'Papel', claro: true, vars: {
      bg, panel, 'panel-2', text, strong, muted, lead, accent, 'accent-2',
      line, glow, 'glow-2', overlay, code, grid, dot } },
  },
  marca: {
    base: { forma: 'monograma', peso: 600, tracking: -10, … },   // campos de nucleo/marca.js SCHEMA
    variantes: { anillo: { forma: 'anillo', grosor: 4 } },       // se suman a las del proyecto
  },
  motion: { tema: 'papel', transicion: 'morph', entrada: 'suave', ritmo: 1.25, duracion: 1.6,
            recorrido: 1, velocidad: 0.9, desenfoque: false, grano: 0.05, cromo: true,
            franjas: { n: 4, color: 'mixto', grosor: 1 } },
  reel: { bpm: 92, sonido: { activo: true, volumen: 0.8, progresion: 'melancolica',
          acordes: true, bombo: false, golpes: 'partes', riser: false } },
  css: `.scene .kicker{border-bottom:1px solid var(--line)}`,  // CSS extra, en todas las piezas
});
```

**Precedencia.** El estilo pone la base y `proyecto/proyecto.js` la pisa: si el proyecto
declara `temas`, `fuentes`, `tipografia`, `forma`, `marca.base`, `estilo` (motion) o
`reel.bpm`/`reel.sonido`, mandan esos. Lo guardado en las piezas (`proyecto/estado/`)
manda sobre los dos, con dos excepciones: un tema guardado que el estilo no tiene pasa
al del estilo (`TRAMOYA.temaValido`), y en la presentación las claves de movimiento
(tema, transición, velocidad, desenfoque, grano, cromo, duración, recorrido, entrada,
ritmo, distancia, franjas) vuelven a las del estilo si lo guardado se hizo con otro
(`estado/motion.json` guarda `estilo.estiloBase`).

**Variables de tema** (cada tema las tiene todas): `bg` fondo · `panel`/`panel-2`
tarjetas y cajas · `text` texto · `strong` títulos · `muted` secundario · `lead`
párrafos · `accent`/`accent-2` acentos · `line` filetes y bordes · `glow`/`glow-2`
resplandores de fondo (o `transparent`) · `overlay` velo sobre fotos · `code` fondo de
código · `grid` trama de líneas del mundo · `dot` trama de puntos. `claro: true` avisa
que el fondo es claro (la marca usa la versión `claro` de sus variantes).

### Perillas

Las de `tipografia` y `forma` llegan a las páginas como variables CSS en `:root`
(`TRAMOYA.perillas`); motion, póster, landing y la portada las leen con
`var(--x, valor de siempre)`. Sin la perilla, cada pieza se ve como antes de que
existieran.

| Perilla | Variable CSS | Por defecto | Qué cambia |
|---------|--------------|-------------|------------|
| `tipografia.peso` | `--titulo-peso` | 800 (landing 700) | Peso de títulos, cifras, cita, numeral, marca del cromo; en el reel reemplaza el 800 |
| `tipografia.pesoTexto` | `--texto-peso` | 400 | Peso de párrafos y bajadas |
| `tipografia.pesoAcento` | `--acento-peso` | 700 | Peso de la parte en acento de la frase del póster |
| `tipografia.interletra` | `--titulo-interletra` | -0.02 (em) | Interletrado de títulos (número = em) |
| `tipografia.alto` | `--titulo-alto` | 1.04 | Interlineado de títulos |
| `tipografia.mayusculas` | `--titulo-caja` | false | Títulos en mayúsculas (también en el reel) |
| `tipografia.italica` | `--acento-estilo` | true | Itálica en `*acento*` de `em`, números de lista, contador, cita, numeral; `false` la apaga también en el reel |
| `tipografia.italicaTitulos` | `--titulo-estilo` | false | Títulos enteros en itálica |
| `forma.radio` | `--radio` | 1 | Multiplica todos los radios (tarjetas, cajas, barras, botones). 0 = esquinas vivas |
| `forma.borde` | `--borde` | 1 (px) | Grosor de los bordes de tarjetas y cajas |
| `forma.sombra` | `--sombra` | none | `box-shadow` de tarjetas, cajas, código y botón de la landing |
| `forma.numeral` | `--numeral` | true | Número gigante de fondo en las escenas |
| `forma.marcador` | `--marcador` | true | Barras de los puntos, filete de tarjetas y cita, puntos de los atributos del póster |
| `forma.trama` | `--trama` | 60 (px) | Paso de la trama del mundo (`grid`/`dot` del tema) |
| `forma.kicker.fuente` | `--kicker-fuente` | texto | Fuente del antetítulo: `display`, `texto` o `mono` |
| `forma.kicker.peso` | `--kicker-peso` | 700 | Peso del antetítulo (y atributos del póster, etiquetas del flujo) |
| `forma.kicker.interletra` | `--kicker-interletra` | 0.22 (em) | Interletrado del antetítulo |
| `forma.kicker.mayusculas` | `--kicker-caja` | true | Antetítulo en mayúsculas |
| `forma.kicker.barra` | `--kicker-barra` | 46 (px) | Largo de la barrita del antetítulo; `false` la saca |
| `forma.vars` | `--<clave>` | — | Variables sueltas para usar en `css` |

Las de `motion` van a `PROYECTO.estilo` (y al panel «Movimiento» del editor):

| Perilla | Por defecto | Qué cambia |
|---------|-------------|------------|
| `tema` | el primero | Tema con el que arranca |
| `transicion` | franjas | `franjas` (barren + cámara) · `camara` · `morph` (sin cámara, solo se transforma) · `fundido` · `corte`. Cada escena puede pedir otra |
| `coreografia` | tipo | La coreografía base: cómo se mueve cada rol (`sobria`, `editorial`, `cinetica`, `tecnica`, `impacto`, `quieta`; ver `referencias/movimiento.md`). Es carácter del estilo; cada escena puede pedir otra |
| `coreografias` | — | Rotación cuando se repite el tipo de escena (por defecto: la base, editorial, cinetica, sobria) |
| `variar` | true | `false`: no rotar aunque se repita el tipo
| `franjas` | `{ n: 4, color: 'mixto', grosor: 1 }` | Cuántas (1–8), color (`mixto`: acento afuera y tinta adentro · `acento` · `tinta` · `alternado`) y grosor relativo |
| `duracion` | 1.5 | Segundos de cada transición entre escenas |
| `recorrido` | 1 | Cuánto viaja la cámara (1 = 900 px; 0 = casi en el lugar) |
| `entrada` | expo | Curva de las entradas: `expo` (frena al llegar) · `suave` · `resorte` (se pasa y vuelve) · `lineal` · `escalon` (a saltos) |
| `ritmo` | 1 | Multiplica duración, retardo y desfase de cada entrada (más = más lento y aireado) |
| `distancia` | 1 | Cuánto se desplaza lo que entra (`up`, `left`, `right`) |
| `velocidad` | 1 | Velocidad de reproducción de todo |
| `desenfoque` | true | Desenfoque de movimiento en cámara y franjas |
| `grano` | true | Textura de grano: `true` (0.06), `false` o un número (opacidad, 0–0.3) |
| `cromo` | true | Encabezado, contador y pie |

`reel`: `bpm` (40–240) y `sonido` (`activo`, `volumen`, `progresion`: `epica` ·
`luminosa` · `tension` · `melancolica` · `fija`; `acordes`, `bombo`, `golpes`: `compas`
· `partes` · `no`; `riser`). Ver `reel/editor.js`. El reel también toma de `tipografia`
el peso, `mayusculas` e `italica`.

`marca.base`: cualquier campo de `SCHEMA` en `nucleo/marca.js` salvo `palabra`, que es
del proyecto: `forma` (`franjas`, `anillo`, `monograma`, `puntos`, `onda`, `ninguna`),
`n`, `grosor`, `inclinacion`, `colorFranjas`, `radio`, `peso`, `tracking`, `isoEscala`,
`separacion`, `colorPalabra`, `layout`. Los colores (tinta, acento, fondo) salen del tema.

`css`: para lo que las perillas no cubren (resaltar el acento como bloque, letterbox,
líneas de barrido…). Se inyecta en todas las piezas; usá selectores del escenario
(`.scene`, `.stage`), del póster (`.poster`, `.claim`) o de la landing (`.hero`,
`section.sec`) para apuntar a una sola. Nada de `animation`/`transition` en el
escenario: todo es función del tiempo.

## Crear un estilo a partir de una referencia

El usuario pide un estilo desde la galería («Pedir un estilo»: prompt de otro motion
graphic, links, capturas) o en el chat. Los pedidos de la galería quedan en
`proyecto/estado/pedidos.json` (`{ id, tipo: 'estilo', texto, links, imagenes, fecha,
hecho, base? }`) y `tramoya estado` los lista como pendientes.

1. **Leer la referencia entera.** El texto, cada link (si se puede abrir, mirá la
   miniatura o el sitio; si no, deducí del título y del contexto), y cada imagen de
   `proyecto/assets/referencias/` (abrila con Read: es la fuente más fiel). Si trae
   `base`, partí de ese estilo (copiá su carpeta).
2. **Sacar el adjetivo de cada eje.** Escribí, para vos, una línea por eje: *paleta*
   (oscura/clara, cálida/fría, saturada/apagada, cuántos acentos), *tipografía*
   (serif/sans/mono, condensada/ancha, peso, mayúsculas, itálicas), *forma* (esquinas,
   bordes, sombras, densidad), *movimiento* (rápido/lento, seco/elástico, cámara o
   cortes, cuánto viaja), *textura* (grano, desenfoque, brillo) y *sonido* (tempo,
   ánimo, golpes).
3. **Traducir a tokens:**
   - **Paleta.** De las capturas: el color dominante es `bg`; el más llamativo, `accent`;
     el segundo, `accent-2`. `panel` = `bg` corrido 4–8 % hacia el texto; `line` ≈ 15 %;
     `muted` y `lead` entre `text` y `bg`. Contraste AA mínimo: `text`/`bg` y
     `strong`/`panel` ≥ 4.5 (mejor 7), `muted`/`bg` ≥ 4.5, `accent`/`bg` ≥ 3 (va en
     títulos grandes) y `bg` sobre `accent` ≥ 3 (el botón de la landing). Un tema claro y
     uno oscuro como mínimo; marcá `claro: true`.
   - **Par tipográfico** de Google Fonts (OFL): «elegante/clásico» → serif de alto
     contraste (Playfair, Fraunces, Cormorant); «técnico» → mono (JetBrains, IBM Plex
     Mono, Space Mono); «moderno/limpio» → grotesca (Inter Tight, DM Sans, Manrope);
     «impacto/tráiler» → condensada (Oswald, Bebas Neue, Anton); «retro/synth» → ancha
     (Unbounded, Syne, Archivo Expanded); «amable/infantil» → redonda (Fredoka,
     Nunito). Preferí variables (un archivo para todos los pesos) y que tengan el peso
     que vas a usar: si una fuente no tiene 800, poné `tipografia.peso` en el que tenga.
   - **Movimiento.** «Energético, cortes al beat» → `velocidad` 1.1–1.3, `ritmo`
     0.7–0.85, `duracion` 0.9–1.1, `entrada: 'escalon'` o `'expo'`, `franjas` pocas y
     gruesas. «Cinematográfico, épico» → `duracion` 1.8–2.2, `recorrido` 1.3–1.5,
     `ritmo` 1.3, `entrada: 'suave'`. «Elegante, editorial» → `transicion: 'morph'`,
     `ritmo` 1.2, `desenfoque: false`. «Juguetón» → `entrada: 'resorte'`, franjas
     `alternado`, `radio` alto. «Glitch, digital» → `escalon`, `grano` 0.1, `css` con
     líneas de barrido.
   - **Textura.** Grano de película → `grano` 0.12–0.18; plano y digital → `false`.
     Brillo/neón → `css` con `text-shadow` en `.accent`, `glow` saturado en el tema.
   - **Banda.** Lento/melancólico → `bpm` 80–95, `melancolica` o `tension`, sin bombo;
     corporativo → 110–118, `luminosa`; energético → 125–140, `epica` o `tension`,
     `golpes: 'compas'`, `riser`.
   - **Marca.** Que la forma del isotipo rime con el estilo: geométrico → `puntos` o
     `anillo`; editorial → `monograma`; minimal → `ninguna`; sonoro/fluido → `onda`.
4. **Escribirlo** en `proyecto/estilos/<id>/estilo.js` (nunca en `estilos/` del motor:
   `actualizar` lo pisa), con `referencia:` = el pedido resumido. Las fuentes, en
   `proyecto/estilos/<id>/fuentes/` (bajalas con
   `curl -A 'Mozilla/5.0 … Chrome/120' 'https://fonts.googleapis.com/css2?family=Fraunces:ital,wght@0,100..900;1,100..900&display=swap'`
   y tomá las URL del bloque `/* latin */`), con su `LICENCIAS.md`. Después
   `tramoya regenerar` (aparece en la galería con la etiqueta *propio*).
5. **Previsualizar y corregir**, sin elegirlo todavía:
   `tramoya revisar motion --query 'render&estilo=proyecto:<id>'`, y lo mismo con
   `landing`, `reel` y `poster --query 'render&export&estilo=proyecto:<id>' --ancho 2245 --alto 3179`.
   Mirá los PNG: que se parezca a la referencia, que nada desborde (las fuentes anchas
   o mono necesitan un `css` que achique tablas o bajadas), contraste. Compará con las
   capturas lado a lado (`magick montage`).
6. **Cerrar el pedido:** en `proyecto/estado/pedidos.json`, ese pedido con
   `"hecho": true` y `"estilo": "proyecto:<id>"` (la galería lo muestra), y
   `tramoya regenerar`. Avisale al usuario: qué tomaste de cada referencia, el link de
   la galería (o `motion/index.html?estilo=proyecto:<id>`) y que lo elija con el botón o
   con `tramoya estilo proyecto:<id>`. No lo elijas vos salvo que lo pida.

### Ejemplos

**«Kinetic typography, bold condensed sans, black and acid yellow, fast cuts on the
beat, glitch transitions, film grain»** →
`tipografia: { display: "'Anton', sans-serif", texto: "'Inter', sans-serif", peso: 400, mayusculas: true, italica: false, interletra: 0.01, alto: 0.95 }`
(Anton tiene un solo peso: `peso: 400`), temas `negro` (`bg #0a0a0a`, `accent #e6ff00`,
`accent-2 #ff2d55`) y `amarillo` (`bg #e6ff00`, texto negro, `accent #0a0a0a` +
`css` que pinte el acento como bloque),
`motion: { transicion: 'franjas', franjas: { n: 2, color: 'acento', grosor: 2 }, entrada: 'escalon', ritmo: 0.7, duracion: 0.9, velocidad: 1.25, grano: 0.14, desenfoque: true }`,
`forma: { radio: 0, kicker: { fuente: 'mono', barra: 60 } }`,
`reel: { bpm: 138, sonido: { progresion: 'tension', golpes: 'compas', riser: true } }`,
marca `franjas` con `inclinacion: 0`, y en `css` líneas de barrido
(`.stage:not(.marking)::before{…repeating-linear-gradient…}`).

**«Como la web de Aesop / Kinfolk: calma, papel, fotografía, mucho aire»** →
serif liviana de texto (Cormorant Garamond o Newsreader, `peso: 400`,
`italica: true`, `pesoAcento: 400`) + sans neutra (Inter, `pesoTexto: 300`); temas
`hueso` (`bg #f1ede6`, `accent #6b5b45`) y `tabaco` oscuro; `forma: { radio: 0,
numeral: false, marcador: false, kicker: { mayusculas: true, interletra: 0.3, barra: false } }`;
`motion: { transicion: 'morph', entrada: 'suave', ritmo: 1.4, duracion: 1.8, desenfoque: false, grano: 0.04 }`;
`reel: { bpm: 80, sonido: { progresion: 'melancolica', bombo: false, golpes: 'no', riser: false } }`;
marca `monograma` o `ninguna`.

**Captura de un video de producto en 3D, azul eléctrico sobre blanco, tarjetas
flotantes, links a Dribbble** → partir de `corporativo` (`base: 'corporativo'`):
`accent` = el azul de la captura medido con `magick captura.png -resize 1x1 txt:` sobre
un recorte del acento, `forma.sombra` más marcada (`0 40px 80px -30px rgba(20,40,120,.35)`),
`forma.radio: 1.4`, `motion: { transicion: 'camara', entrada: 'resorte', ritmo: 0.9, recorrido: 0.6 }`,
`reel.bpm: 120` con `luminosa`.

## Qué cambia en el motor si se agrega una perilla

Una perilla nueva va en `perillas()` (sección «Estilos» de `nucleo/util.js`) como
variable CSS, y cada pieza la lee con `var(--x, valor de siempre)`: así un estilo que no
la declara y los proyectos viejos se ven igual. Las de movimiento van en `ESTILO_DEF` y
en `LOOK` de `motion/motor.js`. Documentala en las tablas de arriba.
