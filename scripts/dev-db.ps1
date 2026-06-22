param(
  [Parameter(Position = 0)]
  [ValidateSet("start", "stop", "status")]
  [string]$Action = "status"
)

$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
$data = Join-Path $root ".postgres\data"
$log = Join-Path $root ".postgres\postgres.log"
$pgHome = Get-ChildItem "C:\Program Files\PostgreSQL" -Directory -ErrorAction SilentlyContinue |
  Sort-Object { [int]$_.Name } -Descending |
  Select-Object -First 1

if (-not $pgHome) {
  throw "PostgreSQL não foi encontrado em C:\Program Files\PostgreSQL."
}

$pgCtl = Join-Path $pgHome.FullName "bin\pg_ctl.exe"
$pgReady = Join-Path $pgHome.FullName "bin\pg_isready.exe"

if (-not (Test-Path $data)) {
  throw "Cluster local não inicializado em $data. Use Docker Compose ou refaça o setup local."
}

switch ($Action) {
  "start" {
    & $pgCtl status -D $data 2>$null
    if ($LASTEXITCODE -ne 0) {
      & $pgCtl start -D $data -l $log -o "-p 55432 -h 127.0.0.1" -w
    }
    & $pgReady -h 127.0.0.1 -p 55432
  }
  "stop" {
    & $pgCtl status -D $data 2>$null
    if ($LASTEXITCODE -eq 0) {
      & $pgCtl stop -D $data -m fast -w
    } else {
      Write-Output "PostgreSQL local já está parado."
    }
  }
  "status" {
    & $pgCtl status -D $data
    & $pgReady -h 127.0.0.1 -p 55432
  }
}
