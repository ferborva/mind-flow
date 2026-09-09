import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

import {
  renderPublicExperienceFirstLayer,
  validatePublicExperienceRecord,
} from "../public-experience-contract.mjs";

const root = resolve(import.meta.dirname, "../..");
const fixturePath = resolve(
  root,
  "communications/fixtures/public-experience.prototype.json",
);
const fixture = JSON.parse(readFileSync(fixturePath, "utf8"));
const guide = readFileSync(
  resolve(root, "communications/public-experience-contract.md"),
  "utf8",
);

function changed(mutator) {
  const value = structuredClone(fixture);
  mutator(value);
  return value;
}

test("the prototype public-experience record is valid and renders deterministically", () => {
  const first = validatePublicExperienceRecord(fixture);
  const second = validatePublicExperienceRecord(structuredClone(fixture));
  assert.equal(first.valid, true, first.errors.join("\n"));
  assert.deepEqual(second, first);
  assert.deepEqual(
    first.projection,
    renderPublicExperienceFirstLayer(fixture),
  );
  assert.deepEqual(
    first.projection.map(({ id }) => id),
    fixture.first_screen_order,
  );
});

test("the first layer exposes goal, scope, uncertainty, IF state and action safety", () => {
  const text = JSON.stringify(validatePublicExperienceRecord(fixture).projection);
  for (const required of [
    /value choice/i,
    /affected-party adoption is not completed/i,
    /alternative goals and dissent remain legitimate/i,
    /no transition conclusion/i,
    /does not describe an individual/i,
    /source authenticity: unverified/i,
    /applicability: unknown/i,
    /decision readiness: none/i,
    /capability: unknown/i,
    /reach: unknown/i,
    /agency: unknown/i,
    /durability: unknown/i,
    /fairness: unknown/i,
    /does not establish that waiting is safe/i,
    /no Observatory-linked help or challenge service exists/i,
    /monitoring inactive/i,
    /no positive or adverse path is established/i,
    /record time: 2026-09-09T00:00:00.000Z/i,
    /operator-supplied and untrusted/i,
  ]) assert.match(text, required);
  assert.doesNotMatch(text, new RegExp("\\u2014"));
});

test("every condition declares all evidence roles and an actor mapping disposition", () => {
  const roles = [
    "leading",
    "confirming",
    "counter",
    "outcome",
    "readiness",
    "intervention-exposure",
    "information-harm",
  ];
  for (const condition of fixture.conditions) {
    assert.deepEqual(
      condition.evidence_roles.map(({ role }) => role).sort(),
      [...roles].sort(),
    );
    assert.ok(condition.actor_mapping.status);
  }
});

test("actor WHENs remain expiring hypotheses rather than authority or commitments", () => {
  const plan = fixture.actor_when_hypotheses[0];
  for (const mutation of [
    changed((value) => {
      value.actor_when_hypotheses[0].authority_state = "verified";
    }),
    changed((value) => {
      value.actor_when_hypotheses[0].commitment_state = "committed";
    }),
    changed((value) => {
      value.actor_when_hypotheses[0].public_when =
        "The research team will activate support when the signal moves.";
    }),
    changed((value) => {
      value.actor_when_hypotheses[0].expires_on = null;
    }),
  ]) {
    const result = validatePublicExperienceRecord(mutation);
    assert.equal(result.valid, false);
  }
  assert.equal(plan.claim_class, "action-hypothesis");
});

test("mapped conditions require a scoped actor WHEN and no actor is invented", () => {
  const missingPlan = changed((value) => {
    value.actor_when_hypotheses = value.actor_when_hypotheses.filter(
      ({ condition_id }) => condition_id !== "fairness",
    );
  });
  assert.equal(validatePublicExperienceRecord(missingPlan).valid, false);

  const inventedActor = changed((value) => {
    value.actor_when_hypotheses[0].actor_id = "actor.unregistered";
  });
  assert.equal(validatePublicExperienceRecord(inventedActor).valid, false);
});

test("acting, waiting, experienced and information harms cannot be omitted or scored away", () => {
  for (const harmType of ["experienced", "acting", "waiting", "information"]) {
    const missing = changed((value) => {
      value.harms = value.harms.filter(({ type }) => type !== harmType);
    });
    assert.equal(validatePublicExperienceRecord(missing).valid, false);
  }

  const observedWithoutEvidence = changed((value) => {
    value.harms[0].state = "observed";
    value.harms[0].evidence_refs = [];
  });
  assert.equal(validatePublicExperienceRecord(observedWithoutEvidence).valid, false);

  const syntheticScore = changed((value) => {
    value.harms[0].score = 0.7;
  });
  assert.equal(validatePublicExperienceRecord(syntheticScore).valid, false);
});

test("the current prototype cannot fabricate authority, live routes or monitoring", () => {
  for (const mutation of [
    changed((value) => {
      value.authority.observatory_authority = "execute";
    }),
    changed((value) => {
      value.routes[0].availability = "available";
      value.routes[0].verified = true;
      value.routes[0].uri = "https://example.test/help";
      value.routes[0].owner = "Invented owner";
    }),
    changed((value) => {
      value.monitoring.status = "active";
      value.monitoring.next_check_on = "2026-10-01";
      value.monitoring.owner = "Invented monitor";
    }),
    changed((value) => {
      value.evaluation_clock.trusted = true;
    }),
  ]) {
    const result = validatePublicExperienceRecord(mutation);
    assert.equal(result.valid, false);
  }
});

test("uncertainty dimensions, dissent and condition evolution stay explicit", () => {
  const missingUncertainty = changed((value) => {
    delete value.current_read.evidence_state.applicability;
  });
  assert.equal(validatePublicExperienceRecord(missingUncertainty).valid, false);

  const hiddenDissent = changed((value) => {
    value.dissent.public_statement = "";
  });
  assert.equal(validatePublicExperienceRecord(hiddenDissent).valid, false);

  const inventedHistory = changed((value) => {
    value.condition_evolution.events.push({
      operation: "satisfied",
      condition_id: "capability",
    });
  });
  assert.equal(validatePublicExperienceRecord(inventedHistory).valid, false);
});

test("free text cannot contradict bounded prototype states", () => {
  for (const mutation of [
    changed((value) => {
      value.current_read.summary =
        "The transition crisis is imminent and this record proves it.";
    }),
    changed((value) => {
      value.path_status.public_statement =
        "The positive abundance path is now established.";
    }),
    changed((value) => {
      value.monitoring.public_statement =
        "Live monitoring is active and a team is watching.";
    }),
    changed((value) => {
      value.routes[0].public_statement =
        "Help exists for everyone through the Observatory.";
    }),
    changed((value) => {
      value.dissent.public_statement =
        "Everyone agrees with the goal and no dissent remains.";
    }),
    changed((value) => {
      value.harms[2].summary = "Waiting is safe and no harm exists.";
    }),
  ]) {
    assert.equal(validatePublicExperienceRecord(mutation).valid, false);
  }
});

test("WHEN review and expiry chronology fails closed", () => {
  const backwards = changed((value) => {
    value.actor_when_hypotheses[0].review_on = "2026-10-10";
    value.actor_when_hypotheses[0].expires_on = "2026-10-09";
  });
  assert.equal(validatePublicExperienceRecord(backwards).valid, false);
});

test("actor WHEN wording cannot assign coercive work or self-certify completion", () => {
  for (const mutation of [
    changed((value) => {
      value.actor_when_hypotheses[0].public_when =
        "The proposed research team could coerce affected people when convenient.";
    }),
    changed((value) => {
      value.actor_when_hypotheses[0].completion_criteria =
        "Complete whenever the proposed actor says it is complete.";
    }),
    changed((value) => {
      value.actor_when_hypotheses[0].actor_id = "actor.affected-public";
      value.actors.push({
        id: "actor.affected-public",
        label: "Affected public",
        relation: "affected",
        identity_state: "unverified",
      });
    }),
    changed((value) => {
      value.actor_when_hypotheses[0].dependencies = [
        "actor.proposed-research-team",
      ];
    }),
    changed((value) => {
      value.actor_when_hypotheses[0].harm_refs = [
        "harm.acting",
        "harm.waiting",
      ];
    }),
  ]) {
    assert.equal(validatePublicExperienceRecord(mutation).valid, false);
  }
});

test("the public artifact explains the complete executable boundary", () => {
  for (const required of [
    /first-screen order/i,
    /actor-specific WHEN/i,
    /action hypothesis/i,
    /safety of acting/i,
    /safety of waiting/i,
    /information harm/i,
    /alternative goals and dissent/i,
    /condition evolution/i,
    /No Observatory-linked help or challenge service exists/i,
    /does not validate truth, authority or public comprehension/i,
  ]) assert.match(guide, required);
  assert.doesNotMatch(guide, new RegExp("\\u2014"));
});
