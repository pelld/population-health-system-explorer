// ============================================================
// 00. FINAL HES ADMITTED-PATIENT ACTIVITY PATHWAY
// ============================================================
// Adds annual hospital bed-use and length-of-stay context around the existing
// emergency-admission node. The published bed-day measure covers all admitted
// patient care; it must not be relabelled as emergency or non-elective bed-days.

(() => {
  const nodes = [
    AE_NODE("hes-bed-days","All admitted-patient bed-days","hospital",2,82,1010,{
      summary:"The final annual HES provider analysis records finished consultant episode bed-days across all admitted patient care.",
      why:"Bed use reflects both the number of admissions and how long admitted care continues, including elective and emergency activity.",
      action:"Use the exact England and provider bed-day totals, while retaining the separate emergency-admission measure and admission-method mix.",
      timescale:"quick", owner:"Acute providers, ICBs and NHS England",
      measures:"Finished consultant episode bed-days; admissions; emergency admissions; length of stay and provider.",
      caution:"The public provider-analysis file does not publish an emergency-only bed-day measure or an ICB bed-day total. This node therefore describes all admitted care.", evidence:"official", sources:["S23"]
    }),
    AE_NODE("hes-mean-los","Mean admitted spell length of stay","hospital",2,98,1120,{
      summary:"The annual HES tables publish the mean duration of completed admitted spells.",
      why:"Longer stays increase bed use for a given number of admissions and may reflect case mix, treatment requirements, complications or delayed onward care.",
      action:"Compare the published mean and median alongside admission mix, age, provider role and discharge constraints.",
      timescale:"quick", owner:"Acute providers and ICBs",
      measures:"Mean and median spell duration; admission method; provider and case mix.",
      caution:"The published mean is not case-mix adjusted. A shorter stay is not automatically safer or better, and the public ICB table does not provide a direct ICB mean.", evidence:"official", sources:["S23"]
    })
  ];

  nodes.forEach(node => {
    if (!AE_MAP_NODES.some(existing => existing.id === node.id)) AE_MAP_NODES.push(node);
  });

  const requiredPairs = new Set([
    "emergency-admission>hes-bed-days",
    "non-elective-bed-days>hes-bed-days",
    "hes-mean-los>hes-bed-days",
    "hes-bed-days>hospital-flow-pressure",
    "delayed-discharge>hes-mean-los"
  ]);

  for (let index = AE_MAP_LINKS.length - 1; index >= 0; index -= 1) {
    const link = AE_MAP_LINKS[index];
    if (requiredPairs.has(`${link.source}>${link.target}`)) AE_MAP_LINKS.splice(index,1);
  }

  AE_MAP_LINKS.push(
    AE_LINK("emergency-admission","hes-bed-days","contributes to the wider all-admitted-care bed-day total","positive","official",["S23"]),
    AE_LINK("non-elective-bed-days","hes-bed-days","cannot be isolated from elective bed-days in this public annual measure","uncertain","gap",["S23"]),
    AE_LINK("hes-mean-los","hes-bed-days","longer stays increase bed-days for a given admission volume","positive","hypothesis",["S23"]),
    AE_LINK("hes-bed-days","hospital-flow-pressure","records annual use of admitted-care beds","positive","official",["S23"]),
    AE_LINK("delayed-discharge","hes-mean-los","can contribute to longer completed spells","positive","hypothesis",["S23"])
  );
})();
