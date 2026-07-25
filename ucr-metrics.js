// ============================================================
// 00. PUBLIC URGENT COMMUNITY RESPONSE METRICS
// ============================================================
// Adds the complete 2024-25 CSDS-derived UCR publication to the community branch.
// ICBs and providers are offered as separate published geographies; the selector
// does not infer a provider-to-ICB mapping.

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
  const gpadControl = document.querySelector(".gpad-metric-control");
  const gpadScope = document.querySelector(".gpad-metric-scope");
  const baseRenderNodeDetails = renderNodeDetails;
  const baseSelectNodeForUcr = selectNode;
  const baseShowHomeForUcr = showHome;
  const baseShowWholePictureForUcr = showWholePicture;

  if (!map || !toolbarControls) return;

  const UCR_CONTEXT_NODE_IDS = new Set([
    "urgent-community-capacity",
    "ucr-referrals",
    "ucr-care-contacts",
    "ucr-two-hour-achievement"
  ]);

  const BADGE_NODE_IDS = [
    "ucr-referrals",
    "ucr-care-contacts",
    "ucr-two-hour-achievement"
  ];

  const badgeLayer = document.createElement("div");
  const badges = new Map();
  let ucrData = null;
  let selectedGeography = null;
  let numbersVisible = numbersButton?.getAttribute("aria-pressed") !== "false";

  // ============================================================
  // 01. LOAD THE GENERATED PUBLIC FILE
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

  async function loadUcrData() {
    const paths = [
      "public-data/ucr-2024-25.json",
      "https://raw.githubusercontent.com/pelld/population-health-system-explorer/main/public-data/ucr-2024-25.json"
    ];

    for (const path of paths) {
      const data = await loadJson(path);
      if (data?.england?.metrics && data?.icbs?.length && data?.providers?.length) return data;
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
    return selectedGeography || ucrData?.england || null;
  }

  function currentMetric(nodeId) {
    return currentGeography()?.metrics?.[nodeId] || null;
  }

  function englandMetric(nodeId) {
    return ucrData?.england?.metrics?.[nodeId] || null;
  }

  // ============================================================
  // 02. DIRECT PUBLISHED ICB / PROVIDER SELECTOR
  // ============================================================
  const ucrControl = document.createElement("label");
  ucrControl.className = "ucr-metric-control";
  ucrControl.hidden = true;
  ucrControl.innerHTML = `<span>UCR geography</span><select id="ucrMetricSelect" aria-label="Choose England, an ICB or a community provider"><option value="">England</option><option value="__loading" disabled>Loading UCR geographies…</option></select>`;

  const ucrSelect = ucrControl.querySelector("select");
  const ucrScope = document.createElement("span");
  ucrScope.className = "ucr-metric-scope";
  ucrScope.hidden = true;

  const insertionAnchor = gpadScope || iucScope || ambulanceScope || providerScope || numbersButton;
  if (insertionAnchor) {
    insertionAnchor.insertAdjacentElement("afterend",ucrControl);
    ucrControl.insertAdjacentElement("afterend",ucrScope);
  } else {
    toolbarControls.append(ucrControl,ucrScope);
  }

  function populateGeographySelect(data) {
    ucrData = data;
    ucrSelect.innerHTML = `<option value="">England</option>`;

    if (!ucrData?.icbs?.length || !ucrData?.providers?.length) {
      ucrSelect.add(new Option("UCR data unavailable","__unavailable"));
      ucrSelect.disabled = true;
      return;
    }

    const icbGroup = document.createElement("optgroup");
    icbGroup.label = `Integrated Care Boards (${ucrData.icb_count || ucrData.icbs.length})`;
    ucrData.icbs.forEach(item => icbGroup.append(new Option(item.name,`ICB|${item.code}`)));

    const providerGroup = document.createElement("optgroup");
    providerGroup.label = `Community providers (${ucrData.provider_count || ucrData.providers.length})`;
    ucrData.providers.forEach(item => providerGroup.append(new Option(item.name,`Provider|${item.code}`)));

    ucrSelect.append(icbGroup,providerGroup);
    ucrSelect.disabled = false;
    ucrControl.title = "Direct published UCR ICB and provider geographies";
  }

  function updateUcrScope() {
    const geography = currentGeography();
    ucrScope.textContent = geography ? `${geography.name} · ${geography.type} · UCR ${ucrData.period}` : "UCR data unavailable";
  }

  function hideOtherSelectors() {
    [providerControl,providerScope,ambulanceControl,ambulanceScope,iucControl,iucScope,gpadControl,gpadScope].forEach(control => {
      if (control) control.hidden = true;
    });
  }

  function setUcrContext(isUcr) {
    ucrControl.hidden = !isUcr;
    ucrScope.hidden = !isUcr;
    if (isUcr) hideOtherSelectors();
    requestAnimationFrame(updateBadgePositions);
  }

  ucrSelect.addEventListener("change",() => {
    const [type,code] = ucrSelect.value.split("|");
    const collection = type === "ICB" ? ucrData?.icbs : type === "Provider" ? ucrData?.providers : [];
    selectedGeography = collection?.find(item => item.code === code) || null;
    updateUcrScope();
    refreshBadgeValues();

    const selectedNode = cy.$("node.selected-node").first();
    if (selectedNode.length) renderNodeDetails(NODE_BY_ID.get(selectedNode.id()));
    requestAnimationFrame(updateBadgePositions);
  });

  // ============================================================
  // 03. METRIC BADGES
  // ============================================================
  badgeLayer.className = "metric-layer ucr-metric-layer";
  badgeLayer.setAttribute("aria-hidden","true");
  map.append(badgeLayer);

  BADGE_NODE_IDS.forEach(nodeId => {
    if (!cy.getElementById(nodeId).length) return;

    const badge = document.createElement("button");
    badge.type = "button";
    badge.className = "node-metric-badge ucr-metric-badge";
    badge.dataset.nodeId = nodeId;
    badge.addEventListener("click",() => selectNode(cy.getElementById(nodeId),{ centre:false }));
    badgeLayer.append(badge);
    badges.set(nodeId,badge);
  });

  function refreshBadgeValues() {
    badges.forEach((badge,nodeId) => {
      const metric = currentMetric(nodeId);
      const rawValue = metric?.display === "percent" ? metric.percent : metric?.count;

      if (rawValue === null || rawValue === undefined) {
        badge.dataset.hasMetric = "false";
        badge.classList.remove("is-visible");
        return;
      }

      const value = metric.display === "percent" ? formatPercent(metric.percent) : compactCount(metric.count);
      badge.dataset.hasMetric = "true";
      badge.innerHTML = `<strong>${value}</strong><span>${selectedGeography ? selectedGeography.type : "CSDS"}</span>`;
      badge.title = `${currentGeography().name}: ${metric.label} · ${value}`;
    });
  }

  function updateBadgePositions() {
    const contextVisible = !ucrControl.hidden;
    const showAtThisZoom = numbersVisible && contextVisible && cy.zoom() >= .32;

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
  // 04. COMPARISON AND MONTHLY PROFILE HELPERS
  // ============================================================
  function comparisonValue(item,nodeId) {
    const metric = item?.metrics?.[nodeId];
    const value = metric?.display === "percent" ? Number(metric.percent) : Number(metric?.count);
    return Number.isFinite(value) ? value : null;
  }

  function peerCollection() {
    if (!selectedGeography) return [];
    return selectedGeography.type === "ICB" ? ucrData.icbs : ucrData.providers;
  }

  function rankGeography(nodeId) {
    if (!selectedGeography) return null;
    const ranked = peerCollection()
      .map(item => ({ item,value:comparisonValue(item,nodeId) }))
      .filter(item => Number.isFinite(item.value))
      .sort((a,b) => b.value - a.value);

    const index = ranked.findIndex(item => item.item.code === selectedGeography.code);
    return index < 0 ? null : { rank:index + 1,total:ranked.length };
  }

  function monthlyPerformancePanel(geography) {
    const months = geography?.months?.performance || [];
    return `<section class="ucr-monthly"><h4>Published monthly two-hour achievement</h4><div class="ucr-month-grid">${months.map(item => `<div><span>${item.month}</span><strong>${formatPercent(item.value)}</strong></div>`).join("")}</div></section>`;
  }

  // ============================================================
  // 05. DETAILS CARD
  // ============================================================
  renderNodeDetails = function(node) {
    baseRenderNodeDetails(node);
    if (!UCR_CONTEXT_NODE_IDS.has(node.id) || !ucrData) return;

    const geography = currentGeography();
    const metric = currentMetric(node.id);
    const rank = metric ? rankGeography(node.id) : null;

    if (!metric) {
      const contextCard = document.createElement("section");
      contextCard.className = "operational-metric-card ucr-operational-card";
      contextCard.innerHTML = `
        <div class="operational-metric-heading">
          <div><p class="eyebrow teal">Public UCR context</p><strong>Activity, not capacity</strong></div>
          <span>${geography.name}<br>${ucrData.period}</span>
        </div>
        <h3>What the publication can show</h3>
        <div class="ucr-summary-grid">
          <div><span>Referrals</span><strong>${compactCount(geography.activity.referrals)}</strong></div>
          <div><span>Care contacts</span><strong>${compactCount(geography.activity.contacts)}</strong></div>
          <div><span>Contacts per referral</span><strong>${geography.activity.contacts_per_referral ?? "—"}</strong></div>
        </div>
        <p>The publication describes recorded referral activity, care contacts and response timeliness. It does not directly measure workforce capacity, rejected referrals, unmet need or admissions avoided.</p>
        ${monthlyPerformancePanel(geography)}
        <a href="${ucrData.source_url}" target="_blank" rel="noopener">${ucrData.publication}</a>`;
      el("nodeDetails").prepend(contextCard);
      return;
    }

    const isPercent = metric.display === "percent";
    const displayValue = isPercent ? formatPercent(metric.percent) : compactCount(metric.count);
    const england = englandMetric(node.id);
    const difference = selectedGeography && isPercent && england ? Number(metric.percent) - Number(england.percent) : null;

    const comparison = selectedGeography
      ? isPercent && Number.isFinite(difference)
        ? `${Math.abs(difference).toFixed(2)} percentage points ${difference >= 0 ? "above" : "below"} England (${formatPercent(england.percent)}).`
        : `Ranked by recorded activity among published ${selectedGeography.type === "ICB" ? "ICBs" : "providers"}.`
      : isPercent
        ? "Mean of the twelve published monthly percentages."
        : "England annual sum of the twelve published monthly rounded counts.";

    const rankPanel = selectedGeography && rank ? `
      <div class="ucr-rank-card">
        <span>${isPercent ? "Recorded-value rank" : "Activity-volume rank"}</span>
        <strong>${rank.rank} of ${rank.total}</strong>
        <small>Highest value ranks first; this is not a performance judgement.</small>
      </div>` : "";

    const exactLine = isPercent
      ? `March 2025: ${formatPercent(metric.latest_percent)}`
      : `${formatCount(metric.count)} published activity records`;

    const card = document.createElement("section");
    card.className = "operational-metric-card ucr-operational-card";
    card.innerHTML = `
      <div class="operational-metric-heading">
        <div><p class="eyebrow teal">Public CSDS-derived UCR figure</p><strong>${displayValue}</strong></div>
        <span>${geography.name}<br>${ucrData.period}</span>
      </div>
      <h3>${metric.label}</h3>
      <p class="metric-exact">${exactLine}</p>
      <p>${comparison}</p>
      ${rankPanel}
      <div class="ucr-summary-grid">
        <div><span>Annual referrals</span><strong>${compactCount(geography.activity.referrals)}</strong></div>
        <div><span>Annual contacts</span><strong>${compactCount(geography.activity.contacts)}</strong></div>
        <div><span>Contacts per referral</span><strong>${geography.activity.contacts_per_referral ?? "—"}</strong></div>
      </div>
      ${monthlyPerformancePanel(geography)}
      <div class="ucr-quality-grid">
        <div><span>Performance months</span><strong>${geography.data_quality.performance_months}/12</strong></div>
        <div><span>Referral months</span><strong>${geography.data_quality.referral_months}/12</strong></div>
        <div><span>Contact months</span><strong>${geography.data_quality.contact_months}/12</strong></div>
      </div>
      <p class="metric-comparison-warning"><strong>Interpretation warning:</strong> counts are rounded to the nearest five. Contacts can exceed referrals and may occur in a different month. ICB and provider rows are separate published geographies and are not a linked provider-to-ICB mapping.</p>
      <p class="metric-note">The two-hour headline is an average of published monthly percentages because the performance and referral-count tables use different event dates.</p>
      <a href="${ucrData.source_url}" target="_blank" rel="noopener">${ucrData.publication}</a>`;

    el("nodeDetails").prepend(card);
  };

  // ============================================================
  // 06. SWITCH THE TOOLBAR TO THE RELEVANT DATASET
  // ============================================================
  selectNode = function(node,options={}) {
    const result = baseSelectNodeForUcr(node,options);
    setUcrContext(UCR_CONTEXT_NODE_IDS.has(node.id()));
    requestAnimationFrame(() => {
      refreshBadgeValues();
      updateBadgePositions();
    });
    return result;
  };

  showHome = function(...args) {
    const result = baseShowHomeForUcr(...args);
    setUcrContext(false);
    return result;
  };

  showWholePicture = function(...args) {
    const result = baseShowWholePictureForUcr(...args);
    setUcrContext(false);
    return result;
  };

  // ============================================================
  // 07. INITIALISE AND RETRY DURING PAGES DEPLOYMENT
  // ============================================================
  ucrData = await loadUcrData();
  populateGeographySelect(ucrData);
  updateUcrScope();
  refreshBadgeValues();

  if (!ucrData) {
    let attempts = 0;
    const retry = setInterval(async () => {
      attempts += 1;
      const data = await loadUcrData();
      if (data) {
        clearInterval(retry);
        populateGeographySelect(data);
        updateUcrScope();
        refreshBadgeValues();
      } else if (attempts >= 4) {
        clearInterval(retry);
      }
    },3000);
  }
})();
