# Auditoria de Cibersegurança — Lexora

> **Escopo:** revisão **defensiva** de código e execução, limitada ao **repositório, ambiente e banco
> locais autorizados** (auditoria 2026-06-24). Sem testes ofensivos contra sistemas externos, sem
> brute force, sem scans agressivos. Não constitui certificação; descreve o que foi inspecionado e testado.
>
> **Resultado geral:** arquitetura com **defesa em profundidade**. **Nenhuma vulnerabilidade crítica ou
> alta** encontrada. 2 achados de severidade média (corrigidos) e alguns itens de baixa/informativos
> (parte para backlog de produção).

---

## 1. O que foi auditado

Autenticação · sessão/cookies · RBAC · RLS · isolamento por filial/responsável (IDOR/BOLA) ·
validação de entrada (Zod) · ORM/SQL · uploads/downloads · XSS/CSRF · CORS/headers · segredos/Git ·
logs/auditoria/privacidade · backup/restore.

## 2. O que NÃO pôde ser auditado (fora do escopo/ambiente)

- Produção real (TLS, WAF, rede, storage de produção) — ainda não provisionada.
- Pentest dinâmico externo, DAST e análise de dependências com CVE em tempo real.
- Comportamento sob carga / DoS (proibido neste escopo).

## 3. Tabela de achados

| ID | Área | Achado | Evidência | Impacto | Probab. | Severidade | Correção | Status |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| M1 | Headers web | Páginas Next não enviavam headers de segurança (clickjacking) | `next.config.ts` sem `headers()`; resposta de `/login` sem `X-Frame-Options` | Médio | Média | 🟡 Média | X-Frame-Options/nosniff/Referrer-Policy/Permissions-Policy/CSP frame-ancestors | ✅ Corrigido (`6285dbb`) |
| M2 | Validação de query | Filtros opcionais vazios (`view=""`, `from=""`) retornavam 422, quebrando SSR (Contratos/Comprovantes/Parcelas) | API: `GET /v1/deadlines?view=` → 422; tela "Algo não saiu como esperado" | Médio (disponibilidade) | Alta | 🟡 Média | `optionalEnum` + datas opcionais toleram vazio; teste de regressão | ✅ Corrigido (`a8a91d1`, `e96f4d6`) |
| L1 | Upload | MIME validado pelo Content-Type declarado, não por magic bytes | `storage.ts` allowlist por `file.mimetype` | Baixo (mitigado) | Baixa | 🔵 Baixa | Mitigado por allowlist + `Content-Disposition: attachment` + `nosniff`; validação por conteúdo/antivírus = produção | 🟦 Backlog (P2) |
| L2 | Sessão (frontend) | Middleware checa **presença** do cookie, não validade | `apps/web/src/middleware.ts` | Baixo (UX) | Baixa | 🔵 Baixa | Boundary real é a API (valida sessão → 401). Middleware é UX | ⚪ Informativo / aceito |
| L3 | CSP web | CSP limitada a `frame-ancestors` (sem `script-src` estrito) | `next.config.ts` | Baixo | Baixa | 🔵 Baixa | CSP estrita exige nonce (risco de quebrar Next) | 🟦 Backlog (P2) |
| I1 | Backup prod | Automação de backup de produção inexistente | runbook | Médio (operacional) | — | ⚪ Informativo | Procedimento testado localmente; automação depende de infra | 🟧 Pendente de infraestrutura |

> Severidades: 🔴 Crítica · 🟠 Alta · 🟡 Média · 🔵 Baixa · ⚪ Informativa.

## 4. Controles fortes confirmados (por inspeção + execução)

### 4.1 Autenticação
- Senhas com **argon2id** (`auth.service.ts`); banco guarda só `password_hash` (sem senha em claro — verificado no schema).
- Token de sessão **opaco** (`tenantId.random48`), armazenado como **SHA-256** (`sessions.token_hash`; sem token em claro).
- Expiração **absoluta (12h)** + **idle (2h)**; revogação no logout e na troca de senha.
- **Sem enumeração de usuário:** e-mail inexistente e senha errada → mesmo `401` e mesma mensagem (testado).
- **Rate limit** no login: `10;w=900` (testado via header `RateLimit`).
- Troca de senha obrigatória no 1º acesso (validada visualmente — Secretaria).

### 4.2 Sessão e cookies
- Cookie **HttpOnly**, **SameSite=lax**; em produção (`COOKIE_SECURE=true`) usa prefixo **`__Host-`** (Secure + Path=/ + sem Domain) — `session.ts`.
- Token nunca exposto ao navegador (BFF injeta `Authorization` server-side).

### 4.3 Autorização (RBAC) — testado
- `requirePermission` no backend; UI apenas reflete (menu filtrado em `app-shell.tsx`).
- Negações comprovadas: Secretaria/Advogado → admin/finance/reports = **403**; Financeiro → `/deadlines`,`/cases` = **403**; Visualizador → `/clients` POST = **403**; sem token = **401**.

### 4.4 Isolamento (RLS / IDOR / BOLA) — testado
- **RLS forçado** em 27 tabelas (`FORCE ROW LEVEL SECURITY`); role da app **NOBYPASSRLS**; `withTenant` define `app.tenant_id` por transação. Sem contexto → 0 linhas (testado).
- **Isolamento por filial:** Secretaria (MATRIZ) não lista nem acessa (`GET /clients/{id}` → **404**) cliente de NORTE (testado — anti-IDOR/BOLA).
- Escopo por responsável (advogado restrito) via filtros em `lib/tenant.ts`.

### 4.5 Validação de entrada
- **Zod** em todo corpo/params/query (`@chronostek/contracts`); enums/uuids/datas tipados; sem **mass assignment** (rotas espalham objetos Zod específicos, não o body cru).
- Paginação limitada (`pageSize` máx 100 — testado: `9999` rejeitado).

### 4.6 ORM/SQL
- 100% **Prisma**; o único `$executeRaw` (contexto RLS) usa **template parametrizado** (sem interpolação de string). Sem `$queryRaw`/`$executeRawUnsafe` (busca confirmou).

### 4.7 Uploads/Downloads
- Allowlist MIME (PDF/Word/JPEG/PNG/WebP), limite de tamanho, **nome randômico** (`randomUUID`, sem input do usuário no caminho), **guarda de path traversal**, `flag:"wx"`.
- Download **autorizado** (escopo tenant+filial+designação) + `Content-Disposition: attachment` (evita render inline/XSS).

### 4.8 XSS/CSRF
- **Sem** `dangerouslySetInnerHTML`/`innerHTML`/`eval` (busca confirmou).
- **CSRF:** o BFF valida `origin == host` em métodos mutadores (403 se divergir) — `app/api/v1/[...path]/route.ts`.

### 4.9 CORS/Headers
- API (helmet): CSP, `X-Content-Type-Options: nosniff`, `X-Frame-Options`, HSTS, `Referrer-Policy`, sem `X-Powered-By` (testado).
- CORS da API restrito a `WEB_URL` (origem única) com credenciais.
- Web: headers de segurança adicionados nesta sprint (M1).

### 4.10 Segredos/Git
- Apenas `.env.example`/`.env.production.example` rastreados (sem `.env` real). Sem segredos hardcoded (busca segura, sem imprimir valores). `.env`/`.postgres`/dumps ignorados.

### 4.11 Logs/Privacidade
- `audit_logs` registra ator/ação/entidade/data/IP/user agent; **sem** colunas de senha/token. Erros não vazam stack trace (handler retorna 500 genérico; detalhe só no log do servidor).
- CPF/identidade **cifrados** em coluna (`tax_id_encrypted`, `identity_encrypted`).

### 4.12 Backup/Restore
- `pg_dump`/`pg_restore` testados localmente (restauração com contagens conferidas); runbook + script. Automação de produção pendente (I1).

## 5. Conclusão da auditoria (escopo local)

Dentro do escopo local autorizado, **não há vulnerabilidade crítica ou alta aberta**. Os 2 achados
médios foram **corrigidos e testados**. Os itens de baixa são mitigados ou backlog de produção
(CSP com nonce, validação de conteúdo/antivírus de upload). O sistema é **seguro para homologação
local**; o endurecimento final de produção (TLS, WAF, automação de backup, segredos reais) permanece
**pendente de infraestrutura**.
