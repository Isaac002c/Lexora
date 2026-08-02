# Runbook de Produção — Lexora

> **Fonte da verdade da implantação REAL** (validada em 2026-06-28). A produção roda em
> **VPS compartilhada** com outros serviços; o fluxo com Caddy descrito em
> [`DEPLOY.md`](DEPLOY.md) aplica-se apenas a uma VPS dedicada.
> Nenhum segredo neste documento — valores reais vivem em `/opt/lexora/infra/deploy/.env`
> (fora do Git, permissão 600) e no painel da Vercel.

## 1. Topologia real

```
Usuários (navegador)
  └─ https://lexora.chronostek.com.br          → Vercel (Next.js, BFF, cookie HttpOnly)
       └─ https://api.lexora.chronostek.com.br → VPS 167.233.26.140 (chronostek-prod-01)
            nginx (container despachante-nginx, dono do 80/443)
              └─ vhost dedicado infra/deploy/lexora-nginx.conf (TLS Let's Encrypt)
                   └─ lexora-api-1 (Express, loopback 127.0.0.1:3333)
                        └─ lexora-postgres-1 (PostgreSQL 17, SOMENTE rede interna lexora_private)
```

| Item | Valor |
| --- | --- |
| Diretório na VPS | `/opt/lexora` (clone do repo `Isaac002c/Lexora`) |
| Compose | `-p lexora -f infra/deploy/compose.production.yaml -f infra/deploy/compose.override.local.yaml` |
| Override | remove Caddy e publica a API **apenas em loopback** `127.0.0.1:3333` |
| Env de produção | `/opt/lexora/infra/deploy/.env` (600, fora do Git) |
| Banco | container `lexora-postgres-1`, volume `lexora_postgres_data`, **porta 5432 NÃO publicada** |
| Uploads | volume `lexora_uploads_data` |
| TLS | Let's Encrypt em `/etc/letsencrypt/live/api.lexora.chronostek.com.br` (renovação: cron seg 04:00 `renew-cert.sh`) |
| CORS | restrito a `https://lexora.chronostek.com.br` (`WEB_URL`) |
| DNS | `lexora.chronostek.com.br` → Vercel · `api.lexora.chronostek.com.br` → 167.233.26.140 |

**Vizinhos na mesma VPS (NÃO tocar):** `despachante-nginx` (80/443), `despachante-backend` (5000),
`chronostek-db` (postgres:16, 5432 público — serviço vizinho), `chronostek-web` (8080),
`portainer` (9000/9443), `uptime-kuma` (3001), `redis`, `postgres` (17, interno).

## 2. Variáveis de ambiente (nomes; valores no cofre/painel)

**API (VPS, `/opt/lexora/infra/deploy/.env`):** `NODE_ENV`, `API_PORT`, `WEB_URL`,
`DATABASE_URL` (role `chronostek_app`, **NOBYPASSRLS**), `MIGRATION_DATABASE_URL`
(role `chronostek_owner`, só migrations/backup), `POSTGRES_DB`, `POSTGRES_USER`,
`POSTGRES_PASSWORD`, `POSTGRES_APP_PASSWORD`, `SESSION_SECRET`, `FIELD_ENCRYPTION_KEY`
(guardar **separada** dos backups), `STORAGE_DRIVER`, `STORAGE_LOCAL_PATH`,
`MAX_UPLOAD_SIZE_MB`, `LOG_LEVEL`.

**Frontend (Vercel):** `INTERNAL_API_URL=https://api.lexora.chronostek.com.br`,
`NODE_ENV=production`, `COOKIE_SECURE=true`.

**Rotação:** gerar novo valor → atualizar `.env`/painel → `docker compose ... up -d api`
(ou redeploy Vercel). Trocar `SESSION_SECRET` invalida todas as sessões (logout geral).
`FIELD_ENCRYPTION_KEY` **não pode** ser trocada sem recifrar os campos — tratar como chave permanente.

## 3. Atualização de código (procedimento validado)

```bash
ssh <user>@167.233.26.140
cd /opt/lexora
sh backup.sh                                   # 1. backup ANTES (obrigatório)
git pull --ff-only origin main                 # 2. código
cd infra/deploy
DC="docker compose -p lexora -f compose.production.yaml -f compose.override.local.yaml"
$DC build api migrate                          # 3. imagens da API e do migrador
$DC run --rm migrate                           # 4. migrations (antes da API nova)
$DC up -d --no-deps --force-recreate api       # 5. troca SÓ a API (execute como passo separado)
$DC ps && curl -s http://127.0.0.1:3333/health # 6. validar
```

- Frontend: push em `main` → **deploy automático na Vercel** (confirmar no painel).
- ⚠️ **Sempre reconstrua `api` e `migrate`:** os serviços usam alvos/imagens distintos.
  Construir apenas `api` pode deixar o migrador antigo e produzir um falso
  “No pending migrations to apply”. Antes de continuar, a saída do Prisma deve
  mostrar a quantidade esperada de migrations.
- ⚠️ `docker compose run` **consome stdin**: em scripts/heredoc, use `run -T --rm migrate`
  ou execute os passos separadamente (incidente real: o restart não executou por isso).
- Nunca `prisma db push` em produção; sempre migrations.

## 4. Rollback

| Camada | Como |
| --- | --- |
| API | `docker images lexora-api` → `docker tag <img_anterior> lexora-api:latest` → `$DC up -d --no-deps api`. Ou `git checkout <commit_anterior> && $DC build api && $DC up -d --no-deps api` |
| Frontend | Vercel → Deployments → deployment anterior → **Promote to Production** |
| Banco (migration ruim) | restaurar backup em banco de teste (§6), validar, só então decidir restore real — **sempre com backup novo antes** |

## 5. Backup (diário, automatizado)

- Cron root **03:00 UTC**: `/opt/lexora/backup.sh` → `pg_dump -Fc` em `/opt/lexora/backups/`, retenção **14 dias**.
- ⚠️ **Bug corrigido (2026-06-28):** o script usava `docker exec -t`; o TTY **corrompia o dump**
  (irrecuperável, "corrupt TOC"). Nunca usar `-t` com `pg_dump`/`pg_restore` em pipe.
  Dumps anteriores à correção foram movidos para `backups/corrompidos/`.
- **Offsite (pendente de destino):** `infra/deploy/scripts/offsite-sync.sh` (rclone; credenciais
  só no `rclone config` do host). Agendar 03:30 após decidir o destino (B2/S3/outro servidor).

## 6. Restore

- **Prova mensal (não toca produção):** `sh infra/deploy/scripts/restore-test.sh [dump]`
  → restaura no banco temporário, confere contagens, remove. Última prova OK: 2026-06-28.
- **Restore real (destrutivo — exige decisão técnica + backup novo):**
  `docker exec -i lexora-postgres-1 pg_restore -U chronostek_owner -d chronostek --clean --if-exists --no-owner < backups/<arquivo>.dump`

## 7. Smoke test do publicado

```bash
curl -s -o /dev/null -w '%{http_code}\n' https://api.lexora.chronostek.com.br/health        # 200
curl -s -o /dev/null -w '%{http_code}\n' https://api.lexora.chronostek.com.br/v1/auth/me    # 401
curl -s -o /dev/null -w '%{http_code}\n' https://lexora.chronostek.com.br                   # 307 (login)
curl -sI -H 'Origin: https://evil.example' https://api.lexora.chronostek.com.br/health | grep -i allow-origin  # NÃO deve refletir a origem estranha
```
Completar com login real (admin + 1 perfil restrito): sessão, troca de senha forçada,
403 em módulo proibido, dados por filial. Roteiro completo: [`HOMOLOGACAO.md`](HOMOLOGACAO.md).

## 8. Usuários reais (onboarding dos 17)

**Caminho padrão (interface):** Administração → Usuários → Novo usuário → nome, e-mail,
papel, filiais (ou "todas"), **senha temporária forte (mín. 12)** → o sistema força a troca
no 1º acesso. Entregar a senha por canal seguro (nunca chat/e-mail aberto).

**Caminho CLI (lote/onboarding):** `infra/deploy/bootstrap-user.ts` — idempotente, senha por
variável de ambiente, papel + filiais por código, `forcePasswordChange` por padrão:

```bash
cd /opt/lexora && docker compose -p lexora -f infra/deploy/compose.production.yaml \
  -f infra/deploy/compose.override.local.yaml run --rm -T \
  -e DATABASE_URL="$MIGRATION_DATABASE_URL" -e TENANT_SLUG=... -e USER_EMAIL=... \
  -e USER_NAME=... -e USER_ROLE=SECRETARIA -e USER_ALL_BRANCHES=false \
  -e USER_BRANCH_CODES=CAMPO_GRANDE -e USER_PW="$(openssl rand -base64 18)" \
  migrate pnpm --filter @chronostek/database exec tsx ../../infra/deploy/bootstrap-user.ts
```

**Gestão contínua:** suspender usuário **revoga todas as sessões** na hora; "Redefinir senha"
gera temporária + força troca + revoga sessões. Bootstraps **específicos de cliente**
(ex.: `bootstrap-batista.ts`) contêm dados reais e **não são versionados** (`.gitignore`).

## 9. Monitoramento e rotina

| Frequência | Ação |
| --- | --- |
| Diário | `/health` 200 (há uptime-kuma na VPS — adicionar monitor), olhar `backups/backup.log` |
| Semanal | `docker ps` (healthy), espaço em disco (`df -h`), log da renovação TLS |
| Mensal | `restore-test.sh`, revisar `audit_logs` de login suspeito, atualizar SO (janela: exige reinício — coordenar com os vizinhos da VPS) |

## 10. Riscos conhecidos (registrados em 2026-06-28)

1. **Reinício de SO pendente** na VPS (patches aplicados aguardando reboot) — janela a coordenar (afeta os vizinhos).
2. **`chronostek-db` (serviço vizinho, postgres:16) expõe 5432 publicamente** — não é do Lexora e não foi alterado; recomendar ao responsável restringir (firewall/bind interno).
3. **Offsite de backup ainda não ativo** (aguarda decisão de destino) — hoje os dumps vivem só na VPS.
4. Login real ponta a ponta pelo domínio ainda depende de credencial do administrador (validação de homologação).
