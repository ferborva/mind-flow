import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const guide = readFileSync(resolve(here, "../transition-field-guide.md"), "utf8");

test("the guide states its purpose, limits and non-authority before asking for trust", () => {
  assert.match(guide, /help people see what is changing.*while there is still time to widen their choices/is);
  assert.match(guide, /does not predict one inevitable future/i);
  assert.match(guide, /does not authorise action/i);
  assert.match(guide, /agent-proposed public guide/i);
  assert.match(guide, /unknown does not mean safe/i);
  assert.match(guide, /unknown does not mean harmful/i);
});

test("the public mnemonic compiles into a complete and scoped promise", () => {
  assert.match(guide, /who.*can.*verb.*object.*standard.*place.*period.*if/is);
  assert.match(guide, /who can do what, to what standard, where and when, if which conditions hold/i);
  assert.match(guide, /necessary/i);
  assert.match(guide, /one sufficient route/i);
  assert.match(guide, /open world/i);
  assert.match(guide, /omitted condition/i);
});

test("condition evolution is visible and changes the decision question", () => {
  for (const transition of [
    "added",
    "narrowed",
    "split",
    "merged",
    "challenged",
    "satisfied",
    "failed",
    "expired",
    "superseded",
    "disputed",
    "withdrawn",
  ]) assert.match(guide, new RegExp(`\\b${transition}\\b`, "i"));

  assert.match(guide, /what changed in the condition/i);
  assert.match(guide, /who changed it/i);
  assert.match(guide, /what evidence and authority permitted the change/i);
  assert.match(guide, /current state alone is not enough/i);
});

test("the guide distinguishes signal roles and refuses a single synthetic verdict", () => {
  for (const role of [
    "leading",
    "confirming",
    "counter",
    "outcome",
    "readiness",
    "intervention-exposure",
    "information-harm",
  ]) assert.match(guide, new RegExp(`\\b${role}\\b`, "i"));

  assert.match(guide, /no single transition score/i);
  assert.match(guide, /a leading signal is not a verdict/i);
  assert.match(guide, /independent collection process/i);
});

test("the guide offers reversible preparation at four scales without inventing commitments", () => {
  for (const scale of ["person", "community", "institution", "country"]) {
    assert.match(guide, new RegExp(`\\b${scale}\\b`, "i"));
  }
  for (const gate of [
    "watch_if",
    "prepare_if",
    "act_if",
    "pause_if",
    "reverse_if",
    "recover_if",
    "graduate_if",
  ]) assert.match(guide, new RegExp(gate, "i"));

  assert.match(guide, /authority.*funding.*capacity.*help.*appeal/is);
  assert.match(guide, /safety of acting.*safety of waiting/is);
  assert.match(guide, /No Observatory-linked service exists/i);
});

test("a public reader gets concrete actions and challenge routes without behavioural pressure", () => {
  assert.match(guide, /What you can do today/i);
  assert.match(guide, /check whether the scope actually includes you/i);
  assert.match(guide, /challenge the evidence, condition, authority or effect/i);
  assert.match(guide, /right to refuse/i);
  assert.match(guide, /what would change this reading/i);
  assert.doesNotMatch(guide, /inevitable losers|resisters|laggards|correct action|countdown/i);
  assert.doesNotMatch(guide, /—/);
});
