// ============================================================
// 00. COMPACT LANDSCAPE A&E MANAGEMENT MAP
// ============================================================
// Keep the existing content and relationships, but use the available canvas
// efficiently. The network is deliberately wider than it is tall so it fits a
// desktop screen more naturally, while collision resolution keeps circles apart.

(() => {
  const RING_SCALE = { 0:1, 1:.82, 2:.72 };
  const LANDSCAPE_SCALE = { x:1.28, y:.72 };
  const FIT_PADDING = { home:18, whole:18, branch:28, loop:32, timescale:28 };
  const COLLISION_GAP = { default:14, major:20 };
  const COLLISION_ITERATIONS = 160;

  // ============================================================
  // 01. MAKE LABELS FIT THEIR CIRCLES
  // ============================================================
  // Detailed factors need more internal space than the first prototype gave
  // them. Their font is reduced slightly so long management statements wrap
  // inside the circle instead of spilling beyond it.
  cy.batch(() => {
    cy.nodes().forEach(node => {
      const ring = node.data("ring");

      if (ring === 0) {
        node.data("size",174);
        node.data("fontSize",17);
      }

      if (ring === 1) {
        node.data("size",128);
        node.data("fontSize",12.2);
      }

      if (ring === 2) {
        node.data("size",96);
        node.data("fontSize",9.1);
      }
    });
  });

  // ============================================================
  // 02. IMPROVE NODE AND RELATIONSHIP LABELS
  // ============================================================
  // Relationship labels only appear for a hovered, selected or loop edge. A
  // solid white label card keeps the wording readable over the network lines.
  cy.style()
    .selector("node[ring=0]")
      .style({ "text-max-width":142 })
    .selector("node[ring=1]")
      .style({ "text-max-width":106,"line-height":1.02 })
    .selector("node[ring=2]")
      .style({ "text-max-width":78,"line-height":1.0,"font-weight":680 })
    .selector("edge")
      .style({
        "color":"#294650",
        "font-size":10.5,
        "font-weight":750,
        "text-background-color":"#ffffff",
        "text-background-opacity":1,
        "text-background-padding":"6px",
        "text-background-shape":"round-rectangle",
        "text-border-color":"#c8d6d4",
        "text-border-width":1,
        "text-border-opacity":1,
        "text-rotation":"none",
        "text-wrap":"wrap",
        "text-max-width":180,
        "text-margin-y":-13
      })
    .selector(".related-edge")
      .style({ "z-index":45 })
    .selector(".hover-edge")
      .style({ "z-index":42 })
    .selector(".loop-edge")
      .style({ "z-index":48 })
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
  // Nodes retain a gentle pull towards their intended landscape position,
  // while overlapping pairs push one another apart. The result is stable and
  // repeatable rather than changing each time the page opens.
  function resolveCollisions(anchors) {
    const nodes = AE_MAP_NODES.map((item,index) => ({
      id:item.id,
      index,
      ring:item.ring,
      size:Number(cy.getElementById(item.id).data("size")) || 96,
      anchor:{ ...anchors.get(item.id) },
      position:{ ...anchors.get(item.id) }
    }));

    const mobility = ring => ring === 0 ? 0 : ring === 1 ? .58 : 1;
    const spring = ring => ring === 1 ? .032 : ring === 2 ? .016 : 0;

    for (let iteration=0;iteration<COLLISION_ITERATIONS;iteration += 1) {
      for (let firstIndex=0;firstIndex<nodes.length;firstIndex += 1) {
        const first = nodes[firstIndex];

        for (let secondIndex=firstIndex + 1;secondIndex<nodes.length;secondIndex += 1) {
          const second = nodes[secondIndex];
          let dx = second.position.x - first.position.x;
          let dy = second.position.y - first.position.y;
          let distance = Math.hypot(dx,dy);

          // A deterministic direction avoids random movement when two centres
          // begin in exactly the same position.
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

          const firstShare = firstMobility / totalMobility;
          const secondShare = secondMobility / totalMobility;

          first.position.x -= unitX * overlap * firstShare;
          first.position.y -= unitY * overlap * firstShare;
          second.position.x += unitX * overlap * secondShare;
          second.position.y += unitY * overlap * secondShare;
        }
      }

      // Pull displaced nodes gently back towards the branch where they belong.
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
  // 05. USE SMALLER FIT MARGINS
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
  // 06. APPLY THE LANDSCAPE STARTING VIEW
  // ============================================================
  requestAnimationFrame(() => {
    cy.resize();
    showHome(0);
  });
})();