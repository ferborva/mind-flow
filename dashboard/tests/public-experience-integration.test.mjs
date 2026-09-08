import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

import { validatePublicExperienceRecord } from
  "../../communications/public-experience-contract.mjs";

const root = resolve(import.meta.dirname, "../..");
const template = readFileSync(
  resolve(root, "dashboard/web/index.template.html"),
  "utf8",
);
const fixture = JSON.parse(readFileSync(
  resolve(root, "communications/fixtures/public-experience.prototype.json"),
  "utf8",
));

test("the dashboard first layer preserves the executable public contract", () => {
  const result = validatePublicExperienceRecord(fixture);
  assert.equal(result.valid, true, result.errors.join("\n"));

  for (const phrase of [
    "RESEARCH PROTOTYPE",
    "NOT LIVE",
    "NO SERVICE OR POLICY AUTHORITY",
    "CURRENT READ",
    "SCOPE AND APPLICABILITY",
    "IF STATUS",
    "ACTION, HELP AND SAFETY",
    "MONITORING",
    "PROPOSED GOAL (VALUE CHOICE)",
    "EVIDENCE STATE",
    "PATH STATUS",
    "WHAT WOULD CHANGE THIS READING?",
  ]) assert.match(template, new RegExp(phrase.replace(/[?()]/g, "\\$&"), "i"));

  assert.match(template, /does not establish that waiting is safe/i);
  assert.match(template, /No Observatory-linked help or challenge service exists/i);
  assert.match(template, /alternative goals and dissent remain legitimate/i);
  assert.match(template, /MONITORING INACTIVE/i);
});

test("unsupported WHEN, harm and evolution layers fail visibly rather than disappearing", () => {
  assert.match(
    template,
    /No actor-specific WHEN hypotheses are bound to this snapshot/i,
  );
  assert.match(
    template,
    /No acting, waiting or information-harm assessment is bound to this snapshot/i,
  );
  assert.match(
    template,
    /Condition history is not bound to this snapshot/i,
  );
});
