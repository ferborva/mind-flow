import { parseExactInstant } from "../lib/registry.mjs";

// Pure replay helpers may use fixture dates. Production CLIs call this with its
// default actual clock before archive intake. This does not authenticate time.
export function assertOperationalClock(claims, now = new Date()) {
  const current = now.getTime();
  if (!Number.isFinite(current)) throw new Error("operational local UTC clock is invalid");
  for (const [field, value] of Object.entries(claims)) {
    if (parseExactInstant(value, field) > current) {
      throw new Error(`operational intake rejects future ${field} relative to actual local UTC`);
    }
  }
}
