# Tramoya

Plataforma y plantilla para contar un proyecto en movimiento: una **presentación** que
se reproduce como un video, un **reel** con música exportable a MP4, un **póster** a
300 dpi, una **landing** y la **marca**, todo desde los mismos datos.

Es HTML, CSS y JS estático: se abre con doble clic, sin servidor ni build. Las
herramientas de exportación (Node + Chrome + ffmpeg) son aparte y opcionales.

## Empezar

```bash
# Un proyecto nuevo, en su propia carpeta y con su propio git
bash herramientas/nuevo-proyecto.sh ../mi-proyecto
cd ../mi-proyecto
```

1. Editá `proyecto/proyecto.js`: nombre, marca, temas, fuentes y los textos del
   póster, el reel y la landing.
2. Editá `proyecto/escenas.js`: el guion de la presentación. (O abrí la presentación,
   tecla `E`, editá ahí y después "Copiar como escenas.js".)
3. Poné las imágenes en `proyecto/assets/img/` y corré
   `python3 herramientas/generar_manifiesto.py` para que aparezcan en los selectores.
4. Abrí `index.html` en el navegador.

Para exportar video, póster o marca: `npm install` una vez y ver
[docs/piezas.md](docs/piezas.md#render-y-revisión-render).

## Qué hay

| Ruta | Qué es |
|------|--------|
| `index.html` | Portada con links a todas las piezas |
| `motion/` | Presentación motion: una línea de tiempo con puntos clave, cámara, morph entre escenas, editor sobre el escenario y correcciones. [Referencia](docs/motion.md) |
| `reel/` | Armazón de reels (`reel.js`) y un reel de ejemplo |
| `poster/` | Póster serie A con panel de parámetros y observaciones |
| `landing/` | Landing de una página |
| `marca/` | Editor del logo paramétrico |
| `nucleo/` | Lo compartido: curvas, colores, estado (`util.js`), marca (`marca.js`), panel de parámetros (`panel.js`) |
| `render/` | Revisión, video, póster y marca con Playwright + Chrome headless |
| `herramientas/` | Manifiesto de assets, glifos de la marca, proyecto nuevo |
| `proyecto/` | **Lo único que cambia entre proyectos**: datos, escenas, tipos propios, assets |
| `docs/` | [Aprendizajes](docs/aprendizajes.md), [motion](docs/motion.md), [otras piezas](docs/piezas.md) |

El proyecto de ejemplo es Tramoya contándose a sí misma: la presentación explica cómo
funciona el motor.

## Ideas centrales

- **Todo es una función del tiempo.** Cada cuadro sale de `render(T)`: se puede
  pausar, rebobinar en medio de una transición, abrir un instante por URL y renderizar
  a video con el mismo código que se ve en el navegador.
- **Puntos clave en vez de diapositivas.** → reproduce hasta la próxima parada, ←
  rebobina. En vivo o como video, es la misma línea de tiempo.
- **Los datos van aparte.** El motor no sabe de qué trata el proyecto.
- **Mirar el resultado en un navegador real.** `node render/revisar.mjs motion` saca un
  cuadro por punto clave y revisa la consola.

Más en [docs/aprendizajes.md](docs/aprendizajes.md).

## Estado del navegador

Lo que se edita en las páginas vive en `localStorage` con el prefijo `id` de
`proyecto.js`: `<id>-motion`, `<id>-marca-editor`, `<id>-poster-cfg`,
`<id>-poster-obs`, `<id>-landing-tema`. Para moverlo de máquina: "Exportar .json" /
"Importar .json" en la presentación, "Copiar ajustes" en la marca y el comando de
exportación en el póster. Para dejarlo en el repo: pasarlo a `proyecto/`.

## Traer mejoras del motor a un proyecto

`nuevo-proyecto.sh` anota en `.tramoya-version` de qué commit salió. Todo lo que no es
`proyecto/` es motor: para actualizar un proyecto, copiá encima `nucleo/`, `motion/`,
`reel/reel.js`, `poster/poster.js`, `render/` y `herramientas/` de una versión nueva de
Tramoya (ojo si tocaste alguno a mano).

## Requisitos

- Para presentar: un navegador moderno (Chrome, Edge, Firefox, Safari recientes).
- Para exportar: Node 18+, `npm install`, Google Chrome o Chromium, ffmpeg; ImageMagick
  opcional.
- Para los glifos de la marca: Python 3 con `fonttools` y `brotli`.

Fuentes incluidas: Playfair Display e Inter (SIL OFL 1.1). QR: qrcode-generator
(MIT), en `nucleo/vendor/`.
