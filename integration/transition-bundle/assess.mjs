import { createHash } from "node:crypto";
import {
  closeSync,
  constants,
  fstatSync,
  lstatSync,
  mkdtempSync,
  openSync,
  readFileSync,
  realpathSync,
  rmSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, isAbsolute, join, relative, resolve, sep } from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

import Ajv2020 from "ajv/dist/2020.js";
import addFormats from "ajv-formats";

import { validateConditionAgencyMap } from "../../contracts/agency-map/validate.mjs";
import {
  computeEvidenceStateHash,
  evaluateKernelCondition,
  validateExecutableIfKernel,
} from "../../contracts/executable-if/validate.mjs";
import { validateConditionEvolutionLedger } from "../../contracts/evolution/validate.mjs";
import { validatePossiblePath } from "../../paths/validate.mjs";
import { validateSignalRegistry } from "../../signals/validate.mjs";
import { assessPreparationRegister } from "../../preparation/lib/validate.mjs";
import { assertForecastSemantics } from "../../forecasts/lib/registry.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const defaultRoot = resolve(here, "../..");
const bundleSchema = JSON.parse(readFileSync(resolve(here, "schema/transition-bundle.schema.json"), "utf8"));
const scopeManifestSchema = JSON.parse(readFileSync(resolve(here, "schema/scope-manifest.schema.json"), "utf8"));
const forecastSchema = JSON.parse(readFileSync(resolve(defaultRoot, "forecasts/schema/binary-forecast.schema.json"), "utf8"));
const dashboardBuilder = resolve(defaultRoot, "dashboard/tools/build.mjs");
const MAX_ARTIFACT_BYTES = 5 * 1024 * 1024;

const ajv = new Ajv2020({ allErrors: true, strict: true });
addFormats(ajv);
const validateBundleSchema = ajv.compile(bundleSchema);
const validateScopeManifestSchema = ajv.compile(scopeManifestSchema);
const validateForecastSchema = ajv.compile(forecastSchema);

const CORE_ROLES = [
  "agency-map",
  "evolution-ledger",
  "signal-registry",
  "possible-path",
  "preparation-register",
  "dashboard-snapshot",
  "forecast",
];
const EXECUTABLE_CORE_ROLES = [...CORE_ROLES, "executable-if-kernel"];

function coreRoles(bundle) {
  return bundle?.schema_version === "1.2.0" ? EXECUTABLE_CORE_ROLES : CORE_ROLES;
}

function issue(code, artifactRole, message) {
  return { code, artifact_role: artifactRole, message };
}

function digest(bytes) {
  return `sha256:${createHash("sha256").update(bytes).digest("hex")}`;
}

function canonicalJson(value) {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.keys(value).sort().map((key) =>
      `${JSON.stringify(key)}:${canonicalJson(value[key])}`).join(",")}}`;
  }
  return JSON.stringify(value);
}

function checksumJson(value) {
  return digest(canonicalJson(value));
}

function same(left, right) {
  return canonicalJson(left) === canonicalJson(right);
}

function sameSet(left, right) {
  return left.length === right.length &&
    [...left].sort().every((value, index) => value === [...right].sort()[index]);
}

function safeArtifact(ref, rootDir) {
  if (!ref || typeof ref.path !== "string" || isAbsolute(ref.path) ||
      !/^[A-Za-z0-9][A-Za-z0-9._/-]*\.json$/.test(ref.path) ||
      ref.path.split("/").some((part) => part === ".." || part === "." || part === "")) {
    throw new Error("path must be a closed repository-relative JSON path");
  }
  const candidate = resolve(rootDir, ref.path);
  let current = realpathSync(rootDir);
  for (const part of ref.path.split("/")) {
    current = resolve(current, part);
    if (lstatSync(current).isSymbolicLink()) {
      throw new Error("symbolic links are not accepted in artifact paths");
    }
  }
  const realRoot = realpathSync(rootDir);
  const realCandidate = realpathSync(candidate);
  const fromRoot = relative(realRoot, realCandidate);
  if (fromRoot === "" || fromRoot === ".." || fromRoot.startsWith(`..${sep}`) || isAbsolute(fromRoot)) {
    throw new Error("artifact path escapes the repository root");
  }
  const descriptor = openSync(realCandidate, constants.O_RDONLY | constants.O_NOFOLLOW);
  let bytes;
  try {
    const stat = fstatSync(descriptor);
    if (!stat.isFile()) throw new Error("artifact path must name a regular file");
    if (stat.size > MAX_ARTIFACT_BYTES) {
      throw new Error(`artifact exceeds the ${MAX_ARTIFACT_BYTES}-byte size limit`);
    }
    bytes = readFileSync(descriptor);
  } finally {
    closeSync(descriptor);
  }
  return { bytes, document: JSON.parse(bytes.toString("utf8")), path: realCandidate };
}

function validateDashboard(path) {
  const temporary = mkdtempSync(join(tmpdir(), "mind-flow-dashboard-bundle-"));
  try {
    const result = spawnSync(process.execPath, [dashboardBuilder, path, join(temporary, "index.html")], {
      cwd: defaultRoot,
      encoding: "utf8",
      timeout: 30_000,
    });
    return {
      valid: result.status === 0,
      detail: result.status === 0 ? "fixed dashboard build passed" : (result.stderr || result.stdout).trim(),
    };
  } finally {
    rmSync(temporary, { recursive: true, force: true });
  }
}

function validateComponent(role, document, artifactPath, evaluatedAt, context = {}) {
  try {
    if (role === "agency-map") {
      const signalRegistryRef = context.refs?.find(({ role: candidate }) =>
        candidate === "signal-registry");
      const result = validateConditionAgencyMap(document, {
        evaluatedAt,
        sourceKernel: context.documents?.get("executable-if-kernel"),
        sourceEvolution: context.documents?.get("evolution-ledger"),
        sourceSignalRegistry: context.documents?.get("signal-registry"),
        sourceSignalRegistryArtifactPath: signalRegistryRef?.path,
        sourceSignalRegistryArtifactSha256: signalRegistryRef?.sha256,
      });
      return { valid: result.machine_valid && result.integrity_valid, result };
    }
    if (role === "evolution-ledger") {
      const kernelRef = context.refs?.find(({ role: candidate }) =>
        candidate === "executable-if-kernel");
      const result = validateConditionEvolutionLedger(document, document?.schema_version === "2.0.0"
        ? {
            sourceKernel: context.documents?.get("executable-if-kernel"),
            sourceKernelArtifactSha256: kernelRef?.sha256,
          }
        : {});
      return { valid: result.ledger_valid, result };
    }
    if (role === "executable-if-kernel") {
      const result = validateExecutableIfKernel(document);
      return {
        valid: result.machine_valid && result.integrity_valid && result.evidence_history_valid,
        result,
      };
    }
    if (role === "signal-registry") {
      const result = validateSignalRegistry(document);
      return { valid: result.machine_valid && result.integrity_valid, result };
    }
    if (role === "possible-path") {
      const source = (sourceRole) => {
        const reference = context.refs?.find(({ role: candidate }) => candidate === sourceRole);
        return {
          document: context.documents?.get(sourceRole),
          path: reference?.path,
          sha256: reference?.sha256,
        };
      };
      const result = validatePossiblePath(document, {
        sourceKernel: source("executable-if-kernel"),
        sourceEvolution: source("evolution-ledger"),
        sourceSignalRegistry: source("signal-registry"),
        sourceAgencyMap: source("agency-map"),
      });
      return { valid: result.machine_valid && result.integrity_valid, result };
    }
    if (role === "preparation-register") {
      const result = assessPreparationRegister(document);
      return { valid: result.schema_conformant && result.register_consistent, result };
    }
    if (role === "dashboard-snapshot") {
      const result = validateDashboard(artifactPath);
      return { valid: result.valid, result };
    }
    if (role === "forecast") {
      const schemaValid = validateForecastSchema(document);
      if (!schemaValid) {
        return { valid: false, result: { schema_valid: false, errors: structuredClone(validateForecastSchema.errors) } };
      }
      assertForecastSemantics(document);
      return { valid: true, result: { schema_valid: true, semantic_valid: true } };
    }
    return { valid: false, result: { errors: ["role has no fixed validator"] } };
  } catch (error) {
    return { valid: false, result: { errors: [error.message] } };
  }
}

function conditionIds(role, document, componentResult) {
  if (role === "agency-map") return document.outcome_scope?.condition_ids || [];
  if (role === "evolution-ledger") {
    return (componentResult?.current_state?.conditions || document.current_state?.conditions || [])
      .map((condition) => condition.condition_id ||
        condition.condition_definition_ref?.condition_id);
  }
  if (role === "signal-registry") return (document.condition_bindings || []).map(({ condition_id: id }) => id);
  if (role === "possible-path") return (document.outcome_scope?.if_conditions || []).map(({ condition_id: id }) => id);
  if (role === "preparation-register") {
    return (document.if_expressions || []).flatMap(({ content }) =>
      content?.condition_binding?.condition_id ? [content.condition_binding.condition_id] : []);
  }
  if (role === "dashboard-snapshot") return (document.if_path?.conditions || []).map(({ id }) => id);
  if (role === "forecast") {
    return document.target?.condition_id ? [document.target.condition_id] : [];
  }
  if (role === "executable-if-kernel") {
    return (componentResult?.current_definition_state || [])
      .filter(({ lifecycle }) => lifecycle === "active")
      .map(({ condition_id: id }) => id);
  }
  return [];
}

function intersection(sets) {
  if (!sets.length) return [];
  return [...sets[0]].filter((value) => sets.slice(1).every((set) => set.has(value))).sort();
}

function executableSignalProjection(kernel, activeDefinitionRefs) {
  const signalByKey = new Map((kernel?.signals || []).map((signal) => [
    `${signal.signal_id}@${signal.definition_version}`,
    signal,
  ]));
  const activeRefKeys = new Set(activeDefinitionRefs.map((reference) =>
    `${reference.condition_id}@${reference.definition_version}`));
  const definitions = (kernel?.events || [])
    .flatMap(({ introduced_definitions: values }) => values)
    .filter((definition) => activeRefKeys.has(
      `${definition.condition_id}@${definition.definition_version}`));
  const grouped = new Map();
  for (const definition of definitions) {
    for (const [predicateId, predicate] of Object.entries(definition.predicates)) {
      const key = `${predicate.signal_ref.signal_id}@${predicate.signal_ref.definition_version}`;
      const signal = signalByKey.get(key);
      const current = grouped.get(key) || {
        signal_definition_ref: structuredClone(predicate.signal_ref),
        condition_definition_ref: {
          condition_id: definition.condition_id,
          definition_version: definition.definition_version,
          definition_hash: definition.definition_hash,
        },
        predicate_ids: [],
        semantics: signal ? {
          label: signal.label,
          construct: signal.construct,
          population: signal.population,
          estimand: signal.estimand,
          aggregation: signal.aggregation,
          unit: signal.unit,
        } : null,
      };
      current.predicate_ids.push(predicateId);
      grouped.set(key, current);
    }
  }
  return [...grouped.values()]
    .map((entry) => ({ ...entry, predicate_ids: entry.predicate_ids.sort() }))
    .sort((left, right) => left.signal_definition_ref.signal_id
      .localeCompare(right.signal_definition_ref.signal_id));
}

function registeredExecutableSignals(registry) {
  return (registry?.signals || []).filter(({ executable_binding: binding }) => binding)
    .map((signal) => ({
    signal_definition_ref: structuredClone(
      signal.executable_binding?.signal_definition_ref,
    ),
    condition_definition_ref: structuredClone(
      signal.executable_binding?.condition_definition_ref,
    ),
    predicate_ids: [...(signal.executable_binding?.predicate_ids || [])].sort(),
    semantics: {
      label: signal.label,
      construct: signal.construct?.definition,
      population: signal.estimand?.population,
      estimand: signal.estimand?.quantity,
      aggregation: signal.estimand?.aggregation_level,
      unit: signal.estimand?.unit,
    },
  })).sort((left, right) => (left.signal_definition_ref?.signal_id || "")
    .localeCompare(right.signal_definition_ref?.signal_id || ""));
}

function canonicalScopeFromAgency(agency) {
  const scope = agency?.outcome_scope || {};
  return {
    source_role: "agency-map",
    native_scope_hash: scope.scope_hash,
    people: scope.people,
    verb: scope.verb,
    object: scope.object,
    standard: scope.standard,
    place: scope.place,
    period: scope.period,
    jurisdictions: scope.jurisdictions,
    geographies: scope.geographies,
    services: scope.services,
    starts_at: scope.starts_at,
    ends_at: scope.ends_at,
  };
}

function nativeScopeHash(role, document) {
  if (["agency-map", "possible-path"].includes(role)) {
    return document?.outcome_scope?.scope_hash;
  }
  return undefined;
}

export function assessTransitionBundle(bundle, { rootDir = defaultRoot } = {}) {
  const issues = [];
  const schemaValid = validateBundleSchema(bundle);
  if (!schemaValid) {
    issues.push(issue(
      "BUNDLE_SCHEMA_INVALID",
      "bundle",
      ajv.errorsText(validateBundleSchema.errors, { separator: "; " }),
    ));
  }

  const refs = Array.isArray(bundle?.artifacts) ? bundle.artifacts : [];
  const requiredRoles = bundle?.bundle_stage === "pre-projection-core"
    ? coreRoles(bundle).filter((role) => role !== "dashboard-snapshot")
    : coreRoles(bundle);
  const roleCounts = new Map();
  for (const ref of refs) roleCounts.set(ref.role, (roleCounts.get(ref.role) || 0) + 1);
  for (const role of requiredRoles) {
    if (roleCounts.get(role) !== 1) {
      issues.push(issue("ARTIFACT_ROLE_CARDINALITY", role, "every required role must appear exactly once"));
    }
  }

  for (const [role, count] of roleCounts) {
    if (count > 1) issues.push(issue("ARTIFACT_ROLE_CARDINALITY", role, "artifact roles must be unique"));
  }

  const documents = new Map();
  const paths = new Map();
  const componentResults = {};
  let artifactIntegrity = true;
  for (const ref of refs) {
    try {
      const loaded = safeArtifact(ref, rootDir);
      if (digest(loaded.bytes) !== ref.sha256) {
        artifactIntegrity = false;
        issues.push(issue("ARTIFACT_HASH_MISMATCH", ref.role, "retained bytes do not match the manifest digest"));
        continue;
      }
      documents.set(ref.role, loaded.document);
      paths.set(ref.role, loaded.path);
    } catch (error) {
      artifactIntegrity = false;
      issues.push(issue("ARTIFACT_PATH_INVALID", ref?.role || "unknown", error.message));
    }
  }

  let referenceIntegrity = true;
  let conditionDefinitionValid = false;
  let scopeManifest;
  let scopeManifestReferenceValid = false;
  const scopeManifestRef = bundle?.canonical?.scope_manifest_ref;
  if (scopeManifestRef) {
    try {
      const loaded = safeArtifact(scopeManifestRef, rootDir);
      if (digest(loaded.bytes) !== scopeManifestRef.sha256) {
        referenceIntegrity = false;
        issues.push(issue(
          "SCOPE_MANIFEST_HASH_MISMATCH",
          "scope-manifest",
          "retained scope-manifest bytes do not match the canonical reference",
        ));
      } else {
        scopeManifest = loaded.document;
        if (!validateScopeManifestSchema(scopeManifest)) {
          referenceIntegrity = false;
          issues.push(issue(
            "SCOPE_MANIFEST_INVALID",
            "scope-manifest",
            ajv.errorsText(validateScopeManifestSchema.errors, { separator: "; " }),
          ));
        } else if (scopeManifest.scope_manifest_id !== scopeManifestRef.scope_manifest_id) {
          referenceIntegrity = false;
          issues.push(issue(
            "SCOPE_MANIFEST_ID_MISMATCH",
            "scope-manifest",
            "scope-manifest identity does not match its canonical reference",
          ));
        } else {
          scopeManifestReferenceValid = true;
        }
      }
    } catch (error) {
      referenceIntegrity = false;
      issues.push(issue("SCOPE_MANIFEST_PATH_INVALID", "scope-manifest", error.message));
    }
  } else {
    referenceIntegrity = false;
    issues.push(issue(
      "SCOPE_MANIFEST_REF_MISSING",
      "scope-manifest",
      "canonical scope must resolve through one content-addressed manifest",
    ));
  }

  let componentsValid = artifactIntegrity;
  for (const role of requiredRoles) {
    if (!documents.has(role)) {
      componentsValid = false;
      continue;
    }
    const result = validateComponent(
      role,
      documents.get(role),
      paths.get(role),
      bundle?.evaluation_clock?.evaluated_at,
      { documents, refs },
    );
    componentResults[role] = result.result;
    if (!result.valid) {
      componentsValid = false;
      issues.push(issue("COMPONENT_VALIDATION_FAILED", role, "the fixed repository validator rejected this artifact"));
    }
  }
  const executableIfRequired = bundle?.schema_version === "1.2.0";
  let executableIfReferenceValid = !executableIfRequired;
  const governedEvaluations = [];
  let executableSignalReferenceValid = !executableIfRequired;
  if (executableIfRequired) {
    const kernel = documents.get("executable-if-kernel");
    const declared = bundle?.canonical?.executable_if_ref;
    const activeDefinitionRefs = (componentResults["executable-if-kernel"]
      ?.current_definition_state || [])
      .filter(({ lifecycle }) => lifecycle === "active")
      .map(({ condition_definition_ref: reference }) => reference)
      .sort((left, right) => left.condition_id.localeCompare(right.condition_id));
    const declaredRefs = [...(declared?.active_condition_definition_refs || [])]
      .sort((left, right) => left.condition_id.localeCompare(right.condition_id));
    const evidenceTip = kernel?.evidence_events?.at(-1);
    const expectedEvidenceStateRef = kernel ? {
      kernel_id: kernel.kernel_id,
      kernel_manifest_hash: kernel.manifest_hash,
      evidence_event_count: kernel.evidence_events.length,
      evidence_tip_event_id: evidenceTip?.evidence_event_id,
      evidence_tip_event_hash: evidenceTip?.evidence_event_hash,
      evidence_state_hash: computeEvidenceStateHash(kernel.current_evidence_state),
    } : null;
    executableIfReferenceValid = Boolean(kernel) &&
      declared?.artifact_role === "executable-if-kernel" &&
      declared?.kernel_id === kernel?.kernel_id &&
      declared?.manifest_hash === kernel?.manifest_hash &&
      same(declared?.evaluator_ref, kernel?.evaluator) &&
      same(declaredRefs, activeDefinitionRefs) &&
      same(declared?.evidence_state_ref, expectedEvidenceStateRef);
    if (!executableIfReferenceValid) {
      referenceIntegrity = false;
      issues.push(issue(
        "EXECUTABLE_IF_REF_MISMATCH",
        "executable-if-kernel",
        "canonical executable IF reference must bind the exact kernel, evaluator and active definitions",
      ));
    } else {
      for (const reference of activeDefinitionRefs) {
        governedEvaluations.push(evaluateKernelCondition(kernel, reference.condition_id, {
          evaluatedAt: bundle?.evaluation_clock?.evaluated_at,
        }));
      }
    }

    const evolution = documents.get("evolution-ledger");
    const evolutionResult = componentResults["evolution-ledger"];
    if (evolution?.schema_version !== "2.0.0" || !evolutionResult?.source_binding_verified ||
        !evolutionResult?.history_complete) {
      referenceIntegrity = false;
      issues.push(issue(
        "DEFINITION_HISTORY_MISMATCH",
        "evolution-ledger",
        "Round 4 evolution must bind the exact complete executable IF definition and evidence history",
      ));
    } else {
      const evolutionRefs = (evolutionResult.current_state?.conditions || [])
        .map(({ condition_definition_ref: reference }) => reference)
        .sort((left, right) => left.condition_id.localeCompare(right.condition_id));
      if (!same(evolutionRefs, activeDefinitionRefs)) {
        referenceIntegrity = false;
        issues.push(issue(
          "ACTIVE_DEFINITION_REF_MISMATCH",
          "evolution-ledger",
          "evolution active definitions must equal the kernel active definitions exactly",
        ));
      }
    }

    const registry = documents.get("signal-registry");
    const expectedSignals = executableSignalProjection(kernel, activeDefinitionRefs);
    const registeredSignals = registeredExecutableSignals(registry);
    executableSignalReferenceValid = same(registeredSignals, expectedSignals);
    if (!executableSignalReferenceValid) {
      referenceIntegrity = false;
      issues.push(issue(
        "EXECUTABLE_SIGNAL_REF_MISMATCH",
        "signal-registry",
        "registered predicate signals must preserve exact kernel refs, condition edges and measurement semantics",
      ));
    }
    const evolutionManifest = evolution?.manifest_hash;
    const expectedConditionAnchors = activeDefinitionRefs.map((reference) => {
      const producer = kernel?.events?.find((event) => event.new_states.some((state) =>
        state.lifecycle === "active" && same(state.condition_definition_ref, reference)));
      return {
        condition_id: reference.condition_id,
        ledger_manifest_hash: evolutionManifest,
        ledger_tip_event_id: producer?.event_id,
        ledger_tip_hash: producer?.event_hash,
        condition_definition_ref: reference,
        condition_source_event_ref: producer ? {
          sequence: producer.sequence,
          event_id: producer.event_id,
          event_hash: producer.event_hash,
        } : null,
        evidence_state_ref: expectedEvidenceStateRef,
      };
    }).sort((left, right) => left.condition_id.localeCompare(right.condition_id));
    const registeredConditionAnchors = (registry?.condition_bindings || []).map((binding) => ({
      condition_id: binding.condition_id,
      ledger_manifest_hash: binding.ledger_manifest_hash,
      ledger_tip_event_id: binding.ledger_tip_event_id,
      ledger_tip_hash: binding.ledger_tip_hash,
      condition_definition_ref: binding.condition_definition_ref,
      condition_source_event_ref: binding.condition_source_event_ref,
      evidence_state_ref: binding.evidence_state_ref,
    })).sort((left, right) => left.condition_id.localeCompare(right.condition_id));
    if (!same(registeredConditionAnchors, expectedConditionAnchors)) {
      referenceIntegrity = false;
      issues.push(issue(
        "SIGNAL_CONDITION_ANCHOR_MISMATCH",
        "signal-registry",
        "signal registry condition anchors must bind the exact evolution manifest, kernel producer and evidence state",
      ));
    }
  }
  const canonicalIds = bundle?.canonical?.condition_ids || [];
  const identityByRole = {};
  for (const role of requiredRoles) {
    if (!documents.has(role)) continue;
    const ids = [...new Set(conditionIds(role, documents.get(role), componentResults[role]))].sort();
    identityByRole[role] = ids;
    if (role === "preparation-register" && ids.length === 0) {
      issues.push(issue(
        "PREPARATION_CONDITION_ID_MISSING",
        role,
        "IF expressions name ledger tips but do not identify the canonical condition",
      ));
    }
    if (!sameSet(ids, canonicalIds)) {
      issues.push(issue(
        "CONDITION_SET_MISMATCH",
        role,
        "component condition identities do not equal the canonical condition set",
      ));
    }
  }

  const agency = documents.get("agency-map");
  if (agency?.outcome_scope?.condition_logic) {
    const conditionRef = bundle?.canonical?.outcome_logic_ref;
    const expectedHash = checksumJson(agency.outcome_scope?.condition_logic);
    conditionDefinitionValid = conditionRef?.artifact_role === "agency-map" &&
      conditionRef?.json_pointer === "/outcome_scope/condition_logic" &&
      conditionRef?.sha256 === expectedHash;
    if (!conditionDefinitionValid) {
      referenceIntegrity = false;
      issues.push(issue(
        "OUTCOME_LOGIC_REF_MISMATCH",
        "agency-map",
        "canonical outcome-logic reference does not match the exact agency-map IF logic",
      ));
    }
  }
  if (!agency?.outcome_scope?.condition_logic) {
    referenceIntegrity = false;
    issues.push(issue(
      "OUTCOME_LOGIC_REF_MISMATCH",
      "agency-map",
      "canonical outcome-logic root is unavailable",
    ));
  }

  let scopeBindingValid = scopeManifestReferenceValid;
  const scopeByRole = {};
  const scopeBindings = Array.isArray(bundle?.scope_bindings) ? bundle.scope_bindings : [];
  const requiredScopeRoles = ["agency-map", "possible-path"];
  const bindingCounts = new Map();
  for (const binding of scopeBindings) {
    bindingCounts.set(binding.role, (bindingCounts.get(binding.role) || 0) + 1);
  }
  for (const role of requiredScopeRoles) {
    if (bindingCounts.get(role) !== 1) {
      scopeBindingValid = false;
      referenceIntegrity = false;
      issues.push(issue(
        "SCOPE_BINDING_CARDINALITY",
        role,
        "every native scope domain must have exactly one canonical mapping",
      ));
    }
  }
  const mappings = new Map();
  const mappingRoleCounts = new Map();
  for (const mapping of scopeManifest?.mappings || []) {
    mappingRoleCounts.set(mapping.role, (mappingRoleCounts.get(mapping.role) || 0) + 1);
    if (mappings.has(mapping.mapping_id)) {
      scopeBindingValid = false;
      referenceIntegrity = false;
      issues.push(issue(
        "SCOPE_MAPPING_ID_DUPLICATE",
        mapping.role,
        "scope-manifest mapping identities must be unique",
      ));
    }
    mappings.set(mapping.mapping_id, mapping);
  }
  for (const role of requiredScopeRoles) {
    if (mappingRoleCounts.get(role) !== 1) {
      scopeBindingValid = false;
      referenceIntegrity = false;
      issues.push(issue(
        "SCOPE_MAPPING_CARDINALITY",
        role,
        "scope manifest must contain exactly one mapping for every native scope domain",
      ));
    }
  }
  for (const mapping of scopeManifest?.mappings || []) {
    const relationshipValid = mapping.role === "agency-map"
      ? mapping.relationship === "canonical-source" && mapping.unresolved_differences.length === 0
      : mapping.relationship === "declared-correspondence-unverified" &&
        mapping.unresolved_differences.length > 0;
    if (!relationshipValid) {
      scopeBindingValid = false;
      referenceIntegrity = false;
      issues.push(issue(
        "SCOPE_MAPPING_SEMANTICS_INVALID",
        mapping.role,
        "canonical source and unverified correspondence relationships must retain their explicit difference rules",
      ));
    }
  }
  if (scopeManifest && agency && !same(
    scopeManifest.canonical_scope,
    canonicalScopeFromAgency(agency),
  )) {
    scopeBindingValid = false;
    referenceIntegrity = false;
    issues.push(issue(
      "SCOPE_MANIFEST_CANONICAL_DRIFT",
      "agency-map",
      "canonical scope does not reproduce the agency-map source scope exactly",
    ));
  }
  for (const binding of scopeBindings) {
    const role = binding?.role || "unknown";
    const actualNativeHash = nativeScopeHash(role, documents.get(role));
    const mapping = mappings.get(binding?.mapping_ref?.mapping_id);
    const manifestRefMatches = same(
      binding?.canonical_scope_manifest_ref,
      scopeManifestRef,
    );
    const nativeHashMatches = Boolean(actualNativeHash) &&
      binding?.native_scope_hash === actualNativeHash;
    const mappingMatches = Boolean(mapping) &&
      binding?.mapping_ref?.sha256 === checksumJson(mapping) &&
      mapping?.role === role &&
      mapping?.native_scope_hash === binding?.native_scope_hash;
    scopeByRole[role] = {
      native_scope_hash: binding?.native_scope_hash || null,
      canonical_manifest_ref_valid: manifestRefMatches,
      native_hash_valid: nativeHashMatches,
      mapping_ref_valid: mappingMatches,
      mapping_truth_assessed: false,
    };
    if (!manifestRefMatches) {
      scopeBindingValid = false;
      referenceIntegrity = false;
      issues.push(issue(
        "SCOPE_BINDING_MANIFEST_REF_MISMATCH",
        role,
        "scope binding does not name the canonical scope-manifest reference exactly",
      ));
    }
    if (!nativeHashMatches) {
      scopeBindingValid = false;
      referenceIntegrity = false;
      issues.push(issue(
        "SCOPE_BINDING_NATIVE_HASH_MISMATCH",
        role,
        "scope binding rewrites or does not match the component native scope hash",
      ));
    }
    if (!mappingMatches) {
      scopeBindingValid = false;
      referenceIntegrity = false;
      issues.push(issue(
        "SCOPE_MAPPING_REF_MISMATCH",
        role,
        "scope mapping identity, digest, role or native hash does not resolve exactly",
      ));
    }
  }

  const forecast = documents.get("forecast");
  if (forecast && (!forecast.target?.signal_id || !forecast.target?.metric_checksum ||
      !forecast.target?.condition_id || !forecast.target?.scope_hash)) {
    issues.push(issue(
      "FORECAST_TARGET_UNBOUND",
      "forecast",
      "forecast target must bind a condition, signal, metric checksum and canonical scope",
    ));
  }

  const dashboard = documents.get("dashboard-snapshot");
  if (dashboard?.source_transition_bundle?.binding_state === "bound") {
    const source = dashboard.source_transition_bundle;
    if (source.bundle_id === bundle?.bundle_id) {
      referenceIntegrity = false;
      issues.push(issue(
        "DASHBOARD_DERIVATION_CYCLE",
        "dashboard-snapshot",
        "a dashboard cannot source the complete core that contains that dashboard",
      ));
    } else {
      try {
        const loadedSource = safeArtifact(source, rootDir);
        const sourceRoles = (loadedSource.document?.artifacts || [])
          .map(({ role }) => role)
          .sort();
        const expectedRoles = coreRoles(loadedSource.document)
          .filter((role) => role !== "dashboard-snapshot")
          .sort();
        if (digest(loadedSource.bytes) !== source.sha256 ||
            loadedSource.document?.bundle_id !== source.bundle_id ||
            loadedSource.document?.schema_version !== source.schema_version ||
            loadedSource.document?.bundle_stage !== "pre-projection-core" ||
            !same(sourceRoles, expectedRoles)) {
          referenceIntegrity = false;
          issues.push(issue(
            "DASHBOARD_DERIVATION_INVALID",
            "dashboard-snapshot",
            "a bound dashboard must resolve an exact six-artifact pre-projection core",
          ));
        }
      } catch (error) {
        referenceIntegrity = false;
        issues.push(issue("DASHBOARD_DERIVATION_INVALID", "dashboard-snapshot", error.message));
      }
    }
  }
  if (dashboard && !(dashboard.possible_path_refs || []).length) {
    issues.push(issue(
      "DASHBOARD_PATHS_UNRESOLVED",
      "dashboard-snapshot",
      "dashboard has no resolved positive, adverse, refusal or recovery path references",
    ));
  }
  issues.push(issue(
    "EVALUATION_TIME_UNTRUSTED",
    "bundle",
    "the integration has no independent time-authority verifier, so manifest time cannot establish freshness",
  ));
  const issueCodes = new Set(issues.map(({ code }) => code));
  const machineValid = schemaValid && artifactIntegrity && referenceIntegrity;
  const coherenceBlockers = issues.filter(
    ({ code }) => code !== "EVALUATION_TIME_UNTRUSTED",
  );
  const bundleCoherent = machineValid && componentsValid && coherenceBlockers.length === 0;
  const scopeReady = ![...issueCodes].some((code) => code.includes("SCOPE"));
  const identityReady = !issueCodes.has("CONDITION_SET_MISMATCH") &&
    !issueCodes.has("PREPARATION_CONDITION_ID_MISSING");
  const gates = {
    integrity: bundleCoherent,
    scope: bundleCoherent && scopeReady,
    history: bundleCoherent && identityReady && Boolean(componentResults["evolution-ledger"]?.history_complete),
    truth: false,
    freshness: false,
    evidence: bundleCoherent && identityReady && executableSignalReferenceValid,
    forecast: bundleCoherent && !issueCodes.has("FORECAST_TARGET_UNBOUND"),
    preparation: bundleCoherent && identityReady,
    authority: false,
    publication: false,
  };

  return {
    schema_version: bundle?.schema_version || null,
    bundle_id: bundle?.bundle_id || null,
    bundle_stage: bundle?.bundle_stage || null,
    machine_valid: machineValid,
    components_valid: componentsValid,
    bundle_coherent: bundleCoherent,
    gates,
    condition_identity: {
      canonical: canonicalIds,
      by_role: identityByRole,
      shared_by_all: intersection(Object.values(identityByRole).map((ids) => new Set(ids))),
    },
    outcome_logic: {
      valid: conditionDefinitionValid,
      declared_ref: bundle?.canonical?.outcome_logic_ref || null,
    },
    executable_if: {
      required: executableIfRequired,
      valid: executableIfReferenceValid,
      declared_ref: bundle?.canonical?.executable_if_ref || null,
      governed_evaluations: governedEvaluations,
    },
    executable_signals: {
      valid: executableSignalReferenceValid,
    },
    scope_binding: {
      valid: scopeBindingValid,
      scope_manifest_id: scopeManifest?.scope_manifest_id || null,
      mapping_truth_assessed: false,
      by_role: scopeByRole,
    },
    component_results: componentResults,
    authority_effect: "none",
    action_authorised: false,
    publication_approved: false,
    coherence_blockers: coherenceBlockers,
    issues,
  };
}

export function assertTransitionBundle(bundle, options) {
  const assessment = assessTransitionBundle(bundle, options);
  if (!assessment.bundle_coherent) {
    const detail = assessment.issues.map(({ code, artifact_role: role, message }) =>
      `${code} (${role}): ${message}`).join("\n");
    throw new Error(`Transition bundle is not coherent:\n${detail}`);
  }
  return assessment;
}
