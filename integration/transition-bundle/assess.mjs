import { createHash } from "node:crypto";
import {
  lstatSync,
  mkdtempSync,
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
import { validateConditionEvolutionLedger } from "../../contracts/evolution/validate.mjs";
import { validatePossiblePath } from "../../paths/validate.mjs";
import { validateSignalRegistry } from "../../signals/validate.mjs";
import { assessPreparationRegister } from "../../preparation/lib/validate.mjs";
import { assertForecastSemantics } from "../../forecasts/lib/registry.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const defaultRoot = resolve(here, "../..");
const bundleSchema = JSON.parse(readFileSync(resolve(here, "schema/transition-bundle.schema.json"), "utf8"));
const forecastSchema = JSON.parse(readFileSync(resolve(defaultRoot, "forecasts/schema/binary-forecast.schema.json"), "utf8"));
const dashboardBuilder = resolve(defaultRoot, "dashboard/tools/build.mjs");

const ajv = new Ajv2020({ allErrors: true, strict: true });
addFormats(ajv);
const validateBundleSchema = ajv.compile(bundleSchema);
const validateForecastSchema = ajv.compile(forecastSchema);

const REQUIRED_ROLES = [
  "agency-map",
  "evolution-ledger",
  "signal-registry",
  "possible-path",
  "preparation-register",
  "dashboard-snapshot",
  "forecast",
];

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

function sameSet(left, right) {
  return left.length === right.length &&
    [...left].sort().every((value, index) => value === [...right].sort()[index]);
}

function safeArtifact(ref, rootDir) {
  if (!ref || typeof ref.path !== "string" || isAbsolute(ref.path) ||
      ref.path.split("/").some((part) => part === ".." || part === "")) {
    throw new Error("path must be a closed repository-relative JSON path");
  }
  const candidate = resolve(rootDir, ref.path);
  if (lstatSync(candidate).isSymbolicLink()) {
    throw new Error("symbolic links are not accepted as artifact paths");
  }
  const realRoot = realpathSync(rootDir);
  const realCandidate = realpathSync(candidate);
  const fromRoot = relative(realRoot, realCandidate);
  if (fromRoot === "" || fromRoot === ".." || fromRoot.startsWith(`..${sep}`) || isAbsolute(fromRoot)) {
    throw new Error("artifact path escapes the repository root");
  }
  const bytes = readFileSync(realCandidate);
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

function validateComponent(role, document, artifactPath, evaluatedAt) {
  try {
    if (role === "agency-map") {
      const result = validateConditionAgencyMap(document, { evaluatedAt });
      return { valid: result.machine_valid && result.integrity_valid, result };
    }
    if (role === "evolution-ledger") {
      const result = validateConditionEvolutionLedger(document);
      return { valid: result.machine_valid && result.integrity_valid, result };
    }
    if (role === "signal-registry") {
      const result = validateSignalRegistry(document);
      return { valid: result.machine_valid && result.integrity_valid, result };
    }
    if (role === "possible-path") {
      const result = validatePossiblePath(document);
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
    if (role === "experiment-fact-pack") {
      return { valid: true, result: { content_addressed_only: true, semantic_validator_available: false } };
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
      .map(({ condition_id: id }) => id);
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
  return [];
}

function intersection(sets) {
  if (!sets.length) return [];
  return [...sets[0]].filter((value) => sets.slice(1).every((set) => set.has(value))).sort();
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
  const roleCounts = new Map();
  for (const ref of refs) roleCounts.set(ref.role, (roleCounts.get(ref.role) || 0) + 1);
  for (const role of REQUIRED_ROLES) {
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

  let componentsValid = artifactIntegrity;
  for (const role of REQUIRED_ROLES) {
    if (!documents.has(role)) {
      componentsValid = false;
      continue;
    }
    const result = validateComponent(
      role,
      documents.get(role),
      paths.get(role),
      bundle?.evaluation_clock?.evaluated_at,
    );
    componentResults[role] = result.result;
    if (!result.valid) {
      componentsValid = false;
      issues.push(issue("COMPONENT_VALIDATION_FAILED", role, "the fixed repository validator rejected this artifact"));
    }
  }

  const canonicalIds = bundle?.canonical?.condition_ids || [];
  const identityByRole = {};
  for (const role of REQUIRED_ROLES) {
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
    if (role !== "forecast" && !sameSet(ids, canonicalIds)) {
      issues.push(issue(
        "CONDITION_SET_MISMATCH",
        role,
        "component condition identities do not equal the canonical condition set",
      ));
    }
  }

  const agency = documents.get("agency-map");
  if (agency) {
    if (agency.outcome_scope?.scope_hash !== bundle?.canonical?.scope_hash) {
      issues.push(issue("SCOPE_HASH_MISMATCH", "agency-map", "root scope does not match the bundle scope"));
    }
    if (checksumJson(agency.outcome_scope?.condition_logic) !== bundle?.canonical?.if_logic_hash) {
      issues.push(issue("IF_LOGIC_HASH_MISMATCH", "agency-map", "root IF logic does not match the bundle logic"));
    }
  }
  const possiblePath = documents.get("possible-path");
  if (possiblePath?.outcome_scope?.scope_hash !== bundle?.canonical?.scope_hash) {
    issues.push(issue("SCOPE_HASH_MISMATCH", "possible-path", "possible-path scope differs from the canonical scope"));
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
  if (dashboard && !(dashboard.possible_path_refs || []).length) {
    issues.push(issue(
      "DASHBOARD_PATHS_UNRESOLVED",
      "dashboard-snapshot",
      "dashboard has no resolved positive, adverse, refusal or recovery path references",
    ));
  }
  if (!bundle?.evaluation_clock?.trusted || bundle?.evaluation_clock?.source !== "verified-time-authority") {
    issues.push(issue(
      "EVALUATION_TIME_UNTRUSTED",
      "bundle",
      "a caller-supplied clock cannot establish cross-artifact freshness",
    ));
  }
  if (!documents.has("experiment-fact-pack")) {
    issues.push(issue(
      "EXPERIMENT_FACT_PACK_MISSING",
      "experiment-fact-pack",
      "experiment arms are not bound to one immutable fact pack",
    ));
  }

  const issueCodes = new Set(issues.map(({ code }) => code));
  const machineValid = schemaValid && artifactIntegrity;
  const bundleCoherent = machineValid && componentsValid && issues.length === 0;
  const scopeReady = ![...issueCodes].some((code) => code.includes("SCOPE"));
  const identityReady = !issueCodes.has("CONDITION_SET_MISMATCH") &&
    !issueCodes.has("PREPARATION_CONDITION_ID_MISSING");
  const gates = {
    integrity: bundleCoherent,
    scope: bundleCoherent && scopeReady,
    history: bundleCoherent && identityReady && Boolean(componentResults["evolution-ledger"]?.history_complete),
    truth: false,
    freshness: bundleCoherent && Boolean(bundle?.evaluation_clock?.trusted),
    evidence: bundleCoherent && identityReady,
    forecast: bundleCoherent && !issueCodes.has("FORECAST_TARGET_UNBOUND"),
    preparation: bundleCoherent && identityReady,
    authority: false,
    publication: false,
    experiment: bundleCoherent && documents.has("experiment-fact-pack"),
  };

  return {
    schema_version: "1.0.0",
    bundle_id: bundle?.bundle_id || null,
    machine_valid: machineValid,
    components_valid: componentsValid,
    bundle_coherent: bundleCoherent,
    gates,
    condition_identity: {
      canonical: canonicalIds,
      by_role: identityByRole,
      shared_by_all: intersection(Object.values(identityByRole).map((ids) => new Set(ids))),
    },
    component_results: componentResults,
    authority_effect: "none",
    action_authorised: false,
    publication_approved: false,
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
