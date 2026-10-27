"""Genera proyecto/glifos.js: las letras de la palabra de la marca como curvas
SVG, en los pesos 400 a 900 de una fuente variable. Con esto el logo exportado
no depende de que la fuente esté instalada. Sin glifos, la marca usa <text>.

Uso (necesita fonttools y brotli: pip install fonttools brotli):
    python3 herramientas/generar_glifos.py [fuente.woff2] [texto]

Por defecto toma la primera fuente del estilo elegido (proyecto/estilo/estilo.js) y la
palabra de la marca. Una fuente sin eje de peso se usa igual para todos los pesos.
Los glifos llevan la familia: si después se elige otro estilo, la marca no los usa
(vuelve a <text> con la fuente nueva) hasta que se regeneren.
"""
import json
import re
import sys
from pathlib import Path

from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.transformPen import TransformPen
from fontTools.ttLib import TTFont

ROOT = Path(__file__).resolve().parents[1]
proyecto = (ROOT / "proyecto" / "proyecto.js").read_text()
estilo_js = ROOT / "proyecto" / "estilo" / "estilo.js"
estilo = estilo_js.read_text() if estilo_js.exists() else ""
if len(sys.argv) > 1:
    fuente = sys.argv[1]
    ruta = Path(fuente) if Path(fuente).is_absolute() else Path.cwd() / fuente
else:
    m = re.search(r"archivo:\s*'([^']+)'", estilo)
    if not m:
        sys.exit("El proyecto no tiene estilo con fuentes (proyecto/estilo/estilo.js): pasá la fuente como argumento.")
    ruta = estilo_js.parent / m.group(1)
m = re.search(r"palabra:\s*'([^']+)'", proyecto) or re.search(r"nombre:\s*'([^']+)'", proyecto)
texto = sys.argv[2] if len(sys.argv) > 2 else m.group(1)
texto = texto.replace("*", "")

familia = None
data = {}
for peso in range(400, 1000, 100):
    font = TTFont(ruta)
    if "fvar" in font and any(a.axisTag == "wght" for a in font["fvar"].axes):
        from fontTools.varLib.instancer import instantiateVariableFont
        ax = next(a for a in font["fvar"].axes if a.axisTag == "wght")
        font = instantiateVariableFont(font, {"wght": max(ax.minValue, min(ax.maxValue, peso))})
    familia = familia or (font["name"].getDebugName(16) or font["name"].getDebugName(1))
    glyphs, cmap, hmtx = font.getGlyphSet(), font.getBestCmap(), font["hmtx"]
    escala = 1000 / font["head"].unitsPerEm
    letras = {}
    for ch in sorted(set(texto)):
        name = cmap.get(ord(ch))
        if name is None:
            print(f"Aviso: la fuente no tiene «{ch}»", file=sys.stderr)
            continue
        pen = SVGPathPen(glyphs)
        glyphs[name].draw(TransformPen(pen, (escala, 0, 0, -escala, 0, 0)))
        letras[ch] = {"d": pen.getCommands(), "adv": round(hmtx[name][0] * escala, 2)}
    cap = getattr(font["OS/2"], "sCapHeight", 0) or 700
    data[peso] = {"cap": round(cap * escala, 2), "letters": letras}

data["familia"] = familia
out = ROOT / "proyecto" / "glifos.js"
out.write_text(f"// Generado por herramientas/generar_glifos.py ({ruta.name}, «{texto}»). No editar a mano.\n"
               "window.GLIFOS = " + json.dumps(data, separators=(",", ":"), ensure_ascii=False) + ";\n")
print("Listo:", out.relative_to(ROOT), out.stat().st_size // 1024, "KB")
