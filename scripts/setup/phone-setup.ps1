<#
    PeggyBank Dev - phone setup over USB
    =====================================
    Answers the open question and fixes it in one pass:
      1. Is the phone visible to adb?
      2. Is com.spall.peggybank.dev actually installed?
      3. If not, install it (after verifying the APK is NOT production)
      4. adb reverse 8081 so the phone can use http://localhost:8081
      5. Launch PeggyBank Dev

    SAFETY - refuses to:
      * install, uninstall or touch com.spall.peggybank (production)
      * install any APK whose package is not com.spall.peggybank.dev
      * use "adb install -r"
      * target an emulator instead of the phone

    Writes phone-setup-log.txt in this folder.
#>

# NOTE: deliberately NOT "Stop". adb writes ordinary status chatter
# ("* daemon not running; starting now...") to stderr, and "Stop" turns
# that into a fatal error. Exit codes are checked explicitly instead.
$ErrorActionPreference = "Continue"

try { Stop-Transcript | Out-Null } catch { }
Start-Transcript -Path "C:\Users\spall\Documents\PeggyBank\phone-setup-log.txt" -Force | Out-Null

$DEV_PACKAGE  = "com.spall.peggybank.dev"
$PROD_PACKAGE = "com.spall.peggybank"

$Sdk     = "C:\Users\spall\AppData\Local\Android\Sdk"
$Repo    = "C:\Users\spall\Documents\PeggyBank"
$ApkPath = Join-Path $Repo "android\app\build\outputs\apk\debug\app-debug.apk"
$Adb     = Join-Path $Sdk "platform-tools\adb.exe"

function Step($n, $m) { Write-Host "`n[$n] $m" -ForegroundColor Cyan }
function Ok($m)       { Write-Host "    OK   $m" -ForegroundColor Green }
function Info($m)     { Write-Host "         $m" -ForegroundColor Gray }
function Warn($m)     { Write-Host "    WARN $m" -ForegroundColor Yellow }
function Die($m) {
    Write-Host "`n    STOP $m`n" -ForegroundColor Red
    try { Stop-Transcript | Out-Null } catch { }
    exit 1
}

Write-Host "`n=====================================================" -ForegroundColor White
Write-Host "  PeggyBank Dev - phone setup over USB" -ForegroundColor White
Write-Host "=====================================================" -ForegroundColor White

# ---------------------------------------------------------------------------
Step 1 "Finding adb"
# ---------------------------------------------------------------------------
if (-not (Test-Path $Adb)) { Die "adb.exe not found at $Adb" }
Ok "adb found"

# Full restart of the adb daemon. Enabling USB debugging while the daemon
# is already running often leaves it blind to the device until it restarts.
Info "Restarting the adb daemon..."
& $Adb kill-server 2>$null | Out-Null
Start-Sleep -Seconds 2
& $Adb start-server 2>$null | Out-Null
Start-Sleep -Seconds 2

# ---------------------------------------------------------------------------
Step 2 "Looking for your phone"
# ---------------------------------------------------------------------------
Write-Host ""
Write-Host "    >>> LOOK AT YOUR PHONE NOW <<<" -ForegroundColor Yellow
Write-Host "    If a popup says 'Allow USB debugging?' -" -ForegroundColor Yellow
Write-Host "    tick 'Always allow' and tap ALLOW." -ForegroundColor Yellow
Write-Host ""
Info "Watching for the phone for 40 seconds..."

$phone       = $null
$unauthorized = $false
$devicesRaw  = ""

for ($i = 0; $i -lt 20; $i++) {
    $devicesRaw = & $Adb devices 2>$null | Out-String

    foreach ($line in ($devicesRaw -split "`n")) {
        if ($line -match "^(\S+)\s+device\s*$" -and $line -notmatch "^emulator-") {
            $phone = $Matches[1]
            break
        }
    }
    if ($phone) { break }

    if ($devicesRaw -match "unauthorized") {
        if (-not $unauthorized) {
            Write-Host ""
            Warn "Phone seen but NOT AUTHORIZED - tap ALLOW on the phone now."
            $unauthorized = $true
        }
    }

    Write-Host "." -NoNewline -ForegroundColor DarkGray
    Start-Sleep -Seconds 2
}
Write-Host ""
Write-Host $devicesRaw

if (-not $phone) {
    if ($devicesRaw -match "unauthorized") {
        Warn "Phone is connected but NOT AUTHORIZED."
        Warn "Look at the phone screen - there should be a popup:"
        Warn "  'Allow USB debugging?'  -> tick 'Always allow' -> ALLOW"
        Warn "Then run this again."
        Die "Waiting on the USB debugging prompt on your phone."
    }
    if ($devicesRaw -match "offline") {
        Warn "Phone shows as 'offline'. Unplug, replug, and unlock the screen."
        Die "Phone offline."
    }
    Warn "Still no phone after 40 seconds."
    Warn ""
    Warn "USB debugging is ON and the USB mode is right, so the most likely"
    Warn "cause now is a missing ADB driver on Windows (MTP works, adb doesn't)."
    Warn ""
    Warn "Try, in this order:"
    Warn "  1. On the phone: Developer options > 'Revoke USB debugging"
    Warn "     authorizations', then unplug/replug and watch for the popup"
    Warn "  2. Toggle USB debugging OFF then ON, then replug"
    Warn "  3. Try a different USB port (prefer one directly on the PC, not a hub)"
    Warn "  4. Install the Samsung USB driver for Windows, then replug"
    Die "No device."
}

Ok "Phone detected: $phone"

# ---------------------------------------------------------------------------
Step 3 "What PeggyBank apps are actually installed?"   [THE OPEN QUESTION]
# ---------------------------------------------------------------------------
$pkgsRaw = & $Adb -s $phone shell pm list packages --user 0 2>&1 | Out-String
$peggy   = ($pkgsRaw -split "`n") | Where-Object { $_ -match "peggybank" }

Write-Host ""
if ($peggy) {
    Write-Host "    Found on the phone:" -ForegroundColor White
    $peggy | ForEach-Object { Write-Host "      $($_.Trim())" -ForegroundColor White }
} else {
    Write-Host "    No PeggyBank packages found at all." -ForegroundColor Yellow
}
Write-Host ""

$hasDev  = $pkgsRaw -match [regex]::Escape($DEV_PACKAGE)
$hasProd = $pkgsRaw -match [regex]::Escape($PROD_PACKAGE)

if ($hasProd) { Ok "Production PeggyBank present (will NOT be touched)" }
if ($hasDev)  { Ok "PeggyBank Dev is installed" }
else          { Warn "PeggyBank Dev is NOT installed - will install it" }

# ---------------------------------------------------------------------------
Step 4 "Installing PeggyBank Dev (only if missing)"
# ---------------------------------------------------------------------------
if ($hasDev) {
    Info "Already installed - skipping"
} else {
    if (-not (Test-Path $ApkPath)) {
        Warn "No debug APK at $ApkPath"
        Die "Nothing to install. The APK needs rebuilding."
    }

    # SAFETY GATE - verify the package before installing anything
    $bt = Get-ChildItem (Join-Path $Sdk "build-tools") -Directory -ErrorAction SilentlyContinue |
          Sort-Object Name -Descending | Select-Object -First 1
    if (-not $bt) { Die "No build-tools - cannot verify the APK. Refusing to install blind." }

    $aapt  = Join-Path $bt.FullName "aapt.exe"
    $aapt2 = Join-Path $bt.FullName "aapt2.exe"
    $pkg   = $null

    if (Test-Path $aapt) {
        $badging = & $aapt dump badging $ApkPath 2>&1 | Out-String
        if ($badging -match "package:\s+name='([^']+)'") { $pkg = $Matches[1] }
    } elseif (Test-Path $aapt2) {
        $pkg = (& $aapt2 dump packagename $ApkPath 2>&1 | Out-String).Trim()
    }

    if (-not $pkg) { Die "Could not read the APK package name. Refusing to install blind." }
    Info "APK declares: $pkg"

    if ($pkg -eq $PROD_PACKAGE) { Die "That APK is PRODUCTION. Refusing to install. Nothing changed." }
    if ($pkg -ne $DEV_PACKAGE)  { Die "Expected $DEV_PACKAGE, got '$pkg'. Refusing to install." }

    Ok "Verified dev build - installing"
    & $Adb -s $phone install $ApkPath
    if ($LASTEXITCODE -ne 0) { Die "adb install failed (exit $LASTEXITCODE)" }
    Ok "Installed"
}

# ---------------------------------------------------------------------------
Step 5 "Tunnelling port 8081 down the USB cable"
# ---------------------------------------------------------------------------
# This is the big one: the phone's own localhost:8081 now reaches your PC.
# No Wi-Fi, no firewall, no IP address.
& $Adb -s $phone reverse --remove-all 2>&1 | Out-Null
& $Adb -s $phone reverse tcp:8081 tcp:8081
if ($LASTEXITCODE -ne 0) { Warn "adb reverse failed - fall back to http://192.168.2.92:8081" }
else { Ok "Phone's localhost:8081 now points at your PC" }

# ---------------------------------------------------------------------------
Step 6 "Is Metro actually running?"
# ---------------------------------------------------------------------------
$metroUp = $false
try {
    $probe = New-Object System.Net.Sockets.TcpClient
    $probe.Connect("127.0.0.1", 8081)
    $metroUp = $probe.Connected
    $probe.Close()
} catch { $metroUp = $false }

if ($metroUp) { Ok "Metro is up on 8081" }
else { Warn "Metro is NOT running - start START-METRO.cmd first, then re-run this" }

# ---------------------------------------------------------------------------
Step 7 "Launching PeggyBank Dev on the phone"
# ---------------------------------------------------------------------------
& $Adb -s $phone shell monkey -p $DEV_PACKAGE -c android.intent.category.LAUNCHER 1 2>&1 | Out-Null
Ok "Launch sent - look at your phone"

Write-Host "`n=====================================================" -ForegroundColor White
Write-Host "  Now on the phone:" -ForegroundColor White
Write-Host "=====================================================" -ForegroundColor White
Write-Host ""
Write-Host "   If the dev launcher appears, tap 'Enter URL manually'"
Write-Host "   and enter:"
Write-Host ""
Write-Host "        http://localhost:8081" -ForegroundColor Green
Write-Host ""
Write-Host "   (localhost - NOT the 192.168 address. The cable handles it.)"
Write-Host ""
Write-Host "  Production PeggyBank was not touched." -ForegroundColor Green
Write-Host ""

try { Stop-Transcript | Out-Null } catch { }
