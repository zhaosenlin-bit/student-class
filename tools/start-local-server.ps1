param([switch]$Foreground)

$root = Split-Path -Parent $PSScriptRoot
$server = Join-Path $root 'server\server.mjs'
$logDir = Join-Path $root 'recon'

# The bundled Node is used when it is there; otherwise whatever node is on
# the PATH will do — the server only uses the standard library.
$bundled = Get-ChildItem (Join-Path $root 'tools\node24') -Directory -ErrorAction SilentlyContinue |
  Where-Object { $_.Name -like 'node-v*-win-x64' } |
  ForEach-Object { Join-Path $_.FullName 'node.exe' } |
  Where-Object { Test-Path $_ } |
  Select-Object -First 1
$node = if ($bundled) { $bundled } else { 'node' }

if (-not (Test-Path $node)) { throw "node not found: $node" }

if ($Foreground) {
  & $node $server
  exit $LASTEXITCODE
}

# Start-Process puts the child in this shell's job object, and the agent
# harness reaps that job when the session ends -- the server used to vanish
# a few minutes after launch with no error in the log. Win32_Process.Create
# starts it under the WMI provider instead, outside our job, so it survives.
if (-not (Test-Path "$logDir\server.log")) { New-Item -ItemType File -Path "$logDir\server.log" | Out-Null }
if (-not (Test-Path "$logDir\server.err.log")) { New-Item -ItemType File -Path "$logDir\server.err.log" | Out-Null }

$outLog = Join-Path $logDir 'server.log'
$errLog = Join-Path $logDir 'server.err.log'
$cmd = '"{0}" "{1}" >> "{2}" 2>> "{3}"' -f $node, $server, $outLog, $errLog
$created = Invoke-CimMethod -ClassName Win32_Process -MethodName Create `
  -Arguments @{ CommandLine = "cmd /c $cmd"; CurrentDirectory = $root }
$pid1 = $created.ProcessId

Write-Output "server pid=$pid1"
Start-Sleep -Seconds 3

foreach ($u in @('http://localhost:4173/', 'http://localhost:4173/api/catalog',
                 'http://localhost:4173/api/access/mirror',
                 'http://localhost:4173/courseware/mirror')) {
  try {
    $r = Invoke-WebRequest -Uri $u -UseBasicParsing -TimeoutSec 25
    Write-Output ("{0} -> {1} len={2} type={3}" -f $u, $r.StatusCode, $r.RawContentLength, $r.Headers['Content-Type'])
  } catch {
    Write-Output ("{0} -> ERR {1}" -f $u, $_.Exception.Response.StatusCode.value__)
  }
}

# The launch handshake is a POST that the live site only accepts when it
# carries the front-end's own Origin and X-Requested-With: studio header.
try {
  $body = '{"tabId":"local-check"}'
  $r = Invoke-WebRequest -Uri 'http://localhost:4173/api/launch/mirror' -Method POST `
    -ContentType 'application/json' -Body $body -UseBasicParsing -TimeoutSec 25 `
    -Headers @{ 'X-Requested-With' = 'studio'; Origin = 'http://localhost:4173' }
  Write-Output ("launch handshake -> {0} len={1}" -f $r.StatusCode, $r.RawContentLength)
} catch {
  Write-Output ("launch handshake -> ERR {0}" -f $_.Exception.Response.StatusCode.value__)
}
