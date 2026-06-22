#!/bin/sh
set -eu

if [ "$#" -ne 1 ]; then
  echo "Uso: restore-postgres.sh /caminho/backup.dump" >&2
  exit 2
fi

BACKUP_FILE="$1"
test -f "$BACKUP_FILE"
echo "A restauração sobrescreverá os objetos do banco de destino. Confirme digitando RESTAURAR:"
read -r confirmation
test "$confirmation" = "RESTAURAR"

docker compose --env-file .env.production -f compose.production.yaml exec -T postgres \
  pg_restore --clean --if-exists --no-owner --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" \
  < "$BACKUP_FILE"
