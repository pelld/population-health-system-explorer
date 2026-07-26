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
    "csds-care-activities":csdsPathway
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
