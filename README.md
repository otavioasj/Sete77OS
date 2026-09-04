# Sete77OS

> O sistema operacional do seu negócio dentro do seu agente de terminal.

Você acaba de instalar o Sete77OS. Em alguns minutos, sua empresa vai
ter uma memória própria, uma identidade visual aplicada em tudo que
o sistema gerar, e 20 skills prontas pra fazer marketing, SEO, ads
e operação rodarem com você dirigindo.

Bora voar.

---

## Ligando o sistema

Dois caminhos. Escolhe o que combina contigo.

### Pelo Claude (mais rápido)

Abre o Claude Code em qualquer pasta e cola:

```
Clona o https://github.com/otavioasj/Sete77OS.git na pasta atual,
entra nela e roda o /instalar.
```

Ele clona, entra na pasta nova e dispara a entrevista de setup. Você
só responde.

### Pelo terminal (mais previsível)

```
git clone https://github.com/otavioasj/Sete77OS.git
cd Sete77OS
code .
```

Na janela do VS Code que abrir: terminal integrado → `claude` → `/instalar`.

---

Quando o `/instalar` terminar, renomeia a pasta `Sete77OS/` pro nome do teu
negócio (fecha o VS Code, renomeia no Explorer/Finder, abre de novo). A
pasta não fica como "Sete77OS" — ela é o teu negócio agora.

O `/instalar` roda uma vez só. Te entrevista sobre o negócio, monta a
memória e configura o sistema. Depois disso, é só usar.

---

## Claude ou Codex — ou os dois

Você pode rodar Claude Code e Codex no mesmo projeto, ao mesmo tempo, em
janelas diferentes do VS Code. O contexto não se parte, porque **nada é
copiado**: as pastas que cada agente procura são atalhos pro mesmo lugar.

| O que muda | Onde mora de verdade |
|---|---|
| Contexto do negócio | `_memoria/*.md` |
| Regras de operação | `AGENTS.md` (o `CLAUDE.md` aponta pra ele) |
| Skills | `skills/` (o `.claude/skills` é atalho pra ela) |
| Entregas | `saidas/`, `dados/`, `clientes/` |

Aprendeu algo numa conversa do Codex? Na próxima conversa do Claude já está
lá. Criou uma skill pelo Claude? O Codex enxerga na hora.

Depois de clonar, rode uma vez — **funciona igual nos três sistemas**:

**Windows**
```powershell
.\scripts\conectar.ps1
```

**macOS e Linux**
```bash
./scripts/conectar.sh
```

Não precisa de Modo Desenvolvedor, nem de admin, nem de configurar o git: no
Windows o script usa *junction*, que qualquer conta cria. E cada atalho é
conferido depois de criado — se o sistema de arquivos não aceitar link
(pasta de rede, pendrive), o script avisa e te manda pro modo `-Copiar`, em
vez de fingir que deu certo.

Pra desfazer: `-Desligar` (Windows) ou `--desligar` (macOS/Linux).

---

## O sistema

**Núcleo** — o jeito de operar o dia a dia
`/abrir` carrega o contexto antes de cada sessão de trabalho · `/salvar`
faz commit + push no GitHub · `/atualizar` varre o projeto e atualiza
a memória · `/novo-projeto` cria pasta isolada pra cada cliente ou
iniciativa · `/mapear-rotinas` descobre o que você repete e transforma
em skill personalizada.

**Conteúdo e SEO** — vitrine pública da empresa
`/carrossel` cria carrosséis 1080×1350 com identidade da marca (com ou
sem foto IA) · `/publicar-tema` pega um tema e entrega artigo de blog +
carrossel + 3 legendas amarradas · `/seo` roda fluxo completo de 8 passos
(demanda, concorrência, GMB, on-page, conteúdo, ads, monitoramento, GEO)
· `/responder-avaliacoes` escreve respostas humanas pras reviews do
Google · `/aprovar-post` publica blog + Instagram + Facebook num comando.

**Anúncios pagos** — onde o dinheiro entra
`/anuncio-google` monta a campanha inteira em CSV pronto pra importar
no Google Ads Editor · `/relatorio-ads` lê os exports de Google + Meta
e devolve relatório semanal com alertas e recomendações.

**Produção** — ferramentas do dia a dia
`/analisar-dados` lê CSV/XLSX/PDF e gera resumo executivo ·
`/email-profissional` rascunha email a partir de contexto livre.

---

## A tese

IA não é uma ferramenta que sua empresa usa. É o sistema operacional em
que ela roda.

A diferença não é velocidade. É capacidade nova — uma pessoa com IA
constrói o que antes exigia time inteiro. Cada processo crítico que hoje
roda em open loop (decide → executa → não mede → repete cego) vira
closed loop dentro do Sete77OS (decide → executa → captura → realimenta →
ajusta sozinho).

O sistema não substitui você. Vira parte da sua empresa.

---

## Como o Sete77OS pensa

`_memoria/` é o cérebro. Tudo que importa do seu negócio mora aqui —
quem é a empresa, como ela fala, o que tá em foco essa semana. O Claude
lê isso antes de cada resposta. Quanto melhor a memória, melhor o sistema.

`identidade/` é o rosto. Cores, fontes, logo, padrão visual. Todo
carrossel, slide, peça que o sistema gera respeita isso.

`marketing/`, `saidas/` e `scripts/` são o resultado. O sistema produz,
versiona no GitHub, fica tudo seu.
