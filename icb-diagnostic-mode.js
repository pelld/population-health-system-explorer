// ============================================================
// 00. ICB DIAGNOSTIC PATHWAY: PURPOSE
// ============================================================
// Replaces the visible free-form network with a question-led ICB view.
// The original operational map remains loaded underneath so existing data
// modules continue to run, but provider and trust selectors are not exposed.

(() => {
  "use strict";

  const systemView = document.getElementById("systemView");
  if (!systemView || document.getElementById("icbDiagnosticExplorer")) return;

  // ============================================================
  // 01. CONFIGURATION
  // ============================================================
  const QUESTIONS = {
    attendances: {
      label: "Why are more people reaching A&E?",
      summary: "Start with population need, access to alternatives and the routes that can lead towards emergency care."
    },
    admissions: {
      label: "Why are more attendances becoming admissions?",
      summary: "Separate underlying need from the availability of alternatives and the hospital decision to admit."
    },
    beddays: {
      label: "Why are emergency patients using more bed-days?",
      summary: "Bed use reflects both the number admitted and what happens before a person can safely leave hospital."
    },
    repeat: {
      label: "Why are people returning to urgent care?",
      summary: "Look for unresolved need, access problems, weak continuity and gaps after discharge."
    }
  };

  const STAGES = [
    { id: "need", label: "Population need", relationship: "context" },
    { id: "alternatives", label: "Access and alternatives", relationship: "influences" },
    { id: "hospital", label: "Emergency hospital use", relationship: "observed" },
    { id: "recovery", label: "Recovery and repeat use", relationship: "outcomes" }
  ];

  const DATA_PATHS = {
    qof: "public-data/qof-2024-25.json",
    gpps: "public-data/gpps-2025.json",
    ucr: "public-data/ucr-2024-25.json",
    waits: "public-data/community-waits-2024-25.json",
    hes: "public-data/hes-apc-2024-25.json"
  };

  const METRICS = [
    {
      id: "qof-hypertension",
      stage: "need",
      questions: ["attendances", "admissions", "beddays"],
      title: "Recorded hypertension prevalence",
      kind: "Context",
      sourceKey: "qof",
      period: "QOF 2024-25",
      metric: geography => geography?.prevalence?.HYP,
      why: "Long-term condition burden changes the expected level and complexity of urgent care need.",
      next: "Compare with age, deprivation, other long-term conditions and emergency admission rates.",
      caution: "Recorded prevalence reflects both underlying disease and how well it is detected and coded."
    },
    {
      id: "qof-copd",
      stage: "need",
      questions: ["attendances", "admissions", "repeat"],
      title: "Recorded COPD prevalence",
      kind: "Context",
      sourceKey: "qof",
      period: "QOF 2024-25",
      metric: geography => geography?.prevalence?.COPD,
      why: "COPD can create recurrent deterioration, ambulance use, A&E attendance and emergency admission.",
      next: "Compare with smoking, respiratory admissions, vaccination and community respiratory support.",
      caution: "A higher register rate may reflect better diagnosis as well as greater need."
    },
    {
      id: "gpps-contact",
      stage: "alternatives",
      questions: ["attendances", "repeat"],
      title: "Good experience contacting general practice",
      kind: "Access",
      sourceKey: "gpps",
      period: "GP Patient Survey 2025",
      metric: geography => geography?.metrics?.["gpps-contact-experience"],
      why: "Difficulty contacting general practice may change where and when people seek urgent help.",
      next: "Compare with appointment supply, same-day access, NHS 111 use and self-presentation.",
      caution: "Survey experience is associated with access but does not prove that an A&E attendance was avoidable."
    },
    {
      id: "gpps-continuity",
      stage: "alternatives",
      questions: ["repeat"],
      title: "Preferred healthcare professional continuity",
      kind: "Continuity",
      sourceKey: "gpps",
      period: "GP Patient Survey 2025",
      metric: geography => geography?.metrics?.["gpps-continuity"],
      why: "Continuity can help people manage recurrent or complex problems before they become crises.",
      next: "Compare repeat urgent use by age, condition, prior contacts and care-plan status.",
      caution: "The survey question applies to people with a preferred professional and is not a direct repeat-use measure."
    },
    {
      id: "ucr-referrals",
      stage: "alternatives",
      questions: ["attendances", "admissions", "beddays", "repeat"],
      title: "Urgent community response referrals",
      kind: "Alternative pathway",
      sourceKey: "ucr",
      period: "UCR 2024-25",
      metric: geography => geography?.metrics?.["ucr-referrals"],
      why: "Urgent community response may provide assessment and treatment without hospital attendance or admission.",
      next: "Compare referrals, acceptance, response times and later A&E attendance or admission.",
      caution: "More referrals can indicate greater capacity, greater need or both."
    },
    {
      id: "ucr-two-hour",
      stage: "alternatives",
      questions: ["attendances", "admissions", "beddays"],
      title: "UCR two-hour achievement",
      kind: "Response",
      sourceKey: "ucr",
      period: "UCR 2024-25",
      metric: geography => geography?.metrics?.["ucr-two-hour-achievement"],
      why: "An alternative pathway only changes urgent-care decisions if it responds quickly enough to be usable.",
      next: "Compare the eligible denominator, operating hours, referral source and downstream outcomes.",
      caution: "Achievement does not describe clinical appropriateness or whether demand was unmet before referral."
    },
    {
      id: "ae-attendances",
      stage: "hospital",
      questions: ["attendances", "admissions", "repeat"],
      title: "A&E attendances",
      kind: "Observed activity",
      sourceKey: "gap",
      period: "ICB series required",
      metric: () => null,
      why: "This is the central observed event for the first two diagnostic questions.",
      next: "Add an ICB-consistent attendance series, then split it by route, age, diagnosis and outcome.",
      caution: "The current public route file is provider based, so it is deliberately not shown against the ICB selector."
    },
    {
      id: "hes-emergency-admissions",
      stage: "hospital",
      questions: ["attendances", "admissions", "beddays", "repeat"],
      title: "Emergency admissions",
      kind: "Observed activity",
      sourceKey: "hes",
      period: "HES APC 2024-25",
      metric: geography => geography?.metrics?.["emergency-admission"],
      why: "Emergency admissions describe the activity that crosses from urgent assessment into inpatient care.",
      next: "Compare with A&E attendance, admission conversion, age, diagnosis and short-stay activity.",
      caution: "The ICB total is based on responsibility geography and is not the same as provider activity."
    },
    {
      id: "hes-bed-days",
      stage: "hospital",
      questions: ["beddays"],
      title: "Emergency bed-days",
      kind: "Data gap",
      sourceKey: "hes",
      period: "HES APC 2024-25",
      metric: geography => geography?.metrics?.["hes-bed-days"],
      why: "Bed pressure depends on occupied days, not admissions alone.",
      next: "Use patient-level or locally aggregated HES to calculate emergency bed-days and length of stay by ICB.",
      caution: "The existing public HES file does not publish ICB bed-days or mean length of stay."
    },
    {
      id: "community-waiting-list",
      stage: "recovery",
      questions: ["beddays", "repeat"],
      title: "Community waiting list",
      kind: "Capacity",
      sourceKey: "waits",
      period: "March 2025",
      metric: geography => geography?.metrics?.["community-waiting-list"],
      why: "Waiting community demand may constrain recovery, rehabilitation and support outside hospital.",
      next: "Compare waiting-list size with referrals, activity, workforce, discharge pathways and repeat urgent use.",
      caution: "A waiting list is a stock affected by demand, capacity, recording and the definition of an open pathway."
    },
    {
      id: "community-over-52",
      stage: "recovery",
      questions: ["beddays", "repeat"],
      title: "Community waits over 52 weeks",
      kind: "Capacity",
      sourceKey: "waits",
      period: "March 2025",
      metric: geography => geography?.metrics?.["community-over-52"],
      why: "Very long waits may leave need unresolved and increase the chance of deterioration or repeated contact.",
      next: "Identify the services, cohorts and pathways responsible for the longest waits.",
      caution: "The data do not establish that a later urgent event was caused by the wait."
    }
  ];

  const state = {
    question: "attendances",
    icbCode: "",
    datasets: {},
    selectedMetric: "ae-attendances"
  };

  // ============================================================
  // 02. HTML SHELL
  // ============================================================
  const explorer = document.createElement("section");
  explorer.id = "icbDiagnosticExplorer";
  explorer.className = "icb-diagnostic-explorer";
  explorer.innerHTML = `
    <header class="diagnostic-header">
      <div>
        <p class="eyebrow teal">ICB diagnostic view</p>
        <h2>Where is urgent-care pressure arising?</h2>
        <p>Choose one ICB and one analytical question. Numbers are shown before you click; clicking a card explains how to investigate it.</p>
      </div>
      <label class="diagnostic-icb-control">
        <span>Integrated Care Board</span>
        <select id="diagnosticIcbSelect" aria-label="Choose an Integrated Care Board">
          <option value="">Loading ICBs…</option>
        </select>
        <small id="diagnosticIcbStatus">ICB rows only · no provider or trust selector</small>
      </label>
    </header>

    <nav id="diagnosticQuestions" class="diagnostic-questions" aria-label="Choose an analytical question"></nav>

    <div class="diagnostic-question-summary">
      <div>
        <p class="eyebrow">Current question</p>
        <h3 id="diagnosticQuestionTitle"></h3>
        <p id="diagnosticQuestionText"></p>
      </div>
      <div class="diagnostic-relationship-key" aria-label="Relationship types">
        <span><i class="context"></i> Context or possible influence</span>
        <span><i class="observed"></i> Observed pathway or activity</span>
        <span><i class="gap"></i> Important ICB data gap</span>
      </div>
    </div>

    <div class="diagnostic-workspace">
      <section class="diagnostic-network" aria-label="ICB urgent-care diagnostic pathway">
        <div id="diagnosticStageHeaders" class="diagnostic-stage-headers"></div>
        <div id="diagnosticMetricGrid" class="diagnostic-metric-grid"></div>
      </section>

      <aside id="diagnosticDetail" class="diagnostic-detail" aria-live="polite"></aside>
    </div>
  `;

  systemView.insertBefore(explorer, systemView.firstChild);
  systemView.classList.add("icb-diagnostic-active");

  const icbSelect = document.getElementById("diagnosticIcbSelect");
  const icbStatus = document.getElementById("diagnosticIcbStatus");
  const questionNav = document.getElementById("diagnosticQuestions");
  const questionTitle = document.getElementById("diagnosticQuestionTitle");
  const questionText = document.getElementById("diagnosticQuestionText");
  const stageHeaders = document.getElementById("diagnosticStageHeaders");
  const metricGrid = document.getElementById("diagnosticMetricGrid");
  const detailPanel = document.getElementById("diagnosticDetail");

  // ============================================================
  // 03. DATA HELPERS
  // ============================================================
  async function loadJson(path) {
    try {
      const separator = path.includes("?") ? "&" : "?";
      const response = await fetch(`${path}${separator}v=${Date.now()}`, { cache: "no-store" });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return await response.json();
    } catch (error) {
      console.warn(`Diagnostic view could not load ${path}`, error);
      return null;
    }
  }

  function normaliseName(value = "") {
    return value.toLowerCase().replace(/nhs|integrated care board|icb|and/g, " ").replace(/[^a-z0-9]+/g, " ").trim();
  }

  function geographyFor(dataset, icbCode) {
    if (!dataset?.icbs?.length) return null;
    const master = state.datasets.qof?.icbs?.find(item => item.code === icbCode);
    return dataset.icbs.find(item => item.code === icbCode)
      || dataset.icbs.find(item => normaliseName(item.name) === normaliseName(master?.name));
  }

  function numericValue(metric) {
    if (!metric) return null;
    const preferred = metric.display === "percent" ? ["percent", "value", "rate", "count"]
      : metric.display === "days" ? ["days", "value", "mean", "count"]
      : ["rate_per_1000", "rate", "percent", "count", "value", "days", "mean"];

    for (const key of preferred) {
      const value = Number(metric[key]);
      if (Number.isFinite(value)) return { key, value };
    }
    return null;
  }

  function formatNumber(value) {
    if (!Number.isFinite(value)) return "—";
    if (Math.abs(value) >= 1000000) return `${(value / 1000000).toFixed(2)}m`;
    if (Math.abs(value) >= 1000) return `${(value / 1000).toFixed(1)}k`;
    return new Intl.NumberFormat("en-GB", { maximumFractionDigits: 1 }).format(value);
  }

  function displayMetric(metric) {
    const numeric = numericValue(metric);
    if (!numeric) return { value: "Not published", full: "No comparable ICB value", available: false };

    if (numeric.key === "percent" || metric?.display === "percent") {
      return { value: `${numeric.value.toFixed(numeric.value >= 10 ? 1 : 2)}%`, full: `${numeric.value}%`, available: true };
    }
    if (numeric.key === "days" || numeric.key === "mean" || metric?.display === "days") {
      return { value: `${numeric.value.toFixed(1)} days`, full: `${numeric.value} days`, available: true };
    }
    if (numeric.key === "rate_per_1000") {
      return { value: `${numeric.value.toFixed(1)} per 1,000`, full: `${numeric.value} per 1,000`, available: true };
    }
    return { value: formatNumber(numeric.value), full: new Intl.NumberFormat("en-GB").format(numeric.value), available: true };
  }

  function currentMetric(definition, england = false) {
    if (definition.sourceKey === "gap") return null;
    const dataset = state.datasets[definition.sourceKey];
    const geography = england ? dataset?.england : geographyFor(dataset, state.icbCode);
    return definition.metric(geography);
  }

  function comparatorText(definition) {
    const icb = displayMetric(currentMetric(definition));
    const england = displayMetric(currentMetric(definition, true));
    if (!icb.available) return definition.sourceKey === "gap" ? "ICB data not yet loaded" : "No comparable ICB value";
    if (!england.available) return "England comparison unavailable";
    return `England: ${england.value}`;
  }

  // ============================================================
  // 04. RENDER CONTROLS AND NETWORK
  // ============================================================
  function renderQuestions() {
    questionNav.innerHTML = Object.entries(QUESTIONS).map(([id, question], index) => `
      <button type="button" data-question="${id}" class="${state.question === id ? "active" : ""}">
        <span>${index + 1}</span><strong>${question.label}</strong>
      </button>
    `).join("");

    questionNav.querySelectorAll("button").forEach(button => button.addEventListener("click", () => {
      state.question = button.dataset.question;
      const visibleMetrics = METRICS.filter(item => item.questions.includes(state.question));
      if (!visibleMetrics.some(item => item.id === state.selectedMetric)) state.selectedMetric = visibleMetrics[0]?.id || "";
      renderAll();
    }));
  }

  function renderStageHeaders() {
    stageHeaders.innerHTML = STAGES.map((stage, index) => `
      <div class="diagnostic-stage ${stage.relationship}">
        <span>${index + 1}</span>
        <strong>${stage.label}</strong>
        ${index < STAGES.length - 1 ? `<i aria-hidden="true">→</i>` : ""}
      </div>
    `).join("");
  }

  function renderMetricCard(definition) {
    const metric = displayMetric(currentMetric(definition));
    const selected = state.selectedMetric === definition.id;
    const unavailableClass = metric.available ? "" : " unavailable";
    const dataStatus = metric.available ? definition.kind : definition.sourceKey === "gap" ? "ICB data gap" : "Not published";

    return `
      <button type="button" class="diagnostic-metric-card${selected ? " selected" : ""}${unavailableClass}" data-metric="${definition.id}" style="--stage:${STAGES.findIndex(stage => stage.id === definition.stage) + 1}">
        <span class="metric-kind">${dataStatus}</span>
        <strong class="metric-title">${definition.title}</strong>
        <span class="metric-value">${metric.value}</span>
        <span class="metric-comparator">${comparatorText(definition)}</span>
        <small>${definition.period}</small>
        <em>Click to investigate</em>
      </button>
    `;
  }

  function renderMetrics() {
    const visible = METRICS.filter(item => item.questions.includes(state.question));
    metricGrid.innerHTML = STAGES.map(stage => `
      <div class="diagnostic-stage-column" data-stage="${stage.id}">
        ${visible.filter(item => item.stage === stage.id).map(renderMetricCard).join("") || `<p class="diagnostic-empty-stage">No measure selected for this question.</p>`}
      </div>
    `).join("");

    metricGrid.querySelectorAll(".diagnostic-metric-card").forEach(card => card.addEventListener("click", () => {
      state.selectedMetric = card.dataset.metric;
      renderMetrics();
      renderDetail();
    }));
  }

  function renderDetail() {
    const definition = METRICS.find(item => item.id === state.selectedMetric)
      || METRICS.find(item => item.questions.includes(state.question));
    if (!definition) return;

    const icbMetric = currentMetric(definition);
    const value = displayMetric(icbMetric);
    const england = displayMetric(currentMetric(definition, true));
    const icb = state.datasets.qof?.icbs?.find(item => item.code === state.icbCode);

    detailPanel.innerHTML = `
      <p class="eyebrow teal">Investigate this result</p>
      <h3>${definition.title}</h3>
      <div class="diagnostic-detail-value ${value.available ? "" : "unavailable"}">
        <strong>${value.value}</strong>
        <span>${icb?.name || "Selected ICB"}</span>
        <small>${definition.period}${england.available ? ` · England ${england.value}` : ""}</small>
      </div>
      <section><strong>Why it is connected</strong><p>${definition.why}</p></section>
      <section><strong>What to examine next</strong><p>${definition.next}</p></section>
      <section class="caution"><strong>Important caution</strong><p>${definition.caution}</p></section>
      <p class="diagnostic-click-purpose">Clicking does not reveal another unrelated dataset. It explains how this number fits the selected question and where to investigate next.</p>
    `;
  }

  function renderAll() {
    const question = QUESTIONS[state.question];
    questionTitle.textContent = question.label;
    questionText.textContent = question.summary;
    renderQuestions();
    renderStageHeaders();
    renderMetrics();
    renderDetail();
  }

  // ============================================================
  // 05. LOAD DATA AND POPULATE THE SINGLE ICB SELECTOR
  // ============================================================
  async function initialise() {
    const entries = await Promise.all(Object.entries(DATA_PATHS).map(async ([key, path]) => [key, await loadJson(path)]));
    state.datasets = Object.fromEntries(entries);

    const icbs = state.datasets.qof?.icbs || state.datasets.gpps?.icbs || state.datasets.ucr?.icbs || [];
    if (!icbs.length) {
      icbSelect.innerHTML = `<option value="">ICB data unavailable</option>`;
      icbSelect.disabled = true;
      icbStatus.textContent = "The public ICB files could not be loaded";
      renderAll();
      return;
    }

    icbSelect.innerHTML = icbs.map(item => `<option value="${item.code}">${item.name}</option>`).join("");
    const defaultIcb = icbs.find(item => /Birmingham.*Solihull/i.test(item.name)) || icbs[0];
    state.icbCode = defaultIcb.code;
    icbSelect.value = state.icbCode;
    icbStatus.textContent = "ICB rows only · no provider or trust selector";

    icbSelect.addEventListener("change", () => {
      state.icbCode = icbSelect.value;
      renderAll();
    });

    renderAll();
  }

  initialise();
})();
