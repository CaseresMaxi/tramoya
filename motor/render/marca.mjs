// Escribe los archivos de la marca en proyecto/assets/logo/ (SVG de cada variante y favicon),
// con el mismo código que el editor. Sin internet y sin abrir el navegador a mano.
//   node render/marca.mjs          → solo SVG (lo que conviene versionar)
//   node render/marca.mjs --png    → también PNG de 2048 px
// "actual" es el diseño base de proyecto.js (el editor del navegador no se lee desde acá:
// para llevar un diseño del editor al repo, "Copiar ajustes" y pegarlo en marca.base).
import { mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { RAIZ, abrir, args, informarErrores } from './comun.mjs';

const A = args();
const OUT = join(RAIZ, 'proyecto', 'assets', 'logo');
const { browser, page, errores } = await abrir('marca/index.html');
const files = await page.evaluate(async (png) => {
  const f = await window.archivos({ png });
  const out = {};
  for (const [n, c] of Object.entries(f)) {
    if (typeof c === 'string') out[n] = { texto: c };
    else { const b = new Uint8Array(await c.arrayBuffer()); let s = ''; for (let i = 0; i < b.length; i += 0x8000) s += String.fromCharCode.apply(null, b.subarray(i, i + 0x8000)); out[n] = { b64: btoa(s) }; }
  }
  return out;
}, !!A.png);
rmSync(OUT, { recursive: true, force: true });
for (const [n, c] of Object.entries(files)) {
  const p = join(OUT, n);
  mkdirSync(dirname(p), { recursive: true });
  writeFileSync(p, c.texto ?? Buffer.from(c.b64, 'base64'));
}
console.log(`${Object.keys(files).length} archivos en ${OUT}`);
// favicon.svg recién escrito: el error de carga anterior no cuenta
informarErrores(errores.filter((e) => !/favicon|ERR_FILE_NOT_FOUND/.test(e)));
await browser.close();
