param([switch]$Check)

# Read-only fetch of the public JRC reference. Emits the complete JSON response;
# never overwrites the saved calibration or reads household inputs/credentials.
$ErrorActionPreference = 'Stop'
function Convert-SolarNumericTypes($Value) {
  if ($Value -is [System.Collections.IDictionary]) {
    $solarCanonicalObject = [ordered]@{}
    foreach ($solarKey in $Value.Keys) { $solarCanonicalObject[$solarKey] = Convert-SolarNumericTypes $Value[$solarKey] }
    return $solarCanonicalObject
  }
  if ($Value -is [System.Collections.IList]) {
    return ,@($Value | ForEach-Object { Convert-SolarNumericTypes $_ })
  }
  if ($Value -is [ValueType] -and $Value -isnot [bool]) { return [double]$Value }
  return $Value
}
$solarResourceUri = 'https://re.jrc.ec.europa.eu/api/v5_3/PVcalc?lat=13.75&lon=100.5&peakpower=1&loss=14&angle=15&aspect=0&pvtechchoice=crystSi&mountingplace=building&outputformat=json&usehorizon=1&raddatabase=PVGIS-ERA5'
$solarResourceResponse = Invoke-WebRequest -Uri $solarResourceUri -MaximumRedirection 3 -TimeoutSec 45
if ($solarResourceResponse.StatusCode -ne 200) { throw 'JRC did not return HTTP 200.' }
$solarResourceCurrent = $solarResourceResponse.Content | ConvertFrom-Json -AsHashtable
if ($solarResourceCurrent.outputs.monthly.fixed.Count -ne 12) { throw 'Expected twelve monthly JRC outputs.' }
if ($Check) {
  $solarResourceSnapshotPath = Join-Path $PSScriptRoot '../docs/calculator-v3/pvgis-era5-bangkok-2026-10-17.json'
  $solarResourceSaved = Get-Content -LiteralPath $solarResourceSnapshotPath -Raw | ConvertFrom-Json -AsHashtable
  # Numeric formatting 9 versus 9.0 is not a scientific change.
  $solarResourceCurrentInputs = Convert-SolarNumericTypes $solarResourceCurrent.inputs | ConvertTo-Json -Depth 100 -Compress
  $solarResourceSavedInputs = Convert-SolarNumericTypes $solarResourceSaved.inputs | ConvertTo-Json -Depth 100 -Compress
  $solarResourceCurrentOutputs = Convert-SolarNumericTypes $solarResourceCurrent.outputs | ConvertTo-Json -Depth 100 -Compress
  $solarResourceSavedOutputs = Convert-SolarNumericTypes $solarResourceSaved.outputs | ConvertTo-Json -Depth 100 -Compress
  if ($solarResourceCurrentInputs -ne $solarResourceSavedInputs -or $solarResourceCurrentOutputs -ne $solarResourceSavedOutputs) {
    throw 'JRC inputs or outputs changed. Review the response and version the calibration deliberately; nothing was overwritten.'
  }
}
Write-Output $solarResourceResponse.Content
