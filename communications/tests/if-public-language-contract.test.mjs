import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const contract = readFileSync(
  resolve(here, "../if-public-language-contract.md"),
  "utf8",
);

test("the public grammar completes each claim class with a scoped IF", () => {
  assert.match(contract, /verb \+ \[blank\] \+ IF/i);
  for (const claimClass of [
    "outcome claim",
    "forecast claim",
    "option claim",
    "commitment claim",
    "negotiation claim",
    "refusal or no-deployment claim",
    "redistribution claim",
    "reduction claim",
  ]) assert.match(contract, new RegExp(`\\b${claimClass}\\b`, "i"));
  assert.match(contract, /WHO[\s\S]*VERB[\s\S]*OBJECT[\s\S]*IF[\s\S]*SCOPE[\s\S]*EVIDENCE[\s\S]*AUTHORITY/i);
});

test("claim classes cannot borrow certainty or authority from one another", () => {
  for (const boundary of [
    /A forecast does not make an option necessary/i,
    /An eligible option is not a commitment/i,
    /A commitment requires separately verified authority/i,
    /A negotiation opening is not an agreed settlement/i,
    /Refusal is not evidence that deployment is harmful/i,
    /Redistribution is a value and authority choice/i,
    /Reduction must name what is reduced and what is protected/i,
  ]) assert.match(contract, boundary);
});

test("condition evolution is typed and keeps visible history", () => {
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
  ]) assert.match(contract, new RegExp(`\\b${transition}\\b`, "i"));
  assert.match(contract, /append-only condition history/i);
  assert.match(contract, /previous wording[\s\S]*previous scope[\s\S]*previous evidence[\s\S]*reason[\s\S]*author/i);
  assert.match(contract, /Disputed is not false/i);
  assert.match(contract, /Superseded is not deleted/i);
});

test("no automated action does not imply that inaction is safe", () => {
  assert.match(contract, /No automated action[\s\S]*does not mean[\s\S]*inaction is safe/i);
  assert.match(contract, /safety of acting[\s\S]*safety of waiting[\s\S]*separately/i);
  assert.match(contract, /No automated action is authorised/i);
  assert.match(contract, /The evidence does not establish that waiting is safe/i);
});

test("public choices are evidence-and-authority appropriate and non-priming", () => {
  assert.match(contract, /evidence-and-authority-appropriate choice/i);
  assert.doesNotMatch(contract, /\bcorrect action\b/i);
  assert.match(contract, /same factual description[\s\S]*credible alternatives[\s\S]*evidence-proportional prominence/i);
  assert.match(contract, /credible alternative[\s\S]*discriminating observation[\s\S]*predeclared display rule/i);
  assert.doesNotMatch(contract, /credible alternatives[\s\S]{0,80}same prominence/i);
  assert.match(contract, /does not prove inevitable|does not establish inevitability/i);
  assert.match(contract, /No countdowns, inevitability language, moral labels or instructions to fear/i);
  assert.doesNotMatch(contract, /resisters|laggards|irrational opposition|inevitable losers/i);
  assert.doesNotMatch(contract, /—/);
});

test("every public rendering exposes uncertainty, dissent and the next review", () => {
  for (const field of [
    "What is known",
    "What remains unknown",
    "Who may challenge it",
    "What happens if the IF fails",
    "What happens if no choice is made",
    "When it will be reviewed",
  ]) assert.match(contract, new RegExp(field, "i"));
});
