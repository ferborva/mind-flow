import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

import { verifyNeroSourceCapture } from "../tools/verify-nero-source-capture.mjs";

const pilotRoot = resolve(import.meta.dirname, "..");
const capturePath = resolve(pilotRoot, "sources/nero/2026-08/capture.json");
const capture = JSON.parse(readFileSync(capturePath, "utf8"));
const manifest = JSON.parse(readFileSync(resolve(pilotRoot, "source-manifest.json"), "utf8"));
const pilotReadme = readFileSync(resolve(pilotRoot, "README.md"), "utf8");
const dataReadme = readFileSync(resolve(pilotRoot, "data/README.md"), "utf8");
const verifierSource = readFileSync(resolve(pilotRoot, "tools/verify-nero-source-capture.mjs"), "utf8");

test("retained NERO capture binds exact official-host bytes and source-native scope", () => {
  const result = verifyNeroSourceCapture(capture, { pilotRoot });

  assert.equal(result.machine_valid, true, result.errors.join("\n"));
  assert.equal(result.artifact_integrity, true);
  assert.equal(result.archive_integrity, true);
  assert.equal(result.publisher_claims_bound, true);
  assert.equal(result.http_metadata_bound, true);
  assert.equal(result.landing_archive_link_bound, true);
  assert.equal(result.redistribution_notice_bound, true);
  assert.equal(result.clock_binding_valid, true);
  assert.equal(result.historical_baseline_file_bound, true);
  assert.equal(result.series_projection_reproduced, true);
  assert.deepEqual(result.selected_code_shape, {
    occupation_codes: ["5311", "5511", "5512", "5513", "5411"],
    region_count: 88,
    series_count: 440,
  });
  assert.equal(capture.source_native_scope.occupation.version, "not-established-by-this-capture");
  assert.equal(capture.source_native_scope.geography.place_basis, "not-established-by-this-capture");
  assert.equal(capture.derivation.tool_path, "dashboard/tools/build-nero-baseline.mjs");
  assert.match(capture.derivation.tool_sha256, /^sha256:[a-f0-9]{64}$/);
  assert.equal(
    capture.derivation.comparison_profile,
    "canonical-series-projection-v1",
  );
  assert.equal(capture.redistribution.publisher_attribution_applied, true);
  assert.equal(capture.redistribution.legal_review_complete, false);
  assert.equal(capture.archive_structure.integrity_test, "in-process-crc-and-size-recomputation");
});

test("verification executes private byte snapshots without a PATH-resolved extractor", () => {
  assert.match(verifierSource, /writeFileSync\(builderSnapshot, builderBytes/);
  assert.match(verifierSource, /writeFileSync\(sourceSnapshot, artifactBytes\.get\("archive"\)/);
  assert.match(verifierSource, /spawnSync\(process\.execPath, \[\s*builderSnapshot/);
  assert.doesNotMatch(verifierSource, /spawnSync\(["']unzip["']/);
});

test("retention does not manufacture publisher authentication, chronology, truth or authority", () => {
  assert.equal(capture.clocks.publisher_release_calendar_date, "2026-09-02");
  assert.equal(capture.clocks.archive_http_response_date_utc, "2026-09-08T22:32:26Z");
  assert.equal(capture.clocks.recorder_capture_completed_at_utc, capture.captured_at_utc);
  assert.equal(capture.clocks.last_modified_interpretation, "transport-metadata-only-not-release-time");
  assert.equal(capture.clocks.prospective_chronology_state, "unknown");
  assert.equal(capture.boundaries.publisher_signature_verified, false);
  assert.equal(capture.boundaries.independent_witness_verified, false);
  assert.equal(capture.boundaries.responses_bound_to_single_requests, false);
  assert.equal(capture.boundaries.exact_publisher_release_time_utc, null);
  assert.equal(capture.boundaries.prospective_chronology_established, false);
  assert.equal(capture.boundaries.condition_truth_determined, false);
  assert.equal(capture.boundaries.causal_claim_permitted, false);
  assert.equal(capture.boundaries.warning_claim_permitted, false);
  assert.equal(capture.boundaries.decision_use_permitted, false);
  assert.match(capture.maximum_claim, /retained.*exact bytes/i);
  assert.match(capture.maximum_claim, /pinned in-process builder.*reproduce the numeric and identity fields for all 440/i);
  assert.match(capture.maximum_claim, /authenticate the publisher independently/i);
  assert.match(capture.maximum_claim, /does not.*establish.*classification version.*place basis/i);
});

test("capture verification fails closed on artifact substitution and inflated boundaries", () => {
  const substituted = structuredClone(capture);
  substituted.artifacts.find(({ role }) => role === "archive").sha256 = `sha256:${"0".repeat(64)}`;
  const substitutedResult = verifyNeroSourceCapture(substituted, { pilotRoot });
  assert.equal(substitutedResult.machine_valid, false);
  assert.match(substitutedResult.errors.join("\n"), /hash mismatch/i);

  const inflated = structuredClone(capture);
  inflated.boundaries.warning_claim_permitted = true;
  const inflatedResult = verifyNeroSourceCapture(inflated, { pilotRoot });
  assert.equal(inflatedResult.machine_valid, false);
  assert.match(inflatedResult.errors.join("\n"), /schema|boundary/i);
});

test("capture verification rejects a co-mutated claim ceiling and evidence quotation", () => {
  const inflatedClaim = structuredClone(capture);
  inflatedClaim.maximum_claim = "Retained exact bytes prove that a public warning is permitted.";
  const inflatedClaimResult = verifyNeroSourceCapture(inflatedClaim, { pilotRoot });
  assert.equal(inflatedClaimResult.machine_valid, false);
  assert.match(inflatedClaimResult.errors.join("\n"), /maximum claim|schema/i);

  const substitutedQuote = structuredClone(capture);
  substitutedQuote.evidence_claims[0].literal = "Jobs and Skills Australia";
  const substitutedQuoteResult = verifyNeroSourceCapture(substitutedQuote, { pilotRoot });
  assert.equal(substitutedQuoteResult.machine_valid, false);
  assert.match(substitutedQuoteResult.errors.join("\n"), /claim set mismatch/i);

  const forgedClock = structuredClone(capture);
  forgedClock.captured_at_utc = "2026-09-02T00:00:00Z";
  const forgedClockResult = verifyNeroSourceCapture(forgedClock, { pilotRoot });
  assert.equal(forgedClockResult.machine_valid, false);
  assert.match(forgedClockResult.errors.join("\n"), /schema.*captured_at_utc/i);

  const substitutedBuilder = structuredClone(capture);
  substitutedBuilder.derivation.tool_sha256 = `sha256:${"0".repeat(64)}`;
  const substitutedBuilderResult = verifyNeroSourceCapture(substitutedBuilder, { pilotRoot });
  assert.equal(substitutedBuilderResult.machine_valid, false);
  assert.match(substitutedBuilderResult.errors.join("\n"), /schema|builder.*hash/i);
});

test("the active pilot inventory distinguishes later retention from historical capture state", () => {
  const nero = manifest.sources.find(({ id }) => id === "jsa-nero-2026-08");
  assert.equal(nero.retained_capture.record_path, "sources/nero/2026-08/capture.json");
  assert.equal(nero.retained_capture.archive_path, "sources/nero/2026-08/2026-08_nero.zip");
  assert.equal(nero.retained_capture.warning_claim_permitted, false);
  assert.equal(nero.retained_capture.source_native_scope.occupation.version, "not-established-by-this-capture");
  assert.equal(nero.retained_capture.source_native_scope.geography.place_basis, "not-established-by-this-capture");
  assert.match(pilotReadme, /exact source bytes.*retained/i);
  assert.match(dataReadme, /historical baseline[\s\S]{0,120}`not_retained_unverified`/i);
  assert.match(dataReadme, /does not authenticate.*publisher/i);
});
