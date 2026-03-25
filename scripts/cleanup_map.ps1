Add-Type -AssemblyName System.Drawing

$sourcePath = "D:\Workspace\GitHub\Swcmt2026SpringEventMap\map.png"
$bitmap = [System.Drawing.Bitmap]::FromFile($sourcePath)
$graphics = [System.Drawing.Graphics]::FromImage($bitmap)
$graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias

function New-Brush([string]$hex) {
  return New-Object System.Drawing.SolidBrush ([System.Drawing.ColorTranslator]::FromHtml($hex))
}

function Fill-Ellipse([string]$hex, [int]$x, [int]$y, [int]$w, [int]$h) {
  $brush = New-Brush $hex
  $graphics.FillEllipse($brush, $x, $y, $w, $h)
  $brush.Dispose()
}

function Fill-Rect([string]$hex, [int]$x, [int]$y, [int]$w, [int]$h) {
  $brush = New-Brush $hex
  $graphics.FillRectangle($brush, $x, $y, $w, $h)
  $brush.Dispose()
}

# Shared background colors sampled from the original map.
$grass = "#9BCB86"
$road = "#F5EDE2"
$buildingGray = "#CFCFCF"
$buildingBrown = "#B98C57"
$buildingBlue = "#5B84B1"
$buildingPurple = "#A48ABA"
$parkGreen = "#8FCB73"

# Left edge circular icons.
Fill-Ellipse $grass 2 170 38 38
Fill-Ellipse $grass 2 807 40 40

# R5 upper brown block icon cluster and nearby heart.
Fill-Rect $buildingBrown 207 156 90 44
Fill-Ellipse $road 246 273 42 38

# Center park numbered circles cluster and nearby round icons.
Fill-Rect $parkGreen 512 134 144 110
Fill-Ellipse $road 712 160 42 42
Fill-Ellipse $road 807 167 44 44

# Sports park numbered circles and nearby heart-like icons.
Fill-Rect $parkGreen 786 137 183 118
Fill-Ellipse $road 975 167 44 44

# Road-side numbered circle and heart near the middle-left zone.
Fill-Ellipse $road 360 246 48 48
Fill-Ellipse $road 777 425 44 38
Fill-Ellipse $road 965 520 44 38

# R4 brown block icons.
Fill-Rect $buildingBrown 185 390 110 48

# DA2 and DA1 restroom / circular icon rows.
Fill-Ellipse $buildingGray 843 414 52 52
Fill-Rect $buildingGray 843 563 100 40

# Family park / sports family zone circles.
Fill-Rect $parkGreen 405 520 122 106
Fill-Rect $buildingBlue 542 516 115 82

# Bottom train area circle and nearby blue round icons.
Fill-Ellipse $parkGreen 480 746 48 48
Fill-Ellipse $road 923 821 42 42
Fill-Ellipse $road 1064 821 42 42

# Right side block icons and edge circular parking icon.
Fill-Rect $buildingPurple 1191 452 60 44
Fill-Rect $buildingBlue 1177 565 54 42
Fill-Ellipse $grass 1322 528 42 42

# Left challenge area round icon.
Fill-Ellipse $road 323 404 46 46

# Save the edited image in place.
$bitmap.Save($sourcePath, [System.Drawing.Imaging.ImageFormat]::Png)
$graphics.Dispose()
$bitmap.Dispose()
