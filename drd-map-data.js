// ============================================================
// 00. DISCHARGE READY DATE PATHWAY
// ============================================================
// Adds the revised 2024-25 discharge-cohort measures. These are discharged-patient
// cohorts and are different from the Acute Discharge SitRep daily stock measures.

(() => {
  const nodes = [
    AE_NODE("drd-discharges","Discharges with an accepted discharge-ready-date record","hospital",3,92,900,{
      summary:"The number of discharged patients included in the revised Discharge Ready Date publication from trusts meeting its data-acceptance criteria.",
      why:"This is the denominator for comparing how long people remained after the final discharge-ready date.",
      action:"Check coverage first, then compare the same-day and delayed shares using the published discharge count.",
      timescale:"diagnostic", owner:"NHS providers, ICBs, local authorities and NHS England",
      measures:"Discharges included; acceptable-provider coverage; monthly trend and geography.",
      caution:"This is a selected discharge cohort, not all hospital discharges, admissions or people waiting on a given day.", evidence:"official", sources:["S26"]
    }),
    AE_NODE("drd-same-day","Discharged on the discharge-ready date","hospital",3,82,1040,{
      summary:"The patient left hospital on the same date as the final recorded discharge-ready date.",
      why:"Same-day discharge indicates that no additional hospital day was recorded after readiness, but does not describe the quality or destination of discharge.",
      action:"Compare the published numerator and denominator alongside coverage, case mix and discharge support.",
      timescale:"quick", owner:"Acute providers and system partners",
      measures:"Same-day discharge count and percentage; monthly trend and threshold distribution.",
      caution:"A higher percentage is not automatically safer or better and may be affected by recording practice.", evidence:"official", sources:["S26"]
    }),
    AE_NODE("drd-delayed","Discharged one or more days after discharge-ready date","hospital",3,102,1040,{
      summary:"The patient was discharged at least one calendar day after the final discharge-ready date.",
      why:"The delay can reflect clinical recording, hospital processes, care coordination, community or social-care capacity, housing, equipment and patient circumstances.",
      action:"Separate the 1-day, 2–3, 4–6, 7–13, 14–20 and 21+ day groups rather than treating all delay as equivalent.",
      timescale:"medium", owner:"Acute providers, ICBs, local authorities and community partners",
      measures:"Delayed discharge count and percentage; threshold bands; bed-days after readiness.",
      caution:"The dataset reports elapsed time, not a validated cause or responsible organisation.", evidence:"official", sources:["S26"]
    }),
    AE_NODE("drd-bed-days","Bed-days after discharge-ready date","hospital",3,116,1160,{
      summary:"The total number of hospital bed-days accumulated after the discharge-ready date among patients discharged during 2024-25.",
      why:"A small number of long delays can account for a large share of bed use after readiness.",
      action:"Review bed-days alongside delayed discharge counts, threshold bands, available beds and occupied beds.",
      timescale:"quick", owner:"Acute providers, ICBs and system partners",
      measures:"Total bed-days after readiness and bed-days by delay band.",
      caution:"These bed-days relate only to discharged patients with accepted DRD data and are not the same as the SitRep additional-bed-day snapshot.", evidence:"official", sources:["S26"]
    }),
    AE_NODE("drd-average-delay","Average days after discharge-ready date","hospital",3,132,1100,{
      summary:"Average elapsed days from discharge-ready date to discharge among people who had at least one day of delay.",
      why:"It distinguishes systems with many short waits from those with fewer but substantially longer waits.",
      action:"Use both the excluding-zero and including-zero averages with the full threshold distribution.",
      timescale:"diagnostic", owner:"Acute providers, ICBs and system partners",
      measures:"Bed-days divided by delayed discharges; including-zero average; monthly trend.",
      caution:"The average is not case-mix adjusted and can be dominated by a smaller group with very long delays.", evidence:"official", sources:["S26"]
    })
  ];

  nodes.forEach(node => {
    if (!AE_MAP_NODES.some(existing => existing.id === node.id)) AE_MAP_NODES.push(node);
  });

  const pairs = new Set([
    "discharge-ready>drd-discharges",
    "drd-discharges>drd-same-day",
    "drd-discharges>drd-delayed",
    "drd-same-day>actual-discharge",
    "drd-delayed>actual-discharge",
    "drd-delayed>drd-bed-days",
    "drd-delayed>drd-average-delay",
    "drd-bed-days>occupied-overnight-beds",
    "drd-bed-days>hospital-flow-pressure"
  ]);

  for (let index = AE_MAP_LINKS.length - 1; index >= 0; index -= 1) {
    const link = AE_MAP_LINKS[index];
    if (pairs.has(`${link.source}>${link.target}`)) AE_MAP_LINKS.splice(index,1);
  }

  AE_MAP_LINKS.push(
    AE_LINK("discharge-ready","drd-discharges","creates the eligible discharged-patient cohort","positive","official",["S26"]),
    AE_LINK("drd-discharges","drd-same-day","includes discharge on the ready date","positive","official",["S26"]),
    AE_LINK("drd-discharges","drd-delayed","includes discharge one or more days later","positive","official",["S26"]),
    AE_LINK("drd-same-day","actual-discharge","leaves hospital without a recorded additional day","positive","official",["S26"]),
    AE_LINK("drd-delayed","actual-discharge","eventually results in discharge after elapsed time","positive","official",["S26"]),
    AE_LINK("drd-delayed","drd-bed-days","accumulates bed-days after readiness","positive","official",["S26"]),
    AE_LINK("drd-delayed","drd-average-delay","determines the average elapsed delay","positive","official",["S26"]),
    AE_LINK("drd-bed-days","occupied-overnight-beds","contributes to occupied-bed use","positive","official",["S24","S26"]),
    AE_LINK("drd-bed-days","hospital-flow-pressure","adds bed use after readiness","positive","official",["S26"])
  );
})();
