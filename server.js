require('./patch-deps.js');
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const os = require('os');
const MemoryChunkStore = require('memory-chunk-store');

let WebTorrent = null;
let client = null;

const DEFAULT_ANNOUNCE = [
  'udp://tracker.opentrackr.org:1337/announce',
  'udp://open.stealth.si:80/announce',
  'udp://tracker.torrent.eu.org:451/announce',
  'udp://explodie.org:6969/announce',
  'wss://tracker.openwebtorrent.com',
  'wss://tracker.btorrent.xyz'
];

async function getClient() {
  if (!client) {
    const mod = await import('webtorrent');
    WebTorrent = mod.default || mod;
    client = new WebTorrent();
  }
  return client;
}

// Helper de formato de tamaño
function formatBytes(bytes) {
  if (!bytes || bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

const app = express();
const PORT = process.env.PORT || 7860;

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Endpoint para inspeccionar archivos del torrent
app.get('/api/info', async (req, res) => {
  const { magnet } = req.query;
  if (!magnet) {
    return res.status(400).json({ error: 'Parámetro "magnet" requerido' });
  }

  const wtClient = await getClient();
  const existing = wtClient.get(magnet);
  if (existing && existing.files.length > 0) {
    return res.json({
      name: existing.name,
      totalSize: formatBytes(existing.length),
      files: existing.files.map((f, idx) => ({
        index: idx,
        name: f.name,
        length: f.length,
        size: formatBytes(f.length)
      }))
    });
  }

  wtClient.add(magnet, { store: MemoryChunkStore, announce: DEFAULT_ANNOUNCE }, (torrent) => {
    const files = torrent.files.map((f, idx) => ({
      index: idx,
      name: f.name,
      length: f.length,
      size: formatBytes(f.length)
    }));
    const data = {
      name: torrent.name,
      totalSize: formatBytes(torrent.length),
      files
    };
    res.json(data);
  });
});

// Endpoint de Streaming directo HTTP 100% en RAM
app.get('/stream', async (req, res) => {
  const { magnet, select } = req.query;
  if (!magnet) {
    return res.status(400).send('Parámetro "magnet" requerido');
  }

  const wtClient = await getClient();
  let torrent = wtClient.get(magnet);
  const handleTorrentStream = (t) => {
    let fileIndex = parseInt(select, 10);
    if (isNaN(fileIndex) || fileIndex < 0 || fileIndex >= t.files.length) {
      let maxLen = 0;
      fileIndex = 0;
      t.files.forEach((f, idx) => {
        if (f.length > maxLen) {
          maxLen = f.length;
          fileIndex = idx;
        }
      });
    }

    const file = t.files[fileIndex];
    if (!file) {
      return res.status(404).send('Archivo no encontrado');
    }

    const range = req.headers.range;
    const contentType = file.name.endsWith('.mkv') ? 'video/x-matroska' : 'video/mp4';

    if (!range) {
      res.setHeader('Content-Type', contentType);
      res.setHeader('Content-Length', file.length);
      return file.createReadStream().pipe(res);
    }

    const positions = range.replace(/bytes=/, '').split('-');
    const start = parseInt(positions[0], 10);
    const total = file.length;
    const end = positions[1] ? parseInt(positions[1], 10) : total - 1;
    const chunksize = end - start + 1;

    res.writeHead(206, {
      'Content-Range': `bytes ${start}-${end}/${total}`,
      'Accept-Ranges': 'bytes',
      'Content-Length': chunksize,
      'Content-Type': contentType
    });

    file.createReadStream({ start, end }).pipe(res);
  };

  if (torrent && torrent.files.length > 0) {
    handleTorrentStream(torrent);
  } else {
    wtClient.add(magnet, { store: MemoryChunkStore, announce: DEFAULT_ANNOUNCE }, (t) => {
      handleTorrentStream(t);
    });
  }
});

// Interfaz Web Ligera
app.get('/', (req, res) => {
  res.send(`
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Pelis Stream Cloud</title>
  <style>
    :root {
      --bg: #090d16;
      --card: #131b2e;
      --accent: #22c55e;
      --accent-hover: #16a34a;
      --text: #f8fafc;
      --muted: #94a3b8;
      --border: #1e293b;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; font-family: system-ui, -apple-system, sans-serif; }
    body { background: var(--bg); color: var(--text); padding: 2rem 1rem; display: flex; justify-content: center; }
    .container { width: 100%; max-width: 720px; }
    .header { text-align: center; margin-bottom: 2rem; }
    .header h1 { font-size: 2rem; margin-bottom: 0.5rem; }
    .header p { color: var(--muted); }
    .card { background: var(--card); border: 1px solid var(--border); border-radius: 12px; padding: 1.5rem; margin-bottom: 1.5rem; }
    .input-group { margin-bottom: 1rem; }
    label { display: block; margin-bottom: 0.5rem; font-size: 0.9rem; color: var(--muted); }
    input[type="text"] { width: 100%; padding: 0.75rem 1rem; background: var(--bg); border: 1px solid var(--border); border-radius: 8px; color: var(--text); font-size: 1rem; }
    input[type="text"]:focus { outline: none; border-color: var(--accent); }
    .btn { display: inline-flex; align-items: center; justify-content: center; padding: 0.75rem 1.5rem; background: var(--accent); color: #000; font-weight: 600; border-radius: 8px; border: none; cursor: pointer; width: 100%; font-size: 1rem; transition: background 0.2s; }
    .btn:hover { background: var(--accent-hover); }
    .files-list { margin-top: 1rem; display: none; }
    .file-item { display: flex; justify-content: space-between; align-items: center; padding: 0.75rem 1rem; background: var(--bg); border: 1px solid var(--border); border-radius: 8px; margin-bottom: 0.5rem; cursor: pointer; transition: border-color 0.2s; }
    .file-item:hover { border-color: var(--accent); }
    .file-item.selected { border-color: var(--accent); background: rgba(34, 197, 94, 0.1); }
    .file-size { color: var(--muted); font-size: 0.85rem; }
    .player-section { margin-top: 1.5rem; display: none; }
    video { width: 100%; border-radius: 8px; background: #000; max-height: 400px; }
    .stream-links { margin-top: 1rem; padding: 1rem; background: var(--bg); border-radius: 8px; font-size: 0.9rem; }
    .stream-links a { color: var(--accent); word-break: break-all; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🎬 Pelis Stream Cloud</h1>
      <p>Streaming efímero P2P bajo demanda sin almacenamiento permanente</p>
    </div>

    <div class="card">
      <div class="input-group">
        <label for="magnet">Magnet Link / URL de Torrent</label>
        <input type="text" id="magnet" placeholder="magnet:?xt=urn:btih:..." />
      </div>
      <button class="btn" id="inspectBtn" onclick="inspectTorrent()">🔍 Inspeccionar Archivos</button>

      <div class="files-list" id="filesContainer">
        <label>Selecciona el archivo que deseas reproducir:</label>
        <div id="filesList"></div>
        <button class="btn" style="margin-top: 1rem;" onclick="startPlayback()">▶️ Iniciar Streaming</button>
      </div>
    </div>

    <div class="card player-section" id="playerContainer">
      <video id="videoPlayer" controls autoplay></video>
      <div class="stream-links">
        <p><strong>📡 URL de Red para VLC / Apps:</strong></p>
        <a id="vlcLink" href="#" target="_blank"></a>
      </div>
    </div>
  </div>

  <script>
    let selectedFileIndex = 0;
    let currentMagnet = '';

    async function inspectTorrent() {
      const magnet = document.getElementById('magnet').value.trim();
      if (!magnet) return alert('Por favor introduce un magnet link');
      
      currentMagnet = magnet;
      const btn = document.getElementById('inspectBtn');
      btn.innerText = '⏳ Buscando metadatos en la red P2P...';
      btn.disabled = true;

      try {
        const res = await fetch('/api/info?magnet=' + encodeURIComponent(magnet));
        const data = await res.json();
        
        const listDiv = document.getElementById('filesList');
        listDiv.innerHTML = '';
        
        data.files.forEach((f, idx) => {
          const item = document.createElement('div');
          item.className = 'file-item' + (idx === 0 ? ' selected' : '');
          item.innerHTML = '<span>[' + f.index + '] ' + f.name + '</span><span class="file-size">' + f.size + '</span>';
          item.onclick = () => {
            document.querySelectorAll('.file-item').forEach(el => el.classList.remove('selected'));
            item.classList.add('selected');
            selectedFileIndex = f.index;
          };
          listDiv.appendChild(item);
        });

        document.getElementById('filesContainer').style.display = 'block';
      } catch (err) {
        alert('Error al consultar el torrent: ' + err.message);
      } finally {
        btn.innerText = '🔍 Inspeccionar Archivos';
        btn.disabled = false;
      }
    }

    function startPlayback() {
      const streamUrl = window.location.origin + '/stream?magnet=' + encodeURIComponent(currentMagnet) + '&select=' + selectedFileIndex;
      const playerContainer = document.getElementById('playerContainer');
      const video = document.getElementById('videoPlayer');
      const vlcLink = document.getElementById('vlcLink');

      video.src = streamUrl;
      vlcLink.href = streamUrl;
      vlcLink.innerText = streamUrl;
      playerContainer.style.display = 'block';
      video.play();
    }
  </script>
</body>
</html>
  `);
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🎬 Servidor Cloud Stream activo en el puerto ${PORT}`);
  console.log(`🌐 Acceso web: http://localhost:${PORT}`);
});
