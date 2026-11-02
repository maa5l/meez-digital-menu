#Requires -Version 5.1
<#
.SYNOPSIS
  Apply Meez schema + data to a fresh Supabase Postgres database via psql.

.EXAMPLE
  $env:DATABASE_URL = "postgresql://postgres:YOUR_PASSWORD@db.PROJECT_REF.supabase.co:5432/postgres"
  .\run-psql-restore.ps1
#>
$ErrorActionPreference = "Stop"
$here = Split-Path -Parent $MyInvocation.MyCommand.Path
$psql = "C:\Program Files\PostgreSQL\17\bin\psql.exe"
if (-not (Test-Path $psql)) {
  throw "psql not found at $psql — install PostgreSQL client tools or update the path."
}
if (-not $env:DATABASE_URL) {
  throw "Set DATABASE_URL first (Dashboard → Project Settings → Database → URI)."
}

# Prefer COPY files with psql. For Dashboard SQL Editor use *_INSERTS.sql instead
# (and skip 03 audit_logs if the editor rejects the large file).
$files = @(
  "01_APPLY_ALL_MIGRATIONS.sql",
  "02_AUTH_DATA.sql",
  "03_PUBLIC_DATA.sql",
  "04_STORAGE_BUCKETS.sql"
)

foreach ($name in $files) {
  $path = Join-Path $here $name
  if (-not (Test-Path $path)) { throw "Missing $path" }
  Write-Host ">>> Applying $name ..." -ForegroundColor Cyan
  & $psql $env:DATABASE_URL -v ON_ERROR_STOP=1 -f $path
  if ($LASTEXITCODE -ne 0) { throw "Failed on $name (exit $LASTEXITCODE)" }
}

Write-Host "Restore finished." -ForegroundColor Green
