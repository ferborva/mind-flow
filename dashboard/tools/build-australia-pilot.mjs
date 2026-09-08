#!/usr/bin/env node

import { readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, "..", "..");
const pilot = resolve(root, "pilots", "australia");
const baselinePath = resolve(process.argv[2] || resolve(pilot, "data", "nero-clerical-2026-08.json"));
const outputPath = resolve(process.argv[3] || resolve(pilot, "web", "index.html"));
const templatePath = resolve(pilot, "web", "index.template.html");

try {
  const template = readFileSync(templatePath, "utf8");
  const placeholderCount = template.split("__NERO_BASELINE__").length - 1;
  if (placeholderCount !== 1) {
    throw new Error(`Expected one __NERO_BASELINE__ placeholder, found ${placeholderCount}`);
  }

  const baseline = JSON.parse(readFileSync(baselinePath, "utf8"));
  if (baseline.epistemic_class !== "modelled-estimate" || !Array.isArray(baseline.series)) {
    throw new Error("Input is not a NERO modelled-estimate baseline");
  }
  const serialised = JSON.stringify(baseline).replaceAll("</", "<\\/");
  writeFileSync(outputPath, template.replace("__NERO_BASELINE__", serialised), "utf8");
  process.stdout.write(`Built ${outputPath} from ${baselinePath}\n`);
} catch (error) {
  process.stderr.write(`Australia pilot build failed: ${error.message}\n`);
  process.exitCode = 1;
}
