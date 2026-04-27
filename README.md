# ytmini

App web minimalista para descargar videos de YouTube en `MP3`, `MP4` o `WAV` para uso local.

## Requisitos

- Python 3.11+
- `ffmpeg` instalado y disponible en `PATH`
- Dependencias de Python del proyecto

## Instalacion

```bash
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
```

## Ejecutar

```bash
uvicorn app.main:app --reload --port 8000
```

Abrir en el navegador: `http://127.0.0.1:8000`

## API

- `GET /api/health`
- `POST /api/download`
  - Body JSON: `{ "url": "<youtube-url>", "format": "mp3|mp4|wav" }`

## Notas

- Limite por video: 30 minutos.
- Esta app esta orientada a contenido propio o con permisos de uso.
