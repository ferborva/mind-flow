#!/usr/bin/env node

import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { projectExecutableIfEvolution } from "../project-executable-if.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, "../../..");
const kernelPath = resolve(root, "contracts/executable-if/fixtures/kernel.synthetic.json");
const outputPath = resolve(here, "../fixtures/round-04.worker-option.synthetic.json");
const kernelBytes = readFileSync(kernelPath);
const kernel = JSON.parse(kernelBytes.toString("utf8"));
const artifactSha256 = `sha256:${createHash("sha256").update(kernelBytes).digest("hex")}`;
const overlay = projectExecutableIfEvolution(kernel, {
  artifact_path: "contracts/executable-if/fixtures/kernel.synthetic.json",
  artifact_sha256: artifactSha256,
  generated_at: "2026-09-09T00:00:00Z",
  ledger_id: "ledger.round-04.worker-option.synthetic",
});
const rendered = `${JSON.stringify(overlay, null, 2)}\n`;

if (process.argv.includes("--check")) {
  const retained = readFileSync(outputPath, "utf8");
  if (retained !== rendered) {
    throw new Error("Round 4 executable IF evolution fixture is stale; run the builder");
  }
  console.log("Round 4 executable IF evolution fixture is reproducible");
} else {
  mkdirSync(dirname(outputPath), { recursive: true });
  writeFileSync(outputPath, rendered);
  console.log(`Built ${outputPath}`);
}
