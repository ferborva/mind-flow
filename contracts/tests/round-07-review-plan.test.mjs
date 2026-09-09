import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

const root = resolve(import.meta.dirname, "../..");
const plan = JSON.parse(readFileSync(
  resolve(root, "reviews/round-07-component-review-manifest.json"),
  "utf8",
));

function changedPaths() {
  // A sealed review audits its own immutable candidate, even after later work
  // lands on main or HEAD. An unsealed stack still audits its working head.
  const target = plan.candidate_commit ?? "HEAD";
  return execFileSync("git", ["diff", "--name-only", `${plan.main_commit}...${target}`], {
    cwd: root,
    encoding: "utf8",
  }).trim().split("\n").filter(Boolean);
}

function matches(path, boundary) {
  return boundary.endsWith("/") ? path.startsWith(boundary) : path === boundary;
}

test("Round 07 exposes six ordered, bounded component review lanes", () => {
  assert.equal(plan.schema_version, "1.0.0");
  assert.equal(plan.integration_pr, 2);
  assert.equal(plan.lanes.length, 6);
  assert.deepEqual(plan.lanes.map(({ id }) => id), [
    "R07-L1", "R07-L2", "R07-L3", "R07-L4", "R07-L5", "R07-L6",
  ]);
  for (const [index, lane] of plan.lanes.entries()) {
    assert.ok(lane.title.length > 5);
    assert.ok(lane.head_branch.startsWith("ren/round-07-"));
    assert.equal(lane.base_branch, index === 0 ? "main" : plan.lanes[index - 1].head_branch);
    assert.deepEqual(lane.depends_on, index === 0 ? [] : [plan.lanes[index - 1].id]);
    assert.ok(lane.paths.length > 0);
    assert.ok(lane.check_commands.length > 0);
    assert.match(lane.verification_scope, /^(partial|complete)-/);
    assert.equal(lane.independently_mergeable, false);
    assert.equal(lane.reviewable_as_bounded_diff, true);
  }
  assert.equal(plan.boundaries.independent_retest_completed, false);
  assert.equal(plan.boundaries.publication_authority_created, false);
  assert.equal(plan.boundaries.operational_authority_created, false);
});

test("partial lane checks disclose every deferred cross-layer suite", () => {
  const formalLane = plan.lanes.find(({ id }) => id === "R07-L3");
  const pilotLane = plan.lanes.find(({ id }) => id === "R07-L4");
  assert.deepEqual(formalLane.deferred_checks, [
    "npm run test:evidence",
    "npm run test:integration",
    "npm run test:governance",
  ]);
  assert.deepEqual(pilotLane.deferred_checks, [
    "npm run test:pilot",
    "npm run test:rehearsal",
  ]);
  assert.ok(plan.lanes.at(-1).check_commands.includes("npm test"));
});

test("every changed path belongs to exactly one component lane", () => {
  const allBoundaries = plan.lanes.flatMap((lane) =>
    lane.paths.map((boundary) => ({ lane: lane.id, boundary })));
  for (const path of changedPaths()) {
    const owners = allBoundaries.filter(({ boundary }) => matches(path, boundary));
    assert.equal(owners.length, 1, `${path} has ${owners.length} review-lane owners`);
  }
});
