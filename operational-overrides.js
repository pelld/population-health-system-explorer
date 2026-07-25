// ============================================================
// 00. OPERATIONAL LANGUAGE OVERRIDES
// ============================================================
// Keep the shared interaction code, but describe nodes as operational stages,
// conversion points and system context rather than as isolated A&E determinants.

(() => {
  renderNodeDetails = function(node) {
    const domain = DOMAIN_BY_ID.get(node.domain);
    const factorType = AE_TIMESCALES[node.timescale];

    el("nodeTitle").textContent = node.label;
    el("nodeSummary").textContent = node.summary;
    el("nodeDetails").innerHTML = `
      <div class="meta-row">
        <span class="meta-badge">${domain.label}</span>
        <span class="timescale-pill ${node.timescale}">${factorType.label}</span>
        <span class="meta-badge owner">${node.owner}</span>
      </div>
      <div class="management-grid">
        <section class="management-card"><strong>Operational meaning</strong><p>${node.why}</p></section>
        <section class="management-card"><strong>What to measure</strong><p>${node.measures}</p></section>
        <section class="management-card action"><strong>What could be investigated or changed</strong><p>${node.action}</p></section>
        <section class="management-card caution"><strong>Interpretation caution</strong><p>${node.caution}</p></section>
      </div>
      ${node.sources.length ? `<div class="source-links">${sourceLinks(node.sources)}</div>` : ""}`;

    el("whyTree").innerHTML = "";
    renderDirectRelationships(node.id);
  };

  document.querySelectorAll(".measure-node .measure-label").forEach(label => {
    label.textContent = "Measure this route or conversion";
  });

  const initialEvidenceHeading = document.querySelector("#evidencePanel h2");
  if (initialEvidenceHeading) initialEvidenceHeading.textContent = "Start with route and denominator";

  renderNodeDetails(NODE_BY_ID.get("ae-attendance"));
})();