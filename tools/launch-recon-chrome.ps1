param(
  [int]$Port = 9222,
  [string]$Profile = 'C:\kaifa\xiaobai-class\tools\chrome-recon',
  [string]$StartUrl = 'about:blank'
)

$chrome = 'C:\Program Files\Google\Chrome\Application\chrome.exe'
if (-not (Test-Path $chrome)) { throw "Chrome not found at $chrome" }

New-Item -ItemType Directory -Force -Path $Profile | Out-Null

$args = @(
  "--remote-debugging-port=$Port",
  "--user-data-dir=$Profile",
  '--no-first-run',
  '--no-default-browser-check',
  '--disable-blink-features=AutomationControlled',
  '--password-store=basic',
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
