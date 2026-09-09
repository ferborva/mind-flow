(function () {
  "use strict";

  const failClosed = () => {
    document.body.dataset.projectionState = "failed";
    document.body.setAttribute("aria-busy", "false");
    const alert = document.querySelector("#observatory-error");
    if (!alert) return;
    alert.hidden = false;
    alert.textContent = "This projection could not be verified. Rebuild it from a coherent source bundle before interpreting any state or path.";
    alert.focus?.();
  };

  const projectionInvariant = (value, message) => {
    if (!value) throw new Error(`Invalid observatory projection: ${message}`);
  };

  const assertProjectionData = (data) => {
    projectionInvariant(data && typeof data === "object", "data is unavailable");
    projectionInvariant(data.meta?.bundleCoherent === true, "bundle is not coherent");
    projectionInvariant(data.meta?.status && typeof data.meta.status === "object", "status is unavailable");
    projectionInvariant(Array.isArray(data.states) && data.states.length > 0, "states are unavailable");
    projectionInvariant(
      data.states.some(({ id }) => id === data.condition?.currentState),
      "current state is outside the registered state set",
    );
    projectionInvariant(
      Number.isFinite(data.forecast?.probability) && data.forecast.probability >= 0 && data.forecast.probability <= 1,
      "forecast probability is outside the unit interval",
    );
    projectionInvariant(Array.isArray(data.programmeGates) && data.programmeGates.length > 0, "gates are unavailable");
    projectionInvariant(
      new Set(data.programmeGates.map(({ id }) => id)).size === data.programmeGates.length,
      "gate identifiers are not unique",
    );
    projectionInvariant(
      data.programmeGates.every((gate) =>
        ["local-fixture", "real-world"].includes(gate.class) &&
        ["closed", "local-check-reproduced", "established"].includes(gate.state)),
      "a gate has an unsupported class or state",
    );
    projectionInvariant(
      data.authority?.effect === "none" && data.authority.actionAuthorised === false,
      "the research prototype cannot project authority",
    );
    projectionInvariant(
      Array.isArray(data.evolution?.actorValues?.affectedPopulations),
      "affected populations are unavailable",
    );
  };

  try {
  const data = window.OBSERVATORY_DATA;
  assertProjectionData(data);

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
  const asOf = text("#as-of", `Untrusted fixture clock · ${formatDate(data.meta.asOf)}`);
  asOf.dateTime = data.meta.asOf;
  text("#programme-iteration", data.meta.status.programmeIteration);
  text("#data-fixture", data.meta.status.dataFixture);
  text("#interface-study", data.meta.status.interfaceStudy);
  text("#public-release", data.meta.status.publicRelease);
  const currentState = data.states.find(({ id }) => id === data.condition.currentState);
  $$('[data-current-state]').forEach((element) => {
    element.textContent = `SAMPLE RULE OUTPUT: ${currentState.publicLabel} (not a real-world finding)`;
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
  text(
    "#demonstration-boundary",
    `All observations and the ${percentage}% forecast are invented test data. The clock is not trusted. ${currentState.publicLabel.toUpperCase()} means only that the sample rule ran on sample inputs. No real condition, warning, service, decision or authority exists.`,
  );
  const affectedPopulations = data.evolution.actorValues.affectedPopulations;
  const affectedLabels = affectedPopulations.map(({ label }) => label).join("; ");
  const noneConsulted = affectedPopulations.every(({ voice_status: voiceStatus }) => voiceStatus === "not-consulted");
  text(
    "#consultation-status",
    `This example names ${affectedLabels || "no verified affected population"}. ${noneConsulted ? "None have reviewed the goal, threshold, labels or proposed response." : "Review status differs across the named populations and must be inspected in the source record."} No fixture status creates consent or authority.`,
  );
  text("#probability-number", `TEST ${percentage}%`);
  $("#probability-ring").style.setProperty("--probability", `${percentage * 3.6}deg`);
  text("#forecast-short", `INVENTED TEST VALUE: ${percentage}% (not an estimate)`);
  text("#authority-status", "No action authorised");
  text("#authority-note", "There is no real warning, service, decision or authorised action. Do not act on this page.");
  const nextCheck = text("#next-check-date", formatDate(data.preparation.reviewBy));
  nextCheck.dateTime = data.preparation.reviewBy;
  text("#next-check-note", "Proposal checkpoint only. Evidence must be re-evaluated before starting.");

  const realWorldGates = data.programmeGates.filter(({ class: gateClass }) => gateClass === "real-world");
  const establishedRealWorldGates = realWorldGates.filter(({ state }) => state === "established").length;
  const localFixtureGates = data.programmeGates.filter(({ class: gateClass }) => gateClass === "local-fixture");
  const reproducedLocalGates = localFixtureGates.filter(({ state }) => state === "local-check-reproduced").length;
  text(
    "#real-gate-summary",
    `${establishedRealWorldGates} of ${realWorldGates.length} real-world gates established. A local projection cannot establish real conditions, freshness, authority or publication approval.`,
  );
  text(
    "#local-gate-summary",
    `${reproducedLocalGates} of ${localFixtureGates.length} local sample-file code checks reproduced. These are not evidence gates and must not be combined with the real-world gate status.`,
  );

  data.programmeGates.forEach((gate) => {
    const gateGrid = gate.class === "local-fixture"
      ? $("#local-gate-grid")
      : $("#real-world-gate-grid");
    const card = node("article", "gate-card");
    card.dataset.gateClass = gate.class;
    card.dataset.gateState = gate.state;
    const heading = node("h3", "", gate.label);
    const state = node(
      "span",
      "gate-state",
      gate.state === "local-check-reproduced" ? "Sample-file code check passed" : gate.state,
    );
    state.dataset.gateState = gate.state;
    card.append(
      node("p", "gate-class", gate.class),
      heading,
      state,
      node("p", "gate-meaning", gate.meaning),
      node("p", "gate-ceiling", gate.ceiling),
      node("p", "gate-source", `Input · ${gate.source.path} · ${shortHash(gate.source.sha256)} · Output ${gate.source.assessmentOutputPath}`),
      node("p", "gate-source", `Assessor · ${gate.source.assessor.path} · ${shortHash(gate.source.assessor.sha256)} · ${gate.source.assessor.scope}`),
      node("p", "gate-source", `Local code/test validation context · ${data.validationContext.files.length} files · not evidence sources · ${shortHash(gate.source.validationContextManifestSha256)}`),
    );
    gateGrid.append(card);
  });

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
    text("#branch-state", state.publicLabel);
    text("#branch-recovery", state.recovery);
    text("#branch-action", state.action.replaceAll("-", " "));
    text("#branch-explanation", state.explanation);
    const scenarioLabel = stateId === data.condition.currentState
      ? `Hypothetical software branch: ${state.publicLabel}. Not a forecast or instruction.`
      : `Hypothetical software branch: ${state.publicLabel}. The sample output remains ${currentState.publicLabel}. Not a forecast or instruction.`;
    text("#scenario-flag", scenarioLabel);
    $("#branch-display").setAttribute("aria-label", scenarioLabel);
    if (focus) $("#branch-display").focus({ preventScroll: true });
  }
  data.states.forEach((state) => {
    const button = node("button", "state-button");
    button.type = "button";
    button.dataset.state = state.id;
    button.setAttribute("aria-pressed", "false");
    button.append(node("span", "state-dot"), node("b", "", state.publicLabel), node("small", "", state.recovery));
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
  document.body.dataset.projectionState = "ready";
  document.body.setAttribute("aria-busy", "false");
  } catch {
    failClosed();
  }
})();
