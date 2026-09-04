#!/usr/bin/env bash
# Conecta as skills deste projeto ao Codex.
#
# O Claude Code lê as skills de dentro do projeto (.claude/skills é um
# atalho pra skills/). O Codex procura numa pasta global. Este script cria
# um atalho lá pra cada skill daqui — então editar por qualquer caminho
# altera o mesmo arquivo, e o contexto não se parte entre os dois agentes.
#
#   ./scripts/conectar-codex.sh              cria os atalhos
#   ./scripts/conectar-codex.sh --copiar     copia em vez de atalhar
#   ./scripts/conectar-codex.sh --desligar   remove os atalhos deste projeto
set -euo pipefail
cd "$(dirname "$0")/.."
RAIZ="$(pwd)"
DEST="${CODEX_HOME:-$HOME/.codex}/skills"

[ -d skills ] || { echo "erro: rode da raiz do projeto (não achei skills/)"; exit 1; }
mkdir -p "$DEST"

MODO="${1:-atalho}"

if [ "$MODO" = "--desligar" ]; then
  n=0
  for l in "$DEST"/*; do
    [ -L "$l" ] || continue
    case "$(readlink "$l")" in "$RAIZ"/skills/*) rm "$l"; n=$((n+1));; esac
  done
  echo "removidos $n atalhos deste projeto de $DEST"
  exit 0
fi

n=0; pulou=0
for d in skills/*/; do
  s=$(basename "$d")
  alvo="$DEST/$s"
  # não pisar em skill de outro projeto ou instalada à mão
  if [ -e "$alvo" ] || [ -L "$alvo" ]; then
    if [ -L "$alvo" ] && [ "$(readlink "$alvo")" = "$RAIZ/skills/$s" ]; then
      continue
    fi
    echo "  ! '$s' já existe em $DEST e aponta pra outro lugar — pulando"
    pulou=$((pulou+1)); continue
  fi
  if [ "$MODO" = "--copiar" ]; then cp -R "$RAIZ/skills/$s" "$alvo"
  else ln -s "$RAIZ/skills/$s" "$alvo"; fi
  n=$((n+1))
done

echo "conectadas $n skills em $DEST"
[ "$pulou" -gt 0 ] && echo "puladas $pulou (conflito de nome — resolva à mão)"
echo "ficam disponíveis no próximo turno do Codex."
