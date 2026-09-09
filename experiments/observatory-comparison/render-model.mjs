import { createHash } from "node:crypto";

export const EXPOSURE_SECONDS = 480;

export function digest(value) {
  return `sha256:${createHash("sha256").update(value).digest("hex")}`;
}

export function canonicalJson(value) {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.keys(value).sort().map((key) =>
      `${JSON.stringify(key)}:${canonicalJson(value[key])}`).join(",")}}`;
  }
  return JSON.stringify(value);
}

function compact(value) {
  if (Array.isArray(value)) return value.join(" · ");
  if (value && typeof value === "object") {
    return Object.entries(value).map(([key, child]) =>
      `${key.replaceAll("_", " ")}: ${compact(child)}`).join(" · ");
  }
  return String(value);
}

export function deriveMaterialFacts(factPack) {
  const scope = factPack.decision_context.scope;
  const condition = factPack.if_conditions[0];
  const receipt = condition.evaluation_receipt;
  const forecast = factPack.forecast_context;
  const facts = [
    ["scope.who", "scope", "WHO", scope.people],
    ["scope.verb", "scope", "VERB", scope.verb],
    ["scope.object", "scope", "OBJECT", scope.object],
    ["scope.standard", "scope", "STANDARD", scope.standard],
    ["scope.place", "scope", "PLACE", scope.place],
    ["scope.period", "scope", "PERIOD", scope.period],
    ["scope.jurisdictions", "scope", "JURISDICTIONS", compact(scope.jurisdictions)],
    ["scope.geographies", "scope", "GEOGRAPHIES", compact(scope.geographies)],
    ["scope.services", "scope", "SERVICES", compact(scope.services)],
    ["if.question", "condition", "REGISTERED IF", condition.question],
    ["if.current-state", "condition", "SAMPLE RULE OUTPUT", `${condition.state.toUpperCase()} (not a real-world finding)`],
    ["if.state-basis", "condition", "STATE BASIS", condition.state_basis],
    ["if.strongest-challenge", "condition", "STRONGEST CHALLENGE", condition.strongest_challenge],
    ["if.next-observation", "condition", "NEXT OBSERVATION", condition.next_observation],
    ["if.evaluation-clock", "condition", "SAMPLE CLOCK", `${receipt.evaluated_at} · supplied by ${receipt.clock.source} · not trusted`],
    ["if.empirical-truth", "condition", "DOES THIS REFLECT REAL CONDITIONS?", "No. Empirical truth has not been tested."],
    ["forecast.probability", "forecast", "INVENTED TEST VALUE", `${Math.round(forecast.probability * 100)}% (not an estimate)`],
    ["forecast.semantic-boundary", "forecast", "FORECAST BOUNDARY", compact({
      role: forecast.semantic_role,
      truth_effect: forecast.truth_effect,
      may_set_if_state: forecast.may_set_if_state,
    })],
    ["authority.boundary", "authority", "IS ANY ACTION AUTHORISED?", "No. There is no real warning, service, decision or authorised action. Do not act on this page."],
    ["authority.affected-party-status", "authority", "AFFECTED-PARTY STATUS", factPack.decision_context.affected_party_consultation.public_statement],
    ["provenance.source-bundle", "provenance", "SOURCE BUNDLE", compact(factPack.source_transition_bundle_ref)],
    ["provenance.definition", "provenance", "CONDITION DEFINITION", compact(condition.condition_definition_ref)],
    ["provenance.evidence", "provenance", "EVIDENCE STATE HASH", receipt.evidence_state_hash],
    ["provenance.evaluation", "provenance", "EVALUATION HASH", receipt.evaluation_hash],
    ["correction.route", "provenance", "CORRECTION STATUS", `No approved correction service exists for this mock-up. Repository-only example: ${factPack.correction_route}`],
  ].map(([id, category, label, value]) => ({ id, category, label, value }));

  for (const claim of factPack.claims) {
    facts.push({
      id: `claim.${claim.claim_id}`,
      category: "claims",
      label: `${claim.epistemic_status.toUpperCase()} CLAIM`,
      value: compact({ text: claim.text, scope: claim.scope, uncertainty: claim.uncertainty }),
    });
  }
  for (const state of factPack.state_legend) {
    facts.push({
      id: `state.${state.state}`,
      category: "states",
      label: state.public_label,
      value: compact({ meaning: state.public_meaning, next_step: state.next_step }),
    });
  }
  return facts;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function renderItems(items, kind) {
  return items.map((item, index) => `
          <article data-material-id="${escapeHtml(item.id)}" class="material ${escapeHtml(item.category)}" style="--i:${index}">
            <h3>${escapeHtml(item.label)}</h3>
            <p data-material-value>${escapeHtml(item.value)}</p>
          </article>`).join("");
}

function css(kind) {
  if (kind === "conventional-release") return `
      :root{font:16px/1.5 Arial,Helvetica,sans-serif;color:#17212b;background:#eef1f4}*{box-sizing:border-box}body{margin:0}header,main,footer{width:min(1120px,calc(100% - 40px));margin:auto}header{padding:38px 0 28px;border-bottom:5px solid #173d6b}header p{margin:5px 0;color:#536273}.boundary{padding:14px;border:3px solid #9c2f24;background:#fff4f1;color:#721e16;font-weight:800;letter-spacing:.04em}.kicker{font-size:12px;font-weight:700;letter-spacing:.08em;text-transform:uppercase}h1{margin:5px 0;font:700 38px/1.1 Georgia,serif;color:#132b47}.exposure{display:inline-block;margin-top:16px;padding:6px 9px;border:1px solid #768494;background:white;font:12px monospace}main{padding:30px 0 60px}.group{margin:0 0 28px;background:#fff;border:1px solid #cad1d8}.group>h2{margin:0;padding:14px 18px;background:#e3e8ed;font-size:18px}.materials{display:grid;grid-template-columns:1fr 1fr}.material{padding:17px 18px;border-top:1px solid #dce1e5}.material:nth-child(odd){border-right:1px solid #dce1e5}.material h3{margin:0 0 7px;font:700 11px/1.3 monospace;color:#3e5873}.material p{margin:0;white-space:pre-wrap;overflow-wrap:anywhere}.states{border-left:5px solid #b36200}.forecast{border-left:5px solid #356a8a}.authority{border-left:5px solid #9c2f24}footer{padding:25px 0;border-top:1px solid #aab4bd;color:#536273}@media(max-width:700px){.materials{grid-template-columns:1fr}.material:nth-child(odd){border-right:0}h1{font-size:30px}}`;
  return `
      :root{font:15px/1.55 ui-sans-serif,system-ui,sans-serif;color:#e9f5eb;background:#06100d;--mint:#9de9bd;--line:#28443a}*{box-sizing:border-box}body{margin:0;background:radial-gradient(circle at 82% 0,#17352b 0,transparent 28rem),#06100d}body:before{content:"";position:fixed;inset:0;pointer-events:none;background-image:linear-gradient(#b2d8c70e 1px,transparent 1px),linear-gradient(90deg,#b2d8c70e 1px,transparent 1px);background-size:48px 48px}header,main,footer{position:relative;width:min(1240px,calc(100% - 44px));margin:auto}header{padding:52px 0 38px;border-bottom:1px solid var(--line)}header p{margin:6px 0;color:#91a69c}.boundary{padding:16px;border:3px solid #e8cf8d;background:#31250c;color:#fff2c1;font-weight:800;letter-spacing:.04em}.kicker{font:11px monospace;letter-spacing:.13em;text-transform:uppercase;color:var(--mint)}h1{margin:10px 0;font:400 56px/1 Georgia,serif}.exposure{display:inline-block;margin-top:18px;padding:7px 10px;border:1px solid var(--line);color:#d8dfda;font:11px monospace}main{padding:38px 0 80px}.group{margin:0 0 18px;border:1px solid var(--line);background:#091713d9}.group>h2{margin:0;padding:16px 20px;border-bottom:1px solid var(--line);color:var(--mint);font:11px monospace;letter-spacing:.12em;text-transform:uppercase}.materials{display:grid;grid-template-columns:repeat(3,1fr)}.material{min-width:0;padding:22px;border-right:1px solid var(--line);border-bottom:1px solid var(--line)}.material h3{margin:0 0 9px;color:#789287;font:10px monospace;letter-spacing:.08em}.material p{margin:0;color:#d4e1d7;font:16px Georgia,serif;white-space:pre-wrap;overflow-wrap:anywhere}.state{border-top:2px solid var(--mint)}.forecast{background:#0d2420}.authority{background:#231716}.provenance{font-size:11px}footer{padding:30px 0;border-top:1px solid var(--line);color:#789287;font:10px monospace}@media(max-width:800px){.materials{grid-template-columns:1fr}.material{border-right:0}h1{font-size:39px}}@media(prefers-reduced-motion:reduce){*{scroll-behavior:auto!important}}`;
}

export function renderArmHtml({ kind, factPackRef, materialFacts, exposureSeconds = EXPOSURE_SECONDS }) {
  const groups = ["scope", "condition", "claims", "states", "forecast", "authority", "provenance"];
  const titles = {
    scope: "Claim scope", condition: "Executable IF", claims: "Material claims",
    states: "Five-state meanings", forecast: "Forecast context",
    authority: "Authority boundary", provenance: "Source and correction",
  };
  const groupHtml = groups.map((group) => {
    const items = materialFacts.filter(({ category }) => category === group);
    return `<section class="group" aria-labelledby="group-${group}">
        <h2 id="group-${group}">${titles[group]}</h2>
        <div class="materials">${renderItems(items, kind)}
        </div>
      </section>`;
  }).join("\n      ");
  const displayName = kind === "conventional-release"
    ? "Study mock-up: conventional layout"
    : "Study mock-up: Observatory layout";
  const contract = {
    schema_version: "1.0.0",
    instrument_kind: kind,
    fact_pack_ref: factPackRef,
    material_digest: digest(canonicalJson(materialFacts)),
    exposure_seconds: exposureSeconds,
    comprehension_assessed: false,
    recruitment_allowed: false,
    authority_effect: "none",
  };
  const safeContract = JSON.stringify(contract).replaceAll("<", "\\u003c");
  return `<!doctype html>
<html lang="en" data-instrument-kind="${kind}" data-exposure-seconds="${exposureSeconds}">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${displayName} · Round 05 comparison</title><style>${css(kind)}</style></head>
<body>
  <header>
    <p class="boundary">FICTIONAL TEST DATA. NOT A PUBLIC RELEASE.</p>
    <p class="kicker">Round 05 interface study · source-bound research mock-up</p>
    <h1>${displayName}</h1>
    <p>Exact shared fictional material, rendered through the ${kind === "conventional-release" ? "conventional" : "Observatory"} layout.</p>
    <p class="exposure">Planned viewing time: 8 minutes, timer inactive</p>
  </header>
  <main id="main-content">${groupHtml}</main>
  <footer>FICTIONAL TEST DATA. NOT A PUBLIC RELEASE. There is no real warning, service, decision or authorised action. Recruitment blocked · Comprehension unassessed.</footer>
  <script type="application/json" id="render-contract">${safeContract}</script>
</body>
</html>
`;
}
