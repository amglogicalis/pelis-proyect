<#
.SYNOPSIS
    Script de Streaming P2P Efímero para Windows (PowerShell)
.EXAMPLE
    .\stream.ps1 "magnet:?xt=urn:btih:..."
    .\stream.ps1 "magnet:?xt=urn:btih:..." --port 8080
    .\stream.ps1 "magnet:?xt=urn:btih:..." --vlc
#>

param(
    [Parameter(Position=0, Mandatory=$false)]
    [string]$MagnetLink,
    [Parameter(ValueFromRemainingArguments=$true)]
    [string[]]$ExtraArgs
)

if (-not $MagnetLink -or $MagnetLink -eq "-h" -or $MagnetLink -eq "--help") {
    Write-Host "🎬 Uso: .\stream.ps1 `"<magnet_link_o_torrent>`" [flags_opcionales]" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "Ejemplos:"
    Write-Host "  .\stream.ps1 `"magnet:?xt=urn:btih:...`""
    Write-Host "  .\stream.ps1 `"magnet:?xt=urn:btih:...`" --select 0"
    Write-Host "  .\stream.ps1 `"magnet:?xt=urn:btih:...`" --vlc"
    exit 0
}

$TempDir = Join-Path $env:TEMP ("p2p-stream-" + [System.Guid]::NewGuid().ToString().Substring(0,8))
New-Item -ItemType Directory -Path $TempDir -Force | Out-Null

function Cleanup {
    Write-Host "`n🛑 Cerrando sesión y purgando almacenamiento temporal..." -ForegroundColor Yellow
    if (Test-Path $TempDir) {
        Remove-Item -Recurse -Force $TempDir -ErrorAction SilentlyContinue
        Write-Host "✅ Directorio temporal eliminado. Disco limpio." -ForegroundColor Green
    }
}

try {
    Write-Host "🚀 Iniciando servidor P2P efímero..." -ForegroundColor Green
    Write-Host "📂 Carpeta temporal: $TempDir" -ForegroundColor DarkGray
    Write-Host "📡 Servidor HTTP: http://127.0.0.1:8000" -ForegroundColor Cyan
    Write-Host "--------------------------------------------------" -ForegroundColor DarkGray

    $cmdArgs = @($MagnetLink) + $ExtraArgs + @("--out", $TempDir, "--port", "8000")
    
    $localBin = Join-Path $PSScriptRoot "node_modules\.bin\webtorrent.cmd"
    if (Test-Path $localBin) {
        & $localBin $cmdArgs
    } else {
        & npx -y webtorrent-cli $cmdArgs
    }
} finally {
    Cleanup
}
