// ============================================================
// 00. HELPERS, LABELS AND SHARED CONSTANTS
// ============================================================
const el = id => document.getElementById(id);
const CLAIM_LABELS = { published:"Published evidence", official:"Official definition/data", hypothesis:"Hypothesis to test", gap:"Known gap" };
const MAP_CENTRE = { x:930,y:650 };
const NODE_BY_ID = new Map(AE_MAP_NODES.map(node => [node.id,node]));
const DOMAIN_BY_ID = new Map(Object.entries(AE_DOMAINS));
const graphElements = [];
const nodePositions = new Map();
let activeTimescale = "all";

function polarPosition(node) {
  if (node.ring === 0) return { ...MAP_CENTRE };
  const radians = (node.angle * Math.PI) / 180;
  return { x:MAP_CENTRE.x + (Math.cos(radians) * node.radius),y:MAP_CENTRE.y + (Math.sin(radians) * node.radius) };
}

function nodeSize(node) {
  if (node.ring === 0) return 166;
  if (node.ring === 1) return 118;
  return 78;
}

function nodeFontSize(node) {
  if (node.ring === 0) return 17;
  if (node.ring === 1) return 12.5;
  return 10.3;
}

function setActiveButton(selector,activeButton=null) {
  document.querySelectorAll(selector).forEach(button => button.classList.toggle("active",button === activeButton));
}

// ============================================================
// 01. BUILD THE FREE-FLOATING MANAGEMENT NETWORK
// ============================================================
AE_MAP_NODES.forEach(node => {
  const domain = DOMAIN_BY_ID.get(node.domain);
  const position = polarPosition(node);
  nodePositions.set(node.id,position);
  graphElements.push({
    data:{
      id:node.id,
      label:node.label,
      domain:node.domain,
      domainLabel:domain.label,
      colour:domain.colour,
      ring:node.ring,
      size:nodeSize(node),
      fontSize:nodeFontSize(node),
      timescale:node.timescale,
      evidence:node.evidence
    },
    position
  });
});

AE_MAP_LINKS.forEach((link,index) => {
  graphElements.push({
    data:{
      id:`ae-edge-${index}`,
      source:link.source,
      target:link.target,
      label:link.label,
      polarity:link.polarity,
      evidence:link.evidence,
      sources:link.sources
    }
  });
});

// ============================================================
// 02. CYTOSCAPE PRESENTATION
// ============================================================
const cy = cytoscape({
  container:el("cy"),
  elements:graphElements,
  minZoom:.28,
  maxZoom:2.3,
  wheelSensitivity:.15,
  boxSelectionEnabled:false,
  style:[
    { selector:"node",style:{
      "shape":"ellipse","width":"data(size)","height":"data(size)","background-color":"data(colour)","background-opacity":.18,
      "border-color":"data(colour)","border-width":3,"label":"data(label)","font-size":"data(fontSize)","font-weight":700,"color":"#173443",
      "text-wrap":"wrap","text-max-width":105,"text-valign":"center","text-halign":"center","overlay-opacity":0,
      "shadow-color":"#17343d","shadow-opacity":.11,"shadow-blur":12,"shadow-offset-y":3,"z-index":5
    }},
    { selector:"node[ring=0]",style:{
      "background-opacity":1,"color":"#ffffff","border-width":6,"text-max-width":135,"shadow-opacity":.24,"shadow-blur":22,"z-index":30
    }},
    { selector:"node[ring=1]",style:{ "background-opacity":.28,"border-width":4,"text-max-width":98,"z-index":15 }},
    { selector:"edge",style:{
      "width":1.35,"line-color":"#83999c","target-arrow-color":"#83999c","target-arrow-shape":"triangle","arrow-scale":.65,
      "curve-style":"unbundled-bezier","control-point-distances":15,"control-point-weights":.5,"opacity":.16,"label":"","font-size":9.5,
      "font-weight":650,"color":"#405b63","text-background-color":"#ffffff","text-background-opacity":.97,"text-background-padding":"4px",
      "text-background-shape":"round-rectangle","text-rotation":"autorotate","text-margin-y":-10,"z-index":1
    }},
    { selector:"edge[target='ae-attendance']",style:{ "width":3,"opacity":.58,"arrow-scale":.85,"z-index":4 }},
    { selector:"edge[polarity='positive']",style:{ "line-color":"#16857d","target-arrow-color":"#16857d" }},
    { selector:"edge[polarity='negative']",style:{ "line-color":"#a64f63","target-arrow-color":"#a64f63","line-style":"dashed" }},
    { selector:"edge[polarity='uncertain']",style:{ "line-color":"#b27a21","target-arrow-color":"#b27a21","line-style":"dotted" }},
    { selector:".selected-node",style:{ "background-opacity":1,"color":"#ffffff","border-width":6,"shadow-opacity":.25,"shadow-blur":20,"z-index":40 }},
    { selector:".related-node",style:{ "background-opacity":.46,"border-width":4.5,"z-index":25 }},
    { selector:".related-edge",style:{ "opacity":.98,"width":3.4,"label":"data(label)","arrow-scale":.9,"z-index":22 }},
    { selector:".hover-node",style:{ "background-opacity":.48,"border-width":4.5,"z-index":32 }},
    { selector:".hover-edge",style:{ "opacity":.88,"width":2.7,"label":"data(label)","z-index":20 }},
    { selector:".faded",style:{ "opacity":.045 }},
    { selector:".timescale-faded",style:{ "opacity":.055 }},
    { selector:".loop-node",style:{ "background-color":"#d7a92d","background-opacity":.92,"border-color":"#9a7113","color":"#173443","border-width":6,"z-index":36 }},
    { selector:".loop-edge",style:{ "opacity":.98,"width":3.7,"label":"data(label)","arrow-scale":.95,"z-index":28 }}
  ],
  layout:{ name:"preset",fit:false,padding:60 }
});

// ============================================================
// 03. VIEWPORTS AND MAP STATES
// ============================================================
function clearFocus({ keepTimescale=true }={}) {
  cy.elements().removeClass("selected-node related-node related-edge hover-node hover-edge faded loop-node loop-edge");
  if (!keepTimescale) cy.elements().removeClass("timescale-faded");
}

function showHome(duration=450) {
  clearFocus();
  setActiveButton(".layer");
  const homeNodes = cy.nodes("[ring <= 1]");
  cy.animate({ fit:{ eles:homeNodes,padding:80 } },{ duration,easing:"ease-in-out-cubic" });
  renderNodeDetails(NODE_BY_ID.get("ae-attendance"));
}

function showWholePicture(duration=500) {
  clearFocus({ keepTimescale:false });
  activeTimescale = "all";
  setActiveButton(".timescale-button");
  cy.animate({ fit:{ eles:cy.elements(),padding:65 } },{ duration,easing:"ease-in-out-cubic" });
  renderNodeDetails(NODE_BY_ID.get("ae-attendance"));
}

function restorePositions() {
  cy.batch(() => nodePositions.forEach((position,id) => cy.getElementById(id).position(position)));
  showHome();
}

function applyTimescaleFilter(timescale,button) {
  activeTimescale = timescale;
  clearFocus({ keepTimescale:false });
  setActiveButton(".timescale-button",button);
  const relevantOuterNodes = cy.nodes().filter(node => node.data("ring") === 2 && node.data("timescale") === timescale);
  const relevantFirstRing = cy.nodes("[ring = 1]").filter(node => node.incomers("edge").some(edge => relevantOuterNodes.contains(edge.source())));
  const visible = relevantOuterNodes.union(relevantFirstRing).union(cy.getElementById("ae-attendance"));
  const visibleEdges = cy.edges().filter(edge => visible.contains(edge.source()) && visible.contains(edge.target()));
  cy.elements().not(visible.union(visibleEdges)).addClass("timescale-faded");
  cy.animate({ fit:{ eles:visible,padding:95 } },{ duration:450,easing:"ease-in-out-cubic" });
  renderTimescaleOverview(timescale,relevantOuterNodes);
}

// ============================================================
// 04. MANAGEMENT DETAIL PANEL
// ============================================================
function sourceLinks(sourceIds=[]) {
  return sourceIds.map(sourceId => SOURCES[sourceId] ? `<a class="source-link" href="${SOURCES[sourceId].url}" target="_blank" rel="noopener" title="${SOURCES[sourceId].title}">${sourceId}</a>` : "").join("");
}

function renderNodeDetails(node) {
  const domain = DOMAIN_BY_ID.get(node.domain);
  const timescale = AE_TIMESCALES[node.timescale];
  el("nodeTitle").textContent = node.label;
  el("nodeSummary").textContent = node.summary;
  el("nodeDetails").innerHTML = `
    <div class="meta-row">
      <span class="meta-badge">${domain.label}</span>
      <span class="timescale-pill ${node.timescale}">${timescale.label}</span>
      <span class="meta-badge owner">${node.owner}</span>
    </div>
    <div class="management-grid">
      <section class="management-card"><strong>Why it affects A&E</strong><p>${node.why}</p></section>
      <section class="management-card"><strong>What to examine locally</strong><p>${node.measures}</p></section>
      <section class="management-card action"><strong>Possible management response</strong><p>${node.action}</p></section>
      <section class="management-card caution"><strong>Important caution</strong><p>${node.caution}</p></section>
    </div>
    ${node.sources.length ? `<div class="source-links">${sourceLinks(node.sources)}</div>` : ""}`;
  el("whyTree").innerHTML = "";
  renderDirectRelationships(node.id);
}

function renderTimescaleOverview(timescale,nodes) {
  const definition = AE_TIMESCALES[timescale];
  el("nodeTitle").textContent = definition.label;
  el("nodeSummary").textContent = timescale === "quick" ? "These are comparatively actionable operational levers. They still require local diagnosis and safe implementation; quick does not mean easy or guaranteed." : timescale === "medium" ? "These changes usually require redesign across services, workforce, pathways or continuity and are more likely to mature over months or a few years." : timescale === "long" ? "These factors shape genuine urgent need over years. They matter strategically but will not solve immediate operational pressure on their own." : "These factors must be understood locally before deciding whether the apparent rise represents need, case mix, configuration or data change.";
  el("nodeDetails").innerHTML = `<div class="management-grid"><section class="management-card action"><strong>Factors shown</strong><p>${nodes.map(node => node.data("label")).join("; ")}.</p></section><section class="management-card caution"><strong>Interpretation</strong><p>A timescale is an initial management classification, not an estimated effect size or promise that intervention will reduce attendance.</p></section></div>`;
  el("whyTree").innerHTML = "";
  document.getElementById("directRelationships")?.remove();
}

function relationshipRow(edge,currentNodeId,outgoing) {
  const other = outgoing ? edge.target() : edge.source();
  const current = NODE_BY_ID.get(currentNodeId);
  const otherData = NODE_BY_ID.get(other.id());
  const sourceLabel = outgoing ? current.label : otherData.label;
  const targetLabel = outgoing ? otherData.label : current.label;
  return `<button class="relationship-row" data-related-factor="${other.id()}"><span><strong>${sourceLabel}</strong> <em>${edge.data("label")}</em> <strong>${targetLabel}</strong></span><span class="claim-badge ${edge.data("evidence")}">${CLAIM_LABELS[edge.data("evidence")]}</span></button>`;
}

function renderDirectRelationships(nodeId) {
  document.getElementById("directRelationships")?.remove();
  const node = cy.getElementById(nodeId);
  const incoming = node.incomers("edge").toArray();
  const outgoing = node.outgoers("edge").toArray();
  const html = `<section id="directRelationships" class="relationship-panel">
    <div class="relationship-panel-heading"><div><p class="eyebrow teal">Causal neighbourhood</p><h3>Mapped relationships</h3></div><span>${incoming.length} into · ${outgoing.length} out</span></div>
    <div class="relationship-columns">
      <div><h4>What may drive this</h4>${incoming.map(edge => relationshipRow(edge,nodeId,false)).join("") || "<p class='empty-relationships'>No incoming relationship is currently mapped.</p>"}</div>
      <div><h4>What this may change</h4>${outgoing.map(edge => relationshipRow(edge,nodeId,true)).join("") || "<p class='empty-relationships'>No outgoing relationship is currently mapped.</p>"}</div>
    </div>
  </section>`;
  el("nodeDetails").insertAdjacentHTML("afterend",html);
}

function renderEdgeDetails(edge) {
  const source = NODE_BY_ID.get(edge.source().id());
  const target = NODE_BY_ID.get(edge.target().id());
  el("nodeTitle").textContent = `${source.label} → ${target.label}`;
  el("nodeSummary").textContent = `${source.label} ${edge.data("label")} ${target.label}.`;
  el("nodeDetails").innerHTML = `<div class="management-grid"><section class="management-card"><strong>Direction</strong><p>${edge.data("polarity") === "negative" ? "This relationship reduces or constrains the target." : edge.data("polarity") === "uncertain" ? "The direction or net effect may depend on context." : "This relationship increases or enables the target."}</p></section><section class="management-card"><strong>Evidence status</strong><p>${CLAIM_LABELS[edge.data("evidence")]}</p></section><section class="management-card caution"><strong>Caution</strong><p>The map does not yet quantify the strength, delay, eligible population or local effect of this relationship.</p></section></div>${edge.data("sources").length ? `<div class="source-links">${sourceLinks(edge.data("sources"))}</div>` : ""}`;
  el("whyTree").innerHTML = "";
  document.getElementById("directRelationships")?.remove();
}

// ============================================================
// 05. NODE, EDGE AND HOVER INTERACTION
// ============================================================
function selectNode(node,{ centre=false }={}) {
  clearFocus();
  const neighbourhood = node.closedNeighborhood();
  cy.elements().not(neighbourhood).addClass("faded");
  node.addClass("selected-node");
  node.neighborhood("node").addClass("related-node");
  node.connectedEdges().addClass("related-edge");
  renderNodeDetails(NODE_BY_ID.get(node.id()));
  if (centre) cy.animate({ fit:{ eles:neighbourhood,padding:105 } },{ duration:420,easing:"ease-in-out-cubic" });
}

cy.on("mouseover","node",event => {
  const node = event.target;
  node.addClass("hover-node");
  node.connectedEdges().addClass("hover-edge");
});
cy.on("mouseout","node",event => {
  event.target.removeClass("hover-node");
  event.target.connectedEdges().removeClass("hover-edge");
});
cy.on("tap","node",event => selectNode(event.target));
cy.on("tap","edge",event => {
  clearFocus();
  event.target.addClass("related-edge");
  event.target.connectedNodes().addClass("related-node");
  renderEdgeDetails(event.target);
});
cy.on("tap",event => { if (event.target === cy) showHome(); });

// ============================================================
// 06. SEARCH, BRANCH VIEW AND FEEDBACK LOOPS
// ============================================================
function findNode(searchText) {
  const query = searchText.trim().toLowerCase();
  if (!query) return null;
  return AE_MAP_NODES.find(node => node.label.toLowerCase() === query || node.id === query) || AE_MAP_NODES.find(node => node.label.toLowerCase().startsWith(query)) || AE_MAP_NODES.find(node => node.label.toLowerCase().includes(query));
}

function runSearch() {
  const result = findNode(el("factorSearch").value);
  if (!result) {
    el("factorSearch").setCustomValidity("No matching factor was found.");
    el("factorSearch").reportValidity();
    return;
  }
  el("factorSearch").setCustomValidity("");
  el("factorSearch").value = result.label;
  selectNode(cy.getElementById(result.id),{ centre:true });
}

function showSelectedBranch() {
  const selected = cy.$("node.selected-node");
  const target = selected.length ? selected : cy.getElementById("ae-attendance");
  selectNode(target,{ centre:true });
}

function showLoop(loop) {
  if (!loop) return;
  clearFocus();
  const nodes = cy.collection(loop.nodes.map(id => cy.getElementById(id)[0]).filter(Boolean));
  const edges = cy.edges().filter(edge => nodes.contains(edge.source()) && nodes.contains(edge.target()));
  cy.elements().not(nodes.union(edges)).addClass("faded");
  nodes.addClass("loop-node");
  edges.addClass("loop-edge");
  cy.animate({ fit:{ eles:nodes,padding:115 } },{ duration:480,easing:"ease-in-out-cubic" });
  el("nodeTitle").textContent = `${loop.type === "R" ? "Reinforcing" : "Balancing"} loop: ${loop.title}`;
  el("nodeSummary").textContent = loop.explanation;
  el("nodeDetails").innerHTML = `<div class="management-grid"><section class="management-card"><strong>Included factors</strong><p>${loop.nodes.map(id => NODE_BY_ID.get(id)?.label || id).join(" → ")}</p></section><section class="management-card caution"><strong>Interpretation</strong><p>This is a proposed feedback structure. Strength, timing and local importance still need to be tested.</p></section></div>`;
  el("whyTree").innerHTML = "";
  document.getElementById("directRelationships")?.remove();
}

// ============================================================
// 07. TOOLBAR, LEGEND AND VIEW SWITCHER
// ============================================================
AE_MAP_NODES.slice().sort((a,b) => a.label.localeCompare(b.label)).forEach(node => el("factorOptions").append(new Option(node.label)));
AE_MAP_LOOPS.forEach(loop => el("loopSelect").add(new Option(`${loop.type}: ${loop.title}`,loop.id)));

el("homeMap").addEventListener("click",() => showHome());
el("wholePicture").addEventListener("click",() => showWholePicture());
el("selectedBranch").addEventListener("click",showSelectedBranch);
el("feedbackButton").addEventListener("click",() => showLoop(AE_MAP_LOOPS.find(loop => loop.id === el("loopSelect").value) || AE_MAP_LOOPS[0]));
el("resetLayout").addEventListener("click",restorePositions);
el("loopSelect").addEventListener("change",() => showLoop(AE_MAP_LOOPS.find(loop => loop.id === el("loopSelect").value)));
el("factorSearch").addEventListener("change",runSearch);
el("factorSearch").addEventListener("keydown",event => { if (event.key === "Enter") { event.preventDefault(); runSearch(); } });
el("factorSearch").addEventListener("input",() => el("factorSearch").setCustomValidity(""));
document.querySelectorAll(".timescale-button").forEach(button => button.addEventListener("click",() => applyTimescaleFilter(button.dataset.timescale,button)));
el("nodePanel").addEventListener("click",event => {
  const relationship = event.target.closest("[data-related-factor]");
  if (!relationship) return;
  selectNode(cy.getElementById(relationship.dataset.relatedFactor),{ centre:true });
});

function renderLegend() {
  el("mapKey").innerHTML = `
    <div class="relationship-legend"><strong>Relationship</strong><span><i class="relationship-line"></i>Increases / enables</span><span><i class="relationship-line negative"></i>Reduces / constrains</span><span><i class="relationship-line uncertain"></i>Direction uncertain</span></div>
    <div class="domain-legend"><strong>Driver type</strong>${Object.entries(AE_DOMAINS).filter(([id]) => id !== "problem").map(([,domain]) => `<span><i class="legend-dot" style="--dot:${domain.colour}"></i>${domain.label}</span>`).join("")}</div>
    <div class="timescale-legend"><strong>Management timescale</strong><span class="timescale-pill quick">Quick</span><span class="timescale-pill medium">Medium</span><span class="timescale-pill long">Long</span><span class="timescale-pill diagnostic">Understand first</span></div>`;
}
renderLegend();

// ============================================================
// 08. MEASUREMENT VIEW
// ============================================================
const measurementNodes = AE_MAP_NODES.filter(node => node.ring === 1);
el("evidenceDiagram").innerHTML = measurementNodes.map(node => `<button class="measure-node ${node.timescale === "diagnostic" ? "proxy" : "measured"}" data-measure="${node.id}"><span class="measure-label">Test this explanation</span><strong>${node.label}</strong><small>${node.measures}</small></button>`).join("");
document.querySelectorAll(".measure-node").forEach(button => button.addEventListener("click",() => {
  const node = NODE_BY_ID.get(button.dataset.measure);
  el("evidencePanel").innerHTML = `<p class="eyebrow teal">Local analytical question</p><h2>${node.label}</h2><p class="interpretation">${node.measures}</p><p><strong>Management response if supported:</strong> ${node.action}</p><p><strong>Caution:</strong> ${node.caution}</p>`;
}));

// ============================================================
// 09. SOURCES, MODALS AND TAB SWITCHING
// ============================================================
el("sourceCatalogue").innerHTML = Object.entries(SOURCES).map(([id,source]) => `<article class="source-item" id="source-${id}"><h3>${id}. ${source.title}</h3><p><strong>${source.publisher}</strong> · ${source.type}</p><p>${source.note}</p><a href="${source.url}" target="_blank" rel="noopener">Open original source ↗</a></article>`).join("");
el("aboutButton").addEventListener("click",() => el("modalBackdrop").hidden = false);
el("closeModal").addEventListener("click",() => el("modalBackdrop").hidden = true);
el("modalBackdrop").addEventListener("click",event => { if (event.target === el("modalBackdrop")) el("modalBackdrop").hidden = true; });
el("sourcesButton").addEventListener("click",() => el("sourcesBackdrop").hidden = false);
el("closeSources").addEventListener("click",() => el("sourcesBackdrop").hidden = true);
el("sourcesBackdrop").addEventListener("click",event => { if (event.target === el("sourcesBackdrop")) el("sourcesBackdrop").hidden = true; });
document.addEventListener("keydown",event => { if (event.key === "Escape") { el("modalBackdrop").hidden = true; el("sourcesBackdrop").hidden = true; } });

document.querySelectorAll(".view-tabs button").forEach(button => button.addEventListener("click",() => {
  document.querySelectorAll(".view-tabs button").forEach(item => item.classList.toggle("active",item === button));
  document.querySelectorAll(".view").forEach(view => view.classList.toggle("active",view.id === `${button.dataset.view}View`));
  if (button.dataset.view === "system") setTimeout(() => { cy.resize(); showHome(0); },50);
}));

cy.ready(() => showHome(0));
