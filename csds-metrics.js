// ============================================================
// 00. PUBLIC MARCH 2025 CSDS METRICS
// ============================================================
// Shows direct published totals by England, ICB and provider. Missing provider
// measures remain missing; they are never converted to zero.

(async () => {
  const map = el("systemMap");
  const toolbarControls = document.querySelector(".map-toolbar-controls");
  const numbersButton = el("toggleNumbers");
  const baseRenderNodeDetails = renderNodeDetails;
  const baseSelectNodeForCsds = selectNode;
  const baseShowHomeForCsds = showHome;
  const baseShowWholePictureForCsds = showWholePicture;

  if (!map || !toolbarControls) return;

  const CONTEXT_NODE_IDS = new Set([
    "csds-referrals",
    "csds-people-referred",
    "csds-people-contacted",
    "csds-care-contacts",
    "csds-care-activities"
  ]);
  const BADGE_NODE_IDS = [...CONTEXT_NODE_IDS];

  const existingControls = [
    ".provider-metric-control",".metric-scope",
    ".ambulance-metric-control",".ambulance-metric-scope",
    ".iuc-metric-control",".iuc-metric-scope",
    ".gpad-metric-control",".gpad-metric-scope",
    ".ucr-metric-control",".ucr-metric-scope",
    ".community-waits-metric-control",".community-waits-metric-scope"
  ].map(selector => document.querySelector(selector)).filter(Boolean);

  let csdsData = null;
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

  async function loadCsdsData() {
    const paths = [
      "public-data/csds-mar-2025.json",
      "https://raw.githubusercontent.com/pelld/population-health-system-explorer/main/public-data/csds-mar-2025.json"
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
    return `${Number(value).toFixed(1)}%`;
  }

  function currentGeography() {
    return selectedGeography || csdsData?.england || null;
  }

  function currentMetric(nodeId) {
    return currentGeography()?.metrics?.[nodeId] || null;
  }

  // ============================================================
  // 02. DIRECT PUBLISHED GEOGRAPHY SELECTOR
  // ============================================================
  const control = document.createElement("label");
  control.className = "csds-metric-control";
  control.hidden = true;
  control.innerHTML = `<span>CSDS geography</span><select id="csdsMetricSelect" aria-label="Choose England, an ICB or a community provider"><option value="">England</option><option value="__loading" disabled>Loading CSDS geographies…</option></select>`;

  const select = control.querySelector("select");
  const scope = document.createElement("span");
  scope.className = "csds-metric-scope";
  scope.hidden = true;

  const anchor = document.querySelector(".community-waits-metric-scope") || existingControls.at(-1) || numbersButton;
  if (anchor) {
    anchor.insertAdjacentElement("afterend",control);
    control.insertAdjacentElement("afterend",scope);
  } else {
    toolbarControls.append(control,scope);
  }

  function populateSelect(data) {
    csdsData = data;
    select.innerHTML = `<option value="">England</option>`;
    if (!data?.icbs?.length || !data?.providers?.length) {
      select.add(new Option("CSDS data unavailable","__unavailable"));
      select.disabled = true;
      return;
    }

    const icbGroup = document.createElement("optgroup");
    icbGroup.label = `Integrated Care Boards (${data.icb_count})`;
    data.icbs.forEach(item => icbGroup.append(new Option(item.name,`ICB|${item.code}`)));

    const providerGroup = document.createElement("optgroup");
    providerGroup.label = `Submitted providers (${data.provider_count})`;
    data.providers.forEach(item => providerGroup.append(new Option(item.name,`Provider|${item.code}`)));

    select.append(icbGroup,providerGroup);
    select.disabled = false;
  }

  function updateScope() {
    const geography = currentGeography();
    scope.textContent = geography ? `${geography.name} · ${geography.type} · ${csdsData.period}` : "CSDS data unavailable";
  }

  function setContext(active) {
    control.hidden = !active;
    scope.hidden = !active;
    if (active) existingControls.forEach(item => { item.hidden = true; });
    requestAnimationFrame(updateBadgePositions);
  }

  select.addEventListener("change",() => {
    const [type,code] = select.value.split("|");
    const collection = type === "ICB" ? csdsData?.icbs : type === "Provider" ? csdsData?.providers : [];
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
  badgeLayer.className = "metric-layer csds-metric-layer";
  badgeLayer.setAttribute("aria-hidden","true");
  map.append(badgeLayer);

  BADGE_NODE_IDS.forEach(nodeId => {
    if (!cy.getElementById(nodeId).length) return;
    const badge = document.createElement("button");
    badge.type = "button";
    badge.className = "node-metric-badge csds-metric-badge";
    badge.dataset.nodeId = nodeId;
    badge.addEventListener("click",() => selectNode(cy.getElementById(nodeId),{ centre:false }));
    badgeLayer.append(badge);
    badges.set(nodeId,badge);
  });

  function refreshBadges() {
    badges.forEach((badge,nodeId) => {
      const count = currentMetric(nodeId)?.count;
      if (count === null || count === undefined || !Number.isFinite(Number(count))) {
        badge.dataset.hasMetric = "false";
        badge.classList.remove("is-visible");
        return;
      }
      badge.dataset.hasMetric = "true";
      badge.innerHTML = `<strong>${compactCount(count)}</strong><span>${selectedGeography ? selectedGeography.type : "CSDS"}</span>`;
      badge.title = `${currentGeography().name}: ${currentMetric(nodeId).label} · ${formatCount(count)}`;
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
  // 04. DETAILS AND COMPARISON
  // ============================================================
  function peerCollection() {
    if (!selectedGeography) return [];
    return selectedGeography.type === "ICB" ? csdsData.icbs : csdsData.providers;
  }

  function rankFor(nodeId) {
    if (!selectedGeography) return null;
    const ranked = peerCollection()
      .map(item => ({ item,value:item.metrics?.[nodeId]?.count }))
      .filter(item => item.value !== null && item.value !== undefined && Number.isFinite(Number(item.value)))
      .sort((a,b) => Number(b.value) - Number(a.value));
    const index = ranked.findIndex(item => item.item.code === selectedGeography.code);
    return index < 0 ? null : { rank:index + 1,total:ranked.length };
  }

  function agePanel(metric) {
    const age = metric?.age || {};
    return `<div class="csds-age-grid">
      <div><span>Age 0–18</span><strong>${compactCount(age.age_0_18)}</strong><small>${formatPercent(age.age_0_18_percent)}</small></div>
      <div><span>Age 19–64</span><strong>${compactCount(age.age_19_64)}</strong><small>${formatPercent(age.age_19_64_percent)}</small></div>
      <div><span>Age 65+</span><strong>${compactCount(age.age_65_plus)}</strong><small>${formatPercent(age.age_65_plus_percent)}</small></div>
    </div>`;
  }

  function relationshipPanel(geography) {
    const relationship = geography.relationships || {};
    return `<div class="csds-relationship-grid">
      <div><span>Referrals per referred person</span><strong>${relationship.referrals_per_person_referred ?? "—"}</strong></div>
      <div><span>Contacts per contacted person</span><strong>${relationship.contacts_per_person_contacted ?? "—"}</strong></div>
      <div><span>Activities per contact</span><strong>${relationship.activities_per_contact ?? "—"}</strong></div>
    </div>`;
  }

  renderNodeDetails = function(node) {
    baseRenderNodeDetails(node);
    if (!CONTEXT_NODE_IDS.has(node.id) || !csdsData) return;

    const geography = currentGeography();
    const metric = currentMetric(node.id);
    const count = metric?.count;
    const rank = rankFor(node.id);
    const published = count !== null && count !== undefined && Number.isFinite(Number(count));

    const rankPanel = selectedGeography && rank ? `<div class="csds-rank-card"><span>Recorded activity-volume rank</span><strong>${rank.rank} of ${rank.total}</strong><small>Highest raw count ranks first. This is not population-adjusted and is not a performance judgement.</small></div>` : "";
    const coverage = !selectedGeography ? `<p class="metric-note">Provider coverage: ${csdsData.provider_coverage.with_referrals} of ${csdsData.provider_coverage.submitted} submitted referral data; ${csdsData.provider_coverage.with_care_contacts} submitted care-contact data; ${csdsData.provider_coverage.with_care_activities} submitted care-activity data.</p>` : "";

    const card = document.createElement("section");
    card.className = "operational-metric-card csds-operational-card";
    card.innerHTML = `<div class="operational-metric-heading">
        <div><p class="eyebrow teal">Published CSDS total</p><strong>${published ? compactCount(count) : "Not published"}</strong></div>
        <span>${geography.name}<br>${csdsData.period}</span>
      </div>
      <h3>${metric?.label || node.label}</h3>
      <p class="metric-exact">${published ? `${formatCount(count)} published records` : "No value was published for this organisation and measure."}</p>
      ${published ? agePanel(metric) : ""}
      ${rankPanel}
      ${relationshipPanel(geography)}
      ${coverage}
      <p class="metric-comparison-warning"><strong>Interpretation warning:</strong> these are direct published aggregate totals. Referrals, people and contacts are different units and cannot be joined here as individual journeys. ICB and provider are separate published geographies.</p>
      <a href="${csdsData.source_url}" target="_blank" rel="noopener">${csdsData.publication}</a>`;
    el("nodeDetails").prepend(card);
  };

  // ============================================================
  // 05. SWITCH DATASET CONTEXT
  // ============================================================
  selectNode = function(node,options={}) {
    const result = baseSelectNodeForCsds(node,options);
    setContext(CONTEXT_NODE_IDS.has(node.id()));
    requestAnimationFrame(() => {
      refreshBadges();
      updateBadgePositions();
    });
    return result;
  };

  showHome = function(...args) {
    const result = baseShowHomeForCsds(...args);
    setContext(false);
    return result;
  };

  showWholePicture = function(...args) {
    const result = baseShowWholePictureForCsds(...args);
    setContext(false);
    return result;
  };

  csdsData = await loadCsdsData();
  populateSelect(csdsData);
  updateScope();
  refreshBadges();

  if (!csdsData) {
    let attempts = 0;
    const retry = setInterval(async () => {
      attempts += 1;
      const data = await loadCsdsData();
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
