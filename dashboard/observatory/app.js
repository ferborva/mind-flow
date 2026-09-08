(function () {
  "use strict";

  const failClosed = () => {
    document.body.dataset.projectionState = "failed";
    const alert = document.querySelector("#observatory-error");
    if (!alert) return;
    alert.hidden = false;
    alert.textContent = "This projection could not be verified. Rebuild it from a coherent source bundle before interpreting any state or path.";
  };

  try {
  const data = window.OBSERVATORY_DATA;
  if (!data) throw new Error("Observatory data is unavailable");

  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
  const text = (selector, value, root = document) => {
    const node = $(selector, root);
    if (node) node.textContent = value;
    return node;
  };
  const node = (tag, className, content) => {
    const element = document.createElement(tag);
    if (className) element.className = className;
    if (content !== undefined) element.textContent = content;
    return element;
  };
  const formatDate = (iso, withYear = true) =>
    new Intl.DateTimeFormat("en-AU", {
      day: "2-digit",
      month: "short",
      ...(withYear ? { year: "numeric" } : {}),
      timeZone: "UTC",
    }).format(new Date(iso));
  const shortHash = (value) => `${value.slice(0, 15)}…${value.slice(-8)}`;

  text("#round-label", data.meta.round);
  text("#classification-label", data.meta.classification.replaceAll("-", " "));
  const asOf = text("#as-of", `As of ${formatDate(data.meta.asOf)}`);
  asOf.dateTime = data.meta.asOf;
  $$('[data-current-state]').forEach((element) => {
    element.textContent = `Mechanically computed: ${data.condition.currentState}`;
    element.dataset.state = data.condition.currentState;
  });
  Object.entries(data.condition.grammar).forEach(([key, value]) => {
    text(`[data-grammar="${key}"]`, value);
  });

  text(
    "#current-evidence-note",
    `Synthetic fixture · ${data.condition.observationCount} hash-bound observations · empirical truth ${data.condition.empiricalTruthEstablished ? "established" : "not established"}`,
  );
  const percentage = Math.round(data.forecast.probability * 100);
  text("#probability-number", `${percentage}%`);
  $("#probability-ring").style.setProperty("--probability", `${percentage * 3.6}deg`);
  text("#forecast-short", `${percentage}% · resolves after ${formatDate(data.forecast.resolveAfter)}`);
  text("#authority-status", "No action authorised");
  text("#authority-note", `Authority effect: ${data.authority.effect}. Human decision required.`);
  const nextCheck = text("#next-check-date", formatDate(data.preparation.reviewBy));
  nextCheck.dateTime = data.preparation.reviewBy;
  text("#next-check-note", "Proposal checkpoint only. Evidence must be re-evaluated before starting.");

  const stateSwitcher = $("#state-switcher");
  let selectedState = data.condition.currentState;
  function renderBranch(stateId, focus = false) {
    selectedState = stateId;
    const state = data.states.find(({ id }) => id === stateId);
    $$("button", stateSwitcher).forEach((button) => {
      const selected = button.dataset.state === stateId;
      button.setAttribute("aria-pressed", String(selected));
      button.tabIndex = selected ? 0 : -1;
    });
    $("#branch-display").dataset.state = stateId;
    text("#branch-state", stateId);
    text("#branch-recovery", state.recovery);
    text("#branch-action", state.action.replaceAll("-", " "));
    text("#branch-explanation", state.explanation);
    const scenarioLabel = stateId === data.condition.currentState
      ? `Current receipt: ${data.condition.currentState}. Registered response.`
      : `Hypothetical branch: ${stateId}. Current receipt remains ${data.condition.currentState}.`;
    text("#scenario-flag", scenarioLabel);
    $("#branch-display").setAttribute("aria-label", scenarioLabel);
    if (focus) $("#branch-display").focus({ preventScroll: true });
  }
  data.states.forEach((state) => {
    const button = node("button", "state-button");
    button.type = "button";
    button.dataset.state = state.id;
    button.setAttribute("aria-pressed", "false");
    button.append(node("span", "state-dot"), node("b", "", state.id), node("small", "", state.recovery));
    button.addEventListener("click", () => renderBranch(state.id));
    button.addEventListener("keydown", (event) => {
      if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
      event.preventDefault();
      const current = data.states.findIndex(({ id }) => id === selectedState);
      let next = event.key === "Home" ? 0 : event.key === "End" ? data.states.length - 1 : current + (event.key === "ArrowRight" ? 1 : -1);
      next = (next + data.states.length) % data.states.length;
      renderBranch(data.states[next].id);
      $(`button[data-state="${data.states[next].id}"]`, stateSwitcher).focus();
    });
    stateSwitcher.append(button);
  });
  renderBranch(selectedState);

  const axes = [
    {
      id: "definition",
      label: "Definition",
      eyebrow: `${data.evolution.definition.changeCount} registered changes`,
      title: `Version ${data.evolution.definition.definitionVersion}`,
      description: "Meaning changes remain append-only and hash-bound. A revised definition cannot inherit an earlier conclusion silently.",
      facts: data.evolution.definition.operations,
      footer: data.evolution.definition.historyStatus,
    },
    {
      id: "evidence",
      label: "Evidence",
      eyebrow: `${data.evolution.evidence.eventCount} evidence events`,
      title: data.evolution.evidence.sourceStatus,
      description: "The mechanical receipt is reproducible, but the registered source artifact has not been acquired. Structural validity is not empirical truth.",
      facts: [data.evolution.evidence.tipEventId, `state ${shortHash(data.evolution.evidence.stateHash)}`],
      footer: `${data.condition.observationCount} current observation hashes`,
    },
    {
      id: "path",
      label: "Path",
      eyebrow: `${data.evolution.path.branchCount} IF branches`,
      title: "Fail closed on change",
      description: "Every registered definition event forces review of the candidate path. Non-true evidence states stop consequential traversal.",
      facts: ["true → human review", "false → repair or alternate", "unknown · stale · conflicted → resolve first"],
      footer: data.evolution.path.historyRequirement,
    },
    {
      id: "values",
      label: "Actor + values",
      eyebrow: data.evolution.actorValues.classification,
      title: "Abundance with agency",
      description: data.evolution.actorValues.goal,
      facts: data.evolution.actorValues.affectedPopulations.map((population) => `${population.label} · ${population.voice_status}`),
      footer: `Selection authority: ${data.evolution.actorValues.selectionAuthority}`,
    },
  ];
  const axisTabs = $("#axis-tabs");
  let selectedAxis = "definition";
  function renderAxis(axisId) {
    const axis = axes.find(({ id }) => id === axisId);
    selectedAxis = axisId;
    $$("button", axisTabs).forEach((button) => {
      const selected = button.dataset.axis === axisId;
      button.setAttribute("aria-selected", String(selected));
      button.tabIndex = selected ? 0 : -1;
    });
    const panel = $("#axis-panel");
    panel.replaceChildren();
    panel.dataset.axis = axis.id;
    panel.setAttribute("aria-labelledby", `axis-${axis.id}`);
    panel.append(node("p", "axis-eyebrow", axis.eyebrow), node("h3", "", axis.title), node("p", "axis-description", axis.description));
    const facts = node("ul", "axis-facts");
    axis.facts.forEach((fact) => facts.append(node("li", "", fact)));
    panel.append(facts, node("p", "axis-footer", axis.footer));
  }
  axes.forEach((axis) => {
    const button = node("button", "axis-tab", axis.label);
    button.type = "button";
    button.id = `axis-${axis.id}`;
    button.dataset.axis = axis.id;
    button.setAttribute("role", "tab");
    button.setAttribute("aria-controls", "axis-panel");
    button.setAttribute("aria-selected", "false");
    button.tabIndex = -1;
    button.addEventListener("click", () => renderAxis(axis.id));
    button.addEventListener("keydown", (event) => {
      if (!["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "Home", "End"].includes(event.key)) return;
      event.preventDefault();
      const current = axes.findIndex(({ id }) => id === selectedAxis);
      const delta = ["ArrowRight", "ArrowDown"].includes(event.key) ? 1 : -1;
      let next = event.key === "Home" ? 0 : event.key === "End" ? axes.length - 1 : current + delta;
      next = (next + axes.length) % axes.length;
      renderAxis(axes[next].id);
      $(`#axis-${axes[next].id}`).focus();
    });
    axisTabs.append(button);
  });
  renderAxis("definition");

  const crossingTrack = $("#crossing-track");
  data.paths.nonTrueDecisionGates.forEach((crossing, index) => {
    const article = node("article", "crossing");
    article.dataset.state = crossing.id;
    article.append(
      node("span", "crossing-number", String(index + 1).padStart(2, "0")),
      node("p", "crossing-state", `IF ${crossing.id}`),
      node("h3", "", crossing.recovery.replaceAll("-", " ")),
      node("p", "", crossing.explanation),
    );
    crossingTrack.append(article);
  });

  const pathGrid = $("#path-grid");
  const candidate = node("article", "path-card candidate-path");
  candidate.append(node("p", "path-type", data.paths.candidate.status), node("h3", "", data.paths.candidate.title), node("p", "", data.paths.candidate.summary));
  const candidateFoot = node("p", "path-foot", "Candidate route · synthetic, unscored hypothesis");
  candidate.append(candidateFoot);
  pathGrid.append(candidate);
  data.paths.competitors.forEach((competitor) => {
    const card = node("article", "path-card");
    card.append(node("p", "path-type", "Competing path"), node("h3", "", competitor.label), node("p", "", competitor.incompatible_claim));
    const observation = competitor.discriminating_observations[0];
    card.append(node("p", "path-foot", `${observation.status} · ${observation.construct}`));
    pathGrid.append(card);
  });

  text("#prep-eligibility", data.preparation.currentlyEligible ? "Eligible for consideration" : "Currently blocked");
  text("#prep-title", `${data.preparation.verb} ${data.preparation.object}`);
  text("#prep-sentence", data.preparation.publicSentence);
  const prepFacts = $("#prep-facts");
  [
    ["Actor", data.preparation.actor.name],
    ["Use", data.preparation.decisionUse.replaceAll("_", " ")],
    ["Reversibility", data.preparation.reversibility.class],
    ["Resources", `${data.preparation.resources.funding_status} · capacity ${data.preparation.resources.capacity_status}`],
  ].forEach(([term, value]) => {
    const wrapper = node("div");
    wrapper.append(node("dt", "", term), node("dd", "", value));
    prepFacts.append(wrapper);
  });
  const renderControls = (selector, controls) => {
    const list = $(selector);
    controls.forEach((control) => {
      const item = node("li");
      item.append(node("b", "", control.gate.replaceAll("-", " ")), node("span", "", control.test));
      list.append(item);
    });
  };
  renderControls("#start-controls", data.preparation.controls.start_conditions);
  renderControls("#stop-controls", data.preparation.controls.stop_conditions);

  text("#source-status", `${data.signals.source.label}: ${data.signals.source.bindingStatus}. No source bytes are interpreted as findings.`);
  const metricGrid = $("#metric-grid");
  data.signals.contracts.forEach((metric) => {
    const card = node("article", "metric-card");
    card.append(node("p", "metric-role", metric.role), node("h3", "", metric.label), node("p", "", metric.measure));
    const footer = node("div", "metric-footer");
    footer.append(node("span", "", metric.bindingKind), node("span", "", metric.direction));
    card.append(footer);
    metricGrid.append(card);
  });
  const gapStrip = $("#gap-strip");
  gapStrip.append(node("p", "gap-title", "Known measurement gaps"));
  data.signals.gaps.forEach((gap) => {
    const item = node("div", "gap-item");
    item.append(node("b", "", gap.role), node("span", "", gap.reason));
    gapStrip.append(item);
  });

  text("#artifact-count", `${data.provenance.artifacts.length} artifacts`);
  const provenanceList = $("#provenance-list");
  const bundleRow = node("div", "provenance-row");
  bundleRow.append(node("b", "", "source bundle"), node("span", "", data.meta.sourceBundleId), node("code", "", data.provenance.bundlePath));
  provenanceList.append(bundleRow);
  data.provenance.artifacts.forEach((artifact) => {
    const row = node("div", "provenance-row");
    row.append(node("b", "", artifact.role), node("span", "", artifact.path), node("code", "", shortHash(artifact.sha256)));
    provenanceList.append(row);
  });

  if (!(window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches) && "IntersectionObserver" in window) {
    const observer = new IntersectionObserver(
      (entries) => entries.forEach((entry) => entry.isIntersecting && entry.target.classList.add("is-visible")),
      { threshold: 0.08 },
    );
    $$(".reveal").forEach((element) => observer.observe(element));
  } else {
    $$(".reveal").forEach((element) => element.classList.add("is-visible"));
  }
  } catch {
    failClosed();
  }
})();
