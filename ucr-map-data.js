// ============================================================
// 00. URGENT COMMUNITY RESPONSE PATHWAY
// ============================================================
// Adds observed CSDS-derived stages to the existing community-services branch.
// These are activity and timeliness measures; they do not prove that an A&E
// attendance or hospital admission was avoided.

(() => {
  const capacity = AE_MAP_NODES.find(node => node.id === "urgent-community-capacity");

  if (capacity) Object.assign(capacity,{
    label:"Urgent community response capacity and availability",
    summary:"Urgent community response services assess and treat urgent deterioration in a person's usual place of residence.",
    why:"Whether the route is usable depends on operating hours, workforce, eligibility, travel, referral access and diagnostic or prescribing support.",
    action:"Compare recorded referrals, contacts and two-hour achievement alongside the service model and population served.",
    measures:"Two-hour UCR referrals; care contacts; two-hour achievement; operating hours; workforce; referral sources; later urgent-care use.",
    caution:"Published activity is not a direct measure of capacity, unmet demand or admissions avoided.",
    evidence:"official",
    sources:["S7","S8"],
    angle:6,
    radius:700
  });

  if (!AE_MAP_NODES.some(node => node.id === "ucr-referrals")) {
    AE_MAP_NODES.push(AE_NODE("ucr-referrals","Two-hour UCR referrals received","professional",2,-2,840,{
      summary:"A provider records a referral requiring an urgent community response within the national two-hour standard.",
      why:"Referral volume reflects urgent need, awareness of the route, referral access, coding completeness and whether local services accept referrals from all appropriate sources.",
      action:"Compare annual referrals and monthly patterns by ICB and provider, then examine referral sources and population rates where available.",
      timescale:"quick", owner:"ICBs and community providers",
      measures:"Referrals received; referrals per population; referral source; reason; time; acceptance; care contact and later urgent use.",
      caution:"Recorded referrals do not measure all urgent community need or rejected and unrecorded demand.", evidence:"official", sources:["S7","S8"]
    }));
  }

  if (!AE_MAP_NODES.some(node => node.id === "ucr-care-contacts")) {
    AE_MAP_NODES.push(AE_NODE("ucr-care-contacts","Urgent community response care contacts","professional",2,12,940,{
      summary:"Community teams deliver assessment or intervention contacts associated with two-hour UCR referrals.",
      why:"Contact volume reflects referrals, service response, care intensity, recording practice and the number of contacts delivered for each referral.",
      action:"Compare contacts with referrals and service configuration without treating the ratio as a conversion or productivity measure.",
      timescale:"quick", owner:"Community providers and ICBs",
      measures:"Care contacts; referrals; contact type; profession; duration; location; procedures; outcomes and later urgent use.",
      caution:"A referral can have more than one contact and contacts may fall in a different reporting month.", evidence:"official", sources:["S7","S8"]
    }));
  }

  if (!AE_MAP_NODES.some(node => node.id === "ucr-two-hour-achievement")) {
    AE_MAP_NODES.push(AE_NODE("ucr-two-hour-achievement","UCR response achieved within two hours","professional",2,26,840,{
      summary:"The published measure reports the percentage of completed two-hour UCR referral pathways that achieved the 120-minute standard.",
      why:"Achievement depends on referral handling, workforce availability, travel, demand peaks, service operating model and complete clock recording.",
      action:"Compare the full monthly profile and data completeness rather than a single percentage alone.",
      timescale:"quick", owner:"Community providers, ICBs and NHS England",
      measures:"Monthly percentage achieving two hours; completed referral denominator; response interval; exclusions and missing clock data.",
      caution:"A higher percentage does not by itself show better clinical outcomes or more admissions avoided.", evidence:"official", sources:["S7","S8"]
    }));
  }

  const requiredPairs = new Set([
    "urgent-community-capacity>ucr-referrals",
    "ucr-referrals>ucr-care-contacts",
    "ucr-care-contacts>ucr-two-hour-achievement",
    "care-home-urgent-events>ucr-referrals",
    "ambulance-alternative>ucr-referrals",
    "ucr-care-contacts>other-professional-route"
  ]);

  for (let index = AE_MAP_LINKS.length - 1; index >= 0; index -= 1) {
    const link = AE_MAP_LINKS[index];
    if (requiredPairs.has(`${link.source}>${link.target}`)) AE_MAP_LINKS.splice(index,1);
  }

  AE_MAP_LINKS.push(
    AE_LINK("urgent-community-capacity","ucr-referrals","makes the urgent community route available","positive","official",["S7","S8"]),
    AE_LINK("ucr-referrals","ucr-care-contacts","leads to recorded assessment and intervention contacts","positive","official",["S7","S8"]),
    AE_LINK("ucr-care-contacts","ucr-two-hour-achievement","contributes to the response-time result","positive","official",["S7","S8"]),
    AE_LINK("care-home-urgent-events","ucr-referrals","can generate an urgent community referral","positive","published",["S7","S8"]),
    AE_LINK("ambulance-alternative","ucr-referrals","can refer into urgent community care","positive","hypothesis",["S7","S8"]),
    AE_LINK("ucr-care-contacts","other-professional-route","may prevent escalation to A&E when clinically appropriate","negative","hypothesis",["S7","S8"])
  );
})();
