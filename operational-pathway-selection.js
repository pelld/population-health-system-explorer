// ============================================================
// 00. OPERATIONAL PATHWAY SELECTION
// ============================================================
// Clicking a high-level route should show its complete measurable branch rather
// than only the nodes one relationship away from the selected circle.

(() => {
  const baseSelectNodeForPathways = selectNode;

  const PATHWAYS = {
    "ambulance-ae-route":[
      "ambulance-calls",
      "ambulance-incidents",
      "ambulance-hear-treat",
      "ambulance-response",
      "ambulance-alternative",
      "ambulance-conveyed-ae",
      "ambulance-other-conveyance",
      "ambulance-ae-route",
      "ae-attendance"
    ],
    "nhs111-ae-route":[
      "nhs111-contacts",
      "nhs111-triage",
      "nhs111-ae-disposition",
      "nhs111-direct-booking",
      "nhs111-ae-route",
      "ae-attendance"
    ]
  };

  selectNode = function(node,{ centre=false }={}) {
    const pathwayIds = PATHWAYS[node.id()];
    if (!pathwayIds) return baseSelectNodeForPathways(node,{ centre });

    // Preserve the existing panel-opening and detail-rendering behaviour first.
    baseSelectNodeForPathways(node,{ centre:false });

    const pathwayNodes = cy.collection(
      pathwayIds
        .map(id => cy.getElementById(id)[0])
        .filter(Boolean)
    );
    const pathwayEdges = cy.edges().filter(edge => pathwayNodes.contains(edge.source()) && pathwayNodes.contains(edge.target()));
    const pathway = pathwayNodes.union(pathwayEdges);

    cy.elements().removeClass("selected-node related-node related-edge faded");
    cy.elements().not(pathway).addClass("faded");
    node.addClass("selected-node");
    pathwayNodes.not(node).addClass("related-node");
    pathwayEdges.addClass("related-edge");

    if (centre) {
      cy.animate({ fit:{ eles:pathwayNodes,padding:80 } },{ duration:440,easing:"ease-in-out-cubic" });
    }
  };
})();

// ============================================================
// 01. LOAD THE NHS 111 / IUC PRESENTATION LAYER
// ============================================================
// This loader runs after all static scripts, including the ambulance layer, so the
// context-specific selectors can hand over cleanly without changing index.html.

window.addEventListener("load",() => {
  if (!document.querySelector('link[href="iuc-metrics.css"]')) {
    const stylesheet = document.createElement("link");
    stylesheet.rel = "stylesheet";
    stylesheet.href = "iuc-metrics.css";
    document.head.append(stylesheet);
  }

  if (!document.querySelector('script[src="iuc-metrics.js"]')) {
    const script = document.createElement("script");
    script.src = "iuc-metrics.js";
    script.async = false;
    document.body.append(script);
  }
});
