// ============================================================
// 00. MAP-FIRST INTERACTION MODE
// ============================================================
// The map is currently an explorer rather than an editor. Node dragging is
// disabled so that accidental movement cannot disturb the carefully arranged
// layout. A future edit mode can re-enable movement together with persistence.

(() => {
  const panel = el("nodePanel");
  const resetButton = el("resetLayout");
  const toolbarHint = document.querySelector(".map-toolbar > p");

  if (!panel || !resetButton) return;

  cy.autoungrabify(true);
  cy.nodes().ungrabify();

  if (toolbarHint) toolbarHint.textContent = "Drag empty space to move · scroll to zoom · click a circle or relationship";

  // ============================================================
  // 01. CREATE DRAWER CONTROLS
  // ============================================================
  const toggleButton = document.createElement("button");
  toggleButton.id = "toggleDetails";
  toggleButton.className = "map-action details-toggle";
  toggleButton.type = "button";
  toggleButton.textContent = "Show details";
  toggleButton.setAttribute("aria-controls","nodePanel");
  toggleButton.setAttribute("aria-expanded","false");
  resetButton.insertAdjacentElement("afterend",toggleButton);

  const panelToolbar = document.createElement("div");
  panelToolbar.className = "detail-panel-toolbar";

  const minimiseButton = document.createElement("button");
  minimiseButton.className = "detail-panel-minimise";
  minimiseButton.type = "button";
  minimiseButton.textContent = "Minimise";
  panelToolbar.append(minimiseButton);
  panel.prepend(panelToolbar);

  // ============================================================
  // 02. OPEN AND CLOSE THE DETAILS DRAWER
  // ============================================================
  function setPanelOpen(isOpen) {
    panel.classList.toggle("is-open",isOpen);
    panel.setAttribute("aria-hidden",String(!isOpen));
    toggleButton.classList.toggle("active",isOpen);
    toggleButton.textContent = isOpen ? "Hide details" : "Show details";
    toggleButton.setAttribute("aria-expanded",String(isOpen));
  }

  toggleButton.addEventListener("click",() => setPanelOpen(!panel.classList.contains("is-open")));
  minimiseButton.addEventListener("click",() => setPanelOpen(false));

  // ============================================================
  // 03. OPEN DETAILS ONLY WHEN THEY ARE NEEDED
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

  // The page should open with the full map visible and the interpretation
  // available only when requested.
  setPanelOpen(false);
})();