# deckrun - one-command installer for Windows (PowerShell)
#
#   irm https://raw.githubusercontent.com/arpitbbhayani/deckrun/master/install.ps1 | iex
#
# Installs deckrun globally from npm. If Node.js (>= 16) is missing or too
# old, it installs the Node.js LTS (via winget when available, otherwise by
# downloading the Node.js .msi), refreshes PATH, then installs deckrun.

$ErrorActionPreference = 'Stop'

$NodeMin = 16

function Write-Info  { Write-Host "deckrun $args" -ForegroundColor Cyan }
function Write-Ok    { Write-Host "✓ $args" -ForegroundColor Green }
function Write-Warn  { Write-Host "! $args" -ForegroundColor Yellow }

function Get-NodeMajor([string]$Version) {
    if ($Version -match '^v?(\d+)\.') { return [int]$Matches[1] }
    return 0
}

function Get-NodeVersion {
    $node = Get-Command node -ErrorAction SilentlyContinue
    if (-not $node) { return $null }
    try { return (node --version) } catch { return $null }
}

function Add-PathToSession([string]$Dir) {
    $env:Path = "$Dir;$env:Path"
}

# Persist to the per-user PATH so it survives new terminals without elevation.
function Add-PersistentPath([string]$Dir) {
    $userPath = [Environment]::GetEnvironmentVariable('Path', 'User')
    if ($userPath -and $userPath.Split(';') -contains $Dir) { return }
    $new = if ($userPath) { "$userPath;$Dir" } else { $Dir }
    [Environment]::SetEnvironmentVariable('Path', $new, 'User')
    $env:Path = "$Dir;$env:Path"
}

# ── Ensure Node.js is installed ──────────────────────────────────────────
$ver = Get-NodeVersion
if ($ver) {
    $major = Get-NodeMajor $ver
    if ($major -ge $NodeMin) {
        Write-Info "Node.js $ver detected."
    } else {
        Write-Warn "Found Node.js $ver; deckrun needs >= $NodeMin."
        $ver = $null
    }
}

if (-not $ver) {
    Write-Info 'Installing Node.js LTS automatically…'

    $installed = $false

    # 1) winget (cleanest, per-user capable)
    if (Get-Command winget -ErrorAction SilentlyContinue) {
        try {
            winget install --id OpenJS.NodeJS.LTS --scope user --silent --accept-package-agreements --accept-source-agreements | Out-Host
            $installed = $true
        } catch {
            Write-Warn "winget install failed ($($_.Exception.Message)); falling back to direct download."
        }
    }

    # 2) Direct .msi download fallback
    if (-not $installed) {
        $arch = if ($env:PROCESSOR_ARCHITECTURE -match 'ARM') { 'arm64' } else { 'x64' }
        $index = (Invoke-WebRequest -UseBasicParsing 'https://nodejs.org/dist/index.json').Content | ConvertFrom-Json
        # Pick the latest 22.x (LTS) entry that has an arch-named installer.
        $match = $index | Where-Object { $_.version -match '^v22\.' -and $_.files -contains "win-$arch/msi" } | Select-Object -First 1
        if (-not $match) {
            $match = $index | Select-Object -First 1
        }
        $version = $match.version
        $msi = "$env:TEMP\node-$version-$arch.msi"
        Write-Info "Downloading Node.js $version ($arch)…"
        Invoke-WebRequest -UseBasicParsing "https://nodejs.org/dist/$version/node-$version-$arch.msi" -OutFile $msi
        # msiexec installs machine-wide and typically needs elevation.
        try {
            Start-Process msiexec.exe -ArgumentList "/i `"$msi`" /qn /norestart" -Wait -Verb RunAs
        } catch {
            Start-Process msiexec.exe -ArgumentList "/i `"$msi`" /qn /norestart" -Wait
        }
        Remove-Item $msi -ErrorAction SilentlyContinue
    }

    # Refresh PATH to pick up the freshly installed node/npm.
    $newVer = Get-NodeVersion
    if (-not $newVer) {
        Add-PersistentPath (Join-Path $env:ProgramFiles 'nodejs')
        Add-PersistentPath (Join-Path $env:LOCALAPPDATA 'Programs\nodejs')
        $newVer = Get-NodeVersion
    }
    if (-not $newVer) {
        Write-Warn 'Node.js was installed but `node` is not visible yet.'
        Write-Warn 'Open a new PowerShell window and re-run this installer.'
        exit 1
    }
    Write-Ok "Node.js $newVer installed."
}

# ── Install deckrun ──────────────────────────────────────────────────────
Write-Info 'Installing deckrun globally via npm…'
npm install -g deckrun

# ── Verify ───────────────────────────────────────────────────────────────
if (Get-Command deckrun -ErrorAction SilentlyContinue) {
    $dv = deckrun --version 2>$null
    Write-Ok "deckrun $dv installed."
    Write-Host ''
    Write-Host "  deckrun           # open the editor" -ForegroundColor Cyan
    Write-Host "  deckrun slides.md # present a local file" -ForegroundColor Cyan
    Write-Host "  deckrun <url>     # present a public Markdown or HTML URL" -ForegroundColor Cyan
    Write-Host ''
} else {
    Write-Warn 'deckrun was installed but is not on your PATH.'
    Write-Warn 'Open a new terminal (or refresh your PATH) and run deckrun.'
}