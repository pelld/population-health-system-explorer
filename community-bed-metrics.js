// ============================================================
// 00. PUBLIC COMMUNITY BED AUDIT METRICS
// ============================================================
// Shows direct published England and ICB rows from the 4 March 2026 audit.
// This is a point-in-time capacity snapshot, not an annual activity total.

(async () => {
  const map = el("systemMap");
  const toolbarControls = document.querySelector(".map-toolbar-controls");
  const numbersButton = el("toggleNumbers");
  const baseRenderNodeDetails = renderNodeDetails;
  const baseSelectNodeForCommunityBeds = selectNode;
  const baseShowHomeForCommunityBeds = showHome;
  const baseShowWholePictureForCommunityBeds = showWholePicture;

  if (!map || !toolbarControls) return;

  const CONTEXT_NODE_IDS = new Set([
    "community-bed-capacity",
    "community-bed-rehab",
    "community-bed-step-up",
    "community-bed-assessment",
    "community-bed-los"
  ]);
  const BADGE_NODE_IDS = [...CONTEXT_NODE_IDS];

  const existingControls = [
    ".provider-metric-control",".metric-scope",
    ".ambulance-metric-control",".ambulance-metric-scope",
    ".iuc-metric-control",".iuc-metric-scope",
    ".gpad-metric-control",".gpad-metric-scope",
    ".ucr-metric-control",".ucr-metric-scope",
    ".community-waits-metric-control",".community-waits-metric-scope",
    ".csds-metric-control",".csds-metric-scope"
  ].map(selector => document.querySelector(selector)).filter(Boolean);

  let auditData = null;
  let selectedGeography = null;
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

  async function loadAuditData() {
    const paths = [
      "public-data/community-bed-audit-2026.json",
      "https://raw.githubusercontent.com/pelld/population-health-system-explorer/main/public-data/community-bed-audit-2026.json"
    ];
    for (const path of paths) {
      const data = await loadJson(path);
      if (data?.england?.metrics && data?.icbs?.length) return data;
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
    return `${Number(value).toFixed(1)}%`;
  }

  function formatDays(value) {
    if (value === null || value === undefined || !Number.isFinite(Number(value))) return "—";
    return `${Number(value).toFixed(1)} days`;
  }

  function currentGeography() {
    return selectedGeography || auditData?.england || null;
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
    if (metric.display === "percent") return formatPercent(value);
    if (metric.display === "days") return compact ? `${value.toFixed(1)}d` : formatDays(value);
    return compact ? compactCount(value) : formatCount(value);
  }

  // ============================================================
  // 02. DIRECT PUBLISHED ICB SELECTOR
  // ============================================================
  const control = document.createElement("label");
  control.className = "community-bed-metric-control";
  control.hidden = true;
  control.innerHTML = `<span>Community beds geography</span><select id="communityBedMetricSelect" aria-label="Choose England or an ICB"><option value="">England</option><option value="__loading" disabled>Loading ICBs…</option></select>`;

  const select = control.querySelector("select");
  const scope = document.createElement("span");
  scope.className = "community-bed-metric-scope";
  scope.hidden = true;

  const anchor = document.querySelector(".csds-metric-scope") || existingControls.at(-1) || numbersButton;
  if (anchor) {
    anchor.insertAdjacentElement("afterend",control);
    control.insertAdjacentElement("afterend",scope);
  } else {
    toolbarControls.append(control,scope);
  }

  function populateSelect(data) {
    auditData = data;
    select.innerHTML = `<option value="">England</option>`;
    if (!data?.icbs?.length) {
      select.add(new Option("Community bed data unavailable","__unavailable"));
      select.disabled = true;
      return;
    }

    data.icbs.forEach(item => select.add(new Option(item.name,item.code)));
    select.disabled = false;
  }

  function updateScope() {
    const geography = currentGeography();
    scope.textContent = geography ? `${geography.name} · ${auditData.snapshot}` : "Community bed data unavailable";
  }

  function setContext(active) {
    control.hidden = !active;
    scope.hidden = !active;
    if (active) existingControls.forEach(item => { item.hidden = true; });
    requestAnimationFrame(updateBadgePositions);
  }

  select.addEventListener("change",() => {
    selectedGeography = auditData?.icbs?.find(item => item.code === select.value) || null;
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
  badgeLayer.className = "metric-layer community-bed-metric-layer";
  badgeLayer.setAttribute("aria-hidden","true");
  map.append(badgeLayer);

  BADGE_NODE_IDS.forEach(nodeId => {
    if (!cy.getElementById(nodeId).length) return;
    const badge = document.createElement("button");
    badge.type = "button";
    badge.className = "node-metric-badge community-bed-metric-badge";
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
      badge.innerHTML = `<strong>${metricDisplay(metric,true)}</strong><span>${selectedGeography ? "ICB" : "Audit"}</span>`;
      badge.title = `${currentGeography().name}: ${metric.label} · ${metricDisplay(metric)}`;
    });
  }

  function updateBadgePositions() {
    const show = numbersVisible && !control.hidden && cy.zoom() >= .29;
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
  // 04. DETAILS AND ICB COMPARISON
  // ============================================================
  function rankFor(nodeId) {
    if (!selectedGeography) return null;
    const ranked = auditData.icbs
      .map(item => ({ item,value:metricValue(item.metrics?.[nodeId]) }))
      .filter(item => item.value !== null)
      .sort((a,b) => b.value - a.value);
    const index = ranked.findIndex(item => item.item.code === selectedGeography.code);
    return index < 0 ? null : { rank:index + 1,total:ranked.length };
  }

  function profilePanel(geography) {
    return `<div class="community-bed-profile-grid">
      <div><span>Total beds</span><strong>${compactCount(geography.metrics["community-bed-capacity"].count)}</strong></div>
      <div><span>Rehab access</span><strong>${formatPercent(geography.metrics["community-bed-rehab"].percent)}</strong></div>
      <div><span>Block contract</span><strong>${formatPercent(geography.commissioning.block_contract_percent)}</strong></div>
      <div><span>Spot purchase</span><strong>${formatPercent(geography.commissioning.spot_purchase_percent)}</strong></div>
      <div><span>NHS-hosted</span><strong>${formatPercent(geography.hosting.nhs_trust_percent)}</strong></div>
      <div><span>Non-NHS hosted</span><strong>${formatPercent(geography.hosting.non_nhs_percent)}</strong></div>
    </div>`;
  }

  function purposesPanel(geography) {
    const labels = {
      post_hospital_rehab:"Post-hospital rehab/reablement",
      assessment:"Assessment/transition",
      step_up:"Admission avoidance/step-up",
      complex_specialist_rehab:"Complex/specialist rehab",
      confusion_delirium_dementia:"Confusion/delirium/dementia",
      stroke_neuro_rehab:"Stroke/neuro rehab"
    };
    const items = Object.entries(labels)
      .map(([key,label]) => ({ label,value:geography.purposes?.[key] }))
      .filter(item => Number.isFinite(Number(item.value)))
      .sort((a,b) => Number(b.value) - Number(a.value));

    return `<section class="community-bed-purpose-panel"><h4>Largest published bed purposes</h4>${items.map(item => `<div><span>${item.label}</span><strong>${formatCount(item.value)}</strong></div>`).join("")}</section>`;
  }

  function losPanel(geography) {
    const values = geography.average_length_of_stay || {};
    const rows = [
      ["Overall",values.overall],
      ["Post-hospital rehab/reablement",values.post_hospital_rehab],
      ["Assessment/transition",values.assessment],
      ["Admission avoidance/step-up",values.step_up],
      ["Stroke/neuro rehab",values.stroke_neuro_rehab]
    ].filter(([,value]) => value !== null && value !== undefined);

    return `<section class="community-bed-los-panel"><h4>Published average length of stay</h4>${rows.map(([label,value]) => `<div><span>${label}</span><strong>${formatDays(value)}</strong></div>`).join("")}</section>`;
  }

  renderNodeDetails = function(node) {
    baseRenderNodeDetails(node);
    if (!CONTEXT_NODE_IDS.has(node.id) || !auditData) return;

    const geography = currentGeography();
    const metric = currentMetric(node.id);
    const rank = rankFor(node.id);
    const value = metricValue(metric);
    const exact = metric?.display === "days"
      ? formatDays(metric?.days)
      : `${formatCount(metric?.count)} beds${metric?.percent !== null && metric?.percent !== undefined ? ` · ${formatPercent(metric.percent)} of audited beds` : ""}`;

    const rankPanel = selectedGeography && rank ? `<div class="community-bed-rank-card">
      <span>Recorded-value rank</span><strong>${rank.rank} of ${rank.total}</strong>
      <small>Highest value ranks first. This is not population-adjusted or a performance judgement.</small>
    </div>` : "";

    const card = document.createElement("section");
    card.className = "operational-metric-card community-bed-operational-card";
    card.innerHTML = `<div class="operational-metric-heading">
        <div><p class="eyebrow teal">Published community bed audit</p><strong>${metricDisplay(metric,true)}</strong></div>
        <span>${geography.name}<br>${auditData.snapshot}</span>
      </div>
      <h3>${metric?.label || node.label}</h3>
      <p class="metric-exact">${value === null ? "Not published" : exact}</p>
      ${rankPanel}
      ${profilePanel(geography)}
      ${purposesPanel(geography)}
      ${losPanel(geography)}
      <p class="metric-comparison-warning"><strong>Interpretation warning:</strong> this is a point-in-time ICB audit, not annual bed activity. Bed numbers do not show staffing, occupancy, vacancies or whether a suitable bed was available when needed.</p>
      <p class="metric-note">The audit is from 4 March 2026, later than the mainly 2024–25 activity layers elsewhere in the map.</p>
      <a href="${auditData.source_url}" target="_blank" rel="noopener">${auditData.publication}</a>`;
    el("nodeDetails").prepend(card);
  };

  // ============================================================
  // 05. SWITCH DATASET CONTEXT
  // ============================================================
  selectNode = function(node,options={}) {
    const result = baseSelectNodeForCommunityBeds(node,options);
    setContext(CONTEXT_NODE_IDS.has(node.id()));
    requestAnimationFrame(() => {
      refreshBadges();
      updateBadgePositions();
    });
    return result;
  };

  showHome = function(...args) {
    const result = baseShowHomeForCommunityBeds(...args);
    setContext(false);
    return result;
  };

  showWholePicture = function(...args) {
    const result = baseShowWholePictureForCommunityBeds(...args);
    setContext(false);
    return result;
  };

  auditData = await loadAuditData();
  populateSelect(auditData);
  updateScope();
  refreshBadges();

  if (!auditData) {
    let attempts = 0;
    const retry = setInterval(async () => {
      attempts += 1;
      const data = await loadAuditData();
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
