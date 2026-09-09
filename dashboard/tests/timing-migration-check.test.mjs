import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { appendFileSync, cpSync, mkdirSync, mkdtempSync, readFileSync } from "node:fs";
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

test("the historical migration verifies both 2026-09-07 revisions without rewinding the index", () => {
  const dashboard = copyFixtureTree();
  const indexPath = join(dashboard, "snapshots", "index.json");
  const before = readFileSync(indexPath);

  const output = execFileSync(
    process.execPath,
    [join(dashboard, "tools", "migrate-timing-contract.mjs"), "--check"],
    { encoding: "utf8", stdio: "pipe" },
  );

  assert.deepEqual(readFileSync(indexPath), before);
  assert.match(output, /Verified historical timing migration/);
  assert.match(output, /Original sha256:949a9d3f/);
  assert.match(output, /Correction sha256:9abcde33/);
  assert.equal(JSON.parse(before).latest, "2026-09-09.r1");
});

test("the historical migration rejects drift in either 2026-09-07 revision", () => {
  for (const filename of ["2026-09-07.json", "2026-09-07.r2.json"]) {
    const dashboard = copyFixtureTree();
    const indexPath = join(dashboard, "snapshots", "index.json");
    const before = readFileSync(indexPath);
    appendFileSync(join(dashboard, "snapshots", filename), "\n");

    assert.throws(
      () => execFileSync(
        process.execPath,
        [join(dashboard, "tools", "migrate-timing-contract.mjs"), "--check"],
        { encoding: "utf8", stdio: "pipe" },
      ),
      new RegExp(`${filename.replaceAll(".", "\\.")} changed`, "i"),
    );
    assert.deepEqual(readFileSync(indexPath), before);
  }
});
