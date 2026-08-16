#!/usr/bin/env node

const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawn } = require('child_process');

const args = process.argv.slice(2);

if (args.length === 0 || args.includes('-h') || args.includes('--help')) {
  console.log(`
🎬 Stream P2P Efímero (pelis-proyect)
=====================================
Uso:
  node stream.js "<magnet_link_o_torrent>" [flags_de_webtorrent]

Ejemplos:
  node stream.js "magnet:?xt=urn:btih:..."
  node stream.js "magnet:?xt=urn:btih:..." --port 8080
  node stream.js "magnet:?xt=urn:btih:..." --select 0
  node stream.js "magnet:?xt=urn:btih:..." --vlc

Flags comunes de WebTorrent:
  --port <num>      Puerto para el servidor HTTP (por defecto: 8000)
  --select <idx>    Índice del archivo a descargar (útil para packs/series)
  --vlc             Abre automáticamente en VLC (si está instalado)
  --mpv             Abre automáticamente en MPV (si está instalado)
  --list            Lista los archivos incluidos en el torrent
  --quiet           Oculta la barra de progreso
  `);
  process.exit(0);
}

// Crear directorio temporal único y aislado
const tempPrefix = path.join(os.tmpdir(), 'p2p-stream-');
const tempDir = fs.mkdtempSync(tempPrefix);

let cleanedUp = false;
function cleanup() {
  if (cleanedUp) return;
  cleanedUp = true;
  console.log('\n🛑 Cerrando sesión de streaming...');
  try {
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
      console.log('✅ Archivos temporales eliminados. Espacio liberado.');
    }
  } catch (err) {
    console.error('⚠️ No se pudo eliminar la carpeta temporal por completo:', err.message);
  }
}

// Capturar señales de salida del sistema
process.on('SIGINT', () => { cleanup(); process.exit(0); });
process.on('SIGTERM', () => { cleanup(); process.exit(0); });
process.on('exit', () => cleanup());
process.on('uncaughtException', (err) => {
  console.error('Error inesperado:', err);
  cleanup();
  process.exit(1);
});

// Comprobar flags por defecto si el usuario no especificó puerto ni reproductor
const hasPort = args.some(arg => arg === '--port' || arg.startsWith('--port='));
const hasHttp = args.includes('--http');
const hasPlayer = args.some(arg => ['--vlc', '--mpv', '--airplay', '--chromecast', '--dlna', '--list'].includes(arg));

const finalArgs = [...args, '--out', tempDir];

if (!hasHttp && !hasPlayer) {
  finalArgs.push('--http');
}
if (!hasPort && (hasHttp || !hasPlayer)) {
  finalArgs.push('--port', '8000');
}

// Determinar ejecutable de webtorrent
const binPath = path.join(__dirname, 'node_modules', '.bin', process.platform === 'win32' ? 'webtorrent.cmd' : 'webtorrent');
const executable = fs.existsSync(binPath) ? binPath : 'webtorrent';

console.log('🚀 Iniciando servidor P2P efímero...');
console.log(`📂 Carpeta temporal: ${tempDir}`);
if (!hasPlayer) {
  const portArgIdx = finalArgs.indexOf('--port');
  const port = portArgIdx !== -1 ? finalArgs[portArgIdx + 1] : '8000';
  console.log(`📡 URL de reproducción: http://127.0.0.1:${port}`);
  console.log(`💡 Abre esta URL en VLC, MPV o en tu navegador móvil.`);
}
console.log('--------------------------------------------------\n');

const child = spawn(executable, finalArgs, {
  stdio: 'inherit',
  shell: process.platform === 'win32'
});

child.on('error', (err) => {
  if (err.code === 'ENOENT') {
    console.error('\n❌ No se encontró "webtorrent". Ejecuta primero: npm install');
  } else {
    console.error('\n❌ Error al ejecutar:', err.message);
  }
  cleanup();
  process.exit(1);
});

child.on('close', (code) => {
  cleanup();
  process.exit(code || 0);
});
