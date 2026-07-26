// ============================================================
// 00. GP PATIENT SURVEY 2025 — ENGLAND, ICB AND PRACTICE
// ============================================================
// Direct published weighted survey estimates with 95% confidence intervals.
// Practices are loaded only when requested; no ranks or reconstructed totals.

(async () => {
  const map = el("systemMap");
  const toolbarControls = document.querySelector(".map-toolbar-controls");
  const numbersButton = el("toggleNumbers");
  const baseRenderNodeDetails = renderNodeDetails;
  const baseSelectNodeForGpps = selectNode;
  const baseShowHomeForGpps = showHome;
  const baseShowWholePictureForGpps = showWholePicture;

  if (!map || !toolbarControls) return;

  const CONTEXT_NODE_IDS = new Set([
    "gpps-phone-access","gpps-website-access","gpps-app-access",
    "gpps-reception-helpfulness","gpps-contact-experience","gpps-continuity",
    "gpps-listened","gpps-care-concern"
  ]);
  const BADGE_NODE_IDS = [...CONTEXT_NODE_IDS];

  const existingControls = [
    ".provider-metric-control",".metric-scope",
    ".ambulance-metric-control",".ambulance-metric-scope",
    ".iuc-metric-control",".iuc-metric-scope",
    ".gpad-metric-control",".gpad-metric-scope",
    ".ucr-metric-control",".ucr-metric-scope",
    ".community-waits-metric-control",".community-waits-metric-scope",
    ".csds-metric-control",".csds-metric-scope",
    ".community-bed-metric-control",".community-bed-metric-scope",
    ".hes-apc-metric-control",".hes-apc-metric-scope",
    ".bed-occupancy-metric-control",".bed-occupancy-metric-scope",
    ".acute-discharge-metric-control",".acute-discharge-metric-scope",
    ".drd-metric-control",".drd-metric-scope"
  ].map(selector => document.querySelector(selector)).filter(Boolean);

  let gppsData = null;
  let practiceData = null;
  let selectedIcb = null;
  let selectedPractice = null;
  let numbersVisible = numbersButton?.getAttribute("aria-pressed") !== "false";
  const badges = new Map();
  const practiceLookup = new Map();

  // ============================================================
  // 01. LOAD VALIDATED PUBLIC JSON
  // ============================================================
  async function loadJson(paths) {
    for (const path of paths) {
      try {
        const separator = path.includes("?") ? "&" : "?";
        const response = await fetch(`${path}${separator}v=${Date.now()}`,{ cache:"no-store" });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const data = await response.json();
        if (data) return data;
      } catch (error) {
        // Try the raw GitHub fallback.
      }
    }
    return null;
  }

  async function loadMainData() {
    return loadJson([
      "public-data/gpps-2025.json",
      "https://raw.githubusercontent.com/pelld/population-health-system-explorer/main/public-data/gpps-2025.json"
    ]);
  }

  async function loadPractices() {
    if (practiceData) return practiceData;
    practiceStatus.textContent = "Loading 6,215 published practices…";
    practiceData = await loadJson([
      "public-data/gpps-2025-practices.json",
      "https://raw.githubusercontent.com/pelld/population-health-system-explorer/main/public-data/gpps-2025-practices.json"
    ]);
    if (!practiceData?.practices?.length) {
      practiceStatus.textContent = "Practice data unavailable";
      return null;
    }

    const fragment = document.createDocumentFragment();
    practiceData.practices.forEach(practice => {
      const label = `${practice.name} [${practice.code}]`;
      const option = document.createElement("option");
      option.value = label;
      fragment.append(option);
      practiceLookup.set(label.toLowerCase(),practice);
      practiceLookup.set(practice.code.toLowerCase(),practice);
    });
    practiceList.append(fragment);
    practiceStatus.textContent = "Type a practice name or code, then choose the matching result";
    return practiceData;
  }

  // ============================================================
  // 02. GEOGRAPHY CONTROLS
  // ============================================================
  const control = document.createElement("label");
  control.className = "gpps-metric-control";
  control.hidden = true;
  control.innerHTML = `<span>GP Patient Survey geography</span>
    <div class="gpps-control-row">
      <select id="gppsLevelSelect" aria-label="Choose GP Patient Survey geography level">
        <option value="England">England</option>
        <option value="ICB">ICB</option>
        <option value="Practice">GP practice</option>
      </select>
      <select id="gppsIcbSelect" aria-label="Choose an ICB" hidden></select>
      <input id="gppsPracticeInput" type="search" list="gppsPracticeList" placeholder="Practice name or code" aria-label="Find a GP practice" hidden>
      <datalist id="gppsPracticeList"></datalist>
    </div>
    <small id="gppsPracticeStatus"></small>`;

  const levelSelect = control.querySelector("#gppsLevelSelect");
  const icbSelect = control.querySelector("#gppsIcbSelect");
  const practiceInput = control.querySelector("#gppsPracticeInput");
  const practiceList = control.querySelector("#gppsPracticeList");
  const practiceStatus = control.querySelector("#gppsPracticeStatus");

  const scope = document.createElement("span");
  scope.className = "gpps-metric-scope";
  scope.hidden = true;

  const anchor = document.querySelector(".drd-metric-scope") || existingControls.at(-1) || numbersButton;
  if (anchor) {
    anchor.insertAdjacentElement("afterend",control);
    control.insertAdjacentElement("afterend",scope);
  } else {
    toolbarControls.append(control,scope);
  }

  function populateIcbSelect() {
    icbSelect.innerHTML = "";
    (gppsData?.icbs || []).forEach(item => icbSelect.add(new Option(item.name,item.code)));
  }

  function currentGeography() {
    return selectedPractice || selectedIcb || gppsData?.england || null;
  }

  function currentMetric(nodeId) {
    return currentGeography()?.metrics?.[nodeId] || null;
  }

  function updateScope() {
    const geography = currentGeography();
    if (!geography) {
      scope.textContent = "GP Patient Survey data unavailable";
      return;
    }
    const qualifier = geography.type === "Practice" ? `${geography.icb_name} · practice` : geography.type;
    scope.textContent = `${geography.name} · ${qualifier} · 2025 survey`;
  }

  function refreshSelectedDetails() {
    updateScope();
    refreshBadges();
    const selectedNode = cy.$("node.selected-node").first();
    if (selectedNode.length) renderNodeDetails(NODE_BY_ID.get(selectedNode.id()));
    requestAnimationFrame(updateBadgePositions);
  }

  levelSelect.addEventListener("change",async () => {
    selectedIcb = null;
    selectedPractice = null;
    practiceInput.value = "";
    icbSelect.hidden = levelSelect.value !== "ICB";
    practiceInput.hidden = levelSelect.value !== "Practice";
    practiceStatus.hidden = levelSelect.value !== "Practice";

    if (levelSelect.value === "ICB") {
      selectedIcb = gppsData?.icbs?.[0] || null;
      if (selectedIcb) icbSelect.value = selectedIcb.code;
    }
    if (levelSelect.value === "Practice") await loadPractices();
    refreshSelectedDetails();
  });

  icbSelect.addEventListener("change",() => {
    selectedIcb = gppsData?.icbs?.find(item => item.code === icbSelect.value) || null;
    selectedPractice = null;
    refreshSelectedDetails();
  });

  function choosePractice() {
    const key = practiceInput.value.trim().toLowerCase();
    selectedPractice = practiceLookup.get(key) || null;
    if (!selectedPractice && key) {
      const codeMatch = key.match(/\[([a-z0-9]+)\]$/i);
      if (codeMatch) selectedPractice = practiceLookup.get(codeMatch[1].toLowerCase()) || null;
    }
    practiceStatus.textContent = selectedPractice
      ? `${selectedPractice.code} · ${selectedPractice.icb_name}`
      : "Choose an exact matching practice name or enter its code";
    refreshSelectedDetails();
  }

  practiceInput.addEventListener("change",choosePractice);
  practiceInput.addEventListener("keydown",event => {
    if (event.key === "Enter") {
      event.preventDefault();
      choosePractice();
    }
  });

  function setContext(active) {
    control.hidden = !active;
    scope.hidden = !active;
    if (active) existingControls.forEach(item => { item.hidden = true; });
    requestAnimationFrame(updateBadgePositions);
  }

  // ============================================================
  // 03. MAP BADGES
  // ============================================================
  const badgeLayer = document.createElement("div");
  badgeLayer.className = "metric-layer gpps-metric-layer";
  badgeLayer.setAttribute("aria-hidden","true");
  map.append(badgeLayer);

  BADGE_NODE_IDS.forEach(nodeId => {
    if (!cy.getElementById(nodeId).length) return;
    const badge = document.createElement("button");
    badge.type = "button";
    badge.className = "node-metric-badge gpps-metric-badge";
    badge.dataset.nodeId = nodeId;
    badge.addEventListener("click",() => selectNode(cy.getElementById(nodeId),{ centre:false }));
    badgeLayer.append(badge);
    badges.set(nodeId,badge);
  });

  function validNumber(value) {
    return value !== null && value !== undefined && Number.isFinite(Number(value));
  }

  function formatPercent(value,digits=2) {
    return validNumber(value) ? `${Number(value).toFixed(digits)}%` : "Not published";
  }

  function formatCount(value) {
    return validNumber(value) ? new Intl.NumberFormat("en-GB").format(Number(value)) : "Not published";
  }

  function refreshBadges() {
    badges.forEach((badge,nodeId) => {
      const metric = currentMetric(nodeId);
      if (!validNumber(metric?.percent)) {
        badge.dataset.hasMetric = "false";
        badge.classList.remove("is-visible");
        return;
      }
      badge.dataset.hasMetric = "true";
      badge.innerHTML = `<strong>${formatPercent(metric.percent,1)}</strong><span>${selectedPractice ? "Practice" : selectedIcb ? "ICB" : "GPPS"}</span>`;
      badge.title = `${currentGeography().name}: ${metric.label} · ${formatPercent(metric.percent)}`;
    });
  }

  function updateBadgePositions() {
    const show = numbersVisible && !control.hidden && cy.zoom() >= .30;
    badges.forEach((badge,nodeId) => {
      const node = cy.getElementById(nodeId);
      const hidden = !node.length || node.hasClass("faded") || node.hasClass("timescale-faded") || node.style("display") === "none";
      if (!show || hidden || badge.dataset.hasMetric === "false") {
        badge.classList.remove("is-visible");
        return;
      }
      const position = node.renderedPosition();
      badge.style.left = `${position.x + (node.renderedWidth() * .34)}px`;
      badge.style.top = `${position.y - (node.renderedHeight() * .34)}px`;
      badge.classList.add("is-visible");
    });
  }

  numbersButton?.addEventListener("click",() => {
    numbersVisible = numbersButton.getAttribute("aria-pressed") !== "false";
    requestAnimationFrame(updateBadgePositions);
  });
  cy.on("pan zoom position render",updateBadgePositions);
  window.addEventListener("resize",updateBadgePositions);

  // ============================================================
  // 04. DETAILS AND COMPARISONS — NO RANKING
  // ============================================================
  function escapeHtml(value) {
    return String(value ?? "").replace(/[&<>"]/g,character => ({ "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;" }[character]));
  }

  function comparatorForPractice() {
    if (!selectedPractice) return null;
    return gppsData?.icbs?.find(item => item.code === selectedPractice.icb_code) || null;
  }

  function allMeasurePanel(geography) {
    return `<div class="gpps-measure-grid">${BADGE_NODE_IDS.map(nodeId => {
      const metric = geography.metrics?.[nodeId];
      return `<div><span>${escapeHtml(metric?.label || nodeId)}</span><strong>${formatPercent(metric?.percent)}</strong><small>${validNumber(metric?.lower_95) ? `${formatPercent(metric.lower_95)}–${formatPercent(metric.upper_95)} 95% CI` : "Suppressed or unavailable"}</small></div>`;
    }).join("")}</div>`;
  }

  renderNodeDetails = function(node) {
    baseRenderNodeDetails(node);
    if (!CONTEXT_NODE_IDS.has(node.id) || !gppsData) return;

    const geography = currentGeography();
    const metric = currentMetric(node.id);
    const englandMetric = gppsData.england.metrics?.[node.id];
    const icbComparator = comparatorForPractice();
    const icbMetric = icbComparator?.metrics?.[node.id];
    const difference = validNumber(metric?.percent) && geography.type !== "National"
      ? Number(metric.percent) - Number(englandMetric.percent)
      : null;

    const comparison = difference === null ? "" : `<p class="metric-note">${difference >= 0 ? "+" : ""}${difference.toFixed(2)} percentage points from the direct England estimate.</p>`;
    const practiceComparison = selectedPractice && validNumber(icbMetric?.percent)
      ? `<p class="metric-note">Published ICB estimate: <strong>${formatPercent(icbMetric.percent)}</strong> (${formatPercent(icbMetric.lower_95)}–${formatPercent(icbMetric.upper_95)}).</p>`
      : "";

    const card = document.createElement("section");
    card.className = "operational-metric-card gpps-operational-card";
    card.innerHTML = `<div class="operational-metric-heading">
        <div><p class="eyebrow teal">Direct weighted survey estimate</p><strong>${formatPercent(metric?.percent)}</strong></div>
        <span>${escapeHtml(geography.name)}<br>GP Patient Survey 2025</span>
      </div>
      <h3>${escapeHtml(metric?.label || node.label)}</h3>
      <p class="metric-exact">${escapeHtml(metric?.question || "")}</p>
      <p>${escapeHtml(metric?.summary_definition || "")}</p>
      ${comparison}${practiceComparison}
      <div class="gpps-summary-grid">
        <div><span>95% confidence interval</span><strong>${validNumber(metric?.lower_95) ? `${formatPercent(metric.lower_95)}–${formatPercent(metric.upper_95)}` : "Not published"}</strong><small>Sampling uncertainty around the weighted estimate</small></div>
        <div><span>Unweighted question base</span><strong>${formatCount(metric?.unweighted_base)}</strong><small>Respondents included in this evaluative measure</small></div>
        <div><span>Questionnaires received</span><strong>${formatCount(geography.received)}</strong><small>From ${formatCount(geography.distributed)} distributed</small></div>
        <div><span>Overall response rate</span><strong>${formatPercent(geography.response_rate_percent)}</strong><small>For this published geography</small></div>
      </div>
      <h4>Selected patient-experience measures</h4>
      ${allMeasurePanel(geography)}
      <p class="metric-comparison-warning"><strong>Interpretation warning:</strong> these are separately weighted survey estimates, not operational counts or linked patient journeys. Do not rank practices or infer that differences caused later use of NHS 111, ambulance or A&amp;E. Suppressed estimates remain unpublished.</p>
      <a href="${gppsData.source_url}" target="_blank" rel="noopener">Official GP Patient Survey publication</a>
      <a href="${gppsData.technical_url}" target="_blank" rel="noopener">Survey reporting and technical information</a>`;
    el("nodeDetails").prepend(card);
  };

  // ============================================================
  // 05. SWITCH DATASET CONTEXT
  // ============================================================
  selectNode = function(node,options={}) {
    const result = baseSelectNodeForGpps(node,options);
    setContext(CONTEXT_NODE_IDS.has(node.id()));
    requestAnimationFrame(() => {
      refreshBadges();
      updateBadgePositions();
    });
    return result;
  };

  showHome = function(...args) {
    const result = baseShowHomeForGpps(...args);
    setContext(false);
    return result;
  };

  showWholePicture = function(...args) {
    const result = baseShowWholePictureForGpps(...args);
    setContext(false);
    return result;
  };

  gppsData = await loadMainData();
  if (gppsData?.england?.metrics && gppsData?.icbs?.length) {
    populateIcbSelect();
    practiceStatus.hidden = true;
    updateScope();
    refreshBadges();
  } else {
    levelSelect.disabled = true;
    scope.textContent = "GP Patient Survey data unavailable";
  }
})();
