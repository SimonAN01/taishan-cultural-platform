@echo off
setlocal
chcp 65001 >nul
cd /d "%~dp0"
rem Execute the checked-in script with the normal PowerShell execution policy.
rem No machine policy, firewall or browser permissions are changed.
powershell.exe -NoLogo -NoProfile -Command "& ([scriptblock]::Create([System.IO.File]::ReadAllText((Join-Path (Get-Location) 'scripts\start-windows.ps1'))))"
if errorlevel 1 (
  echo.
  echo Startup failed. See the message above and docs/windows/README.md.
  pause
)
