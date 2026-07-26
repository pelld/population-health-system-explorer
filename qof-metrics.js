// ============================================================
// 00. QOF 2024-25 — ENGLAND, ICB AND GP PRACTICE
// ============================================================
// Shows direct raw-data aggregates for recorded prevalence, QOF points,
// indicator achievement and personalised care adjustments. No league tables.

(async () => {
  const map = el("systemMap");
  const toolbarControls = document.querySelector(".map-toolbar-controls");
  const numbersButton = el("toggleNumbers");
  const baseRenderNodeDetails = renderNodeDetails;
  const baseSelectNodeForQof = selectNode;
  const baseShowHomeForQof = showHome;
  const baseShowWholePictureForQof = showWholePicture;

  if (!map || !toolbarControls) return;

  const CONTEXT_NODE_IDS = new Set([
    "qof-prevalence","qof-overall-achievement","qof-indicator-achievement","qof-pca"
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
    ".drd-metric-control",".drd-metric-scope",
    ".gpps-metric-control",".gpps-metric-scope"
  ].map(selector => document.querySelector(selector)).filter(Boolean);

  let qofData = null;
  let practiceData = null;
  let selectedIcb = null;
  let selectedPractice = null;
  let selectedGroupCode = "HYP";
  let selectedIndicatorCode = "HYP008";
  let numbersVisible = numbersButton?.getAttribute("aria-pressed") !== "false";
  const badges = new Map();
  const practiceLookup = new Map();
  const groupLookup = new Map();
  const indicatorLookup = new Map();

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
      "public-data/qof-2024-25.json",
      "https://raw.githubusercontent.com/pelld/population-health-system-explorer/main/public-data/qof-2024-25.json"
    ]);
  }

  async function loadPractices() {
    if (practiceData) return practiceData;
    practiceStatus.textContent = "Loading 6,188 QOF practices…";
    practiceData = await loadJson([
      "public-data/qof-2024-25-practices.json",
      "https://raw.githubusercontent.com/pelld/population-health-system-explorer/main/public-data/qof-2024-25-practices.json"
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
  // 02. GEOGRAPHY AND MEASURE CONTROLS
  // ============================================================
  const control = document.createElement("label");
  control.className = "qof-metric-control";
  control.hidden = true;
  control.innerHTML = `<span>QOF geography and measure</span>
    <div class="qof-control-row">
      <select id="qofLevelSelect" aria-label="Choose QOF geography level">
        <option value="England">England</option>
        <option value="ICB">ICB</option>
        <option value="Practice">GP practice</option>
      </select>
      <select id="qofIcbSelect" aria-label="Choose an ICB" hidden></select>
      <input id="qofPracticeInput" type="search" list="qofPracticeList" placeholder="Practice name or code" aria-label="Find a GP practice" hidden>
      <datalist id="qofPracticeList"></datalist>
      <select id="qofGroupSelect" aria-label="Choose a QOF condition group"></select>
      <select id="qofIndicatorSelect" aria-label="Choose a QOF indicator"></select>
    </div>
    <small id="qofPracticeStatus"></small>`;

  const levelSelect = control.querySelector("#qofLevelSelect");
  const icbSelect = control.querySelector("#qofIcbSelect");
  const practiceInput = control.querySelector("#qofPracticeInput");
  const practiceList = control.querySelector("#qofPracticeList");
  const groupSelect = control.querySelector("#qofGroupSelect");
  const indicatorSelect = control.querySelector("#qofIndicatorSelect");
  const practiceStatus = control.querySelector("#qofPracticeStatus");

  const scope = document.createElement("span");
  scope.className = "qof-metric-scope";
  scope.hidden = true;

  const anchor = document.querySelector(".gpps-metric-scope") || existingControls.at(-1) || numbersButton;
  if (anchor) {
    anchor.insertAdjacentElement("afterend",control);
    control.insertAdjacentElement("afterend",scope);
  } else {
    toolbarControls.append(control,scope);
  }

  function populateControls() {
    icbSelect.innerHTML = "";
    (qofData?.icbs || []).forEach(item => icbSelect.add(new Option(item.name,item.code)));

    groupSelect.innerHTML = "";
    (qofData?.groups || [])
      .filter(group => qofData.england.prevalence?.[group.code])
      .forEach(group => {
        groupLookup.set(group.code,group);
        groupSelect.add(new Option(`${group.name} [${group.code}]`,group.code));
      });
    if (!groupLookup.has(selectedGroupCode)) selectedGroupCode = groupSelect.options[0]?.value || "";
    groupSelect.value = selectedGroupCode;

    indicatorSelect.innerHTML = "";
    (qofData?.indicators || [])
      .filter(indicator => Number(qofData.england.indicators?.[indicator.code]?.denominator || 0) > 0)
      .forEach(indicator => {
        indicatorLookup.set(indicator.code,indicator);
        indicatorSelect.add(new Option(`${indicator.code} · ${indicator.group_name}`,indicator.code));
      });
    if (!indicatorLookup.has(selectedIndicatorCode)) selectedIndicatorCode = indicatorSelect.options[0]?.value || "";
    indicatorSelect.value = selectedIndicatorCode;
  }

  function currentGeography() {
    return selectedPractice || selectedIcb || qofData?.england || null;
  }

  function selectedGroup() {
    return groupLookup.get(selectedGroupCode) || { code:selectedGroupCode,name:selectedGroupCode };
  }

  function selectedIndicator() {
    return indicatorLookup.get(selectedIndicatorCode) || { code:selectedIndicatorCode,description:selectedIndicatorCode,group_name:"" };
  }

  function metricFor(nodeId,geography=currentGeography()) {
    if (!geography) return null;
    if (nodeId === "qof-prevalence") return geography.prevalence?.[selectedGroupCode] || null;
    if (nodeId === "qof-overall-achievement") return geography.overall_points || null;
    const indicator = geography.indicators?.[selectedIndicatorCode] || null;
    if (nodeId === "qof-indicator-achievement") return indicator ? { ...indicator,percent:indicator.underlying_achievement_percent } : null;
    if (nodeId === "qof-pca") return indicator ? { ...indicator,percent:indicator.pca_percent } : null;
    return null;
  }

  function updateScope() {
    const geography = currentGeography();
    if (!geography) {
      scope.textContent = "QOF data unavailable";
      return;
    }
    const qualifier = geography.type === "Practice" ? `${geography.icb_name} · practice` : geography.type;
    scope.textContent = `${geography.name} · ${qualifier} · QOF 2024-25`;
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
      selectedIcb = qofData?.icbs?.[0] || null;
      if (selectedIcb) icbSelect.value = selectedIcb.code;
    }
    if (levelSelect.value === "Practice") await loadPractices();
    refreshSelectedDetails();
  });

  icbSelect.addEventListener("change",() => {
    selectedIcb = qofData?.icbs?.find(item => item.code === icbSelect.value) || null;
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
      ? `${selectedPractice.code} · ${selectedPractice.icb_name}${selectedPractice.validation_flag ? " · published validation flag" : ""}`
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

  groupSelect.addEventListener("change",() => {
    selectedGroupCode = groupSelect.value;
    refreshSelectedDetails();
  });

  indicatorSelect.addEventListener("change",() => {
    selectedIndicatorCode = indicatorSelect.value;
    refreshSelectedDetails();
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
  badgeLayer.className = "metric-layer qof-metric-layer";
  badgeLayer.setAttribute("aria-hidden","true");
  map.append(badgeLayer);

  BADGE_NODE_IDS.forEach(nodeId => {
    if (!cy.getElementById(nodeId).length) return;
    const badge = document.createElement("button");
    badge.type = "button";
    badge.className = "node-metric-badge qof-metric-badge";
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

  function formatCount(value,digits=0) {
    return validNumber(value) ? new Intl.NumberFormat("en-GB",{ maximumFractionDigits:digits }).format(Number(value)) : "Not published";
  }

  function badgeValue(nodeId,metric) {
    if (!metric) return null;
    if (nodeId === "qof-prevalence") return metric.percent;
    if (nodeId === "qof-overall-achievement") return metric.percent;
    return metric.percent;
  }

  function refreshBadges() {
    badges.forEach((badge,nodeId) => {
      const metric = metricFor(nodeId);
      const value = badgeValue(nodeId,metric);
      if (!validNumber(value)) {
        badge.dataset.hasMetric = "false";
        badge.classList.remove("is-visible");
        return;
      }
      const label = nodeId === "qof-prevalence" ? selectedGroupCode : nodeId === "qof-overall-achievement" ? "Points" : selectedIndicatorCode;
      badge.dataset.hasMetric = "true";
      badge.innerHTML = `<strong>${formatPercent(value,1)}</strong><span>${label}</span>`;
      badge.title = `${currentGeography().name}: ${label} · ${formatPercent(value)}`;
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

  function englandDifference(nodeId,metric) {
    const englandMetric = metricFor(nodeId,qofData?.england);
    const currentValue = nodeId === "qof-overall-achievement" ? metric?.percent : metric?.percent;
    const englandValue = nodeId === "qof-overall-achievement" ? englandMetric?.percent : englandMetric?.percent;
    if (!validNumber(currentValue) || !validNumber(englandValue) || currentGeography()?.type === "National") return "";
    const difference = Number(currentValue) - Number(englandValue);
    return `<p class="metric-note">${difference >= 0 ? "+" : ""}${difference.toFixed(2)} percentage points from England.</p>`;
  }

  function prevalenceDetails(metric) {
    const group = selectedGroup();
    return `<h3>${escapeHtml(group.name)} recorded prevalence</h3>
      <p class="metric-exact">QOF group ${escapeHtml(group.code)}</p>
      <div class="qof-summary-grid">
        <div><span>Recorded register</span><strong>${formatCount(metric?.register)}</strong><small>Patients recorded on the selected QOF register</small></div>
        <div><span>Relevant list denominator</span><strong>${formatCount(metric?.denominator)}</strong><small>Published denominator for this register definition</small></div>
        <div><span>Recorded prevalence</span><strong>${formatPercent(metric?.percent)}</strong><small>Register divided by the relevant list denominator</small></div>
      </div>`;
  }

  function overallDetails(metric,geography) {
    return `<h3>Overall QOF points achievement</h3>
      <div class="qof-summary-grid">
        <div><span>Achieved points</span><strong>${formatCount(metric?.achieved,2)}</strong><small>Sum of published achieved points</small></div>
        <div><span>Revised available points</span><strong>${formatCount(metric?.available,2)}</strong><small>Accounts for indicators unavailable to a practice</small></div>
        <div><span>Points achieved</span><strong>${formatPercent(metric?.percent)}</strong><small>Not a complete practice-quality score</small></div>
        ${geography.type !== "Practice" ? `<div><span>Practices over 90%</span><strong>${formatCount(metric?.practices_over_90_percent)}</strong><small>Of ${formatCount(geography.practice_count)} included practices</small></div>` : ""}
      </div>`;
  }

  function indicatorDetails(metric,nodeId) {
    const indicator = selectedIndicator();
    const fullDenominator = Number(metric?.denominator || 0) + Number(metric?.pcas || 0);
    return `<h3>${escapeHtml(indicator.code)} · ${nodeId === "qof-pca" ? "Personalised care adjustments" : "Indicator achievement"}</h3>
      <p class="metric-exact">${escapeHtml(indicator.description || "")}</p>
      <div class="qof-summary-grid">
        <div><span>Numerator</span><strong>${formatCount(metric?.numerator)}</strong><small>Patients meeting the indicator</small></div>
        <div><span>Denominator after PCAs</span><strong>${formatCount(metric?.denominator)}</strong><small>Used for underlying achievement</small></div>
        <div><span>Underlying achievement</span><strong>${formatPercent(metric?.underlying_achievement_percent)}</strong><small>Numerator divided by denominator after PCAs</small></div>
        <div><span>Personalised care adjustments</span><strong>${formatCount(metric?.pcas)}</strong><small>${formatPercent(metric?.pca_percent)} of ${formatCount(fullDenominator)} before adjustments</small></div>
        <div><span>Patients receiving intervention</span><strong>${formatPercent(metric?.intervention_percent)}</strong><small>Numerator divided by denominator plus PCAs</small></div>
        <div><span>Achieved points</span><strong>${formatCount(metric?.achieved_points,2)}</strong><small>Published QOF points for this indicator</small></div>
      </div>`;
  }

  renderNodeDetails = function(node) {
    baseRenderNodeDetails(node);
    if (!CONTEXT_NODE_IDS.has(node.id) || !qofData) return;

    const geography = currentGeography();
    const metric = metricFor(node.id);
    const body = node.id === "qof-prevalence"
      ? prevalenceDetails(metric)
      : node.id === "qof-overall-achievement"
        ? overallDetails(metric,geography)
        : indicatorDetails(metric,node.id);
    const validationWarning = geography.validation_flag
      ? `<p class="metric-comparison-warning"><strong>Published validation flag:</strong> this practice appears in the QOF validation-outcomes file. Review the source before interpreting its result.</p>`
      : "";

    const card = document.createElement("section");
    card.className = "operational-metric-card qof-operational-card";
    card.innerHTML = `<div class="operational-metric-heading">
        <div><p class="eyebrow teal">Published QOF aggregate</p><strong>${formatPercent(metric?.percent ?? metric?.underlying_achievement_percent)}</strong></div>
        <span>${escapeHtml(geography.name)}<br>QOF 2024-25</span>
      </div>
      ${body}
      ${englandDifference(node.id,metric)}
      ${validationWarning}
      <p class="metric-comparison-warning"><strong>Interpretation warning:</strong> QOF covers selected incentivised indicators and aggregate practice records. It is not a complete estimate of morbidity, patient-level care or health outcomes. Payment protection applies to some 2024-25 indicators, and practices must not be ranked as a league table.</p>
      <a href="${qofData.source_url}" target="_blank" rel="noopener">Official QOF 2024-25 publication</a>
      <a href="${qofData.technical_url}" target="_blank" rel="noopener">Technical annex</a>`;
    el("nodeDetails").prepend(card);
  };

  // ============================================================
  // 05. SWITCH DATASET CONTEXT
  // ============================================================
  selectNode = function(node,options={}) {
    const result = baseSelectNodeForQof(node,options);
    setContext(CONTEXT_NODE_IDS.has(node.id()));
    requestAnimationFrame(() => {
      refreshBadges();
      updateBadgePositions();
    });
    return result;
  };

  showHome = function(...args) {
    const result = baseShowHomeForQof(...args);
    setContext(false);
    return result;
  };

  showWholePicture = function(...args) {
    const result = baseShowWholePictureForQof(...args);
    setContext(false);
    return result;
  };

  qofData = await loadMainData();
  if (qofData?.england?.prevalence && qofData?.icbs?.length) {
    populateControls();
    practiceStatus.hidden = true;
    updateScope();
    refreshBadges();
  } else {
    levelSelect.disabled = true;
    scope.textContent = "QOF data unavailable";
  }
})();
