import assert from "node:assert/strict";

export function assertRound10ReplaySteps(workflow) {
  for (const [name, command] of [
    ['Reproduce retained Round 10 income indicators', 'node signals/countries/tools/income-measurements.mts --check'],
    ['Replay retained Canadian forecast design', 'node forecasts/prospective-pilot/round-10-canada/draft.mts --check'],
    ['Replay Canadian statistical predicate basis', 'node forecasts/prospective-pilot/round-10-canada/build-basis.mts --check'],
  ]) {
    const parts = workflow.split(`      - name: ${name}\n`);
    assert.equal(parts.length, 2, `${name} must occur exactly once`);
    assert.equal(parts[1].split('\n      - name:')[0].trim(), `run: ${command}`,
      `${name} must run exactly and unconditionally`);
  }
}

export function assertReproductionCannotBeWeakened(workflow) {
  assert.ok(workflow.includes('test -z "$(git status --porcelain --untracked-files=all)"'),
    "CI must reject all untracked files as well as tracked drift");
  assert.equal(workflow.includes("--allow-failed-reproduction"), false,
    "CI must not accept failed reproduction receipts");
}
