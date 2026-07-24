// ============================================================
// 00. MAP-FIRST INTERACTION MODE
// ============================================================
// The map is currently an explorer rather than an editor. Node dragging is
// disabled so that accidental movement cannot disturb the carefully arranged
// layout. A future edit mode can re-enable movement together with persistence.

(() => {
  const panel = el("nodePanel");
  const legend = el("mapKey");
  const resetButton = el("resetLayout");
  const toolbarHint = document.querySelector(".map-toolbar > p");

  if (!panel || !resetButton) return;

  cy.autoungrabify(true);
  cy.nodes().ungrabify();

  if (toolbarHint) toolbarHint.textContent = "Drag empty space to move · scroll to zoom · click a circle or relationship";

  // ============================================================
  // 01. CREATE DETAILS DRAWER CONTROLS
  // ============================================================
  const detailsToggle = document.createElement("button");
  detailsToggle.id = "toggleDetails";
  detailsToggle.className = "map-action details-toggle";
  detailsToggle.type = "button";
  detailsToggle.textContent = "Show details";
  detailsToggle.setAttribute("aria-controls","nodePanel");
  detailsToggle.setAttribute("aria-expanded","false");
  resetButton.insertAdjacentElement("afterend",detailsToggle);

  const panelToolbar = document.createElement("div");
  panelToolbar.className = "detail-panel-toolbar";

  const minimiseButton = document.createElement("button");
  minimiseButton.className = "detail-panel-minimise";
  minimiseButton.type = "button";
  minimiseButton.textContent = "Minimise";
  panelToolbar.append(minimiseButton);
  panel.prepend(panelToolbar);

  // ============================================================
  // 02. CREATE LEGEND CONTROL
  // ============================================================
  const legendToggle = document.createElement("button");
  legendToggle.id = "toggleLegend";
  legendToggle.className = "map-action legend-toggle";
  legendToggle.type = "button";
  legendToggle.textContent = "Show legend";
  legendToggle.setAttribute("aria-controls","mapKey");
  legendToggle.setAttribute("aria-expanded","false");
  detailsToggle.insertAdjacentElement("afterend",legendToggle);

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
  // 05. OPEN DETAILS ONLY WHEN THEY ARE NEEDED
  // ============================================================
  // Existing event handlers call these global functions at interaction time,
  // so wrapping them here keeps the underlying map code unchanged.
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
  };

  const baseShowWholePicture = showWholePicture;
  showWholePicture = function(duration=500) {
    baseShowWholePicture(duration);
    setPanelOpen(false);
  };

  // The page should open with the full map visible. Details and the legend are
  // available on demand rather than permanently covering the network.
  setPanelOpen(false);
  setLegendOpen(false);
})();