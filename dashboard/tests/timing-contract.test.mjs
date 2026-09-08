import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import Ajv2020 from "ajv/dist/2020.js";
import addFormats from "ajv-formats";

import {
  assessPointTiming,
  assessTimingGraph,
  compareRecordIds,
  extractTimingMetadata,
  validateRawInputTiming,
  validateSourceTiming,
  validateTimingRule,
  validateTimingGraph,
} from "../timing/validation.mjs";
import { migratePolicy18, migrateSnapshot18 } from "../timing/migration.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const schema = JSON.parse(readFileSync(
  resolve(here, "../schema/source-timing.schema.json"),
  "utf8",
));
const ajv = new Ajv2020({ allErrors: true, strict: true });
addFormats(ajv);
const validateSchema = ajv.compile(schema);
const clone = (value) => structuredClone(value);
const legacySnapshotPath = resolve(here, "../snapshots/2026-09-08.json");
const legacyPolicyPath = resolve(here, "../evidence/archive/adapter-classification-policy-1.2.json");

const asOf = "2026-09-08T00:41:31Z";
const generatedAt = "2026-09-08T01:00:00Z";
const external = {
  kind: "external_dataset",
  publisher_vintage: {
    status: "unknown",
    reason: "No publisher edition identifier was retained.",
  },
  publisher_release: {
    kind: "unknown",
    reason: "No release time or bounded availability observation was retained.",
  },
  retrieval: {
    kind: "calendar_date",
    on: "2026-09-07",
    timezone: "UTC",
    basis: "legacy_generator_record",
  },
};

const rawInputId = `sha256:${"a".repeat(64)}`;
const rawInput = {
  id: rawInputId,
  retrieved_at: "2026-09-07T12:00:00Z",
  acquired_at: "2026-09-07T12:00:01Z",
  adapter: {
    id: "test-metadata",
    version: "1.0.0",
    timing_fields: [
      { claim: "publisher_vintage", field_pointer: "/edition" },
      { claim: "publisher_release", field_pointer: "/release_at" },
      { claim: "publisher_release", field_pointer: "/release_date" },
    ],
  },
};
const annualRule = {
  kind: "external_dataset",
  reference_period_kind: "calendar_year",
  max_reference_lag_days: 366,
  release_cadence: { kind: "unknown", reason: "No pinned schedule." },
};

test("same-day record revisions use numeric rather than lexical order", () => {
  assert.equal(compareRecordIds("2026-09-08.r2", "2026-09-08.r10"), -1);
  assert.equal(compareRecordIds("2026-09-08.r10", "2026-09-08.r2"), 1);
  assert.equal(compareRecordIds("2026-09-08.r2", "2026-09-08.r2"), 0);
  assert.throws(() => compareRecordIds("2026-09-08", "2026-09-08.r2"));
});
function derivedTiming(ids, {
  computation = { kind: "unknown", reason: "No retained execution artifact." },
  years = {},
  roles = {},
} = {}) {
  return {
    kind: "derived",
    derivation_id: "test-derived-v1",
    computation,
    inherits_from_signal_ids: ids,
    assessment_lineage: ids.map((signalId) => ({
      signal_id: signalId,
      entity: "OWID_WRL",
      year: years[signalId] ?? 2025,
      role: roles[signalId] ?? "endpoint",
    })),
  };
}

test("source timing schema separates external, derived and instrument-gap clocks", () => {
  assert.equal(validateSchema(external), true, ajv.errorsText(validateSchema.errors));
  assert.equal(validateSchema({
    ...derivedTiming(["gdp-per-capita", "labour-share"]),
  }), true, ajv.errorsText(validateSchema.errors));
  const unclassifiedLineage = derivedTiming(["gdp-per-capita"]);
  delete unclassifiedLineage.assessment_lineage[0].role;
  assert.equal(validateSchema(unclassifiedLineage), false);
  assert.equal(validateSchema({
    kind: "instrument_gap",
    assessed_at: {
      kind: "unknown",
      reason: "No dated search artifact was retained.",
    },
  }), true, ajv.errorsText(validateSchema.errors));

  const gapWithRetrieval = {
    kind: "instrument_gap",
    assessed_at: { kind: "unknown", reason: "Unknown." },
    retrieval: external.retrieval,
  };
  assert.equal(validateSchema(gapWithRetrieval), false);
});

test("unknown publisher cadence never manufactures release recency", () => {
  const sourceResult = validateSourceTiming({
    timing: external,
    asOf,
    generatedAt,
    rawInputIds: [],
  });
  assert.deepEqual(sourceResult, { valid: true, errors: [] });
  const assessment = assessPointTiming({
    point: { year: 2025, epistemic_class: "published_statistic" },
    timing: external,
    rule: annualRule,
    asOf,
  });
  assert.equal(assessment.reference_coverage, "within_policy_window");
  assert.equal(assessment.publisher_vintage, "unknown");
  assert.equal(assessment.release_recency, "unknown");
  assert.equal(assessment.retrieval_recency, "reported_before_cutoff_unverified");
});

test("internal event clocks remain unknown until execution artifacts are governed", () => {
  const nakedDerived = derivedTiming(["source"], {
    computation: { kind: "exact", at: generatedAt },
  });
  assert.equal(validateSchema(nakedDerived), false);
  assert.ok(validateSourceTiming({
    timing: nakedDerived,
    asOf,
    generatedAt,
  }).errors.some(({ code }) => code === "INTERNAL_EVENT_PROVENANCE_UNIMPLEMENTED"));

  const nakedGap = {
    kind: "instrument_gap",
    assessed_at: { kind: "exact", at: generatedAt },
  };
  assert.equal(validateSchema(nakedGap), false);
  assert.ok(validateSourceTiming({
    timing: nakedGap,
    asOf,
    generatedAt,
  }).errors.some(({ code }) => code === "INTERNAL_EVENT_PROVENANCE_UNIMPLEMENTED"));
});

test("same-day date precision cannot prove intra-day order", () => {
  const sameDay = clone(external);
  sameDay.publisher_release = {
    kind: "publisher_declared_date",
    on: "2026-09-07",
    timezone: "UTC",
    evidence: {
      kind: "adapter_extraction",
      raw_input_id: rawInputId,
      adapter_id: "test-metadata",
      adapter_version: "1.0.0",
      field_pointer: "/release_date",
    },
  };
  sameDay.retrieval.on = "2026-09-07";
  const result = validateSourceTiming({
    timing: sameDay,
    asOf,
    generatedAt,
    rawInputs: [rawInput],
    extractedMetadata: [{
      raw_input_id: rawInputId,
      adapter_id: "test-metadata",
      adapter_version: "1.0.0",
      field_pointer: "/release_date",
      value: "2026-09-07",
    }],
  });
  assert.equal(result.valid, true);
  assert.ok(result.errors.every(({ code }) => code !== "RELEASE_AFTER_RETRIEVAL"));
  const assessment = assessPointTiming({
    point: { year: 2025, epistemic_class: "published_statistic" },
    timing: sameDay,
    rule: {
      reference_period_kind: "calendar_year",
      max_reference_lag_days: 366,
      release_cadence: { kind: "unknown", reason: "No pinned schedule." },
    },
    asOf,
  });
  assert.equal(assessment.availability_order, "unknown_same_day_precision");
});

test("exact release, retrieval and acquisition chronology fails closed", () => {
  const impossible = clone(external);
  impossible.publisher_release = {
    kind: "publisher_declared_instant",
    at: "2026-09-07T12:00:00Z",
    evidence: {
      kind: "adapter_extraction",
      raw_input_id: rawInputId,
      adapter_id: "test-metadata",
      adapter_version: "1.0.0",
      field_pointer: "/release_at",
    },
  };
  impossible.retrieval = {
    kind: "exact",
    at: "2026-09-07T11:00:00Z",
    raw_input_id: rawInputId,
  };
  assert.ok(validateSourceTiming({
    timing: impossible,
    asOf,
    generatedAt,
    rawInputs: [{ ...rawInput, retrieved_at: "2026-09-07T11:00:00Z" }],
    extractedMetadata: [{
      raw_input_id: rawInputId,
      adapter_id: "test-metadata",
      adapter_version: "1.0.0",
      field_pointer: "/release_at",
      value: "2026-09-07T12:00:00Z",
    }],
  }).errors.some(({ code }) => code === "RELEASE_AFTER_RETRIEVAL"));

  const equalResolution = clone(impossible);
  equalResolution.publisher_release.at = equalResolution.retrieval.at;
  assert.equal(validateSourceTiming({
    timing: equalResolution,
    asOf,
    generatedAt,
    rawInputs: [{ ...rawInput, retrieved_at: equalResolution.retrieval.at }],
    extractedMetadata: [{
      raw_input_id: rawInputId,
      adapter_id: "test-metadata",
      adapter_version: "1.0.0",
      field_pointer: "/release_at",
      value: equalResolution.publisher_release.at,
    }],
  }).valid, true, "equal-second events remain possible at the declared resolution");

  const reversedAvailability = clone(external);
  reversedAvailability.publisher_release = {
    kind: "observed_availability",
    not_seen: {
      at: "2026-09-07T12:00:00Z",
      absence_receipt_ids: [`sha256:${"b".repeat(64)}`],
    },
    first_seen: {
      at: "2026-09-07T11:59:59Z",
      evidence_raw_input_ids: [rawInputId],
    },
  };
  assert.ok(validateSourceTiming({
    timing: reversedAvailability,
    asOf,
    generatedAt,
    rawInputs: [rawInput],
    availabilityReceipts: [{
      id: `sha256:${"b".repeat(64)}`,
      kind: "absence_receipt",
      observed_at: "2026-09-07T12:00:00Z",
    }],
  }).errors.some(({ code }) => code === "AVAILABILITY_INTERVAL_INVALID"));

  const future = clone(external);
  future.retrieval = { kind: "exact", at: "2026-09-08T00:41:32Z", raw_input_id: rawInputId };
  assert.ok(validateSourceTiming({
    timing: future,
    asOf,
    generatedAt,
    rawInputs: [{ ...rawInput, retrieved_at: "2026-09-08T00:41:32Z", acquired_at: "2026-09-08T00:41:32Z" }],
  }).errors.some(({ code }) => code === "RETRIEVAL_AFTER_EVIDENCE_CUTOFF"));

  assert.deepEqual(validateRawInputTiming(rawInput, asOf), { valid: true, errors: [] });
  const beforeRetrieval = clone(rawInput);
  beforeRetrieval.acquired_at = "2026-09-07T11:59:59Z";
  assert.ok(validateRawInputTiming(beforeRetrieval, asOf).errors.some(
    ({ code }) => code === "ACQUISITION_BEFORE_RETRIEVAL",
  ));
  const afterCutoff = clone(rawInput);
  afterCutoff.acquired_at = "2026-09-08T00:41:32Z";
  assert.ok(validateRawInputTiming(afterCutoff, asOf).errors.some(
    ({ code }) => code === "ACQUISITION_AFTER_EVIDENCE_CUTOFF",
  ));
});

test("known publisher vintage requires source-byte evidence", () => {
  const known = clone(external);
  known.publisher_vintage = {
    status: "known",
    id: "2026-Q3-release-1",
    evidence: {
      kind: "adapter_extraction",
      raw_input_id: rawInputId,
      adapter_id: "test-metadata",
      adapter_version: "1.0.0",
      field_pointer: "/edition",
    },
};
  assert.ok(validateSourceTiming({
    timing: known,
    asOf,
    generatedAt,
    rawInputs: [rawInput],
    extractedMetadata: [],
  }).errors.some(({ code }) => code === "TIMING_METADATA_UNVERIFIED"));
});

test("publisher timing metadata is recomputed from retained response bytes", () => {
  const retained = {
    ...rawInput,
    media_type: "application/json",
  };
  const extracted = extractTimingMetadata(
    retained,
    Buffer.from(JSON.stringify({ edition: "2026-Q3-release-1", release_at: "2026-09-07T12:00:00Z" })),
  );
  assert.deepEqual(extracted.map(({ field_pointer, value }) => ({ field_pointer, value })), [
    { field_pointer: "/edition", value: "2026-Q3-release-1" },
    { field_pointer: "/release_at", value: "2026-09-07T12:00:00Z" },
  ]);

  const known = clone(external);
  known.publisher_vintage = {
    status: "known",
    id: "2026-Q3-release-1",
    evidence: {
      kind: "adapter_extraction",
      raw_input_id: rawInputId,
      adapter_id: "test-metadata",
      adapter_version: "1.0.0",
      field_pointer: "/edition",
    },
  };
  known.publisher_release = {
    kind: "publisher_declared_instant",
    at: "2026-09-07T12:00:00Z",
    evidence: {
      kind: "adapter_extraction",
      raw_input_id: rawInputId,
      adapter_id: "test-metadata",
      adapter_version: "1.0.0",
      field_pointer: "/release_at",
    },
  };
  assert.equal(validateSourceTiming({
    timing: known,
    asOf,
    generatedAt,
    rawInputs: [retained],
    extractedMetadata: extracted,
  }).valid, true);
  assert.throws(
    () => extractTimingMetadata({ ...retained, media_type: "text/csv" }, Buffer.from("edition\nforged")),
    /JSON response bytes/i,
  );
});

test("an exact derived computation fails when dependency readiness is unknown", () => {
  const unknown = clone(external);
  unknown.retrieval = { kind: "unknown", reason: "No retrieval clock was retained." };
  const signals = [{
    id: "source",
    status: "available",
    series: [{ entity: "OWID_WRL", points: [[2025, 1, "published_statistic"]] }],
    source: { timing: unknown },
  }, {
    id: "derived",
    status: "available",
    latest: { entity: "OWID_WRL", year: 2025, epistemic_class: "derived" },
    source: { timing: derivedTiming(["source"], {
      computation: { kind: "exact", at: generatedAt },
    }) },
  }];
  assert.ok(validateTimingGraph(signals, {
    asOf,
    generatedAt,
    rules: {
      source: annualRule,
      derived: {
        kind: "derived",
        derivation_id: "test-derived-v1",
        inherits_from_signal_ids: ["source"],
        assessment_binding: {
          kind: "latest_point_inputs",
          inputs: [{ signal_id: "source", year_offset: 0, role: "endpoint" }],
        },
      },
    },
  }).errors.some(({ code }) => code === "DERIVATION_DEPENDENCY_READINESS_UNKNOWN"));
});

test("derived timing inherits declared sources without cycles", () => {
  const sources = [{
    id: "gdp", status: "available",
    series: [{ entity: "OWID_WRL", points: [[2025, 1, "published_statistic"]] }],
    source: { timing: external },
  }, {
    id: "labour", status: "available",
    series: [{ entity: "OWID_WRL", points: [[2025, 1, "modelled_estimate"]] }],
    source: { timing: external },
  }, {
    id: "derived", status: "available",
    source: {
      timing: derivedTiming(["gdp", "labour"]),
    },
  }];
  assert.deepEqual(validateTimingGraph(sources, { asOf, generatedAt, rawInputs: [] }), {
    valid: true,
    errors: [],
  });

  const missing = clone(sources);
  missing[2].source.timing.inherits_from_signal_ids.push("invented");
  assert.ok(validateTimingGraph(missing, { asOf, generatedAt }).errors.some(
    ({ code }) => code === "DERIVED_TIMING_SOURCE_UNKNOWN",
  ));

  const cycle = clone(sources);
  cycle[0].source.timing = derivedTiming(["derived"]);
  assert.ok(validateTimingGraph(cycle, { asOf, generatedAt }).errors.some(
    ({ code }) => code === "DERIVED_TIMING_CYCLE",
  ));
});

test("future releases and instrument-gap assessments cannot cross the evidence cut-off", () => {
  const futureRelease = clone(external);
  futureRelease.publisher_release = {
    kind: "publisher_declared_instant",
    at: "2099-01-01T00:00:00Z",
    evidence: {
      kind: "adapter_extraction",
      raw_input_id: rawInputId,
      adapter_id: "test-metadata",
      adapter_version: "1.0.0",
      field_pointer: "/release_at",
    },
  };
  futureRelease.retrieval = { kind: "unknown", reason: "Not retained." };
  assert.ok(validateSourceTiming({
    timing: futureRelease,
    asOf,
    generatedAt,
    rawInputs: [rawInput],
    extractedMetadata: [{
      raw_input_id: rawInputId,
      adapter_id: "test-metadata",
      adapter_version: "1.0.0",
      field_pointer: "/release_at",
      value: "2099-01-01T00:00:00Z",
    }],
  }).errors.some(({ code }) => code === "RELEASE_AFTER_EVIDENCE_CUTOFF"));

  assert.ok(validateSourceTiming({
    timing: {
      kind: "instrument_gap",
      assessed_at: { kind: "exact", at: "2099-01-01T00:00:00Z" },
    },
    asOf,
    generatedAt,
  }).errors.some(({ code }) => code === "ASSESSMENT_AFTER_EVIDENCE_CUTOFF"));
});

test("metadata claims require a matching verified adapter extraction", () => {
  const known = clone(external);
  known.publisher_vintage = {
    status: "known",
    id: "invented-edition",
    evidence: {
      kind: "adapter_extraction",
      raw_input_id: rawInputId,
      adapter_id: "test-metadata",
      adapter_version: "1.0.0",
      field_pointer: "/edition",
    },
  };
  assert.ok(validateSourceTiming({
    timing: known,
    asOf,
    generatedAt,
    rawInputs: [rawInput],
    extractedMetadata: [{
      raw_input_id: rawInputId,
      adapter_id: "test-metadata",
      adapter_version: "1.0.0",
      field_pointer: "/edition",
      value: "real-edition",
    }],
  }).errors.some(({ code }) => code === "TIMING_METADATA_MISMATCH"));
});

test("exact retrieval is bound to the selected retained response", () => {
  const timing = clone(external);
  timing.retrieval = {
    kind: "exact",
    at: "2026-09-07T12:00:02Z",
    raw_input_id: rawInputId,
  };
  const result = validateSourceTiming({ timing, asOf, generatedAt, rawInputs: [rawInput] });
  assert.ok(result.errors.some(({ code }) => code === "SOURCE_RETRIEVAL_MISMATCH"));
});

test("availability bounds require distinct presence and absence evidence roles", () => {
  const timing = clone(external);
  timing.publisher_release = {
    kind: "observed_availability",
    not_seen: {
      at: "2026-09-06T12:00:00Z",
      absence_receipt_ids: [rawInputId],
    },
    first_seen: {
      at: "2026-09-07T12:00:00Z",
      evidence_raw_input_ids: [rawInputId],
    },
  };
  const result = validateSourceTiming({ timing, asOf, generatedAt, rawInputs: [rawInput] });
  assert.ok(result.errors.some(({ code }) => code === "AVAILABILITY_ABSENCE_EVIDENCE_UNRESOLVED"));
});

test("derived clocks separate comparator age from endpoint currentness", () => {
  const stale = clone(external);
  stale.publisher_release = { kind: "unknown", reason: "Not retained." };
  const signals = [{
    id: "gdp",
    status: "available",
    latest: { year: 2024, epistemic_class: "published_statistic" },
    series: [{ entity: "OWID_WRL", points: [[2024, 1, "published_statistic"]] }],
    source: { timing: stale },
  }, {
    id: "labour",
    status: "available",
    latest: { year: 2025, epistemic_class: "modelled_estimate" },
    series: [{ entity: "OWID_WRL", points: [[2025, 1, "modelled_estimate"]] }],
    source: { timing: external },
  }, {
    id: "derived",
    status: "available",
    latest: { year: 2025, epistemic_class: "derived" },
    source: {
      timing: derivedTiming(["gdp", "labour"], {
        years: { gdp: 2024, labour: 2025 },
        roles: { gdp: "comparator", labour: "endpoint" },
      }),
    },
  }];
  const rules = {
    gdp: annualRule,
    labour: annualRule,
    derived: {
      kind: "derived",
      derivation_id: "test-derived-v1",
      inherits_from_signal_ids: ["gdp", "labour"],
      assessment_binding: {
        kind: "latest_point_inputs",
        inputs: [
          { signal_id: "gdp", year_offset: -1, role: "comparator" },
          { signal_id: "labour", year_offset: 0, role: "endpoint" },
        ],
      },
    },
  };
  const assessments = assessTimingGraph(signals, {
    asOf,
    rules,
  });
  assert.equal(assessments.derived.reference_coverage, "within_policy_window");
  assert.equal(assessments.derived.endpoint_coverage, "within_policy_window");
  assert.equal(assessments.derived.comparator_coverage, "outside_policy_window");
  assert.equal(assessments.derived.publisher_vintage, "unknown");
  assert.equal(assessments.derived.release_recency, "unknown");
  assert.deepEqual(assessments.derived.inherited_from_signal_ids, ["gdp", "labour"]);
  assert.deepEqual(
    assessments.derived.assessment_binding,
    rules.derived.assessment_binding,
  );
  const pointAssessment = assessments.derived.point_assessments[0];
  assert.deepEqual(pointAssessment.reference_span, { from_year: 2024, through_year: 2025 });
  assert.equal(pointAssessment.assessment_lineage.length, 2);
  assert.deepEqual(
    new Set(pointAssessment.assessment_lineage.map(({ role }) => role)),
    new Set(["comparator", "endpoint"]),
  );
  assert.equal(pointAssessment.computation.kind, "unknown");
  assert.equal(pointAssessment.lineage_completeness, "complete");
});

test("derived timing preserves exact source clocks and vintage alignment by role", () => {
  const source = (id, vintageId) => {
    const timing = clone(external);
    timing.publisher_vintage = {
      status: "known",
      id: vintageId,
      evidence: {
        kind: "adapter_extraction",
        raw_input_id: rawInputId,
        adapter_id: "test-metadata",
        adapter_version: "1.0.0",
        field_pointer: "/edition",
      },
    };
    return {
      id,
      status: "available",
      latest: { entity: "OWID_WRL", year: 2025, epistemic_class: "published_statistic" },
      series: [{ entity: "OWID_WRL", points: [[2025, 1, "published_statistic"]] }],
      source: { timing },
    };
  };
  const derived = {
    id: "derived",
    status: "available",
    latest: { entity: "OWID_WRL", year: 2025, epistemic_class: "derived" },
    series: [{ entity: "OWID_WRL", points: [[2025, 1, "derived"]] }],
    source: { timing: derivedTiming(["a", "b"]) },
  };
  const rules = {
    a: annualRule,
    b: annualRule,
    derived: {
      kind: "derived",
      derivation_id: "test-derived-v1",
      inherits_from_signal_ids: ["a", "b"],
      assessment_binding: {
        kind: "latest_point_inputs",
        inputs: [
          { signal_id: "a", year_offset: 0, role: "endpoint" },
          { signal_id: "b", year_offset: 0, role: "endpoint" },
        ],
      },
    },
  };
  const assessment = assessTimingGraph([
    source("a", "edition-a"), source("b", "edition-b"), derived,
  ], { asOf, rules }).derived;
  assert.equal(assessment.vintage_alignment, "mixed");
  assert.deepEqual(
    assessment.role_assessments.endpoint.map(({ publisher_vintage }) => publisher_vintage.id).sort(),
    ["edition-a", "edition-b"],
  );
  assert.ok(assessment.role_assessments.endpoint.every(
    ({ publisher_release, retrieval }) => publisher_release.kind && retrieval.kind,
  ));
});

test("assessment execution, structural closure and evidence readiness remain separate", () => {
  const source = {
    id: "source",
    status: "available",
    latest: { entity: "OWID_WRL", year: 2026, epistemic_class: "published_statistic" },
    series: [{ entity: "OWID_WRL", points: [[2026, 1, "published_statistic"]] }],
    source: { timing: external },
  };
  const derived = {
    id: "derived",
    status: "available",
    latest: { entity: "OWID_WRL", year: 2026, epistemic_class: "derived" },
    series: [{ entity: "OWID_WRL", points: [[2026, 1, "derived"]] }],
    source: { timing: derivedTiming(["source"], { years: { source: 2026 } }) },
  };
  const assessment = assessTimingGraph([source, derived], {
    asOf,
    rules: {
      source: annualRule,
      derived: {
        kind: "derived",
        derivation_id: "test-derived-v1",
        inherits_from_signal_ids: ["source"],
        assessment_binding: {
          kind: "latest_point_inputs",
          inputs: [{ signal_id: "source", year_offset: 0, role: "endpoint" }],
        },
      },
    },
  }).derived;
  assert.equal(assessment.assessment_execution, "completed");
  assert.equal(assessment.structural_lineage, "complete");
  assert.equal(assessment.evidence_readiness, "invalid");
  assert.equal(assessment.publication_eligibility, "ineligible");
});

test("unknown cadence and computation clocks cannot become timing-ready", () => {
  const timing = clone(external);
  timing.publisher_vintage = {
    status: "known",
    id: "edition-a",
    evidence: {
      kind: "adapter_extraction",
      raw_input_id: rawInputId,
      adapter_id: "test-metadata",
      adapter_version: "1.0.0",
      field_pointer: "/edition",
    },
  };
  timing.publisher_release = {
    kind: "publisher_declared_instant",
    at: "2026-09-07T11:00:00Z",
    evidence: {
      kind: "adapter_extraction",
      raw_input_id: rawInputId,
      adapter_id: "test-metadata",
      adapter_version: "1.0.0",
      field_pointer: "/release_at",
    },
  };
  timing.retrieval = { kind: "exact", at: rawInput.retrieved_at, raw_input_id: rawInputId };
  const source = {
    id: "source",
    status: "available",
    latest: { entity: "OWID_WRL", year: 2025, epistemic_class: "published_statistic" },
    series: [{ entity: "OWID_WRL", points: [[2025, 1, "published_statistic"]] }],
    source: { timing, raw_input_ids: [rawInputId] },
  };
  const sourceAssessment = assessTimingGraph([source], {
    asOf,
    rawInputs: [rawInput],
    rules: { source: annualRule },
  }).source;
  assert.equal(sourceAssessment.evidence_readiness, "unknown");

  const derived = {
    id: "derived",
    status: "available",
    latest: { entity: "OWID_WRL", year: 2025, epistemic_class: "derived" },
    series: [{ entity: "OWID_WRL", points: [[2025, 1, "derived"]] }],
    source: { timing: derivedTiming(["source"]) },
  };
  const derivedAssessment = assessTimingGraph([source, derived], {
    asOf,
    rawInputs: [rawInput],
    rules: {
      source: { ...annualRule, release_cadence: {
        kind: "maximum_interval", maximum_interval_days: 10, grace_days: 0,
      } },
      derived: {
        kind: "derived",
        derivation_id: "test-derived-v1",
        inherits_from_signal_ids: ["source"],
        assessment_binding: {
          kind: "latest_point_inputs",
          inputs: [{ signal_id: "source", year_offset: 0, role: "endpoint" }],
        },
      },
    },
  }).derived;
  assert.equal(derivedAssessment.input_timing_readiness, "ready");
  assert.equal(derivedAssessment.evidence_readiness, "unknown");
});

test("derived chronology and dependency eligibility fail closed", () => {
  const source = clone(external);
  source.retrieval = { kind: "exact", at: "2026-09-07T12:00:00Z", raw_input_id: rawInputId };
  const signals = [{
    id: "source",
    status: "available",
    series: [{ entity: "OWID_WRL", points: [[2025, 1, "published_statistic"]] }],
    source: { timing: source, raw_input_ids: [rawInputId] },
  }, {
    id: "derived",
    status: "available",
    source: {
      timing: derivedTiming(["source"], {
        computation: {
          kind: "exact",
          at: "2026-09-07T11:59:59Z",
        },
      }),
    },
  }];
  const early = validateTimingGraph(signals, { asOf, generatedAt, rawInputs: [rawInput] });
  assert.ok(early.errors.some(({ code }) => code === "DERIVATION_BEFORE_DEPENDENCY"));

  signals[0] = {
    id: "source",
    status: "not_measured",
    source: { timing: { kind: "instrument_gap", assessed_at: { kind: "unknown", reason: "No instrument." } } },
  };
  signals[1].source.timing.computation.at = generatedAt;
  const absent = validateTimingGraph(signals, { asOf, generatedAt, rawInputs: [] });
  assert.ok(absent.errors.some(({ code }) => code === "DERIVED_TIMING_SOURCE_UNUSABLE"));
});

test("timing rules reject malformed cadence and unsupported reference semantics", () => {
  assert.ok(validateTimingRule({
    ...annualRule,
    release_cadence: { kind: "maximum_interval", maximum_interval_days: -1, grace_days: 0 },
  }).errors.some(({ code }) => code === "RELEASE_CADENCE_INVALID"));
  assert.ok(validateTimingRule({
    ...annualRule,
    reference_period_kind: "quarter",
  }).errors.some(({ code }) => code === "REFERENCE_PERIOD_KIND_UNSUPPORTED"));
});

test("derived assessment roles are constrained to target-relative offsets", () => {
  const base = {
    kind: "derived",
    derivation_id: "test-derived-v1",
    inherits_from_signal_ids: ["source"],
  };
  for (const input of [
    { signal_id: "source", year_offset: 0, role: "comparator" },
    { signal_id: "source", year_offset: -1, role: "endpoint" },
    { signal_id: "source", year_offset: 2, role: "baseline" },
  ]) {
    const result = validateTimingRule({
      ...base,
      assessment_binding: { kind: "latest_point_inputs", inputs: [input] },
    });
    assert.ok(result.errors.some(({ code }) => code === "ASSESSMENT_ROLE_OFFSET_INVALID"));
  }
});

test("a completed statistic cannot represent an unfinished calendar year", () => {
  assert.equal(assessPointTiming({
    point: { year: 2026, epistemic_class: "published_statistic" },
    timing: external,
    rule: annualRule,
    asOf,
  }).reference_coverage, "invalid_unfinished_period");
});

test("release interval boundaries are consistent at exact and day precision", () => {
  const exact = clone(external);
  exact.publisher_release = {
    kind: "publisher_declared_instant",
    at: rawInput.retrieved_at,
    evidence: {
      kind: "adapter_extraction",
      raw_input_id: rawInputId,
      adapter_id: "test-metadata",
      adapter_version: "1.0.0",
      field_pointer: "/release_at",
    },
  };
  exact.retrieval = { kind: "exact", at: rawInput.retrieved_at, raw_input_id: rawInputId };
  const extractedMetadata = [{
    raw_input_id: rawInputId,
    adapter_id: "test-metadata",
    adapter_version: "1.0.0",
    field_pointer: "/release_at",
    value: rawInput.retrieved_at,
  }];
  assert.equal(validateSourceTiming({
    timing: exact, asOf, generatedAt, rawInputs: [rawInput], extractedMetadata,
  }).valid, true);
  assert.equal(assessPointTiming({
    point: { year: 2025, epistemic_class: "published_statistic" },
    timing: exact,
    rule: annualRule,
    asOf,
  }).availability_order, "release_before_or_at_retrieval");

  const nextDay = clone(external);
  nextDay.publisher_release = {
    kind: "publisher_declared_date",
    on: "2026-09-08",
    timezone: "UTC",
    evidence: {
      kind: "adapter_extraction",
      raw_input_id: rawInputId,
      adapter_id: "test-metadata",
      adapter_version: "1.0.0",
      field_pointer: "/release_date",
    },
  };
  nextDay.retrieval.on = "2026-09-07";
  assert.ok(validateSourceTiming({
    timing: nextDay,
    asOf: "2026-09-09T00:00:00Z",
    generatedAt: "2026-09-09T00:00:01Z",
    rawInputs: [rawInput],
    extractedMetadata: [{
      raw_input_id: rawInputId,
      adapter_id: "test-metadata",
      adapter_version: "1.0.0",
      field_pointer: "/release_date",
      value: "2026-09-08",
    }],
  }).errors.some(({ code }) => code === "RELEASE_AFTER_RETRIEVAL"));
});

test("publisher local calendar dates use IANA bounds and unknown zones fail closed", () => {
  const timing = clone(external);
  timing.publisher_release = {
    kind: "publisher_declared_local_date",
    on: "2026-09-07",
    timezone: "Australia/Sydney",
    evidence: {
      kind: "adapter_extraction",
      raw_input_id: rawInputId,
      adapter_id: "test-metadata",
      adapter_version: "1.0.0",
      field_pointer: "/release_date",
    },
  };
  assert.equal(validateSchema(timing), true, ajv.errorsText(validateSchema.errors));
  assert.equal(validateSourceTiming({
    timing,
    asOf,
    generatedAt,
    rawInputs: [{
      ...rawInput,
      adapter: {
        id: "test-metadata",
        version: "1.0.0",
        timing_fields: [{ claim: "publisher_release", field_pointer: "/release_date" }],
      },
    }],
    extractedMetadata: [{
      raw_input_id: rawInputId,
      adapter_id: "test-metadata",
      adapter_version: "1.0.0",
      field_pointer: "/release_date",
      value: "2026-09-07",
    }],
  }).valid, true);
  assert.equal(assessPointTiming({
    point: { year: 2025, epistemic_class: "published_statistic" },
    timing,
    rule: annualRule,
    asOf,
  }).availability_order, "unknown_interval_overlap");
  assert.equal(assessPointTiming({
    point: { year: 2025, epistemic_class: "published_statistic" },
    timing,
    rule: {
      ...annualRule,
      release_cadence: { kind: "maximum_interval", maximum_interval_days: 0, grace_days: 0 },
    },
    asOf,
  }).release_recency, "overdue");
  const oldRelease = clone(timing);
  oldRelease.publisher_release.on = "2020-01-01";
  oldRelease.publisher_release.evidence.field_pointer = "/release_date";
  assert.equal(validateSourceTiming({
    timing: oldRelease,
    asOf,
    generatedAt,
    rawInputs: [{
      ...rawInput,
      adapter: {
        id: "test-metadata",
        version: "1.0.0",
        timing_fields: [{ claim: "publisher_release", field_pointer: "/release_date" }],
      },
    }],
    extractedMetadata: [{
      raw_input_id: rawInputId,
      adapter_id: "test-metadata",
      adapter_version: "1.0.0",
      field_pointer: "/release_date",
      value: "2020-01-01",
    }],
  }).valid, true);
  const unspecified = clone(timing);
  unspecified.publisher_release.timezone = "unspecified";
  assert.ok(validateSourceTiming({
    timing: unspecified,
    asOf,
    generatedAt,
    rawInputs: [],
  }).errors.some(({ code }) => code === "RELEASE_ORDER_UNPROVEN"));
  const skippedCivilDate = clone(timing);
  skippedCivilDate.publisher_release.on = "2011-12-30";
  skippedCivilDate.publisher_release.timezone = "Pacific/Apia";
  assert.ok(validateSourceTiming({
    timing: skippedCivilDate,
    asOf,
    generatedAt,
    rawInputs: [{
      ...rawInput,
      adapter: {
        id: "test-metadata",
        version: "1.0.0",
        timing_fields: [{ claim: "publisher_release", field_pointer: "/release_date" }],
      },
    }],
    extractedMetadata: [{
      raw_input_id: rawInputId,
      adapter_id: "test-metadata",
      adapter_version: "1.0.0",
      field_pointer: "/release_date",
      value: "2011-12-30",
    }],
  }).errors.some(({ code }) => code === "PUBLISHER_RELEASE_INTERVAL_INVALID"));
  const fakeZone = clone(timing);
  fakeZone.publisher_release.timezone = "Mars/Olympus";
  assert.ok(validateSourceTiming({
    timing: fakeZone,
    asOf,
    generatedAt,
    rawInputs: [],
  }).errors.some(({ code }) => code === "PUBLISHER_TIMEZONE_INVALID"));
});

test("metadata evidence is adapter-bound, registered and duplicate-free", () => {
  const timing = clone(external);
  timing.publisher_vintage = {
    status: "known",
    id: "edition-1",
    evidence: {
      kind: "adapter_extraction",
      raw_input_id: rawInputId,
      adapter_id: "fake-adapter",
      adapter_version: "9.0.0",
      field_pointer: "/edition",
    },
  };
  const fakeExtraction = {
    raw_input_id: rawInputId,
    adapter_id: "fake-adapter",
    adapter_version: "9.0.0",
    field_pointer: "/edition",
    value: "edition-1",
  };
  const actualRawInput = {
    ...rawInput,
    adapter: {
      id: "real-adapter",
      version: "1.0.0",
      timing_fields: [{ claim: "publisher_vintage", field_pointer: "/edition" }],
    },
  };
  assert.ok(validateSourceTiming({
    timing, asOf, generatedAt, rawInputs: [actualRawInput], extractedMetadata: [fakeExtraction],
  }).errors.some(({ code }) => code === "TIMING_EVIDENCE_ADAPTER_MISMATCH"));

  timing.publisher_vintage.evidence.adapter_id = "real-adapter";
  timing.publisher_vintage.evidence.adapter_version = "1.0.0";
  const extraction = {
    ...fakeExtraction,
    adapter_id: "real-adapter",
    adapter_version: "1.0.0",
  };
  for (const duplicates of [
    [extraction, { ...extraction, value: "conflict" }],
    [{ ...extraction, value: "conflict" }, extraction],
  ]) {
    assert.ok(validateSourceTiming({
      timing, asOf, generatedAt, rawInputs: [actualRawInput], extractedMetadata: duplicates,
    }).errors.some(({ code }) => code === "TIMING_METADATA_DUPLICATE"));
  }
});

test("first-seen presence is bound to the cited retained response clock", () => {
  const timing = clone(external);
  timing.publisher_release = {
    kind: "observed_availability",
    not_seen: null,
    first_seen: {
      at: "2026-09-01T00:00:00Z",
      evidence_raw_input_ids: [rawInputId],
    },
  };
  const result = validateSourceTiming({ timing, asOf, generatedAt, rawInputs: [rawInput] });
  assert.ok(result.errors.some(({ code }) => code === "AVAILABILITY_PRESENCE_TIME_MISMATCH"));
});

test("derived assessment uses exact registered input points rather than source latest", () => {
  const source = {
    id: "source",
    status: "available",
    latest: { entity: "OWID_WRL", year: 2026, epistemic_class: "nowcast" },
    series: [{
      entity: "OWID_WRL",
      points: [
        [2024, 1, "published_statistic"],
        [2026, 2, "nowcast"],
      ],
    }],
    source: { timing: external },
  };
  const derived = {
    id: "derived",
    status: "available",
    latest: { entity: "OWID_WRL", year: 2024, epistemic_class: "derived" },
    source: {
      timing: {
        kind: "derived",
        derivation_id: "test-derived-v1",
        computation: { kind: "unknown", reason: "Migrated computation clock." },
        inherits_from_signal_ids: ["source"],
        assessment_lineage: [{
          signal_id: "source", entity: "OWID_WRL", year: 2024, role: "endpoint",
        }],
      },
    },
  };
  const assessments = assessTimingGraph([source, derived], {
    asOf,
    rules: {
      source: annualRule,
      derived: {
        kind: "derived",
        derivation_id: "test-derived-v1",
        inherits_from_signal_ids: ["source"],
      },
    },
  });
  assert.equal(assessments.derived.reference_coverage, "outside_policy_window");
});

test("external timing assessments bind independently to every displayed point", () => {
  const signal = {
    id: "poverty",
    status: "available",
    latest: { entity: "OWID_WRL", year: 2026, epistemic_class: "nowcast" },
    series: [
      { entity: "OWID_WRL", points: [[2026, 8, "nowcast"]] },
      { entity: "AUS", points: [[2020, 1, "published_statistic"]] },
    ],
    source: { timing: external },
  };
  const assessment = assessTimingGraph([signal], {
    asOf,
    generatedAt,
    rawInputs: [],
    rules: { poverty: annualRule },
  }).poverty;
  assert.deepEqual(assessment.assessment_target, {
    kind: "point",
    signal_id: "poverty",
    entity: "OWID_WRL",
    measure: null,
    year: 2026,
  });
  assert.equal(Object.hasOwn(assessment, "target"), false);
  const world = assessment.point_assessments.find(({ target }) => target.entity === "OWID_WRL");
  const australia = assessment.point_assessments.find(({ target }) => target.entity === "AUS");
  assert.equal(world.reference_coverage, "period_in_progress");
  assert.equal(australia.reference_coverage, "outside_policy_window");
  assert.equal(australia.byte_acquisition, "unknown");
  assert.equal(australia.record_generated_at, generatedAt);
  assert.notDeepEqual(world.target, australia.target);
});

test("duplicate point targets are rejected instead of silently selected", () => {
  const signal = {
    id: "duplicate",
    status: "available",
    latest: { entity: "OWID_WRL", year: 2025, epistemic_class: "published_statistic" },
    series: [
      { entity: "OWID_WRL", points: [[2025, 1, "published_statistic"]] },
      { entity: "OWID_WRL", points: [[2025, 2, "published_statistic"]] },
    ],
    source: { timing: external },
  };
  assert.ok(validateTimingGraph([signal], {
    asOf, generatedAt, rules: { duplicate: annualRule },
  }).errors.some(({ code }) => code === "TIMING_POINT_TARGET_DUPLICATE"));
});

test("multiple signal raw inputs do not create a false point acquisition clock", () => {
  const secondRawInputId = `sha256:${"b".repeat(64)}`;
  const signal = {
    id: "source",
    status: "available",
    latest: { entity: "OWID_WRL", year: 2025, epistemic_class: "published_statistic" },
    series: [{ entity: "OWID_WRL", points: [[2025, 1, "published_statistic"]] }],
    source: { timing: external, raw_input_ids: [rawInputId, secondRawInputId] },
  };
  const assessment = assessTimingGraph([signal], {
    asOf,
    rawInputs: [rawInput, {
      ...rawInput,
      id: secondRawInputId,
      retrieved_at: "2026-09-07T13:00:00Z",
      acquired_at: "2026-09-07T13:00:01Z",
    }],
    rules: { source: annualRule },
  }).source.point_assessments[0];
  assert.equal(assessment.point_raw_input_binding, "ambiguous_signal_inputs");
  assert.equal(assessment.byte_acquisition, "unknown");
  assert.equal(assessment.evidence_readiness, "unknown");
});

test("derived assessment lineage is bound to the governed displayed target", () => {
  const source = (id) => ({
    id,
    status: "available",
    latest: { entity: "OWID_WRL", year: 2025, epistemic_class: "published_statistic" },
    series: [{
      entity: "OWID_WRL",
      points: [[2024, 1, "published_statistic"], [2025, 2, "published_statistic"]],
    }],
    source: { timing: external },
  });
  const derived = {
    id: "derived",
    status: "available",
    latest: { entity: "OWID_WRL", year: 2025, epistemic_class: "derived" },
    source: { timing: derivedTiming(["a", "b"]) },
  };
  const rules = {
    a: annualRule,
    b: annualRule,
    derived: {
      kind: "derived",
      derivation_id: "test-derived-v1",
      inherits_from_signal_ids: ["a", "b"],
      assessment_binding: {
        kind: "latest_point_inputs",
        inputs: [
          { signal_id: "a", year_offset: 0, role: "endpoint" },
          { signal_id: "b", year_offset: 0, role: "endpoint" },
        ],
      },
    },
  };
  assert.equal(validateTimingGraph([source("a"), source("b"), derived], {
    asOf, generatedAt, rules,
  }).valid, true);

  const olderButValid = clone(derived);
  olderButValid.source.timing.assessment_lineage[0].year = 2024;
  assert.ok(validateTimingGraph([source("a"), source("b"), olderButValid], {
    asOf, generatedAt, rules,
  }).errors.some(({ code }) => code === "DERIVED_ASSESSMENT_BINDING_MISMATCH"));
});

test("nested derivations cannot borrow a different derived point's assessment", () => {
  const source = {
    id: "source",
    status: "available",
    latest: { entity: "OWID_WRL", year: 2025, epistemic_class: "published_statistic" },
    series: [
      { entity: "OWID_WRL", points: [[2025, 2, "published_statistic"]] },
      { entity: "AUS", points: [[2020, 1, "published_statistic"]] },
    ],
    source: { timing: external },
  };
  const first = {
    id: "first",
    status: "available",
    latest: { entity: "OWID_WRL", year: 2025, epistemic_class: "derived" },
    series: [
      { entity: "OWID_WRL", points: [[2025, 2, "derived"]] },
      { entity: "AUS", points: [[2020, 1, "derived"]] },
    ],
    source: { timing: derivedTiming(["source"]) },
  };
  const second = {
    id: "second",
    status: "available",
    latest: { entity: "AUS", year: 2020, epistemic_class: "derived" },
    series: [{ entity: "AUS", points: [[2020, 1, "derived"]] }],
    source: { timing: {
      ...derivedTiming(["first"]),
      assessment_lineage: [{
        signal_id: "first", entity: "AUS", year: 2020, role: "endpoint",
      }],
    } },
  };
  const rules = {
    source: annualRule,
    first: {
      kind: "derived",
      derivation_id: "test-derived-v1",
      inherits_from_signal_ids: ["source"],
      assessment_binding: {
        kind: "latest_point_inputs",
        inputs: [{ signal_id: "source", year_offset: 0, role: "endpoint" }],
      },
    },
    second: {
      kind: "derived",
      derivation_id: "test-derived-v1",
      inherits_from_signal_ids: ["first"],
      assessment_binding: {
        kind: "latest_point_inputs",
        inputs: [{ signal_id: "first", year_offset: 0, role: "endpoint" }],
      },
    },
  };
  const validation = validateTimingGraph([source, first, second], { asOf, generatedAt, rules });
  assert.ok(validation.errors.some(({ code }) => code === "NESTED_DERIVED_ASSESSMENT_UNBOUND"));
  const secondAssessment = assessTimingGraph([source, first, second], { asOf, rules }).second;
  assert.equal(secondAssessment.reference_coverage, "unknown");
  assert.equal(secondAssessment.status, "not_assessed");
  assert.equal(secondAssessment.lineage_completeness, "incomplete");
});

test("nested derived summaries preserve inherited publisher release bases", () => {
  const sourceTiming = clone(external);
  sourceTiming.publisher_release = {
    kind: "publisher_declared_date",
    on: "2026-09-01",
    timezone: "UTC",
    evidence: {
      kind: "adapter_extraction",
      raw_input_id: rawInputId,
      adapter_id: "test-metadata",
      adapter_version: "1.0.0",
      field_pointer: "/release_date",
    },
  };
  const source = {
    id: "source",
    status: "available",
    latest: { entity: "OWID_WRL", year: 2025, epistemic_class: "published_statistic" },
    series: [{ entity: "OWID_WRL", points: [[2025, 1, "published_statistic"]] }],
    source: { timing: sourceTiming },
  };
  const derived = (id, dependency) => ({
    id,
    status: "available",
    latest: { entity: "OWID_WRL", year: 2025, epistemic_class: "derived" },
    series: [{ entity: "OWID_WRL", points: [[2025, 1, "derived"]] }],
    source: { timing: derivedTiming([dependency]) },
  });
  const rule = (dependency) => ({
    kind: "derived",
    derivation_id: "test-derived-v1",
    inherits_from_signal_ids: [dependency],
    assessment_binding: {
      kind: "latest_point_inputs",
      inputs: [{ signal_id: dependency, year_offset: 0, role: "endpoint" }],
    },
  });
  const assessments = assessTimingGraph([source, derived("first", "source"), derived("second", "first")], {
    asOf,
    rules: { source: annualRule, first: rule("source"), second: rule("first") },
  });
  assert.deepEqual(assessments.second.publisher_release_bases, ["publisher_declared_date"]);
});

test("derived dependencies must equal the registered derivation contract", () => {
  const signals = [{ id: "source", status: "available", source: { timing: external } }, {
    id: "unrelated", status: "available", source: { timing: external },
  }, {
    id: "derived", status: "available", source: { timing: {
      kind: "derived",
      derivation_id: "registered-v1",
      computation: { kind: "unknown", reason: "Unknown." },
      inherits_from_signal_ids: ["unrelated"],
      assessment_lineage: [{
        signal_id: "unrelated", entity: "OWID_WRL", year: 2025, role: "endpoint",
      }],
    } },
  }];
  const result = validateTimingGraph(signals, {
    asOf,
    generatedAt,
    rules: {
      source: annualRule,
      unrelated: annualRule,
      derived: {
        kind: "derived",
        derivation_id: "registered-v1",
        inherits_from_signal_ids: ["source"],
      },
    },
  });
  assert.ok(result.errors.some(({ code }) => code === "DERIVATION_CONTRACT_MISMATCH"));
});

test("missing raw-input references and forged absence receipts fail independently", () => {
  const missing = [{
    id: "source",
    status: "available",
    source: { timing: external, raw_input_ids: [rawInputId] },
  }];
  assert.ok(validateTimingGraph(missing, {
    asOf, generatedAt, rawInputs: [], rules: { source: annualRule },
  }).errors.some(({ code }) => code === "SIGNAL_RAW_INPUT_UNRESOLVED"));

  const timing = clone(external);
  timing.publisher_release = {
    kind: "observed_availability",
    not_seen: {
      at: "2026-09-06T12:00:00Z",
      absence_receipt_ids: [`sha256:${"b".repeat(64)}`],
    },
    first_seen: { at: rawInput.retrieved_at, evidence_raw_input_ids: [rawInputId] },
  };
  const forged = {
    id: `sha256:${"b".repeat(64)}`,
    kind: "absence_receipt",
    target_url: "https://wrong.example/data",
    observed_at: "2026-09-06T12:00:00Z",
    acquired_at: "2026-09-06T12:00:01Z",
    producer: { id: "availability-probe", version: "1.0.0" },
    outcome: { kind: "http_not_found", http_status: 404 },
  };
  assert.ok(validateSourceTiming({
    timing,
    asOf,
    generatedAt,
    rawInputs: [rawInput],
    sourceUrl: "https://publisher.example/data",
    availabilityReceipts: [forged],
  }).errors.some(({ code }) => code === "AVAILABILITY_ABSENCE_EVIDENCE_INVALID"));
});

test("exclusive availability lower bounds after the cut-off are not ambiguous", () => {
  const timing = clone(external);
  timing.publisher_release = {
    kind: "observed_availability",
    not_seen: {
      at: asOf,
      absence_receipt_ids: [`sha256:${"b".repeat(64)}`],
    },
    first_seen: {
      at: "2026-09-08T00:41:32Z",
      evidence_raw_input_ids: [rawInputId],
    },
  };
  assert.ok(validateSourceTiming({
    timing, asOf, generatedAt, rawInputs: [rawInput], availabilityReceipts: [],
  }).errors.some(({ code }) => code === "RELEASE_AFTER_EVIDENCE_CUTOFF"));
});

test("partial flags and past forecasts cannot bypass reference-period semantics", () => {
  assert.equal(assessPointTiming({
    point: { year: 2026, epistemic_class: "published_statistic", period_status: "partial" },
    timing: external,
    rule: annualRule,
    asOf,
  }).reference_coverage, "invalid_unfinished_period");
  assert.equal(assessPointTiming({
    point: { year: 2025, epistemic_class: "forecast" },
    timing: external,
    rule: annualRule,
    asOf,
  }).reference_coverage, "invalid_past_forecast");
});

test("migration identities, clocks and changed fields are derived rather than asserted", () => {
  const legacy = JSON.parse(readFileSync(legacySnapshotPath, "utf8"));
  const options = {
    recordId: "2026-09-08.r2",
    predecessorRecordId: "2026-09-08.r1",
    predecessorDigest: `sha256:${"a".repeat(64)}`,
    policyDigest: `sha256:${"b".repeat(64)}`,
    revisionAt: "2026-09-08T09:49:00Z",
  };
  const migrated = migrateSnapshot18(legacy, options);
  assert.equal(migrated.generated_at, options.revisionAt);
  assert.equal(migrated.correction.changed_fields.includes("correction"), false);
  assert.ok(migrated.signals.filter(({ source }) => source.timing.kind === "derived").every(
    ({ source }) => source.timing.computation.kind === "unknown",
  ));
  const laterCorrection = migrateSnapshot18(legacy, {
    ...options,
    revisionAt: "2026-09-09T01:00:00Z",
  });
  assert.equal(laterCorrection.correction.issued_on, "2026-09-09");
  for (const bad of [
    { ...options, recordId: "2099-01-01.r1" },
    { ...options, recordId: "2026-09-08.r1", predecessorRecordId: "2026-09-08.r9" },
    { ...options, predecessorDigest: "garbage" },
    { ...options, policyDigest: "garbage" },
    { ...options, revisionAt: legacy.generated_at },
    { ...options, revisionAt: "2026-09-08T00:41:30Z" },
    { ...options, revisionAt: "2026-09-08T24:00:00Z" },
    { ...options, revisionAt: "2026-09-08T99:99:99Z" },
  ]) assert.throws(() => migrateSnapshot18(legacy, bad));
});

test("assessment serialization is canonical across signal and dependency order", () => {
  const source = (id) => ({
    id,
    status: "available",
    latest: { entity: "OWID_WRL", year: 2025, epistemic_class: "published_statistic" },
    series: [{ entity: "OWID_WRL", points: [[2025, 1, "published_statistic"]] }],
    source: { timing: external },
  });
  const derived = {
    id: "derived",
    status: "available",
    source: { timing: {
      kind: "derived",
      derivation_id: "test-v1",
      computation: { kind: "unknown", reason: "Unknown." },
      inherits_from_signal_ids: ["b", "a"],
      assessment_lineage: [
        { signal_id: "b", entity: "OWID_WRL", year: 2025, role: "endpoint" },
        { signal_id: "a", entity: "OWID_WRL", year: 2025, role: "endpoint" },
      ],
    } },
  };
  const rules = {
    a: annualRule,
    b: annualRule,
    derived: { kind: "derived", derivation_id: "test-v1", inherits_from_signal_ids: ["a", "b"] },
  };
  const first = assessTimingGraph([source("a"), source("b"), derived], { asOf, rules });
  const reversed = clone(derived);
  reversed.source.timing.inherits_from_signal_ids.reverse();
  reversed.source.timing.assessment_lineage.reverse();
  const second = assessTimingGraph([reversed, source("b"), source("a")], { asOf, rules });
  assert.equal(JSON.stringify(first), JSON.stringify(second));
});

test("forecast targets and in-progress nowcasts cannot freshen historical evidence", () => {
  const rule = {
    kind: "external_dataset",
    reference_period_kind: "calendar_year",
    max_reference_lag_days: 366,
    release_cadence: { kind: "unknown", reason: "No pinned schedule." },
  };
  assert.equal(assessPointTiming({
    point: { year: 2027, epistemic_class: "forecast" },
    timing: external,
    rule,
    asOf,
  }).reference_coverage, "future_target");
  assert.equal(assessPointTiming({
    point: { year: 2025, epistemic_class: "forecast" },
    timing: external,
    rule,
    asOf,
  }).reference_coverage, "invalid_past_forecast");
  assert.equal(assessPointTiming({
    point: { year: 2026, epistemic_class: "nowcast" },
    timing: external,
    rule,
    asOf,
  }).reference_coverage, "period_in_progress");
  assert.equal(assessPointTiming({
    point: { year: 2024, epistemic_class: "published_statistic" },
    timing: external,
    rule,
    asOf,
  }).reference_coverage, "outside_policy_window");
});

test("the v2.0 migration creates a same-day record without changing frozen input", () => {
  const legacy = JSON.parse(readFileSync(legacySnapshotPath, "utf8"));
  const before = JSON.stringify(legacy);
  const migrated = migrateSnapshot18(legacy, {
    recordId: "2026-09-08.r2",
    predecessorRecordId: "2026-09-08.r1",
    predecessorDigest: `sha256:${"a".repeat(64)}`,
    policyDigest: `sha256:${"b".repeat(64)}`,
    revisionAt: "2026-09-08T09:49:00Z",
  });
  assert.equal(JSON.stringify(legacy), before, "migration must not mutate the frozen source object");
  assert.equal(migrated.schema_version, "2.0.0");
  assert.equal(migrated.record_id, "2026-09-08.r2");
  assert.equal(migrated.snapshot_id, "2026-09-08");
  assert.equal(migrated.correction.supersedes_record_id, "2026-09-08.r1");
  assert.equal(migrated.correction.supersedes_snapshot_id, "2026-09-08");
  assert.match(migrated.public_update.update_id, /2026-09-08\.r2$/);
  assert.equal(
    migrated.public_update.scope.population,
    "Separately published WLD and OWID_WRL direct aggregates; coverage compatibility is unverified",
  );
  assert.ok(migrated.signals.every(({ source }) => source.timing));
  assert.ok(migrated.signals.filter(({ status }) => status === "not_measured").every(
    ({ source }) => source.timing.kind === "instrument_gap" && !Object.hasOwn(source, "retrieved"),
  ));
  assert.ok(migrated.signals.filter(({ source }) => source.timing.kind === "derived").every(
    ({ source }) => !Object.hasOwn(source, "retrieved"),
  ));
  assert.ok(migrated.signals.filter(({ source }) => source.timing.kind === "external_dataset").every(
    ({ source }) => source.retrieved === source.timing.retrieval.on,
  ));
  assert.doesNotMatch(JSON.stringify(migrated.signals), /source_vintage[^}]*retrieved/i);
});

test("the v2.0 timing policy distinguishes external, derived and absent instruments", () => {
  const legacyPolicy = JSON.parse(readFileSync(legacyPolicyPath, "utf8"));
  const migrated = migratePolicy18(legacyPolicy);
  assert.equal(migrated.policy_version, "2.0.0");
  assert.equal(Object.hasOwn(migrated.freshness_policy, "signal_max_age_years"), false);
  assert.equal(migrated.freshness_policy.signal_rules["labour-share"].kind, "external_dataset");
  assert.equal(migrated.freshness_policy.signal_rules["engels-divergence"].kind, "derived");
  assert.equal(migrated.freshness_policy.signal_rules["zero-cost-count"].kind, "not_applicable");
  assert.equal(
    migrated.public_update_contract.population,
    "Separately published WLD and OWID_WRL direct aggregates; coverage compatibility is unverified",
  );
});
