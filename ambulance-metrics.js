// ============================================================
// 00. PUBLIC AMBULANCE QUALITY INDICATOR METRICS
// ============================================================
// Adds the public 2024-25 AmbSYS operational split to the ambulance branch:
// calls -> incidents -> Hear & Treat or face-to-face response -> See & Treat,
// conveyance to A&E, or conveyance elsewhere.

(async () => {
  const map = el("systemMap");
  const toolbarControls = document.querySelector(".map-toolbar-controls");
  const numbersButton = el("toggleNumbers");
  const providerControl = document.querySelector(".provider-metric-control");
  const baseRenderNodeDetails = renderNodeDetails;
  const baseSelectNodeForAmbulance = selectNode;
  const baseShowHomeForAmbulance = showHome;
  const baseShowWholePictureForAmbulance = showWholePicture;
  const badgeLayer = document.createElement("div");
  const badges = new Map();

  let ambulanceData = null;
  let selectedTrust = null;
  let numbersVisible = numbersButton?.getAttribute("aria-pressed") !== "false";

  if (!map || !toolbarControls) return;

  const AMBULANCE_NODE_IDS = new Set([
    "ambulance-calls",
    "ambulance-incidents",
    "ambulance-hear-treat",
    "ambulance-response",
    "ambulance-alternative",
    "ambulance-conveyed-ae",
    "ambulance-other-conveyance",
    "ambulance-ae-route"
  ]);

  // ============================================================
  // 01. LOAD THE SMALL PUBLIC AQI FILE
  // ============================================================
  async function loadJson(path) {
    try {
      const separator = path.includes("?") ? "&" : "?";
      const response = await fetch(`${path}${separator}v=${Date.now()}`,{ cache:"no-store" });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return await response.json();
    } catch (error) {
      return null;
    }
  }

  async function loadAmbulanceData() {
    const paths = [
      "public-data/ambulance-aqi-2024-25.json",
      "https://raw.githubusercontent.com/pelld/population-health-system-explorer/main/public-data/ambulance-aqi-2024-25.json"
    ];

    for (const path of paths) {
      const data = await loadJson(path);
      if (data?.england?.metrics && data?.trusts?.length) return data;
    }
    return null;
  }

  function formatCount(value) {
    return new Intl.NumberFormat("en-GB").format(Number(value));
  }

  function compactCount(value) {
    const number = Number(value);
    if (number >= 1000000) return `${(number / 1000000).toFixed(2)}m`;
    if (number >= 1000) return `${(number / 1000).toFixed(1)}k`;
    return String(number);
  }

  function formatPercent(value) {
    if (value === null || value === undefined || !Number.isFinite(Number(value))) return "—";
    return `${Number(value).toFixed(Number(value) >= 10 ? 1 : 2)}%`;
  }

  function currentGeography() {
    return selectedTrust || ambulanceData?.england || null;
  }

  function currentMetric(nodeId) {
    return currentGeography()?.metrics?.[nodeId] || null;
  }

  function englandMetric(nodeId) {
    return ambulanceData?.england?.metrics?.[nodeId] || null;
  }

  // ============================================================
  // 02. CONTEXT-SPECIFIC AMBULANCE TRUST SELECTOR
  // ============================================================
  const ambulanceControl = document.createElement("label");
  ambulanceControl.className = "ambulance-metric-control";
  ambulanceControl.hidden = true;
  ambulanceControl.innerHTML = `<span>Ambulance trust</span><select id="ambulanceMetricSelect" aria-label="Choose England or an ambulance service"><option value="">England</option><option value="__loading" disabled>Loading ambulance services…</option></select>`;

  const ambulanceSelect = ambulanceControl.querySelector("select");
  const scopeLabel = document.createElement("span");
  scopeLabel.className = "ambulance-metric-scope";
  scopeLabel.hidden = true;

  const existingScope = document.querySelector(".metric-scope");
  if (existingScope) {
    existingScope.insertAdjacentElement("afterend",ambulanceControl);
    ambulanceControl.insertAdjacentElement("afterend",scopeLabel);
  } else {
    toolbarControls.append(ambulanceControl,scopeLabel);
  }

  function populateTrustSelect(data) {
    ambulanceData = data;
    ambulanceSelect.innerHTML = `<option value="">England</option>`;

    if (ambulanceData?.trusts?.length) {
      ambulanceData.trusts.forEach(trust => ambulanceSelect.add(new Option(`${trust.name} (${trust.code})`,trust.code)));
      ambulanceSelect.disabled = false;
      ambulanceControl.title = `${ambulanceData.trust_count || ambulanceData.trusts.length} public ambulance services available`;
    } else {
      ambulanceSelect.add(new Option("Ambulance data unavailable","__unavailable"));
      ambulanceSelect.disabled = true;
    }
  }

  function updateAmbulanceScope() {
    const geography = currentGeography();
    scopeLabel.textContent = geography ? `${geography.name} · AQI ${ambulanceData.period}` : "AQI data unavailable";
  }

  function setAmbulanceContext(isAmbulance) {
    ambulanceControl.hidden = !isAmbulance;
    scopeLabel.hidden = !isAmbulance;
    if (providerControl) providerControl.hidden = isAmbulance;
    updateBadgePositions();
  }

  ambulanceSelect.addEventListener("change",() => {
    selectedTrust = ambulanceData?.trusts?.find(trust => trust.code === ambulanceSelect.value) || null;
    updateAmbulanceScope();
    refreshBadgeValues();

    const selectedNode = cy.$("node.selected-node").first();
    if (selectedNode.length) renderNodeDetails(NODE_BY_ID.get(selectedNode.id()));
    requestAnimationFrame(updateBadgePositions);
  });

  // ============================================================
  // 03. AQI BADGES ON THE AMBULANCE BRANCH
  // ============================================================
  badgeLayer.className = "metric-layer ambulance-metric-layer";
  badgeLayer.setAttribute("aria-hidden","true");
  map.append(badgeLayer);

  const BADGE_NODE_IDS = [
    "ambulance-calls",
    "ambulance-incidents",
    "ambulance-hear-treat",
    "ambulance-response",
    "ambulance-alternative",
    "ambulance-conveyed-ae",
    "ambulance-other-conveyance"
  ];

  BADGE_NODE_IDS.forEach(nodeId => {
    if (!cy.getElementById(nodeId).length) return;

    const badge = document.createElement("button");
    badge.type = "button";
    badge.className = "node-metric-badge ambulance-metric-badge";
    badge.dataset.nodeId = nodeId;
    badge.addEventListener("click",() => selectNode(cy.getElementById(nodeId),{ centre:false }));
    badgeLayer.append(badge);
    badges.set(nodeId,badge);
  });

  function refreshBadgeValues() {
    badges.forEach((badge,nodeId) => {
      const metric = currentMetric(nodeId);
      if (!metric || metric.count === null || metric.count === undefined) {
        badge.dataset.hasMetric = "false";
        badge.classList.remove("is-visible");
        return;
      }

      const value = metric.display === "percent" ? formatPercent(metric.percent) : compactCount(metric.count);
      badge.dataset.hasMetric = "true";
      badge.innerHTML = `<strong>${value}</strong><span>${selectedTrust ? selectedTrust.code : "AQI"}</span>`;
      badge.title = `${currentGeography().name}: ${formatCount(metric.count)} ${metric.label}${metric.percent === null ? "" : ` (${formatPercent(metric.percent)})`}`;
    });
  }

  function updateBadgePositions() {
    const ambulanceContextVisible = !ambulanceControl.hidden;
    const showAtThisZoom = numbersVisible && ambulanceContextVisible && cy.zoom() >= .34;

    badges.forEach((badge,nodeId) => {
      const node = cy.getElementById(nodeId);
      const hiddenByPathway = node.hasClass("faded") || node.hasClass("timescale-faded");

      if (!node.length || badge.dataset.hasMetric === "false" || !showAtThisZoom || hiddenByPathway || node.style("display") === "none") {
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
  // 04. TRUST COMPARISON AND DETAILS CARD
  // ============================================================
  function metricComparisonValue(geography,nodeId) {
    const metric = geography?.metrics?.[nodeId];
    if (!metric) return null;
    const value = metric.display === "percent" ? Number(metric.percent) : Number(metric.count);
    return Number.isFinite(value) ? value : null;
  }

  function rankTrust(nodeId,trustCode) {
    const ranked = ambulanceData.trusts
      .map(trust => ({ trust,value:metricComparisonValue(trust,nodeId) }))
      .filter(item => Number.isFinite(item.value))
      .sort((a,b) => b.value - a.value);

    const index = ranked.findIndex(item => item.trust.code === trustCode);
    if (index < 0) return null;
    return { rank:index + 1,total:ranked.length };
  }

  renderNodeDetails = function(node) {
    baseRenderNodeDetails(node);
    if (!AMBULANCE_NODE_IDS.has(node.id) || !ambulanceData) return;

    const metric = currentMetric(node.id);
    const england = englandMetric(node.id);
    if (!metric || !england) return;

    const isPercent = metric.display === "percent";
    const displayValue = isPercent ? formatPercent(metric.percent) : compactCount(metric.count);
    const englandValue = isPercent ? formatPercent(england.percent) : compactCount(england.count);
    const difference = selectedTrust && isPercent ? Number(metric.percent) - Number(england.percent) : null;
    const rank = selectedTrust ? rankTrust(node.id,selectedTrust.code) : null;

    const denominator = metric.denominator_count ? `
      <div class="metric-denominator">
        <span>Denominator</span>
        <strong>${formatCount(metric.denominator_count)}</strong>
        <small>${metric.denominator_label} (${metric.denominator_indicator})</small>
      </div>` : "";

    const comparison = selectedTrust
      ? isPercent
        ? `${Math.abs(difference).toFixed(2)} percentage points ${difference >= 0 ? "above" : "below"} England (${englandValue}).`
        : `England recorded ${formatCount(england.count)} in the same period.`
      : isPercent
        ? `${displayValue} using ${metric.denominator_label} as the denominator.`
        : `England annual total for this AQI stage.`;

    const rankPanel = selectedTrust && rank ? `
      <div class="ambulance-rank-card">
        <span>Recorded-value rank</span>
        <strong>${rank.rank} of ${rank.total}</strong>
        <small>Highest value ranks first; this is not a performance ranking.</small>
      </div>` : "";

    const validation = currentGeography().validation || {};
    const validationWarning = node.id === "ambulance-incidents" && validation.incident_outcome_gap
      ? `<p class="metric-warning">The published incident total differs from A17 + A56 by ${formatCount(validation.incident_outcome_gap)}. Check revisions and definitions before treating the outcomes as a perfect partition.</p>`
      : "";

    const card = document.createElement("section");
    card.className = "operational-metric-card ambulance-operational-card";
    card.innerHTML = `
      <div class="operational-metric-heading">
        <div><p class="eyebrow teal">Public ambulance pathway figure</p><strong>${displayValue}</strong></div>
        <span>${currentGeography().name}<br>${ambulanceData.period}</span>
      </div>
      <h3>${metric.label} · ${metric.indicator}</h3>
      <p class="metric-exact">${formatCount(metric.count)} incidents or calls</p>
      <p>${comparison}</p>
      ${denominator}
      ${rankPanel}
      ${validationWarning}
      <p class="metric-comparison-warning"><strong>Comparison warning:</strong> ambulance trusts cover different populations and geographies. These figures are not adjusted for age, deprivation, rurality, call category or local service configuration.</p>
      <p class="metric-note">${metric.definition}</p>
      <a href="${ambulanceData.source_url}" target="_blank" rel="noopener">${ambulanceData.publication}</a>`;

    el("nodeDetails").prepend(card);
  };

  // ============================================================
  // 05. SWITCH THE TOOLBAR TO THE RELEVANT DATASET
  // ============================================================
  selectNode = function(node,options={}) {
    const result = baseSelectNodeForAmbulance(node,options);
    setAmbulanceContext(AMBULANCE_NODE_IDS.has(node.id()));
    requestAnimationFrame(() => {
      refreshBadgeValues();
      updateBadgePositions();
    });
    return result;
  };

  showHome = function(...args) {
    const result = baseShowHomeForAmbulance(...args);
    setAmbulanceContext(false);
    return result;
  };

  showWholePicture = function(...args) {
    const result = baseShowWholePictureForAmbulance(...args);
    setAmbulanceContext(false);
    return result;
  };

  // ============================================================
  // 06. INITIALISE AFTER THE GENERATED FILE IS AVAILABLE
  // ============================================================
  ambulanceData = await loadAmbulanceData();
  populateTrustSelect(ambulanceData);
  updateAmbulanceScope();
  refreshBadgeValues();

  if (!ambulanceData) {
    setTimeout(async () => {
      const retryData = await loadAmbulanceData();
      if (!retryData) return;
      populateTrustSelect(retryData);
      updateAmbulanceScope();
      refreshBadgeValues();
    },3000);
  }
})();
