"""Genera proyecto/manifiesto.js: la lista de imágenes, logos y videos de
proyecto/assets/ para los selectores del editor. Un navegador no puede listar
carpetas desde file://, por eso la lista se arma acá.

Uso:
    python3 herramientas/generar_manifiesto.py
"""
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
GRUPOS = {
    "imagenes": ("proyecto/assets/img", {".jpg", ".jpeg", ".png", ".webp", ".svg"}),
    "logos": ("proyecto/assets/logo", {".svg", ".png"}),
    "videos": ("proyecto/assets/video", {".mp4", ".webm"}),
}

manifiesto = {}
for grupo, (carpeta, exts) in GRUPOS.items():
    base = ROOT / carpeta
    archivos = sorted(p for p in base.iterdir() if p.suffix.lower() in exts) if base.exists() else []
    # Rutas relativas a las páginas (motion/, poster/, landing/…), que están un nivel abajo
    manifiesto[grupo] = ["../" + p.relative_to(ROOT).as_posix() for p in archivos if p.name != "favicon.svg"]

out = ROOT / "proyecto" / "manifiesto.js"
out.write_text("// Generado por herramientas/generar_manifiesto.py. No editar a mano.\n"
               "window.MANIFIESTO = " + json.dumps(manifiesto, indent=2, ensure_ascii=False) + ";\n")
print("Listo:", {k: len(v) for k, v in manifiesto.items()})
