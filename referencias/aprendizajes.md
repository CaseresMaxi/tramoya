# Aprendizajes

Lo que salió de hacer la presentación, el reel, el póster, la landing y el logo de un
proyecto real para una muestra de proyectos, y que acá quedó
convertido en motor. Cada punto dice qué hacer y por qué, para no volver a pagarlo.

## Principios

**1. Todo es una función del tiempo.** Cada cuadro sale de `render(T)` o `seek(t)`:
nada de animaciones CSS, `setTimeout`, ni estado que pase de un cuadro al siguiente.
Eso es lo que permite, con el mismo código, pausar, rebobinar en medio de una
transición, arrastrar la línea de tiempo, revisar un cuadro puntual por URL
(`?t=12.5`) y renderizar a video cuadro por cuadro sin que nada se desfase. Si algo
"recuerda" (un texto que se escribe solo, un contador), se calcula desde el progreso,
no se acumula.

**2. Puntos clave en vez de diapositivas.** Una presentación es una sola línea de
tiempo con paradas. → reproduce hasta la próxima parada y ahí se queda; ← rebobina
(más rápido que hacia adelante: 2,6×). Shift salta sin animar. Así la presentación en
vivo y el video grabado son la misma cosa: el modo automático y el render usan la
pausa (`mantener`) de cada escena.

**3. El escenario mide 1920 × 1080 y se escala entero.** Se diseña en píxeles fijos y
el `.stage` se escala con `transform: scale()` para entrar en la ventana. Nada de
unidades relativas al viewport adentro del escenario: así lo que se ve en la laptop
es exactamente lo que sale en el proyector y en el MP4.

**4. Los datos van separados del motor.** Todo lo que cambia de un proyecto a otro
está en `proyecto/`. El motor no sabe de qué trata la presentación. Los tipos de
escena dicen qué campos tienen y el editor se arma solo a partir de eso.

**5. Se abre con doble clic.** HTML, CSS y JS sin build, sin servidor, desde
`file://`. Presentar no puede depender de que funcione `npm` en la máquina del aula.
Las herramientas (render, glifos) son aparte y opcionales.

**6. Mirar el resultado en un navegador real antes de darlo por hecho.** Captura con
Chrome headless y revisión de la consola en cada cambio. Las capturas de los puntos
clave (`node render/revisar.mjs motion`) muestran en un vistazo lo que una lectura
del código no muestra: textos que desbordan, zooms que pisan el encabezado, etiquetas
cortadas en los bordes.

## Motion

- **El movimiento sale del contenido, no del tipo de escena.** Al principio cada tipo
  traía sus entradas fijas, y todas arrancaban igual (antetítulo barrido → título por
  palabras → ítems escalonados). Elegir un tipo era elegir la animación, así que una
  presentación con doce capturas se movía doce veces igual, y contenido distinto se
  metía en la forma que ya había. Ahora los tipos marcan **roles** y cada escena decide
  (`coreografia`, `mov`, `transicion`); el repertorio es un **registro abierto**
  (`motion/movimientos.js`) donde un proyecto suma movimientos sin tocar el motor; hay
  una escena `libre` para lo que no tiene forma de tipo; y `revisar` escribe una
  **partitura** con avisos de repetición. Ver [movimiento.md](movimiento.md).
- **Lo que viaja no entra.** Si el título tiene la misma `data-k` que el de la escena
  anterior, se transforma en lugar de entrar: cambiarle la entrada no se ve. La
  partitura lo marca como `viaja`; para empezar de cero, `transicion: 'corte'`.
- **Adaptar al largo del texto.** Letras animadas en una frase larga cansan y palabras
  sueltas en un párrafo se leen mal: el motor baja `letters` a `words` y `words` a
  `renglones` según el largo, y el título elige su entrada por cuántas palabras tiene.
- **Los acentos de fondo (resaltar, tachar) van sobre el texto, no sobre la caja**: en
  un bloque, se envuelve el contenido en un `span` con `box-decoration-break: clone`
  para que el trazo siga cada renglón y no el ancho del contenedor.
- **Las entradas se declaran en el HTML** (`data-m`, `data-s`, `data-at`…) y el motor
  calcula el estado de cada elemento según el tiempo. Escribir una escena nueva es
  escribir marcado, no animación. Referencia: [motion.md](motion.md).
- **Morph entre escenas con elementos compartidos.** Si dos escenas seguidas tienen un
  elemento con la misma `data-k`, en la transición viaja de una posición a la otra en
  lugar de cortarse. Las posiciones de reposo se **miden una vez** al construir (con la
  escena sin transformar) y después se interpolan: medir en cada cuadro es lento y da
  saltos.
  - Texto: los dos elementos se superponen, se escalan por la relación de tamaños de
    fuente y cruzan opacidad (el saliente se va entre 15–60 %, el entrante aparece
    entre 40–85 %).
  - Cajas: un "fantasma" interpola posición, tamaño, color de fondo, borde y radio; el
    contenido real se apaga al principio y aparece al final. Mezclar colores con
    transparente: tomar el tono del otro color, si no pasa por gris.
  - Solo viaja lo que está a la vista en los dos extremos (el entrante con `data-s=0`).
- **La cámara compone dos movimientos:** el foco dentro de la escena (recorrer un
  diagrama de punto clave en punto clave) por la cámara entre escenas (la saliente se
  va en la dirección de la entrante). Para poner algo "en pantalla" a pesar de la
  cámara, se invierte la transformación de su capa.
- **Un zoom hacia adentro empuja el contenido de los bordes hacia afuera.** Si el foco
  está más abajo que el centro, el título sube y pisa el encabezado. Probar cada foco
  con una captura.
- **Desenfoque de movimiento direccional:** CSS `blur()` no tiene dirección; se
  precalculan filtros SVG `feGaussianBlur` con `stdDeviation="n 0"` (y `"0 n"`) y se
  elige según la velocidad. Se aplica a la capa que se mueve, no a todo.
- **Texto cinético:** cada palabra (o letra) va en su propia máscara (`overflow:hidden`
  con un poco de padding y margen negativo para no cortar acentos ni descendentes) y
  sube desde atrás. Se parte el texto recorriendo los nodos de texto, sin tocar el
  marcado (los `<span class="accent">` sobreviven).
- **Curvas:** exponencial de salida para entradas, exponencial in-out para la cámara,
  "back" suave para el pop, resorte críticamente amortiguado cuando algo tiene que
  llegar con peso pero sin rebotar.
- **Las fuentes se esperan antes de medir.** `font-display:block` y
  `document.fonts.load()` de cada fuente declarada (no alcanza `document.fonts.ready`:
  no carga las que nadie usó todavía). Si se mide con la fuente de reemplazo, el morph
  queda corrido.
- **Colores calculados:** `getComputedStyle` devuelve `color(srgb …)` cuando el color
  sale de `color-mix()`; hay que parsearlo aparte (`nucleo/util.js`, `rgba()`).
- **Escenas vivas:** un tipo puede tener `tick(raíz, t)` con el tiempo ambiente
  (señales simuladas, pulsos por conectores, un monitor que corre). En el render, el
  tiempo ambiente es el tiempo del video: también es determinístico.
- **Video dentro de una escena:** arranca al detenerse en su punto clave
  (`onHold`) y se pausa al moverse (`onLeave`).
- **Reconstruir sin perder el lugar:** al editar, se reconstruye todo y se vuelve al
  mismo punto clave (escena y paso), no al principio.

## Edición y correcciones

- **Editar sobre el escenario:** con el editor abierto, un clic en un elemento con
  `data-f` abre ese campo; en una lista, queda seleccionada la línea que tocaste.
  Cualquier elemento se puede ocultar por escena sin tocar el código.
- **Correcciones con coordenadas.** "Corregir" (tecla C) pone una marca numerada en el
  punto de la escena y guarda escena, paso, punto (x, y en píxeles del escenario),
  elemento y una cita de su texto. "Copiar como texto" arma una lista para pegar en el
  chat: quien corrige no tiene que explicar dónde está el problema. El mismo esquema
  sirve en el póster (observaciones, en % del ancho y alto).
- **Las marcas se muestran solo con la imagen quieta**: las coordenadas son de ese
  cuadro; en medio de una transición no significan nada.

## Estado

- **Lo editado se guarda en archivos**: con `tramoya abrir` (servidor local sin
  dependencias), cada guardado escribe `proyecto/estado/<pieza>.json` y regenera
  `proyecto/estado.js`, que las páginas cargan con `<script>` (así funciona también con
  doble clic, desde `file://`). El agente lee esos `.json`; git los versiona; el zip
  los lleva.
- **`localStorage` es solo el borrador** de cuando se abre con doble clic. `leer()`
  usa el más nuevo de los dos (por `rev`); con `?render`, solo lo de archivos: un render
  sale igual en cualquier máquina.
- **Si el agente edita un `.json` de estado a mano**, la fecha del archivo cuenta como
  `rev`: gana sobre el borrador viejo del navegador. Las páginas abiertas con el
  servidor se recargan solas cuando cambia algo en `proyecto/`.
- **El estado manda sobre `proyecto/*.js`**: si existe `estado/motion.json`, cambiar
  `escenas.js` no se ve. O se edita el `.json`, o se lo borra después de pasar lo
  editado a `escenas.js`.
- **Un navegador no puede listar carpetas desde `file://`**: la lista de assets para los
  selectores es `proyecto/manifiesto.js`, que regeneran `tramoya manifiesto`, el
  servidor al subir un archivo y cualquier comando de render.
- **Configuración en la URL:** el póster pasa sus parámetros al script de exportación
  como base64url en el hash (`#cfg=…`), y solo lo que difiere de los valores por
  defecto: el comando queda corto y sin problemas de comillas.

## Video

- **Render cuadro por cuadro con Playwright:** abrir la pieza con `?render` (sin
  interfaz, escenario fijo en 1920 × 1080, sin escalar), esperar `window.ready`,
  llamar `window.seek(t)` y capturar. JPEG a calidad 95 por la tubería a ffmpeg
  (`image2pipe`, `mjpeg`) es mucho más rápido que PNG y no se nota.
- **Motion blur por subcuadros:** capturar a `fps × 3` y promediar cada grupo de 3 con
  `tmix`, quedándose con uno de cada tres (`select`). Es el desenfoque de un obturador
  real y se suma al direccional.
- **H.264 con `-pix_fmt yuv420p`** (si no, muchos reproductores no lo abren),
  `-crf 15` y `-movflags +faststart` para que arranque antes de bajarse entero.
- **La música se genera en código** con un `OfflineAudioContext` (bombo, acordes con
  sierras desafinadas y pasabajos, golpes de ruido filtrado, un riser) y se exporta a
  WAV desde la página. Es determinística (el ruido usa un generador con semilla) y
  está en sincronía con la imagen porque las dos salen del mismo tempo.
- **En el navegador, el reloj del audio manda:** con sonido, el tiempo se lee de
  `AudioContext.currentTime`; sin sonido, de `performance.now()`. Si no, la imagen se
  desfasa de la música.
- **Un reel que hace loop:** el último cuadro tiene que ser igual al primero.
- **Pulso visual:** un `kick(t)` (pico a los 30 ms del golpe y caída exponencial)
  multiplicado sobre una escala hace que las cosas "latan" con el bombo.

## Póster e impresión

- **Diseñar en px CSS del tamaño real a 96 px/in.** Un A1 (594 × 841 mm) son
  2245 × 3179 px. Capturar con `deviceScaleFactor = 300 / 96 = 3,125` da 300 dpi
  (7016 × 9933 px). Toda la serie A tiene la misma proporción: A2, A3 y A4 son el mismo
  diseño a otra escala.
- **Dos salidas:** PNG a 300 dpi (con la densidad en los metadatos, `magick -density`,
  para que la imprenta lo lea en tamaño) y PDF vectorial con `page.pdf()` (texto
  nítido a cualquier escala, liviano). `@page{size:…; margin:0}` y fondo impreso.
- **Chrome headless sin Playwright también sirve** (`--screenshot`,
  `--print-to-pdf`, `--force-device-scale-factor`, `--virtual-time-budget` para que
  terminen de cargar las fuentes), pero no tiene forma de esperar `window.ready`.
- **Chrome bloquea máscaras CSS cargadas desde `file://`:** un logo que se tiñe con
  `mask-image` tiene que ir embebido como data URL.
- **Una variable CSS con `var()` adentro se resuelve donde se declara**, no donde se
  usa. Para que un color siga al tema, poner el color directo al aplicarlo.
- **El QR se dibuja en vector** (`qrcode-generator`, incluido en `nucleo/vendor/` para
  que funcione sin internet), con fondo blanco y margen: sobre fondo oscuro, invertido,
  muchos lectores no lo leen.

## Marca

- **Logo paramétrico en vez de un archivo:** el dibujo sale de una función con un
  esquema de parámetros; el editor, las variantes por tema y los lockups horizontal y
  vertical salen del mismo código. Un mismo `buildSVG()` alimenta la presentación, el
  póster, el reel y la landing.
- **La palabra en curvas** (glifos extraídos de la fuente con fontTools) para que el
  SVG exportado no dependa de la fuente instalada. Sin glifos, `<text>` alcanza en
  pantalla.
- **Medir con `getBBox()`** en un SVG oculto la caja real de las letras, y centrar el
  isotipo con la altura de las mayúsculas (no con la caja, que incluye descendentes).
- **Exportar todas las variantes de una** (horizontal, vertical, isotipo; con y sin
  fondo; SVG y PNG) y versionar los SVG: el que pide "el logo en PNG transparente" lo
  tiene en un clic.

## Estilos

- **Sin estilo por defecto.** Una plantilla con un look armado hace que todo salga
  igual: el agente lo deja y el usuario no sabe que se puede cambiar. Con el neutro
  (correcto pero gris) se nota que falta elegir, y la galería muestra las opciones.
- **El estilo se copia al proyecto** (`proyecto/estilo/`, con sus fuentes): un proyecto
  zipeado o con el motor actualizado se sigue viendo igual aunque la galería cambie.
- **Las perillas son variables CSS con el valor de siempre como respaldo**
  (`var(--radio, 1)`): un estilo viejo, un proyecto sin estilo o un tipo propio que no
  las conoce se ven como antes. Lo que no entra en una perilla va en `css` del estilo.
- **Lo guardado y el estilo:** el contenido editado manda siempre; el look guardado
  (tema, movimiento) solo mientras siga el mismo estilo. Si no, un estilo nuevo no se
  vería en la presentación del usuario hasta que borre su estado.
- **Distinto no es otro color.** Lo que separa un estilo de otro es tipografía (familia,
  peso, caja, interletrado), forma (radios, bordes, sombras), ritmo (curva, duración,
  cuánto viaja la cámara) y textura; la paleta va al final.
- **Fuentes anchas y mono desbordan** lo que se diseñó con una proporcional: tablas,
  bajadas del póster, números de lista. Revisar cada estilo nuevo en todas las piezas y
  compensar en su `css`.
- **Puntuación pegada al acento** (`*palabra*,`): el texto cinético parte en palabras con
  `inline-block` y el navegador puede cortar el renglón entre la palabra y la coma; el
  motor las une en un `.wl` para que la coma no quede sola al principio de una línea.
- **Muestras en iframes, de a dos y perezosas:** la galería carga una escena real por
  estilo solo cuando la tarjeta está a la vista. Con `?ui=0` las muestras no abren
  `EventSource`: cada una ocupa una de las 6 conexiones por servidor del navegador y con
  varias abiertas las demás pedidas (elegir, subir) quedaban esperando.

## Assets

- **Imágenes en WebP a calidad 82** (`magick entrada.png -quality 82 -define
  webp:method=6 salida.webp`): una foto de 1536 × 1024 baja de ~2 MB a ~100 KB sin
  diferencia visible en proyector.
- **Nombres de archivo en minúsculas, con guiones, sin espacios** (los espacios obligan
  a escapar la URL y fallan en algún lado).
- **Retratos o fotos de baja resolución** se ven blandas en proyector: a 1920 px de
  ancho, una foto de 400 px se agranda casi 5 veces.
- **Videos grandes en git:** GitHub avisa desde 50 MB y rechaza desde 100 MB; una vez
  en el historial, borrarlo no alcanza (hay que reescribirlo o usar Git LFS). Decidirlo
  antes de agregarlo.

## Trabajo con un agente

- **Un `CLAUDE.md` en la raíz** con qué hay, dónde vive el estado y cómo se verifica
  permite retomar el trabajo desde cualquier máquina sin volver a explicar.
- **Correcciones con escena, paso y punto** (ver arriba): el asistente sabe exactamente
  qué cuadro mirar (`motion/index.html?escena=N&paso=M`).
- **Capturas antes de responder:** el asistente tiene que mirar el resultado (Chrome
  headless o Playwright) y revisar la consola, no solo leer el código.
- **Las piezas se exportan y se versionan a propósito** cuando son entregables (el MP4
  final, el póster): quien clona el repo tiene todo listo sin correr nada.
