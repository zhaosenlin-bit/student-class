param(
  [switch]$Foreground,
  [string]$Package = 'craft-anything-cli'
)

# Build the craft-anything CLI.
#
# The gnu toolchain we can install on this machine ships dlltool.exe inside
# the target's self-contained folder, but rustc only finds it on PATH, and the
# windows-* crates need it to build import libraries for raw-dylib.  So the
# build puts that folder on PATH first.

$root    = Split-Path -Parent $PSScriptRoot
$repo    = Join-Path $root 'craft-anything'
$toolc   = Join-Path $env:USERPROFILE '.rustup\toolchains\stable-x86_64-pc-windows-gnu'
$selfc   = Join-Path $toolc 'lib\rustlib\x86_64-pc-windows-gnu\bin\self-contained'
$mingw   = Join-Path $root 'tools\mingw-binutils'
$mingw64 = Join-Path $root 'tools\mingw64'
$cargo   = Join-Path $env:USERPROFILE '.cargo\bin\cargo.exe'
$logDir  = Join-Path $root 'recon'

if (-not (Test-Path $selfc)) { throw "self-contained tools not found: $selfc" }
if (-not (Test-Path $cargo)) { throw "cargo not found: $cargo" }

# GNU dlltool builds the import libraries that raw-dylib links need, and it
# shells out to `as` — which the rust-mingw component does not ship.  It finds
# the assembler next to itself, so drop one there (with its runtime DLLs).
if (Test-Path "$selfc\dlltool.exe") {
  foreach ($f in @('as.exe','libintl-8.dll','libiconv-2.dll','zlib1.dll','libwinpthread-1.dll')) {
    $src = Join-Path $mingw $f
    if (Test-Path $src) { Copy-Item $src (Join-Path $selfc $f) -Force }
  }
}

# The mingw-w64 toolchain also needs the assembler and the binutils suite
# next to its gcc, so copy them in and put the whole bin directory on PATH
# (cc-rs looks for gcc.exe, and gcc needs its own DLLs to find).
if (Test-Path "$mingw64\bin") {
  foreach ($f in @('as.exe','ld.exe','ar.exe','nm.exe','objdump.exe','dlltool.exe','libwinpthread-1.dll')) {
    $src = Join-Path $mingw $f
    if (Test-Path $src) { Copy-Item $src (Join-Path "$mingw64\bin" $f) -Force }
  }
  $env:PATH = "$mingw64\bin;$env:PATH"
}

$env:PATH = "$selfc;$env:PATH"
$env:CARGO_HOME = Join-Path $env:USERPROFILE '.cargo'
$env:RUSTUP_HOME = Join-Path $env:USERPROFILE '.rustup'

$args = @('build', '--release', '-p', $Package)

if ($Foreground) {
  Push-Location $repo
  try { & $cargo @args } finally { Pop-Location }
  exit $LASTEXITCODE
}

$proc = Start-Process -FilePath $cargo -ArgumentList $args -WorkingDirectory $repo `
  -RedirectStandardOutput "$logDir\craft-build.log" `
  -RedirectStandardError "$logDir\craft-build.err.log" `
  -WindowStyle Hidden -PassThru
Write-Output "cargo build pid=$($proc.Id)"

