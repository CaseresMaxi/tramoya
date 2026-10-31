# Tramoya · contexto para Claude Code

Este repo **es la skill** Tramoya: presentaciones motion, reels, pósters, landings y marca
en HTML/CSS/JS estático, cada pieza con su editor que guarda en archivos. Se escribe y se
comenta en castellano rioplatense. `SKILL.md` es lo que lee un agente que la usa;
este archivo es para trabajar *en* la skill.

## Estructura

| Ruta | Qué es |
|------|--------|
| `SKILL.md` | Instrucciones para el agente que usa la skill (frontmatter `name`/`description`) |
| `scripts/tramoya.mjs` | Entrada del CLI (y `bin` de `package.json`, para `npx github:…`); resuelve la ruta real e importa `motor/herramientas/tramoya.mjs` |
| `motor/` | Lo que se copia a cada proyecto (`nuevo`, `actualizar`). Tiene que seguir siendo agnóstico |
| `motor/herramientas/tramoya.mjs` | CLI + servidor local. Sin dependencias. `proyectoHTTP(P)` sirve un proyecto y su API en `<raíz>/__tramoya/*` (estado, subir, archivo, salidas, tarea, doctor, pendientes…); `abrir` lo monta en `/` y `estudio` monta N en `/p/<carpeta>/` con el inicio (`herramientas/estudio.html`) y `/__estudio/*` |
| `motor/index.html` + `motor/tablero/` | Tablero del proyecto: piezas, estilo, pedidos al agente, editor de código (`codigo.js`, hecho a mano), salidas y llevar. Degrada sin servidor |
| `motor/nucleo/util.js` | Curvas, colores, texto, **estado** (`leer`/`guardar`/`borrar`: `proyecto/estado.js` + localStorage + servidor), fuentes y temas |
| `motor/motion/` · `reel/` · `poster/` · `landing/` · `marca/` | Cada pieza con su editor |
| `motor/motion/movimientos.js` | Repertorio abierto de movimientos (entradas, acentos, bucles) y coreografías por rol; `motor.js` los resuelve por escena (`mov`, `coreografia`, `transicion`) y publica `window.PARTITURA`, que `revisar` vuelve `partitura.md` con avisos de repetición |
| `motor/render/*.mjs` | Revisión, video, póster, marca (Playwright + Chrome headless) |
| `motor/estilos/` | Galería: `<id>/estilo.js` + `fuentes/` (OFL) y `index.html`. Ningún estilo por defecto: sin elegir, el neutro de `util.js`. Formato y perillas en `referencias/estilos.md` |
| `plantilla/proyecto/` | Proyecto de ejemplo que copia `nuevo` (solo contenido; el look sale del estilo) |
| `referencias/` | Docs que el agente lee bajo demanda: `movimiento.md`, `motion.md`, `piezas.md`, `estilos.md`, `aprendizajes.md` |

## Reglas

- **Motor y proyecto separados**: nada de nombres, colores ni textos de un proyecto en
  `motor/`. Lo propio de un proyecto va en su `proyecto/`.
- **Orden de carga en las páginas**: `nucleo/util.js` → `proyecto/proyecto.js` →
  `proyecto/estilo/estilo.js` → `proyecto/estado.js` → `nucleo/marca.js` → el resto (en
  la presentación, `motion/movimientos.js` antes de `tipos.js` y de `proyecto/tipos.js`). `util.js` lee `window.ESTADO`
  en cada acceso porque `estado.js` carga después.
- **Toda pieza editable guarda con `TRAMOYA.guardar(sub, v)`** y lee con
  `TRAMOYA.leer(sub, def)`: así queda en `proyecto/estado/<sub>.json` con el servidor y
  en localStorage sin él, y el render (`?render`) usa solo lo de archivos.
- **La API cuelga de la raíz del proyecto** (`TRAMOYA.BASE` + `__tramoya`), nunca de `/`:
  en el estudio cada proyecto vive en `/p/<carpeta>/`.
- **Servidor**: solo `127.0.0.1`, rechaza otro `Host` y escrituras con otro `Origin`;
  rutas siempre contra `P + sep`; el editor de código solo toca texto dentro de `proyecto/`.
- **La forma se adapta al contenido, no al revés**: nada en el motor debería obligar a
  meter contenido en una forma. Un movimiento nuevo va al registro (`registrarMovimiento`),
  no a un `switch`; los tipos marcan roles y campos, y la escena decide cómo se mueven. Si
  algo solo se puede hacer con un tipo, falta una puerta (`libre`, `mov`, un campo).
- **Contrato de render** (`window.ready`, `seek`, `DURACION`, `CLAVES`, `renderAudio`):
  ver `motor/render/comun.mjs`.

## Cómo probar

No hay proyecto en la raíz: se prueba sobre uno generado.

```bash
node scripts/tramoya.mjs nuevo /tmp/t --nombre Prueba     # copia motor/ + plantilla/
node scripts/tramoya.mjs revisar motion --en /tmp/t       # PNG por punto clave + consola (código 1 si hay errores)
node scripts/tramoya.mjs estudio /tmp --sin-navegador     # inicio en /, tablero en /p/t/ (o `abrir --en /tmp/t`: uno solo en /)
node scripts/tramoya.mjs actualizar --en /tmp/t           # después de tocar motor/
```

Para iterar sobre el motor sin copiar a cada rato: un proyecto con enlaces simbólicos a
`motor/*` y a `plantilla/proyecto`, pero con `render/` **copiado** (Node resuelve el
enlace y `RAIZ` quedaría en `motor/`). Siempre mirar los PNG antes de dar algo por
hecho. `npm install` en `motor/` instala playwright-core (o `PLAYWRIGHT_DIR`).

## Correcciones del usuario

Cada corrección de la presentación trae escena, paso, elemento, cita y punto (x, y) en
px del escenario 1920 × 1080; las del póster, parte y % del ancho y del alto. En un
proyecto, `tramoya estado` las lista.
