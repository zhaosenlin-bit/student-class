param([string]$Toolchain = 'stable')

$rustup = "$HOME\.cargo\bin\rustup.exe"
if (-not (Test-Path $rustup)) { throw "rustup not found at $rustup" }

Write-Output "== uninstalling $Toolchain =="
& $rustup toolchain uninstall $Toolchain 2>&1 | ForEach-Object { Write-Output "  $_" }

Write-Output "== reinstalling $Toolchain (minimal) =="
& $rustup toolchain install $Toolchain --profile minimal --component rustfmt 2>&1 |
  ForEach-Object { Write-Output "  $_" }

Write-Output "== installed toolchains =="
& $rustup toolchain list 2>&1 | ForEach-Object { Write-Output "  $_" }

$bin = "$HOME\.rustup\toolchains\$Toolchain-x86_64-pc-windows-msvc\bin"
Write-Output "== toolchain bin =="
Get-ChildItem $bin -ErrorAction SilentlyContinue | ForEach-Object { Write-Output "  $($_.Name)" }

if (Test-Path "$bin\rustc.exe") {
  Write-Output "== versions =="
  & "$bin\rustc.exe" --version
  & "$bin\cargo.exe" --version
} else {
  Write-Output "rustc.exe STILL MISSING"
}
