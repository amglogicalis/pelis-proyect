# 🎬 pelis-proyect

Sistema de streaming P2P efímero y cliente Cloud bajo demanda para PC, móvil (Termux) y servidores Cloud (Hugging Face Spaces / Docker).

Permite reproducir vídeos directamente por HTTP en tiempo real en VLC, MPV o navegador web sin esperar a la descarga completa, con **selector interactivo de archivos**, **Auto-Purge por defecto** y soporte para almacenamiento de objetos **Rolla** y **Google Drive**.

---

## 🌟 Características Principales

- ⚡ **Streaming Secuencial en Tiempo Real**: Visualización inmediata por HTTP.
- 🎯 **Estrategia B - Selector Interactivo**: Si el torrent contiene varios archivos (series/packs), el sistema inspecciona los metadatos y te permite elegir exactamente el capítulo que deseas.
- 🧹 **Estrategia C - Auto-Purge por Defecto**: Todos los datos descargados en el búfer temporal se destruyen automáticamente al cerrar la sesión (`Ctrl+C` o fin del reproductor), dejando 0 bytes residuales.
- 📦 **Estrategia A - Rolla Storage Engine (`--rolla`)**: Permite subir el archivo procesado a la CDN inmutable de GitHub Releases mediante fragmentación automática (*chunking*).
- ☁️ **Soporte Cloud / Hugging Face Spaces**: Incluye `server.js` con interfaz web lista para desplegar gratis en Hugging Face Spaces (2 vCPU / 16 GB RAM).

---

## 🚀 Instalación

```bash
git clone https://github.com/amglogicalis/pelis-proyect.git
cd pelis-proyect
npm install
```

---

## 💻 Modos de Uso

### 1. Modo Interactivo (CLI Universal - PC / Termux)
```bash
node stream.js "magnet:?xt=urn:btih:..."
```
> *Si el torrent contiene varios archivos, te mostrará la lista con sus tamaños y te preguntará cuál reproducir.*

### 2. Flags y Opciones Directas

| Flag | Descripción |
| :--- | :--- |
| `--select <idx>` | Selecciona directamente el índice del archivo sin preguntar (ej: `--select 0`). |
| `--vlc` | Abre automáticamente el stream en el reproductor VLC (PC). |
| `--mpv` | Abre automáticamente el stream en el reproductor MPV (PC). |
| `--port <num>` | Cambia el puerto HTTP del servidor local (por defecto `8000`). |
| `--list` | Muestra la lista de archivos con sus tamaños en MB/GB y sale. |
| `--keep` | Desactiva el auto-purge y conserva los archivos descargados. |
| `--rolla` | Descarga y sube el archivo a Rolla Storage Engine. |
| `--ball <nombre>` | Especifica el nombre de la Rolla-Ball / Bucket (por defecto `pelis-stream`). |
| `--drive` | Sube el archivo procesado a Google Drive. |

#### Ejemplos de uso:
```bash
# Ver lista de archivos con tamaños
node stream.js "magnet:?xt=urn:btih:..." --list

# Reproducir el capítulo 2 directamente en VLC
node stream.js "magnet:?xt=urn:btih:..." --select 1 --vlc

# Subir a Rolla Storage Engine (Ball personalizada)
node stream.js "magnet:?xt=urn:btih:..." --select 0 --rolla --ball "peliculas-hd"
```

---

## 📱 Uso en Android con Termux

1. **Instalación inicial:**
   ```bash
   pkg update && pkg install nodejs-lts git
   git clone https://github.com/amglogicalis/pelis-proyect.git
   cd pelis-proyect
   npm install
   ```

2. **Iniciar streaming:**
   ```bash
   node stream.js "magnet:?xt=urn:btih:..."
   ```

3. **Reproducción:**
   Abre la app **VLC en Android** > Menú > **"Abrir ubicación de red"** e introduce:
   ```
   http://127.0.0.1:8000
   ```

---

## ☁️ Despliegue en la Nube (Hugging Face Spaces - 100% Gratis)

1. Crea un nuevo **Space** en [Hugging Face](https://huggingface.co/spaces) seleccionando **Docker SDK** (Blank).
2. Sube los archivos del repositorio a tu Space (o vincula el repo de GitHub).
3. Tu Space iniciará automáticamente `server.js` en el puerto `7860`.
4. Accede a la URL pública que te da Hugging Face (`https://tu-usuario-tu-espacio.hf.space`) para usar la interfaz web o pasa la URL de `/stream` a tu reproductor VLC desde cualquier lugar.

---

## 📜 Licencia

MIT
