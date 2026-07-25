// ============================================================
// 00. PUBLIC NHS 111 / IUC PATHWAY METRICS
// ============================================================
// Adds the revised 2024-25 IUC ADC figures to the existing NHS 111 branch.
// The IUC selector is deliberately separate from ECDS providers and ambulance
// trusts because the three datasets use different reporting geographies.

(async () => {
  const map = el("systemMap");
  const toolbarControls = document.querySelector(".map-toolbar-controls");
  const numbersButton = el("toggleNumbers");
  const providerControl = document.querySelector(".provider-metric-control");
  const providerScope = document.querySelector(".metric-scope");
  const ambulanceControl = document.querySelector(".ambulance-metric-control");
  const ambulanceScope = document.querySelector(".ambulance-metric-scope");
  const baseRenderNodeDetails = renderNodeDetails;
  const baseSelectNodeForIuc = selectNode;
  const baseShowHomeForIuc = showHome;
  const baseShowWholePictureForIuc = showWholePicture;

  if (!map || !toolbarControls) return;

  const IUC_NODE_IDS = new Set([
    "nhs111-ae-route",
    "nhs111-contacts",
    "nhs111-triage",
    "nhs111-ae-disposition",
    "nhs111-direct-booking"
  ]);

  const BADGE_NODE_IDS = [
    "nhs111-contacts",
    "nhs111-triage",
    "nhs111-ae-disposition",
    "nhs111-direct-booking"
  ];

  const badgeLayer = document.createElement("div");
  const badges = new Map();
  let iucData = null;
  let selectedArea = null;
  let numbersVisible = numbersButton?.getAttribute("aria-pressed") !== "false";

  // ============================================================
  // 01. LOAD THE SMALL GENERATED PUBLIC FILE
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

  async function loadIucData() {
    const paths = [
      "public-data/iucadc-2024-25.json",
      "https://raw.githubusercontent.com/pelld/population-health-system-explorer/main/public-data/iucadc-2024-25.json"
    ];

    for (const path of paths) {
      const data = await loadJson(path);
      if (data?.england?.metrics && data?.areas?.length) return data;
    }
    return null;
  }

  function formatCount(value) {
    if (value === null || value === undefined || !Number.isFinite(Number(value))) return "—";
    return new Intl.NumberFormat("en-GB").format(Number(value));
  }

  function compactCount(value) {
    const number = Number(value);
    if (!Number.isFinite(number)) return "—";
    if (number >= 1000000) return `${(number / 1000000).toFixed(2)}m`;
    if (number >= 1000) return `${(number / 1000).toFixed(1)}k`;
    return String(number);
  }

  function formatPercent(value) {
    if (value === null || value === undefined || !Number.isFinite(Number(value))) return "—";
    return `${Number(value).toFixed(Number(value) >= 10 ? 1 : 2)}%`;
  }

  function currentGeography() {
    return selectedArea || iucData?.england || null;
  }

  function metricNodeId(nodeId) {
    return nodeId === "nhs111-ae-route" ? "nhs111-ae-disposition" : nodeId;
  }

  function currentMetric(nodeId) {
    return currentGeography()?.metrics?.[metricNodeId(nodeId)] || null;
  }

  function englandMetric(nodeId) {
    return iucData?.england?.metrics?.[metricNodeId(nodeId)] || null;
  }

  // ============================================================
  // 02. IUC CONTRACT-AREA SELECTOR
  // ============================================================
  const iucControl = document.createElement("label");
  iucControl.className = "iuc-metric-control";
  iucControl.hidden = true;
  iucControl.innerHTML = `<span>IUC contract area</span><select id="iucMetricSelect" aria-label="Choose England or an IUC contract area"><option value="">England</option><option value="__loading" disabled>Loading contract areas…</option></select>`;

  const iucSelect = iucControl.querySelector("select");
  const iucScope = document.createElement("span");
  iucScope.className = "iuc-metric-scope";
  iucScope.hidden = true;

  const insertionAnchor = ambulanceScope || providerScope || numbersButton;
  if (insertionAnchor) {
    insertionAnchor.insertAdjacentElement("afterend",iucControl);
    iucControl.insertAdjacentElement("afterend",iucScope);
  } else {
    toolbarControls.append(iucControl,iucScope);
  }

  function populateAreaSelect(data) {
    iucData = data;
    iucSelect.innerHTML = `<option value="">England</option>`;

    if (iucData?.areas?.length) {
      iucData.areas.forEach(area => iucSelect.add(new Option(`${area.name} (${area.code})`,area.code)));
      iucSelect.disabled = false;
      iucControl.title = `${iucData.contract_area_count || iucData.areas.length} public IUC contract areas available`;
    } else {
      iucSelect.add(new Option("IUC data unavailable","__unavailable"));
      iucSelect.disabled = true;
      iucControl.title = "The public IUC data file could not be loaded.";
    }
  }

  function updateIucScope() {
    const geography = currentGeography();
    iucScope.textContent = geography ? `${geography.name} · IUC ADC ${iucData.period}` : "IUC data unavailable";
  }

  function setIucContext(isIuc) {
    iucControl.hidden = !isIuc;
    iucScope.hidden = !isIuc;

    if (isIuc) {
      if (providerControl) providerControl.hidden = true;
      if (providerScope) providerScope.hidden = true;
      if (ambulanceControl) ambulanceControl.hidden = true;
      if (ambulanceScope) ambulanceScope.hidden = true;
    }

    requestAnimationFrame(updateBadgePositions);
  }

  iucSelect.addEventListener("change",() => {
    selectedArea = iucData?.areas?.find(area => area.code === iucSelect.value) || null;
    updateIucScope();
    refreshBadgeValues();

    const selectedNode = cy.$("node.selected-node").first();
    if (selectedNode.length) renderNodeDetails(NODE_BY_ID.get(selectedNode.id()));
    requestAnimationFrame(updateBadgePositions);
  });

  // ============================================================
  // 03. IUC BADGES ON THE EXISTING NHS 111 BRANCH
  // ============================================================
  badgeLayer.className = "metric-layer iuc-metric-layer";
  badgeLayer.setAttribute("aria-hidden","true");
  map.append(badgeLayer);

  BADGE_NODE_IDS.forEach(nodeId => {
    if (!cy.getElementById(nodeId).length) return;

    const badge = document.createElement("button");
    badge.type = "button";
    badge.className = "node-metric-badge iuc-metric-badge";
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
      badge.innerHTML = `<strong>${value}</strong><span>${selectedArea ? selectedArea.code : "IUC"}</span>`;
      badge.title = `${currentGeography().name}: ${formatCount(metric.count)} · ${metric.label}`;
    });
  }

  function updateBadgePositions() {
    const iucContextVisible = !iucControl.hidden;
    const showAtThisZoom = numbersVisible && iucContextVisible && cy.zoom() >= .34;

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
  // 04. CONTRACT-AREA RANKING
  // ============================================================
  function comparisonValue(area,nodeId) {
    const metric = area?.metrics?.[metricNodeId(nodeId)];
    if (!metric) return null;
    const value = metric.display === "percent" ? Number(metric.percent) : Number(metric.count);
    return Number.isFinite(value) ? value : null;
  }

  function rankArea(nodeId,areaCode) {
    const ranked = iucData.areas
      .map(area => ({ area,value:comparisonValue(area,nodeId) }))
      .filter(item => Number.isFinite(item.value))
      .sort((a,b) => b.value - a.value);

    const index = ranked.findIndex(item => item.area.code === areaCode);
    if (index < 0) return null;
    return { rank:index + 1,total:ranked.length };
  }

  function miniRow(item) {
    return `<div><span>${item.label}</span><strong>${formatPercent(item.percent)}</strong><small>${formatCount(item.count)} · ${item.indicator}</small></div>`;
  }

  function bookingRow(item,total) {
    const share = total && item.count !== null && item.count !== undefined ? (Number(item.count) / Number(total)) * 100 : null;
    return `<div><span>${item.label}</span><strong>${formatPercent(share)}</strong><small>${formatCount(item.count)} · ${item.indicator}</small></div>`;
  }

  // ============================================================
  // 05. DETAILS CARD: CALL HANDLING, DISPOSITIONS AND BOOKINGS
  // ============================================================
  renderNodeDetails = function(node) {
    baseRenderNodeDetails(node);
    if (!IUC_NODE_IDS.has(node.id) || !iucData) return;

    const geography = currentGeography();
    const metric = currentMetric(node.id);
    const england = englandMetric(node.id);
    if (!geography || !metric || !england) return;

    const isPercent = metric.display === "percent";
    const displayValue = isPercent ? formatPercent(metric.percent) : compactCount(metric.count);
    const englandValue = isPercent ? formatPercent(england.percent) : compactCount(england.count);
    const difference = selectedArea && isPercent ? Number(metric.percent) - Number(england.percent) : null;
    const rank = selectedArea ? rankArea(node.id,selectedArea.code) : null;

    const comparison = selectedArea
      ? isPercent
        ? `${Math.abs(difference).toFixed(2)} percentage points ${difference >= 0 ? "above" : "below"} the published England figure (${englandValue}).`
        : `England recorded ${formatCount(england.count)} in the same period.`
      : isPercent
        ? `${displayValue} using ${metric.denominator_label} as the denominator.`
        : "Published England annual total.";

    const denominator = metric.denominator ? `
      <div class="metric-denominator iuc-denominator">
        <span>Denominator</span>
        <strong>${formatCount(metric.denominator)}</strong>
        <small>${metric.denominator_label} · ${metric.indicator}</small>
      </div>` : "";

    const callsPanel = `
      <div class="iuc-call-grid">
        <div><span>Answered</span><strong>${formatPercent(geography.calls.answered_percent)}</strong><small>${formatCount(geography.calls.answered)}</small></div>
        <div><span>Abandoned</span><strong>${formatPercent(geography.calls.abandoned_percent)}</strong><small>${formatCount(geography.calls.abandoned)}</small></div>
        <div><span>Final dispositions</span><strong>${compactCount(geography.calls.final_dispositions)}</strong><small>one final recommendation per triaged call</small></div>
      </div>`;

    const dispositionsPanel = `
      <section class="iuc-breakdown">
        <h4>Final disposition breakdown</h4>
        <div class="iuc-breakdown-grid">${Object.values(geography.dispositions).map(miniRow).join("")}</div>
      </section>`;

    const bookingPanel = `
      <section class="iuc-breakdown">
        <h4>Booked appointments</h4>
        <p><strong>${formatCount(geography.bookings.total)}</strong> · ${formatPercent(geography.bookings.percent_of_dispositions)} of final dispositions</p>
        <div class="iuc-breakdown-grid">${Object.values(geography.bookings.breakdown).map(item => bookingRow(item,geography.bookings.total)).join("")}</div>
      </section>`;

    const rankPanel = selectedArea && rank ? `
      <div class="iuc-rank-card">
        <span>Recorded-value rank</span>
        <strong>${rank.rank} of ${rank.total}</strong>
        <small>Highest value ranks first; this is not a performance ranking.</small>
      </div>` : "";

    const supplierNote = selectedArea?.lead_suppliers?.length
      ? `<p class="metric-note"><strong>Lead data supplier${selectedArea.lead_suppliers.length > 1 ? "s" : ""}:</strong> ${selectedArea.lead_suppliers.join(", ")}</p>`
      : "";

    const card = document.createElement("section");
    card.className = "operational-metric-card iuc-operational-card";
    card.innerHTML = `
      <div class="operational-metric-heading">
        <div><p class="eyebrow teal">Public NHS 111 / IUC figure</p><strong>${displayValue}</strong></div>
        <span>${geography.name}<br>${iucData.period}</span>
      </div>
      <h3>${metric.label}</h3>
      <p class="metric-exact">${formatCount(metric.count)} calls</p>
      <p>${comparison}</p>
      ${denominator}
      ${rankPanel}
      ${callsPanel}
      ${node.id === "nhs111-direct-booking" ? bookingPanel : dispositionsPanel}
      ${supplierNote}
      <p class="metric-comparison-warning"><strong>Geography warning:</strong> IUC contract areas and lead data suppliers do not align exactly with ICBs, ambulance trusts or acute providers. Contract configuration and missing numerator/denominator months can affect comparisons.</p>
      <a href="${iucData.source_url}" target="_blank" rel="noopener">${iucData.publication}</a>`;

    el("nodeDetails").prepend(card);
  };

  // ============================================================
  // 06. SWITCH THE TOOLBAR TO THE RELEVANT DATASET
  // ============================================================
  selectNode = function(node,options={}) {
    const result = baseSelectNodeForIuc(node,options);
    setIucContext(IUC_NODE_IDS.has(node.id()));
    requestAnimationFrame(() => {
      refreshBadgeValues();
      updateBadgePositions();
    });
    return result;
  };

  showHome = function(...args) {
    const result = baseShowHomeForIuc(...args);
    setIucContext(false);
    return result;
  };

  showWholePicture = function(...args) {
    const result = baseShowWholePictureForIuc(...args);
    setIucContext(false);
    return result;
  };

  // ============================================================
  // 07. INITIALISE AND RETRY DURING A PAGES DEPLOYMENT
  // ============================================================
  iucData = await loadIucData();
  populateAreaSelect(iucData);
  updateIucScope();
  refreshBadgeValues();

  if (!iucData) {
    setTimeout(async () => {
      const retryData = await loadIucData();
      if (retryData) {
        populateAreaSelect(retryData);
        updateIucScope();
        refreshBadgeValues();
      }
    },3000);
  }
})();
