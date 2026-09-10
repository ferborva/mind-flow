import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFileSync, writeFileSync, lstatSync } from "node:fs";
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
    const target = resolve(root, path);
    let stat;
    try { stat = lstatSync(target); }
    catch (cause) {
      if (cause.code !== "ENOENT") throw cause;
      const error = new Error(`Generated artifact is missing: ${path}. Run npm run build:artifacts, then rerun --check against the retained lock.`, { cause });
      error.code = "ARTIFACT_OUTPUT_MISSING";
      error.path = path;
      throw error;
    }
    if (!stat.isFile() || stat.isSymbolicLink()) throw new Error(`Artifact must be a regular file: ${path}`);
    return { path, sha256: createHash("sha256").update(readFileSync(target)).digest("hex") };
  });
}

function defaultCommands(root) {
const index = JSON.parse(readFileSync(resolve(root, "dashboard/snapshots/index.json"), "utf8"));
if (!/^\d{4}-\d{2}-\d{2}(?:\.r\d+)?$/.test(index.latest)) {
  throw new Error("The latest snapshot must have a dated record identity");
}
return [
  ["dashboard/tools/build.mjs", `dashboard/snapshots/${index.latest}.json`, "dashboard/web/index.html"],
  ["pilots/australia/tools/correct-baseline-classification.mjs", "--check"],
  ["pilots/australia/tools/primary-care-review.mts", "--check"],
  ["pilots/australia/tools/current-primary-care.mts", "--check"],
  ["pilots/australia/tools/measurement-depth.mts", "--check"],
  ["pilots/australia/tools/evolution-discoveries.mts", "--check"],
  ["dashboard/tools/build-australia-pilot.mjs", "pilots/australia/data/nero-clerical-2026-08.r2.json", "pilots/australia/web/index.html"],
  ["dashboard/observatory/build.mjs"],
  ["experiments/observatory-comparison/render.mjs"],
];
}

export function reproduceArtifacts(root, {
  mode = "build", commands = defaultCommands(root), paths = GENERATED_OUTPUTS,
  lockPath = "meta/build-artifacts.lock.json",
} = {}) {
  if (!["build", "check", "write-lock"].includes(mode)) throw new Error("Unknown artifact operation");
  const assertLock = () => {
    const stat = lstatSync(resolve(root, lockPath));
    if (!stat.isFile() || stat.isSymbolicLink()) throw new Error("Retained artifact lock must be a regular file");
    const lock = JSON.parse(readFileSync(resolve(root, lockPath), "utf8"));
    const expected = { version: 1, outputs: artifactDigests(root, paths) };
    if (JSON.stringify(lock) !== JSON.stringify(expected)) {
      throw new Error("Generated output differs from the retained artifact lock; review the builder/input change before explicitly updating the lock");
    }
  };
  if (mode === "check") assertLock();
for (const argv of commands) {
  try {
    execFileSync(process.execPath, argv, { cwd: root, stdio: "inherit",
      env: { ...process.env, PYTHONDONTWRITEBYTECODE: "1" } });
  } catch (error) {
    throw new Error(`Artifact build failed: ${argv[0]}`, { cause: error });
  }
}
  if (mode === "write-lock") {
    writeFileSync(resolve(root, lockPath), JSON.stringify({ version: 1, outputs: artifactDigests(root, paths) }, null, 2) + "\n");
  } else if (mode === "check") assertLock();
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2);
  if (args.some((arg) => !["--check", "--write-lock"].includes(arg)) || args.length > 1) {
    throw new Error("Usage: node meta/build-artifacts.mjs [--check|--write-lock]");
  }
  reproduceArtifacts(resolve(import.meta.dirname, ".."), {
    mode: args.includes("--check") ? "check" : args.includes("--write-lock") ? "write-lock" : "build",
  });
}
