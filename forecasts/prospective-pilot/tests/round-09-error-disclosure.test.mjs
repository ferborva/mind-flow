import assert from "node:assert/strict";
import test from "node:test";
import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { readFileSync, readdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import * as intake from "../round-09-nero/issue-error-intake.mjs";
import { assertNeroTargetConsistency } from "../round-09-nero-corrected/target-policy.mjs";

const directory = new URL("../round-09-nero/", import.meta.url);
const bytes = (name) => readFileSync(new URL(name, directory));
const json = (name) => JSON.parse(bytes(name));
const digest = (value) => `sha256:${createHash("sha256").update(value).digest("hex")}`;
const encode = (value) => Buffer.from(`${JSON.stringify(value, null, 2)}\n`);
function input() {
  return { planBytes: bytes("current-admission-plan.json"), disclosureBytes: bytes("error-disclosure.json"),
    issuedBytes: bytes("issued.json"), registeredPlanBytes: bytes("evaluation-plan.json"),
    protocolBytes: bytes("preregistration.json"), resolverParameterBytes: bytes("resolver-parameters.json") };
}
function editedDisclosure(edit) {
  const value = input();
  const disclosure = JSON.parse(value.disclosureBytes);
  edit(disclosure);
  value.disclosureBytes = encode(disclosure);
  const plan = JSON.parse(value.planBytes);
  plan.error_disclosure.sha256 = digest(value.disclosureBytes);
  value.planBytes = encode(plan);
  return value;
}

test("retained issued bytes directly expose the native target contradiction", () => {
  assert.throws(() => assertNeroTargetConsistency(json("issued.json"), json("preregistration.json"),
    json("resolver-parameters.json"), [json("baseline-parameters.json"), json("baseline-parameters.json")]),
  { code: "NERO_NATIVE_TARGET_PROSE_CONFLICT" });
});

test("current admission plan exposes a typed pending-authority error without rewriting its cohort", () => {
  const result = intake.validateNeroErrorDisclosure(input());
  assert.equal(result.status, "error-disclosed-admission-blocked");
  assert.equal(result.forecast_id, json("issued.json").id);
  assert.equal(result.stored_status, "issued");
  assert.equal(result.formal_void, false);
  assert.equal(result.denominator_exclusion, false);
  assert.equal(result.registered_cohort_size, 1);
  assert.equal(result.appointment_verified, false);
  assert.equal(result.identity_authenticated, false);
  assert.equal(result.next_action, "independent-authority-and-policy-review");
  assert.equal(result.scores.mean_brier, null);
});

test("missing, altered or wrong-bound source bytes fail disclosure validation", () => {
  for (const field of Object.keys(input())) {
    const missing = input();
    delete missing[field];
    assert.throws(() => intake.validateNeroErrorDisclosure(missing), { code: "NERO_ERROR_DISCLOSURE_INVALID" }, field);
    const altered = input();
    altered[field] = Buffer.concat([altered[field], Buffer.from(" ")]);
    if (field === "planBytes") continue; // Exact operational plan bytes are pinned by the loader, below.
    assert.throws(() => intake.validateNeroErrorDisclosure(altered), { code: "NERO_ERROR_DISCLOSURE_INVALID" }, field);
  }
});

test("rehashed sidecars cannot claim appointment, void, exclusion, scoring or a different error", () => {
  for (const edit of [
    d => { d.appointment_gate.appointment_verified = true; },
    d => { d.appointment_gate.identity_authenticated = true; },
    d => { d.appointment_gate.appointed_adjudicator = "Someone asserted locally"; },
    d => { d.effects.formal_void = true; },
    d => { d.effects.denominator_exclusion = true; },
    d => { d.effects.scoring_admitted = true; },
    d => { d.effects.changes_issued_status = true; },
    d => { d.error.code = "source_retired"; },
    d => { d.error.issued_resolution_rule_sa4_code = "102"; },
    d => { d.error.native_resolver_sa4_code = "101"; },
    d => { d.status = "void"; },
    d => { d.forecast_id = "different-record"; },
    d => { d.recorded_at = "2026-09-09T00:00:00Z"; },
    d => { d.unreviewed_override = true; },
  ]) assert.throws(() => intake.validateNeroErrorDisclosure(editedDisclosure(edit)), { code: "NERO_ERROR_DISCLOSURE_INVALID" });
});

test("current admission rejects issued, resolved and claimed-void variants with typed lifecycle context", () => {
  for (const status of ["issued", "resolved", "void"]) {
    assert.throws(() => intake.rejectDisclosedNeroTargetError({ ...json("issued.json"), status }), error => {
      assert.equal(error.code, "NERO_TARGET_CONFLICT_RECORDED");
      assert.equal(error.disclosure.status, "error-disclosed-admission-blocked");
      assert.equal(error.disclosure.denominator_exclusion, false);
      return true;
    });
  }
  assert.doesNotThrow(() => intake.rejectDisclosedNeroTargetError(
    JSON.parse(readFileSync(new URL("../round-09-nero-corrected/issued.json", import.meta.url)))));
});

test("current plan cannot silently select another record, source path or scoring effect", () => {
  for (const edit of [
    p => { p.forecast_id = "different-record"; },
    p => { p.plan_effect = "replace-registered-scoring-plan"; },
    p => { delete p.error_disclosure; },
    p => { p.issued_record.path = "../round-09-nero-corrected/issued.json"; },
    p => { p.error_disclosure.path = "../elsewhere.json"; },
    p => { p.registered_plan.registered_plan_checksum = `sha256:${"a".repeat(64)}`; },
  ]) {
    const value = input();
    const plan = JSON.parse(value.planBytes);
    edit(plan);
    value.planBytes = encode(plan);
    assert.throws(() => intake.validateNeroErrorDisclosure(value), { code: "NERO_ERROR_DISCLOSURE_INVALID" });
  }
});

test("operational loading pins the whole current plan, including attempts to omit or replace its disclosure", () => {
  assert.equal(intake.loadCurrentNeroErrorDisclosure().status, "error-disclosed-admission-blocked");
  const rootRead = name => bytes(name);
  for (const changed of [Buffer.from("{}"), Buffer.concat([bytes("current-admission-plan.json"), Buffer.from(" ")])]) {
    assert.throws(() => intake.loadCurrentNeroErrorDisclosure(name => name === "current-admission-plan.json" ? changed : rootRead(name)),
      { code: "NERO_ERROR_DISCLOSURE_INVALID" });
  }
  assert.throws(() => intake.loadCurrentNeroErrorDisclosure(() => { throw new Error("missing retained file"); }),
    { code: "NERO_ERROR_DISCLOSURE_INVALID" });
});

test("current resolution entry points cannot import the deprecated historical admission adapter, even transitively", () => {
  const root = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");
  const forbidden = resolve(root, "forecasts/prospective-pilot/issuance-binding/round-09-validate.mjs");
  const seen = new Set();
  function inspect(path) {
    assert.notEqual(path, forbidden, "historical adapter is replay-only, not current intake");
    if (seen.has(path)) return;
    seen.add(path);
    const source = readFileSync(path, "utf8");
    const references = source.matchAll(/(?:\bfrom\s*|\bimport\s*\(?\s*)["']([^"']+)["']/g);
    for (const [, reference] of references) if (reference.startsWith(".")) inspect(resolve(dirname(path), reference));
  }
  const campaigns = resolve(root, "forecasts/prospective-pilot");
  for (const entry of readdirSync(campaigns, { withFileTypes: true }).filter(entry => entry.isDirectory())) {
    const path = resolve(campaigns, entry.name, "check-resolution.mjs");
    if (readdirSync(resolve(campaigns, entry.name)).includes("check-resolution.mjs")) inspect(path);
  }
  assert.ok(seen.size > 10, "test must follow local dependencies, not only scan CLI text");
});

test("active operator notes carry the typed review step, adapter ceiling and immutable receipt spacing disclosure", () => {
  const runbook = readFileSync(new URL("../../../reviews/round-09-scheduled-resolution.md", import.meta.url), "utf8");
  assert.match(runbook, /check-error-disclosure\.mjs/);
  assert.match(runbook, /not a registered void reason/);
  const note = readFileSync(new URL("../round-09-nero-corrected/issuance-note.md", import.meta.url), "utf8");
  assert.match(note, /identify102/);
  assert.match(note, /Laplace19\/25/);
  assert.match(readFileSync(new URL("../round-09-nero/error-notice.md", import.meta.url), "utf8"), /deprecated.*round-09-validate\.mjs/s);
});

test("read-only disclosure command emits machine-readable status and refuses override arguments", () => {
  const cli = fileURLToPath(new URL("../round-09-nero/check-error-disclosure.mjs", import.meta.url));
  const result = spawnSync(process.execPath, [cli], { encoding: "utf8" });
  assert.equal(result.status, 0, result.stderr);
  assert.deepEqual(JSON.parse(result.stdout), intake.loadCurrentNeroErrorDisclosure());
  const overridden = spawnSync(process.execPath, [cli, "--appointment-verified", "true"], { encoding: "utf8" });
  assert.equal(overridden.status, 1);
  assert.equal(overridden.stdout, "");
  assert.match(overridden.stderr, /accepts no overrides or arguments/);
});
