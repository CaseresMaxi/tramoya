// Exporta el póster a PNG (300 dpi) y PDF vectorial.
//   node render/poster.mjs                 → con los valores por defecto (proyecto.js)
//   node render/poster.mjs <cfg>           → <cfg> es lo que copia "Copiar comando de exportación"
//   node render/poster.mjs --formato A3    → otro formato de la serie A (mismo diseño, otra escala)
//   node render/poster.mjs --dpi 150       → PNG más liviano
//   node render/poster.mjs --pagina ruta   → otro diseño de póster (poster/ruta.html: la hoja de ruta)
// Salida: salida/poster-<formato>.png y .pdf (con otro diseño, el nombre que declara: hoja-de-ruta-A1.png)
// Un diseño de dos lados (o más) declara window.POSTER.caras() → ['frente', 'dorso']: sale un PNG por cara
// (hoja-de-ruta-A1-frente.png, …-dorso.png) y un solo PDF con una página por cara, en ese orden. Cada cara es
// un `.poster[data-cara="<id>"]` y, al exportar, quedan una debajo de la otra.
// Si además declara window.POSTER.hojas() → ['frente', 'dorso'] (o ['hoja'] con las dos caras juntas), la unidad
// es la hoja: un `.hoja[data-hoja="<id>"]` por PNG y por página del PDF; horizontal() dice si el papel va girado.
import { execFileSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { basename, join } from 'node:path';
import { RAIZ, abrir, args, informarErrores } from './comun.mjs';

const A = args();
const cfg = A._[0] || '';
// El diseño: poster/index.html, o el que se pida (`ruta` → poster/ruta.html; también una ruta completa)
const PAGINA = !A.pagina || A.pagina === true ? 'poster/index.html' : /[\\/]/.test(A.pagina) ? A.pagina : `poster/${A.pagina.replace(/\.html$/, '')}.html`;
const query = `export&ui=0${A.formato ? `&formato=${A.formato}` : ''}${cfg ? `#cfg=${cfg}` : ''}`;
const OUT = join(RAIZ, 'salida');
mkdirSync(OUT, { recursive: true });

// ui=0: sin el indicador de guardado (abajo a la izquierda), que si no sale en el PNG y en el PDF
// Primero se abre para leer tamaño y formato; después se abre a la escala justa
let { browser, page, errores } = await abrir(PAGINA, { query, ancho: 2245, alto: 3179 });
const info = await page.evaluate(() => ({ ancho: window.POSTER.ancho, alto: window.POSTER.alto, mm: window.POSTER.mm(), formato: window.POSTER.formato(), archivo: window.POSTER.archivo || 'poster', caras: window.POSTER.caras ? window.POSTER.caras() : [],
  hojas: window.POSTER.hojas ? window.POSTER.hojas() : [], horizontal: !!(window.POSTER.horizontal && window.POSTER.horizontal()) }));
await browser.close();
// La unidad de salida: la hoja si el diseño las declara, si no la cara, si no el póster entero
const unidades = info.hojas.length ? info.hojas : info.caras;
const selector = (id) => (info.hojas.length ? `.hoja[data-hoja="${id}"]` : `.poster[data-cara="${id}"]`);
// Con el papel girado (caras lado a lado) la página es el diseño de costado
const [vw, vh] = info.horizontal ? [info.alto, info.ancho] : [info.ancho, info.alto];
const [pw, ph] = info.horizontal ? [info.mm[1], info.mm[0]] : info.mm;

const dpi = +(A.dpi || 300);
// px CSS del diseño → mm del formato → px a la resolución pedida
const pxAncho = Math.round((info.mm[0] / 25.4) * dpi), escala = pxAncho / info.ancho;
({ browser, page, errores } = await abrir(PAGINA, { query, ancho: vw, alto: vh, escala }));
const base = join(OUT, `${info.archivo}-${info.formato}`);
const multi = unidades.length > 1;
const pxSalida = Math.round(pxAncho * (info.horizontal ? info.alto / info.ancho : 1)); // ancho real del PNG (la hoja girada es más ancha)
const pngs = multi ? unidades.map((id) => `${base}-${id}.png`) : [`${base}.png`];
if (unidades.length) for (const [i, id] of unidades.entries()) writeFileSync(pngs[i], await page.locator(selector(id)).screenshot());
else writeFileSync(pngs[0], await page.screenshot({ clip: { x: 0, y: 0, width: info.ancho, height: info.alto } }));
// Densidad en los metadatos, para que una imprenta lo lea en el tamaño correcto
for (const f of pngs) {
  try { execFileSync('magick', [f, '-units', 'PixelsPerInch', '-density', String(dpi), f]); } catch (e) { console.log('(sin ImageMagick: el PNG queda sin la densidad en los metadatos)'); break; }
}
// PDF vectorial: el diseño declara su @page en A1 (594 × 841 mm) y Chrome lo ajusta solo al papel pedido
// (A2, A3…), así que no se escala a mano. Se arma desde una página a escala 1: con la del PNG (que tiene otro
// factor de pixel) el contenido salía de otro tamaño.
await browser.close();
({ browser, page } = await abrir(PAGINA, { query, ancho: vw, alto: vh, escala: 1 }));
await page.emulateMedia({ media: 'print' });
writeFileSync(`${base}.pdf`, await page.pdf({ width: `${pw}mm`, height: `${ph}mm`, printBackground: true, ...(multi ? {} : { pageRanges: '1' }) }));
console.log(multi
  ? `Listo: ${pngs.map((f) => basename(f)).join(', ')} (${pxSalida} px de ancho, ${dpi} dpi) y ${base}.pdf (${unidades.length} páginas, ${info.formato}, ${pw} × ${ph} mm; para imprimir de los dos lados, volteando por el borde ${info.horizontal ? 'corto' : 'largo'}: como la hoja de un libro)`
  : `Listo: ${base}.png (${pxSalida} px de ancho, ${dpi} dpi) y ${base}.pdf (${info.formato}${info.horizontal ? ' apaisado' : ''}, ${pw} × ${ph} mm)`);
informarErrores(errores);
await browser.close();
