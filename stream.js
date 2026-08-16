#!/usr/bin/env node

require('./patch-deps.js');
const fs = require('fs');
const os = require('os');
const path = require('path');
const readline = require('readline');
const { spawn } = require('child_process');

let WebTorrent = null;
async function getWebTorrent() {
  if (!WebTorrent) {
    const mod = await import('webtorrent');
    WebTorrent = mod.default || mod;
  }
  return WebTorrent;
}

const rawArgs = process.argv.slice(2);

// Formatear tamaño de archivo en bytes a B/KB/MB/GB
function formatBytes(bytes, decimals = 2) {
  if (!bytes || bytes === 0) return '0 Bytes';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

// Mostrar ayuda
function showHelp() {
  console.log(`
🎬 Stream P2P Efímero (pelis-proyect)
=====================================
Uso:
  node stream.js "<magnet_link_o_torrent>" [flags]

Flags de control y selección:
  --select <idx|all>   Índice del archivo a reproducir (si no se especifica, se muestra el selector interactivo)
  --list               Muestra los archivos del torrent y sale
  --port <num>         Puerto del servidor HTTP local (por defecto: 8000)
  --keep               Desactiva el auto-purge (conserva los archivos temporales al salir)
  --vlc                Abre automáticamente en VLC (si está instalado en PC)
  --mpv                Abre automáticamente en MPV (si está instalado en PC)

Flags de Almacenamiento Cloud (Estrategias A / Drive):
  --rolla              Descarga y sube el archivo a Rolla Storage Engine (GitHub Releases CDN) con chunking
  --ball <nombre>      Nombre de la Rolla-Ball / Bucket (por defecto: 'pelis-stream')
  --drive              Sube el archivo procesado a Google Drive

Ejemplos:
  node stream.js "magnet:?xt=urn:btih:..."
  node stream.js "magnet:?xt=urn:btih:..." --select 0 --vlc
  node stream.js "magnet:?xt=urn:btih:..." --select 1 --rolla --ball "series-hd"
  `);
  process.exit(0);
}

if (rawArgs.length === 0 || rawArgs.includes('-h') || rawArgs.includes('--help')) {
  showHelp();
}

// Extraer el enlace de torrent / magnet
const magnet = rawArgs.find(arg => !arg.startsWith('--') && !arg.startsWith('-'));
if (!magnet) {
  console.error('❌ Error: Debes proporcionar un magnet link o ruta de archivo .torrent.');
  process.exit(1);
}

// Analizar flags
const isListOnly = rawArgs.includes('--list');
const keepFiles = rawArgs.includes('--keep');
const isRolla = rawArgs.includes('--rolla') || rawArgs.includes('--save-rolla');
const isDrive = rawArgs.includes('--drive') || rawArgs.includes('--save-drive');
const isVlc = rawArgs.includes('--vlc');
const isMpv = rawArgs.includes('--mpv');

let selectArg = null;
const selectIdx = rawArgs.indexOf('--select');
if (selectIdx !== -1 && rawArgs[selectIdx + 1]) {
  selectArg = rawArgs[selectIdx + 1];
}

let port = '8000';
const portIdx = rawArgs.indexOf('--port');
if (portIdx !== -1 && rawArgs[portIdx + 1]) {
  port = rawArgs[portIdx + 1];
}

let ballName = 'pelis-stream';
const ballIdx = rawArgs.indexOf('--ball');
if (ballIdx !== -1 && rawArgs[ballIdx + 1]) {
  ballName = rawArgs[ballIdx + 1];
}

// Directorio temporal con auto-purge
const tempPrefix = path.join(os.tmpdir(), 'p2p-stream-');
const tempDir = fs.mkdtempSync(tempPrefix);

let isCleaning = false;
function cleanup() {
  if (isCleaning) return;
  isCleaning = true;
  if (!keepFiles) {
    console.log('\n🛑 Limpiando búfer y eliminando archivos temporales (Auto-Purge)...');
    try {
      if (fs.existsSync(tempDir)) {
        fs.rmSync(tempDir, { recursive: true, force: true });
        console.log('✅ Espacio en disco 100% liberado.');
      }
    } catch (err) {
      console.error('⚠️ Aviso al purgar carpeta temporal:', err.message);
    }
  } else {
    console.log(`\n💾 Archivos conservados en: ${tempDir}`);
  }
}

process.on('SIGINT', () => { cleanup(); process.exit(0); });
process.on('SIGTERM', () => { cleanup(); process.exit(0); });
process.on('exit', () => cleanup());

const DEFAULT_ANNOUNCE = [
  'udp://tracker.opentrackr.org:1337/announce',
  'udp://open.stealth.si:80/announce',
  'udp://tracker.torrent.eu.org:451/announce',
  'udp://explodie.org:6969/announce',
  'wss://tracker.openwebtorrent.com',
  'wss://tracker.btorrent.xyz'
];

// Pre-inspección de metadatos del torrent
async function inspectTorrent(torrentId) {
  const WT = await getWebTorrent();
  return new Promise((resolve, reject) => {
    const client = new WT();
    console.log('🔍 Inspeccionando metadatos del torrent en la red P2P...');
    
    const timeout = setTimeout(() => {
      client.destroy();
      reject(new Error('Tiempo de espera agotado buscando metadatos del torrent.'));
    }, 30000);

    client.add(torrentId, { path: tempDir, announce: DEFAULT_ANNOUNCE }, (torrent) => {
      clearTimeout(timeout);
      const filesInfo = torrent.files.map((file, idx) => ({
        index: idx,
        name: file.name,
        length: file.length,
        sizeFormatted: formatBytes(file.length)
      }));
      const name = torrent.name;
      const totalLength = torrent.length;
      client.destroy(() => {
        resolve({ name, totalLength, files: filesInfo });
      });
    });

    client.on('error', (err) => {
      clearTimeout(timeout);
      client.destroy();
      reject(err);
    });
  });
}

// Preguntar interactivamente al usuario si hay múltiples archivos
function promptUserSelection(files) {
  return new Promise((resolve) => {
    console.log('\n📦 Archivos encontrados en el torrent:');
    console.log('--------------------------------------------------');
    files.forEach(f => {
      console.log(`  [${f.index}] ${f.name} (${f.sizeFormatted})`);
    });
    console.log('--------------------------------------------------');

    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });

    rl.question(`\n👉 Selecciona el índice del archivo a reproducir [0-${files.length - 1}] o 'all' (por defecto: 0): `, (answer) => {
      rl.close();
      const trimmed = answer.trim().toLowerCase();
      if (trimmed === 'all') {
        resolve('all');
      } else if (trimmed === '' || isNaN(parseInt(trimmed, 10))) {
        resolve('0');
      } else {
        resolve(trimmed);
      }
    });
  });
}

// Subida a Rolla Storage Engine
async function uploadToRolla(filePath, fileName, ball) {
  console.log(`\n🚀 Subiendo a Rolla Storage Engine (Ball: "${ball}")...`);
  try {
    let Rolla;
    try {
      Rolla = require('terra-rolla').Rolla;
    } catch {
      // Intentar cargar desde ruta local de desarrollo si existe
      const localSdkPath = 'C:\\mis-proyectos\\Terra\\rolla\\Rolla\\packages\\rolla-sdk\\dist\\index.js';
      if (fs.existsSync(localSdkPath)) {
        Rolla = require(localSdkPath).Rolla;
      } else {
        throw new Error('terra-rolla no está instalado. Ejecuta: npm install terra-rolla');
      }
    }

    const rolla = new Rolla({
      githubToken: process.env.GITHUB_TOKEN || process.env.GH_TOKEN
    });

    const fileBuffer = fs.readFileSync(filePath);
    await rolla.createBall(ball);
    await rolla.putObject(ball, fileName, fileBuffer);

    console.log(`✅ ¡Archivo subido con éxito a Rolla-Ball "${ball}"!`);
    console.log(`📦 Objeto: ${fileName} (${formatBytes(fileBuffer.length)})`);
  } catch (err) {
    console.error('❌ Error durante la subida a Rolla:', err.message);
  }
}

// Subida a Google Drive mediante Rclone
async function uploadToDrive(filePath, fileName) {
  console.log(`\n☁️ Subiendo "${fileName}" a Google Drive vía Rclone...`);
  return new Promise((resolve) => {
    const rcloneProc = spawn('rclone', ['copy', filePath, 'gdrive:Pelis-Stream', '--progress'], {
      stdio: 'inherit',
      shell: process.platform === 'win32'
    });
    rcloneProc.on('error', (err) => {
      console.error('\n❌ No se pudo ejecutar rclone:', err.message);
      console.log('💡 Asegúrate de tener instalado rclone y configurado con: rclone config');
      resolve();
    });
    rcloneProc.on('close', (code) => {
      if (code === 0) {
        console.log(`\n✅ ¡Archivo subido con éxito a Google Drive en la carpeta "Pelis-Stream"!`);
      } else {
        console.error(`\n❌ Rclone finalizó con código de salida ${code}`);
      }
      resolve();
    });
  });
}

// Ejecutar streaming o descarga
async function main() {
  try {
    const cmdJsPath = path.join(__dirname, 'node_modules', 'webtorrent-cli', 'bin', 'cmd.js');
    const runner = fs.existsSync(cmdJsPath) ? process.execPath : 'webtorrent';
    const baseArgs = fs.existsSync(cmdJsPath) ? [cmdJsPath] : [];

    if (isListOnly) {
      const meta = await inspectTorrent(magnet);
      console.log(`\n🎥 Torrent: ${meta.name} (Total: ${formatBytes(meta.totalLength)})`);
      console.log('\n📦 Lista de archivos disponibles:');
      console.log('--------------------------------------------------');
      meta.files.forEach(f => console.log(`  [${f.index}] ${f.name} (${f.sizeFormatted})`));
      console.log('--------------------------------------------------');
      cleanup();
      process.exit(0);
    }

    let selectedIndex = selectArg;
    let chosenFile = null;

    if (selectedIndex === null && !isRolla && !isDrive) {
      try {
        const meta = await inspectTorrent(magnet);
        console.log(`\n🎥 Torrent: ${meta.name} (Total: ${formatBytes(meta.totalLength)})`);
        if (meta.files.length === 1) {
          selectedIndex = '0';
        } else {
          selectedIndex = await promptUserSelection(meta.files);
        }
        chosenFile = selectedIndex !== 'all' ? meta.files[parseInt(selectedIndex, 10)] : null;
      } catch (err) {
        console.log('⚠️ No se pudieron obtener los metadatos previos. Iniciando conexión directa...');
        selectedIndex = null;
      }
    }
    if (chosenFile) {
      console.log(`\n▶️ Seleccionado: [${chosenFile.index}] ${chosenFile.name} (${chosenFile.sizeFormatted})`);
    }

    // Modo Rolla o Drive (Descarga completa y subida)
    if (isRolla || isDrive) {
      console.log('\n📥 Descargando archivo para procesamiento Cloud...');
      const WT = await getWebTorrent();
      const client = new WT();
      client.add(magnet, { path: tempDir }, (torrent) => {
        if (selectedIndex !== 'all') {
          torrent.files.forEach((file, idx) => {
            if (idx !== parseInt(selectedIndex, 10)) {
              file.deselect();
            }
          });
        }

        torrent.on('download', () => {
          const progress = (torrent.progress * 100).toFixed(1);
          process.stdout.write(`\r⬇️ Descargando: ${progress}% | Velocidad: ${formatBytes(torrent.downloadSpeed)}/s`);
        });

        torrent.on('done', async () => {
          console.log('\n✅ Descarga completada.');
          if (isRolla) {
            const targetFile = chosenFile ? path.join(tempDir, chosenFile.name) : path.join(tempDir, torrent.files[0].name);
            await uploadToRolla(targetFile, chosenFile ? chosenFile.name : torrent.files[0].name, ballName);
          }
          if (isDrive) {
            const targetFile = chosenFile ? path.join(tempDir, chosenFile.name) : path.join(tempDir, torrent.files[0].name);
            await uploadToDrive(targetFile, chosenFile ? chosenFile.name : torrent.files[0].name);
          }
          client.destroy(() => {
            cleanup();
            process.exit(0);
          });
        });
      });
      return;
    }

    // Modo Streaming HTTP en vivo
    const execArgs = [...baseArgs, magnet, '--out', tempDir];

    if (selectedIndex !== 'all') {
      execArgs.push('--select', selectedIndex);
    }

    if (isVlc) execArgs.push('--vlc');
    if (isMpv) execArgs.push('--mpv');
    if (!isVlc && !isMpv) {
      execArgs.push('--http', '--port', port);
    }

    console.log('\n🚀 Iniciando streaming en tiempo real...');
    console.log(`📂 Almacenamiento efímero: ${tempDir}`);
    if (!isVlc && !isMpv) {
      console.log(`📡 URL de red: http://127.0.0.1:${port}`);
      console.log('💡 Abre esta URL en VLC (Móvil / PC) o en tu navegador.');
    }
    console.log('--------------------------------------------------\n');

    const child = spawn(runner, execArgs, {
      stdio: 'inherit',
      shell: false
    });

    child.on('close', (code) => {
      cleanup();
      process.exit(code || 0);
    });

  } catch (err) {
    console.error('\n❌ Error:', err.message);
    cleanup();
    process.exit(1);
  }
}

main();
