// ============================================================
// 00. PURPOSE
// ============================================================
// Make the causal relationships—not the category boxes—the main visual layer.
// This file runs after app.js so it can enhance the existing Cytoscape map
// without replacing the evidence, modal or intervention features.

(() => {
  // ============================================================
  // 01. COMPACT THE VIRTUAL CANVAS
  // ============================================================
  const COMPACT_GEOMETRY = {
    originX:330,
    originY:280,
    columnGap:650,
    rowGap:520,
    factorColumnGap:180,
    factorRowGap:82,
    factorsPerRow:3
  };

  const COMPACT_HOME = {
    x:COMPACT_GEOMETRY.originX + (COMPACT_GEOMETRY.columnGap * 2),
    y:COMPACT_GEOMETRY.originY + (COMPACT_GEOMETRY.rowGap / 2),
    zoom:.72
  };

  function buildCompactPositions() {
    const positions = new Map();

    MAP_DOMAINS.forEach(domain => {
      const domainColumn = Math.round(domain.x / 20);
      const domainRow = domain.y < 25 ? 0 : 1;
      const domainCentreX = COMPACT_GEOMETRY.originX + (domainColumn * COMPACT_GEOMETRY.columnGap);
      const domainCentreY = COMPACT_GEOMETRY.originY + (domainRow * COMPACT_GEOMETRY.rowGap);
      const factorRows = Math.ceil(domain.factors.length / COMPACT_GEOMETRY.factorsPerRow);

      domain.factors.forEach(([id],factorIndex) => {
        const factorColumn = factorIndex % COMPACT_GEOMETRY.factorsPerRow;
        const factorRow = Math.floor(factorIndex / COMPACT_GEOMETRY.factorsPerRow);
        const position = {
          x:domainCentreX + ((factorColumn - ((COMPACT_GEOMETRY.factorsPerRow - 1) / 2)) * COMPACT_GEOMETRY.factorColumnGap),
          y:domainCentreY + ((factorRow - ((factorRows - 1) / 2)) * COMPACT_GEOMETRY.factorRowGap)
        };

        positions.set(id,position);
        FACTOR_POSITIONS.set(id,position);
      });
    });

    cy.batch(() => positions.forEach((position,id) => cy.getElementById(id).position(position)));
  }

  // Replace only the viewport functions. Existing toolbar listeners resolve
  // these functions when clicked, so Home and Reset use the compact layout.
  showHome = function(duration=450) {
    clearGraphFocus();
    setActiveLayer();
    renderNodeDetails("determinants");
    moveToPosition(COMPACT_HOME,COMPACT_HOME.zoom,duration);
  };

  showWholeSystem = function() {
    clearGraphFocus();
    renderNodeDetails("determinants");
    cy.animate({ fit:{ eles:cy.elements(),padding:55 } },{ duration:500,easing:"ease-in-out-cubic" });
  };

  // ============================================================
  // 02. MAKE RELATIONSHIPS VISIBLE
  // ============================================================
  cy.style()
    .selector("node[kind='domain']")
      .style({
        "background-opacity":.025,
        "border-width":1.5,
        "border-opacity":.25,
        "font-size":18,
        "text-background-opacity":.9,
        "padding":"30px"
      })
    .selector("edge")
      .style({
        "width":1.25,
        "opacity":.13,
        "target-arrow-shape":"triangle",
        "arrow-scale":.55,
        "curve-style":"unbundled-bezier",
        "control-point-distances":14
      })
    .selector("edge[type='core']")
      .style({ "opacity":.22,"width":1.5 })
    .selector("edge[type='feedback']")
      .style({ "opacity":.28,"width":1.7 })
    .selector("edge[type='resource']")
      .style({ "opacity":.16 })
    .selector("edge[type='context']")
      .style({ "opacity":.105 })
    .selector(".hover-factor")
      .style({ "border-width":4.5,"shadow-opacity":.24,"z-index":35 })
    .selector(".hover-neighbour")
      .style({ "border-width":3.5,"background-color":"#f2faf8","z-index":24 })
    .selector(".hover-edge")
      .style({ "opacity":.94,"width":3,"label":"data(label)","target-arrow-shape":"triangle","z-index":28 })
    .update();

  // Hover provides a quick preview; clicking keeps the neighbourhood selected.
  cy.on("mouseover","node[kind='factor']",event => {
    const node = event.target;
    node.addClass("hover-factor");
    node.neighborhood("node").addClass("hover-neighbour");
    node.connectedEdges().addClass("hover-edge");
  });

  cy.on("mouseout","node[kind='factor']",event => {
    const node = event.target;
    node.removeClass("hover-factor");
    node.neighborhood("node").removeClass("hover-neighbour");
    node.connectedEdges().removeClass("hover-edge");
  });

  // Use dots only at the genuinely distant overview level.
  function updateCompactZoomDetail() {
    cy.nodes("node[kind='factor']").toggleClass("overview-factor",cy.zoom() < .48);
  }

  cy.on("zoom",updateCompactZoomDetail);

  // ============================================================
  // 03. SHOW RELATIONSHIPS AS READABLE TEXT
  // ============================================================
  function removeRelationshipPanel() {
    document.getElementById("directRelationships")?.remove();
  }

  function relationshipButton(edge,selectedNode,outgoing) {
    const data = edge.data();
    const otherNode = outgoing ? edge.target() : edge.source();
    const sourceLabel = outgoing ? selectedNode.data("label") : otherNode.data("label");
    const targetLabel = outgoing ? otherNode.data("label") : selectedNode.data("label");
    const evidenceLabel = CLAIM_LABELS[data.evidence] || CLAIM_LABELS.hypothesis;

    return `<button class="relationship-row" data-related-factor="${otherNode.id()}">
      <span class="relationship-statement"><strong>${sourceLabel}</strong> <em>${data.label}</em> <strong>${targetLabel}</strong></span>
      <span class="claim-badge ${data.evidence || "hypothesis"}">${evidenceLabel}</span>
    </button>`;
  }

  function renderDirectRelationships(node) {
    removeRelationshipPanel();

    const outgoing = node.outgoers("edge").sort((a,b) => a.target().data("label").localeCompare(b.target().data("label")));
    const incoming = node.incomers("edge").sort((a,b) => a.source().data("label").localeCompare(b.source().data("label")));
    const outgoingRows = outgoing.map(edge => relationshipButton(edge,node,true)).join("");
    const incomingRows = incoming.map(edge => relationshipButton(edge,node,false)).join("");

    const html = `<section id="directRelationships" class="relationship-panel">
      <div class="relationship-panel-heading">
        <div><p class="eyebrow teal">Causal neighbourhood</p><h3>Direct relationships</h3></div>
        <span>${incoming.length} into · ${outgoing.length} out</span>
      </div>
      <div class="relationship-columns">
        <div><h4>What may influence this</h4>${incomingRows || "<p class='empty-relationships'>No incoming relationship has yet been mapped.</p>"}</div>
        <div><h4>What this may change</h4>${outgoingRows || "<p class='empty-relationships'>No outgoing relationship has yet been mapped.</p>"}</div>
      </div>
    </section>`;

    el("nodeDetails").insertAdjacentHTML("afterend",html);
  }

  // Give the new factors their own explanatory trees instead of inheriting a
  // generic domain description.
  ["multimorbidity","treatment-complexity","appointment-burden","care-cost"].forEach(id => {
    if (FACTOR_INDEX.has(id)) FACTOR_INDEX.get(id).detailKey = id;
  });

  const baseClearGraphFocus = clearGraphFocus;
  clearGraphFocus = function() {
    baseClearGraphFocus();
    removeRelationshipPanel();
  };

  const baseSelectFactor = selectFactor;
  selectFactor = function(node,options={}) {
    baseSelectFactor(node,options);
    renderDirectRelationships(node);
  };

  el("nodePanel").addEventListener("click",event => {
    const relationship = event.target.closest("[data-related-factor]");
    if (!relationship) return;
    const node = cy.getElementById(relationship.dataset.relatedFactor);
    if (node.length) selectFactor(node,{ centre:true });
  });

  // ============================================================
  // 04. APPLY THE ENHANCED VIEW
  // ============================================================
  buildCompactPositions();
  requestAnimationFrame(() => {
    cy.resize();
    showHome(0);
    updateCompactZoomDetail();
  });
})();
