---
name: tramoya
description: Genera presentaciones motion (se reproducen como un video), reels con música exportables a MP4, pósters A1–A4 a 300 dpi + PDF, landings y logos paramétricos, todo en HTML/CSS/JS estático a partir de un mismo proyecto, y cada pieza abre con su editor visual que guarda en archivos. Usala cuando pidan una presentación, deck, slides, charla o pitch; un video, reel, motion graphics o animación; un póster, flyer, cartel o imagen para imprimir o redes; una landing o página de un proyecto; un logo, marca o identidad; o editar, corregir, exportar o llevar a otro lado piezas de Tramoya (carpetas con proyecto/proyecto.js). Also for presentations, slide decks, pitch videos, reels, posters, landing pages and logos.
license: PolyForm Noncommercial 1.0.0 — gratis para uso no comercial; uso comercial con licencia del autor (COMERCIAL.md)
---

# Tramoya

Tramoya hace todas las piezas de comunicación de un proyecto desde los mismos datos:
**presentación motion**, **reel**, **póster**, **landing** y **marca**. Son páginas HTML
que se abren con doble clic. Cada una tiene su **editor** en el navegador, y lo que el
usuario edita vuelve a archivos que vos podés leer. Las salidas (MP4, PNG, PDF, SVG) se
renderizan con Chrome headless, con el mismo código que se ve en pantalla.

Cada trabajo es **una carpeta autocontenida** (motor + `proyecto/`) que se versiona,
se zipea y se lleva a otra máquina o a otro repo.

## Cómo se llama

`SKILL_DIR` es la carpeta de este archivo. Todo pasa por un comando sin dependencias:

```bash
node "$SKILL_DIR/scripts/tramoya.mjs" <comando>      # desde la skill
node herramientas/tramoya.mjs <comando>              # desde adentro de un proyecto (misma herramienta)
```

| Comando | Para qué |
|---------|----------|
| `iniciar [carpeta] [--nombre "X"] [--estilo id]` | **Todo en un paso**: usa el proyecto de acá o crea `./tramoya`, y levanta el estudio. Dejalo corriendo en segundo plano y pasale al usuario la URL del tablero que imprime |
| `estudio [carpeta]` | El estudio en el navegador: inicio con los proyectos de la carpeta (y sus subcarpetas) y el **tablero** de cada uno en `/p/<carpeta>/`. Lo editado se guarda en `proyecto/estado/`. `--puerto`, `--sin-navegador` |
| `nuevo <carpeta> --nombre "X"` | Crea el proyecto (motor + ejemplo para reemplazar) |
| `abrir [pieza]` | Un solo proyecto en `/` (mismo servidor que el estudio) |
| `estado` (`--json`) | Qué editó el usuario, sus **pedidos** desde el tablero y las **correcciones** pendientes |
| `revisar <pieza>` | Un PNG por punto clave en `salida/revision/<pieza>/` + errores de consola (código 1 si hay) |
| `video <motion\|reel>` · `poster` · `marca` | MP4 · PNG 300 dpi + PDF · SVG/PNG del logo, en `salida/` (marca: `proyecto/assets/logo/`) |
| `historial [pieza] [--guardar]` · `restaurar <pieza> [n]` | Versiones anteriores de lo editado (`proyecto/estado/.historial/`) · volver a una (la actual queda guardada) |
| `empaquetar` · `importar <zip>` · `actualizar` | Llevar el trabajo (zip) · traerlo · ponerle el motor nuevo |
| `doctor` | Revisa Node, Chrome, ffmpeg y playwright-core |

Todos aceptan `--en <carpeta>`; si no, buscan el proyecto desde el directorio actual
o en `./tramoya`.

## El ciclo de trabajo

1. **Buscar o crear el proyecto.** `tramoya estado`: si ya hay uno, se sigue ese. Si no,
   `tramoya nuevo tramoya --nombre "Nombre"` en la raíz del repo del usuario (u otra
   carpeta si la pide), o directamente `tramoya iniciar --nombre "Nombre"` (crea y abre
   el estudio; `--skill-local` además copia la skill al repo para que viaje con él). Trae un ejemplo completo (Tramoya contándose a sí misma) que
   sirve de referencia de cada campo: **reemplazalo entero** por el contenido real.
2. **Juntar el contenido.** Del pedido, del repo del usuario (README, docs, código) y
   de sus imágenes. Si falta algo esencial (de qué trata, para quién, cuánto dura),
   preguntá una vez. Las imágenes van a `proyecto/assets/img/` (en WebP, ver
   `referencias/aprendizajes.md` § Assets) y después `tramoya manifiesto`.
3. **Partitura antes que escenas: la forma sale del contenido.** Antes de elegir tipos,
   escribí (para vos, o en `notas`) una línea por momento: *qué tiene que entender quien
   mira* y *qué movimiento lo explica*. Un proceso se recorre (flujo, `focos`, `seguir`);
   un antes/después se tacha y se reemplaza (`tachar`, `columnas`); una cifra se ve llegar
   (`count`, `crecer`); una afirmación fuerte cae (`impacto`); algo íntimo se enfoca
   (`editorial`); un cambio de capítulo es un `corte` o un `fundido`; lo que no importa
   queda `quieto`. Recién después elegí la forma de cada escena, en este orden:
   un tipo del motor **si el contenido ya tiene esa forma**; si no, una escena `libre`
   (el HTML a medida, con los mismos `data-m`), o un tipo propio en `proyecto/tipos.js`
   si la forma se repite. **No fuerces contenido en un tipo** ni repitas un tipo porque
   está a mano: doce capturas no son doce escenas `captura` iguales. Si falta un
   movimiento, crealo (`MOTION.registrarMovimiento` en `proyecto/tipos.js`). Todo en
   `referencias/movimiento.md`.
4. **Escribir los datos**, nunca el motor:
   - `proyecto/proyecto.js`: `id`, nombre, la palabra de la marca (`marca.base.palabra`)
     y los textos de `poster`, `reel` y `landing`. Solo contenido: el look (tipografía,
     temas, forma de la marca, ritmo, banda) lo pone el **estilo** (ver «Estilos»).
   - `proyecto/escenas.js`: el guion de la presentación (tipos y campos en
     `referencias/motion.md`), con el movimiento que decidiste en la partitura:
     `coreografia`, `mov`, `transicion`, `focos` por escena. Una idea por escena, cifras
     y frases cortas, `notas` con lo que dice el presentador.
   - `proyecto/tipos.js`: tipos de escena (`TIPOS_PROYECTO`), de parte de reel
     (`TIPOS_REEL`) y movimientos propios, cuando el contenido los pide.
   - Reel: cada parte con la `entrada` que pida su frase; `ilustracion` para un dibujo
     a medida. Landing: secciones `libre` cuando ninguna de las tres sirve.
5. **Mirar el resultado, siempre.** `tramoya revisar motion` (y `reel`, `poster`,
   `landing`, `marca`). Abrí los PNG y miralos de verdad: textos que desbordan,
   solapados, contraste, jerarquía, cortes feos. Leé también la **partitura**
   (`salida/revision/<pieza>/partitura.md`): qué se mueve en cada escena y avisos de
   repetición (escenas seguidas que se mueven igual, un rol que siempre entra igual, un
   tipo tres veces seguidas). Cada aviso es una pregunta: ¿lo pide el contenido? Si no,
   cambiá la forma. Para ver una entrada a mitad de camino: `revisar motion --cada 0.3`. Arreglá y volvé a revisar hasta que
   no haya errores de consola ni problemas visibles. Un instante puntual:
   `revisar motion --query 'escena=4&paso=2&ui=0'`.
6. **Abrir el estudio para el usuario.** `tramoya estudio` (o `iniciar`) en segundo plano
   (no termina) y pasale la URL del tablero (`http://127.0.0.1:4321/p/<carpeta>/`). Ahí
   tiene sus piezas con miniatura, el estilo, **Pedidos al agente** (texto, links y
   capturas), un editor de los archivos de `proyecto/` con vista previa, las salidas
   (revisar, video, póster, marca, zip) y cómo llevarlo. En cada pieza: **E** abre su
   editor (en la presentación, un clic en un elemento deja elegir su movimiento), **C**
   (presentación) u **O** (póster) marcan correcciones sobre un punto, y todo se guarda
   solo en `proyecto/estado/`.
7. **Leer lo que hizo el usuario.** `tramoya estado` lista las piezas editadas, los
   **pedidos** del tablero (`estado/pedidos.json`: tipo, texto, links e imágenes en
   `proyecto/assets/referencias/`; miralas) y las correcciones con escena, paso, elemento, cita y punto (x, y) en el escenario de
   1920 × 1080 (póster: parte y % del ancho y del alto). Por cada una: abrí ese cuadro
   (`revisar motion --query 'escena=N&paso=M&ui=0'`), mirá el punto, corregí, volvé a
   capturar y marcala `"hecho": true` en el `.json` (los pedidos también, en `estado/pedidos.json`).
8. **Exportar, recién cuando el usuario lo aprobó en los editores.** Nunca lances un
   render final (video, póster, marca) sin haberle abierto antes el estudio (paso 6) y
   esperado su OK: un render tarda minutos y se tira si después hay correcciones. Las
   capturas de `revisar` sí son baratas y van antes. Después:
   `tramoya video motion --pausaMax 3`, `tramoya video reel`, `tramoya poster [--formato A3]`,
   `tramoya marca --png` (o desde Salidas en el tablero). Decile dónde quedó cada archivo.

## Estilos

**No hay estilo por defecto y nunca asumas uno.** Un proyecto sin estilo usa el neutro
(fuentes del sistema, grises), que se ve correcto pero sin carácter. Antes de mostrar
piezas terminadas: si el usuario no nombró un look, mostrale la galería
(`estilos/index.html`, también desde el tablero) o preguntale cuál quiere entre los de
`tramoya estilos`; si describe uno o trae referencias (un prompt de otro motion graphic,
links, capturas), **creá un estilo propio** a partir de eso.

- `tramoya estilos` lista la galería (10: noche-dorada, suizo, brutalista, editorial,
  terminal, neon, corporativo, pastel, cine, minimal) y los propios del proyecto.
- Probar sin elegir: cualquier pieza con `?estilo=<id>`, p. ej.
  `tramoya revisar motion --query 'render&estilo=suizo'`.
- Elegir: `tramoya estilo <id>` (o `proyecto:<id>`), o el botón de la galería con el
  servidor abierto. Se copia a `proyecto/estilo/`.
- Pedidos de estilo: la galería los guarda en `estado/pedidos.json` con `tipo: 'estilo'`.
  El procedimiento para traducir referencias a un estilo (paleta con contraste AA, par
  tipográfico, ritmo, banda), dónde escribirlo (`proyecto/estilos/<id>/estilo.js`),
  cómo revisarlo y cerrarlo está en `referencias/estilos.md`.

## La regla del estado (importante)

Lo editado en el navegador vive en `proyecto/estado/<pieza>.json` (`motion`, `reel`,
`landing`, `poster-cfg`, `poster-obs`, `marca-editor`, `marca-variantes`) con la forma
`{ "rev": …, "v": … }`, y **manda sobre los datos de `proyecto/*.js`**.

- Si existe `estado/motion.json`, cambiar `escenas.js` **no se ve**. Editá
  `estado/motion.json` (`v.escenas`, `v.estilo`), que es lo que el usuario ve y lo que
  sale en el render. Para devolverle el mando a `escenas.js`, pasá ahí lo editado y
  borrá el `.json`. Lo mismo para cada pieza.
- Después de editar un `.json` a mano: `tramoya regenerar`. Los comandos de render lo
  hacen solos, y con `estudio` (o `abrir`) corriendo las páginas abiertas se recargan.
- No borres estado del usuario sin preguntar: es su trabajo. Antes de editar a mano un
  `estado/*.json`, `tramoya historial --guardar`: así el cambio se puede deshacer
  (`tramoya restaurar <pieza>`). El servidor ya guarda versiones solo cada vez que el
  usuario edita, y en el navegador Ctrl+Z / Ctrl+Shift+Z deshacen y rehacen en cada pieza.
- Si el usuario dice que "cambió algo" y no aparece en `estado`, lo abrió con doble clic
  y quedó en su navegador: pedile «Exportar lo editado» desde el tablero (`index.html`,
  sección Llevar) o que lo abra con `tramoya estudio`.

## Reglas del motor

- **Motor y proyecto separados.** En un proyecto, todo lo que no es `proyecto/` es motor:
  `actualizar` lo pisa. Lo propio va en `proyecto/` (un tipo en `proyecto/tipos.js`, una
  variante en `marca.variantes`, un reel distinto en otro `.html` que use `reel/reel.js`).
- **Todo es función del tiempo**: nada de animaciones CSS ni timers en escenas y reels;
  cada cuadro sale de `seek(t)`. Así se pausa, se rebobina y se renderiza igual.
- Rutas de assets en los datos: relativas a las páginas (`../proyecto/assets/img/x.webp`).
- Texto: `*palabra*` va en color de acento. El escenario mide 1920 × 1080; el póster, un
  A1 en px CSS (2245 × 3179).
- Si mejorás el motor mismo (no un proyecto), hacelo en `$SKILL_DIR/motor/` y llevalo a
  los proyectos con `actualizar`.

## Llevar el trabajo

- `tramoya empaquetar` → `<id>.zip` con todo (se abre con doble clic en cualquier
  máquina, sin la skill). `--solo-proyecto` → solo `proyecto/` (liviano; se abre con
  `tramoya importar`, que le pone el motor).
- `tramoya importar <zip|carpeta> [destino]` trae un proyecto a este repo.
- En el tablero, sección Llevar: «Descargar .zip» (con servidor) y «Exportar / Importar lo
  editado» (sin servidor). En el inicio del estudio se importa un .zip arrastrándolo.
- Cada proyecto trae lanzadores de doble clic (`Abrir estudio.command` macOS,
  `Abrir estudio.bat` Windows, `abrir-estudio.sh` Linux) para el usuario sin terminal.

## Referencias (leelas cuando las necesites)

- `referencias/movimiento.md`: **cómo decidir el movimiento según el contenido**: la partitura, el repertorio (entradas, acentos, bucles, coreografías, transiciones), cuándo usar cada uno, cómo crear uno nuevo y qué evitar.
- `referencias/motion.md`: presentación: atajos, URL, campos de escena, tipos (y `libre`), atributos de animación, contrato de render.
- `referencias/piezas.md`: reel (partes, tipos, banda), póster, landing, marca y los comandos de render.
- `referencias/estilos.md`: estilos: formato, cada perilla, la galería y cómo crear uno a partir de referencias.
- `referencias/aprendizajes.md`: por qué las cosas son como son (cámara, morph, video, impresión, assets). Leelo antes de tocar el motor.

## Requisitos

Para editar y presentar: un navegador. Para `estudio`, `abrir`, `estado`, `empaquetar`: Node 18+.
Para revisar y exportar: `npm install` en `$SKILL_DIR/motor` (playwright-core; lo hace
`instalar`), Google Chrome o Chromium (`CHROME=/ruta` si no lo encuentra) y ffmpeg para
video. Si falta algo, `tramoya doctor` dice qué y cómo instalarlo.
