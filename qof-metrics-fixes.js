// ============================================================
// 00. QOF DISPLAY CLARIFICATIONS
// ============================================================
// Keeps the displayed wording aligned with the official all-domain workbook and
// explains why indicator-level detail is not loaded for an individual practice.

(() => {
  const baseRenderNodeDetailsForQofClarifications = renderNodeDetails;
  const QOF_NODE_IDS = new Set([
    "qof-prevalence",
    "qof-overall-achievement",
    "qof-indicator-achievement",
    "qof-pca"
  ]);

  renderNodeDetails = function(node) {
    baseRenderNodeDetailsForQofClarifications(node);
    if (!QOF_NODE_IDS.has(node.id)) return;

    const card = document.querySelector("#nodeDetails .qof-operational-card");
    if (!card) return;

    // ============================================================
    // 01. USE THE PUBLISHED 635-POINT DEFINITION
    // ============================================================
    card.querySelectorAll(".qof-summary-grid > div").forEach(block => {
      const label = block.querySelector("span");
      const note = block.querySelector("small");
      if (label?.textContent === "Revised available points") {
        label.textContent = "Available points";
        if (note) note.textContent = "635 available points per included practice in the published all-domain table";
      }
    });

    // ============================================================
    // 02. EXPLAIN THE COMPACT PRACTICE-DATA SCOPE
    // ============================================================
    const scope = document.querySelector(".qof-metric-scope")?.textContent || "";
    const isPractice = scope.includes("· practice ·");
    const isIndicatorNode = node.id === "qof-indicator-achievement" || node.id === "qof-pca";

    if (isPractice && isIndicatorNode) {
      const note = document.createElement("p");
      note.className = "metric-note";
      note.textContent = "Indicator achievement and PCA detail are provided at England and ICB level. The compact practice file retains all condition prevalence groups and overall QOF points.";
      const question = card.querySelector(".metric-exact");
      if (question) question.insertAdjacentElement("afterend",note);
    }
  };
})();

// ============================================================
// 03. LINK TO THE SEPARATE ICB DIAGNOSTIC PAGE
// ============================================================
// The systems map remains the main page. The question-led diagnostic prototype
// now lives at /diagnostic/ and shares the same public data files.

(() => {
  const actions = document.querySelector(".header-actions");
  if (!actions || document.getElementById("diagnosticViewLink")) return;

  const link = document.createElement("a");
  link.id = "diagnosticViewLink";
  link.className = "ghost-button";
  link.href = "diagnostic/";
  link.textContent = "ICB diagnostic view";
  link.style.display = "inline-flex";
  link.style.alignItems = "center";
  link.style.textDecoration = "none";
  actions.prepend(link);
})();
