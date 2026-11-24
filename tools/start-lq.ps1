$root = Split-Path -Parent $PSScriptRoot
$server = Join-Path $root 'server\server.mjs'

# The bundled Node is used when it is there; otherwise whatever node is on
# the PATH will do — the server only uses the standard library.
$bundled = Get-ChildItem (Join-Path $root 'tools\node24') -Directory -ErrorAction SilentlyContinue |
  Where-Object { $_.Name -like 'node-v*-win-x64' } |
  ForEach-Object { Join-Path $_.FullName 'node.exe' } |
  Where-Object { Test-Path $_ } |
  Select-Object -First 1
$node = if ($bundled) { $bundled } else { 'node' }

$logDir = Join-Path $root 'work\logs'
if (-not (Test-Path $logDir)) { New-Item -ItemType Directory -Path $logDir | Out-Null }

# The server that is already running is stopped first, so that the new
# one is the one that answers.
Get-CimInstance Win32_Process -Filter "Name='node.exe'" |
  Where-Object { $_.CommandLine -like "*$root\server\server.mjs*" } |
  ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }
Start-Sleep -Seconds 1

Start-Process -FilePath $node -ArgumentList $server `
  -WorkingDirectory $root -WindowStyle Hidden `
  -RedirectStandardOutput (Join-Path $logDir 'lq-server.log') `
  -RedirectStandardError (Join-Path $logDir 'lq-server.err')
Start-Sleep -Seconds 4
try {
  $r = Invoke-WebRequest -Uri 'http://127.0.0.1:4173/api/catalog' -UseBasicParsing -TimeoutSec 10
  Write-Output "server up: $($r.StatusCode)"
} catch {
  Write-Output "down: $($_.Exception.Message)"
}
