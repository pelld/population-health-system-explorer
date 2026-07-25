// ============================================================
// 00. PUBLIC GPAD 2024-25 ICB METRICS
// ============================================================
// Adds an ICB view to the primary-care branch. GPAD describes appointments
// recorded in GP practice appointment systems; it does not measure every
// request for help, unmet demand or whether the appointment was suitable.

(async () => {
  const map = el("systemMap");
  const toolbarControls = document.querySelector(".map-toolbar-controls");
  const numbersButton = el("toggleNumbers");
  const providerControl = document.querySelector(".provider-metric-control");
  const providerScope = document.querySelector(".metric-scope");
  const ambulanceControl = document.querySelector(".ambulance-metric-control");
  const ambulanceScope = document.querySelector(".ambulance-metric-scope");
  const iucControl = document.querySelector(".iuc-metric-control");
  const iucScope = document.querySelector(".iuc-metric-scope");
  const baseRenderNodeDetails = renderNodeDetails;
  const baseSelectNodeForGpad = selectNode;
  const baseShowHomeForGpad = showHome;
  const baseShowWholePictureForGpad = showWholePicture;

  if (!map || !toolbarControls) return;

  const GPAD_CONTEXT_NODE_IDS = new Set([
    "urgent-primary-demand",
    "gpad-appointments",
    "same-day-capacity",
    "gp-clinical-assessment",
    "failed-primary-access"
  ]);

  const BADGE_NODE_IDS = [
    "gpad-appointments",
    "same-day-capacity",
    "gp-clinical-assessment"
  ];

  const badgeLayer = document.createElement("div");
  const badges = new Map();
  let gpadData = null;
  let selectedIcb = null;
  let numbersVisible = numbersButton?.getAttribute("aria-pressed") !== "false";

  // ============================================================
  // 01. LOAD THE GENERATED PUBLIC ICB FILE
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

  async function loadGpadData() {
    const paths = [
      "public-data/gpad-2024-25-icb.json",
      "https://raw.githubusercontent.com/pelld/population-health-system-explorer/main/public-data/gpad-2024-25-icb.json"
    ];

    for (const path of paths) {
      const data = await loadJson(path);
      if (data?.england?.metrics && data?.icbs?.length) return data;
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
    return selectedIcb || gpadData?.england || null;
  }

  function currentMetric(nodeId) {
    return currentGeography()?.metrics?.[nodeId] || null;
  }

  function englandMetric(nodeId) {
    return gpadData?.england?.metrics?.[nodeId] || null;
  }

  // ============================================================
  // 02. ICB SELECTOR FOR THE PRIMARY-CARE DATASET
  // ============================================================
  const gpadControl = document.createElement("label");
  gpadControl.className = "gpad-metric-control";
  gpadControl.hidden = true;
  gpadControl.innerHTML = `<span>GPAD geography</span><select id="gpadMetricSelect" aria-label="Choose England or an Integrated Care Board"><option value="">England</option><option value="__loading" disabled>Loading ICBs…</option></select>`;

  const gpadSelect = gpadControl.querySelector("select");
  const gpadScope = document.createElement("span");
  gpadScope.className = "gpad-metric-scope";
  gpadScope.hidden = true;

  const insertionAnchor = iucScope || ambulanceScope || providerScope || numbersButton;
  if (insertionAnchor) {
    insertionAnchor.insertAdjacentElement("afterend",gpadControl);
    gpadControl.insertAdjacentElement("afterend",gpadScope);
  } else {
    toolbarControls.append(gpadControl,gpadScope);
  }

  function populateIcbSelect(data) {
    gpadData = data;
    gpadSelect.innerHTML = `<option value="">England</option>`;

    if (gpadData?.icbs?.length) {
      gpadData.icbs.forEach(icb => gpadSelect.add(new Option(icb.name,icb.code)));
      gpadSelect.disabled = false;
      gpadControl.title = `${gpadData.icb_count || gpadData.icbs.length} published ICB geographies available`;
    } else {
      gpadSelect.add(new Option("GPAD data unavailable","__unavailable"));
      gpadSelect.disabled = true;
      gpadControl.title = "The public GPAD ICB file could not be loaded.";
    }
  }

  function updateGpadScope() {
    const geography = currentGeography();
    gpadScope.textContent = geography ? `${geography.name} · GPAD ${gpadData.period}` : "GPAD data unavailable";
  }

  function setGpadContext(isGpad) {
    gpadControl.hidden = !isGpad;
    gpadScope.hidden = !isGpad;

    if (isGpad) {
      if (providerControl) providerControl.hidden = true;
      if (providerScope) providerScope.hidden = true;
      if (ambulanceControl) ambulanceControl.hidden = true;
      if (ambulanceScope) ambulanceScope.hidden = true;
      if (iucControl) iucControl.hidden = true;
      if (iucScope) iucScope.hidden = true;
    }

    requestAnimationFrame(updateBadgePositions);
  }

  gpadSelect.addEventListener("change",() => {
    selectedIcb = gpadData?.icbs?.find(icb => icb.code === gpadSelect.value) || null;
    updateGpadScope();
    refreshBadgeValues();

    const selectedNode = cy.$("node.selected-node").first();
    if (selectedNode.length) renderNodeDetails(NODE_BY_ID.get(selectedNode.id()));
    requestAnimationFrame(updateBadgePositions);
  });

  // ============================================================
  // 03. NUMBER BADGES ON OBSERVED GPAD MEASURES
  // ============================================================
  badgeLayer.className = "metric-layer gpad-metric-layer";
  badgeLayer.setAttribute("aria-hidden","true");
  map.append(badgeLayer);

  BADGE_NODE_IDS.forEach(nodeId => {
    if (!cy.getElementById(nodeId).length) return;

    const badge = document.createElement("button");
    badge.type = "button";
    badge.className = "node-metric-badge gpad-metric-badge";
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
      badge.innerHTML = `<strong>${value}</strong><span>${selectedIcb ? "ICB" : "GPAD"}</span>`;
      badge.title = `${currentGeography().name}: ${formatCount(metric.count)} · ${metric.label}`;
    });
  }

  function updateBadgePositions() {
    const gpadContextVisible = !gpadControl.hidden;
    const showAtThisZoom = numbersVisible && gpadContextVisible && cy.zoom() >= .34;

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
  // 04. ICB COMPARISON METHODS
  // ============================================================
  function comparisonValue(icb,nodeId) {
    const metric = icb?.metrics?.[nodeId];
    if (!metric) return null;
    const value = metric.display === "percent" ? Number(metric.percent) : Number(metric.count);
    return Number.isFinite(value) ? value : null;
  }

  function rankIcb(nodeId,icbCode) {
    const ranked = gpadData.icbs
      .map(icb => ({ icb,value:comparisonValue(icb,nodeId) }))
      .filter(item => Number.isFinite(item.value))
      .sort((a,b) => b.value - a.value);

    const index = ranked.findIndex(item => item.icb.code === icbCode);
    if (index < 0) return null;
    return { rank:index + 1,total:ranked.length };
  }

  function profileRow(item) {
    return `<div><span>${item.label}</span><strong>${formatPercent(item.percent)}</strong><small>${formatCount(item.count)}</small></div>`;
  }

  function profilePanel(title,items) {
    return `<section class="gpad-breakdown"><h4>${title}</h4><div class="gpad-breakdown-grid">${Object.values(items).map(profileRow).join("")}</div></section>`;
  }

  // ============================================================
  // 05. DETAILS CARD AND EXPLICIT DATA GAPS
  // ============================================================
  renderNodeDetails = function(node) {
    baseRenderNodeDetails(node);
    if (!GPAD_CONTEXT_NODE_IDS.has(node.id) || !gpadData) return;

    const geography = currentGeography();
    const metric = currentMetric(node.id);

    if (!metric) {
      const gapCard = document.createElement("section");
      gapCard.className = "operational-metric-card gpad-operational-card";
      gapCard.innerHTML = `
        <div class="operational-metric-heading">
          <div><p class="eyebrow teal">GPAD limitation</p><strong>Not measured</strong></div>
          <span>${geography.name}<br>${gpadData.period}</span>
        </div>
        <h3>${node.label}</h3>
        <p>GPAD records appointments placed in GP practice appointment systems. It does not observe every request for help, abandoned contact, rejected request, unmet demand or whether timely care was actually available.</p>
        <p class="metric-comparison-warning"><strong>Do not infer failed access</strong> from a low appointment count or a low same-day percentage.</p>
        <a href="${gpadData.supporting_information_url}" target="_blank" rel="noopener">Appointments in General Practice supporting information</a>`;
      el("nodeDetails").prepend(gapCard);
      return;
    }

    const england = englandMetric(node.id);
    if (!geography || !england) return;

    const isPercent = metric.display === "percent";
    const displayValue = isPercent ? formatPercent(metric.percent) : compactCount(metric.count);
    const englandValue = isPercent ? formatPercent(england.percent) : compactCount(england.count);
    const difference = selectedIcb && isPercent ? Number(metric.percent) - Number(england.percent) : null;
    const rank = selectedIcb ? rankIcb(node.id,selectedIcb.code) : null;

    const comparison = selectedIcb
      ? isPercent
        ? `${Math.abs(difference).toFixed(2)} percentage points ${difference >= 0 ? "above" : "below"} England (${englandValue}).`
        : `England recorded ${formatCount(england.count)} appointments in the same period.`
      : isPercent
        ? `${displayValue} of recorded appointments.`
        : "England annual total for appointments recorded in GP practice appointment systems.";

    const denominator = metric.denominator ? `
      <div class="metric-denominator gpad-denominator">
        <span>Denominator</span>
        <strong>${formatCount(metric.denominator)}</strong>
        <small>${metric.denominator_label}</small>
      </div>` : "";

    const rankPanel = selectedIcb && rank ? `
      <div class="gpad-rank-card">
        <span>${isPercent ? "Recorded-value rank" : "Activity-volume rank"}</span>
        <strong>${rank.rank} of ${rank.total}</strong>
        <small>Highest value ranks first; this is not a performance ranking.</small>
      </div>` : "";

    const dataQuality = geography.data_quality ? `
      <div class="gpad-quality-grid">
        <div><span>Unknown booking delay</span><strong>${formatPercent(geography.data_quality.unknown_booking_percent)}</strong></div>
        <div><span>Unknown mode</span><strong>${formatPercent(geography.data_quality.unknown_mode_percent)}</strong></div>
        <div><span>Unknown clinician</span><strong>${formatPercent(geography.data_quality.unknown_hcp_percent)}</strong></div>
        <div><span>Unknown status</span><strong>${formatPercent(geography.data_quality.unknown_status_percent)}</strong></div>
      </div>` : "";

    const card = document.createElement("section");
    card.className = "operational-metric-card gpad-operational-card";
    card.innerHTML = `
      <div class="operational-metric-heading">
        <div><p class="eyebrow teal">Public GPAD figure</p><strong>${displayValue}</strong></div>
        <span>${geography.name}<br>${gpadData.period}</span>
      </div>
      <h3>${metric.label}</h3>
      <p class="metric-exact">${formatCount(metric.count)} recorded appointments</p>
      <p>${comparison}</p>
      ${denominator}
      ${rankPanel}
      ${profilePanel("Booking delay",geography.booking_delay)}
      ${profilePanel("Appointment mode",geography.mode)}
      ${profilePanel("Recorded clinician type",geography.hcp)}
      ${profilePanel("Appointment status",geography.status)}
      ${dataQuality}
      <p class="metric-comparison-warning"><strong>Interpretation warning:</strong> GPAD does not measure all primary-care workload, access attempts, clinical complexity or whether an appointment was suitable. Recording practices and system use vary between practices and ICBs.</p>
      <a href="${gpadData.source_url}" target="_blank" rel="noopener">${gpadData.publication}</a>`;

    el("nodeDetails").prepend(card);
  };

  // ============================================================
  // 06. SWITCH THE TOOLBAR TO THE RELEVANT DATASET
  // ============================================================
  selectNode = function(node,options={}) {
    const result = baseSelectNodeForGpad(node,options);
    setGpadContext(GPAD_CONTEXT_NODE_IDS.has(node.id()));
    requestAnimationFrame(() => {
      refreshBadgeValues();
      updateBadgePositions();
    });
    return result;
  };

  showHome = function(...args) {
    const result = baseShowHomeForGpad(...args);
    setGpadContext(false);
    return result;
  };

  showWholePicture = function(...args) {
    const result = baseShowWholePictureForGpad(...args);
    setGpadContext(false);
    return result;
  };

  // ============================================================
  // 07. INITIALISE AND RETRY DURING A PAGES DEPLOYMENT
  // ============================================================
  gpadData = await loadGpadData();
  populateIcbSelect(gpadData);
  updateGpadScope();
  refreshBadgeValues();

  if (!gpadData) {
    setTimeout(async () => {
      const retryData = await loadGpadData();
      if (retryData) {
        populateIcbSelect(retryData);
        updateGpadScope();
        refreshBadgeValues();
      }
    },3000);
  }
})();
