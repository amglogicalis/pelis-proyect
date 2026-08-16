# 🎬 pelis-proyect (Stream P2P Efímero)

Sistema ligero de streaming P2P bajo demanda para PC y móviles.
Descarga y sirve contenido en tiempo real por HTTP directamente a tu reproductor (VLC, MPV o navegador) y **elimina automáticamente los archivos temporales** al terminar la sesión, sin ocupar espacio permanente en disco.

---

## 🚀 Instalación Rápida

1. Clona el repositorio:
   ```bash
   git clone https://github.com/amglogicalis/pelis-proyect.git
   cd pelis-proyect
   ```

2. Instala las dependencias:
   ```bash
   npm install
   ```

---

## 💻 Modos de Uso

### 1. Universal (Node.js - Windows / Linux / macOS / Termux)
Funciona en cualquier sistema con Node.js instalado:

```bash
node stream.js "<MAGNET_LINK>"
```

### 2. Windows (PowerShell)
```powershell
.\stream.ps1 "<MAGNET_LINK>"
```

### 3. Android (Termux)
1. Instala los paquetes requeridos en Termux (solo la primera vez):
   ```bash
   pkg update && pkg install nodejs-lts git
   ```
2. Clona el repo e instala dependencias:
   ```bash
   git clone https://github.com/amglogicalis/pelis-proyect.git
   cd pelis-proyect
   npm install
   ```
3. Ejecuta el script:
   ```bash
   chmod +x stream.sh
   ./stream.sh "<MAGNET_LINK>"
   ```
4. Abre la app **VLC en Android** > Menú > **"Abrir ubicación de red"** (o "Flujo de red") e introduce:
   ```
   http://127.0.0.1:8000
   ```

### 4. Docker (Cero instalación en host)
```bash
# Construir imagen (una sola vez)
docker build -t pelis-stream .

# Ejecutar efímero con autodestrucción
docker run --rm -it -p 8000:8000 pelis-stream "<MAGNET_LINK>" --http --port 8000
```

---

## ⚙️ Flags y Opciones Útiles

Puedes pasar cualquier flag soportado por WebTorrent directamente a los scripts:

| Flag | Descripción |
| :--- | :--- |
| `--select <idx>` | Descarga solo el archivo especificado por su índice (útil para series o packs de episodios). |
| `--list` | Muestra el listado de archivos dentro del torrent con sus índices sin reproducir. |
| `--port <num>` | Cambia el puerto HTTP del servidor (por defecto `8000`). |
| `--vlc` | Abre automáticamente el reproductor VLC en el PC. |
| `--mpv` | Abre automáticamente el reproductor MPV en el PC. |

### Ejemplos con Flags:
```bash
# Listar archivos de un torrent para ver los números de episodios
node stream.js "magnet:?xt=urn:btih:..." --list

# Reproducir solo el episodio 3 (índice 2)
node stream.js "magnet:?xt=urn:btih:..." --select 2

# Abrir directamente en VLC en el PC
node stream.js "magnet:?xt=urn:btih:..." --vlc
```

---

## 🧹 Autodestrucción y Limpieza

Cuando termines de ver el vídeo o pulses **`Ctrl+C`** en la terminal:
1. El servidor HTTP y la conexión P2P se cierran.
2. El script intercepta la señal (`SIGINT`/`trap`) y ejecuta un borrado recursivo forzado de la carpeta temporal.
3. El disco queda libre inmediatamente sin archivos residuales.
