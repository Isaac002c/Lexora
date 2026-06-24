# Plano de Correção de Segurança — Lexora

> Achados da auditoria (ver `docs/AUDITORIA_CIBERSEGURANCA_LEXORA.md`) e seu tratamento.
> Atualizado em 2026-06-24.

---

## 1. Correções aplicadas (P0/P1)

| Prioridade | Achado | Correção | Arquivos | Teste | Situação |
| --- | --- | --- | --- | --- | --- |
| P1 | Headers de segurança ausentes no web (clickjacking) | X-Frame-Options: DENY, nosniff, Referrer-Policy, Permissions-Policy, CSP frame-ancestors; HSTS em produção | `apps/web/next.config.ts` | Verificado por HTTP (headers presentes em `/login`) | ✅ Corrigido (`6285dbb`) |
| P1 | Filtros de query vazios → 422 (quebra SSR Financeiro) | `optionalEnum` + datas opcionais toleram string vazia; valores inválidos seguem 422 | `packages/contracts/src/domain.ts`, `deadlines.routes.ts`, `finance.routes.ts` | `query-hardening.test.ts` (10 testes) + HTTP (`view=` → 200, `view=bogus` → 422) | ✅ Corrigido (`e96f4d6`) |
| P1 | Página de contratos quebrava no SSR (`view=""`) | Omitir parâmetros vazios na query do componente | `finance-contracts-table.tsx` | Visual (7 parcelas renderizam) | ✅ Corrigido (Sprint 3, `a8a91d1`) |

> **Nenhum achado P0 (crítico) foi necessário** — não havia acesso indevido, IDOR/BOLA, segredo exposto,
> SQL inseguro, sessão insegura, endpoint crítico aberto ou bypass de troca de senha. Todos esses
> vetores foram **testados** e estão protegidos (ver auditoria, seção 4).

## 2. Itens de baixa prioridade / backlog (P2)

| Prioridade | Achado | Ação recomendada | Situação |
| --- | --- | --- | --- |
| P2 | Upload valida MIME declarado, não conteúdo | Validação por magic bytes + antivírus (ex.: ClamAV) na ingestão de produção | 🟦 Backlog (mitigado por allowlist + `attachment` + `nosniff`) |
| P2 | CSP do web só `frame-ancestors` | CSP estrita com nonce para `script-src`/`style-src` | 🟦 Backlog (exige integração de nonce no Next) |
| P2 | Sem lockout por conta | Bloqueio temporário por conta após N falhas (além do rate limit por IP) | 🟦 Backlog |
| P2 | Middleware checa presença do cookie | Opcional: validar sessão no edge para UX (boundary real já é a API) | ⚪ Aceito (não é falha de segurança) |

## 3. Pendências de infraestrutura/produção (não são bugs de código)

| Item | Situação |
| --- | --- |
| Segredos reais (`SESSION_SECRET`, `FIELD_ENCRYPTION_KEY`) | 🟧 gerar na implantação |
| `COOKIE_SECURE=true` + TLS (ativa `__Host-` + HSTS) | 🟧 produção |
| Backup automatizado + retenção + storage protegido | 🟧 produção (procedimento já testado) |
| WAF / monitoramento / alertas | 🟧 produção |

## 4. Regressão e qualidade após correções

| Verificação | Resultado |
| --- | --- |
| `pnpm typecheck` | ✅ 6/6 |
| `pnpm lint` | ✅ 6/6 |
| `pnpm test` | ✅ **34/34** (inclui 10 de validação de query + isolamento RLS) |
| `pnpm build` | ✅ web + API |

## 5. Conclusão

Todos os achados de severidade **média** foram corrigidos e cobertos por teste/verificação. Não há
**vulnerabilidade crítica ou alta aberta** no escopo local auditado. Os itens remanescentes são de
baixa prioridade (backlog) ou dependências de infraestrutura de produção.
