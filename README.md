# ytmini

App web minimalista para descargar videos de YouTube en `MP3`, `MP4` o `WAV` para uso local

## Requisitos

- Node.js 20+
- `yt-dlp` instalado y disponible en `PATH`
- `ffmpeg` instalado y disponible en `PATH`

## Instalacion

```bash
npm install
```

## Ejecutar

```bash
npm run dev
```

Abrir en el navegador: `http://127.0.0.1:8000`

## Tests

```bash
npm test
```

## API

- `GET /api/health`
- `POST /api/download`
  - Body JSON: `{ "url": "<youtube-url>", "format": "mp3|mp4|wav" }`

## Notas

- Limite por video: 30 minutos.
- Esta app esta orientada a contenido propio o con permisos de uso.

## Deploy en Render (free tier)

1. Subi este repo a GitHub.
2. En Render, crea un nuevo servicio usando `Blueprint` y selecciona el repo.
3. Render detecta `render.yaml` y crea el servicio Docker automaticamente.
4. Espera el primer build y abre la URL publica.

### Consideraciones del free tier

- El servicio se duerme por inactividad y puede tardar en volver a levantar.
- Recursos limitados: descargas/conversiones largas pueden fallar o tardar mucho.
- El sistema de archivos es efimero: no guarda archivos entre reinicios.
- Para uso continuo, conviene un plan pago o un VPS.
