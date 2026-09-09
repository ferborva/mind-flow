import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync, symlinkSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import test from "node:test";
import { artifactDigests, reproduceArtifacts } from "../../meta/build-artifacts.mjs";

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

test("changing a builder cannot bless its own new output in check mode", () => {
  const root = mkdtempSync(resolve(tmpdir(), "mind-flow-builder-lock-"));
  try {
    const builder = resolve(root, "builder.mjs");
    const options = { commands: [[builder]], paths: ["page.html"], lockPath: "outputs.lock.json" };
    writeFileSync(builder, 'import fs from "node:fs"; fs.writeFileSync("page.html", "reviewed output");');
    reproduceArtifacts(root, { ...options, mode: "write-lock" });
    assert.doesNotThrow(() => reproduceArtifacts(root, { ...options, mode: "check" }));
    writeFileSync(builder, 'import fs from "node:fs"; fs.writeFileSync("page.html", "changed output");');
    assert.throws(() => reproduceArtifacts(root, { ...options, mode: "check" }), /retained artifact lock/);
    // Repeating an internally consistent changed build must still fail.
    assert.throws(() => reproduceArtifacts(root, { ...options, mode: "check" }), /retained artifact lock/);
  } finally { rmSync(root, { recursive: true, force: true }); }
});
