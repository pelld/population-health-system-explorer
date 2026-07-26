// ============================================================
// 00. QOF — RECORDED PREVALENCE, ACHIEVEMENT AND PCA
// ============================================================
// QOF describes selected incentivised registers and indicators. These are
// aggregate practice records, not linked patients and not complete morbidity.

(() => {
  const nodes = [
    AE_NODE("qof-prevalence","QOF recorded condition prevalence","population",3,204,820,{
      summary:"The recorded QOF register divided by the relevant published practice-list denominator for a selected condition group.",
      why:"Recorded prevalence provides context for differences in need and complexity, but it is affected by diagnosis, coding, eligibility and participation.",
      action:"Choose a condition and compare England, ICB and practice values alongside population age, deprivation and other morbidity measures.",
      timescale:"long", owner:"GP practices and ICBs", measures:"Register count, relevant practice-list denominator and recorded prevalence percentage.",
      caution:"QOF prevalence covers selected diagnosed conditions and is not a complete estimate of true disease prevalence or multimorbidity.", evidence:"official", sources:["S28"]
    }),
    AE_NODE("qof-overall-achievement","QOF points achievement","primary",3,216,930,{
      summary:"The percentage of the 635 published available QOF points achieved across the selected geography.",
      why:"Points achievement summarises the incentive framework but combines different indicators, thresholds and payment-protection arrangements.",
      action:"Use the exact achieved and available points, then inspect the relevant indicator rather than treating the headline as a single quality score.",
      timescale:"diagnostic", owner:"GP practices and ICBs", measures:"Achieved points, 635 available points per included practice and percentage achieved.",
      caution:"QOF is an incentive scheme, not a performance-management league table. Payment-protected indicators may not reflect activity delivered in 2024-25.", evidence:"official", sources:["S28"]
    }),
    AE_NODE("qof-indicator-achievement","QOF indicator achievement","primary",3,228,820,{
      summary:"For a selected indicator, the published numerator divided by the denominator after personalised care adjustments.",
      why:"Indicator achievement provides specific clinical-process context that is hidden by total points.",
      action:"Select an indicator and examine numerator, denominator, PCA count and the full eligible population together.",
      timescale:"diagnostic", owner:"GP practices and ICBs", measures:"Numerator, denominator, underlying achievement net of PCAs and patients receiving intervention.",
      caution:"A high percentage does not establish overall care quality, clinical outcomes or causal effects on urgent-care use.", evidence:"official", sources:["S28"]
    }),
    AE_NODE("qof-pca","QOF personalised care adjustments","primary",3,240,930,{
      summary:"For a selected indicator, the number of personalised care adjustments divided by the denominator plus adjustments.",
      why:"PCA rates affect apparent achievement and may reflect clinical unsuitability, informed choice, non-response or other permitted reasons.",
      action:"Compare PCA rate with the underlying achievement denominator and indicator definition; investigate reasons locally before interpreting variation.",
      timescale:"diagnostic", owner:"GP practices and ICBs", measures:"PCA count, denominator plus PCAs and PCA percentage.",
      caution:"PCA variation is not automatically inappropriate exception reporting, and aggregate data do not identify individual reasons.", evidence:"official", sources:["S28"]
    })
  ];

  nodes.forEach(node => {
    if (!AE_MAP_NODES.some(existing => existing.id === node.id)) AE_MAP_NODES.push(node);
  });

  AE_MAP_LINKS.push(
    AE_LINK("qof-prevalence","frailty-multimorbidity","provides recorded-condition context for population complexity","positive","official",["S28"]),
    AE_LINK("qof-prevalence","urgent-primary-demand","can contribute to the volume and complexity of primary-care need","positive","hypothesis",["S28"]),
    AE_LINK("qof-overall-achievement","qof-indicator-achievement","summarises points across the underlying indicators","uncertain","official",["S28"]),
    AE_LINK("qof-pca","qof-indicator-achievement","changes the denominator used for underlying indicator achievement","uncertain","official",["S28"]),
    AE_LINK("qof-indicator-achievement","gp-clinical-assessment","provides selected recorded clinical-process context","uncertain","official",["S28"])
  );
})();
