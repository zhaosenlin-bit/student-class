param([string]$Dir = (Join-Path (Split-Path -Parent $PSScriptRoot) 'recon\captures'))

# A courseware page that renders nothing is still "console clean", so the
# screenshot has to be checked for real pixels: a blank or all-one-colour
# frame means the 3D scene never came up.
Add-Type -AssemblyName System.Drawing

Get-ChildItem -LiteralPath $Dir -Filter 'play-*.png' | Sort-Object Name | ForEach-Object {
  $bmp = [System.Drawing.Bitmap]::FromFile($_.FullName)
  try {
    $step = [Math]::Max(1, [int]([Math]::Min($bmp.Width, $bmp.Height) / 90))
    $sum = 0.0; $sumSq = 0.0; $n = 0
    $colors = New-Object 'System.Collections.Generic.HashSet[int]'
    for ($y = 0; $y -lt $bmp.Height; $y += $step) {
      for ($x = 0; $x -lt $bmp.Width; $x += $step) {
        $c = $bmp.GetPixel($x, $y)
        $l = 0.299 * $c.R + 0.587 * $c.G + 0.114 * $c.B
        $sum += $l; $sumSq += $l * $l; $n++
        [void]$colors.Add($c.ToArgb())
      }
    }
    $mean = $sum / $n
    $sd = [Math]::Sqrt([Math]::Max(0, $sumSq / $n - $mean * $mean))
    $name = $_.Name -replace '^play-', '' -replace '\.png$', ''
    $flag = if ($sd -lt 3 -or $colors.Count -lt 8) { 'BLANK?' } else { 'ok' }
    '{0,-32} {1,-7} mean={2,6:N1} sd={3,6:N1} colors={4,5}' -f $name, $flag, $mean, $sd, $colors.Count
  } finally {
    $bmp.Dispose()
  }
}
