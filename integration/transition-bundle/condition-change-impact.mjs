import { createHash } from "node:crypto";

import { assertTransitionBundle } from "./assess.mjs";

const HASH_DOMAIN = "mind-flow:condition-change-impact:v1";
const CONDITION_ID = /^[a-z0-9]+(?:[._-][a-z0-9]+)*$/;
const BUNDLE_PATH = /^[A-Za-z0-9][A-Za-z0-9._/-]*\.json$/;
const GATE_ORDER = [
  "integrity",
  "scope",
  "history",
  "truth",
  "freshness",
  "evidence",
  "forecast",
  "preparation",
  "authority",
  "publication",
];
const LOCAL_GATES = new Set([
  "integrity",
  "scope",
  "history",
  "evidence",
  "forecast",
  "preparation",
]);

const consumerPolicy = Object.freeze({
  "agency-map": {
    relation: "condition-outcome-and-action-hypothesis-consumer",
    required_disposition: "revisit-condition-ownership-mappings-and-action-hypotheses",
  },
  "dashboard-snapshot": {
    relation: "public-projection-consumer",
    required_disposition: "withhold-new-projection-until-exact-source-rebuild",
  },
  "evolution-ledger": {
    relation: "condition-history-projection-consumer",
    required_disposition: "append-valid-source-event-then-reproject-the-overlay",
  },
  "executable-if-kernel": {
    relation: "condition-definition-owner",
    required_disposition: "append-typed-evolution-event-and-reseal-the-kernel",
  },
  forecast: {
    relation: "future-event-target-consumer",
    required_disposition: "preserve-original-record-and-apply-registered-void-or-resolution-policy",
  },
  "possible-path": {
    relation: "condition-branch-and-path-consumer",
    required_disposition: "invalidate-traversal-until-rebound-and-rival-paths-rechecked",
  },
  "preparation-register": {
    relation: "condition-trigger-consumer",
    required_disposition: "withhold-trigger-eligibility-until-rebound-and-human-gates-rechecked",
  },
  "signal-registry": {
    relation: "condition-signal-binding-consumer",
    required_disposition: "rebind-and-revalidate-signal-definition-coverage-and-evidence-state",
  },
});

function canonicalJson(value) {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.keys(value).sort().map((key) =>
      `${JSON.stringify(key)}:${canonicalJson(value[key])}`).join(",")}}`;
  }
  return JSON.stringify(value);
}

function digest(bytes) {
  return `sha256:${createHash("sha256").update(bytes).digest("hex")}`;
}

function same(left, right) {
  return canonicalJson(left) === canonicalJson(right);
}

function withoutManifest(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return value;
  const copy = structuredClone(value);
  delete copy.manifest_hash;
  return copy;
}

function issue(code, message) {
  return { code, message };
}

function assertSourceBytes(bundle, bundleBytes) {
  if (!Buffer.isBuffer(bundleBytes) && !(bundleBytes instanceof Uint8Array)) {
    throw new TypeError("bundleBytes must contain the exact retained source-bundle bytes");
  }
  let decoded;
  try {
    decoded = JSON.parse(Buffer.from(bundleBytes).toString("utf8"));
  } catch (error) {
    throw new TypeError(`bundleBytes are not valid JSON: ${error.message}`);
  }
  if (!same(decoded, bundle)) {
    throw new TypeError("supplied bytes do not encode the supplied bundle document");
  }
}

function validateBundlePath(path) {
  if (typeof path !== "string" || !BUNDLE_PATH.test(path) ||
      path.split("/").some((part) => part === "." || part === ".." || part === "")) {
    throw new TypeError("bundlePath must be a closed repository-relative JSON path");
  }
}

export function computeConditionChangeImpactManifestHash(impact) {
  return digest(`${HASH_DOMAIN}\n${canonicalJson(withoutManifest(impact))}`);
}

export function traceConditionChangeImpact(bundle, {
  rootDir,
  bundlePath,
  bundleBytes,
  conditionId,
} = {}) {
  validateBundlePath(bundlePath);
  assertSourceBytes(bundle, bundleBytes);
  if (typeof conditionId !== "string" || !CONDITION_ID.test(conditionId)) {
    throw new TypeError("conditionId must use the closed condition identifier grammar");
  }

  const assessment = assertTransitionBundle(bundle, { rootDir });
  if (bundle.schema_version !== "1.2.0" || bundle.bundle_stage !== "complete-core") {
    throw new TypeError("condition impact tracing requires the exact Round 4 complete core");
  }
  if (!assessment.condition_identity.shared_by_all.includes(conditionId)) {
    throw new TypeError(`condition ${conditionId} is not shared by every joined artifact`);
  }

  const definitions = bundle.canonical.executable_if_ref.active_condition_definition_refs;
  const definition = definitions.find(({ condition_id: id }) => id === conditionId);
  if (!definition) {
    throw new TypeError(`condition ${conditionId} has no active executable definition`);
  }

  const joinedConsumers = bundle.artifacts.map((artifact) => {
    const policy = consumerPolicy[artifact.role];
    if (!policy) throw new TypeError(`no condition-change policy exists for role ${artifact.role}`);
    if (!assessment.condition_identity.by_role[artifact.role]?.includes(conditionId)) {
      throw new TypeError(`artifact role ${artifact.role} does not expose condition ${conditionId}`);
    }
    return {
      role: artifact.role,
      path: artifact.path,
      artifact_sha256: artifact.sha256,
      relation: policy.relation,
      current_binding: "validated-within-exact-source-bundle",
      release_state: "withhold-until-revalidated",
      required_disposition: policy.required_disposition,
      authority_effect: "none",
    };
  });

  const impact = {
    schema_version: "1.0.0",
    impact_id: `impact.${bundle.bundle_id}.${conditionId}`,
    classification: "research-draft",
    source_bundle_ref: {
      bundle_id: bundle.bundle_id,
      bundle_stage: bundle.bundle_stage,
      path: bundlePath,
      sha256: digest(bundleBytes),
    },
    current_condition_definition_ref: structuredClone(definition),
    impact_scope: {
      change_kind: "condition-definition-only",
      repository_discovery_performed: false,
      external_organisation_discovery_performed: false,
      declared_bundle_consumers_only: true,
      unrepresented_consumers_are_exhaustive: false,
    },
    trigger: {
      change_types: ["narrowed", "definition-revised", "split", "merge"],
      rule: "Any change to identity, claim, scope, predicate, threshold, window, signal definition or evaluator requires a new definition reference and this impact horizon.",
    },
    joined_consumers: joinedConsumers,
    unrepresented_consumers: [
      {
        domain: "negotiation-record",
        state: "not-represented-in-source-bundle",
        list_status: "known-example-not-exhaustive",
        consequence: "No machine-verifiable account exists of who negotiated this IF, which positions changed or whose dissent remains unresolved.",
      },
      {
        domain: "decision-record",
        state: "not-represented-in-source-bundle",
        list_status: "known-example-not-exhaustive",
        consequence: "No machine-verifiable decision can be found, paused, reconsidered or corrected when this IF changes.",
      },
    ],
    gate_horizon: GATE_ORDER.map((gate) => ({
      gate,
      source_state: assessment.gates[gate],
      required_state: LOCAL_GATES.has(gate)
        ? "must-recompute-after-change"
        : "must-remain-closed-until-independent-evidence",
      inference_ceiling: LOCAL_GATES.has(gate)
        ? "A prior local result cannot be inherited by a changed IF."
        : "A changed IF cannot create real-world truth, freshness, authority or publication approval.",
    })),
    public_notice: "Within this synthetic bundle, changing this condition definition invalidates eight declared links. This check did not search the rest of the repository or any real organisation, and says nothing about truth, merit or what anyone should do.",
    boundary: {
      coverage: "joined-source-bundle-only",
      external_consumers_discovered: false,
      substantive_change_direction_assessed: false,
      empirical_truth_established: false,
      authority_effect: "none",
      action_authorised: false,
      publication_approved: false,
    },
    authority_effect: "none",
    action_authorised: false,
    publication_approved: false,
    manifest_hash: null,
  };
  impact.manifest_hash = computeConditionChangeImpactManifestHash(impact);
  return impact;
}

export function validateConditionChangeImpact(impact, {
  rootDir,
  sourceBundle,
  sourceBundleBytes,
  sourceBundlePath,
} = {}) {
  const errors = [];
  let sourceBundleVerified = false;
  let derivationVerified = false;
  const manifestVerified = impact?.manifest_hash ===
    computeConditionChangeImpactManifestHash(impact);
  if (!manifestVerified) {
    errors.push(issue("MANIFEST_HASH_MISMATCH", "impact manifest does not match its canonical content"));
  }

  try {
    validateBundlePath(sourceBundlePath);
    assertSourceBytes(sourceBundle, sourceBundleBytes);
    const expectedRef = {
      bundle_id: sourceBundle.bundle_id,
      bundle_stage: sourceBundle.bundle_stage,
      path: sourceBundlePath,
      sha256: digest(sourceBundleBytes),
    };
    sourceBundleVerified = same(impact?.source_bundle_ref, expectedRef);
    if (!sourceBundleVerified) {
      errors.push(issue("SOURCE_BUNDLE_MISMATCH", "impact does not bind the supplied source-bundle bytes"));
    }
  } catch (error) {
    errors.push(issue("SOURCE_BUNDLE_INVALID", error.message));
  }

  if (sourceBundleVerified) {
    try {
      const expected = traceConditionChangeImpact(sourceBundle, {
        rootDir,
        bundlePath: sourceBundlePath,
        bundleBytes: sourceBundleBytes,
        conditionId: impact?.current_condition_definition_ref?.condition_id,
      });
      derivationVerified = same(impact, expected);
      if (!derivationVerified) {
        errors.push(issue("DERIVATION_MISMATCH", "impact does not reproduce from the exact coherent source bundle"));
      }
    } catch (error) {
      errors.push(issue("DERIVATION_FAILED", error.message));
    }
  }

  return {
    valid: sourceBundleVerified && derivationVerified && manifestVerified && errors.length === 0,
    source_bundle_verified: sourceBundleVerified,
    derivation_verified: derivationVerified,
    manifest_verified: manifestVerified,
    errors,
  };
}
