import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { dirname, resolve, sep } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, "..", "..");
const packRoot = resolve(root, "reviews", "external", "round-03");
const manifest = JSON.parse(readFileSync(resolve(packRoot, "manifest.json"), "utf8"));
const brief = readFileSync(resolve(packRoot, "README.md"), "utf8");
const reviewIndex = readFileSync(resolve(root, "reviews", "README.md"), "utf8");

function checksumReviewedBlob(path) {
  const bytes = execFileSync("git", ["show", `${manifest.reviewed_commit}:${path}`], {
    cwd: root,
    encoding: "buffer",
    maxBuffer: 25 * 1024 * 1024,
  });
  return `sha256:${createHash("sha256").update(bytes).digest("hex")}`;
}

test("the round-three pack pins the exact reviewed programme bytes", () => {
  assert.equal(manifest.schema_version, "1.0.0");
  assert.match(manifest.reviewed_commit, /^[a-f0-9]{40}$/);
  assert.equal(manifest.public_release_allowed, false);
  assert.equal(manifest.independent_review_status, "not-started");
  assert.equal(manifest.internal_test_result.total, 405);
  assert.equal(manifest.internal_test_result.failed, 0);
  assert.ok(manifest.artifacts.length >= 24);

  const paths = manifest.artifacts.map((artifact) => artifact.path);
  assert.equal(new Set(paths).size, paths.length, "artifact paths must be unique");

  for (const artifact of manifest.artifacts) {
    const absolutePath = resolve(root, artifact.path);
    assert.ok(absolutePath.startsWith(`${root}${sep}`), `${artifact.path} escapes the repository`);
    assert.match(artifact.role, /\S/);
    assert.equal(
      artifact.checksum,
      checksumReviewedBlob(artifact.path),
      `${artifact.path} does not match reviewed commit ${manifest.reviewed_commit}`,
    );
  }
});

test("the external review request is blind, plural and cannot imply approval", () => {
  assert.match(brief, new RegExp(manifest.reviewed_commit));
  assert.match(brief, /public release remains blocked/i);
  assert.match(brief, /internal.*pass.*not.*closure/is);
  assert.match(brief, /blind first pass/i);
  assert.match(brief, /do not read.*other review/is);
  assert.match(brief, /affected-part/i);
  assert.match(brief, /authority/i);
  assert.match(brief, /accessibility/i);
  assert.match(brief, /falsif/i);
  assert.match(brief, /severity/i);
  assert.doesNotMatch(brief, /approved for public release/i);

  assert.ok(manifest.review_lanes.length >= 8);
  assert.ok(manifest.known_stop_lines.length >= 8);
  assert.ok(manifest.required_attacks.length >= 10);
  assert.ok(manifest.test_commands.includes("npm test"));
});

test("the review index exposes the frozen round-three entry point", () => {
  assert.match(reviewIndex, /external\/round-03\/README\.md/);
  assert.match(reviewIndex, /f5b3b643e80e0f16d7dadd13805df6accf9526ed/);
});
