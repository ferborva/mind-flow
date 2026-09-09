import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
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
