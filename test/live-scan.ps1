Add-Type -AssemblyName System.Drawing
$bitmap = New-Object System.Drawing.Bitmap 900,500
$graphics = [System.Drawing.Graphics]::FromImage($bitmap)
$graphics.Clear([System.Drawing.Color]::White)
$font = New-Object System.Drawing.Font 'Arial',24
$graphics.DrawString("TEST CAFE MENU`n`nTomato Pasta - wheat pasta, tomato, parmesan cheese`nGarden Salad - lettuce, cucumber, olive oil`nPeanut Cookie - peanuts, wheat flour, butter", $font, [System.Drawing.Brushes]::Black, 20, 20)
$stream = New-Object System.IO.MemoryStream
$bitmap.Save($stream, [System.Drawing.Imaging.ImageFormat]::Png)
$body = @{image = 'data:image/png;base64,' + [Convert]::ToBase64String($stream.ToArray()); allergens = @('milk','peanuts')} | ConvertTo-Json -Compress
$timer = [System.Diagnostics.Stopwatch]::StartNew()
try {
  $response = Invoke-WebRequest -Uri 'http://127.0.0.1:3000/api/analyze' -Method Post -ContentType 'application/json' -Body $body -SkipHttpErrorCheck -TimeoutSec 150
  [pscustomobject]@{status=$response.StatusCode; seconds=[math]::Round($timer.Elapsed.TotalSeconds,1); result=$response.Content} | ConvertTo-Json -Compress
  if ($response.StatusCode -ne 200) { throw 'Live photo analysis failed' }
  $result = $response.Content | ConvertFrom-Json
  if ($result.dishes.Count -ne 3) { throw 'Expected the three dishes printed in the fixture' }
  if (-not ($result.dishes | Where-Object name -eq 'Tomato Pasta')) { throw 'Fixture dish was not read' }
} finally {
  $font.Dispose(); $graphics.Dispose(); $bitmap.Dispose(); $stream.Dispose()
}
