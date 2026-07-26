// ============================================================
// 00. COMMUNITY WAITING-LIST MISSING-DATA SAFEGUARD
// ============================================================
// Some published ICB/provider rows contain no value because no relevant return was
// available. The main presentation layer must not convert JavaScript null to zero
// in comparisons or rankings.

(async () => {
  const CONTEXT_NODE_IDS = new Set([
    "community-waiting-list",
    "community-under-18",
    "community-18-52",
    "community-over-52"
  ]);

  async function loadData() {
    for (const path of [
      "public-data/community-waits-2024-25.json",
      "https://raw.githubusercontent.com/pelld/population-health-system-explorer/main/public-data/community-waits-2024-25.json"
    ]) {
      try {
        const response = await fetch(`${path}?v=${Date.now()}`,{ cache:"no-store" });
        if (response.ok) return await response.json();
      } catch (error) {
        // Try the fallback location.
      }
    }
    return null;
  }

  const data = await loadData();
  if (!data) return;

  const baseRenderNodeDetails = renderNodeDetails;

  function selectedGeography() {
    const select = document.getElementById("communityWaitMetricSelect");
    if (!select?.value) return data.england;

    const [type,code] = select.value.split("|");
    const collection = type === "ICB" ? data.icbs : type === "Provider" ? data.providers : [];
    return collection.find(item => item.code === code) || data.england;
  }

  function rawMetricValue(item,nodeId) {
    const metric = item?.metrics?.[nodeId];
    if (!metric) return null;
    const raw = metric.display === "percent" ? metric.percent : metric.count;
    if (raw === null || raw === undefined || raw === "") return null;
    const value = Number(raw);
    return Number.isFinite(value) ? value : null;
  }

  function peerCollection(geography) {
    if (geography.type === "ICB") return data.icbs;
    if (geography.type === "Provider") return data.providers;
    return [];
  }

  function correctedRank(geography,nodeId) {
    const peers = peerCollection(geography)
      .map(item => ({ item,value:rawMetricValue(item,nodeId) }))
      .filter(item => item.value !== null)
      .sort((a,b) => b.value - a.value);

    const index = peers.findIndex(item => item.item.code === geography.code);
    return index < 0 ? null : { rank:index + 1,total:peers.length };
  }

  renderNodeDetails = function(node) {
    baseRenderNodeDetails(node);
    if (!CONTEXT_NODE_IDS.has(node.id)) return;

    const geography = selectedGeography();
    const metric = geography?.metrics?.[node.id] || null;
    const value = rawMetricValue(geography,node.id);

    if (value === null) {
      document.querySelectorAll("#nodeDetails .community-waits-operational-card").forEach(card => card.remove());

      const card = document.createElement("section");
      card.className = "operational-metric-card community-waits-operational-card";
      card.innerHTML = `
        <div class="operational-metric-heading">
          <div><p class="eyebrow teal">Public CHS SitRep figure</p><strong>Not published</strong></div>
          <span>${geography.name}<br>${data.snapshot}</span>
        </div>
        <h3>${metric?.label || node.label}</h3>
        <p>No value was published for this geography in the March 2025 service-line table.</p>
        <p class="metric-comparison-warning"><strong>Do not interpret this as zero:</strong> it may reflect non-submission, incomplete coverage or no relevant service-line return.</p>
        <a href="${data.source_url}" target="_blank" rel="noopener">${data.publication}</a>`;
      el("nodeDetails").prepend(card);
      return;
    }

    const rank = correctedRank(geography,node.id);
    const rankCard = document.querySelector("#nodeDetails .community-waits-rank-card");
    if (rankCard && rank) {
      const strong = rankCard.querySelector("strong");
      const small = rankCard.querySelector("small");
      if (strong) strong.textContent = `${rank.rank} of ${rank.total}`;
      if (small) small.textContent = "Missing published values are excluded; highest recorded value ranks first. This is not a performance judgement.";
    }
  };
})();
