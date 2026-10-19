$ErrorActionPreference = 'Stop'
[Console]::OutputEncoding = New-Object System.Text.UTF8Encoding
$env:PYTHONUTF8 = '1'

function Refresh-Path {
    $env:Path = [Environment]::GetEnvironmentVariable('Path', 'Machine') + ';' + [Environment]::GetEnvironmentVariable('Path', 'User')
}
function Install-Tool([string]$Id) {
    if (-not (Get-Command winget.exe -ErrorAction SilentlyContinue)) {
        throw 'WinGet is missing. Install Microsoft App Installer, then run Start-Windows.cmd again. See docs/windows/README.md.'
    }
    Write-Host "Installing $Id using Microsoft WinGet. Windows may ask for installation permission."
    & winget.exe install --exact --id $Id --source winget --silent --accept-source-agreements --accept-package-agreements
    if ($LASTEXITCODE -ne 0) { throw "WinGet could not install $Id. Check the installer message and network, then retry." }
    Refresh-Path
}

try {
    if (-not (Test-Path 'package.json') -or -not (Test-Path 'taishan\config\team.env')) {
        throw 'The checkout is incomplete. Extract/clone the entire private repository before starting.'
    }
    if (-not [Environment]::Is64BitOperatingSystem -or $env:PROCESSOR_ARCHITECTURE -eq 'ARM64') {
        throw 'This launcher targets Windows 11 x64. ARM64 requires a separately verified Python package set.'
    }
    $nodeOK = $false
    if (Get-Command node.exe -ErrorAction SilentlyContinue) {
        & node.exe -e 'process.exit(Number(process.versions.node.split(String.fromCharCode(46))[0]) >= 22 ? 0 : 1)'
        $nodeOK = $LASTEXITCODE -eq 0
    }
    if (-not $nodeOK) { Install-Tool 'OpenJS.NodeJS.LTS' }
    $pythonOK = $false
    foreach ($candidate in @(@('py.exe', '-3.12'), @('python.exe'), @('python3.exe'))) {
        if (Get-Command $candidate[0] -ErrorAction SilentlyContinue) {
            $pythonArgs = @($candidate | Select-Object -Skip 1) + @('-c', 'import sys; sys.exit(sys.version_info[:2] != (3,12))')
            & $candidate[0] @pythonArgs
            if ($LASTEXITCODE -eq 0) { $pythonOK = $true; break }
        }
    }
    if (-not $pythonOK) { Install-Tool 'Python.Python.3.12' }
    if (-not (Get-Command npm.cmd -ErrorAction SilentlyContinue)) {
        throw 'Node.js installation finished but PATH is not ready. Close this window and start again.'
    }
    # ONNX Runtime's optional CPU modules may require Microsoft's C++ runtime.
    $vcRuntime = Get-ItemProperty 'HKLM:\SOFTWARE\Microsoft\VisualStudio\14.0\VC\Runtimes\x64' -ErrorAction SilentlyContinue
    if (-not $vcRuntime -or $vcRuntime.Installed -ne 1) { Install-Tool 'Microsoft.VCRedist.2015+.x64' }
    $lock = (Get-FileHash 'package-lock.json' -Algorithm SHA256).Hash
    $marker = 'node_modules\.taishan-node-lock'
    if (-not (Test-Path $marker) -or (Get-Content $marker -Raw) -ne $lock) {
        Write-Host 'Installing the locked frontend dependencies...'
        & npm.cmd ci
        if ($LASTEXITCODE -ne 0) { throw 'npm ci failed. Check network access to the npm registry, then retry.' }
        [IO.File]::WriteAllText((Join-Path (Get-Location) $marker), $lock)
    }
    Write-Host 'Starting the complete system. Keep this window open; press Ctrl+C to stop.'
    Write-Host 'When READY appears, open http://127.0.0.1:18605/experience/'
    & npm.cmd start -- --open
    if ($LASTEXITCODE -ne 0) { throw 'The system could not start. Check the backend error above; API keys are already provided.' }
} catch {
    Write-Host ('ERROR: ' + $_.Exception.Message) -ForegroundColor Red
    exit 1
}
