// ============================================================
// 00. COMMUNITY HEALTH-SERVICE WAITING-LIST PATHWAY
// ============================================================
// Adds the March 2025 waiting-list stock and its published waiting-time bands.
// The branches describe the current stock; they are not patient-flow volumes and
// must not be added across months.

(() => {
  if (!AE_MAP_NODES.some(node => node.id === "community-waiting-list")) {
    AE_MAP_NODES.push(AE_NODE("community-waiting-list","People waiting for community health services","professional",2,42,900,{
      summary:"The CHS SitRep records people waiting for a first treatment or intervention across a broad range of community health-service lines.",
      why:"The stock reflects referrals entering the list, activity delivered, service capacity, pathway definitions, data coverage and the time people remain waiting.",
      action:"Compare the March stock, waiting-time composition, service lines and reporting coverage by ICB and provider.",
      timescale:"diagnostic", owner:"ICBs, community providers and NHS England",
      measures:"Total reported waiting list; adult and CYP waits; service line; waiting-time bands; non-submissions and data coverage.",
      caution:"This is rapidly collected management information and may not cover every community service in every system.", evidence:"official", sources:["S20"]
    }));
  }

  if (!AE_MAP_NODES.some(node => node.id === "community-under-18")) {
    AE_MAP_NODES.push(AE_NODE("community-under-18","Community waits under 18 weeks","professional",2,54,1010,{
      summary:"Reported waits with a published waiting-time band of less than 18 weeks.",
      why:"The share depends on demand, capacity, pathway management, service mix and how completely providers classify waits into time bands.",
      action:"Show the numerator, classified-wait denominator and band-coverage percentage together.",
      timescale:"quick", owner:"Community providers and ICBs",
      measures:"0-1, 1-2, 2-4, 4-12 and 12-18 week waits; percentage of classified waits; band coverage.",
      caution:"The published wait bands may not sum to the total waiting list, so this is not calculated using unclassified waits as though they were long waits.", evidence:"official", sources:["S20"]
    }));
  }

  if (!AE_MAP_NODES.some(node => node.id === "community-18-52")) {
    AE_MAP_NODES.push(AE_NODE("community-18-52","Community waits from 18 to 52 weeks","professional",2,66,920,{
      summary:"Reported community pathways classified as waiting between 18 and 52 weeks.",
      why:"This middle band can grow before it appears in the headline over-52-week measure and therefore provides an early indication of backlog progression.",
      action:"Compare the count, share of classified waits, service mix and change in the England trend.",
      timescale:"quick", owner:"Community providers and ICBs",
      measures:"18-52 week waits; percentage of classified waits; service line; adult/CYP split and reporting coverage.",
      caution:"A lower share can reflect movement into a longer band as well as genuine improvement.", evidence:"official", sources:["S20"]
    }));
  }

  if (!AE_MAP_NODES.some(node => node.id === "community-over-52")) {
    AE_MAP_NODES.push(AE_NODE("community-over-52","Community waits over 52 weeks","professional",2,78,1030,{
      summary:"Reported waits classified as 52-104 weeks or more than 104 weeks.",
      why:"Very long waits reflect sustained imbalance between demand and delivered activity, but can also be affected by onboarding, service definitions and recording completeness.",
      action:"Separate 52-104 and over-104-week waits, adult and CYP waits, and the service lines contributing most to the total.",
      timescale:"quick", owner:"ICBs, community providers and NHS England",
      measures:"52-104 week waits; over-104 week waits; percentage of classified waits; adult/CYP split; service lines.",
      caution:"The data do not establish why each person waited or whether an urgent-care episode was caused by the wait.", evidence:"official", sources:["S20"]
    }));
  }

  const requiredPairs = new Set([
    "urgent-community-capacity>community-waiting-list",
    "community-waiting-list>community-under-18",
    "community-waiting-list>community-18-52",
    "community-waiting-list>community-over-52",
    "community-over-52>repeat-urgent-use"
  ]);

  for (let index = AE_MAP_LINKS.length - 1; index >= 0; index -= 1) {
    const link = AE_MAP_LINKS[index];
    if (requiredPairs.has(`${link.source}>${link.target}`)) AE_MAP_LINKS.splice(index,1);
  }

  AE_MAP_LINKS.push(
    AE_LINK("urgent-community-capacity","community-waiting-list","shapes how quickly the waiting stock can be treated","negative","hypothesis",["S20"]),
    AE_LINK("community-waiting-list","community-under-18","includes waits classified below 18 weeks","positive","official",["S20"]),
    AE_LINK("community-waiting-list","community-18-52","includes waits classified from 18 to 52 weeks","positive","official",["S20"]),
    AE_LINK("community-waiting-list","community-over-52","includes waits classified above 52 weeks","positive","official",["S20"]),
    AE_LINK("community-over-52","repeat-urgent-use","may contribute to deterioration or repeat urgent contact","uncertain","hypothesis",["S20"])
  );
})();
