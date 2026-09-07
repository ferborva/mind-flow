#!/usr/bin/env node

import { readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const dashboard = resolve(here, "..");
const snapshotPath = resolve(process.argv[2] || resolve(dashboard, "snapshots", "2026-09-07.json"));
const outputPath = resolve(process.argv[3] || resolve(dashboard, "web", "index.html"));
const templatePath = resolve(dashboard, "web", "index.template.html");

try {
  const template = readFileSync(templatePath, "utf8");
  const placeholderCount = template.split("__SNAPSHOT__").length - 1;
  if (placeholderCount !== 1) {
    throw new Error(`Expected one __SNAPSHOT__ placeholder, found ${placeholderCount}`);
  }

  const snapshot = JSON.parse(readFileSync(snapshotPath, "utf8"));
  const serialised = JSON.stringify(snapshot).replaceAll("</", "<\\/");
  writeFileSync(outputPath, template.replace("__SNAPSHOT__", serialised), "utf8");
  process.stdout.write(`Built ${outputPath} from ${snapshotPath}\n`);
} catch (error) {
  process.stderr.write(`Dashboard build failed: ${error.message}\n`);
  process.exitCode = 1;
}
