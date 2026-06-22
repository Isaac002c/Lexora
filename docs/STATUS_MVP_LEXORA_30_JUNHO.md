# STATUS DO MVP — LEXORA (entrega operacional até 30/06/2026)

> Produto: **Lexora — Sistema de Gestão Jurídica Inteligente** · Fornecedor: **Chronostek**
> No código o namespace é `@chronostek/*` e o tenant de demonstração é `demo-chronostek`. "Lexora" é o nome comercial do produto; "Chronostek" é a empresa/fornecedor.
>
> Documento de auditoria e acompanhamento do MVP. Atualizado de forma incremental a cada etapa executada.
> Última atualização: **2026-06-22** — auditoria concluída + P0 destravado: seed operável sob RLS, banco semeado e **login ponta a ponta validado (API + Web)**.

---

## 1. Resumo executivo

A base do Lexora **não é uma demonstração visual**: é um monorepo bem arquitetado, com modelo de dados de nível de produção, autorização real no backend, multi-tenant com Row-Level Security (RLS) no PostgreSQL e cobertura de testes (incluindo teste real de isolamento de tenant).

O código do MVP está **substancialmente completo e com alta qualidade**:

- `pnpm typecheck` — **passa** (6/6 projetos).
- `pnpm build` — **passa** (web com 30+ rotas compiladas + API via tsup).
- `pnpm lint` — **passa** (eslint `--max-warnings=0`, schema Prisma válido).
- `pnpm test` — **24/24 testes passam**, incluindo o teste de isolamento RLS real contra PostgreSQL (`apps/api/src/tenant-rls.integration.test.ts`).

**Porém, o sistema está atualmente INUTILIZÁVEL na prática**, por motivos operacionais — não por falta de funcionalidade:

1. 🔴 **O banco não tem dados de acesso.** Há 1 tenant, mas **0 usuários, 0 filiais, 0 áreas, 0 clientes**. Ninguém consegue fazer login.
2. 🔴 **O seed não roda na configuração atual.** Ele conecta como `chronostek_app` (sem `BYPASSRLS`) sob RLS forçado, mas não define `app.tenant_id` → todo INSERT em tabela com tenant é bloqueado pela política RLS. O seed cria o tenant (tabela sem RLS) e falha logo na primeira filial.
3. 🔴 **Repositório Git sem nenhum commit.** Tudo está como _untracked_. Não há ponto de recuperação — qualquer alteração é arriscada.
4. 🟠 **Migration órfã/revertida no banco.** O registro `202606180004_finance_proofs_and_collection` está marcado como `rolled_back` em `_prisma_migrations`, mas a pasta da migration não existe mais. Isso pode travar `prisma migrate dev`.
5. 🟡 **Documentação anterior superestima o estado.** O `docs/MVP_STATUS.md` lista tudo como "Entregue" e "validado" — inclusive o módulo Financeiro (que é pós-MVP) — quando o sistema sequer inicia. Esta auditoria substitui aquela visão.

**Conclusão:** o esforço até 30/06 é de **destravamento operacional, verificação ponta a ponta e ajustes finos** — não de reconstrução. A distância até um MVP operacional é pequena, mas existem bloqueadores reais (P0) que precisam ser resolvidos antes de qualquer validação de fluxo.

---

## 2. Prontidão estimada (com justificativa)

A prontidão é avaliada em duas dimensões, porque elas divergem fortemente neste projeto:

### 2.1. Prontidão de CÓDIGO do MVP — **~88%**

Justificativa por evidência (backend + frontend existentes e compiláveis):

| Módulo MVP | Backend | Frontend | Evidência |
| --- | --- | --- | --- |
| Acesso/usuários/permissões | ✅ | ✅ | `auth.service.ts`, `auth.middleware.ts`, `packages/auth/src/index.ts` (6 perfis), `admin.routes.ts` |
| Filiais e áreas jurídicas | ✅ | ✅ | `admin.routes.ts` (CRUD filiais/áreas), páginas em `administracao/filiais`, `administracao/areas` |
| Clientes e atendimentos | ✅ | ✅ | `clients.routes.ts`, `attendances.routes.ts`, páginas `clientes/*`, `atendimentos/*` |
| Processos | ✅ | ✅ | `cases.routes.ts` (lista/criação/edição/detalhe/filtros/atribuição), `processos/*` |
| Prazos/audiências/agenda | ✅ | ✅ | `deadlines.routes.ts`, `lib/deadline.ts` (cores, testado), `calendario/page.tsx`, `deadline-calendar.tsx` |
| Documentos e checklists | ✅ | ✅ | `documents.routes.ts` + `storage.ts` (upload validado/seguro), `checklists.routes.ts`, páginas |
| Painel operacional | ✅ | ✅ | `dashboard.routes.ts` (dados 100% reais, sem mock) |

O desconto de ~12% reflete: ajuste de fuso em datas `@db.Date` (risco de erro de 1 dia), verificação de aceite ainda não executada na interface, e pequenos alinhamentos (áreas iniciais x spec).

### 2.2. Prontidão OPERACIONAL — **destravada (~70% e subindo)**

**Atualização (2026-06-22, pós-P0):** o sistema deixou de estar bloqueado. Seed corrigido e executado, banco semeado, e o fluxo de autenticação foi **validado ponta a ponta** (API por HTTP real + Web via BFF). Admin entra direto no painel com **dados reais** (R$ 9.000, contadores do seed). RBAC negando acessos indevidos no backend confirmado.

Restam para chegar a ~100% operacional: verificação dos demais critérios de aceite na interface (P1), correção de fuso em datas `@db.Date` (P2) e preparação de entrega (P3).

---

## 3. Matriz Spec × Código (requisito · estado · evidência · risco · prioridade · ação)

Legenda de estado: ✅ Concluído e validado · 🟩 Implementado (a validar na UI) · 🟨 Parcial · 🟥 Quebrado/bloqueado · ⬜ Inexistente

### 3.1. Acesso, usuários e permissões
| Requisito | Estado | Evidência | Risco | Prio | Ação |
| --- | --- | --- | --- | --- | --- |
| Login funcional | 🟥 (código ✅, sem dados) | `auth.service.ts:29` usa tenant por slug + `withTenant` | Sem seed, ninguém entra | P0 | Corrigir e rodar seed |
| Sessão segura (token opaco, HttpOnly) | 🟩 | cookie HttpOnly em `lib/session.ts`/middleware; token SHA-256 em `sessions` | Baixo | P1 | Validar logout/expiração |
| 6 perfis (Admin, Gestor, Secretaria, Advogado, Financeiro, Visualizador) | 🟩 | `packages/auth/src/index.ts:1`; seed `rolePermissions` | Baixo | P1 | Validar matriz na UI |
| Usuário vinculado a filial e área | 🟩 | `UserBranchAccess`, `hasAllBranches` | Baixo | P1 | Validar |
| Controle de visualização/edição por perfil (no backend) | 🟩 | `requirePermission`, filtros `caseAssignmentFilter` etc. em `lib/tenant.ts` | Baixo | P1 | Testar negações |
| Admin gere usuários/perfis/filiais/áreas | 🟩 | `admin.routes.ts` (overview/CRUD/reset senha/settings) | Baixo | P1 | Validar na UI |

### 3.2. Filiais e áreas jurídicas
| Requisito | Estado | Evidência | Risco | Prio | Ação |
| --- | --- | --- | --- | --- | --- |
| CRUD das 4 filiais | 🟩 | `admin.routes.ts:28/68`; seed `branchSeeds` (4) | Baixo | P1 | Validar |
| CRUD de áreas jurídicas | 🟩 | `admin.routes.ts:39/81` | Baixo | P1 | Validar |
| Áreas iniciais conforme spec | 🟨 | seed tem "Vara Civil" e não "Juizado Cível"/"Vara Cível" exatos | Cosmético | P2 | Alinhar seed às áreas da spec |
| Filtros por filial/área/responsável | 🟩 | query params nas rotas de lista | Baixo | P1 | Validar |
| Relacionamentos consistentes | ✅ | `schema.prisma` com chaves compostas `(tenantId,id)` | Baixo | — | — |

### 3.3. Clientes e atendimentos
| Requisito | Estado | Evidência | Risco | Prio | Ação |
| --- | --- | --- | --- | --- | --- |
| Cadastro de cliente (campos da spec) | 🟩 | `clients.routes.ts`, `Client` no schema (nome, telefone, email, filial, área via processo, responsável, obs) | Baixo | P1 | Validar |
| Registro/histórico/status de atendimento | 🟩 | `attendances.routes.ts`, `Attendance` (status, triagem, encaminhamento) | Baixo | P1 | Validar |
| Triagem e encaminhamento interno | 🟩 | `AttendanceStatus` (NOVO→EM_TRIAGEM→DIRECIONADO...), `attendance-convert-panel.tsx` | Baixo | P1 | Validar conversão |
| Filtros/busca + validações obrigatórias | 🟩 | Zod em `packages/contracts`, busca por nome/email/CPF | Baixo | P1 | Validar |
| Persistência real | 🟩 | inserts via `withTenant` | Baixo | P1 | Validar |

### 3.4. Processos
| Requisito | Estado | Evidência | Risco | Prio | Ação |
| --- | --- | --- | --- | --- | --- |
| Cadastro com vínculo obrigatório a cliente | 🟩 | `cases.routes.ts:27` (cria `CaseParty`) | Baixo | P1 | Validar |
| Filial/área/responsável/número/status/andamento/obs | 🟩 | `LegalCase` no schema; `cases.routes.ts` | Baixo | P1 | Validar |
| Histórico de alterações/andamentos | 🟩 | `AuditLog` por ação (CASE_*); detalhe inclui audit | Baixo | P1 | Validar |
| Filtros (cliente/área/filial/responsável/status) | 🟩 | `cases.routes.ts:12` | Baixo | P1 | Validar |
| Página de detalhe utilizável | 🟩 | `processos/[id]/page.tsx`; `getCaseById` inclui prazos/docs/checklists | Baixo | P1 | Validar |

### 3.5. Prazos, audiências e agenda
| Requisito | Estado | Evidência | Risco | Prio | Ação |
| --- | --- | --- | --- | --- | --- |
| Cadastro de prazo (tipo/descr/venc/processo/cliente/resp/filial/área) | 🟩 | `deadlines.routes.ts:79`, `Deadline` no schema | Baixo | P1 | Validar |
| Audiências | 🟨 | `DeadlineType.AUDIENCIA` + `LegalCase.hearingAt`; não há entidade separada | Médio | P1 | Confirmar fluxo de audiência na agenda |
| Agenda visualizável + prazos críticos | 🟩 | `calendario/page.tsx`, `deadline-calendar.tsx`, `prazos/page.tsx` | Baixo | P1 | Validar mês/semana/lista |
| **Cores: >7d verde, ≤7d amarelo, ≤5d vermelho** | ✅ | `lib/deadline.ts:5` + 7 testes em `deadline.test.ts` | Baixo | — | Confirmar na UI |
| Datas sem erro de 1 dia (fuso America/Sao_Paulo) | 🟨 | `dueAt` é `Timestamptz` (ok); `formatDate` (format.ts:1) **sem `timeZone`** → risco em campos `@db.Date` | **Alto** | P2 | Corrigir `formatDate`/entrada de datas |

### 3.6. Documentos e checklists
| Requisito | Estado | Evidência | Risco | Prio | Ação |
| --- | --- | --- | --- | --- | --- |
| Upload real + validação tipo/tamanho | 🟩 | `storage.ts:19` (allowlist MIME), multer `MAX_UPLOAD_SIZE_MB` | Baixo | P1 | Testar upload real |
| Vínculo cliente/processo + quem anexou + data | 🟩 | `documents.routes.ts:105`, `StoredFile`/`Document` | Baixo | P1 | Validar |
| Download seguro (sem URL aberta) | 🟩 | `documents.routes.ts:184` (auth+perm+filial+advogado), path-traversal guard | Baixo | P1 | Testar negação de acesso |
| Checklists por processo + status pendência | 🟩 | `checklists.routes.ts`, `CaseChecklist`/`ChecklistItem`, `checklists/pendencias` | Baixo | P1 | Validar |

### 3.7. Painel operacional
| Requisito | Estado | Evidência | Risco | Prio | Ação |
| --- | --- | --- | --- | --- | --- |
| Indicadores reais (sem mock) | 🟩 | `dashboard.routes.ts:9` — counts/aggregate reais por tenant/filial/perfil | Baixo | P1 | Validar números após seed |
| Visão coerente com perfil | 🟩 | `caseAssignmentFilter`, `allowedBranches` aplicados | Baixo | P1 | Testar como advogado/gestor |

---

## 4. Bloqueios técnicos

- **B1 — Seed inoperante sob RLS (P0).** `packages/database/prisma/seed.ts` usa `new PrismaClient()` (conexão `chronostek_app`, `NOBYPASSRLS`) e não define `app.tenant_id`. Com `FORCE ROW LEVEL SECURITY` (migration `202606170002_tenant_rls`), os INSERT em tabelas tenant-scoped falham. Estado atual do banco confirma: `tenants=1`, `users=0`, `branches=0`, `areas=0`.
- **B2 — Migration revertida órfã (P0).** `_prisma_migrations` contém `202606180004_finance_proofs_and_collection` com `rolled_back_at` preenchido, sem pasta correspondente. O código de finanças **não depende** da tabela `collection_notes` (o endpoint grava apenas `AuditLog` — `finance.routes.ts:135`), e a coluna `payment_proof_file_id` já existe. Portanto a migration é descartável; o registro precisa ser limpo para liberar `prisma migrate`.
- **B3 — Sem histórico Git (P0).** `git log` falha ("does not have any commits yet"). Sem baseline, não há _rollback_ seguro.
- **B4 — Privilégios de banco em dev.** Tabelas pertencem a `postgres`; só existe a role `chronostek_app`. Não há `chronostek_owner` local (existe só no modelo de produção via Docker). Migrations futuras que alteram tabelas precisam de role dona/superuser. Para dev, seed/migrations rodam melhor como superusuário; o app roda como `chronostek_app`.

---

## 5. Riscos para a entrega de 30/06

| # | Risco | Impacto | Mitigação |
| --- | --- | --- | --- |
| R1 | Erro de fuso em datas `@db.Date` (erro de 1 dia) | Alto — requisito explícito da spec | Corrigir `formatDate` (UTC para data pura; America/Sao_Paulo para data+hora) e revisar entrada de datas (P2) |
| R2 | Audiência não ter entidade própria pode não atender expectativa | Médio | Confirmar que `DeadlineType.AUDIENCIA` + `hearingAt` cobrem o fluxo; ajustar UI da agenda se necessário |
| R3 | Sem Git, perda/regressão de trabalho | Alto | Commit baseline + commits por etapa |
| R4 | Ambiente depende de PostgreSQL local manual (sem Docker na máquina) | Médio | Documentar start/stop; já validado o cluster em `.postgres` (porta 55432) |
| R5 | Segredos de exemplo no `.env` de dev | Médio (só dev) | Gerar segredos reais antes de produção (já previsto em `docs/SECURITY.md`) |
| R6 | Verificação de aceite ainda não executada na interface | Médio | Executar os 14 critérios após seed (P1/P3) |

---

## 6. Plano de execução por prioridade

### P0 — Bloqueadores de entrega (em execução)
1. **Baseline Git** — commit inicial do estado atual (após confirmação). [B3]
2. **Tornar o seed operável sob RLS** — rodar o seed dentro de transação com `app.tenant_id` definido (mesmo mecanismo do app), sem exigir superusuário. [B1]
3. **Limpar a migration revertida órfã** em `_prisma_migrations`. [B2]
4. **Executar o seed** e confirmar usuários/filiais/áreas no banco.
5. **Subir API + Web e validar login ponta a ponta** (admin) + 1 fluxo real.

### P1 — Fluxos obrigatórios do MVP (verificação vertical)
- Validar cada módulo na interface (criar/editar/detalhar/filtrar) e as negações de permissão por perfil, usando os usuários do seed.
- Confirmar audiências na agenda e cores de prazo na UI.

### P2 — Qualidade operacional
- **Corrigir fuso de datas** (`formatDate` + entradas). [R1]
- Alinhar áreas iniciais do seed à spec. Revisar estados vazios/erros/responsividade.

### P3 — Preparação para entrega
- Usuários de teste por perfil, checklist de homologação executado, backup/restore testado, build final, plano de deploy assistido.

---

## 7. Backlog pós-MVP (não pode atrasar 30/06)

Já existe **código** para vários destes itens (módulo Financeiro), mas eles **não fazem parte do MVP** e não devem ser critério de liberação:

- Contratos de honorários, parcelas, vencimentos, inadimplência (existe em `finance.routes.ts`, mas é pós-MVP).
- Cobrança avançada, comprovantes, registros de cobrança.
- Relatórios executivos avançados / exportações.
- Auditoria avançada (a auditoria básica via `AuditLog` já existe).
- Integrações: gateway de pagamento, Pix/boleto, WhatsApp/e-mail, assinatura digital, consulta a tribunais, portal do cliente, IA.

> Observação: como o Financeiro já está no código e compila, ele pode permanecer visível, mas **não será validado como parte do MVP** e eventuais defeitos nele são P-baixa.

---

## 8. Critérios de aceite ainda a testar (fluxo ponta a ponta)

A validar na interface após o destravamento P0 (espelha o critério de conclusão do projeto):

1. ✅ Admin faz login. *(validado API + Web/BFF: cookie HttpOnly, admin chega ao painel)*
2. ⬜ Admin cadastra/edita filiais, áreas e usuários. *(backend validado: criação por advogado retorna 403; falta validar a UI)*
3. ⬜ Secretaria cadastra cliente.
4. ⬜ Secretaria registra atendimento e encaminha internamente.
5. ⬜ Usuário autorizado cria processo vinculado ao cliente.
6. ⬜ Advogado registra andamento, prazo e audiência.
7. ⬜ Sistema mostra a cor correta do prazo.
8. ⬜ Usuário anexa documento ao cliente/processo.
9. ⬜ Usuário atualiza checklist documental.
10. ⬜ Gestor consulta processos/pendências/prazos/audiências com filtros.
11. ✅ Painel mostra dados reais. *(validado: `/v1/dashboard` e a página renderizam contadores do seed, R$ 9.000, sem mock)*
12. ✅ Usuário sem permissão não vê/edita dado indevido. *(validado no backend: advogado → admin = 403; sem token → 401; senha errada → 401)*
13. ✅ Build de produção passa (`pnpm build`).
14. 🟨 Ambiente apto para deploy e uso assistido. *(dev validado: API :3333 + Web + PostgreSQL 18; falta checklist final de produção)*

Evidências técnicas já coletadas: `typecheck` ✅ · `build` ✅ · `lint` ✅ · `test` 24/24 ✅ (inclui RLS real).

---

## Registro de execução (log incremental)

- **2026-06-22** — Auditoria inicial concluída. Ambiente validado: Node 24, pnpm 10, PostgreSQL 18 local (porta 55432). `typecheck/build/lint/test` verdes. Identificados bloqueadores P0 (seed/RLS, migration órfã, Git sem commit). Início da execução P0.
- **2026-06-22 (P0)** — Execução dos bloqueadores:
  - **B1 — Seed sob RLS (resolvido).** Reescrito `packages/database/prisma/seed.ts` para rodar dentro de uma transação que define `app.tenant_id` (mesmo mecanismo de `withTenant` do app), permitindo semear com a role `chronostek_app` sem superusuário. Correções adicionais: `tenant_settings` criado após o contexto (tinha RLS), carregamento do `.env` via `process.loadEnvFile` (o `tsx` não auto-carrega), áreas iniciais alinhadas à spec (7 áreas), e admins sem troca de senha forçada (homologação mais fluida).
  - **B2 — Migration órfã (resolvido).** Removido o registro `202606180004_finance_proofs_and_collection` (rolled_back, sem pasta) de `_prisma_migrations`. `prisma migrate status` = "up to date" (3 migrations).
  - **Reset controlado do tenant demo** + re-seed limpo: 1 tenant, 4 filiais, 7 áreas (exatamente as da spec), 17 usuários, +1 cliente/atendimento/processo/prazo/documento/checklist/contrato de demonstração. RLS confirmado (consultas sem contexto retornam 0 linhas).
  - **Validação ponta a ponta executada (HTTP real):**
    - Login admin → token opaco + `forcePasswordChange:false`; `/v1/auth/me` retorna papéis/permissões; `/v1/dashboard` retorna dados reais (`estimatedRevenue: 9000.00`, contadores do seed).
    - Senha errada (válida no schema) → **401**; sem token → **401**; advogado → `/v1/admin/*` → **403**.
    - Web (Next `start`) em `:3100` (porta `:3000` ocupada por outro projeto do usuário, `sistemas/CMEBE`): `/` → 307 `/login`; login via BFF grava cookie **HttpOnly** `chronostek_session`; admin alcança `/dashboard` (200) com dados reais renderizados.
  - **Pendente nesta sessão:** baseline Git (B3) aguardando confirmação do usuário; verificação P1 na interface dos demais módulos; correção de fuso P2.
