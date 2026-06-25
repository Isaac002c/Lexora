# Plano de Implantação em Produção — Lexora

> **Sprint 12 — Publicação controlada, infraestrutura e homologação de produção.**
>
> Este documento é o runbook **reproduzível, seguro, documentado e reversível** para levar o
> Lexora a produção. Ele não substitui, mas detalha e operacionaliza, o
> [`docs/DEPLOY.md`](DEPLOY.md), o [`docs/CHECKLIST_GO_LIVE_LEXORA.md`](CHECKLIST_GO_LIVE_LEXORA.md)
> e o [`docs/RUNBOOK_BACKUP_E_RECUPERACAO.md`](RUNBOOK_BACKUP_E_RECUPERACAO.md).
>
> **Princípio de honestidade:** cada etapa traz **comando**, **resultado esperado** e **evidência a
> registrar**. Nenhuma etapa é marcada como concluída sem evidência real no ambiente publicado.
> Onde falta credencial/infra, o bloqueio é declarado e o **próximo passo objetivo** fica explícito.

Legenda de status: ✅ validado · 🟢 pronto/validado localmente · 🟧 pendente de infraestrutura/credencial · 🟦 pendente de decisão do escritório.

---

## 0. Regras inegociáveis desta sprint

Estas regras prevalecem sobre qualquer comando abaixo. Se um passo conflitar com elas, **pare**.

- Preservar todos os commits locais. **Nunca** `git reset --hard`, `git push --force`, nem reescrever histórico remoto.
- **Nunca** versionar, imprimir no chat, ou gravar em documento: senhas, tokens, chaves SSH, `.env`, connection strings, chaves de criptografia, credenciais de Vercel/GitHub/VPS, ou dados reais de clientes.
- **Não** subir `.env`, dumps de banco ou backups para o GitHub (já cobertos pelo `.gitignore`).
- **Não** rodar seed de demonstração em produção; **não** usar dados de demonstração como dados reais.
- **Não** substituir banco existente sem backup + confirmação técnica.
- **Não** desativar RLS, RBAC, auditoria, validações ou cookies seguros para "fazer funcionar".
- **Não** expor a API em HTTP público sem TLS; **não** usar CORS `*` em rotas autenticadas.
- **Não** declarar produção concluída sem **smoke test real** no ambiente publicado.
- Toda mudança de infraestrutura destrutiva exige **plano de rollback** antes da execução.

---

## 1. Topologia de produção

```
                    Internet (HTTPS)
                         │
        ┌────────────────┴─────────────────┐
        │                                   │
  app.<domínio>                       api.<domínio>
  (Vercel — Next.js)                  (VPS Hetzner 167.233.26.140)
        │                                   │
        │  navegador → BFF (cookie HttpOnly) │  Caddy :443 (TLS automático + HSTS)
        │  INTERNAL_API_URL ─────────────────►  reverse_proxy → api:3333
        │                                   │        │
        │                                   │   Express (usuário não-root, /health)
        │                                   │        │
        │                                   │   PostgreSQL 17 (rede privada do Compose)
        │                                   │   RLS forçado · role chronostek_app (NOBYPASSRLS)
        └───────────────────────────────────┘
```

**Componentes (já presentes no repositório):**

| Componente | Arquivo | Observação |
| --- | --- | --- |
| Stack VPS | [`infra/deploy/compose.production.yaml`](../infra/deploy/compose.production.yaml) | `postgres` + `migrate` (one-shot) + `api` + `caddy` |
| TLS/proxy | [`infra/deploy/Caddyfile`](../infra/deploy/Caddyfile) | TLS automático Let's Encrypt + HSTS, `-Server` |
| Imagem da API | [`apps/api/Dockerfile`](../apps/api/Dockerfile) | multi-stage; runtime não-root; HEALTHCHECK `/health` |
| Role da aplicação | [`infra/postgres/init/001-app-role.sh`](../infra/postgres/init/001-app-role.sh) | cria `chronostek_app` `NOBYPASSRLS` |
| Frontend Vercel | [`apps/web/vercel.json`](../apps/web/vercel.json) | framework Next.js; build a partir da raiz do monorepo |
| Backup | [`infra/deploy/scripts/backup-postgres.sh`](../infra/deploy/scripts/backup-postgres.sh) | `pg_dump` custom + retenção |
| Restore | [`infra/deploy/scripts/restore-postgres.sh`](../infra/deploy/scripts/restore-postgres.sh) | guardado por confirmação `RESTAURAR` |
| Modelo de segredos | [`.env.production.example`](../.env.production.example) | placeholders, **sem valores reais** |

---

## 2. Pré-requisitos e responsáveis (quem fornece o quê)

Itens marcados **(humano)** dependem de credencial/decisão que o agente técnico **não deve** manipular nem solicitar em texto. Eles são o limite objetivo entre o que é automatizável e o que exige o responsável.

| # | Pré-requisito | Responsável | Status |
| --- | --- | --- | --- |
| 1 | Acesso de **escrita** ao repo `Isaac002c/LexoraJuris` | Dono do repositório **(humano)** | 🟧 ver §4 |
| 2 | Acesso **SSH** à VPS `167.233.26.140` (chave, não senha) | TI/infra **(humano)** | 🟧 ver §5 |
| 3 | Conta/projeto **Vercel** com permissão de deploy | Escritório/TI **(humano)** | 🟧 ver §8 |
| 4 | **Domínio** definido + acesso ao DNS | Escritório/TI **(humano)** | 🟦 ver §9 |
| 5 | **Segredos de produção** gerados e guardados em cofre | Técnico responsável | 🟧 ver §3 |
| 6 | **Dados reais** (filiais, áreas, 17 usuários, senhas iniciais) | Administradores do escritório **(humano)** | 🟦 ver §7 |
| 7 | Destino **offsite** para backups (bucket/servidor) | TI **(humano)** | 🟧 ver §10 |

---

## 3. Inventário de segredos (gerar uma vez, guardar em cofre — nunca no Git)

O arquivo de produção fica em `infra/deploy/.env.production` na VPS, criado a partir de
[`.env.production.example`](../.env.production.example). **Ele nunca entra no Git** (`.gitignore` já cobre `.env`).

| Variável | Como obter | Onde é usada |
| --- | --- | --- |
| `POSTGRES_PASSWORD` | senha forte aleatória (owner do banco) | postgres + `MIGRATION_DATABASE_URL` |
| `POSTGRES_APP_PASSWORD` | senha forte aleatória (role de aplicação) | init role + `DATABASE_URL` |
| `SESSION_SECRET` | 64 chars aleatórios (`openssl rand -hex 32`) | assinatura de sessão da API |
| `FIELD_ENCRYPTION_KEY` | 64 chars aleatórios **independentes** | cifra de CPF/campos sensíveis |
| `DATABASE_URL` | string com `chronostek_app` + senha **URL-encoded** | runtime da API (NOBYPASSRLS) |
| `MIGRATION_DATABASE_URL` | string com `chronostek_owner` + senha **URL-encoded** | apenas migrations/backup |
| `WEB_URL` / `API_DOMAIN` / `INTERNAL_API_URL` | derivados do domínio (§9) | CORS, TLS, BFF |

**Regras de segredo:**
- Senhas em URLs PostgreSQL precisam ser **URL-encoded** (ex.: `@` → `%40`).
- `FIELD_ENCRYPTION_KEY` é guardada **separada do backup do banco** — sem ela, dados cifrados não se recuperam, mas se vazar junto do dump, a cifra perde valor.
- `chronostek_owner` é usado **só** por migrations/backup; a API usa `chronostek_app` (sem `BYPASSRLS`).
- Trocar qualquer segredo exige reiniciar o serviço correspondente (`docker compose ... up -d`).

> ⚠️ Este documento **não contém** e nunca conterá valores de segredo. Os valores vivem apenas no
> `.env.production` da VPS e no cofre do escritório.

---

## 4. ETAPA 1 — Baseline local (concluída nesta sprint)

**Objetivo:** congelar um baseline verde e reproduzível antes de publicar qualquer coisa.

| Verificação | Comando | Resultado |
| --- | --- | --- |
| Estado do Git | `git status` | limpo; **29 commits à frente** de `origin/main` |
| Remoto correto | `git remote -v` | `https://github.com/Isaac002c/LexoraJuris.git` |
| Divergência | `git log --left-right --graph origin/main...HEAD` | **só `>`** (nada a puxar; push fast-forward limpo) |
| Typecheck | `pnpm typecheck` | ✅ 6/6 projetos |
| Lint | `pnpm lint` | ✅ 6/6 (schema Prisma válido) |
| Testes | `pnpm test` | ✅ 34/34 (inclui isolamento **RLS real**) |
| Build | `pnpm build` | ✅ web + API |

**Evidência:** saída dos gates registrada nesta sprint. Sem alteração de código no baseline.
**Rollback:** não se aplica (somente leitura/validação).

---

## 5. ETAPA 2 — Publicação no GitHub (29 commits)

**Objetivo:** enviar os 29 commits locais sem reescrever nada.

**Pré-condição de segurança:** o push é **fast-forward** (origin/main é ancestral de HEAD — confirmado em §4). Logo, **não** é necessário (nem permitido) `--force`.

```bash
git fetch origin
git status                      # confirmar "ahead by 29", árvore limpa
git log --oneline origin/main..HEAD | wc -l   # deve imprimir 29
git push origin main            # SEM --force
git log --oneline origin/main..HEAD | wc -l   # deve imprimir 0 após sucesso
```

**Resultado esperado:** `origin/main` passa a apontar para `9bd350e`; 0 commits à frente.

**Bloqueio conhecido:** uma tentativa anterior retornou **403** porque a credencial usada não tinha
acesso de escrita ao repositório (registrado em `STATUS_ATUAL_LEXORA.md`).
**Próximo passo objetivo se 403 persistir:** o **dono do repositório** concede escrita ao usuário/credencial
em uso (ou fornece um token de escrita configurado fora do Git, ex.: gerenciador de credenciais do SO).
Nada de token em texto, em commit ou em documento.

**Rollback:** desnecessário e indesejado — o push apenas adiciona commits. Em caso de erro de credencial,
o repositório local permanece intacto; basta corrigir a credencial e repetir o `git push`.

---

## 6. ETAPA 3 — Provisionamento e endurecimento da VPS

**Objetivo:** preparar `167.233.26.140` para rodar a stack com superfície mínima.

> **(humano)** Requer acesso SSH com **chave** (não senha). O agente técnico não cria nem transporta chaves.

```bash
# 1. Acesso e atualização
ssh deploy@167.233.26.140
sudo apt update && sudo apt upgrade -y

# 2. Docker + Compose (engine oficial)
curl -fsSL https://get.docker.com | sudo sh
sudo usermod -aG docker "$USER"   # reabrir sessão após isto

# 3. Firewall: somente 22 (SSH), 80 e 443
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow OpenSSH
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable

# 4. Endurecimento SSH (/etc/ssh/sshd_config): PasswordAuthentication no; PermitRootLogin no
sudo systemctl reload ssh
```

**Resultado esperado:** `docker --version` e `docker compose version` OK; `ufw status` mostrando só 22/80/443; login SSH só por chave.

**Evidência a registrar:** versões do Docker/Compose; `ufw status`.

**Rollback:** `ufw` é reversível (`ufw disable` / `ufw delete`). A instalação do Docker não afeta dados.
Snapshot da VPS antes de começar (painel Hetzner) dá rollback completo de máquina.

**Porta do PostgreSQL:** **não** abrir 5432 ao público — o banco fica só na rede privada do Compose.

---

## 7. ETAPA 4 — PostgreSQL de produção (migrations, RLS — sem seed de demonstração)

**Objetivo:** subir o banco e aplicar o schema, **sem** dados de demonstração.

```bash
cd infra/deploy
# .env.production já criado a partir do .env.production.example, com segredos reais (§3)

# Sobe apenas o banco primeiro, para validar a role de aplicação
docker compose --env-file .env.production -f compose.production.yaml up -d postgres
docker compose --env-file .env.production -f compose.production.yaml ps   # postgres healthy

# Migrations rodam pelo serviço one-shot 'migrate' (usa chronostek_owner)
docker compose --env-file .env.production -f compose.production.yaml run --rm migrate
```

**Verificações de segurança no banco (obrigatórias):**

```bash
# 1. Role de aplicação SEM bypass de RLS
docker compose ... exec -T postgres psql -U chronostek_owner -d chronostek \
  -c "SELECT rolname, rolbypassrls FROM pg_roles WHERE rolname IN ('chronostek_app','chronostek_owner');"
#   chronostek_app  → rolbypassrls = f  (OBRIGATÓRIO)

# 2. RLS forçado: sem contexto de tenant, a aplicação não vê linhas
#    (validado no teste de integração local; reconfirmar no ambiente real após carga de dados)
```

**Dados iniciais — ponto crítico:**
- ❌ **Proibido** `pnpm db:seed` em produção: o seed cria o tenant fictício *"Lexora Advocacia Demo"*.
- ✅ Os **dados reais** (filiais, áreas, 17 usuários) entram por um dos caminhos abaixo, **decisão do escritório** 🟦:
  - **(a)** carga inicial revisada com valores reais (nomes reais de filial, e-mails reais, **senhas temporárias aleatórias** entregues fora de banda, `forcePasswordChange=true`); ou
  - **(b)** bootstrap de **um** administrador e cadastro dos demais pela própria interface (Administração → Usuários).
- Em qualquer caso: **troca obrigatória de senha** no primeiro acesso permanece ativa.

**Resultado esperado:** 3 migrations aplicadas; `chronostek_app` com `rolbypassrls=f`; banco **sem** dados demo.

**Rollback:** como é um banco **novo** (sem dados a perder), rollback = `docker compose down` + remover o
volume `postgres_data` e recomeçar. **Se já houver dados reais**, NUNCA derrubar sem backup (§10) e
confirmação técnica.

---

## 8. ETAPA 5 — Subir a API na VPS

**Objetivo:** publicar API + Caddy com a stack completa.

```bash
cd infra/deploy
docker compose --env-file .env.production -f compose.production.yaml build
docker compose --env-file .env.production -f compose.production.yaml up -d
docker compose --env-file .env.production -f compose.production.yaml ps   # api + caddy up; migrate "exited 0"

# Health interno (antes do DNS): a partir da própria VPS
curl -fsS http://127.0.0.1:3333/health    # se exposto localmente, ou:
docker compose ... exec -T api node -e "fetch('http://127.0.0.1:3333/health').then(r=>process.exit(r.ok?0:1))"
```

**Resultado esperado:** container `api` healthy (HEALTHCHECK do Dockerfile), `migrate` finalizado com sucesso, `caddy` no ar.

**Evidência:** `docker compose ps` + resposta 200 de `/health`.

**Rollback:** `docker compose ... up -d --no-deps api=<tag anterior>` ou `docker compose down` da stack de
aplicação (preservando o volume do banco). Imagens anteriores ficam no cache do Docker para retorno rápido.

---

## 9. ETAPA 6 — Frontend na Vercel

**Objetivo:** publicar o Next.js apontando para a API.

> **(humano)** Requer conta/projeto Vercel com permissão de deploy.

Configuração do projeto (Vercel → Settings):
- **Root Directory:** `apps/web`
- **Framework:** Next.js (já em `vercel.json`)
- **Variáveis de ambiente:**
  - `INTERNAL_API_URL=https://api.<domínio>`
  - `NODE_ENV=production`
  - `COOKIE_SECURE=true`

```bash
# Alternativa por CLI (após 'vercel login' feito pelo responsável):
cd apps/web
vercel link
vercel env add INTERNAL_API_URL production   # valor: https://api.<domínio>
vercel env add COOKIE_SECURE production       # valor: true
vercel --prod
```

**Resultado esperado:** build verde na Vercel (instala da raiz com lockfile congelado, roda `db:generate` + build do web); URL de produção ativa.

**Pós-deploy:** anotar o **domínio exato** do frontend para configurar o CORS da API (§9).

**Rollback:** a Vercel mantém deployments anteriores — "Promote to Production" do deployment anterior reverte
em segundos. Variáveis de ambiente são versionadas por ambiente.

---

## 10. ETAPA 7 — Domínio, TLS, CORS e cookies

**Objetivo:** amarrar domínio, HTTPS e a política de origem com segurança.

> **(humano + decisão)** 🟦 O domínio ainda **não está definido** (registrado como "a definir" no checklist de go-live). Esta etapa não pode ser concluída antes dessa decisão.

**DNS:**
| Registro | Tipo | Aponta para |
| --- | --- | --- |
| `api.<domínio>` | A | `167.233.26.140` (VPS) |
| `app.<domínio>` | CNAME | alvo fornecido pela Vercel |

**TLS:** automático pelo Caddy assim que `api.<domínio>` resolver para a VPS (porta 80/443 abertas, §5).
O `API_DOMAIN` no `.env.production` deve ser **exatamente** `api.<domínio>`.

**CORS (não-permissivo):** após o domínio do frontend existir, definir na API:
- `WEB_URL=https://app.<domínio>` (origem **exata** — nunca `*` em rotas autenticadas).
- Reiniciar a API: `docker compose ... up -d api`.

**Cookies seguros:** `COOKIE_SECURE=true` em produção (HTTPS) — cookie de sessão `HttpOnly` + `SameSite`,
nunca exposto ao browser (o token vive só no cookie; a UI não o manipula — validado localmente).

**Resultado esperado:** `https://api.<domínio>/health` responde 200 com cadeado válido; HSTS presente;
requisição autenticada do `app.<domínio>` aceita; origem estranha rejeitada.

**Rollback:** TLS/Caddy é reversível (sem o registro DNS, nada é exposto). DNS tem TTL — reduzir o TTL antes
de mudanças acelera reversão. `WEB_URL` anterior pode ser restaurado e a API reiniciada.

---

## 11. ETAPA 8 — Backup automatizado de produção

**Objetivo:** backup diário, com retenção, cópia offsite e teste de restauração.

```bash
# Agendar (cron do usuário deploy), diário 03:10 UTC:
crontab -e
# 10 3 * * *  cd /caminho/infra/deploy && BACKUP_DIR=/srv/chronostek/backups \
#             RETENTION_DAYS=14 sh scripts/backup-postgres.sh >> /var/log/chronostek-backup.log 2>&1
```

- O script [`backup-postgres.sh`](../infra/deploy/scripts/backup-postgres.sh) gera `pg_dump` em formato custom e aplica retenção.
- **Cópia offsite** 🟧: replicar `/srv/chronostek/backups` para bucket/servidor distinto (decisão de TI sobre destino).
- **Retenção recomendada:** 14 diários, 8 semanais, 12 mensais — fora da VPS.
- **Teste de restauração** com [`restore-postgres.sh`](../infra/deploy/scripts/restore-postgres.sh) em banco **descartável** (o script exige digitar `RESTAURAR`), mensal.
- **`FIELD_ENCRYPTION_KEY` guardada separada** dos dumps (§3).

**Resultado esperado:** primeiro dump gerado e copiado offsite; uma restauração de teste concluída.

**Rollback:** backup é aditivo (não destrutivo). O `restore` é destrutivo **por natureza** — por isso só roda
em banco de teste, com confirmação explícita, nunca contra o banco real sem decisão técnica.

---

## 12. ETAPA 9 — Smoke test no ambiente publicado

**Objetivo:** provar, no domínio real, que os controles de segurança e os fluxos essenciais funcionam.
**Sem este passo aprovado, produção NÃO é declarada concluída.**

| # | Teste | Esperado |
| --- | --- | --- |
| 1 | `GET https://api.<domínio>/health` | 200, TLS válido, HSTS |
| 2 | `GET https://app.<domínio>/` sem sessão | redireciona a `/login` |
| 3 | Login real (admin) via web | 200 + cookie `HttpOnly; Secure; SameSite` |
| 4 | 1º acesso (não-admin) | força troca de senha |
| 5 | RBAC backend | perfil sem permissão → **403** (ex.: Secretaria em `/admin/*`) |
| 6 | Isolamento de filial (IDOR/BOLA) | recurso de outra filial → **404** |
| 7 | Origem estranha (CORS) | requisição autenticada de origem não-`WEB_URL` rejeitada |
| 8 | Dashboard | dados **reais** do tenant (sem mock, sem dados demo) |
| 9 | Auditoria | login e ações geram registro com ator/data/IP |

**Evidência:** códigos HTTP e cabeçalhos capturados (sem expor tokens/cookies em texto).

**Rollback:** se um teste de segurança falhar (ex.: cookie sem `Secure`, CORS permissivo, 403 não aplicado),
**reverter a publicação** (Vercel "promote anterior" e/ou `compose up -d` da imagem anterior) e corrigir antes de reabrir.

---

## 13. ETAPA 10 — Preparação para homologação com o escritório

**Objetivo:** habilitar a homologação assistida sem dados de demonstração.

- Conduzir a [`docs/HOMOLOGACAO.md`](HOMOLOGACAO.md) com **um usuário de cada perfil**, registrando resultado/usuário/data/evidência.
- **Senhas reais** dos 17 usuários definidas pelos administradores 🟦 (temporárias + troca obrigatória).
- **Canal de suporte** interno definido pelo escritório 🟦.
- Treinamento humano conduzido com base em [`docs/GUIA_RAPIDO_LEXORA.md`](GUIA_RAPIDO_LEXORA.md).
- Critérios de aceite: todos os cenários de `HOMOLOGACAO.md` aprovados + smoke test (§12) verde.

**Rollback:** homologação é validação; nenhum dado real do escritório é descartado. Achados viram correções
priorizadas (não "desligar controle para passar").

---

## 14. Plano de rollback consolidado

| Etapa | Gatilho de rollback | Ação |
| --- | --- | --- |
| GitHub (§5) | credencial/erro | nenhum dado perdido; corrigir credencial e repetir push |
| VPS (§6) | erro de provisionamento | snapshot Hetzner anterior; `ufw`/Docker reversíveis |
| Banco (§7) | migration/role incorretos (banco **novo**) | `down` + remover volume + recriar; **com dados reais → exige backup §10** |
| API (§8) | falha de runtime/health | subir imagem anterior; `compose down` da app (preserva volume do banco) |
| Vercel (§9) | build/regressão | "Promote to Production" do deployment anterior |
| Domínio/TLS (§10) | TLS/CORS incorretos | remover DNS (some a exposição); restaurar `WEB_URL` anterior |
| Backup (§11) | — | aditivo; restore só em banco de teste |
| Smoke test (§12) | qualquer falha de segurança | reverter publicação e corrigir antes de reabrir |

---

## 15. Registro de bloqueios e próximos passos objetivos

| Bloqueio | Tipo | Próximo passo objetivo | Status |
| --- | --- | --- | --- |
| Escrita no GitHub | credencial | dono do repo concede escrita à credencial em uso | 🟧 |
| Acesso SSH à VPS | credencial | TI fornece acesso por chave ao `167.233.26.140` | 🟧 |
| Conta/projeto Vercel | credencial | responsável faz `vercel login` e cria o projeto (root `apps/web`) | 🟧 |
| Domínio | decisão | escritório define o domínio e cria registros A/CNAME | 🟦 |
| Segredos de produção | execução | gerar segredos reais e popular `infra/deploy/.env.production` na VPS | 🟧 |
| Dados iniciais reais | decisão | escritório fornece filiais/áreas/usuários reais (sem demo) | 🟦 |
| Destino offsite de backup | decisão | TI define bucket/servidor de cópia | 🟧 |

---

## 16. Critério de "produção concluída"

Marcar **somente** quando, simultaneamente:

1. ✅ 29 commits publicados em `origin/main` (§5).
2. ✅ VPS endurecida; stack `compose.production.yaml` no ar (§6, §8).
3. ✅ Banco com migrations aplicadas, `chronostek_app` `NOBYPASSRLS`, **sem dados demo** (§7).
4. ✅ Frontend Vercel publicado e apontando para a API (§9).
5. ✅ Domínio + TLS válidos; CORS restrito a `WEB_URL`; `COOKIE_SECURE=true` (§10).
6. ✅ Backup diário rodando + cópia offsite + 1 restauração testada (§11).
7. ✅ Smoke test publicado (§12) **integralmente verde**.

Enquanto qualquer item acima estiver 🟧/🟦, o status correto continua sendo
**"pronto para implantação, condicionado a infraestrutura, credenciais e decisões do escritório"**.

---

> **Histórico de execução desta sprint:** ver `docs/STATUS_ATUAL_LEXORA.md` (seção da Sprint 12).
