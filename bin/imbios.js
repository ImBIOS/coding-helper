#!/usr/bin/env bun

import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { existsSync } from "node:fs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const sourceDir = join(__dirname, "..");

// If src/index.ts exists, run it directly with bun
const sourceEntry = join(sourceDir, "src", "index.ts");
if (existsSync(sourceEntry)) {
  const proc = Bun.spawnSync({
    cmd: ["bun", "run", sourceEntry, ...process.argv.slice(2)],
    stdio: ["inherit", "inherit", "inherit"]
  });
  process.exit(proc.exitCode);
}

// Otherwise, run the bundled version (this file)
import(join(__dirname, "imbios.js"));
