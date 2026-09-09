import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

const root = resolve(import.meta.dirname, "../..");
const protocol = readFileSync(resolve(root, "evidence/world-reconstruction-protocol.md"), "utf8");
const plan = readFileSync(resolve(root, "meta/round-03-deep-plan.md"), "utf8");
const programme = readFileSync(resolve(root, "meta/abundance-transition-programme.md"), "utf8");
const pilotSources = readFileSync(resolve(
  root,
  "research/2026-09-08-australia-pilot-source-triage.md",
), "utf8");
const affectedPartyAmendments = readFileSync(resolve(
  root,
  "reviews/round-03-affected-party-amendments.md",
), "utf8");

test("household access keeps units, pooled cash costs and persons explicit", () => {
  assert.match(protocol, /registered analysis unit `u`/i);
  assert.match(protocol, /cash_access_margin\(u\)/);
  assert.match(protocol, /cash_co_payment_total\(u\)/);
  assert.match(protocol, /travel_time\(u, j\).*wait_time\(u, j\).*complement_available\(u, j\)/is);
  assert.doesNotMatch(protocol, /cash_pass\(h\)\s*=\s*cash_margin\(h\)/);
  assert.doesNotMatch(protocol, /total_money_time_and_complement_cost/);
  assert.match(protocol, /person-level.*cannot be inferred from.*household-level/is);
  assert.match(protocol, /If `u` is a person[\s\S]*shared household costs[\s\S]*preregistered\s+allocation\s+rule/is);
  assert.match(protocol, /allocation shares[\s\S]*sum to one/i);
  assert.match(protocol, /household unit `h`/i);
});

test("change operators and cross-country E2a units are unambiguous", () => {
  assert.match(protocol, /change\(x; a, b\) = x_b - x_a/);
  assert.match(protocol, /annual.*delta_1.*endpoint.*delta_\[a,b\]/is);
  assert.match(protocol, /fixed-base employment-weighted mean of country-level per-hour\s+log-change differences/i);
  assert.match(protocol, /weighting unit.*employed person.*outcome unit.*hour/is);
});

test("causal analysis starts from competing graphs rather than one privileged story", () => {
  for (const candidate of [
    "technology-push",
    "macro-demand",
    "sector-composition",
    "measurement-and-reclassification",
    "policy-and-ownership",
  ]) assert.match(plan, new RegExp(candidate, "i"));
  assert.match(plan, /no graph is the default causal explanation/i);
  assert.match(programme, /competing causal graphs/i);
});

test("the claim firewall classifies atomic claims on independent axes", () => {
  assert.match(plan, /atomic claim/i);
  assert.match(plan, /epistemic class.*provenance role.*support state.*publication disposition/is);
  assert.doesNotMatch(plan, /A sentence may occupy one row only/i);
  assert.match(plan, /NERO.*modelled estimate/i);
  assert.doesNotMatch(plan, /NERO shows a modelled employment path.*Source-limited observation/i);
});

test("the public horizon does not prime one preferred transition", () => {
  assert.match(plan, /expansion.*redistribution.*reduction.*no-deployment.*refusal/is);
  assert.match(programme, /no-deployment.*refusal/is);
  assert.match(programme, /positive-horizon language.*value choice/i);
});

test("forecast, preparation and inaction claims retain their distinct limits", () => {
  assert.match(plan, /research-only\s+forecast.*may have no operational owner/is);
  assert.match(plan, /decision-linked forecast.*named owner/is);
  assert.match(plan, /readiness.*does not establish.*intervention effectiveness/is);
  assert.match(plan, /fail-closed.*does not establish that inaction is safe/is);
  assert.match(plan, /prospective holdout/i);
  assert.match(plan, /irreversible.*higher gate/is);
  assert.doesNotMatch(plan, /correct action/i);
});

test("condition evolution is a first-class append-only programme object", () => {
  assert.match(plan, /append-only condition history/i);
  assert.match(plan, /previous wording.*previous scope.*previous evidence.*author.*reason/is);
  assert.match(plan, /added.*narrowed.*split.*merged.*challenged.*satisfied.*failed.*expired.*superseded.*disputed.*withdrawn/is);
  assert.match(plan, /current state.*history/is);
});

test("the programme separates goals, conditions, signals, metrics and action hypotheses", () => {
  assert.match(programme, /contracts\/agency-map\/README\.md/);
  assert.match(programme, /goal.*value choice.*condition.*signal.*metric.*action hypothes/is);
  assert.match(programme, /consumer.*IF.*provider.*WHEN/is);
  assert.match(programme, /WHEN.*not.*forecast.*commitment/is);
  assert.match(programme, /concurrent.*dependency-bound/is);
});

test("the programme binds possible paths and the complete seven-step action ladder", () => {
  assert.match(programme, /paths\/README\.md/);
  for (const gate of [
    "watch_if",
    "prepare_if",
    "act_if",
    "pause_if",
    "reverse_if",
    "recover_if",
    "graduate_if",
  ]) assert.match(programme, new RegExp(gate));
});

test("the Australia pilot starts from primary-source claim ceilings, not a stitched causal story", () => {
  for (const source of [
    "Jobs and Skills Australia",
    "Australian Bureau of Statistics",
    "International Labour Organization",
  ]) assert.match(pilotSources, new RegExp(source, "i"));
  assert.match(pilotSources, /NERO.*modelled estimate.*not.*causal/is);
  assert.match(pilotSources, /must not be summed or combined/i);
  assert.match(pilotSources, /AI use.*does not measure.*intensity or extent/is);
  assert.match(pilotSources, /exposure.*not.*actual impact/is);
  assert.match(pilotSources, /shared-source dependence/i);
  assert.match(pilotSources, /claim ceiling/i);
  assert.match(pilotSources, /source date.*retrieved on/is);
  assert.match(pilotSources, /statistical unit.*denominator compatibility.*ecological-inference/is);
  assert.match(pilotSources, /location of residence.*not.*location of business/is);
  assert.match(pilotSources, /minimum of 10/i);
});

test("affected-party coverage floors cannot masquerade as a confirmatory sample calculation", () => {
  assert.match(affectedPartyAmendments, /representational coverage floor/i);
  assert.match(affectedPartyAmendments, /not a\s+confirmatory sample-size calculation/i);
  assert.match(
    affectedPartyAmendments,
    /power or precision requirement.*primary estimand.*harm.*multiplicity.*attrition/is,
  );
});
