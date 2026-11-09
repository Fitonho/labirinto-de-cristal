# Restarts Expo for testing on a phone, in a terminal window Filipe can see,
# so the exp:// address and its QR code are on screen. Claude runs it on the
# Windows PC; a server started as a hidden background job shows neither.
# Stops this project's running Expo and ngrok first, since only one server
# can own port 8081 or the tunnel. It serves on the home network: Expo Go
# opens exp://<this PC's address>:8081 while the phone is on the same Wi-Fi.
# -Dev serves a development build instead of the production-like one (no dev
# checks, minified). -Tunnel serves the production-like build through ngrok,
# for a phone away from home; the tunnel has served stale copies before.
param([switch]$Dev, [switch]$Tunnel)

$projectFolder = Split-Path -Parent $PSScriptRoot
# Only processes launched from this project's node_modules: its Expo command line and the tunnel's ngrok.
$runningProcesses = Get-CimInstance Win32_Process | Where-Object {
  $_.ProcessId -ne $PID -and $_.CommandLine -and $_.CommandLine -like "*$projectFolder\node_modules\*" -and
    ($_.CommandLine -like '*expo*start*' -or $_.Name -like 'ngrok*')
}
foreach ($runningProcess in $runningProcesses) {
  Write-Output "Stopping $($runningProcess.Name) $($runningProcess.ProcessId)"
  Stop-Process -Id $runningProcess.ProcessId -Force -ErrorAction SilentlyContinue
}

$scriptName = if ($Dev) { 'phone:dev' } elseif ($Tunnel) { 'phone:tunnel' } else { 'phone' }
$windowTitle = if ($Dev) { 'Expo (dev)' } elseif ($Tunnel) { 'Expo (tunnel)' } else { 'Expo' }
if (Get-Command wt.exe -ErrorAction SilentlyContinue) {
  # A new tab in the most recent Windows Terminal window.
  Start-Process wt.exe -ArgumentList "-w 0 new-tab --title `"$windowTitle`" -d `"$projectFolder`" powershell -NoExit -Command npm run $scriptName"
} else {
  Start-Process powershell.exe -WorkingDirectory $projectFolder -ArgumentList '-NoExit', '-Command', "npm run $scriptName"
}
Write-Output "Started npm run $scriptName in a new window. The exp:// address and QR code appear there once it is ready."
