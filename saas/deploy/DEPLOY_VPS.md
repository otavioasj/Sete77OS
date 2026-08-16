# Deploy na VPS HostGator

Dominio escolhido: `ads.creativeagenciamkt.com.br`

IP informado da VPS: `129.121.51.251`

## 1. DNS

No painel DNS do dominio, crie:

```text
Tipo: A
Nome: ads
Valor: 129.121.51.251
TTL: 300 ou automatico
```

Depois teste:

```bash
nslookup ads.creativeagenciamkt.com.br
```

## 2. Variaveis de producao

Na VPS, dentro da pasta `saas`, copie:

```bash
cp .env.production.example .env.production
```

Preencha:

```env
SUPABASE_SECRET_KEY=
OPENAI_API_KEY=
META_ACCESS_TOKEN=
META_AD_ACCOUNT_ID=
```

Nao coloque `SUPABASE_SECRET_KEY`, OpenAI, Meta ou Google no frontend.

## 3. Subir containers

Na pasta `saas`:

```bash
docker compose --env-file .env.production up -d --build
```

O frontend fica publicado pelo Traefik em:

```text
https://ads.creativeagenciamkt.com.br
```

## 4. Proxy

A VPS atual usa Traefik, nao Nginx. O `docker-compose.yml` ja inclui as labels do Traefik para o dominio:

```text
ads.creativeagenciamkt.com.br
```

## 5. SSL

O Traefik atual ja usa Let's Encrypt. O certificado deve ser emitido automaticamente depois do container subir e o DNS apontar.

Ver logs:

```bash
docker logs traefik --tail=100
```

## 6. Supabase Auth

No Supabase, configure:

```text
Site URL: https://ads.creativeagenciamkt.com.br
Redirect URLs:
https://ads.creativeagenciamkt.com.br
https://ads.creativeagenciamkt.com.br/**
http://127.0.0.1:3000
```
