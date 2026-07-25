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

  renderTimescaleOverview = function(type,nodes) {
    const definitions = {
      quick:["Immediate operational stages","Contacts, referrals, responses, assessments, conveyances, attendances and decisions occurring in the live pathway."],
      medium:["Service and pathway capacity","Factors such as appointments, direct booking, community alternatives, workforce and post-discharge support that shape operational conversion rates."],
      long:["Population and wider context","Population size, age, complexity, deprivation, housing, care-home provision, geography and seasonality that shape underlying activity."],
      diagnostic:["Data and definition checks","Measures that require careful denominator, completeness, coding or linkage checks before systems can be compared."]
    };

    const [title,summary] = definitions[type] || [AE_TIMESCALES[type]?.label || "Selected factors","Selected factors in the operational map."];
    el("nodeTitle").textContent = title;
    el("nodeSummary").textContent = summary;
    el("nodeDetails").innerHTML = `<div class="management-grid"><section class="management-card action"><strong>Factors shown</strong><p>${nodes.map(node => node.data("label")).join("; ")}.</p></section><section class="management-card caution"><strong>Comparison rule</strong><p>Show counts, rates and conversion percentages together, with a clear denominator and consistent pathway definition.</p></section></div>`;
    el("whyTree").innerHTML = "";
    document.getElementById("directRelationships")?.remove();
  };

  document.querySelectorAll(".measure-node .measure-label").forEach(label => {
    label.textContent = "Measure this route or conversion";
  });

  document.querySelectorAll(".measure-node").forEach(button => button.addEventListener("click",() => {
    const node = NODE_BY_ID.get(button.dataset.measure);
    if (!node) return;

    el("evidencePanel").innerHTML = `<p class="eyebrow teal">Operational measure</p><h2>${node.label}</h2><p class="interpretation">${node.measures}</p><p><strong>Operational meaning:</strong> ${node.why}</p><p><strong>Interpretation caution:</strong> ${node.caution}</p>`;
  }));

  const initialEvidenceHeading = document.querySelector("#evidencePanel h2");
  if (initialEvidenceHeading) initialEvidenceHeading.textContent = "Start with route and denominator";

  renderNodeDetails(NODE_BY_ID.get("ae-attendance"));
})();