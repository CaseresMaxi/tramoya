// Revisión rápida de una pieza: errores de consola y un cuadro por instante clave.
//   node render/revisar.mjs motion                → un PNG por punto clave (window.CLAVES)
//   node render/revisar.mjs reel                  → un PNG por instante de window.CLAVES
//   node render/revisar.mjs motion --cada 0.5     → un PNG cada medio segundo
//   node render/revisar.mjs motion --t 3.2,7,12   → esos instantes
//   node render/revisar.mjs landing               → captura de página completa (sin seek)
//   node render/revisar.mjs ruta/a/pagina.html    → cualquier página del repo
//   node render/revisar.mjs proyecto/composiciones/intro.html → una composición (y sus avisos de formato)
// Además: vuelve a tres instantes en otro orden y avisa si el cuadro cambia (seek(t) tiene
// que dar lo mismo venga de donde venga, o el video y los hilos salen distintos).
// Salida en salida/revision/<pieza>/. Termina con código 1 si hubo errores de consola.
import { mkdirSync, rmSync, writeFileSync, readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { RAIZ, abrir, args, informarErrores } from './comun.mjs';

const A = args();
const pieza = A._[0] || 'motion';
const ruta = pieza.endsWith('.html') ? pieza : `${pieza}/index.html`;
const nombre = pieza.replace(/\/index\.html$|\.html$/, '').replace(/^proyecto\/composiciones\//, '').replace(/[/\\]/g, '-');
const OUT = join(RAIZ, 'salida', 'revision', nombre);
rmSync(OUT, { recursive: true, force: true });
mkdirSync(OUT, { recursive: true });

const { browser, page, errores } = await abrir(ruta, { query: A.query === true ? '' : A.query ?? 'render', ancho: +(A.ancho || 1920), alto: +(A.alto || 1080), fijo: !!A.ancho });
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
  if (!A['sin-determinismo'] && tiempos.length > 1) await determinismo(tiempos.map((c) => c.v));
}
if (pieza.endsWith('.html') && existsSync(join(RAIZ, ruta))) formato(readFileSync(join(RAIZ, ruta), 'utf8'));
if (info.partitura) partitura(info.partitura);

// Tres instantes, primero en orden y después al revés: el cuadro tiene que ser el mismo
async function determinismo(vs) {
  const elegidos = [...new Set([vs[Math.floor(vs.length / 3)], vs[Math.floor((2 * vs.length) / 3)], vs[vs.length - 1]])];
  const foto = async (v) => { await page.evaluate((x) => window.seek(x), v); return (await page.screenshot()).toString('base64'); };
  const ida = {};
  for (const v of elegidos) ida[v] = await foto(v);
  const malos = [];
  for (const v of [...elegidos].reverse()) {
    await foto(0);
    const vuelta = await foto(v);
    if (vuelta === ida[v] || (await parecidos(ida[v], vuelta))) continue;
    malos.push(v);
    // Los dos cuadros, para compararlos
    writeFileSync(join(OUT, `determinismo_${v}s_a.png`), Buffer.from(ida[v], 'base64'));
    writeFileSync(join(OUT, `determinismo_${v}s_b.png`), Buffer.from(vuelta, 'base64'));
  }
  if (!malos.length) console.log('Determinismo: cada instante da el mismo cuadro, venga de donde venga.');
  else console.log(`Determinismo: ✗ en ${malos.map((v) => v + ' s').join(', ')} el cuadro cambia según desde dónde se llega. Algo depende del cuadro anterior, de un timer o del azar sin semilla: el video (y los hilos) pueden salir distintos de lo que se ve.`);
}

// Iguales salvo ruido de rasterizado (sombras y desenfoques varían en un nivel de color):
// cuenta los píxeles con más de 24 niveles de diferencia en algún canal
async function parecidos(a, b) {
  const distintos = await page.evaluate(async ([a, b]) => {
    const datos = async (x) => {
      const bm = await createImageBitmap(await (await fetch('data:image/png;base64,' + x)).blob());
      const c = new OffscreenCanvas(bm.width, bm.height), g = c.getContext('2d');
      g.drawImage(bm, 0, 0);
      return g.getImageData(0, 0, bm.width, bm.height).data;
    };
    const [p, q] = await Promise.all([datos(a), datos(b)]);
    let n = 0;
    for (let i = 0; i < p.length; i += 4) if (Math.abs(p[i] - q[i]) > 24 || Math.abs(p[i + 1] - q[i + 1]) > 24 || Math.abs(p[i + 2] - q[i + 2]) > 24) n++;
    return n / (p.length / 4);
  }, [a, b]).catch(() => 1);
  return distintos < 0.0005;
}

// Avisos del formato de composición (lo que rompe un render cuadro por cuadro)
function formato(html) {
  if (!/data-composition-id/.test(html)) return;
  const sinComentarios = html.replace(/<!--[\s\S]*?-->/g, '');
  const js = [...sinComentarios.matchAll(/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/g)].map((m) => m[1]).join('\n').replace(/\/\*[\s\S]*?\*\/|(^|[^:])\/\/.*$/gm, '$1');
  const av = [];
  const raiz = sinComentarios.match(/<[a-z]+[^>]*data-composition-id=[^>]*>/i)?.[0] || '';
  if (!/data-width/.test(raiz) || !/data-height/.test(raiz)) av.push('La raíz no tiene data-width / data-height (se toma 1920 × 1080).');
  if (!/data-duration/.test(raiz)) av.push('La raíz no tiene data-duration: la duración sale de la línea de tiempo más larga.');
  if (/Math\.random\s*\(/.test(js)) av.push('Math.random(): cada cuadro sale distinto. Usá un azar con semilla (p. ej. mulberry32) calculado una vez.');
  if (/Date\.now\s*\(|new Date\s*\(\s*\)|performance\.now\s*\(/.test(js)) av.push('Date.now / performance.now: el tiempo es el del render, no el de la composición. Usá el de la línea (o e.detail.time de hf-seek).');
  if (/requestAnimationFrame|setInterval\s*\(/.test(js)) av.push('requestAnimationFrame / setInterval: lo que se anima solo no se puede buscar. Dibujalo en hf-seek.');
  if (/repeat\s*:\s*-1/.test(js)) av.push('Un tween con repeat: -1 (infinito): ponele un número de vueltas.');
  if (/\.play\s*\(\s*\)|\.currentTime\s*=/.test(js)) av.push('play() o currentTime en el código: el motor maneja los videos y audios; usá data-start y data-media-start.');
  if (/<video(?![^>]*\b(muted|data-has-audio)\b)[^>]*>/i.test(sinComentarios)) av.push('Un <video> sin muted ni data-has-audio: decí si su sonido va al video.');
  if (/gsap/.test(sinComentarios) && !/__timelines/.test(js)) av.push('Usa GSAP pero no registra window.__timelines["<id>"]: la animación no se va a mover al exportar.');
  if (/transition\s*:/.test(sinComentarios.replace(/<script[\s\S]*?<\/script>/g, ''))) av.push('Una transición CSS: depende del tiempo real. Pasala a la línea de GSAP o a @keyframes.');
  const cdn = [...new Set([...sinComentarios.matchAll(/src="(https?:\/\/[^"]+)"/g)].map((m) => m[1]))];
  if (cdn.length) av.push(`Carga ${cdn.length} archivo(s) de internet (${cdn.slice(0, 2).join(', ')}${cdn.length > 2 ? '…' : ''}): sin conexión no exporta. \`tramoya composicion local <archivo>\` los baja a proyecto/assets/vendor/.`);
  if (!/nucleo\/composicion\.js/.test(sinComentarios)) av.push('No carga nucleo/composicion.js: Tramoya no la puede mover. `tramoya composicion importar` lo agrega.');
  console.log(av.length ? `Formato de composición: ${av.length} aviso(s)\n${av.map((a) => '  · ' + a).join('\n')}` : 'Formato de composición: sin avisos.');
}
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
