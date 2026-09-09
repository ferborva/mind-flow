import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const dataRoot = resolve(import.meta.dirname, "../data");
const original = readFileSync(resolve(dataRoot, "nero-clerical-2026-08.json"));
const baseline = JSON.parse(original);
baseline.scope.occupation_classification_verification_status = "unverified_external_review_required";
baseline.correction = {
  record_id: "nero-clerical-2026-08.r2",
  supersedes_record_id: "nero-clerical-2026-08",
  supersedes_sha256: `sha256:${createHash("sha256").update(original).digest("hex")}`,
  corrected_on: "2026-09-09",
  code: "classification-verification-status-required",
  measurement_changed: false,
};
const { series, ...metadata } = baseline;
const bytes = `${JSON.stringify(metadata, null, 2).slice(0, -2)},\n  "series": [\n${series.map((row) => `    ${JSON.stringify(row)}`).join(",\n")}\n  ]\n}\n`;
const path = resolve(dataRoot, "nero-clerical-2026-08.r2.json");
if (process.argv.includes("--check")) {
  if (readFileSync(path, "utf8") !== bytes) throw new Error("NERO classification correction does not reproduce");
} else {
  writeFileSync(path, bytes, { flag: "wx" });
}
