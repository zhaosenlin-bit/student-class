param(
  [int]$Port = 9222,
  [string]$Profile = (Join-Path $PSScriptRoot 'chrome-recon'),
  [string]$StartUrl = 'about:blank'
)

$chrome = @(
  "$env:ProgramFiles\Google\Chrome\Application\chrome.exe",
  "${env:ProgramFiles(x86)}\Google\Chrome\Application\chrome.exe",
  "$env:LOCALAPPDATA\Google\Chrome\Application\chrome.exe"
) | Where-Object { Test-Path $_ } | Select-Object -First 1
if (-not (Test-Path $chrome)) { throw "Chrome not found at $chrome" }

New-Item -ItemType Directory -Force -Path $Profile | Out-Null

$args = @(
  "--remote-debugging-port=$Port",
  "--user-data-dir=$Profile",
  '--no-first-run',
  '--no-default-browser-check',
  '--disable-blink-features=AutomationControlled',
  '--password-store=basic',
  # A window nobody is looking at stops painting itself. The courseware
  # draws on a timer, so without these the pages look far slower than they
  # are on a desk.
  '--disable-background-timer-throttling',
  '--disable-backgrounding-occluded-windows',
  '--disable-renderer-backgrounding',
  $StartUrl
)

$proc = Start-Process -FilePath $chrome -ArgumentList $args -WindowStyle Minimized -PassThru
Write-Output "chrome pid=$($proc.Id)"

for ($i = 0; $i -lt 30; $i++) {
  Start-Sleep -Seconds 1
  try {
    $ver = Invoke-RestMethod -Uri "http://127.0.0.1:$Port/json/version" -TimeoutSec 5
    Write-Output "CDP OK: $($ver.Browser)"
    exit 0
  } catch { }
}

Write-Output "CDP did not come up on port $Port"
exit 1
