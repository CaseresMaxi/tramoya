#!/usr/bin/env node
// tramoya: crear, abrir (estudio en el navegador con tablero y editores que guardan en archivos), revisar, exportar y llevar
// proyectos de Tramoya. Sin dependencias: solo Node 18+. El render necesita además
// playwright-core y Chrome (y ffmpeg para video).
//
// Vive en dos lugares con el mismo código:
//   · en la skill (motor/herramientas/tramoya.mjs, llamado desde scripts/tramoya.mjs):
//     sabe crear proyectos nuevos a partir de motor/ + plantilla/ y actualizarlos.
//   · dentro de cada proyecto (herramientas/tramoya.mjs): para abrirlo, revisarlo y
//     empaquetarlo en cualquier máquina, aunque ahí no esté instalada la skill.
//
// Uso: node tramoya.mjs <comando> [opciones]   (node tramoya.mjs ayuda)
import { spawn, spawnSync } from 'node:child_process';
import { createServer } from 'node:http';
import { chmodSync, cpSync, createReadStream, existsSync, mkdirSync, readFileSync, readdirSync, realpathSync, rmSync, statSync, watch, writeFileSync } from 'node:fs';
import { homedir, platform } from 'node:os';
import { basename, dirname, extname, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Script } from 'node:vm';
import { deflateRawSync, inflateRawSync } from 'node:zlib';

// Ruta real (si se llama por un enlace, como el bin de npm, se resuelve hasta el archivo)
const CLI = (() => { const f = fileURLToPath(import.meta.url); try { return realpathSync(f); } catch (e) { return f; } })();
const AQUI = dirname(CLI);
const RAIZ_AQUI = resolve(AQUI, '..');
// ¿Estamos en la skill (motor/ al lado de SKILL.md) o dentro de un proyecto?
const SKILL = existsSync(join(RAIZ_AQUI, '..', 'SKILL.md')) && basename(RAIZ_AQUI) === 'motor' ? resolve(RAIZ_AQUI, '..') : null;
const MOTOR = SKILL ? join(SKILL, 'motor') : RAIZ_AQUI;
const PLANTILLA = SKILL ? join(SKILL, 'plantilla', 'proyecto') : join(RAIZ_AQUI, 'proyecto');
// Lanzadores de doble clic (macOS, Windows, Linux): abren el estudio en la carpeta del proyecto
const LANZADORES = ['Abrir estudio.command', 'Abrir estudio.bat', 'abrir-estudio.sh'];
// Lo que es motor (se copia y se actualiza); todo lo demás del proyecto es del usuario
const PARTES_MOTOR = ['index.html', 'tablero', 'nucleo', 'estilos', 'motion', 'reel', 'poster', 'landing', 'marca', 'render', 'herramientas', 'package.json', 'package-lock.json', ...LANZADORES];

// ---------- Utilidades ----------
const c = process.stdout.isTTY ? { b: (s) => `\x1b[1m${s}\x1b[0m`, g: (s) => `\x1b[32m${s}\x1b[0m`, r: (s) => `\x1b[31m${s}\x1b[0m`, d: (s) => `\x1b[2m${s}\x1b[0m`, y: (s) => `\x1b[33m${s}\x1b[0m` } : { b: String, g: String, r: String, d: String, y: String };
const fallar = (msg) => { console.error(c.r('✗ ') + msg); process.exit(1); };
// Opciones que nunca llevan valor (así `--skill-local carpeta` no se come la carpeta)
const BANDERAS = new Set(['skill-local', 'sin-navegador', 'forzar', 'json', 'solo-proyecto', 'copiar', 'sin-dependencias', 'png']);
function args(argv) {
  const out = { _: [] };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '-o') { out.salida = argv[++i]; continue; }
    if (!a.startsWith('--')) { out._.push(a); continue; }
    const [k, v] = a.slice(2).split('=');
    out[k] = v ?? (!BANDERAS.has(k) && argv[i + 1] && !argv[i + 1].startsWith('-') ? argv[++i] : true);
  }
  return out;
}
const esProyecto = (d) => existsSync(join(d, 'proyecto', 'proyecto.js')) && existsSync(join(d, 'nucleo', 'util.js'));
// El proyecto sobre el que se trabaja: --en, o subiendo desde el directorio actual, o ./tramoya
function proyecto(A, obligatorio = true) {
  if (A.en) { const d = resolve(A.en); if (!esProyecto(d)) fallar(`${d} no es un proyecto de Tramoya (falta proyecto/proyecto.js o nucleo/).`); return d; }
  for (let d = process.cwd(); ; d = dirname(d)) { if (esProyecto(d)) return d; if (dirname(d) === d) break; }
  if (esProyecto(resolve('tramoya'))) return resolve('tramoya');
  if (!SKILL && esProyecto(RAIZ_AQUI)) return RAIZ_AQUI;
  if (obligatorio) fallar('No encuentro un proyecto de Tramoya acá. Creá uno con `tramoya nuevo <carpeta>` o pasá --en <carpeta>.');
  return null;
}
const leerJSON = (p, def = null) => { try { return JSON.parse(readFileSync(p, 'utf8')); } catch (e) { return def; } };
const idDe = (txt) => String(txt).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'proyecto';
function version() {
  const pkg = leerJSON(join(MOTOR, 'package.json'), {});
  const r = spawnSync('git', ['-C', SKILL || MOTOR, 'rev-parse', '--short', 'HEAD'], { encoding: 'utf8' });
  return `${pkg.version || '0'}${r.status === 0 ? '+' + r.stdout.trim() : ''}`;
}
function abrirNavegador(url) {
  const [cmd, ...a] = platform() === 'darwin' ? ['open', url] : platform() === 'win32' ? ['cmd', '/c', 'start', '', url] : ['xdg-open', url];
  try { spawn(cmd, a, { stdio: 'ignore', detached: true }).unref(); } catch (e) {}
}

// Los generados se reescriben solo si cambian: así no disparan recargas de más
function escribirSiCambia(f, txt) { try { if (readFileSync(f, 'utf8') === txt) return; } catch (e) {} writeFileSync(f, txt); }

// ---------- Manifiesto y estado generados ----------
// El navegador no puede listar carpetas desde file://: la lista de assets se arma acá
function manifiesto(P) {
  const GRUPOS = { imagenes: ['img', /\.(jpe?g|png|webp|svg|avif|gif)$/i], logos: ['logo', /\.(svg|png)$/i], videos: ['video', /\.(mp4|webm|mov)$/i] };
  const m = {};
  for (const [g, [carpeta, re]] of Object.entries(GRUPOS)) {
    const base = join(P, 'proyecto', 'assets', carpeta);
    m[g] = existsSync(base) ? readdirSync(base).filter((n) => re.test(n) && n !== 'favicon.svg').sort().map((n) => `../proyecto/assets/${carpeta}/${n}`) : [];
  }
  escribirSiCambia(join(P, 'proyecto', 'manifiesto.js'), '// Generado por `tramoya manifiesto`. No editar a mano.\nwindow.MANIFIESTO = ' + JSON.stringify(m, null, 2) + ';\n');
  return m;
}
// proyecto/estado/<sub>.json → proyecto/estado.js. rev = lo más nuevo entre el guardado y
// la fecha del archivo: si el agente edita un .json a mano, gana sobre el borrador del navegador.
function leerEstado(P, quejarse = true) {
  const dir = join(P, 'proyecto', 'estado'), E = {};
  if (existsSync(dir)) for (const n of readdirSync(dir).filter((n) => n.endsWith('.json')).sort()) {
    const f = join(dir, n), j = leerJSON(f);
    if (!j || typeof j !== 'object') { if (quejarse) console.error(c.y(`! ${relative(P, f)} no es JSON válido: no se usa`)); continue; }
    const d = 'v' in j && 'rev' in j ? j : { rev: 0, v: j };
    E[n.slice(0, -5)] = { rev: Math.max(+d.rev || 0, Math.floor(statSync(f).mtimeMs)), v: d.v };
  }
  return E;
}
function estadoJS(P) {
  const E = leerEstado(P);
  escribirSiCambia(join(P, 'proyecto', 'estado.js'), '// Generado por tramoya a partir de proyecto/estado/*.json. No editar a mano.\nwindow.ESTADO = ' + JSON.stringify(E) + ';\n');
  return E;
}
// Estilos: los de la galería (estilos/<id>/ del motor) y los propios (proyecto/estilos/<id>/).
// galeria.js los lista, porque desde file:// la galería no puede leer carpetas.
const idsEn = (d) => (existsSync(d) ? readdirSync(d).filter((n) => existsSync(join(d, n, 'estilo.js'))).sort() : []);
function galeria(P) {
  const g = { motor: idsEn(join(P, 'estilos')), proyecto: idsEn(join(P, 'proyecto', 'estilos')) };
  escribirSiCambia(join(P, 'proyecto', 'galeria.js'), '// Generado por tramoya: los estilos que hay para elegir. No editar a mano.\nwindow.GALERIA = ' + JSON.stringify(g) + ';\n');
  return g;
}
const SIN_ESTILO = '// Sin estilo elegido: el proyecto usa el neutro. Elegí uno en la galería (estilos/index.html)\n// o con `tramoya estilo <id>`; se copia acá.\n';
// Copia un estilo a proyecto/estilo/ (con sus fuentes): queda fijo aunque la galería cambie
function aplicarEstilo(P, id) {
  const propio = id.startsWith('proyecto:'), nombre = id.replace(/^proyecto:/, '');
  if (!/^[a-z0-9-]+$/.test(nombre)) throw new Error('Id de estilo inválido: ' + id);
  const src = propio ? join(P, 'proyecto', 'estilos', nombre) : [join(P, 'estilos', nombre), join(MOTOR, 'estilos', nombre)].find((d) => existsSync(join(d, 'estilo.js')));
  if (!src || !existsSync(join(src, 'estilo.js'))) throw new Error(`No existe el estilo «${id}». Disponibles: ${[...galeria(P).motor, ...galeria(P).proyecto.map((x) => 'proyecto:' + x)].join(', ')}`);
  const dest = join(P, 'proyecto', 'estilo');
  rmSync(dest, { recursive: true, force: true });
  cpSync(src, dest, { recursive: true });
  return nombre;
}
const regenerar = (P) => {
  manifiesto(P); galeria(P);
  if (!existsSync(join(P, 'proyecto', 'estilo', 'estilo.js'))) { mkdirSync(join(P, 'proyecto', 'estilo'), { recursive: true }); writeFileSync(join(P, 'proyecto', 'estilo', 'estilo.js'), SIN_ESTILO); }
  return estadoJS(P);
};
const estiloDe = (P) => { try { return (readFileSync(join(P, 'proyecto', 'estilo', 'estilo.js'), 'utf8').match(/\bid:\s*['"]([^'"]+)['"]/) || [])[1] || null; } catch (e) { return null; } };

// ---------- Zip mínimo (deflate), para empaquetar y traer proyectos ----------
const CRC = Array.from({ length: 256 }, (_, n) => { for (let k = 0; k < 8; k++) n = n & 1 ? 0xedb88320 ^ (n >>> 1) : n >>> 1; return n >>> 0; });
const crc32 = (b) => { let x = 0xffffffff; for (const v of b) x = CRC[(x ^ v) & 0xff] ^ (x >>> 8); return (x ^ 0xffffffff) >>> 0; };
function zip(archivos) { // [{ nombre, datos: Buffer }]
  const locales = [], centrales = []; let off = 0;
  for (const { nombre, datos } of archivos) {
    const n = Buffer.from(nombre), comp = deflateRawSync(datos), crc = crc32(datos);
    const h = Buffer.alloc(30); h.writeUInt32LE(0x04034b50, 0); h.writeUInt16LE(20, 4); h.writeUInt16LE(0x0800, 6); h.writeUInt16LE(8, 8);
    h.writeUInt32LE(crc, 14); h.writeUInt32LE(comp.length, 18); h.writeUInt32LE(datos.length, 22); h.writeUInt16LE(n.length, 26);
    const cd = Buffer.alloc(46); cd.writeUInt32LE(0x02014b50, 0); cd.writeUInt16LE(20, 4); cd.writeUInt16LE(20, 6); cd.writeUInt16LE(0x0800, 8); cd.writeUInt16LE(8, 10);
    cd.writeUInt32LE(crc, 16); cd.writeUInt32LE(comp.length, 20); cd.writeUInt32LE(datos.length, 24); cd.writeUInt16LE(n.length, 28); cd.writeUInt32LE(off, 42);
    locales.push(h, n, comp); centrales.push(cd, n); off += 30 + n.length + comp.length;
  }
  const cdBuf = Buffer.concat(centrales), fin = Buffer.alloc(22);
  fin.writeUInt32LE(0x06054b50, 0); fin.writeUInt16LE(archivos.length, 8); fin.writeUInt16LE(archivos.length, 10); fin.writeUInt32LE(cdBuf.length, 12); fin.writeUInt32LE(off, 16);
  return Buffer.concat([...locales, cdBuf, fin]);
}
function unzip(buf) {
  let e = buf.length - 22; while (e >= 0 && buf.readUInt32LE(e) !== 0x06054b50) e--;
  if (e < 0) throw new Error('El archivo no es un .zip válido.');
  const total = buf.readUInt16LE(e + 10); let p = buf.readUInt32LE(e + 16); const out = [];
  for (let i = 0; i < total; i++) {
    const metodo = buf.readUInt16LE(p + 10), tam = buf.readUInt32LE(p + 20), nl = buf.readUInt16LE(p + 28), xl = buf.readUInt16LE(p + 30), cl = buf.readUInt16LE(p + 32), loc = buf.readUInt32LE(p + 42);
    const nombre = buf.toString('utf8', p + 46, p + 46 + nl);
    const ini = loc + 30 + buf.readUInt16LE(loc + 26) + buf.readUInt16LE(loc + 28), raw = buf.subarray(ini, ini + tam);
    if (!nombre.endsWith('/')) out.push({ nombre, datos: metodo === 8 ? inflateRawSync(raw) : Buffer.from(raw) });
    p += 46 + nl + xl + cl;
  }
  return out;
}
function listar(base, dir = base, out = []) {
  for (const n of readdirSync(dir)) {
    const f = join(dir, n), r = relative(base, f).split(sep).join('/');
    if (/^(node_modules|salida|\.git)(\/|$)/.test(r) || n === '.DS_Store') continue;
    if (statSync(f).isDirectory()) listar(base, f, out); else out.push(r);
  }
  return out;
}
function paquete(P, { soloProyecto = false } = {}) {
  estadoJS(P);
  const nombres = listar(P).filter((r) => !soloProyecto || r.startsWith('proyecto/') || r === '.tramoya-version');
  const id = idProyecto(P);
  return zip(nombres.map((r) => ({ nombre: `${id}/${r}`, datos: readFileSync(join(P, r)) })));
}
const idProyecto = (P) => (readFileSync(join(P, 'proyecto', 'proyecto.js'), 'utf8').match(/\bid:\s*['"]([^'"]+)['"]/) || [])[1] || basename(P);

// ---------- Crear, traer y poner el motor ----------
// El filtro mira la ruta relativa: la skill puede estar dentro de un node_modules (npx, npm i -g)
const sinNodeModules = (base) => (s) => !relative(base, s).split(sep).includes('node_modules');
function copiarMotor(dest, { limpiar = false } = {}) {
  for (const p of PARTES_MOTOR) if (existsSync(join(MOTOR, p))) {
    if (limpiar) rmSync(join(dest, p), { recursive: true, force: true });
    cpSync(join(MOTOR, p), join(dest, p), { recursive: true, filter: sinNodeModules(MOTOR) });
  }
  for (const l of LANZADORES) if (/\.(command|sh)$/.test(l) && existsSync(join(dest, l))) try { chmodSync(join(dest, l), 0o755); } catch (e) {}
}
function crearProyecto(dest, { nombre = null, id = null, estilo = null, forzar = false } = {}) {
  if (existsSync(dest) && readdirSync(dest).length && !forzar) throw new Error(`${dest} ya existe y no está vacía (--forzar para escribir encima).`);
  id = id ? idDe(id) : idDe(nombre || basename(dest));
  mkdirSync(dest, { recursive: true });
  copiarMotor(dest);
  if (!existsSync(join(dest, 'proyecto'))) cpSync(PLANTILLA, join(dest, 'proyecto'), { recursive: true, filter: (s) => !/[\\/]estado[\\/].+\.json$/.test(s) });
  const pj = join(dest, 'proyecto', 'proyecto.js'), q = (s) => s.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
  let txt = readFileSync(pj, 'utf8').replace(/(\n\s*id:\s*)['"][^'"]*['"]/, `$1'${id}'`);
  if (nombre) txt = txt.replace(/(\n\s*nombre:\s*)['"][^'"]*['"]/, `$1'${q(nombre)}'`).replace(/(palabra:\s*)['"][^'"]*['"]/, `$1'${q(nombre)}'`);
  writeFileSync(pj, txt);
  rmSync(join(dest, 'proyecto', 'estado'), { recursive: true, force: true }); mkdirSync(join(dest, 'proyecto', 'estado'), { recursive: true });
  writeFileSync(join(dest, 'proyecto', 'estado', '.gitkeep'), '');
  writeFileSync(join(dest, '.tramoya-version'), version() + '\n');
  if (!existsSync(join(dest, '.gitignore'))) writeFileSync(join(dest, '.gitignore'), 'node_modules/\nsalida/revision/\n.DS_Store\n');
  regenerar(dest);
  if (estilo) aplicarEstilo(dest, String(estilo));
  return { dest, id };
}
// Lo que viene en un zip o una carpeta → [{ nombre, datos }] sin la carpeta de arriba
function normalizarImport(archivos) {
  archivos = archivos.map((a) => ({ ...a, nombre: a.nombre.replace(/\\/g, '/') }));
  const pri = new Set(archivos.map((a) => a.nombre.split('/')[0]));
  const quitar = pri.size === 1 && archivos.every((a) => a.nombre.includes('/')) ? [...pri][0] + '/' : '';
  archivos = archivos.map((a) => ({ ...a, nombre: a.nombre.slice(quitar.length).replace(/^\/+/, '') }))
    .filter((a) => a.nombre && !a.nombre.split('/').some((x) => x === '..' || x === '.') && !/^[a-z]:/i.test(a.nombre) && !/(^|\/)(__MACOSX|\.DS_Store)(\/|$)/.test(a.nombre));
  if (!archivos.some((a) => a.nombre === 'proyecto/proyecto.js')) throw new Error('No encuentro proyecto/proyecto.js adentro: no parece un proyecto de Tramoya.');
  return { archivos, carpeta: quitar.replace(/\/$/, '') };
}
function instalarImport(archivos, dest, { forzar = false } = {}) {
  if (existsSync(dest) && readdirSync(dest).length && !forzar) throw new Error(`${dest} ya existe y no está vacía (--forzar para escribir encima).`);
  for (const a of archivos) {
    const f = resolve(dest, a.nombre);
    if (!f.startsWith(resolve(dest) + sep)) continue;
    mkdirSync(dirname(f), { recursive: true }); writeFileSync(f, a.datos);
  }
  const traiaMotor = archivos.some((a) => a.nombre === 'nucleo/util.js');
  if (!traiaMotor) { copiarMotor(dest); writeFileSync(join(dest, '.tramoya-version'), version() + '\n'); }
  regenerar(dest);
  return { dest, traiaMotor };
}
// Una carpeta que no existe todavía dentro de W: mi-charla, mi-charla-2…
function carpetaLibre(W, nombre) {
  const base = idDe(nombre);
  for (let i = 1; ; i++) { const d = join(W, i === 1 ? base : `${base}-${i}`); if (!existsSync(d) || !readdirSync(d).length) return d; }
}
// Un id que no use otro proyecto (dos con el mismo id comparten lo guardado en el navegador)
function idUnico(ids, base) { for (let i = 1; ; i++) { const id = i === 1 ? base : `${base}-${i}`; if (!ids.has(id)) return id; } }
// Copia la skill dentro de un repo (.claude/skills y .agents/skills) para que viaje con él
function skillLocal(raiz) {
  if (!SKILL) fallar('`--skill-local` se corre desde la skill (scripts/tramoya.mjs), que es la que se copia.');
  const out = [];
  for (const d of [join(raiz, '.claude', 'skills', 'tramoya'), join(raiz, '.agents', 'skills', 'tramoya')]) {
    if (resolve(d) === SKILL || resolve(d).startsWith(SKILL + sep)) { out.push(`${relative(raiz, d)} (es la skill misma: no se copia)`); continue; }
    rmSync(d, { recursive: true, force: true });
    cpSync(SKILL, d, { recursive: true, filter: (s) => { const r = relative(SKILL, s).split(sep); return !r.some((x) => ['.git', 'node_modules', 'salida'].includes(x)) && !['.claude', '.agents'].includes(r[0]); } });
    out.push(relative(raiz, d) || d);
  }
  return out;
}

// ---------- Lo pendiente: pedidos al agente, correcciones y observaciones ----------
function pendientesDe(P, E = leerEstado(P, false), { todas = false } = {}) {
  const out = [], ok = (x) => todas || !x.hecho;
  for (const [sub, { v }] of Object.entries(E)) {
    if (sub === 'motion' && Array.isArray(v?.escenas)) {
      v.escenas.filter((s) => s.activa !== false).forEach((s, i) => (s.correcciones || []).filter(ok).forEach((x) =>
        out.push({ pieza: 'motion', escena: i + 1, paso: x.paso, elemento: x.elemento, cita: x.cita, x: x.x, y: x.y, texto: x.texto, hecho: !!x.hecho, fecha: x.fecha || x.creada, abrir: `motion/index.html?escena=${i + 1}&paso=${x.paso || 1}` })));
    }
    if (sub === 'pedidos' && Array.isArray(v)) v.filter(ok).forEach((o) => out.push({ pieza: 'pedido', tipo: o.tipo, texto: o.texto, links: o.links, imagenes: o.imagenes, id: o.id, fecha: o.fecha, hecho: !!o.hecho }));
    if (/-obs$/.test(sub) && Array.isArray(v)) v.filter(ok).forEach((o) => out.push({ pieza: sub.replace(/-obs$/, ''), id: o.id, parte: o.part, x: o.x != null ? Math.round(o.x * 100) + '%' : undefined, y: o.y != null ? Math.round(o.y * 100) + '%' : undefined, texto: o.text, hecho: !!o.hecho, abrir: `${sub.replace(/-obs$/, '')}/index.html` }));
  }
  return out;
}

// ---------- Diagnóstico (lo usan doctor y el tablero) ----------
const CHROMES = () => [process.env.CHROME, '/usr/bin/google-chrome-stable', '/usr/bin/google-chrome', '/usr/bin/chromium', '/usr/bin/chromium-browser', '/snap/bin/chromium',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', '/Applications/Chromium.app/Contents/MacOS/Chromium',
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe', 'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe'].filter(Boolean);
function diagnostico(P) {
  const chrome = CHROMES().find((p) => existsSync(p)), pw = playwright(P);
  const npm = SKILL ? `npm install --prefix "${join(SKILL, 'motor')}"` : `npm install --prefix "${P || 'la carpeta del proyecto'}"`;
  return [
    { clave: 'node', nombre: 'Node', ok: +process.versions.node.split('.')[0] >= 18, texto: `Node ${process.versions.node}`, ayuda: 'Hace falta Node 18 o más nuevo: https://nodejs.org' },
    { clave: 'chrome', nombre: 'Chrome', ok: !!chrome, texto: `Chrome: ${chrome || 'no encontrado'}`, ayuda: 'Instalá Google Chrome o Chromium, o definí CHROME=/ruta/al/ejecutable', para: 'revisar y exportar' },
    { clave: 'playwright', nombre: 'playwright-core', ok: !!pw, texto: `playwright-core: ${pw || 'no encontrado'}`, ayuda: npm, para: 'revisar y exportar' },
    { clave: 'ffmpeg', nombre: 'ffmpeg', ok: spawnSync('ffmpeg', ['-version']).status === 0, texto: 'ffmpeg (para video)', ayuda: platform() === 'darwin' ? 'brew install ffmpeg' : platform() === 'win32' ? 'winget install ffmpeg' : 'Instalá ffmpeg con el gestor de paquetes (apt install ffmpeg…)', para: 'video' },
    { clave: 'magick', nombre: 'ImageMagick', ok: spawnSync('magick', ['-version']).status === 0, texto: 'ImageMagick (opcional: densidad del PNG del póster)', opcional: true },
  ];
}

// ---------- Servidor local ----------
const TIPOS = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.avif': 'image/avif', '.gif': 'image/gif', '.woff2': 'font/woff2', '.woff': 'font/woff', '.ico': 'image/x-icon',
  '.mp4': 'video/mp4', '.webm': 'video/webm', '.mov': 'video/quicktime', '.wav': 'audio/wav', '.mp3': 'audio/mpeg', '.pdf': 'application/pdf', '.zip': 'application/zip', '.md': 'text/markdown; charset=utf-8', '.txt': 'text/plain; charset=utf-8' };
// Límites de lo que se recibe
const LIM = { json: 20 << 20, archivo: 2 << 20, subir: 200 << 20, zip: 500 << 20 };
const error = (status, msg, extra = {}) => Object.assign(new Error(msg), { status, extra });
const cuerpo = (req, max = LIM.json) => new Promise((ok, mal) => {
  if (+req.headers['content-length'] > max) { req.resume(); return mal(error(413, `Demasiado grande (máximo ${Math.round(max / 1048576)} MB)`)); }
  const b = []; let n = 0, pasado = false;
  req.on('data', (d) => { n += d.length; if (n > max) pasado = true; else b.push(d); });
  req.on('end', () => (pasado ? mal(error(413, `Demasiado grande (máximo ${Math.round(max / 1048576)} MB)`)) : ok(Buffer.concat(b))));
  req.on('error', mal);
});
const cuerpoJSON = async (req) => { const t = (await cuerpo(req)).toString('utf8'); try { return JSON.parse(t || '{}'); } catch (e) { throw error(400, 'JSON inválido'); } };
const json = (res, code, o) => { res.writeHead(code, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' }); res.end(JSON.stringify(o)); };
// Un archivo, con rangos (los <video> los piden para poder saltar) y en streaming
function servirArchivo(req, res, f, { descargar = false } = {}) {
  const st = statSync(f), h = { 'content-type': TIPOS[extname(f).toLowerCase()] || 'application/octet-stream', 'cache-control': 'no-store', 'accept-ranges': 'bytes' };
  if (descargar) h['content-disposition'] = `attachment; filename*=UTF-8''${encodeURIComponent(basename(f))}`;
  const m = /^bytes=(\d*)-(\d*)$/.exec(req.headers.range || '');
  if (m && (m[1] || m[2])) {
    let a = m[1] ? +m[1] : Math.max(0, st.size - +m[2]), b = m[1] && m[2] ? Math.min(+m[2], st.size - 1) : st.size - 1;
    if (a > b || a >= st.size) { res.writeHead(416, { 'content-range': `bytes */${st.size}` }); return res.end(); }
    res.writeHead(206, { ...h, 'content-range': `bytes ${a}-${b}/${st.size}`, 'content-length': b - a + 1 });
    return req.method === 'HEAD' ? res.end() : createReadStream(f, { start: a, end: b }).pipe(res);
  }
  res.writeHead(200, { ...h, 'content-length': st.size });
  if (req.method === 'HEAD') return res.end();
  createReadStream(f).pipe(res);
}
// Escucha solo en 127.0.0.1. Rechaza otros Host (DNS rebinding) y escrituras que vengan de
// otras páginas (Origin distinto): solo el navegador de esta máquina, desde estas páginas.
function servidorLocal(A, manejar, alListo) {
  const puerto = +(A.puerto || 4321);
  const srv = createServer(async (req, res) => {
    const host = String(req.headers.host || '');
    if (!/^(127\.0\.0\.1|localhost)(:\d+)?$/i.test(host)) { res.writeHead(403, { 'content-type': 'text/plain; charset=utf-8' }); return res.end('Solo se puede abrir desde esta máquina (127.0.0.1).'); }
    if (!['GET', 'HEAD'].includes(req.method) && req.headers.origin && req.headers.origin !== `http://${host}`) return json(res, 403, { error: 'Origen no permitido' });
    let url, ruta;
    try { url = new URL(req.url, 'http://x'); ruta = decodeURIComponent(url.pathname); } catch (e) { return json(res, 400, { error: 'URL inválida' }); }
    if (ruta.includes('\0')) return json(res, 400, { error: 'URL inválida' });
    try { await manejar(req, res, ruta, url); }
    catch (e) { if (!res.headersSent) json(res, e.status || 500, { error: e.message, ...(e.extra || {}) }); else res.end(); }
  });
  srv.requestTimeout = 0; // subidas grandes y el canal de eventos no se cortan solos
  let intentos = 0;
  srv.on('error', (e) => {
    if (e.code === 'EADDRINUSE' && !A.puerto && intentos++ < 30) return srv.listen(puerto + intentos, '127.0.0.1');
    fallar(e.code === 'EADDRINUSE' ? `El puerto ${A.puerto} está ocupado: probá con otro (--puerto 4400) o cerrá el que lo usa.` : e.message);
  });
  srv.listen(puerto, '127.0.0.1', () => alListo(`http://127.0.0.1:${srv.address().port}/`));
  return srv;
}

// Archivos de texto que se pueden editar desde el tablero: solo dentro de proyecto/
const EXT_TEXTO = /\.(js|cjs|mjs|json|css|html?|md|txt|svg|csv|ya?ml)$/i;
const GENERADOS = /^(estado|manifiesto|galeria|glifos)\.js$/;
function rutaEnProyecto(P, r) {
  r = String(r || '').replace(/\\/g, '/').replace(/^\/+/, '');
  if (!r || r.length > 400 || r.split('/').some((x) => !x || x === '.' || x === '..')) throw error(400, 'Ruta inválida');
  const base = join(P, 'proyecto'), f = resolve(base, r);
  if (!f.startsWith(base + sep)) throw error(403, 'Fuera de proyecto/');
  if (!EXT_TEXTO.test(f)) throw error(415, 'Solo se editan archivos de texto (.js, .json, .css, .html, .md, .svg…)');
  try { if (!realpathSync(existsSync(f) ? f : dirname(f)).startsWith(realpathSync(base))) throw error(403, 'Fuera de proyecto/'); } catch (e) { if (e.status) throw e; }
  return { r, f };
}
function archivosDeTexto(P) {
  const base = join(P, 'proyecto'), out = [];
  const ver = (d) => { for (const n of readdirSync(d).sort()) {
    if (n.startsWith('.') || n === 'node_modules') continue;
    const f = join(d, n), st = statSync(f), r = relative(base, f).split(sep).join('/');
    if (st.isDirectory()) ver(f);
    else if (EXT_TEXTO.test(n) && st.size <= LIM.archivo) out.push({ ruta: r, tam: st.size, mtime: Math.floor(st.mtimeMs), generado: GENERADOS.test(r) });
  } };
  if (existsSync(base)) ver(base);
  return out;
}
// Antes de escribir: que el JS compile y el JSON se lea (con la línea del error si se puede)
function validarTexto(r, txt) {
  if (/\.json$/i.test(r)) {
    try { const j = JSON.parse(txt); if (/^estado\//.test(r) && (!j || typeof j !== 'object')) return { error: 'Un estado tiene que ser un objeto ({ "rev": …, "v": … })' }; }
    catch (e) { const lc = /line (\d+) column (\d+)/.exec(e.message), pos = /position (\d+)/.exec(e.message); return { error: 'JSON inválido: ' + e.message, linea: lc ? +lc[1] : pos ? txt.slice(0, +pos[1]).split('\n').length : undefined }; }
  }
  if (/\.(js|cjs)$/i.test(r)) {
    try { new Script(txt, { filename: r }); }
    catch (e) { const m = /:(\d+)\r?\n/.exec(String(e.stack || '')); return { error: 'JavaScript inválido: ' + e.message, linea: m ? +m[1] : undefined }; }
  }
  return null;
}
function archivosDeSalida(P) {
  const base = join(P, 'salida'), out = [];
  const ver = (d) => { for (const n of readdirSync(d)) {
    if (n.startsWith('.') || out.length > 3000) continue;
    const f = join(d, n), st = statSync(f);
    if (st.isDirectory()) ver(f); else out.push({ ruta: relative(P, f).split(sep).join('/'), tam: st.size, mtime: Math.floor(st.mtimeMs) });
  } };
  if (existsSync(base)) ver(base);
  return out.sort((a, b) => b.mtime - a.mtime || a.ruta.localeCompare(b.ruta));
}

// Tareas que el tablero puede lanzar (las mismas del CLI), una a la vez por proyecto
const TAREAS = ['revisar', 'video', 'poster', 'marca', 'empaquetar', 'doctor'];
const NECESITA = { revisar: ['chrome', 'playwright'], video: ['chrome', 'playwright', 'ffmpeg'], poster: ['chrome', 'playwright'], marca: ['chrome', 'playwright'] };

// Todo lo que sirve un proyecto: sus archivos y su API en <raíz>/__tramoya/*. Lo usan
// `abrir` (un proyecto en /) y `estudio` (varios, cada uno en /p/<carpeta>/).
function proyectoHTTP(P) {
  regenerar(P);
  const clientes = new Set();
  let silencio = 0, tarea = null, t; // silencio: lo que escribe el propio servidor no recarga la página que guardó
  let cambio = 0; // último aviso: una pestaña que estuvo oculta lo compara al volver
  const avisar = (ev) => { cambio = Date.now(); const s = `data: ${JSON.stringify(ev)}\n\n`; clientes.forEach((r) => r.write(s)); };
  const latido = setInterval(() => clientes.forEach((r) => r.write(': ping\n\n')), 25000); latido.unref();
  // Si el agente (o alguien) cambia archivos del proyecto, las páginas abiertas se recargan
  let vigia = null;
  try {
    vigia = watch(join(P, 'proyecto'), { recursive: true }, (ev, archivo) => {
      if (!archivo || /^(estado|manifiesto|galeria)\.js$/.test(archivo) || Date.now() - silencio < 800) return;
      clearTimeout(t); t = setTimeout(() => {
        if (/^estado[\\/]/.test(archivo)) estadoJS(P);
        if (/^assets[\\/]/.test(archivo)) manifiesto(P);
        avisar({ tipo: 'archivo', archivo: archivo.split(sep).join('/') });
      }, 250);
    });
  } catch (e) { console.log(c.d(`(${basename(P)}: sin recarga automática, este sistema no deja vigilar carpetas)`)); }
  const vistaTarea = (desde = 0) => tarea && (({ hijo, log, total, ...r }) => ({ ...r, total, log: log.slice(Math.max(0, log.length - (total - Math.min(desde, total)))) }))(tarea);

  async function manejar(req, res, ruta, url) {
    if (ruta.startsWith('/__tramoya/')) {
      const api = ruta.slice('/__tramoya/'.length), M = req.method, tab = req.headers['x-tramoya-tab'] || '';
      if (api === 'hola') return json(res, 200, { tramoya: true, proyecto: idProyecto(P), carpeta: P, estilo: estiloDe(P), version: version(), skill: !!SKILL, cambio });
      if (api === 'eventos') {
        res.writeHead(200, { 'content-type': 'text/event-stream', 'cache-control': 'no-cache', connection: 'keep-alive' }); res.write(': hola\n\n');
        clientes.add(res); req.on('close', () => clientes.delete(res)); return;
      }
      if (api === 'estado' && M === 'GET') return json(res, 200, estadoJS(P));
      const mEst = api.match(/^estado\/([a-z0-9][a-z0-9-]{0,60})$/i);
      if (mEst) {
        const f = join(P, 'proyecto', 'estado', mEst[1] + '.json');
        if (M === 'PUT') {
          const d = await cuerpoJSON(req);
          if (!d || typeof d !== 'object' || !('v' in d)) return json(res, 400, { error: 'Falta v' });
          silencio = Date.now(); mkdirSync(dirname(f), { recursive: true });
          writeFileSync(f, JSON.stringify({ rev: +d.rev || Date.now(), v: d.v }, null, 2) + '\n');
        } else if (M === 'DELETE') { silencio = Date.now(); rmSync(f, { force: true }); }
        else return json(res, 405, { error: 'Método' });
        estadoJS(P); silencio = Date.now();
        avisar({ tipo: 'estado', sub: mEst[1], tab });
        return json(res, 200, { ok: true });
      }
      if (api === 'pendientes') return json(res, 200, { proyecto: idProyecto(P), estilo: estiloDe(P), items: pendientesDe(P, leerEstado(P, false), { todas: true }) });
      if (api === 'estilo' && M === 'PUT') {
        const { id } = await cuerpoJSON(req);
        silencio = Date.now(); const n = aplicarEstilo(P, String(id || '')); silencio = Date.now();
        avisar({ tipo: 'archivo', archivo: 'estilo/estilo.js', tab });
        return json(res, 200, { ok: true, estilo: n });
      }
      if (api === 'galeria') {
        const g = galeria(P), info = {};
        g.motor.forEach((id) => { info[id] = infoEstilo(join(P, 'estilos', id, 'estilo.js')); });
        g.proyecto.forEach((id) => { info['proyecto:' + id] = infoEstilo(join(P, 'proyecto', 'estilos', id, 'estilo.js')); });
        return json(res, 200, { ...g, elegido: estiloDe(P), info });
      }
      if (api === 'subir' && M === 'PUT') {
        const carpeta = url.searchParams.get('carpeta') || 'img', nombre = basename(url.searchParams.get('nombre') || 'archivo').replace(/[^\w.\-]+/g, '-').replace(/^\.+/, '').toLowerCase() || 'archivo';
        if (!/^(img|video|logo|fonts|audio|referencias)$/.test(carpeta)) return json(res, 400, { error: 'Carpeta no permitida' });
        const datos = await cuerpo(req, LIM.subir), dir = join(P, 'proyecto', 'assets', carpeta); mkdirSync(dir, { recursive: true });
        silencio = Date.now(); writeFileSync(join(dir, nombre), datos);
        const m = manifiesto(P); silencio = Date.now();
        return json(res, 200, { ruta: `../proyecto/assets/${carpeta}/${nombre}`, manifiesto: m });
      }
      if (api === 'paquete.zip') {
        const z = paquete(P, { soloProyecto: url.searchParams.has('solo-proyecto') });
        res.writeHead(200, { 'content-type': 'application/zip', 'content-disposition': `attachment; filename="${idProyecto(P)}${url.searchParams.has('solo-proyecto') ? '-proyecto' : ''}.zip"` }); return res.end(z);
      }
      // Editor de código del tablero
      if (api === 'archivos') return json(res, 200, { archivos: archivosDeTexto(P) });
      if (api === 'archivo') {
        const { r, f } = rutaEnProyecto(P, url.searchParams.get('ruta'));
        if (M === 'GET') {
          if (!existsSync(f)) return json(res, 404, { error: 'No existe proyecto/' + r });
          return json(res, 200, { ruta: r, texto: readFileSync(f, 'utf8'), mtime: Math.floor(statSync(f).mtimeMs), generado: GENERADOS.test(r) });
        }
        if (M === 'PUT') {
          if (GENERADOS.test(r)) return json(res, 403, { error: `proyecto/${r} es generado: se rehace solo (editá lo que lo genera).` });
          const txt = (await cuerpo(req, LIM.archivo)).toString('utf8'), base = req.headers['x-tramoya-mtime'];
          if (base && existsSync(f) && !url.searchParams.has('forzar') && Math.floor(statSync(f).mtimeMs) !== +base)
            return json(res, 409, { error: 'El archivo cambió en el disco desde que lo abriste (¿lo editó el agente?).', mtime: Math.floor(statSync(f).mtimeMs) });
          const mal = validarTexto(r, txt);
          if (mal) return json(res, 422, mal);
          mkdirSync(dirname(f), { recursive: true }); writeFileSync(f, txt);
          if (/^estado\//.test(r)) estadoJS(P);
          return json(res, 200, { ok: true, ruta: r, mtime: Math.floor(statSync(f).mtimeMs) });
        }
        return json(res, 405, { error: 'Método' });
      }
      if (api === 'salidas') return json(res, 200, { archivos: archivosDeSalida(P) });
      if (api === 'doctor') return json(res, 200, { items: diagnostico(P) });
      if (api === 'tarea') {
        if (M === 'GET') return json(res, 200, { tarea: vistaTarea(+url.searchParams.get('desde') || 0) });
        if (M === 'DELETE') {
          if (tarea?.corriendo && tarea.hijo) {
            tarea.cancelada = true;
            if (platform() === 'win32') spawn('taskkill', ['/pid', String(tarea.hijo.pid), '/T', '/F']);
            else try { process.kill(-tarea.hijo.pid, 'SIGTERM'); } catch (e) { tarea.hijo.kill('SIGTERM'); }
          }
          return json(res, 200, { tarea: vistaTarea() });
        }
        if (M !== 'POST') return json(res, 405, { error: 'Método' });
        const { cmd, args: a = [] } = await cuerpoJSON(req);
        if (!TAREAS.includes(cmd)) return json(res, 400, { error: `Tarea desconocida: ${cmd}. Se puede: ${TAREAS.join(', ')}` });
        if (!Array.isArray(a) || a.length > 30 || a.some((x) => typeof x !== 'string' || x.length > 300 || x.includes('..') || /^[\\/~]|^[a-z]:/i.test(x) || /^--en(=|$)/.test(x)))
          return json(res, 400, { error: 'Argumentos no permitidos' });
        if (tarea?.corriendo) return json(res, 409, { error: `Ya hay una tarea corriendo (${tarea.cmd}). Esperá a que termine o cancelala.` });
        const diag = diagnostico(P), falta = (NECESITA[cmd] || []).map((k) => diag.find((d) => d.clave === k)).filter((d) => !d.ok);
        if (cmd === 'revisar' && a[0] === 'video') falta.length = 0;
        if (falta.length) return json(res, 424, { error: `Para ${cmd} falta: ${falta.map((d) => d.nombre).join(', ')}`, falta });
        let args = a;
        if (cmd === 'empaquetar') { mkdirSync(join(P, 'salida'), { recursive: true }); const solo = a.includes('--solo-proyecto'); args = ['-o', join('salida', `${idProyecto(P)}${solo ? '-proyecto' : ''}.zip`), ...(solo ? ['--solo-proyecto'] : [])]; }
        const hijo = spawn(process.execPath, [CLI, cmd, ...args, '--en', P], { cwd: P, detached: platform() !== 'win32', windowsHide: true, env: { ...process.env, NO_COLOR: '1', FORCE_COLOR: '0' } });
        tarea = { id: Date.now(), cmd, args: a, inicio: Date.now(), fin: null, codigo: null, corriendo: true, cancelada: false, log: '', total: 0, hijo };
        const T = tarea, sumar = (d) => { const s = String(d); T.log += s; T.total += s.length; if (T.log.length > 400000) T.log = T.log.slice(-300000); };
        hijo.stdout.on('data', sumar); hijo.stderr.on('data', sumar);
        hijo.on('error', (e) => { sumar(`\n${e.message}\n`); });
        hijo.on('close', (code, sig) => { T.corriendo = false; T.fin = Date.now(); T.codigo = code ?? (sig ? -1 : 1); T.hijo = null; });
        return json(res, 200, { tarea: vistaTarea() });
      }
      return json(res, 404, { error: 'No existe: ' + ruta });
    }
    // Archivos del proyecto
    let f = resolve(P, '.' + ruta);
    if (f !== P && !f.startsWith(P + sep)) return json(res, 403, { error: 'Fuera del proyecto' });
    if (existsSync(f) && statSync(f).isDirectory()) {
      if (!ruta.endsWith('/')) { res.writeHead(301, { location: (url.pathname + '/').replace(/^\/+/, '/') + url.search }); return res.end(); }
      f = join(f, 'index.html');
    }
    if (!existsSync(f)) { res.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' }); return res.end('No existe: ' + ruta); }
    return servirArchivo(req, res, f, { descargar: url.searchParams.has('descargar') });
  }
  return { P, manejar, cerrar() { clearInterval(latido); vigia?.close(); clientes.forEach((r) => r.end()); } };
}

// El estudio: una carpeta de trabajo con varios proyectos (ella misma y sus subcarpetas de
// primer nivel). Inicio en /, cada proyecto en /p/<carpeta>/ y la API del espacio en /__estudio/*.
const nombreDe = (P) => { try { const t = readFileSync(join(P, 'proyecto', 'proyecto.js'), 'utf8'), m = (k) => ((t.match(new RegExp(`\\n\\s*${k}:\\s*(['"])((?:\\\\.|(?!\\1).)*)\\1`)) || [])[2] || '').replace(/\\(.)/g, '$1'); return { nombre: m('nombre').replace(/\*/g, '') || basename(P), descripcion: m('descripcion') }; } catch (e) { return { nombre: basename(P), descripcion: '' }; } };
const infoEstilo = (f) => { try { const t = readFileSync(f, 'utf8'); const m = (k) => (t.match(new RegExp(`\\b${k}:\\s*['"]([^'"]+)['"]`)) || [])[1] || ''; return { nombre: m('nombre'), descripcion: m('descripcion') }; } catch (e) { return { nombre: '', descripcion: '' }; } };
function estudioHTTP(W) {
  const montados = new Map(); // clave → { P, h }
  function buscar() {
    const out = [], usadas = new Set(), agregar = (clave, P) => { let k = clave, i = 2; while (usadas.has(k)) k = `${clave}-${i++}`; usadas.add(k); out.push({ clave: k, P }); };
    if (esProyecto(W)) agregar(basename(W), W);
    for (const n of readdirSync(W).sort()) {
      if (n.startsWith('.') || n === 'node_modules') continue;
      try { const d = join(W, n); if (statSync(d).isDirectory() && esProyecto(d)) agregar(n, d); } catch (e) {}
    }
    for (const { clave, P } of out) if (montados.get(clave)?.P !== P) { montados.get(clave)?.h?.cerrar(); montados.set(clave, { P, h: null }); }
    return out;
  }
  function info({ clave, P }) {
    const fechas = [];
    for (const d of [join(P, 'proyecto'), join(P, 'proyecto', 'estado')]) try { for (const n of readdirSync(d)) if (/\.(js|json)$/.test(n) && !/^(estado|manifiesto|galeria|glifos)\.js$/.test(n)) fechas.push(statSync(join(d, n)).mtimeMs); } catch (e) {}
    const E = leerEstado(P, false);
    return { clave, url: `/p/${encodeURIComponent(clave)}/`, id: idProyecto(P), ...nombreDe(P), estilo: estiloDe(P), carpeta: P, relativa: relative(W, P) || '.', fecha: fechas.length ? new Date(Math.max(...fechas)).toISOString() : null,
      pendientes: pendientesDe(P, E).length, editadas: Object.keys(E).filter((s) => s !== 'pedidos') };
  }
  const montar = (clave) => { let m = montados.get(clave); if (!m) { buscar(); m = montados.get(clave); } if (!m) return null; m.h ||= proyectoHTTP(m.P); return m; };
  async function manejar(req, res, ruta, url) {
    if (ruta === '/' || ruta === '/index.html') return servirArchivo(req, res, join(AQUI, 'estudio.html'));
    const mp = ruta.match(/^\/p\/([^/]+)(\/.*)?$/);
    if (mp) {
      if (!mp[2]) { res.writeHead(301, { location: `/p/${encodeURIComponent(mp[1])}/${url.search}` }); return res.end(); }
      const m = montar(mp[1]);
      if (!m) { res.writeHead(404, { 'content-type': 'text/html; charset=utf-8' }); return res.end(`<meta charset="utf-8"><p style="font:16px system-ui;padding:40px">No hay un proyecto «${mp[1].replace(/[<>&"]/g, '')}» en ${W.replace(/[<>&"]/g, '')}. <a href="/">Volver al estudio</a></p>`); }
      return m.h.manejar(req, res, mp[2], url);
    }
    if (!ruta.startsWith('/__estudio/')) { res.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' }); return res.end('No existe: ' + ruta); }
    const api = ruta.slice('/__estudio/'.length), M = req.method;
    if (api === 'hola') return json(res, 200, { estudio: true, carpeta: W, version: version(), skill: !!SKILL });
    if (api === 'proyectos') return json(res, 200, { carpeta: W, proyectos: buscar().map(info) });
    if (api === 'estilos') { const base = join(MOTOR, 'estilos'); return json(res, 200, { estilos: idsEn(base).map((id) => ({ id, ...infoEstilo(join(base, id, 'estilo.js')) })) }); }
    if (api === 'nuevo' && M === 'POST') {
      const { nombre, estilo } = await cuerpoJSON(req), n = String(nombre || '').trim().slice(0, 80);
      if (!n) return json(res, 400, { error: 'Poné un nombre' });
      if (estilo && !/^[a-z0-9-]+$/.test(String(estilo))) return json(res, 400, { error: 'Estilo inválido' });
      const dest = carpetaLibre(W, n), ids = new Set(buscar().map((x) => idProyecto(x.P)));
      try { crearProyecto(dest, { nombre: n, id: idUnico(ids, idDe(n)), estilo: estilo || null }); } catch (e) { return json(res, 400, { error: e.message }); }
      const p = buscar().find((x) => x.P === dest);
      return json(res, 200, { ok: true, ...info(p) });
    }
    if (api === 'importar' && M === 'PUT') {
      const datos = await cuerpo(req, LIM.zip), nombre = String(url.searchParams.get('nombre') || 'proyecto.zip');
      let r;
      try { r = normalizarImport(unzip(datos)); } catch (e) { return json(res, 400, { error: e.message }); }
      const dest = carpetaLibre(W, r.carpeta || basename(nombre, extname(nombre))), ids = new Set(buscar().map((x) => idProyecto(x.P)));
      instalarImport(r.archivos, dest);
      // Dos proyectos con el mismo id comparten lo guardado en el navegador: el traído se renombra
      if (ids.has(idProyecto(dest))) { const pj = join(dest, 'proyecto', 'proyecto.js'); writeFileSync(pj, readFileSync(pj, 'utf8').replace(/(\n\s*id:\s*)['"][^'"]*['"]/, `$1'${idUnico(ids, idProyecto(dest))}'`)); }
      const p = buscar().find((x) => x.P === dest);
      return json(res, 200, { ok: true, ...info(p) });
    }
    return json(res, 404, { error: 'No existe: ' + ruta });
  }
  return { W, buscar, manejar };
}

// ---------- Comandos ----------
const COMANDOS = {
  ayuda() {
    console.log(`${c.b('tramoya')} ${c.d(version())}  —  presentaciones, reels, pósters, landings y marca en HTML, con editor

${c.b('Proyecto')}
  iniciar [carpeta] [--nombre "X"] [--estilo id] [--skill-local]
                                                                todo en un paso: el proyecto de acá (o uno nuevo en ./tramoya) + el estudio
  estudio [carpeta] [--puerto 4321] [--sin-navegador]           el estudio en el navegador: los proyectos de la carpeta, cada uno con su tablero
  nuevo <carpeta> [--nombre "Mi proyecto"] [--estilo id]        crea un proyecto (motor + ejemplo)
  abrir [pieza] [--puerto 4321] [--sin-navegador]               un solo proyecto en el navegador, con editor que guarda en archivos
  estado [--json]                                               qué editó el usuario y qué correcciones hay pendientes
  estilos · estilo <id>                                         galería de estilos · elegir uno (se copia a proyecto/estilo/)
  regenerar                                                     manifiesto de assets, galería y proyecto/estado.js
${c.b('Salidas')}  ${c.d('(necesitan playwright-core y Chrome; video también ffmpeg)')}
  revisar <motion|reel|poster|landing|marca|x.html> [...]        un PNG por punto clave + errores de consola
  video <motion|reel|x.html> [--fps 30] [--salida x.mp4] [...]   MP4
  poster [--formato A3] [--dpi 300]                              PNG 300 dpi y PDF
  marca [--png]                                                  SVG/PNG de cada variante del logo
${c.b('Llevar')}
  empaquetar [-o archivo.zip] [--solo-proyecto]                 un zip con todo (o solo proyecto/)
  importar <archivo.zip|carpeta> [destino]                      lo trae (si es solo proyecto/, le pone el motor)
  actualizar                                                    copia el motor nuevo encima (proyecto/ no se toca)
${c.b('Skill')}
  instalar [--agentes claude,codex,…] [--copiar]                instala la skill en los agentes de esta máquina
  doctor                                                        revisa Node, Chrome, ffmpeg y playwright-core

Opción común: --en <carpeta del proyecto> (si no, se busca desde el directorio actual o en ./tramoya)`);
  },

  nuevo(A) {
    const nombre = A.nombre && A.nombre !== true ? String(A.nombre) : null;
    let r;
    try { r = crearProyecto(resolve(A._[0] || 'tramoya'), { nombre, id: A.id && A.id !== true ? A.id : null, estilo: A.estilo && A.estilo !== true ? A.estilo : null, forzar: !!A.forzar }); } catch (e) { fallar(e.message); }
    const { dest, id } = r, cli = relative(process.cwd(), join(dest, 'herramientas', 'tramoya.mjs')) || 'herramientas/tramoya.mjs';
    console.log(`${c.g('✓')} Proyecto «${id}» en ${dest}${estiloDe(dest) ? ` con el estilo «${estiloDe(dest)}»` : ' (sin estilo: elegilo en el tablero, con `tramoya estilos` / `tramoya estilo <id>` o en la galería)'}
  Datos: proyecto/proyecto.js · guion: proyecto/escenas.js · imágenes: proyecto/assets/img/
  Abrir el estudio en el navegador: node ${cli} estudio${relative(process.cwd(), dest) ? ' ' + JSON.stringify(relative(process.cwd(), dest)).replace(/^"(.*)"$/, (m, x) => (/\s/.test(x) ? m : x)) : ''}   ${c.d('(o doble clic en «Abrir estudio»)')}`);
  },

  // Un proyecto solo, en / (como siempre)
  abrir(A) {
    const P = proyecto(A), h = proyectoHTTP(P);
    servidorLocal(A, h.manejar, (base) => {
      const pieza = A._[0] ? (A._[0].endsWith('.html') ? A._[0] : A._[0].replace(/\/$/, '') + '/') : '';
      console.log(`${c.g('✓')} ${idProyecto(P)} abierto en ${c.b(base + pieza)}  ${c.d('(Ctrl+C para cerrar)')}
  Lo que se edita en el navegador se guarda en proyecto/estado/ (lo lee \`tramoya estado\`).`);
      if (!A['sin-navegador']) abrirNavegador(base + pieza);
    });
  },

  // Varios proyectos de una carpeta: inicio del estudio en /, cada uno en /p/<carpeta>/
  estudio(A) {
    const W = resolve(A._[0] || '.');
    if (!existsSync(W) || !statSync(W).isDirectory()) fallar(`${W} no es una carpeta.`);
    const e = estudioHTTP(W);
    servidorLocal(A, e.manejar, (base) => {
      const lista = e.buscar(), elegido = A.abrir && A.abrir !== true ? lista.find((p) => p.clave === A.abrir || p.P === resolve(String(A.abrir))) : lista.length === 1 ? lista[0] : null;
      const destino = elegido ? `p/${encodeURIComponent(elegido.clave)}/` : '';
      console.log(`${c.g('✓')} Estudio de Tramoya en ${c.b(base)}  ${c.d(`(${W} · Ctrl+C para cerrar)`)}`);
      lista.forEach((p) => console.log(`  · ${p.clave.padEnd(20)} ${base}p/${encodeURIComponent(p.clave)}/`));
      if (!lista.length) console.log(c.d('  (no hay proyectos todavía: crealos desde el navegador)'));
      if (elegido) console.log(`Tablero: ${c.b(base + destino)}`);
      console.log(c.d('Lo que se edita se guarda en proyecto/estado/ de cada proyecto; los pedidos al agente se leen con `tramoya estado`.'));
      if (!A['sin-navegador']) abrirNavegador(base + destino);
    });
  },

  // Todo en un paso: el proyecto de acá (o uno nuevo en ./tramoya), la skill en el repo si se
  // pide, y el estudio abierto en el tablero
  iniciar(A) {
    const pedido = A._[0] ? resolve(A._[0]) : null;
    let P = pedido ? (esProyecto(pedido) ? pedido : null) : proyecto({ en: A.en }, false);
    if (!P) {
      const dest = pedido || resolve('tramoya');
      const nombre = A.nombre && A.nombre !== true ? String(A.nombre) : basename(pedido || process.cwd());
      try { P = crearProyecto(dest, { nombre, estilo: A.estilo && A.estilo !== true ? A.estilo : null, forzar: !!A.forzar }).dest; } catch (e) { fallar(e.message); }
      console.log(`${c.g('✓')} Proyecto nuevo «${idProyecto(P)}» en ${P}${estiloDe(P) ? ` (estilo «${estiloDe(P)}»)` : ''}`);
    } else {
      console.log(`${c.g('✓')} Proyecto «${idProyecto(P)}» en ${P}`);
      if (A.estilo && A.estilo !== true) { try { aplicarEstilo(P, String(A.estilo)); console.log(`${c.g('✓')} Estilo «${A.estilo}»`); } catch (e) { fallar(e.message); } }
    }
    if (A['skill-local']) skillLocal(process.cwd()).forEach((d) => console.log(`${c.g('✓')} Skill en ${d}`));
    const W = P === process.cwd() ? P : dirname(P); // el estudio muestra la carpeta y sus vecinos
    COMANDOS.estudio({ ...A, _: [W], abrir: P });
  },

  estado(A) {
    const P = proyecto(A); regenerar(P);
    const E = estadoJS(P), out = { proyecto: idProyecto(P), carpeta: P, estilo: estiloDe(P), piezas: {}, pendientes: [] };
    for (const [sub, { rev }] of Object.entries(E)) out.piezas[sub] = { archivo: `proyecto/estado/${sub}.json`, guardado: rev ? new Date(rev).toISOString() : null };
    // Las imágenes de los pedidos, relativas a la carpeta del proyecto (no a las páginas)
    out.pendientes = pendientesDe(P, E).map(({ hecho, ...p }) => (p.imagenes ? { ...p, imagenes: p.imagenes.map((r) => String(r).replace(/^\.\.\//, '')) } : p));
    if (A.json) return console.log(JSON.stringify(out, null, 2));
    console.log(`${c.b(out.proyecto)} ${c.d(P)}\nEstilo: ${out.estilo || c.y('ninguno elegido (neutro)')}`);
    const subs = Object.keys(out.piezas);
    console.log(subs.length ? 'Editado en el navegador (manda sobre proyecto/*.js):' : 'Nada editado en el navegador todavía: mandan los archivos de proyecto/.');
    subs.forEach((s) => console.log(`  · ${s.padEnd(14)} ${out.piezas[s].archivo}  ${c.d(out.piezas[s].guardado || '')}`));
    if (out.pendientes.length) {
      console.log(`\n${c.y(out.pendientes.length + ' pendiente(s): pedidos del tablero, correcciones y observaciones')}`);
      out.pendientes.forEach((p, i) => console.log(p.pieza === 'pedido' ? `  ${i + 1}. [pedido · ${p.tipo || 'general'}] ${p.texto || ''}${p.links?.length ? c.d(' · ' + p.links.join(' ')) : ''}${p.imagenes?.length ? c.d(' · imágenes: ' + p.imagenes.join(', ')) : ''}` : `  ${i + 1}. [${p.pieza}${p.escena ? ` · escena ${p.escena} paso ${p.paso ?? '?'}` : ''}${p.parte ? ` · ${p.parte}` : ''}${p.elemento ? ` · ${p.elemento}` : ''}${p.x != null ? ` · (${p.x}, ${p.y})` : ''}] ${p.texto || '(sin texto)'}${p.cita ? c.d(` «${p.cita}»`) : ''}`));
    }
  },

  estilos(A) {
    const P = proyecto(A, false), base = P || MOTOR;
    const g = { motor: idsEn(join(base, 'estilos')), proyecto: P ? idsEn(join(P, 'proyecto', 'estilos')) : [] };
    const info = (f) => { const t = readFileSync(f, 'utf8'); const m = (k) => (t.match(new RegExp(`\\b${k}:\\s*['"]([^'"]+)['"]`)) || [])[1] || ''; return { nombre: m('nombre'), descripcion: m('descripcion') }; };
    const filas = [...g.motor.map((id) => ({ id, ...info(join(base, 'estilos', id, 'estilo.js')) })), ...g.proyecto.map((id) => ({ id: 'proyecto:' + id, ...info(join(P, 'proyecto', 'estilos', id, 'estilo.js')) }))];
    if (A.json) return console.log(JSON.stringify({ elegido: P && estiloDe(P), estilos: filas }, null, 2));
    console.log(`Estilos ${P ? c.d(`(elegido: ${estiloDe(P) || 'ninguno'})`) : ''}`);
    filas.forEach((f) => console.log(`  ${c.b(f.id.padEnd(22))} ${f.nombre}${f.descripcion ? c.d(' — ' + f.descripcion) : ''}`));
    console.log(c.d(`\nVer: estilos/index.html (galería) o cualquier pieza con ?estilo=<id>. Elegir: tramoya estilo <id>.`));
  },
  estilo(A) {
    const P = proyecto(A), id = A._[0];
    if (!id) return console.log(`Estilo: ${estiloDe(P) || 'ninguno (neutro)'}. Para cambiarlo: tramoya estilo <id> (lista: tramoya estilos)`);
    regenerar(P);
    try { aplicarEstilo(P, String(id)); } catch (e) { fallar(e.message); }
    console.log(`${c.g('✓')} Estilo «${id}» copiado a proyecto/estilo/. Lo guardado en las piezas se mantiene.`);
  },
  regenerar(A) { const P = proyecto(A), E = regenerar(P); console.log(`${c.g('✓')} manifiesto.js y estado.js (${Object.keys(E).length} pieza(s) con estado)`); },
  manifiesto(A) { const m = manifiesto(proyecto(A)); console.log(`${c.g('✓')} manifiesto:`, Object.fromEntries(Object.entries(m).map(([k, v]) => [k, v.length]))); },

  empaquetar(A) {
    const P = proyecto(A), id = idProyecto(P), solo = !!A['solo-proyecto'];
    const dest = resolve(A.salida || `${id}${solo ? '-proyecto' : ''}.zip`);
    writeFileSync(dest, paquete(P, { soloProyecto: solo }));
    console.log(`${c.g('✓')} ${dest} ${c.d(`(${(statSync(dest).size / 1048576).toFixed(1)} MB${solo ? ', solo proyecto/: se abre con `tramoya importar`' : ', se abre descomprimiendo y con doble clic en index.html'})`)}`);
  },

  importar(A) {
    const origen = A._[0] ? resolve(A._[0]) : fallar('Uso: tramoya importar <archivo.zip|carpeta> [destino]');
    if (!existsSync(origen)) fallar(`No existe ${origen}`);
    let r, hecho;
    try {
      r = normalizarImport(statSync(origen).isDirectory() ? listar(origen).map((n) => ({ nombre: n, datos: readFileSync(join(origen, n)) })) : unzip(readFileSync(origen)));
      hecho = instalarImport(r.archivos, resolve(A._[1] || r.carpeta || basename(origen, extname(origen))), { forzar: !!A.forzar });
    } catch (e) { fallar(e.message); }
    console.log(`${c.g('✓')} Importado en ${hecho.dest}${hecho.traiaMotor ? '' : ' (con el motor de esta versión)'}. Abrilo con: tramoya estudio ${relative(process.cwd(), dirname(hecho.dest)) || '.'}`);
  },

  actualizar(A) {
    if (!SKILL) fallar('`actualizar` se corre desde la skill (scripts/tramoya.mjs), que es la que trae el motor nuevo.');
    const P = proyecto(A);
    copiarMotor(P, { limpiar: true });
    if (!existsSync(join(P, 'proyecto', 'estado.js'))) estadoJS(P);
    const antes = existsSync(join(P, '.tramoya-version')) ? readFileSync(join(P, '.tramoya-version'), 'utf8').trim() : '?';
    writeFileSync(join(P, '.tramoya-version'), version() + '\n');
    regenerar(P);
    console.log(`${c.g('✓')} Motor actualizado ${antes} → ${version()} en ${P} (proyecto/ no se tocó)`);
  },

  doctor(A) {
    const P = proyecto(A, false);
    for (const d of diagnostico(P)) console.log(`${d.ok ? c.g('✓') : d.opcional ? c.y('·') : c.r('✗')} ${d.texto}${!d.ok && d.ayuda ? c.d('  → ' + d.ayuda) : ''}`);
    console.log(P ? `Proyecto: ${P}` : c.d('(no hay un proyecto en este directorio)'));
  },

  instalar(A) {
    if (!SKILL) fallar('`instalar` se corre desde la skill (scripts/tramoya.mjs).');
    const H = homedir();
    const AGENTES = { claude: join(H, '.claude'), codex: join(H, '.codex'), cursor: join(H, '.cursor'), gemini: join(H, '.gemini'), opencode: join(H, '.config', 'opencode'), agentes: join(H, '.agents') };
    const pedidos = A.agentes && A.agentes !== true ? String(A.agentes).split(',') : Object.keys(AGENTES).filter((k) => existsSync(AGENTES[k]));
    if (!pedidos.length) pedidos.push('agentes');
    const copias = [];
    for (const k of pedidos) {
      if (!AGENTES[k]) { console.log(c.y(`! agente desconocido: ${k} (conocidos: ${Object.keys(AGENTES).join(', ')})`)); continue; }
      const dir = join(AGENTES[k], 'skills'), dest = join(dir, 'tramoya');
      mkdirSync(dir, { recursive: true });
      if (resolve(dest) === SKILL) { console.log(`${c.g('✓')} ${k}: ya está en ${dest}`); continue; }
      rmSync(dest, { recursive: true, force: true });
      let enlazado = false;
      // Desde npx la skill vive en una caché que npm puede borrar: ahí se copia, no se enlaza
      const temporal = SKILL.split(sep).some((x) => x === '_npx' || x === 'node_modules');
      if (!A.copiar && !temporal) { const r = spawnSync(platform() === 'win32' ? 'cmd' : 'ln', platform() === 'win32' ? ['/c', 'mklink', '/J', dest, SKILL] : ['-s', SKILL, dest]); enlazado = r.status === 0; }
      if (!enlazado) cpSync(SKILL, dest, { recursive: true, filter: (s) => !relative(SKILL, s).split(sep).some((x) => ['.git', 'salida', 'node_modules'].includes(x)) });
      if (!enlazado) copias.push(dest);
      console.log(`${c.g('✓')} ${k}: ${dest} ${c.d(enlazado ? '(enlace: se actualiza con git pull)' : '(copia)')}`);
    }
    // playwright-core donde quede para siempre: en la skill enlazada, o en la primera copia
    const durable = SKILL.split(sep).some((x) => x === '_npx' || x === 'node_modules') ? copias[0] : SKILL;
    if (!A['sin-dependencias'] && durable && !existsSync(join(durable, 'motor', 'node_modules', 'playwright-core', 'package.json')) && !(durable === SKILL && playwright())) {
      console.log(c.d('Instalando playwright-core (para revisar y exportar)…'));
      const r = spawnSync('npm', ['install', '--no-audit', '--no-fund'], { cwd: join(durable, 'motor'), stdio: 'inherit', shell: platform() === 'win32' });
      if (r.status !== 0) console.log(c.y('! No se pudo instalar playwright-core: el editor funciona igual; para exportar corré npm install en ' + join(durable, 'motor')));
    }
    console.log(`\nListo. Pedile a tu agente, por ejemplo: «haceme una presentación sobre …». Para revisar lo que falta: node ${join(SKILL, 'scripts', 'tramoya.mjs')} doctor`);
  },
};

// playwright-core: el del proyecto, el de la skill o el de PLAYWRIGHT_DIR
function playwright(P) {
  // Desde la copia del CLI que va en un proyecto: también la skill instalada en algún agente
  const H = homedir(), instaladas = ['.claude', '.codex', '.cursor', '.gemini', join('.config', 'opencode'), '.agents'].map((a) => join(H, a, 'skills', 'tramoya', 'motor', 'node_modules'));
  const cands = [process.env.PLAYWRIGHT_DIR, P && join(P, 'node_modules'), join(MOTOR, 'node_modules'), SKILL && join(SKILL, 'node_modules'), SKILL && basename(dirname(SKILL)) === 'node_modules' && dirname(SKILL), ...instaladas, join(H, '.local', 'share', 'tramoya', 'motor', 'node_modules')].filter(Boolean);
  return cands.find((d) => existsSync(join(d, 'playwright-core', 'package.json'))) || null;
}
// revisar, video, poster, marca: los scripts de render del proyecto, con el estado al día
for (const cmd of ['revisar', 'video', 'poster', 'marca']) {
  COMANDOS[cmd] = (A, crudos) => {
    const P = proyecto(A);
    regenerar(P);
    const pw = playwright(P);
    if (!pw) fallar(`Falta playwright-core. Corré: npm install --prefix "${SKILL ? join(SKILL, 'motor') : P}" (o instalá la skill: bash instalar.sh)`);
    const resto = crudos.filter((a, i) => !(a === '--en' || crudos[i - 1] === '--en' || a.startsWith('--en=')));
    const r = spawnSync(process.execPath, [join(P, 'render', `${cmd}.mjs`), ...resto], { cwd: P, stdio: 'inherit', env: { ...process.env, PLAYWRIGHT_DIR: pw } });
    process.exit(r.status ?? 1);
  };
}

const [cmd = 'ayuda', ...resto] = process.argv.slice(2);
const f = COMANDOS[cmd] || COMANDOS[{ help: 'ayuda', '-h': 'ayuda', '--help': 'ayuda', new: 'nuevo', open: 'abrir', status: 'estado', pack: 'empaquetar', import: 'importar', update: 'actualizar', install: 'instalar', init: 'iniciar', start: 'iniciar', studio: 'estudio' }[cmd]];
if (!f) { console.error(c.r(`Comando desconocido: ${cmd}`)); COMANDOS.ayuda(); process.exit(1); }
await f(args(resto), resto);
