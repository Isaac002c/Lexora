# Matriz de Módulos e Validação — Lexora

> Estado real de cada módulo (auditoria 2026-06-24). Legenda:
> ✅ Funcional e validado · 🟨 Parcial · 🟧 Existe visualmente, não validado · 🔴 Ausente/quebrado ·
> ⚪ Fora do MVP · 🟦 Depende de decisão externa/infraestrutura.
>
> "Validado" indica evidência: execução de API, teste automatizado, banco ou percurso no navegador.

---

## 1. Acesso e autenticação

| Item | Estado | Evidência |
| --- | --- | --- |
| Login | ✅ | HTTP 200 + cookie HttpOnly (API + web) |
| Logout | ✅ | `/api/auth/logout` revoga sessão (`auth.service.logout`) |
| Troca obrigatória de senha (1º acesso) | ✅ | Validado visualmente (Secretaria → `/alterar-senha` → dashboard) |
| Expiração de sessão (absoluta 12h / idle 2h) | ✅ | `resolveSession` (código) |
| Revogação de sessão (logout / troca de senha) | ✅ | `auth.service` revoga sessões |
| Recuperação de senha (self-service) | ⚪ | Não no MVP; admin redefine via Administração → Usuários |
| Bloqueio após tentativas inválidas | 🟨 | Rate limit no login (10/15min); sem lockout por conta (backlog) |

## 2. Usuários e permissões

| Item | Estado | Evidência |
| --- | --- | --- |
| 6 perfis (Admin/Gestor/Secretaria/Advogado/Financeiro/Visualizador) | ✅ | `packages/auth`; seed; menu por perfil |
| Criação/edição de usuário | ✅ | `admin.routes.ts` (`user.manage`); overview 17 usuários |
| Vínculo a filial e papel | ✅ | seed + `UserBranchAccess` |
| Restrição de rota (frontend) | ✅ | menu filtrado (`app-shell.tsx`); Secretaria sem Financeiro/Relatórios/Administração (visual) |
| Restrição de API (backend) | ✅ | 403 para perfis sem permissão (testado) |
| Restrição de dados (filial/responsável) | ✅ | RLS + `allowedBranches` + filtros (IDOR/BOLA testados → 404) |

## 3. Estrutura jurídica (filiais e áreas)

| Item | Estado | Evidência |
| --- | --- | --- |
| 4 filiais | ✅ | overview retorna 4 |
| 7 áreas (spec) | ✅ | overview retorna 7 |
| Vínculo usuário↔filial / filtros | ✅ | filtros de filial/área nas listagens e relatórios |
| Visualização por responsável | ✅ | filtros + escopo do advogado |

## 4. Clientes e atendimentos

| Item | Estado | Evidência |
| --- | --- | --- |
| Cadastro/edição de cliente | ✅ | Secretaria cria (201) + read-back (visual + API) |
| Busca/filtros/estados vazios | ✅ | filtro status INACTIVE → estado vazio (visual) |
| Atendimento / triagem / encaminhamento | ✅ | `attendances.routes.ts` + status; seed |
| Validações de campo | ✅ | Zod (nome ≥3, e-mail, etc.) |

## 5. Processos

| Item | Estado | Evidência |
| --- | --- | --- |
| Cadastro/edição + vínculo a cliente | ✅ | `cases.routes.ts`; seed cria processo com partes |
| Responsável/área/filial/status/andamento | ✅ | schema `LegalCase`; designações |
| Filtros / histórico | ✅ | filtros na rota; audit por ação |

## 6. Prazos e agenda

| Item | Estado | Evidência |
| --- | --- | --- |
| Criação/edição + filtros | ✅ | `deadlines.routes.ts` (filtros endurecidos nesta sprint) |
| Cores: verde >7 / amarelo 6-7 / vermelho ≤5 / **Vencido** | ✅ | `deadline.ts` + 7 testes; UI "Crítico"/"Vencido" (visual) |
| Agenda (mês/semana/lista) | ✅ | `deadline-calendar.tsx`; `/calendario` |
| Audiência | 🟨 | `DeadlineType.AUDIENCIA` + `LegalCase.hearingAt` (sem entidade própria — decisão de produto) |
| Timezone America/Sao_Paulo | ✅ | `format.ts` + `TZ` no runtime |

## 7. Documentos e checklists

| Item | Estado | Evidência |
| --- | --- | --- |
| Upload (allowlist/tamanho/path-traversal) | ✅ | `storage.ts`; download como `attachment` |
| Download autorizado | ✅ | escopo tenant+filial+designação |
| Vínculo cliente/processo + autor + data | ✅ | `documents.routes.ts`; seed |
| Checklists / pendências | ✅ | `checklists.routes.ts`; seed |
| Validação de conteúdo (magic bytes)/antivírus | 🟦 | Backlog de produção (L1) |

## 8. Financeiro

| Item | Estado | Evidência |
| --- | --- | --- |
| Contratos (honorários/custas) + vínculo cliente/processo | ✅ | criação 201 + parcelas geradas (API) |
| Parcelas / pagamento / baixa | ✅ | `installments/:id/pay` → PAGO (API) |
| Cobrança / follow-up / negociação | ✅ | `collection-notes` → timeline com data/ator/obs |
| Inadimplência (+15 dias, laranja) | ✅ | `view=delinquent`; cor laranja (visual) |
| Cores (verde em dia/amarelo a vencer/vermelho vencido/laranja +15d) | ✅ | classes CSS (visual) |
| Permissões financeiro/admin | ✅ | Secretaria 403; Financeiro 200 |

## 9. Dashboard e relatórios

| Item | Estado | Evidência |
| --- | --- | --- |
| Indicadores (dados reais, sem mock) | ✅ | `/dashboard` com contadores do seed (visual) |
| Relatórios por filial/área/advogado/período | ✅ | `/reports/summary` agregações reais |
| CSV | ✅ | `export.csv` 200 `text/csv` |
| Restrição por perfil + escopo de filial (gestor) | ✅ | Secretaria/Advogado 403; Gestor vê só MATRIZ |
| Estados vazios | ✅ | `DataTable` empty message |

## 10. Auditoria e backup

| Item | Estado | Evidência |
| --- | --- | --- |
| Logs (ator/horário/entidade/ação/IP) | ✅ | 33 eventos; `/admin/audit` restrito (audit.read) |
| Sem segredos em log | ✅ | colunas de `audit_logs` sem senha/token |
| Backup/restore (procedimento) | ✅ | `pg_dump`/`pg_restore` testados; runbook |
| Script (Windows) | ✅ | `scripts/backup-db.ps1` (testado) |
| Script (Linux) / automação produção / retenção | 🟧/🟦 | runbook documenta; automação pendente de infraestrutura |

## Itens que exigem atenção antes da implantação

| Item | Tipo | Ação |
| --- | --- | --- |
| Audiência como entidade própria | 🟨 produto | Confirmar expectativa do escritório |
| Validação de conteúdo/antivírus de upload | 🟦 infra | Backlog de produção |
| CSP estrita (nonce) no web | 🟦 técnico | Backlog (P2) |
| Backup automatizado de produção | 🟧 infra | Configurar no servidor real |
| Lockout por conta (além do rate limit) | 🟨 técnico | Backlog (P2) |
