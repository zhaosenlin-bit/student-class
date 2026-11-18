param(
  [int]$Port = 9228,
  [string]$Profile = (Join-Path $PSScriptRoot 'chrome-aife-9228')
)

$chrome = @(
  "$env:ProgramFiles\Google\Chrome\Application\chrome.exe",
  "${env:ProgramFiles(x86)}\Google\Chrome\Application\chrome.exe",
  "$env:LOCALAPPDATA\Google\Chrome\Application\chrome.exe"
) | Where-Object { Test-Path $_ } | Select-Object -First 1
if (-not $chrome) { throw "Chrome not found" }

New-Item -ItemType Directory -Force -Path $Profile | Out-Null

$chromeArgs = @(
  "--remote-debugging-port=$Port",
  "--user-data-dir=$Profile",
  '--no-first-run',
  '--no-default-browser-check',
  '--disable-blink-features=AutomationControlled',
  '--password-store=basic',
  '--window-size=1200,900',
  'https://aifunengjiaoyu.com/'
)

$proc = Start-Process -FilePath $chrome -ArgumentList $chromeArgs -PassThru
Write-Output "chrome pid=$($proc.Id)"

Start-Sleep -Seconds 6
try {
  $ver = Invoke-RestMethod -Uri "http://127.0.0.1:$Port/json/version" -TimeoutSec 8
  Write-Output "CDP OK: $($ver.Browser)"
} catch {
  Write-Output "CDP down: $($_.Exception.Message)"
}
