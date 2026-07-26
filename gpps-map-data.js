// ============================================================
// 00. GP PATIENT SURVEY — ACCESS, CONTINUITY AND EXPERIENCE
// ============================================================
// These nodes describe patient-reported experience. They provide context for the
// primary-care pathway but are not linked to GPAD, A&E or individual journeys.

(() => {
  const nodes = [
    AE_NODE("gpps-phone-access","Patient-reported ease of contacting general practice by phone","primary",3,-136,805,{
      summary:"The weighted percentage of survey respondents who found it very or fairly easy to contact their GP practice by phone.",
      why:"Telephone access affects how patients experience the first stage of seeking help, but the survey does not count every attempted contact or urgent request.",
      action:"Compare the estimate, confidence interval and response base with other access channels and operational appointment information.",
      timescale:"diagnostic", owner:"GP practices and ICBs", measures:"Weighted percentage; 95% confidence interval; unweighted evaluative base and survey response rate.",
      caution:"This is patient-reported survey experience, not the proportion of all calls answered and not a linked measure of later A&E use.", evidence:"official", sources:["S27"]
    }),
    AE_NODE("gpps-website-access","Patient-reported ease of contacting general practice by website","primary",3,-124,925,{
      summary:"The weighted percentage of respondents who found it very or fairly easy to contact their GP practice using its website.",
      why:"Digital access can provide another route into primary care, but availability, use and confidence vary between patients and practices.",
      action:"Review alongside phone and NHS App experience, response bases and local digital inclusion information.",
      timescale:"diagnostic", owner:"GP practices and ICBs", measures:"Weighted percentage; 95% confidence interval and unweighted evaluative base.",
      caution:"The denominator is respondents who had tried the website, not every registered patient.", evidence:"official", sources:["S27"]
    }),
    AE_NODE("gpps-app-access","Patient-reported ease of contacting general practice using the NHS App","primary",3,-112,805,{
      summary:"The weighted percentage of respondents who found it very or fairly easy to contact their GP practice using the NHS App.",
      why:"App access may complement other routes, but use depends on local configuration, patient choice and digital capability.",
      action:"Compare with website and telephone experience and check the number of respondents included.",
      timescale:"diagnostic", owner:"GP practices, ICBs and national digital services", measures:"Weighted percentage; 95% confidence interval and unweighted evaluative base.",
      caution:"The denominator is respondents who had tried the NHS App; it is not a measure of total app availability or transactions.", evidence:"official", sources:["S27"]
    }),
    AE_NODE("gpps-reception-helpfulness","Patient-reported helpfulness of reception and administrative staff","primary",3,-100,925,{
      summary:"The weighted percentage describing the practice reception and administrative team as very or fairly helpful.",
      why:"Administrative interactions shape navigation, communication and the experience of seeking care.",
      action:"Use this with access and contact-experience measures rather than as a standalone staff-performance score.",
      timescale:"diagnostic", owner:"GP practices and ICBs", measures:"Weighted percentage; 95% confidence interval and unweighted evaluative base.",
      caution:"Survey responses reflect patient experience and expectations and should not be converted into a staff league table.", evidence:"official", sources:["S27"]
    }),
    AE_NODE("gpps-contact-experience","Good patient-reported experience of contacting general practice","primary",3,-88,805,{
      summary:"The weighted percentage describing their overall experience of contacting the GP practice on that occasion as very or fairly good.",
      why:"This brings together several aspects of access and handling from the patient perspective.",
      action:"Compare with specific contact channels, response bases, confidence intervals and operational measures of delivered appointments.",
      timescale:"diagnostic", owner:"GP practices and ICBs", measures:"Weighted percentage; 95% confidence interval and unweighted evaluative base.",
      caution:"It is not a direct measure of unmet demand, clinical outcome or whether another urgent-care service was later used.", evidence:"official", sources:["S27"]
    }),
    AE_NODE("gpps-continuity","Patient-reported access to a preferred healthcare professional","primary",3,-76,925,{
      summary:"Among respondents with a preferred healthcare professional who had tried, the weighted percentage who could see or speak to them always, almost always or a lot of the time.",
      why:"Continuity can affect confidence, knowledge of history and management of complex or recurring need.",
      action:"Interpret the estimate with its restricted denominator and alongside workforce, appointment and population context.",
      timescale:"medium", owner:"GP practices and ICBs", measures:"Weighted percentage; 95% confidence interval and unweighted evaluative base.",
      caution:"This is not the percentage of all patients seeing their preferred professional; only an eligible survey subgroup is included.", evidence:"official", sources:["S27"]
    }),
    AE_NODE("gpps-listened","Patient reported that the healthcare professional listened well","primary",3,-64,805,{
      summary:"The weighted percentage rating the healthcare professional at their last appointment as very good or good at listening.",
      why:"Listening is an important component of consultation experience and shared understanding.",
      action:"Review alongside care and concern, confidence intervals and the number of respondents answering the question.",
      timescale:"diagnostic", owner:"GP practices and ICBs", measures:"Weighted percentage; 95% confidence interval and unweighted evaluative base.",
      caution:"This survey estimate does not measure clinical appropriateness, referral quality or subsequent outcomes.", evidence:"official", sources:["S27"]
    }),
    AE_NODE("gpps-care-concern","Patient reported being treated with care and concern","primary",3,-52,925,{
      summary:"The weighted percentage rating the healthcare professional at their last appointment as very good or good at treating them with care and concern.",
      why:"This describes relational experience during the consultation rather than the volume or timeliness of care.",
      action:"Use it with listening, access, continuity and confidence intervals—not as an isolated performance ranking.",
      timescale:"diagnostic", owner:"GP practices and ICBs", measures:"Weighted percentage; 95% confidence interval and unweighted evaluative base.",
      caution:"Patient-reported experience does not establish whether treatment or onward referral was clinically correct.", evidence:"official", sources:["S27"]
    })
  ];

  nodes.forEach(node => {
    if (!AE_MAP_NODES.some(existing => existing.id === node.id)) AE_MAP_NODES.push(node);
  });

  AE_MAP_LINKS.push(
    AE_LINK("gpps-phone-access","urgent-primary-demand","provides patient-reported context for the route into general practice","uncertain","official",["S27"]),
    AE_LINK("gpps-website-access","urgent-primary-demand","provides patient-reported context for a digital route into general practice","uncertain","official",["S27"]),
    AE_LINK("gpps-app-access","urgent-primary-demand","provides patient-reported context for an app route into general practice","uncertain","official",["S27"]),
    AE_LINK("gpps-reception-helpfulness","gpps-contact-experience","is a related component of reported contact experience","positive","official",["S27"]),
    AE_LINK("gpps-phone-access","gpps-contact-experience","is a related component of reported contact experience","positive","official",["S27"]),
    AE_LINK("gpps-website-access","gpps-contact-experience","is a related component of reported contact experience","positive","official",["S27"]),
    AE_LINK("gpps-app-access","gpps-contact-experience","is a related component of reported contact experience","positive","official",["S27"]),
    AE_LINK("gpps-continuity","gp-clinical-assessment","provides patient-reported continuity context","uncertain","official",["S27"]),
    AE_LINK("gp-clinical-assessment","gpps-listened","has a related patient-reported consultation experience","uncertain","official",["S27"]),
    AE_LINK("gp-clinical-assessment","gpps-care-concern","has a related patient-reported consultation experience","uncertain","official",["S27"])
  );
})();
