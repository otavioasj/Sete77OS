#!/usr/bin/env bash
# Conecta as skills deste projeto aos agentes (macOS e Linux).
# No Windows, use scripts/conectar.ps1.
#
# As skills moram em skills/. Este script cria os atalhos que cada agente
# espera, pra que os dois leiam e escrevam nos MESMOS arquivos:
#   .claude/skills        -> skills/            (Claude Code)
#   ~/.codex/skills/<x>   -> skills/<x>         (Codex)
#
#   ./scripts/conectar.sh              cria os atalhos
#   ./scripts/conectar.sh --copiar     copia em vez de atalhar
#   ./scripts/conectar.sh --desligar   remove os atalhos deste projeto
set -euo pipefail
cd "$(dirname "$0")/.."
RAIZ="$(pwd)"
CODEX="${CODEX_HOME:-$HOME/.codex}/skills"
MODO="${1:-atalho}"

[ -d skills ] || { echo "erro: rode da raiz do projeto (não achei skills/)"; exit 1; }

if [ "$MODO" = "--desligar" ]; then
  [ -L .claude/skills ] && rm .claude/skills && echo "  .claude/skills removido"
  n=0
  if [ -d "$CODEX" ]; then
    for l in "$CODEX"/*; do
      [ -L "$l" ] || continue
      case "$(readlink "$l")" in "$RAIZ"/skills/*) rm "$l"; n=$((n+1));; esac
    done
  fi
  echo "  $n atalhos removidos de $CODEX"
  exit 0
fi

# --- Claude Code ---
mkdir -p .claude
if [ -L .claude/skills ]; then rm .claude/skills
elif [ -d .claude/skills ]; then
  echo "  ! .claude/skills é uma pasta de verdade — mova o conteúdo pra skills/ e rode de novo"; exit 1
fi
if [ "$MODO" = "--copiar" ]; then cp -R skills .claude/skills; else ln -s ../skills .claude/skills; fi
echo "  Claude Code: .claude/skills pronto"

# --- Codex ---
mkdir -p "$CODEX"
n=0; pulou=0
for d in skills/*/; do
  s=$(basename "$d"); alvo="$CODEX/$s"
  if [ -L "$alvo" ] && [ "$(readlink "$alvo")" = "$RAIZ/skills/$s" ]; then continue; fi
  if [ -e "$alvo" ] || [ -L "$alvo" ]; then
    echo "  ! '$s' já existe em $CODEX apontando pra outro lugar — pulando"
    pulou=$((pulou+1)); continue
  fi
  if [ "$MODO" = "--copiar" ]; then cp -R "$RAIZ/skills/$s" "$alvo"; else ln -s "$RAIZ/skills/$s" "$alvo"; fi
  n=$((n+1))
done
echo "  Codex: $n skills conectadas em $CODEX"

# --- adoção: skill criada solta na pasta do Codex volta pro projeto ---
adotadas=0
for d in "$CODEX"/*/; do
  [ -d "$d" ] || continue
  s=$(basename "$d")
  case "$s" in .*) continue;; esac
  [ -L "${d%/}" ] && continue          # já é atalho nosso
  [ -e "skills/$s" ] && continue       # conflito, já avisado acima
  [ -f "$d/SKILL.md" ] || continue
  mv "$d" "skills/$s"
  ln -s "$RAIZ/skills/$s" "$CODEX/$s"
  echo "  + '$s' foi criada solta no Codex — movida pro projeto e conectada"
  adotadas=$((adotadas+1))
done
[ "$adotadas" -gt 0 ] && echo "  ($adotadas adotadas — confira e comite)"
[ "$pulou" -gt 0 ] && echo "  ($pulou puladas por conflito de nome — resolva à mão)"
[ "$MODO" = "--copiar" ] && echo "  ATENÇÃO: modo cópia. Editar num lado não reflete no outro."
echo "Pronto. No Codex, ficam disponíveis no próximo turno."
