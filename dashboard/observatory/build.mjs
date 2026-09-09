import { createHash } from "node:crypto";
import { existsSync, lstatSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { assertTransitionBundle } from "../../integration/transition-bundle/assess.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const sourceRoot = resolve(__dirname, "../..");
const bundlePath = "integration/transition-bundle/fixtures/round-04.worker-option.pre-projection.json";
const assessorPath = "integration/transition-bundle/assess.mjs";
const validationContextRoots = Object.freeze([
  "package.json",
  "package-lock.json",
  "integration/transition-bundle",
  "contracts/agency-map",
  "contracts/executable-if",
  "contracts/evolution",
  "paths",
  "signals",
  "preparation",
  "forecasts",
  "dashboard/schema",
  "dashboard/tools",
  "dashboard/observatory/build.mjs",
  "dashboard/observatory/app.js",
  "dashboard/observatory/index.html",
  "dashboard/observatory/styles.css",
]);

function readJson(root, path) {
  return JSON.parse(readFileSync(join(root, path), "utf8"));
}

function sha256(root, path) {
  return `sha256:${createHash("sha256").update(readFileSync(join(root, path))).digest("hex")}`;
}

function invariant(value, message) {
  if (!value) throw new Error(message);
}

function exactlyOne(values, label) {
  invariant(values.length === 1, `Expected exactly one ${label}; found ${values.length}`);
  return values[0];
}

function canonicalJson(value) {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.keys(value).sort().map((key) =>
      `${JSON.stringify(key)}:${canonicalJson(value[key])}`).join(",")}}`;
  }
  return JSON.stringify(value);
}

function same(left, right) {
  return canonicalJson(left) === canonicalJson(right);
}

export function buildValidationContext(root = sourceRoot) {
  const files = [];
  const visit = (relativePath) => {
    const absolutePath = join(root, relativePath);
    const stat = lstatSync(absolutePath);
    invariant(!stat.isSymbolicLink(), `Validation context cannot contain a symbolic link: ${relativePath}`);
    if (stat.isDirectory()) {
      for (const entry of readdirSync(absolutePath).sort()) {
        visit(`${relativePath}/${entry}`);
      }
      return;
    }
    invariant(stat.isFile(), `Validation context entry is not a regular file: ${relativePath}`);
    files.push({ path: relativePath, sha256: sha256(root, relativePath) });
  };
  validationContextRoots.forEach(visit);
  files.sort((left, right) => left.path.localeCompare(right.path));
  const manifest = {
    profile: "conservative-local-validation-context-v1",
    roots: [...validationContextRoots],
    files,
  };
  return {
    ...manifest,
    manifestSha256: `sha256:${createHash("sha256")
      .update(canonicalJson(manifest))
      .digest("hex")}`,
  };
}

function artifactMap(root, bundle) {
  return Object.fromEntries(
    bundle.artifacts.map((artifact) => {
      invariant(
        sha256(root, artifact.path) === artifact.sha256,
        `Artifact hash mismatch: ${artifact.role} (${artifact.path})`,
      );
      return [artifact.role, { ref: artifact, document: readJson(root, artifact.path) }];
    }),
  );
}

const gateLanguage = Object.freeze({
  integrity: {
    label: "Artifact integrity",
    class: "local-fixture",
    meaning: "The retained synthetic artifact bytes reproduce under the registered local validators.",
    ceiling: "This does not authenticate a publisher or make a claim true.",
  },
  scope: {
    label: "Scope bindings",
    class: "local-fixture",
    meaning: "Declared synthetic native scopes resolve through the retained registered mappings.",
    ceiling: "Mapping truth and real-world applicability are not assessed.",
  },
  history: {
    label: "Registered history",
    class: "local-fixture",
    meaning: "The retained synthetic definition and evidence histories reproduce locally.",
    ceiling: "This cannot show that omitted conditions or external events do not exist.",
  },
  truth: {
    label: "Empirical truth",
    class: "real-world",
    meaning: "The registered condition has not been established as empirically true.",
    ceiling: "Synthetic observations cannot open this gate.",
  },
  freshness: {
    label: "Trusted freshness",
    class: "real-world",
    meaning: "No trusted evaluation clock establishes currentness.",
    ceiling: "A caller-supplied timestamp cannot open this gate.",
  },
  evidence: {
    label: "Evidence-reference consistency",
    class: "local-fixture",
    meaning: "Condition and signal identifiers are joined across the synthetic fixture.",
    ceiling: "This does not show that source evidence bytes were acquired, authentic, representative or true.",
  },
  forecast: {
    label: "Forecast-reference consistency",
    class: "local-fixture",
    meaning: "The synthetic forecast target and issue-time basis resolve to retained fixture records.",
    ceiling: "One synthetic forecast does not establish predictive skill.",
  },
  preparation: {
    label: "Preparation-reference consistency",
    class: "local-fixture",
    meaning: "The synthetic proposal, IF trigger, controls and receipt resolve to retained fixture records.",
    ceiling: "This does not prove capacity, consent, benefit or authority.",
  },
  authority: {
    label: "Real authority",
    class: "real-world",
    meaning: "No actor or decision authority has been authenticated.",
    ceiling: "No action is authorised.",
  },
  publication: {
    label: "Publication approval",
    class: "real-world",
    meaning: "Approval for public release remains closed.",
    ceiling: "This interface remains a research draft.",
  },
});

export function buildObservatoryModel(root = resolve(__dirname, "../..")) {
  const bundle = readJson(root, bundlePath);
  const assessment = assertTransitionBundle(bundle, { rootDir: root });
  const artifacts = artifactMap(root, bundle);
  const agency = artifacts["agency-map"].document;
  const evolution = artifacts["evolution-ledger"].document;
  const registry = artifacts["signal-registry"].document;
  const path = artifacts["possible-path"].document;
  const preparation = artifacts["preparation-register"].document;
  const forecast = artifacts.forecast.document;
  const kernel = artifacts["executable-if-kernel"].document;

  const conditionId = exactlyOne(bundle.canonical.condition_ids, "canonical condition id");
  const condition = exactlyOne(
    evolution.public_projection.active_conditions.filter((candidate) =>
      candidate.condition_definition_ref.condition_id === conditionId),
    `active condition projection for ${conditionId}`,
  );
  const receipt = exactlyOne(
    assessment.executable_if.governed_evaluations.filter((candidate) =>
      candidate.condition_definition_ref.condition_id === conditionId),
    `governed kernel evaluation for ${conditionId}`,
  );
  const copiedReceipt = forecast.issue_basis.issue_evaluation_receipt;
  for (const [field, copiedValue] of Object.entries(copiedReceipt)) {
    invariant(
      same(copiedValue, receipt[field]),
      `Forecast receipt drifted from recomputed kernel evaluation: ${field}`,
    );
  }
  const conditionBinding = exactlyOne(
    preparation.condition_bindings.filter((binding) => binding.content.condition_id === conditionId),
    `preparation condition binding for ${conditionId}`,
  );
  const action = exactlyOne(
    preparation.actions.filter((candidate) =>
      candidate.if_binding.condition_binding_ref.id === conditionBinding.id),
    `preparation action for ${conditionId}`,
  );
  const edge = exactlyOne(
    path.graph.edges.filter((candidate) =>
      candidate.condition_bindings.some((binding) => binding.condition_id === conditionId)),
    `possible-path edge for ${conditionId}`,
  );
  const stateOrder = ["true", "false", "unknown", "stale", "conflicted"];
  const publicStateLabels = {
    true: "Registered rule passed",
    false: "Registered rule did not pass",
    unknown: "No eligible evidence",
    stale: "Evidence out of date",
    conflicted: "Sources conflict",
  };
  const states = stateOrder.map((id) => {
    const branch = edge.branches[`if_${id}`];
    invariant(branch, `Missing ${id} branch`);
    return {
      id,
      publicLabel: publicStateLabels[id],
      current: receipt.computed_rule_state.state === id,
      action: branch.action,
      recovery: branch.recovery,
      targetNodeId: branch.target_node_id,
      explanation: branch.public_explanation,
    };
  });

  invariant(condition.condition_definition_ref.condition_id === forecast.target.condition_id, "Condition mismatch");
  invariant(condition.claim.period.starts_at === agency.outcome_scope.starts_at, "Period start mismatch");
  invariant(condition.claim.period.ends_at === agency.outcome_scope.ends_at, "Period end mismatch");
  invariant(receipt.evidence_state_hash === evolution.current_state.evidence_state_hash, "Evidence state mismatch");
  invariant(bundle.authority_effect === "none" && bundle.action_authorised === false, "Authority boundary changed");

  const eligibleStates = action.if_binding.state_trigger.eligible_states;
  const currentState = receipt.computed_rule_state.state;
  const source = exactlyOne(registry.sources, "registered signal source");
  const pathRoles = Object.fromEntries(path.signal_portfolio.roles.map((role) => [role.role, role]));
  const validationContext = buildValidationContext(sourceRoot);

  return {
    meta: {
      title: "The Transition Observatory",
      round: "Round 04",
      status: {
        programmeIteration: "06",
        dataFixture: "04, synthetic",
        interfaceStudy: "05",
        publicRelease: "none",
      },
      classification: bundle.classification,
      asOf: bundle.as_of,
      sourceBundleId: bundle.bundle_id,
      bundleStage: bundle.bundle_stage,
      evaluationClock: bundle.evaluation_clock,
      bundleCoherent: assessment.bundle_coherent,
    },
    validationContext,
    programmeGates: Object.entries(assessment.gates).map(([id, passed]) => {
      const language = gateLanguage[id];
      invariant(language, `Missing public language for programme gate ${id}`);
      return {
        id,
        ...language,
        state: passed
          ? language.class === "local-fixture" ? "local-check-reproduced" : "established"
          : "closed",
        source: {
          gateId: id,
          path: bundlePath,
          sha256: sha256(root, bundlePath),
          assessmentOutputPath: `gates.${id}`,
          assessor: {
            path: assessorPath,
            sha256: sha256(sourceRoot, assessorPath),
            scope: "entrypoint-in-conservative-validation-context",
          },
          validationContextManifestSha256: validationContext.manifestSha256,
        },
      };
    }),
    condition: {
      id: condition.condition_definition_ref.condition_id,
      definition: condition.condition_definition_ref,
      proposition: condition.proposition,
      renderedIf: path.outcome_scope.if_conditions[0].public_condition,
      grammar: {
        who: condition.claim.who,
        verb: condition.claim.verb,
        outcome: condition.claim.object,
        standard: condition.claim.standard,
        place: agency.outcome_scope.place,
        period: agency.outcome_scope.period,
        if: path.outcome_scope.if_conditions[0].public_condition,
      },
      scope: condition.scope,
      currentState,
      mechanicallyValid: receipt.mechanically_valid_for_evaluation,
      empiricalTruthEstablished: receipt.empirical_truth_established,
      evaluationHash: receipt.evaluation_hash,
      evaluatedAt: receipt.evaluated_at,
      evaluationSource: "recomputed-from-executable-if-kernel",
      observationCount: receipt.observation_hashes.length,
      assessmentStatus: evolution.current_state.conditions[0].assessment_status,
    },
    states,
    forecast: {
      id: forecast.id,
      title: forecast.title,
      question: forecast.question,
      probability: forecast.probability,
      baselineProbability: forecast.baseline.probability,
      naiveBaselineProbability: forecast.naive_baseline.probability,
      issuedAt: forecast.issued_at,
      resolveAfter: forecast.resolve_after,
      resolveBy: forecast.resolve_by,
      observationWindow: {
        startsAt: forecast.target.observation_window_start,
        endsAt: forecast.target.observation_window_end,
      },
      relationToCurrentState: forecast.issue_basis.interpretation_boundaries.probability_relation,
      claimCeiling: forecast.issue_basis.interpretation_boundaries.public_claim_ceiling,
      method: forecast.method,
      status: forecast.status,
      epistemicClass: forecast.epistemic_class,
      use: forecast.forecast_use,
      assumptions: forecast.assumptions,
      counterHypotheses: forecast.counter_hypotheses,
      target: forecast.target,
    },
    signals: {
      source: {
        id: source.source_id,
        label: source.label,
        bindingStatus: source.artifact_binding.status,
        nextAcquisition: source.artifact_binding.next_acquisition,
      },
      contracts: agency.public_projection.signal_contracts.map((signal) => ({
        id: signal.signal_ref,
        label: signal.label,
        role: signal.role,
        measure: signal.measure,
        unit: signal.unit,
        direction: signal.direction,
        bindingKind: signal.binding_kind,
        verification: signal.verification,
        metricChecksum: signal.registered_metric_checksum,
      })),
      gaps: ["leading", "outcome", "intervention-exposure"].map((role) => ({
        role,
        status: pathRoles[role].status,
        reason: pathRoles[role].unresolved_reason,
      })),
    },
    evolution: {
      definition: {
        changeCount: evolution.public_projection.history.change_count,
        operations: evolution.public_projection.history.operations,
        historyStatus: evolution.public_projection.history.status,
        definitionVersion: condition.condition_definition_ref.definition_version,
        definitionHash: condition.condition_definition_ref.definition_hash,
      },
      evidence: {
        eventCount: evolution.current_state.conditions[0].evidence_state_ref.event_count,
        tipEventId: evolution.current_state.conditions[0].evidence_state_ref.tip_event_id,
        stateHash: evolution.current_state.evidence_state_hash,
        sourceStatus: source.artifact_binding.status,
      },
      path: {
        branchCount: states.length,
        historyRequirement: path.condition_evolution_policies[0].history_requirement,
        policy: path.condition_evolution_policies[0].on_event,
      },
      actorValues: {
        goal: agency.goal.statement,
        classification: agency.goal.classification,
        selectionAuthority: agency.goal.selection_authority,
        affectedPopulations: path.population_accounting.affected_populations,
        omissions: path.population_accounting.omissions,
      },
    },
    paths: {
      candidate: {
        id: path.path_id,
        title: path.title,
        summary: path.hypothesis_summary,
        status: path.intervention_state.state,
        publicClaimCeiling: path.public_claim_ceiling,
      },
      competitors: path.competing_paths,
      graph: path.graph,
      crisisVerdictProduced:
        assessment.component_results["possible-path"].boundaries.crisis_verdict_produced,
      nonTrueDecisionGates: states.filter(({ id }) => id !== "true"),
      abandonment: path.abandonment,
      gamingRisks: path.gaming_and_reflexivity,
    },
    preparation: {
      id: action.action_id,
      publicSentence: action.public_sentence,
      actor: action.actor,
      verb: action.verb,
      object: action.object.description,
      eligibleStates,
      blockedStates: action.if_binding.state_trigger.blocked_states,
      currentlyEligible: eligibleStates.includes(currentState),
      reEvaluateBeforeStart: action.if_binding.state_trigger.re_evaluate_before_start,
      reversibility: action.reversibility,
      resources: action.resources,
      controls: action.controls,
      reviewBy: action.review_by,
      decisionUse: action.decision_use,
      authorisationEffect: action.authorisation_effect,
    },
    authority: {
      effect: bundle.authority_effect,
      actionAuthorised: bundle.action_authorised,
      publicationApproved: bundle.publication_approved,
      humanDecisionRequired: path.governance.human_decision_required,
      authorityStatus: path.governance.authority_status,
      nextCheck: path.governance.authority_next_check,
    },
    provenance: {
      bundlePath,
      artifacts: bundle.artifacts,
      rootRole: bundle.canonical.root_role,
      kernelId: kernel.kernel_id,
      kernelManifestHash: bundle.canonical.executable_if_ref.manifest_hash,
      evidenceTipEventId: bundle.canonical.executable_if_ref.evidence_state_ref.evidence_tip_event_id,
      evidenceStateHash: bundle.canonical.executable_if_ref.evidence_state_ref.evidence_state_hash,
    },
  };
}

export function renderDataModule(model) {
  return `/* Generated by build.mjs from the exact Round 4 pre-projection bundle. */\nwindow.OBSERVATORY_DATA = ${JSON.stringify(model, null, 2)};\n`;
}

function main() {
  const check = process.argv.includes("--check");
  const root = resolve(__dirname, "../..");
  const outputPath = join(__dirname, "data.js");
  const output = renderDataModule(buildObservatoryModel(root));

  if (check) {
    invariant(existsSync(outputPath), "Generated data.js is missing");
    invariant(readFileSync(outputPath, "utf8") === output, "Generated data.js is stale");
    return;
  }

  writeFileSync(outputPath, output);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main();
