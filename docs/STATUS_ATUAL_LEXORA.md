# STATUS ATUAL — Lexora (auditoria executável)

> **Este documento registra apenas o que foi comprovado por inspeção de código e execução real**
> nesta auditoria. Escopo planejado e regras de negócio estão em
> [`docs/SPEC_LEXORA_MVP_E_SPRINTS.md`](SPEC_LEXORA_MVP_E_SPRINTS.md).
>
> Toda linha "✅" abaixo tem evidência: comando executado, saída observada ou trecho de código citado.

---

## 1. Identificação da auditoria

| Item | Valor |
| --- | --- |
| Data da auditoria | **2026-06-23** |
| Repositório | https://github.com/Isaac002c/LexoraJuris |
| Branch analisada | `main` |
| Último commit analisado | `a4b6b1d` — "subindo 01" |
| Estado do Git | Limpo; em sincronia com `origin/main` (0 à frente / 0 atrás) |
| Alterações locais | Apenas arquivos **novos** de documentação (`docs/SPEC_*`, `docs/STATUS_*`) e artefatos **ignorados** (`.env`, `.postgres/`, `node_modules/`) |
| Remote `origin` | Confere com o repositório oficial |

### Histórico de commits (4)

| Hash | Mensagem |
| --- | --- |
| `a4b6b1d` | subindo 01 |
| `fce4c4a` | docs: corrige credenciais de demonstração no README e aponta status atual |
| `12f0f7c` | fix(datas): corrige erro de fuso (off-by-one) e fixa America/Sao_Paulo |
| `5ca2ab1` | chore: baseline do MVP Lexora + destravamento P0 |

## 2. Infraestrutura local utilizada

| Recurso | Situação |
| --- | --- |
| Node.js | v24.14.0 |
| npm | 11.9.0 |
| pnpm | 10.34.3 (ativado via corepack) |
| Docker | **Ausente** na máquina |
| PostgreSQL de sistema | **Ausente** (sem serviço, sem `psql`, nada em 5432/55432) |
| PostgreSQL utilizado | **Provisionado para a auditoria**: binários portáteis PostgreSQL **17.5** em `.postgres/` (ignorado pelo Git), cluster em 127.0.0.1:**55432**, role de aplicação `chronostek_app` (LOGIN, NOSUPERUSER, **NOBYPASSRLS**), banco `chronostek` |

> O ambiente original (clone limpo) **não tinha banco**. Para executar migrations/seed/login de verdade,
> foi provisionado um PostgreSQL local descartável, sem instalador e sem privilégio de administrador.
> Nada disso entra no Git.

## 3. Scripts executados e resultados

| # | Comando | Resultado | Evidência |
| --- | --- | --- | --- |
| 1 | `pnpm install` | ✅ OK | 571 pacotes; `argon2` (build nativo), `esbuild`, `@prisma/engines`, `@prisma/client` compilados. Ignorados: `sharp`, `unrs-resolver` |
| 2 | `pnpm db:generate` | ✅ OK | Prisma Client v6.19.1 gerado |
| 3 | `pnpm typecheck` | ✅ **6/6 projetos** | auth, config, contracts, database, web, api — exit 0 |
| 4 | `pnpm lint` | ✅ **6/6 projetos** | eslint `--max-warnings=0` no web; schema Prisma "valid 🚀" — exit 0 |
| 5 | `pnpm build` | ✅ OK | Web: 30+ rotas compiladas; API: `dist/server.js` (tsup) — exit 0 |
| 6 | `pnpm db:deploy` | ✅ OK | 3 migrations aplicadas em banco limpo (`initial`, `tenant_rls`, `app_role_grants`) |
| 7 | `pnpm db:seed` | ✅ OK | "Lexora Advocacia Demo, 4 filiais, 17 usuários, 7 áreas" |
| 8 | `pnpm test` | ✅ **24/24** | 5 arquivos; inclui teste de **isolamento RLS real** contra PostgreSQL |
| 9 | API (`tsx server.ts`) | ✅ OK | "Chronostek API listening on port 3333" |
| 10 | Fluxo de autenticação (HTTP real) | ✅ OK | ver seção 6 |
| 11 | Web (`next start`, porta 3000) | ✅ OK | "Next.js 15.5.19" servindo |
| 12 | Fluxo web (BFF + SSR) | ✅ OK | ver seção 6.1 |

### Detalhe dos testes (24/24)

| Arquivo | Testes | Cobre |
| --- | --- | --- |
| `src/lib/tenant.test.ts` | 9 | Filtros de filial/responsável |
| `src/lib/deadline.test.ts` | 7 | Cores de prazo (GREEN/YELLOW/RED/DARK_RED/GRAY) |
| `src/lib/field-crypto.test.ts` | 4 | Criptografia de campo |
| `src/app.test.ts` | 3 | HTTP: health 200, sem token 401, rota inexistente 404 |
| `src/tenant-rls.integration.test.ts` | 1 | **RLS real**: tenant não vê linhas de outro tenant |

## 4. Banco de dados — migrations e seed

| Verificação | Resultado | Evidência |
| --- | --- | --- |
| Migrations aplicam em banco limpo | ✅ | `prisma migrate deploy` → "All migrations have been successfully applied" (3) |
| Sem migration órfã/quebrada | ✅ | As 3 pastas de migration aplicam sem erro; `_prisma_migrations` consistente |
| Seed operável sob RLS **sem superusuário** | ✅ | Executado como `chronostek_app` (NOBYPASSRLS); `seed.ts:106` define `app.tenant_id` na transação |
| Contagens após seed | ✅ | tenants=1, branches=4, legal_areas=7, users=17, roles=6, clients=1, cases=1, deadlines=1 |
| RLS forçado funciona | ✅ | Como `chronostek_app` **sem** contexto: `SELECT count(*) FROM branches` = **0** |
| Áreas conforme spec | ✅ | Trabalhista, Criminal, Cível, Juizado Cível, Vara Cível, Federal, Administrativo |
| 17 usuários / 2 admins | ✅ | `seed.ts` `userSeeds` (17); 2× `ADMIN_GERAL` (Douglas, Marina) |

## 5. Fuso horário (America/Sao_Paulo)

| Verificação | Resultado | Evidência |
| --- | --- | --- |
| Datas puras (`@db.Date`) sem erro de 1 dia | ✅ | `apps/web/src/lib/format.ts` usa `timeZone: "UTC"` p/ data pura e `America/Sao_Paulo` p/ data+hora |
| Runtime fixa o fuso | ✅ | `apps/api/src/server.ts:11` e `apps/web/src/instrumentation.ts` definem `TZ=America/Sao_Paulo` |
| `initdb` detectou o fuso da máquina | ✅ | Cluster local criado com timezone `America/Sao_Paulo` |

## 6. Autenticação e permissões (HTTP real)

| Teste | Esperado | Obtido | Evidência |
| --- | --- | --- | --- |
| `GET /health` | 200 | **200** | ✅ |
| Login admin (douglas) | token + `forcePasswordChange:false` | token (101 chars), `false`, expira em 12h | ✅ |
| `GET /v1/auth/me` (admin) | papéis/permissões | roles `["ADMIN_GERAL"]`, **25 permissões**, `hasAllBranches=true` | ✅ |
| `GET /v1/dashboard` (admin) | dados reais | 200 com indicadores reais (sem mock) | ✅ |
| `GET /v1/admin/overview` (admin) | 200 | **200** (users=17, branches=4, areas=7) | ✅ |
| Login advogado (lucas) | `forcePasswordChange:true` | **true** (troca obrigatória no 1º acesso) | ✅ |
| `GET /v1/admin/overview` (advogado) | 403 | **403** (permissão negada no backend) | ✅ |
| Login com senha errada | 401 | **401** | ✅ |
| `GET /v1/auth/me` sem token | 401 | **401** | ✅ |
| Cor do prazo demo (vence em ~4 dias) | RED | **RED** | ✅ |

> **Conclusão de segurança:** permissões são validadas **no backend** (`requirePermission`), não apenas
> ocultadas na UI. Isolamento por tenant garantido por RLS; isolamento por filial/responsável por
> filtros em `lib/tenant.ts`.

### 6.1. Camada Web (BFF + SSR) — HTTP real

| Teste | Esperado | Obtido | Evidência |
| --- | --- | --- | --- |
| `GET /` sem sessão | redireciona a `/login` | **307 → /login** | ✅ middleware protege rotas |
| `GET /login` | 200 | **200** | ✅ página renderiza |
| `POST /api/auth/login` (admin) | 200 + cookie HttpOnly | **200**; `Set-Cookie chronostek_session=…; HttpOnly; SameSite=lax` | ✅ token não exposto ao browser |
| `GET /api/v1/dashboard` (com cookie) | dados reais | clients=1, activeCases=1, **estimatedRevenue=9000.00** | ✅ BFF injeta o token e faz proxy |
| `GET /dashboard` (com cookie) | 200 SSR | **200** | ✅ página autenticada renderiza |
| `GET /api/v1/dashboard` (sem cookie) | 401 | **401** | ✅ BFF exige sessão |
| **Secretaria** `POST /api/v1/clients` (cria cliente) | 201 | **201** + `id` | ✅ escrita real persistida (create→read confirma 2 clientes) |
| **Secretaria** `POST /api/v1/admin/branches` | 403 | **403** | ✅ perfil sem `branch.manage` negado na pilha completa |

> **Pilha completa provada em clone limpo:** Browser → Next.js (SSR + BFF) → Express → PostgreSQL (RLS)
> → dados reais. O token de sessão fica apenas no cookie HttpOnly; a UI nunca o manipula.

## 7. Estado por módulo (aderência ao MVP)

Legenda: ✅ Confirmado e funcional (backend executado) · 🟦 Implementado, validado no backend, **UI a verificar no olho** · 🟨 Parcial · ⬜ Ausente · 🟫 Pós-MVP

| Módulo | Backend | UI (visual) | Classificação | Observação |
| --- | --- | --- | --- | --- |
| Acesso/usuários/permissões | ✅ executado | 🟦 a verificar | **Confirmado (backend)** | Login, /me, RBAC 403/401 provados via HTTP |
| Filiais e áreas jurídicas | ✅ executado | 🟦 a verificar | **Confirmado (backend)** | overview retorna 4 filiais + 7 áreas |
| Clientes e atendimento | 🟦 código completo | 🟦 a verificar | **Implementado (a validar na UI)** | rotas `clients`/`attendances` + páginas existem; seed cria 1 cliente/atendimento |
| Processos | 🟦 código completo | 🟦 a verificar | **Implementado (a validar na UI)** | `cases.routes.ts` + `processos/*`; seed cria 1 processo |
| Prazos e agenda | ✅ cor validada | 🟦 a verificar | **Implementado (cor confirmada via API)** | `/v1/deadlines` retorna `color=RED`; agenda/calendário a ver na UI |
| Documentos e checklists | 🟦 código completo | 🟦 a verificar | **Implementado (a validar na UI)** | upload/validação/download em `documents`/`checklists`; seed cria 1 doc + 1 checklist |
| Painel operacional | ✅ executado | 🟦 a verificar | **Confirmado (backend)** | `/v1/dashboard` com dados reais |
| Auditoria/rastreabilidade | ✅ executado | 🟦 a verificar | **Confirmado (backend)** | `AuditLog` gravado em login e ações |
| Financeiro | 🟫 código existe | 🟫 | **Pós-MVP** | `finance.routes.ts` compila; não é critério de liberação |

## 8. Funcionalidades — confirmadas, parciais, ausentes

### Confirmadas (executadas nesta auditoria)
- Build, typecheck, lint, testes (24/24), migrations e seed.
- Login individual por tenant; sessão segura; troca obrigatória de senha (não-admins).
- RBAC no backend (403/401); isolamento por tenant (RLS) e por filial/responsável.
- Cores de prazo (lógica + via API: RED para vencimento em 4 dias).
- Painel com dados reais.

### Parciais / a validar na interface (próxima etapa P1)
- Os 5 fluxos verticais **pela UI** (Admin, Secretaria, Advogado, Gestor, Financeiro-estrutura).
- Agenda jurídica (mês/semana/lista) e exibição visual de "Vencido".
- Upload real de documento pela UI e atualização de checklist pela UI.

### Ausentes / fora do MVP
- Integrações automáticas (pagamento, WhatsApp/e-mail, assinatura, tribunais, portal, IA) — planejado pós-MVP.
- Entidade "Audiência" própria — modelada como `DeadlineType.AUDIENCIA` + `LegalCase.hearingAt`.

## 9. Bugs e pontos de atenção encontrados

| # | Severidade | Item | Detalhe |
| --- | --- | --- | --- |
| A1 | Baixa | Prisma CLI não carrega `.env` da raiz | `prisma migrate deploy` exige `DATABASE_URL` no ambiente quando rodado em `packages/database`. O seed contorna manualmente; os scripts de migration não. Workaround: exportar `DATABASE_URL`. Sugestão futura: `prisma.config.ts` |
| A2 | Baixa | `sharp` não compilado | `pnpm` ignorou o build de `sharp`; otimização de imagem do Next fica degradada (não quebra build/uso) |
| A3 | Informativa | Avisos de depreciação Prisma | `package.json#prisma` deprecado (Prisma 7) e disponibilidade de major 7.x; sem impacto funcional agora |
| A4 | Informativa | Segredos de exemplo | `.env` de dev usa segredos gerados localmente; produção exige segredos reais (já previsto) |

> **Nenhum bug crítico (P0) aberto.** Nenhuma falha de build, banco, migration, seed, login ou permissão.

## 10. Bloqueios

| Bloqueio | Status |
| --- | --- |
| Aplicação não inicia | ❌ Não ocorre — API sobe e responde |
| Banco não conecta | ❌ Não ocorre — após provisionamento, conecta e opera |
| Migration/seed falham | ❌ Não ocorre — aplicam e semeiam com sucesso |
| Login/permissão falham | ❌ Não ocorre — login e RBAC validados |
| Build falha | ❌ Não ocorre — build verde |
| Fuso incorreto | ❌ Não ocorre — corrigido e fixado |
| **Dependência de ambiente** | 🟠 Único ponto: a máquina não tinha Docker/PostgreSQL. Mitigado com provisionamento portátil documentado |

## 11. Conclusão sobre a "etapa 2" (destravamento P0 + validação inicial)

**Classificação: CONFIRMADA / CONCLUÍDA no backend — reproduzida em clone limpo.**

As entregas atribuídas à etapa anterior foram **comprovadas por execução independente** nesta auditoria:

| Entrega anterior | Comprovação nesta auditoria |
| --- | --- |
| Seed operável sob RLS sem superusuário | ✅ Executado como `chronostek_app` (NOBYPASSRLS) |
| Migration órfã removida | ✅ 3 migrations aplicam limpas; sem registro órfão |
| Baseline Git criado | ✅ Commit `5ca2ab1` presente; histórico íntegro |
| Correção de fuso America/Sao_Paulo | ✅ `format.ts` + `TZ` no runtime + commit `12f0f7c` |
| Build e autenticação validados | ✅ Build verde; login + RBAC validados via HTTP |

O que **não** foi feito pela etapa anterior (e segue pendente): a **verificação vertical pela interface**
(os 5 fluxos no navegador). Isso é exatamente a **próxima etapa (P1)**.

## 12. Próxima prioridade técnica

**P1 — Verificação vertical do MVP pela interface (web).** O **caminho de dados** já está provado
(Browser → BFF → API → DB, com dashboard real e auth no BFF — seção 6.1). Falta o **percurso visual
de formulários** no navegador, com os usuários do seed: criação/edição/filtros em cada módulo e as
negações de permissão por perfil, além da exibição visual de cores de prazo e do estado "Vencido".

Ordem sugerida: Admin → Secretaria → Advogado → Gestor → (Financeiro: apenas estrutura).

## 13. Critérios objetivos para considerar a próxima etapa (P1) concluída

A etapa P1 estará concluída quando, **pela interface**, houver evidência de que:

1. Admin entra, vê o painel e abre as telas de usuários/filiais/áreas/perfis.
2. Secretaria cria cliente, registra atendimento, faz triagem e encaminha.
3. Usuário autorizado cria processo vinculado a cliente; filtros e detalhe funcionam.
4. Advogado cria prazo e a cor aparece correta; "Vencido" é inequívoco; audiência aparece na agenda.
5. Documento é anexado a cliente/processo (autor+data) e checklist é atualizado.
6. Gestor filtra por filial/área/responsável e vê prazos críticos/pendências.
7. Um perfil sem permissão não acessa a tela/dado indevido (negação visível e backend 403).
8. Nenhuma falha crítica aberta; `docs/STATUS_ATUAL_LEXORA.md` atualizado com as evidências.

## 14. Como reproduzir o ambiente desta auditoria (runbook)

```bash
# 1. Dependências
corepack enable pnpm && pnpm install
pnpm db:generate

# 2. Banco (qualquer PostgreSQL 17). Exemplo com DATABASE_URL no .env (não versionado):
#    DATABASE_URL=postgresql://chronostek_app:senha@127.0.0.1:55432/chronostek?schema=public
#    A role de aplicação deve ser NOBYPASSRLS para o RLS valer.
export DATABASE_URL="postgresql://chronostek_app:...@127.0.0.1:55432/chronostek?schema=public"
pnpm db:deploy   # migrations
pnpm db:seed     # dados iniciais

# 3. Qualidade
pnpm typecheck && pnpm lint && pnpm test && pnpm build

# 4. Subir
pnpm dev         # web :3000 + api :3333
```

> **Registro incremental:** este documento é atualizado a cada etapa executada (seção 8 das regras de implementação).
>
> - **2026-06-23 (auditoria)** — Auditoria executável concluída: backend validado ponta a ponta em clone limpo (migrations, seed, 24/24 testes, login, RBAC, cores de prazo, RLS).
> - **2026-06-23 (P1 parcial)** — Camada web validada (BFF + SSR + cookie HttpOnly + dashboard real — seção 6.1). Pendente: percurso visual de formulários por perfil.
>
> **Pendência de versionamento:** o commit `5e3ce84` (SPEC + STATUS) está criado localmente, mas o
> `git push origin main` foi **negado (403)** — a credencial disponível (`ArthurAdmin`) não tem acesso
> de escrita ao repositório `Isaac002c/LexoraJuris`. Requer credencial com permissão de escrita.
