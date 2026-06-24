# Backup logico do banco Lexora (pg_dump, formato custom) com timestamp e retencao.
# Uso (dev local):   pwsh scripts/backup-db.ps1
# Uso (producao):    defina $env:DATABASE_URL e ajuste -PgBin para o pg_dump do servidor.
#
# Nao versione os dumps: o destino padrao (.postgres/backups) esta no .gitignore.
param(
  [int]$KeepLast = 14,
  [string]$OutDir,
  [string]$PgBin
)

$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot

# Diretorio de saida (padrao: .postgres/backups, ignorado pelo Git)
if (-not $OutDir) { $OutDir = Join-Path $root ".postgres\backups" }
if (-not (Test-Path $OutDir)) { New-Item -ItemType Directory -Force -Path $OutDir | Out-Null }

# Localiza pg_dump: parametro -> binarios locais -> PATH
if (-not $PgBin) {
  $local = Join-Path $root ".postgres\pgsql\bin\pg_dump.exe"
  if (Test-Path $local) { $PgBin = $local }
  else { $PgBin = (Get-Command pg_dump -ErrorAction SilentlyContinue).Source }
}
if (-not $PgBin) { throw "pg_dump nao encontrado. Informe -PgBin ou adicione ao PATH." }

$stamp = Get-Date -Format "yyyyMMdd_HHmmss"
$dump = Join-Path $OutDir "chronostek_$stamp.dump"

# Conexao: DATABASE_URL (producao) ou defaults do cluster local de dev
if ($env:DATABASE_URL) {
  & $PgBin $env:DATABASE_URL -Fc -f $dump
} else {
  & $PgBin -U postgres -h 127.0.0.1 -p 55432 -d chronostek -Fc -f $dump
}
if ($LASTEXITCODE -ne 0) { throw "pg_dump falhou (exit $LASTEXITCODE)." }

$size = [math]::Round((Get-Item $dump).Length / 1KB, 1)
Write-Output "Backup criado: $dump ($size KB)"

# Retencao: mantem os $KeepLast mais recentes
$old = Get-ChildItem $OutDir -Filter "chronostek_*.dump" | Sort-Object LastWriteTime -Descending | Select-Object -Skip $KeepLast
foreach ($f in $old) { Remove-Item $f.FullName -Force; Write-Output "Removido (retencao): $($f.Name)" }
