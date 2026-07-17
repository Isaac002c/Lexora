#!/bin/sh
# Cópia OFFSITE dos backups (continuidade fora da VPS). Sem credenciais aqui:
# o destino vem de rclone já configurado no host (`rclone config`) e da variável
# OFFSITE_REMOTE (ex.: "b2:lexora-backups" ou "s3:bucket/lexora").
#
# Ativação (na VPS):
#   1. instalar rclone e configurar um remote (credenciais ficam em ~/.config/rclone)
#   2. testar:  OFFSITE_REMOTE=meuremote:lexora-backups sh offsite-sync.sh
#   3. agendar no cron APÓS o backup diário, ex.: 30 3 * * *
set -eu

BACKUP_DIR="${BACKUP_DIR:-/opt/lexora/backups}"
REMOTE="${OFFSITE_REMOTE:?Defina OFFSITE_REMOTE (ex.: b2:lexora-backups). Nenhuma credencial neste script.}"
MAX_AGE="${OFFSITE_MAX_AGE:-15d}"

command -v rclone >/dev/null 2>&1 || { echo "ERRO: rclone não instalado." >&2; exit 1; }
rclone copy "$BACKUP_DIR" "$REMOTE" --include "lexora-*.dump" --max-age "$MAX_AGE"
echo "$(date -u +%Y-%m-%dT%H:%M:%SZ) OFFSITE OK -> $REMOTE ($(ls "$BACKUP_DIR"/lexora-*.dump 2>/dev/null | wc -l) dumps locais)"
