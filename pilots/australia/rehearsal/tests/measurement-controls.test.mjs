import assert from "node:assert/strict";
import test from "node:test";

import { auditDeclineRuns } from "../../tools/decline-audit.mjs";
import { compareDecisionPolicies } from "../../tools/decision-utility.mjs";

function monthlyRows(seriesCount, monthCount) {
  const rows = [];
  for (let series = 0; series < seriesCount; series += 1) {
    for (let index = 0; index < monthCount; index += 1) {
      const date = new Date(Date.UTC(2015, 8 + index, 15)).toISOString().slice(0, 10);
      rows.push({
        occupation_code: "5311",
        sa4_code: String(100 + series),
        date,
        value: monthCount - index,
      });
    }
  }
  return rows;
}

test("three-decline denominator starts only after three eligible comparisons", () => {
  const audit = auditDeclineRuns([
    { occupation_code: "5311", sa4_code: "101", date: "2022-01-15", value: 100 },
    { occupation_code: "5311", sa4_code: "101", date: "2022-02-15", value: 99 },
    { occupation_code: "5311", sa4_code: "101", date: "2022-03-15", value: 98 },
    { occupation_code: "5311", sa4_code: "101", date: "2022-04-15", value: 97 },
    { occupation_code: "5311", sa4_code: "101", date: "2022-05-15", value: 98 },
    { occupation_code: "5311", sa4_code: "101", date: "2022-06-15", value: 97 },
  ], {
    negativeControlStart: "2022-04-15",
    negativeControlEnd: "2022-04-15",
  });

  assert.deepEqual(audit.whole_archive.three_decline, {
    numerator: 1,
    denominator: 3,
    share: 0.333333,
    first_eligible_date: "2022-04-15",
    last_eligible_date: "2022-06-15",
  });
  assert.equal(audit.negative_control_era.three_decline.denominator, 1);
  assert.equal(audit.negative_control_era.three_decline.numerator, 1);
  assert.equal(audit.later_era.three_decline.denominator, 2);
  assert.equal(audit.later_era.three_decline.numerator, 0);
});

test("boundary-month eligibility produces the declared NERO denominators", () => {
  const audit = auditDeclineRuns(monthlyRows(440, 132), {
    negativeControlStart: "2016-09-15",
    negativeControlEnd: "2022-11-15",
  });

  assert.equal(audit.whole_archive.monthly_change.denominator, 57_640);
  assert.equal(audit.whole_archive.three_decline.denominator, 56_760);
  assert.equal(audit.negative_control_era.three_decline.denominator, 33_000);
  assert.equal(audit.later_era.three_decline.denominator, 19_800);
});

test("no-alert is compared through decision utility while precision stays undefined", () => {
  const result = compareDecisionPolicies([
    { alert: false, event: false },
    { alert: false, event: false },
  ], { falsePositive: 1, falseNegative: 5 });

  assert.equal(result.status, "evaluated");
  assert.equal(result.no_alert.precision, null);
  assert.equal(result.no_alert.precision_reason, "No predicted positives; precision is undefined.");
  assert.equal(result.no_alert.net_utility, 0);
  assert.equal(result.preferred_policy, "tie");
});

test("rare events and censored outcomes produce explicit utility decisions", () => {
  const rare = compareDecisionPolicies([
    { alert: true, event: true },
    { alert: false, event: false },
    { alert: false, event: null },
  ], { falsePositive: 1, falseNegative: 5 });
  assert.equal(rare.eligible_outcomes, 2);
  assert.equal(rare.censored_outcomes, 1);
  assert.equal(rare.candidate.net_utility, 0);
  assert.equal(rare.no_alert.net_utility, -5);
  assert.equal(rare.preferred_policy, "candidate");

  const censored = compareDecisionPolicies([
    { alert: false, event: null },
  ], { falsePositive: 1, falseNegative: 5 });
  assert.equal(censored.status, "insufficient_evidence");
  assert.equal(censored.preferred_policy, null);
  assert.equal(censored.no_alert.precision, null);
  assert.equal(censored.no_alert.net_utility, null);
});
