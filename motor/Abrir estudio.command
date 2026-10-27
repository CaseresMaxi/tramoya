#!/bin/bash
# Doble clic (macOS): abre el estudio de Tramoya con este proyecto en el navegador.
# Si macOS no lo deja abrir: clic derecho → Abrir (la primera vez).
cd "$(dirname "$0")" || exit 1
if ! command -v node >/dev/null 2>&1; then
  echo "Falta Node.js (18 o más nuevo). Bajalo de https://nodejs.org, instalalo y volvé a abrir este archivo."
  read -r -p "Enter para cerrar…" _; exit 1
fi
node herramientas/tramoya.mjs estudio
read -r -p "El estudio se cerró. Enter para cerrar esta ventana…" _
