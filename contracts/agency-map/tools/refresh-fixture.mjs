import { readFileSync, writeFileSync } from "node:fs";

import {
  computeMetricChecksum,
  computeOutcomeScopeHash,
  computePublicProjection,
} from "../validate.mjs";

const fixtureUrl = new URL("../fixtures/australian-clerical-agency.synthetic.json", import.meta.url);
const fixture = JSON.parse(readFileSync(fixtureUrl, "utf8"));

for (const signal of fixture.signals) {
  signal.metric.metric_checksum = computeMetricChecksum(signal.metric);
}
fixture.outcome_scope.scope_hash = computeOutcomeScopeHash(fixture);
fixture.public_projection = computePublicProjection(fixture);

writeFileSync(fixtureUrl, `${JSON.stringify(fixture, null, 2)}\n`);
