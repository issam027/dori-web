[CmdletBinding()]
param(
    [string]$Server = 'ubuntu@88.96.60.173',
    [string]$IdentityFile = "$PSScriptRoot\..\autres\dorify_key",
    [string]$RemoteDirectory = '/home/ubuntu/dorify',
    [string]$Version = (Get-Date -Format 'yyyyMMdd-HHmmss'),
    [string]$BuildEnvFile = "$PSScriptRoot\.env.oracle.local",
    [switch]$Migrate,
    [switch]$Seed,
    [switch]$ResetDatabase,
    [switch]$DeployProxy,
    [switch]$BuildOnly
)
$ErrorActionPreference = 'Stop'
# Each repository contains its own copy: no dependency on sibling repositories.
$component = 'web'
function Invoke-Native([string]$Executable, [string[]]$Arguments) {
    & $Executable @Arguments
    if ($LASTEXITCODE -ne 0) { throw "$Executable failed with exit code $LASTEXITCODE" }
}
if ($Server -notmatch '^[a-zA-Z0-9_.@-]+$' -or $RemoteDirectory -notmatch '^/[a-zA-Z0-9_./-]+$' -or $RemoteDirectory.Contains('..')) { throw 'Invalid remote destination' }
if ($Version -notmatch '^[a-zA-Z0-9_][a-zA-Z0-9_.-]{0,100}$') { throw 'Invalid image version' }
if ($component -ne 'api' -and ($Migrate -or $Seed -or $ResetDatabase -or $DeployProxy)) { throw 'Database and proxy switches are API-only' }
if ($ResetDatabase -and -not $BuildOnly) {
    if ((Read-Host 'This deletes dorify and dorify_agent schemas. Type RESET dorify to confirm') -cne 'RESET dorify') { throw 'Reset cancelled' }
}
$service = @{api='engine';web='app';site='site'}[$component]
$variable = @{api='API_IMAGE';web='WEB_IMAGE';site='SITE_IMAGE'}[$component]
$compose = "compose.$component.oracle.yaml"
$image = "dorify/${service}:oracle-$Version"
$maintenance = "dorify/dbtools:oracle-$Version"
$dbCommand = if ($ResetDatabase) { 'db:reset' } elseif ($Seed) { 'db:init:seed' } elseif ($Migrate) { 'db:init' } else { '' }
$temporary = Join-Path ([IO.Path]::GetTempPath()) ('dorify-' + [guid]::NewGuid().ToString('N'))
New-Item -ItemType Directory -Path $temporary | Out-Null
try {
    $buildArgs = @('build','--platform','linux/amd64','--target','runtime','-t',$image)
    if ($component -eq 'web') {
        # Demo mode is explicit; production mode requires real legal information.
        $buildArgs += @('--build-arg','VITE_APP_ENV=development','--build-arg','VITE_DORIFY_DEPLOYMENT_MODE=cloud','--build-arg','VITE_PUBLIC_TRACKING_URL=https://app.dorify.fr')
    }
    if (Test-Path -LiteralPath $BuildEnvFile -PathType Leaf) {
        $allowedBuildKeys = @('VITE_APP_ENV','VITE_DORIFY_DEPLOYMENT_MODE','VITE_PUBLIC_TRACKING_URL','VITE_API_BASE_URL','VITE_KIOSK_IDLE_MS','VITE_SESSION_IDLE_MINUTES','VITE_LEGAL_ENTITY_NAME','VITE_LEGAL_ADDRESS','VITE_LEGAL_EMAIL','VITE_LEGAL_REGISTRATION')
        foreach ($line in [IO.File]::ReadAllLines((Resolve-Path $BuildEnvFile))) {
            if ($line -match '^([A-Z_]+)=(.*)$' -and $allowedBuildKeys -contains $matches[1]) {
                $name = $matches[1]; $value = $matches[2].Trim()
                if ($value.Length -ge 2 -and (($value.StartsWith('"') -and $value.EndsWith('"')) -or ($value.StartsWith("'") -and $value.EndsWith("'")))) { $value = $value.Substring(1,$value.Length-2) }
                $buildArgs += @('--build-arg',($name + '=' + $value))
            }
        }
    } elseif ($PSBoundParameters.ContainsKey('BuildEnvFile')) { throw 'Web build environment file not found' }
    Invoke-Native docker ($buildArgs + @($PSScriptRoot))
    $images = @($image)
    if ($dbCommand) {
        Invoke-Native docker @('build','--platform','linux/amd64','--target','dbtools','-t',$maintenance,$PSScriptRoot)
        $images += $maintenance
    }
    if ($BuildOnly) { Write-Host "Built $($images -join ', ')"; return }
    if (-not (Test-Path -LiteralPath $IdentityFile)) { throw 'SSH identity file not found' }
    $sshArgs = @('-i',$IdentityFile,'-o','BatchMode=yes','-o','ConnectTimeout=15')
    # Check required remote configuration before transferring or changing services.
    Invoke-Native ssh ($sshArgs + @($Server,"test -f '$RemoteDirectory/.env' && docker compose version >/dev/null"))
    $archive = Join-Path $temporary 'images.tar'
    Invoke-Native docker (@('save','-o',$archive) + $images)
    $release = "$RemoteDirectory/releases/$component-$Version"
    Invoke-Native ssh ($sshArgs + @($Server,"mkdir -p '$RemoteDirectory/releases' && mkdir '$release'"))
    Invoke-Native scp (@('-i',$IdentityFile,'-o','BatchMode=yes',$archive,(Join-Path $PSScriptRoot $compose),"${Server}:$release/"))
    if ($DeployProxy) {
        Invoke-Native scp @('-i',$IdentityFile,'-o','BatchMode=yes',(Join-Path $PSScriptRoot 'Caddyfile'),(Join-Path $PSScriptRoot 'compose.proxy.oracle.yaml'),"${Server}:$release/")
    }
    $shell = @'
#!/bin/sh
set -eu
umask 077
cd '__ROOT__'
release='__RELEASE__'
# Prevent overlapping deliveries, including database maintenance.
exec 9>.oracle-deploy.lock
flock -n 9 || { echo 'Another delivery is running'; exit 1; }
docker load -i "$release/images.tar"
cp .env "$release/environment.before"
if [ -f '__COMPOSE__' ]; then cp '__COMPOSE__' "$release/compose.before.yaml"; fi
cp "$release/__COMPOSE__" '__COMPOSE__'
export __VARIABLE__='__IMAGE__'
export AUTO_RUN_MIGRATIONS=false
dc() { docker compose --env-file .env -f '__COMPOSE__' "$@"; }
dc config --quiet
__DATABASE__
dc up -d --wait --wait-timeout 180
# Persist only this component's image reference after a healthy delivery.
grep -v '^__VARIABLE__=' .env > "$release/environment.next" || true
printf '\n__VARIABLE__=__IMAGE__\n' >> "$release/environment.next"
mv "$release/environment.next" .env
chmod 600 .env
__PROXY__
dc ps
echo "Delivery complete. Previous configuration: $release"
'@
    $database = @'
dc up -d --wait postgres redis
mkdir -p backups
backup="backups/dori-__VERSION__.dump"
docker exec cloud-dorify-postgres-1 pg_dump -U dori -d dori -Fc > "$backup"
test -s "$backup"
docker exec -i cloud-dorify-postgres-1 pg_restore --list < "$backup" >/dev/null
echo "Database backup: $backup"
dc stop engine
# Reuse engine environment without exposing secrets in command arguments.
dc run --rm --no-deps --entrypoint npm -e AUTO_RUN_MIGRATIONS=false -e DB_SKIP_CREATE=true engine --version >/dev/null
cat > "$release/maintenance.yaml" <<'YAML'
services:
  engine:
    image: __MAINTENANCE__
YAML
docker compose --env-file .env -f '__COMPOSE__' -f "$release/maintenance.yaml" run --rm --no-deps --entrypoint npm -e AUTO_RUN_MIGRATIONS=false -e DB_SKIP_CREATE=true engine run __DBCOMMAND__
'@
    $proxy = @'
docker run --rm -v "$release/Caddyfile:/etc/caddy/Caddyfile:ro" caddy:2-alpine caddy validate --config /etc/caddy/Caddyfile --adapter caddyfile
cp Caddyfile "$release/Caddyfile.before"
cp compose.proxy.oracle.yaml "$release/proxy.before.yaml"
cp "$release/Caddyfile" Caddyfile
cp "$release/compose.proxy.oracle.yaml" compose.proxy.oracle.yaml
docker compose -f compose.proxy.oracle.yaml up -d --force-recreate
'@
    $shell = $shell.Replace('__DATABASE__',$(if ($dbCommand) { $database } else { '' })).Replace('__PROXY__',$(if ($DeployProxy) { $proxy } else { '' }))
    foreach ($pair in @(@('__ROOT__',$RemoteDirectory),@('__RELEASE__',$release),@('__COMPOSE__',$compose),@('__VARIABLE__',$variable),@('__IMAGE__',$image),@('__VERSION__',$Version),@('__MAINTENANCE__',$maintenance),@('__DBCOMMAND__',$dbCommand))) { $shell = $shell.Replace($pair[0],$pair[1]) }
    $shellPath = Join-Path $temporary 'deploy.sh'
    [IO.File]::WriteAllText($shellPath,($shell.Replace("`r`n","`n") + "`n"),(New-Object Text.UTF8Encoding($false)))
    Invoke-Native scp @('-i',$IdentityFile,'-o','BatchMode=yes',$shellPath,"${Server}:$release/deploy.sh")
    Invoke-Native ssh ($sshArgs + @($Server,"sh '$release/deploy.sh'"))
} finally {
    # Only generated files in this invocation's unique temporary directory.
    Get-ChildItem -LiteralPath $temporary -File | Remove-Item
    Remove-Item -LiteralPath $temporary
}
