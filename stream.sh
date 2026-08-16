#!/bin/bash

# ==============================================================================
# Script de Streaming P2P Efímero (Termux / Linux / macOS)
# ==============================================================================

if [ -z "$1" ] || [ "$1" = "-h" ] || [ "$1" = "--help" ]; then
    echo "🎬 Uso: $0 \"<magnet_link_o_torrent>\" [flags_opcionales]"
    echo ""
    echo "Ejemplos:"
    echo "  $0 \"magnet:?xt=urn:btih:...\""
    echo "  $0 \"magnet:?xt=urn:btih:...\" --select 0"
    echo "  $0 \"magnet:?xt=urn:btih:...\" --port 8080"
    echo "  $0 \"magnet:?xt=urn:btih:...\" --vlc"
    exit 0
fi

# Directorio temporal seguro
TEMP_DIR=$(mktemp -d 2>/dev/null || mktemp -d -t 'p2p-stream')

cleanup() {
    echo -e "\n🛑 Deteniendo streaming y eliminando datos temporales..."
    rm -rf "$TEMP_DIR"
    echo "✅ Directorio temporal purgado. Almacenamiento limpio."
    exit 0
}

# Capturar señales de cierre para limpieza garantizada
trap cleanup SIGINT SIGTERM EXIT

# Localizar webtorrent (local en node_modules o global)
if [ -f "./node_modules/.bin/webtorrent" ]; then
    WEBTORRENT_BIN="./node_modules/.bin/webtorrent"
else
    WEBTORRENT_BIN="webtorrent"
fi

if ! command -v "$WEBTORRENT_BIN" &> /dev/null && [ ! -f "$WEBTORRENT_BIN" ]; then
    echo "❌ webtorrent no encontrado. Ejecuta 'npm install' o 'npm i -g webtorrent-cli'."
    exit 1
fi

echo "🚀 Iniciando servidor P2P efímero..."
echo "📂 Almacenamiento temporal: $TEMP_DIR"
echo "📡 Reproductor de red: http://127.0.0.1:8000"
echo "--------------------------------------------------"

"$WEBTORRENT_BIN" "$@" --out "$TEMP_DIR" --http --port 8000
