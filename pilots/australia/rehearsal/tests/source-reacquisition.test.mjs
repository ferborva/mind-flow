import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const record = JSON.parse(readFileSync(resolve(
  here,
  "../../reproductions/nero-reacquisition-2026-09-08.json",
), "utf8"));

test("the re-acquisition record binds the official artefact and prior local capture", () => {
  assert.equal(record.source.publisher, "Jobs and Skills Australia");
  assert.match(record.source.archive_url, /^https:\/\/www\.jobsandskills\.gov\.au\//);
  assert.equal(record.observation.byte_length, 48613300);
  assert.match(record.observation.sha256, /^sha256:[a-f0-9]{64}$/);
  assert.equal(record.comparison.prior_capture_sha256, record.observation.sha256);
  assert.equal(record.comparison.hash_match, true);
});

test("temporary acquisition cannot be laundered into retained or authenticated evidence", () => {
  assert.equal(record.observation.retained_in_repository, false);
  assert.equal(record.assurance.transport, "https-official-host");
  assert.equal(record.assurance.publisher_signature_verified, false);
  assert.equal(record.assurance.independent_witness_verified, false);
  assert.equal(record.assurance.content_recomputed_in_this_event, true);
  assert.equal(record.reproduction.series_count, 440);
  assert.equal(record.reproduction.derived_values_deep_equal, true);
  assert.match(record.reproduction.rebuilt_output_sha256, /^sha256:[a-f0-9]{64}$/);
  assert.deepEqual(record.reproduction.excluded_metadata_fields, [
    "source.archive_name",
    "source.release_availability.evidence",
  ]);
  assert.equal(record.disposition.decision_use, "prohibited");
  assert.equal(record.disposition.condition_truth, "not-determined");
  assert.match(record.disposition.maximum_claim, /bit-for-bit match/i);
  assert.match(record.disposition.maximum_claim, /does not authenticate/i);
});

test("the record preserves observed, publisher and retrieval clocks separately", () => {
  assert.equal(record.source.release_period, "2026-08");
  assert.equal(record.source.publisher_release_date, "2026-09-02");
  assert.match(record.observation.retrieved_at_utc, /^2026-09-08T\d{2}:\d{2}:\d{2}Z$/);
  assert.equal(record.observation.exact_publisher_release_time_utc, null);
  assert.equal(record.observation.prospective_chronology_established, false);
});
