# Instruções do agente — Sete77OS

O Sete77OS funciona com **qualquer agente de terminal** — Claude Code, Codex ou outro.
As instruções de trabalho ficam em `skills/`, uma pasta por skill, cada uma com um `SKILL.md`.

## Como usar uma skill

Quando o usuário pedir algo que corresponda a uma skill da tabela abaixo — pelo nome
(`/carrossel`) ou pela intenção ("faz um post pro Instagram") — **leia o `SKILL.md`
correspondente antes de agir** e siga o que está escrito lá. Se não houver skill pra
tarefa, execute normalmente.

Antes de qualquer tarefa, carregue o contexto do negócio de `_memoria/` (`empresa.md`,
`preferencias.md`, `estrategia.md`) e, pra tarefa visual, de `identidade/design-guide.md`.

As regras de operação completas estão no `CLAUDE.md` — valem pra qualquer agente,
não só pro Claude.

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

## Estrutura

- `skills/` — **fonte única**. É aqui que se edita e se cria skill.
- `.claude/skills/` — cópia gerada, é onde o Claude Code procura.
- `.codex/prompts/` — cópia gerada, um `.md` por skill, sem o frontmatter YAML.
- `scripts/sincronizar-skills.sh` — regenera as duas cópias a partir de `skills/`.

**Nunca edite `.claude/skills/` ou `.codex/prompts/` na mão** — a alteração se perde na
próxima sincronização. Edite `skills/` e rode:

```bash
./scripts/sincronizar-skills.sh
```

## Placeholders

Duas skills de conteúdo trazem `{{MARCA}}`, `{{MARCA_CURTA}}`, `{{HANDLE}}` e `{{SITE}}`
no lugar dos dados da marca. O `/instalar` preenche. Ver `PLACEHOLDERS.md`.

## Nota sobre o Codex

O Codex lê este `AGENTS.md` sozinho ao abrir o projeto — só com ele as skills já
funcionam por intenção ("faz um carrossel").

Pra chamar por barra (`/carrossel`) no Codex, os prompts precisam estar na pasta
de prompts do usuário:

```bash
mkdir -p ~/.codex/prompts && cp .codex/prompts/*.md ~/.codex/prompts/
```
