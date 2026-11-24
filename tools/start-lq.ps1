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

# The server is started through the WMI provider and not through
# Start-Process: a child started that way inherits the handles of the
# shell that started it, so the caller's pipe stays open and the command
# never returns. Started this way it stands on its own.
$cmd = '"{0}" "{1}" >> "{2}" 2>> "{3}"' -f $node, $server,
  (Join-Path $logDir 'lq-server.log'), (Join-Path $logDir 'lq-server.err')
$created = Invoke-CimMethod -ClassName Win32_Process -MethodName Create `
  -Arguments @{ CommandLine = "cmd /s /c `"$cmd`""; CurrentDirectory = $root }
Write-Output "server pid=$($created.ProcessId)"

# The library reads a few tens of thousands of files before it answers,
# so the first request has to wait for it.
$ready = $false
for ($i = 0; $i -lt 60 -and -not $ready; $i++) {
  Start-Sleep -Seconds 1
  try {
    $null = Invoke-WebRequest -Uri 'http://127.0.0.1:4173/api/catalog' `
      -UseBasicParsing -TimeoutSec 10
    $ready = $true
  } catch { }
}
try {
  $r = Invoke-WebRequest -Uri 'http://127.0.0.1:4173/api/catalog' -UseBasicParsing -TimeoutSec 10
  Write-Output "server up: $($r.StatusCode)"
} catch {
  Write-Output "down: $($_.Exception.Message)"
}
