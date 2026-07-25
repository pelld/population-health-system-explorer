// ============================================================
// 00. LATEST PUBLIC OPERATIONAL METRICS
// ============================================================
// These are England-level official figures. They demonstrate how numbers can sit
// on the connected map without pretending that national totals explain ICB-level
// variation. Local and ICB data can later use the same object structure.

const OPERATIONAL_METRICS = {
  "ae-attendance": {
    value:"2.44m", exact:"2,437,906", label:"All A&E attendances", period:"Jun 2026", geography:"England", comparison:"+3.7% vs Jun 2025",
    sourceLabel:"NHS England A&E attendances and emergency admissions", sourceUrl:"https://www.england.nhs.uk/statistics/statistical-work-areas/ae-waiting-times-and-activity/ae-attendances-and-emergency-admissions-2026-27/",
    note:"All department types, including major A&E departments, minor injury units and walk-in centres."
  },
  "ae-assessment-treatment": {
    value:"75.0%", exact:"1,828,989 of 2,437,906", label:"Admitted, transferred or discharged within four hours", period:"Jun 2026", geography:"England", comparison:"75.6% in Jun 2025",
    sourceLabel:"NHS England A&E statistical commentary", sourceUrl:"https://www.england.nhs.uk/statistics/statistical-work-areas/ae-waiting-times-and-activity/ae-attendances-and-emergency-admissions-2026-27/",
    note:"All A&E department types. Type 1 performance was 61.2%."
  },
  "hospital-flow-pressure": {
    value:"49,466", exact:"49,466", label:"Patients delayed over 12 hours after a decision to admit", period:"Jun 2026", geography:"England", comparison:"+27.9% vs Jun 2025",
    sourceLabel:"NHS England A&E statistical commentary", sourceUrl:"https://www.england.nhs.uk/statistics/statistical-work-areas/ae-waiting-times-and-activity/ae-attendances-and-emergency-admissions-2026-27/",
    note:"There were also 126,819 delays of more than four hours from decision to admit to admission."
  },
  "nhs111-contacts": {
    value:"55k/day", exact:"Average 55,000 calls per day", label:"NHS 111 calls received", period:"Jun 2026", geography:"England", comparison:"Provisional",
    sourceLabel:"NHS England provisional IUC ADC", sourceUrl:"https://www.england.nhs.uk/statistics/statistical-work-areas/iucadc-new-from-april-2021/integrated-urgent-care-aggregate-data-collection-iucadc-inc-nhs111-statistics-apr-2026-mar-2027/",
    note:"Telephone calls only. Online contacts are not included in this provisional headline."
  },
  "nhs111-ae-disposition": {
    value:"15.0%", exact:"15.0% of triaged calls", label:"Recommended to attend an Emergency Treatment Centre", period:"Jun 2026", geography:"England", comparison:"Provisional",
    sourceLabel:"NHS England provisional IUC ADC", sourceUrl:"https://www.england.nhs.uk/statistics/statistical-work-areas/iucadc-new-from-april-2021/integrated-urgent-care-aggregate-data-collection-iucadc-inc-nhs111-statistics-apr-2026-mar-2027/",
    note:"This is a disposition, not confirmed subsequent attendance, and ETC is broader than a major ED. A further 11.5% were referred to the ambulance service."
  },
  "ambulance-incidents": {
    value:"815k", exact:"815,127", label:"Ambulance incidents", period:"Jun 2026", geography:"England", comparison:"27.1k per day",
    sourceLabel:"NHS England Ambulance Quality Indicators", sourceUrl:"https://www.england.nhs.uk/statistics/statistical-work-areas/ambulance-quality-indicators/ambulance-quality-indicators-data-2026-27/",
    note:"Incidents are not the same denominator as 999 calls. Some incidents originate from NHS 111."
  },
  "ambulance-assessment": {
    value:"651k", exact:"650,770", label:"Incidents receiving a face-to-face response", period:"Jun 2026", geography:"England", comparison:"21.7k per day",
    sourceLabel:"NHS England Ambulance Quality Indicators", sourceUrl:"https://www.england.nhs.uk/statistics/statistical-work-areas/ambulance-quality-indicators/ambulance-quality-indicators-data-2026-27/",
    note:"Face-to-face response is the nearest published national stage to the map's patient-assessment node."
  },
  "ambulance-ae-route": {
    value:"381k", exact:"381,106", label:"Ambulance incidents conveyed to an ED", period:"Jun 2026", geography:"England", comparison:"46.8% of incidents",
    sourceLabel:"NHS England Ambulance Quality Indicators", sourceUrl:"https://www.england.nhs.uk/statistics/statistical-work-areas/ambulance-quality-indicators/ambulance-quality-indicators-data-2026-27/",
    note:"The percentage uses all ambulance incidents as its denominator, not only face-to-face responses."
  },
  "ambulance-alternative": {
    value:"48.8%", exact:"20.2% Hear & Treat + 28.6% See & Treat", label:"Incidents closed by telephone or at scene", period:"Jun 2026", geography:"England", comparison:"Hear & Treat highest on record",
    sourceLabel:"NHS England Ambulance Quality Indicators", sourceUrl:"https://www.england.nhs.uk/statistics/statistical-work-areas/ambulance-quality-indicators/ambulance-quality-indicators-data-2026-27/",
    note:"The two percentages describe different operational outcomes and are shown together only as context."
  },
  "handover-delay": {
    value:"29:11", exact:"29 minutes 11 seconds", label:"Average ambulance handover time", period:"Jun 2026", geography:"England", comparison:"Slower than Jun 2025",
    sourceLabel:"NHS England Ambulance Quality Indicators", sourceUrl:"https://www.england.nhs.uk/statistics/statistical-work-areas/ambulance-quality-indicators/ambulance-quality-indicators-data-2026-27/",
    note:"National average; trust-level and ICB-related comparisons require the separate handover and management-information files."
  },
  "gpad-appointments": {
    value:"30.0m", exact:"30.0 million", label:"Appointments recorded across general practice", period:"May 2026", geography:"England", comparison:"98.9% of GP practices represented",
    sourceLabel:"Appointments in General Practice, May 2026", sourceUrl:"https://digital.nhs.uk/data-and-information/publications/statistical/appointments-in-general-practice/may-2026",
    note:"This is recorded appointment activity, not the totality of general-practice workload or attempted demand."
  },
  "same-day-capacity": {
    value:"44.9%", exact:"44.9% of appointments", label:"Appointments taking place on the day they were booked", period:"May 2026", geography:"England", comparison:"National GPAD figure",
    sourceLabel:"Appointments in General Practice, May 2026", sourceUrl:"https://digital.nhs.uk/data-and-information/publications/statistical/appointments-in-general-practice/may-2026",
    note:"Same-day booking does not establish that the appointment met urgent need or was clinically suitable."
  }
};

(() => {
  const map = el("systemMap");
  const toolbarControls = document.querySelector(".map-toolbar-controls");
  const baseRenderNodeDetails = renderNodeDetails;
  const metricBadges = new Map();
  let numbersVisible = true;

  if (!map || !toolbarControls) return;

  // ============================================================
  // 01. CREATE THE MAP NUMBER LAYER AND TOOLBAR CONTROL
  // ============================================================
  const metricLayer = document.createElement("div");
  metricLayer.className = "metric-layer";
  metricLayer.setAttribute("aria-hidden","true");
  map.append(metricLayer);

  const numbersButton = document.createElement("button");
  numbersButton.id = "toggleNumbers";
  numbersButton.className = "map-action numbers-toggle active";
  numbersButton.type = "button";
  numbersButton.textContent = "Hide numbers";
  numbersButton.setAttribute("aria-pressed","true");

  const scopeLabel = document.createElement("span");
  scopeLabel.className = "metric-scope";
  scopeLabel.textContent = "England · latest public data";

  const legendButton = el("toggleLegend");
  if (legendButton) {
    legendButton.insertAdjacentElement("afterend",numbersButton);
    numbersButton.insertAdjacentElement("afterend",scopeLabel);
  } else {
    toolbarControls.append(numbersButton,scopeLabel);
  }

  // ============================================================
  // 02. CREATE ONE HTML BADGE FOR EACH NUMBERED NODE
  // ============================================================
  Object.entries(OPERATIONAL_METRICS).forEach(([nodeId,metric]) => {
    if (!cy.getElementById(nodeId).length) return;

    const badge = document.createElement("button");
    badge.type = "button";
    badge.className = "node-metric-badge";
    badge.dataset.nodeId = nodeId;
    badge.innerHTML = `<strong>${metric.value}</strong><span>${metric.period}</span>`;
    badge.title = `${metric.label}: ${metric.exact} (${metric.geography}, ${metric.period})`;
    badge.addEventListener("click",() => selectNode(cy.getElementById(nodeId),{ centre:false }));
    metricLayer.append(badge);
    metricBadges.set(nodeId,badge);
  });

  function updateMetricPositions() {
    const zoom = cy.zoom();
    const showAtThisZoom = numbersVisible && zoom >= .34;

    metricBadges.forEach((badge,nodeId) => {
      const node = cy.getElementById(nodeId);
      if (!node.length || !showAtThisZoom || node.style("display") === "none") {
        badge.classList.remove("is-visible");
        return;
      }

      const position = node.renderedPosition();
      const x = position.x + (node.renderedWidth() * .34);
      const y = position.y - (node.renderedHeight() * .34);
      badge.style.left = `${x}px`;
      badge.style.top = `${y}px`;
      badge.classList.add("is-visible");
    });
  }

  numbersButton.addEventListener("click",() => {
    numbersVisible = !numbersVisible;
    numbersButton.classList.toggle("active",numbersVisible);
    numbersButton.textContent = numbersVisible ? "Hide numbers" : "Show numbers";
    numbersButton.setAttribute("aria-pressed",String(numbersVisible));
    metricLayer.classList.toggle("is-hidden",!numbersVisible);
    updateMetricPositions();
  });

  cy.on("pan zoom position render",updateMetricPositions);
  window.addEventListener("resize",updateMetricPositions);

  // ============================================================
  // 03. ADD THE FULL NUMBER, PERIOD AND SOURCE TO THE DETAILS DRAWER
  // ============================================================
  renderNodeDetails = function(node) {
    baseRenderNodeDetails(node);
    const metric = OPERATIONAL_METRICS[node.id];
    if (!metric) return;

    const metricCard = document.createElement("section");
    metricCard.className = "operational-metric-card";
    metricCard.innerHTML = `
      <div class="operational-metric-heading">
        <div><p class="eyebrow teal">Latest public figure</p><strong>${metric.value}</strong></div>
        <span>${metric.geography}<br>${metric.period}</span>
      </div>
      <h3>${metric.label}</h3>
      <p class="metric-exact">${metric.exact}</p>
      <p>${metric.comparison}</p>
      <p class="metric-note">${metric.note}</p>
      <a href="${metric.sourceUrl}" target="_blank" rel="noopener">${metric.sourceLabel}</a>`;

    el("nodeDetails").prepend(metricCard);
  };

  requestAnimationFrame(() => {
    updateMetricPositions();
    renderNodeDetails(NODE_BY_ID.get("ae-attendance"));
  });
})();
