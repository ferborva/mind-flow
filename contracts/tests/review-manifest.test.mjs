import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { dirname, resolve, sep } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, "..", "..");
const manifestPath = resolve(root, "reviews", "round-02-manifest.json");
const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));

function checksumFrozenBlob(path) {
  const bytes = execFileSync("git", ["show", `${manifest.freeze_ref}:${path}`], {
    cwd: root,
    encoding: "buffer",
    maxBuffer: 20 * 1024 * 1024,
  });
  return `sha256:${createHash("sha256").update(bytes).digest("hex")}`;
}

test("round-two review manifest pins every declared artifact inside the repository", () => {
  assert.equal(manifest.schema_version, "1.0.0");
  assert.equal(manifest.freeze_ref, "review/round-02");
  assert.equal(manifest.public_release_allowed, false);
  assert.ok(manifest.artifacts.length >= 15);

  const paths = manifest.artifacts.map((artifact) => artifact.path);
  assert.equal(new Set(paths).size, paths.length, "artifact paths must be unique");

  for (const artifact of manifest.artifacts) {
    const path = resolve(root, artifact.path);
    assert.ok(path.startsWith(`${root}${sep}`), `${artifact.path} escapes the repository`);
    assert.match(artifact.role, /\S/);
    assert.equal(
      artifact.checksum,
      checksumFrozenBlob(artifact.path),
      `${artifact.path} does not match the immutable ${manifest.freeze_ref} blob`,
    );
  }
});

test("the review brief cannot be mistaken for approval", () => {
  const brief = readFileSync(resolve(root, "reviews", "external-review-brief-round-02.md"), "utf8");
  assert.match(brief, /public release remains blocked/i);
  assert.match(brief, /External agent review cannot satisfy/i);
  assert.match(brief, /affected-party, accessibility/i);
  assert.match(brief, /severity/i);
  assert.match(brief, /falsif/i);
  assert.match(brief, /review\/round-02/);
});
