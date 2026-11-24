param([switch]$Quiet)

# Only the library port is touched. The machine may be running other node
# processes whose command line mentions server.mjs, and killing one of
# those would take something unrelated down with it.
$root = Split-Path -Parent $PSScriptRoot
$server = Join-Path $root 'server\server.mjs'

$bundled = Get-ChildItem (Join-Path $root 'tools\node24') -Directory -ErrorAction SilentlyContinue |
  Where-Object { $_.Name -like 'node-v*-win-x64' } |
  ForEach-Object { Join-Path $_.FullName 'node.exe' } |
  Where-Object { Test-Path $_ } |
  Select-Object -First 1
$node = if ($bundled) { $bundled } else { 'node' }

foreach ($port in @(4173, 4174, 4175)) {
  $conns = Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue
  foreach ($c in $conns) {
    Write-Output "stopping pid=$($c.OwningProcess) on port $port"
    Stop-Process -Id $c.OwningProcess -Force -ErrorAction SilentlyContinue
  }
}
Start-Sleep -Seconds 1

$logDir = Join-Path $root 'work\logs'
if (-not (Test-Path $logDir)) { New-Item -ItemType Directory -Path $logDir | Out-Null }
$outLog = Join-Path $logDir 'lq-server.log'
$errLog = Join-Path $logDir 'lq-server.err'
$proc = Start-Process -FilePath $node -ArgumentList $server -WorkingDirectory $root `
  -WindowStyle Hidden -PassThru `
  -RedirectStandardOutput $outLog -RedirectStandardError $errLog
Write-Output "server pid=$($proc.Id)"
Start-Sleep -Seconds 3

if (-not $Quiet) {
  foreach ($u in @('http://127.0.0.1:4173/', 'http://127.0.0.1:4173/api/catalog')) {
    try {
      $r = Invoke-WebRequest -Uri $u -UseBasicParsing -TimeoutSec 15
      Write-Output ("{0} -> {1} len={2}" -f $u, $r.StatusCode, $r.RawContentLength)
    } catch {
      Write-Output ("{0} -> ERR {1}" -f $u, $_.Exception.Message)
    }
  }
}
