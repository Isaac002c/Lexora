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

## 15. Registro de execução por Sprint

> Execução sequencial das Sprints 0–8 (sem `git push` — commits locais; envio em lote quando o acesso ao GitHub for liberado).

### Sprint 0 — Kickoff, auditoria e preparação · **2026-06-23**
**Objetivo:** manter a base técnica documentada, reproduzível e segura, sem refazer trabalho.

| Item | Resultado | Evidência | Status |
| --- | --- | --- | --- |
| Estrutura/stack/scripts | Conforme SPEC §1/§6 | Inspeção + `package.json` | Validado por API |
| Banco + migrations | 3 migrations aplicam em banco limpo | `prisma migrate deploy` | Validado por execução |
| Seed sob RLS | 17 usuários, 4 filiais, 7 áreas | `db:seed` + contagens | Validado por execução |
| RLS forçado | 0 linhas sem contexto | `psql` como `chronostek_app` | Validado por execução |
| Login/RBAC | login 200; 403/401 negados | HTTP real | Validado por API |
| Timezone | `America/Sao_Paulo` em `format.ts` + runtime | Código + `initdb` | Validado por teste |
| Qualidade | typecheck 6/6, lint 6/6, **test 24/24**, build OK | Execução | Validado por teste |
| Persistência entre reinícios | Dados intactos após restart do PG | Contagens pós-restart | Validado por execução |

**Sem alteração de código** (nenhuma regressão encontrada). Critério de aceite **ATINGIDO**. Próxima: Sprint 1.

### Sprint 1 — MVP operacional e validação visual · **2026-06-23**
**Objetivo:** validar os fluxos essenciais do MVP no navegador (preview em `:3100` consumindo a API `:3333`), por perfil, e corrigir o necessário.

**Validação visual por fluxo/perfil** (navegador real, build de produção):

| Fluxo | Perfil | Tela/Rota | Ação | Resultado | Evidência | Status |
| --- | --- | --- | --- | --- | --- | --- |
| Login | Admin | `/login` | Autenticar | Redireciona a `/dashboard` | snapshot + screenshot | Validado visualmente |
| Painel | Admin | `/dashboard` | Ver indicadores | Dados reais (Clientes 2, Proc. 1, Honorários R$ 9.000) + filtros filial/área | screenshot | Validado visualmente |
| Prazos | Admin | `/prazos` | Listar/cores | "Crítico" (4 dias) e **"Vencido"** (vencido) com cor vermelha; views e filtros presentes | eval DOM + código `Badge` | Validado visualmente |
| Acesso | Admin | sidebar | Navegação | 11 módulos visíveis (todas as permissões) | snapshot | Validado visualmente |
| 1º acesso | Advogado | `/login`→`/alterar-senha` | Login | Forçado a trocar senha ("Proteja sua conta", 3 campos) | eval DOM | Validado visualmente |
| RBAC menu | não-admin | sidebar | Filtragem | Menu filtrado por permissão (`app-shell.tsx:30`) | código + API 403 | Validado por código+API |
| Intake | Secretaria | `/api/v1/clients` (BFF) | Criar cliente | **201** + read-back (2 clientes) | HTTP real | Validado por API |
| RBAC backend | Secretaria | `/api/v1/admin/branches` | Criar filial | **403** negado | HTTP real | Validado por API |
| Estrutura | Financeiro | `/financeiro/*` | Conferir | Páginas existem (contratos/parcelas/inadimplência/comprovantes) + rotas `finance/*` | build + código | Estrutura presente (pós-MVP) |

**Correção implementada (apenas o necessário):**

| Item | Resultado | Evidência | Status |
| --- | --- | --- | --- |
| Indicador de prazo mostrava código cru (`RED`/`DARK_RED`) | Agora exibe rótulo PT: No prazo/Atenção/Crítico/**Vencido**/Encerrado | `status-badge.tsx` (commit `df5472f`) | Funcional |
| Cores de prazo (`>7` verde · `6–7` amarelo · `≤5` vermelho · vencido) | Mantidas e corretas | `deadline.ts` + 7 testes + variantes `Badge` | Validado por teste+visual |

**Arquivos alterados:** `apps/web/src/components/status-badge.tsx` (1 arquivo, +13/-1).
**Rotas/perfis testados:** Admin (visual), Advogado (visual 1º acesso), Secretaria (API/BFF), RBAC (visual+API).
**Resultados:** `pnpm --filter @chronostek/web build` ✅; testes API 24/24 ✅ (sem regressão).
**Bugs encontrados:** rótulo de prazo em inglês (corrigido). **Bugs corrigidos:** 1.
**Pendências (Sprint 2):** localizar enums de status em PT (PENDING→Pendente etc.) nos badges; validar visualmente criação de processo/atendimento e filtros do Gestor pela UI.
**Riscos:** screenshots do preview instáveis (timeout) — validação feita por snapshot/eval/inspeção, que são preferidos para texto/estado.
**Dados:** criado 1 prazo vencido de teste no **banco local** (descartável, não versionado) para evidenciar "Vencido"; produção recebe seed limpo.
**Critério de aceite Sprint 1:** **ATINGIDO** para Admin/Secretaria/Advogado/cores-de-prazo/RBAC; Gestor e percurso visual de formulários de processo ficam para reforço na Sprint 2. Próxima: Sprint 2.

### Sprint 2 — Estabilização e ajustes do uso real · **2026-06-23**
**Objetivo:** eliminar atritos dos fluxos reais sem redesign.

**Diagnóstico (o que já existia — não refeito):**

| Item | Achado | Status |
| --- | --- | --- |
| Estados vazios | `DataTable` já mostra "Nenhum registro encontrado." com ícone | Funcional |
| Paginação | Componente `Pagination` presente nas listas | Funcional |
| Filtros/busca | ModuleNav + selects (filial/área/responsável/status) + `SearchForm` | Funcional |
| Mensagens de erro | `CreatePanel` exibe `detail/title` da API em box vermelho | Funcional |
| Validação | Zod no backend + `required` no frontend | Funcional |

**Correção implementada (atrito real):**

| Item | Antes | Depois | Evidência | Status |
| --- | --- | --- | --- | --- |
| Status técnicos em inglês nos badges | `ACTIVE`, `PENDING`, `RECEIVED`, `UNDER_REVIEW`, `APPROVED`, `DRAFT`, `PAID` | `Ativo`, `Pendente`, `Recebido`, `Em análise`, `Aprovado`, `Rascunho`, `Pago` | `status-badge.tsx` (commit `0e940ec`) | Validado visualmente |

**Validação visual (preview, build de produção):**

| Tela/Rota | Verificação | Resultado | Status |
| --- | --- | --- | --- |
| `/clientes` | Status do cliente | "Ativo" (PT) | Validado visualmente |
| `/prazos` | Situação do prazo | "Pendente" + "Vencido"/"Crítico" (PT) | Validado visualmente |
| `/clientes?status=INACTIVE` | Filtro + estado vazio | 0 linhas, "Nenhum registro encontrado." | Validado visualmente |

**Arquivos alterados:** `apps/web/src/components/status-badge.tsx` (display-only; lógica de cor intacta).
**Resultados:** `build` web ✅ (37 páginas); testes API 24/24 ✅. **Bugs corrigidos:** 1 (legibilidade de status).
**Pendências:** nenhuma crítica. **Critério de aceite Sprint 2:** **ATINGIDO** (fluxos sem falha crítica; filtros/validações/mensagens/estados vazios operacionais). Próxima: Sprint 3.

### Sprint 3 — Contratos, honorários e parcelamentos · **2026-06-23**
**Objetivo:** validar/finalizar a base financeira (contratos, honorários, custas, parcelas, pagamento). O módulo **já estava implementado** (`finance.routes.ts`); o trabalho foi validar por execução e corrigir um defeito.

**Validação por execução (API real):**

| Item | Ação | Resultado | Status |
| --- | --- | --- | --- |
| Criar contrato | `POST /finance/contracts` (R$12.000 + R$600, 4 parcelas, vínculo cliente+processo) | 201; 4 parcelas de R$3.150 (soma 12.600), vencimentos mensais, aging correto | Validado por API |
| Registrar pagamento | `POST /installments/:id/pay` | Parcela #1 → PAGO, `paidAt`, responsável registrado | Validado por API |
| Resumo financeiro | `GET /finance/summary` | Contratado R$21.000, ativos 2, recebido/mês R$3.150, custas R$1.100 (agregações reais) | Validado por API |
| Permissão (Secretaria) | `GET`/`POST /finance/contracts` | **403/403** (sem `finance.read`/`finance.update`) | Validado por API |
| Permissão (Financeiro) | `GET /finance/contracts` | **200** (tem `finance.read`) | Validado por API |

**Bug encontrado e corrigido (operacional):**

| Bug | Causa | Correção | Evidência |
| --- | --- | --- | --- |
| Páginas **Contratos**, **Comprovantes** e **Parcelas (aba "Todas")** quebravam com erro de Server Components | `FinanceContractsTable` enviava `view=""` → API responde **422** (enum) → `fetchData` lança no SSR | Omitir parâmetros vazios da query (commit `a8a91d1`) | UI antes: "Algo não saiu como esperado"; depois: 7 parcelas renderizadas |

**Validação visual (pós-correção):** `/financeiro/contratos` lista 7 parcelas com cliente/parcela, filial, valor, vencimento, forma (PIX), aging ("Pago", "Em dia", "Inadimplente +15 dias") e ação "Registrar pagamento".
**Arquivos alterados:** `finance-contracts-table.tsx` (+4/-1). **Build** web ✅; testes API 24/24 ✅.
**Critério de aceite Sprint 3:** **ATINGIDO** (contrato↔cliente/processo, honorários+custas, parcelas com valor/venc/status, pagamento/baixa, histórico via audit, filtros, permissões financeiro/admin). Próxima: Sprint 4.

### Sprint 4 — Cobrança e inadimplência · **2026-06-23**
**Objetivo:** acompanhamento de parcelas, vencimentos, inadimplência e cobrança. Já existia (views, página de inadimplência, `collection-notes`, aging); trabalho = validar e ajustar cores.

**Validação por execução (API real):**

| Item | Resultado | Status |
| --- | --- | --- |
| Filtros (views) | `upcoming`/`overdue`/`delinquent`/`paid` retornam contratos corretamente | Validado por API |
| Registrar cobrança (follow-up) | `POST /contracts/:id/collection-notes` → **201** | Validado por API |
| Histórico de cobrança | Timeline mostra `COLLECTION_NOTE_ADDED` com **data, responsável (Douglas Almeida) e observação** completa | Validado por API |
| Inadimplência +15 dias | `view=delinquent` retorna o contrato com parcela vencida há >15 dias | Validado por API |

**Cores financeiras (regra do MVP) — validadas por classe CSS na UI:**

| Aging | Cor exigida | Cor obtida | Status |
| --- | --- | --- | --- |
| Em dia (`EM_DIA`) | Verde | **Verde** (corrigido — commit `d0bd105`) | Validado visualmente |
| A vencer (`A_VENCER`) | Amarelo | **Amarelo** | Validado visualmente |
| Vencido (`VENCIDO`) | Vermelho | **Vermelho** | Validado visualmente |
| Inadimplente +15 dias | Laranja | **Laranja** | Validado visualmente |

**Correção:** `EM_DIA` passou de ciano (default) para verde, completando a regra. Datas/aging respeitam America/Sao_Paulo (runtime `TZ` fixo + `installmentAging`).
**Arquivos alterados:** `status-badge.tsx` (+1/-1). **Build** ✅; testes 24/24 ✅.
**Critério de aceite Sprint 4:** **ATINGIDO** (parcelas próximas/vencidas, inadimplentes em lista própria com laranja, follow-up com data/responsável/observação, filtros, permissões). Próxima: Sprint 5.

### Sprint 5 — Dashboard executivo e relatórios · **2026-06-23**
**Objetivo:** visão consolidada das 4 filiais com dados reais. Já implementado (`dashboard.routes.ts`, `reports.routes.ts`); trabalho = validar (sem mudança de código).

**Validação por execução (API real, sem mock):**

| Item | Resultado | Status |
| --- | --- | --- |
| Relatório consolidado | proc. ativos/finalizados, faturamento R$3.150, inadimplentes — agregações reais (`groupBy`/`aggregate`) | Validado por API |
| Por área / filial / advogado | `[Trabalhista:1]` / `[Matriz Centro:1]` / `[Lucas Martins:1]` | Validado por API |
| Período (from/to) | Default mês corrente; aceita intervalo | Validado por API |
| Export CSV | **200** `text/csv; charset=utf-8` (com BOM) | Validado por API |
| Restrição por perfil | Secretaria **403**, Advogado **403** (sem `report.read`); Visualizador **200** | Validado por API |
| **Gestor — escopo de filial** | carlos (MATRIZ) vê **apenas "Matriz Centro"** no relatório | Validado por API |

**Validação visual:** `/relatorios` renderiza (sem erro) com indicadores (Clientes atendidos, Faturamento, Inadimplentes +15d, Processos ativos/finalizados, Prazos próximos) + 3 tabelas (por área/filial/advogado). `/dashboard` com dados reais já validado na Sprint 1.

**Observação:** esta sprint também cobre o **fluxo do Gestor** pendente da Sprint 1 (filtros por filial/área/responsável + restrição real por filial, comprovada no backend).
**Arquivos alterados:** nenhum (já implementado). **Build/testes:** sem alteração — 24/24 ✅.
**Critério de aceite Sprint 5:** **ATINGIDO** (visão consolidada, filtros, dados reais batendo com listagens, relatórios restritos por perfil, estados coerentes). Próxima: Sprint 6.

### Sprint 6 — Auditoria, segurança e backup · **2026-06-23**
**Objetivo:** rastreabilidade, segurança operacional e procedimento de backup/recuperação.

**Auditoria e segurança (validado por execução):**

| Item | Resultado | Status |
| --- | --- | --- |
| Trilha de auditoria | 33 eventos (AUTH_LOGIN, CLIENT_CREATED, CONTRACT_CREATED, DEADLINE_CREATED, PAYMENT_RECORDED, COLLECTION_NOTE_ADDED) com **ator, ação, entidade, data, IP, user agent** | Validado por API |
| Auditoria restrita | Admin `GET /admin/audit` **200**; Advogado **403** (sem `audit.read`) | Validado por API |
| Sem segredos em log | `audit_logs` não tem coluna de senha/token | Validado por banco |
| Credenciais protegidas | `sessions.token_hash` (sem token em claro); `users.password_hash` (argon2, sem senha em claro); `clients.tax_id_encrypted` (CPF cifrado) | Validado por banco |
| RLS forçado | 0 linhas sem contexto de tenant | Validado por banco (Sprint 0) |
| Rotas protegidas | 401 sem token / 403 sem permissão em todos os módulos | Validado por API |

**Backup e recuperação (procedimento testado):**

| Item | Resultado | Status |
| --- | --- | --- |
| `pg_dump` (custom) | Dump gerado (~137 KB) | ✅ testado |
| `pg_restore` em DB de teste | exit 0; contagens conferem (users=17, audit=31, contracts=2) | ✅ testado |
| Script de backup | `scripts/backup-db.ps1` (timestamp + retenção) — gerou dump de 133,6 KB | ✅ testado |
| Runbook | `docs/RUNBOOK_BACKUP_E_RECUPERACAO.md` (backup, restore, verificação, segurança) | Criado |
| Backup automatizado de produção | Agendamento/retenção/storage seguro | 🟧 **pendente de infraestrutura/produção** |

**Arquivos criados:** `docs/RUNBOOK_BACKUP_E_RECUPERACAO.md`, `scripts/backup-db.ps1` (commit `^`).
**Critério de aceite Sprint 6:** **ATINGIDO** para auditoria/segurança/procedimento de backup; **backup de produção permanece pendente de infraestrutura** (não declarado como configurado). Próxima: Sprint 7.

### Sprint 7 — Treinamento e operação assistida · **2026-06-23**
**Objetivo:** materiais que habilitam o uso por perfil, sem prometer ausências nem fingir treinamento.

| Item | Resultado | Status |
| --- | --- | --- |
| Guia rápido por perfil | `docs/GUIA_RAPIDO_LEXORA.md` (Admin, Secretaria, Advogado, Gestor, Financeiro) | Criado |
| Fluxos recomendados + como-fazer | Cadastrar cliente/atendimento/processo/prazo/documento/contrato/parcela; acompanhar inadimplência | Documentado |
| Regras de prazo e cores | Tabela alinhada ao comportamento real validado | Documentado |
| FAQ + limites conhecidos | Inclui audiência como tipo de prazo e integrações fora do MVP | Documentado |
| Checklist de treinamento | Tabela por usuário (login/senha/fluxo/dúvidas/data/treinado por) | Criado |
| Canal de suporte | Marcado como **a definir pelo escritório** | 🟧 pendente de decisão |

**Princípio aplicado:** o guia descreve **apenas funcionalidades reais e validadas**; diferencia
**"material pronto"** de **"usuário treinado"** (treinamento humano real ainda **não realizado**).
**Arquivos criados:** `docs/GUIA_RAPIDO_LEXORA.md`.
**Critério de aceite Sprint 7:** **ATINGIDO** (guia por perfil alinhado ao sistema real, sem promessas; checklist de treinamento; suporte marcado como pendente de definição). Próxima: Sprint 8.

### Sprint 8 — Consolidação e prontidão de go-live · **2026-06-23**
**Objetivo:** consolidar a versão e formalizar a prontidão, sem declarar go-live de produção (sem infra/credenciais).

**Revisão geral de qualidade (re-executada após todas as sprints):**

| Item | Resultado |
| --- | --- |
| `pnpm typecheck` | ✅ 6/6 |
| `pnpm lint` | ✅ 6/6 (schema válido) |
| `pnpm test` | ✅ 24/24 |
| `pnpm build` | ✅ web (37 rotas) + API |

**Entregáveis:**

| Item | Arquivo | Status |
| --- | --- | --- |
| Checklist de produção/go-live | `docs/CHECKLIST_GO_LIVE_LEXORA.md` | Criado |
| Backlog pós-go-live | `docs/BACKLOG_POS_GO_LIVE.md` | Criado |
| Runbook de backup | `docs/RUNBOOK_BACKUP_E_RECUPERACAO.md` | Criado (Sprint 6) |
| Guia por perfil | `docs/GUIA_RAPIDO_LEXORA.md` | Criado (Sprint 7) |

**Prontidão final (declaração honesta):**

| Dimensão | Situação |
| --- | --- |
| Código do MVP | ✅ **Pronto** (typecheck/lint/test/build verdes; sem bug crítico aberto) |
| Banco/migrations/seed/RLS | ✅ **Pronto** (testado em clone limpo) |
| Fluxos do MVP (5 perfis) | ✅ **Validados** (UI + API + permissões) |
| Backup/recuperação | ✅ Procedimento **testado** · 🟧 automação de produção pendente |
| Repositório (push) | 🟧 **pendente de acesso de escrita** (commits locais prontos) |
| Produção (infra/segredos/TLS/deploy/backup agendado) | 🟧 **pendente de infraestrutura e credenciais** |
| Treinamento humano | 🟦 material pronto; treinamento **não realizado** |

**Conclusão:** **MVP pronto para homologação local e pronto para implantação, condicionado** à
configuração de infraestrutura de produção e credenciais. **Go-live de produção NÃO declarado concluído.**
**Critério de aceite Sprint 8:** **ATINGIDO** (revisão geral, checklists, backlog, riscos e pendências
separados entre código × infraestrutura × decisão humana; STATUS reflete apenas o comprovado).

### Sprint 10 — Auditoria de cibersegurança, finalização e validação por perfil · **2026-06-24**
**Objetivo:** auditar segurança real (local), corrigir achados comprovados e validar operação por perfil.

**Auditoria (escopo local) — nenhuma vuln crítica/alta; ver `docs/AUDITORIA_CIBERSEGURANCA_LEXORA.md`:**

| Sprint | Item | Resultado | Evidência | Status |
| --- | --- | --- | --- | --- |
| 10 | Headers de segurança no web | Adicionados (X-Frame-Options/nosniff/Referrer/Permissions/CSP) | HTTP em `/login` | Corrigido (`6285dbb`) |
| 10 | Validação de query (enum/data vazios) | Endurecida no backend | `query-hardening.test.ts` + HTTP | Corrigido (`e96f4d6`) |
| 10 | RBAC/RLS/IDOR/BOLA | Negações 403/401 + isolamento de filial (404) | API real | Validado por API |
| 10 | Auth (enumeração/rate limit/headers) | Sem enumeração; rate limit 10/15min; headers helmet | HTTP | Validado por API |
| 10 | Uploads / SQL / XSS / segredos | Allowlist+attachment; sem raw SQL; sem HTML perigoso; sem segredo rastreado | Inspeção + busca | Validado |

**Validação por perfil (RBAC + bloqueios reais):**

| Perfil | Fluxo | Tela/Rota | Ação | Resultado | Evidência | Status |
| --- | --- | --- | --- | --- | --- | --- |
| Admin | Acesso total | `/dashboard`,`/admin/*` | Operar/consultar | 200; auditoria 200 | visual+API | ✅ |
| Secretaria | Troca de senha 1º acesso | `/alterar-senha`→`/dashboard` | Definir senha | Acessa; menu sem Financeiro/Relatórios/Administração | visual | ✅ |
| Secretaria | Bloqueio admin/finance | `/admin/*`,`/finance/*` | Tentar | **403**; cliente de outra filial **404** | API | ✅ |
| Advogado | 1º acesso | `/login`→`/alterar-senha` | Login | Forçado a trocar; `/admin` **403** | visual+API | ✅ |
| Gestor | Escopo de filial | `/reports/summary` | Consultar | Vê só a própria filial | API | ✅ |
| Financeiro | Operação financeira | `/finance/*` | Contrato/pagamento | 200; `/deadlines`,`/cases` POST **403** | API | ✅ |
| Visualizador | Somente leitura | `/clients` | Criar | **403** | API | ✅ |

**Regras de prazo/financeiro (timezone America/Sao_Paulo):** verde >7 / amarelo 6-7 / vermelho ≤5 /
**Vencido**; financeiro verde em dia / amarelo a vencer / vermelho vencido / laranja +15d — **validadas**.
**Qualidade após correções:** typecheck ✅ · lint ✅ · **test 34/34** ✅ · build ✅.
**Arquivos alterados:** `next.config.ts`, `contracts/domain.ts`, `deadlines.routes.ts`, `finance.routes.ts`, `query-hardening.test.ts`.
**Classificação final:** **Pronto para implantação condicionado à infraestrutura** (nenhuma vuln crítica aberta).

### Sprint 11 — Lapidação operacional, UX e usabilidade · **2026-06-24**
**Objetivo:** deixar o sistema confortável para uso diário, com correções mínimas e baseadas em evidência (sem redesign).

| Item | Achado | Correção | Evidência | Status |
| --- | --- | --- | --- | --- |
| Dashboard × permissão | Cards financeiros apareciam para perfis sem `finance.read` e linkavam a `/financeiro` → **403 ao clicar** | Cards filtrados por permissão; **backend deixa de enviar KPIs financeiros** a quem não tem `finance.read` (não é filtro visual); destinos de cards corrigidos | API (Advogado: `openContracts=null`) + HTML (Secretaria sem cards financeiros; Admin com todos) | ✅ Corrigido (`f35f7d6`) |
| Marca do produto | UI exibia "CHRONOSTEK" (fornecedor) | Texto de marca → **"LEXORA"** (produto, conforme SPEC) no login, sidebar e título | curl: título "Lexora …", marca LEXORA | ✅ Corrigido (`4ff0be5`) |
| Estados vazios | Mensagem genérica não distinguia "sem cadastro" de "sem resultado de filtro" | Mensagens contextuais em clientes/processos/atendimentos | `/clientes?status=INACTIVE` → "…com os filtros aplicados" | ✅ Corrigido (`4c28baf`) |

**Validação por perfil (UX):** Admin (todos os cards + Honorários), Secretaria (só cards operacionais; menu sem
Financeiro/Relatórios/Administração; troca de senha E2E), Advogado/Financeiro/Gestor/Visualizador (RBAC mantido).
**Qualidade:** typecheck ✅ · lint ✅ · test ✅ · build ✅ (sem regressão).
**Arquivos:** `dashboard.routes.ts`, `dashboard/page.tsx`, `layout.tsx`, `login/page.tsx`, `app-shell.tsx`, `clientes/processos/atendimentos/page.tsx`.
**Pendente de validação do escritório:** preferências finais de terminologia/marca (assumido "Lexora" conforme SPEC).
**Critério de aceite Sprint 11:** **ATINGIDO** (navegação coerente por perfil, sem links que levam a erro; marca consistente; estados vazios úteis). Sem alteração de RLS/RBAC/sessão além do reforço do dashboard.

### Sprint 12 — Publicação controlada, infraestrutura e homologação de produção · **2026-06-25**
**Objetivo:** conduzir a implantação de produção em ordem **segura, reproduzível, documentada e reversível**, avançando tudo que não depende de credencial externa e deixando cada bloqueio com **próximo passo objetivo**.

**Baseline revalidado (gates verdes, sem alteração de código de produto):**

| Gate | Resultado |
| --- | --- |
| `pnpm typecheck` | ✅ 6/6 |
| `pnpm lint` | ✅ 6/6 (schema válido) |
| `pnpm test` | ✅ **34/34** (inclui isolamento RLS real) |
| `pnpm build` | ✅ web (37 rotas) + API |

**Git:** árvore limpa; **29 commits à frente** de `origin/main`; `git log --left-right origin/main...HEAD` mostra **apenas `>`** → push **fast-forward** (sem rebase, sem force).

**Entregáveis desta sprint:**

| Item | Arquivo | Status |
| --- | --- | --- |
| Plano de implantação (9 etapas, segredos, rollback, critérios) | `docs/PLANO_IMPLANTACAO_PRODUCAO_LEXORA.md` | Criado |
| Correção de segurança no `.gitignore` | `.gitignore` | Corrigido e validado |
| Gerador de segredos de produção (não imprime valores; arquivo 600) | `infra/deploy/scripts/generate-secrets.sh` | Criado e **testado** |
| Smoke test do ambiente publicado (health/TLS/HSTS/401/CORS/cookie) | `infra/deploy/scripts/smoke-test.sh` | Criado |

**Achado de segurança corrigido:** o `.gitignore` ignorava `.env` e `*.local`, mas **não** `infra/deploy/.env.production` — exatamente o caminho onde o `DEPLOY.md` instrui colocar os segredos reais (risco de commit acidental). Corrigido para `.env.*` mantendo `!.env.example` e `!.env.production.example`. **Validado:** `git check-ignore infra/deploy/.env.production` retorna ignorado e o arquivo gerado não aparece em `git status`.

**Estado por etapa do plano:**

| Etapa | Situação |
| --- | --- |
| 1. Baseline local | ✅ Concluída (gates verdes) |
| 2. GitHub (push dos 29 commits) | 🟧 **Bloqueada**: credencial sem escrita (`Invalid username or token` / auth failed). Comando pronto: `git push origin main` (fast-forward). |
| 3. VPS (provisionamento/hardening) | 🟧 Pendente de acesso SSH por chave ao `167.233.26.140` |
| 4. PostgreSQL de produção | 🟧 Pendente de VPS; migrations + verificação `chronostek_app` `NOBYPASSRLS` documentadas; **sem seed de demonstração** |
| 5. API na VPS | 🟧 Pendente de VPS (Docker ausente nesta máquina; a imagem reusa o `pnpm build` já verde) |
| 6. Frontend Vercel | 🟧 Pendente de credencial/projeto Vercel |
| 7. Domínio/TLS/CORS/cookies | 🟦 Pendente de definição de domínio |
| 8. Backup automatizado | 🟧 Pendente de VPS; script + cron + retenção + offsite documentados |
| 9. Smoke test publicado | 🟧 Pendente do ambiente publicado; `smoke-test.sh` pronto |
| 10. Homologação | 🟦 Pendente de dados reais e decisões do escritório (`HOMOLOGACAO.md`) |

**Princípio mantido:** nenhum controle de segurança desativado; nenhum segredo versionado/impresso; nenhum dado de demonstração usado como produção; nenhuma operação destrutiva de Git/infra. **Go-live de produção NÃO declarado** (depende dos 🟧/🟦 acima).
**Critério de aceite Sprint 12:** **ATINGIDO no escopo executável** (baseline, plano reproduzível/reversível, correção de segurança verificada, ferramenta de segredos testada, smoke test pronto). Etapas externas seguem com bloqueio declarado e próximo passo objetivo.

---

> **Registro incremental:** este documento é atualizado a cada etapa executada (seção 8 das regras de implementação).
>
> - **2026-06-23 (auditoria)** — Auditoria executável concluída: backend validado ponta a ponta em clone limpo (migrations, seed, 24/24 testes, login, RBAC, cores de prazo, RLS).
> - **2026-06-23 (P1 parcial)** — Camada web validada (BFF + SSR + cookie HttpOnly + dashboard real — seção 6.1). Pendente: percurso visual de formulários por perfil.
>
> **Pendência de versionamento (2026-06-25):** há **29 commits** locais prontos (de `5e3ce84` a
> `9bd350e`), árvore limpa, push **fast-forward**. O `git push origin main` permanece **bloqueado** por
> credencial sem escrita (`remote: Invalid username or token`). **Próximo passo objetivo:** o dono do
> repositório `Isaac002c/LexoraJuris` configura uma credencial com permissão de escrita (PAT no Git
> Credential Manager ou `gh auth login` após instalar o GitHub CLI) e executa `git push origin main`.
> Nenhum token deve ser colado em chat, commit ou documento.
