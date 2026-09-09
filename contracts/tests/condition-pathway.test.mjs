import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import Ajv2020 from "ajv/dist/2020.js";
import addFormats from "ajv-formats";

import {
  assessConditionPathway,
  checksumJson,
  validatePathwayEvaluatorProvenance,
  validateConditionPathwayBundle,
  validateConditionPathwayDefinition,
} from "../condition-pathway.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const contracts = resolve(here, "..");
const readJson = (path) => JSON.parse(readFileSync(path, "utf8"));
const schema = (name) => readJson(join(contracts, "schema", name));
const fixture = (name) => readJson(join(contracts, "fixtures", name));
const clone = (value) => structuredClone(value);

const definitionSchema = schema("condition-pathway-definition.schema.json");
const assessmentSchema = schema("condition-pathway-assessment.schema.json");
const evaluatorManifestSchema = schema("evaluator-manifest.schema.json");
const definition = fixture("condition-pathway.credibility-break.valid.json");
const condition = fixture("condition.valid.json");
const observations = fixture("observations.valid.json");
const run = fixture("evaluation-run.valid.json");
const validOption = readJson(resolve(contracts, "../options/fixtures/option.valid.json"));
const bundles = [{ condition, observations, evaluation_run: run }];
const assessedAt = "2026-09-08T00:00:00Z";

const ajv = new Ajv2020({ allErrors: true, strict: true });
addFormats(ajv);
const validateDefinitionSchema = ajv.compile(definitionSchema);
const validateAssessmentSchema = ajv.compile(assessmentSchema);
const validateEvaluatorManifestSchema = ajv.compile(evaluatorManifestSchema);

const evaluatorRegistry = readJson(join(contracts, "evaluator-registry.json"));
const evaluatorManifestPath = join(contracts, "pathway-evaluator-manifest.json");
const evaluatorManifestBytes = readFileSync(evaluatorManifestPath);
const evaluatorManifest = JSON.parse(evaluatorManifestBytes);
const readManifestDependency = (path) => readFileSync(resolve(contracts, "..", path));
const contractsReadme = readFileSync(join(contracts, "README.md"), "utf8");

function expectInvalid(validate, value, message) {
  assert.equal(validate(value), false, message);
  assert.ok(validate.errors?.length, `${message}: expected validation errors`);
}

test("a possible-path definition pairs positive, adverse, measurement and recovery branches", () => {
  assert.equal(validateDefinitionSchema(definition), true, ajv.errorsText(validateDefinitionSchema.errors));
  assert.equal(definition.public_term, "possible-path");
  assert.deepEqual(
    new Set(definition.branches.map(({ kind }) => kind)),
    new Set(["positive", "adverse", "measurement-alternative", "recovery"]),
  );
  assert.equal(definition.claim_boundary.probability_effect, "none");
  assert.equal(definition.claim_boundary.authority_effect, "none");
  assert.equal(definition.claim_boundary.causal_effect, "none");
  assert.equal(definition.governance.lifecycle, "shadow");
  assert.equal(definition.participation_safeguards.indigenous_data_governance.status, "required-unverified");
  assert.deepEqual(validateConditionPathwayDefinition(definition, [condition]), {
    valid: true,
    errors: [],
  });
});

test("the definition cannot become a crisis score, forecast, causal verdict or command", () => {
  for (const [field, value] of [
    ["crisis_score", 0.99],
    ["probability", 0.99],
    ["activation_state", "active"],
    ["recommended_action", "deploy now"],
  ]) {
    const changed = clone(definition);
    changed[field] = value;
    expectInvalid(validateDefinitionSchema, changed, `${field} must remain outside the contract`);
  }

  const command = clone(definition);
  command.branches[0].command = "act now";
  expectInvalid(validateDefinitionSchema, command, "a branch cannot carry an action command");

  const semanticAuthority = clone(definition);
  semanticAuthority.claim_boundary.authority_effect = "activate";
  assert.ok(validateConditionPathwayDefinition(semanticAuthority, [condition]).errors.some(
    ({ code }) => code === "PATHWAY_AUTHORITY_BOUNDARY_INVALID",
  ));

  const branchAuthority = clone(definition);
  branchAuthority.branches[0].early_warning.authority_effect = "recommend";
  assert.ok(validateConditionPathwayDefinition(branchAuthority, [condition]).errors.some(
    ({ code }) => code === "PATHWAY_AUTHORITY_BOUNDARY_INVALID",
  ));
});

test("every branch is bound to real condition gates and names discriminating observations", () => {
  for (const branch of definition.branches) {
    assert.ok(branch.gate_tests.length > 0);
    assert.ok(branch.next_discriminating_predicates.length > 0);
  }

  const unknownGate = clone(definition);
  unknownGate.branches[0].gate_tests[0].gate = "accelerate";
  expectInvalid(validateDefinitionSchema, unknownGate, "gate vocabulary is closed");

  const unknownCondition = clone(definition);
  unknownCondition.branches[0].gate_tests[0].condition_definition.id = "condition.missing";
  const result = validateConditionPathwayDefinition(unknownCondition, [condition]);
  assert.ok(result.errors.some(({ code }) => code === "PATHWAY_CONDITION_REFERENCE_UNKNOWN"));

  const unknownPredicate = clone(definition);
  unknownPredicate.branches[0].next_discriminating_predicates = ["predicate.missing"];
  assert.ok(validateConditionPathwayDefinition(unknownPredicate, [condition]).errors.some(
    ({ code }) => code === "PATHWAY_DISCRIMINATOR_UNKNOWN",
  ));

  const unrelatedPredicate = clone(definition);
  unrelatedPredicate.branches[0].next_discriminating_predicates = ["appeals-low"];
  assert.ok(validateConditionPathwayDefinition(unrelatedPredicate, [condition]).errors.some(
    ({ code }) => code === "PATHWAY_DISCRIMINATOR_NOT_IN_TESTED_GATE",
  ));

  const tautology = clone(definition);
  tautology.branches[0].gate_tests[0].expected_states = [
    "true",
    "false",
    "unknown",
    "stale",
    "conflicted",
  ];
  assert.ok(validateConditionPathwayDefinition(tautology, [condition]).errors.some(
    ({ code }) => code === "PATHWAY_GATE_TEST_TAUTOLOGY",
  ));

  const relabelled = clone(definition);
  for (const branch of relabelled.branches.slice(1)) {
    branch.gate_tests = clone(relabelled.branches[0].gate_tests);
    branch.next_discriminating_predicates = clone(
      relabelled.branches[0].next_discriminating_predicates,
    );
  }
  const relabelledResult = validateConditionPathwayDefinition(relabelled, [condition]);
  assert.ok(relabelledResult.errors.some(
    ({ code }) => code === "PATHWAY_BRANCH_HYPOTHESIS_DUPLICATE",
  ));
  assert.ok(relabelledResult.errors.some(
    ({ code }) => code === "PATHWAY_BRANCH_KIND_INCONSISTENT",
  ));

  const keyReorderedDuplicate = clone(definition);
  const reorderedBranch = clone(keyReorderedDuplicate.branches[0]);
  reorderedBranch.id = "path.positive-preparation.reordered-duplicate";
  reorderedBranch.gate_tests.forEach((gateTest, index) => {
    gateTest.id = `test.reordered-duplicate.${index}`;
  });
  const originalReference = reorderedBranch.gate_tests[0].condition_definition;
  reorderedBranch.gate_tests[0].condition_definition = {
    version: originalReference.version,
    id: originalReference.id,
    checksum: originalReference.checksum,
  };
  keyReorderedDuplicate.branches.push(reorderedBranch);
  assert.ok(validateConditionPathwayDefinition(
    keyReorderedDuplicate,
    [condition],
  ).errors.some(({ code }) => code === "PATHWAY_BRANCH_HYPOTHESIS_DUPLICATE"));

  const contradictory = clone(definition);
  const repeated = clone(contradictory.branches[0].gate_tests[0]);
  repeated.id = "gate-test.contradictory";
  repeated.expected_states = repeated.expected_states.includes("true") ? ["false"] : ["true"];
  contradictory.branches[0].gate_tests.push(repeated);
  assert.ok(validateConditionPathwayDefinition(contradictory, [condition]).errors.some(
    ({ code }) => code === "PATHWAY_BRANCH_GATE_CONTRADICTION",
  ));
});

test("readiness, forecasts and options fail closed until their separate evidence exists", () => {
  const prematureReadiness = clone(definition);
  prematureReadiness.branches[0].early_warning.readiness = "shadow-ready";
  expectInvalid(validateDefinitionSchema, prematureReadiness, "readiness needs all five bounded records");

  const inventedForecast = clone(definition);
  inventedForecast.branches[0].forecast_relation = { status: "linked", forecast_ref: null };
  expectInvalid(validateDefinitionSchema, inventedForecast, "a linked forecast needs a pinned reference");

  const fakeForecast = {
    id: "forecast.fake",
    version: "1.0.0",
    payload: "an untyped object cannot become forecast evidence",
  };
  const linkedForecast = clone(definition);
  linkedForecast.branches[0].forecast_relation = {
    status: "linked",
    forecast_ref: {
      id: fakeForecast.id,
      version: fakeForecast.version,
      checksum: checksumJson(fakeForecast),
    },
  };
  assert.ok(validateConditionPathwayDefinition(
    linkedForecast,
    [condition],
    [fakeForecast],
  ).errors.some(({ code }) => code === "PATHWAY_SUPPORT_ROLE_UNVALIDATED"));

  const inventedOption = clone(definition);
  inventedOption.branches[0].operational_action = {
    status: "candidate-only",
    authority_effect: "none",
    option_refs: [],
  };
  expectInvalid(validateDefinitionSchema, inventedOption, "a candidate option needs a pinned reference");

  const unresolvedOption = clone(definition);
  unresolvedOption.branches[0].operational_action = {
    status: "candidate-only",
    authority_effect: "none",
    option_refs: [{
      id: "option.invented",
      version: "1.0.0",
      checksum: `sha256:${"0".repeat(64)}`,
    }],
  };
  assert.ok(validateConditionPathwayDefinition(unresolvedOption, [condition]).errors.some(
    ({ code }) => code === "PATHWAY_SUPPORTING_ARTIFACT_UNRESOLVED",
  ));

  const arbitrary = {
    id: "option.invented",
    option_version: "1.0.0",
    payload: "not a conditional option contract",
  };
  unresolvedOption.branches[0].operational_action.option_refs[0] = {
    id: arbitrary.id,
    version: arbitrary.option_version,
    checksum: checksumJson(arbitrary),
  };
  assert.ok(validateConditionPathwayDefinition(
    unresolvedOption,
    [condition],
    [arbitrary],
  ).errors.some(({ code }) => code === "PATHWAY_OPTION_ARTIFACT_INVALID"));

  const typedOption = clone(definition);
  typedOption.branches[2].gate_tests[0].expected_states = ["true", "conflicted"];
  typedOption.branches[2].operational_action = {
    status: "candidate-only",
    authority_effect: "none",
    option_refs: [{
      id: validOption.id,
      version: validOption.option_version,
      checksum: checksumJson(validOption),
    }],
  };
  assert.deepEqual(validateConditionPathwayDefinition(
    typedOption,
    [condition],
    [validOption],
  ), { valid: true, errors: [] });
  assert.throws(
    () => assessConditionPathway(typedOption, bundles, assessedAt, [validOption]),
    /candidate option.*invalid/i,
    "a schema-valid option still needs current condition and gate semantics",
  );

  const optionUnderFalseGate = clone(typedOption);
  optionUnderFalseGate.branches[2].gate_tests[0].expected_states = ["false"];
  assert.ok(validateConditionPathwayDefinition(
    optionUnderFalseGate,
    [condition],
    [validOption],
  ).errors.some(({ code }) => code === "PATHWAY_OPTION_ARTIFACT_INVALID"));

  const roleConfusedOption = clone(validOption);
  roleConfusedOption.verb = "reverse";
  const pathwayWithRoleConfusedOption = clone(typedOption);
  pathwayWithRoleConfusedOption.branches[2].operational_action.option_refs[0] = {
    id: roleConfusedOption.id,
    version: roleConfusedOption.option_version,
    checksum: checksumJson(roleConfusedOption),
  };
  assert.ok(validateConditionPathwayDefinition(
    pathwayWithRoleConfusedOption,
    [condition],
    [roleConfusedOption],
  ).errors.some(({ code }) => code === "PATHWAY_OPTION_ARTIFACT_INVALID"));

  const thresholdConfusedOption = clone(validOption);
  thresholdConfusedOption.protected_outcome.threshold.value = -999;
  const pathwayWithThresholdConfusedOption = clone(typedOption);
  pathwayWithThresholdConfusedOption.branches[2].operational_action.option_refs[0] = {
    id: thresholdConfusedOption.id,
    version: thresholdConfusedOption.option_version,
    checksum: checksumJson(thresholdConfusedOption),
  };
  assert.ok(validateConditionPathwayDefinition(
    pathwayWithThresholdConfusedOption,
    [condition],
    [thresholdConfusedOption],
  ).errors.some(({ code }) => code === "PATHWAY_OPTION_ARTIFACT_INVALID"));

  const aliasedReadiness = clone(definition);
  const inventedRef = {
    id: "evidence.invented",
    version: "1.0.0",
    checksum: `sha256:${"0".repeat(64)}`,
  };
  Object.assign(aliasedReadiness.branches[0].early_warning, {
    readiness: "shadow-ready",
    detector_ref: inventedRef,
    loss_function_ref: inventedRef,
    performance_evidence_ref: inventedRef,
    review_capacity_ref: inventedRef,
    lead_time_evidence_ref: inventedRef,
  });
  assert.ok(validateConditionPathwayDefinition(aliasedReadiness, [condition]).errors.some(
    ({ code }) => code === "PATHWAY_READINESS_ROLE_ALIAS",
  ));
});

test("assessment recomputes branch consistency without forcing one winning story", () => {
  const assessment = assessConditionPathway(definition, bundles, assessedAt);
  assert.equal(validateAssessmentSchema(assessment), true, ajv.errorsText(validateAssessmentSchema.errors));
  assert.deepEqual(validateConditionPathwayBundle(definition, assessment, bundles), {
    valid: true,
    errors: [],
  });

  const states = Object.fromEntries(assessment.branch_assessments.map((branch) => [
    branch.branch_ref,
    branch.axes.path_observation,
  ]));
  assert.equal(states["path.positive-preparation"], "consistent-with");
  assert.equal(states["path.adverse-evidence-strain"], "consistent-with");
  assert.equal(states["path.measurement-alternative"], "consistent-with");
  assert.equal(states["path.recovery-continuity"], "underdetermined");
  assert.deepEqual(
    assessment.cross_branch.simultaneously_consistent,
    ["path.positive-preparation", "path.adverse-evidence-strain", "path.measurement-alternative"],
  );
  assert.equal(assessment.claim_boundary.probability_effect, "none");
  assert.equal(assessment.claim_boundary.authority_effect, "none");
});

test("all six axes remain explicit and cannot be collapsed into an active path", () => {
  const assessment = assessConditionPathway(definition, bundles, assessedAt);
  for (const branch of assessment.branch_assessments) {
    assert.deepEqual(Object.keys(branch.axes).sort(), [
      "binding_interpretation",
      "definition_lifecycle",
      "gate_truth",
      "migration_evidence",
      "operational_action",
      "path_observation",
    ]);
  }

  const collapsed = clone(assessment);
  collapsed.branch_assessments[0].axes.active = true;
  expectInvalid(validateAssessmentSchema, collapsed, "active is not a path-observation state");
});

test("mutated assessments and incomplete evaluation inputs fail closed", () => {
  const assessment = assessConditionPathway(definition, bundles, assessedAt);
  const fabricated = clone(assessment);
  fabricated.branch_assessments.find(({ branch_ref }) =>
    branch_ref === "path.recovery-continuity").axes.path_observation = "consistent-with";
  assert.ok(validateConditionPathwayBundle(definition, fabricated, bundles).errors.some(
    ({ code }) => code === "PATHWAY_ASSESSMENT_MISMATCH",
  ));

  const future = clone(run);
  future.evaluated_at = "2026-09-09T00:00:00Z";
  assert.throws(
    () => assessConditionPathway(
      definition,
      [{ condition, observations, evaluation_run: future }],
      assessedAt,
    ),
    /evaluation.*after.*assessment/i,
  );

  assert.throws(
    () => assessConditionPathway(definition, [], assessedAt),
    /completed evaluation bundle/i,
  );

  assert.throws(
    () => assessConditionPathway(definition, [...bundles, ...bundles], assessedAt),
    /exactly one evaluation bundle/i,
  );

  const retired = clone(definition);
  retired.governance.lifecycle = "retired";
  assert.throws(
    () => assessConditionPathway(retired, bundles, assessedAt),
    /retired pathway definition/i,
  );

  const futurePath = clone(definition);
  futurePath.created_at = "2026-10-01T00:00:00Z";
  futurePath.governance.valid_from = "2026-10-01T00:00:00Z";
  futurePath.governance.expires_at = "2027-03-01T00:00:00Z";
  assert.throws(
    () => assessConditionPathway(futurePath, bundles, "2026-10-02T00:00:00Z"),
    /evaluation.*predates.*pathway/i,
  );

  const postConditionPath = clone(definition);
  postConditionPath.created_at = "2027-03-09T00:00:00Z";
  postConditionPath.governance.valid_from = "2027-03-09T00:00:00Z";
  postConditionPath.governance.expires_at = "2027-06-01T00:00:00Z";
  assert.throws(
    () => assessConditionPathway(postConditionPath, bundles, "2027-03-10T00:00:00Z"),
    /condition definition.*not current/i,
  );
});

test("the assessment binds every input and remains non-authorising", () => {
  const assessment = assessConditionPathway(definition, bundles, assessedAt);
  assert.equal(assessment.pathway_definition.checksum, checksumJson(definition));
  assert.equal(assessment.evaluation_inputs[0].evaluation_run.checksum, checksumJson(run));
  assert.equal(assessment.provenance.classification, "repository-computed");
  assert.equal(assessment.provenance.external_truth, "unverified");
  const registered = evaluatorRegistry.evaluators.find(
    ({ id, version }) => id === "mind-flow.condition-pathway" && version === "1.0.0",
  );
  assert.deepEqual(assessment.provenance.evaluator, registered);
  const manifestPath = join(contracts, "pathway-evaluator-manifest.json");
  const manifestBytes = readFileSync(manifestPath);
  const manifest = JSON.parse(manifestBytes);
  assert.equal(
    validateEvaluatorManifestSchema(manifest),
    true,
    ajv.errorsText(validateEvaluatorManifestSchema.errors),
  );
  assert.equal(registered.digest_kind, "executable-manifest-sha256");
  assert.equal(
    registered.digest,
    `sha256:${createHash("sha256").update(manifestBytes).digest("hex")}`,
  );
  assert.ok(manifest.dependencies.some(({ path }) => path === "options/validation.mjs"));
  for (const dependency of manifest.dependencies) {
    assert.equal(
      dependency.digest,
      `sha256:${createHash("sha256").update(readFileSync(resolve(contracts, "..", dependency.path))).digest("hex")}`,
      `${dependency.path} drifted outside the evaluator identity`,
    );
  }
  assert.equal(Object.hasOwn(assessment, "probability"), false);
  assert.equal(Object.hasOwn(assessment, "action"), false);
});

test("pathway provenance rejects registry aliases, registry drift and non-canonical paths", () => {
  const duplicateRegistry = clone(evaluatorRegistry);
  duplicateRegistry.evaluators.unshift({
    id: "mind-flow.condition-pathway",
    version: "1.0.0",
    digest_kind: "executable-manifest-sha256",
    digest: `sha256:${"0".repeat(64)}`,
  });
  assert.throws(
    () => validatePathwayEvaluatorProvenance({
      registry: duplicateRegistry,
      manifest: evaluatorManifest,
      manifestBytes: evaluatorManifestBytes,
      readDependency: readManifestDependency,
    }),
    /exactly one.*registered/i,
  );

  const driftedRegistry = clone(evaluatorRegistry);
  driftedRegistry.evaluators[0].digest = `sha256:${"0".repeat(64)}`;
  assert.throws(
    () => validatePathwayEvaluatorProvenance({
      registry: driftedRegistry,
      manifest: evaluatorManifest,
      manifestBytes: evaluatorManifestBytes,
      readDependency: readManifestDependency,
    }),
    /registry projection/i,
  );

  for (const path of [
    "%2e%2e/%2e%2e/AGENTS.md",
    "contracts/./evaluator.mjs",
    "contracts/../contracts/evaluator.mjs",
  ]) {
    const hostileManifest = clone(evaluatorManifest);
    hostileManifest.dependencies[0].path = path;
    assert.throws(
      () => validatePathwayEvaluatorProvenance({
        registry: evaluatorRegistry,
        manifest: hostileManifest,
        manifestBytes: Buffer.from(JSON.stringify(hostileManifest)),
        readDependency: readManifestDependency,
      }),
      /unsafe or non-canonical path/i,
    );
  }
  assert.match(contractsReadme, /does not attest installed npm\s+package bytes or the Node runtime/i);
});

test("assessment IDs bind definition versions and inputs even at the same instant", () => {
  const first = assessConditionPathway(definition, bundles, assessedAt);
  const revised = clone(definition);
  revised.definition_version = "1.0.1";
  const second = assessConditionPathway(revised, bundles, assessedAt);
  assert.notEqual(first.id, second.id);
  assert.notEqual(first.pathway_definition.checksum, second.pathway_definition.checksum);
});
