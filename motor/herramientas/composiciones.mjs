// Composiciones (formato HyperFrames) dentro de un proyecto: crear, importar, dejar sin
// dependencias de internet y listar. Las usa herramientas/tramoya.mjs.
//
//   proyecto/composiciones/<id>.html          una composición suelta
//   proyecto/composiciones/<id>/index.html    un proyecto de HyperFrames entero (con compositions/, assets/…)
//
// Cada una carga, en un bloque marcado <!-- tramoya --> … <!-- /tramoya -->, nucleo/util.js,
// los datos del proyecto y nucleo/composicion.js: así se reproduce, se edita (variables) y
// se exporta con Tramoya, y sigue siendo un HTML de HyperFrames válido.
import { cpSync, existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync, appendFileSync } from 'node:fs';
import { basename, dirname, extname, join, relative, resolve, sep } from 'node:path';

const MARCA = /<!-- tramoya -->[\s\S]*?<!-- \/tramoya -->\n?/;
const REGISTRO = 'https://raw.githubusercontent.com/heygen-com/hyperframes/main/registry';
export const dirComposiciones = (P) => join(P, 'proyecto', 'composiciones');
const slug = (s) => String(s).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'composicion';
const posix = (p) => p.split(sep).join('/');

// El bloque que conecta la composición con Tramoya, con rutas relativas a donde esté
export function bloqueTramoya(P, archivo) {
  const a = (r) => posix(relative(dirname(archivo), join(P, r))) || '.';
  return `<!-- tramoya -->
<script src="${a('nucleo/util.js')}"></script>
<script src="${a('proyecto/proyecto.js')}"></script>
<script src="${a('proyecto/estilo/estilo.js')}"></script>
<script src="${a('proyecto/estado.js')}"></script>
<script src="${a('nucleo/composicion.js')}"></script>
<!-- /tramoya -->
`;
}
export function conectar(P, archivo) {
  let html = readFileSync(archivo, 'utf8').replace(MARCA, '');
  const b = bloqueTramoya(P, archivo);
  // Antes de cualquier otro script: getVariables() tiene que existir cuando corren los de la composición
  const m = html.match(/<head[^>]*>\n?/i);
  if (m) html = html.replace(m[0], m[0] + b);
  else if (/<html[^>]*>/i.test(html)) html = html.replace(/<html[^>]*>\n?/i, (x) => x + '<head>\n' + b + '</head>\n');
  else html = b + html;
  writeFileSync(archivo, html);
}

// ---------- Listar ----------
function atributo(html, nombre) { return (html.match(new RegExp(`<[^>]*data-composition-id[^>]*\\b${nombre}="([^"]*)"`)) || [])[1]; }
export function listar(P) {
  const D = dirComposiciones(P);
  if (!existsSync(D)) return [];
  const out = [];
  for (const n of readdirSync(D).sort()) {
    const f = statSync(join(D, n)).isDirectory() ? join(D, n, 'index.html') : join(D, n);
    if (!f.endsWith('.html') || !existsSync(f)) continue;
    const html = readFileSync(f, 'utf8');
    if (!/data-composition-id/.test(html)) continue;
    out.push({
      id: n.replace(/\.html$/, ''), archivo: posix(relative(P, f)),
      ancho: +(atributo(html, 'data-width') || 1920), alto: +(atributo(html, 'data-height') || 1080), dur: +(atributo(html, 'data-duration') || 0) || null,
      titulo: (html.match(/<title>([^<]*)<\/title>/i) || [])[1] || '', conectada: MARCA.test(html),
    });
  }
  return out;
}

// ---------- Nueva ----------
export async function nueva(P, id, { ancho = 1920, alto = 1080, dur = 6, fps = 30, gsap = true } = {}) {
  id = slug(id);
  const D = dirComposiciones(P), f = join(D, id + '.html');
  if (existsSync(f)) throw new Error(`Ya existe ${relative(P, f)}`);
  mkdirSync(D, { recursive: true });
  let gsapSrc = '';
  if (gsap) gsapSrc = (await bajar(P, 'https://cdn.jsdelivr.net/npm/gsap@3.14.2/dist/gsap.min.js', f)) || 'https://cdn.jsdelivr.net/npm/gsap@3.14.2/dist/gsap.min.js';
  const W = +ancho, H = +alto, vertical = H > W;
  writeFileSync(f, `<!doctype html>
<!-- Composición «${id}» (formato HyperFrames). Ver referencias/composiciones.md.
     Todo se mueve con la línea de GSAP (en pausa) o con @keyframes: nada de timers ni azar sin semilla. -->
<html lang="es" data-tramoya-estilo
  data-composition-variables='[
    { "id": "titulo", "type": "string", "label": "Título", "default": "Una idea, en movimiento." },
    { "id": "detalle", "type": "string", "label": "Detalle", "default": "Hecha con Tramoya" }
  ]'>
<head>
  <meta charset="utf-8" />
  <title>${id}</title>
  ${gsap ? `<script src="${gsapSrc}"></script>` : ''}
  <style>
    html, body { margin: 0; width: ${W}px; height: ${H}px; overflow: hidden; background: var(--bg, #0f0f10); color: var(--text, #f2efe8); }
    .clip { position: absolute; inset: 0; }
    .pad { position: absolute; inset: 0; display: grid; place-content: center; padding: ${Math.round(Math.min(W, H) * 0.09)}px; text-align: ${vertical ? 'center' : 'left'}; }
    h1 { font: 800 ${Math.round(Math.min(W, H) * 0.1)}px/1 var(--font-display, Georgia, serif); margin: 0; letter-spacing: -0.02em; }
    p { font: 500 ${Math.round(Math.min(W, H) * 0.035)}px/1.3 var(--font-body, system-ui, sans-serif); opacity: .7; margin: .8em 0 0; }
    .linea { height: 8px; width: 40%; background: var(--accent, #e0b04a); transform-origin: left; margin-top: 40px; ${vertical ? 'justify-self: center;' : ''} }
  </style>
</head>
<body>
  <div id="raiz" data-composition-id="${id}" data-start="0" data-duration="${dur}" data-width="${W}" data-height="${H}" data-fps="${fps}">
    <section id="${id}-a" class="clip" data-start="0" data-duration="${dur}">
      <div class="pad">
        <h1 id="titulo" data-var-text="titulo">Una idea, en movimiento.</h1>
        <div class="linea" id="linea"></div>
        <p id="detalle" data-var-text="detalle">Hecha con Tramoya</p>
      </div>
    </section>
  </div>
  <script>
    window.__timelines = window.__timelines || {};
    ${gsap ? `const tl = gsap.timeline({ paused: true });
    tl.from('#titulo', { y: 60, opacity: 0, duration: 0.9, ease: 'power3.out' }, 0.2)
      .from('#linea', { scaleX: 0, duration: 0.8, ease: 'power2.inOut' }, 0.6)
      .from('#detalle', { y: 20, opacity: 0, duration: 0.6, ease: 'power2.out' }, 0.9)
      .to('#titulo', { opacity: 0, y: -30, duration: 0.5, ease: 'power2.in' }, ${dur} - 0.7)
      .to(['#linea', '#detalle'], { opacity: 0, duration: 0.4 }, ${dur} - 0.6);
    window.__timelines['${id}'] = tl;` : ''}
  </script>
</body>
</html>
`);
  conectar(P, f);
  return f;
}

// ---------- Bajar lo que carga de internet ----------
// Un archivo de una CDN a proyecto/assets/vendor/<host>/<ruta>; devuelve la ruta relativa al HTML
async function bajar(P, url, desde) {
  const u = new URL(url);
  const dest = join(P, 'proyecto', 'assets', 'vendor', u.hostname, ...u.pathname.split('/').filter(Boolean).map((x) => x.replace(/[^\w.@-]+/g, '_')));
  if (!existsSync(dest)) {
    try {
      const r = await fetch(url);
      if (!r.ok) throw new Error('HTTP ' + r.status);
      mkdirSync(dirname(dest), { recursive: true });
      writeFileSync(dest, Buffer.from(await r.arrayBuffer()));
    } catch (e) { return null; }
  }
  return posix(relative(dirname(desde), dest));
}
export async function local(P, archivo) {
  let html = readFileSync(archivo, 'utf8');
  const urls = [...new Set([...html.matchAll(/<(?:script|link|img|video|audio|source)\b[^>]*?\b(?:src|href)="(https?:\/\/[^"]+)"/gi)].map((m) => m[1]))]
    .filter((u) => !/fonts\.googleapis\.com/.test(u));
  const hechos = [], fallidos = [];
  for (const u of urls) {
    const r = await bajar(P, u, archivo);
    if (r) { html = html.split(`"${u}"`).join(`"${r}"`); hechos.push(u); } else fallidos.push(u);
  }
  writeFileSync(archivo, html);
  return { hechos, fallidos };
}

// ---------- Importar ----------
// Rutas relativas que usa un HTML (para copiar sus assets junto con él)
function relativas(html) {
  return [...new Set([...html.matchAll(/\b(?:src|href|data-composition-src)="([^"#?]+)/gi)].map((m) => m[1]).filter((r) => !/^([a-z]+:|\/|data:)/i.test(r)))];
}
export async function importar(P, origen, { id, bajarCDN = true } = {}) {
  const D = dirComposiciones(P);
  mkdirSync(D, { recursive: true });
  let principal, nota = '';
  const abs = resolve(origen);
  if (existsSync(abs) && statSync(abs).isDirectory()) {
    // Un proyecto de HyperFrames: la carpeta entera
    if (!existsSync(join(abs, 'index.html'))) throw new Error(`${origen} no tiene index.html`);
    id = slug(id || basename(abs));
    const dest = join(D, id);
    if (existsSync(dest)) throw new Error(`Ya existe ${relative(P, dest)} (elegí otro --id)`);
    cpSync(abs, dest, { recursive: true, filter: (s) => !/[\\/](node_modules|\.git|renders|\.hyperframes)([\\/]|$)/.test(s) });
    principal = join(dest, 'index.html');
  } else if (existsSync(abs)) {
    // Un HTML suelto, con los archivos relativos que use
    id = slug(id || basename(abs, extname(abs)));
    principal = join(D, id + '.html');
    if (existsSync(principal)) throw new Error(`Ya existe ${relative(P, principal)} (elegí otro --id)`);
    const html = readFileSync(abs, 'utf8');
    writeFileSync(principal, html);
    for (const r of relativas(html)) {
      const s = resolve(dirname(abs), r), d = resolve(D, r);
      if (existsSync(s) && d.startsWith(D + sep) && !existsSync(d)) { mkdirSync(dirname(d), { recursive: true }); cpSync(s, d, { recursive: true }); }
    }
  } else {
    // Un bloque del catálogo de HyperFrames (hf:nombre o el nombre solo)
    const nombre = String(origen).replace(/^hf:/, '');
    if (!/^[a-z0-9-]+$/.test(nombre)) throw new Error(`No encuentro ${origen} (ni como archivo ni como bloque del catálogo de HyperFrames)`);
    let item = null, tipo = null;
    for (const t of ['blocks', 'components']) {
      const r = await fetch(`${REGISTRO}/${t}/${nombre}/registry-item.json`).catch(() => null);
      if (r?.ok) { item = await r.json(); tipo = t; break; }
    }
    if (!item) throw new Error(`No hay un bloque «${nombre}» en el catálogo de HyperFrames (o no hay conexión). Lista: https://github.com/heygen-com/hyperframes/tree/main/registry/blocks`);
    id = slug(id || nombre);
    const base = tipo === 'blocks' ? D : join(D, 'componentes', id);
    for (const f of item.files || []) {
      const r = await fetch(`${REGISTRO}/${tipo}/${nombre}/${f.path}`);
      if (!r.ok) throw new Error(`No bajó ${f.path}`);
      const buf = Buffer.from(await r.arrayBuffer());
      let dest;
      if (f.type === 'hyperframes:composition' && tipo === 'blocks') dest = principal = join(D, id + '.html');
      else dest = join(base, tipo === 'blocks' ? join('assets', id, basename(f.path)) : f.path);
      if (existsSync(dest)) throw new Error(`Ya existe ${relative(P, dest)} (elegí otro --id)`);
      mkdirSync(dirname(dest), { recursive: true });
      writeFileSync(dest, buf);
    }
    const lic = join(D, 'LICENCIAS.md');
    if (!existsSync(lic)) writeFileSync(lic, '# Licencias de las composiciones importadas\n\nBloques del catálogo de HyperFrames (https://github.com/heygen-com/hyperframes). Cada uno conserva su licencia y su autor.\n\n');
    appendFileSync(lic, `- **${id}** ← \`${nombre}\` (${tipo === 'blocks' ? 'bloque' : 'componente'}) · ${item.license || 'Apache-2.0'} · ${item.author || 'HeyGen'}${item.title ? ' · ' + item.title : ''}\n`);
    if (tipo === 'components') return { id, archivo: null, componente: posix(relative(P, base)), item };
    nota = item.description || '';
    // El HTML del bloque apunta a sus assets por el nombre de destino del registro: se reescriben
    let html = readFileSync(principal, 'utf8');
    for (const f of item.files || []) if (f.type !== 'hyperframes:composition') {
      const r = posix(join('assets', id, basename(f.path)));
      if (f.target) html = html.split(`"${f.target}"`).join(`"${r}"`).split(`"./${f.target}"`).join(`"${r}"`);
    }
    writeFileSync(principal, html);
  }
  conectar(P, principal);
  const cdn = bajarCDN ? await local(P, principal) : { hechos: [], fallidos: [] };
  return { id, archivo: posix(relative(P, principal)), cdn, nota };
}
