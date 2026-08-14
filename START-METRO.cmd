@echo off
REM ===================================================================
REM  PeggyBank Dev - start Metro
REM
REM  Does ONE thing: starts the Metro dev server on port 8081.
REM  Leave the window it opens OPEN - closing it stops Metro.
REM
REM  Once it's up, http://localhost:8081 will respond instead of
REM  refusing the connection.
REM ===================================================================

title PeggyBank Dev - Metro (leave this window open)

cd /d "C:\Users\spall\Documents\PeggyBank"

set "ANDROID_HOME=C:\Users\spall\AppData\Local\Android\Sdk"
set "ANDROID_SDK_ROOT=C:\Users\spall\AppData\Local\Android\Sdk"
set "APP_VARIANT=dev"

echo.
echo  Starting Metro on port 8081...
echo  LEAVE THIS WINDOW OPEN.
echo.

call npx expo start --dev-client --lan

echo.
echo  ================================================
echo   Metro has stopped.
echo  ================================================
echo.
pause
