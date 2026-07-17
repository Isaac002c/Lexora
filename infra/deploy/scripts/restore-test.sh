#!/bin/sh
# Teste de restauração (prova mensal): restaura um dump em banco TEMPORÁRIO,
# confere contagens e remove o banco. NUNCA toca o banco real.
#
# Uso (na VPS): sh restore-test.sh /opt/lexora/backups/lexora-YYYYMMDD...dump
# Sem argumento, usa o dump mais recente de /opt/lexora/backups.
set -eu

CONTAINER="${PG_CONTAINER:-lexora-postgres-1}"
PG_USER="${PG_USER:-chronostek_owner}"
BACKUP_DIR="${BACKUP_DIR:-/opt/lexora/backups}"
DUMP="${1:-$(ls -t "$BACKUP_DIR"/lexora-*.dump 2>/dev/null | head -1)}"
[ -n "$DUMP" ] && [ -f "$DUMP" ] || { echo "ERRO: dump não encontrado. Uso: restore-test.sh <arquivo.dump>" >&2; exit 2; }
DB="restore_test_$$"

echo "Dump: $DUMP ($(stat -c%s "$DUMP" 2>/dev/null || wc -c < "$DUMP") bytes)"
docker exec "$CONTAINER" psql -U "$PG_USER" -d postgres -tAc "CREATE DATABASE $DB" >/dev/null

status=0
if ! docker exec -i "$CONTAINER" pg_restore -U "$PG_USER" -d "$DB" --no-owner < "$DUMP" 2>/tmp/restore-test.err; then
  echo "AVISOS/ERROS do pg_restore:"; tail -5 /tmp/restore-test.err
fi
echo "--- contagens no banco restaurado ---"
for t in tenants branches users clients legal_cases deadlines audit_logs; do
  c="$(docker exec "$CONTAINER" psql -U "$PG_USER" -d "$DB" -tAc "select count(*) from $t" 2>/dev/null || echo ERRO)"
  echo "$t=$c"
  [ "$c" = "ERRO" ] && status=1
done
docker exec "$CONTAINER" psql -U "$PG_USER" -d postgres -tAc "DROP DATABASE $DB" >/dev/null
if [ "$status" -eq 0 ]; then echo "RESTORE-TEST OK (banco temporário removido; produção intacta)"; else echo "RESTORE-TEST FALHOU — trate este dump como inválido" >&2; fi
exit "$status"
