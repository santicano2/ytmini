import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawn } from "node:child_process";

export const ALLOWED_FORMATS = new Set(["mp3", "mp4", "wav"]);
export const MAX_DURATION_SECONDS = 1800;

const YOUTUBE_REGEX = /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be)\/.+/i;

export function isYoutubeUrl(url) {
  return YOUTUBE_REGEX.test(String(url || "").trim());
}

export function cleanupDirectory(dirPath) {
  fs.rmSync(dirPath, { recursive: true, force: true });
}

function createTempDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), "ytmini-"));
}

function getOutputFile(tempDir, outputFormat) {
  const files = fs
    .readdirSync(tempDir)
    .map((entry) => path.join(tempDir, entry))
    .filter((entry) => fs.statSync(entry).isFile());

  if (files.length === 0) {
    throw new Error("No se genero ningun archivo.");
  }

  const exactMatch = files.find((file) => path.extname(file).toLowerCase() === `.${outputFormat}`);
  return exactMatch || files[0];
}

function buildCommand(url, outputFormat, outputTemplate) {
  const baseArgs = [
    "--no-playlist",
    "--match-filter",
    `duration <= ${MAX_DURATION_SECONDS}`,
    "-o",
    outputTemplate,
  ];

  if (outputFormat === "mp4") {
    return [
      "yt-dlp",
      [
        ...baseArgs,
        "-f",
        "bv*+ba/b",
        "--merge-output-format",
        "mp4",
        url,
      ],
    ];
  }

  return [
    "yt-dlp",
    [
      ...baseArgs,
      "-x",
      "--audio-format",
      outputFormat,
      "--audio-quality",
      "192K",
      url,
    ],
  ];
}

export function downloadToFile({ url, outputFormat, spawnProcess = spawn }) {
  const tempDir = createTempDir();
  const outputTemplate = path.join(tempDir, "%(title).120s-%(id)s.%(ext)s");
  const [command, args] = buildCommand(url, outputFormat, outputTemplate);

  return new Promise((resolve, reject) => {
    const child = spawnProcess(command, args, { windowsHide: true });
    let stderr = "";

    if (child.stdout && typeof child.stdout.resume === "function") {
      child.stdout.resume();
    }

    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });

    child.on("error", (error) => {
      cleanupDirectory(tempDir);
      reject(new Error(`Falta instalar yt-dlp o ffmpeg. ${error.message}`));
    });

    child.on("close", (code) => {
      if (code !== 0) {
        cleanupDirectory(tempDir);
        reject(new Error(stderr || "No se pudo descargar o convertir el video."));
        return;
      }

      try {
        const outputFile = getOutputFile(tempDir, outputFormat);
        resolve({ tempDir, outputFile, fileName: path.basename(outputFile) });
      } catch (error) {
        cleanupDirectory(tempDir);
        reject(error);
      }
    });
  });
}
