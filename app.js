// ============================================================
// 00. HELPERS AND VIEW SWITCHING
// ============================================================
const el = id => document.getElementById(id);
const CLAIM_LABELS = { published:"Published evidence", official:"Official definition/data", hypothesis:"Hypothesis to test", gap:"Known gap" };

document.querySelectorAll(".view-tabs button").forEach(button => button.addEventListener("click", () => {
  document.querySelectorAll(".view-tabs button").forEach(item => item.classList.toggle("active",item === button));
  document.querySelectorAll(".view").forEach(view => view.classList.toggle("active",view.id === `${button.dataset.view}View`));
  if (button.dataset.view === "system") setTimeout(() => { cy.resize(); cy.fit(undefined,35); },50);
}));

// ============================================================
// 01. GRAPH DATA
// Compound parent nodes provide soft cluster regions. Individual
// factors remain free-positioned by the force-directed layout.
// ============================================================
const FACTOR_INDEX = new Map();
const graphElements = [];

MAP_DOMAINS.forEach(domain => {
  graphElements.push({ data:{ id:`domain-${domain.id}`, label:domain.title, kind:"domain", domain:domain.id, detailKey:domain.detailKey, colour:domain.colour } });
  domain.factors.forEach(([id,label]) => {
    FACTOR_INDEX.set(id,{ id,label,domain:domain.id,domainTitle:domain.title,detailKey:domain.detailKey,colour:domain.colour });
    graphElements.push({ data:{ id,label,parent:`domain-${domain.id}`,kind:"factor",domain:domain.id,detailKey:domain.detailKey,colour:domain.colour } });
  });
});

MAP_LINKS.forEach(([source,target,type],index) => {
  const detail = RELATIONSHIP_DETAILS[`${source}>${target}`] || { label:"may influence",polarity:"uncertain",evidence:"hypothesis",sources:[] };
  graphElements.push({ data:{ id:`edge-${index}`,source,target,type,label:detail.label,polarity:detail.polarity,evidence:detail.evidence,sources:detail.sources } });
});

// ============================================================
// 02. CYTOSCAPE SYSTEM MAP
// ============================================================
const cy = cytoscape({
  container:el("cy"),
  elements:graphElements,
  minZoom:.22,
  maxZoom:2.4,
  wheelSensitivity:.16,
  style:[
    { selector:"node[kind='domain']",style:{
      "background-color":"data(colour)","background-opacity":.08,"border-color":"data(colour)","border-width":2,"border-opacity":.42,
      "shape":"round-rectangle","padding":"22px","label":"data(label)","font-size":17,"font-weight":800,"color":"#17384a",
      "text-valign":"top","text-halign":"center","text-margin-y":-10,"text-background-color":"#f8fbfa","text-background-opacity":.92,
      "text-background-padding":"5px","text-background-shape":"round-rectangle"
    }},
    { selector:"node[kind='factor']",style:{
      "width":"label","height":34,"padding":"10px","shape":"round-rectangle","background-color":"#fff","border-color":"data(colour)","border-width":2,
      "label":"data(label)","font-size":11,"font-weight":650,"color":"#183746","text-wrap":"wrap","text-max-width":120,"text-valign":"center","text-halign":"center",
      "overlay-opacity":0,"shadow-color":"#17343d","shadow-opacity":.08,"shadow-blur":8,"shadow-offset-y":3
    }},
    { selector:"edge",style:{
      "width":1.5,"line-color":"#83999c","target-arrow-color":"#83999c","target-arrow-shape":"triangle","arrow-scale":.75,
      "curve-style":"bezier","opacity":.32,"label":"","font-size":8,"color":"#435b64","text-background-color":"#fff","text-background-opacity":.9,
      "text-background-padding":"3px","text-rotation":"autorotate","text-margin-y":-8
    }},
    { selector:"edge[polarity='positive']",style:{ "line-color":"#18877f","target-arrow-color":"#18877f" }},
    { selector:"edge[polarity='negative']",style:{ "line-color":"#a64f63","target-arrow-color":"#a64f63","line-style":"dashed" }},
    { selector:"edge[polarity='uncertain']",style:{ "line-color":"#b27a21","target-arrow-color":"#b27a21","line-style":"dotted" }},
    { selector:".selected-factor",style:{ "background-color":"data(colour)","color":"#fff","border-width":4,"z-index":20 }},
    { selector:".neighbour",style:{ "border-width":4,"background-color":"#eef8f6","z-index":12 }},
    { selector:".related-edge",style:{ "opacity":.95,"width":3,"label":"data(label)","z-index":10 }},
    { selector:".faded",style:{ "opacity":.07 }},
    { selector:".loop-node",style:{ "border-width":5,"background-color":"#fff7df","z-index":15 }},
    { selector:".loop-edge",style:{ "opacity":.9,"width":3.5,"label":"data(label)","z-index":14 }}
  ],
  layout:{ name:"cose",animate:false,fit:true,padding:45,nodeRepulsion:125000,nodeOverlap:28,idealEdgeLength:115,edgeElasticity:85,nestingFactor:1.25,gravity:.28,numIter:1800,initialTemp:170,coolingFactor:.96,minTemp:1 }
});

// ============================================================
// 03. DETAILS, SELECTION AND EVIDENCE
// ============================================================
function renderBranch(branch,depth) {
  const sourceLinks = (branch.sources || []).map(sourceId => {
    const source = SOURCES[sourceId];
    return `<a class="source-link" href="${source.url}" target="_blank" rel="noopener" title="${source.title}">${sourceId}</a>`;
  }).join("");
  const children = (branch.children || []).map(child => renderBranch(child,depth + 1)).join("");
  return `<details class="why-branch" ${depth === 0 ? "open" : ""}><summary>${branch.title}<span class="claim-badge ${branch.kind}">${CLAIM_LABELS[branch.kind]}</span></summary><div class="branch-body"><p>${branch.explanation}</p>${sourceLinks ? `<div class="source-links">${sourceLinks}</div>` : ""}${children}</div></details>`;
}

function renderNodeDetails(detailKey,title,context) {
  const node = SYSTEM_NODES[detailKey];
  el("nodeTitle").textContent = title || node.title;
  el("nodeSummary").textContent = context ? `${context}. ${node.summary}` : node.summary;
  el("nodeDetails").innerHTML = [["What influences it",node.influences,""],["What it changes",node.changes,""],["What we can measure",node.measures,""],["What remains uncertain",node.gaps,"gap"]].map(([heading,text,kind]) => `<section class="detail-section ${kind}"><strong>${heading}</strong><p>${text}</p></section>`).join("");
  el("whyTree").innerHTML = (DRIVER_TREES[detailKey] || []).map(branch => renderBranch(branch,0)).join("");
}

function renderEdgeDetails(edge) {
  const data = edge.data(), source = FACTOR_INDEX.get(data.source), target = FACTOR_INDEX.get(data.target), sourceLinks = (data.sources || []).map(sourceId => `<a class="source-link" href="${SOURCES[sourceId].url}" target="_blank" rel="noopener">${sourceId}</a>`).join("");
  el("nodeTitle").textContent = `${source.label} → ${target.label}`;
  el("nodeSummary").textContent = `${source.label} ${data.label} ${target.label}. This arrow states the proposed direction of influence; it does not by itself prove the relationship caused a local result.`;
  el("nodeDetails").innerHTML = `<section class="detail-section"><strong>Direction</strong><p>${data.polarity === "positive" ? "Increases or enables" : data.polarity === "negative" ? "Reduces or constrains" : "Direction or net effect uncertain"}</p></section><section class="detail-section"><strong>Evidence status</strong><p>${CLAIM_LABELS[data.evidence] || "Hypothesis to test"}</p></section><section class="detail-section"><strong>System domains</strong><p>${source.domainTitle} → ${target.domainTitle}</p></section><section class="detail-section gap"><strong>Interpretation</strong><p>Strength, timing, population and context are not yet quantified on this map.</p></section>`;
  el("whyTree").innerHTML = sourceLinks ? `<div class="source-links">${sourceLinks}</div>` : `<section class="detail-section gap"><strong>Source needed</strong><p>This relationship is currently an explicit hypothesis and requires supporting evidence.</p></section>`;
}

function clearGraphFocus() {
  cy.elements().removeClass("selected-factor neighbour related-edge faded loop-node loop-edge");
}

function selectFactor(node) {
  clearGraphFocus();
  const neighbourhood = node.closedNeighborhood();
  cy.elements().not(neighbourhood).addClass("faded");
  node.addClass("selected-factor");
  node.neighborhood("node").addClass("neighbour");
  node.connectedEdges().addClass("related-edge");
  const factor = FACTOR_INDEX.get(node.id());
  renderNodeDetails(factor.detailKey,factor.label,`Part of ${factor.domainTitle}`);
}

cy.on("tap","node[kind='factor']",event => selectFactor(event.target));
cy.on("tap","node[kind='domain']",event => {
  const domainId = event.target.data("domain"), domain = MAP_DOMAINS.find(item => item.id === domainId);
  clearGraphFocus();
  const children = event.target.children();
  cy.elements().not(children.union(event.target).union(children.connectedEdges())).addClass("faded");
  children.addClass("neighbour");
  renderNodeDetails(domain.detailKey,domain.title,domain.subtitle);
});
cy.on("tap","edge",event => { clearGraphFocus(); event.target.addClass("related-edge"); event.target.connectedNodes().addClass("neighbour"); renderEdgeDetails(event.target); });
cy.on("tap",event => { if (event.target === cy) { clearGraphFocus(); renderNodeDetails("determinants"); } });

// ============================================================
// 04. MAP CONTROLS AND FEEDBACK LOOPS
// ============================================================
function showLoop(loop) {
  clearGraphFocus();
  const nodes = cy.collection(loop.nodes.map(id => cy.getElementById(id)[0]).filter(Boolean)), loopEdges = cy.edges().filter(edge => nodes.contains(edge.source()) && nodes.contains(edge.target()));
  cy.elements().not(nodes.union(loopEdges).union(nodes.parents())).addClass("faded");
  nodes.addClass("loop-node"); loopEdges.addClass("loop-edge");
  cy.animate({ fit:{ eles:nodes,padding:90 },duration:450 });
  el("nodeTitle").textContent = `${loop.type === "R" ? "Reinforcing" : "Balancing"} loop: ${loop.title}`;
  el("nodeSummary").textContent = loop.explanation;
  el("nodeDetails").innerHTML = `<section class="detail-section"><strong>Loop type</strong><p>${loop.type === "R" ? "Reinforcing: change tends to amplify further change." : "Balancing: change triggers effects that tend to counter it."}</p></section><section class="detail-section"><strong>Included factors</strong><p>${loop.nodes.map(id => FACTOR_INDEX.get(id)?.label || id).join(" → ")}</p></section><section class="detail-section gap"><strong>Caution</strong><p>This identifies a proposed feedback structure, not its strength, delay or net local effect.</p></section>`;
  el("whyTree").innerHTML = "";
}

SYSTEM_LOOPS.forEach(loop => el("loopSelect").add(new Option(`${loop.type}: ${loop.title}`,loop.id)));
el("loopSelect").addEventListener("change",() => showLoop(SYSTEM_LOOPS.find(loop => loop.id === el("loopSelect").value)));
document.querySelectorAll(".layer").forEach(button => button.addEventListener("click",() => {
  document.querySelectorAll(".layer").forEach(item => item.classList.toggle("active",item === button));
  const layer = button.dataset.layer;
  if (layer === "all") { clearGraphFocus(); cy.fit(undefined,35); renderNodeDetails("determinants"); }
  if (layer === "neighbourhood") {
    const selected = cy.$("node.selected-factor");
    if (selected.length) selectFactor(selected); else { const node = cy.getElementById("workforce"); selectFactor(node); cy.animate({ fit:{ eles:node.closedNeighborhood(),padding:90 },duration:400 }); }
  }
  if (layer === "feedback") showLoop(SYSTEM_LOOPS[0]);
}));

el("fitMap").addEventListener("click",() => { clearGraphFocus(); cy.animate({ fit:{ eles:cy.elements(),padding:35 },duration:400 }); });
el("resetLayout").addEventListener("click",() => { clearGraphFocus(); cy.layout({ name:"cose",animate:true,animationDuration:700,fit:true,padding:45,nodeRepulsion:125000,nodeOverlap:28,idealEdgeLength:115,edgeElasticity:85,nestingFactor:1.25,gravity:.28,numIter:1200 }).run(); });
el("expandTree").addEventListener("click",() => el("whyTree").querySelectorAll("details").forEach(detail => detail.open = true));
el("collapseTree").addEventListener("click",() => el("whyTree").querySelectorAll("details").forEach(detail => detail.open = false));

// ============================================================
// 05. CHOICE EXPLORER
// ============================================================
Object.entries(INTERVENTIONS).forEach(([id,item]) => el("interventionSelect").add(new Option(item.label,id)));
function renderIntervention() {
  const item = INTERVENTIONS[el("interventionSelect").value];
  el("interventionResult").innerHTML = `<div class="effect"><strong>Intended effect</strong>${item.intended}</div><div class="effect tradeoff"><strong>Possible trade-off</strong>${item.tradeoff}</div>`;
}
el("interventionSelect").addEventListener("change",renderIntervention);
renderIntervention();

// ============================================================
// 06. EVIDENCE MAP
// ============================================================
el("evidenceDiagram").innerHTML = EVIDENCE_NODES.map(item => `<button class="measure-node ${item.status}" data-measure="${item.id}"><span class="measure-label">${item.label}</span><strong>${item.value}</strong><small>${item.note}</small></button>`).join("");
document.querySelectorAll(".measure-node").forEach(button => button.addEventListener("click",() => {
  const item = EVIDENCE_NODES.find(measure => measure.id === button.dataset.measure), status = item.status === "measured" ? "Directly measured" : item.status === "proxy" ? "Proxy or partial measure" : "Important gap";
  el("evidencePanel").innerHTML = `<p class="eyebrow teal">${status}</p><h2>${item.label}</h2><p class="interpretation">${item.interpretation}</p><p>The value shown in this prototype is illustrative. A live version would display its source, period, geography and data-quality notes here.</p>`;
}));

// ============================================================
// 07. SOURCES AND MODALS
// ============================================================
el("sourceCatalogue").innerHTML = Object.entries(SOURCES).map(([id,source]) => `<article class="source-item" id="source-${id}"><h3>${id}. ${source.title}</h3><p><strong>${source.publisher}</strong> · ${source.type}</p><p>${source.note}</p><a href="${source.url}" target="_blank" rel="noopener">Open original source ↗</a></article>`).join("");
el("aboutButton").addEventListener("click",() => el("modalBackdrop").hidden = false);
el("closeModal").addEventListener("click",() => el("modalBackdrop").hidden = true);
el("modalBackdrop").addEventListener("click",event => { if (event.target === el("modalBackdrop")) el("modalBackdrop").hidden = true; });
el("sourcesButton").addEventListener("click",() => el("sourcesBackdrop").hidden = false);
el("closeSources").addEventListener("click",() => el("sourcesBackdrop").hidden = true);
el("sourcesBackdrop").addEventListener("click",event => { if (event.target === el("sourcesBackdrop")) el("sourcesBackdrop").hidden = true; });
document.addEventListener("keydown",event => { if (event.key === "Escape") { el("modalBackdrop").hidden = true; el("sourcesBackdrop").hidden = true; } });

renderNodeDetails("determinants");
