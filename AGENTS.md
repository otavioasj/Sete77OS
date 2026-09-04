# Sete77OS — Sistema operacional do negócio

Sua empresa roda em cima desse arquivo. Aqui ficam as regras de operação
do Sete77OS — como o agente lê o contexto, aprende com correções, mantém
tudo atualizado e cria skills novas conforme a operação evolui.

**Este arquivo vale pra qualquer agente.** `CLAUDE.md` e `AGENTS.md` são o
mesmo arquivo: o Claude Code lê um, o Codex lê o outro, e os dois apontam
pro mesmo conteúdo. Editar um é editar o outro.

Esse arquivo é editável. Quando o `/instalar` rodar, ele complementa o
final dessa página com as regras específicas do seu negócio.

---

## Um só lugar pra tudo

Você pode usar Claude Code, Codex, ou os dois ao mesmo tempo no mesmo
projeto. Pra o contexto não se partir, **tudo que muda mora dentro do
projeto**, num lugar só:

| O que muda | Onde mora | Vale pros dois? |
|---|---|---|
| Contexto do negócio | `_memoria/*.md` | sim |
| Identidade visual | `identidade/design-guide.md` | sim |
| Regras de operação | este arquivo | sim |
| Skills | `skills/` | sim |
| Entregas e dados | `saidas/`, `dados/`, `clientes/` | sim |

**Nunca salve contexto na memória particular do agente** — nem no
`~/.claude/`, nem no `~/.codex/`, nem em memória interna de sessão. O que
for aprendido numa conversa do Codex tem que estar visível pro Claude na
conversa seguinte, e vice-versa. Se está no projeto, está compartilhado.

As pastas `.claude/skills/` e `~/.codex/skills/<skill>` são **atalhos**
(symlinks) pra `skills/`. Editar por qualquer um dos caminhos altera o
mesmo arquivo. Não existe cópia pra sincronizar.

---

## Contexto do negócio

No início de toda conversa, ler os seguintes arquivos (quando existirem
e estiverem preenchidos):

1. `_memoria/empresa.md` — quem é o usuário, o que faz, como funciona o negócio
2. `_memoria/preferencias.md` — tom de voz, estilo de escrita, o que evitar
3. `_memoria/estrategia.md` — foco atual, prioridades, prazos

Usar essas informações como base pra qualquer resposta ou decisão. Ao
sugerir prioridades, formatos ou abordagens, considerar o foco atual
descrito em `estrategia.md`.

Pra qualquer tarefa visual (carrossel, post, landing page), consultar
`identidade/design-guide.md` como referência de estilo.

Não é necessário listar o que foi lido nem confirmar a leitura. Apenas
usar o contexto naturalmente.

---

## Fluxo de trabalho

Antes de executar qualquer tarefa, verificar se existe skill relevante
em `skills/`. Se encontrar, seguir as instruções da skill. Se
não encontrar, executar a tarefa normalmente.

`skills/` é a **fonte única**. A pasta `.claude/skills/` é cópia gerada por
`scripts/sincronizar-skills.sh` — nunca editar direto nela. Depois de criar
ou alterar uma skill, rodar o script pra sincronizar.

Ao concluir uma tarefa que não tinha skill mas parece repetível (o
usuário provavelmente vai pedir de novo no futuro), perguntar:

> "Isso pode virar uma skill pra próxima vez. Quer que eu crie?"

Não perguntar pra tarefas pontuais ou perguntas simples. Só quando o
padrão de repetição for claro.

---

## Aprender com correções

Quando o usuário corrigir algo, melhorar uma resposta ou dar uma
instrução que parece permanente (frases como "na verdade é assim", "não
faça mais isso", "prefiro assim", "sempre que...", "evita...", "da
próxima vez..."), perguntar:

> "Quer que eu salve isso pra não precisar repetir?"

Se sim, identificar onde faz mais sentido salvar:

- **Sobre o negócio** (clientes, serviços, mercado) → `_memoria/empresa.md`
- **Sobre preferências e estilo** (tom de voz, formato, o que evitar) → `_memoria/preferencias.md`
- **Sobre prioridades e foco** (projetos, metas, prazos) → `_memoria/estrategia.md`
- **Regra de comportamento nessa pasta** → próprio `CLAUDE.md`

Salvar com uma linha nova clara, sem reformatar o arquivo inteiro.
Confirmar mostrando a linha adicionada.

Não perguntar se a correção for óbvia de contexto imediato (ex: "na
verdade o arquivo se chama X"). Só perguntar quando a informação tiver
valor duradouro.

---

## Manter contexto atualizado

Ao terminar uma tarefa que mudou algo relevante (cliente novo, skill
nova, mudança de foco, processo novo, ferramenta instalada, estrutura
alterada), perguntar:

> "Isso mudou algo no teu contexto. Quer que eu atualize a memória?"

Se sim, identificar o que atualizar:

- **Cliente, serviço, ferramenta, equipe** → `_memoria/empresa.md`
- **Mudança de prioridade ou foco** → `_memoria/estrategia.md`
- **Tom ou estilo** → `_memoria/preferencias.md`
- **Pasta, regra de organização, skill criada** → `CLAUDE.md`
- **Visual (cores, fontes, logo)** → `identidade/design-guide.md`

Mostrar o que vai mudar antes de salvar. Não reformatar o arquivo
inteiro, só adicionar ou editar a linha relevante.

**Quando NÃO perguntar:**
- Tarefas pontuais sem impacto no contexto (escrever um email avulso, criar um post)
- Perguntas simples ou conversas sem ação
- Mudanças já salvas pelo bloco "Aprender com correções"

**Dica:** rode `/atualizar` pra uma varredura completa quando houver dúvida.

---

## Criação de skills

Quando o usuário pedir skill nova:

1. Verificar se existe template relevante em `templates/skills/`. Se
   existir, usar como base e adaptar pro contexto
2. Perguntar se é específica desse projeto ou útil em qualquer:
   - Específica → `skills/nome-da-skill/SKILL.md` (dentro do projeto)
   - Universal → a pasta global do agente em uso
3. Ler `_memoria/empresa.md` e `_memoria/preferencias.md` pra calibrar
   o conteúdo da skill ao contexto do negócio
4. Se a skill precisar de arquivos de apoio (templates, exemplos),
   criar dentro da pasta da skill
5. Criar direto em `skills/` — não em `.claude/skills/` nem em
   `~/.codex/skills/`, que são atalhos pra cá. A skill nova aparece
   nos dois agentes sem passo extra

---

## Skills disponíveis

| Skill | O que faz |
|---|---|
| `/abrir` | Abre uma sessão de trabalho carregando a memória do negócio (empresa, preferências, estratégia, identidade) e devolve um resumo curto pro usuário |
| `/analisar-dados` | Analisa um arquivo de dados (CSV, Excel, TXT, JSON) e gera um resumo executivo com os principais insights, tendências e recomendações |
| `/anuncio-google` | Cria estrutura completa de campanha do Google Ads a partir de um briefing ou da pesquisa SEO. Gera CSV pronto pra importar no Google Ads Editor... |
| `/aprovar-post` | Aprova e publica um post da fila — flipa o blog de draft pra published, copia os PNGs do carrossel pro public folder do site, faz commit e push... |
| `/atualizar` | Varre o projeto e atualiza os arquivos de contexto (`_memoria/empresa.md`, `preferencias.md`, `estrategia.md`, `CLAUDE.md`,... |
| `/carrossel` | Cria carrosséis e posts visuais pra Instagram, TikTok, LinkedIn com a identidade visual da marca. Gera HTML estilizado + renderiza em PNG... |
| `/email-profissional` | Rascunha um email profissional a partir de um contexto livre. Calibra o tom ao destinatário e ao objetivo do email |
| `/github-da-semana` | Cria um carrossel da série "IA na prática" do Instagram da marca: um projeto do GitHub ou uma skill que resolve algo no dia a dia, com foco em... |
| `/grill-me` | A relentless interview to sharpen a plan or design |
| `/grilling` | Grill the user relentlessly about a plan, decision, or idea |
| `/instalar` | Instala o Sete77OS no negócio do usuário. Entrevista sobre empresa, tom de voz, foco atual e identidade visual, e preenche `_memoria/empresa.md`,... |
| `/mapear-rotinas` | Mapeia tarefas repetitivas que o usuário faz no dia a dia e gera skills personalizadas pra automatizá-las. Faz uma entrevista curta sobre o que o... |
| `/novo-projeto` | Cria uma pasta de projeto nova com `CLAUDE.md` dedicado, depois de uma entrevista curta sobre o projeto (cliente, objetivo, entregas previstas) |
| `/prompt-do-dia` | Cria um carrossel da série "5 prompts pra [área]" do Instagram da marca: um tema, cinco prompts estruturados prontos pra copiar, mais o PDF que... |
| `/publicar-tema` | Orquestra a criação completa de uma peça de conteúdo SEO + redes sociais a partir de um tema. Pega um tema (manual ou da estratégia de conteúdo do... |
| `/relatorio-ads` | Gera relatório semanal de performance de anúncios pagos (Google Ads + Meta Ads). Lê CSVs exportados das plataformas (ou prints) e devolve análise... |
| `/responder-avaliacoes` | Escreve respostas curtas e humanas pras avaliações do Google Meu Negócio. Mantém o padrão: nome do cliente, agradecimento variado, frase concreta... |
| `/salvar` | Salva o trabalho do Sete77OS no GitHub (commit + push). Na primeira vez configura o repositório remoto |
| `/seo` | Fluxo completo de SEO, GEO e Google Ads em 8 passos: pesquisa de demanda, análise de concorrência, Google Meu Negócio, otimização on-page,... |
| `/setup-matt-pocock-skills` | Configure this repo for the engineering skills: set up its issue tracker, triage label vocabulary, and domain doc layout. Run once before first... |

---

## Estrutura

- `skills/` — **o lugar das skills**. Uma pasta por skill, com `SKILL.md`.
- `.claude/skills` — atalho pra `skills/`. É onde o Claude Code procura.
- `~/.codex/skills/<skill>` — atalhos pra cá, criados por
  `scripts/conectar-codex.sh`. É onde o Codex procura.
- `CLAUDE.md` / `AGENTS.md` — o mesmo arquivo, por dois nomes.

Claude Code e Codex usam **o mesmo formato de skill**: uma pasta com um
`SKILL.md` que traz `name` e `description` no frontmatter. Por isso a
mesma pasta serve aos dois, sem conversão.

---

## Ligando o Codex

O Claude Code já enxerga as skills assim que você abre o projeto. O Codex
procura numa pasta global (`$CODEX_HOME/skills`, padrão `~/.codex/skills`),
então precisa de um passo, uma vez por projeto:

```bash
./scripts/conectar-codex.sh
```

Isso cria os atalhos. Depois disso, skill criada ou editada em qualquer um
dos dois aparece nos dois.

Independente disso, o Codex lê este arquivo ao abrir o projeto, então as
skills já funcionam por intenção ("faz um carrossel") mesmo sem conectar.

---

## Placeholders

Duas skills de conteúdo trazem `{{MARCA}}`, `{{MARCA_CURTA}}`, `{{HANDLE}}` e
`{{SITE}}` no lugar dos dados da marca. O `/instalar` preenche. Ver
`PLACEHOLDERS.md`.
