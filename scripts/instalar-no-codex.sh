#!/usr/bin/env bash
# Instala as skills deste projeto no Codex.
# O Codex usa o mesmo formato do Claude Code (SKILL.md com frontmatter),
# mas procura em $CODEX_HOME/skills (padrão: ~/.codex/skills).
set -euo pipefail
cd "$(dirname "$0")/.."

DEST="${CODEX_HOME:-$HOME/.codex}/skills"
[ -d skills ] || { echo "erro: rode da raiz do projeto (não achei skills/)"; exit 1; }
mkdir -p "$DEST"

n=0
for d in skills/*/; do
  s=$(basename "$d")
  rm -rf "${DEST:?}/$s"
  cp -R "$d" "$DEST/$s"
  n=$((n+1))
done

echo "instaladas $n skills em $DEST"
echo "elas ficam disponíveis no próximo turno do Codex."
