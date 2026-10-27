#!/usr/bin/env bash
# Instala la skill Tramoya en los agentes de esta máquina (Claude Code, Codex, Cursor,
# Gemini CLI, OpenCode, o ~/.agents/skills si no hay ninguno).
#
#   Desde un clon:      bash instalar.sh
#   En una línea:       curl -fsSL https://raw.githubusercontent.com/CaseresMaxi/tramoya/main/instalar.sh | bash
#   Opciones:           bash instalar.sh --agentes claude,codex   (o --copiar, --sin-dependencias)
#
# Sin clon, baja el repo a $TRAMOYA_DIR (por defecto ~/.local/share/tramoya); volver a
# correrlo lo actualiza. Necesita git y Node 18+.
set -euo pipefail

REPO="${TRAMOYA_REPO:-https://github.com/CaseresMaxi/tramoya.git}"
AQUI="$(cd "$(dirname "${BASH_SOURCE[0]:-$0}")" 2>/dev/null && pwd || echo "")"

command -v node >/dev/null || { echo "Falta Node 18 o más nuevo: https://nodejs.org" >&2; exit 1; }

if [ -n "$AQUI" ] && [ -f "$AQUI/SKILL.md" ]; then
  DIR="$AQUI"
else
  command -v git >/dev/null || { echo "Falta git." >&2; exit 1; }
  DIR="${TRAMOYA_DIR:-$HOME/.local/share/tramoya}"
  if [ -d "$DIR/.git" ]; then git -C "$DIR" pull --ff-only -q; else git clone -q --depth 1 "$REPO" "$DIR"; fi
fi

node "$DIR/scripts/tramoya.mjs" instalar "$@"
