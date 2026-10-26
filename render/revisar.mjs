// Revisión rápida de una pieza: errores de consola y un cuadro por instante clave.
//   node render/revisar.mjs motion                → un PNG por punto clave (window.CLAVES)
//   node render/revisar.mjs reel                  → un PNG por instante de window.CLAVES
//   node render/revisar.mjs motion --cada 0.5     → un PNG cada medio segundo
//   node render/revisar.mjs motion --t 3.2,7,12   → esos instantes
//   node render/revisar.mjs landing               → captura de página completa (sin seek)
//   node render/revisar.mjs ruta/a/pagina.html    → cualquier página del repo
// Salida en salida/revision/<pieza>/. Termina con código 1 si hubo errores de consola.
import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { RAIZ, abrir, args, informarErrores } from './comun.mjs';

const A = args();
const pieza = A._[0] || 'motion';
const ruta = pieza.endsWith('.html') ? pieza : `${pieza}/index.html`;
const nombre = pieza.replace(/\/index\.html$|\.html$/, '').replace(/[/\\]/g, '-');
const OUT = join(RAIZ, 'salida', 'revision', nombre);
rmSync(OUT, { recursive: true, force: true });
mkdirSync(OUT, { recursive: true });

const { browser, page, errores } = await abrir(ruta, { query: A.query === true ? '' : A.query ?? 'render', ancho: +(A.ancho || 1920), alto: +(A.alto || 1080) });
const info = await page.evaluate(() => ({ seek: typeof window.seek === 'function', dur: window.DURACION || 0, claves: window.CLAVES || null }));

if (!info.seek) {
  writeFileSync(join(OUT, 'pagina.png'), await page.screenshot({ fullPage: !!A.completa || true }));
  console.log('Captura en', OUT);
} else {
  let tiempos;
  if (A.t) tiempos = String(A.t).split(',').map((x) => ({ v: +x }));
  else if (A.cada) tiempos = Array.from({ length: Math.floor(info.dur / +A.cada) + 1 }, (_, i) => ({ v: +(i * +A.cada).toFixed(3) }));
  else tiempos = info.claves || Array.from({ length: Math.floor(info.dur) + 1 }, (_, i) => ({ v: i }));
  for (const [i, c] of tiempos.entries()) {
    await page.evaluate((v) => window.seek(v), c.v);
    const etiqueta = Object.entries(c).filter(([k]) => k !== 'v').map(([k, v]) => `${k}${v}`).join('_');
    writeFileSync(join(OUT, `${String(i).padStart(2, '0')}_${c.v.toFixed(2)}s${etiqueta ? '_' + etiqueta : ''}.png`), await page.screenshot());
  }
  console.log(`${tiempos.length} cuadros en ${OUT} (duración total ${info.dur.toFixed(2)} s)`);
}
informarErrores(errores);
await browser.close();
