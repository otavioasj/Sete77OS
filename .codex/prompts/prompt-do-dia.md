<!-- gerado por scripts/sincronizar-skills.sh — edite skills/prompt-do-dia/SKILL.md -->


# Série de prompts

Carrossel do `{{HANDLE}}`. **Um tema, cinco prompts estruturados**, prontos pra copiar.

> **Formato antigo aposentado em 25/08/2026.** Antes era um prompt por post, com 5 slides. Virou
> um tema com cinco prompts, no formato que o `gptprompts.ai` usa e que funciona: dá mais valor por
> post, rende salvamento e sustenta o pedido de comentário pra receber o PDF.

## Por que essa série existe

A marca quer ser reconhecida como **agência de implementação de inteligência artificial**. Essa
série é o principal veículo disso: todo post mostra, na prática, que a gente entende de IA
aplicada. Quem copia e vê funcionar entende sozinho que sabemos do assunto. Essa é a venda.

## A regra que sustenta tudo

> **Prompt de vitrine não entra.** Todo prompt tem que fazer um trabalho real, que a pessoa hoje
> faz na mão, e devolver algo utilizável na primeira tentativa.

## Estrutura obrigatória de cada prompt

É isso que separa a nossa série de "peça pra IA escrever uma mensagem de vendas". **Nunca publicar
prompt de uma linha.**

```
CONTEXTO
Você é [papel especialista]...

MEU NEGÓCIO  (ou A SITUAÇÃO)
[campos a preencher, entre colchetes]

TAREFA
1. ...
2. ...
3. ...

FORMATO
Como a resposta deve sair (tamanho, ordem, o que incluir)

NÃO FAÇA
- restrição
- restrição
- restrição
```

**O bloco "NÃO FAÇA" é o mais importante e o que ninguém copia.** Sem ele a IA devolve textão
genérico com "prezado cliente" e emoji. As restrições são o que fazem a resposta sair usável.

**Os campos a preencher vão entre `[colchetes]` e em âmbar.** Quanto mais específico o campo, melhor
a saída: `[quem NÃO é meu cliente]` rende mais que `[seu público]`.

## Formato: carrossel de 7 slides

Base: `marketing/conteudo/_base/carrossel.css`, classe de capa `capa-prompts`.

| Slide | O que é |
|---|---|
| 1 | **Capa âmbar** (cor fixa da série, ver `identidade/design-guide.md`). Título com destaque em âmbar |
| 2 a 6 | **Um prompt por slide.** Rótulo `PROMPT 0N`, título curto em caixa alta, e o prompt inteiro no bloco monoespaçado |
| 7 | **Fecho.** Diz que o link está no primeiro comentário e mostra o endereço. Curte / salva / compartilha |

**Carrossel curto termina mais.** Conclusão é o que o Instagram usa pra decidir entrega, então 7 é
teto, não meta. Nunca cortar o prompt com reticências pra caber: se não cabe, o prompt é longo
demais e precisa ser enxugado.

## A capa

**O padrão é a capa âmbar tipográfica**, que sai direto do CSS e não precisa de imagem. Foi a
decisão de cor por série (ver `identidade/design-guide.md`) que tornou isso possível, e é o
caminho normal.

Imagem de fundo só quando o tema pedir. Nesse caso, gerada pelo ChatGPT:

```
scripts/chatgpt/abrir.sh                                  # Chrome logado, porta 9224
node scripts/chatgpt/pedir.js "<pedido>" saida.png --esperar 100
node scripts/chatgpt/baixar-imagem.js <pasta>/fundo-capa.png
```

No pedido da imagem, sempre incluir:
- Formato retrato 4:5, cena fotorrealista e cinematográfica
- Fundo preto `#0A0A0C` com luz âmbar `#F5A524`, sem azul e sem verde
- **Metade inferior quase toda preta e vazia**, pro texto entrar por cima
- **"A imagem não pode conter nenhum texto, letra, número, logo ou marca d'água"**, repetido com
  ênfase. Sem isso vem texto embutido e a imagem não serve

> Não usar o Canva pra isso: ele gera *design* com texto embutido, não imagem limpa.

## O PDF e a entrega por DM

Todo post da série tem um PDF com os cinco prompts.

**Não escreva o PDF à mão.** Os prompts já estão no `carrossel.html`, e copiar de novo é onde
entra divergência entre o post publicado e o PDF entregue. Use o gerador:

1. Crie um `pdf.json` na pasta do post com o título, o subtítulo e, pra cada um dos 5 prompts,
   o **"Quando usar"** e a **"Dica"** (é isso que o PDF acrescenta ao carrossel)
2. `node marketing/conteudo/_base/gera-pdf-prompts.js <pasta>` monta o `pdf.html`
3. `node marketing/conteudo/_base/render-pdf.js <pasta> <nome>.pdf` gera o arquivo

Exemplo pronto de `pdf.json`: `marketing/conteudo/2026-08-29/12h-prompts-estudar/`.

O PDF acrescenta o que não cabe no carrossel:
- **"Quando usar"** em cada prompt
- Uma **dica prática** no rodapé de cada página
- Página final com a oferta

**A página final fecha com os três contatos rotulados** (WhatsApp `(11) 92523-0404`, site,
`{{HANDLE}}`), nunca com botão falso nem com a URL `/whatsapp`, que é só o link da bio.
Regra em `_memoria/preferencias.md`.

## A entrega do material

**O PDF fica numa página do site, e o link vai no primeiro comentário, fixado.**
Decisão de 25/08/2026, depois de descobrir que a automação de comentário para DM
exige o app da Meta publicado (ver `_memoria/estrategia.md`).

O endereço é a própria palavra do material: `{{SITE}}/materiais/<palavra>`.
Isso importa porque **link no Instagram não é clicável nem em legenda nem em
comentário**: a pessoa vai digitar, então o que ela digita tem que ser a palavra
que ela acabou de ler no slide.

**O `publicar.sh` posta esse comentário sozinho**, lendo o `primeiro-comentario.txt`
da pasta do post, no mesmo segundo da publicação. Escrever comentário funciona mesmo
com o app em desenvolvimento; quem não funciona é ler comentário dos outros.

Então a skill só precisa **criar o `primeiro-comentario.txt`** junto com o resto.
Fixar não existe na API e é opcional: como o comentário sai antes de qualquer outro,
ele já aparece em primeiro.

A página do material sai de `marketing/conteudo/iscas.json`. Palavra nova exige
rodar `node scripts/meta/sincroniza-iscas.mjs` e publicar o site.

## Escolha do tema

Cada post é uma área. O filtro é utilidade real, não o assunto.

**Serve:** atendimento por WhatsApp, orçamento e cobrança, organização da semana, contrato e
documento difícil, estudo, avaliação no Google, resumo de reunião, controle de prazo.

**Não serve:**
- "Prompt secreto", "prompt que os experts escondem", qualquer promessa de dinheiro fácil
- Cálculo com consequência fiscal ou financeira (critério em `_memoria/preferencias.md`)
- Conselho médico, jurídico ou financeiro fechado. Preparar perguntas pro profissional é ok
- Imitar pessoa real pelo nome. Mirar no **método** e creditar a fonte

**Alternar** tema de negócio e tema de vida pessoal. Só negócio fica seco e não circula; só
pessoal vira perfil de dica de IA que não vende.

## Regras de escrita

Valem as de `_memoria/preferencias.md`, com atenção a:

- **Linguagem de leigo.** Quem lê pode nunca ter usado IA. Nada de "system prompt", "contexto de
  janela", "temperatura", "few-shot". Diz "cole isso", "troque o que está entre colchetes"
- **Sem travessão. Sem metáfora inventada**
- **Sem tom de barato no fecho.** O conteúdo é generoso; a oferta nomeia o trabalho inteiro

## Onde o post mora

`marketing/conteudo/<AAAA-MM-DD>/12h-<tema>/`, com `carrossel.html`, `legenda.md`, `texto.md`,
`pdf.json`, `pdf.html`, o PDF gerado e os PNGs em `instagram/`.

```
node marketing/conteudo/_base/render.js           marketing/conteudo/<dia>/12h-<tema>
node marketing/conteudo/_base/gera-pdf-prompts.js marketing/conteudo/<dia>/12h-<tema>
node marketing/conteudo/_base/render-pdf.js       marketing/conteudo/<dia>/12h-<tema> <nome>.pdf
zsh  scripts/meta/publicar.sh                     marketing/conteudo/<dia>/12h-<tema>
```

**A palavra-chave nunca se repete entre posts.** Ela vira o endereço da página do material
(`/materiais/<palavra>`), e repetida serviria o PDF errado. Conferir a tabela do
`marketing/conteudo/README.md` antes de escolher.

## Antes de publicar

**Testar os cinco prompts de verdade.** Rodar cada um e conferir se a saída presta. A série inteira
depende disso: um prompt que não funciona queima a confiança de todos os outros. Se a saída vier
fraca, ajustar o prompt, nunca a legenda.
