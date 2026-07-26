// ============================================================
// 00. OPERATIONAL PATHWAY SELECTION
// ============================================================
// High-level route and denominator nodes should reveal the complete measurable
// branch rather than only the circles one relationship away.

(() => {
  const baseSelectNodeForPathways = selectNode;

  const ucrPathway = [
    "care-home-urgent-events",
    "ambulance-alternative",
    "urgent-community-capacity",
    "ucr-referrals",
    "ucr-care-contacts",
    "ucr-two-hour-achievement",
    "other-professional-route",
    "ae-attendance"
  ];

  const communityWaitPathway = [
    "urgent-community-capacity",
    "community-waiting-list",
    "community-under-18",
    "community-18-52",
    "community-over-52",
    "repeat-urgent-use"
  ];

  const csdsPathway = [
    "community-professional-referral",
    "csds-referrals",
    "csds-people-referred",
    "community-waiting-list",
    "csds-people-contacted",
    "csds-care-contacts",
    "csds-care-activities",
    "community-workforce",
    "post-discharge-support"
  ];

  const communityBedPathway = [
    "post-discharge-support",
    "community-bed-capacity",
    "community-bed-rehab",
    "community-bed-step-up",
    "community-bed-assessment",
    "community-bed-los",
    "emergency-admission",
    "delayed-discharge",
    "social-care-capacity"
  ];

  const hesPathway = [
    "ae-attendance",
    "admission-decision",
    "emergency-admission",
    "non-elective-bed-days",
    "hes-bed-days",
    "hes-mean-los",
    "available-overnight-beds",
    "occupied-overnight-beds",
    "overnight-bed-occupancy",
    "hospital-flow-pressure",
    "discharge-ready",
    "delayed-discharge",
    "acute-additional-bed-days",
    "actual-discharge"
  ];

  const acuteDischargePathway = [
    "emergency-admission",
    "hes-bed-days",
    "occupied-overnight-beds",
    "discharge-ready",
    "delayed-discharge",
    "acute-additional-bed-days",
    "actual-discharge",
    "post-discharge-support",
    "community-bed-capacity",
    "social-care-capacity"
  ];

  const drdPathway = [
    "non-elective-bed-days",
    "discharge-ready",
    "drd-discharges",
    "drd-same-day",
    "drd-delayed",
    "drd-bed-days",
    "drd-average-delay",
    "actual-discharge",
    "occupied-overnight-beds",
    "hospital-flow-pressure",
    "post-discharge-support"
  ];

  const gppsPathway = [
    "urgent-primary-demand",
    "gpps-phone-access",
    "gpps-website-access",
    "gpps-app-access",
    "gpps-reception-helpfulness",
    "gpps-contact-experience",
    "gpps-continuity",
    "gpad-appointments",
    "same-day-capacity",
    "gp-clinical-assessment",
    "gpps-listened",
    "gpps-care-concern",
    "failed-primary-access",
    "gp-ae-route",
    "ae-attendance"
  ];

  const qofPathway = [
    "population-size-mix",
    "frailty-multimorbidity",
    "qof-prevalence",
    "urgent-primary-demand",
    "qof-overall-achievement",
    "qof-indicator-achievement",
    "qof-pca",
    "gp-clinical-assessment",
    "gp-ae-route",
    "ae-attendance"
  ];

  const PATHWAYS = {
    "ambulance-ae-route":[
      "ambulance-calls",
      "ambulance-incidents",
      "ambulance-hear-treat",
      "ambulance-response",
      "ambulance-alternative",
      "ambulance-conveyed-ae",
      "ambulance-other-conveyance",
      "ambulance-ae-route",
      "ae-attendance"
    ],
    "nhs111-ae-route":[
      "nhs111-contacts",
      "nhs111-triage",
      "nhs111-ae-disposition",
      "nhs111-direct-booking",
      "nhs111-ae-route",
      "ae-attendance"
    ],
    "gpad-appointments":[
      "urgent-primary-demand",
      "gpad-appointments",
      "same-day-capacity",
      "gp-clinical-assessment",
      "failed-primary-access",
      "gp-ae-route",
      "ae-attendance"
    ],
    "urgent-community-capacity":ucrPathway,
    "ucr-referrals":ucrPathway,
    "ucr-care-contacts":ucrPathway,
    "ucr-two-hour-achievement":ucrPathway,
    "community-waiting-list":communityWaitPathway,
    "community-under-18":communityWaitPathway,
    "community-18-52":communityWaitPathway,
    "community-over-52":communityWaitPathway,
    "csds-referrals":csdsPathway,
    "csds-people-referred":csdsPathway,
    "csds-people-contacted":csdsPathway,
    "csds-care-contacts":csdsPathway,
    "csds-care-activities":csdsPathway,
    "community-bed-capacity":communityBedPathway,
    "community-bed-rehab":communityBedPathway,
    "community-bed-step-up":communityBedPathway,
    "community-bed-assessment":communityBedPathway,
    "community-bed-los":communityBedPathway,
    "emergency-admission":hesPathway,
    "hes-bed-days":hesPathway,
    "hes-mean-los":hesPathway,
    "available-overnight-beds":hesPathway,
    "occupied-overnight-beds":hesPathway,
    "overnight-bed-occupancy":hesPathway,
    "discharge-ready":acuteDischargePathway,
    "delayed-discharge":acuteDischargePathway,
    "acute-additional-bed-days":acuteDischargePathway,
    "actual-discharge":acuteDischargePathway,
    "drd-discharges":drdPathway,
    "drd-same-day":drdPathway,
    "drd-delayed":drdPathway,
    "drd-bed-days":drdPathway,
    "drd-average-delay":drdPathway,
    "gpps-phone-access":gppsPathway,
    "gpps-website-access":gppsPathway,
    "gpps-app-access":gppsPathway,
    "gpps-reception-helpfulness":gppsPathway,
    "gpps-contact-experience":gppsPathway,
    "gpps-continuity":gppsPathway,
    "gpps-listened":gppsPathway,
    "gpps-care-concern":gppsPathway,
    "qof-prevalence":qofPathway,
    "qof-overall-achievement":qofPathway,
    "qof-indicator-achievement":qofPathway,
    "qof-pca":qofPathway
  };

  selectNode = function(node,{ centre=false }={}) {
    const pathwayIds = PATHWAYS[node.id()];
    if (!pathwayIds) return baseSelectNodeForPathways(node,{ centre });

    // Preserve the existing panel-opening and detail-rendering behaviour first.
    baseSelectNodeForPathways(node,{ centre:false });

    const pathwayNodes = cy.collection(
      pathwayIds
        .map(id => cy.getElementById(id)[0])
        .filter(Boolean)
    );
    const pathwayEdges = cy.edges().filter(edge => pathwayNodes.contains(edge.source()) && pathwayNodes.contains(edge.target()));
    const pathway = pathwayNodes.union(pathwayEdges);

    cy.elements().removeClass("selected-node related-node related-edge faded");
    cy.elements().not(pathway).addClass("faded");
    node.addClass("selected-node");
    pathwayNodes.not(node).addClass("related-node");
    pathwayEdges.addClass("related-edge");

    if (centre) {
      cy.animate({ fit:{ eles:pathwayNodes,padding:80 } },{ duration:440,easing:"ease-in-out-cubic" });
    }
  };
})();
