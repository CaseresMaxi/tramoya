# Tramoya · contexto para Claude Code

Plataforma y plantilla para presentaciones motion, reels, pósters, landings y marca en
HTML/CSS/JS estático (se abre con el navegador, sin servidor ni build). Se escribe y se
comenta en castellano rioplatense.

## Regla principal: motor y proyecto separados

- `proyecto/` es lo único específico de un proyecto: `proyecto.js` (nombre, marca,
  temas, fuentes, textos de póster/reel/landing), `escenas.js` (guion), `tipos.js`
  (tipos de escena propios), `assets/`, y los generados `manifiesto.js` y `glifos.js`.
- Todo lo demás es motor y tiene que seguir siendo agnóstico: nada de nombres, colores
  ni textos de un proyecto en `nucleo/`, `motion/`, `reel/reel.js`, `poster/`,
  `render/`. Si un proyecto necesita algo propio, va en `proyecto/` (un tipo en
  `proyecto/tipos.js`, una variante en `marca.variantes`, un reel nuevo en otro .html).
- Orden de carga en las páginas: `nucleo/util.js` → `proyecto/proyecto.js` →
  `nucleo/marca.js` → el resto. Rutas de assets en los datos: relativas a las páginas
  (`../proyecto/assets/…`).

## Dónde está cada cosa

| Ruta | Qué es |
|------|--------|
| `motion/motor.js` | Línea de tiempo, cámara, morph, editor, correcciones, modo render |
| `motion/tipos.js` + `tipos.css` | Tipos de escena del motor |
| `nucleo/util.js` | Curvas, colores, texto (`md`, `lines`, `pairs`), localStorage con prefijo, fuentes y temas |
| `nucleo/marca.js` | Logo paramétrico: `SCHEMA`, `cfgDe(variante, tema)`, `buildSVG`, `isoSVG` |
| `nucleo/panel.js` | Formulario a partir de un esquema (marca y póster) |
| `reel/reel.js` | Armazón de reels y sintetizadores para la banda |
| `poster/poster.js` | Esquema del póster, exportación, observaciones |
| `render/*.mjs` | Revisión, video, póster, marca (Playwright + Chrome headless) |
| `docs/` | `aprendizajes.md` (por qué las cosas son como son), `motion.md` (referencia), `piezas.md` |

## Cómo verificar

Siempre mirar el resultado en un navegador real antes de dar algo por hecho:

- `node render/revisar.mjs motion` → un PNG por punto clave en `salida/revision/` y
  errores de consola (código 1 si hay). También `reel`, `poster --query`, `landing`,
  `marca --query`, o cualquier `.html`.
- Un instante puntual: `motion/index.html?escena=N&paso=M` o `?t=segundos`.
- Necesita `npm install` (playwright-core) y Chrome del sistema. Sin `npm install`,
  se puede apuntar a otro `node_modules` con `PLAYWRIGHT_DIR`.

## Correcciones del usuario

Cuando el usuario pega correcciones de la presentación, cada una trae escena, paso,
elemento, cita del texto y punto (x, y) en píxeles del escenario 1920 × 1080. Abrir
ese cuadro (`?escena=N&paso=M`), mirar el punto, corregir y volver a capturar. Las del
póster traen la parte y la posición en % del ancho y el alto.

## Estado del navegador

Lo editado vive en `localStorage` con el prefijo `PROYECTO.id`: `<id>-motion`,
`<id>-marca-editor`, `<id>-poster-cfg`, `<id>-poster-obs`. No está en los archivos:
si el usuario dice que "cambió algo", puede estar solo en su navegador (pedir el
.json exportado o "Copiar como escenas.js").
