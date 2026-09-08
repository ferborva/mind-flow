# Conditional options

This module compiles a closed agent proposal against a supplied condition that must satisfy `contracts/schema/condition-contract.schema.json` v3.

## Trust boundary

The caller-supplied inputs are the condition, an exact UTC `as_of`, and the selected gate eligibility record. Eligibility is content-bound to the condition and selected gate, but it is not an evaluated fact. It does not prove authority and always has `authorisation_effect: "none"`.

Compilation fails closed when the condition is malformed, semantically inconsistent, outside its governance window, or retired. An option must match the condition scope, fit the selected gate policy, target an in-scope service, and bind its outcome to a predicate reachable from that gate with the same signal, operator, threshold, and unit.

Option expiry cannot exceed either the condition expiry or 180 days from generation. Consent or rights dissent produces a withheld record. Other dissent remains inseparable from the atomic public record.

The renderer returns actor, condition, gate, and scope references with the public text and dissent record. `output_digest` is the canonical SHA-256 digest of every other returned field. It detects detached or altered output, but it does not authenticate the caller or grant authority.
