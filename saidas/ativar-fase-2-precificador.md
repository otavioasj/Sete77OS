# Ativar a Fase 2 do Precificador — acesso por compra

Passo a passo pra ligar o **login por compra** do app Precificador. Hoje o app
está **aberto** (qualquer um acessa). Ao terminar este guia, só quem comprou na
Hotmart (ou e-mails de cortesia) consegue entrar.

> Projeto do app: `d:\10-PROJETOS\Projects\PapelariaLucrativa`
> O código da Fase 2 já está pronto — aqui é só **configuração**, sem programar.

## Como funciona (resumo)

1. A aluna compra na Hotmart → a Hotmart avisa o app (webhook) → o e-mail dela
   fica **autorizado**.
2. Ela abre o app, digita o e-mail → recebe um **código de 6 dígitos** por e-mail.
3. Digita o código → entra (sessão fica salva ~30 dias num cookie seguro).
4. Reembolso/chargeback → a Hotmart avisa de novo → o acesso é **revogado**.

Pra isso funcionar você precisa de 3 serviços (todos têm plano grátis):
**Upstash** (guarda quem comprou), **Resend** (envia o código por e-mail) e a
**Hotmart** (avisa das compras).

> ⚠️ **Deixe o `AUTH_ENABLED` por último.** Configure tudo, teste com seu e-mail,
> e só então ligue a trava. Assim você nunca tranca o app antes da hora.

---

## Passo 1 — Upstash Redis (onde ficam os e-mails autorizados)

1. Crie conta em https://upstash.com (pode logar com Google — grátis).
2. **Create Database** → tipo **Redis** → nome `precificador` → região mais
   próxima do Brasil (ex.: `us-east-1`) → **Create**.
3. Na página do banco, seção **REST API**, copie os dois valores:
   - `UPSTASH_REDIS_REST_URL`
   - `UPSTASH_REDIS_REST_TOKEN`
4. Guarde os dois (vão pra Vercel no Passo 5).

## Passo 2 — Resend (envio do código por e-mail)

1. Crie conta em https://resend.com (grátis, ~3.000 e-mails/mês).
2. **Domains** → **Add Domain** → digite seu domínio: `artesanatolucrativo.online`.
   - O Resend mostra uns registros **DNS** (SPF/DKIM). Adicione-os no painel de
     onde você comprou o domínio (Registro.br, GoDaddy, Cloudflare…). Espere
     ficar **Verified** (pode levar minutos a algumas horas).
   - *Sem domínio próprio ainda?* Dá pra testar com o remetente de teste do
     Resend, mas pra produção use domínio próprio (cai menos em spam).
3. **API Keys** → **Create API Key** → copie a chave (`re_...`):
   - `RESEND_API_KEY`
4. Defina o remetente, usando o domínio verificado:
   - `RESEND_FROM` → `Artesanato Lucrativo <acesso@artesanatolucrativo.online>`

## Passo 3 — Segredo da sessão

Gere um valor aleatório longo pra assinar o cookie de login. No terminal:

```bash
# qualquer um destes serve
openssl rand -base64 48
# ou, com Node:
node -e "console.log(require('crypto').randomBytes(48).toString('base64'))"
```

Copie o resultado:
- `SESSION_JWT_SECRET` → (o valor gerado)

## Passo 4 — Webhook da plataforma de venda

> Faça depois que o app já tiver uma URL na Vercel (Passo 5). Você precisa da
> URL pública pra colar aqui.

O app aceita **Hotmart, Kiwify ou as duas ao mesmo tempo** — cada uma tem seu
próprio endereço de webhook. Configure a(s) que você vai usar.

### Opção A — Hotmart

1. Crie um token aleatório (mesmo comando do Passo 3 serve) → esse é o **hottok**:
   - `HOTMART_HOTTOK` → (o valor gerado)
2. Na Hotmart: **Ferramentas → Webhook (Postback)** → **Cadastrar**.
   - **URL:** `https://SEU-APP.vercel.app/api/webhook/hotmart`
   - **Eventos:** marque **compra aprovada** e os de cancelamento
     (**reembolso, chargeback, cancelamento**) — são os que liberam e revogam.
   - Onde pedir o **hottok/token**, cole o mesmo valor de `HOTMART_HOTTOK`.
3. O app valida cada chamada por esse token; sem ele bater, ignora (segurança).

### Opção B — Kiwify

O jeito mais simples é validar por um **token na URL** (recomendado):

1. Gere um token aleatório (mesmo comando do Passo 3) → guarde como `KIWIFY_WEBHOOK_TOKEN`.
2. Na Kiwify: **Apps → Webhooks** (ou **Configurações → Webhooks**) → **Criar webhook**.
   - **URL:** `https://SEU-APP.vercel.app/api/webhook/kiwify?token=SEU_TOKEN`
     (troque `SEU_TOKEN` pelo valor que você gerou — é o mesmo do `KIWIFY_WEBHOOK_TOKEN`).
   - **Eventos:** marque **compra aprovada/paga** e os de **reembolso, chargeback
     e cancelamento** — liberam e revogam o acesso.
3. *(Alternativa)* Se preferir usar a **assinatura oficial** da Kiwify em vez do
   token na URL: copie o **token/segredo** que a Kiwify mostra na tela do webhook
   e configure como `KIWIFY_SIGNATURE_SECRET` (deixe o `KIWIFY_WEBHOOK_TOKEN` vazio).
   O app valida o `?signature=` automaticamente.

> O app entende o e-mail do comprador (`buyer.email` na Hotmart, `Customer.email`
> na Kiwify) e o tipo de evento sozinho — não precisa configurar mapeamento.
> Eventos pendentes (pix/boleto gerado, aguardando pagamento) são reconhecidos
> mas **não** liberam acesso; só a compra **paga** libera.

## Passo 5 — Colocar as variáveis na Vercel

1. Vercel → projeto do Precificador → **Settings → Environment Variables**.
2. Adicione cada uma (ambiente **Production**; pode marcar Preview também):

   | Variável | Valor |
   |---|---|
   | `UPSTASH_REDIS_REST_URL` | (Passo 1) |
   | `UPSTASH_REDIS_REST_TOKEN` | (Passo 1) |
   | `RESEND_API_KEY` | (Passo 2) |
   | `RESEND_FROM` | (Passo 2) |
   | `SESSION_JWT_SECRET` | (Passo 3) |
   | `HOTMART_HOTTOK` | (Passo 4, só se usar Hotmart) |
   | `KIWIFY_WEBHOOK_TOKEN` | (Passo 4, só se usar Kiwify com token na URL) |
   | `KIWIFY_SIGNATURE_SECRET` | (Passo 4, só se usar a assinatura da Kiwify) |
   | `BOOTSTRAP_AUTHORIZED_EMAILS` | `filipi.barroso@gmail.com` (seu e-mail, pra testar/cortesia) |
   | `AUTH_ENABLED` | **deixe vazio por enquanto** |

   > Preencha só as variáveis da(s) plataforma(s) que você vai usar. As demais
   > podem ficar de fora.

3. **Redeploy** (Deployments → ⋯ → Redeploy) pra aplicar.

### Liberação manual de acesso (`BOOTSTRAP_AUTHORIZED_EMAILS`)

É como você libera alguém **na mão**, sem passar pela Kiwify — cortesia, aluna que
comprou por fora, suporte, afiliado, seu próprio e-mail de teste.

- Coloque os e-mails separados por vírgula:
  `voce@exemplo.com, ana@cliente.com, maria@cortesia.com`
- Cada mudança na lista exige um **redeploy** pra valer.
- Quem está na lista fica **sempre liberado** — um reembolso/chargeback pela Kiwify
  **não** derruba um e-mail que está aqui (a liberação manual tem prioridade).
  Pra tirar o acesso manual, **remova da lista + redeploy**.

## Passo 6 — Testar com o gate ainda desligado

Com `AUTH_ENABLED` vazio, o app continua aberto, mas o **fluxo de login já funciona**.
Teste antes de trancar:

1. (Opcional) Faça uma **compra de teste** na Hotmart, ou confie no
   `BOOTSTRAP_AUTHORIZED_EMAILS`.
2. Abra `https://SEU-APP.vercel.app` e force a tela de login (ou ligue o gate só
   pra você — ver abaixo).
3. Digite seu e-mail → **deve chegar o código no e-mail** (confere o Resend).
   - Não chegou? Veja o painel do Resend (**Logs**) e confira `RESEND_FROM`/domínio.
4. Digite o código → deve entrar.
5. Teste o webhook: na Hotmart há **"Enviar teste"** no postback; confirme que
   responde `200` e que o e-mail testado passa a ser aceito no login.

## Passo 7 — Ligar a trava

Só depois que o teste passou:

1. Vercel → Environment Variables → `AUTH_ENABLED` = `true`.
2. **Redeploy.**
3. Abra o app numa aba anônima → agora ele **exige login**. Pronto: só compradores entram.

> Pra **desligar** a qualquer momento (ex.: deu problema no dia do lançamento):
> `AUTH_ENABLED` = `false` + redeploy → app volta a abrir pra todos.

---

## Checklist rápido

- [ ] Upstash criado, URL + token copiados
- [ ] Resend com domínio verificado, API key + remetente
- [ ] `SESSION_JWT_SECRET` gerado
- [ ] App com URL na Vercel
- [ ] Webhook cadastrado na plataforma escolhida (Hotmart e/ou Kiwify), com compra + cancelamentos
- [ ] Todas as variáveis na Vercel + redeploy
- [ ] Teste de login (código chegou, entrou) e webhook (status 200) OK
- [ ] `AUTH_ENABLED=true` + redeploy
- [ ] Conferido em aba anônima que exige login

## Se algo der errado

- **Código não chega:** domínio do Resend não verificado, ou `RESEND_FROM` usa
  um domínio diferente do verificado. Veja os Logs do Resend.
- **"Compra não encontrada" pra quem comprou:** o webhook não disparou ou o
  segredo está errado. Na Hotmart, confira o `HOTMART_HOTTOK`; na Kiwify,
  confira se o `?token=` da URL é igual ao `KIWIFY_WEBHOOK_TOKEN` (ou o
  `KIWIFY_SIGNATURE_SECRET`, se estiver usando a assinatura). Reenvie o evento
  de teste pela plataforma.
- **App não tranca mesmo com tudo certo:** faltou `AUTH_ENABLED=true` ou o
  redeploy. A variável só vale depois de um novo deploy.
- **Trancou geral sem querer:** `AUTH_ENABLED=false` + redeploy resolve na hora.
