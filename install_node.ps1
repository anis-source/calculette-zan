$nodeVersion = "20.11.0"
$url = "https://nodejs.org/dist/v$nodeVersion/node-v$nodeVersion-win-x64.zip"
$dest = "$PWD\.node"
$zipPath = "$dest\node.zip"

Write-Host "Setting up Node.js v$nodeVersion in $dest..."

if (!(Test-Path $dest)) {
    New-Item -ItemType Directory -Force -Path $dest | Out-Null
}

if (!(Test-Path $zipPath)) {
    Write-Host "Downloading..."
    [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
    Invoke-WebRequest -Uri $url -OutFile $zipPath
}

Write-Host "Extracting..."
Expand-Archive -Path $zipPath -DestinationPath $dest -Force

$nodeDir = Get-ChildItem -Path $dest | Where-Object { $_.Name -like "node-v*" } | Select-Object -First 1
$binPath = $nodeDir.FullName

Write-Host "SUCCESS: Node.js is ready."
Write-Host "Path to add: $binPath"
