import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, "..", "..");
const workflow = readFileSync(resolve(root, ".github", "workflows", "integrity.yml"), "utf8");

test("CI reproduces tests, generated artifacts and frozen-ref checks", () => {
  assert.match(workflow, /^name:\s*Integrity/m);
  assert.match(workflow, /permissions:\s*\n\s+contents:\s*read/);
  assert.match(workflow, /fetch-depth:\s*0/);
  assert.match(workflow, /npm ci/);
  assert.match(workflow, /npm test/);
  assert.match(workflow, /node dashboard\/tools\/build\.mjs/);
  assert.match(workflow, /node dashboard\/tools\/build-australia-pilot\.mjs/);
  assert.match(workflow, /git diff --exit-code/);
});
