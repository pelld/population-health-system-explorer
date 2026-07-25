// ============================================================
// 00. PUBLIC ANNUAL ECDS ROUTE METRICS
// ============================================================
// National and provider figures come from the public 2024-25 ECDS publication.
// The selector changes the badges without changing the structure of the map.

(async () => {
  const map = el("systemMap");
  const toolbarControls = document.querySelector(".map-toolbar-controls");
  const baseRenderNodeDetails = renderNodeDetails;
  const metricBadges = new Map();
  let numbersVisible = true;
  let selectedProvider = null;

  if (!map || !toolbarControls) return;

  // ============================================================
  // 01. FORMATTERS AND PUBLIC FILES
  // ============================================================
  function formatCount(value) {
    return new Intl.NumberFormat("en-GB").format(value);
  }

  function compactCount(value) {
    if (value >= 1000000) return `${(value / 1000000).toFixed(2)}m`;
    if (value >= 1000) return `${(value / 1000).toFixed(1)}k`;
    return String(value);
  }

  function formatPercent(value) {
    if (value === null || value === undefined || Number.isNaN(Number(value))) return "—";
    return `${Number(value).toFixed(Number(value) >= 10 ? 1 : 2)}%`;
  }

  async function loadJson(path,required=true) {
    try {
      const response = await fetch(path,{ cache:"no-store" });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return await response.json();
    } catch (error) {
      if (required) console.error(`Could not load ${path}`,error);
      return null;
    }
  }

  const [nationalData,providerData] = await Promise.all([
    loadJson("public-data/ecds-2024-25-route-metrics.json",true),
    loadJson("public-data/ecds-2024-25-provider-routes.json",false)
  ]);
  if (!nationalData) return;

  // ============================================================
  // 02. ALIGN MAP WORDING WITH THE PUBLISHED FIELDS
  // ============================================================
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
      label:"Ambulance service recorded as attendance source",
      summary:"ECDS records the ambulance service as the attendance source. Arrival by ambulance and ambulance-service conveyance are separate measures.",
      caution:"Do not treat this percentage as the ambulance-service conveyance rate."
    },
    "other-professional-route": {
      label:"Other recorded referral sources",
      summary:"This transparent remainder groups the smaller published attendance-source categories after the main routes and Not Known are separated.",
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

  // ============================================================
  // 03. SELECT ENGLAND OR A PROVIDER
  // ============================================================
  const scopeLabel = document.createElement("span");
  scopeLabel.className = "metric-scope";

  const providerControl = document.createElement("label");
  providerControl.className = "provider-metric-control";
  providerControl.innerHTML = `<span>Numbers for</span><select id="providerMetricSelect" aria-label="Choose England or an ECDS provider"><option value="">England</option></select>`;

  const providerSelect = providerControl.querySelector("select");
  if (providerData?.providers?.length) {
    providerData.providers.forEach(provider => providerSelect.add(new Option(`${provider.name} (${provider.code})`,provider.code)));
  } else {
    providerControl.hidden = true;
  }

  function geographyName() {
    return selectedProvider ? selectedProvider.name : nationalData.geography;
  }

  function routeFor(nodeId) {
    return selectedProvider?.routes?.[nodeId] || nationalData.routes[nodeId] || null;
  }

  function nationalRouteFor(nodeId) {
    return nationalData.routes[nodeId] || null;
  }

  function updateScope() {
    scopeLabel.textContent = `${geographyName()} · ECDS ${nationalData.period}`;
  }

  providerSelect.addEventListener("change",() => {
    selectedProvider = providerData?.providers?.find(provider => provider.code === providerSelect.value) || null;
    updateScope();
    refreshBadgeValues();
    const selectedNode = cy.$("node.selected-node").first();
    const nodeId = selectedNode.length ? selectedNode.id() : "ae-attendance";
    renderNodeDetails(NODE_BY_ID.get(nodeId));
    requestAnimationFrame(updateMetricPositions);
  });

  // ============================================================
  // 04. NUMBER CONTROLS AND BADGES
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

  const legendButton = el("toggleLegend");
  if (legendButton) {
    legendButton.insertAdjacentElement("afterend",numbersButton);
    numbersButton.insertAdjacentElement("afterend",providerControl);
    providerControl.insertAdjacentElement("afterend",scopeLabel);
  } else {
    toolbarControls.append(numbersButton,providerControl,scopeLabel);
  }

  Object.keys(nationalData.routes).forEach(nodeId => {
    if (!cy.getElementById(nodeId).length) return;
    const badge = document.createElement("button");
    badge.type = "button";
    badge.className = "node-metric-badge";
    badge.dataset.nodeId = nodeId;
    badge.addEventListener("click",() => selectNode(cy.getElementById(nodeId),{ centre:false }));
    metricLayer.append(badge);
    metricBadges.set(nodeId,badge);
  });

  function refreshBadgeValues() {
    metricBadges.forEach((badge,nodeId) => {
      const route = routeFor(nodeId);
      if (!route) {
        badge.classList.remove("is-visible");
        return;
      }
      const value = nodeId === "ae-attendance" ? compactCount(route.count) : formatPercent(route.percent);
      badge.innerHTML = `<strong>${value}</strong><span>${selectedProvider ? selectedProvider.code : nationalData.period}</span>`;
      badge.title = `${geographyName()}: ${formatCount(route.count)} attendances${nodeId === "ae-attendance" ? "" : ` (${formatPercent(route.percent)})`}`;
    });
  }

  function updateMetricPositions() {
    const zoom = cy.zoom();
    const showAtThisZoom = numbersVisible && zoom >= .34;

    metricBadges.forEach((badge,nodeId) => {
      const node = cy.getElementById(nodeId);
      const hiddenByPathway = node.hasClass("faded") || node.hasClass("timescale-faded");
      if (!node.length || !showAtThisZoom || hiddenByPathway || node.style("display") === "none") {
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

  // clearFocus is called by node, edge, loop, pathway and filter interactions.
  // Scheduling after it means the final set of faded nodes is used.
  const baseClearFocusForMetrics = clearFocus;
  clearFocus = function(...args) {
    const result = baseClearFocusForMetrics(...args);
    requestAnimationFrame(updateMetricPositions);
    return result;
  };

  cy.on("pan zoom position render",updateMetricPositions);
  window.addEventListener("resize",updateMetricPositions);

  // ============================================================
  // 05. COUNT, PERCENTAGE AND PROVIDER COMPARISON IN THE DRAWER
  // ============================================================
  renderNodeDetails = function(node) {
    baseRenderNodeDetails(node);
    const route = routeFor(node.id);
    const nationalRoute = nationalRouteFor(node.id);
    if (!route || !nationalRoute) return;

    const isTotal = node.id === "ae-attendance";
    const displayValue = isTotal ? compactCount(route.count) : formatPercent(route.percent);
    const nationalValue = isTotal ? compactCount(nationalRoute.count) : formatPercent(nationalRoute.percent);
    const difference = !isTotal && selectedProvider ? Number(route.percent) - Number(nationalRoute.percent) : null;
    const comparison = selectedProvider
      ? isTotal
        ? "Provider-submitted activity; this is not a resident-population rate."
        : `${Math.abs(difference).toFixed(2)} percentage points ${difference >= 0 ? "above" : "below"} England (${nationalValue}).`
      : isTotal
        ? "Annual ECDS attendance-source denominator."
        : `${formatPercent(route.percent)} of the England ECDS attendance-source total.`;

    const secondary = route.secondary ? `
      <div class="metric-secondary">
        <strong>${formatPercent(route.secondary.percent)} · ${formatCount(route.secondary.count)}</strong>
        <span>${route.secondary.label || nationalRoute.secondary?.label || "Arrived by ambulance"}</span>
        <p>${nationalRoute.secondary?.definition || "Arrival mode is separate from attendance source."}</p>
      </div>` : "";

    const suppressed = route.suppressed_component ? `<p class="metric-warning">At least one component value was suppressed in the public provider file.</p>` : "";
    const metricCard = document.createElement("section");
    metricCard.className = "operational-metric-card";
    metricCard.innerHTML = `
      <div class="operational-metric-heading">
        <div><p class="eyebrow teal">Published annual figure</p><strong>${displayValue}</strong></div>
        <span>${geographyName()}<br>${nationalData.period}</span>
      </div>
      <h3>${nationalRoute.label}</h3>
      <p class="metric-exact">${formatCount(route.count)} attendances</p>
      <p>${comparison}</p>
      ${secondary}
      ${suppressed}
      <p class="metric-note">${nationalRoute.definition}${nationalRoute.derived ? " This is a transparent grouping derived from published categories." : ""}</p>
      <a href="${nationalData.source_url}" target="_blank" rel="noopener">${nationalData.publication}</a>`;

    el("nodeDetails").prepend(metricCard);
  };

  updateScope();
  refreshBadgeValues();
  requestAnimationFrame(() => {
    updateMetricPositions();
    renderNodeDetails(NODE_BY_ID.get("ae-attendance"));
  });
})();
