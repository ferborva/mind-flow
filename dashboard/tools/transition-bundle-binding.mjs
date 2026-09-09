import { createHash } from "node:crypto";
import {
  closeSync,
  constants,
  fstatSync,
  lstatSync,
  openSync,
  readFileSync,
  realpathSync,
} from "node:fs";
import { dirname, isAbsolute, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

import Ajv2020 from "ajv/dist/2020.js";
import addFormats from "ajv-formats";

import { assessTransitionBundle } from "../../integration/transition-bundle/assess.mjs";
import { validatePossiblePath } from "../../paths/validate.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const defaultRoot = resolve(here, "../..");
const MAX_ARTIFACT_BYTES = 5 * 1024 * 1024;
const transitionBundleSchema = JSON.parse(readFileSync(
  resolve(defaultRoot, "integration/transition-bundle/schema/transition-bundle.schema.json"),
  "utf8",
));
const ajv = new Ajv2020({ allErrors: true, strict: true });
addFormats(ajv);
const validateTransitionBundle = ajv.compile(transitionBundleSchema);

function digest(bytes) {
  return `sha256:${createHash("sha256").update(bytes).digest("hex")}`;
}

function fail(label, message) {
  throw new Error(`${label}: ${message}`);
}

function readRepositoryJson(referencePath, { rootDir, label }) {
  if (typeof referencePath !== "string" || isAbsolute(referencePath) ||
      !/^[A-Za-z0-9][A-Za-z0-9._/-]*\.json$/.test(referencePath) ||
      referencePath.split("/").some((part) => part === "" || part === "." || part === "..")) {
    fail(label, "path must be a closed repository-relative JSON path");
  }

  const candidate = resolve(rootDir, referencePath);
  let realRoot;
  try {
    realRoot = realpathSync(rootDir);
    let current = realRoot;
    for (const part of referencePath.split("/")) {
      current = resolve(current, part);
      if (lstatSync(current).isSymbolicLink()) {
        fail(label, "symbolic links are not accepted in artifact paths");
      }
    }
  } catch (error) {
    if (error.message.startsWith(`${label}:`)) throw error;
    fail(label, `artifact cannot be inspected: ${error.message}`);
  }
  const realCandidate = realpathSync(candidate);
  const fromRoot = relative(realRoot, realCandidate);
  if (fromRoot === "" || fromRoot === ".." || fromRoot.startsWith(`..${sep}`) || isAbsolute(fromRoot)) {
    fail(label, "artifact resolves outside the repository root");
  }

  const descriptor = openSync(realCandidate, constants.O_RDONLY | constants.O_NOFOLLOW);
  let bytes;
  try {
    const stat = fstatSync(descriptor);
    if (!stat.isFile()) fail(label, "artifact must be a regular file");
    if (stat.size > MAX_ARTIFACT_BYTES) {
      fail(label, `artifact exceeds the ${MAX_ARTIFACT_BYTES}-byte size limit`);
    }
    bytes = readFileSync(descriptor);
  } finally {
    closeSync(descriptor);
  }
  let document;
  try {
    document = JSON.parse(bytes.toString("utf8"));
  } catch (error) {
    fail(label, `artifact is not valid JSON: ${error.message}`);
  }
  return { bytes, document, realPath: realCandidate };
}

function expectedScope(snapshot) {
  const claim = snapshot.if_path?.claim || {};
  return {
    who: claim.who,
    verb: claim.verb,
    object: claim.outcome,
    standard: claim.standard,
    place: claim.place,
    period: claim.period,
    condition_ids: (snapshot.if_path?.conditions || []).map(({ id }) => id),
  };
}

function assertScopeMatches(snapshot, possiblePath) {
  const expected = expectedScope(snapshot);
  const actual = possiblePath.outcome_scope || {};
  for (const field of ["who", "verb", "object", "standard", "place", "period"]) {
    if (actual[field] !== expected[field]) {
      fail("possible-path scope mismatch", `${field} differs from the dashboard IF claim`);
    }
  }
  const actualConditionIds = (actual.if_conditions || []).map(({ condition_id: id }) => id);
  if (actualConditionIds.length !== expected.condition_ids.length ||
      actualConditionIds.some((id, index) => id !== expected.condition_ids[index])) {
    fail(
      "possible-path scope mismatch",
      "ordered IF condition identities differ from the dashboard IF claim",
    );
  }
}

function assertBundlePathBindings(bundle, possiblePath) {
  const scopeBindings = (bundle.scope_bindings || []).filter(
    ({ role }) => role === "possible-path",
  );
  if (scopeBindings.length !== 1) {
    fail("bundle possible-path scope binding", "exactly one native scope binding is required");
  }
  if (scopeBindings[0].native_scope_hash !== possiblePath.outcome_scope.scope_hash) {
    fail("bundle possible-path scope binding", "native scope hash differs from the typed path");
  }
  const pathConditionIds = possiblePath.outcome_scope.if_conditions.map(
    ({ condition_id: id }) => id,
  );
  const canonicalConditionIds = bundle.canonical?.condition_ids || [];
  if (canonicalConditionIds.length !== pathConditionIds.length ||
      canonicalConditionIds.some((id, index) => id !== pathConditionIds[index])) {
    fail(
      "bundle possible-path condition binding",
      "canonical condition identities differ from the typed path",
    );
  }
}

function instant(value, label) {
  const parsed = Date.parse(value || "");
  if (!Number.isFinite(parsed)) fail("possible-path chronology", `${label} is not an exact instant`);
  return parsed;
}

function assertChronology(snapshot, bundle, possiblePath) {
  const recordGeneratedAt = instant(snapshot.generated_at, "dashboard generated_at");
  const bundleAsOf = instant(bundle.as_of, "bundle as_of");
  const evaluatedAt = instant(bundle.evaluation_clock?.evaluated_at, "bundle evaluated_at");
  if (bundleAsOf > recordGeneratedAt || evaluatedAt > recordGeneratedAt) {
    fail("bundle chronology", "a bundle assessment cannot occur after the dashboard record was generated");
  }
  const createdAt = instant(possiblePath.provenance?.created_at, "path created_at");
  const updatedAt = instant(possiblePath.provenance?.updated_at, "path updated_at");
  const lastCheckedAt = instant(
    possiblePath.intervention_state?.last_checked_at,
    "path intervention last_checked_at",
  );
  const expiresAt = instant(possiblePath.expiry?.expires_at, "path expires_at");
  if (createdAt > updatedAt || updatedAt > bundleAsOf || lastCheckedAt > bundleAsOf) {
    fail("possible-path chronology", "path creation, update and check clocks must precede the bundle assessment");
  }
  if (expiresAt <= bundleAsOf) {
    fail("possible-path chronology", "an expired path must be re-registered before projection");
  }
}

function assertExactReference(reference, artifact, possiblePath) {
  if (reference.id !== possiblePath.path_id) {
    fail("possible-path reference mismatch", "reference id does not equal the typed path id");
  }
  if (reference.version !== possiblePath.schema_version) {
    fail("possible-path reference mismatch", "reference version does not equal the typed path schema version");
  }
  if (reference.checksum !== artifact.sha256) {
    fail("possible-path reference mismatch", "reference checksum does not equal the bundle artifact digest");
  }
}

function projectPath(path, assessment, artifact) {
  return {
    path_id: path.path_id,
    schema_version: path.schema_version,
    artifact_sha256: artifact.sha256,
    classification: path.classification,
    title: path.title,
    hypothesis_summary: path.hypothesis_summary,
    outcome_scope: path.outcome_scope,
    public_claim: assessment.public_narrative.deterministic_text,
    public_narrative_status: assessment.public_narrative.publication_status,
    epistemic_contract: path.epistemic_contract,
    competing_paths: path.competing_paths,
    strongest_competing_path_id: path.strongest_competing_path_id,
    signal_roles: path.signal_portfolio.roles,
    population_accounting: path.population_accounting,
    abandonment: path.abandonment,
    expiry: path.expiry,
    authority: path.governance,
  };
}

export function resolvePossiblePathProjection(snapshot, { rootDir = defaultRoot } = {}) {
  const source = snapshot?.source_transition_bundle;
  const references = Array.isArray(snapshot?.possible_path_refs) ? snapshot.possible_path_refs : [];
  if (!source || typeof source !== "object") {
    fail("source transition bundle", "a binding state is required");
  }

  if (source.binding_state === "unbound_prototype") {
    if (references.length > 0) {
      fail("source transition bundle", "an unbound prototype cannot expose possible-path references");
    }
    return {
      binding_state: "unbound_prototype",
      reason: source.reason,
      bundle: null,
      paths: [],
    };
  }
  if (source.binding_state !== "bound") {
    fail("source transition bundle", "binding_state must be bound or unbound_prototype");
  }
  if (references.length === 0) {
    fail("source transition bundle", "a bound bundle requires at least one possible-path reference");
  }

  const loadedBundle = readRepositoryJson(source.path, {
    rootDir,
    label: "source transition bundle",
  });
  if (digest(loadedBundle.bytes) !== source.sha256) {
    fail("source transition bundle", "retained bytes do not match the declared digest");
  }
  const bundle = loadedBundle.document;
  if (!validateTransitionBundle(bundle)) {
    fail(
      "source transition bundle schema validation failed",
      ajv.errorsText(validateTransitionBundle.errors, { separator: "; " }),
    );
  }
  if (source.bundle_id !== bundle.bundle_id || source.schema_version !== bundle.schema_version) {
    fail("source transition bundle", "reference identity does not match the retained bundle");
  }
  if (bundle.bundle_stage !== "pre-projection-core") {
    fail("source transition bundle", "a dashboard must derive from a pre-projection-core");
  }

  const pathArtifacts = bundle.artifacts.filter(({ role }) => role === "possible-path");
  if (pathArtifacts.length !== 1) {
    fail("source transition bundle", "the bundle must contain exactly one possible-path role");
  }
  if (references.length !== pathArtifacts.length) {
    fail("possible-path references", "references must resolve one-for-one through bundle roles");
  }

  const artifact = pathArtifacts[0];
  const loadedPath = readRepositoryJson(artifact.path, {
    rootDir,
    label: "possible-path artifact",
  });
  const actualPathDigest = digest(loadedPath.bytes);
  if (actualPathDigest !== artifact.sha256) {
    fail("possible-path artifact", "retained bytes do not match the bundle digest");
  }
  const possiblePath = loadedPath.document;
  const assessment = validatePossiblePath(possiblePath);
  if (!assessment.machine_valid || !assessment.integrity_valid) {
    const codes = (assessment.errors || []).map(({ code }) => code).filter(Boolean).join(", ");
    fail(
      "fixed possible-path validator rejected the artifact",
      codes || "schema validation failed",
    );
  }
  assertExactReference(references[0], artifact, possiblePath);
  assertBundlePathBindings(bundle, possiblePath);
  assertScopeMatches(snapshot, possiblePath);
  assertChronology(snapshot, bundle, possiblePath);

  const bundleAssessment = assessTransitionBundle(bundle, { rootDir });
  const requiredGates = ["integrity", "scope", "history", "evidence", "forecast", "preparation"];
  const closedRequiredGates = requiredGates.filter(
    (gate) => bundleAssessment.gates?.[gate] !== true,
  );
  if (!bundleAssessment.bundle_coherent || closedRequiredGates.length > 0) {
    const codes = (bundleAssessment.coherence_blockers || [])
      .map(({ code }) => code)
      .filter(Boolean)
      .join(", ");
    fail(
      "source transition bundle",
      `is not coherent; closed gates: ${closedRequiredGates.join(", ") || "none"}; blockers: ${codes || "unspecified"}`,
    );
  }

  return {
    binding_state: "bound",
    bundle: {
      bundle_id: bundle.bundle_id,
      schema_version: bundle.schema_version,
      artifact_sha256: source.sha256,
      classification: bundle.classification,
      authority_effect: bundle.authority_effect,
      publication_approved: bundle.publication_approved,
      action_authorised: bundle.action_authorised,
      gates: bundleAssessment.gates,
    },
    paths: [projectPath(possiblePath, assessment, artifact)],
  };
}
