// Exporta el póster a PNG (300 dpi) y PDF vectorial.
//   node render/poster.mjs                 → con los valores por defecto (proyecto.js)
//   node render/poster.mjs <cfg>           → <cfg> es lo que copia "Copiar comando de exportación"
//   node render/poster.mjs --formato A3    → otro formato de la serie A (mismo diseño, otra escala)
//   node render/poster.mjs --dpi 150       → PNG más liviano
// Salida: salida/poster-<formato>.png y .pdf
import { execFileSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { RAIZ, abrir, args, informarErrores } from './comun.mjs';

const A = args();
const cfg = A._[0] || '';
const query = `export${A.formato ? `&formato=${A.formato}` : ''}${cfg ? `#cfg=${cfg}` : ''}`;
const OUT = join(RAIZ, 'salida');
mkdirSync(OUT, { recursive: true });

// Primero se abre para leer tamaño y formato; después se abre a la escala justa
let { browser, page, errores } = await abrir('poster/index.html', { query, ancho: 2245, alto: 3179 });
const info = await page.evaluate(() => ({ ancho: window.POSTER.ancho, alto: window.POSTER.alto, mm: window.POSTER.mm(), formato: window.POSTER.formato() }));
await browser.close();

const dpi = +(A.dpi || 300);
// px CSS del diseño → mm del formato → px a la resolución pedida
const pxAncho = Math.round((info.mm[0] / 25.4) * dpi), escala = pxAncho / info.ancho;
({ browser, page, errores } = await abrir('poster/index.html', { query, ancho: info.ancho, alto: info.alto, escala }));
const base = join(OUT, `poster-${info.formato}`);
writeFileSync(`${base}.png`, await page.screenshot({ clip: { x: 0, y: 0, width: info.ancho, height: info.alto } }));
// Densidad en los metadatos, para que una imprenta lo lea en el tamaño correcto
try { execFileSync('magick', [`${base}.png`, '-units', 'PixelsPerInch', '-density', String(dpi), `${base}.png`]); } catch (e) { console.log('(sin ImageMagick: el PNG queda sin la densidad en los metadatos)'); }
// PDF vectorial: el diseño mide un A1 a 96 px/in; para otro formato se escala
await page.emulateMedia({ media: 'print' });
const k = info.mm[0] / ((info.ancho * 25.4) / 96);
writeFileSync(`${base}.pdf`, await page.pdf({ width: `${info.mm[0]}mm`, height: `${info.mm[1]}mm`, printBackground: true, scale: Math.min(2, Math.max(0.1, k)), pageRanges: '1' }));
console.log(`Listo: ${base}.png (${pxAncho} px de ancho, ${dpi} dpi) y ${base}.pdf (${info.formato}, ${info.mm.join(' × ')} mm)`);
informarErrores(errores);
await browser.close();
