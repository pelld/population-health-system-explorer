// ============================================================
// 00. 2024-25 DISCHARGE READY DATE METRICS
// ============================================================
// Annual percentages are rebuilt from the revised monthly published counts. The
// selector preserves native geography: provider-based ICB, provider, or resident UTLA.

(async () => {
  const map = el("systemMap");
  const toolbarControls = document.querySelector(".map-toolbar-controls");
  const numbersButton = el("toggleNumbers");
  const baseRenderNodeDetails = renderNodeDetails;
  const baseSelectNodeForDrd = selectNode;
  const baseShowHomeForDrd = showHome;
  const baseShowWholePictureForDrd = showWholePicture;

  if (!map || !toolbarControls) return;

  const CONTEXT_NODE_IDS = new Set([
    "drd-discharges",
    "drd-same-day",
    "drd-delayed",
    "drd-bed-days",
    "drd-average-delay"
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
    ".acute-discharge-metric-control",".acute-discharge-metric-scope"
  ].map(selector => document.querySelector(selector)).filter(Boolean);

  let drdData = null;
  let selectedGeography = null;
  let numbersVisible = numbersButton?.getAttribute("aria-pressed") !== "false";
  const badges = new Map();

  // ============================================================
  // 01. LOAD THE VALIDATED PUBLIC FILE
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

  async function loadDrdData() {
    const paths = [
      "public-data/drd-2024-25.json",
      "https://raw.githubusercontent.com/pelld/population-health-system-explorer/main/public-data/drd-2024-25.json"
    ];
    for (const path of paths) {
      const data = await loadJson(path);
      if (data?.england?.metrics && data?.icbs?.length && data?.providers?.length && data?.utlas?.length) return data;
    }
    return null;
  }

  function formatCount(value,maximumFractionDigits=0) {
    if (value === null || value === undefined || !Number.isFinite(Number(value))) return "Not published";
    return new Intl.NumberFormat("en-GB",{ maximumFractionDigits }).format(Number(value));
  }

  function compactCount(value) {
    const number = Number(value);
    if (!Number.isFinite(number)) return "—";
    if (Math.abs(number) >= 1000000) return `${(number / 1000000).toFixed(2)}m`;
    if (Math.abs(number) >= 1000) return `${(number / 1000).toFixed(1)}k`;
    return number.toFixed(number >= 100 ? 0 : 1);
  }

  function formatPercent(value) {
    if (value === null || value === undefined || !Number.isFinite(Number(value))) return "Not published";
    return `${Number(value).toFixed(2)}%`;
  }

  function formatDays(value) {
    if (value === null || value === undefined || !Number.isFinite(Number(value))) return "Not published";
    return `${Number(value).toFixed(2)} days`;
  }

  function currentGeography() {
    return selectedGeography || drdData?.england || null;
  }

  function currentMetric(nodeId) {
    return currentGeography()?.metrics?.[nodeId] || null;
  }

  function metricValue(metric) {
    if (!metric) return null;
    const raw = metric.display === "percent" ? metric.percent : metric.display === "days" ? metric.days : metric.count;
    return raw === null || raw === undefined || !Number.isFinite(Number(raw)) ? null : Number(raw);
  }

  function metricDisplay(metric,compact=false) {
    const value = metricValue(metric);
    if (value === null) return "—";
    if (metric.display === "percent") return compact ? `${value.toFixed(1)}%` : formatPercent(value);
    if (metric.display === "days") return compact ? `${value.toFixed(1)}d` : formatDays(value);
    return compact ? compactCount(value) : formatCount(value);
  }

  // ============================================================
  // 02. ENGLAND / PROVIDER-BASED ICB / PROVIDER / RESIDENT UTLA
  // ============================================================
  const control = document.createElement("label");
  control.className = "drd-metric-control";
  control.hidden = true;
  control.innerHTML = `<span>Discharge-ready-date geography</span><select id="drdMetricSelect" aria-label="Choose England, a provider-based ICB, an acute provider or a resident upper-tier local authority"><option value="">England</option><option value="__loading" disabled>Loading geographies…</option></select>`;

  const select = control.querySelector("select");
  const scope = document.createElement("span");
  scope.className = "drd-metric-scope";
  scope.hidden = true;

  const anchor = document.querySelector(".acute-discharge-metric-scope") || existingControls.at(-1) || numbersButton;
  if (anchor) {
    anchor.insertAdjacentElement("afterend",control);
    control.insertAdjacentElement("afterend",scope);
  } else {
    toolbarControls.append(control,scope);
  }

  function populateSelect(data) {
    drdData = data;
    select.innerHTML = `<option value="">England</option>`;
    if (!data?.icbs?.length || !data?.providers?.length || !data?.utlas?.length) {
      select.add(new Option("Discharge ready date data unavailable","__unavailable"));
      select.disabled = true;
      return;
    }

    const icbGroup = document.createElement("optgroup");
    icbGroup.label = `Provider-based ICBs (${data.icb_count})`;
    data.icbs.forEach(item => icbGroup.append(new Option(item.name,`ICB|${item.code}`)));

    const providerGroup = document.createElement("optgroup");
    providerGroup.label = `Providers appearing in at least one month (${data.provider_count})`;
    data.providers.forEach(item => providerGroup.append(new Option(item.name,`Provider|${item.code}`)));

    const utlaGroup = document.createElement("optgroup");
    utlaGroup.label = `Resident upper-tier local authorities (${data.utla_count})`;
    data.utlas.forEach(item => utlaGroup.append(new Option(item.name,`UTLA|${item.code}`)));

    select.append(icbGroup,providerGroup,utlaGroup);
    select.disabled = false;
  }

  function collectionFor(type) {
    if (type === "ICB") return drdData?.icbs || [];
    if (type === "Provider") return drdData?.providers || [];
    if (type === "UTLA") return drdData?.utlas || [];
    return [];
  }

  function updateScope() {
    const geography = currentGeography();
    if (!geography) {
      scope.textContent = "Discharge ready date data unavailable";
      return;
    }
    const basis = geography.type === "ICB" ? "provider-based ICB"
      : geography.type === "UTLA" ? "resident UTLA"
      : geography.type === "Provider" ? "treatment provider"
      : "England";
    scope.textContent = `${geography.name} · ${basis} · ${drdData.period} · ${geography.months_present}/12 months`;
  }

  function setContext(active) {
    control.hidden = !active;
    scope.hidden = !active;
    if (active) existingControls.forEach(item => { item.hidden = true; });
    requestAnimationFrame(updateBadgePositions);
  }

  select.addEventListener("change",() => {
    const [type,code] = select.value.split("|");
    selectedGeography = collectionFor(type).find(item => item.code === code) || null;
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
  badgeLayer.className = "metric-layer drd-metric-layer";
  badgeLayer.setAttribute("aria-hidden","true");
  map.append(badgeLayer);

  BADGE_NODE_IDS.forEach(nodeId => {
    if (!cy.getElementById(nodeId).length) return;
    const badge = document.createElement("button");
    badge.type = "button";
    badge.className = "node-metric-badge drd-metric-badge";
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
      badge.innerHTML = `<strong>${metricDisplay(metric,true)}</strong><span>${selectedGeography ? selectedGeography.type : "DRD"}</span>`;
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
  // 04. DETAILS, THRESHOLDS, MONTHS, COVERAGE AND RANKS
  // ============================================================
  function peerCollection() {
    if (!selectedGeography) return [];
    return collectionFor(selectedGeography.type);
  }

  function rankFor(nodeId) {
    if (!selectedGeography || selectedGeography.months_present !== 12) return null;
    const ranked = peerCollection()
      .filter(item => item.months_present === 12)
      .map(item => ({ item,value:metricValue(item.metrics?.[nodeId]) }))
      .filter(item => item.value !== null)
      .sort((a,b) => b.value - a.value);
    const index = ranked.findIndex(item => item.item.code === selectedGeography.code);
    return index < 0 ? null : { rank:index + 1,total:ranked.length };
  }

  function summaryPanel(geography) {
    const metrics = geography.metrics || {};
    return `<div class="drd-summary-grid">
      <div><span>Included discharges</span><strong>${formatCount(metrics["drd-discharges"]?.count)}</strong><small>${geography.months_present}/12 published months</small></div>
      <div><span>Same-day discharge</span><strong>${formatPercent(metrics["drd-same-day"]?.percent)}</strong><small>${formatCount(metrics["drd-same-day"]?.count)} of ${formatCount(metrics["drd-same-day"]?.denominator)}</small></div>
      <div><span>One or more days later</span><strong>${formatPercent(metrics["drd-delayed"]?.percent)}</strong><small>${formatCount(metrics["drd-delayed"]?.count)} of ${formatCount(metrics["drd-delayed"]?.denominator)}</small></div>
      <div><span>Bed-days after readiness</span><strong>${formatCount(metrics["drd-bed-days"]?.count)}</strong><small>Sum of the six published delay-band bed-day totals</small></div>
      <div><span>Average among delayed</span><strong>${formatDays(metrics["drd-average-delay"]?.days)}</strong><small>Excludes same-day discharges</small></div>
      <div><span>Average across all</span><strong>${formatDays(metrics["drd-average-delay"]?.days_including_zero)}</strong><small>Includes same-day discharges as zero days</small></div>
    </div>`;
  }

  function thresholdPanel(geography) {
    return `<div class="drd-threshold-grid">${(geography.thresholds || []).map(item => `<div>
      <span>${item.label}</span><strong>${formatCount(item.count)}</strong>
      <small>${formatPercent(item.percent_all)} of all${item.percent_delayed === null ? "" : ` · ${formatPercent(item.percent_delayed)} of delayed`} · ${formatCount(item.bed_days)} bed-days</small>
    </div>`).join("")}</div>`;
  }

  function monthlyPanel(geography) {
    return `<div class="drd-month-grid">${(geography.monthly || []).map(item => `<div>
      <span>${item.month}</span><strong>${formatPercent(item.delayed_percent)}</strong>
      <small>${formatCount(item.total_discharges)} discharges · ${formatCount(item.bed_days_after_drd)} bed-days</small>
    </div>`).join("")}</div>`;
  }

  function coverageText(geography) {
    const coverage = geography.coverage || {};
    if (geography.type === "Provider") {
      return `<p class="metric-comparison-warning"><strong>Provider coverage:</strong> this provider met the publication's acceptance criteria in ${geography.months_present} of 12 months. Annual counts are incomplete when this is below 12 and are not ranked.</p>`;
    }
    if (geography.type === "UTLA") {
      return `<p class="metric-comparison-warning"><strong>Resident-UTLA coverage:</strong> annual values include discharges from acceptable trusts. Average monthly coverage was ${formatPercent(coverage.average_monthly_utla_coverage_percent)}; minimum monthly coverage was ${formatPercent(coverage.minimum_monthly_utla_coverage_percent)}.</p>`;
    }
    return `<p class="metric-comparison-warning"><strong>Accepted-provider coverage:</strong> average monthly coverage was ${formatPercent(coverage.average_monthly_acceptable_provider_percent)}; minimum monthly coverage was ${formatPercent(coverage.minimum_monthly_acceptable_provider_percent)}.</p>`;
  }

  function comparisonText(nodeId,geography) {
    if (!selectedGeography) return "";
    const local = metricValue(geography.metrics?.[nodeId]);
    const national = metricValue(drdData.england.metrics?.[nodeId]);
    const display = geography.metrics?.[nodeId]?.display;
    if (local === null || national === null || !["percent","days"].includes(display)) return "";
    const difference = local - national;
    const unit = display === "percent" ? "percentage points" : "days";
    return `<p class="metric-note">${difference >= 0 ? "+" : ""}${difference.toFixed(2)} ${unit} from England.</p>`;
  }

  renderNodeDetails = function(node) {
    baseRenderNodeDetails(node);
    if (!CONTEXT_NODE_IDS.has(node.id) || !drdData) return;

    const geography = currentGeography();
    const metric = currentMetric(node.id);
    const rank = rankFor(node.id);
    const rankPanel = selectedGeography && rank ? `<div class="drd-rank-card"><span>Recorded-value rank</span><strong>${rank.rank} of ${rank.total}</strong><small>Complete 12-month records only; highest raw value ranks first. This is not adjusted for population, case mix, coverage or provider role and is not a performance judgement.</small></div>` : "";

    const card = document.createElement("section");
    card.className = "operational-metric-card drd-operational-card";
    card.innerHTML = `<div class="operational-metric-heading">
        <div><p class="eyebrow teal">Revised discharge cohort</p><strong>${metricDisplay(metric)}</strong></div>
        <span>${geography.name}<br>${drdData.period}</span>
      </div>
      <h3>${metric?.label || node.label}</h3>
      ${metric?.display === "percent" ? `<p class="metric-exact">${formatCount(metric.count)} of ${formatCount(metric.denominator)} included discharges</p>` : ""}
      ${comparisonText(node.id,geography)}
      ${rankPanel}
      <h4>Annual discharge-ready-date profile</h4>
      ${summaryPanel(geography)}
      <h4>Delay thresholds</h4>
      ${thresholdPanel(geography)}
      <h4>Monthly delayed share</h4>
      ${monthlyPanel(geography)}
      ${coverageText(geography)}
      <p class="metric-comparison-warning"><strong>Geography:</strong> ICB means the provider's ICB; provider means treatment organisation; UTLA is patient residence based on postcode. These views must not be treated as interchangeable.</p>
      <p class="metric-comparison-warning"><strong>Interpretation warning:</strong> this is a discharged-patient cohort from trusts with accepted data, not the daily stock measured by the Acute Discharge SitRep. Earlier discharge is not automatically safer or better.</p>
      <a href="${drdData.source_url}" target="_blank" rel="noopener">${drdData.publication}</a>`;
    el("nodeDetails").prepend(card);
  };

  // ============================================================
  // 05. SWITCH DATASET CONTEXT
  // ============================================================
  selectNode = function(node,options={}) {
    const result = baseSelectNodeForDrd(node,options);
    setContext(CONTEXT_NODE_IDS.has(node.id()));
    requestAnimationFrame(() => {
      refreshBadges();
      updateBadgePositions();
    });
    return result;
  };

  showHome = function(...args) {
    const result = baseShowHomeForDrd(...args);
    setContext(false);
    return result;
  };

  showWholePicture = function(...args) {
    const result = baseShowWholePictureForDrd(...args);
    setContext(false);
    return result;
  };

  drdData = await loadDrdData();
  populateSelect(drdData);
  updateScope();
  refreshBadges();

  if (!drdData) {
    let attempts = 0;
    const retry = setInterval(async () => {
      attempts += 1;
      const data = await loadDrdData();
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
