import assert from "node:assert/strict";
import test from "node:test";
import { runNeroBaseline } from "../baseline-execution.mjs";

const parameters = { occupation_code: "5311", sa4_code: "101", first_month: "2026-01", last_month: "2026-05", horizon_months: 2 };
function input(values = [10, 12, 11, 9, 13]) {
  return { series: [{ occupation_code: "5311", sa4_code: "101", recent_observations:
    values.map((value, index) => ({ date: `2026-0${index + 1}-15`, value })) }] };
}

test("the predeclared two-month direction baseline uses Laplace smoothing and the naive comparator is one half", () => {
  assert.equal(runNeroBaseline("mind-flow.nero-two-month-direction", input(), parameters), 0.6);
  assert.equal(runNeroBaseline("mind-flow.equal-probability", input(), parameters), 0.5);
});

test("baseline computation rejects missing, duplicate, nonfinite and nonconsecutive selected observations", () => {
  for (const change of [
    (data) => data.series[0].recent_observations.splice(2, 1),
    (data) => data.series.push(structuredClone(data.series[0])),
    (data) => { data.series[0].recent_observations[0].value = Infinity; },
    (data) => { data.series[0].recent_observations[1].date = "2026-01-15"; },
  ]) {
    const data = input();
    change(data);
    assert.throws(() => runNeroBaseline("mind-flow.nero-two-month-direction", data, parameters));
    assert.throws(() => runNeroBaseline("mind-flow.equal-probability", data, parameters));
  }
  assert.throws(() => runNeroBaseline("unregistered-algorithm", input(), parameters));
  assert.throws(() => runNeroBaseline("mind-flow.nero-two-month-direction", input(), { ...parameters, horizon_months: 1 }));
});
