#Requires -Version 5.1
<#
.SYNOPSIS
  Apply Meez schema + data via psql (required for large venues JSON).

.EXAMPLE
  # From Supabase Dashboard → Project Settings → Database → Connection string (URI)
  # Use "Direct connection" or Session pooler. URL-encode special chars in password (& → %26).

  $env:DATABASE_URL = "postgresql://postgres:YOUR_PASSWORD@db.feorprugthydhyytvebe.supabase.co:5432/postgres"
  .\run-psql-restore.ps1

  # Or only the large venues file if schema/auth/core already applied:
  .\run-psql-restore.ps1 -OnlyVenues
#>
param(
  [switch]$OnlyVenues,
  [switch]$SkipSchema,
  [switch]$SkipAuth
)

$ErrorActionPreference = "Stop"
$here = Split-Path -Parent $MyInvocation.MyCommand.Path
$psql = "C:\Program Files\PostgreSQL\17\bin\psql.exe"
if (-not (Test-Path $psql)) {
  throw "psql not found at $psql — install PostgreSQL client tools or update the path."
}
if (-not $env:DATABASE_URL) {
  throw @"
Set DATABASE_URL first.

Dashboard → Project Settings → Database → Connect → URI
Example:
  `$env:DATABASE_URL = "postgresql://postgres.feorprugthydhyytvebe:PASSWORD@aws-0-REGION.pooler.supabase.com:5432/postgres"
"@
}

function Invoke-SqlFile([string]$name) {
  $path = Join-Path $here $name
  if (-not (Test-Path $path)) { throw "Missing $path" }
  Write-Host ">>> Applying $name ..." -ForegroundColor Cyan
  & $psql $env:DATABASE_URL -v ON_ERROR_STOP=1 -f $path
  if ($LASTEXITCODE -ne 0) { throw "Failed on $name (exit $LASTEXITCODE)" }
}

if ($OnlyVenues) {
  Get-ChildItem (Join-Path $here "03b_venues_*.sql") | Sort-Object Name | ForEach-Object {
    Invoke-SqlFile $_.Name
  }
  Write-Host "Venues restore finished." -ForegroundColor Green
  exit 0
}

$files = @()
if (-not $SkipSchema) { $files += "01_APPLY_ALL_MIGRATIONS.sql" }
if (-not $SkipAuth) {
  if (Test-Path (Join-Path $here "02_AUTH_DATA.sql")) {
    $files += "02_AUTH_DATA.sql"
  } else {
    $files += "02_AUTH_DATA_INSERTS.sql"
  }
}
if (Test-Path (Join-Path $here "03_PUBLIC_DATA.sql")) {
  $files += "03_PUBLIC_DATA.sql"
} else {
  $files += "03a_PUBLIC_DATA_NO_VENUES.sql"
  $files += (Get-ChildItem (Join-Path $here "03b_venues_*.sql") | Sort-Object Name | ForEach-Object { $_.Name })
}
$files += "04_STORAGE_BUCKETS.sql"

foreach ($name in $files) { Invoke-SqlFile $name }

Write-Host "Restore finished." -ForegroundColor Green
