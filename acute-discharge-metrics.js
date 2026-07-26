// ============================================================
// 00. 2024-25 ACUTE DISCHARGE SITREP METRICS
// ============================================================
// England uses the latest revised national series. ICB and provider values retain
// the published monthly organisation files because the national workbook has no
// lower-geography rows. Stocks are averaged; discharge events are summed.

(async () => {
  const map = el("systemMap");
  const toolbarControls = document.querySelector(".map-toolbar-controls");
  const numbersButton = el("toggleNumbers");
  const baseRenderNodeDetails = renderNodeDetails;
  const baseSelectNodeForAcuteDischarge = selectNode;
  const baseShowHomeForAcuteDischarge = showHome;
  const baseShowWholePictureForAcuteDischarge = showWholePicture;

  if (!map || !toolbarControls) return;

  const CONTEXT_NODE_IDS = new Set([
    "discharge-ready",
    "delayed-discharge",
    "actual-discharge",
    "acute-additional-bed-days"
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
    ".bed-occupancy-metric-control",".bed-occupancy-metric-scope"
  ].map(selector => document.querySelector(selector)).filter(Boolean);

  let dischargeData = null;
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

  async function loadDischargeData() {
    const paths = [
      "public-data/acute-discharge-2024-25.json",
      "https://raw.githubusercontent.com/pelld/population-health-system-explorer/main/public-data/acute-discharge-2024-25.json"
    ];
    for (const path of paths) {
      const data = await loadJson(path);
      if (data?.england?.metrics && data?.icbs?.length && data?.providers?.length) return data;
    }
    return null;
  }

  function formatCount(value,maximumFractionDigits=0) {
    if (value === null || value === undefined || !Number.isFinite(Number(value))) return "Not published";
    return new Intl.NumberFormat("en-GB",{ maximumFractionDigits }).format(Number(value));
  }

  function compactNumber(value) {
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

  function currentGeography() {
    return selectedGeography || dischargeData?.england || null;
  }

  function currentMetric(nodeId) {
    return currentGeography()?.metrics?.[nodeId] || null;
  }

  function metricValue(metric) {
    if (!metric) return null;
    const raw = metric.display === "percent" ? metric.percent
      : metric.display === "days" ? metric.days
      : metric.display === "average" ? metric.average
      : metric.count;
    return raw === null || raw === undefined || !Number.isFinite(Number(raw)) ? null : Number(raw);
  }

  function metricDisplay(metric,compact=false) {
    const value = metricValue(metric);
    if (value === null) return "—";
    if (metric.display === "percent") return compact ? `${value.toFixed(1)}%` : formatPercent(value);
    if (metric.display === "days") return compact ? `${compactNumber(value)}d` : `${formatCount(value,1)} additional days`;
    if (metric.display === "average") return compact ? compactNumber(value) : `${formatCount(value,1)} average per day`;
    return compact ? compactNumber(value) : formatCount(value);
  }

  // ============================================================
  // 02. ENGLAND / ICB / PROVIDER SELECTOR
  // ============================================================
  const control = document.createElement("label");
  control.className = "acute-discharge-metric-control";
  control.hidden = true;
  control.innerHTML = `<span>Acute discharge geography</span><select id="acuteDischargeMetricSelect" aria-label="Choose England, an ICB or an acute provider"><option value="">England</option><option value="__loading" disabled>Loading geographies…</option></select>`;

  const select = control.querySelector("select");
  const scope = document.createElement("span");
  scope.className = "acute-discharge-metric-scope";
  scope.hidden = true;

  const anchor = document.querySelector(".bed-occupancy-metric-scope") || existingControls.at(-1) || numbersButton;
  if (anchor) {
    anchor.insertAdjacentElement("afterend",control);
    control.insertAdjacentElement("afterend",scope);
  } else {
    toolbarControls.append(control,scope);
  }

  function populateSelect(data) {
    dischargeData = data;
    select.innerHTML = `<option value="">England</option>`;
    if (!data?.icbs?.length || !data?.providers?.length) {
      select.add(new Option("Acute discharge data unavailable","__unavailable"));
      select.disabled = true;
      return;
    }

    const icbGroup = document.createElement("optgroup");
    icbGroup.label = `ICBs (${data.icb_count})`;
    data.icbs.forEach(item => icbGroup.append(new Option(item.name,`ICB|${item.code}`)));

    const providerGroup = document.createElement("optgroup");
    providerGroup.label = `Acute providers (${data.provider_count})`;
    data.providers.forEach(item => providerGroup.append(new Option(item.name,`Provider|${item.code}`)));

    select.append(icbGroup,providerGroup);
    select.disabled = false;
  }

  function updateScope() {
    const geography = currentGeography();
    if (!geography) {
      scope.textContent = "Acute discharge data unavailable";
      return;
    }
    const sourceNote = geography.type === "National" ? "revised national series" : "monthly organisation files";
    scope.textContent = `${geography.name} · ${geography.type} · ${dischargeData.period} · ${sourceNote}`;
  }

  function setContext(active) {
    control.hidden = !active;
    scope.hidden = !active;
    if (active) existingControls.forEach(item => { item.hidden = true; });
    requestAnimationFrame(updateBadgePositions);
  }

  select.addEventListener("change",() => {
    const [type,code] = select.value.split("|");
    const collection = type === "ICB" ? dischargeData?.icbs : type === "Provider" ? dischargeData?.providers : [];
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
  badgeLayer.className = "metric-layer acute-discharge-metric-layer";
  badgeLayer.setAttribute("aria-hidden","true");
  map.append(badgeLayer);

  BADGE_NODE_IDS.forEach(nodeId => {
    if (!cy.getElementById(nodeId).length) return;
    const badge = document.createElement("button");
    badge.type = "button";
    badge.className = "node-metric-badge acute-discharge-metric-badge";
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
      badge.innerHTML = `<strong>${metricDisplay(metric,true)}</strong><span>${selectedGeography ? selectedGeography.type : "SitRep"}</span>`;
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
  // 04. DETAILS, TRENDS, DESTINATIONS AND DELAY REASONS
  // ============================================================
  function peerCollection() {
    if (!selectedGeography) return [];
    return selectedGeography.type === "ICB" ? dischargeData.icbs : dischargeData.providers;
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

  function summaryPanel(geography) {
    const daily = geography.daily || {};
    const additional = geography.additional_bed_days || {};
    return `<div class="acute-discharge-summary-grid">
      <div><span>Average daily NCTR</span><strong>${formatCount(daily.nctr_average,1)}</strong><small>${formatCount(daily.nctr_patient_days)} recorded patient-days</small></div>
      <div><span>Discharged during year</span><strong>${formatCount(daily.discharged_total)}</strong><small>${formatCount(daily.discharged_average,1)} average per day</small></div>
      <div><span>Average still in hospital</span><strong>${formatCount(daily.remaining_average,1)}</strong><small>${formatPercent(daily.remaining_percent)} of recorded daily NCTR positions</small></div>
      <div><span>Additional days · LOS 7+</span><strong>${formatCount(additional["7_plus"]?.average_weekly_snapshot,1)}</strong><small>Average weekly snapshot; ${formatCount(additional["7_plus"]?.snapshots)} snapshots</small></div>
      <div><span>Additional days · LOS 14+</span><strong>${formatCount(additional["14_plus"]?.average_weekly_snapshot,1)}</strong><small>Overlaps the 7+ group</small></div>
      <div><span>Additional days · LOS 21+</span><strong>${formatCount(additional["21_plus"]?.average_weekly_snapshot,1)}</strong><small>Overlaps both shorter LOS groups</small></div>
    </div>`;
  }

  function monthlyPanel(geography) {
    return `<div class="acute-discharge-month-grid">${(geography.monthly || []).map(record => `<div>
      <span>${record.label}</span><strong>${formatPercent(record.remaining_percent)}</strong>
      <small>${formatCount(record.nctr_average,1)} NCTR average · ${formatCount(record.discharged_total)} discharged</small>
    </div>`).join("")}</div>`;
  }

  function pathwayPanel(geography) {
    const totals = geography.post_change_destinations?.pathway_totals || {};
    return `<div class="acute-discharge-pathway-grid">${[0,1,2,3].map(pathway => `<div>
      <span>Pathway ${pathway}</span><strong>${formatCount(totals[`pathway_${pathway}`])}</strong>
      <small>Published destination total, June 2024–March 2025</small>
    </div>`).join("")}</div>`;
  }

  function delayPanel(geography) {
    const reasons = geography.post_change_delay_reasons?.details || [];
    return `<div class="acute-discharge-delay-grid">${reasons.slice(0,6).map(item => `<div>
      <span>${item.reason}</span><strong>${formatCount(item.mean_published_monthly_average,1)}</strong>
      <small>Mean of ${item.months} published monthly averages</small>
    </div>`).join("")}</div>`;
  }

  function comparisonText(nodeId,geography) {
    if (!selectedGeography) return "";
    const local = metricValue(geography.metrics?.[nodeId]);
    const national = metricValue(dischargeData.england.metrics?.[nodeId]);
    if (!Number.isFinite(local) || !Number.isFinite(national)) return "";
    const difference = local - national;
    const suffix = geography.metrics[nodeId].display === "percent" ? " percentage points" : "";
    return `<p class="metric-note">Recorded value is ${difference >= 0 ? "+" : ""}${difference.toFixed(2)}${suffix} from England. The sources differ: England is revised; local values retain the organisation files.</p>`;
  }

  renderNodeDetails = function(node) {
    baseRenderNodeDetails(node);
    if (!CONTEXT_NODE_IDS.has(node.id) || !dischargeData) return;

    const geography = currentGeography();
    const metric = currentMetric(node.id);
    const value = metricValue(metric);
    const rank = rankFor(node.id);
    const rankPanel = selectedGeography && rank ? `<div class="acute-discharge-rank-card"><span>Recorded-value rank</span><strong>${rank.rank} of ${rank.total}</strong><small>Highest raw value ranks first. This is not adjusted for population, provider size, case mix or reporting completeness and is not a performance judgement.</small></div>` : "";
    const sourceWarning = geography.type === "National"
      ? `<p class="metric-note">England uses the latest revised national time series published in July 2026.</p>`
      : `<p class="metric-note">This local view uses the published monthly organisation files. The current revised national series differs on one daily date and five weekly snapshots; those differences are not spread across local organisations.</p>`;

    const card = document.createElement("section");
    card.className = "operational-metric-card acute-discharge-operational-card";
    card.innerHTML = `<div class="operational-metric-heading">
        <div><p class="eyebrow teal">Acute discharge SitRep</p><strong>${value === null ? "Not published" : metricDisplay(metric)}</strong></div>
        <span>${geography.name}<br>${dischargeData.period}</span>
      </div>
      <h3>${metric?.label || node.label}</h3>
      ${sourceWarning}
      ${comparisonText(node.id,geography)}
      ${rankPanel}
      <h4>Annual discharge position</h4>
      ${summaryPanel(geography)}
      <h4>Monthly NCTR and discharge trend</h4>
      ${monthlyPanel(geography)}
      <h4>Discharge destinations after the definition change</h4>
      ${pathwayPanel(geography)}
      <h4>Largest recorded delay reasons</h4>
      ${delayPanel(geography)}
      <p class="metric-comparison-warning"><strong>Interpretation warning:</strong> NCTR and not-discharged figures are daily occupied positions, not unique patients. Additional bed days are overlapping weekly snapshot stocks. This is rapidly collected management information with minimal validation.</p>
      <a href="${dischargeData.source_url}" target="_blank" rel="noopener">${dischargeData.publication}</a>`;
    el("nodeDetails").prepend(card);
  };

  // ============================================================
  // 05. SWITCH DATASET CONTEXT
  // ============================================================
  selectNode = function(node,options={}) {
    const result = baseSelectNodeForAcuteDischarge(node,options);
    setContext(CONTEXT_NODE_IDS.has(node.id()));
    requestAnimationFrame(() => {
      refreshBadges();
      updateBadgePositions();
    });
    return result;
  };

  showHome = function(...args) {
    const result = baseShowHomeForAcuteDischarge(...args);
    setContext(false);
    return result;
  };

  showWholePicture = function(...args) {
    const result = baseShowWholePictureForAcuteDischarge(...args);
    setContext(false);
    return result;
  };

  dischargeData = await loadDischargeData();
  populateSelect(dischargeData);
  updateScope();
  refreshBadges();

  if (!dischargeData) {
    let attempts = 0;
    const retry = setInterval(async () => {
      attempts += 1;
      const data = await loadDischargeData();
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
