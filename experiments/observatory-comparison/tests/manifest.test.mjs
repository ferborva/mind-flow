import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import {
  existsSync,
  mkdirSync,
  readFileSync,
  rmdirSync,
  symlinkSync,
  unlinkSync,
} from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

const repositoryRoot = resolve(import.meta.dirname, "../../..");
const experimentRoot = resolve(repositoryRoot, "experiments/observatory-comparison");
const schemaPath = resolve(experimentRoot, "schema/experiment-manifest.schema.json");
const fixturePath = resolve(experimentRoot, "fixtures/manifest.synthetic.json");
const validatorPath = resolve(experimentRoot, "validate.mjs");
const fixtureBuilderPath = resolve(experimentRoot, "fixtures/build-round-04-fixtures.mjs");

const readJson = (path) => JSON.parse(readFileSync(path, "utf8"));

test("an executable manifest contract exists at the migration boundary", () => {
  assert.equal(existsSync(schemaPath), true);
  const schema = readJson(schemaPath);
  for (const field of ["source_transition_bundle", "fact_pack", "arms", "safety"]) {
    assert.ok(schema.required.includes(field), `manifest schema is missing ${field}`);
  }
});

test("the Round 4 experiment fixtures are deterministic", () => {
  assert.equal(existsSync(fixtureBuilderPath), true);
  assert.doesNotThrow(() => execFileSync(process.execPath, [fixtureBuilderPath, "--check"], {
    cwd: repositoryRoot,
    stdio: "pipe",
  }));
});

test("the synthetic manifest binds the coherent Round 4 pre-projection core without opening recruitment", async () => {
  assert.equal(existsSync(fixturePath), true);
  assert.equal(existsSync(validatorPath), true);
  const { assessExperimentManifest } = await import(validatorPath);
  const result = assessExperimentManifest(readJson(fixturePath), { rootDir: repositoryRoot });

  assert.equal(result.schema_valid, true);
  assert.equal(result.artifact_integrity, true);
  assert.equal(result.fact_pack_schema_valid, true);
  assert.equal(result.fact_parity, true);
  assert.equal(result.protocol_constraints_valid, true);
  assert.equal(result.artifact_contracts_valid, true);
  assert.equal(result.source_fact_binding_valid, true);
  assert.equal(result.claim_source_bindings_valid, true);
  assert.equal(result.manifest_contract_valid, true);
  assert.equal(result.source_core_eligible, true);
  assert.equal(result.manifest_valid, true, JSON.stringify(result.errors));
  assert.equal(result.analysis_ready, false);
  assert.equal(result.recruitment_allowed, false);
  assert.equal(result.authority_effect, "none");
  assert.equal(result.truth_effect, "none");
  assert.deepEqual(result.errors, []);
});

test("an arm cannot silently receive a different fact pack", async () => {
  const { assessExperimentManifest } = await import(validatorPath);
  const attacked = readJson(fixturePath);
  attacked.arms[2].fact_pack_ref.sha256 = `sha256:${"f".repeat(64)}`;
  const result = assessExperimentManifest(attacked, { rootDir: repositoryRoot });

  assert.equal(result.schema_valid, true);
  assert.equal(result.fact_parity, false);
  assert.equal(result.manifest_valid, false);
  assert.ok(result.errors.some(({ code }) => code === "ARM_FACT_PACK_MISMATCH"));
});

test("the fact pack binds the source bundle's exact condition and scope contract", async () => {
  const { assessSourceFactBinding } = await import(validatorPath);
  const manifest = readJson(fixturePath);
  const source = readJson(resolve(repositoryRoot, manifest.source_transition_bundle.path));
  const factPack = readJson(resolve(repositoryRoot, manifest.fact_pack.path));

  assert.deepEqual(assessSourceFactBinding(source, factPack), { valid: true, errors: [] });

  for (const field of ["outcome_logic_ref", "scope_manifest_ref", "executable_if_ref"]) {
    const attacked = structuredClone(factPack);
    attacked.canonical[field].sha256 = `sha256:${"a".repeat(64)}`;
    const result = assessSourceFactBinding(source, attacked);
    assert.equal(result.valid, false, `${field} drift must fail`);
    assert.ok(result.errors.some(({ code }) => code === "FACT_PACK_CANONICAL_MISMATCH"));
  }

  const omittedCondition = structuredClone(factPack);
  omittedCondition.canonical.condition_ids.pop();
  let result = assessSourceFactBinding(source, omittedCondition);
  assert.equal(result.valid, false);
  assert.ok(result.errors.some(({ code }) => code === "FACT_PACK_CANONICAL_MISMATCH"));

  const omittedIf = structuredClone(factPack);
  omittedIf.if_conditions.pop();
  result = assessSourceFactBinding(source, omittedIf);
  assert.equal(result.valid, false);
  assert.ok(result.errors.some(({ code }) => code === "FACT_PACK_IF_COVERAGE_MISMATCH"));

  assert.doesNotThrow(() => {
    result = assessSourceFactBinding(
      { canonical: { condition_ids: [] } },
      { canonical: { condition_ids: [] }, if_conditions: [null] },
    );
  });
  assert.equal(result.valid, false);

  const invented = {
    condition_ids: ["condition.invented"],
    outcome_logic_ref: {
      artifact_role: "made-up-role",
      json_pointer: "/invented",
      sha256: `sha256:${"b".repeat(64)}`,
    },
    scope_manifest_ref: {
      scope_manifest_id: "scope.invented",
      path: "invented.json",
      sha256: `sha256:${"c".repeat(64)}`,
    },
  };
  result = assessSourceFactBinding(
    { bundle_stage: "pre-projection-core", canonical: invented },
    {
      canonical: structuredClone(invented),
      if_conditions: [{ condition_id: "condition.invented" }],
    },
  );
  assert.equal(result.valid, false);
  assert.ok(result.errors.some(({ code }) => code === "SOURCE_CANONICAL_CONTRACT_INVALID"));
});

test("affected-party legitimacy is explicit, source-bound and cannot be upgraded", async () => {
  const { assessFactPackSemantics } = await import(validatorPath);
  const manifest = readJson(fixturePath);
  const source = readJson(resolve(repositoryRoot, manifest.source_transition_bundle.path));
  const factPack = readJson(resolve(repositoryRoot, manifest.fact_pack.path));
  const consultation = factPack.decision_context.affected_party_consultation;

  assert.equal(consultation.status, "not-consulted");
  assert.equal(consultation.review_completed, false);
  assert.deepEqual(consultation.unreviewed_fields,
    ["goal", "threshold", "labels", "proposed-response"]);
  assert.match(consultation.public_statement,
    /have not reviewed the goal, threshold, labels or proposed response/i);
  assert.equal(assessFactPackSemantics(factPack, {
    rootDir: repositoryRoot,
    sourceBundle: source,
  }).valid, true);

  const upgraded = structuredClone(factPack);
  upgraded.decision_context.affected_party_consultation.status = "consulted";
  const result = assessFactPackSemantics(upgraded, {
    rootDir: repositoryRoot,
    sourceBundle: source,
  });
  assert.equal(result.valid, false);
  assert.ok(result.errors.some(({ code }) =>
    code === "FACT_PACK_SCHEMA_INVALID" || code === "AFFECTED_PARTY_CONTEXT_MISMATCH"));
});

test("the shared facts bind exact Round 4 definition, scope, receipt and five-state semantics", async () => {
  const {
    assessExecutableIfFactBinding,
    assessFactPackSemantics,
  } = await import(validatorPath);
  const manifest = readJson(fixturePath);
  const source = readJson(resolve(repositoryRoot, manifest.source_transition_bundle.path));
  const factPack = readJson(resolve(repositoryRoot, manifest.fact_pack.path));

  let result = assessExecutableIfFactBinding(source, factPack, { rootDir: repositoryRoot });
  assert.equal(result.valid, true, JSON.stringify(result.errors));
  assert.equal(result.computed_rule_state, "true");
  assert.equal(result.empirical_truth_established, false);
  assert.equal(result.authority_effect, "none");

  result = assessFactPackSemantics(factPack);
  assert.equal(result.valid, true, JSON.stringify(result.errors));
  assert.deepEqual(
    new Set(factPack.state_legend.map(({ state }) => state)),
    new Set(["true", "false", "unknown", "stale", "conflicted"]),
  );
});

test("fact-pack projection drift cannot survive a coherent source-core binding", async () => {
  const { assessExecutableIfFactBinding } = await import(validatorPath);
  const manifest = readJson(fixturePath);
  const source = readJson(resolve(repositoryRoot, manifest.source_transition_bundle.path));
  const factPack = readJson(resolve(repositoryRoot, manifest.fact_pack.path));

  const attacks = [
    ["CONDITION_DEFINITION_MISMATCH", (pack) => {
      pack.if_conditions[0].condition_definition_ref.definition_hash = `sha256:${"1".repeat(64)}`;
    }],
    ["CONDITION_SCOPE_MISMATCH", (pack) => {
      pack.if_conditions[0].scope.geographies = ["Victoria"];
    }],
    ["EVALUATION_RECEIPT_MISMATCH", (pack) => {
      pack.if_conditions[0].evaluation_receipt.evaluation_hash = `sha256:${"2".repeat(64)}`;
    }],
  ];
  for (const [expectedCode, attack] of attacks) {
    const attacked = structuredClone(factPack);
    attack(attacked);
    const result = assessExecutableIfFactBinding(source, attacked, { rootDir: repositoryRoot });
    assert.equal(result.valid, false);
    assert.ok(result.errors.some(({ code }) => code === expectedCode));
  }
});

test("facilitation cannot add facts, urgency, probability, state or recommendations", async () => {
  const { assessDeliberationScriptSemantics } = await import(validatorPath);
  const manifest = readJson(fixturePath);
  const factPack = readJson(resolve(repositoryRoot, manifest.fact_pack.path));
  const script = readJson(resolve(experimentRoot, "fixtures/deliberation-script.synthetic.json"));
  const expectedRef = manifest.fact_pack;
  assert.equal(assessDeliberationScriptSemantics(script, expectedRef).valid, true);

  for (const field of [
    "may_add_facts",
    "may_add_urgency",
    "may_add_probability",
    "may_set_if_state",
    "may_recommend_action",
  ]) {
    const attacked = structuredClone(script);
    attacked.facilitation_boundary[field] = true;
    const result = assessDeliberationScriptSemantics(attacked, expectedRef, factPack);
    assert.equal(result.valid, false, field);
    assert.ok(result.errors.some(({ code }) => code === "FACILITATION_LEAKAGE"));
  }
});

test("forecast probability cannot be presented as current IF state", async () => {
  const { assessFactPackSemantics } = await import(validatorPath);
  const manifest = readJson(fixturePath);
  const factPack = readJson(resolve(repositoryRoot, manifest.fact_pack.path));

  for (const probability of [0, 1]) {
    const bounded = structuredClone(factPack);
    bounded.forecast_context.probability = probability;
    const result = assessFactPackSemantics(bounded);
    assert.equal(result.valid, true, JSON.stringify(result.errors));
    assert.equal(bounded.if_conditions[0].state, "true");
  }

  const attacked = structuredClone(factPack);
  attacked.forecast_context.may_set_if_state = true;
  const result = assessFactPackSemantics(attacked);
  assert.equal(result.valid, false);
  assert.ok(result.errors.some(({ code }) => code === "PROBABILITY_TRUTH_EFFECT_FORBIDDEN"));
});

test("aesthetic preference, perceived authority and uncalibrated confidence cannot become success endpoints", async () => {
  const { assessOutcomeContractSemantics } = await import(validatorPath);
  const outcome = readJson(resolve(experimentRoot, "fixtures/outcome-contract.synthetic.json"));
  assert.equal(assessOutcomeContractSemantics(outcome).valid, true);

  for (const endpoint of [
    "aesthetic-preference",
    "perceived-authority",
    "uncalibrated-confidence",
  ]) {
    const attacked = structuredClone(outcome);
    attacked.primary_endpoint = endpoint;
    const result = assessOutcomeContractSemantics(attacked);
    assert.equal(result.valid, false, endpoint);
    assert.ok(result.errors.some(({ code }) => code === "SUCCESS_ENDPOINT_FORBIDDEN"));
  }
});

test("fact-pack prose, states, routes and claim identities fail closed", async () => {
  const { assessFactPackSemantics } = await import(validatorPath);
  const manifest = readJson(fixturePath);
  const factPack = readJson(resolve(repositoryRoot, manifest.fact_pack.path));
  assert.equal(assessFactPackSemantics(factPack).valid, true);

  const duplicate = structuredClone(factPack);
  duplicate.claims.push({ ...structuredClone(duplicate.claims[0]), text: "A contradiction." });
  let result = assessFactPackSemantics(duplicate);
  assert.equal(result.valid, false);
  assert.ok(result.errors.some(({ code }) => code === "FACT_PACK_CLAIM_ID_DUPLICATE"));

  for (const mutate of [
    (pack) => { pack.claims[0].text = "   "; },
    (pack) => { pack.if_conditions[0].state = "met"; },
    (pack) => { pack.correction_route = "javascript:alert(1)"; },
  ]) {
    const attacked = structuredClone(factPack);
    mutate(attacked);
    result = assessFactPackSemantics(attacked);
    assert.equal(result.valid, false);
    assert.ok(result.errors.some(({ code }) => code === "FACT_PACK_SCHEMA_INVALID"));
  }
});

test("five-state public meanings cannot be swapped while retaining their state labels", async () => {
  const { assessFactPackSemantics } = await import(validatorPath);
  const factPack = readJson(resolve(repositoryRoot,
    "experiments/observatory-comparison/fixtures/shared-fact-pack.synthetic.json"));
  const attacked = structuredClone(factPack);
  const trueState = attacked.state_legend.find(({ state }) => state === "true");
  const unknownState = attacked.state_legend.find(({ state }) => state === "unknown");

  for (const field of ["public_label", "public_meaning", "next_step"]) {
    [trueState[field], unknownState[field]] = [unknownState[field], trueState[field]];
  }
  attacked.if_conditions[0].public_state_display = structuredClone(trueState);

  const result = assessFactPackSemantics(attacked, { rootDir: repositoryRoot });
  assert.equal(result.valid, false);
  assert.ok(result.errors.some(({ code }) => code === "STATE_LEGEND_SOURCE_MISMATCH"));
});

test("a triumphant path claim cannot borrow an unrelated valid source pointer", async () => {
  const { assessFactPackSemantics } = await import(validatorPath);
  const factPack = readJson(resolve(repositoryRoot,
    "experiments/observatory-comparison/fixtures/shared-fact-pack.synthetic.json"));
  const attacked = structuredClone(factPack);
  const pathClaim = attacked.claims.find(({ claim_id: id }) =>
    id === "claim.synthetic-transition-path");

  pathClaim.text = "The candidate path is proven and all competing paths are impossible.";
  pathClaim.uncertainty = "There is no remaining uncertainty.";

  const result = assessFactPackSemantics(attacked, { rootDir: repositoryRoot });
  assert.equal(result.valid, false);
  assert.ok(result.errors.some(({ code }) => code === "PATH_CLAIM_SOURCE_MISMATCH"));
});

test("artifact types cannot be swapped while retaining valid content hashes", async () => {
  const { assessExperimentManifest } = await import(validatorPath);
  const attacked = readJson(fixturePath);
  const factPackRef = attacked.fact_pack;
  const outcomeRef = attacked.arms[0].outcome_contract_ref;

  attacked.protocol_ref.path = outcomeRef.path;
  attacked.protocol_ref.sha256 = outcomeRef.sha256;
  for (const arm of attacked.arms) {
    arm.outcome_contract_ref.path = "experiments/observatory-comparison/README.md";
    arm.outcome_contract_ref.sha256 = attacked.protocol_ref.sha256;
    if (arm.deliberation_script_ref) {
      arm.deliberation_script_ref.path = factPackRef.path;
      arm.deliberation_script_ref.sha256 = factPackRef.sha256;
    }
  }

  const result = assessExperimentManifest(attacked, { rootDir: repositoryRoot });
  assert.equal(result.manifest_valid, false);
  assert.ok(result.errors.some(({ code }) =>
    code === "MANIFEST_SCHEMA_INVALID" || code === "ARTIFACT_TYPE_INVALID"));
});

test("script and outcome bytes cannot be relabelled as each other", async () => {
  const { assessExperimentManifest } = await import(validatorPath);
  const attacked = readJson(fixturePath);
  const script = attacked.arms[1].deliberation_script_ref;
  const outcome = attacked.arms[0].outcome_contract_ref;
  for (const arm of attacked.arms) {
    arm.outcome_contract_ref.path = script.path;
    arm.outcome_contract_ref.sha256 = script.sha256;
    if (arm.deliberation_script_ref) {
      arm.deliberation_script_ref.path = outcome.path;
      arm.deliberation_script_ref.sha256 = outcome.sha256;
    }
  }
  const result = assessExperimentManifest(attacked, { rootDir: repositoryRoot });
  assert.equal(result.schema_valid, true);
  assert.equal(result.artifact_integrity, true);
  assert.equal(result.artifact_contracts_valid, false);
  assert.equal(result.manifest_valid, false);
  assert.ok(result.errors.some(({ code }) => code === "ARTIFACT_TYPE_INVALID"));
});

test("each experimental arm binds an explicit instrument specification", () => {
  const schema = readJson(schemaPath);
  assert.ok(schema.$defs.arm.required.includes("instrument_ref"));
  const manifest = readJson(fixturePath);
  assert.ok(manifest.arms.every((arm) => arm.instrument_ref));
});

test("the design is a balanced two-by-two comparison of interface and deliberation", async () => {
  const manifest = readJson(fixturePath);
  assert.deepEqual(
    new Set(manifest.arms.map(({ instrument_kind: kind }) => kind)),
    new Set([
      "conventional-release",
      "release-plus-deliberation",
      "observatory-self-serve",
      "observatory-plus-deliberation",
    ]),
  );
  assert.ok(manifest.arms.every(({ allocation_weight: weight }) => weight === 1));

  const unbalanced = structuredClone(manifest);
  unbalanced.arms[0].allocation_weight = 1000;
  const schema = readJson(schemaPath);
  assert.equal(schema.$defs.arm.properties.allocation_weight.const, 1);
  const { assessExperimentManifest } = await import(validatorPath);
  const result = assessExperimentManifest(unbalanced, { rootDir: repositoryRoot });
  assert.equal(result.schema_valid, false);
  assert.equal(result.protocol_constraints_valid, false);
  assert.equal(result.manifest_valid, false);
});

test("content addressing fails closed on source-bundle byte drift", async () => {
  const { assessExperimentManifest } = await import(validatorPath);
  const attacked = readJson(fixturePath);
  attacked.source_transition_bundle.sha256 = `sha256:${"e".repeat(64)}`;
  let result = assessExperimentManifest(attacked, { rootDir: repositoryRoot });

  assert.equal(result.artifact_integrity, false);
  assert.equal(result.manifest_valid, false);
  assert.ok(result.errors.some(({ code }) => code === "ARTIFACT_HASH_MISMATCH"));
});

test("artifact paths reject traversal, absolute paths, symlinks and non-files", async () => {
  const { assessExperimentManifest } = await import(validatorPath);
  for (const hostilePath of ["../package.json", "/tmp/absolute.json"]) {
    const attacked = readJson(fixturePath);
    attacked.fact_pack.path = hostilePath;
    let result;
    assert.doesNotThrow(() => {
      result = assessExperimentManifest(attacked, { rootDir: repositoryRoot });
    });
    assert.equal(result.artifact_integrity, false);
    assert.ok(result.errors.some(({ code }) => code === "ARTIFACT_PATH_INVALID"));
  }

  const fixturesRoot = resolve(experimentRoot, "fixtures");
  const leafLink = resolve(fixturesRoot, "fact-pack-link.test.json");
  symlinkSync("shared-fact-pack.synthetic.json", leafLink);
  try {
    const attacked = readJson(fixturePath);
    attacked.fact_pack.path = "experiments/observatory-comparison/fixtures/fact-pack-link.test.json";
    const result = assessExperimentManifest(attacked, { rootDir: repositoryRoot });
    assert.equal(result.artifact_integrity, false);
    assert.ok(result.errors.some(({ code }) => code === "ARTIFACT_PATH_INVALID"));
  } finally {
    unlinkSync(leafLink);
  }

  const directoryLink = resolve(fixturesRoot, "fixture-dir-link.test");
  symlinkSync(".", directoryLink);
  try {
    const attacked = readJson(fixturePath);
    attacked.fact_pack.path = "experiments/observatory-comparison/fixtures/fixture-dir-link.test/shared-fact-pack.synthetic.json";
    const result = assessExperimentManifest(attacked, { rootDir: repositoryRoot });
    assert.equal(result.artifact_integrity, false);
    assert.ok(result.errors.some(({ code }) => code === "ARTIFACT_PATH_INVALID"));
  } finally {
    unlinkSync(directoryLink);
  }

  const directoryPath = resolve(fixturesRoot, "not-a-file.test.json");
  mkdirSync(directoryPath);
  try {
    const attacked = readJson(fixturePath);
    attacked.fact_pack.path = "experiments/observatory-comparison/fixtures/not-a-file.test.json";
    const result = assessExperimentManifest(attacked, { rootDir: repositoryRoot });
    assert.equal(result.artifact_integrity, false);
    assert.ok(result.errors.some(({ code }) => code === "ARTIFACT_PATH_INVALID"));
  } finally {
    rmdirSync(directoryPath);
  }
});

test("all preregistered harm stop lines remain executable and non-compensable", async () => {
  const { assessExperimentManifest } = await import(validatorPath);
  const attacked = readJson(fixturePath);
  attacked.safety.stop_rules = attacked.safety.stop_rules.filter(({ rule_id: id }) =>
    id !== "stop.critical-access-failure");
  let result = assessExperimentManifest(attacked, { rootDir: repositoryRoot });

  assert.equal(result.protocol_constraints_valid, false);
  assert.equal(result.manifest_valid, false);
  assert.equal(result.recruitment_allowed, false);
  assert.ok(result.errors.some(({ code }) => code === "SAFETY_STOP_RULE_MISSING"));

  for (const [field, value] of [
    ["measure", "harmless-proxy"],
    ["operator", "gte"],
    ["threshold", 999],
    ["strata", ["all-participants"]],
  ]) {
    const weakened = readJson(fixturePath);
    weakened.safety.stop_rules[0][field] = value;
    result = assessExperimentManifest(weakened, { rootDir: repositoryRoot });
    assert.equal(result.protocol_constraints_valid, false,
      `changing the stop-rule ${field} must fail`);
    assert.ok(result.errors.some(({ code }) => code === "SAFETY_STOP_RULE_MISMATCH"));
  }
});

test("a caller cannot turn structural conformance into ethics or authority", async () => {
  const { assessExperimentManifest } = await import(validatorPath);
  const attacked = readJson(fixturePath);
  attacked.safety.recruitment_state = "approved";
  const result = assessExperimentManifest(attacked, { rootDir: repositoryRoot });

  assert.equal(result.schema_valid, false);
  assert.equal(result.manifest_valid, false);
  assert.equal(result.recruitment_allowed, false);
  assert.equal(result.authority_effect, "none");
});

test("malformed caller objects fail closed without crashing assessment", async () => {
  const { assessExperimentManifest } = await import(validatorPath);
  const malformed = {
    arms: [null, null, null],
    safety: { stop_rules: [null, null, null, null, null, null] },
  };
  let result;
  assert.doesNotThrow(() => {
    result = assessExperimentManifest(malformed, { rootDir: repositoryRoot });
  });
  assert.equal(result.schema_valid, false);
  assert.equal(result.manifest_valid, false);
  assert.equal(result.recruitment_allowed, false);
});
