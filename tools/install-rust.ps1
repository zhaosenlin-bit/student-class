param(
  [string]$DistServer = 'https://mirrors.sjtug.sjtu.edu.cn/rust-static',
  [string]$Toolchain = 'stable-x86_64-pc-windows-gnu'
)

$ErrorActionPreference = 'Stop'
$env:RUSTUP_DIST_SERVER = $DistServer
$env:RUSTUP_UPDATE_ROOT = "$DistServer/rustup"
$rustup = "$env:USERPROFILE\.cargo\bin\rustup.exe"

Write-Output "installing $Toolchain from $DistServer"
& $rustup toolchain install $Toolchain --profile minimal --component rustfmt,clippy
Write-Output "exit=$LASTEXITCODE"
& $rustup default $Toolchain
& $rustup toolchain list
