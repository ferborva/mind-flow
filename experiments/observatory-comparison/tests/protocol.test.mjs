import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

const root = resolve(import.meta.dirname, "..");
const protocol = readFileSync(resolve(root, "README.md"), "utf8");

test("the instrument competes against simpler explanations, not a straw baseline", () => {
  assert.match(protocol, /conventional statistical release/i);
  assert.match(protocol, /release plus facilitated deliberation/i);
  assert.match(protocol, /Observatory plus identical deliberation/i);
  assert.match(protocol, /same facts.*uncertainty.*scope.*source.*decision context/is);
  assert.match(protocol, /Observatory may\s+lose/i);
});

test("the comparison registers causal estimands and limits before exposure", () => {
  assert.match(protocol, /primary estimand/i);
  assert.match(protocol, /allocation concealment/i);
  assert.match(protocol, /analysis plan.*before.*first participant/is);
  assert.match(protocol, /within.*study session.*not.*general population/is);
  assert.match(protocol, /contamination.*attrition.*missingness.*multiplicity/is);
});

test("decision quality means bounded understanding rather than political compliance", () => {
  assert.match(protocol, /evidence-and-authority-appropriate/i);
  assert.match(protocol, /not\s+agreement with the project's\s+preferred future/i);
  assert.doesNotMatch(protocol, /\bcorrect action\b/i);
  for (const danger of [
    "aggregate-to-person inference",
    "scenario as forecast",
    "option as commitment",
    "inaction as safe",
    "crisis as established",
  ]) assert.match(protocol, new RegExp(danger, "i"));
});

test("affected groups and harms cannot be averaged into a mean win", () => {
  assert.match(protocol, /directly affected participants/i);
  assert.match(protocol, /anxiety.*stigma.*dignity.*false reassurance/is);
  assert.match(protocol, /subgroup stop line/i);
  assert.match(protocol, /cannot be offset by/i);
  assert.match(protocol, /accessible.*low-bandwidth.*screen-reader.*numeracy/is);
});

test("each instrument hypothesis has an IF, discriminator and retirement rule", () => {
  assert.match(protocol, /IF the Observatory/i);
  assert.match(protocol, /discriminating observation/i);
  assert.match(protocol, /retire or narrow/i);
  assert.match(protocol, /no operational warning.*no individual consequence/is);
});
