// Lo que comparten los scripts de render: abrir una pieza en Chrome headless en modo
// render, esperar window.ready y juntar los errores de consola.
//
// Contrato de una pieza renderizable (motion, reel, o una propia):
//   window.ready      promesa que se resuelve cuando ya se puede dibujar (fuentes cargadas)
//   window.seek(t)    dibuja el instante t (segundos), sin depender del cuadro anterior
//   window.DURACION   duración total en segundos
//   window.CLAVES     opcional: [{ v, ...etiquetas }] instantes para revisar
//   window.renderAudio  opcional: async () → WAV en base64
import { createRequire } from 'node:module';
import { existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

export const RAIZ = resolve(dirname(fileURLToPath(import.meta.url)), '..');

// playwright-core: el del repo (npm install), o el de PLAYWRIGHT_DIR
const require = createRequire(process.env.PLAYWRIGHT_DIR ? join(process.env.PLAYWRIGHT_DIR, 'x.js') : join(RAIZ, 'package.json'));
let chromium;
try { ({ chromium } = require('playwright-core')); }
catch (e) { console.error('Falta playwright-core: corré `npm install` en la raíz del repo (o definí PLAYWRIGHT_DIR).'); process.exit(1); }

export function chrome() {
  const c = [process.env.CHROME, '/usr/bin/google-chrome-stable', '/usr/bin/google-chrome', '/usr/bin/chromium', '/usr/bin/chromium-browser',
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'].filter(Boolean).find((p) => existsSync(p));
  if (!c) { console.error('No encuentro Chrome. Definí CHROME=/ruta/al/ejecutable.'); process.exit(1); }
  return c;
}

// Argumentos --clave=valor o --clave valor
export function args(argv = process.argv.slice(2)) {
  const out = { _: [] };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (!a.startsWith('--')) { out._.push(a); continue; }
    const [k, v] = a.slice(2).split('=');
    out[k] = v ?? (argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[++i] : true);
  }
  return out;
}

// Abre una página del repo. ruta: relativa a la raíz (motion/index.html) · query: sin el "?"
export async function abrir(ruta, { query = 'render', ancho = 1920, alto = 1080, escala = 1 } = {}) {
  const browser = await chromium.launch({ executablePath: chrome(), args: ['--force-color-profile=srgb', '--allow-file-access-from-files'] });
  const page = await browser.newPage({ viewport: { width: ancho, height: alto }, deviceScaleFactor: escala });
  const errores = [];
  page.on('console', (m) => { if (m.type() === 'error') errores.push(m.text()); });
  page.on('pageerror', (e) => errores.push(e.message));
  page.on('requestfailed', (r) => errores.push(`No cargó: ${r.url()}`));
  query = String(query || '');
  const url = pathToFileURL(join(RAIZ, ruta)).href + (query ? (query.startsWith('#') ? query : '?' + query) : '');
  await page.goto(url);
  await page.waitForFunction(() => window.ready !== undefined, null, { timeout: 15000 }).catch(() => {});
  await page.evaluate(() => window.ready);
  return { browser, page, errores };
}

export function informarErrores(errores) {
  if (!errores.length) { console.log('Consola: sin errores.'); return; }
  console.log(`Consola: ${errores.length} error(es):`);
  [...new Set(errores)].forEach((e) => console.log('  ✗ ' + e));
  process.exitCode = 1;
}
