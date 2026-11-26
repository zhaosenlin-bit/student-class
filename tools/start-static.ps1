param(
  [string]$Site = 'work\webroot',
  [int]$Port = 4180
)

$root = Split-Path -Parent $PSScriptRoot
$server = Join-Path $root 'tools\static\serve-static.mjs'

$bundled = Get-ChildItem (Join-Path $root 'tools\node24') -Directory -ErrorAction SilentlyContinue |
  Where-Object { $_.Name -like 'node-v*-win-x64' } |
  ForEach-Object { Join-Path $_.FullName 'node.exe' } |
  Where-Object { Test-Path $_ } |
  Select-Object -First 1
$node = if ($bundled) { $bundled } else { 'node' }

$logDir = Join-Path $root 'work\logs'
if (-not (Test-Path $logDir)) { New-Item -ItemType Directory -Path $logDir | Out-Null }

Get-CimInstance Win32_Process -Filter "Name='node.exe'" |
  Where-Object { $_.CommandLine -like "*serve-static.mjs*" } |
  ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }
Start-Sleep -Seconds 1

$cmd = '"{0}" "{1}" --root "{2}" --port {3} >> "{4}" 2>> "{5}"' -f $node, $server, (Join-Path $root $Site), $Port,
  (Join-Path $logDir 'static-server.log'), (Join-Path $logDir 'static-server.err')
$created = Invoke-CimMethod -ClassName Win32_Process -MethodName Create `
  -Arguments @{ CommandLine = "cmd /s /c `"$cmd`""; CurrentDirectory = $root }
Write-Output "static server pid=$($created.ProcessId)"

$ready = $false
for ($i = 0; $i -lt 30 -and -not $ready; $i++) {
  Start-Sleep -Milliseconds 500
  try {
    $null = Invoke-WebRequest -Uri "http://127.0.0.1:$Port/" -UseBasicParsing -TimeoutSec 5
    $ready = $true
  } catch { }
}
Write-Output $(if ($ready) { "static server up: http://127.0.0.1:$Port/" } else { 'static server down' })
