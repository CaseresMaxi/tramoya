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
const info = await page.evaluate(() => ({ seek: typeof window.seek === 'function', dur: window.DURACION || 0, claves: window.CLAVES || null, partitura: window.PARTITURA || null }));

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
if (info.partitura) partitura(info.partitura);
informarErrores(errores);
await browser.close();

// Partitura: qué se mueve en cada escena y avisos de repetición (no cortan: son para mirar)
function partitura(P) {
  const filas = P.map((p) => `| ${p.escena} | ${p.tipo} | ${p.coreografia} | ${p.transicion ? p.transicion + (p.camara ? ' → ' + p.camara : '') : '—'} | ${p.pasos} | ${p.firma || '—'} |`);
  const avisos = [];
  P.forEach((p) => p.avisos.forEach((a) => avisos.push(`Escena ${p.escena}: ${a}`)));
  for (let i = 1; i < P.length; i++) {
    if (P[i].firma && P[i].firma === P[i - 1].firma) avisos.push(`Escenas ${i} y ${i + 1} se mueven igual (${P[i].firma}). ¿Pide lo mismo el contenido?`);
  }
  for (let i = 0, j; i < P.length; i = j) {
    for (j = i + 1; j < P.length && P[j].tipo === P[i].tipo; j++);
    if (j - i >= 3 && P[i].tipo !== 'libre') avisos.push(`Escenas ${i + 1} a ${j}: ${j - i} seguidas del tipo «${P[i].tipo}». Si el contenido es distinto, que la forma también lo sea (otro tipo, una escena libre o un tipo propio).`);
  }
  const tot = {}; let n = 0;
  P.forEach((p) => Object.entries(p.cuenta || {}).forEach(([k, v]) => { if (k === 'quieto' || k === 'viaja') return; tot[k] = (tot[k] || 0) + v; n += v; }));
  Object.entries(tot).forEach(([k, v]) => { if (n > 20 && v / n > 0.35) avisos.push(`«${k}» es el ${Math.round((v / n) * 100)} % de todas las entradas: el movimiento deja de decir algo.`); });
  // Un rol que entra igual en casi todas las escenas (el título siempre por palabras, el antetítulo siempre barrido…)
  const porRol = {};
  // (el antetítulo y el número de escena son firma de la presentación: que se repitan está bien)
  P.forEach((p) => Object.entries(p.roles || {}).forEach(([r, v]) => { if (['otro', 'kicker', 'numeral'].includes(r)) return; const k = v.join('/'); if (k.startsWith('viaja')) return; (porRol[r] ??= {})[k] = (porRol[r][k] || 0) + 1; }));
  Object.entries(porRol).forEach(([r, m]) => {
    const tot = Object.values(m).reduce((a, b) => a + b, 0), [k, v] = Object.entries(m).sort((a, b) => b[1] - a[1])[0];
    if (tot >= 5 && v / tot >= 0.75) avisos.push(`El rol «${r}» entra con «${k}» en ${v} de ${tot} escenas. Variá según lo que diga cada una (mov o coreografia en la escena).`);
  });
  const trs = P.slice(1).map((p) => p.transicion);
  if (trs.length >= 6 && new Set(trs).size === 1) avisos.push(`Todas las transiciones son «${trs[0]}». Un corte o un fundido donde cambia el tema marca el capítulo.`);
  const md = ['# Partitura de movimiento', '', '| Escena | Tipo | Coreografía | Transición | Pasos | Movimientos por rol |', '|---|---|---|---|---|---|', ...filas, '',
    ...(avisos.length ? ['## Avisos', '', ...avisos.map((a) => `- ${a}`)] : ['Sin avisos.']), ''].join('\n');
  writeFileSync(join(OUT, 'partitura.md'), md);
  console.log(`Partitura en ${join(OUT, 'partitura.md')}` + (avisos.length ? ` · ${avisos.length} aviso${avisos.length > 1 ? 's' : ''}:` : ' · sin avisos'));
  avisos.forEach((a) => console.log('  · ' + a));
}
