#!/usr/bin/env sh
# Cria uma ferramenta de craft nova e junta-a ao painel.
# Uso:  scripts/novo-craft.sh <pasta> "<Título>" "<Nome curto>"
# Ex.:  scripts/novo-craft.sh drogas "Craft de Drogas" "Drogas"
# Depois é só preencher `groups` em public/<pasta>/index.html.
set -eu
cd "$(dirname "$0")/.."
[ $# -eq 3 ] || { echo 'Uso: scripts/novo-craft.sh <pasta> "<Título>" "<Nome curto>"'; exit 1; }
pasta=$1 titulo=$2 curto=$3
[ -e "public/$pasta" ] && { echo "public/$pasta já existe."; exit 1; }
mkdir -p "public/$pasta"
sed -e "s|__PASTA__|$pasta|g" -e "s|__TITULO__|$titulo|g" -e "s|__CURTO__|$curto|g" \
    -e "s|__DESCRICAO__|$titulo: escolhe as quantidades e vê os materiais e o dinheiro que tens de reunir.|g" \
    scripts/modelo.html > "public/$pasta/index.html"
# linha nova no painel, antes do fim da lista
awk -v p="$pasta" -v t="$titulo" '
  /<\/ul>/ && !done { print "    <li class=\"tool\">\n      <a href=\"" p "/\" data-tool=\"" p "\">\n        <h2>" t "</h2>\n        <span class=\"go\">Abrir</span>\n      </a>\n    </li>"; done=1 }
  { print }' public/index.html > public/index.html.tmp && mv public/index.html.tmp public/index.html
echo "Feito: public/$pasta/index.html (preenche os groups) e linha no painel."
