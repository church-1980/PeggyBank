<#
    PeggyBank Dev - Emulator Setup
    ================================
    Creates an Android emulator, installs the EXISTING debug dev-client APK,
    wires it to Metro, launches the app, and captures a log for diagnosis.

    SAFETY - this script will refuse to:
      * touch, install, or uninstall com.spall.peggybank (production)
      * install any APK whose package is not com.spall.peggybank.dev
      * use "adb install -r"
      * run any EAS command, or modify app.config.js / signing / projectId
      * run any git command that writes (no push, no checkout, no merge)

    USAGE (normal PowerShell, NOT admin):
        cd C:\Users\spall\Documents\PeggyBank
        powershell -ExecutionPolicy Bypass -File .\setup-dev-emulator.ps1

    Re-runnable. Skips anything already done.

    WHEN IT FINISHES it writes  dev-emulator-log.txt  in this folder.
    Paste that to Claude if anything went wrong.

    SWITCHES:
        -SkipSdkInstall    don't run sdkmanager (packages already installed)
        -SkipMetro         set up the emulator but don't launch Metro
        -AvdName <name>    default: peggybank_dev
#>

param(
    [switch]$SkipSdkInstall,
    [switch]$SkipMetro,
    [string]$AvdName = "peggybank_dev"
)

$ErrorActionPreference = "Stop"

# Capture everything this script prints, from the very first line.
try { Stop-Transcript | Out-Null } catch { }
Start-Transcript -Path "C:\Users\spall\Documents\PeggyBank\dev-emulator-console.txt" -Force | Out-Null

# ----------------------------------------------------------------------------
# Constants - the only two package names that matter
# ----------------------------------------------------------------------------
$DEV_PACKAGE  = "com.spall.peggybank.dev"
$PROD_PACKAGE = "com.spall.peggybank"

$Sdk       = "C:\Users\spall\AppData\Local\Android\Sdk"
$Repo      = "C:\Users\spall\Documents\PeggyBank"
$ApkPath   = Join-Path $Repo "android\app\build\outputs\apk\debug\app-debug.apk"
$LogFile   = Join-Path $Repo "dev-emulator-log.txt"
$SysImage  = "system-images;android-35;google_apis;x86_64"
$DeviceDef = "pixel_7"

# ----------------------------------------------------------------------------
# Output helpers
# ----------------------------------------------------------------------------
function Step($n, $msg) { Write-Host "`n[$n] $msg" -ForegroundColor Cyan }
function Ok($msg)       { Write-Host "    OK   $msg" -ForegroundColor Green }
function Info($msg)     { Write-Host "         $msg" -ForegroundColor Gray }
function Warn($msg)     { Write-Host "    WARN $msg" -ForegroundColor Yellow }
function Die($msg) {
    Write-Host "`n    STOP $msg`n" -ForegroundColor Red
    "STOP: $msg" | Out-File -FilePath $LogFile -Append -Encoding utf8
    exit 1
}

Write-Host "`n=====================================================" -ForegroundColor White
Write-Host "  PeggyBank Dev - emulator setup" -ForegroundColor White
Write-Host "=====================================================" -ForegroundColor White

"PeggyBank Dev emulator setup - $(Get-Date)" | Out-File -FilePath $LogFile -Encoding utf8

# ----------------------------------------------------------------------------
Step 1 "Locating the Android SDK"
# ----------------------------------------------------------------------------
if (-not (Test-Path $Sdk)) { Die "Android SDK not found at $Sdk" }

$env:ANDROID_HOME     = $Sdk
$env:ANDROID_SDK_ROOT = $Sdk

$Adb      = Join-Path $Sdk "platform-tools\adb.exe"
$Emulator = Join-Path $Sdk "emulator\emulator.exe"

if (-not (Test-Path $Adb))      { Die "adb.exe not found at $Adb" }
if (-not (Test-Path $Emulator)) { Die "emulator.exe not found at $Emulator" }

Ok "SDK at $Sdk"

# sdkmanager / avdmanager live in cmdline-tools, frequently absent
$CmdlineRoot = Join-Path $Sdk "cmdline-tools"
$SdkManager  = $null
$AvdManager  = $null

if (Test-Path $CmdlineRoot) {
    $candidates = @()
    if (Test-Path (Join-Path $CmdlineRoot "latest")) { $candidates += (Join-Path $CmdlineRoot "latest") }
    $candidates += (Get-ChildItem $CmdlineRoot -Directory -ErrorAction SilentlyContinue |
                    Where-Object { $_.Name -ne "latest" } |
                    Sort-Object Name -Descending | ForEach-Object { $_.FullName })

    foreach ($c in $candidates) {
        $sm = Join-Path $c "bin\sdkmanager.bat"
        if ((Test-Path $sm) -and (-not $SdkManager)) {
            $SdkManager = $sm
            $AvdManager = Join-Path $c "bin\avdmanager.bat"
        }
    }
}

if (-not $SdkManager) {
    Write-Host ""
    Warn "cmdline-tools are not installed - the one piece I can't script around."
    Write-Host ""
    Write-Host "    Fix in about 60 seconds:" -ForegroundColor White
    Write-Host "      1. Open Android Studio"
    Write-Host "      2. Settings -> Languages and Frameworks -> Android SDK"
    Write-Host "      3. 'SDK Tools' tab"
    Write-Host "      4. Tick 'Android SDK Command-line Tools (latest)'"
    Write-Host "      5. Apply, let it download, re-run this script"
    Write-Host ""
    Die "Need cmdline-tools before an emulator can be created."
}

Ok "sdkmanager found"

# ----------------------------------------------------------------------------
Step 2 "Checking hardware acceleration"
# ----------------------------------------------------------------------------
$accel = & $Emulator -accel-check 2>&1 | Out-String
Info ($accel.Trim())
"ACCEL: $accel" | Out-File -FilePath $LogFile -Append -Encoding utf8

if ($accel -match "is not installed|not available|VT-x|disabled") {
    Warn "Hardware acceleration looks unavailable."
    Warn "  * Virtualization off in BIOS/UEFI (VT-x / SVM / AMD-V), or"
    Warn "  * Windows Hypervisor Platform not enabled"
    Warn "    -> Windows Features -> tick it -> reboot"
    Warn "Continuing anyway - the emulator may be slow or fail to boot."
    "ACCEL WARNING: acceleration unavailable, continued anyway" |
        Out-File -FilePath $LogFile -Append -Encoding utf8
} else {
    Ok "Acceleration available"
}

# ----------------------------------------------------------------------------
Step 3 "Installing SDK packages"
# ----------------------------------------------------------------------------
if ($SkipSdkInstall) {
    Info "Skipped (-SkipSdkInstall)"
} else {
    Info "~1.5 GB on first run. Licences auto-accepted (non-interactive)."
    Write-Host ""

    # Fully non-interactive: feed 'y' to every licence prompt.
    $yes = ("y`r`n" * 60)

    $yes | & $SdkManager --sdk_root="$Sdk" --licenses 2>&1 | Out-Null
    $yes | & $SdkManager --sdk_root="$Sdk" "platform-tools" "emulator" "platforms;android-35" $SysImage
    if ($LASTEXITCODE -ne 0) { Die "sdkmanager failed (exit $LASTEXITCODE)" }
    Ok "SDK packages installed"
}

# ----------------------------------------------------------------------------
Step 4 "Creating the AVD"
# ----------------------------------------------------------------------------
$existing = & $AvdManager list avd 2>&1 | Out-String

if ($existing -match [regex]::Escape($AvdName)) {
    Ok "AVD '$AvdName' already exists - reusing"
} else {
    Info "Creating '$AvdName' ($DeviceDef, API 35)"
    "no" | & $AvdManager create avd --name $AvdName --package $SysImage --device $DeviceDef --force
    if ($LASTEXITCODE -ne 0) { Die "avdmanager failed (exit $LASTEXITCODE)" }
    Ok "AVD created"
}

# ----------------------------------------------------------------------------
Step 5 "Booting the emulator"
# ----------------------------------------------------------------------------
& $Adb start-server | Out-Null

if ((& $Adb devices | Out-String) -match "emulator-\d+\s+device") {
    Ok "An emulator is already running - using it"
} else {
    Info "Launching '$AvdName' in its own window..."
    Start-Process -FilePath $Emulator -ArgumentList @("-avd", $AvdName, "-no-snapshot-load", "-no-boot-anim")

    Info "Waiting for boot (first time: 2-4 minutes)"
    & $Adb wait-for-device

    $booted = $false; $waited = 0
    while (-not $booted -and $waited -lt 300) {
        Start-Sleep -Seconds 5; $waited += 5
        if ((& $Adb shell getprop sys.boot_completed 2>&1 | Out-String).Trim() -eq "1") { $booted = $true }
        else { Write-Host "." -NoNewline -ForegroundColor DarkGray }
    }
    Write-Host ""
    if (-not $booted) { Die "Emulator did not finish booting within 5 minutes." }
    Ok "Emulator booted"
}

# Pin to one emulator serial so nothing can reach a physical phone
$serial = ((& $Adb devices | Select-String "^emulator-\d+" | Select-Object -First 1) -split "\s+")[0]
if (-not $serial) { Die "Could not identify the emulator serial." }
Ok "Target device: $serial"

# ----------------------------------------------------------------------------
Step 6 "Verifying the APK package name  [SAFETY GATE]"
# ----------------------------------------------------------------------------
if (-not (Test-Path $ApkPath)) { Die "Debug APK not found at $ApkPath" }

$bt = Get-ChildItem (Join-Path $Sdk "build-tools") -Directory -ErrorAction SilentlyContinue |
      Sort-Object Name -Descending | Select-Object -First 1
if (-not $bt) { Die "No build-tools found - cannot verify the APK. Refusing to install blind." }

$aapt  = Join-Path $bt.FullName "aapt.exe"
$aapt2 = Join-Path $bt.FullName "aapt2.exe"
$pkg   = $null

if (Test-Path $aapt) {
    $badging = & $aapt dump badging $ApkPath 2>&1 | Out-String
    if ($badging -match "package:\s+name='([^']+)'") { $pkg = $Matches[1] }
} elseif (Test-Path $aapt2) {
    $pkg = (& $aapt2 dump packagename $ApkPath 2>&1 | Out-String).Trim()
}

if (-not $pkg) { Die "Could not read the package name. Refusing to install blind." }
Info "APK declares: $pkg"
"APK PACKAGE: $pkg" | Out-File -FilePath $LogFile -Append -Encoding utf8

if ($pkg -eq $PROD_PACKAGE) { Die "This APK is PRODUCTION. Refusing to install. Nothing changed." }
if ($pkg -ne $DEV_PACKAGE)  { Die "Expected $DEV_PACKAGE but got '$pkg'. Refusing to install." }

Ok "Confirmed dev build - safe to install"

# ----------------------------------------------------------------------------
Step 7 "Checking which native modules the APK actually contains"
# ----------------------------------------------------------------------------
# The APK was built from 'dev-environment'. This branch may have added native
# deps since. If so the bundle will crash with "Cannot find native module ...".
Info "Listing native libraries baked into the APK"
$apkEntries = & $Adb -s $serial shell echo "" 2>&1  # no-op keeps adb warm
try {
    Add-Type -AssemblyName System.IO.Compression.FileSystem
    $zip = [System.IO.Compression.ZipFile]::OpenRead($ApkPath)
    $names = $zip.Entries | ForEach-Object { $_.FullName }
    $zip.Dispose()

    $hasCamera = ($names -match "camera").Count -gt 0
    $hasMlKit  = ($names -match "mlkit|text_recognition|textrecognition").Count -gt 0

    "APK native entries containing 'camera': $hasCamera" | Out-File -FilePath $LogFile -Append -Encoding utf8
    "APK native entries containing 'mlkit':  $hasMlKit"  | Out-File -FilePath $LogFile -Append -Encoding utf8

    if ($hasCamera) { Ok "Camera native code present" } else { Warn "No camera native code found in the APK - see note below" }
    if ($hasMlKit)  { Ok "ML Kit text recognition present" } else { Warn "No ML Kit native code found in the APK" }

    if (-not ($hasCamera -and $hasMlKit)) {
        Write-Host ""
        Warn "The APK may predate this branch's native dependencies."
        Warn "If the app crashes with 'Cannot find native module', that's why."
        Warn "Fix: rebuild the debug APK from a branch that has BOTH the dev"
        Warn "     config and the camera work. Do not reinstall production."
        Write-Host ""
    }
} catch {
    Warn "Could not inspect the APK contents: $_"
}

# ----------------------------------------------------------------------------
Step 8 "Installing the dev APK on the emulator"
# ----------------------------------------------------------------------------
$installed = & $Adb -s $serial shell pm list packages --user 0 2>&1 | Out-String

if ($installed -match [regex]::Escape($DEV_PACKAGE)) {
    Ok "$DEV_PACKAGE already installed on the emulator"
} else {
    Info "adb install (plain - no -r)"
    & $Adb -s $serial install $ApkPath
    if ($LASTEXITCODE -ne 0) { Die "adb install failed (exit $LASTEXITCODE)" }
    Ok "Installed $DEV_PACKAGE"
}

# ----------------------------------------------------------------------------
Step 9 "Forwarding port 8081"
# ----------------------------------------------------------------------------
& $Adb -s $serial reverse tcp:8081 tcp:8081
if ($LASTEXITCODE -ne 0) { Warn "adb reverse failed - you may need your LAN IP instead" }
else { Ok "Emulator localhost:8081 -> your PC's Metro" }

# ----------------------------------------------------------------------------
Step 10 "Starting Metro"
# ----------------------------------------------------------------------------
Push-Location $Repo
$branch = (& git rev-parse --abbrev-ref HEAD 2>&1 | Out-String).Trim()
Pop-Location
Info "Branch: $branch"
"BRANCH: $branch" | Out-File -FilePath $LogFile -Append -Encoding utf8

if ($branch -ne "feature/three-tab-camera-profile") {
    Warn "Not on feature/three-tab-camera-profile - the matte icons live there."
    Warn "I won't switch branches for you."
}

# Is something already listening on 8081? If so, leave it alone.
$metroUp = $false
try {
    $probe = New-Object System.Net.Sockets.TcpClient
    $probe.Connect("127.0.0.1", 8081)
    $metroUp = $probe.Connected
    $probe.Close()
} catch { $metroUp = $false }

if ($metroUp) {
    Ok "Metro is already running on port 8081 - reusing it"
    "METRO: already running, reused" | Out-File -FilePath $LogFile -Append -Encoding utf8
} elseif ($SkipMetro) {
    Info "Skipped (-SkipMetro)"
} else {
    $metroCmd = "`$env:ANDROID_HOME='$Sdk'; `$env:APP_VARIANT='dev'; cd '$Repo'; npx expo start --dev-client --lan"
    Start-Process powershell -ArgumentList @("-NoExit", "-Command", $metroCmd)
    Ok "Metro starting in a new window"
    Info "Warming up for 20 seconds..."
    Start-Sleep -Seconds 20
}

# ----------------------------------------------------------------------------
Step 11 "Launching PeggyBank Dev and capturing a log"
# ----------------------------------------------------------------------------
& $Adb -s $serial logcat -c 2>&1 | Out-Null
& $Adb -s $serial shell monkey -p $DEV_PACKAGE -c android.intent.category.LAUNCHER 1 | Out-Null
Ok "Launch intent sent"

Info "Capturing 30 seconds of logcat..."
$job = Start-Job -ScriptBlock {
    param($adb, $ser)
    & $adb -s $ser logcat -v brief 2>&1
} -ArgumentList $Adb, $serial

Start-Sleep -Seconds 30
Stop-Job $job | Out-Null
$logLines = Receive-Job $job 2>&1 | Out-String
Remove-Job $job -Force | Out-Null

$interesting = $logLines -split "`n" | Where-Object {
    $_ -match "ReactNative|ExpoModules|AndroidRuntime|FATAL|peggybank|Unable to|Cannot find|error|Exception"
} | Select-Object -First 120

"`n===== LOGCAT (filtered) =====" | Out-File -FilePath $LogFile -Append -Encoding utf8
$interesting | Out-File -FilePath $LogFile -Append -Encoding utf8

Ok "Log written to $LogFile"

# ----------------------------------------------------------------------------
Write-Host "`n=====================================================" -ForegroundColor White
Write-Host "  Done. Over to you." -ForegroundColor White
Write-Host "=====================================================" -ForegroundColor White
Write-Host ""
Write-Host "  In the emulator:" -ForegroundColor White
Write-Host "    * App loaded already?  You're finished."
Write-Host "    * Dev launcher showing?  Tap 'Enter URL manually'"
Write-Host "      and type:  http://localhost:8081"
Write-Host ""
Write-Host "  Look for the matte icons:" -ForegroundColor White
Write-Host "    Monthly Breakdown stats / Bills tabs / Goals / Settings sun+moon"
Write-Host ""
Write-Host "  Hot reload: edit a file, save, watch it update. Dev menu: Ctrl+M"
Write-Host ""
Write-Host "  If anything failed, paste dev-emulator-log.txt to Claude." -ForegroundColor Yellow
Write-Host "  Production PeggyBank on your phone was not touched." -ForegroundColor Green
Write-Host ""
