# Deploy de produção

## 1. DNS e segredos

Crie `api.seudominio.com` apontando para a VPS e configure `app.seudominio.com` na Vercel. Copie `.env.production.example` para `infra/deploy/.env.production`, gere segredos independentes e mantenha o arquivo fora do Git.

Senhas inseridas em URLs PostgreSQL precisam estar codificadas para URL. A role `chronostek_owner` é usada apenas por migrations e backup; a API usa `chronostek_app`, que não possui `BYPASSRLS`.

## 2. API e banco na VPS

```bash
cd infra/deploy
docker compose --env-file .env.production -f compose.production.yaml build
docker compose --env-file .env.production -f compose.production.yaml up -d
docker compose --env-file .env.production -f compose.production.yaml ps
curl https://api.seudominio.com/health
```

Para criar os dados de demonstração em um ambiente de homologação:

```bash
docker compose --env-file .env.production -f compose.production.yaml run --rm \
  -e DATABASE_URL="$MIGRATION_DATABASE_URL" migrate pnpm db:seed
```

Não execute o seed de demonstração no tenant real.

## 3. Frontend na Vercel

Configure o projeto com raiz `apps/web` e as variáveis:

- `INTERNAL_API_URL=https://api.seudominio.com`
- `NODE_ENV=production`
- `COOKIE_SECURE=true`

O build usa o `vercel.json` do aplicativo. Depois do deploy, configure `WEB_URL` da API com o domínio exato do frontend e reinicie a API.

## 4. Atualizações

```bash
git pull --ff-only
cd infra/deploy
docker compose --env-file .env.production -f compose.production.yaml build
docker compose --env-file .env.production -f compose.production.yaml run --rm migrate
docker compose --env-file .env.production -f compose.production.yaml up -d api caddy
```

Migrations são executadas antes da nova API. Nunca use `prisma db push` em produção.

## 5. Backup e monitoramento

Agende `scripts/backup-postgres.sh` diariamente via cron e copie os arquivos para outro servidor ou bucket. Realize um teste de restauração mensal. Monitore:

- `/health` a cada minuto;
- reinícios e uso de memória dos containers;
- espaço dos volumes PostgreSQL, uploads e backups;
- logs JSON da API e do Caddy;
- falhas de login e respostas HTTP 5xx.

Retenção inicial recomendada: 14 diários, 8 semanais e 12 mensais fora da VPS.
