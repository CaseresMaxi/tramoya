// Render de cualquier pieza a MP4 con Playwright + ffmpeg.
//   node render/video.mjs reel                         → salida/reel.mp4
//   node render/video.mjs motion --pausaMax 3          → la presentación como video, pausas de hasta 3 s
//   node render/video.mjs motion --desde 20 --hasta 40 → un tramo
//   node render/video.mjs reel --fps 30 --sub 1        → rápido, sin desenfoque por subcuadros
//   node render/video.mjs reel --salida mi-reel.mp4
//   node render/video.mjs proyecto/composiciones/intro.html   → una composición (su tamaño, sus fps, su audio)
//   node render/video.mjs motion --hilos 4             → en 4 Chrome a la vez (por defecto, según los núcleos)
//
// Desenfoque por subcuadros: se capturan fps × sub cuadros por segundo y ffmpeg promedia
// cada grupo de `sub` (tmix). Es el motion blur de una cámara real; 3 alcanza.
// Hilos: cada Chrome hace un tramo (alineado a los grupos de subcuadros) y ffmpeg los une
// sin volver a codificar. Sirve porque seek(t) no depende del cuadro anterior.
// Audio: window.renderAudio (WAV) y window.PISTAS (archivos con inicio, recorte, volumen y
// fundidos) se mezclan al final.
import { spawn } from 'node:child_process';
import { mkdirSync, writeFileSync, rmSync, existsSync } from 'node:fs';
import { cpus } from 'node:os';
import { join, isAbsolute } from 'node:path';
import { fileURLToPath } from 'node:url';
import { RAIZ, abrir, args, informarErrores, lanzar } from './comun.mjs';

const A = args();
const pieza = A._[0] || 'reel';
const ruta = pieza.endsWith('.html') ? pieza : `${pieza}/index.html`;
const nombre = pieza.replace(/\/index\.html$|\.html$/, '').replace(/^proyecto\/composiciones\//, '').replace(/[/\\]/g, '-');
const OUT = join(RAIZ, 'salida');
mkdirSync(OUT, { recursive: true });
const final = A.salida ? (isAbsolute(A.salida) ? A.salida : join(OUT, A.salida)) : join(OUT, `${nombre}.mp4`);
const query = ['render', A.pausaMax ? `pausaMax=${A.pausaMax}` : '', A.query || ''].filter(Boolean).join('&');

const correr = (bin, argv, opts = {}) => new Promise((r, j) => spawn(bin, argv, { stdio: 'inherit', ...opts }).on('close', (c) => (c ? j(new Error(`${bin} terminó con ${c}`)) : r())));

const primero = await abrir(ruta, { query });
const { page, errores } = primero;
const info = await page.evaluate(() => ({ dur: window.DURACION, fps: window.FPS, audio: typeof window.renderAudio === 'function', pistas: window.PISTAS || [] }));
if (!info.dur) { console.error('La pieza no expone window.DURACION'); process.exit(1); }
const FPS = +(A.fps || info.fps || 60), SUB = +(A.sub || 3);
const desde = +(A.desde || 0), hasta = Math.min(info.dur, +(A.hasta || info.dur));
const cuadros = Math.round((hasta - desde) * FPS), total = cuadros * SUB;
const HILOS = Math.max(1, Math.min(+(A.hilos || (total > 900 ? Math.min(4, Math.floor(cpus().length / 2)) : 1)), Math.ceil(cuadros / 30)));
console.log(`${nombre}: ${(hasta - desde).toFixed(2)} s · ${FPS} fps × ${SUB} subcuadros = ${total} capturas · ${primero.ancho}×${primero.alto}${HILOS > 1 ? ` · ${HILOS} hilos` : ''}`);

const vf = SUB > 1 ? `tmix=frames=${SUB},select='eq(mod(n\\,${SUB})\\,${SUB - 1})',setpts=N/(${FPS}*TB)` : 'null';
const t0 = Date.now();
let hechas = 0, ultimoAviso = 0;
// Un tramo [c0, c1) de cuadros en una página, a su propio archivo
async function tramo(pg, c0, c1, archivo) {
  const ff = spawn('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-c:v', 'mjpeg', '-framerate', String(FPS * SUB), '-i', '-',
    '-vf', vf, '-r', String(FPS), '-c:v', 'libx264', '-preset', A.preset || 'slow', '-crf', String(A.crf || 15), '-pix_fmt', 'yuv420p', archivo], { stdio: ['pipe', 'inherit', 'inherit'] });
  const cerrado = new Promise((r, j) => ff.on('close', (c) => (c ? j(new Error('ffmpeg ' + c)) : r())));
  for (let i = c0 * SUB; i < c1 * SUB; i++) {
    const t = desde + i / (FPS * SUB);
    await pg.evaluate((tt) => window.seek(tt), t);
    const buf = await pg.screenshot({ type: 'jpeg', quality: 95 });
    if (!ff.stdin.write(buf)) await new Promise((r) => ff.stdin.once('drain', r));
    hechas++;
    if (hechas - ultimoAviso >= FPS * SUB * 2) { ultimoAviso = hechas; console.log(`  ${String(Math.round((hechas / total) * 100)).padStart(3)} %  ${((Date.now() - t0) / 1000).toFixed(0)} s`); }
  }
  ff.stdin.end();
  await cerrado;
}

const mudo = join(OUT, `.${nombre}-sin-audio.mp4`);
const extras = [];
if (HILOS === 1) await tramo(page, 0, cuadros, mudo);
else {
  const paso = Math.ceil(cuadros / HILOS), partes = [];
  const trabajos = Array.from({ length: HILOS }, async (_, h) => {
    const c0 = h * paso, c1 = Math.min(cuadros, c0 + paso);
    if (c0 >= c1) return;
    const archivo = join(OUT, `.${nombre}-parte-${h}.mp4`);
    partes[h] = archivo;
    let pg = page;
    if (h > 0) {
      const b = await lanzar();
      extras.push(b);
      const o = await abrir(ruta, { query, browser: b });
      o.errores.forEach((e) => errores.push(e));
      pg = o.page;
    }
    await tramo(pg, c0, c1, archivo);
  });
  await Promise.all(trabajos);
  const lista = join(OUT, `.${nombre}-partes.txt`);
  writeFileSync(lista, partes.filter(Boolean).map((p) => `file '${p.replace(/'/g, "'\\''")}'`).join('\n'));
  await correr('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'concat', '-safe', '0', '-i', lista, '-c', 'copy', mudo]);
  partes.filter(Boolean).forEach((p) => rmSync(p));
  rmSync(lista);
}

// ---------- Audio ----------
const entradas = [], filtros = [];
if (info.audio && !A.mudo) {
  const wav = join(OUT, `${nombre}.wav`);
  writeFileSync(wav, Buffer.from(await page.evaluate(() => window.renderAudio()), 'base64'));
  entradas.push('-ss', String(desde), '-i', wav);
  filtros.push(`[${entradas.filter((x) => x === '-i').length}:a]anull[a0]`);
}
if (!A.mudo) {
  for (const p of info.pistas) {
    const fin = p.inicio + p.dur;
    if (fin <= desde || p.inicio >= hasta || !p.src) continue;
    const archivo = p.src.startsWith('file:') ? fileURLToPath(p.src) : p.src;
    if (!/^https?:/.test(archivo) && !existsSync(archivo)) { errores.push(`No encuentro el audio ${archivo}`); continue; }
    const corte = Math.max(0, desde - p.inicio), dur = Math.min(fin, hasta) - Math.max(p.inicio, desde);
    const n = entradas.filter((x) => x === '-i').length + 1;
    entradas.push('-ss', String(p.recorte + corte * p.velocidad), '-i', archivo);
    const f = [];
    if (p.velocidad !== 1) f.push(`atempo=${Math.min(2, Math.max(0.5, p.velocidad))}`);
    f.push(`atrim=0:${dur.toFixed(3)}`, 'asetpts=PTS-STARTPTS', `volume=${p.volumen}`);
    if (p.fadeIn > corte) f.push(`afade=t=in:st=0:d=${(p.fadeIn - corte).toFixed(3)}`);
    if (p.fadeOut > 0 && fin <= hasta) f.push(`afade=t=out:st=${Math.max(0, dur - p.fadeOut).toFixed(3)}:d=${p.fadeOut}`);
    const ms = Math.round(Math.max(0, p.inicio - desde) * 1000);
    f.push(`adelay=${ms}|${ms}`);
    filtros.push(`[${n}:a]${f.join(',')}[a${filtros.length}]`);
  }
}
if (filtros.length) {
  const mezcla = `${filtros.join(';')};${filtros.map((_, i) => `[a${i}]`).join('')}amix=inputs=${filtros.length}:duration=longest:normalize=0,apad[sal]`;
  await correr('ffmpeg', ['-y', '-loglevel', 'error', '-i', mudo, ...entradas, '-filter_complex', mezcla, '-map', '0:v', '-map', '[sal]',
    '-c:v', 'copy', '-c:a', 'aac', '-b:a', '256k', '-t', String(hasta - desde), '-movflags', '+faststart', final]);
} else {
  await correr('ffmpeg', ['-y', '-loglevel', 'error', '-i', mudo, '-c', 'copy', '-movflags', '+faststart', final]);
}
rmSync(mudo);
console.log(`Listo: ${final} (${Math.round((Date.now() - t0) / 1000)} s)`);
informarErrores(errores);
await Promise.all([primero.browser, ...extras].map((b) => b.close()));
