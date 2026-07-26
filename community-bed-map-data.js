// ============================================================
// 00. COMMUNITY BED CAPACITY PATHWAY
// ============================================================
// Adds the 4 March 2026 point-in-time audit. These are beds available at the
// snapshot, not annual bed-days or a count of people treated during the year.

(() => {
  const nodes = [
    AE_NODE("community-bed-capacity","Community bed capacity","professional",2,82,1160,{
      summary:"The annual audit records NHS, jointly commissioned and Better Care Fund beds used for intermediate-care purposes at a single snapshot.",
      why:"Available bed capacity affects admission avoidance, discharge pathways, rehabilitation and hospital flow.",
      action:"Compare the exact published ICB bed count with bed purpose, length of stay, commissioning and host-provider mix.",
      timescale:"medium", owner:"ICBs, community providers, local authorities and NHS England",
      measures:"Total community beds; bed purpose; rehabilitation access; commissioning arrangement; host-provider status and average length of stay.",
      caution:"This is a point-in-time snapshot from 4 March 2026 and should not be treated as an annual capacity total.", evidence:"official", sources:["S22"]
    }),
    AE_NODE("community-bed-rehab","Beds providing rehabilitation, reablement and recovery","professional",2,94,1300,{
      summary:"Beds recorded as providing rehabilitation, reablement or recovery services.",
      why:"Usable rehabilitation capacity can affect recovery, discharge timing and the ability to avoid prolonged acute stays.",
      action:"Show the bed count and percentage of all audited community beds together.",
      timescale:"medium", owner:"ICBs and community providers",
      measures:"Beds providing rehabilitation, reablement and recovery; percentage of total audited beds.",
      caution:"A bed being classified for rehabilitation does not describe staffing, intensity, vacancy or clinical suitability.", evidence:"official", sources:["S22"]
    }),
    AE_NODE("community-bed-step-up","Admission-avoidance or step-up beds","professional",2,106,1160,{
      summary:"Community beds intended for direct admission from primary or community care to prevent escalation to acute hospital.",
      why:"The availability and accessibility of step-up capacity can influence ambulance conveyance and emergency admission decisions.",
      action:"Compare the published count and share, then investigate referral routes, access rules and utilisation locally.",
      timescale:"medium", owner:"ICBs, primary care and community providers",
      measures:"Acute admission-avoidance or step-up beds; percentage of total community beds.",
      caution:"The audit shows beds at one point in time, not whether they were staffed, vacant or accessible when urgent need arose.", evidence:"official", sources:["S22"]
    }),
    AE_NODE("community-bed-assessment","Assessment or transition beds","professional",2,118,1300,{
      summary:"Temporary beds used for assessment, transition or discharge-to-assess pathways.",
      why:"These beds can support movement out of acute hospitals while longer-term needs, placement or funding are resolved.",
      action:"Compare the bed count with acute discharge delays and local pathway design.",
      timescale:"medium", owner:"ICBs, community providers and local authorities",
      measures:"Assessment or transition beds; percentage of total community beds.",
      caution:"More assessment beds may reflect additional capacity, different pathway design or pressure elsewhere in the system.", evidence:"official", sources:["S22"]
    }),
    AE_NODE("community-bed-los","Average community-bed length of stay","professional",2,130,1160,{
      summary:"The audit publishes the average number of days people stay in audited community beds.",
      why:"Length of stay affects how many people a fixed bed base can support and may reflect complexity, onward-care availability and service design.",
      action:"Compare average stay alongside bed purpose and avoid interpreting a shorter stay as automatically better.",
      timescale:"quick", owner:"ICBs and community providers",
      measures:"Published average length of stay overall and by bed purpose.",
      caution:"This is a published average, not derived from the snapshot bed count, and differences are not case-mix adjusted.", evidence:"official", sources:["S22"]
    })
  ];

  nodes.forEach(node => {
    if (!AE_MAP_NODES.some(existing => existing.id === node.id)) AE_MAP_NODES.push(node);
  });

  const requiredPairs = new Set([
    "post-discharge-support>community-bed-capacity",
    "community-bed-capacity>community-bed-rehab",
    "community-bed-capacity>community-bed-step-up",
    "community-bed-capacity>community-bed-assessment",
    "community-bed-capacity>community-bed-los",
    "community-bed-step-up>emergency-admission",
    "community-bed-assessment>delayed-discharge",
    "community-bed-los>community-bed-capacity"
  ]);

  for (let index = AE_MAP_LINKS.length - 1; index >= 0; index -= 1) {
    const link = AE_MAP_LINKS[index];
    if (requiredPairs.has(`${link.source}>${link.target}`)) AE_MAP_LINKS.splice(index,1);
  }

  AE_MAP_LINKS.push(
    AE_LINK("post-discharge-support","community-bed-capacity","may use community bedded rehabilitation or recovery","positive","official",["S22"]),
    AE_LINK("community-bed-capacity","community-bed-rehab","includes beds providing rehabilitation, reablement and recovery","positive","official",["S22"]),
    AE_LINK("community-bed-capacity","community-bed-step-up","includes admission-avoidance or step-up beds","positive","official",["S22"]),
    AE_LINK("community-bed-capacity","community-bed-assessment","includes assessment and transition beds","positive","official",["S22"]),
    AE_LINK("community-bed-capacity","community-bed-los","capacity is shaped by how long beds remain occupied","negative","hypothesis",["S22"]),
    AE_LINK("community-bed-step-up","emergency-admission","may provide an alternative for suitable people","negative","hypothesis",["S22"]),
    AE_LINK("community-bed-assessment","delayed-discharge","availability may support movement out of acute beds","negative","hypothesis",["S22"]),
    AE_LINK("community-bed-los","community-bed-capacity","longer stays reduce turnover within a fixed bed base","negative","hypothesis",["S22"])
  );
})();
