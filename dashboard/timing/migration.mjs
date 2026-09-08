import { createHash } from "node:crypto";

const WORLD_SCOPE = "Separately published WLD and OWID_WRL direct aggregates; coverage compatibility is unverified";
const DERIVED_DEPENDENCIES = {
  "engels-divergence": ["labour-share", "gdp-per-capita"],
  "transmission-gap": ["labour-share", "gdp-per-capita"],
};
const DERIVED_ASSESSMENT_BINDINGS = {
  "engels-divergence": { kind: "public_update_source_points" },
  "transmission-gap": {
    kind: "latest_point_inputs",
    inputs: [
      { signal_id: "labour-share", year_offset: -1, role: "comparator" },
      { signal_id: "gdp-per-capita", year_offset: -1, role: "comparator" },
      { signal_id: "labour-share", year_offset: 0, role: "endpoint" },
      { signal_id: "gdp-per-capita", year_offset: 0, role: "endpoint" },
    ],
  },
};

function clone(value) {
  return structuredClone(value);
}

function sha256(value) {
  return `sha256:${createHash("sha256").update(value).digest("hex")}`;
}

function exactUtc(value) {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/.test(value || "")) return false;
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) &&
    new Date(parsed).toISOString().replace(".000Z", "Z") === value;
}

function displayContract(signal) {
  return {
    id: signal.id,
    name: signal.name,
    family: signal.family,
    unit: signal.unit,
    precision: signal.precision,
    direction: signal.direction,
    question: signal.question,
    why_it_matters: signal.why_it_matters,
    trouble_reading: signal.trouble_reading,
    method: signal.method ?? null,
    caveats: signal.caveats ?? [],
    source: {
      name: signal.source?.name ?? null,
      url: signal.source?.url ?? null,
      note: signal.source?.note ?? null,
      adapter: signal.source?.adapter ?? null,
    },
  };
}

function migratedRule(signalId, signalPolicy, legacyMaximumYears) {
  if (DERIVED_DEPENDENCIES[signalId]) {
    return {
      kind: "derived",
      derivation_id: "world-aggregate-transmission-v1",
      inherits_from_signal_ids: DERIVED_DEPENDENCIES[signalId],
      assessment_binding: DERIVED_ASSESSMENT_BINDINGS[signalId],
    };
  }
  if (!signalPolicy?.source_url) return { kind: "not_applicable" };
  return {
    kind: "external_dataset",
    reference_period_kind: "calendar_year",
    max_reference_lag_days: Number.isInteger(legacyMaximumYears)
      ? legacyMaximumYears * 366
      : 366,
    release_cadence: {
      kind: "unknown",
      reason: "No authenticated release schedule is pinned in this policy revision.",
    },
  };
}

export function migratePolicy18(legacyPolicy, { signals = [] } = {}) {
  const migrated = clone(legacyPolicy);
  const legacyLimits = migrated.freshness_policy?.signal_max_age_years || {};
  migrated.policy_version = "2.0.0";
  migrated.freshness_policy = {
    basis: "exact_selected_lineage",
    assessment_semantics: "Reference coverage, publisher release, retrieval, byte acquisition and snapshot revision are separate clocks. Unknown clocks remain unknown.",
    signal_rules: Object.fromEntries(Object.entries(migrated.signals || {}).map(
      ([signalId, signalPolicy]) => [
        signalId,
        migratedRule(signalId, signalPolicy, legacyLimits[signalId]),
      ],
    )),
  };
  migrated.public_update_contract.population = WORLD_SCOPE;
  const signalById = new Map(signals.map((signal) => [signal.id, signal]));
  for (const [id, policySignal] of Object.entries(migrated.signals || {})) {
    const signal = signalById.get(id);
    if (signal) policySignal.display_contract_sha256 = sha256(JSON.stringify(displayContract(signal)));
  }
  return migrated;
}

function migrateEpistemicRules(signal, snapshotId) {
  for (const rule of signal.source?.adapter?.epistemic_rules || []) {
    rule.source_vintage = `Publisher vintage unknown; inherited from frozen snapshot revision ${snapshotId}.`;
  }
}

function assessmentLineage(signal, snapshot) {
  if (signal.id === "engels-divergence") {
    return snapshot.public_update.lineage.source_points.map(({ signal_id, entity, year, role }) => ({
      signal_id,
      entity,
      year,
      role,
    }));
  }
  const latest = signal.latest;
  if (!latest) throw new Error(`derived signal ${signal.id} has no registered assessment lineage target`);
  return DERIVED_ASSESSMENT_BINDINGS[signal.id].inputs.map((input) => ({
    signal_id: input.signal_id,
    entity: latest.entity,
    year: latest.year + input.year_offset,
    role: input.role,
    ...(input.measure === undefined ? {} : { measure: input.measure }),
  }));
}

function migrateSignal(signal, snapshot) {
  migrateEpistemicRules(signal, snapshot.snapshot_id);
  if (signal.status === "not_measured") {
    delete signal.source.retrieved;
    delete signal.source.raw_input_ids;
    signal.source.timing = {
      kind: "instrument_gap",
      assessed_at: {
        kind: "unknown",
        reason: "The legacy snapshot retained no dated, governed instrument search artifact.",
      },
    };
    return;
  }
  if (DERIVED_DEPENDENCIES[signal.id]) {
    delete signal.source.retrieved;
    signal.source.timing = {
      kind: "derived",
      derivation_id: "world-aggregate-transmission-v1",
      computation: {
        kind: "unknown",
        reason: "The migration copied frozen derived values and retained no truthful computation instant.",
      },
      inherits_from_signal_ids: DERIVED_DEPENDENCIES[signal.id],
      assessment_lineage: assessmentLineage(signal, snapshot),
    };
    return;
  }
  const retrieved = signal.source.retrieved;
  signal.source.timing = {
    kind: "external_dataset",
    publisher_vintage: {
      status: "unknown",
      reason: "The legacy snapshot retained no adapter-verified publisher edition identifier.",
    },
    publisher_release: {
      kind: "unknown",
      reason: "The legacy snapshot retained no adapter-verified release metadata or bounded availability observation.",
    },
    retrieval: retrieved
      ? {
          kind: "calendar_date",
          on: retrieved,
          timezone: "UTC",
          basis: "legacy_generator_record",
        }
      : {
          kind: "unknown",
          reason: "The legacy snapshot retained no retrieval clock.",
        },
  };
}

export function migrateSnapshot18(legacySnapshot, {
  recordId,
  predecessorRecordId,
  predecessorDigest,
  policyDigest,
  revisionAt,
}) {
  const recordMatch = /^(\d{4}-\d{2}-\d{2})\.r([1-9][0-9]*)$/.exec(recordId || "");
  const predecessorMatch = /^(\d{4}-\d{2}-\d{2})\.r([1-9][0-9]*)$/.exec(predecessorRecordId || "");
  if (!recordMatch) {
    throw new Error("recordId must use YYYY-MM-DD.rN");
  }
  if (!predecessorMatch) {
    throw new Error("predecessorRecordId must use YYYY-MM-DD.rN");
  }
  if (recordMatch[1] !== legacySnapshot.snapshot_id) {
    throw new Error("recordId date must equal the snapshot evidence date");
  }
  if (predecessorMatch[1] > recordMatch[1] ||
      (predecessorMatch[1] === recordMatch[1] && Number(predecessorMatch[2]) >= Number(recordMatch[2]))) {
    throw new Error("predecessor record must be strictly earlier than the new record");
  }
  if (!/^sha256:[a-f0-9]{64}$/.test(predecessorDigest || "") ||
      !/^sha256:[a-f0-9]{64}$/.test(policyDigest || "")) {
    throw new Error("predecessor and policy digests must be SHA-256 identifiers");
  }
  if (!exactUtc(revisionAt) || !exactUtc(legacySnapshot.generated_at) ||
      Date.parse(revisionAt) <= Date.parse(legacySnapshot.generated_at) ||
      Date.parse(revisionAt) < Date.parse(legacySnapshot.as_of)) {
    throw new Error("revisionAt must be an exact UTC instant after the predecessor generation time and no earlier than the evidence cut-off");
  }
  const migrated = clone(legacySnapshot);
  if ((migrated.reproducibility?.raw_inputs || []).some((input) => !input.acquired_at)) {
    throw new Error("legacy raw inputs without an acquisition instant require a governed reconstruction, not migration");
  }
  migrated.schema_version = "2.0.0";
  migrated.record_id = recordId;
  migrated.generated_at = revisionAt;
  migrated.generator = "migrateSnapshot18@1.0.0";
  migrated.evidence_policy.version = "2.0.0";
  migrated.evidence_policy.sha256 = policyDigest;
  migrated.reproducibility.availability_receipts = [];
  migrated.notes = "Same-day timing-contract correction. Source values are unchanged. Publisher vintage and release remain unknown where the frozen predecessor retained no verified timing metadata.";
  migrated.correction = {
    ...migrated.correction,
    issued_on: revisionAt.slice(0, 10),
    supersedes_record_id: predecessorRecordId,
    supersedes_snapshot_id: migrated.snapshot_id,
    supersedes_snapshot_sha256: predecessorDigest,
    summary: "Separates reference period, publisher vintage, publisher release, retrieval, byte acquisition and snapshot revision without changing source values.",
    changes: [
      "Introduce a same-day record identity so the frozen predecessor remains addressable.",
      "Represent publisher vintage and release as unknown unless adapter-verified evidence exists.",
      "Separate external retrieval, derived computation and instrument-gap assessment clocks.",
      "Correct the World population description to disclose incompatible direct aggregate identifiers.",
    ],
    changed_fields: [],
    source_values_changed: false,
  };
  migrated.public_update.update_id = `world-aggregate-transmission-${recordId}`;
  migrated.public_update.scope.population = WORLD_SCOPE;
  migrated.public_update.observed.record_id = recordId;
  delete migrated.public_update.observed.snapshot_revision;
  delete migrated.public_update.observed.vintage;
  for (const point of [
    ...migrated.public_update.lineage.source_points,
    ...migrated.public_update.lineage.derived_points,
  ]) {
    point.role = point.year === migrated.public_update.lineage.from_year &&
        point.year !== migrated.public_update.lineage.through_year
      ? "baseline"
      : "endpoint";
  }
  for (const signal of migrated.signals) migrateSignal(signal, migrated);
  migrated.correction.changed_fields = [...new Set([
    ...Object.keys(legacySnapshot),
    ...Object.keys(migrated),
  ])].filter((field) => field !== "correction" &&
    JSON.stringify(legacySnapshot[field]) !== JSON.stringify(migrated[field])).sort();
  return migrated;
}
