$root = Split-Path -Parent $PSScriptRoot
$node = Join-Path $root 'tools\node24\node-v24.22.3-win-x64\node.exe'
$logDir = Join-Path $root 'recon\scratch'
Start-Process -FilePath $node -ArgumentList (Join-Path $root 'server\server.mjs') `
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
