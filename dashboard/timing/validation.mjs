import { createHash } from "node:crypto";

import Ajv2020 from "ajv/dist/2020.js";
import addFormats from "ajv-formats";

const STRICT_UTC = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/;
const STRICT_DATE = /^\d{4}-\d{2}-\d{2}$/;
const DAY_MS = 24 * 60 * 60 * 1000;

export function compareRecordIds(left, right) {
  const parse = (value) => {
    const match = /^(\d{4}-\d{2}-\d{2})\.r([1-9][0-9]*)$/.exec(value || "");
    if (!match) throw new Error(`Invalid record identity ${value}`);
    return { date: match[1], revision: Number(match[2]) };
  };
  const first = parse(left);
  const second = parse(right);
  if (first.date !== second.date) return first.date < second.date ? -1 : 1;
  return Math.sign(first.revision - second.revision);
}

export function validateSnapshotIndex(index, records = [], schemas = {}) {
  const errors = [];
  const entries = Array.isArray(index?.snapshots) ? index.snapshots : [];
  if (index?.schema_version !== "2.0.0" || !entries.length) {
    errors.push(problem(
      "SNAPSHOT_INDEX_SHAPE_INVALID",
      "$",
      "Snapshot index 2.0 must contain at least one record.",
    ));
    return { valid: false, errors };
  }
  const ids = entries.map(({ id }) => id);
  const paths = entries.map(({ path }) => path);
  const digests = entries.map(({ sha256 }) => sha256);
  if (new Set(ids).size !== ids.length) {
    errors.push(problem(
      "SNAPSHOT_INDEX_ID_DUPLICATE",
      "$.snapshots",
      "Snapshot index record identities must be unique.",
    ));
  }
  if (new Set(paths).size !== paths.length) {
    errors.push(problem(
      "SNAPSHOT_INDEX_PATH_DUPLICATE",
      "$.snapshots",
      "Snapshot index paths must be unique.",
    ));
  }
  if (new Set(digests).size !== digests.length) {
    errors.push(problem(
      "SNAPSHOT_INDEX_DIGEST_DUPLICATE",
      "$.snapshots",
      "Snapshot index record digests must be unique.",
    ));
  }
  for (const [position, entry] of entries.entries()) {
    if (typeof entry.path !== "string" ||
        !/^[A-Za-z0-9][A-Za-z0-9._-]*\.json$/.test(entry.path)) {
      errors.push(problem(
        "SNAPSHOT_INDEX_PATH_INVALID",
        `$.snapshots[${position}].path`,
        "Snapshot index paths must be normalised JSON basenames.",
      ));
    }
    let parsedIdentity = null;
    try {
      compareRecordIds(entry.id, entry.id);
      parsedIdentity = entry.id.split(".r", 1)[0];
    } catch {
      errors.push(problem(
        "SNAPSHOT_INDEX_ID_INVALID",
        `$.snapshots[${position}].id`,
        "Snapshot index identity must be a dated revision identity.",
      ));
    }
    if (parsedIdentity !== null && parsedIdentity !== entry.snapshot_id) {
      errors.push(problem(
        "SNAPSHOT_INDEX_DATE_MISMATCH",
        `$.snapshots[${position}]`,
        "Snapshot index record date must equal its snapshot date.",
      ));
    }
    if (position > 0) {
      try {
        if (compareRecordIds(entries[position - 1].id, entry.id) >= 0) {
          errors.push(problem(
            "SNAPSHOT_INDEX_ORDER_INVALID",
            `$.snapshots[${position}]`,
            "Snapshot index records must be strictly increasing.",
          ));
        }
      } catch {
        // The invalid identity is reported against its own entry above.
      }
    }
  }
  if (index.latest !== entries.at(-1)?.id) {
    errors.push(problem(
      "SNAPSHOT_INDEX_LATEST_INVALID",
      "$.latest",
      "Snapshot index latest must equal its final strictly ordered record.",
    ));
  }
  if (records.length !== entries.length) {
    errors.push(problem(
      "SNAPSHOT_INDEX_RECORD_SET_INCOMPLETE",
      "$.snapshots",
      "Every indexed record must be loaded and verified.",
    ));
  }
  const parsedSnapshots = [];
  const schemaValidators = new Map();
  function validatorFor(version) {
    if (schemaValidators.has(version)) return schemaValidators.get(version);
    const registered = schemas[version];
    if (!registered) return null;
    const schema = registered.schema || registered;
    const ajv = new Ajv2020({ allErrors: true, strict: true });
    addFormats(ajv);
    for (const dependency of registered.dependencies || []) ajv.addSchema(dependency);
    const validate = ajv.compile(schema);
    const result = { ajv, validate };
    schemaValidators.set(version, result);
    return result;
  }
  for (const [position, record] of records.entries()) {
    const entry = entries[position];
    if (!entry || !record?.entry || record.entry.id !== entry.id ||
        record.entry.path !== entry.path || !record?.bytes) {
      errors.push(problem(
        "SNAPSHOT_INDEX_RECORD_UNRESOLVED",
        `$.snapshots[${position}]`,
        "Indexed record bytes must correspond to the entry at the same position.",
      ));
      continue;
    }
    const digest = `sha256:${createHash("sha256").update(record.bytes).digest("hex")}`;
    if (digest !== entry.sha256) {
      errors.push(problem(
        "SNAPSHOT_INDEX_DIGEST_MISMATCH",
        `$.snapshots[${position}].sha256`,
        "Indexed digest must equal the exact record bytes.",
      ));
    }
    let snapshot;
    try {
      snapshot = JSON.parse(Buffer.from(record.bytes).toString("utf8"));
    } catch {
      errors.push(problem(
        "SNAPSHOT_INDEX_RECORD_INVALID",
        `$.snapshots[${position}]`,
        "Indexed record must contain valid JSON.",
      ));
      continue;
    }
    parsedSnapshots[position] = snapshot;
    const schemaValidator = validatorFor(entry.schema_version);
    if (!schemaValidator) {
      errors.push(problem(
        "SNAPSHOT_INDEX_SCHEMA_UNAVAILABLE",
        `$.snapshots[${position}].schema_version`,
        "Every historical record requires its exact declared snapshot schema.",
      ));
    } else if (!schemaValidator.validate(snapshot)) {
      errors.push(problem(
        "SNAPSHOT_INDEX_RECORD_SCHEMA_INVALID",
        `$.snapshots[${position}]`,
        `Indexed record does not satisfy schema ${entry.schema_version}: ${schemaValidator.ajv.errorsText(schemaValidator.validate.errors)}`,
      ));
    }
    if (snapshot.snapshot_id !== entry.snapshot_id || snapshot.schema_version !== entry.schema_version) {
      errors.push(problem(
        "SNAPSHOT_INDEX_METADATA_MISMATCH",
        `$.snapshots[${position}]`,
        "Indexed identity and schema must equal the record contents.",
      ));
    }
    if (snapshot.record_id !== undefined && snapshot.record_id !== entry.id) {
      errors.push(problem(
        "SNAPSHOT_INDEX_RECORD_ID_MISMATCH",
        `$.snapshots[${position}].id`,
        "Indexed record identity must equal the record contents.",
      ));
    }
  }
  const entriesByDate = new Map();
  for (const [position, entry] of entries.entries()) {
    const match = /^(\d{4}-\d{2}-\d{2})\.r([1-9][0-9]*)$/.exec(entry.id || "");
    if (!match) continue;
    if (!entriesByDate.has(match[1])) entriesByDate.set(match[1], []);
    entriesByDate.get(match[1]).push({ position, revision: Number(match[2]), entry });
  }
  for (const revisions of entriesByDate.values()) {
    revisions.sort((left, right) => left.revision - right.revision);
    if (revisions[0]?.revision !== 1) {
      errors.push(problem(
        "SNAPSHOT_INDEX_REVISION_GAP",
        "$.snapshots",
        "Every snapshot date must begin at revision 1.",
      ));
    }
    const first = revisions[0];
    const firstSnapshot = parsedSnapshots[first?.position];
    const firstCorrection = firstSnapshot?.correction;
    if (first?.revision === 1 &&
        Number(firstSnapshot?.schema_version?.split(".")[0]) >= 2 &&
        firstCorrection) {
      errors.push(problem(
        "SNAPSHOT_INDEX_UNEXPECTED_CORRECTION",
        `$.snapshots[${first.position}]`,
        "A schema 2.x first revision begins a new evidence date and cannot correct another date.",
      ));
    }
    if (first?.revision === 1 && first.position > 0 && firstCorrection &&
        Number(firstSnapshot?.schema_version?.split(".")[0]) < 2) {
      const previousEntry = entries[first.position - 1];
      if (firstCorrection.supersedes_snapshot_id !== previousEntry.snapshot_id ||
          (firstCorrection.supersedes_record_id !== undefined &&
           firstCorrection.supersedes_record_id !== previousEntry.id)) {
        errors.push(problem(
          "SNAPSHOT_INDEX_CORRECTION_CHAIN_INVALID",
          `$.snapshots[${first.position}]`,
          "A legacy cross-date correction must supersede the immediately prior indexed record.",
        ));
      }
      if (firstCorrection.supersedes_snapshot_sha256 !== previousEntry.sha256) {
        errors.push(problem(
          "SNAPSHOT_INDEX_PREDECESSOR_DIGEST_MISMATCH",
          `$.snapshots[${first.position}]`,
          "A legacy cross-date correction must bind the exact bytes of the immediately prior indexed record.",
        ));
      }
    }
    for (let index = 1; index < revisions.length; index += 1) {
      const previous = revisions[index - 1];
      const current = revisions[index];
      if (current.revision !== previous.revision + 1) {
        errors.push(problem(
          "SNAPSHOT_INDEX_REVISION_GAP",
          `$.snapshots[${current.position}].id`,
          "Same-date corrections must form a contiguous revision sequence.",
        ));
      }
      const correction = parsedSnapshots[current.position]?.correction;
      if (correction?.supersedes_record_id !== previous.entry.id ||
          correction?.supersedes_snapshot_id !== current.entry.snapshot_id) {
        errors.push(problem(
          "SNAPSHOT_INDEX_CORRECTION_CHAIN_INVALID",
          `$.snapshots[${current.position}]`,
          "Every corrected revision must supersede exactly the prior same-date revision.",
        ));
      }
      if (correction?.supersedes_snapshot_sha256 !== previous.entry.sha256) {
        errors.push(problem(
          "SNAPSHOT_INDEX_PREDECESSOR_DIGEST_MISMATCH",
          `$.snapshots[${current.position}]`,
          "Every corrected revision must bind the exact indexed bytes of its predecessor.",
        ));
      }
      const previousGeneratedAt = exactInstant(parsedSnapshots[previous.position]?.generated_at);
      const currentGeneratedAt = exactInstant(parsedSnapshots[current.position]?.generated_at);
      if (previousGeneratedAt === null || currentGeneratedAt === null ||
          currentGeneratedAt <= previousGeneratedAt) {
        errors.push(problem(
          "SNAPSHOT_INDEX_GENERATED_AT_ORDER_INVALID",
          `$.snapshots[${current.position}]`,
          "Same-date correction generation times must be exact and strictly increasing.",
        ));
      }
    }
  }
  return { valid: errors.length === 0, errors };
}

function problem(code, path, message) {
  return { code, path, message };
}

function exactInstant(value) {
  if (!STRICT_UTC.test(value || "")) return null;
  const parsed = Date.parse(value);
  if (!Number.isFinite(parsed) || new Date(parsed).toISOString().replace(".000Z", "Z") !== value) {
    return null;
  }
  return parsed;
}

function calendarDay(value) {
  if (!STRICT_DATE.test(value || "")) return null;
  const start = Date.parse(`${value}T00:00:00Z`);
  if (!Number.isFinite(start) || new Date(start).toISOString().slice(0, 10) !== value) return null;
  return { lower: start, upper: start + DAY_MS, precision: "calendar_date" };
}

function zonedParts(epoch, timeZone) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(epoch);
  return Object.fromEntries(parts.filter(({ type }) => type !== "literal")
    .map(({ type, value }) => [type, Number(value)]));
}

function zonedMidnight(value, timeZone) {
  if (!STRICT_DATE.test(value || "") || !validTimeZone(timeZone) || timeZone === "unspecified") {
    return null;
  }
  const [year, month, day] = value.split("-").map(Number);
  const target = Date.UTC(year, month - 1, day);
  let guess = target;
  for (let attempt = 0; attempt < 4; attempt += 1) {
    const parts = zonedParts(guess, timeZone);
    const represented = Date.UTC(
      parts.year, parts.month - 1, parts.day, parts.hour, parts.minute, parts.second,
    );
    const next = guess - (represented - target);
    if (next === guess) break;
    guess = next;
  }
  const resolved = zonedParts(guess, timeZone);
  return resolved.year === year && resolved.month === month && resolved.day === day &&
      resolved.hour === 0 && resolved.minute === 0 && resolved.second === 0
    ? guess
    : null;
}

function zonedCalendarDay(value, timeZone) {
  if (timeZone === "unspecified") {
    const day = calendarDay(value);
    return day === null ? null : { ...day, precision: "local_calendar_date_unspecified" };
  }
  const lower = zonedMidnight(value, timeZone);
  const nextValue = calendarDay(value);
  if (lower === null || nextValue === null) return null;
  const nextDate = new Date(nextValue.lower + DAY_MS).toISOString().slice(0, 10);
  const upper = zonedMidnight(nextDate, timeZone);
  return upper === null ? null : { lower, upper, precision: "zoned_calendar_date" };
}

function retrievalInterval(retrieval) {
  if (retrieval?.kind === "exact") {
    const at = exactInstant(retrieval.at);
    return at === null ? null : { lower: at, upper: at, precision: "exact" };
  }
  if (retrieval?.kind === "calendar_date") return calendarDay(retrieval.on);
  return null;
}

function releaseInterval(release) {
  if (release?.kind === "publisher_declared_instant") {
    const at = exactInstant(release.at);
    return at === null ? null : { lower: at, upper: at, precision: "exact" };
  }
  if (release?.kind === "publisher_declared_date") return calendarDay(release.on);
  if (release?.kind === "publisher_declared_local_date") {
    return zonedCalendarDay(release.on, release.timezone);
  }
  if (release?.kind === "observed_availability") {
    const firstSeen = exactInstant(release.first_seen?.at);
    const notSeen = release.not_seen === null ? null : exactInstant(release.not_seen?.at);
    if (firstSeen === null || (release.not_seen !== null && notSeen === null)) return null;
    return {
      lower: notSeen,
      upper: firstSeen,
      precision: "availability_interval",
      lower_exclusive: notSeen !== null,
    };
  }
  return null;
}

function assessmentInterval(assessment) {
  if (assessment?.kind === "exact") {
    const at = exactInstant(assessment.at);
    return at === null ? null : { lower: at, upper: at, precision: "exact" };
  }
  if (assessment?.kind === "calendar_date") return calendarDay(assessment.on);
  return null;
}

function validTimeZone(value) {
  if (value === "unspecified") return true;
  try {
    new Intl.DateTimeFormat("en-AU", { timeZone: value }).format(0);
    return true;
  } catch {
    return false;
  }
}

function intervalAgainstCutoff(interval, cutoff) {
  if (!interval || cutoff === null) return "unknown";
  if (interval.precision === "exact") return interval.upper <= cutoff ? "by_cutoff" : "after_cutoff";
  if (interval.precision === "local_calendar_date_unspecified") {
    const cutoffDate = new Date(cutoff).toISOString().slice(0, 10);
    const intervalDate = new Date(interval.lower).toISOString().slice(0, 10);
    if (intervalDate > cutoffDate) return "after_cutoff";
    return "order_unproven";
  }
  if (interval.upper <= cutoff) return "by_cutoff";
  if (interval.lower !== null && (
    interval.lower > cutoff ||
    (interval.lower === cutoff && interval.lower_exclusive)
  )) return "after_cutoff";
  return "order_unproven";
}

function intervalOrder(release, retrieval) {
  if (!release || !retrieval) return "unknown";
  if (release.precision === "local_calendar_date_unspecified") return "unknown_local_date_precision";
  if (release.precision === "exact" && retrieval.precision === "exact") {
    return release.upper <= retrieval.lower
      ? "release_before_or_at_retrieval"
      : "invalid_release_after_retrieval";
  }
  if (release.upper <= retrieval.lower) return "release_before_or_at_retrieval";
  if (release.lower !== null && release.lower >= retrieval.upper) {
    return "invalid_release_after_retrieval";
  }
  if (
    release.precision === "calendar_date" &&
    retrieval.precision === "calendar_date" &&
    release.lower === retrieval.lower
  ) return "unknown_same_day_precision";
  return "unknown_interval_overlap";
}

function metadataBindings(timing) {
  const bindings = [];
  if (timing?.publisher_vintage?.status === "known") {
    bindings.push({
      path: "$.publisher_vintage",
      claim: "publisher_vintage",
      expected: timing.publisher_vintage.id,
      evidence: timing.publisher_vintage.evidence,
    });
  }
  const release = timing?.publisher_release;
  if ([
    "publisher_declared_instant",
    "publisher_declared_date",
    "publisher_declared_local_date",
  ].includes(release?.kind)) {
    bindings.push({
      path: "$.publisher_release",
      claim: "publisher_release",
      expected: release.at ?? release.on,
      evidence: release.evidence,
    });
  }
  return bindings;
}

function matchingExtractions(binding, extractedMetadata) {
  return (extractedMetadata || []).filter((candidate) =>
    candidate.raw_input_id === binding.evidence?.raw_input_id &&
    candidate.adapter_id === binding.evidence?.adapter_id &&
    candidate.adapter_version === binding.evidence?.adapter_version &&
    candidate.field_pointer === binding.evidence?.field_pointer
  );
}

function canonicalJson(value) {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.keys(value).sort().map((key) =>
      `${JSON.stringify(key)}:${canonicalJson(value[key])}`).join(",")}}`;
  }
  return JSON.stringify(value);
}

function decodePointerToken(token) {
  return token.replace(/~1/g, "/").replace(/~0/g, "~");
}

function valueAtJsonPointer(document, pointer) {
  if (pointer === "") return document;
  if (typeof pointer !== "string" || !pointer.startsWith("/")) {
    throw new Error(`Invalid JSON pointer ${pointer}`);
  }
  let value = document;
  for (const encodedToken of pointer.slice(1).split("/")) {
    const token = decodePointerToken(encodedToken);
    if (Array.isArray(value)) {
      if (!/^(?:0|[1-9][0-9]*)$/.test(token) || Number(token) >= value.length) {
        throw new Error(`JSON pointer ${pointer} does not resolve exactly one value`);
      }
      value = value[Number(token)];
    } else if (value && typeof value === "object" && Object.hasOwn(value, token)) {
      value = value[token];
    } else {
      throw new Error(`JSON pointer ${pointer} does not resolve exactly one value`);
    }
  }
  return value;
}

export function extractTimingMetadata(rawInput, responseBytes) {
  const fields = rawInput?.adapter?.timing_fields || [];
  if (!fields.length) return [];
  const mediaType = rawInput?.media_type?.split(";", 1)[0].trim().toLowerCase();
  if (mediaType !== "application/json" && !mediaType?.endsWith("+json")) {
    throw new Error("Timing metadata extraction requires JSON response bytes.");
  }
  let document;
  try {
    document = JSON.parse(Buffer.from(responseBytes).toString("utf8"));
  } catch (error) {
    throw new Error(`Timing metadata extraction could not parse JSON response bytes: ${error.message}`);
  }
  const seen = new Set();
  return fields.map(({ field_pointer: fieldPointer }) => {
    const identity = [
      rawInput.id,
      rawInput.adapter.id,
      rawInput.adapter.version,
      fieldPointer,
    ].join("\0");
    if (seen.has(identity)) {
      throw new Error(`Timing metadata field ${fieldPointer} is registered more than once.`);
    }
    seen.add(identity);
    let value;
    try {
      value = valueAtJsonPointer(document, fieldPointer);
    } catch (error) {
      if (/does not resolve exactly one value/.test(error.message)) return null;
      throw error;
    }
    if (typeof value !== "string") {
      throw new Error(`Timing metadata field ${fieldPointer} must resolve to a string.`);
    }
    return {
      raw_input_id: rawInput.id,
      adapter_id: rawInput.adapter.id,
      adapter_version: rawInput.adapter.version,
      field_pointer: fieldPointer,
      value,
    };
  }).filter(Boolean);
}

function receiptDigest(receipt) {
  const { id: ignored, ...payload } = receipt;
  return `sha256:${createHash("sha256").update(canonicalJson(payload)).digest("hex")}`;
}

export function validateRawInputTiming(rawInput, asOf) {
  const errors = [];
  const retrievedAt = exactInstant(rawInput?.retrieved_at);
  const acquiredAt = exactInstant(rawInput?.acquired_at);
  const cutoff = exactInstant(asOf);
  if (retrievedAt === null) {
    errors.push(problem("RETRIEVAL_TIME_INVALID", "$.retrieved_at", "Retrieval must be an exact UTC instant."));
  }
  if (acquiredAt === null) {
    errors.push(problem("ACQUISITION_TIME_INVALID", "$.acquired_at", "Acquisition must be an exact UTC instant."));
  }
  if (cutoff === null) {
    errors.push(problem("EVIDENCE_CUTOFF_INVALID", "$.as_of", "Evidence cut-off must be an exact UTC instant."));
  }
  if (retrievedAt !== null && acquiredAt !== null && acquiredAt < retrievedAt) {
    errors.push(problem(
      "ACQUISITION_BEFORE_RETRIEVAL",
      "$.acquired_at",
      "Stored and verified bytes cannot predate completion of the response.",
    ));
  }
  if (acquiredAt !== null && cutoff !== null && acquiredAt > cutoff) {
    errors.push(problem(
      "ACQUISITION_AFTER_EVIDENCE_CUTOFF",
      "$.acquired_at",
      "Acquired bytes cannot follow the snapshot evidence cut-off.",
    ));
  }
  if (retrievedAt !== null && cutoff !== null && retrievedAt > cutoff) {
    errors.push(problem(
      "RETRIEVAL_AFTER_EVIDENCE_CUTOFF",
      "$.retrieved_at",
      "Retrieval cannot follow the snapshot evidence cut-off.",
    ));
  }
  return { valid: errors.length === 0, errors };
}

export function validateTimingRule(rule) {
  const errors = [];
  if (rule?.kind === "not_applicable") {
    return { valid: true, errors };
  }
  if (rule?.kind === "derived") {
    const dependencies = rule.inherits_from_signal_ids || [];
    if (typeof rule.derivation_id !== "string" || !rule.derivation_id ||
        !dependencies.length || new Set(dependencies).size !== dependencies.length) {
      errors.push(problem(
        "DERIVATION_RULE_INVALID",
        "$",
        "A derived timing rule needs one derivation identity and unique dependencies.",
      ));
      return { valid: false, errors };
    }
    const binding = rule.assessment_binding;
    if (binding?.kind === "public_update_source_points") {
      if (Object.keys(binding).length !== 1) {
        errors.push(problem(
          "ASSESSMENT_BINDING_INVALID",
          "$.assessment_binding",
          "A public-update binding has no free-form fields.",
        ));
      }
    } else if (binding?.kind === "latest_point_inputs") {
      const inputs = binding.inputs || [];
      const inputIds = inputs.map(({ signal_id: signalId }) => signalId);
      const inputTargets = inputs.map((input) => canonicalJson({
        signal_id: input.signal_id,
        year_offset: input.year_offset,
        measure: input.measure ?? null,
      }));
      const closedInputs = inputs.every((input) =>
        typeof input.signal_id === "string" && input.signal_id &&
        Number.isInteger(input.year_offset) &&
        ["baseline", "comparator", "endpoint"].includes(input.role) &&
        Object.keys(input).every((key) =>
          ["signal_id", "year_offset", "measure", "role"].includes(key)) &&
        (input.measure === undefined || (typeof input.measure === "string" && input.measure.length > 0))
      );
      if (Object.keys(binding).some((key) => !["kind", "inputs"].includes(key)) ||
          !closedInputs || !inputs.some(({ role }) => role === "endpoint") ||
          new Set(inputTargets).size !== inputTargets.length ||
          [...new Set(inputIds)].sort().join("\0") !== [...dependencies].sort().join("\0")) {
        errors.push(problem(
          "ASSESSMENT_BINDING_INVALID",
          "$.assessment_binding",
          "Latest-point inputs must uniquely bind all dependencies to role-labelled integer year offsets.",
        ));
      }
      for (const [index, input] of inputs.entries()) {
        const roleMatchesOffset = input.role === "endpoint"
          ? input.year_offset === 0
          : ["baseline", "comparator"].includes(input.role) && input.year_offset < 0;
        if (!roleMatchesOffset) {
          errors.push(problem(
            "ASSESSMENT_ROLE_OFFSET_INVALID",
            `$.assessment_binding.inputs[${index}]`,
            "Endpoint inputs must use offset 0; baseline and comparator inputs must precede the target year.",
          ));
        }
      }
    } else {
      errors.push(problem(
        "ASSESSMENT_BINDING_INVALID",
        "$.assessment_binding",
        "A derived timing rule must bind assessment lineage to a governed display target.",
      ));
    }
    return { valid: errors.length === 0, errors };
  }
  if (rule?.kind !== "external_dataset") {
    errors.push(problem("TIMING_RULE_KIND_INVALID", "$.kind", "Timing rule kind is unsupported."));
    return { valid: false, errors };
  }
  if (rule.reference_period_kind !== "calendar_year") {
    errors.push(problem(
      "REFERENCE_PERIOD_KIND_UNSUPPORTED",
      "$.reference_period_kind",
      "Only calendar-year reference periods are implemented in this revision.",
    ));
  }
  if (!Number.isInteger(rule.max_reference_lag_days) || rule.max_reference_lag_days < 0) {
    errors.push(problem(
      "REFERENCE_LAG_INVALID",
      "$.max_reference_lag_days",
      "Maximum reference lag must be a non-negative integer.",
    ));
  }
  const cadence = rule.release_cadence;
  const cadenceValid = cadence?.kind === "unknown"
    ? typeof cadence.reason === "string" && cadence.reason.length > 0 && Object.keys(cadence).length === 2
    : cadence?.kind === "maximum_interval" &&
      Number.isInteger(cadence.maximum_interval_days) && cadence.maximum_interval_days >= 0 &&
      Number.isInteger(cadence.grace_days) && cadence.grace_days >= 0 &&
      Object.keys(cadence).length === 3;
  if (!cadenceValid) {
    errors.push(problem(
      "RELEASE_CADENCE_INVALID",
      "$.release_cadence",
      "Release cadence must be closed and use non-negative integer intervals.",
    ));
  }
  return { valid: errors.length === 0, errors };
}

export function validateSourceTiming({
  timing,
  asOf,
  generatedAt,
  rawInputs = [],
  extractedMetadata = [],
  availabilityReceipts = [],
  sourceUrl = null,
}) {
  const errors = [];
  const cutoff = exactInstant(asOf);
  const generated = exactInstant(generatedAt);
  if (cutoff === null || generated === null || cutoff > generated) {
    errors.push(problem(
      "SNAPSHOT_TIME_ORDER_INVALID",
      "$",
      "Evidence cut-off and snapshot revision must be exact UTC instants in order.",
    ));
  }
  const rawInputById = new Map(rawInputs.map((rawInput) => [rawInput.id, rawInput]));
  for (const [index, rawInput] of rawInputs.entries()) {
    const result = validateRawInputTiming(rawInput, asOf);
    errors.push(...result.errors.map((error) => ({
      ...error,
      path: `$.raw_inputs[${index}]${error.path.slice(1)}`,
    })));
  }

  if (timing?.kind === "derived") {
    const computed = timing.computation?.kind === "exact"
      ? exactInstant(timing.computation.at)
      : null;
    if (timing.computation?.kind === "exact") {
      errors.push(problem(
        "INTERNAL_EVENT_PROVENANCE_UNIMPLEMENTED",
        "$.computation",
        "Exact computation clocks remain inadmissible until retained execution artifacts and a governed producer registry are implemented.",
      ));
    }
    if (timing.computation?.kind === "exact" &&
        (computed === null || (generated !== null && computed > generated))) {
      errors.push(problem(
        "DERIVATION_TIME_INVALID",
        "$.computation",
        "Derived computation must be an exact instant no later than snapshot revision.",
      ));
    } else if (timing.computation?.kind === "calendar_date") {
      errors.push(problem(
        "INTERNAL_EVENT_PROVENANCE_UNIMPLEMENTED",
        "$.computation",
        "Calendar-date computation clocks remain inadmissible until retained execution artifacts are implemented.",
      ));
      const order = intervalAgainstCutoff(assessmentInterval(timing.computation), generated);
      if (order !== "by_cutoff") {
        errors.push(problem(
          "DERIVATION_TIME_UNPROVEN",
          "$.computation",
          "Day precision cannot prove computation preceded the snapshot revision.",
        ));
      }
    }
    return { valid: errors.length === 0, errors };
  }

  if (timing?.kind === "instrument_gap") {
    const interval = assessmentInterval(timing.assessed_at);
    if (["exact", "calendar_date"].includes(timing.assessed_at?.kind)) {
      errors.push(problem(
        "INTERNAL_EVENT_PROVENANCE_UNIMPLEMENTED",
        "$.assessed_at",
        "Dated instrument assessments remain inadmissible until retained search artifacts and a governed producer registry are implemented.",
      ));
    }
    const order = intervalAgainstCutoff(interval, cutoff);
    if (order === "after_cutoff") {
      errors.push(problem(
        "ASSESSMENT_AFTER_EVIDENCE_CUTOFF",
        "$.assessed_at",
        "An instrument-gap assessment cannot follow the evidence cut-off.",
      ));
    } else if (order === "order_unproven") {
      errors.push(problem(
        "ASSESSMENT_ORDER_UNPROVEN",
        "$.assessed_at",
        "Day precision cannot prove a same-day assessment preceded the evidence cut-off.",
      ));
    }
    return { valid: errors.length === 0, errors };
  }

  if (timing?.kind !== "external_dataset") {
    errors.push(problem("SOURCE_TIMING_KIND_INVALID", "$.kind", "Source timing kind is unsupported."));
    return { valid: false, errors };
  }

  if (timing.publisher_release?.kind === "publisher_declared_local_date" &&
      !validTimeZone(timing.publisher_release.timezone)) {
    errors.push(problem(
      "PUBLISHER_TIMEZONE_INVALID",
      "$.publisher_release.timezone",
      "Publisher local-date timezone must be unspecified or a recognised IANA timezone.",
    ));
  }

  for (const binding of metadataBindings(timing)) {
    const rawInput = rawInputById.get(binding.evidence?.raw_input_id);
    if (!rawInput) {
      errors.push(problem(
        "TIMING_EVIDENCE_UNRESOLVED",
        binding.path,
        "Timing metadata must point to a selected retained raw input.",
      ));
      continue;
    }
    if (rawInput.adapter?.id !== binding.evidence?.adapter_id ||
        rawInput.adapter?.version !== binding.evidence?.adapter_version) {
      errors.push(problem(
        "TIMING_EVIDENCE_ADAPTER_MISMATCH",
        binding.path,
        "Timing evidence adapter identity must equal the retained raw input adapter.",
      ));
      continue;
    }
    const registeredField = (rawInput.adapter?.timing_fields || []).some((field) =>
      field.claim === binding.claim && field.field_pointer === binding.evidence?.field_pointer
    );
    if (!registeredField) {
      errors.push(problem(
        "TIMING_EVIDENCE_FIELD_UNREGISTERED",
        binding.path,
        "Timing metadata field must be registered for this claim by the retained adapter contract.",
      ));
      continue;
    }
    const extractions = matchingExtractions(binding, extractedMetadata);
    if (extractions.length > 1) {
      errors.push(problem(
        "TIMING_METADATA_DUPLICATE",
        binding.path,
        "Timing metadata identity must resolve to exactly one extraction.",
      ));
    } else if (extractions.length === 0) {
      errors.push(problem(
        "TIMING_METADATA_UNVERIFIED",
        binding.path,
        "Known publisher metadata requires a matching verified adapter extraction.",
      ));
    } else if (extractions[0].value !== binding.expected) {
      errors.push(problem(
        "TIMING_METADATA_MISMATCH",
        binding.path,
        "The asserted publisher metadata differs from the verified adapter extraction.",
      ));
    }
  }

  const retrieval = retrievalInterval(timing.retrieval);
  const retrievalCutoffOrder = intervalAgainstCutoff(retrieval, cutoff);
  if (retrievalCutoffOrder === "after_cutoff") {
    errors.push(problem(
      "RETRIEVAL_AFTER_EVIDENCE_CUTOFF",
      "$.retrieval",
      "Retrieval cannot follow the evidence cut-off.",
    ));
  } else if (retrievalCutoffOrder === "order_unproven") {
    errors.push(problem(
      "RETRIEVAL_ORDER_UNPROVEN",
      "$.retrieval",
      "Day precision cannot prove that same-day retrieval preceded the evidence cut-off.",
    ));
  }
  if (timing.retrieval?.kind === "exact") {
    const rawInput = rawInputById.get(timing.retrieval.raw_input_id);
    if (!rawInput) {
      errors.push(problem(
        "SOURCE_RETRIEVAL_EVIDENCE_UNRESOLVED",
        "$.retrieval.raw_input_id",
        "Exact source retrieval must identify a selected retained response.",
      ));
    } else if (rawInput.retrieved_at !== timing.retrieval.at) {
      errors.push(problem(
        "SOURCE_RETRIEVAL_MISMATCH",
        "$.retrieval.at",
        "Source retrieval must equal the selected raw response retrieval instant.",
      ));
    }
  }

  const release = releaseInterval(timing.publisher_release);
  if ([
    "publisher_declared_instant",
    "publisher_declared_date",
    "publisher_declared_local_date",
  ].includes(timing.publisher_release?.kind) && !release) {
    errors.push(problem(
      "PUBLISHER_RELEASE_INTERVAL_INVALID",
      "$.publisher_release",
      "The declared publisher release cannot be resolved to a valid time interval.",
    ));
  }
  const releaseCutoffOrder = intervalAgainstCutoff(release, cutoff);
  if (releaseCutoffOrder === "after_cutoff") {
    errors.push(problem(
      "RELEASE_AFTER_EVIDENCE_CUTOFF",
      "$.publisher_release",
      "Publisher release cannot follow the evidence cut-off.",
    ));
  } else if (releaseCutoffOrder === "order_unproven") {
    errors.push(problem(
      "RELEASE_ORDER_UNPROVEN",
      "$.publisher_release",
      "The declared precision cannot prove release preceded the evidence cut-off.",
    ));
  }

  if (timing.publisher_release?.kind === "observed_availability") {
    if (release?.lower !== null && release?.lower > release?.upper) {
      errors.push(problem(
        "AVAILABILITY_INTERVAL_INVALID",
        "$.publisher_release",
        "The last not-seen instant cannot follow the first-seen instant.",
      ));
    }
    for (const id of timing.publisher_release.first_seen?.evidence_raw_input_ids || []) {
      const rawInput = rawInputById.get(id);
      if (!rawInput) {
        errors.push(problem(
          "AVAILABILITY_PRESENCE_EVIDENCE_UNRESOLVED",
          "$.publisher_release.first_seen.evidence_raw_input_ids",
          `First-seen evidence ${id} is not a selected retained payload.`,
        ));
      } else if (rawInput.retrieved_at !== timing.publisher_release.first_seen.at) {
        errors.push(problem(
          "AVAILABILITY_PRESENCE_TIME_MISMATCH",
          "$.publisher_release.first_seen.at",
          `First-seen time must equal retrieval of cited payload ${id}.`,
        ));
      }
    }
    const receiptCounts = new Map();
    for (const receipt of availabilityReceipts) {
      receiptCounts.set(receipt.id, (receiptCounts.get(receipt.id) || 0) + 1);
    }
    const receiptById = new Map(availabilityReceipts.map((receipt) => [receipt.id, receipt]));
    for (const id of timing.publisher_release.not_seen?.absence_receipt_ids || []) {
      const receipt = receiptById.get(id);
      const observed = exactInstant(receipt?.observed_at);
      const acquired = exactInstant(receipt?.acquired_at);
      const validReceipt = receiptCounts.get(id) === 1 &&
        receipt?.kind === "absence_receipt" &&
        receipt.id === receiptDigest(receipt) &&
        receipt.target_url === sourceUrl &&
        receipt.observed_at === timing.publisher_release.not_seen.at &&
        observed !== null && acquired !== null && acquired >= observed &&
        (cutoff === null || acquired <= cutoff) &&
        typeof receipt.producer?.id === "string" &&
        /^\d+\.\d+\.\d+$/.test(receipt.producer?.version || "") &&
        receipt.outcome?.kind === "http_not_found" &&
        [404, 410].includes(receipt.outcome?.http_status);
      if (!receipt) {
        errors.push(problem(
          "AVAILABILITY_ABSENCE_EVIDENCE_UNRESOLVED",
          "$.publisher_release.not_seen.absence_receipt_ids",
          `Last-not-seen evidence ${id} is not a matching governed absence receipt.`,
        ));
      } else if (!validReceipt) {
        errors.push(problem(
          "AVAILABILITY_ABSENCE_EVIDENCE_INVALID",
          "$.publisher_release.not_seen.absence_receipt_ids",
          `Last-not-seen evidence ${id} fails its content, source, chronology or producer contract.`,
        ));
      }
    }
  }

  if (intervalOrder(release, retrieval) === "invalid_release_after_retrieval") {
    errors.push(problem(
      "RELEASE_AFTER_RETRIEVAL",
      "$.publisher_release",
      "Publisher release is definitely later than the selected retrieval interval.",
    ));
  }
  return { valid: errors.length === 0, errors };
}

function referenceCoverage(point, rule, asOf) {
  const cutoff = exactInstant(asOf);
  if (cutoff === null || !Number.isInteger(point?.year)) return "unknown";
  if (!validateTimingRule(rule).valid) return "invalid_rule";
  const cutoffYear = Number(asOf.slice(0, 4));
  if (point.epistemic_class === "forecast") {
    return point.year > cutoffYear ? "future_target" : "invalid_past_forecast";
  }
  if (point.epistemic_class === "nowcast" && point.year === cutoffYear) {
    return "period_in_progress";
  }
  const periodEnd = Date.parse(`${point.year + 1}-01-01T00:00:00Z`);
  if (periodEnd > cutoff) return "invalid_unfinished_period";
  return (cutoff - periodEnd) / DAY_MS <= rule.max_reference_lag_days
    ? "within_policy_window"
    : "outside_policy_window";
}

function releaseRecency(timing, rule, asOf) {
  if (!validateTimingRule(rule).valid || rule?.release_cadence?.kind !== "maximum_interval") {
    return "unknown";
  }
  const release = releaseInterval(timing?.publisher_release);
  const cutoff = exactInstant(asOf);
  if (!release || cutoff === null) return "unknown";
  if (release.precision === "local_calendar_date_unspecified") return "unknown";
  const duration = (rule.release_cadence.maximum_interval_days + rule.release_cadence.grace_days) * DAY_MS;
  if (cutoff > release.upper + duration) return "overdue";
  if (release.lower !== null && cutoff <= release.lower + duration) return "not_overdue";
  return "unknown";
}

function retrievalRecency(timing, asOf) {
  const interval = retrievalInterval(timing?.retrieval);
  const cutoff = exactInstant(asOf);
  const order = intervalAgainstCutoff(interval, cutoff);
  if (timing?.retrieval?.kind === "calendar_date") {
    if (order === "by_cutoff") return "reported_before_cutoff_unverified";
    if (order === "after_cutoff") return "reported_after_cutoff_unverified";
    return "reported_order_unproven";
  }
  if (order === "by_cutoff") return "retrieved_before_cutoff";
  if (order === "after_cutoff") return "retrieved_after_cutoff";
  if (order === "order_unproven") return "unknown_same_day_precision";
  return "unknown";
}

export function assessPointTiming({ point, timing, rule, asOf }) {
  return {
    reference_coverage: referenceCoverage(point, rule, asOf),
    publisher_vintage: timing?.publisher_vintage?.status || "unknown",
    publisher_release_basis: timing?.publisher_release?.kind || "unknown",
    publisher_release_cutoff_order: intervalAgainstCutoff(
      releaseInterval(timing?.publisher_release), exactInstant(asOf),
    ),
    retrieval_cutoff_order: intervalAgainstCutoff(
      retrievalInterval(timing?.retrieval), exactInstant(asOf),
    ),
    release_recency: releaseRecency(timing, rule, asOf),
    retrieval_recency: retrievalRecency(timing, asOf),
    availability_order: intervalOrder(
      releaseInterval(timing?.publisher_release),
      retrievalInterval(timing?.retrieval),
    ),
  };
}

function dependencyReadyInterval(signal, rawInputById) {
  const timing = signal?.source?.timing;
  if (timing?.kind === "derived") {
    const computed = timing.computation?.kind === "exact"
      ? exactInstant(timing.computation.at)
      : null;
    return computed === null ? null : { lower: computed, upper: computed, precision: "exact" };
  }
  if (timing?.kind !== "external_dataset") return null;
  const acquisitions = (signal.source?.raw_input_ids || [])
    .map((id) => exactInstant(rawInputById.get(id)?.acquired_at))
    .filter((value) => value !== null);
  if (acquisitions.length) {
    const ready = Math.max(...acquisitions);
    return { lower: ready, upper: ready, precision: "exact" };
  }
  return timing.retrieval?.kind === "exact" ? retrievalInterval(timing.retrieval) : null;
}

function referenceMatchesDerivedAssessmentTarget(signal, reference, rule) {
  return rule?.assessment_binding?.kind === "latest_point_inputs" &&
    signal?.latest?.entity === reference.entity &&
    signal?.latest?.year === reference.year;
}

export function validateTimingGraph(signals, {
  asOf,
  generatedAt,
  rawInputs = [],
  extractedMetadata = [],
  availabilityReceipts = [],
  rules = {},
  publicUpdate = null,
}) {
  const errors = [];
  const byId = new Map((signals || []).map((signal) => [signal.id, signal]));
  const rawInputById = new Map(rawInputs.map((rawInput) => [rawInput.id, rawInput]));
  if (byId.size !== (signals || []).length) {
    errors.push(problem("TIMING_SIGNAL_DUPLICATE", "$.signals", "Signal IDs must be unique."));
  }
  if (rawInputById.size !== rawInputs.length) {
    errors.push(problem("RAW_INPUT_DUPLICATE", "$.raw_inputs", "Raw input IDs must be unique."));
  }
  for (const [index, signal] of (signals || []).entries()) {
    const pointTargets = (signal?.series || []).flatMap((series) =>
      (series.points || []).map((point) => canonicalJson({
        signal_id: signal.id,
        entity: series.entity,
        measure: series.measure ?? null,
        year: point[0],
      })));
    if (new Set(pointTargets).size !== pointTargets.length) {
      errors.push(problem(
        "TIMING_POINT_TARGET_DUPLICATE",
        `$.signals[${index}].series`,
        "Each signal, entity, measure and year must identify exactly one displayed point.",
      ));
    }
    const selectedRawInputs = [];
    for (const id of signal?.source?.raw_input_ids || []) {
      const rawInput = rawInputById.get(id);
      if (!rawInput) {
        errors.push(problem(
          "SIGNAL_RAW_INPUT_UNRESOLVED",
          `$.signals[${index}].source.raw_input_ids`,
          `Signal raw input ${id} is not declared.`,
        ));
      } else selectedRawInputs.push(rawInput);
    }
    const result = validateSourceTiming({
      timing: signal?.source?.timing,
      asOf,
      generatedAt,
      rawInputs: selectedRawInputs,
      extractedMetadata,
      availabilityReceipts,
      sourceUrl: signal?.source?.url,
    });
    errors.push(...result.errors.map((error) => ({
      ...error,
      path: `$.signals[${index}]${error.path.slice(1)}`,
    })));
    const timing = signal?.source?.timing;
    if (timing?.kind !== "derived") continue;
    if (!(timing.assessment_lineage || []).some(({ role }) => role === "endpoint")) {
      errors.push(problem(
        "DERIVED_ASSESSMENT_ENDPOINT_MISSING",
        `$.signals[${index}].source.timing.assessment_lineage`,
        "Derived assessment lineage must contain at least one endpoint operand.",
      ));
    }
    const rule = rules[signal.id];
    const registeredDependencies = [...(rule?.inherits_from_signal_ids || [])].sort();
    const declaredDependencies = [...(timing.inherits_from_signal_ids || [])].sort();
    if (rule && (rule.kind !== "derived" ||
        rule.derivation_id !== timing.derivation_id ||
        JSON.stringify(registeredDependencies) !== JSON.stringify(declaredDependencies))) {
      errors.push(problem(
        "DERIVATION_CONTRACT_MISMATCH",
        `$.signals[${index}].source.timing`,
        "Derived timing dependencies and derivation identity must match the governed policy.",
      ));
    }
    const computed = timing.computation?.kind === "exact"
      ? exactInstant(timing.computation.at)
      : null;
    for (const sourceId of timing.inherits_from_signal_ids || []) {
      const dependency = byId.get(sourceId);
      if (!dependency) {
        errors.push(problem(
          "DERIVED_TIMING_SOURCE_UNKNOWN",
          `$.signals[${index}].source.timing.inherits_from_signal_ids`,
          `Derived timing source ${sourceId} is not declared.`,
        ));
        continue;
      }
      if (dependency.status !== "available" || dependency.source?.timing?.kind === "instrument_gap") {
        errors.push(problem(
          "DERIVED_TIMING_SOURCE_UNUSABLE",
          `$.signals[${index}].source.timing.inherits_from_signal_ids`,
          `Derived timing source ${sourceId} is not usable evidence.`,
        ));
        continue;
      }
      const ready = dependencyReadyInterval(dependency, rawInputById);
      if (!ready && computed !== null) {
        errors.push(problem(
          "DERIVATION_DEPENDENCY_READINESS_UNKNOWN",
          `$.signals[${index}].source.timing.computation`,
          `Exact computation cannot prove when dependency ${sourceId} became ready.`,
        ));
        continue;
      }
      if (!ready || computed === null) continue;
      if (computed < ready.lower) {
        errors.push(problem(
          "DERIVATION_BEFORE_DEPENDENCY",
          `$.signals[${index}].source.timing.computation`,
          `Derived computation predates dependency ${sourceId}.`,
        ));
      } else if (computed < ready.upper) {
        errors.push(problem(
          "DERIVATION_ORDER_UNPROVEN",
          `$.signals[${index}].source.timing.computation`,
          `Declared precision cannot prove dependency ${sourceId} was ready before computation.`,
        ));
      }
    }
    for (const lineage of timing.assessment_lineage || []) {
      if (!["baseline", "comparator", "endpoint"].includes(lineage.role)) {
        errors.push(problem(
          "DERIVED_ASSESSMENT_ROLE_INVALID",
          `$.signals[${index}].source.timing.assessment_lineage`,
          "Every derived assessment operand needs a baseline, comparator or endpoint role.",
        ));
      }
      if (!declaredDependencies.includes(lineage.signal_id)) {
        errors.push(problem(
          "DERIVED_ASSESSMENT_LINEAGE_UNREGISTERED",
          `$.signals[${index}].source.timing.assessment_lineage`,
          `Assessment lineage ${lineage.signal_id} is not a registered dependency.`,
        ));
        continue;
      }
      const dependency = byId.get(lineage.signal_id);
      const matchingSeries = (dependency?.series || []).filter((series) =>
        series.entity === lineage.entity &&
        (lineage.measure === undefined || series.measure === lineage.measure)
      );
      const points = matchingSeries.flatMap((series) =>
        series.points.filter(([year]) => year === lineage.year));
      if (points.length !== 1) {
        errors.push(problem(
          "DERIVED_ASSESSMENT_POINT_UNRESOLVED",
          `$.signals[${index}].source.timing.assessment_lineage`,
          `Assessment lineage must resolve exactly one ${lineage.signal_id} point.`,
        ));
      } else if (dependency?.source?.timing?.kind === "derived" &&
          !referenceMatchesDerivedAssessmentTarget(dependency, lineage, rules[lineage.signal_id])) {
        errors.push(problem(
          "NESTED_DERIVED_ASSESSMENT_UNBOUND",
          `$.signals[${index}].source.timing.assessment_lineage`,
          `Nested lineage ${lineage.signal_id} does not match that derived signal's governed assessment target.`,
        ));
      }
    }
    const binding = rule?.assessment_binding;
    let expectedLineage = null;
    if (binding?.kind === "latest_point_inputs") {
      if (!signal.latest?.entity || !Number.isInteger(signal.latest?.year)) {
        errors.push(problem(
          "DERIVED_ASSESSMENT_TARGET_UNRESOLVED",
          `$.signals[${index}].latest`,
          "Latest-point assessment binding requires one declared latest entity and year.",
        ));
      } else {
        expectedLineage = binding.inputs.map((input) => ({
          signal_id: input.signal_id,
          entity: signal.latest.entity,
          year: signal.latest.year + input.year_offset,
          role: input.role,
          ...(input.measure === undefined ? {} : { measure: input.measure }),
        }));
      }
    } else if (binding?.kind === "public_update_source_points") {
      if (!publicUpdate || publicUpdate.lineage?.derivation_id !== timing.derivation_id) {
        errors.push(problem(
          "DERIVED_ASSESSMENT_TARGET_UNRESOLVED",
          `$.signals[${index}].source.timing.assessment_lineage`,
          "Public-update assessment binding requires a matching governed derivation lineage.",
        ));
      } else {
        expectedLineage = (publicUpdate.lineage.source_points || []).map((point) => ({
          signal_id: point.signal_id,
          entity: point.entity,
          year: point.year,
          role: point.year === publicUpdate.lineage.from_year &&
              point.year !== publicUpdate.lineage.through_year
            ? "baseline"
            : "endpoint",
          ...(point.measure === undefined ? {} : { measure: point.measure }),
        }));
      }
    }
    const ordered = (lineage) => [...lineage]
      .sort((left, right) => canonicalJson(left).localeCompare(canonicalJson(right)));
    if (expectedLineage &&
        canonicalJson(ordered(expectedLineage)) !==
        canonicalJson(ordered(timing.assessment_lineage || []))) {
      errors.push(problem(
        "DERIVED_ASSESSMENT_BINDING_MISMATCH",
        `$.signals[${index}].source.timing.assessment_lineage`,
        "Assessment lineage must equal the governed source points for the displayed derived target.",
      ));
    }
  }

  const visiting = new Set();
  const visited = new Set();
  function visit(id) {
    if (visiting.has(id)) {
      errors.push(problem("DERIVED_TIMING_CYCLE", "$.signals", `Derived timing cycle includes ${id}.`));
      return;
    }
    if (visited.has(id)) return;
    visiting.add(id);
    const timing = byId.get(id)?.source?.timing;
    if (timing?.kind === "derived") {
      for (const sourceId of timing.inherits_from_signal_ids || []) {
        if (byId.has(sourceId)) visit(sourceId);
      }
    }
    visiting.delete(id);
    visited.add(id);
  }
  for (const id of byId.keys()) visit(id);
  return { valid: errors.length === 0, errors };
}

const PRECEDENCE = {
  reference_coverage: [
    "invalid_rule", "invalid_unfinished_period", "invalid_past_forecast",
    "outside_policy_window", "unknown", "period_in_progress", "future_target", "within_policy_window",
  ],
  publisher_vintage: ["unknown", "known"],
  release_recency: ["overdue", "unknown", "not_overdue"],
  retrieval_recency: [
    "reported_after_cutoff_unverified", "retrieved_after_cutoff", "reported_order_unproven",
    "unknown_same_day_precision", "unknown", "reported_before_cutoff_unverified",
    "retrieved_before_cutoff",
  ],
  availability_order: [
    "invalid_release_after_retrieval", "unknown_interval_overlap", "unknown_local_date_precision",
    "unknown_same_day_precision", "unknown", "release_before_or_at_retrieval",
  ],
  byte_acquisition: ["acquired_after_cutoff", "unknown", "acquired_before_cutoff"],
};

function failClosedValue(field, values) {
  const order = PRECEDENCE[field];
  return [...values].sort((left, right) => {
    const leftIndex = order.indexOf(left);
    const rightIndex = order.indexOf(right);
    return (leftIndex < 0 ? 1 : leftIndex) - (rightIndex < 0 ? 1 : rightIndex);
  })[0] || "unknown";
}

export function assessTimingGraph(signals, {
  asOf,
  generatedAt = null,
  rawInputs = [],
  rules = {},
  publicUpdate = null,
}) {
  const byId = new Map((signals || []).map((signal) => [signal.id, signal]));
  const rawInputById = new Map(rawInputs.map((rawInput) => [rawInput.id, rawInput]));
  const assessments = {};
  const visiting = new Set();
  const unknownAssessment = () => ({
    reference_coverage: "unknown",
    publisher_vintage: "unknown",
    publisher_release_basis: "unknown",
    release_recency: "unknown",
    retrieval_recency: "unknown",
    availability_order: "unknown",
    byte_acquisition: "unknown",
  });
  function byteAcquisition(signal) {
    const ids = signal?.source?.raw_input_ids || [];
    if (ids.length !== 1) return "unknown";
    const cutoff = exactInstant(asOf);
    const acquisitions = ids.map((id) => exactInstant(rawInputById.get(id)?.acquired_at));
    if (cutoff === null || acquisitions.some((value) => value === null)) return "unknown";
    return acquisitions.some((value) => value > cutoff)
      ? "acquired_after_cutoff"
      : "acquired_before_cutoff";
  }
  function externalPointAssessment(signal, point) {
    const timing = signal.source.timing;
    const rawInputIds = [...(signal.source?.raw_input_ids || [])];
    const assessment = {
      ...assessPointTiming({ point, timing, rule: rules[signal.id], asOf }),
      publisher_vintage_record: structuredClone(timing.publisher_vintage),
      publisher_release: structuredClone(timing.publisher_release),
      retrieval: structuredClone(timing.retrieval),
      raw_input_ids: rawInputIds,
      acquisition_records: rawInputIds.map((rawInputId) => ({
        raw_input_id: rawInputId,
        acquired_at: rawInputById.get(rawInputId)?.acquired_at || null,
      })),
      point_raw_input_binding: rawInputIds.length === 1
        ? "single_signal_input"
        : rawInputIds.length > 1 ? "ambiguous_signal_inputs" : "unbound",
      byte_acquisition: byteAcquisition(signal),
      record_generated_at: generatedAt || "unknown",
    };
    const evidenceReadiness = timingEvidenceReadiness([assessment], true);
    return {
      ...assessment,
      assessment_kind: "external_dataset",
      assessment_execution: "completed",
      structural_lineage: "not_applicable",
      evidence_readiness: evidenceReadiness,
      publication_eligibility: evidenceReadiness === "ready"
        ? "not_determined_by_timing"
        : "ineligible",
    };
  }
  function timingEvidenceReadiness(dependencies, structurallyComplete) {
    if (!structurallyComplete) return "unknown";
    const invalid = dependencies.some((dependency) =>
      String(dependency.reference_coverage || "").startsWith("invalid_") ||
      ["after_cutoff"].includes(dependency.publisher_release_cutoff_order) ||
      ["retrieved_after_cutoff", "reported_after_cutoff_unverified"].includes(
        dependency.retrieval_recency,
      ) ||
      dependency.availability_order === "invalid_release_after_retrieval" ||
      dependency.byte_acquisition === "acquired_after_cutoff" ||
      dependency.evidence_readiness === "invalid");
    if (invalid) return "invalid";
    const provisional = dependencies.some((dependency) =>
      dependency.role !== "baseline" &&
      ["future_target", "period_in_progress"].includes(dependency.reference_coverage));
    if (provisional) return "provisional";
    const stale = dependencies.some((dependency) =>
      dependency.evidence_readiness === "stale" ||
      dependency.release_recency === "overdue" ||
      (dependency.role !== "baseline" &&
        dependency.reference_coverage === "outside_policy_window"));
    if (stale) return "stale";
    const unknown = dependencies.some((dependency) =>
      dependency.evidence_readiness === "unknown" ||
      dependency.reference_coverage === "unknown" ||
      dependency.publisher_vintage === "unknown" ||
      dependency.publisher_release_cutoff_order === "unknown" ||
      dependency.release_recency === "unknown" ||
      ["unknown", "unknown_same_day_precision", "reported_order_unproven",
        "reported_before_cutoff_unverified"].includes(dependency.retrieval_recency) ||
      ["unknown", "unknown_interval_overlap", "unknown_local_date_precision",
        "unknown_same_day_precision"].includes(dependency.availability_order) ||
      (dependency.source_kind !== "derived" &&
        dependency.point_raw_input_binding !== "single_signal_input") ||
      dependency.byte_acquisition === "unknown");
    return unknown ? "unknown" : "ready";
  }
  function pointTarget(signal, series, point) {
    return {
      kind: "point",
      signal_id: signal.id,
      entity: series?.entity ?? signal.latest?.entity ?? null,
      measure: series?.measure ?? null,
      year: point?.year ?? point?.[0] ?? null,
    };
  }
  function latestSeries(signal) {
    const matches = (signal?.series || []).filter((series) =>
      (signal.latest?.entity === undefined || series.entity === signal.latest.entity) &&
      series.points.some(([year]) => year === signal.latest?.year));
    return matches.length === 1 ? matches[0] : null;
  }
  function pointForLineage(lineage) {
    const signal = byId.get(lineage.signal_id);
    const matchingSeries = (signal?.series || []).filter((series) =>
      series.entity === lineage.entity &&
      (lineage.measure === undefined || series.measure === lineage.measure)
    );
    const points = matchingSeries.flatMap((series) =>
      series.points.filter(([year]) => year === lineage.year));
    if (points.length !== 1) return null;
    return { year: points[0][0], epistemic_class: points[0][2] };
  }
  function assess(id) {
    if (assessments[id]) return assessments[id];
    if (visiting.has(id)) return null;
    visiting.add(id);
    const signal = byId.get(id);
    const timing = signal?.source?.timing;
    if (timing?.kind === "derived") {
      const lineage = [...(timing.assessment_lineage || [])].sort((left, right) =>
        `${left.signal_id}\0${left.entity}\0${left.measure || ""}\0${left.year}`.localeCompare(
          `${right.signal_id}\0${right.entity}\0${right.measure || ""}\0${right.year}`,
        ));
      const dependencies = lineage.map((reference) => {
        const dependency = byId.get(reference.signal_id);
        if (dependency?.source?.timing?.kind === "external_dataset") {
          const point = pointForLineage(reference);
          return point && {
            ...externalPointAssessment(dependency, point),
            role: reference.role,
            target: {
              kind: "point",
              signal_id: reference.signal_id,
              entity: reference.entity,
              measure: reference.measure ?? null,
              year: reference.year,
            },
            source_kind: "external_dataset",
            assessment_bound: true,
          };
        }
        if (dependency?.source?.timing?.kind === "derived" &&
            referenceMatchesDerivedAssessmentTarget(
              dependency,
              reference,
              rules[reference.signal_id],
            )) {
          const nestedAssessment = assess(reference.signal_id);
          return {
            ...(nestedAssessment || unknownAssessment()),
            role: reference.role,
            target: nestedAssessment?.assessment_target || null,
            source_kind: "derived",
            nested_role_assessments: nestedAssessment?.role_assessments || {},
            assessment_bound: nestedAssessment?.status === "assessed",
          };
        }
        return {
          ...unknownAssessment(),
          role: reference.role,
          target: {
            kind: "point",
            signal_id: reference.signal_id,
            entity: reference.entity,
            measure: reference.measure ?? null,
            year: reference.year,
          },
          source_kind: "unknown",
          assessment_bound: false,
        };
      }).filter(Boolean);
      const assessmentComplete = lineage.length > 0 &&
        dependencies.length === lineage.length &&
        dependencies.every(({ assessment_bound: bound }) => bound === true);
      const inherited = {};
      for (const field of Object.keys(PRECEDENCE).filter((field) => field !== "reference_coverage")) {
        inherited[field] = failClosedValue(field, dependencies.map((value) => value[field]));
      }
      const coverageFor = (role) => failClosedValue(
        "reference_coverage",
        dependencies.filter((value) => value.role === role)
          .map((value) => value.reference_coverage),
      );
      const endpointCoverage = coverageFor("endpoint");
      const roleAssessmentFor = (dependency) => ({
        target: dependency.target,
        status: dependency.assessment_bound ? "assessed" : "not_assessed",
        source_kind: dependency.source_kind,
        reference_coverage: dependency.reference_coverage,
        publisher_vintage: dependency.publisher_vintage_record || {
          status: "unknown",
          reason: dependency.source_kind === "derived"
            ? "See nested role assessments."
            : "No exact publisher vintage is bound to this operand.",
        },
        publisher_release: dependency.publisher_release || {
          kind: "unknown",
          reason: dependency.source_kind === "derived"
            ? "See nested role assessments."
            : "No exact publisher release is bound to this operand.",
        },
        retrieval: dependency.retrieval || {
          kind: "unknown",
          reason: dependency.source_kind === "derived"
            ? "See nested role assessments."
            : "No exact retrieval is bound to this operand.",
        },
        release_recency: dependency.release_recency,
        retrieval_recency: dependency.retrieval_recency,
        publisher_release_cutoff_order: dependency.publisher_release_cutoff_order,
        retrieval_cutoff_order: dependency.retrieval_cutoff_order,
        availability_order: dependency.availability_order,
        byte_acquisition: dependency.byte_acquisition,
        evidence_readiness: dependency.evidence_readiness || "unknown",
        point_raw_input_binding: dependency.point_raw_input_binding || "unbound",
        raw_input_ids: dependency.raw_input_ids || [],
        acquisition_records: dependency.acquisition_records || [],
        nested_role_assessments: dependency.nested_role_assessments || {
          baseline: [], comparator: [], endpoint: [],
        },
      });
      const roleAssessments = Object.fromEntries(
        ["baseline", "comparator", "endpoint"].map((role) => [
          role,
          dependencies.filter((dependency) => dependency.role === role)
            .map(roleAssessmentFor),
        ]),
      );
      const publisherVintageIds = [...new Set(dependencies.flatMap((dependency) =>
        dependency.publisher_vintage_record?.status === "known"
          ? [dependency.publisher_vintage_record.id]
          : dependency.publisher_vintage_ids || []))].sort();
      const hasUnknownVintage = dependencies.some((dependency) =>
        dependency.publisher_vintage_record
          ? dependency.publisher_vintage_record.status !== "known"
          : dependency.vintage_alignment === "unknown");
      const vintageAlignment = hasUnknownVintage || publisherVintageIds.length === 0
        ? "unknown"
        : publisherVintageIds.length === 1 ? "aligned" : "mixed";
      const publisherReleaseBases = [...new Set(dependencies.flatMap((dependency) =>
        dependency.publisher_release_bases ||
          [dependency.publisher_release_basis || "unknown"]))].sort();
      const binding = rules[id]?.assessment_binding;
      const inputTimingReadiness = timingEvidenceReadiness(dependencies, assessmentComplete);
      const evidenceReadiness = inputTimingReadiness === "invalid"
        ? "invalid"
        : "unknown";
      const target = binding?.kind === "public_update_source_points"
        ? {
            kind: "public_update",
            update_id: publicUpdate?.update_id ?? null,
            signal_id: id,
            entity: publicUpdate?.lineage?.entity ?? null,
            from_year: publicUpdate?.lineage?.from_year ?? null,
            through_year: publicUpdate?.lineage?.through_year ?? null,
          }
        : pointTarget(signal, latestSeries(signal), signal.latest);
      assessments[id] = {
        ...inherited,
        assessment_kind: "derived",
        status: assessmentComplete ? "assessed" : "not_assessed",
        assessment_execution: "completed",
        structural_lineage: assessmentComplete ? "complete" : "incomplete",
        input_timing_readiness: inputTimingReadiness,
        evidence_readiness: evidenceReadiness,
        publication_eligibility: evidenceReadiness === "ready"
          ? "not_determined_by_timing"
          : "ineligible",
        assessment_target: target,
        point_assessments: binding?.kind === "latest_point_inputs"
          ? [{
              target,
              assessment_kind: "derived",
              status: assessmentComplete ? "assessed" : "not_assessed",
              assessment_execution: "completed",
              structural_lineage: assessmentComplete ? "complete" : "incomplete",
              input_timing_readiness: inputTimingReadiness,
              evidence_readiness: evidenceReadiness,
              publication_eligibility: evidenceReadiness === "ready"
                ? "not_determined_by_timing"
                : "ineligible",
              ...inherited,
              reference_coverage: endpointCoverage,
              endpoint_coverage: endpointCoverage,
              baseline_coverage: coverageFor("baseline"),
              comparator_coverage: coverageFor("comparator"),
              reference_span: {
                from_year: lineage.length ? Math.min(...lineage.map(({ year }) => year)) : null,
                through_year: lineage.length ? Math.max(...lineage.map(({ year }) => year)) : null,
              },
              lineage_completeness: assessmentComplete ? "complete" : "incomplete",
              assessment_lineage: lineage,
              assessment_binding: binding,
              computation: timing.computation,
              role_assessments: roleAssessments,
              vintage_alignment: vintageAlignment,
              publisher_vintage_ids: publisherVintageIds,
              publisher_release_bases: publisherReleaseBases,
              record_generated_at: generatedAt || "unknown",
            }]
          : [],
        reference_coverage: endpointCoverage,
        endpoint_coverage: endpointCoverage,
        baseline_coverage: coverageFor("baseline"),
        comparator_coverage: coverageFor("comparator"),
        role_assessments: roleAssessments,
        vintage_alignment: vintageAlignment,
        publisher_vintage_ids: publisherVintageIds,
        reference_span: {
          from_year: lineage.length ? Math.min(...lineage.map(({ year }) => year)) : null,
          through_year: lineage.length ? Math.max(...lineage.map(({ year }) => year)) : null,
        },
        lineage_completeness: assessmentComplete ? "complete" : "incomplete",
        publisher_release_bases: publisherReleaseBases,
        record_generated_at: generatedAt || "unknown",
        inherited_from_signal_ids: [...timing.inherits_from_signal_ids].sort(),
        assessment_lineage: lineage,
        assessment_binding: binding,
        computation: timing.computation,
      };
    } else if (timing?.kind === "external_dataset") {
      const pointAssessments = (signal.series || []).flatMap((series) =>
        series.points.map((point) => ({
          target: pointTarget(signal, series, point),
          status: "assessed",
          ...externalPointAssessment(signal, {
            year: point[0], epistemic_class: point[2],
          }),
        }))).sort((left, right) => canonicalJson(left.target).localeCompare(canonicalJson(right.target)));
      const target = pointTarget(signal, latestSeries(signal), signal.latest);
      const primaryWithTarget = pointAssessments.find(({ target: candidate }) =>
        canonicalJson(candidate) === canonicalJson(target)) || {
          status: "not_assessed",
          ...externalPointAssessment(signal, signal.latest),
        };
      const { target: ignoredPrimaryTarget, ...primary } = primaryWithTarget;
      assessments[id] = {
        ...primary,
        assessment_kind: "external_dataset",
        assessment_execution: "completed",
        structural_lineage: "not_applicable",
        assessment_target: target,
        point_assessments: pointAssessments,
      };
    } else {
      assessments[id] = {
        ...unknownAssessment(),
        assessment_kind: timing?.kind || "unclassified",
        status: "not_assessed",
        assessment_execution: "not_completed",
        structural_lineage: "not_applicable",
        evidence_readiness: "unknown",
        publication_eligibility: "ineligible",
        assessment_target: { kind: "signal", signal_id: id },
        point_assessments: [],
        record_generated_at: generatedAt || "unknown",
      };
    }
    visiting.delete(id);
    return assessments[id];
  }
  for (const id of [...byId.keys()].sort()) assess(id);
  return Object.fromEntries(Object.keys(assessments).sort().map((id) => [id, assessments[id]]));
}
