import assert from "node:assert/strict";
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

const readJson = (path) => JSON.parse(readFileSync(path, "utf8"));

test("an executable manifest contract exists at the migration boundary", () => {
  assert.equal(existsSync(schemaPath), true);
  const schema = readJson(schemaPath);
  for (const field of ["source_transition_bundle", "fact_pack", "arms", "safety"]) {
    assert.ok(schema.required.includes(field), `manifest schema is missing ${field}`);
  }
});

test("the synthetic manifest proves its own bindings but rejects an incoherent source core", async () => {
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
  assert.equal(result.source_core_eligible, false);
  assert.equal(result.manifest_valid, false);
  assert.equal(result.recruitment_allowed, false);
  assert.equal(result.authority_effect, "none");
  assert.equal(result.truth_effect, "none");
  assert.deepEqual(result.errors.map(({ code }) => code), ["SOURCE_CORE_INELIGIBLE"]);
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

  for (const field of ["outcome_logic_ref", "scope_manifest_ref"]) {
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
    { bundle_stage: "complete-core", canonical: invented },
    {
      canonical: structuredClone(invented),
      if_conditions: [{ condition_id: "condition.invented" }],
    },
  );
  assert.equal(result.valid, false);
  assert.ok(result.errors.some(({ code }) => code === "SOURCE_CANONICAL_CONTRACT_INVALID"));
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
