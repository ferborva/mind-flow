import assert from "node:assert/strict";

export function assertReproductionCannotBeWeakened(workflow) {
  assert.ok(workflow.includes('test -z "$(git status --porcelain --untracked-files=all)"'),
    "CI must reject all untracked files as well as tracked drift");
  assert.equal(workflow.includes("--allow-failed-reproduction"), false,
    "CI must not accept failed reproduction receipts");
}
