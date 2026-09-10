import { createHash } from "node:crypto";
import { isDeepStrictEqual } from "node:util";
import { firstPersonSentences } from "./validate-draft-provenance.mjs";

// Explicit forward repairs are reversed before historical deletion replay.
// This proves only exact byte accounting, never editorial permission or truth.
export function reverseEditorialAmendment(after, record) {
  const hash = value => createHash("sha256").update(value).digest("hex");
  if (typeof after !== "string" || !/^[a-f0-9]{64}$/.test(record?.before_sha256 || "") ||
      !/^[a-f0-9]{64}$/.test(record?.after_sha256 || "") || !Array.isArray(record?.changes) || !record.changes.length) {
    throw new Error("EDITORIAL_AMENDMENT_INVALID: explicit endpoints and changes are required");
  }
  if (hash(after) !== record.after_sha256) throw new Error("EDITORIAL_AMENDMENT_OUTPUT_DRIFT: current bytes differ from the reviewed endpoint");
  let before = after;
  for (const change of [...record.changes].reverse()) {
    if (typeof change.before !== "string" || typeof change.after !== "string" || !change.after ||
        typeof change.reason !== "string" || !change.reason.trim() || before.split(change.after).length !== 2) {
      throw new Error("EDITORIAL_AMENDMENT_ANCHOR_INVALID: unique non-empty anchors and reasons are required");
    }
    before = before.replace(change.after, () => change.before);
  }
  if (hash(before) !== record.before_sha256) throw new Error("EDITORIAL_AMENDMENT_INPUT_DRIFT: changes do not reconstruct the historical endpoint");
  return before;
}

// Mechanical deletion-only check, not semantic approval or source verification.
// Offsets are JavaScript UTF-16 offsets in the original body, excluding metadata.
export function validateDeletionRecord(after, record) {
  const errors = [];
  if (!Array.isArray(record?.deletions) || !/^[a-f0-9]{64}$/.test(record?.before_sha256 || "")) return ["invalid deletion record"];
  let before = after;
  let previousEnd = -1;
  for (const deletion of record.deletions) {
    if (!Number.isInteger(deletion.offset) || deletion.offset < 0 || deletion.offset > before.length ||
        deletion.offset < previousEnd || typeof deletion.text !== "string" || !deletion.text ||
        typeof deletion.reason !== "string" || !deletion.reason.trim()) return ["invalid, overlapping or unexplained deletion"];
    before = before.slice(0, deletion.offset) + deletion.text + before.slice(deletion.offset);
    previousEnd = deletion.offset + deletion.text.length;
  }
  if (createHash("sha256").update(before).digest("hex") !== record.before_sha256) errors.push("deletions do not reconstruct the pre-edit body; unlogged edit or cut");
  if (!isDeepStrictEqual(firstPersonSentences(before), firstPersonSentences(after))) errors.push("first-person sentences changed or deleted");
  const gaps = text => [...text.matchAll(/<!--\s*GAP:[\s\S]*?-->/g)].map(match => match[0]);
  if (!isDeepStrictEqual(gaps(before), gaps(after))) errors.push("GAP changed or deleted");
  return errors;
}
