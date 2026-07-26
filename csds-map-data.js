// ============================================================
// 00. BROADER COMMUNITY SERVICES ACTIVITY PATHWAY
// ============================================================
// Adds March 2025 CSDS totals as related activity measures. The published totals
// are aggregate counts and do not establish that the same person moved through
// each stage during the month.

(() => {
  const nodes = [
    AE_NODE("csds-referrals","Community-service referrals received","professional",2,18,1040,{
      summary:"The monthly CSDS publication records referrals received by publicly funded community services.",
      why:"Referral volume reflects population need, service scope, referral access, local pathways and submission completeness.",
      action:"Compare direct published referral totals by ICB and provider, then add population rates and service mix before interpreting variation.",
      timescale:"diagnostic", owner:"ICBs, community providers and NHS England",
      measures:"Referrals received; age group; referral reason; referral source; provider and ICB.",
      caution:"Referrals are activity records, not unique people or unmet demand.", evidence:"official", sources:["S21"]
    }),
    AE_NODE("csds-people-referred","People with a community-service referral","professional",2,30,1160,{
      summary:"The number of distinct people recorded with at least one community-service referral during March 2025.",
      why:"A person may have more than one referral, so this denominator differs from the referral count.",
      action:"Show people and referrals together; do not treat referrals per person as a quality or productivity measure.",
      timescale:"diagnostic", owner:"ICBs, community providers and NHS England",
      measures:"People with referrals; referrals; age group and recorded geography.",
      caution:"This is a monthly aggregate and does not identify which people later received a contact or joined a waiting list.", evidence:"official", sources:["S21"]
    }),
    AE_NODE("csds-people-contacted","People receiving community-service care","professional",2,42,1270,{
      summary:"People recorded as receiving at least one community-service care contact during the month.",
      why:"The total depends on referrals, ongoing caseloads, service scope, activity delivery and provider submission completeness.",
      action:"Compare people receiving care with contacts and age mix, while recognising that activity may relate to referrals from earlier months.",
      timescale:"diagnostic", owner:"ICBs, community providers and NHS England",
      measures:"People with a care contact; age group; contacts per person and geography.",
      caution:"People receiving care are not necessarily the same people referred during the same month.", evidence:"official", sources:["S21"]
    }),
    AE_NODE("csds-care-contacts","Community-service care contacts","professional",2,54,1160,{
      summary:"Recorded contacts or appointments between a person and a community care professional during March 2025.",
      why:"Contact volume reflects people receiving care, contact frequency, service model, workforce, recording and submission completeness.",
      action:"Compare exact published totals, age mix and contacts per person alongside workforce and service configuration.",
      timescale:"quick", owner:"Community providers and ICBs",
      measures:"Care contacts; people contacted; consultation medium; attendance; service type; age group.",
      caution:"More contacts may reflect greater need or care intensity, not higher productivity.", evidence:"official", sources:["S21"]
    }),
    AE_NODE("csds-care-activities","Care activities delivered in community contacts","professional",2,66,1270,{
      summary:"One contact can contain one or more recorded assessments, interventions or procedures.",
      why:"The activity count depends on contact content, clinical need, coding and which providers submit activity detail.",
      action:"Use activities per contact as descriptive context only and inspect the underlying activity types before comparison.",
      timescale:"diagnostic", owner:"Community providers, ICBs and NHS England",
      measures:"Care activities; care contacts; activity type; age group and provider coverage.",
      caution:"Care-activity submission is less complete than referral and care-contact submission.", evidence:"official", sources:["S21"]
    })
  ];

  nodes.forEach(node => {
    if (!AE_MAP_NODES.some(existing => existing.id === node.id)) AE_MAP_NODES.push(node);
  });

  const requiredPairs = new Set([
    "community-professional-referral>csds-referrals",
    "csds-referrals>csds-people-referred",
    "csds-people-referred>community-waiting-list",
    "csds-people-referred>csds-people-contacted",
    "csds-people-contacted>csds-care-contacts",
    "csds-care-contacts>csds-care-activities",
    "community-workforce>csds-care-contacts",
    "csds-care-contacts>post-discharge-support"
  ]);

  for (let index = AE_MAP_LINKS.length - 1; index >= 0; index -= 1) {
    const link = AE_MAP_LINKS[index];
    if (requiredPairs.has(`${link.source}>${link.target}`)) AE_MAP_LINKS.splice(index,1);
  }

  AE_MAP_LINKS.push(
    AE_LINK("community-professional-referral","csds-referrals","contributes to recorded community referrals","positive","official",["S21"]),
    AE_LINK("csds-referrals","csds-people-referred","referrals relate to people recorded as needing care","positive","official",["S21"]),
    AE_LINK("csds-people-referred","community-waiting-list","some referrals may enter a reported waiting list","uncertain","hypothesis",["S20","S21"]),
    AE_LINK("csds-people-referred","csds-people-contacted","provides context for people later or already receiving care","positive","official",["S21"]),
    AE_LINK("csds-people-contacted","csds-care-contacts","people may receive one or more recorded contacts","positive","official",["S21"]),
    AE_LINK("csds-care-contacts","csds-care-activities","contacts can contain one or more care activities","positive","official",["S21"]),
    AE_LINK("community-workforce","csds-care-contacts","influences deliverable community activity","positive","hypothesis",["S6","S21"]),
    AE_LINK("csds-care-contacts","post-discharge-support","can form part of support after hospital discharge","positive","hypothesis",["S21"])
  );
})();
