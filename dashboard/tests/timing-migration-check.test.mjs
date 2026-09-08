import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { cpSync, mkdirSync, mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import test from "node:test";

const root = resolve(import.meta.dirname, "../..");

function copyFixtureTree() {
  const fixtureRoot = mkdtempSync(join(tmpdir(), "timing-migration-check-"));
  const dashboard = join(fixtureRoot, "dashboard");
  for (const directory of ["tools", "timing", "evidence", "snapshots"]) {
    mkdirSync(join(dashboard, directory), { recursive: true });
  }
  cpSync(
    join(root, "dashboard", "tools", "migrate-timing-contract.mjs"),
    join(dashboard, "tools", "migrate-timing-contract.mjs"),
  );
  cpSync(join(root, "dashboard", "timing"), join(dashboard, "timing"), { recursive: true });
  cpSync(join(root, "dashboard", "evidence"), join(dashboard, "evidence"), { recursive: true });
  cpSync(join(root, "dashboard", "snapshots"), join(dashboard, "snapshots"), { recursive: true });
  return dashboard;
}

test("checking the historical r2 migration never rewinds a later snapshot index", () => {
  const dashboard = copyFixtureTree();
  const indexPath = join(dashboard, "snapshots", "index.json");
  const before = readFileSync(indexPath);

  const output = execFileSync(
    process.execPath,
    [join(dashboard, "tools", "migrate-timing-contract.mjs"), "--check"],
    { encoding: "utf8" },
  );

  assert.deepEqual(readFileSync(indexPath), before);
  assert.match(output, /verified historical timing migration/i);
  assert.equal(JSON.parse(before).latest, "2026-09-08.r3");
});
