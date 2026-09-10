import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync, mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { createHash } from "node:crypto";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { sourceChronologyEventSha256 } from "../validate.mjs";
import { checkNeroFirstPresence, inspectNeroRows, requireNeroResolutionAdmission, prepareNeroResolutionEvidence, admitNeroResolution } from "../round-09-nero-corrected/resolution-intake.mjs";
import { evaluateForecastCohort } from "../round-09-nero-corrected/current-evaluation.mjs";
import { singleMemberZip } from "./support/nero-zip-fixture.mjs";

const json = (name) => JSON.parse(readFileSync(new URL(`../round-09-nero-corrected/${name}`, import.meta.url)));
const issued = json("issued.json");
const protocol = json("preregistration.json");
const row = ["1", "NSW", "102", "Central Coast", "5311", "General Clerks", "2026-10-15", "3092"];
const rows = async function* (values) { yield* values; };

function context() {
  const first = { sequence: 2, source_id: "source.jsa.nero", state: "reported_present_checksum_only",
    observed_at: "2026-11-04T01:00:00Z", artifact_sha256: `sha256:${"a".repeat(64)}`,
    previous_event_sha256: protocol.source_chronology.preregistered_tip_sha256,
    verification_status: "unverified_external_review_required" };
  first.event_sha256 = sourceChronologyEventSha256(first);
  return { archiveFilename: "2026-10_nero.zip", archiveSource: "https://www.jobsandskills.gov.au/sites/default/files/2026-11/2026-10_nero.zip",
    archiveSha256: first.artifact_sha256, firstPresenceReceiptBytes: Buffer.from(JSON.stringify(first)),
    chronologyEvents: [...protocol.source_chronology.events, first],
    expectedSourceChronologyTip: { event_count: 2, tip_sha256: first.event_sha256 },
    publishedAt: "2026-11-04T00:30:00Z", retrievedAt: "2026-11-04T01:01:00Z" };
}

test("intake rejects all later-month rows, including a different occupation or region", async () => {
  for (const extra of [[...row.slice(0, 6), "2026-11-15", "4200"],
    ["2", "NSW", "999", "Elsewhere", "9999", "Other", "2026-11-15", "1"]]) {
    await assert.rejects(inspectNeroRows(rows([row, extra]), issued), /after.*October|post.*October/);
  }
  assert.equal((await inspectNeroRows(rows([row]), issued)).value, 0.5);
  await assert.rejects(inspectNeroRows(rows([row, row]), issued), /exactly one/);
  let consumed = 0;
  async function* completeStream() {
    for (const entry of [[...row.slice(0, 6), "2026-11-15", "1"], row, row]) { consumed += 1; yield entry; }
  }
  await assert.rejects(inspectNeroRows(completeStream(), issued), /after.*October/);
  assert.equal(consumed, 3, "eligibility rejection must not skip the archive parser end-of-stream checks");
});

test("first-presence intake requires the native October filename and exact anchored receipt", () => {
  assert.doesNotThrow(() => checkNeroFirstPresence(context()));
  for (const change of [
    { archiveFilename: "2026-11_nero.zip" }, { archiveSource: "https://example.invalid/2026-10_nero.zip" },
    { archiveSha256: `sha256:${"b".repeat(64)}` }, { firstPresenceReceiptBytes: Buffer.from("{}") },
    { expectedSourceChronologyTip: null }, { retrievedAt: "2026-11-03T00:00:00Z" },
  ]) assert.throws(() => checkNeroFirstPresence({ ...context(), ...change }));
  const revision = context();
  revision.chronologyEvents.push({ ...revision.chronologyEvents[1], sequence: 3, artifact_sha256: `sha256:${"b".repeat(64)}` });
  assert.throws(() => checkNeroFirstPresence(revision), /chronology|first.presence/i);
});

test("current evaluation intake cannot accept a NERO terminal resolution without archive admission", () => {
  const unresolvedAdmission = { ...issued, status: "resolved" };
  assert.throws(() => requireNeroResolutionAdmission(unresolvedAdmission), /NERO.*intake/i);
  assert.throws(() => evaluateForecastCohort({}, [unresolvedAdmission]), /NERO.*intake/i);
  assert.doesNotThrow(() => requireNeroResolutionAdmission(issued));
});

test("synthetic October archive admission binds receipt metadata without changing the closed payload", async () => {
  const temporary = mkdtempSync(join(tmpdir(), "nero-intake-test-"));
  try {
    const archivePath = join(temporary, "2026-10_nero.zip");
    const archive = singleMemberZip("synthetic/data.csv", ",state_name,sa4_code,sa4_name,anzsco4_code,anzsco4_name,date,nsc_emp\n" + row.join(",") + "\n");
    writeFileSync(archivePath, archive);
    const input = context();
    const first = input.chronologyEvents[1];
    first.artifact_sha256 = `sha256:${createHash("sha256").update(archive).digest("hex")}`;
    first.event_sha256 = sourceChronologyEventSha256(first);
    input.firstPresenceReceiptBytes = Buffer.from(JSON.stringify(first));
    input.expectedSourceChronologyTip.tip_sha256 = first.event_sha256;
    input.archivePath = archivePath;
    const evidence = await prepareNeroResolutionEvidence(input);
    assert.match(evidence.vintage, /^2026-10_nero\.zip;first-presence=sha256:[a-f0-9]{64}$/);
    assert.equal(JSON.parse(Buffer.from(evidence.retained_bytes_base64, "base64")).value, 0.5);
    const resolved = structuredClone(issued);
    resolved.status = "resolved";
    resolved.resolution = { status: "resolved", outcome: 1, resolved_at: "2026-11-04T01:02:00Z", evidence };
    resolved.history.push({ at: resolved.resolution.resolved_at, event: "resolved", actor: "test-only resolver", note: "Synthetic intake fixture, not a real outcome." });
    await admitNeroResolution(resolved, input);
    assert.doesNotThrow(() => requireNeroResolutionAdmission(resolved));
    resolved.resolution.evidence.vintage = "missing-first-presence";
    assert.throws(() => requireNeroResolutionAdmission(resolved), /NERO.*intake/);
    await assert.rejects(admitNeroResolution(resolved, input), /first.presence receipt/);
  } finally { rmSync(temporary, { recursive: true, force: true }); }
});
