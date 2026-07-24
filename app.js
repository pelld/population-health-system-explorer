// ============================================================
// 00. HELPERS AND VIEW SWITCHING
// ============================================================
const el = id => document.getElementById(id);
document.querySelectorAll(".view-tabs button").forEach(button => button.addEventListener("click", () => {
  document.querySelectorAll(".view-tabs button").forEach(item => item.classList.toggle("active", item === button));
  document.querySelectorAll(".view").forEach(view => view.classList.toggle("active", view.id === `${button.dataset.view}View`));
  if (button.dataset.view === "system") requestAnimationFrame(drawConnections);
}));

// ============================================================
// 01. SYSTEM CONNECTIONS
// ============================================================
el("networkCanvas").innerHTML = MAP_DOMAINS.map(domain => `
  <section class="system-domain" data-domain="${domain.id}" data-detail-key="${domain.detailKey}" style="--x:${domain.x};--y:${domain.y};--domain-colour:${domain.colour}">
    <button class="domain-heading" data-domain-select="${domain.id}">${domain.title}<small>${domain.subtitle}</small></button>
    <div class="factor-list">${domain.factors.map(([id,title]) => `<button class="factor-node" data-factor="${id}" data-domain="${domain.id}">${title}</button>`).join("")}</div>
  </section>`).join("");

function drawConnections() {
  const canvas = el("networkCanvas"), svg = el("systemLines"), canvasBox = canvas.getBoundingClientRect();
  svg.setAttribute("viewBox", `0 0 ${canvasBox.width} ${canvasBox.height}`);
  svg.innerHTML = `<defs><marker id="arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse"><path d="M 0 0 L 10 5 L 0 10 z" fill="#879b9c"></path></marker></defs>`;
  const domainOnly = document.querySelector(".layer.active")?.dataset.layer === "domains";
  if (domainOnly) return;
  MAP_LINKS.forEach(([from,to,type]) => {
    const startNode = canvas.querySelector(`[data-factor="${from}"]`), endNode = canvas.querySelector(`[data-factor="${to}"]`);
    if (!startNode || !endNode) return;
    const start = startNode.getBoundingClientRect(), end = endNode.getBoundingClientRect();
    const x1 = start.left - canvasBox.left + start.width / 2, y1 = start.top - canvasBox.top + start.height / 2, x2 = end.left - canvasBox.left + end.width / 2, y2 = end.top - canvasBox.top + end.height / 2;
    const bend = Math.max(18, Math.abs(x2 - x1) * .22), path = document.createElementNS("http://www.w3.org/2000/svg","path");
    path.setAttribute("d",`M ${x1} ${y1} C ${x1 + (x2 > x1 ? bend : -bend)} ${y1}, ${x2 - (x2 > x1 ? bend : -bend)} ${y2}, ${x2} ${y2}`);
    path.setAttribute("marker-end","url(#arrow)"); path.classList.add("factor-link",`${type}-line`); path.dataset.edgeType = type; svg.appendChild(path);
  });
}
window.addEventListener("resize", drawConnections);
requestAnimationFrame(drawConnections);

// ============================================================
// 02. NODE DETAILS AND LAYERS
// ============================================================
function selectNode(detailKey, selectedTitle=null, domainTitle=null) {
  const node = SYSTEM_NODES[detailKey];
  el("nodeTitle").textContent = selectedTitle || node.title;
  el("nodeSummary").textContent = selectedTitle ? `${selectedTitle} sits within ${domainTitle}. ${node.summary}` : node.summary;
  el("nodeDetails").innerHTML = [
    ["What influences it",node.influences,""],["What it changes",node.changes,""],["What we can measure",node.measures,""],["What remains uncertain",node.gaps,"gap"]
  ].map(([title,text,kind]) => `<section class="detail-section ${kind}"><strong>${title}</strong><p>${text}</p></section>`).join("");
  el("whyTree").innerHTML = (DRIVER_TREES[detailKey] || []).map(branch => renderBranch(branch,0)).join("");
}

const CLAIM_LABELS = {
  published:"Published evidence",
  official:"Official definition/data",
  hypothesis:"Hypothesis to test",
  gap:"Known gap"
};

function renderBranch(branch, depth) {
  const sourceLinks = (branch.sources || []).map(sourceId => {
    const source = SOURCES[sourceId];
    return `<a class="source-link" href="${source.url}" target="_blank" rel="noopener" title="${source.title}">${sourceId}</a>`;
  }).join("");
  const children = (branch.children || []).map(child => renderBranch(child,depth + 1)).join("");
  return `<details class="why-branch" ${depth === 0 ? "open" : ""}>
    <summary>${branch.title}<span class="claim-badge ${branch.kind}">${CLAIM_LABELS[branch.kind]}</span></summary>
    <div class="branch-body"><p>${branch.explanation}</p>${sourceLinks ? `<div class="source-links">${sourceLinks}</div>` : ""}${children}</div>
  </details>`;
}

function setTreeState(open) {
  el("whyTree").querySelectorAll("details").forEach(detail => detail.open = open);
}
el("expandTree").addEventListener("click", () => setTreeState(true));
el("collapseTree").addEventListener("click", () => setTreeState(false));
document.querySelectorAll(".domain-heading").forEach(button => button.addEventListener("click", () => {
  const domain = MAP_DOMAINS.find(item => item.id === button.dataset.domainSelect);
  document.querySelectorAll(".factor-node").forEach(node => node.classList.remove("selected"));
  selectNode(domain.detailKey,domain.title,"the whole system");
}));
document.querySelectorAll(".factor-node").forEach(button => button.addEventListener("click", () => {
  const domain = MAP_DOMAINS.find(item => item.id === button.dataset.domain), factor = domain.factors.find(([id]) => id === button.dataset.factor);
  document.querySelectorAll(".factor-node").forEach(node => node.classList.toggle("selected",node === button));
  selectNode(domain.detailKey,factor[1],domain.title);
}));
document.querySelectorAll(".layer").forEach(button => button.addEventListener("click", () => {
  document.querySelectorAll(".layer").forEach(item => item.classList.toggle("active", item === button));
  const layer = button.dataset.layer;
  document.querySelectorAll(".system-domain").forEach(domain => {
    domain.classList.toggle("domain-only",layer === "domains");
    domain.classList.toggle("feedback-focus",layer === "feedback");
  });
  requestAnimationFrame(() => {
    drawConnections();
    document.querySelectorAll("#systemLines path").forEach(path => path.style.opacity = layer === "feedback" && path.dataset.edgeType !== "feedback" ? ".04" : "");
  });
}));

// ============================================================
// 03. CHOICE EXPLORER
// ============================================================
Object.entries(INTERVENTIONS).forEach(([id,item]) => el("interventionSelect").add(new Option(item.label,id)));
function renderIntervention() {
  const item = INTERVENTIONS[el("interventionSelect").value];
  document.querySelectorAll(".system-domain").forEach(domain => domain.classList.toggle("highlighted", item.highlight.includes(domain.dataset.detailKey)));
  el("interventionResult").innerHTML = `<div class="effect"><strong>Intended effect</strong>${item.intended}</div><div class="effect tradeoff"><strong>Possible trade-off</strong>${item.tradeoff}</div>`;
}
el("interventionSelect").addEventListener("change",renderIntervention); renderIntervention();

// ============================================================
// 04. EVIDENCE MAP
// ============================================================
el("evidenceDiagram").innerHTML = EVIDENCE_NODES.map(item => `<button class="measure-node ${item.status}" data-measure="${item.id}"><span class="measure-label">${item.label}</span><strong>${item.value}</strong><small>${item.note}</small></button>`).join("");
document.querySelectorAll(".measure-node").forEach(button => button.addEventListener("click", () => {
  const item = EVIDENCE_NODES.find(measure => measure.id === button.dataset.measure), status = item.status === "measured" ? "Directly measured" : item.status === "proxy" ? "Proxy or partial measure" : "Important gap";
  el("evidencePanel").innerHTML = `<p class="eyebrow teal">${status}</p><h2>${item.label}</h2><p class="interpretation">${item.interpretation}</p><p>The value shown in this prototype is illustrative. A live version would display its source, period, geography and data-quality notes here.</p>`;
}));

// ============================================================
// 05. ABOUT
// ============================================================
el("aboutButton").addEventListener("click", () => el("modalBackdrop").hidden = false);
el("closeModal").addEventListener("click", () => el("modalBackdrop").hidden = true);
el("modalBackdrop").addEventListener("click", event => { if (event.target === el("modalBackdrop")) el("modalBackdrop").hidden = true; });

el("sourceCatalogue").innerHTML = Object.entries(SOURCES).map(([id,source]) => `
  <article class="source-item" id="source-${id}">
    <h3>${id}. ${source.title}</h3>
    <p><strong>${source.publisher}</strong> · ${source.type}</p>
    <p>${source.note}</p>
    <a href="${source.url}" target="_blank" rel="noopener">Open original source ↗</a>
  </article>`).join("");
el("sourcesButton").addEventListener("click", () => el("sourcesBackdrop").hidden = false);
el("closeSources").addEventListener("click", () => el("sourcesBackdrop").hidden = true);
el("sourcesBackdrop").addEventListener("click", event => { if (event.target === el("sourcesBackdrop")) el("sourcesBackdrop").hidden = true; });
document.addEventListener("keydown", event => {
  if (event.key === "Escape") {
    el("modalBackdrop").hidden = true;
    el("sourcesBackdrop").hidden = true;
  }
});
selectNode("determinants");
