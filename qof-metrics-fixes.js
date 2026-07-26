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
// 03. LOAD THE QUESTION-LED ICB DIAGNOSTIC VIEW
// ============================================================
// Kept as a separate module so the new interface can be developed without
// disturbing the existing dataset-specific map modules underneath it.

(() => {
  if (!document.querySelector('link[href="icb-diagnostic-mode.css"]')) {
    const stylesheet = document.createElement("link");
    stylesheet.rel = "stylesheet";
    stylesheet.href = "icb-diagnostic-mode.css";
    document.head.append(stylesheet);
  }

  if (!document.querySelector('script[src="icb-diagnostic-mode.js"]')) {
    const script = document.createElement("script");
    script.src = "icb-diagnostic-mode.js";
    script.defer = true;
    document.body.append(script);
  }
})();
