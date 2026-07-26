// ============================================================
// 00. ACUTE DISCHARGE SITREP PATHWAY
// ============================================================
// Adds the published weekly additional-bed-day measure to the existing discharge
// sequence. Daily discharge-ready and not-discharged metrics are attached to the
// existing discharge-ready, delayed-discharge and actual-discharge nodes.

(() => {
  const node = AE_NODE("acute-additional-bed-days","Additional bed days after no longer meeting criteria to reside","hospital",2,160,1100,{
    summary:"The weekly snapshot records the total additional days that patients have remained in hospital after no longer meeting the criteria to reside.",
    why:"Additional days accumulate when discharge processes, onward-care arrangements, capacity, housing, transport or patient circumstances delay a safe transfer.",
    action:"Review the 7+, 14+ and 21+ length-of-stay measures alongside the number remaining in hospital and the published delay-reason profile.",
    timescale:"quick", owner:"Acute providers, ICBs, community services and local authorities",
    measures:"Average weekly additional bed days for patients with length of stay 7+, 14+ and 21+ days; monthly trend; delay reasons and discharge destinations.",
    caution:"This is a weekly snapshot stock, not a count of unique people or an annual flow. The three length-of-stay groups overlap and must not be added together.",
    evidence:"official", sources:["S25"]
  });

  if (!AE_MAP_NODES.some(existing => existing.id === node.id)) AE_MAP_NODES.push(node);

  const requiredPairs = new Set([
    "discharge-ready>delayed-discharge",
    "delayed-discharge>acute-additional-bed-days",
    "acute-additional-bed-days>occupied-overnight-beds",
    "actual-discharge>post-discharge-support"
  ]);

  for (let index = AE_MAP_LINKS.length - 1; index >= 0; index -= 1) {
    const link = AE_MAP_LINKS[index];
    if (requiredPairs.has(`${link.source}>${link.target}`)) AE_MAP_LINKS.splice(index,1);
  }

  AE_MAP_LINKS.push(
    AE_LINK("discharge-ready","delayed-discharge","can remain in hospital despite no longer meeting the criteria to reside","positive","official",["S25"]),
    AE_LINK("delayed-discharge","acute-additional-bed-days","accumulates additional occupied days","positive","official",["S25"]),
    AE_LINK("acute-additional-bed-days","occupied-overnight-beds","contributes to occupied overnight capacity","positive","official",["S24","S25"]),
    AE_LINK("actual-discharge","post-discharge-support","moves care into the receiving pathway or home setting","positive","official",["S25"])
  );
})();
