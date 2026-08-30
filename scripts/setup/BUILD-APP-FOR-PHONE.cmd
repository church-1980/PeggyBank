@echo off
REM ===================================================================
REM  PeggyBank Dev - build the app for your phone
REM
REM  THIS IS THE ONE THAT MATTERS.
REM
REM  Makes a single .apk file with everything baked inside.
REM  Copy it to your phone, tap it, done. Works with no PC,
REM  no Metro, no Wi-Fi, no cable - forever.
REM
REM  Takes 5-15 minutes. Gradle prints a lot. That's normal.
REM  Output lands on your Desktop as PeggyBankDev.apk
REM ===================================================================

title PeggyBank Dev - building the app for your phone

cd /d "C:\Users\spall\Documents\PeggyBank"

powershell -ExecutionPolicy Bypass -NoProfile -File "build-standalone.ps1"

echo.
echo  ===================================================================
echo   Full output saved to build-standalone-log.txt
echo  ===================================================================
echo.
pause
