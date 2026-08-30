<#
    PeggyBank Dev - build a STANDALONE APK
    =======================================
    Produces one installable .apk with all the JavaScript baked inside.
    It runs with no PC, no Metro, no Wi-Fi, forever.

    Needs NO adb, NO emulator, NO drivers, NO cmdline-tools.

    SAFETY - refuses to build anything whose applicationId is not
    com.spall.peggybank.dev, so it can never overwrite production.

    Output is copied to your Desktop as PeggyBankDev.apk
#>

# adb/gradle write status chatter to stderr; "Stop" would treat that as fatal.
$ErrorActionPreference = "Continue"

try { Stop-Transcript | Out-Null } catch { }
Start-Transcript -Path "C:\Users\spall\Documents\PeggyBank\build-standalone-log.txt" -Force | Out-Null

$DEV_PACKAGE  = "com.spall.peggybank.dev"
$PROD_PACKAGE = "com.spall.peggybank"

$Repo      = "C:\Users\spall\Documents\PeggyBank"
$Sdk       = "C:\Users\spall\AppData\Local\Android\Sdk"
$AndroidDir= Join-Path $Repo "android"
$Gradlew   = Join-Path $AndroidDir "gradlew.bat"
$BuildFile = Join-Path $AndroidDir "app\build.gradle"
$OutApk    = Join-Path $AndroidDir "app\build\outputs\apk\release\app-release.apk"
$Desktop   = [Environment]::GetFolderPath("Desktop")
$FinalApk  = Join-Path $Desktop "PeggyBankDev.apk"

function Step($n,$m){ Write-Host "`n[$n] $m" -ForegroundColor Cyan }
function Ok($m)  { Write-Host "    OK   $m" -ForegroundColor Green }
function Info($m){ Write-Host "         $m" -ForegroundColor Gray }
function Warn($m){ Write-Host "    WARN $m" -ForegroundColor Yellow }
function Die($m) {
    Write-Host "`n    STOP $m`n" -ForegroundColor Red
    try { Stop-Transcript | Out-Null } catch { }
    exit 1
}

Write-Host "`n=====================================================" -ForegroundColor White
Write-Host "  PeggyBank Dev - standalone APK build" -ForegroundColor White
Write-Host "=====================================================" -ForegroundColor White

# ---------------------------------------------------------------------------
Step 1 "Checking the project"
# ---------------------------------------------------------------------------
if (-not (Test-Path $Gradlew))   { Die "gradlew.bat not found at $Gradlew" }
if (-not (Test-Path $BuildFile)) { Die "build.gradle not found at $BuildFile" }
Ok "Gradle project found"

Push-Location $Repo
$branch = (& git rev-parse --abbrev-ref HEAD 2>$null | Out-String).Trim()
Pop-Location
Info "Branch: $branch  (the matte icons live on feature/three-tab-camera-profile)"

# ---------------------------------------------------------------------------
Step 2 "SAFETY GATE - which app is this going to build?"
# ---------------------------------------------------------------------------
$gradleText = Get-Content $BuildFile -Raw
$appId = $null
if ($gradleText -match "applicationId\s+['""]([^'""]+)['""]") { $appId = $Matches[1] }

if (-not $appId) { Die "Could not read applicationId from build.gradle. Refusing to build blind." }
Info "build.gradle applicationId = $appId"

if ($appId -eq $PROD_PACKAGE) {
    Die "This project is configured to build PRODUCTION ($PROD_PACKAGE). Refusing. Nothing was changed."
}
if ($appId -ne $DEV_PACKAGE) {
    Die "Expected $DEV_PACKAGE but build.gradle says '$appId'. Refusing to build."
}
Ok "Confirmed: builds $DEV_PACKAGE - installs alongside your real PeggyBank"

# ---------------------------------------------------------------------------
Step 3 "Building (this takes 5-15 minutes the first time)"
# ---------------------------------------------------------------------------
Info "Gradle will print a LOT. That's normal. Let it run."
Info "It bundles all the JavaScript into the APK, so no PC is needed later."
Write-Host ""

$env:ANDROID_HOME     = $Sdk
$env:ANDROID_SDK_ROOT = $Sdk
$env:APP_VARIANT      = "dev"

if (Test-Path $OutApk) { Remove-Item $OutApk -Force -ErrorAction SilentlyContinue }

Push-Location $AndroidDir
& $Gradlew assembleRelease --no-daemon
$gradleExit = $LASTEXITCODE
Pop-Location

if ($gradleExit -ne 0) {
    Warn "Gradle failed with exit code $gradleExit."
    Warn "Scroll up for the first line starting with 'FAILURE' or 'error:'."
    Warn "If it mentions JAVA_HOME or a JDK, that's the likely cause."
    Die "Build failed."
}
Ok "Gradle finished"

# ---------------------------------------------------------------------------
Step 4 "Verifying the APK that came out"
# ---------------------------------------------------------------------------
if (-not (Test-Path $OutApk)) { Die "Expected an APK at $OutApk but it isn't there." }

$bt = Get-ChildItem (Join-Path $Sdk "build-tools") -Directory -ErrorAction SilentlyContinue |
      Sort-Object Name -Descending | Select-Object -First 1

$pkg = $null
if ($bt) {
    $aapt  = Join-Path $bt.FullName "aapt.exe"
    $aapt2 = Join-Path $bt.FullName "aapt2.exe"
    if (Test-Path $aapt) {
        $badging = & $aapt dump badging $OutApk 2>$null | Out-String
        if ($badging -match "package:\s+name='([^']+)'") { $pkg = $Matches[1] }
    } elseif (Test-Path $aapt2) {
        $pkg = (& $aapt2 dump packagename $OutApk 2>$null | Out-String).Trim()
    }
}

if ($pkg) {
    Info "APK declares: $pkg"
    if ($pkg -eq $PROD_PACKAGE) { Die "The built APK is PRODUCTION. Not copying it anywhere. Delete it." }
    if ($pkg -ne $DEV_PACKAGE)  { Die "Built APK says '$pkg', expected $DEV_PACKAGE. Refusing." }
    Ok "Verified $DEV_PACKAGE"
} else {
    Warn "Couldn't verify the package name (no aapt), but build.gradle was checked in step 2."
}

$sizeMb = [math]::Round((Get-Item $OutApk).Length / 1MB, 1)
Ok "APK built - $sizeMb MB"

# ---------------------------------------------------------------------------
Step 5 "Filing it where you can find it"
# ---------------------------------------------------------------------------
$stamp     = Get-Date -Format "yyyy-MM-dd_HHmm"
$ApkFolder = Join-Path $Desktop "PeggyBank APKs"

if (-not (Test-Path $ApkFolder)) {
    New-Item -ItemType Directory -Path $ApkFolder -Force | Out-Null
    Info "Created $ApkFolder"
}

# ONE place, ONE name. This is always the newest build - the only file
# you ever need to tap on your phone.
$LatestApk = Join-Path $ApkFolder "PeggyBankDev.apk"
Copy-Item $OutApk $LatestApk -Force
Ok "Desktop\PeggyBank APKs\PeggyBankDev.apk  <-- always the newest"

# A dated copy alongside it, purely so you can roll back if a build breaks.
$datedName = "archive_PeggyBankDev_$stamp.apk"
Copy-Item $OutApk (Join-Path $ApkFolder $datedName) -Force
Info "Backup copy: $datedName"

# Clear out the old loose Desktop copy - it caused confusion by existing
# in a second place under a second name.
if (Test-Path $FinalApk) {
    Remove-Item $FinalApk -Force -ErrorAction SilentlyContinue
    Info "Removed the stray Desktop copy (everything lives in the folder now)"
}

# --- Google Drive, if Drive for Desktop is installed ---------------------
$driveTargets = @()
foreach ($d in @("G:\My Drive", "H:\My Drive", "I:\My Drive",
                 (Join-Path $env:USERPROFILE "Google Drive"),
                 (Join-Path $env:USERPROFILE "My Drive"))) {
    if (Test-Path $d) { $driveTargets += $d }
}

if ($driveTargets.Count -gt 0) {
    $gd = Join-Path $driveTargets[0] "PeggyBank APKs"
    if (-not (Test-Path $gd)) { New-Item -ItemType Directory -Path $gd -Force | Out-Null }
    Copy-Item $OutApk (Join-Path $gd $apkName) -Force
    Ok "Copied to Google Drive: $gd"
} else {
    Info "Google Drive for Desktop not found - skipping."
    Info "Install it and this script will start copying there automatically."
    Info "Meanwhile the Desktop folder syncs via OneDrive, which works the same."
}

# --- Housekeeping: these are ~184 MB each, don't let them pile up --------
$keep = 2
$old  = Get-ChildItem $ApkFolder -Filter "archive_PeggyBankDev_*.apk" -ErrorAction SilentlyContinue |
        Sort-Object LastWriteTime -Descending | Select-Object -Skip $keep

if ($old) {
    foreach ($f in $old) {
        Remove-Item $f.FullName -Force -ErrorAction SilentlyContinue
        Info "Removed old build: $($f.Name)"
    }
    Ok "Kept the newest $keep builds"
}

Write-Host "`n=====================================================" -ForegroundColor White
Write-Host "  Done. Getting it onto your phone:" -ForegroundColor White
Write-Host "=====================================================" -ForegroundColor White
Write-Host ""
Write-Host "  Everything is in ONE place now:" -ForegroundColor White
Write-Host "    Desktop\PeggyBank APKs\PeggyBankDev.apk" -ForegroundColor Green
Write-Host "  Same name every single build. Nothing to hunt for."
Write-Host ""
Write-Host "  FROM YOUR PHONE, ANYWHERE:" -ForegroundColor White
Write-Host "    1. Open the OneDrive app on your phone"
Write-Host "    2. Files > Desktop > PeggyBank APKs"
Write-Host "    3. Tap PeggyBankDev.apk, download it, tap it again"
Write-Host "    4. Allow installing from this source, then Install"
Write-Host ""
Write-Host "  BY CABLE: drag the .apk to the phone's Download folder,"
Write-Host "  then open My Files > Downloads on the phone and tap it."
Write-Host ""
Write-Host "  (Too big to email - 184 MB.)" -ForegroundColor Gray
Write-Host ""
Write-Host "  It installs as 'PeggyBank Dev', separate from your real"
Write-Host "  PeggyBank, with its own data. It needs no PC, ever." -ForegroundColor Green
Write-Host ""

try { Stop-Transcript | Out-Null } catch { }
