import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { evaluateKernelCondition } from "../../../contracts/executable-if/validate.mjs";

const fixtureRoot = dirname(fileURLToPath(import.meta.url));
const repositoryRoot = resolve(fixtureRoot, "../../..");
const checkOnly = process.argv.includes("--check");

function bytes(document) {
  return Buffer.from(`${JSON.stringify(document, null, 2)}\n`);
}

function digest(value) {
  return `sha256:${createHash("sha256").update(value).digest("hex")}`;
}

function load(relativePath) {
  const retained = readFileSync(resolve(repositoryRoot, relativePath));
  return {
    document: JSON.parse(retained.toString("utf8")),
    path: relativePath,
    sha256: digest(retained),
  };
}

function ref(document, relativePath, idField, artifactType) {
  return {
    artifact_id: document[idField],
    artifact_type: artifactType,
    path: `experiments/observatory-comparison/fixtures/${relativePath}`,
    sha256: digest(bytes(document)),
  };
}

const source = load("integration/transition-bundle/fixtures/round-04.worker-option.pre-projection.json");
const scopeManifest = load("integration/transition-bundle/fixtures/round-04.worker-option.scope-manifest.json");
const kernel = load("contracts/executable-if/fixtures/kernel.synthetic.json");
const possiblePath = load("paths/fixtures/round-04.worker-option.synthetic.json");
const forecast = load("forecasts/fixtures/round-04.worker-option.synthetic.json");
const conditionId = source.document.canonical.condition_ids[0];
const activeState = kernel.document.current_state.find((state) =>
  state.condition_id === conditionId && state.lifecycle === "active");
const definition = kernel.document.events
  .flatMap(({ introduced_definitions: definitions }) => definitions)
  .find(({ definition_hash: hash }) => hash === activeState.condition_definition_ref.definition_hash);
const receipt = evaluateKernelCondition(kernel.document, conditionId, {
  evaluatedAt: source.document.evaluation_clock.evaluated_at,
});

const sourceBundleRef = {
  bundle_id: source.document.bundle_id,
  bundle_stage: source.document.bundle_stage,
  schema_version: source.document.schema_version,
  path: source.path,
  sha256: source.sha256,
};

const pathEdgeIndex = possiblePath.document.graph.edges.findIndex((edge) =>
  Object.keys(edge.branches || {}).length === 5
  && ["true", "false", "unknown", "stale", "conflicted"]
    .every((state) => edge.branches[`if_${state}`]));
if (pathEdgeIndex < 0) throw new Error("Round 4 possible path has no complete five-state edge");
const pathEdge = possiblePath.document.graph.edges[pathEdgeIndex];
const stateLegend = ["true", "false", "unknown", "stale", "conflicted"].map((state) => {
  const branch = pathEdge.branches[`if_${state}`];
  return {
    state,
    public_label: `IF ${state}`,
    public_meaning: branch.public_explanation,
    next_step: branch.recovery,
    source_ref: {
      artifact_role: "possible-path",
      path: possiblePath.path,
      sha256: possiblePath.sha256,
      json_pointer: `/graph/edges/${pathEdgeIndex}/branches/if_${state}`,
    },
  };
});
const displayedState = stateLegend.find(({ state }) => state === receipt.computed_rule_state.state);

const factPack = {
  schema_version: "1.1.0",
  fact_pack_id: "fact-pack.observatory-comparison.synthetic-v1",
  classification: "synthetic-fictional-study-material",
  source_transition_bundle_ref: sourceBundleRef,
  canonical: {
    condition_ids: source.document.canonical.condition_ids,
    outcome_logic_ref: source.document.canonical.outcome_logic_ref,
    scope_manifest_ref: source.document.canonical.scope_manifest_ref,
    executable_if_ref: source.document.canonical.executable_if_ref,
  },
  decision_context: {
    scope: scopeManifest.document.canonical_scope,
    mapping_truth_assessed: false,
    no_real_service: true,
    no_real_warning: true,
    no_action_authority: true,
  },
  claims: [
    {
      claim_id: "claim.synthetic-computed-if-state",
      text: `The executable rule computes ${receipt.computed_rule_state.state} for the registered worker-option condition at the stated evaluation time.`,
      epistemic_status: "mechanical-rule-result",
      scope: "Only the exact retained kernel definition, evidence state, worker cohort, place, period and evaluation clock.",
      uncertainty: "A mechanically valid rule result is not independent empirical truth and creates no authority to act.",
      source_refs: [
        {
          artifact_role: "transition-bundle",
          path: source.path,
          sha256: source.sha256,
          json_pointer: "/canonical/executable_if_ref",
        },
        {
          artifact_role: "executable-if-kernel",
          path: kernel.path,
          sha256: kernel.sha256,
          json_pointer: "/current_evidence_state",
        },
      ],
    },
    {
      claim_id: "claim.synthetic-transition-path",
      text: possiblePath.document.public_claim_ceiling,
      epistemic_status: "scenario",
      scope: `WHO: ${possiblePath.document.outcome_scope.who}; PLACE: ${possiblePath.document.outcome_scope.place}; PERIOD: ${possiblePath.document.outcome_scope.period}.`,
      uncertainty: `Truth status: ${possiblePath.document.epistemic_contract.truth_status}; world model: ${possiblePath.document.epistemic_contract.world_model}; quantification: ${possiblePath.document.epistemic_contract.quantification}.`,
      source_refs: [
        {
          artifact_role: "possible-path",
          path: possiblePath.path,
          sha256: possiblePath.sha256,
          json_pointer: "/public_claim_ceiling",
        },
        {
          artifact_role: "possible-path",
          path: possiblePath.path,
          sha256: possiblePath.sha256,
          json_pointer: "/competing_paths",
        },
        {
          artifact_role: "possible-path",
          path: possiblePath.path,
          sha256: possiblePath.sha256,
          json_pointer: "/epistemic_contract",
        },
        {
          artifact_role: "possible-path",
          path: possiblePath.path,
          sha256: possiblePath.sha256,
          json_pointer: "/outcome_scope",
        },
      ],
    },
    {
      claim_id: "claim.synthetic-future-probability",
      text: `A separate synthetic forecast assigns ${Math.round(forecast.document.probability * 100)}% to its future threshold event.`,
      epistemic_status: "forecast",
      scope: "The forecast's exact future observation window, metric, scope and resolution rule.",
      uncertainty: "The probability is synthetic, does not derive from the current IF state and cannot replace that state.",
      source_refs: [{
        artifact_role: "forecast",
        path: forecast.path,
        sha256: forecast.sha256,
        json_pointer: "/probability",
      }],
    },
  ],
  state_legend: stateLegend,
  if_conditions: [{
    condition_id: conditionId,
    question: `IF ${definition.claim.who} ${definition.claim.verb} ${definition.claim.object}, to the standard that ${definition.claim.standard}, during ${definition.claim.period.starts_at} through ${definition.claim.period.ends_at}?`,
    condition_definition_ref: receipt.condition_definition_ref,
    claim: definition.claim,
    scope: definition.scope,
    state: receipt.computed_rule_state.state,
    state_basis: "computed-rule-state-not-empirical-truth",
    evaluation_receipt: receipt,
    public_state_display: displayedState,
    strongest_challenge: "The source observations are synthetic and the evaluation clock is operator supplied, so the computed state is not independently verified empirical truth.",
    next_observation: "Acquire independently governed exact-scope observations, verify their source and clock, then recompute without carrying the current state forward.",
    empirical_truth_established: false,
    authority_effect: "none",
    action_authorised: false,
  }],
  forecast_context: {
    forecast_ref: {
      artifact_role: "forecast",
      path: forecast.path,
      sha256: forecast.sha256,
      json_pointer: "/probability",
    },
    condition_id: conditionId,
    probability: forecast.document.probability,
    issue_time_evaluation_hash: forecast.document.issue_basis.issue_evaluation_receipt.evaluation_hash,
    semantic_role: "forecast-probability-not-current-if-state",
    truth_effect: "none",
    may_set_if_state: false,
  },
  correction_route: "https://example.org/fictional-observatory-study/corrections",
  contract_boundary: {
    truth_effect: "none",
    forecast_effect: "context-only",
    authority_effect: "none",
    action_authorised: false,
    publication_approved: false,
  },
};
const factPackRef = {
  fact_pack_id: factPack.fact_pack_id,
  path: "experiments/observatory-comparison/fixtures/shared-fact-pack.synthetic.json",
  sha256: digest(bytes(factPack)),
};

const script = {
  schema_version: "1.1.0",
  script_id: "script.observatory-comparison.synthetic-v1",
  classification: "synthetic-research-material",
  review_state: "not-independently-reviewed",
  fact_pack_ref: factPackRef,
  facilitator_prompts: [
    "What is directly observed, and what is a mechanical result, inference, scenario or forecast?",
    "Who and what are inside the exact scope and period?",
    "Which of the five IF states is displayed, and which receipt computed it?",
    "What can each named actor lawfully choose, and what remains outside their authority?",
    "Which beneficial, adverse, refusal and recovery paths remain open?",
  ],
  prohibited_prompts: [
    "Do not ask participants to endorse the transition thesis.",
    "Do not imply that a real warning, service, recommendation or authority exists.",
    "Do not add facts, urgency, probability, emotional framing or examples not present in the shared fact pack.",
  ],
  facilitation_boundary: {
    may_add_facts: false,
    may_add_urgency: false,
    may_add_probability: false,
    may_set_if_state: false,
    may_recommend_action: false,
  },
};

const outcome = {
  schema_version: "1.1.0",
  outcome_contract_id: "outcomes.observatory-comparison.synthetic-v1",
  classification: "synthetic-unvalidated-research-proposal",
  estimand_id: "estimand.complete-boundary-reconstruction-risk-difference",
  primary_endpoint: "complete-unaided-boundary-reconstruction",
  primary_estimand: "Intention-to-treat risk difference in complete unaided boundary reconstruction on a held-out fictional vignette.",
  dangerous_understanding_errors: [
    "aggregate-to-person-inference",
    "scenario-as-forecast",
    "option-as-commitment",
    "inaction-as-safe",
    "crisis-as-established",
    "exposure-as-adoption-or-causation",
    "checksum-as-publisher-authentication",
    "proposal-as-legal-or-democratic-authority",
  ],
  endpoint_boundary: {
    aesthetic_preference: "descriptive-only-not-success",
    perceived_authority: "safety-harm-not-success",
    uncalibrated_confidence: "calibration-harm-not-success",
    thesis_agreement: "not-an-outcome",
  },
  validation_state: "not-validated",
  analysis_state: "not-preregistered",
  contract_boundary: { effect: "proposal-only" },
};

const protocol = {
  schema_version: "1.1.0",
  protocol_id: "protocol.observatory-comparison.v1",
  status: "proposed-not-preregistered-or-approved",
  design: {
    kind: "two-by-two-interface-by-deliberation-randomised-comparison",
    allocation_unit: "participant",
    allocation_method: "random-stratified",
    allocation_ratio_by_instrument: {
      "conventional-release": 1,
      "release-plus-deliberation": 1,
      "observatory-self-serve": 1,
      "observatory-plus-deliberation": 1,
    },
    allocation_concealment: "until-participant-begins-assigned-instrument",
    strata: [
      "directly-affected",
      "low-numeracy-or-digital-confidence",
      "limited-english",
      "assistive-technology",
    ],
    assignment_implementation_state: "not-implemented",
  },
  analysis: {
    outcome_contract_id: outcome.outcome_contract_id,
    estimand_id: outcome.estimand_id,
    primary_endpoint: outcome.primary_endpoint,
    intention_to_treat: true,
    smallest_effect_worth_detecting: null,
    power_plan: "not-specified",
    multiplicity_plan: "not-specified",
    missingness_plan: "not-specified",
    attrition_allowance: null,
    contamination_plan: "not-specified",
    preregistration_state: "not-preregistered",
  },
  contract_boundary: {
    truth_effect: "none",
    causal_effect: "none-before-completed-analysis",
    ethics_effect: "none",
    recruitment_effect: "none",
  },
};

const instrumentKinds = [
  ["conventional-release", "instrument.conventional-release.synthetic-v1", "instrument-conventional.synthetic.json"],
  ["release-plus-deliberation", "instrument.release-plus-deliberation.synthetic-v1", "instrument-release-deliberation.synthetic.json"],
  ["observatory-self-serve", "instrument.observatory-self-serve.synthetic-v1", "instrument-observatory-self-serve.synthetic.json"],
  ["observatory-plus-deliberation", "instrument.observatory-plus-deliberation.synthetic-v1", "instrument-observatory-deliberation.synthetic.json"],
];
const instruments = instrumentKinds.map(([kind, id, file]) => ({
  file,
  document: {
    schema_version: "1.1.0",
    instrument_id: id,
    instrument_kind: kind,
    classification: "synthetic-unrendered-specification",
    source_transition_bundle_ref: sourceBundleRef,
    fact_pack_ref: factPackRef,
    render_contract: {
      claim_ids: factPack.claims.map(({ claim_id: claimId }) => claimId),
      condition_ids: factPack.canonical.condition_ids,
      state_legend_states: stateLegend.map(({ state }) => state),
      boundary_ids: [
        "no-real-service",
        "no-real-warning",
        "no-action-authority",
        "uncertainty",
        "strongest-challenge",
        "correction-route",
      ],
      source_scope_clock_visible: true,
      may_add_facts: false,
      may_add_urgency: false,
      may_hide_nondecisive_states: false,
      may_use_probability_as_state: false,
      may_imply_authority: false,
      output_capture_required: true,
    },
    presentation_boundary: {
      fact_effect: "none",
      truth_effect: "none",
      authority_effect: "none",
      aesthetic_preference_role: "descriptive-only-not-success",
      confidence_role: "calibration-and-harm-monitor-only",
    },
  },
}));

const protocolRef = ref(protocol, "protocol-contract.synthetic.json", "protocol_id", "research-protocol-contract");
const scriptRef = ref(script, "deliberation-script.synthetic.json", "script_id", "deliberation-script");
const outcomeRef = ref(outcome, "outcome-contract.synthetic.json", "outcome_contract_id", "outcome-contract");
const arms = instruments.map(({ file, document }) => ({
  arm_id: `arm.${document.instrument_kind}`,
  instrument_kind: document.instrument_kind,
  instrument_ref: ref(document, file, "instrument_id", "instrument-specification"),
  fact_pack_ref: factPackRef,
  deliberation_script_ref: document.instrument_kind.includes("deliberation") ? scriptRef : null,
  outcome_contract_ref: outcomeRef,
  allocation_weight: 1,
}));

const manifest = {
  schema_version: "1.1.0",
  manifest_id: "experiment.observatory-comparison.synthetic-v1",
  classification: "synthetic-research-proposal",
  protocol_ref: protocolRef,
  source_transition_bundle: sourceBundleRef,
  fact_pack: factPackRef,
  arms,
  safety: {
    approval_state: "not-approved",
    recruitment_state: "blocked",
    participant_data_collection: "disabled",
    ethics_review: "pending",
    privacy_review: "pending",
    independent_monitor: { identity_state: "unverified", monitor_id: null },
    support_route: { state: "pending", route: null },
    stop_rules: [
      ["stop.urgent-irreversible-intent", "urgent-irreversible-action-intention", "any", 1, ["all-participants", "directly-affected"]],
      ["stop.dangerous-understanding", "dangerous-understanding-increase", "gt", 0, ["all-participants", "directly-affected", "low-numeracy", "limited-english"]],
      ["stop.serious-reported-harm", "serious-anxiety-stigma-dignity-or-blame-report", "any", 1, ["all-participants", "directly-affected"]],
      ["stop.missing-no-real-service-notice", "no-real-service-warning-or-authority-notice-missed", "any", 1, ["all-participants"]],
      ["stop.critical-access-failure", "critical-assistive-technology-path-failure", "any", 1, ["assistive-technology"]],
      ["stop.privacy-exposure", "personal-data-outside-approved-minimum", "any", 1, ["all-participants"]],
    ].map(([ruleId, measure, operator, threshold, strata]) => ({
      rule_id: ruleId,
      measure,
      operator,
      threshold,
      strata,
      effect: "pause-and-independent-review",
      compensation_across_strata: "forbidden",
    })),
  },
  contract_boundary: {
    truth_effect: "none",
    authority_effect: "none",
    ethics_approval_effect: "none",
    recruitment_effect: "none",
    parity_effect: "declared-input-binding-only",
    source_projection_effect: "coherent-pre-projection-core-only",
  },
};

const outputs = new Map([
  ["shared-fact-pack.synthetic.json", factPack],
  ["deliberation-script.synthetic.json", script],
  ["outcome-contract.synthetic.json", outcome],
  ["protocol-contract.synthetic.json", protocol],
  ...instruments.map(({ file, document }) => [file, document]),
  ["manifest.synthetic.json", manifest],
]);

const mismatches = [];
for (const [file, document] of outputs) {
  const expected = bytes(document);
  const path = resolve(fixtureRoot, file);
  if (checkOnly) {
    let actual = null;
    try {
      actual = readFileSync(path);
    } catch {
      // Report the missing artifact below.
    }
    if (!actual || !actual.equals(expected)) mismatches.push(file);
  } else {
    writeFileSync(path, expected);
  }
}

if (mismatches.length > 0) {
  throw new Error(`Round 4 experiment fixtures are stale: ${mismatches.join(", ")}`);
}
process.stdout.write(checkOnly ? "Round 4 experiment fixtures are current\n" : "Built Round 4 experiment fixtures\n");
