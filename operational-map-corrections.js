// ============================================================
// 00. AMBULANCE PATHWAY: STAGES THAT BRANCH INTO OUTCOMES
// ============================================================
// The operational map should not show a stage unless it defines a useful
// denominator or branches into different outcomes. ECDS attendance source is
// kept separate from ambulance-service operational outcomes.

(() => {
  // ============================================================
  // 01. REMOVE THE REDUNDANT ASSESSMENT NODE
  // ============================================================
  const assessmentIndex = AE_MAP_NODES.findIndex(node => node.id === "ambulance-assessment");
  if (assessmentIndex >= 0) AE_MAP_NODES.splice(assessmentIndex,1);

  // ============================================================
  // 02. REPURPOSE EXISTING NODES AS CLEAR DENOMINATORS / OUTCOMES
  // ============================================================
  const response = AE_MAP_NODES.find(node => node.id === "ambulance-response");
  if (response) Object.assign(response,{
    label:"Face-to-face ambulance response",
    summary:"An ambulance clinician or responder reaches the patient and completes a face-to-face assessment.",
    why:"This is the denominator for the subsequent split between treatment at scene, conveyance to A&E and conveyance elsewhere.",
    action:"Compare the outcomes of face-to-face responses between systems after accounting for call category, patient need and local pathway availability.",
    measures:"Face-to-face responses; See & Treat; conveyance to A&E; conveyance elsewhere; recontact and later admission.",
    caution:"A face-to-face response is not the same as a vehicle dispatch: some dispatched resources do not result in a patient assessment.",
    angle:-42,
    radius:720
  });

  const seeAndTreat = AE_MAP_NODES.find(node => node.id === "ambulance-alternative");
  if (seeAndTreat) Object.assign(seeAndTreat,{
    label:"Treated or referred without conveyance (See & Treat)",
    summary:"Following a face-to-face assessment, the patient is treated at scene or referred to another service without being transported by ambulance.",
    why:"This is an observed ambulance outcome, not merely the existence of an alternative service.",
    action:"Compare See & Treat rates with case mix, recontacts, later A&E attendance and the availability of direct referral pathways.",
    measures:"See & Treat incidents; percentage of face-to-face responses; referral destination; recontact; later A&E attendance and admission.",
    caution:"A higher non-conveyance rate is not automatically safer or better.",
    timescale:"quick",
    evidence:"official",
    angle:-26,
    radius:610
  });

  const ambulanceRoute = AE_MAP_NODES.find(node => node.id === "ambulance-ae-route");
  if (ambulanceRoute) Object.assign(ambulanceRoute,{
    label:"Ambulance service recorded as attendance source",
    summary:"The public ECDS attendance-source field records the ambulance service as the source of referral for the A&E attendance.",
    why:"This is a classification of the A&E attendance. It is not the same measure as arrival by ambulance or ambulance-service conveyance to an ED.",
    measures:"ECDS ambulance-service attendance source; arrival mode; provider; A&E outcome and completeness.",
    caution:"Do not interpret the ECDS attendance-source percentage as the ambulance-service conveyance rate."
  });

  // ============================================================
  // 03. ADD THE OUTCOMES OF AN AMBULANCE INCIDENT
  // ============================================================
  if (!AE_MAP_NODES.some(node => node.id === "ambulance-hear-treat")) {
    AE_MAP_NODES.push(AE_NODE("ambulance-hear-treat","Resolved remotely (Hear & Treat)","ambulance",2,-58,610,{
      summary:"The incident is closed through telephone or remote clinical assessment without a face-to-face ambulance response.",
      why:"This is one alternative outcome of an ambulance incident and reduces the number requiring a dispatched face-to-face response.",
      action:"Compare Hear & Treat rates with call category, clinical input, repeat contact and safety outcomes.",
      timescale:"quick", owner:"Ambulance services and NHSE",
      measures:"Hear & Treat incidents; percentage of incidents; clinician involvement; repeat contact; later response and adverse outcomes.",
      caution:"Remote resolution must be assessed with outcomes; a high rate alone is not evidence of better performance.", evidence:"official", sources:["S9"]
    }));
  }

  if (!AE_MAP_NODES.some(node => node.id === "ambulance-conveyed-ae")) {
    AE_MAP_NODES.push(AE_NODE("ambulance-conveyed-ae","Conveyed to A&E by ambulance","ambulance",2,-10,610,{
      summary:"Following a face-to-face ambulance assessment, the patient is transported to an emergency department.",
      why:"This is an ambulance-service operational outcome and can be compared with See & Treat and conveyance to other destinations.",
      action:"Compare conveyance rates after face-to-face response with case mix, pathway availability, recontacts and A&E outcomes.",
      timescale:"quick", owner:"Ambulance services, ICBs and acute providers",
      measures:"Conveyances to A&E; percentage of face-to-face responses; call category; diagnosis; A&E treatment; admission and recontact.",
      caution:"A lower conveyance rate is not automatically safer or better.", evidence:"official", sources:["S9"]
    }));
  }

  if (!AE_MAP_NODES.some(node => node.id === "ambulance-other-conveyance")) {
    AE_MAP_NODES.push(AE_NODE("ambulance-other-conveyance","Conveyed somewhere other than A&E","ambulance",2,6,720,{
      summary:"The patient is transported to another destination rather than an emergency department.",
      why:"Direct conveyance to specialist, urgent, maternity, mental-health or other services can bypass A&E where an appropriate pathway exists.",
      action:"Separate destinations and compare their availability, use and outcomes between systems.",
      timescale:"medium", owner:"Ambulance services, ICBs and receiving providers",
      measures:"Conveyance destination; pathway availability; acceptance; later A&E attendance; admission; recontact and safety outcomes.",
      caution:"Destination coding and pathway definitions must be consistent before comparison.", evidence:"hypothesis", sources:["S9"]
    }));
  }

  // ============================================================
  // 04. REBUILD ONLY THE AMBULANCE-OUTCOME RELATIONSHIPS
  // ============================================================
  const replacedPairs = new Set([
    "ambulance-incidents>ambulance-response",
    "ambulance-response>ambulance-assessment",
    "ambulance-assessment>ambulance-ae-route",
    "ambulance-assessment>ambulance-alternative",
    "ambulance-alternative>ambulance-ae-route"
  ]);

  for (let index = AE_MAP_LINKS.length - 1; index >= 0; index -= 1) {
    const link = AE_MAP_LINKS[index];
    if (replacedPairs.has(`${link.source}>${link.target}`) || link.source === "ambulance-assessment" || link.target === "ambulance-assessment") {
      AE_MAP_LINKS.splice(index,1);
    }
  }

  AE_MAP_LINKS.push(
    AE_LINK("ambulance-incidents","ambulance-hear-treat","is resolved remotely","positive","official",["S9"]),
    AE_LINK("ambulance-incidents","ambulance-response","receives a face-to-face response","positive","official",["S9"]),
    AE_LINK("ambulance-response","ambulance-alternative","ends with treatment or referral at scene","positive","official",["S9"]),
    AE_LINK("ambulance-response","ambulance-conveyed-ae","ends with conveyance to A&E","positive","official",["S9"]),
    AE_LINK("ambulance-response","ambulance-other-conveyance","ends with conveyance to another destination","positive","hypothesis",["S9"]),
    AE_LINK("ambulance-conveyed-ae","ambulance-ae-route","contributes to the recorded ambulance route","uncertain","hypothesis",["S9"])
  );
})();
