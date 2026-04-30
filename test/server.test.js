import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { mkdtemp, writeFile } from "node:fs/promises";

import { createApp } from "../src/server.js";

test("GET /api/health returns ok", async () => {
  const app = createApp();
  const response = await app.request("/api/health");
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.deepEqual(body, { status: "ok" });
});

test("POST /api/download rejects invalid format", async () => {
  const app = createApp();
  const response = await app.request("/api/download", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
      format: "flac",
    }),
  });

  assert.equal(response.status, 400);
});

test("POST /api/download returns file when downloader succeeds", async () => {
  const tmpDir = await mkdtemp(path.join(os.tmpdir(), "ytmini-test-"));
  const outputFile = path.join(tmpDir, "demo.mp3");
  await writeFile(outputFile, "sample", "utf8");

  let cleanedPath = null;
  const app = createApp({
    downloadToFile: async () => ({
      tempDir: tmpDir,
      outputFile,
      fileName: "demo.mp3",
    }),
    cleanupDirectory: (dirPath) => {
      cleanedPath = dirPath;
      fs.rmSync(dirPath, { recursive: true, force: true });
    },
  });

  const response = await app.request("/api/download", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
      format: "mp3",
    }),
  });

  const buffer = Buffer.from(await response.arrayBuffer());

  assert.equal(response.status, 200);
  assert.equal(response.headers.get("content-disposition"), 'attachment; filename="demo.mp3"');
  assert.equal(buffer.toString("utf8"), "sample");
  assert.equal(cleanedPath, tmpDir);
});
