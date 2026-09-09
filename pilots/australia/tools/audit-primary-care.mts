import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { isDeepStrictEqual, parseArgs } from "node:util";
import { deriveMeasurements, digest } from "./primary-care.mts";
import { validateExecutableIfKernel } from "../../../contracts/executable-if/validate.mjs";
import { validateCurrentKernelSchemaProfile } from "../../../contracts/executable-if/current-schema-profile.mjs";
import { auditSignalThreshold } from "../../../contracts/executable-if/source-aware-audit.mjs";

const root = resolve(import.meta.dirname, "../../..");
const measurementPath = "pilots/australia/data/primary-care-2026-09-09.json";

export function auditPrimaryCareThresholds(kernel: any) {
  const bytes = readFileSync(resolve(root, measurementPath));
  const measured = JSON.parse(bytes.toString("utf8"));
  // Re-run the existing acquisition-hash and source-selector extraction checks.
  // The envelope is not accepted merely because a derived JSON field exists.
  if (!isDeepStrictEqual(measured, deriveMeasurements())) throw new Error("AU retained measurement replay differs from audit evidence");
  const artifactHash = digest(bytes);
  const sources = new Map([[artifactHash, bytes]]);
  const schemaProfile = validateCurrentKernelSchemaProfile(kernel);
  const formal = validateExecutableIfKernel(kernel);
  const definitions = new Map(kernel.events.flatMap((event: any) => event.introduced_definitions)
    .map((definition: any) => [definition.definition_hash, definition]));
  const thresholdAudits: any[] = [];
  for (const state of kernel.current_state) {
    if (state.lifecycle !== "active") continue;
    const definition: any = definitions.get(state.condition_definition_ref.definition_hash);
    if (!definition) throw new Error("AU audit cannot resolve the current condition definition");
    for (const [predicateId, predicate] of Object.entries<any>(definition.predicates)) {
      const signal = kernel.signals.find((item: any) => item.signal_definition_hash === predicate.signal_ref.signal_definition_hash);
      if (!signal) throw new Error("AU audit cannot resolve the exact predicate signal");
      const seriesIndex = measured.series.findIndex((item: any) => `signal.au.${item.id}` === signal.signal_id && item.source_url === signal.source_schema_ref);
      const series = measured.series[seriesIndex];
      const observations: any[] = [];
      if (series) for (const [pointIndex, point] of series.points.entries()) {
        const scope = definition.scope.geographies;
        const geographyMatches = (scope.includes("NSW") || scope.includes("NSW remoteness strata"))
          ? point.geography === "NSW" : scope.includes("Australia") ? ["Aust", "Australia"].includes(point.geography) : false;
        const urgentRuleGap = series.id === "telehealth-relationship-lookback" &&
          definition.scope.services.includes("Urgent unsociable-hours GP telehealth");
        if (!geographyMatches || urgentRuleGap) continue;
        observations.push({ signal_definition_hash: signal.signal_definition_hash,
          source_artifact_hash: artifactHash, source_field: `/series/${seriesIndex}/points/${pointIndex}` });
      }
      thresholdAudits.push({ condition_id: definition.condition_id, definition_hash: definition.definition_hash,
        predicate_id: predicateId, publisher_source_artifact_hash: series?.source_artifact_hash || null,
        audit: auditSignalThreshold({ signal, predicate, observations, domainProvenance: [], retainedSources: sources }) });
    }
  }
  const status = !formal.machine_valid || !schemaProfile.schema_profile_valid ? "invalid"
    : thresholdAudits.some((entry) => entry.audit.status === "flagged") ? "flagged"
      : thresholdAudits.some((entry) => entry.audit.status === "unassessed") ? "unassessed" : "assessed_no_flags";
  return { kernel_id: kernel.kernel_id, kernel_manifest_hash: kernel.manifest_hash,
    formal_kernel_valid: formal.machine_valid, formal_errors: formal.errors,
    schema_profile: schemaProfile, status, retained_measurements_path: measurementPath,
    retained_measurements_sha256: artifactHash, threshold_audits: thresholdAudits,
    evidence_ceiling: "Hash-bound historical source envelopes only. Source-domain metadata absent from these records remains unassessed. Normative research thresholds can legitimately lie outside a historical envelope; no sample extrema become a population domain or current condition truth.",
    empirical_plausibility_established: false, authority_effect: "none", action_authorised: false };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const { values } = parseArgs({ options: { kernel: { type: "string" }, "require-assessed": { type: "boolean", default: false } } });
  if (!values.kernel) throw new Error("required --kernel=PATH; choose the actual current kernel, never an implicit historic fallback");
  const result = auditPrimaryCareThresholds(JSON.parse(readFileSync(resolve(values.kernel), "utf8")));
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
  if (result.status === "invalid" || (values["require-assessed"] && result.status !== "assessed_no_flags")) process.exitCode = 1;
}
