#!/usr/bin/env node
import { readFileSync } from "node:fs";
import { parseArgs } from "node:util";
import { admitNeroResolution } from "./resolution-intake.mjs";
import { evaluateForecastCohort } from "../../lib/evaluation.mjs";

// Read-only intake of a separately appended resolution, never an issue rewrite.
const names = ["forecast", "archive", "first-presence", "chronology", "chronology-tip", "source", "published-at", "retrieved-at", "as-of", "plan"];
const { values } = parseArgs({ options: Object.fromEntries(names.map((name) => [name, { type: "string" }])) });
for (const name of names) if (!values[name]) throw new Error(`required --${name}`);
const json = (path) => JSON.parse(readFileSync(path, "utf8"));
const forecast = json(values.forecast);
await admitNeroResolution(forecast, {
  archivePath: values.archive, archiveSource: values.source,
  firstPresenceReceiptBytes: readFileSync(values["first-presence"]),
  chronologyEvents: json(values.chronology), expectedSourceChronologyTip: json(values["chronology-tip"]),
  publishedAt: values["published-at"], retrievedAt: values["retrieved-at"],
});
const plan = json(values.plan);
if (plan.registered_plan_checksum !== "sha256:cc5cf07df6344fdae1bd25927069b7e6f91b1ead813374fba9c99f9045c88f2e") {
  throw new Error("NERO intake requires the original registered evaluation plan");
}
const report = evaluateForecastCohort(plan, [forecast], { asOf: values["as-of"] });
process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
