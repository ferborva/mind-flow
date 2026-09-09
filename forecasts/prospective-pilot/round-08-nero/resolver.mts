import { rowsFromZip } from "../../../dashboard/tools/build-nero-baseline.mjs";
import { boundedEmploymentIndex } from "./basis.mts";

// This source adapter prepares the existing closed binary-threshold JSON
// payload. Native archive bytes and their first-presence receipt stay separate.
export function neroOutcomePayload(rows: string[][], forecast: any) {
  const target = forecast.target;
  if (target.observation_window_start !== "2026-10-01T00:00:00Z" ||
      target.observation_window_end !== "2026-10-31T23:59:59Z" ||
      target.resolver.operator !== "gte" || target.resolver.threshold !== 0.5 ||
      target.signal_id !== "signal.nero.5311.101.bounded-stock" ||
      target.condition_id !== "condition.nero.5311.101.stock") {
    throw new Error("NERO adapter only resolves the frozen October 2026 stock target");
  }
  const selected = rows.filter((row) => row[2] === "101" && row[4] === "5311" && row[6] === "2026-10-15");
  if (selected.length !== 1) throw new Error("exactly one October General Clerks Capital Region cell is required");
  const row = selected[0];
  if (row.length !== 8 || row[1] !== "NSW" || row[3] !== "Capital Region" || row[5] !== "General Clerks" ||
      !/^(0|[1-9]\d*)$/.test(row[7])) throw new Error("NERO labels or numeric cell changed; do not infer a replacement");
  const value = boundedEmploymentIndex(Number(row[7]));
  return { schema_version: "1.1.0", resolution_event_id: target.resolution_event_id,
    signal_id: target.signal_id, metric_id: target.metric_id, metric_checksum: target.metric_checksum,
    condition_id: target.condition_id, scope_hash: target.scope_hash, measure: target.resolver.measure,
    unit: target.resolver.observation_unit, scope: target.scope,
    observation_window_start: target.observation_window_start, observation_window_end: target.observation_window_end, value };
}

export async function extractNeroResolution(archivePath: string, forecast: any) {
  const selected: string[][] = [];
  // Consume the entire verified stream, so ZIP size and CRC checks complete.
  for await (const row of await rowsFromZip(archivePath)) {
    if (row[2] === "101" && row[4] === "5311" && row[6] === "2026-10-15") selected.push(row);
  }
  return neroOutcomePayload(selected, forecast);
}
