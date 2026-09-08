import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";

import Ajv2020 from "ajv/dist/2020.js";
import addFormats from "ajv-formats";

const DEFAULT_SCHEMA_BYTES = readFileSync(
  new URL("./schema/signal-registry.schema.json", import.meta.url),
);
const DEFAULT_SCHEMA_SHA256 = "99618128ad667fd0c16db73a22e0a46d0685b86284f0303c5aba4dd7cfe99b1a";
const actualSchemaSha256 = createHash("sha256").update(DEFAULT_SCHEMA_BYTES).digest("hex");
if (actualSchemaSha256 !== DEFAULT_SCHEMA_SHA256) {
  throw new Error("signal-registry schema bytes do not match the validator's pinned contract digest");
}
const DEFAULT_SCHEMA = JSON.parse(DEFAULT_SCHEMA_BYTES.toString("utf8"));

const ROLES = [
  "leading",
  "confirming",
  "counter",
  "outcome",
  "readiness",
  "intervention-exposure",
  "information-harm",
];

function issue(code, path, message, keyword = "integrity") {
  return { code, path, message, keyword };
}

function duplicateIssues(items, key, path) {
  const seen = new Set();
  const errors = [];
  for (const [index, item] of items.entries()) {
    if (seen.has(item[key])) {
      errors.push(issue("DUPLICATE_ID", `/${path}/${index}/${key}`, `${item[key]} is duplicated`));
    }
    seen.add(item[key]);
  }
  return errors;
}

function sameScope(left, right) {
  return [
    "construct_id",
    "population",
    "geography",
    "statistical_unit",
    "period",
    "unit",
    "denominator",
    "aggregation_level",
  ].every((field) => left[field] === right[field]);
}

export function renderPublicClaimCeiling(signal) {
  return `${signal.label} may be described only as ${signal.epistemic_class} evidence about ${signal.estimand.quantity} for ${signal.estimand.population}, ${signal.estimand.geography}, during ${signal.estimand.period}. It does not establish causality, individual outcomes or action authority.`;
}

function lineageClosure(sourceId, sourceById, visiting = new Set()) {
  if (visiting.has(sourceId)) return { ids: new Set([sourceId]), cycle: true };
  const source = sourceById.get(sourceId);
  if (!source) return { ids: new Set([sourceId]), cycle: false };

  const nextVisiting = new Set(visiting).add(sourceId);
  const ids = new Set([sourceId]);
  let cycle = false;
  for (const dependencyId of source.depends_on_source_ids) {
    const dependency = lineageClosure(dependencyId, sourceById, nextVisiting);
    for (const id of dependency.ids) ids.add(id);
    cycle ||= dependency.cycle;
  }
  return { ids, cycle };
}

function sourceFamilies(signal, sourceById) {
  const sourceIds = new Set();
  const processes = new Set();
  const evidenceUris = new Set();
  const artifactChecksums = new Set();
  let artifactsAcquired = true;
  for (const sourceRef of signal.source_refs) {
    const closure = lineageClosure(sourceRef, sourceById);
    for (const id of closure.ids) {
      sourceIds.add(id);
      const source = sourceById.get(id);
      if (source) {
        processes.add(source.collection_process_id);
        evidenceUris.add(source.evidence_ref);
        if (source.artifact_binding.status !== "acquired-external-bytes") {
          artifactsAcquired = false;
        } else {
          artifactChecksums.add(source.artifact_binding.checksum);
        }
      }
    }
  }
  return { sourceIds, processes, evidenceUris, artifactChecksums, artifactsAcquired };
}

function intersects(left, right) {
  return [...left].some((item) => right.has(item));
}

export function validateSignalRegistry(registry) {
  const ajv = new Ajv2020({ allErrors: true, strict: true });
  addFormats(ajv);
  const validateSchema = ajv.compile(DEFAULT_SCHEMA);
  const schemaValid = validateSchema(registry);
  const errors = (validateSchema.errors ?? []).map((item) => ({
    ...item,
    code: "SCHEMA_INVALID",
    path: item.instancePath,
    message: item.message ?? "schema validation failed",
  }));

  if (registry?.authority !== "none"
      || registry?.operational_effect !== false
      || (registry?.signals || []).some((signal) =>
        signal?.claim_permissions?.causal_claim !== false
        || signal?.claim_permissions?.individual_inference !== false
        || signal?.claim_permissions?.operational_effect !== false)) {
    errors.push(issue(
      "AUTHORITY_BOUNDARY_INVALID",
      "/authority",
      "signal registries cannot establish causality, individual inference or action authority",
    ));
  }

  if (!schemaValid) {
    return {
      machine_valid: false,
      schema_valid: false,
      integrity_valid: false,
      truth_determined: false,
      causality_determined: false,
      action_authority_determined: false,
      errors,
    };
  }

  errors.push(...duplicateIssues(registry.sources, "source_id", "sources"));
  errors.push(...duplicateIssues(registry.signals, "signal_id", "signals"));
  errors.push(...duplicateIssues(registry.portfolios, "condition_id", "portfolios"));
  errors.push(...duplicateIssues(registry.condition_bindings, "condition_id", "condition_bindings"));

  const sourceById = new Map(registry.sources.map((source) => [source.source_id, source]));
  const signalById = new Map(registry.signals.map((signal) => [signal.signal_id, signal]));
  const conditionById = new Map(registry.condition_bindings.map((binding) => [
    binding.condition_id,
    binding,
  ]));

  for (const [sourceIndex, source] of registry.sources.entries()) {
    for (const dependencyId of source.depends_on_source_ids) {
      if (!sourceById.has(dependencyId)) {
        errors.push(issue(
          "UNRESOLVED_SOURCE_DEPENDENCY",
          `/sources/${sourceIndex}/depends_on_source_ids`,
          `${dependencyId} does not resolve`,
        ));
      }
    }
    if (lineageClosure(source.source_id, sourceById).cycle) {
      errors.push(issue(
        "SOURCE_LINEAGE_CYCLE",
        `/sources/${sourceIndex}/depends_on_source_ids`,
        `${source.source_id} participates in a source-lineage cycle`,
      ));
    }
  }

  for (const [signalIndex, signal] of registry.signals.entries()) {
    for (const sourceRef of signal.source_refs) {
      if (!sourceById.has(sourceRef)) {
        errors.push(issue(
          "UNRESOLVED_SIGNAL_SOURCE",
          `/signals/${signalIndex}/source_refs`,
          `${sourceRef} does not resolve`,
        ));
      }
    }
    for (const [permission, permitted] of Object.entries(signal.claim_permissions)) {
      if (permitted) {
        errors.push(issue(
          "CLAIM_PERMISSION_FORBIDDEN",
          `/signals/${signalIndex}/claim_permissions/${permission}`,
          `a ${signal.status} signal cannot assert ${permission}`,
        ));
      }
    }
    if (signal.public_claim_ceiling !== renderPublicClaimCeiling(signal)) {
      errors.push(issue(
        "PUBLIC_CLAIM_CEILING_MISMATCH",
        `/signals/${signalIndex}/public_claim_ceiling`,
        "the public claim ceiling must be generated from typed epistemic and scope boundaries",
      ));
    }
    for (const [linkIndex, link] of signal.condition_links.entries()) {
      const expectedScope = {
        construct_id: signal.construct.construct_id,
        population: signal.estimand.population,
        geography: signal.estimand.geography,
        statistical_unit: signal.construct.statistical_unit,
        period: signal.estimand.period,
        unit: signal.estimand.unit,
        denominator: signal.estimand.denominator,
        aggregation_level: signal.estimand.aggregation_level,
      };
      if (!sameScope(link.scope, expectedScope)) {
        errors.push(issue(
          "ESTIMAND_SCOPE_MISMATCH",
          `/signals/${signalIndex}/condition_links/${linkIndex}/scope`,
          "the condition link must preserve the signal estimand population, geography and statistical unit",
        ));
      }
    }
  }

  for (const [portfolioIndex, portfolio] of registry.portfolios.entries()) {
    const conditionBinding = conditionById.get(portfolio.condition_id);
    if (!conditionBinding) {
      errors.push(issue(
        "UNRESOLVED_CONDITION_BINDING",
        `/portfolios/${portfolioIndex}/condition_id`,
        `${portfolio.condition_id} does not resolve to a declared condition binding`,
      ));
    } else if (conditionBinding.ledger_ref !== portfolio.ledger_ref) {
      errors.push(issue(
        "CONDITION_LEDGER_MISMATCH",
        `/portfolios/${portfolioIndex}/ledger_ref`,
        "portfolio and condition binding do not name the same evolution ledger",
      ));
    }
    if (portfolio.decision_context.use !== "research-only"
      && conditionBinding?.binding_status !== "locally-verified-complete") {
      errors.push(issue(
        "CONDITION_LEDGER_UNVERIFIED",
        `/portfolios/${portfolioIndex}/decision_context/use`,
        "decision use requires a locally verified complete condition-evolution ledger",
      ));
    }
    const declaredRoles = [
      ...portfolio.role_assignments.map(({ role }) => role),
      ...portfolio.unresolved_roles.map(({ role }) => role),
    ];
    const roleCounts = new Map(ROLES.map((role) => [
      role,
      declaredRoles.filter((candidate) => candidate === role).length,
    ]));
    if (declaredRoles.length !== ROLES.length
      || [...roleCounts.values()].some((count) => count !== 1)) {
      errors.push(issue(
        "ROLE_COVERAGE_INVALID",
        `/portfolios/${portfolioIndex}`,
        "each role must be assigned once or declared unresolved once",
      ));
    }

    if (portfolio.decision_context.use !== "research-only"
      && !portfolio.decision_context.owner_ref) {
      errors.push(issue(
        "DECISION_OWNER_REQUIRED",
        `/portfolios/${portfolioIndex}/decision_context/owner_ref`,
        "decision-linked use requires an external human or institutional owner reference",
      ));
    }

    const assignedByRole = new Map();
    const rolesBySignal = new Map();
    for (const [assignmentIndex, assignment] of portfolio.role_assignments.entries()) {
      const assignedSignals = [];
      for (const signalId of assignment.signal_ids) {
        const signal = signalById.get(signalId);
        if (!signal) {
          errors.push(issue(
            "UNRESOLVED_PORTFOLIO_SIGNAL",
            `/portfolios/${portfolioIndex}/role_assignments/${assignmentIndex}/signal_ids`,
            `${signalId} does not resolve`,
          ));
          continue;
        }
        assignedSignals.push(signal);
        const priorRoles = rolesBySignal.get(signalId) ?? new Set();
        priorRoles.add(assignment.role);
        rolesBySignal.set(signalId, priorRoles);
        if (["suspended", "retired"].includes(signal.status)) {
          errors.push(issue(
            "SIGNAL_STATUS_INELIGIBLE",
            `/portfolios/${portfolioIndex}/role_assignments/${assignmentIndex}/signal_ids`,
            `${signalId} is ${signal.status} and cannot fill an active portfolio role`,
          ));
        }
        const matchingLink = signal.condition_links.find((link) => (
          link.condition_id === portfolio.condition_id
          && link.ledger_ref === portfolio.ledger_ref
          && link.evidence_role === assignment.role
        ));
        if (!matchingLink) {
          errors.push(issue(
            "ROLE_LINK_MISMATCH",
            `/portfolios/${portfolioIndex}/role_assignments/${assignmentIndex}`,
            `${signalId} does not declare this condition, ledger and role`,
          ));
          continue;
        }
        if (!sameScope(matchingLink.scope, portfolio.scope)) {
          errors.push(issue(
            "CONDITION_SCOPE_MISMATCH",
            `/signals/${registry.signals.indexOf(signal)}/condition_links`,
            `${signalId} changes the portfolio population, geography or statistical unit`,
          ));
        }
        if (portfolio.decision_context.use !== "research-only"
          && assignment.role === "leading") {
          const lead = signal.timing.prospective_decision_lead_min_days;
          if (lead === null || lead < portfolio.decision_context.minimum_useful_lead_days) {
            errors.push(issue(
              "INSUFFICIENT_DECISION_LEAD",
              `/signals/${registry.signals.indexOf(signal)}/timing/prospective_decision_lead_min_days`,
              `${signalId} does not arrive early enough for the registered decision`,
            ));
          }
        }
      }
      assignedByRole.set(assignment.role, [
        ...(assignedByRole.get(assignment.role) ?? []),
        ...assignedSignals,
      ]);
    }
    for (const [signalId, roles] of rolesBySignal.entries()) {
      if (roles.size > 1) {
        errors.push(issue(
          "SIGNAL_ROLE_REUSE",
          `/portfolios/${portfolioIndex}/role_assignments`,
          `${signalId} is assigned across multiple evidence roles`,
        ));
      }
    }
    if (portfolio.public_disposition === "public-with-unknowns") {
      const assignedSignals = [...assignedByRole.values()].flat();
      const hasUnacquiredLineage = assignedSignals.some((signal) =>
        !sourceFamilies(signal, sourceById).artifactsAcquired);
      const hasIneligibleStatus = assignedSignals.some((signal) => signal.status !== "shadow");
      if (conditionBinding?.binding_status !== "locally-verified-complete"
        || hasUnacquiredLineage
        || hasIneligibleStatus) {
        errors.push(issue(
          "PUBLIC_DISPOSITION_UNVERIFIED",
          `/portfolios/${portfolioIndex}/public_disposition`,
          "public use requires a locally verified complete condition history, acquired source lineage and shadow-eligible signals",
        ));
      }
    }

    const leading = assignedByRole.get("leading") ?? [];
    const confirming = assignedByRole.get("confirming") ?? [];
    for (const leadSignal of leading) {
      const leadFamilies = sourceFamilies(leadSignal, sourceById);
      for (const confirmingSignal of confirming) {
        const confirmingFamilies = sourceFamilies(confirmingSignal, sourceById);
        if (!leadFamilies.artifactsAcquired || !confirmingFamilies.artifactsAcquired) {
          errors.push(issue(
            "CONFIRMATION_SOURCE_UNVERIFIED",
            `/portfolios/${portfolioIndex}/role_assignments`,
            "independent confirmation requires acquired bytes for every leading and confirming source lineage",
          ));
        }
        if (intersects(leadFamilies.sourceIds, confirmingFamilies.sourceIds)
          || intersects(leadFamilies.processes, confirmingFamilies.processes)
          || intersects(leadFamilies.evidenceUris, confirmingFamilies.evidenceUris)
          || intersects(leadFamilies.artifactChecksums, confirmingFamilies.artifactChecksums)) {
          errors.push(issue(
            "CONFIRMATION_NOT_INDEPENDENT",
            `/portfolios/${portfolioIndex}/role_assignments`,
            `${confirmingSignal.signal_id} shares source lineage or a collection process with ${leadSignal.signal_id}`,
          ));
        }
      }
    }
  }

  const integrityValid = errors.length === 0;
  return {
    machine_valid: schemaValid && integrityValid,
    schema_valid: schemaValid,
    integrity_valid: integrityValid,
    truth_determined: false,
    causality_determined: false,
    action_authority_determined: false,
    errors,
  };
}
