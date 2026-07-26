// ============================================================
// 00. FINAL 2024-25 HES ADMITTED-PATIENT METRICS
// ============================================================
// Shows exact England totals, published provider rows and ICB sums built from the
// published sub-ICB commissioner rows. Bed-days are all admitted care, not an
// emergency-only measure, and the public file does not provide ICB bed-days or LOS.

(async () => {
  const map = el("systemMap");
  const toolbarControls = document.querySelector(".map-toolbar-controls");
  const numbersButton = el("toggleNumbers");
  const baseRenderNodeDetails = renderNodeDetails;
  const baseSelectNodeForHes = selectNode;
  const baseShowHomeForHes = showHome;
  const baseShowWholePictureForHes = showWholePicture;

  if (!map || !toolbarControls) return;

  const CONTEXT_NODE_IDS = new Set([
    "emergency-admission",
    "hes-bed-days",
    "hes-mean-los"
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
    ".community-bed-metric-control",".community-bed-metric-scope"
  ].map(selector => document.querySelector(selector)).filter(Boolean);

  let hesData = null;
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

  async function loadHesData() {
    const paths = [
      "public-data/hes-apc-2024-25.json",
      "https://raw.githubusercontent.com/pelld/population-health-system-explorer/main/public-data/hes-apc-2024-25.json"
    ];

    for (const path of paths) {
      const data = await loadJson(path);
      if (data?.england?.metrics && data?.icbs?.length && data?.providers?.length) return data;
    }
    return null;
  }

  function formatCount(value) {
    if (value === null || value === undefined || !Number.isFinite(Number(value))) return "Not published";
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
    return `${Number(value).toFixed(2)}%`;
  }

  function formatDays(value) {
    if (value === null || value === undefined || !Number.isFinite(Number(value))) return "Not published";
    return `${Number(value).toFixed(2)} days`;
  }

  function currentGeography() {
    return selectedGeography || hesData?.england || null;
  }

  function currentMetric(nodeId) {
    return currentGeography()?.metrics?.[nodeId] || null;
  }

  function metricValue(metric) {
    if (!metric) return null;
    const raw = metric.display === "days" ? metric.days : metric.display === "percent" ? metric.percent : metric.count;
    return raw === null || raw === undefined || !Number.isFinite(Number(raw)) ? null : Number(raw);
  }

  function metricDisplay(metric,compact=false) {
    const value = metricValue(metric);
    if (value === null) return "—";
    if (metric.display === "days") return compact ? `${value.toFixed(1)}d` : formatDays(value);
    if (metric.display === "percent") return formatPercent(value);
    return compact ? compactCount(value) : formatCount(value);
  }

  // ============================================================
  // 02. ICB-OF-RESPONSIBILITY / PROVIDER SELECTOR
  // ============================================================
  const control = document.createElement("label");
  control.className = "hes-apc-metric-control";
  control.hidden = true;
  control.innerHTML = `<span>HES geography</span><select id="hesApcMetricSelect" aria-label="Choose England, an ICB of responsibility or a hospital provider"><option value="">England</option><option value="__loading" disabled>Loading HES geographies…</option></select>`;

  const select = control.querySelector("select");
  const scope = document.createElement("span");
  scope.className = "hes-apc-metric-scope";
  scope.hidden = true;

  const anchor = document.querySelector(".community-bed-metric-scope") || existingControls.at(-1) || numbersButton;
  if (anchor) {
    anchor.insertAdjacentElement("afterend",control);
    control.insertAdjacentElement("afterend",scope);
  } else {
    toolbarControls.append(control,scope);
  }

  function populateSelect(data) {
    hesData = data;
    select.innerHTML = `<option value="">England</option>`;

    if (!data?.icbs?.length || !data?.providers?.length) {
      select.add(new Option("HES APC data unavailable","__unavailable"));
      select.disabled = true;
      return;
    }

    const icbGroup = document.createElement("optgroup");
    icbGroup.label = `ICBs of responsibility (${data.icb_count})`;
    data.icbs.forEach(item => icbGroup.append(new Option(item.name,`ICB|${item.code}`)));

    const providerGroup = document.createElement("optgroup");
    providerGroup.label = `Providers with emergency activity (${data.provider_count})`;
    data.providers.forEach(item => providerGroup.append(new Option(item.name,`Provider|${item.code}`)));

    select.append(icbGroup,providerGroup);
    select.disabled = false;
    control.title = "ICBs are grouped from published sub-ICB commissioner rows; providers are direct published treatment organisations";
  }

  function updateScope() {
    const geography = currentGeography();
    scope.textContent = geography ? `${geography.name} · ${geography.type} · ${hesData.period}` : "HES APC data unavailable";
  }

  function setContext(active) {
    control.hidden = !active;
    scope.hidden = !active;
    if (active) existingControls.forEach(item => { item.hidden = true; });
    requestAnimationFrame(updateBadgePositions);
  }

  select.addEventListener("change",() => {
    const [type,code] = select.value.split("|");
    const collection = type === "ICB" ? hesData?.icbs : type === "Provider" ? hesData?.providers : [];
    selectedGeography = collection?.find(item => item.code === code) || null;
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
  badgeLayer.className = "metric-layer hes-apc-metric-layer";
  badgeLayer.setAttribute("aria-hidden","true");
  map.append(badgeLayer);

  BADGE_NODE_IDS.forEach(nodeId => {
    if (!cy.getElementById(nodeId).length) return;
    const badge = document.createElement("button");
    badge.type = "button";
    badge.className = "node-metric-badge hes-apc-metric-badge";
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
      badge.innerHTML = `<strong>${metricDisplay(metric,true)}</strong><span>${selectedGeography ? selectedGeography.type : "HES"}</span>`;
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
  // 04. DETAILS, RANKS AND GEOGRAPHY WARNINGS
  // ============================================================
  function peerCollection() {
    if (!selectedGeography) return [];
    return selectedGeography.type === "ICB" ? hesData.icbs : hesData.providers;
  }

  function rankFor(nodeId) {
    if (!selectedGeography) return null;
    const ranked = peerCollection()
      .map(item => ({ item,value:metricValue(item.metrics?.[nodeId]) }))
      .filter(item => item.value !== null)
      .sort((a,b) => b.value - a.value);
    const index = ranked.findIndex(item => item.item.code === selectedGeography.code);
    return index < 0 ? null : { rank:index + 1,total:ranked.length };
  }

  function comparisonText(nodeId,geography) {
    if (!selectedGeography) return "";
    const england = hesData.england;

    if (nodeId === "emergency-admission") {
      const local = geography.activity?.emergency_share_percent;
      const national = england.activity?.emergency_share_percent;
      if (Number.isFinite(Number(local)) && Number.isFinite(Number(national))) {
        const difference = Number(local) - Number(national);
        return `<p class="metric-note">Emergency admissions are ${difference >= 0 ? "+" : ""}${difference.toFixed(2)} percentage points from England's share of ${formatPercent(national)}.</p>`;
      }
    }

    if (nodeId === "hes-mean-los") {
      const local = geography.duration?.mean_length_of_stay_days;
      const national = england.duration?.mean_length_of_stay_days;
      if (Number.isFinite(Number(local)) && Number.isFinite(Number(national))) {
        const difference = Number(local) - Number(national);
        return `<p class="metric-note">Published mean stay is ${difference >= 0 ? "+" : ""}${difference.toFixed(2)} days from England.</p>`;
      }
    }

    return "";
  }

  function activityPanel(geography) {
    const activity = geography.activity || {};
    return `<div class="hes-apc-activity-grid">
      <div><span>All admissions</span><strong>${formatCount(activity.finished_admission_episodes)}</strong></div>
      <div><span>Emergency admissions</span><strong>${formatCount(activity.emergency_admissions)}</strong></div>
      <div><span>Emergency share</span><strong>${formatPercent(activity.emergency_share_percent)}</strong></div>
      <div><span>Finished consultant episodes</span><strong>${formatCount(activity.finished_consultant_episodes)}</strong></div>
      <div><span>All admitted bed-days</span><strong>${formatCount(activity.bed_days)}</strong></div>
      <div><span>Mean age</span><strong>${Number.isFinite(Number(geography.mean_age)) ? Number(geography.mean_age).toFixed(1) : "Not published"}</strong></div>
    </div>`;
  }

  function durationPanel(geography) {
    const duration = geography.duration || {};
    return `<div class="hes-apc-duration-grid">
      <div><span>Mean spell stay</span><strong>${formatDays(duration.mean_length_of_stay_days)}</strong></div>
      <div><span>Median spell stay</span><strong>${formatDays(duration.median_length_of_stay_days)}</strong></div>
      <div><span>Mean elective wait</span><strong>${formatDays(duration.mean_time_waited_days)}</strong></div>
      <div><span>Median elective wait</span><strong>${formatDays(duration.median_time_waited_days)}</strong></div>
    </div>`;
  }

  renderNodeDetails = function(node) {
    baseRenderNodeDetails(node);
    if (!CONTEXT_NODE_IDS.has(node.id) || !hesData) return;

    const geography = currentGeography();
    const metric = currentMetric(node.id);
    const value = metricValue(metric);
    const rank = rankFor(node.id);
    const published = value !== null;
    const exactValue = published ? metricDisplay(metric) : "Not published for this geography";
    const rankPanel = selectedGeography && rank ? `<div class="hes-apc-rank-card"><span>Recorded-value rank</span><strong>${rank.rank} of ${rank.total}</strong><small>Highest raw published value ranks first. This is not population-adjusted, case-mix adjusted or a performance judgement.</small></div>` : "";
    const aggregationWarning = geography.aggregation ? `<p class="metric-comparison-warning"><strong>ICB construction:</strong> ${geography.aggregation.method} ${geography.aggregation.warning}</p>` : "";
    const missingReason = !published && geography.type === "ICB" && node.id !== "emergency-admission" ? `<p class="metric-comparison-warning"><strong>Not available at ICB level:</strong> the public HES ICB workbook provides admission counts but not direct ICB bed-days or length-of-stay summaries.</p>` : "";

    const card = document.createElement("section");
    card.className = "operational-metric-card hes-apc-operational-card";
    card.innerHTML = `<div class="operational-metric-heading">
        <div><p class="eyebrow teal">Final annual HES figure</p><strong>${exactValue}</strong></div>
        <span>${geography.name}<br>${hesData.period}</span>
      </div>
      <h3>${metric?.label || node.label}</h3>
      ${node.id === "emergency-admission" && published ? `<p class="metric-exact">${formatCount(metric.count)} emergency admissions · ${formatPercent(metric.percent)} of ${formatCount(metric.denominator)} all admissions</p>` : ""}
      ${activityPanel(geography)}
      ${durationPanel(geography)}
      ${comparisonText(node.id,geography)}
      ${rankPanel}
      ${aggregationWarning}
      ${missingReason}
      <p class="metric-comparison-warning"><strong>Interpretation warning:</strong> FAE counts are admissions, not unique patients. Provider is treatment location; ICB is commissioning responsibility. The bed-day measure covers all admitted care and must not be described as emergency-only.</p>
      <a href="${hesData.source_url}" target="_blank" rel="noopener">${hesData.publication}</a>`;
    el("nodeDetails").prepend(card);
  };

  // ============================================================
  // 05. SWITCH DATASET CONTEXT
  // ============================================================
  selectNode = function(node,options={}) {
    const result = baseSelectNodeForHes(node,options);
    setContext(CONTEXT_NODE_IDS.has(node.id()));
    requestAnimationFrame(() => {
      refreshBadges();
      updateBadgePositions();
    });
    return result;
  };

  showHome = function(...args) {
    const result = baseShowHomeForHes(...args);
    setContext(false);
    return result;
  };

  showWholePicture = function(...args) {
    const result = baseShowWholePictureForHes(...args);
    setContext(false);
    return result;
  };

  hesData = await loadHesData();
  populateSelect(hesData);
  updateScope();
  refreshBadges();

  if (!hesData) {
    let attempts = 0;
    const retry = setInterval(async () => {
      attempts += 1;
      const data = await loadHesData();
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
