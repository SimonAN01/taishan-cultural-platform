# Control-flow check with mocked installers. This is NOT a native Windows install test.
$ErrorActionPreference = 'Stop'
$source = [IO.File]::ReadAllText((Join-Path $PSScriptRoot '../scripts/start-windows.ps1'))
$original = Get-Location
$results = @()
try {
    foreach ($scenario in @('installed', 'missing')) {
        $fixture = Join-Path ([IO.Path]::GetTempPath()) ('taishan-launcher-' + [Guid]::NewGuid())
        New-Item -ItemType Directory -Force (Join-Path $fixture 'taishan/config') | Out-Null
        [IO.File]::WriteAllText((Join-Path $fixture 'package.json'), '{}')
        [IO.File]::WriteAllText((Join-Path $fixture 'package-lock.json'), '{}')
        [IO.File]::WriteAllText((Join-Path $fixture 'taishan/config/team.env'), '# test fixture; no credentials')
        Set-Location $fixture
        $global:toolCalls = @(); $global:npmCalls = @()
        $env:PROCESSOR_ARCHITECTURE = 'AMD64'
        function node.exe { $global:LASTEXITCODE = [int]($scenario -eq 'missing') }
        function py.exe { $global:LASTEXITCODE = [int]($scenario -eq 'missing') }
        function winget.exe { $global:toolCalls += $args[3]; $global:LASTEXITCODE = 0 }
        function Get-ItemProperty { if ($scenario -eq 'installed') { @{Installed=1} } else { @{Installed=0} } }
        function npm.cmd {
            $global:npmCalls += $args[0]
            if ($args[0] -eq 'ci') { New-Item -ItemType Directory -Force 'node_modules' | Out-Null }
            $global:LASTEXITCODE = 0
        }
        & ([scriptblock]::Create($source))
        if (($global:npmCalls -join ',') -ne 'ci,start') { throw 'Expected npm ci then npm start' }
        $expected = if ($scenario -eq 'missing') { 'OpenJS.NodeJS.LTS,Python.Python.3.12,Microsoft.VCRedist.2015+.x64' } else { '' }
        if (($global:toolCalls -join ',') -ne $expected) { throw 'Unexpected installer selection' }
        $results += @{scenario=$scenario;passed=$true;installer_calls=$global:toolCalls;npm_calls=$global:npmCalls}
        Set-Location $original
        Remove-Item -Recurse -Force $fixture
    }
    $results | ConvertTo-Json -Depth 4
} finally {
    Set-Location $original
}
