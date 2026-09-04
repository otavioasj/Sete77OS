# Placeholders do pacote

Duas skills de conteúdo (`prompt-do-dia` e `github-da-semana`) e o template
`prompt-do-dia/template/carrossel.html` vêm com marcadores no lugar dos dados
da marca. O `/instalar` preenche a partir de `_memoria/empresa.md` e
`identidade/design-guide.md`.

| Marcador | O que é | Exemplo |
|---|---|---|
| `{{MARCA}}` | Nome completo da marca | Padaria do Zé |
| `{{MARCA_CURTA}}` | Assinatura curta, usada no topo do slide | PADARIA |
| `{{HANDLE}}` | @ do Instagram | @padariadoze |
| `{{SITE}}` | Domínio do site | padariadoze.com.br |

Pra trocar tudo de uma vez num projeto novo:

```bash
grep -rl '{{' .claude/skills | xargs sed -i '' \
  -e 's/{{MARCA}}/Nome Da Marca/g' \
  -e 's/{{MARCA_CURTA}}/MARCA/g' \
  -e 's/{{HANDLE}}/@handle/g' \
  -e 's/{{SITE}}/dominio.com.br/g'
```
