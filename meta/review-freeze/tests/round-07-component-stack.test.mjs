import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

const root = resolve(import.meta.dirname, "../../..");
const manifest = JSON.parse(readFileSync(
  resolve(root, "reviews/round-07-component-review-manifest.json"),
  "utf8",
));
const receiptExists = existsSync(resolve(
  root,
  "meta/review-freeze/round-07.review-freeze.json",
));

function git(...args) {
  return execFileSync("git", args, { cwd: root, encoding: "utf8" }).trim();
}

test("published component pins resolve to the declared commits, trees and ancestry", () => {
  for (const [index, lane] of manifest.lanes.entries()) {
    if (lane.head_commit === null) {
      assert.equal(index, manifest.lanes.length - 1);
      assert.equal(receiptExists, false);
      assert.equal(lane.head_tree, null);
      continue;
    }
    assert.match(lane.base_commit, /^[0-9a-f]{40}$/);
    assert.match(lane.head_commit, /^[0-9a-f]{40}$/);
    assert.match(lane.head_tree, /^[0-9a-f]{40}$/);
    assert.equal(git("rev-parse", `${lane.head_commit}^{tree}`), lane.head_tree);
    assert.doesNotThrow(() => git("merge-base", "--is-ancestor", lane.base_commit, lane.head_commit));
    assert.equal(
      lane.base_commit,
      index === 0 ? manifest.main_commit : manifest.lanes[index - 1].head_commit,
    );
  }
});

test("the freeze wrapper pins the final component tree to the reviewed candidate tree", () => {
  if (!receiptExists) {
    assert.equal(manifest.candidate_commit, null);
    assert.equal(manifest.candidate_tree, null);
    return;
  }
  const finalLane = manifest.lanes.at(-1);
  assert.match(manifest.candidate_commit, /^[0-9a-f]{40}$/);
  assert.match(manifest.candidate_tree, /^[0-9a-f]{40}$/);
  assert.match(finalLane.head_commit, /^[0-9a-f]{40}$/);
  assert.equal(git("rev-parse", `${manifest.candidate_commit}^{tree}`), manifest.candidate_tree);
  assert.equal(git("rev-parse", `${finalLane.head_commit}^{tree}`), manifest.candidate_tree);
});
