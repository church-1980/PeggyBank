@echo off
REM ===================================================================
REM  PeggyBank Dev - emulator setup launcher
REM
REM  Only needed if you want the emulator ("fake phone") on the PC.
REM  If your real phone is working, you don't need this at all.
REM
REM  Runs fully non-interactive. Everything it prints is saved to
REM  dev-emulator-console.txt in this folder.
REM
REM  It cannot touch production PeggyBank - the safety gates live in
REM  the PowerShell script it calls.
REM ===================================================================

title PeggyBank Dev - emulator setup

cd /d "C:\Users\spall\Documents\PeggyBank"

powershell -ExecutionPolicy Bypass -NoProfile -File "setup-dev-emulator.ps1"

echo.
echo  ===================================================================
echo   Finished. Full output is in dev-emulator-console.txt
echo   Diagnostic log is in dev-emulator-log.txt
echo  ===================================================================
echo.
pause
