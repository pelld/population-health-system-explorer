// ============================================================
// 00. 2024-25 OVERNIGHT BED AVAILABILITY AND OCCUPANCY
// ============================================================
// Shows provider-native KH03 measures. Quarterly values are direct published
// averages; annual values are day-weighted averages of the four quarters.

(async () => {
  const map = el("systemMap");
  const toolbarControls = document.querySelector(".map-toolbar-controls");
  const numbersButton = el("toggleNumbers");
  const baseRenderNodeDetails = renderNodeDetails;
  const baseSelectNodeForBeds = selectNode;
  const baseShowHomeForBeds = showHome;
  const baseShowWholePictureForBeds = showWholePicture;

  if (!map || !toolbarControls) return;

  const CONTEXT_NODE_IDS = new Set([
    "available-overnight-beds",
    "occupied-overnight-beds",
    "overnight-bed-occupancy"
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
    ".hes-apc-metric-control",".hes-apc-metric-scope"
  ].map(selector => document.querySelector(selector)).filter(Boolean);

  let bedData = null;
  let selectedProvider = null;
  let numbersVisible = numbersButton?.getAttribute("aria-pressed") !== "false";
  const badges = new Map();

  // ============================================================
  // 01. LOAD VALIDATED PUBLIC JSON
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

  async function loadBedData() {
    const paths = [
      "public-data/bed-occupancy-2024-25.json",
      "https://raw.githubusercontent.com/pelld/population-health-system-explorer/main/public-data/bed-occupancy-2024-25.json"
    ];
    for (const path of paths) {
      const data = await loadJson(path);
      if (data?.england?.metrics && data?.providers?.length) return data;
    }
    return null;
  }

  function formatBeds(value) {
    if (value === null || value === undefined || !Number.isFinite(Number(value))) return "Not published";
    return new Intl.NumberFormat("en-GB",{ maximumFractionDigits:1 }).format(Number(value));
  }

  function compactBeds(value) {
    const number = Number(value);
    if (!Number.isFinite(number)) return "—";
    if (number >= 100000) return `${(number / 1000).toFixed(1)}k`;
    if (number >= 1000) return `${(number / 1000).toFixed(2)}k`;
    return number.toFixed(number >= 100 ? 0 : 1);
  }

  function formatPercent(value) {
    if (value === null || value === undefined || !Number.isFinite(Number(value))) return "Not published";
    return `${Number(value).toFixed(2)}%`;
  }

  function currentGeography() {
    return selectedProvider || bedData?.england || null;
  }

  function currentMetric(nodeId) {
    return currentGeography()?.metrics?.[nodeId] || null;
  }

  function metricValue(metric) {
    if (!metric) return null;
    const raw = metric.display === "percent" ? metric.percent : metric.beds;
    return raw === null || raw === undefined || !Number.isFinite(Number(raw)) ? null : Number(raw);
  }

  function metricDisplay(metric,compact=false) {
    const value = metricValue(metric);
    if (value === null) return "—";
    if (metric.display === "percent") return compact ? `${value.toFixed(1)}%` : formatPercent(value);
    return compact ? compactBeds(value) : `${formatBeds(value)} beds`;
  }

  // ============================================================
  // 02. PROVIDER SELECTOR
  // ============================================================
  const control = document.createElement("label");
  control.className = "bed-occupancy-metric-control";
  control.hidden = true;
  control.innerHTML = `<span>Bed occupancy provider</span><select id="bedOccupancyMetricSelect" aria-label="Choose England or an NHS bed provider"><option value="">England</option><option value="__loading" disabled>Loading providers…</option></select>`;

  const select = control.querySelector("select");
  const scope = document.createElement("span");
  scope.className = "bed-occupancy-metric-scope";
  scope.hidden = true;

  const anchor = document.querySelector(".hes-apc-metric-scope") || existingControls.at(-1) || numbersButton;
  if (anchor) {
    anchor.insertAdjacentElement("afterend",control);
    control.insertAdjacentElement("afterend",scope);
  } else {
    toolbarControls.append(control,scope);
  }

  function populateSelect(data) {
    bedData = data;
    select.innerHTML = `<option value="">England</option>`;
    if (!data?.providers?.length) {
      select.add(new Option("Bed occupancy data unavailable","__unavailable"));
      select.disabled = true;
      return;
    }
    data.providers.forEach(item => select.add(new Option(item.name,item.code)));
    select.disabled = false;
  }

  function updateScope() {
    const geography = currentGeography();
    scope.textContent = geography ? `${geography.name} · Provider-based · ${bedData.period}` : "Bed occupancy data unavailable";
  }

  function setContext(active) {
    control.hidden = !active;
    scope.hidden = !active;
    if (active) existingControls.forEach(item => { item.hidden = true; });
    requestAnimationFrame(updateBadgePositions);
  }

  select.addEventListener("change",() => {
    selectedProvider = bedData?.providers?.find(item => item.code === select.value) || null;
    updateScope();
    refreshBadges();
    const selectedNode = cy.$("node.selected-node").first();
    if (selectedNode.length) renderNodeDetails(NODE_BY_ID.get(selectedNode.id()));
    requestAnimationFrame(updateBadgePositions);
  });

  // ============================================================
  // 03. MAP BADGES
  // ============================================================
  const badgeLayer = document.createElement("div");
  badgeLayer.className = "metric-layer bed-occupancy-metric-layer";
  badgeLayer.setAttribute("aria-hidden","true");
  map.append(badgeLayer);

  BADGE_NODE_IDS.forEach(nodeId => {
    if (!cy.getElementById(nodeId).length) return;
    const badge = document.createElement("button");
    badge.type = "button";
    badge.className = "node-metric-badge bed-occupancy-metric-badge";
    badge.dataset.nodeId = nodeId;
    badge.addEventListener("click",() => selectNode(cy.getElementById(nodeId),{ centre:false }));
    badgeLayer.append(badge);
    badges.set(nodeId,badge);
  });

  function refreshBadges() {
    badges.forEach((badge,nodeId) => {
      const metric = currentMetric(nodeId);
      const value = metricValue(metric);
      if (value === null) {
        badge.dataset.hasMetric = "false";
        badge.classList.remove("is-visible");
        return;
      }
      badge.dataset.hasMetric = "true";
      badge.innerHTML = `<strong>${metricDisplay(metric,true)}</strong><span>${selectedProvider ? "Provider" : "KH03"}</span>`;
      badge.title = `${currentGeography().name}: ${metric.label} · ${metricDisplay(metric)}`;
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
  // 04. DETAILS, QUARTERS, SECTORS AND RANKS
  // ============================================================
  function rankFor(nodeId) {
    if (!selectedProvider) return null;
    const ranked = bedData.providers
      .map(item => ({ item,value:metricValue(item.metrics?.[nodeId]) }))
      .filter(item => item.value !== null)
      .sort((a,b) => b.value - a.value);
    const index = ranked.findIndex(item => item.item.code === selectedProvider.code);
    return index < 0 ? null : { rank:index + 1,total:ranked.length };
  }

  function quarterPanel(geography) {
    const quarters = geography.quarters || {};
    return `<div class="bed-quarter-grid">${Object.entries(quarters).map(([quarter,record]) => {
      const sector = record.sectors?.general_acute || {};
      return `<div><span>${quarter} · ${record.period}</span><strong>${formatPercent(sector.occupancy_percent)}</strong><small>${formatBeds(sector.occupied)} occupied / ${formatBeds(sector.available)} available</small></div>`;
    }).join("")}</div>`;
  }

  function sectorPanel(geography) {
    const labels = {
      general_acute:"General & acute",
      mental_illness:"Mental illness",
      maternity:"Maternity",
      learning_disabilities:"Learning disabilities",
      total:"All overnight sectors"
    };
    const order = ["general_acute","mental_illness","maternity","learning_disabilities","total"];
    return `<div class="bed-sector-grid">${order.map(key => {
      const sector = geography.sectors?.[key] || {};
      return `<div><span>${labels[key]}</span><strong>${formatPercent(sector.occupancy_percent)}</strong><small>${formatBeds(sector.occupied)} / ${formatBeds(sector.available)}</small></div>`;
    }).join("")}</div>`;
  }

  renderNodeDetails = function(node) {
    baseRenderNodeDetails(node);
    if (!CONTEXT_NODE_IDS.has(node.id) || !bedData) return;

    const geography = currentGeography();
    const metric = currentMetric(node.id);
    const value = metricValue(metric);
    const rank = rankFor(node.id);
    const rankPanel = selectedProvider && rank ? `<div class="bed-rank-card"><span>Recorded-value rank</span><strong>${rank.rank} of ${rank.total}</strong><small>Highest raw value ranks first. This is not adjusted for provider size, specialty or case mix and is not a performance judgement.</small></div>` : "";
    const comparison = selectedProvider && node.id === "overnight-bed-occupancy" && value !== null
      ? `<p class="metric-note">This is ${(value - Number(bedData.england.metrics[node.id].percent)) >= 0 ? "+" : ""}${(value - Number(bedData.england.metrics[node.id].percent)).toFixed(2)} percentage points from England.</p>`
      : "";

    const card = document.createElement("section");
    card.className = "operational-metric-card bed-occupancy-operational-card";
    card.innerHTML = `<div class="operational-metric-heading">
        <div><p class="eyebrow teal">KH03 annual weighted view</p><strong>${metricDisplay(metric)}</strong></div>
        <span>${geography.name}<br>${bedData.period}</span>
      </div>
      <h3>${metric?.label || node.label}</h3>
      <p class="metric-exact">Built from the four direct published quarterly average-daily figures, weighted by calendar days.</p>
      ${comparison}
      ${rankPanel}
      <h4>Quarterly general and acute position</h4>
      ${quarterPanel(geography)}
      <h4>Annual overnight-bed sector profile</h4>
      ${sectorPanel(geography)}
      <p class="metric-comparison-warning"><strong>Interpretation warning:</strong> these are average daily provider stocks, not admissions, unique patients or annual bed-days. Provider geography is retained; no resident or host-ICB attribution is inferred.</p>
      <a href="${bedData.source_url}" target="_blank" rel="noopener">${bedData.publication}</a>`;
    el("nodeDetails").prepend(card);
  };

  // ============================================================
  // 05. SWITCH DATASET CONTEXT
  // ============================================================
  selectNode = function(node,options={}) {
    const result = baseSelectNodeForBeds(node,options);
    setContext(CONTEXT_NODE_IDS.has(node.id()));
    requestAnimationFrame(() => {
      refreshBadges();
      updateBadgePositions();
    });
    return result;
  };

  showHome = function(...args) {
    const result = baseShowHomeForBeds(...args);
    setContext(false);
    return result;
  };

  showWholePicture = function(...args) {
    const result = baseShowWholePictureForBeds(...args);
    setContext(false);
    return result;
  };

  bedData = await loadBedData();
  populateSelect(bedData);
  updateScope();
  refreshBadges();

  if (!bedData) {
    let attempts = 0;
    const retry = setInterval(async () => {
      attempts += 1;
      const data = await loadBedData();
      if (data) {
        clearInterval(retry);
        populateSelect(data);
        updateScope();
        refreshBadges();
      } else if (attempts >= 4) {
        clearInterval(retry);
      }
    },3000);
  }
})();
