import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

import {
  computeConditionChangeImpactManifestHash,
  traceConditionChangeImpact,
  validateConditionChangeImpact,
} from "../condition-change-impact.mjs";

const root = resolve(import.meta.dirname, "../../..");
const bundlePath = "integration/transition-bundle/fixtures/round-04.worker-option.complete.json";
const bundleBytes = readFileSync(resolve(root, bundlePath));
const bundle = JSON.parse(bundleBytes.toString("utf8"));
const conditionId = "condition.worker-option.nsw";

function build() {
  return traceConditionChangeImpact(bundle, {
    rootDir: root,
    bundlePath,
    bundleBytes,
    conditionId,
  });
}

test("an IF change exposes every joined consumer and every missing decision surface", () => {
  const impact = build();

  assert.equal(impact.classification, "research-draft");
  assert.equal(impact.authority_effect, "none");
  assert.equal(impact.action_authorised, false);
  assert.equal(impact.publication_approved, false);
  assert.equal(impact.current_condition_definition_ref.condition_id, conditionId);
  assert.deepEqual(impact.impact_scope, {
    change_kind: "condition-definition-only",
    repository_discovery_performed: false,
    external_organisation_discovery_performed: false,
    declared_bundle_consumers_only: true,
    unrepresented_consumers_are_exhaustive: false,
  });
  assert.deepEqual(
    impact.joined_consumers.map(({ role }) => role).sort(),
    [
      "agency-map",
      "dashboard-snapshot",
      "evolution-ledger",
      "executable-if-kernel",
      "forecast",
      "possible-path",
      "preparation-register",
      "signal-registry",
    ].sort(),
  );
  assert.deepEqual(
    impact.unrepresented_consumers.map(({ domain }) => domain),
    ["negotiation-record", "decision-record"],
  );
  assert.equal(
    impact.unrepresented_consumers.every(({ state }) => state === "not-represented-in-source-bundle"),
    true,
  );
  assert.equal(
    impact.joined_consumers.every(({ release_state }) => release_state === "withhold-until-revalidated"),
    true,
  );
  assert.deepEqual(
    impact.gate_horizon.map(({ gate }) => gate),
    ["integrity", "scope", "history", "truth", "freshness", "evidence", "forecast", "preparation", "authority", "publication"],
  );
  assert.match(impact.public_notice, /synthetic bundle/i);
  assert.match(impact.public_notice, /did not search the rest of the repository or any real organisation/i);
});

test("the impact horizon is deterministic and bound to exact source-bundle bytes", () => {
  const first = build();
  const second = build();

  assert.deepEqual(second, first);
  const result = validateConditionChangeImpact(first, {
    rootDir: root,
    sourceBundle: bundle,
    sourceBundleBytes: bundleBytes,
    sourceBundlePath: bundlePath,
  });
  assert.equal(result.valid, true, JSON.stringify(result.errors, null, 2));
  assert.equal(result.source_bundle_verified, true);
  assert.equal(result.derivation_verified, true);
  assert.equal(result.manifest_verified, true);
});

test("a resealed-looking omission cannot hide an affected consumer", () => {
  const tampered = build();
  tampered.joined_consumers = tampered.joined_consumers.filter(({ role }) => role !== "forecast");
  tampered.manifest_hash = computeConditionChangeImpactManifestHash(tampered);

  const result = validateConditionChangeImpact(tampered, {
    rootDir: root,
    sourceBundle: bundle,
    sourceBundleBytes: bundleBytes,
    sourceBundlePath: bundlePath,
  });
  assert.equal(result.valid, false);
  assert.equal(result.derivation_verified, false);
  assert.equal(result.manifest_verified, true);
  assert.equal(result.errors.some(({ code }) => code === "DERIVATION_MISMATCH"), true);
});

test("the tracer refuses conditions outside the exact coherent core", () => {
  assert.throws(
    () => traceConditionChangeImpact(bundle, {
      rootDir: root,
      bundlePath,
      bundleBytes,
      conditionId: "condition.unbound",
    }),
    /not shared by every joined artifact/i,
  );
});

test("the tracer refuses a source document that does not match supplied bytes", () => {
  const drifted = structuredClone(bundle);
  drifted.as_of = "2026-09-09T00:00:01Z";

  assert.throws(
    () => traceConditionChangeImpact(drifted, {
      rootDir: root,
      bundlePath,
      bundleBytes,
      conditionId,
    }),
    /do not encode the supplied bundle document/i,
  );
});

test("malformed impact input fails closed instead of crashing validation", () => {
  let result;
  assert.doesNotThrow(() => {
    result = validateConditionChangeImpact(null, {
      rootDir: root,
      sourceBundle: bundle,
      sourceBundleBytes: bundleBytes,
      sourceBundlePath: bundlePath,
    });
  });
  assert.equal(result.valid, false);
  assert.equal(result.manifest_verified, false);
});

test("the command emits the same deterministic review horizon", () => {
  const result = spawnSync(process.execPath, [
    "integration/transition-bundle/tools/trace-condition-change-impact.mjs",
    bundlePath,
    conditionId,
  ], { cwd: root, encoding: "utf8" });

  assert.equal(result.status, 0, result.stderr || result.stdout);
  assert.equal(result.stderr, "");
  assert.deepEqual(JSON.parse(result.stdout), build());
});
