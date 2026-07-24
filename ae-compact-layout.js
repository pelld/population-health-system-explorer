// ============================================================
// 00. LANDSCAPE DETERMINANTS MAP
// ============================================================
// The larger direct-determinant ring is spread across a wide ellipse. Detailed
// upstream determinants remain smaller and collision resolution keeps all circles
// apart without allowing the layout to change between page loads.

(() => {
  const RING_SCALE = { 0:1, 1:.96, 2:.80 };
  const LANDSCAPE_SCALE = { x:1.58, y:.84 };
  const FIT_PADDING = { home:16, whole:16, branch:26, loop:30, timescale:26 };
  const COLLISION_GAP = { default:12, major:17 };
  const COLLISION_ITERATIONS = 190;

  // ============================================================
  // 01. SIZE THE THREE LEVELS
  // ============================================================
  cy.batch(() => {
    cy.nodes().forEach(node => {
      const ring = node.data("ring");

      if (ring === 0) {
        node.data("size",162);
        node.data("fontSize",17);
      }

      if (ring === 1) {
        node.data("size",114);
        node.data("fontSize",10.8);
      }

      if (ring === 2) {
        node.data("size",84);
        node.data("fontSize",8.6);
      }
    });
  });

  // ============================================================
  // 02. KEEP NODE LABELS READABLE; MOVE EDGE WORDING TO HTML
  // ============================================================
  cy.style()
    .selector("node[ring=0]")
      .style({ "text-max-width":132,"line-height":1.04 })
    .selector("node[ring=1]")
      .style({ "text-max-width":94,"line-height":1.0 })
    .selector("node[ring=2]")
      .style({ "text-max-width":68,"line-height":.98,"font-weight":680 })
    .selector("edge")
      .style({ "label":"" })
    .selector(".related-edge")
      .style({ "label":"","z-index":45 })
    .selector(".hover-edge")
      .style({ "label":"","z-index":42 })
    .selector(".loop-edge")
      .style({ "label":"","z-index":48 })
    .update();

  // ============================================================
  // 03. CREATE LANDSCAPE ANCHOR POSITIONS
  // ============================================================
  function landscapePosition(node) {
    if (node.ring === 0) return { ...MAP_CENTRE };

    const radians = (node.angle * Math.PI) / 180;
    const radius = node.radius * (RING_SCALE[node.ring] || 1);

    return {
      x:MAP_CENTRE.x + (Math.cos(radians) * radius * LANDSCAPE_SCALE.x),
      y:MAP_CENTRE.y + (Math.sin(radians) * radius * LANDSCAPE_SCALE.y)
    };
  }

  // ============================================================
  // 04. SEPARATE OVERLAPPING CIRCLES
  // ============================================================
  function resolveCollisions(anchors) {
    const nodes = AE_MAP_NODES.map((item,index) => ({
      id:item.id,
      index,
      ring:item.ring,
      size:Number(cy.getElementById(item.id).data("size")) || 84,
      anchor:{ ...anchors.get(item.id) },
      position:{ ...anchors.get(item.id) }
    }));

    const mobility = ring => ring === 0 ? 0 : ring === 1 ? .62 : 1;
    const spring = ring => ring === 1 ? .030 : ring === 2 ? .014 : 0;

    for (let iteration=0;iteration<COLLISION_ITERATIONS;iteration += 1) {
      for (let firstIndex=0;firstIndex<nodes.length;firstIndex += 1) {
        const first = nodes[firstIndex];

        for (let secondIndex=firstIndex + 1;secondIndex<nodes.length;secondIndex += 1) {
          const second = nodes[secondIndex];
          let dx = second.position.x - first.position.x;
          let dy = second.position.y - first.position.y;
          let distance = Math.hypot(dx,dy);

          if (distance < .001) {
            const angle = ((first.index * 37) + (second.index * 53)) * (Math.PI / 180);
            dx = Math.cos(angle);
            dy = Math.sin(angle);
            distance = 1;
          }

          const gap = first.ring <= 1 || second.ring <= 1 ? COLLISION_GAP.major : COLLISION_GAP.default;
          const minimumDistance = ((first.size + second.size) / 2) + gap;

          if (distance >= minimumDistance) continue;

          const overlap = minimumDistance - distance;
          const unitX = dx / distance;
          const unitY = dy / distance;
          const firstMobility = mobility(first.ring);
          const secondMobility = mobility(second.ring);
          const totalMobility = firstMobility + secondMobility;

          if (totalMobility === 0) continue;

          first.position.x -= unitX * overlap * (firstMobility / totalMobility);
          first.position.y -= unitY * overlap * (firstMobility / totalMobility);
          second.position.x += unitX * overlap * (secondMobility / totalMobility);
          second.position.y += unitY * overlap * (secondMobility / totalMobility);
        }
      }

      nodes.forEach(node => {
        const pull = spring(node.ring);
        node.position.x += (node.anchor.x - node.position.x) * pull;
        node.position.y += (node.anchor.y - node.position.y) * pull;
      });
    }

    return new Map(nodes.map(node => [node.id,node.position]));
  }

  const anchorPositions = new Map(AE_MAP_NODES.map(node => [node.id,landscapePosition(node)]));
  const resolvedPositions = resolveCollisions(anchorPositions);

  nodePositions.clear();

  cy.batch(() => {
    resolvedPositions.forEach((position,id) => {
      nodePositions.set(id,position);
      cy.getElementById(id).position(position);
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
  // 05. VIEW STATES
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
    const relevantDirectNodes = cy.nodes("[ring = 1]").filter(node => node.incomers("edge").some(edge => relevantOuterNodes.contains(edge.source())));
    const visible = relevantOuterNodes.union(relevantDirectNodes).union(cy.getElementById("ae-attendance"));
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
  // 06. APPLY THE REVISED STARTING VIEW
  // ============================================================
  requestAnimationFrame(() => {
    cy.resize();
    showHome(0);
  });
})();