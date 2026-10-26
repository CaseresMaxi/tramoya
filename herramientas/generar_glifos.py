"""Genera proyecto/glifos.js: las letras de la palabra de la marca como curvas
SVG, en los pesos 400 a 900 de una fuente variable. Con esto el logo exportado
no depende de que la fuente esté instalada. Sin glifos, la marca usa <text>.

Uso (necesita fonttools y brotli: pip install fonttools brotli):
    python3 herramientas/generar_glifos.py [fuente.woff2] [texto]

Por defecto toma la primera fuente de proyecto.js y la palabra de la marca.
Una fuente sin eje de peso se usa igual para todos los pesos.
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
fuente = sys.argv[1] if len(sys.argv) > 1 else re.search(r"archivo:\s*'([^']+)'", proyecto).group(1)
texto = sys.argv[2] if len(sys.argv) > 2 else re.search(r"palabra:\s*'([^']+)'", proyecto).group(1)
texto = texto.replace("*", "")
ruta = Path(fuente) if Path(fuente).is_absolute() else ROOT / fuente

data = {}
for peso in range(400, 1000, 100):
    font = TTFont(ruta)
    if "fvar" in font and any(a.axisTag == "wght" for a in font["fvar"].axes):
        from fontTools.varLib.instancer import instantiateVariableFont
        ax = next(a for a in font["fvar"].axes if a.axisTag == "wght")
        font = instantiateVariableFont(font, {"wght": max(ax.minValue, min(ax.maxValue, peso))})
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

out = ROOT / "proyecto" / "glifos.js"
out.write_text(f"// Generado por herramientas/generar_glifos.py ({ruta.name}, «{texto}»). No editar a mano.\n"
               "window.GLIFOS = " + json.dumps(data, separators=(",", ":"), ensure_ascii=False) + ";\n")
print("Listo:", out.relative_to(ROOT), out.stat().st_size // 1024, "KB")
