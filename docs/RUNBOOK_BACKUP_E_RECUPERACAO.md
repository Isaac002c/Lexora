# Runbook — Backup e Recuperação (Lexora / Chronostek)

> Procedimento operacional para **backup** e **restauração** do banco PostgreSQL do Lexora.
> As seções marcadas **✅ testado** foram executadas e verificadas nesta auditoria (2026-06-23)
> contra um cluster PostgreSQL 17.5 local. As seções **🟧 pendente de infraestrutura/produção**
> dependem do ambiente real de produção e de credenciais, ainda não disponíveis.

---

## 1. Escopo e princípios

- O banco é a **fonte de verdade** de toda a operação (clientes, processos, prazos, documentos, financeiro, auditoria).
- O backup deve ser **regular, verificado e protegido** (os dumps contêm dados sensíveis: ver seção 6).
- Estratégia recomendada: **dump lógico diário** (`pg_dump`) + retenção + verificação periódica de restauração.
- Para produção com volume maior, considerar também **PITR** (WAL archiving) — fora do escopo do MVP.

## 2. Pré-requisitos

| Item | Local (dev) | Produção |
| --- | --- | --- |
| Binários `pg_dump`/`pg_restore`/`psql` | `.postgres/pgsql/bin` (PostgreSQL 17.5) | Mesma major version do servidor |
| Conexão | `127.0.0.1:55432`, role `postgres` | `DATABASE_URL` / variáveis `PG*` com role de backup |
| Destino do dump | `.postgres/backups/` (ignorado pelo Git) | Volume/Storage **fora** do servidor de aplicação |

> O arquivo de dump **nunca** deve ser versionado no Git nem enviado a serviços públicos.

## 3. Backup — procedimento ✅ testado

Formato **custom** (`-Fc`), que permite restauração seletiva e é comprimido.

```bash
# Local (dev) — comprovado nesta auditoria
.postgres/pgsql/bin/pg_dump.exe -U postgres -h 127.0.0.1 -p 55432 \
  -d chronostek -Fc -f .postgres/backups/chronostek_AAAAMMDD_HHMMSS.dump
```

```bash
# Produção (exemplo) — usar a role de backup e destino seguro
pg_dump "$DATABASE_URL" -Fc -f /var/backups/lexora/chronostek_$(date +%Y%m%d_%H%M%S).dump
```

**Evidência (2026-06-23):** dump custom gerado com sucesso (≈137 KB para a base de demonstração).
Há também o script auxiliar [`scripts/backup-db.ps1`](../scripts/backup-db.ps1) (Windows/local) que
gera o dump com timestamp e aplica retenção.

## 4. Restauração — procedimento ✅ testado

```bash
# 1. Criar um banco alvo (vazio)
createdb -U postgres -h 127.0.0.1 -p 55432 chronostek_restore

# 2. Restaurar o dump custom
pg_restore -U postgres -h 127.0.0.1 -p 55432 -d chronostek_restore caminho/do.dump

# 3. (Produção) Após validar, apontar a aplicação para o banco restaurado
```

**Evidência (2026-06-23):** restauração para um banco de teste retornou **exit 0** e as contagens
conferiram com a origem (`users=17`, `audit_logs=31`, `fee_contracts=2`). Banco de teste removido após a verificação.

> Para **restauração destrutiva no mesmo banco**, use `pg_restore --clean --if-exists` com extrema
> cautela e **somente** após um backup novo do estado atual.

## 5. Verificação pós-restauração (obrigatória)

Sempre validar que a restauração é íntegra antes de considerá-la concluída:

```sql
SELECT count(*) FROM users;          -- deve bater com a origem
SELECT count(*) FROM legal_cases;
SELECT count(*) FROM fee_contracts;
SELECT count(*) FROM audit_logs;
SELECT max(created_at) FROM audit_logs;  -- recência dos dados
```

Critério: contagens e datas coerentes com o momento do backup; aplicação sobe e login funciona.

## 6. Segurança dos backups

- Dumps contêm **dados pessoais e sensíveis** (clientes, processos). Tratar como confidencial.
- Em produção: **criptografar** o dump em repouso e restringir acesso ao storage.
- CPF/identidade já estão **cifrados em coluna** no banco (`tax_id_encrypted`, `identity_encrypted`);
  ainda assim o dump completo deve ser protegido.
- Nunca commitar dumps; `.postgres/` (inclui `backups/`) está no `.gitignore`.
- A `FIELD_ENCRYPTION_KEY` deve ser guardada **separadamente** do dump (sem a chave, os campos cifrados não são legíveis).

## 7. Agendamento e retenção — 🟧 pendente de infraestrutura/produção

Definir no ambiente de produção (não configurável localmente nesta etapa):

| Item | Recomendação | Status |
| --- | --- | --- |
| Frequência | Diário (madrugada, America/Sao_Paulo) + antes de cada deploy/migration | 🟧 pendente |
| Retenção | 7 diários + 4 semanais + 3 mensais (ajustar ao volume) | 🟧 pendente |
| Local | Storage externo ao servidor de aplicação, com versionamento/imutabilidade | 🟧 pendente |
| Agendador | `cron` (Linux) ou Agendador de Tarefas (Windows) chamando o script de backup | 🟧 pendente |
| Teste de restauração | Mensal, em ambiente isolado | 🟧 pendente |
| Monitoramento/alerta de falha de backup | Integrar ao monitoramento de produção | 🟧 pendente |

> **Importante:** o procedimento de backup/restauração está **comprovado tecnicamente** (seções 3–5),
> porém o **backup automatizado de produção NÃO está configurado** — depende de definição de
> infraestrutura, storage seguro e credenciais. Não declarar "backup de produção ativo" sem essa configuração.

## 8. Antes de qualquer migration relevante (plano de reversão)

1. Rodar backup atual (seção 3) e **verificar** o arquivo.
2. Aplicar a migration (`pnpm db:deploy`).
3. Validar a aplicação (login + fluxos principais).
4. Em caso de falha: restaurar o dump (seção 4) e investigar antes de reaplicar.
