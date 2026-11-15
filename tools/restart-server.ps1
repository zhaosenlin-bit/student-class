param([switch]$Quiet)

$node = 'C:\kaifa\xiaobai-class\tools\node24\node-v24.22.3-win-x64\node.exe'
$server = 'C:\kaifa\xiaobai-class\server\server.mjs'
$root = 'C:\kaifa\xiaobai-class'

# Find the listeners on the three ports as well as the processes whose
# command line mentions the server — a copy started with a relative path
# (`./server.mjs`) does not match the second test.
$ports = @(4173, 4174, 4175)
$pids = @()
foreach ($port in $ports) {
  $conns = Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue
  foreach ($c in $conns) { $pids += $c.OwningProcess }
}
$running = Get-CimInstance Win32_Process -Filter "Name='node.exe'" |
  Where-Object { $_.CommandLine -like '*server.mjs*' }
foreach ($p in $running) { $pids += $p.ProcessId }
foreach ($serverPid in ($pids | Sort-Object -Unique)) {
  if (-not $serverPid) { continue }
  Write-Output "stopping server pid=$serverPid"
  Stop-Process -Id $serverPid -Force -ErrorAction SilentlyContinue
}
Start-Sleep -Seconds 1

$proc = Start-Process -FilePath $node -ArgumentList $server -WorkingDirectory $root `
  -RedirectStandardOutput "$root\recon\server.log" `
  -RedirectStandardError "$root\recon\server.err.log" `
  -WindowStyle Hidden -PassThru
Write-Output "server pid=$($proc.Id)"
Start-Sleep -Seconds 3

if (-not $Quiet) {
  # 127.0.0.1 rather than localhost: the server only listens on IPv4, and a
  # localhost lookup that resolves to ::1 first just hangs.
  foreach ($u in @('http://127.0.0.1:4173/', 'http://127.0.0.1:4173/api/catalog')) {
    try {
      $r = Invoke-WebRequest -Uri $u -UseBasicParsing -TimeoutSec 15
      Write-Output ("{0} -> {1} len={2}" -f $u, $r.StatusCode, $r.RawContentLength)
    } catch {
      Write-Output ("{0} -> ERR {1}" -f $u, $_.Exception.Message)
    }
  }
}
