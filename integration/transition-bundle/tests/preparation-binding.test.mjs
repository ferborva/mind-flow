import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import {
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { relative, resolve } from "node:path";
import test from "node:test";

import { assessTransitionBundle } from "../assess.mjs";
import { computeEvidenceStateHash } from
  "../../../contracts/executable-if/validate.mjs";
import { checksumJson } from "../../../preparation/lib/validate.mjs";
import { isolatedRepository } from "../../../contracts/tests/support/isolated-repository.mjs";

const root = isolatedRepository(resolve(import.meta.dirname, "../../.."));
const fixtureDirectory = resolve(root, "integration/transition-bundle/fixtures");
const round3 = readJson("integration/transition-bundle/fixtures/round-03.current.json");

test("mutable preparation artifacts live outside the working checkout", () => {
  assert.notEqual(root, resolve(import.meta.dirname, "../../.."));
});

function readJson(path) {
  return JSON.parse(readFileSync(resolve(root, path), "utf8"));
}

function sha256(bytes) {
  return `sha256:${createHash("sha256").update(bytes).digest("hex")}`;
}

function artifact(role, path) {
  const bytes = readFileSync(resolve(root, path));
  return { role, path, sha256: sha256(bytes) };
}

function executableIfRef(kernel) {
  const evidenceTip = kernel.evidence_events.at(-1);
  return {
    artifact_role: "executable-if-kernel",
    kernel_id: kernel.kernel_id,
    manifest_hash: kernel.manifest_hash,
    evaluator_ref: kernel.evaluator,
    active_condition_definition_refs: kernel.current_state
      .filter(({ lifecycle }) => lifecycle === "active")
      .map(({ condition_definition_ref: reference }) => reference),
    evidence_state_ref: {
      kernel_id: kernel.kernel_id,
      kernel_manifest_hash: kernel.manifest_hash,
      evidence_event_count: kernel.evidence_events.length,
      evidence_tip_event_id: evidenceTip.evidence_event_id,
      evidence_tip_event_hash: evidenceTip.evidence_event_hash,
      evidence_state_hash: computeEvidenceStateHash(kernel.current_evidence_state),
    },
  };
}

function round4PreparationBundle(preparationPath) {
  const bundle = structuredClone(round3);
  const kernelPath = "contracts/executable-if/fixtures/kernel.synthetic.json";
  const evolutionPath = "contracts/evolution/fixtures/round-04.worker-option.synthetic.json";
  const signalsPath = "signals/fixtures/round-04.worker-option.synthetic.json";
  const kernel = readJson(kernelPath);

  bundle.schema_version = "1.2.0";
  bundle.bundle_id = "bundle.round-04.preparation-integration";
  bundle.bundle_stage = "pre-projection-core";
  bundle.canonical.condition_ids = ["condition.worker-option.nsw"];
  bundle.canonical.executable_if_ref = executableIfRef(kernel);
  bundle.artifacts = bundle.artifacts.filter(({ role }) => ![
    "dashboard-snapshot",
    "evolution-ledger",
    "signal-registry",
    "preparation-register",
  ].includes(role));
  bundle.artifacts.push(
    artifact("evolution-ledger", evolutionPath),
    artifact("signal-registry", signalsPath),
    artifact("preparation-register", preparationPath),
    artifact("executable-if-kernel", kernelPath),
  );
  return bundle;
}

function preparationResult(bundle) {
  return assessTransitionBundle(bundle, { rootDir: root });
}

function problemCodes(result) {
  return new Set(
    (result.component_results["preparation-register"]?.problems || [])
      .map(({ code }) => code),
  );
}

function withPreparationMutation(mutate, run) {
  const directory = mkdtempSync(resolve(fixtureDirectory, "preparation-binding-test-"));
  try {
    const document = readJson("preparation/fixtures/valid/round-04.worker-option.synthetic.json");
    mutate(document);
    const bytes = Buffer.from(`${JSON.stringify(document, null, 2)}\n`);
    const absolutePath = resolve(directory, "preparation.json");
    writeFileSync(absolutePath, bytes);
    run(round4PreparationBundle(relative(root, absolutePath)));
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
}

function reseal(envelope) {
  envelope.checksum = checksumJson(envelope.content);
}

test("Round 4 preparation resolves exact kernel and evolution sources", () => {
  const result = preparationResult(round4PreparationBundle(
    "preparation/fixtures/valid/round-04.worker-option.synthetic.json",
  ));

  assert.equal(
    result.component_results["preparation-register"].external_bindings_verified,
    true,
    JSON.stringify(result.component_results["preparation-register"].problems, null, 2),
  );
  assert.equal(result.component_results["preparation-register"].register_consistent, true);
  assert.equal(result.issues.some(
    ({ code, artifact_role: role }) =>
      code === "COMPONENT_VALIDATION_FAILED" && role === "preparation-register",
  ), false);
  assert.deepEqual(result.condition_identity.by_role["preparation-register"], [
    "condition.worker-option.nsw",
  ]);
  assert.equal(result.issues.some(
    ({ code, artifact_role: role }) =>
      code === "CONDITION_SET_MISMATCH" && role === "preparation-register",
  ), false);
});

test("Round 4 preparation component rejects ID-only and scope-only substitutions", () => {
  const attacks = [
    {
      code: "CONDITION_BINDING_MISMATCH",
      mutate(document) {
        const binding = document.condition_bindings[0];
        binding.content.condition_scope.geographies = ["Queensland"];
        document.actions[0].scope.geographies = ["Queensland"];
        reseal(binding);
      },
    },
    {
      code: "CONDITION_BINDING_MISMATCH",
      mutate(document) {
        const binding = document.condition_bindings[0];
        binding.content.public_condition = "A scope-matched substitute meaning.";
        reseal(binding);
      },
    },
  ];

  for (const attack of attacks) {
    withPreparationMutation(attack.mutate, (bundle) => {
      const result = preparationResult(bundle);
      assert.equal(
        result.condition_identity.by_role["preparation-register"].includes(
          "condition.worker-option.nsw",
        ),
        true,
        "the hostile register deliberately preserves the canonical condition ID",
      );
      assert.equal(
        result.component_results["preparation-register"].external_bindings_verified,
        false,
      );
      assert.equal(problemCodes(result).has(attack.code), true);
      assert.equal(result.component_results["preparation-register"].register_consistent, false);
      assert.equal(result.gates.preparation, false);
    });
  }
});

test("Round 4 preparation component rejects stale tips and substituted receipts", () => {
  const attacks = [
    {
      code: "CONDITION_BINDING_MISMATCH",
      mutate(document) {
        const binding = document.condition_bindings[0];
        binding.content.evolution.history_tip_ref.event_hash = `sha256:${"2".repeat(64)}`;
        reseal(binding);
      },
    },
    {
      code: "EVALUATION_RECEIPT_MISMATCH",
      mutate(document) {
        const receipt = document.evaluation_receipts[0];
        receipt.content.computed_rule_state.state = "unknown";
        reseal(receipt);
      },
    },
  ];

  for (const attack of attacks) {
    withPreparationMutation(attack.mutate, (bundle) => {
      const result = preparationResult(bundle);
      assert.equal(
        result.component_results["preparation-register"].external_bindings_verified,
        false,
      );
      assert.equal(problemCodes(result).has(attack.code), true);
      assert.equal(result.component_results["preparation-register"].register_consistent, false);
      assert.equal(result.gates.preparation, false);
    });
  }
});

test("Round 3 preparation remains valid without Round 4 external wrappers", () => {
  const result = preparationResult(structuredClone(round3));

  assert.equal(result.component_results["preparation-register"].schema_conformant, true);
  assert.equal(result.component_results["preparation-register"].register_consistent, true);
  assert.equal(
    Object.hasOwn(result.component_results["preparation-register"], "external_bindings_verified"),
    false,
  );
});
