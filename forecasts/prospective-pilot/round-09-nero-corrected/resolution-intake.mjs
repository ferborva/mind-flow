import { createHash } from "node:crypto";
import { createReadStream, readFileSync } from "node:fs";
import { basename } from "node:path";
import { isDeepStrictEqual } from "node:util";
import { rowsFromZip } from "../../../dashboard/tools/build-nero-baseline.mjs";
import { assertForecastSemantics, assertIssuedForecastImmutable, parseExactInstant } from "../../lib/registry.mjs";
import { assessProspectivePilotProtocol } from "../validate.mjs";
import { neroOutcomePayload } from "../round-09-nero/resolver.mts";
import { assertNeroTargetConsistency } from "./target-policy.mjs";

const issuedBytes = readFileSync(new URL("./issued.json", import.meta.url));
const digest = (bytes) => `sha256:${createHash("sha256").update(bytes).digest("hex")}`;
if (digest(issuedBytes) !== "sha256:b4fa0511720b4964790e40417da5ccb12bce78e978cafa83530895abbce12ee1") {
  throw new Error("NERO original issued bytes changed; intake cannot proceed");
}
const original = JSON.parse(issuedBytes);
const protocolBytes = readFileSync(new URL("./preregistration.json", import.meta.url));
if (digest(protocolBytes) !== original.prospective_registration.preregistration_sha256) {
  throw new Error("NERO retained preregistration differs from the immutable issued binding");
}
const protocol = JSON.parse(protocolBytes);
const parameterBytes = readFileSync(new URL("./resolver-parameters.json", import.meta.url));
if (digest(parameterBytes) !== protocol.target.resolver.parameters_sha256) throw new Error("corrected NERO sealed parameters changed");
const parameters = JSON.parse(parameterBytes);
const repositoryRoot = new URL("../../../", import.meta.url);
for (const [path, hash] of Object.entries(parameters.dependencies)) {
  if (digest(readFileSync(new URL(path, repositoryRoot))) !== hash) throw new Error(`corrected NERO sealed dependency changed: ${path}`);
}
const baselineParameterBytes = readFileSync(new URL("./baseline-parameters.json", import.meta.url));
if (digest(baselineParameterBytes) !== protocol.baseline.parameters_sha256 ||
    digest(baselineParameterBytes) !== protocol.naive_baseline.parameters_sha256) throw new Error("corrected NERO sealed baseline parameters changed");
const baselineParameters = JSON.parse(baselineParameterBytes);
assertNeroTargetConsistency(original, protocol, parameters, [baselineParameters, baselineParameters]);
const admitted = new WeakMap();
const filename = "2026-10_nero.zip";

// These are additional admission checks, not changes to the issued resolver.
// An anchored local chronology proves consistency with its retained first entry,
// not global first publication or independently authenticated publisher identity.
export function checkNeroFirstPresence(input) {
  if (input.archiveFilename !== filename) throw new Error("NERO intake requires the native October archive filename");
  const url = new URL(input.archiveSource);
  if (url.protocol !== "https:" || url.hostname !== "www.jobsandskills.gov.au" ||
      url.username || url.password || url.search || url.hash || decodeURIComponent(basename(url.pathname)) !== filename) {
    throw new Error("NERO intake archive source must be the official native October filename");
  }
  if (!(input.firstPresenceReceiptBytes instanceof Uint8Array)) throw new Error("exact first-presence receipt bytes required");
  const receipt = JSON.parse(Buffer.from(input.firstPresenceReceiptBytes).toString("utf8"));
  const updated = structuredClone(protocol);
  updated.source_chronology.events = input.chronologyEvents;
  const result = assessProspectivePilotProtocol(updated, {
    expectedCampaignManifest: protocol.campaign.manifest,
    expectedExternalReceipt: protocol.registration.external_receipt,
    expectedSourceChronologyTip: input.expectedSourceChronologyTip,
  });
  if (!result.protocol_valid || !result.supplied_context_objects_match) {
    throw new Error(`NERO first-presence chronology is invalid: ${JSON.stringify([...result.issues, ...result.context_issues])}`);
  }
  const first = input.chronologyEvents.find((event) => event.source_id === "source.jsa.nero" && event.state === "reported_present_checksum_only");
  if (!first || !isDeepStrictEqual(first, receipt) || first.artifact_sha256 !== input.archiveSha256) {
    throw new Error("NERO archive must match the exact first-presence receipt and anchored chronology");
  }
  const observedAt = parseExactInstant(first.observed_at, "NERO first-presence observed_at");
  const publishedAt = parseExactInstant(input.publishedAt, "NERO claimed publication time");
  const retrievedAt = parseExactInstant(input.retrievedAt, "NERO archive retrieval time");
  if (publishedAt < Date.parse(original.target.outcome_publication_not_before) || publishedAt > observedAt ||
      retrievedAt < observedAt || retrievedAt > Date.parse(original.resolve_by)) {
    throw new Error("NERO first-presence, publication and acquisition clocks are inconsistent");
  }
  return { source: url.href, receiptSha256: digest(input.firstPresenceReceiptBytes),
    vintage: `${filename};first-presence=${digest(input.firstPresenceReceiptBytes)}` };
}

export async function inspectNeroRows(rows, forecast) {
  const selected = [];
  let late = false;
  let malformed = false;
  // Consume the whole stream even after observing a later month so the existing
  // archive parser completes its ZIP length and CRC checks.
  for await (const row of rows) {
    const date = row[6];
    if (row.length !== 8 || !/^\d{4}-\d{2}-15$/.test(date || "") ||
        !Number.isFinite(Date.parse(`${date}T00:00:00Z`)) ||
        new Date(`${date}T00:00:00Z`).toISOString().slice(0, 10) !== date) malformed = true;
    if (date > "2026-10-15") late = true;
    if (row[2] === "102" && row[4] === "5311" && date === "2026-10-15") selected.push(row);
  }
  if (malformed) throw new Error("NERO archive contains a malformed native monthly row");
  if (late) throw new Error("NERO archive contains rows after the October target month");
  return neroOutcomePayload(selected, forecast);
}

async function archiveDigest(path) {
  const hash = createHash("sha256");
  for await (const chunk of createReadStream(path)) hash.update(chunk);
  return `sha256:${hash.digest("hex")}`;
}

export async function prepareNeroResolutionEvidence(input) {
  if (basename(input.archivePath) !== filename) throw new Error("NERO local archive filename must be retained unchanged");
  const archiveSha256 = await archiveDigest(input.archivePath);
  const context = checkNeroFirstPresence({ ...input, archiveFilename: basename(input.archivePath), archiveSha256 });
  const payload = await inspectNeroRows(await rowsFromZip(input.archivePath), original);
  if (await archiveDigest(input.archivePath) !== archiveSha256) throw new Error("NERO archive changed during intake");
  const bytes = Buffer.from(`${JSON.stringify(payload, null, 2)}\n`);
  // The frozen payload is closed. Bind filename + receipt in the existing
  // content-addressed evidence vintage, rather than adding forbidden fields.
  return { source: context.source, retrieved_at: input.retrievedAt, published_at: input.publishedAt,
    vintage: context.vintage, checksum: digest(bytes), retained_media_type: "application/json",
    retained_bytes_base64: bytes.toString("base64"),
    publisher_identity_verification_status: "unverified_external_review_required" };
}

export async function admitNeroResolution(forecast, input) {
  assertIssuedForecastImmutable(original, forecast);
  if (forecast.status !== "resolved") throw new Error("NERO resolution intake requires a separate resolved record");
  const evidence = await prepareNeroResolutionEvidence(input);
  if (!isDeepStrictEqual(forecast.resolution.evidence, evidence)) throw new Error("NERO resolved evidence must match the archive and first-presence receipt");
  assertForecastSemantics(forecast);
  // Process-local admission cannot be asserted by a persisted boolean. A fresh
  // evaluation process must verify the retained archive and receipt again.
  admitted.set(forecast, digest(Buffer.from(JSON.stringify(forecast))));
  return { admitted: true, publisher_identity_verified: false, first_public_release_verified: false };
}

export function requireNeroResolutionAdmission(forecast) {
  if (forecast?.id !== original.id || forecast.status !== "resolved") return;
  if (admitted.get(forecast) !== digest(Buffer.from(JSON.stringify(forecast)))) {
    throw new Error("NERO resolved record requires current archive and first-presence intake before evaluation");
  }
}
