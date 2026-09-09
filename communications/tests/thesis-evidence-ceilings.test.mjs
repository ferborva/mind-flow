import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

const root = resolve(import.meta.dirname, "../..");
const nameTheIf = readFileSync(resolve(root, "drafts/name-the-if.md"), "utf8");
const when = readFileSync(resolve(root, "drafts/every-if-is-somebodys-when.md"), "utf8");
const programme = readFileSync(resolve(root, "meta/abundance-transition-programme.md"), "utf8").replace(/\s+/g, " ");

test("the IF grammar remains a proposed reporting method rather than a validated diagnosis", () => {
  assert.match(nameTheIf, /reporting grammar/i);
  assert.match(nameTheIf, /has not yet been shown to\s+identify the true binding condition/i);
  assert.match(nameTheIf, /register of candidate conditions, not a\s+diagnosis or forecast/i);
  assert.doesNotMatch(nameTheIf, /Every abundance promise has the shape/i);
  assert.doesNotMatch(nameTheIf, /What you get is diagnosis/i);
});

test("the poverty paragraph retains vintage, nowcast and inference ceilings", () => {
  assert.match(nameTheIf, /March\s+2026 World Bank Poverty and Inequality Platform vintage/i);
  assert.match(nameTheIf, /Values after 2024 are nowcasts/i);
  assert.match(nameTheIf, /not an\s+official World Bank global poverty line/i);
  assert.match(nameTheIf, /do not identify who abundance rhetoric addresses/i);
  assert.doesNotMatch(nameTheIf, /talking to the other fifth/i);
});

test("the supply argument keeps consumer IFs and actor WHENs linked but non-identical", () => {
  assert.match(when, /two registers are linked but non-identical/i);
  assert.match(when, /not a\s+validated linguistic test/i);
  assert.match(when, /Public, social-insurance and private delivery arrangements/i);
  assert.doesNotMatch(when, /Same conditions\. Different verb/i);
  assert.doesNotMatch(when, /there are two kinds of people/i);
  assert.doesNotMatch(when, /Nobody in a large company/i);
});

test("the measurement programme retains advisory boundaries and advances its checkpoint", () => {
  assert.match(programme, /controls are advisory\s+library and build boundaries/i);
  assert.match(programme, /Current checkpoint: Round 08 measurement/i);
  assert.match(programme, /seven-artifact pre-projection core/i);
  assert.match(programme, /eight-artifact complete core/i);
  assert.match(programme, /caller-supplied identities.*successful local\s+checks do not establish an operational institution/i);
  assert.match(programme, /transition-bundle assessment/i);
  assert.doesNotMatch(programme, /repository is a provenance-safe system/i);
  assert.doesNotMatch(programme, /Block public issuance at a machine-readable governance boundary/i);
});

test("the programme treats goals, paths, harms and federation as governed choices", () => {
  assert.match(programme, /could expand or contract shared(?: human)?\s+agency/is);
  assert.match(programme, /shape, refuse, reverse[\s>]+or navigate possible transitions/is);
  assert.match(programme, /Empirical hypotheses\s+name rivals, falsifiers and expiry/is);
  assert.match(programme, /Value choices name the chooser, affected\s+parties, dissent and review/is);
  assert.match(programme, /Commitments name authority, funding, safeguards,\s+review and exit/is);
  assert.match(programme, /Paths may branch,\s+loop, stop or remain unauthorised/is);
  assert.match(programme, /severity, adjudicator, remedy and how\s+conflicts between protections are resolved/is);
  assert.match(programme, /historical baseline win opens only a preregistered, prospective,\s+no-consequence rehearsal/is);
  assert.match(programme, /G0-G10 human protocol/i);
  assert.match(programme, /small invariant core.*explicit local extensions/is);
  assert.match(programme, /prohibit country or community league\s+tables/is);
});
