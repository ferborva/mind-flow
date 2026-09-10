import assert from "node:assert/strict";
import test from "node:test";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

test("live CLI rejects future clocks before accessing absent terminal records or archive paths", () => {
  const future = new Date(Date.UTC(new Date().getUTCFullYear() + 1, 0, 1)).toISOString().replace(".000Z", "Z");
  for (const directory of ["round-08-nero", "round-09-nero", "round-09-nero-corrected"]) {
    const path = fileURLToPath(new URL(`../${directory}/check-resolution.mjs`, import.meta.url));
    const arguments_ = ["forecast", "archive", "first-presence", "chronology", "chronology-tip", "plan"]
      .flatMap((name) => [`--${name}`, "/does-not-exist-test-only"]);
    const result = spawnSync(process.execPath, [path, ...arguments_, "--source", "https://www.jobsandskills.gov.au/data/nero",
      "--published-at", future, "--retrieved-at", future, "--as-of", future], { encoding: "utf8" });
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /operational intake rejects future/);
    assert.doesNotMatch(result.stderr, /ENOENT/);
  }
});
