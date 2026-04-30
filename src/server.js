import express from "express";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { ALLOWED_FORMATS, cleanupDirectory, downloadToFile, isYoutubeUrl } from "./download.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const webDir = path.resolve(__dirname, "../web");

export function createApp(deps = {}) {
  const app = express();
  const downloader = deps.downloadToFile || downloadToFile;
  const cleanup = deps.cleanupDirectory || cleanupDirectory;

  app.use(express.json());
  app.use(express.static(webDir));

  app.get("/api/health", (_req, res) => {
    res.json({ status: "ok" });
  });

  app.post("/api/download", async (req, res) => {
    const selectedFormat = String(req.body?.format || "").toLowerCase().trim();
    const url = String(req.body?.url || "").trim();

    if (!ALLOWED_FORMATS.has(selectedFormat)) {
      res.status(400).json({ detail: "Formato no soportado." });
      return;
    }

    if (!isYoutubeUrl(url)) {
      res.status(400).json({ detail: "URL de YouTube invalida." });
      return;
    }

    try {
      const { tempDir, outputFile, fileName } = await downloader({ url, outputFormat: selectedFormat });
      res.download(outputFile, fileName, () => cleanup(tempDir));
    } catch (error) {
      const detail = error instanceof Error ? error.message : "Error inesperado.";
      res.status(400).json({ detail });
    }
  });

  return {
    raw: app,
    request: async (targetPath, init) => {
      const server = app.listen(0);
      await new Promise((resolve) => server.once("listening", resolve));
      const address = server.address();
      const port = typeof address === "object" && address ? address.port : 0;

      try {
        return await fetch(`http://127.0.0.1:${port}${targetPath}`, init);
      } finally {
        await new Promise((resolve, reject) => {
          server.close((error) => {
            if (error) {
              reject(error);
              return;
            }
            resolve();
          });
        });
      }
    },
  };
}

const isMainModule = process.argv[1] ? path.resolve(process.argv[1]) === __filename : false;

if (isMainModule && process.env.NODE_ENV !== "test") {
  const port = Number(process.env.PORT || "8000");
  createApp().raw.listen(port, () => {
    console.log(`ytmini running on http://127.0.0.1:${port}`);
  });
}
