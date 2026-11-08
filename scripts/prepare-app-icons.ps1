param(
  [Parameter(Mandatory = $true)][string]$SourcePath
)

$ErrorActionPreference = 'Stop'
# Deterministic resizing only: the mascot artwork and animation assets are untouched.
Add-Type -AssemblyName System.Drawing
$projectRoot = Split-Path -Parent $PSScriptRoot
$iconDirectory = Join-Path $projectRoot 'public/icons'
$source = [System.Drawing.Image]::FromFile((Resolve-Path -LiteralPath $SourcePath).Path)

function Save-Icon([int]$Size, [string]$Destination, [double]$Scale = 1) {
  $bitmap = New-Object System.Drawing.Bitmap $Size, $Size
  $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
  try {
    $graphics.Clear([System.Drawing.Color]::FromArgb(20, 240, 201))
    $graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $graphics.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
    $ratio = [Math]::Min($Size / $source.Width, $Size / $source.Height) * $Scale
    $width = [int][Math]::Round($source.Width * $ratio)
    $height = [int][Math]::Round($source.Height * $ratio)
    $left = [int][Math]::Floor(($Size - $width) / 2)
    $top = [int][Math]::Floor(($Size - $height) / 2)
    $graphics.DrawImage($source, $left, $top, $width, $height)
    $pngStream = New-Object System.IO.MemoryStream
    try {
      $bitmap.Save($pngStream, [System.Drawing.Imaging.ImageFormat]::Png)
      [System.IO.File]::WriteAllBytes($Destination, $pngStream.ToArray())
    } finally { $pngStream.Dispose() }
  } finally {
    $graphics.Dispose()
    $bitmap.Dispose()
  }
}

try {
  Save-Icon 192 (Join-Path $iconDirectory 'drumpyy-192.png')
  Save-Icon 512 (Join-Path $iconDirectory 'drumpyy-512.png')
  # 56% fits the entire square inside the central safe circle (radius 40%).
  Save-Icon 512 (Join-Path $iconDirectory 'drumpyy-maskable-512.png') 0.56
  Save-Icon 180 (Join-Path $iconDirectory 'apple-touch-icon.png')
  Save-Icon 32 (Join-Path $iconDirectory 'favicon-32.png')

  # Multi-resolution ICO with lossless PNG entries for modern browsers/devices.
  $sizes = @(16, 32, 48)
  $entries = @()
  foreach ($size in $sizes) {
    $temporaryPath = Join-Path $iconDirectory "favicon-$size.tmp.png"
    Save-Icon $size $temporaryPath
    $entries += ,([System.IO.File]::ReadAllBytes($temporaryPath))
    Remove-Item -LiteralPath $temporaryPath
  }
  $stream = [System.IO.File]::Create((Join-Path $projectRoot 'public/favicon.ico'))
  $writer = New-Object System.IO.BinaryWriter $stream
  try {
    $writer.Write([uint16]0)
    $writer.Write([uint16]1)
    $writer.Write([uint16]$sizes.Count)
    $offset = 6 + 16 * $sizes.Count
    for ($index = 0; $index -lt $sizes.Count; $index++) {
      $writer.Write([byte]$sizes[$index])
      $writer.Write([byte]$sizes[$index])
      $writer.Write([byte]0)
      $writer.Write([byte]0)
      $writer.Write([uint16]1)
      $writer.Write([uint16]32)
      $writer.Write([uint32]$entries[$index].Length)
      $writer.Write([uint32]$offset)
      $offset += $entries[$index].Length
    }
    foreach ($entry in $entries) { $writer.Write([byte[]]$entry) }
  } finally { $writer.Dispose() }
} finally { $source.Dispose() }
