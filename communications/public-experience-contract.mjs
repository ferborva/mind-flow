import { readFileSync } from "node:fs";

import Ajv2020 from "ajv/dist/2020.js";
import addFormats from "ajv-formats";

const schema = JSON.parse(readFileSync(
  new URL("./schema/public-experience.schema.json", import.meta.url),
  "utf8",
));
const ajv = new Ajv2020({ allErrors: true, strict: true });
addFormats(ajv);
const validateSchema = ajv.compile(schema);

const FIRST_SCREEN_ORDER = [
  "status",
  "current-read",
  "scope",
  "if-status",
  "action-help-safety",
  "monitoring",
  "goal",
  "evidence-state",
  "path-status",
  "what-would-change",
];
const SIGNAL_ROLES = [
  "leading",
  "confirming",
  "counter",
  "outcome",
  "readiness",
  "intervention-exposure",
  "information-harm",
];
const HARM_TYPES = ["experienced", "acting", "waiting", "information"];
const ROUTE_TYPES = ["help", "challenge"];
const IMPERATIVE_AUTHORITY = /\b(?:will|must|shall|activates?|authori[sz]e[ds]?|guarantees?|commits?)\b/i;
const FALSE_CERTAINTY = /\b(?:inevitable|imminent|proves?|proven|guaranteed|certain(?:ly)?)\b/i;

function sameMembers(actual, expected) {
  return actual.length === expected.length &&
    [...actual].sort().every((value, index) => value === [...expected].sort()[index]);
}

function duplicates(values) {
  return new Set(values).size !== values.length;
}

function schemaErrors() {
  return (validateSchema.errors || []).map((error) =>
    `schema ${error.instancePath || "/"} ${error.message}`,
  );
}

export function renderPublicExperienceFirstLayer(record) {
  const conditionState = record.conditions
    .map(({ label, state }) => `${label}: ${state}`)
    .join(" | ");
  const evidence = record.current_read.evidence_state;
  const noRoute = record.routes
    .map(({ public_statement }) => public_statement)
    .filter((value, index, values) => values.indexOf(value) === index)
    .join(" ");

  const byId = new Map([
    ["status", {
      id: "status",
      label: "Status",
      text: `Research prototype. Not live. No Observatory service or policy authority. Record time: ${new Date(record.as_of).toISOString()}. Its clock is operator-supplied and untrusted.`,
    }],
    ["current-read", {
      id: "current-read",
      label: "Current read",
      text: `No transition conclusion. ${record.current_read.summary}`,
    }],
    ["scope", {
      id: "scope",
      label: "Scope and applicability",
      text: `${record.scope.place}. ${record.scope.population}. ${record.scope.period}. ${record.scope.applicability_statement}`,
    }],
    ["if-status", {
      id: "if-status",
      label: "IF status",
      text: `${conditionState}. No progress or crisis path is established.`,
    }],
    ["action-help-safety", {
      id: "action-help-safety",
      label: "Action, help and safety",
      text: `No Observatory action is authorised. This does not establish that waiting is safe. ${noRoute}`,
    }],
    ["monitoring", {
      id: "monitoring",
      label: "Monitoring",
      text: record.monitoring.public_statement,
    }],
    ["goal", {
      id: "goal",
      label: "Proposed goal (value choice)",
      text: `${record.goal.summary} Proposed by ${record.goal.proposed_by}. Affected-party adoption is not completed. Alternative goals and dissent remain legitimate.`,
    }],
    ["evidence-state", {
      id: "evidence-state",
      label: "Evidence state",
      text: `Record class: ${evidence.record_class}. Source authenticity: ${evidence.source_authenticity}. Measurement quality: ${evidence.measurement_quality}. Applicability: ${evidence.applicability}. Inference: ${evidence.inference_strength}. Decision readiness: ${evidence.decision_readiness}. Timing: ${evidence.timing_readiness}. ${evidence.uncertainty_summary}`,
    }],
    ["path-status", {
      id: "path-status",
      label: "Path status",
      text: record.path_status.public_statement,
    }],
    ["what-would-change", {
      id: "what-would-change",
      label: record.falsifier.plain_label,
      text: record.falsifier.summary,
    }],
  ]);

  return record.first_screen_order.map((id) => byId.get(id));
}

export function validatePublicExperienceRecord(record) {
  if (!validateSchema(record)) {
    return { valid: false, errors: schemaErrors(), projection: null };
  }

  const errors = [];
  if (record.first_screen_order.some((value, index) => value !== FIRST_SCREEN_ORDER[index])) {
    errors.push("first_screen_order must preserve the public action-first sequence");
  }

  const conditionIds = record.conditions.map(({ id }) => id);
  const actorIds = record.actors.map(({ id }) => id);
  const actorById = new Map(record.actors.map((actor) => [actor.id, actor]));
  const harmIds = record.harms.map(({ id }) => id);
  const routeIds = record.routes.map(({ id }) => id);
  for (const [name, values] of [
    ["condition", conditionIds],
    ["actor", actorIds],
    ["harm", harmIds],
    ["route", routeIds],
  ]) {
    if (duplicates(values)) errors.push(`${name} ids must be unique`);
  }

  if (!sameMembers(record.harms.map(({ type }) => type), HARM_TYPES)) {
    errors.push("harms must include experienced, acting, waiting and information exactly once");
  }
  if (!sameMembers(record.routes.map(({ type }) => type), ROUTE_TYPES)) {
    errors.push("routes must include unavailable help and challenge exactly once");
  }
  if (!routeIds.includes(record.dissent.challenge_route_id)) {
    errors.push("dissent challenge route must resolve");
  }
  if (!/does not establish/i.test(record.current_read.summary) ||
      !/progress/i.test(record.current_read.summary) ||
      !/crisis/i.test(record.current_read.summary)) {
    errors.push("current read must preserve the no-progress and no-crisis conclusion");
  }
  if (!/No positive or adverse path is established/i.test(record.path_status.public_statement) ||
      !/Refusal, reduction and no-deployment.*legitimate/i.test(record.path_status.public_statement)) {
    errors.push("path statement contradicts the bounded path states");
  }
  if (!/Monitoring inactive/i.test(record.monitoring.public_statement) ||
      !/No governed check/i.test(record.monitoring.public_statement)) {
    errors.push("monitoring statement contradicts inactive monitoring");
  }
  if (!record.routes.every(({ public_statement }) =>
    /No Observatory-linked help or challenge service exists/i.test(public_statement))) {
    errors.push("unavailable routes must use the no-service public boundary");
  }
  if (!/(?:reject|dissent|alternative goal)/i.test(record.dissent.public_statement) ||
      /everyone agrees|no dissent/i.test(record.dissent.public_statement)) {
    errors.push("dissent statement must preserve legitimate disagreement");
  }

  for (const condition of record.conditions) {
    const roles = condition.evidence_roles.map(({ role }) => role);
    if (!sameMembers(roles, SIGNAL_ROLES)) {
      errors.push(`${condition.id} must declare every signal role exactly once`);
    }
    const plans = record.actor_when_hypotheses.filter(
      ({ condition_id }) => condition_id === condition.id,
    );
    if (condition.actor_mapping.status === "mapped" && plans.length === 0) {
      errors.push(`${condition.id} is mapped but has no actor-specific WHEN hypothesis`);
    }
    if (condition.actor_mapping.status === "no-actor-identified" && plans.length > 0) {
      errors.push(`${condition.id} cannot have a WHEN after declaring no actor`);
    }
  }

  const asOf = Date.parse(record.as_of);
  for (const plan of record.actor_when_hypotheses) {
    if (!conditionIds.includes(plan.condition_id)) {
      errors.push(`${plan.id} references an unknown condition`);
    }
    if (!actorIds.includes(plan.actor_id)) {
      errors.push(`${plan.id} references an unknown actor`);
    } else if (actorById.get(plan.actor_id).relation !== "investigates") {
      errors.push(`${plan.id} cannot assign prototype work to a non-investigator`);
    }
    for (const dependency of plan.dependencies) {
      if (!actorIds.includes(dependency)) {
        errors.push(`${plan.id} references an unknown actor dependency`);
      }
      if (dependency === plan.actor_id) {
        errors.push(`${plan.id} cannot depend on its own actor`);
      }
    }
    for (const harmRef of plan.harm_refs) {
      if (!harmIds.includes(harmRef)) {
        errors.push(`${plan.id} references an unknown harm`);
      }
    }
    if (IMPERATIVE_AUTHORITY.test(plan.public_when)) {
      errors.push(`${plan.id} implies authority or commitment`);
    }
    if (!/could investigate/i.test(plan.public_when)) {
      errors.push(`${plan.id} must stay a proposed investigation hypothesis`);
    }
    if (!/registered|approved/i.test(plan.completion_criteria) ||
        /whenever.*actor says|self-certif/i.test(plan.completion_criteria)) {
      errors.push(`${plan.id} has an ungoverned completion criterion`);
    }
    if (!["harm.acting", "harm.waiting", "harm.information"].every(
      (harmRef) => plan.harm_refs.includes(harmRef),
    )) {
      errors.push(`${plan.id} must retain acting, waiting and information harms`);
    }
    if (Date.parse(`${plan.review_on}T23:59:59Z`) <= asOf) {
      errors.push(`${plan.id} review must follow the record as-of time`);
    }
    if (Date.parse(`${plan.expires_on}T23:59:59Z`) <= asOf) {
      errors.push(`${plan.id} expiry must follow the record as-of time`);
    }
    if (Date.parse(`${plan.review_on}T23:59:59Z`) >
        Date.parse(`${plan.expires_on}T23:59:59Z`)) {
      errors.push(`${plan.id} review cannot follow its expiry`);
    }
  }

  for (const harm of record.harms) {
    if (harm.state === "observed" && harm.evidence_refs.length === 0) {
      errors.push(`${harm.id} cannot be observed without evidence`);
    }
    if (harm.state === "unknown" && !/does not establish|unknown/i.test(harm.summary)) {
      errors.push(`${harm.id} unknown state is contradicted by its summary`);
    }
    if (harm.state === "not-assessed" && !/not assessed/i.test(harm.summary)) {
      errors.push(`${harm.id} not-assessed state is contradicted by its summary`);
    }
  }

  const publicText = JSON.stringify({
    goal: record.goal,
    current_read: record.current_read,
    scope: record.scope,
    conditions: record.conditions,
    actor_when_hypotheses: record.actor_when_hypotheses,
    harms: record.harms,
    dissent: record.dissent,
    routes: record.routes,
    monitoring: record.monitoring,
    condition_evolution: record.condition_evolution,
    path_status: record.path_status,
    falsifier: record.falsifier,
  });
  if (FALSE_CERTAINTY.test(publicText)) {
    errors.push("prototype public text implies unsupported certainty");
  }

  const projection = errors.length ? null : renderPublicExperienceFirstLayer(record);
  return { valid: errors.length === 0, errors, projection };
}
