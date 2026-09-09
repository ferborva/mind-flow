import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync, symlinkSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import test from "node:test";
import { artifactDigests } from "../../meta/build-artifacts.mjs";

test("artifact parity requires real retained output bytes, not missing files or symlinks", () => {
  const root = mkdtempSync(resolve(tmpdir(), "mind-flow-artifact-parity-"));
  try {
    assert.throws(() => artifactDigests(root, ["page.html"]));
    writeFileSync(resolve(root, "page.html"), "original");
    const original = artifactDigests(root, ["page.html"]);
    writeFileSync(resolve(root, "page.html"), "changed");
    assert.notDeepEqual(artifactDigests(root, ["page.html"]), original);
    symlinkSync(resolve(root, "page.html"), resolve(root, "link.html"));
    assert.throws(() => artifactDigests(root, ["link.html"]), /regular file/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
