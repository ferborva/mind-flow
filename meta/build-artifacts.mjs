import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFileSync, lstatSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

export const GENERATED_OUTPUTS = Object.freeze([
  "dashboard/web/index.html", "pilots/australia/web/index.html",
  "dashboard/observatory/data.js",
  "experiments/observatory-comparison/rendered/conventional-release.html",
  "experiments/observatory-comparison/rendered/observatory-self-serve.html",
]);

export function artifactDigests(root, paths = GENERATED_OUTPUTS) {
  return paths.map((path) => {
    const target = resolve(root, path), stat = lstatSync(target);
    if (!stat.isFile() || stat.isSymbolicLink()) throw new Error(`Artifact must be a regular file: ${path}`);
    return { path, sha256: createHash("sha256").update(readFileSync(target)).digest("hex") };
  });
}

const root = resolve(import.meta.dirname, "..");
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
const args = process.argv.slice(2);
if (args.some((arg) => arg !== "--check") || args.length > 1) throw new Error("Usage: node meta/build-artifacts.mjs [--check]");
const previous = args.includes("--check") ? artifactDigests(root) : null;
const index = JSON.parse(readFileSync(resolve(root, "dashboard/snapshots/index.json"), "utf8"));
if (!/^\d{4}-\d{2}-\d{2}(?:\.r\d+)?$/.test(index.latest)) {
  throw new Error("The latest snapshot must have a dated record identity");
}
const commands = [
  ["dashboard/tools/build.mjs", `dashboard/snapshots/${index.latest}.json`, "dashboard/web/index.html"],
  ["pilots/australia/tools/correct-baseline-classification.mjs", "--check"],
  ["dashboard/tools/build-australia-pilot.mjs", "pilots/australia/data/nero-clerical-2026-08.r2.json", "pilots/australia/web/index.html"],
  ["dashboard/observatory/build.mjs"],
  ["experiments/observatory-comparison/render.mjs"],
];
for (const argv of commands) {
  try {
    execFileSync(process.execPath, argv, { cwd: root, stdio: "inherit",
      env: { ...process.env, PYTHONDONTWRITEBYTECODE: "1" } });
  } catch (error) {
    throw new Error(`Artifact build failed: ${argv[0]}`, { cause: error });
  }
}
const rebuilt = artifactDigests(root);
if (previous && JSON.stringify(previous) !== JSON.stringify(rebuilt)) {
  throw new Error("Generated artifacts differed from their deterministic rebuild");
}
}
