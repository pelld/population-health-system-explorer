// ============================================================
// 00. PUBLIC ANNUAL ECDS ROUTE METRICS
// ============================================================
// The map uses the complete 2024-25 public ECDS attendance-source table rather
// than mixing a current SitRep total with older route percentages. The small JSON
// file is generated from the NHS England annual workbook and is publicly auditable.

(async () => {
  const map = el("systemMap");
  const toolbarControls = document.querySelector(".map-toolbar-controls");
  const baseRenderNodeDetails = renderNodeDetails;
  const metricBadges = new Map();
  let numbersVisible = true;

  if (!map || !toolbarControls) return;

  function formatCount(value) {
    return new Intl.NumberFormat("en-GB").format(value);
  }

  function compactCount(value) {
    if (value >= 1000000) return `${(value / 1000000).toFixed(2)}m`;
    if (value >= 1000) return `${(value / 1000).toFixed(1)}k`;
    return String(value);
  }

  function formatPercent(value) {
    return `${Number(value).toFixed(Number(value) >= 10 ? 1 : 2)}%`;
  }

  let publicData;
  try {
    const response = await fetch("public-data/ecds-2024-25-route-metrics.json", { cache:"no-store" });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    publicData = await response.json();
  } catch (error) {
    console.error("Could not load public ECDS route metrics",error);
    return;
  }

  // ============================================================
  // 01. ALIGN THE VISIBLE ROUTES WITH THE PUBLISHED DEFINITIONS
  // ============================================================
  // ECDS publishes "member of Primary Health Care Team", which is broader than
  // GP referral alone. Ambulance source of referral and ambulance arrival mode
  // are also separate published fields, so the map says so explicitly.
  const routeTextOverrides = {
    "self-presentation": {
      label:"Self-referral or self-presentation",
      summary:"The attendance source is recorded in one of the two published ECDS self-referral categories.",
      caution:"The combined figure is derived from two published SNOMED categories. It does not imply that the attendance was unnecessary."
    },
    "gp-ae-route": {
      label:"Primary health care team referral to A&E",
      summary:"The attendance source is recorded as referral by a member of the Primary Health Care Team. This includes, but is broader than, GP referral alone.",
      caution:"The public annual category cannot isolate GP referrals from all other members of the Primary Health Care Team."
    },
    "ambulance-ae-route": {
      label:"Ambulance route into A&E",
      summary:"ECDS separately records referral by the ambulance service and arrival by ambulance. Both describe the route, but they are not interchangeable.",
      caution:"The source-of-referral percentage and arrival-mode percentage use the same attendance total but answer different questions."
    },
    "other-professional-route": {
      label:"Other recorded referral sources",
      summary:"This transparent remainder groups the many smaller published attendance-source categories after self-referral, NHS 111, primary health care team, ambulance service and Not Known are separated.",
      caution:"The group contains several distinct routes and should be expanded rather than treated as one operational service."
    },
    "unknown-route": {
      label:"Attendance source not known",
      summary:"The ECDS attendance-source field is recorded as Not Known.",
      caution:"Differences in completeness can materially change the apparent share of every other route."
    }
  };

  Object.entries(routeTextOverrides).forEach(([nodeId,changes]) => {
    const node = NODE_BY_ID.get(nodeId);
    if (!node) return;
    Object.assign(node,changes);
    cy.getElementById(nodeId).data("label",changes.label);
  });

  const factorOptions = el("factorOptions");
  if (factorOptions) factorOptions.innerHTML = AE_MAP_NODES.map(node => `<option value="${node.label}"></option>`).join("");

  const OPERATIONAL_METRICS = Object.fromEntries(
    Object.entries(publicData.routes).map(([nodeId,route]) => [nodeId,{
      value:nodeId === "ae-attendance" ? compactCount(route.count) : formatPercent(route.percent),
      exact:`${formatCount(route.count)} attendances`,
      label:route.label,
      period:publicData.period,
      geography:publicData.geography,
      comparison:nodeId === "ae-attendance" ? "Annual ECDS attendance-source denominator" : `${formatPercent(route.percent)} of the ECDS attendance-source total`,
      note:`${route.definition}${route.derived ? " This is a transparent grouping derived from published categories." : ""}`,
      secondary:route.secondary || null,
      sourceLabel:publicData.publication,
      sourceUrl:publicData.source_url
    }])
  );

  // ============================================================
  // 02. CREATE THE MAP NUMBER LAYER AND TOOLBAR CONTROL
  // ============================================================
  const metricLayer = document.createElement("div");
  metricLayer.className = "metric-layer";
  metricLayer.setAttribute("aria-hidden","true");
  map.append(metricLayer);

  const numbersButton = document.createElement("button");
  numbersButton.id = "toggleNumbers";
  numbersButton.className = "map-action numbers-toggle active";
  numbersButton.type = "button";
  numbersButton.textContent = "Hide numbers";
  numbersButton.setAttribute("aria-pressed","true");

  const scopeLabel = document.createElement("span");
  scopeLabel.className = "metric-scope";
  scopeLabel.textContent = `${publicData.geography} · ECDS ${publicData.period}`;

  const legendButton = el("toggleLegend");
  if (legendButton) {
    legendButton.insertAdjacentElement("afterend",numbersButton);
    numbersButton.insertAdjacentElement("afterend",scopeLabel);
  } else {
    toolbarControls.append(numbersButton,scopeLabel);
  }

  // ============================================================
  // 03. CREATE ONE HTML BADGE FOR EACH ROUTE
  // ============================================================
  Object.entries(OPERATIONAL_METRICS).forEach(([nodeId,metric]) => {
    if (!cy.getElementById(nodeId).length) return;

    const badge = document.createElement("button");
    badge.type = "button";
    badge.className = "node-metric-badge";
    badge.dataset.nodeId = nodeId;
    badge.innerHTML = `<strong>${metric.value}</strong><span>${metric.period}</span>`;
    badge.title = `${metric.label}: ${metric.exact} (${metric.geography}, ${metric.period})`;
    badge.addEventListener("click",() => selectNode(cy.getElementById(nodeId),{ centre:false }));
    metricLayer.append(badge);
    metricBadges.set(nodeId,badge);
  });

  function updateMetricPositions() {
    const zoom = cy.zoom();
    const showAtThisZoom = numbersVisible && zoom >= .34;

    metricBadges.forEach((badge,nodeId) => {
      const node = cy.getElementById(nodeId);
      if (!node.length || !showAtThisZoom || node.style("display") === "none") {
        badge.classList.remove("is-visible");
        return;
      }

      const position = node.renderedPosition();
      const x = position.x + (node.renderedWidth() * .34);
      const y = position.y - (node.renderedHeight() * .34);
      badge.style.left = `${x}px`;
      badge.style.top = `${y}px`;
      badge.classList.add("is-visible");
    });
  }

  numbersButton.addEventListener("click",() => {
    numbersVisible = !numbersVisible;
    numbersButton.classList.toggle("active",numbersVisible);
    numbersButton.textContent = numbersVisible ? "Hide numbers" : "Show numbers";
    numbersButton.setAttribute("aria-pressed",String(numbersVisible));
    metricLayer.classList.toggle("is-hidden",!numbersVisible);
    updateMetricPositions();
  });

  cy.on("pan zoom position render",updateMetricPositions);
  window.addEventListener("resize",updateMetricPositions);

  // ============================================================
  // 04. ADD COUNT, PERCENTAGE, PERIOD AND DEFINITION TO THE DRAWER
  // ============================================================
  renderNodeDetails = function(node) {
    baseRenderNodeDetails(node);
    const metric = OPERATIONAL_METRICS[node.id];
    if (!metric) return;

    const secondary = metric.secondary ? `
      <div class="metric-secondary">
        <strong>${formatPercent(metric.secondary.percent)} · ${formatCount(metric.secondary.count)}</strong>
        <span>${metric.secondary.label}</span>
        <p>${metric.secondary.definition}</p>
      </div>` : "";

    const metricCard = document.createElement("section");
    metricCard.className = "operational-metric-card";
    metricCard.innerHTML = `
      <div class="operational-metric-heading">
        <div><p class="eyebrow teal">Published annual figure</p><strong>${metric.value}</strong></div>
        <span>${metric.geography}<br>${metric.period}</span>
      </div>
      <h3>${metric.label}</h3>
      <p class="metric-exact">${metric.exact}</p>
      <p>${metric.comparison}</p>
      ${secondary}
      <p class="metric-note">${metric.note}</p>
      <a href="${metric.sourceUrl}" target="_blank" rel="noopener">${metric.sourceLabel}</a>`;

    el("nodeDetails").prepend(metricCard);
  };

  requestAnimationFrame(() => {
    updateMetricPositions();
    renderNodeDetails(NODE_BY_ID.get("ae-attendance"));
  });
})();
