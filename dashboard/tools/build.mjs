#!/usr/bin/env node

import { readFileSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import Ajv2020 from "ajv/dist/2020.js";
import addFormats from "ajv-formats";

const here = dirname(fileURLToPath(import.meta.url));
const dashboard = resolve(here, "..");
const snapshotPath = resolve(process.argv[2] || resolve(dashboard, "snapshots", "2026-09-08.json"));
const outputPath = resolve(process.argv[3] || resolve(dashboard, "web", "index.html"));
const templatePath = resolve(dashboard, "web", "index.template.html");
const schemaPath = resolve(dashboard, "schema", "snapshot.schema.json");
const policyPath = resolve(dashboard, "evidence", "adapter-classification-policy.json");
const snapshotIndexPath = resolve(dashboard, "snapshots", "index.json");
const snapshotDirectory = resolve(dashboard, "snapshots");
const POLICY_SHA256 = "780ad6a23adfca588049841ab648d159a2c95e3e19e848bddfb82b784b56474f";
const GLOBAL_SOURCE_HOSTS = new Set(["api.worldbank.org", "ourworldindata.org", "ec.europa.eu"]);

const ENTITY_CODES = new Set(["OWID_WRL", "USA", "DEU", "ESP", "AUS", "CHN", "IND"]);
const WORLD_BANK_CODES = new Map([
  ["WLD", "OWID_WRL"], ["USA", "USA"], ["DEU", "DEU"], ["ESP", "ESP"],
  ["AUS", "AUS"], ["CHN", "CHN"], ["IND", "IND"],
]);

function same(left, right) {
  return JSON.stringify(left) === JSON.stringify(right);
}

function sha256(value) {
  return `sha256:${createHash("sha256").update(value).digest("hex")}`;
}

function allowedHttpsUrl(value, allowedHosts) {
  if (!value) return true;
  try {
    const parsed = new URL(value);
    return parsed.protocol === "https:" && !parsed.username && !parsed.password &&
      parsed.port === "" && allowedHosts.has(parsed.hostname);
  } catch {
    return false;
  }
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

function displayContractChecksum(signal) {
  return sha256(JSON.stringify(displayContract(signal)));
}

function normaliseRules(rules = []) {
  return rules.map(({ from_year, through_year, epistemic_class }) => {
    const rule = {};
    if (from_year !== undefined) rule.from_year = from_year;
    if (through_year !== undefined) rule.through_year = through_year;
    rule.epistemic_class = epistemic_class;
    return rule;
  });
}

function epistemicClassFor(adapter, year) {
  const rules = adapter.epistemic_rules.filter((rule) =>
    (rule.from_year === undefined || year >= rule.from_year) &&
    (rule.through_year === undefined || year <= rule.through_year)
  );
  if (rules.length !== 1) throw new Error(`year ${year} must match exactly one epistemic rule`);
  return rules[0].epistemic_class;
}

function parseCsv(bytes) {
  const text = bytes.toString("utf8");
  const rows = [];
  let row = [], field = "", quoted = false;
  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    if (quoted) {
      if (char === '"' && text[index + 1] === '"') {
        field += '"';
        index += 1;
      } else if (char === '"') quoted = false;
      else field += char;
    } else if (char === '"') quoted = true;
    else if (char === ",") {
      row.push(field);
      field = "";
    } else if (char === "\n") {
      row.push(field.replace(/\r$/, ""));
      rows.push(row);
      row = [];
      field = "";
    } else field += char;
  }
  if (field || row.length) {
    row.push(field.replace(/\r$/, ""));
    rows.push(row);
  }
  if (quoted) throw new Error("unterminated quoted CSV field");
  return rows;
}

function transformOwid(bytes, adapter) {
  const rows = parseCsv(bytes);
  if (rows.length < 2) throw new Error("empty OWID CSV");
  const header = rows[0];
  for (const field of adapter.selected_fields) {
    if (!header.includes(field)) throw new Error(`selected OWID field is absent: ${field}`);
  }
  const valueFields = adapter.selected_fields.filter((field) =>
    !["Entity", "Code", "Year"].includes(field)
  );
  if (valueFields.length !== 1) throw new Error("OWID adapter must select exactly one value field");
  const indexes = Object.fromEntries(header.map((field, index) => [field, index]));
  const transformed = new Map();
  for (const row of rows.slice(1)) {
    const code = (row[indexes.Code] || "").trim();
    if (!ENTITY_CODES.has(code)) continue;
    const year = Number(row[indexes.Year]);
    const value = Number(row[indexes[valueFields[0]]]);
    if (!Number.isInteger(year) || !Number.isFinite(value)) continue;
    if (!transformed.has(code)) transformed.set(code, []);
    transformed.get(code).push([year, Number(value.toFixed(4)), epistemicClassFor(adapter, year)]);
  }
  return transformed;
}

function transformWorldBank(bytes, adapter) {
  const payload = JSON.parse(bytes.toString("utf8"));
  if (!Array.isArray(payload) || !Array.isArray(payload[1])) throw new Error("invalid World Bank JSON");
  const transformed = new Map();
  for (const row of payload[1]) {
    const indicator = row?.indicator?.id;
    if (indicator !== adapter.dataset_id) {
      throw new Error(`World Bank response indicator ${indicator} does not match ${adapter.dataset_id}`);
    }
    if (row.value === null || row.value === undefined) continue;
    let code = WORLD_BANK_CODES.get(String(row.countryiso3code || "").trim());
    if (!code && ["1W", "WLD"].includes(row?.country?.id)) code = "OWID_WRL";
    if (!code) continue;
    const year = Number(row.date);
    const value = Number(row.value);
    if (!Number.isInteger(year) || !Number.isFinite(value)) continue;
    if (!transformed.has(code)) transformed.set(code, []);
    transformed.get(code).push([year, Number(value.toFixed(4)), epistemicClassFor(adapter, year)]);
  }
  return transformed;
}

function transformRawInputs(signal, rawBytesById) {
  const adapter = signal.source.adapter;
  const merged = new Map();
  for (const rawInputId of signal.source.raw_input_ids) {
    const bytes = rawBytesById.get(rawInputId);
    if (!bytes) throw new Error(`verified raw input ${rawInputId} is unavailable`);
    let part;
    if (adapter.id === "owid-grapher-csv") part = transformOwid(bytes, adapter);
    else if (adapter.id === "world-bank-json") part = transformWorldBank(bytes, adapter);
    else throw new Error(`unsupported source adapter ${adapter.id}`);
    for (const [entity, points] of part) {
      if (!merged.has(entity)) merged.set(entity, []);
      merged.get(entity).push(...points);
    }
  }
  return [...merged]
    .map(([entity, points]) => ({ entity, points: points.sort((a, b) => a[0] - b[0]) }))
    .sort((a, b) => a.entity.localeCompare(b.entity));
}

function unique(values) {
  return [...new Set(values)];
}

function rounded(value, digits) {
  return Number(value.toFixed(digits));
}

function recomputeEngels(signals) {
  const byId = new Map(signals.map((signal) => [signal.id, signal]));
  const pointMaps = (id) => new Map((byId.get(id)?.series || []).map((series) => [
    series.entity,
    new Map(series.points.map((point) => [point[0], { value: point[1], epistemicClass: point[2] }])),
  ]));
  const labour = pointMaps("labour-share");
  const gdp = pointMaps("gdp-per-capita");
  const entities = [...labour.keys()].filter((entity) => gdp.has(entity)).sort();
  const divergence = [], gap = [];
  for (const entity of entities) {
    const years = [...labour.get(entity).keys()].filter((year) => gdp.get(entity).has(year)).sort((a, b) => a - b);
    if (years.length < 3) continue;
    const base = years[0];
    const gdpBase = gdp.get(entity).get(base).value;
    const labourBase = labour.get(entity).get(base).value / 100 * gdpBase;
    divergence.push({
      entity,
      measure: "Output per capita",
      points: years.map((year) => {
        const value = gdp.get(entity).get(year);
        return [year, rounded(value.value / gdpBase * 100, 2), "derived", [value.epistemicClass]];
      }),
    });
    divergence.push({
      entity,
      measure: "Labour income per capita",
      points: years.map((year) => {
        const labourPoint = labour.get(entity).get(year);
        const gdpPoint = gdp.get(entity).get(year);
        return [
          year,
          rounded((labourPoint.value / 100 * gdpPoint.value) / labourBase * 100, 2),
          "derived",
          unique([labourPoint.epistemicClass, gdpPoint.epistemicClass]),
        ];
      }),
    });
    const points = [];
    for (const year of years.slice(1)) {
      if (!labour.get(entity).has(year - 1) || !gdp.get(entity).has(year - 1)) continue;
      const labourNow = labour.get(entity).get(year);
      const labourPrevious = labour.get(entity).get(year - 1);
      const gdpNow = gdp.get(entity).get(year);
      const gdpPrevious = gdp.get(entity).get(year - 1);
      const outputGrowth = gdpNow.value / gdpPrevious.value - 1;
      const incomeGrowth = (labourNow.value / 100 * gdpNow.value) /
        (labourPrevious.value / 100 * gdpPrevious.value) - 1;
      points.push([
        year,
        rounded((incomeGrowth - outputGrowth) * 100, 3),
        "derived",
        unique([
          labourNow.epistemicClass,
          gdpNow.epistemicClass,
          labourPrevious.epistemicClass,
          gdpPrevious.epistemicClass,
        ]),
      ]);
    }
    if (points.length) gap.push({ entity, points });
  }
  return { divergence, gap };
}

function expectedPublicArithmetic(divergence, entity) {
  const output = divergence.find((series) => series.entity === entity && series.measure === "Output per capita");
  const labour = divergence.find((series) => series.entity === entity && series.measure === "Labour income per capita");
  if (!output?.points.length || !labour?.points.length) {
    return {
      period: "Unavailable in this snapshot",
      summary: "The aggregate output and constructed labour-income comparison is unavailable in this snapshot. No value is carried forward.",
    };
  }
  const startYear = output.points[0][0];
  const endYear = output.points.at(-1)[0];
  const outputValue = output.points.at(-1)[1];
  const labourValue = labour.points.at(-1)[1];
  const difference = rounded(labourValue - outputValue, 2);
  return {
    period: `${startYear} to ${endYear}`,
    summary: `From a shared index of 100 in ${startYear}, real output per person reached ${outputValue.toFixed(2)} and constructed real labour income per person reached ${labourValue.toFixed(2)} in ${endYear}, a difference of ${difference.toFixed(2)} index points.`,
  };
}

function pointReference(signalId, entity, series, point) {
  const reference = {
    signal_id: signalId,
    entity,
  };
  if (series.measure) reference.measure = series.measure;
  Object.assign(reference, {
    year: point[0],
    value: point[1],
    epistemic_class: point[2],
  });
  if (point[3]) reference.input_epistemic_classes = point[3];
  return reference;
}

function expectedPublicLineage(signals, update) {
  const entity = update?.scope?.entity;
  const baseline = signals.find(({ id }) => id === "engels-divergence");
  const output = baseline?.series?.find((series) =>
    series.entity === entity && series.measure === "Output per capita");
  const labourIncome = baseline?.series?.find((series) =>
    series.entity === entity && series.measure === "Labour income per capita");
  if (!output?.points?.length || !labourIncome?.points?.length) return null;
  const fromYear = output.points[0][0];
  const throughYear = output.points.at(-1)[0];
  const sourcePoints = [];
  const rawInputIds = [];
  for (const signalId of ["gdp-per-capita", "labour-share"]) {
    const signal = signals.find(({ id }) => id === signalId);
    const series = signal?.series?.find((candidate) => candidate.entity === entity);
    for (const year of [fromYear, throughYear]) {
      const point = series?.points?.find((candidate) => candidate[0] === year);
      if (point) sourcePoints.push(pointReference(signalId, entity, series, point));
    }
    rawInputIds.push(...(signal?.source?.raw_input_ids || []));
  }
  const derivedPoints = [];
  for (const series of [output, labourIncome]) {
    for (const year of [fromYear, throughYear]) {
      const point = series.points.find((candidate) => candidate[0] === year);
      if (point) derivedPoints.push(pointReference("engels-divergence", entity, series, point));
    }
  }
  return {
    derivation_id: "world-aggregate-transmission-v1",
    entity,
    from_year: fromYear,
    through_year: throughYear,
    source_points: sourcePoints,
    derived_points: derivedPoints,
    raw_input_ids: unique(rawInputIds).sort(),
  };
}

function changedTopLevelFields(predecessor, snapshot) {
  return unique([...Object.keys(predecessor), ...Object.keys(snapshot)])
    .filter((field) => field !== "correction" && !same(predecessor[field], snapshot[field]))
    .sort();
}

function sourceValueProjection(snapshot) {
  return (snapshot.signals || []).map((signal) => ({
    id: signal.id,
    series: (signal.series || []).map((series) => ({
      entity: series.entity,
      measure: series.measure ?? null,
      points: series.points.map((point) => [point[0], point[1]]),
    })),
  }));
}

function correctionContext(snapshot) {
  if (!snapshot.correction) return { errors: [], predecessor: null };
  const errors = [];
  let index;
  try {
    index = JSON.parse(readFileSync(snapshotIndexPath, "utf8"));
  } catch (error) {
    return { errors: [`correction predecessor index cannot be read: ${error.message}`], predecessor: null };
  }
  const entry = index.snapshots?.find(({ id }) => id === snapshot.correction.supersedes_snapshot_id);
  if (!entry) return { errors: ["correction predecessor id is absent from the snapshot index"], predecessor: null };
  const predecessorPath = resolve(snapshotDirectory, entry.path || "");
  if (!predecessorPath.startsWith(`${snapshotDirectory}/`)) {
    return { errors: ["correction predecessor path escapes the snapshot directory"], predecessor: null };
  }
  let bytes;
  try {
    bytes = readFileSync(predecessorPath);
  } catch (error) {
    return { errors: [`correction predecessor cannot be read: ${error.message}`], predecessor: null };
  }
  const digest = sha256(bytes);
  if (entry.sha256 !== digest || snapshot.correction.supersedes_snapshot_sha256 !== digest) {
    errors.push("correction predecessor id and SHA must match indexed predecessor bytes");
  }
  let predecessor = null;
  try {
    predecessor = JSON.parse(bytes.toString("utf8"));
  } catch (error) {
    errors.push(`correction predecessor JSON is invalid: ${error.message}`);
  }
  if (predecessor && predecessor.snapshot_id >= snapshot.snapshot_id) {
    errors.push("correction predecessor must be strictly earlier than the corrected snapshot");
  }
  return { errors, predecessor };
}

function indexedSnapshotBinding(snapshot, snapshotBytes) {
  let index;
  try {
    index = JSON.parse(readFileSync(snapshotIndexPath, "utf8"));
  } catch (error) {
    return [`current snapshot index cannot be read: ${error.message}`];
  }
  const entry = index.snapshots?.find(({ id }) => id === snapshot.snapshot_id);
  if (!entry) return ["snapshot is not registered in the snapshot index"];
  const expectedPath = `${snapshot.snapshot_id}.json`;
  if (!entry || entry.path !== expectedPath) {
    return ["current snapshot must match indexed id, path and SHA"];
  }
  const canonicalPath = resolve(snapshotDirectory, entry.path);
  let canonicalBytes;
  try {
    canonicalBytes = readFileSync(canonicalPath);
  } catch {
    return ["current snapshot must match indexed id, path and SHA"];
  }
  const indexedDigest = sha256(canonicalBytes);
  if (entry.sha256 !== indexedDigest || sha256(snapshotBytes) !== entry.sha256) {
    return ["current snapshot must match indexed id, path and SHA"];
  }
  return [];
}

function validateSemantics(snapshot, policy, policyDigest, rawBytesById, correction) {
  const errors = [];
  const entities = snapshot.entities || [];
  const signals = snapshot.signals || [];
  const entityIds = new Set(entities.map(({ code }) => code));
  const signalIds = new Set(signals.map(({ id }) => id));
  const rawInputs = snapshot.reproducibility?.raw_inputs || [];
  const rawInputIds = new Set(rawInputs.map(({ id }) => id));
  const rawInputById = new Map(rawInputs.map((rawInput) => [rawInput.id, rawInput]));
  const referencedRawInputIds = new Set();
  const policySignals = policy.signals || {};
  if (entityIds.size !== entities.length) errors.push("entity identifiers must be unique");
  if (signalIds.size !== signals.length) errors.push("signal identifiers must be unique");
  if (rawInputIds.size !== rawInputs.length) errors.push("raw input identifiers must be unique");
  if (!same(entities, policy.entity_contracts)) {
    errors.push("entity contract must match the pinned evidence policy");
  }
  if (snapshot.correction && (
    snapshot.correction.supersedes_snapshot_id === snapshot.snapshot_id ||
    snapshot.correction.issued_on !== snapshot.snapshot_id ||
    snapshot.generated_at.slice(0, 10) !== snapshot.correction.issued_on
  )) {
    errors.push("corrected revision must name an earlier snapshot and align its issue date");
  }
  errors.push(...correction.errors);
  if (snapshot.correction && correction.predecessor) {
    const expectedFields = changedTopLevelFields(correction.predecessor, snapshot);
    if (!same(snapshot.correction.changed_fields, expectedFields)) {
      errors.push("correction changed_fields must be derived from the predecessor");
    }
    const sourceValuesChanged = !same(
      sourceValueProjection(correction.predecessor),
      sourceValueProjection(snapshot),
    );
    if (snapshot.correction.source_values_changed !== sourceValuesChanged) {
      errors.push("correction source_values_changed must be derived from the predecessor");
    }
  }
  const asOf = Date.parse(snapshot.as_of);
  const generatedAt = Date.parse(snapshot.generated_at);
  if (snapshot.as_of?.slice(0, 10) !== snapshot.snapshot_id) {
    errors.push("snapshot_id must equal the UTC date of as_of");
  }
  if (snapshot.generated_at?.slice(0, 10) !== snapshot.snapshot_id) {
    errors.push("generated_at UTC date must equal snapshot_id");
  }
  if (!Number.isFinite(asOf) || !Number.isFinite(generatedAt) || generatedAt < asOf) {
    errors.push("generated_at must be at or after as_of");
  }
  if (snapshot.evidence_policy?.id !== "adapter-classification-policy" ||
      snapshot.evidence_policy?.version !== policy.policy_version ||
      snapshot.evidence_policy?.sha256 !== policyDigest) {
    errors.push("snapshot evidence_policy must match the pinned policy version and digest");
  }
  for (const policySignalId of Object.keys(policySignals)) {
    if (!signalIds.has(policySignalId)) {
      errors.push(`pinned evidence policy signal ${policySignalId} is missing from the snapshot`);
    }
  }
  for (const signalId of signalIds) {
    if (!Object.hasOwn(policySignals, signalId)) {
      errors.push(`signal ${signalId} is absent from the pinned evidence policy`);
    }
  }

  for (const rawInput of rawInputs) {
    if (rawInput.id !== `sha256:${rawInput.sha256}`) {
      errors.push(`raw input ${rawInput.id} identifier must match its sha256`);
    }
    if (!allowedHttpsUrl(rawInput.source_url, GLOBAL_SOURCE_HOSTS)) {
      errors.push(`raw input ${rawInput.id} source host is outside the allowlist`);
    }
    if (rawInput.response_metadata?.http_status < 200 || rawInput.response_metadata?.http_status > 299) {
      errors.push(`raw input ${rawInput.id} HTTP status must be 2xx`);
    }
    const responseMediaType = rawInput.response_metadata?.content_type
      ?.split(";", 1)[0].trim().toLowerCase();
    if (!responseMediaType || responseMediaType !== rawInput.media_type.toLowerCase()) {
      errors.push(`raw input ${rawInput.id} media_type must match response content_type`);
    }
    const retrievedAt = Date.parse(rawInput.retrieved_at);
    if (!Number.isFinite(retrievedAt) || retrievedAt > asOf || retrievedAt > generatedAt) {
      errors.push(`raw input ${rawInput.id} retrieval must not follow as_of or generated_at`);
    }
  }

  for (const signal of signals) {
    const adapter = signal.source?.adapter;
    const policySignal = policySignals[signal.id];
    if (!allowedHttpsUrl(signal.source?.url, GLOBAL_SOURCE_HOSTS)) {
      errors.push(`signal ${signal.id} source host is outside the allowlist`);
    }
    if (policySignal && displayContractChecksum(signal) !== policySignal.display_contract_sha256) {
      errors.push(`signal ${signal.id} display contract contradicts the pinned evidence policy`);
    }
    const sourceRetrieved = Date.parse(`${signal.source?.retrieved}T00:00:00Z`);
    if (!Number.isFinite(sourceRetrieved) || sourceRetrieved > asOf || sourceRetrieved > generatedAt) {
      errors.push(`signal ${signal.id} retrieval date must not follow as_of or generated_at`);
    }
    const hasPoints = (signal.series || []).some(({ points }) => points.length);
    if (signal.status === "available" && !hasPoints) {
      errors.push(`signal ${signal.id} is available but has no points`);
    }
    if (signal.status !== "available" && (hasPoints || signal.latest)) {
      errors.push(`signal ${signal.id} is ${signal.status} but contains available data`);
    }
    if (hasPoints && !adapter) {
      errors.push(`signal ${signal.id} with points requires an adapter contract`);
    }
    if (adapter && !policySignal) {
      errors.push(`signal ${signal.id} adapter is absent from the pinned evidence policy`);
    } else if (adapter && policySignal) {
      const policyMatches = signal.source.url === policySignal.source_url &&
        adapter.id === policySignal.adapter_id &&
        adapter.version === policySignal.adapter_version &&
        adapter.dataset_id === policySignal.dataset_id &&
        same(adapter.selected_fields, policySignal.selected_fields) &&
        same(normaliseRules(adapter.epistemic_rules), policySignal.classification_rules);
      if (!policyMatches) {
        errors.push(`signal ${signal.id} contradicts the pinned evidence policy`);
      }
    }
    for (const rule of adapter?.epistemic_rules || []) {
      if (rule.from_year !== undefined && rule.through_year !== undefined &&
          rule.from_year > rule.through_year) {
        errors.push(`signal ${signal.id} has an inverted epistemic rule year range`);
      }
    }
    for (const rawInputId of signal.source?.raw_input_ids || []) {
      referencedRawInputIds.add(rawInputId);
      if (!rawInputIds.has(rawInputId)) {
        errors.push(`signal ${signal.id} raw input ${rawInputId} is not declared`);
      } else if (!same(rawInputById.get(rawInputId).adapter, adapter)) {
        errors.push(`signal ${signal.id} adapter contract differs from raw input ${rawInputId}`);
      } else if (policySignal?.request_url &&
                 rawInputById.get(rawInputId).source_url !== policySignal.request_url) {
        errors.push(`signal ${signal.id} raw input source URL contradicts the pinned evidence policy`);
      }
    }
    const rawInputReferences = signal.source?.raw_input_ids || [];
    if (snapshot.reproducibility.raw_input_status === "captured_local_hash_consistent") {
      if (signal.status === "available" && signal.source?.url && !rawInputReferences.length) {
        errors.push(`signal ${signal.id} is missing captured raw input coverage`);
      }
      if (!signal.source?.url && rawInputReferences.length) {
        errors.push(`derived signal ${signal.id} must not reference publisher raw inputs`);
      }
      if (signal.status === "available" && signal.source?.url && rawInputReferences.length && adapter) {
        try {
          const transformed = transformRawInputs(signal, rawBytesById);
          const actual = [...(signal.series || [])].sort((a, b) => a.entity.localeCompare(b.entity));
          if (!same(transformed, actual)) {
            errors.push(`raw transform for ${signal.id} does not match snapshot series`);
          }
        } catch (error) {
          errors.push(`raw transform for ${signal.id} failed: ${error.message}`);
        }
      }
    }
    for (const [seriesIndex, series] of (signal.series || []).entries()) {
      if (!entityIds.has(series.entity)) {
        errors.push(`signal ${signal.id} series ${seriesIndex} entity ${series.entity} is not declared`);
      }
      for (let pointIndex = 1; pointIndex < series.points.length; pointIndex += 1) {
        if (series.points[pointIndex][0] <= series.points[pointIndex - 1][0]) {
          errors.push(`signal ${signal.id} series ${seriesIndex} point years must be strictly increasing`);
          break;
        }
      }
      for (const point of series.points) {
        const [year, , epistemicClass, inputEpistemicClasses] = point;
        const asOfYear = Number(snapshot.as_of?.slice(0, 4));
        if (year > asOfYear && epistemicClass !== "forecast") {
          errors.push(`signal ${signal.id} future point ${year} must use forecast class`);
        }
        if (epistemicClass === "forecast" && year <= asOfYear) {
          errors.push(`signal ${signal.id} forecast point ${year} must be later than as_of year`);
        }
        if (epistemicClass === "derived" && point.length !== 4) {
          errors.push(`signal ${signal.id} derived point ${year} must preserve input epistemic classes`);
        }
        if (epistemicClass !== "derived" && point.length !== 3) {
          errors.push(`signal ${signal.id} source point ${year} must not claim derived input lineage`);
        }
        if (epistemicClass === "derived" && !inputEpistemicClasses?.length) {
          errors.push(`signal ${signal.id} derived point ${year} has empty input epistemic classes`);
        }
        const rules = (adapter?.epistemic_rules || []).filter((rule) =>
          (rule.from_year === undefined || year >= rule.from_year) &&
          (rule.through_year === undefined || year <= rule.through_year)
        );
        if (rules.length !== 1) {
          errors.push(`signal ${signal.id} year ${year} must match exactly one epistemic rule`);
        } else if (rules[0].epistemic_class !== epistemicClass) {
          errors.push(
            `signal ${signal.id} year ${year} class ${epistemicClass} contradicts adapter rule ${rules[0].epistemic_class}`,
          );
        }
      }
    }

    if (signal.latest) {
      if (!entityIds.has(signal.latest.entity)) {
        errors.push(`signal ${signal.id} latest entity ${signal.latest.entity} is not declared`);
      }
      const matchingSeries = (signal.series || []).filter(({ entity }) => entity === signal.latest.entity);
      if (matchingSeries.length !== 1) {
        errors.push(`signal ${signal.id} latest must identify exactly one series`);
      } else {
        const lastPoint = matchingSeries[0].points.at(-1);
        if (!lastPoint || lastPoint[0] !== signal.latest.year || lastPoint[1] !== signal.latest.value ||
            lastPoint[2] !== signal.latest.epistemic_class ||
            !same(lastPoint[3], signal.latest.input_epistemic_classes)) {
          errors.push(`signal ${signal.id} latest must match its series last point`);
        }
      }
    }
  }

  const freshnessLimits = policy.freshness_policy?.signal_max_age_years || {};
  for (const signal of signals.filter(({ status }) => status === "available")) {
    if (!Number.isInteger(freshnessLimits[signal.id]) || freshnessLimits[signal.id] < 0) {
      errors.push(`signal ${signal.id} requires a policy-governed freshness limit`);
    }
  }

  for (const rawInputId of rawInputIds) {
    if (!referencedRawInputIds.has(rawInputId)) {
      errors.push(`unreferenced raw input ${rawInputId} cannot support a captured claim`);
    }
  }

  const headline = signals.find(({ id }) => id === "engels-divergence");
  if (headline) {
    const byEntity = new Map();
    for (const series of headline.series || []) {
      if (!byEntity.has(series.entity)) byEntity.set(series.entity, []);
      byEntity.get(series.entity).push(series);
    }
    for (const [entity, series] of byEntity) {
      const output = series.filter(({ measure }) => measure === "Output per capita");
      const labour = series.filter(({ measure }) => measure === "Labour income per capita");
      if (output.length !== 1 || labour.length !== 1) {
        errors.push(`headline paired series for ${entity} must contain one output and one labour-income measure`);
        continue;
      }
      const outputYears = output[0].points.map(([year]) => year);
      const labourYears = labour[0].points.map(([year]) => year);
      if (outputYears.length !== labourYears.length ||
          outputYears.some((year, index) => year !== labourYears[index])) {
        errors.push(`headline paired series for ${entity} must have aligned years`);
      }
    }
  }

  const recomputed = recomputeEngels(signals);
  const divergence = signals.find(({ id }) => id === "engels-divergence");
  const transmissionGap = signals.find(({ id }) => id === "transmission-gap");
  if (!divergence || !same(divergence.series, recomputed.divergence)) {
    errors.push("recomputed derived signal engels-divergence does not match snapshot");
  }
  if (!transmissionGap || !same(transmissionGap.series, recomputed.gap)) {
    errors.push("recomputed derived signal transmission-gap does not match snapshot");
  } else {
    const world = recomputed.gap.find(({ entity }) => entity === "OWID_WRL")?.points;
    const lastPoint = world?.at(-1);
    const expectedLatest = lastPoint ? {
      entity: "OWID_WRL",
      year: lastPoint[0],
      value: lastPoint[1],
      epistemic_class: lastPoint[2],
      input_epistemic_classes: lastPoint[3],
    } : undefined;
    if (!same(transmissionGap.latest, expectedLatest)) {
      errors.push("recomputed derived signal transmission-gap latest does not match snapshot");
    }
  }

  const update = snapshot.public_update;
  if (update && (update.observed.vintage !== snapshot.snapshot_id ||
                 !update.update_id.endsWith(snapshot.snapshot_id))) {
    errors.push("public_update identity and vintage must match the snapshot revision");
  }
  if (update && !entityIds.has(update.scope.entity)) {
    errors.push(`public_update.scope.entity ${update.scope.entity} is not declared`);
  }
  for (const id of update?.observed?.source_signal_ids || []) {
    if (!signalIds.has(id)) errors.push(`public_update source signal ${id} is not declared`);
  }
  const publicContract = policy.public_update_contract;
  const publicArithmetic = expectedPublicArithmetic(recomputed.divergence, publicContract?.entity);
  if (update && (update.scope.period !== publicArithmetic.period ||
                 update.observed.summary !== publicArithmetic.summary)) {
    errors.push("public_update arithmetic does not match recomputed derived series");
  }
  const publicLineage = expectedPublicLineage(signals, update);
  if (update && !same(update.lineage, publicLineage)) {
    errors.push("public_update lineage does not match recomputed source and derived points");
  }
  const expectedScope = publicContract && {
    entity: publicLineage?.entity,
    population: publicContract.population,
    place: publicContract.place,
    period: publicArithmetic.period,
  };
  const expectedObserved = publicContract && {
    summary: publicArithmetic.summary,
    measure: publicContract.observed_measure,
    source_signal_ids: publicContract.observed_source_signal_ids,
    vintage: snapshot.snapshot_id,
    uncertainty: publicContract.observed_uncertainty,
    epistemic_class: publicContract.observed_epistemic_class,
  };
  if (update && (!same(update.scope, expectedScope) ||
                 update.lineage?.derivation_id !== publicContract?.derivation_id ||
                 update.lineage?.entity !== publicContract?.entity)) {
    errors.push("public_update scope must match pinned policy and recomputed lineage");
  }
  if (update && !same(update.observed, expectedObserved)) {
    errors.push("public_update observed block must match pinned policy and recomputed lineage");
  }
  const conditions = snapshot.if_path?.conditions || [];
  const conditionIds = conditions.map(({ id }) => id);
  if (new Set(conditionIds).size !== conditionIds.length) {
    errors.push("if_path condition identifiers must be unique");
  }
  const positions = conditions.map(({ position }) => position);
  if (new Set(positions).size !== positions.length) {
    errors.push("if_path condition positions must be unique");
  }
  for (const condition of conditions) {
    for (const id of condition.source_signal_ids || []) {
      if (!signalIds.has(id)) errors.push(`if_path condition ${condition.id} source signal ${id} is not declared`);
    }
  }
  const updateConditionIds = update?.condition_change?.condition_ids || [];
  if (conditionIds.length && (
    conditionIds.length !== updateConditionIds.length ||
    conditionIds.some((id, index) => id !== updateConditionIds[index])
  )) {
    errors.push("public_update condition identifiers must match the ordered if_path conditions");
  }
  if (snapshot.if_path?.decision?.result === "no_decision" && snapshot.if_path.decision.eligible_actions.length) {
    errors.push("an if_path with no decision cannot contain eligible actions");
  }
  for (const crisis of snapshot.crises || []) {
    for (const id of crisis.leading_signals || []) {
      if (!signalIds.has(id)) errors.push(`crisis ${crisis.id} source signal ${id} is not declared`);
    }
  }
  if (update?.action?.authorization_state === "none" &&
      (update.action.owner || update.action.authority || update.action.help_route || update.action.appeal_route)) {
    errors.push("an unauthorised public update cannot claim an owner, authority, help route or appeal route");
  }
  if (update?.next_check?.related_to_inference && (!update.next_check.on || !update.next_check.owner)) {
    errors.push("a next check linked to the inference requires a date and owner");
  }
  return errors;
}

function verifyRawInputs(snapshot) {
  const verified = new Map();
  for (const rawInput of snapshot.reproducibility?.raw_inputs || []) {
    const inputPath = resolve(dashboard, rawInput.path);
    const evidenceRoot = `${resolve(dashboard, "evidence", "raw")}/`;
    if (!inputPath.startsWith(evidenceRoot)) {
      throw new Error(`raw input ${rawInput.id} path escapes dashboard/evidence/raw`);
    }
    const bytes = readFileSync(inputPath);
    const digest = createHash("sha256").update(bytes).digest("hex");
    if (bytes.length !== rawInput.byte_length) {
      throw new Error(`raw input ${rawInput.id} byte length mismatch before transform`);
    }
    if (digest !== rawInput.sha256) {
      throw new Error(`raw input ${rawInput.id} sha256 mismatch before transform`);
    }
    verified.set(rawInput.id, bytes);
  }
  return verified;
}

try {
  const template = readFileSync(templatePath, "utf8");
  const placeholderCount = template.split("__SNAPSHOT__").length - 1;
  if (placeholderCount !== 1) {
    throw new Error(`Expected one __SNAPSHOT__ placeholder, found ${placeholderCount}`);
  }
  const freshnessPlaceholderCount = template.split("__FRESHNESS_POLICY__").length - 1;
  if (freshnessPlaceholderCount !== 1) {
    throw new Error(`Expected one __FRESHNESS_POLICY__ placeholder, found ${freshnessPlaceholderCount}`);
  }

  const snapshotBytes = readFileSync(snapshotPath);
  const snapshot = JSON.parse(snapshotBytes.toString("utf8"));
  const schema = JSON.parse(readFileSync(schemaPath, "utf8"));
  const policyBytes = readFileSync(policyPath);
  const policyDigest = createHash("sha256").update(policyBytes).digest("hex");
  if (policyDigest !== POLICY_SHA256) {
    throw new Error("pinned evidence policy checksum mismatch");
  }
  const policy = JSON.parse(policyBytes.toString("utf8"));
  const ajv = new Ajv2020({ allErrors: true, strict: true });
  addFormats(ajv);
  const validate = ajv.compile(schema);
  if (!validate(snapshot)) {
    throw new Error(`snapshot schema validation failed: ${ajv.errorsText(validate.errors)}`);
  }
  const modeArgument = process.argv.slice(4).find((argument) => argument.startsWith("--mode="));
  const buildMode = modeArgument?.slice("--mode=".length) || "research-draft";
  if (!new Set(["research-draft", "publishable"]).has(buildMode)) {
    throw new Error(`unsupported dashboard build mode ${buildMode}`);
  }
  if (buildMode === "publishable") {
    throw new Error(
      "MISSING_TRUSTED_ACQUISITION_BOUNDARY: publishable mode is disabled until source receipts are separately verifiable",
    );
  }
  const rawBytesById = verifyRawInputs(snapshot);
  const correction = correctionContext(snapshot);
  const semanticErrors = validateSemantics(
    snapshot,
    policy,
    `sha256:${policyDigest}`,
    rawBytesById,
    correction,
  );
  if (semanticErrors.length) {
    throw new Error(`snapshot semantic validation failed: ${semanticErrors.join("; ")}`);
  }
  const bindingErrors = indexedSnapshotBinding(snapshot, snapshotBytes);
  if (bindingErrors.length) {
    throw new Error(`snapshot semantic validation failed: ${bindingErrors.join("; ")}`);
  }
  const serialised = JSON.stringify(snapshot).replaceAll("</", "<\\/");
  const freshnessPolicy = JSON.stringify(policy.freshness_policy).replaceAll("</", "<\\/");
  writeFileSync(
    outputPath,
    template.replace("__SNAPSHOT__", serialised).replace("__FRESHNESS_POLICY__", freshnessPolicy),
    "utf8",
  );
  process.stdout.write(`Built ${outputPath} from ${snapshotPath}\n`);
} catch (error) {
  process.stderr.write(`Dashboard build failed: ${error.message}\n`);
  process.exitCode = 1;
}
