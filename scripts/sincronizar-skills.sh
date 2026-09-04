#!/usr/bin/env bash
# Gera a cópia do Claude Code a partir de skills/ (fonte única).
# Rodar da raiz do projeto, sempre que editar ou criar uma skill.
set -euo pipefail
cd "$(dirname "$0")/.."

[ -d skills ] || { echo "erro: rode da raiz do projeto (não achei skills/)"; exit 1; }

rm -rf .claude/skills
mkdir -p .claude/skills
cp -R skills/. .claude/skills/

echo "sincronizado: $(ls skills | wc -l | tr -d ' ') skills -> .claude/skills/"
echo "pro Codex, rode: ./scripts/instalar-no-codex.sh"
