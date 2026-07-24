// ============================================================
// 00. MAP-FIRST INTERACTION MODE
// ============================================================
// The map is an explorer rather than an editor. Nodes are locked in place.
// Details, the legend and relationship wording appear only when requested.

(() => {
  const panel = el("nodePanel");
  const legend = el("mapKey");
  const resetButton = el("resetLayout");
  const map = el("systemMap");
  const toolbarHint = document.querySelector(".map-toolbar > p");

  if (!panel || !resetButton || !map) return;

  cy.autoungrabify(true);
  cy.nodes().ungrabify();

  if (toolbarHint) toolbarHint.textContent = "Drag empty space to move · scroll to zoom · click a circle or relationship";

  // ============================================================
  // 01. CREATE DETAILS AND LEGEND CONTROLS
  // ============================================================
  const detailsToggle = document.createElement("button");
  detailsToggle.id = "toggleDetails";
  detailsToggle.className = "map-action details-toggle";
  detailsToggle.type = "button";
  detailsToggle.textContent = "Show details";
  detailsToggle.setAttribute("aria-controls","nodePanel");
  detailsToggle.setAttribute("aria-expanded","false");
  resetButton.insertAdjacentElement("afterend",detailsToggle);

  const legendToggle = document.createElement("button");
  legendToggle.id = "toggleLegend";
  legendToggle.className = "map-action legend-toggle";
  legendToggle.type = "button";
  legendToggle.textContent = "Show legend";
  legendToggle.setAttribute("aria-controls","mapKey");
  legendToggle.setAttribute("aria-expanded","false");
  detailsToggle.insertAdjacentElement("afterend",legendToggle);

  const panelToolbar = document.createElement("div");
  panelToolbar.className = "detail-panel-toolbar";

  const minimiseButton = document.createElement("button");
  minimiseButton.className = "detail-panel-minimise";
  minimiseButton.type = "button";
  minimiseButton.textContent = "Minimise";
  panelToolbar.append(minimiseButton);
  panel.prepend(panelToolbar);

  // ============================================================
  // 02. CREATE HTML RELATIONSHIP TOOLTIP
  // ============================================================
  // Cytoscape edge labels are part of the graph canvas and can be covered by
  // nodes. This HTML element sits above the entire graph instead.
  const relationshipTooltip = document.createElement("div");
  relationshipTooltip.className = "relationship-tooltip";
  relationshipTooltip.setAttribute("role","status");
  relationshipTooltip.setAttribute("aria-live","polite");
  map.append(relationshipTooltip);

  function relationshipText(edge) {
    const source = NODE_BY_ID.get(edge.source().id())?.label || edge.source().data("label");
    const target = NODE_BY_ID.get(edge.target().id())?.label || edge.target().data("label");
    return `${source} — ${edge.data("label")} — ${target}`;
  }

  function positionRelationshipTooltip(event) {
    const point = event.renderedPosition || event.target.renderedMidpoint();
    if (!point) return;

    relationshipTooltip.style.left = `${point.x}px`;
    relationshipTooltip.style.top = `${point.y}px`;

    requestAnimationFrame(() => {
      const halfWidth = relationshipTooltip.offsetWidth / 2;
      const left = Math.min(Math.max(point.x,halfWidth + 10),map.clientWidth - halfWidth - 10);
      const top = Math.max(point.y,relationshipTooltip.offsetHeight + 18);
      relationshipTooltip.style.left = `${left}px`;
      relationshipTooltip.style.top = `${top}px`;
    });
  }

  function showRelationshipTooltip(event) {
    relationshipTooltip.textContent = relationshipText(event.target);
    relationshipTooltip.classList.add("is-visible");
    positionRelationshipTooltip(event);
  }

  function hideRelationshipTooltip() {
    relationshipTooltip.classList.remove("is-visible");
  }

  cy.on("mouseover","edge",event => {
    event.target.addClass("hover-edge");
    showRelationshipTooltip(event);
  });
  cy.on("mousemove","edge",positionRelationshipTooltip);
  cy.on("mouseout","edge",event => {
    event.target.removeClass("hover-edge");
    hideRelationshipTooltip();
  });
  cy.on("pan zoom",hideRelationshipTooltip);
  cy.on("tap","node",hideRelationshipTooltip);
  cy.on("tap",event => { if (event.target === cy) hideRelationshipTooltip(); });

  // ============================================================
  // 03. OPEN AND CLOSE THE DETAILS DRAWER
  // ============================================================
  function setPanelOpen(isOpen) {
    panel.classList.toggle("is-open",isOpen);
    panel.setAttribute("aria-hidden",String(!isOpen));
    detailsToggle.classList.toggle("active",isOpen);
    detailsToggle.textContent = isOpen ? "Hide details" : "Show details";
    detailsToggle.setAttribute("aria-expanded",String(isOpen));
  }

  detailsToggle.addEventListener("click",() => setPanelOpen(!panel.classList.contains("is-open")));
  minimiseButton.addEventListener("click",() => setPanelOpen(false));

  // ============================================================
  // 04. OPEN AND CLOSE THE LEGEND
  // ============================================================
  function setLegendOpen(isOpen) {
    if (!legend) return;

    legend.classList.toggle("is-collapsed",!isOpen);
    legend.setAttribute("aria-hidden",String(!isOpen));
    legendToggle.classList.toggle("active",isOpen);
    legendToggle.textContent = isOpen ? "Hide legend" : "Show legend";
    legendToggle.setAttribute("aria-expanded",String(isOpen));
  }

  legendToggle.addEventListener("click",() => setLegendOpen(legend?.classList.contains("is-collapsed")));

  // ============================================================
  // 05. OPEN DETAILS ONLY WHEN NEEDED
  // ============================================================
  const baseSelectNode = selectNode;
  selectNode = function(node,options={}) {
    baseSelectNode(node,options);
    setPanelOpen(true);
  };

  const baseRenderEdgeDetails = renderEdgeDetails;
  renderEdgeDetails = function(edge) {
    baseRenderEdgeDetails(edge);
    setPanelOpen(true);
  };

  const baseShowHome = showHome;
  showHome = function(duration=450) {
    baseShowHome(duration);
    setPanelOpen(false);
    hideRelationshipTooltip();
  };

  const baseShowWholePicture = showWholePicture;
  showWholePicture = function(duration=500) {
    baseShowWholePicture(duration);
    setPanelOpen(false);
    hideRelationshipTooltip();
  };

  setPanelOpen(false);
  setLegendOpen(false);
})();