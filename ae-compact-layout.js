// ============================================================
// 00. COMPACT A&E MANAGEMENT MAP
// ============================================================
// Keep the existing content and relationships, but use the available canvas
// more efficiently. The first explanatory ring is pulled inward moderately;
// detailed factors are pulled inward further because that is where most of the
// previous empty space occurred.

(() => {
  const RING_SCALE = { 0:1, 1:.80, 2:.68 };
  const FIT_PADDING = { home:34, whole:30, branch:44, loop:48, timescale:44 };

  // ============================================================
  // 01. RECALCULATE ALL NODE POSITIONS
  // ============================================================
  function compactPosition(node) {
    if (node.ring === 0) return { ...MAP_CENTRE };
    const radians = (node.angle * Math.PI) / 180;
    const radius = node.radius * (RING_SCALE[node.ring] || 1);
    return {
      x:MAP_CENTRE.x + (Math.cos(radians) * radius),
      y:MAP_CENTRE.y + (Math.sin(radians) * radius)
    };
  }

  nodePositions.clear();
  cy.batch(() => {
    AE_MAP_NODES.forEach(node => {
      const position = compactPosition(node);
      nodePositions.set(node.id,position);
      cy.getElementById(node.id).position(position);
    });
  });

  function fitElements(elements,padding,duration=450) {
    if (duration === 0) {
      cy.fit(elements,padding);
      return;
    }
    cy.animate({ fit:{ eles:elements,padding } },{ duration,easing:"ease-in-out-cubic" });
  }

  // ============================================================
  // 02. REPLACE THE GENEROUS FIT MARGINS
  // ============================================================
  showHome = function(duration=450) {
    clearFocus();
    setActiveButton(".layer");
    const homeNodes = cy.nodes("[ring <= 1]");
    fitElements(homeNodes,FIT_PADDING.home,duration);
    renderNodeDetails(NODE_BY_ID.get("ae-attendance"));
  };

  showWholePicture = function(duration=500) {
    clearFocus({ keepTimescale:false });
    activeTimescale = "all";
    setActiveButton(".timescale-button");
    fitElements(cy.elements(),FIT_PADDING.whole,duration);
    renderNodeDetails(NODE_BY_ID.get("ae-attendance"));
  };

  applyTimescaleFilter = function(timescale,button) {
    activeTimescale = timescale;
    clearFocus({ keepTimescale:false });
    setActiveButton(".timescale-button",button);
    const relevantOuterNodes = cy.nodes().filter(node => node.data("ring") === 2 && node.data("timescale") === timescale);
    const relevantFirstRing = cy.nodes("[ring = 1]").filter(node => node.incomers("edge").some(edge => relevantOuterNodes.contains(edge.source())));
    const visible = relevantOuterNodes.union(relevantFirstRing).union(cy.getElementById("ae-attendance"));
    const visibleEdges = cy.edges().filter(edge => visible.contains(edge.source()) && visible.contains(edge.target()));
    cy.elements().not(visible.union(visibleEdges)).addClass("timescale-faded");
    fitElements(visible,FIT_PADDING.timescale,450);
    renderTimescaleOverview(timescale,relevantOuterNodes);
  };

  selectNode = function(node,{ centre=false }={}) {
    clearFocus();
    const neighbourhood = node.closedNeighborhood();
    cy.elements().not(neighbourhood).addClass("faded");
    node.addClass("selected-node");
    node.neighborhood("node").addClass("related-node");
    node.connectedEdges().addClass("related-edge");
    renderNodeDetails(NODE_BY_ID.get(node.id()));
    if (centre) fitElements(neighbourhood,FIT_PADDING.branch,420);
  };

  showLoop = function(loop) {
    if (!loop) return;
    clearFocus();
    const nodes = cy.collection(loop.nodes.map(id => cy.getElementById(id)[0]).filter(Boolean));
    const edges = cy.edges().filter(edge => nodes.contains(edge.source()) && nodes.contains(edge.target()));
    cy.elements().not(nodes.union(edges)).addClass("faded");
    nodes.addClass("loop-node");
    edges.addClass("loop-edge");
    fitElements(nodes,FIT_PADDING.loop,480);
    el("nodeTitle").textContent = `${loop.type === "R" ? "Reinforcing" : "Balancing"} loop: ${loop.title}`;
    el("nodeSummary").textContent = loop.explanation;
    el("nodeDetails").innerHTML = `<div class="management-grid"><section class="management-card"><strong>Included factors</strong><p>${loop.nodes.map(id => NODE_BY_ID.get(id)?.label || id).join(" → ")}</p></section><section class="management-card caution"><strong>Interpretation</strong><p>This is a proposed feedback structure. Strength, timing and local importance still need to be tested.</p></section></div>`;
    el("whyTree").innerHTML = "";
    document.getElementById("directRelationships")?.remove();
  };

  // ============================================================
  // 03. APPLY THE COMPACT STARTING VIEW
  // ============================================================
  requestAnimationFrame(() => {
    cy.resize();
    showHome(0);
  });
})();