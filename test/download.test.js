import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { EventEmitter } from "node:events";

import { downloadToFile } from "../src/download.js";

test("downloadToFile drains stdout to avoid child process blocking", async () => {
  let resumed = false;

  const spawnProcess = (_command, args) => {
    const child = new EventEmitter();
    child.stderr = new EventEmitter();
    child.stdout = new EventEmitter();
    child.stdout.resume = () => {
      resumed = true;
    };

    setTimeout(() => {
      const template = args[args.indexOf("-o") + 1];
      const outputDir = path.dirname(template);
      const outputFile = path.join(outputDir, "demo.mp3");
      fs.writeFileSync(outputFile, "ok", "utf8");
      child.emit("close", 0);
    }, 10);

    return child;
  };

  const result = await downloadToFile({
    url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
    outputFormat: "mp3",
    spawnProcess,
  });

  assert.equal(result.fileName, "demo.mp3");
  assert.equal(resumed, true);
});
