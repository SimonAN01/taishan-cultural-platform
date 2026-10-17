@echo off
setlocal
chcp 65001 >nul
cd /d "%~dp0"
set PYTHONUTF8=1
if not exist "taishan\.venv\Scripts\python.exe" (
  echo Run Start-Windows.cmd first and keep that window open.
  pause
  exit /b 1
)
echo Testing local APIs, history, records, real Coze, cloud image recognition and TTS.
echo This uses disposable test sessions and calls the configured cloud services.
"taishan\.venv\Scripts\python.exe" "taishan\scripts\audit_system.py" --base-url http://127.0.0.1:18605 --output "taishan\runtime\windows-acceptance.json" --external
if errorlevel 1 (
  echo One or more checks failed. Inspect the report and the server window.
) else (
  echo HTTP acceptance passed. Browser/microphone/GPU checks still require the real device.
)
echo Report: taishan\runtime\windows-acceptance.json
pause
