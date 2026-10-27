#!/bin/sh
# Linux (o cualquier Unix): abre el estudio de Tramoya con este proyecto en el navegador.
#   sh abrir-estudio.sh       (o doble clic → "Ejecutar en terminal", según el escritorio)
cd "$(dirname "$0")" || exit 1
if ! command -v node >/dev/null 2>&1; then
  echo "Falta Node.js (18 o más nuevo): https://nodejs.org (o el gestor de paquetes de tu sistema)."
  exit 1
fi
exec node herramientas/tramoya.mjs estudio "$@"
