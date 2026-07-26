// ============================================================
// 00. PUBLIC COMMUNITY HEALTH-SERVICE WAITING-LIST METRICS
// ============================================================
// Adds the corrected 2024-25 England trend and the March 2025 stock position by
// ICB and provider. Local rows are direct published geographies; providers are
// not assigned to ICBs by this layer.

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
  const ucrControl = document.querySelector(".ucr-metric-control");
  const ucrScope = document.querySelector(".ucr-metric-scope");
  const baseRenderNodeDetails = renderNodeDetails;
  const baseSelectNodeForCommunityWaits = selectNode;
  const baseShowHomeForCommunityWaits = showHome;
  const baseShowWholePictureForCommunityWaits = showWholePicture;

  if (!map || !toolbarControls) return;

  const COMMUNITY_WAIT_CONTEXT_NODE_IDS = new Set([
    "community-waiting-list",
    "community-under-18",
    "community-18-52",
    "community-over-52"
  ]);

  const BADGE_NODE_IDS = [
    "community-waiting-list",
    "community-under-18",
    "community-18-52",
    "community-over-52"
  ];

  const badgeLayer = document.createElement("div");
  const badges = new Map();
  let communityWaitData = null;
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

  async function loadCommunityWaitData() {
    const paths = [
      "public-data/community-waits-2024-25.json",
      "https://raw.githubusercontent.com/pelld/population-health-system-explorer/main/public-data/community-waits-2024-25.json"
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
    return selectedGeography || communityWaitData?.england || null;
  }

  function currentMetric(nodeId) {
    return currentGeography()?.metrics?.[nodeId] || null;
  }

  function englandMetric(nodeId) {
    return communityWaitData?.england?.metrics?.[nodeId] || null;
  }

  // ============================================================
  // 02. DIRECT PUBLISHED ICB / PROVIDER SELECTOR
  // ============================================================
  const communityWaitControl = document.createElement("label");
  communityWaitControl.className = "community-waits-metric-control";
  communityWaitControl.hidden = true;
  communityWaitControl.innerHTML = `<span>Community waits geography</span><select id="communityWaitMetricSelect" aria-label="Choose England, an ICB or a community provider"><option value="">England</option><option value="__loading" disabled>Loading waiting-list geographies…</option></select>`;

  const communityWaitSelect = communityWaitControl.querySelector("select");
  const communityWaitScope = document.createElement("span");
  communityWaitScope.className = "community-waits-metric-scope";
  communityWaitScope.hidden = true;

  const insertionAnchor = ucrScope || gpadScope || iucScope || ambulanceScope || providerScope || numbersButton;
  if (insertionAnchor) {
    insertionAnchor.insertAdjacentElement("afterend",communityWaitControl);
    communityWaitControl.insertAdjacentElement("afterend",communityWaitScope);
  } else {
    toolbarControls.append(communityWaitControl,communityWaitScope);
  }

  function populateGeographySelect(data) {
    communityWaitData = data;
    communityWaitSelect.innerHTML = `<option value="">England</option>`;

    if (!communityWaitData?.icbs?.length || !communityWaitData?.providers?.length) {
      communityWaitSelect.add(new Option("Community waiting-list data unavailable","__unavailable"));
      communityWaitSelect.disabled = true;
      return;
    }

    const icbGroup = document.createElement("optgroup");
    icbGroup.label = `Integrated Care Boards (${communityWaitData.icb_count || communityWaitData.icbs.length})`;
    communityWaitData.icbs.forEach(item => icbGroup.append(new Option(item.name,`ICB|${item.code}`)));

    const providerGroup = document.createElement("optgroup");
    providerGroup.label = `Community providers (${communityWaitData.provider_count || communityWaitData.providers.length})`;
    communityWaitData.providers.forEach(item => providerGroup.append(new Option(item.name,`Provider|${item.code}`)));

    communityWaitSelect.append(icbGroup,providerGroup);
    communityWaitSelect.disabled = false;
    communityWaitControl.title = "Direct published March 2025 ICB and provider waiting-list rows";
  }

  function updateCommunityWaitScope() {
    const geography = currentGeography();
    communityWaitScope.textContent = geography ? `${geography.name} · ${geography.type} · ${communityWaitData.snapshot}` : "Community waiting-list data unavailable";
  }

  function hideOtherSelectors() {
    [providerControl,providerScope,ambulanceControl,ambulanceScope,iucControl,iucScope,gpadControl,gpadScope,ucrControl,ucrScope].forEach(control => {
      if (control) control.hidden = true;
    });
  }

  function setCommunityWaitContext(isCommunityWait) {
    communityWaitControl.hidden = !isCommunityWait;
    communityWaitScope.hidden = !isCommunityWait;
    if (isCommunityWait) hideOtherSelectors();
    requestAnimationFrame(updateBadgePositions);
  }

  communityWaitSelect.addEventListener("change",() => {
    const [type,code] = communityWaitSelect.value.split("|");
    const collection = type === "ICB" ? communityWaitData?.icbs : type === "Provider" ? communityWaitData?.providers : [];
    selectedGeography = collection?.find(item => item.code === code) || null;
    updateCommunityWaitScope();
    refreshBadgeValues();

    const selectedNode = cy.$("node.selected-node").first();
    if (selectedNode.length) renderNodeDetails(NODE_BY_ID.get(selectedNode.id()));
    requestAnimationFrame(updateBadgePositions);
  });

  // ============================================================
  // 03. NUMBER BADGES ON THE FOUR OBSERVED STOCK MEASURES
  // ============================================================
  badgeLayer.className = "metric-layer community-waits-metric-layer";
  badgeLayer.setAttribute("aria-hidden","true");
  map.append(badgeLayer);

  BADGE_NODE_IDS.forEach(nodeId => {
    if (!cy.getElementById(nodeId).length) return;

    const badge = document.createElement("button");
    badge.type = "button";
    badge.className = "node-metric-badge community-waits-metric-badge";
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
      badge.innerHTML = `<strong>${value}</strong><span>${selectedGeography ? selectedGeography.type : "CHS"}</span>`;
      badge.title = `${currentGeography().name}: ${metric.label} · ${value}`;
    });
  }

  function updateBadgePositions() {
    const contextVisible = !communityWaitControl.hidden;
    const showAtThisZoom = numbersVisible && contextVisible && cy.zoom() >= .31;

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
  // 04. COMPARISON, TREND AND SERVICE-PROFILE HELPERS
  // ============================================================
  function comparisonValue(item,nodeId) {
    const metric = item?.metrics?.[nodeId];
    const value = metric?.display === "percent" ? Number(metric.percent) : Number(metric?.count);
    return Number.isFinite(value) ? value : null;
  }

  function peerCollection() {
    if (!selectedGeography) return [];
    return selectedGeography.type === "ICB" ? communityWaitData.icbs : communityWaitData.providers;
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

  function nationalTrendPanel() {
    const totals = communityWaitData?.national_trend?.total || [];
    const nonSubmitters = new Map((communityWaitData?.national_trend?.non_submitters || []).map(item => [item.month,item.value]));

    return `<section class="community-waits-trend">
      <h4>Corrected England waiting-list trend</h4>
      <div class="community-waits-month-grid">${totals.map(item => `<div><span>${item.month}</span><strong>${compactCount(item.value)}</strong><small>${nonSubmitters.get(item.month) ?? "—"} non-submitters</small></div>`).join("")}</div>
      <p>The March publication supplies this corrected England time series. ICB and provider comparisons on this page are March 2025 snapshots.</p>
    </section>`;
  }

  function serviceProfilePanel(geography) {
    const services = geography?.top_services || [];
    if (!services.length) return "";

    return `<section class="community-waits-services">
      <h4>Largest reported service-line waiting lists</h4>
      <div>${services.slice(0,8).map(item => `<article><span>${item.service.replace(/^\((A|CYP)\)\s*/,"")}</span><strong>${formatCount(item.total)}</strong><small>${formatCount(item.over_52)} over 52 weeks · ${formatPercent(item.over_52_percent)}</small></article>`).join("")}</div>
    </section>`;
  }

  // ============================================================
  // 05. DETAILS CARD
  // ============================================================
  renderNodeDetails = function(node) {
    baseRenderNodeDetails(node);
    if (!COMMUNITY_WAIT_CONTEXT_NODE_IDS.has(node.id) || !communityWaitData) return;

    const geography = currentGeography();
    const metric = currentMetric(node.id);
    const england = englandMetric(node.id);
    if (!geography || !metric || !england) return;

    const isPercent = metric.display === "percent";
    const displayValue = isPercent ? formatPercent(metric.percent) : compactCount(metric.count);
    const difference = selectedGeography && isPercent ? Number(metric.percent) - Number(england.percent) : null;
    const rank = rankGeography(node.id);

    const comparison = selectedGeography
      ? isPercent && Number.isFinite(difference)
        ? `${Math.abs(difference).toFixed(2)} percentage points ${difference >= 0 ? "above" : "below"} England (${formatPercent(england.percent)}).`
        : `Ranked by reported March stock among published ${selectedGeography.type === "ICB" ? "ICBs" : "providers"}.`
      : isPercent
        ? `Percentage of waits with a published waiting-time band; ${formatPercent(geography.waiting_list.band_coverage_percent)} of the reported total was classified into bands.`
        : "Published England waiting-list stock at the end of March 2025.";

    const exactLine = isPercent
      ? `${formatCount(metric.count)} of ${formatCount(metric.denominator)} classified waits`
      : `${formatCount(metric.count)} people reported waiting`;

    const rankPanel = selectedGeography && rank ? `<div class="community-waits-rank-card"><span>${isPercent ? "Recorded-share rank" : "Waiting-list volume rank"}</span><strong>${rank.rank} of ${rank.total}</strong><small>Highest value ranks first; this is not a performance judgement.</small></div>` : "";

    const card = document.createElement("section");
    card.className = "operational-metric-card community-waits-operational-card";
    card.innerHTML = `
      <div class="operational-metric-heading">
        <div><p class="eyebrow teal">Public CHS SitRep figure</p><strong>${displayValue}</strong></div>
        <span>${geography.name}<br>${communityWaitData.snapshot}</span>
      </div>
      <h3>${metric.label}</h3>
      <p class="metric-exact">${exactLine}</p>
      <p>${comparison}</p>
      ${rankPanel}
      <div class="community-waits-summary-grid">
        <div><span>Total waiting list</span><strong>${compactCount(geography.waiting_list.total)}</strong></div>
        <div><span>Adult services</span><strong>${compactCount(geography.waiting_list.adult)}</strong></div>
        <div><span>CYP services</span><strong>${compactCount(geography.waiting_list.cyp)}</strong></div>
        <div><span>Wait-band coverage</span><strong>${formatPercent(geography.waiting_list.band_coverage_percent)}</strong></div>
      </div>
      <div class="community-waits-long-grid">
        <div><span>52-104 weeks</span><strong>${formatCount(geography.waiting_list.fifty_two_to_104)}</strong></div>
        <div><span>Over 104 weeks</span><strong>${formatCount(geography.waiting_list.over_104)}</strong></div>
        <div><span>Adult over 52 weeks</span><strong>${formatCount(geography.waiting_list.adult_over_52)}</strong></div>
        <div><span>CYP over 52 weeks</span><strong>${formatCount(geography.waiting_list.cyp_over_52)}</strong></div>
      </div>
      ${serviceProfilePanel(geography)}
      ${nationalTrendPanel()}
      <p class="metric-comparison-warning"><strong>Interpretation warning:</strong> this is rapidly collected management information with minimal validation. Coverage and recording differ, the wait bands may not sum to the total, and the collection may not include every community service in every system.</p>
      <p class="metric-note">Provider and ICB rows are separate published views. The data do not prove that a long wait caused an A&amp;E attendance or admission.</p>
      <a href="${communityWaitData.source_url}" target="_blank" rel="noopener">${communityWaitData.publication}</a>`;

    el("nodeDetails").prepend(card);
  };

  // ============================================================
  // 06. SWITCH THE TOOLBAR TO THE RELEVANT DATASET
  // ============================================================
  selectNode = function(node,options={}) {
    const result = baseSelectNodeForCommunityWaits(node,options);
    setCommunityWaitContext(COMMUNITY_WAIT_CONTEXT_NODE_IDS.has(node.id()));
    requestAnimationFrame(() => {
      refreshBadgeValues();
      updateBadgePositions();
    });
    return result;
  };

  showHome = function(...args) {
    const result = baseShowHomeForCommunityWaits(...args);
    setCommunityWaitContext(false);
    return result;
  };

  showWholePicture = function(...args) {
    const result = baseShowWholePictureForCommunityWaits(...args);
    setCommunityWaitContext(false);
    return result;
  };

  // ============================================================
  // 07. INITIALISE AND RETRY DURING A PAGES DEPLOYMENT
  // ============================================================
  communityWaitData = await loadCommunityWaitData();
  populateGeographySelect(communityWaitData);
  updateCommunityWaitScope();
  refreshBadgeValues();

  if (!communityWaitData) {
    let attempts = 0;
    const retry = setInterval(async () => {
      attempts += 1;
      const data = await loadCommunityWaitData();
      if (data) {
        clearInterval(retry);
        populateGeographySelect(data);
        updateCommunityWaitScope();
        refreshBadgeValues();
      } else if (attempts >= 4) {
        clearInterval(retry);
      }
    },3000);
  }
})();
