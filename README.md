# Tramoya

Una **skill para agentes** (Claude Code, Codex, Cursor, Gemini CLI, OpenCode…) que hace
todas las piezas de un proyecto a partir de los mismos datos:

- una **presentación motion** que se reproduce como un video (puntos clave, cámara,
  morph entre escenas) y se exporta a MP4;
- un **reel** a tempo con música generada en código, exportable a MP4;
- un **póster** A1–A4 a 300 dpi y PDF vectorial;
- una **landing** de una página, que se descarga como un único `.html`;
- la **marca**: logo paramétrico con variantes, en SVG y PNG.

Cada pieza **abre con su editor** en el navegador: la presentación (escenas, textos,
imágenes, estilo, correcciones sobre un punto), el reel (línea de tiempo con partes
arrastrables y un panel), el póster (parámetros y observaciones), la landing (textos en
el lugar y secciones) y la marca (todos los parámetros y variantes con nombre). Lo que
se edita **se guarda en archivos del proyecto** (`proyecto/estado/`), y el agente lo lee
para seguir trabajando. Cada trabajo es **una carpeta autocontenida**: se versiona, se
zipea y se lleva a otra máquina o a otro repo.

Es HTML, CSS y JS estático: se abre con doble clic, sin build. El CLI es Node puro, sin
dependencias; para exportar hace falta además Chrome (y ffmpeg para video).

## Empezar en 3 pasos

Hace falta [Node 18+](https://nodejs.org) (y Chrome para exportar).

1. **Abrí una terminal en la carpeta de tu proyecto** (tu repo, o una carpeta vacía).
2. **Corré** `npx github:CaseresMaxi/tramoya iniciar` — crea `./tramoya/` (motor + un
   ejemplo completo) y abre el **estudio** en el navegador, en el tablero del proyecto.
   Con `--skill-local` además copia la skill al repo (`.claude/skills/tramoya` y
   `.agents/skills/tramoya`), así tu agente la encuentra y el repo la lleva.
3. **Desarrollá**: en el tablero elegís el estilo, abrís cada pieza con su editor, editás
   los datos y el guion en el editor de código (con vista previa), le dejás **pedidos al
   agente** con links y capturas, y exportás a MP4, PNG, PDF o zip. O pedíselo a tu agente
   en palabras: lee los pedidos con `tramoya estado`.

La próxima vez: doble clic en **Abrir estudio** dentro de `tramoya/` (`.command` en macOS,
`.bat` en Windows, `abrir-estudio.sh` en Linux), o `node tramoya/herramientas/tramoya.mjs estudio`.

### El estudio

`tramoya estudio [carpeta]` levanta un servidor local (solo `127.0.0.1`) con:

- **Inicio** (`/`): los proyectos de la carpeta y de sus subcarpetas, con miniatura, estilo,
  fecha y pendientes; crear uno nuevo (nombre y estilo); importar un `.zip` arrastrándolo.
- **Tablero** de cada proyecto (`/p/<carpeta>/`): *Piezas* (miniaturas vivas, abrir y
  editar), *Estilo* (el elegido y la galería), *Pedidos al agente*, *Código* (los archivos
  de `proyecto/` con resaltado, validación de JS/JSON al guardar y vista previa que se
  recarga), *Salidas* (revisar, video, póster, marca y zip con el registro en vivo, y la
  galería de `salida/`) y *Llevar*.

Sin servidor (doble clic en `index.html`) el tablero igual abre las piezas y la galería de
estilos, y donde hace falta el servidor muestra el comando.

## Instalar la skill para tu agente

```bash
npx github:CaseresMaxi/tramoya instalar          # o: npm i -g github:CaseresMaxi/tramoya && tramoya instalar
```

o desde un clon:

```bash
git clone https://github.com/CaseresMaxi/tramoya.git
bash tramoya/instalar.sh
```

o en una línea (cuando el repo está publicado):

```bash
curl -fsSL https://raw.githubusercontent.com/CaseresMaxi/tramoya/main/instalar.sh | bash
```

`instalar` busca los agentes que hay en la máquina (`~/.claude`, `~/.codex`,
`~/.cursor`, `~/.gemini`, `~/.config/opencode`; si no hay ninguno, `~/.agents`) y deja
la skill en `<agente>/skills/tramoya` con un enlace (desde un clon: un `git pull` la
actualiza; desde npx, una copia). También instala `playwright-core` para revisar y
exportar. Opciones: `--agentes claude,codex`, `--copiar`, `--sin-dependencias`. Es una
[Agent Skill](https://agentskills.io) estándar (`SKILL.md` + scripts + referencias): para
otro agente, copiá la carpeta donde ese agente busque sus skills.

`tramoya doctor` revisa Node, Chrome, ffmpeg y playwright-core.

## Usar con el agente

Se le pide en palabras: *«haceme una presentación de 5 minutos sobre este repo»*, *«un
reel de 15 segundos para Instagram»*, *«el póster A1 para la muestra»*, *«exportá la
presentación a video»*. El agente:

1. crea `./tramoya/` en tu repo (motor + datos) o sigue el que ya hay;
2. escribe los datos (`proyecto/proyecto.js`, `proyecto/escenas.js`) con tu contenido;
3. lo revisa en Chrome headless, cuadro por cuadro, hasta que se vea bien;
4. te abre el estudio (`tramoya estudio`): editás en el navegador, marcás correcciones y
   le dejás pedidos;
5. lee lo que cambiaste y pediste (`tramoya estado`), corrige y exporta.

A mano, lo mismo (cada proyecto trae su copia del CLI en `herramientas/tramoya.mjs`):

```bash
tramoya nuevo tramoya --nombre "Mi proyecto"    # o: node <skill>/scripts/tramoya.mjs …
cd tramoya
node herramientas/tramoya.mjs estudio
node herramientas/tramoya.mjs revisar motion
node herramientas/tramoya.mjs video reel
node herramientas/tramoya.mjs empaquetar        # → mi-proyecto.zip, se abre en cualquier lado
```

| Comando | Qué hace |
|---------|----------|
| `iniciar [carpeta] [--nombre] [--estilo] [--skill-local]` | Todo en un paso: el proyecto de acá (o uno nuevo en `./tramoya`) y el estudio abierto |
| `estudio [carpeta] [--puerto] [--sin-navegador]` | Inicio con todos los proyectos de la carpeta y el tablero de cada uno |
| `nuevo <carpeta> [--nombre] [--id] [--estilo]` | Proyecto nuevo (motor + ejemplo) |
| `abrir [pieza]` | Un solo proyecto en el navegador; los editores guardan en `proyecto/estado/` y las páginas se recargan si cambian los archivos |
| `estado [--json]` | Qué se editó, los pedidos al agente y las correcciones pendientes |
| `revisar <pieza>` | Un PNG por punto clave y los errores de consola |
| `video <motion\|reel>` · `poster` · `marca` | MP4 · PNG + PDF · SVG/PNG del logo |
| `estilos` · `estilo <id>` | La galería de estilos · elegir uno |
| `empaquetar [--solo-proyecto]` · `importar <zip>` | Llevar y traer proyectos |
| `actualizar` | Le pone a un proyecto el motor de la versión instalada |
| `regenerar` · `manifiesto` | `proyecto/estado.js` y la lista de assets |
| `instalar` · `doctor` | Instalar la skill · revisar dependencias |

## Qué hay

| Ruta | Qué es |
|------|--------|
| `SKILL.md` | Lo que lee el agente: cuándo usar la skill y el ciclo de trabajo |
| `scripts/tramoya.mjs` | El CLI (entrada de la skill; `bin` del `package.json`) |
| `motor/` | El motor que se copia a cada proyecto: `tablero/` (y `index.html`), `nucleo/`, `motion/`, `reel/`, `poster/`, `landing/`, `marca/`, `render/`, `herramientas/` (CLI, servidor, inicio del estudio), lanzadores |
| `plantilla/proyecto/` | El proyecto de ejemplo (Tramoya contándose a sí misma) |
| `referencias/` | [motion](referencias/motion.md), [otras piezas](referencias/piezas.md), [aprendizajes](referencias/aprendizajes.md) |
| `instalar.sh` | Instalador |

Un proyecto generado tiene esta forma:

```
tramoya/
  index.html (tablero)  tablero/  nucleo/  motion/  reel/  …  herramientas/  Abrir estudio.*   ← motor
  proyecto/                                                                                 ← lo tuyo
    proyecto.js  escenas.js  tipos.js  assets/
    estado/*.json      lo editado en el navegador (manda sobre lo de arriba)
    estado.js  manifiesto.js  glifos.js   (generados)
  salida/              renders (MP4, PNG, PDF)
```

## Ideas centrales

- **Todo es una función del tiempo.** Cada cuadro sale de `seek(t)`: se puede pausar,
  rebobinar, abrir un instante por URL y renderizar a video con el mismo código que se
  ve en el navegador.
- **Los datos van aparte.** El motor no sabe de qué trata el proyecto; lo propio va en
  `proyecto/`.
- **Editar no es un paso final.** Cada pieza tiene su editor, lo editado queda en
  archivos y el agente lo lee: se itera entre las dos manos.
- **Mirar el resultado en un navegador real** antes de dar algo por hecho.

Más en [referencias/aprendizajes.md](referencias/aprendizajes.md).

## Requisitos

- Para ver y editar: un navegador moderno. Para el estudio, `estado`, `empaquetar`: Node 18+.
- Para revisar y exportar: Google Chrome o Chromium (`CHROME=/ruta`), `playwright-core`
  (lo instala `instalar`), ffmpeg para video; ImageMagick opcional.
- Para la palabra de la marca en curvas: Python 3 con `fonttools` y `brotli`
  (`python3 herramientas/generar_glifos.py`).

Tipografías de la galería: SIL OFL 1.1 de sus autores (ver `motor/estilos/*/LICENCIAS.md`). QR: qrcode-generator (MIT).

## Licencia

**Gratis para uso no comercial** (personal, estudiantes y docentes, investigación, ONG y
entes públicos), bajo la [PolyForm Noncommercial 1.0.0](LICENSE.md).

**El uso comercial necesita una licencia comercial**, con precio a acordar. Es uso
comercial usarlo en o para una empresa, en trabajo pago para clientes (freelance o
agencia), o dentro de un producto o servicio. Condiciones en [COMERCIAL.md](COMERCIAL.md);
la licencia se pide escribiendo a [maxycaseres5@gmail.com](mailto:maxycaseres5@gmail.com?subject=Licencia%20comercial%20de%20Tramoya)
o con [este formulario](https://github.com/CaseresMaxi/tramoya/issues/new?template=licencia-comercial.yml).

Lo que hagas con Tramoya (tus textos, imágenes y piezas exportadas) es tuyo. Para
aportar, ver [CONTRIBUTING.md](CONTRIBUTING.md).
