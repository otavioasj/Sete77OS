#!/usr/bin/env bash
# Gera as cópias por agente a partir de skills/ (fonte única).
# Rodar da raiz do projeto, sempre que editar ou criar uma skill.
set -euo pipefail
cd "$(dirname "$0")/.."

[ -d skills ] || { echo "erro: rode da raiz do projeto (não achei skills/)"; exit 1; }

# --- Claude Code: .claude/skills/ ---
rm -rf .claude/skills
mkdir -p .claude/skills
cp -R skills/. .claude/skills/

# --- Codex: .codex/prompts/ (um .md por skill, sem frontmatter YAML) ---
rm -rf .codex/prompts
mkdir -p .codex/prompts
for d in skills/*/; do
  n=$(basename "$d")
  [ -f "$d/SKILL.md" ] || continue
  {
    echo "<!-- gerado por scripts/sincronizar-skills.sh — edite skills/$n/SKILL.md -->"
    echo
    # remove o bloco de frontmatter YAML (--- ... ---) do topo
    awk 'NR==1 && $0=="---" {inf=1; next} inf==1 && $0=="---" {inf=2; next} inf!=1 {print}' "$d/SKILL.md"
  } > ".codex/prompts/$n.md"
done

echo "sincronizado: $(ls skills | wc -l | tr -d ' ') skills -> .claude/skills/ e .codex/prompts/"
