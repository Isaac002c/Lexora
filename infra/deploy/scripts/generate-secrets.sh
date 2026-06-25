#!/bin/sh
# Gera infra/deploy/.env.production com segredos fortes e aleatorios.
#
# SEGURANCA:
#   - NUNCA imprime os valores gerados.
#   - O arquivo e criado com permissao 600 e e ignorado pelo Git (.gitignore).
#   - Recusa sobrescrever um .env.production existente (evita perder segredos em uso).
#   - Senhas em hexadecimal => URL-safe (dispensam URL-encoding nas connection strings).
#
# Uso (na VPS):
#   cd infra/deploy && sh scripts/generate-secrets.sh
# Depois: editar WEB_URL / INTERNAL_API_URL / API_DOMAIN conforme o dominio (ETAPA 7).
set -eu

OUT="$(CDPATH= cd "$(dirname "$0")/.." && pwd)/.env.production"

if [ -f "$OUT" ]; then
  echo "ERRO: $OUT ja existe. Renomeie/remova manualmente antes de regenerar." >&2
  exit 1
fi
command -v openssl >/dev/null 2>&1 || { echo "ERRO: openssl nao encontrado." >&2; exit 1; }

OWNER_PW="$(openssl rand -hex 24)"
APP_PW="$(openssl rand -hex 24)"
SESSION_SECRET="$(openssl rand -hex 32)"
FIELD_KEY="$(openssl rand -hex 32)"

umask 177
cat > "$OUT" <<EOF
NODE_ENV=production
API_PORT=3333
# >>> EDITAR conforme o dominio definido na ETAPA 7 <<<
WEB_URL=https://app.example.com
INTERNAL_API_URL=https://api.example.com
API_DOMAIN=api.example.com
# <<< fim dos campos dependentes de dominio
DATABASE_URL=postgresql://chronostek_app:${APP_PW}@postgres:5432/chronostek?schema=public
MIGRATION_DATABASE_URL=postgresql://chronostek_owner:${OWNER_PW}@postgres:5432/chronostek?schema=public
POSTGRES_DB=chronostek
POSTGRES_USER=chronostek_owner
POSTGRES_PASSWORD=${OWNER_PW}
POSTGRES_APP_PASSWORD=${APP_PW}
SESSION_SECRET=${SESSION_SECRET}
FIELD_ENCRYPTION_KEY=${FIELD_KEY}
STORAGE_DRIVER=local
STORAGE_LOCAL_PATH=/data/uploads
MAX_UPLOAD_SIZE_MB=20
LOG_LEVEL=info
COOKIE_SECURE=true
EOF

echo "OK: $OUT criado (permissao 600) com segredos aleatorios."
echo "Pendente: editar WEB_URL, INTERNAL_API_URL e API_DOMAIN apos definir o dominio."
echo "Guarde FIELD_ENCRYPTION_KEY em cofre, SEPARADA do backup do banco."
echo "NUNCA versione este arquivo."
