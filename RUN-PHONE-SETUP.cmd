@echo off
REM ===================================================================
REM  PeggyBank Dev - phone setup over USB
REM
REM  Double-click this with your phone plugged in.
REM
REM  It will:
REM    - tell you exactly which PeggyBank apps are on the phone
REM    - install PeggyBank Dev if it's missing (never production)
REM    - tunnel port 8081 down the cable (no Wi-Fi, no firewall)
REM    - launch the app
REM
REM  Output is saved to phone-setup-log.txt
REM ===================================================================

title PeggyBank Dev - phone setup

cd /d "C:\Users\spall\Documents\PeggyBank"

powershell -ExecutionPolicy Bypass -NoProfile -File "phone-setup.ps1"

echo.
echo  ===================================================================
echo   Finished. Full output is in phone-setup-log.txt
echo  ===================================================================
echo.
pause
