$zipPath = 'd:\DOWNLOAD\arsipankanew-replit-source\arsipankanew-replit-source\rclone.zip'
$extractPath = 'd:\DOWNLOAD\arsipankanew-replit-source\arsipankanew-replit-source'

Write-Host 'Extracting rclone...'
Expand-Archive -Path $zipPath -DestinationPath $extractPath -Force

Write-Host 'Finding rclone.exe...'
$found = $false
Get-ChildItem -Path $extractPath -Recurse -Filter 'rclone.exe' | ForEach-Object {
    if (-not $found) {
        $source = $_.FullName
        $dest = Join-Path $extractPath 'rclone.exe'
        Write-Host "Copying from: $source"
        Write-Host "Copying to: $dest"
        Copy-Item -Path $source -Destination $dest -Force
        $found = $true
    }
}

if (Test-Path (Join-Path $extractPath 'rclone.exe')) {
    Write-Host 'SUCCESS: rclone.exe is ready'
    & (Join-Path $extractPath 'rclone.exe') version
} else {
    Write-Host 'ERROR: rclone.exe not found'
}
