#!/usr/bin/env bash
# Crea un proyecto nuevo a partir de Tramoya: copia el motor y el proyecto de ejemplo,
# le cambia el id (prefijo del estado en el navegador) y arranca un repo git.
#
# Uso: bash herramientas/nuevo-proyecto.sh ../mi-proyecto [id]
# Después: editá proyecto/proyecto.js y proyecto/escenas.js, y abrí index.html.
set -euo pipefail

ORIGEN="$(cd "$(dirname "$0")/.." && pwd)"
DESTINO="${1:?Uso: bash herramientas/nuevo-proyecto.sh ../mi-proyecto [id]}"
ID="${2:-$(basename "$DESTINO" | tr '[:upper:]' '[:lower:]' | tr -c 'a-z0-9\n' '-')}"

if [ -e "$DESTINO" ] && [ -n "$(ls -A "$DESTINO" 2>/dev/null)" ]; then
  echo "La carpeta $DESTINO ya existe y no está vacía." >&2
  exit 1
fi
mkdir -p "$DESTINO"
# Todo menos el historial, las dependencias y los renders
tar -C "$ORIGEN" --exclude=.git --exclude=node_modules --exclude=salida -cf - . | tar -C "$DESTINO" -xf -
sed -i.bak "s/^  id: 'tramoya',/  id: '$ID',/" "$DESTINO/proyecto/proyecto.js" && rm "$DESTINO/proyecto/proyecto.js.bak"
# Anota de qué versión de Tramoya salió (para traer mejoras del motor más adelante)
( cd "$ORIGEN" && git rev-parse --short HEAD 2>/dev/null || echo "sin git" ) > "$DESTINO/.tramoya-version"
cd "$DESTINO"
git init -q 2>/dev/null && echo "Repo git creado en $DESTINO" || true
echo "Proyecto «$ID» listo en $DESTINO"
echo "  1. Editá proyecto/proyecto.js (nombre, marca, temas, textos) y proyecto/escenas.js"
echo "  2. Poné tus imágenes en proyecto/assets/img/ y corré: python3 herramientas/generar_manifiesto.py"
echo "  3. Abrí index.html en el navegador"
