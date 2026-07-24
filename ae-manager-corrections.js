// ============================================================
// 00. WORDING AND DIRECTION CORRECTIONS
// ============================================================
// These nodes are phrased as gaps or absences. Their arrows therefore show
// that the gap increases the management problem rather than reducing it.

const AE_LINK_CORRECTIONS = {
  "same-day-primary-care>alternatives-unavailable": { label:"removes a same-day alternative",polarity:"positive" },
  "care-home-support>social-support-insufficient": { label:"increases escalation from care homes",polarity:"positive" },
  "post-ae-followup>repeat-unresolved": { label:"allows risk to recur",polarity:"positive" },
  "frequent-attender-segmentation>repeat-unresolved": { label:"leads to generic responses",polarity:"positive" }
};

AE_MAP_LINKS.forEach(link => {
  const correction = AE_LINK_CORRECTIONS[`${link.source}>${link.target}`];
  if (!correction) return;
  link.label = correction.label;
  link.polarity = correction.polarity;
});
