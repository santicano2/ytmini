import os
import re
import shutil
import subprocess
import tempfile
from pathlib import Path

from fastapi import BackgroundTasks, FastAPI, HTTPException
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel


ALLOWED_FORMATS = {"mp3", "mp4", "wav"}
YOUTUBE_REGEX = re.compile(r"^(https?://)?(www\.)?(youtube\.com|youtu\.be)/.+$", re.IGNORECASE)
MAX_DURATION_SECONDS = 1800
BASE_DIR = Path(__file__).resolve().parent.parent
WEB_DIR = BASE_DIR / "web"


class DownloadRequest(BaseModel):
    url: str
    format: str


app = FastAPI(title="ytmini")
app.mount("/assets", StaticFiles(directory=WEB_DIR), name="assets")


def cleanup_path(path: str) -> None:
    shutil.rmtree(path, ignore_errors=True)


def run_download(url: str, output_format: str) -> Path:
    temp_dir = tempfile.mkdtemp(prefix="ytmini-")
    base_template = os.path.join(temp_dir, "%(title).120s-%(id)s.%(ext)s")

    if output_format == "mp4":
        command = [
            "yt-dlp",
            "--no-playlist",
            "--match-filter",
            f"duration <= {MAX_DURATION_SECONDS}",
            "-f",
            "bv*+ba/b",
            "--merge-output-format",
            "mp4",
            "-o",
            base_template,
            url,
        ]
    else:
        command = [
            "yt-dlp",
            "--no-playlist",
            "--match-filter",
            f"duration <= {MAX_DURATION_SECONDS}",
            "-x",
            "--audio-format",
            output_format,
            "--audio-quality",
            "192K",
            "-o",
            base_template,
            url,
        ]

    try:
        process = subprocess.run(command, capture_output=True, text=True)
    except FileNotFoundError as error:
        cleanup_path(temp_dir)
        raise HTTPException(status_code=500, detail="Falta instalar yt-dlp o ffmpeg en el sistema.") from error

    if process.returncode != 0:
        cleanup_path(temp_dir)
        raise HTTPException(status_code=400, detail="No se pudo descargar o convertir el video.")

    files = [p for p in Path(temp_dir).iterdir() if p.is_file()]
    if not files:
        cleanup_path(temp_dir)
        raise HTTPException(status_code=400, detail="No se generó ningún archivo.")

    matching = [p for p in files if p.suffix.lower() == f".{output_format}"]
    if matching:
        return matching[0]

    return files[0]


@app.get("/api/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.get("/")
def home() -> FileResponse:
    return FileResponse(WEB_DIR / "index.html")


@app.post("/api/download")
def download(payload: DownloadRequest, background_tasks: BackgroundTasks) -> FileResponse:
    selected_format = payload.format.lower().strip()
    url = payload.url.strip()

    if selected_format not in ALLOWED_FORMATS:
        raise HTTPException(status_code=400, detail="Formato no soportado.")

    if not YOUTUBE_REGEX.match(url):
        raise HTTPException(status_code=400, detail="URL de YouTube inválida.")

    output_file = run_download(url=url, output_format=selected_format)
    background_tasks.add_task(cleanup_path, str(output_file.parent))
    return FileResponse(path=output_file, filename=output_file.name, media_type="application/octet-stream")
