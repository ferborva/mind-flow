import assert from "node:assert/strict";
import test from "node:test";
import { assertOperationalClock } from "../operational-clock.mjs";

test("operational admission rejects every claimed clock later than actual local UTC", () => {
  const now = new Date("2026-09-10T00:30:00Z");
  for (const field of ["asOf", "publishedAt", "retrievedAt", "firstPresenceObservedAt"]) {
    assert.throws(() => assertOperationalClock({ [field]: "2026-11-04T00:00:00Z" }, now), /future/);
  }
  assert.doesNotThrow(() => assertOperationalClock({ asOf: "2026-09-10T00:30:00Z",
    retrievedAt: "2026-09-10T00:29:59Z" }, now));
  assert.throws(() => assertOperationalClock({ asOf: "invalid" }, now));
});
