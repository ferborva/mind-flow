#!/usr/bin/env node
import { readFileSync } from "node:fs";
import { parseArgs } from "node:util";
import { admitNeroResolution } from "./resolution-intake.mjs";
import { evaluateForecastCohort } from "./current-evaluation.mjs";
import { assertOperationalClock } from "../operational-clock.mjs";

// Read-only intake of a separately appended resolution, never an issue rewrite.
const names = ["forecast", "archive", "first-presence", "chronology", "chronology-tip", "source", "published-at", "retrieved-at", "as-of", "plan"];
const { values } = parseArgs({ options: Object.fromEntries(names.map((name) => [name, { type: "string" }])) });
for (const name of names) if (!values[name]) throw new Error(`required --${name}`);
assertOperationalClock({ asOf: values["as-of"], publishedAt: values["published-at"], retrievedAt: values["retrieved-at"] });
const json = (path) => JSON.parse(readFileSync(path, "utf8"));
assertOperationalClock({ firstPresenceObservedAt: json(values["first-presence"]).observed_at });
const forecast = json(values.forecast);
await admitNeroResolution(forecast, {
  archivePath: values.archive, archiveSource: values.source,
  firstPresenceReceiptBytes: readFileSync(values["first-presence"]),
  chronologyEvents: json(values.chronology), expectedSourceChronologyTip: json(values["chronology-tip"]),
  publishedAt: values["published-at"], retrievedAt: values["retrieved-at"],
});
const plan = json(values.plan);
if (plan.registered_plan_checksum !== "sha256:c734176e99f19caf0247b3d411180a26d6740ded558d88dfd3f84728dbe48a4a") {
  throw new Error("NERO intake requires the original registered evaluation plan");
}
const report = evaluateForecastCohort(plan, [forecast], { asOf: values["as-of"] });
process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
