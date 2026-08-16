# 🎬 Pelis-Proyect: Manual Técnico y Guía de Uso

> **Motor de Streaming P2P Efímero y Puente de Almacenamiento Cloud bajo demanda para PC, Móvil (Termux) y Servidores Cloud.**

---

## 📌 1. Visión General y Arquitectura

**Pelis-Proyect** es una solución diseñada para reproducir o transferir contenido multimedia a partir de enlaces Magnet / Torrent sin saturar el almacenamiento permanente de tus dispositivos.

```
                     ┌──────────────────────────────────────────────┐
                     │          Red P2P (BitTorrent Engine)         │
                     └──────────────────────┬───────────────────────┘
                                            │
                                (Descarga Secuencial)
                                            ▼
                     ┌──────────────────────────────────────────────┐
                     │     Búfer Temporal Efímero (Auto-Purge)      │
                     └──────┬───────────────────┬───────────────────┘
                            │                   │
         [ Modo Streaming ] │                   │ [ Modo Persistencia ]
                            ▼                   ▼
    ┌──────────────────────────────┐     ┌───────────────────────────────────┐
    │  Servidor HTTP en Tiempo Real│     │  Motores de Almacenamiento Cloud  │
    │  (VLC / MPV / Web Player)    │     │  - Rolla Storage Engine (GitHub)  │
    │  URL: http://127.0.0.1:8000  │     │  - Google Drive (vía Rclone)      │
    └──────────────────────────────┘     └───────────────────────────────────┘
```

### 🌟 Pilares Fundamentales:
1. **Estrategia A (Rolla Storage Engine)**: Fragmentación automática (*chunking*) y almacenamiento inmutable a coste $0 sobre GitHub Releases vía `terra-rolla`.
2. **Estrategia B (Selector Interactivo)**: Inspecciona los metadatos del torrent y te permite elegir qué archivo o episodio ver antes de iniciar la descarga.
3. **Estrategia C (Auto-Purge por Defecto)**: Al terminar la sesión o pulsar `Ctrl+C`, se purgan todos los fragmentos temporales, dejando **0 bytes residuales** en disco.
4. **Modo Google Drive**: Subida rápida de archivos procesados a tu cuenta de Google Drive mediante Rclone.
5. **Servidor Cloud Multiplataforma**: Incluye interfaz web y endpoints REST listos para desplegar gratis en **Hugging Face Spaces** o cualquier servidor VPS.

---

## 🚀 2. Instalación y Requisitos

### Requisitos Previos
* **Node.js** (v18, v20, v22 o v24).
* **Git**.
* **Rclone** *(Opcional, solo requerido si vas a usar el modo `--drive`)*.

### Clonar e Instalar
```bash
git clone https://github.com/amglogicalis/pelis-proyect.git
cd pelis-proyect
npm install
```
*(Durante el `npm install`, el script `patch-deps.js` se ejecutará automáticamente para garantizar compatibilidad con Node 22/24).*

---

## 📖 3. Tabla Completa de Flags y Parámetros

| Flag / Parámetro | Argumento | Valor por Defecto | Descripción |
| :--- | :---: | :---: | :--- |
| **`<magnet_link>`** | `string` | *(Requerido)* | Enlace magnet o ruta al archivo `.torrent`. |
| **`--select`** | `<índice>` \| `all` | `Selector interactivo` | Especifica el índice del archivo a procesar (ej. `--select 0`). Si no se indica, abre el menú interactivo. |
| **`--list`** | - | `false` | Muestra la lista de todos los archivos del torrent con sus tamaños en MB/GB y finaliza. |
| **`--vlc`** | - | `false` | Abre automáticamente el reproductor multimedia VLC en tu PC. |
| **`--mpv`** | - | `false` | Abre automáticamente el reproductor multimedia MPV en tu PC. |
| **`--port`** | `<número>` | `8000` | Puerto en el que se expone el servidor HTTP local para streaming. |
| **`--keep`** | - | `false` | Desactiva el Auto-Purge (conserva los archivos descargados en la carpeta temporal). |
| **`--rolla`** | - | `false` | Descarga el archivo seleccionado y lo sube al motor de objetos **Rolla Storage**. |
| **`--ball`** | `<nombre>` | `pelis-stream` | Nombre de la Rolla-Ball (Bucket en GitHub Releases) donde se guardará el archivo. |
| **`--drive`** | - | `false` | Sube el archivo procesado a tu cuenta de Google Drive en la carpeta `Pelis-Stream`. |
| **`-h, --help`** | - | - | Muestra la ayuda de comandos en la terminal. |

---

## 🎯 4. Recetas Prácticas de Uso

### Receta 1: Modo Interactivo (Recomendado para Series y Packs)
Muestra la lista de archivos con sus tamaños y te pregunta qué capítulo o vídeo deseas reproducir:
```bash
node stream.js "magnet:?xt=urn:btih:..."
```

---

### Receta 2: Ver Directamente en VLC en tu PC
Inicia la reproducción instantánea en VLC sin abrir menús ni navegadores:
```bash
node stream.js "magnet:?xt=urn:btih:..." --select 0 --vlc
```

---

### Receta 3: Streaming a Móvil, Tablet o Smart TV (Red Local)
1. Inicia el servidor especificando el puerto:
   ```bash
   node stream.js "magnet:?xt=urn:btih:..." --select 0 --port 8000
   ```
2. En tu móvil o Smart TV (conectado a la misma red WiFi), abre la app de **VLC** > **"Abrir ubicación de red"** e introduce:
   ```
   http://IP_DE_TU_PC:8000
   ```
   *(Ejemplo: `http://192.168.1.50:8000`)*.

---

### Receta 4: Subir a Rolla Storage Engine (GitHub Releases CDN)
Descarga el archivo a velocidad máxima, lo divide en fragmentos automáticos (*chunks*) y lo sube a tu almacenamiento inmutable:

```powershell
# En Windows (PowerShell)
$env:GITHUB_TOKEN = "tu_personal_access_token"
node stream.js "magnet:?xt=urn:btih:..." --select 0 --rolla --ball "peliculas-hd"
```

```bash
# En Linux / Termux / macOS
export GITHUB_TOKEN="tu_personal_access_token"
node stream.js "magnet:?xt=urn:btih:..." --select 0 --rolla --ball "peliculas-hd"
```

---

### Receta 5: Subir a Google Drive vía Rclone
Descarga el vídeo y lo transfiere a tu Google Drive en la carpeta `Pelis-Stream`, purgando el disco local al finalizar:
```bash
node stream.js "magnet:?xt=urn:btih:..." --select 0 --drive
```

---

### Receta 6: Solo Inspeccionar Contenido (`--list`)
Muestra el árbol de archivos con sus tamaños exactos sin iniciar descarga ni streaming:
```bash
node stream.js "magnet:?xt=urn:btih:..." --list
```

---

## ⚙️ 5. Guías de Configuración Paso a Paso

### A. Configuración de Google Drive (`rclone config`)
1. Ejecuta en tu terminal:
   ```bash
   rclone config
   ```
2. Responde al asistente con los siguientes valores:

| Pregunta de Rclone | Valor a Introducir | Explicación |
| :--- | :--- | :--- |
| `n/s/q>` | **`n`** | Crear nuevo remote. |
| `name>` | **`gdrive`** | *(Debe llamarse exactamente `gdrive`)*. |
| `Storage>` | **`drive`** | Selecciona Google Drive. |
| `client_id>` | **Pulsa Enter** | Dejar vacío. |
| `Continue using the shared client_id anyway? y/n>` | 👉 **`y`** | **Escribe `y`** para usar la autenticación automática sin configurar Google Cloud. |
| `client_secret>` | **Pulsa Enter** | Dejar vacío. |
| `scope>` | **`1`** | Full access (`drive`). |
| `service_account_file>` | **Pulsa Enter** | Dejar vacío. |
| `Edit advanced config? y/n>` | **`n`** | No. |
| `Use web browser to automatically authenticate? y/n>` | **`y`** | Abre el navegador para iniciar sesión y autorizar. |
| `Configure this as a Shared Drive? y/n>` | **`n`** | No. |
| `Keep this "gdrive" remote? y/e/d>` | **`y`** | Confirmar. |
| `e/n/d/r/c/s/q>` | **`q`** | Salir del asistente. |

---

### B. Configuración de Rolla Storage Engine
1. Genera un **Personal Access Token (Classic)** en GitHub (*Settings > Developer settings > Personal access tokens*) con permiso `repo`.
2. Establece la variable `GITHUB_TOKEN` antes de ejecutar con `--rolla`.

---

### C. Uso Completo en Dispositivos Móviles (Android con Termux)

Esta guía detalla la instalación desde cero, permisos, optimizaciones del sistema operativo y configuración de reproducción en Android.

#### Paso 1: Instalar Termux correctamente
> ⚠️ **IMPORTANTE:** **NO instales Termux desde Google Play Store** (la versión de Play Store está descontinuada y no puede actualizar paquetes).
* Descarga e instala **Termux** desde [F-Droid](https://f-droid.org/en/packages/com.termux/) o desde los [Releases oficiales de Termux en GitHub](https://github.com/termux/termux-app/releases).

#### Paso 2: Permisos de Almacenamiento y Optimización de Batería
1. Abre Termux y concede permisos de almacenamiento ejecutando:
   ```bash
   termux-setup-storage
   ```
   *(Acepta la ventana emergente de permisos de Android)*.
2. **Exención de batería:** Para evitar que Android cierre Termux en segundo plano mientras ves una película:
   * Ve a *Ajustes de Android > Aplicaciones > Termux > Batería > Selecciona "Sin restricciones"* (o pulsa la notificación persistente de Termux y activa *Acquire Wakelock*).

#### Paso 3: Actualizar e Instalar TODAS las dependencias necesarias
Ejecuta en Termux este comando único que instala Node.js, Git, Rclone y herramientas de compilación:
```bash
pkg update && pkg upgrade -y
pkg install -y nodejs-lts git rclone build-essential python
```

#### Paso 4: Clonar el Repositorio e Instalar el Proyecto
```bash
git clone https://github.com/amglogicalis/pelis-proyect.git
cd pelis-proyect
npm install
```

#### Paso 5: Iniciar el Streaming Efímero
Ejecuta el script con tu enlace magnet:
```bash
node stream.js "magnet:?xt=urn:btih:..."
```
Verás en la consola:
```text
🚀 Iniciando streaming en tiempo real...
📡 URL de red: http://127.0.0.1:8000
```

#### Paso 6: Ver el vídeo en VLC para Android
1. Instala la app **VLC for Android** desde Google Play Store o F-Droid.
2. Abre VLC > Pulsa en la pestaña **Más** (o el menú lateral de tres líneas).
3. Selecciona **"Flujo de red"** (o *"Streams / Abrir ubicación de red"*).
4. Introduce la URL:
   ```
   http://127.0.0.1:8000
   ```
5. Pulsa en la flecha de reproducir. ¡El vídeo comenzará de inmediato!

#### Paso 7: Finalizar y Liberar Almacenamiento
* Cuando termines de ver el vídeo, regresa a Termux y pulsa **`Ctrl + C`**.
* El sistema activará el **Auto-Purge** y borrará inmediatamente todo el búfer temporal, dejando el almacenamiento de tu móvil 100% limpio.

#### 💡 Pro-Tip: Crear un comando rápido (Alias) en Termux
Para poder ejecutar el streaming desde cualquier carpeta de Termux sin escribir `cd pelis-proyect`:
```bash
echo "alias pelis='node ~/pelis-proyect/stream.js'" >> ~/.bashrc
source ~/.bashrc
```
Ahora solo tendrás que escribir:
```bash
pelis "magnet:?xt=urn:btih:..."
```

---

### D. Despliegue Cloud en Hugging Face Spaces (100% Gratuito)
1. Ve a [Hugging Face Spaces](https://huggingface.co/spaces) y crea un nuevo espacio.
2. Selecciona **Docker SDK** (Blank).
3. Conecta tu repositorio de GitHub o sube los archivos de este proyecto.
4. Hugging Face compilará el `Dockerfile` y levantará automáticamente `server.js` en el puerto `7860`.
5. Accede a tu URL pública (`https://tu-usuario-tu-espacio.hf.space`) para usar la interfaz visual de streaming y descarga en la nube.

---

## 🧹 6. Mecanismo de Auto-Purge y Limpieza

* En cada ejecución, el sistema crea un directorio temporal único con prefijo `p2p-stream-`.
* Los eventos de terminación del sistema (`SIGINT` / `Ctrl+C`, `SIGTERM`, `exit`) son interceptados de forma segura.
* Al cerrar el reproductor o la terminal, el sistema purga recursivamente la carpeta temporal, garantizando que el disco duro mantenga su espacio original intacto.

---

## 📜 7. Licencia

Distribuido bajo la Licencia **MIT**. Consulta `LICENSE` para más información.
