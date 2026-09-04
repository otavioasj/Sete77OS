<!-- gerado por scripts/sincronizar-skills.sh — edite skills/github-da-semana/SKILL.md -->


# IA na prática (slot das 19h)

Carrossel do `{{HANDLE}}`. **Capa prata.** Um projeto ou uma skill por post, todo dia.

> **Redefinida em 25/08/2026.** Antes era só "projeto em alta do GitHub", uma vez por semana.
> Não fechava como série diária: a lista de tendências não muda todo dia. Agora é qualquer coisa
> do GitHub que resolva algo de verdade, em alta ou não, **mais skills**, e o ranking semanal
> virou a edição de segunda.

## Para quem é

Não é pro leigo total, que é o público dos outros dois slots. É pra quem **já usa IA e quer o
próximo degrau**: já mexe no ChatGPT, quer saber o que mais existe.

## O ângulo que define a série

> **Economia.** O fio condutor é mostrar o que substitui ferramenta paga. Repositório que roda no
> computador da pessoa no lugar de assinatura mensal.

Todo post responde, em algum lugar: **o que isso te faz parar de pagar, e o que custa em troca.**

## As 4 regras inegociáveis

1. **Todo post tem um aviso honesto.** Onde não funciona, o que a máquina precisa, qual o custo
   escondido. É o que separa a gente de perfil de guru, e é o motivo de alguém confiar na próxima
   indicação.
2. **Sempre dizer se precisa programar e se é grátis de verdade.** Muito projeto "gratuito" exige
   chave de API paga. Isso vai escrito, sempre.
3. **Nunca prometer o que a gente não fez.** Não escrever "a gente testou" sem ter testado, nem
   prometer print de tela que o PDF não vai ter. Já aconteceu de escapar duas vezes: confira o
   fecho antes de renderizar.
4. **Ensinar, não falar da gente.** Um carrossel de posicionamento foi produzido e recusado em
   25/08 por isso.

## Antes de escrever

**Ler o README do projeto.** Não escrever a partir de resultado de busca: busca erra número. Em
25/08 uma busca afirmou 13 mil estrelas num repositório que tinha 498.

Conferir e anotar:
- O que o projeto faz, na ordem em que acontece
- Requisito de máquina (RAM, placa de vídeo, sistema)
- Licença. **MIT e Apache 2.0** liberam uso comercial; "non-commercial" proíbe usar no negócio
- O que dentro dele custa dinheiro
- Última atualização. Mais de 6 meses parado, não indicar

Fontes: `github.com/trending?since=weekly`, `github.com/topics/claude-skills`,
`github.com/anthropics/claude-plugins-community`.

## Formato: carrossel de 7 slides

Base: `marketing/conteudo/_base/carrossel.css`, classe de capa `capa-github`.

| Slide | O que é |
|---|---|
| 1 | **Capa prata**, selo `IA NA PRÁTICA` (ou `GITHUB DA SEMANA` na segunda) |
| 2 a 5 | O conteúdo: o que faz, os números, o que precisa, o custo escondido |
| 6 | **O aviso honesto.** Nunca cortar esse slide |
| 7 | **Fecho âmbar.** O endereço do material, que é a palavra dele |

Componentes prontos no CSS: `.repo` (ficha com estrelas), `.troca` (pago x grátis), `.tabela`,
`.checklist`, `.comando`, `.aviso`.

## O PDF

Todo post tem um. Base: `_base/pdf.css`, gerado com `_base/render-pdf.js`.

O PDF acrescenta o que não cabe no carrossel: instalação passo a passo, configuração, o que fazer
quando dá errado, e alternativas. Costuma ter de 4 a 6 páginas.

**A palavra-chave nunca se repete entre posts.** Ela vira o endereço da página do material
(`/materiais/<palavra>`), e repetida serviria o PDF errado. Conferir a tabela do
`marketing/conteudo/README.md` antes de escolher.

## A entrega do material

**O PDF fica numa página do site, e o link vai no primeiro comentário, fixado.**
Decisão de 25/08/2026, depois de descobrir que a automação de comentário para DM exige o app da
Meta publicado (ver `_memoria/estrategia.md`).

O endereço é a própria palavra do material: `{{SITE}}/materiais/<palavra>`. Isso
importa porque **link no Instagram não é clicável nem em legenda nem em comentário**: a pessoa vai
digitar, então o que ela digita tem que ser a palavra que ela acabou de ler no slide.

**O `publicar.sh` posta esse comentário sozinho**, lendo o `primeiro-comentario.txt` da pasta, no
mesmo segundo da publicação. Escrever comentário funciona mesmo com o app em desenvolvimento; quem
não funciona é ler comentário dos outros.

Então a skill só precisa **criar o `primeiro-comentario.txt`** junto com o resto. Fixar não existe
na API e é opcional: como o comentário sai antes de qualquer outro, ele já aparece em primeiro.

A página sai de `marketing/conteudo/iscas.json`. Material novo exige rodar
`node scripts/meta/sincroniza-iscas.mjs` e publicar o site.

## A edição de segunda: GitHub da Semana

Uma vez por semana o formato muda pro ranking.

- Rodar a pesquisa **na própria segunda**, não antes
- Separar os que servem pra quem não programa dos que são de dev, e dizer isso
- Fechar com a **leitura da semana**: o que os projetos têm em comum
- Explicar o que estrela significa: é o "curtir" do GitHub, diz que virou assunto, **não que é bom
  nem seguro**

## Regras de escrita

Valem as de `_memoria/preferencias.md`, com atenção a:

- **Sem travessão. Sem metáfora inventada.**
- **Traduzir jargão na primeira aparição.** "Repositório" vira "projeto". "Self-hosted" vira "roda
  no seu servidor". "Fork" não aparece
- Número sempre com a data em que foi conferido
- **Fecho com os três contatos**, nunca com botão falso nem com a URL `/whatsapp`

## Onde o post mora

`marketing/conteudo/<AAAA-MM-DD>/19h-<tema>/`

```
node marketing/conteudo/_base/render.js     marketing/conteudo/<dia>/19h-<tema>
node marketing/conteudo/_base/render-pdf.js marketing/conteudo/<dia>/19h-<tema> <nome>.pdf
zsh  scripts/meta/publicar.sh               marketing/conteudo/<dia>/19h-<tema>
```
