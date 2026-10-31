// Movimientos de la presentación: qué hace cada valor de data-m (entrada), data-e (acento) y
// data-x (salida). Es un repertorio abierto: cada proyecto suma los suyos desde proyecto/tipos.js
// con MOTION.registrarMovimiento, y las combinaciones por rol con MOTION.registrarCoreografia.
//
//   registrarMovimiento(nombre, {
//     fase:    'entrada' (p va de 0 a 1 y la salida lo usa al revés) | 'acento' (algo que le pasa
//              a un elemento ya visible: resaltar, tachar…) | 'bucle' (se repite mientras se ve, con
//              el tiempo ambiente)
//     dur, st  duración y desfase entre partes, en segundos
//     partes:  'palabras' | 'letras' | 'renglones': el texto se parte y aplicar corre por parte
//     orden:   orden de las partes por defecto: normal | inverso | centro | bordes | azar
//     usar:    una línea: cuándo conviene (la muestran el editor y referencias/movimiento.md)
//     aplicar(c, r)  escribe el cuadro en r = { op, tr, clip, filter, origin, bg } a partir de
//              c = { el, p (0→1 sin curva), e (con la curva del estilo), t (s desde que empezó),
//                    dur, j, n (parte y cuántas), d (dataset), dz (distancia del estilo), amb }
//     salir(c, r)    opcional: la salida propia (c.x va de 0 a 1); si no, la entrada al revés
//   })
//
// Todo es función del tiempo: nada de timers ni de animaciones CSS.
(function () {
  const { cl, exOut, backOut, lerp } = window.TRAMOYA;
  const MOV = {}, COREO = {};
  const registrarMovimiento = (nombre, def) => { MOV[nombre] = { fase: 'entrada', dur: 0.9, st: 0, ...def, id: nombre }; };
  const registrarCoreografia = (nombre, def) => { COREO[nombre] = { nombre, ...def, id: nombre }; };
  const bounce = (x) => {
    const n = 7.5625, d = 2.75;
    if (x < 1 / d) return n * x * x;
    if (x < 2 / d) return n * (x -= 1.5 / d) * x + 0.75;
    if (x < 2.5 / d) return n * (x -= 2.25 / d) * x + 0.9375;
    return n * (x -= 2.625 / d) * x + 0.984375;
  };
  // Azar con semilla: el mismo cuadro da siempre lo mismo (se puede renderizar)
  const azar = (a, b = 0) => { const s = Math.sin(a * 127.1 + b * 311.7) * 43758.5453; return s - Math.floor(s); };
  const R = (nombre, def) => registrarMovimiento(nombre, def);

  // ---------- Entradas ----------
  R('fade', { nombre: 'Fundido', usar: 'Lo que acompaña sin pedir atención.', aplicar: (c, r) => { r.op = cl(c.e); } });
  R('up', { nombre: 'Sube', usar: 'Texto y bloques que se suman a lo que ya está.', aplicar: (c, r) => { r.op = cl(c.e); r.tr = `translateY(${(1 - c.e) * 50 * c.dz}px)`; } });
  R('down', { nombre: 'Baja', usar: 'Algo que se apoya desde arriba: un rótulo, una etiqueta.', aplicar: (c, r) => { r.op = cl(c.e); r.tr = `translateY(${(1 - c.e) * -50 * c.dz}px)`; } });
  R('left', { nombre: 'Desde la izquierda', usar: 'Puntos de una lista, una secuencia que avanza.', aplicar: (c, r) => { r.op = cl(c.e); r.tr = `translateX(${(1 - c.e) * -70 * c.dz}px)`; } });
  R('right', { nombre: 'Desde la derecha', usar: 'Lo que contesta o se opone a lo de la izquierda.', aplicar: (c, r) => { r.op = cl(c.e); r.tr = `translateX(${(1 - c.e) * 70 * c.dz}px)`; } });
  R('zoom', { nombre: 'Acercarse', usar: 'Un panel o una imagen que llega sin empujar.', aplicar: (c, r) => { r.op = cl(c.e); r.tr = `scale(${0.9 + 0.1 * c.e})`; } });
  R('pop', { nombre: 'Rebote', dur: 0.9, usar: 'Lo que aparece de golpe y se nota: un ícono, una marca, un número.', aplicar: (c, r) => { r.op = cl(c.p * 2.5); r.tr = `scale(${0.55 + 0.45 * backOut(c.p)})`; } });
  R('caer', { nombre: 'Cae y rebota', dur: 1.1, usar: 'Algo con peso, que se deja caer (una pieza, un sello).', aplicar: (c, r) => { r.op = cl(c.p * 4); r.tr = `translateY(${(1 - bounce(cl(c.p))) * -160 * c.dz}px)`; } });
  R('desenfoque', { nombre: 'Enfoca', dur: 1.1, usar: 'Atmósfera, una idea que se aclara; títulos tranquilos.', aplicar: (c, r) => { r.op = cl(c.e); r.filter = `blur(${(1 - c.e) * 18}px)`; r.tr = `scale(${1.05 - 0.05 * c.e})`; } });
  R('girar', { nombre: 'Gira hacia el frente', usar: 'Tarjetas que se dan vuelta, un cambio de cara.', aplicar: (c, r) => { r.op = cl(c.p * 2); r.tr = `perspective(1200px) rotateX(${(1 - c.e) * -80}deg)`; r.origin = '50% 0'; } });
  R('escala-x', { nombre: 'Se estira (horizontal)', usar: 'Barras, líneas, progreso: algo que crece hacia la derecha.', aplicar: (c, r) => { r.tr = `scaleX(${cl(c.e)})`; r.origin = '0 50%'; } });
  R('crecer', { nombre: 'Crece desde abajo', usar: 'Columnas de un gráfico, algo que sube de nivel.', aplicar: (c, r) => { r.tr = `scaleY(${cl(c.e)})`; r.origin = '50% 100%'; } });
  R('wipe', { nombre: 'Barrido', dur: 0.8, usar: 'Rótulos, subrayados, bandas: se pinta de izquierda a derecha.', aplicar: (c, r) => { r.clip = `inset(-10% ${(1 - c.e) * 100}% -10% 0)`; },
    salir: (c, r) => { r.clip = `inset(-10% 0 -10% ${exOut(c.x) * 100}%)`; } });
  R('barrido-v', { nombre: 'Barrido de arriba abajo', usar: 'Una lista o un panel que se despliega.', aplicar: (c, r) => { r.clip = `inset(-4% -4% ${(1 - c.e) * 104}% -4%)`; },
    salir: (c, r) => { r.clip = `inset(${exOut(c.x) * 104}% -4% -4% -4%)`; } });
  R('abrir', { nombre: 'Se abre desde el centro', usar: 'Una revelación: algo que estaba cerrado.', aplicar: (c, r) => { const k = (1 - c.e) * 50; r.clip = `inset(-10% ${k}% -10% ${k}%)`; } });
  R('circulo', { nombre: 'Círculo que se abre', dur: 1.2, usar: 'Una imagen o un panel con foco en su centro.', aplicar: (c, r) => { r.clip = `circle(${cl(c.e) * 75}% at 50% 50%)`; } });
  R('reveal', { nombre: 'Cortina (imagen)', dur: 1.4, usar: 'Fotos: la cortina baja y la imagen se asienta.',
    aplicar: (c, r) => { r.clip = `inset(0 0 ${(1 - c.e) * 100}% 0)`; const img = c.el.querySelector('img'); if (img) img.style.transform = `scale(${1.18 - 0.18 * exOut(cl(c.t / (c.dur * 1.6)))})`; },
    salir: (c, r) => { r.clip = `inset(${exOut(c.x) * 100}% 0 0 0)`; } });
  R('draw', { nombre: 'Trazo', dur: 0.8, usar: 'Líneas y conectores SVG: el camino se dibuja.',
    aplicar: (c, r) => { const e = c.el, len = e._len || (e._len = e.getTotalLength?.() || 0); e.style.strokeDasharray = len; e.style.strokeDashoffset = len * (1 - c.e); e._p = c.p; },
    salir: (c, r) => { r.op = 1 - exOut(c.x); } });
  R('quieto', { nombre: 'Quieto (ya está)', dur: 0.01, usar: 'Lo que no tiene que llamar la atención, o un corte seco.', aplicar: () => {} });

  // Texto que cambia de contenido (al terminar vuelve al marcado original)
  const texto = (e) => { e._html ??= e.innerHTML; e._full ??= e.textContent; return e._full; };
  const fin = (e, p) => { if (p >= 1) { if (!e._done) { e.innerHTML = e._html; e._done = true; } return true; } e._done = false; return false; };
  R('type', { nombre: 'Se escribe', dur: 1.6, usar: 'Código, comandos, una frase que se tipea.', aplicar: (c) => { const s = texto(c.el); if (!fin(c.el, c.p)) c.el.textContent = s.slice(0, Math.round(s.length * c.p)); } });
  const GLIFOS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789#%&*+=<>/';
  R('desordenar', { nombre: 'Se desordena y se acomoda', dur: 1.3, usar: 'Datos, nombres técnicos, algo que se decodifica.',
    aplicar: (c) => {
      const s = texto(c.el); if (fin(c.el, c.p)) return;
      const k = Math.floor(c.t * 24), hasta = s.length * c.e;
      c.el.textContent = [...s].map((ch, i) => (i < hasta || /\s/.test(ch) ? ch : c.p <= 0 ? ' ' : GLIFOS[Math.floor(azar(i, k) * GLIFOS.length)])).join('');
    } });
  // Cuenta hasta data-to (con los decimales y el separador que tenga), desde data-desde
  R('count', { nombre: 'Cuenta', dur: 1.6, usar: 'Una cifra que importa: que se vea llegar.',
    aplicar: (c) => {
      const raw = String(c.d.to ?? '0'), coma = raw.includes(','), n = parseFloat(raw.replace(/\./g, coma ? '' : '.').replace(',', '.')) || 0;
      const dec = (raw.split(/[.,]/)[1] || '').length * (coma || raw.split('.').length === 2 ? 1 : 0), desde = parseFloat(c.d.desde) || 0;
      const v = lerp(desde, n, cl(c.e));
      c.el.textContent = coma ? v.toFixed(dec).replace('.', ',') : v.toFixed(dec);
    } });
  // Sigue un camino SVG (data-camino, en px y terminando en 0 0 = su lugar)
  const svgNS = 'http://www.w3.org/2000/svg';
  let svgCaminos = null;
  R('seguir', { nombre: 'Sigue un camino', dur: 1.4, usar: 'Un cursor, un paquete, algo que recorre (data-camino="M-400 200 Q-200 -100 0 0").',
    aplicar: (c, r) => {
      const e = c.el;
      if (!e._camino) {
        svgCaminos ??= document.body.appendChild(Object.assign(document.createElementNS(svgNS, 'svg'), { style: 'position:absolute; width:0; height:0' }));
        e._camino = svgCaminos.appendChild(document.createElementNS(svgNS, 'path'));
        e._camino.setAttribute('d', c.d.camino || 'M-300 0 L0 0');
      }
      const L = e._camino.getTotalLength(), a = e._camino.getPointAtLength(L * cl(c.e)), z = e._camino.getPointAtLength(L);
      r.op = cl(c.p * 5); r.tr = `translate(${a.x - z.x}px, ${a.y - z.y}px)`;
    } });

  // Texto partido: cada parte con su máscara
  const mascara = (c, r) => { r.tr = `translateY(${(1 - c.e) * 110}%)`; };
  const sigue = (c, r) => { r.tr = `translateY(${-c.x * 110}%)`; };
  R('words', { nombre: 'Palabras que suben', partes: 'palabras', dur: 0.75, st: 0.055, usar: 'Títulos cortos que se leen a medida que llegan.', aplicar: mascara, salir: sigue });
  R('letters', { nombre: 'Letras que suben', partes: 'letras', dur: 0.7, st: 0.04, usar: 'Una o dos palabras con peso: un nombre, una frase final.', aplicar: mascara, salir: sigue });
  R('renglones', { nombre: 'Renglones con máscara', partes: 'renglones', dur: 0.9, st: 0.12, usar: 'Párrafos y títulos largos: se lee de a renglón, editorial.', aplicar: mascara, salir: sigue });
  R('palabras-pop', { nombre: 'Palabras que saltan', partes: 'palabras', dur: 0.6, st: 0.07, usar: 'Frases con energía, un remate.',
    aplicar: (c, r) => { r.op = cl(c.p * 3); r.tr = `scale(${0.4 + 0.6 * backOut(cl(c.p))})`; }, salir: (c, r) => { r.op = 1 - c.x; } });
  R('palabras-fundido', { nombre: 'Palabras que enfocan', partes: 'palabras', dur: 0.8, st: 0.06, usar: 'Una frase íntima, una cita.',
    aplicar: (c, r) => { r.op = cl(c.e); r.filter = `blur(${(1 - c.e) * 10}px)`; }, salir: (c, r) => { r.op = 1 - c.x; } });
  R('letras-azar', { nombre: 'Letras en desorden', partes: 'letras', orden: 'azar', dur: 0.5, st: 0.03, usar: 'Algo que se arma de piezas sueltas; tecnología, glitch.',
    aplicar: (c, r) => { r.op = cl(c.e); r.tr = `translateY(${(1 - c.e) * (azar(c.j) - 0.5) * 80}%)`; }, salir: (c, r) => { r.op = 1 - c.x; } });

  // ---------- Acentos: le pasan a algo que ya se ve (sobre las *palabras* en acento, si hay) ----------
  const fondo = (pos, alto) => (c, r) => { r.bg = { image: 'linear-gradient(var(--accent), var(--accent))', size: `${cl(c.e) * 100}% ${alto}`, pos, op: 0 }; };
  const A = (nombre, def) => registrarMovimiento(nombre, { fase: 'acento', dur: 0.7, ...def });
  A('resaltar', { nombre: 'Resaltar', usar: 'Marcar la palabra que importa, como con fibra.',
    aplicar: (c, r) => { r.bg = { image: 'linear-gradient(color-mix(in srgb, var(--accent) 38%, transparent), color-mix(in srgb, var(--accent) 38%, transparent))', size: `${cl(c.e) * 100}% .5em`, pos: '0 85%' }; } });
  A('subrayar', { nombre: 'Subrayar', usar: 'Señalar sin tapar.', aplicar: fondo('0 100%', '.09em') });
  A('tachar', { nombre: 'Tachar', usar: 'Lo que ya no va: antes de mostrar lo nuevo.', aplicar: fondo('0 58%', '.08em') });
  A('agrandar', { nombre: 'Agrandar', dur: 0.6, usar: 'Destacar un elemento entre otros.', aplicar: (c, r) => { r.tr = `scale(${1 + 0.08 * backOut(cl(c.p))})`; } });
  A('atenuar', { nombre: 'Atenuar', dur: 0.5, usar: 'Correr algo a un costado para que mande otra cosa.', aplicar: (c, r) => { r.op = 1 - 0.65 * cl(c.e); } });
  A('sacudir', { nombre: 'Sacudir', dur: 0.5, usar: 'Un error, una alerta, un "no".', aplicar: (c, r) => { r.tr = `translateX(${Math.sin(c.p * Math.PI * 6) * (1 - c.p) * 18}px)`; } });

  // ---------- Bucles: mientras se ve (el tiempo ambiente corre también en los puntos clave) ----------
  const B = (nombre, def) => registrarMovimiento(nombre, { fase: 'bucle', dur: 0.8, ...def });
  B('latir', { nombre: 'Late', usar: 'Algo vivo o pendiente: un punto, un botón, un aviso.', aplicar: (c, r) => { r.tr = `scale(${1 + 0.035 * c.e * (0.5 + 0.5 * Math.sin(c.amb * 4))})`; } });
  B('flotar', { nombre: 'Flota', usar: 'Un objeto liviano, una tarjeta que espera.', aplicar: (c, r) => { r.tr = `translateY(${Math.sin(c.amb * 1.6 + (c.d.k || '').length) * 8 * c.e}px)`; } });
  B('respirar', { nombre: 'Respira', usar: 'Un fondo o un halo que no se queda quieto.', aplicar: (c, r) => { r.op = 1 - 0.25 * c.e * (0.5 + 0.5 * Math.sin(c.amb * 1.4)); } });
  B('oscilar', { nombre: 'Oscila', usar: 'Algo que duda o que se balancea.', aplicar: (c, r) => { r.tr = `rotate(${Math.sin(c.amb * 2) * 2.2 * c.e}deg)`; } });
  B('kenburns', { nombre: 'Paneo lento (Ken Burns)', usar: 'Fotos que se quedan mucho en pantalla.', aplicar: (c, r) => { const k = (c.amb % 24) / 24, u = k < 0.5 ? k * 2 : 2 - k * 2; r.tr = `scale(${1 + 0.06 * c.e * u}) translateX(${(u - 0.5) * 20 * c.e}px)`; } });

  // ---------- Coreografías: un movimiento por rol (kicker, titulo, texto, item, hero, dato, logo, numeral) ----------
  // Lo que no nombran queda como lo trae el tipo de escena. Una escena la elige con `coreografia`.
  const C = registrarCoreografia;
  C('tipo', { nombre: 'La del tipo de escena', roles: {} });
  C('sobria', { nombre: 'Sobria', usar: 'Datos serios, contextos formales: todo entra con fundidos cortos.',
    roles: { kicker: { m: 'fade', dur: 0.5 }, titulo: { m: 'fade', dur: 0.7 }, texto: 'fade', item: { m: 'fade', dur: 0.5 }, hero: 'fade', numeral: 'quieto' } });
  C('editorial', { nombre: 'Editorial', usar: 'Ensayo, relato, marcas de autor: renglones y enfoques lentos.',
    roles: { kicker: 'fade', titulo: 'renglones', texto: 'renglones', item: { m: 'desenfoque', stagger: 0.25 }, hero: 'reveal', numeral: 'desenfoque' } });
  C('cinetica', { nombre: 'Cinética', usar: 'Lanzamientos, energía, redes: letras, saltos y orden desde el centro.',
    roles: { kicker: 'abrir', titulo: 'letters', texto: 'palabras-pop', item: { m: 'pop', orden: 'centro' }, hero: 'circulo', dato: 'pop', numeral: 'caer' } });
  C('tecnica', { nombre: 'Técnica', usar: 'Software, datos, ingeniería: se decodifica y se tipea.',
    roles: { kicker: 'type', titulo: 'desordenar', texto: 'fade', item: { m: 'wipe', stagger: 0.12 }, hero: 'barrido-v', dato: 'desordenar', numeral: 'quieto' } });
  C('impacto', { nombre: 'Impacto', usar: 'Una afirmación fuerte: cae, salta, se nota.',
    roles: { kicker: 'wipe', titulo: 'palabras-pop', item: { m: 'caer', orden: 'azar' }, hero: 'caer', dato: 'pop' } });
  C('quieta', { nombre: 'Quieta (corte seco)', usar: 'Para respirar entre escenas movidas: solo aparece el título.',
    roles: { kicker: 'quieto', titulo: { m: 'fade', dur: 0.4 }, texto: 'quieto', item: 'quieto', hero: 'quieto', dato: 'quieto', numeral: 'quieto', logo: 'quieto' } });

  window.MOTION = Object.assign(window.MOTION || {}, { MOVIMIENTOS: MOV, COREOGRAFIAS: COREO, registrarMovimiento, registrarCoreografia, azar });
})();
