# Movimiento: que la forma salga del contenido

El motor no decide cómo se mueve una presentación: lo decide lo que se cuenta. Un tipo de
escena es una forma que **ya existe** y sirve cuando el contenido tiene esa forma. Si no
la tiene, no se fuerza: se escribe una escena `libre`, se crea un tipo propio o se crea el
movimiento que falta. Repetir un tipo o un movimiento porque está a mano es el error más
común, y el que más se nota.

## 1. La partitura

Antes de escribir `escenas.js`, una línea por momento:

| Momento | Qué tiene que entender quien mira | Qué lo explica | Forma |
|---|---|---|---|
| Apertura | De qué se trata, en una frase | El nombre se arma letra por letra | `portada` |
| El problema | Hoy se pierde tiempo en X | Lo viejo aparece y se tacha | `libre` + `tachar` |
| La cifra | Es 3 veces más rápido | El número cuenta y la barra crece | `cifra`, `count`, `crecer` |
| Cómo funciona | Tres pasos en orden | La cámara recorre el diagrama | `flujo` (o `focos`) |
| Cambio de tema | Ahora, el equipo | Corte seco | `transicion: 'corte'` |
| Cierre | Qué hacer ahora | Una sola frase que cae | `coreografia: 'impacto'` |

Preguntas que ordenan:

- **¿Qué cambia en este momento?** Algo aparece, crece, se transforma, se compara, se
  descarta, se recorre. El verbo dice el movimiento.
- **¿Qué tiene que mirar primero?** Eso entra primero; lo demás acompaña (`fade`) o ya
  está (`quieto`).
- **¿Cuánto pesa?** Lo importante tarda más y se acentúa (`agrandar`, `resaltar`,
  `latir`). Lo accesorio no compite.
- **¿Es otro capítulo?** Un `corte` o un `fundido` lo marca mejor que otro paneo.
- **¿Lo vengo haciendo igual?** Si la escena anterior se movía así, que esta no, salvo
  que la repetición sea el punto (una serie, un ritmo buscado).

## 2. Repertorio

Está en `motion/movimientos.js` y es **abierto**: cada proyecto suma los suyos.

### Entradas (`data-m`, o `m` en `mov`)

| Nombre | Cuándo |
|---|---|
| `fade` | Lo que acompaña sin pedir atención |
| `up` · `down` · `left` · `right` | Texto y bloques que se suman; `left`/`right` para una secuencia o una oposición |
| `zoom` | Un panel o una imagen que llega sin empujar |
| `pop` | Lo que aparece de golpe y se nota: un ícono, una marca |
| `caer` | Algo con peso, que se deja caer |
| `desenfoque` | Una idea que se aclara; títulos tranquilos |
| `girar` | Tarjetas que se dan vuelta, un cambio de cara |
| `escala-x` · `crecer` | Barras, líneas, progreso; columnas de un gráfico |
| `wipe` · `barrido-v` | Rótulos y bandas; una lista o un panel que se despliega |
| `abrir` · `circulo` | Una revelación; una imagen con foco en su centro |
| `reveal` | Fotos: cortina y la imagen se asienta |
| `draw` | Trazos SVG |
| `count` | Una cifra (`data-to`, `data-desde`; respeta coma y decimales) |
| `type` · `desordenar` | Código, comandos; datos que se decodifican |
| `seguir` | Un cursor o un paquete que recorre (`data-camino`, termina en `0 0`) |
| `words` · `letters` · `renglones` | Texto que se lee mientras llega: palabras, una o dos palabras con peso, párrafos |
| `palabras-pop` · `palabras-fundido` · `letras-azar` | Un remate con energía; una frase íntima; algo que se arma de piezas |
| `quieto` | Ya está: no llama la atención (o un corte seco) |

### Acentos (`data-e`, o `e` en `mov`): le pasan a algo que ya se ve

`resaltar`, `subrayar`, `tachar` (sobre las `*palabras*` en acento, o el texto entero),
`agrandar`, `atenuar`, `sacudir`. Con `es` (o `data-es`) se elige el punto clave en el que
pasan: el patrón «aparece lo viejo → en el avance siguiente se tacha y entra lo nuevo».

### Bucles (también `data-e`): mientras se ve

`latir`, `flotar`, `respirar`, `oscilar`, `kenburns`. Para algo vivo o pendiente, no para
decorar: un bucle en cada escena es ruido.

### Salidas (`data-x`, o `x` en `mov`)

Por defecto, lo que no viaja se va hacia donde va la cámara. `x` pone cualquier entrada al
revés como salida (`x: 'circulo'` se cierra en círculo).

### Coreografías (`coreografia` en la escena, o base en el estilo)

Un movimiento por **rol**: `kicker`, `titulo`, `texto`, `item`, `hero`, `dato`, `logo`,
`numeral` (el tipo los marca; `data-r` en un HTML propio).

| Nombre | Para |
|---|---|
| `tipo` | Lo que trae el tipo de escena |
| `sobria` | Datos serios, contextos formales: fundidos cortos |
| `editorial` | Ensayo, relato: renglones y enfoques lentos |
| `cinetica` | Lanzamientos, redes: letras, saltos, desde el centro |
| `tecnica` | Software, datos: se decodifica y se tipea |
| `impacto` | Una afirmación fuerte: cae, salta |
| `quieta` | Respirar entre escenas movidas: solo aparece el título |

Si nadie eligió coreografía y el tipo se repite con la escena anterior, el motor rota
(`estilo.coreografias`, o tipo → editorial → cinética → sobria; `variar: false` lo
apaga). Es un salvavidas, no un diseño: la coreografía la elegís vos.

### Transiciones (`transicion` en la escena)

`franjas` (barren + cámara) · `camara` (la cámara viaja) · `morph` (solo se transforma lo
compartido) · `fundido` · `corte` (seco). O `{ tipo, dur }`. El estilo pone la de siempre;
la escena la cambia donde el relato cambia.

## 3. `mov`: el movimiento de cada elemento

```js
{
  tipo: 'texto', titulo: 'Tres *cambios*.', puntos: 'Uno.\nDos.\nTres.',
  mov: {
    titulo: { m: 'renglones', e: 'resaltar', es: 1 },  // por campo (data-f)
    'puntos.2': { m: 'caer', s: 2 },                   // solo el tercer punto, en el avance 2
    '@item': { m: 'pop', orden: 'centro' },            // por rol, con @
  },
}
```

Claves de cada valor: `m` entrada · `s` punto clave · `at` retardo · `dur` duración ·
`stagger` desfase entre partes · `orden` (`normal`, `inverso`, `centro`, `bordes`, `azar`:
partes de un texto o ítems de un grupo) · `e` acento o bucle · `es` · `eat` · `edur` · `x`
salida. Un string es solo `m`. El editor lo escribe solo: clic en un elemento → pestaña
Elemento → Movimiento.

Prioridad: `mov['campo.n']` → `mov.campo` → `mov['@rol']` → coreografía de la escena →
la del estilo → lo que trae el tipo.

## 4. Lo que el motor adapta solo

- El título entra según su largo: una o dos palabras, letra por letra; una pregunta, se
  enfoca; más de nueve palabras, de a renglón; el resto, de a palabra.
- `letters` en un texto largo pasa a `words` (o `renglones`); `words` en un párrafo pasa a
  `renglones`. Queda como aviso en la partitura.
- Lo que tiene la misma `data-k` en dos escenas seguidas **viaja** (no entra): en la
  partitura figura como `viaja`. Si querés que una escena empiece de cero, `corte`.

## 5. Cuando no alcanza: crear

**Una escena a medida** (`tipo: 'libre'`): el HTML lo escribís vos, con los mismos
atributos. `{{kicker}}` y `{{titulo}}` ponen los de siempre (y viajan); `{{campo}}` pone
ese campo de la escena (se edita con un clic). `css` va con la escena.

```js
{ tipo: 'libre', kicker: 'Antes y ahora', titulo: 'Lo que *cambió*.', antes: '3 días', ahora: '20 minutos',
  html: `<div class="pad">{{kicker}}{{titulo}}
    <p class="big" data-f="antes" data-m="fade">{{antes}}</p>
    <p class="big" data-f="ahora" data-m="caer" data-s="1">{{ahora}}</p></div>`,
  css: '.big{font:800 140px var(--font-display); margin:30px 0 0}',
  mov: { antes: { e: 'tachar', es: 1 } } }
```

**Un tipo propio** (`proyecto/tipos.js`, `TIPOS_PROYECTO`): cuando una forma se repite con
contenido distinto (ver `motion/tipos.js` para el formato). Que sus campos sean el
contenido, no la apariencia.

**Un movimiento propio** (`proyecto/tipos.js`):

```js
window.MOTION.registrarMovimiento('sello', {
  nombre: 'Sello', dur: 0.55, usar: 'Algo que queda decidido.',
  aplicar: (c, r) => { r.op = Math.min(1, c.p * 4); r.tr = `rotate(${-8 - 10 * (1 - c.e)}deg) scale(${1 + 0.9 * (1 - c.e)})`; },
});
```

`c`: `el`, `p` (0 → 1), `e` (con la curva del estilo), `t`, `dur`, `j`/`n` (parte), `d`
(dataset), `dz` (distancia), `amb` (tiempo ambiente, para bucles). `r`: `op`, `tr`,
`clip`, `filter`, `origin`, `bg`. `fase: 'acento' | 'bucle'`, `partes: 'palabras' |
'letras' | 'renglones'`, `salir(c, r)` opcional. Todo función del tiempo: nada de timers
ni animaciones CSS. **Una coreografía propia**: `MOTION.registrarCoreografia('id', {
nombre, usar, roles: { titulo: …, item: … } })`.

Si un movimiento o un tipo sirve para cualquier proyecto, llevalo al motor
(`motor/motion/movimientos.js` o `tipos.js`) y a este archivo.

## 6. Reel y landing

- **Reel**: `titulo` y `palabras` tienen `entrada` (`sube`, `cae`, `escala`, `enfoca`,
  `golpe`); `ilustracion` dibuja un SVG a medida (se arma por trazo, escala, fundido,
  barrido o subiendo; puede latir con el bombo). Si una parte no existe, un tipo propio en
  `TIPOS_REEL` (`referencias/piezas.md`).
- **Landing**: sección `tipo: 'libre'` con `html` y `css`; `{{campo}}` queda editable en el
  lugar y la clase `rv` aparece al entrar en pantalla.

## 7. Revisar el ritmo

`tramoya revisar motion` escribe `salida/revision/motion/partitura.md`: por escena, el
tipo, la coreografía, la transición y qué movimiento tiene cada rol, con avisos:

- dos escenas seguidas que se mueven igual;
- tres o más escenas seguidas del mismo tipo;
- un rol que entra igual en tres de cada cuatro escenas;
- un movimiento que es más de un tercio de todas las entradas;
- todas las transiciones iguales.

No cortan el render: son preguntas. Si la respuesta es «lo pide el contenido», listo; si
es «estaba a mano», cambiá la forma. Para ver las entradas a mitad de camino:
`revisar motion --cada 0.3` (y armá una hoja de contacto con los PNG).

## Lo que no

- Todo animado: si todo se mueve, nada importa. Algo quieto da contraste.
- El mismo arranque en cada escena (antetítulo barrido → título por palabras → ítems
  escalonados) cuando lo que dicen es distinto.
- `letters` en frases largas, bucles decorativos, rebotes en contextos serios.
- Un tipo de escena para contenido que no tiene esa forma (una lista metida en tarjetas,
  una comparación metida en puntos).
- Decidir el movimiento después: primero la partitura, después las escenas.
