// Render de cualquier pieza a MP4 con Playwright + ffmpeg.
//   node render/video.mjs reel                         → salida/reel.mp4
//   node render/video.mjs motion --pausaMax 3          → la presentación como video, pausas de hasta 3 s
//   node render/video.mjs motion --desde 20 --hasta 40 → un tramo
//   node render/video.mjs reel --fps 30 --sub 1        → rápido, sin desenfoque por subcuadros
//   node render/video.mjs reel --salida mi-reel.mp4
//
// Desenfoque por subcuadros: se capturan fps × sub cuadros por segundo y ffmpeg promedia
// cada grupo de `sub` (tmix). Es el motion blur de una cámara real; 3 alcanza.
// Si la pieza expone window.renderAudio, el audio se mezcla al final.
import { spawn } from 'node:child_process';
import { mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { join, isAbsolute } from 'node:path';
import { RAIZ, abrir, args, informarErrores } from './comun.mjs';

const A = args();
const pieza = A._[0] || 'reel';
const ruta = pieza.endsWith('.html') ? pieza : `${pieza}/index.html`;
const nombre = pieza.replace(/\/index\.html$|\.html$/, '').replace(/[/\\]/g, '-');
const FPS = +(A.fps || 60), SUB = +(A.sub || 3);
const OUT = join(RAIZ, 'salida');
mkdirSync(OUT, { recursive: true });
const final = A.salida ? (isAbsolute(A.salida) ? A.salida : join(OUT, A.salida)) : join(OUT, `${nombre}.mp4`);

const query = ['render', A.pausaMax ? `pausaMax=${A.pausaMax}` : '', A.query || ''].filter(Boolean).join('&');
const { browser, page, errores } = await abrir(ruta, { query });
const DUR = await page.evaluate(() => window.DURACION);
if (!DUR) { console.error('La pieza no expone window.DURACION'); process.exit(1); }
const desde = +(A.desde || 0), hasta = Math.min(DUR, +(A.hasta || DUR));
const total = Math.round((hasta - desde) * FPS * SUB);
console.log(`${nombre}: ${(hasta - desde).toFixed(2)} s · ${FPS} fps × ${SUB} subcuadros = ${total} capturas`);

const silent = join(OUT, `.${nombre}-sin-audio.mp4`);
const vf = SUB > 1 ? `tmix=frames=${SUB},select='eq(mod(n\\,${SUB})\\,${SUB - 1})',setpts=N/(${FPS}*TB)` : 'null';
const ff = spawn('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-c:v', 'mjpeg', '-framerate', String(FPS * SUB), '-i', '-',
  '-vf', vf, '-r', String(FPS), '-c:v', 'libx264', '-preset', A.preset || 'slow', '-crf', String(A.crf || 15), '-pix_fmt', 'yuv420p', silent], { stdio: ['pipe', 'inherit', 'inherit'] });
const t0 = Date.now();
for (let i = 0; i < total; i++) {
  const t = desde + i / (FPS * SUB);
  await page.evaluate((tt) => window.seek(tt), t);
  const buf = await page.screenshot({ type: 'jpeg', quality: 95 });
  if (!ff.stdin.write(buf)) await new Promise((r) => ff.stdin.once('drain', r));
  if (i % (FPS * SUB * 2) === 0) console.log(`  ${String(Math.round((i / total) * 100)).padStart(3)} %  t = ${t.toFixed(2)} s`);
}
ff.stdin.end();
await new Promise((r, j) => ff.on('close', (c) => (c ? j(new Error('ffmpeg ' + c)) : r())));

const tieneAudio = await page.evaluate(() => typeof window.renderAudio === 'function');
if (tieneAudio && !A.mudo) {
  const wav = join(OUT, `${nombre}.wav`);
  writeFileSync(wav, Buffer.from(await page.evaluate(() => window.renderAudio()), 'base64'));
  await new Promise((r, j) => spawn('ffmpeg', ['-y', '-loglevel', 'error', '-i', silent, '-ss', String(desde), '-i', wav, '-c:v', 'copy', '-c:a', 'aac', '-b:a', '256k', '-shortest', '-movflags', '+faststart', final], { stdio: 'inherit' })
    .on('close', (c) => (c ? j(new Error('mux ' + c)) : r())));
  rmSync(silent);
} else {
  await new Promise((r, j) => spawn('ffmpeg', ['-y', '-loglevel', 'error', '-i', silent, '-c', 'copy', '-movflags', '+faststart', final], { stdio: 'inherit' })
    .on('close', (c) => (c ? j(new Error('faststart ' + c)) : r())));
  rmSync(silent);
}
console.log(`Listo: ${final} (${Math.round((Date.now() - t0) / 1000)} s)`);
informarErrores(errores);
await browser.close();
