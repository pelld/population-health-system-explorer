// ============================================================
// 00. PURPOSE
// ============================================================
// Add a first genuinely cross-system causal neighbourhood. The existing map
// remains intact, but multimorbidity now connects explicitly to health,
// employment, treatment difficulty, appointment burden and cost.

// ============================================================
// 01. FACTOR HELPERS
// ============================================================
function addFactorToDomain(domainId,id,label) {
  const domain = MAP_DOMAINS.find(item => item.id === domainId);
  if (!domain || domain.factors.some(([factorId]) => factorId === id)) return;
  domain.factors.push([id,label]);
}

function addMapLink(source,target,type="core") {
  const exists = MAP_LINKS.some(([existingSource,existingTarget]) => existingSource === source && existingTarget === target);
  if (!exists) MAP_LINKS.push([source,target,type]);
}

addFactorToDomain("primary","treatment-complexity","Treatment complexity");
addFactorToDomain("primary","appointment-burden","Appointment burden");
addFactorToDomain("resources","care-cost","Cost of care");

// ============================================================
// 02. FACTOR-SPECIFIC EXPLANATIONS
// ============================================================
SYSTEM_NODES.multimorbidity = {
  title:"Multimorbidity",
  summary:"Living with several conditions can create interacting illness, treatment and social consequences rather than several separate single-disease pathways.",
  influences:"Age, deprivation, accumulated exposure, earlier disease, treatment effects and survival with existing conditions.",
  changes:"Symptoms and disability, ability to work, treatment complexity, appointment burden, crisis risk, independence, quality of life and the cost of care.",
  measures:"Condition counts, disease combinations, medicines, contacts, admissions, bed-days, employment and functional outcomes—ideally linked at person level.",
  gaps:"A simple condition count does not show severity, interaction, treatment burden or what matters most to the person. Causal direction is often bidirectional."
};

SYSTEM_NODES["treatment-complexity"] = {
  title:"Treatment complexity",
  summary:"Several conditions can create competing priorities, interacting medicines, contradictory guidance and multiple organisational hand-offs.",
  influences:"The number and combination of conditions, frailty, medicines, specialist input, guideline design, continuity and coordination.",
  changes:"Clinical time, treatment burden, adverse effects, referrals, monitoring, continuity, adherence and the chance of achieving good overall control.",
  measures:"Medicine count, interaction warnings, number of specialties, care-plan complexity, appointments, duplicated tests and treatment changes.",
  gaps:"Routine datasets rarely show whether separate condition-specific decisions form one coherent plan for the person."
};

SYSTEM_NODES["appointment-burden"] = {
  title:"Appointment burden",
  summary:"People with several needs may have to organise and attend many separate contacts across different services.",
  influences:"Multimorbidity, fragmented pathways, monitoring requirements, referral patterns, travel, opening times and digital access.",
  changes:"Continuity, employment, caring responsibilities, treatment adherence, missed appointments and willingness to seek further help.",
  measures:"Contacts per person, number of organisations and sites, travel, cancellations, non-attendance and time between related appointments.",
  gaps:"Activity data records contacts but rarely the total time, disruption and coordination work transferred to the patient or carer."
};

SYSTEM_NODES["care-cost"] = {
  title:"Cost of care",
  summary:"Complex need can require more professional time, medicines, tests, coordination, urgent care and long-term support.",
  influences:"Need, treatment intensity, prices, workforce mix, duplication, fragmentation, crisis, length of stay and social-care requirements.",
  changes:"Pressure on available funding, thresholds, service choices and the resources left for prevention or other groups.",
  measures:"Person-level linked expenditure, prescribing, contacts, procedures, bed-days, social-care use and unpaid-care burden.",
  gaps:"Costs fall across organisations, patients and families. A saving in one part of the system may be a transfer elsewhere."
};

DRIVER_TREES.multimorbidity = [
  D("Conditions and treatments interact", "One condition can alter the risk, symptoms, treatment or consequences of another; medicines and guidance can also conflict.", "hypothesis", [], [
    D("Treatment becomes harder to optimise", "The best action for one condition may worsen another or compete for the same limited clinical and patient time.", "hypothesis"),
    D("Monitoring and appointments accumulate", "Separate pathways can create repeated tests, reviews and hand-offs rather than one coordinated plan.", "hypothesis")
  ]),
  D("Health affects social and economic life", "Symptoms, disability, fatigue and appointment burden can reduce the ability to obtain or sustain work and can lower household income.", "published", ["S1","S12"]),
  D("The relationship can reinforce itself", "Lower income, disrupted care and reduced independence can in turn worsen exposure, self-management and future health.", "hypothesis", ["S1","S2"]),
  D("What data misses", "Counts of diagnoses do not reveal severity, conflicting priorities, treatment burden or the work performed by patients and carers.", "gap", ["S4","S10"])
];

DRIVER_TREES["treatment-complexity"] = [
  D("Competing clinical priorities", "Multiple guidelines, contraindications and personal goals must be reconciled rather than followed independently.", "hypothesis"),
  D("Polypharmacy and treatment interaction", "More medicines can increase monitoring, adverse effects, interaction risk and the difficulty of identifying what caused a change.", "hypothesis", ["S4","S5"]),
  D("Fragmented specialist care", "Separate services may optimise individual conditions without ownership of the combined plan.", "hypothesis"),
  D("Whole-person quality is poorly measured", "Condition-specific targets may all be met while overall burden, function or patient priorities remain poor.", "gap", ["S4","S5"])
];

DRIVER_TREES["appointment-burden"] = [
  D("Number of required contacts", "Reviews, tests, referrals and treatment changes can accumulate across conditions and organisations.", "official", ["S4","S5","S10"]),
  D("Practical burden", "Travel, waiting, work, caring, disability, language and digital access determine whether those contacts are feasible.", "published", ["S1","S2"]),
  D("Patient coordination work", "People and carers often carry information, chase results and reconcile contradictory instructions.", "hypothesis"),
  D("Time cost is largely invisible", "Routine activity counts contacts but not the total disruption or opportunity cost to the household.", "gap")
];

DRIVER_TREES["care-cost"] = [
  D("More and more complex care", "Multimorbidity can increase medicines, diagnostics, professional time, coordination and use of urgent and long-term support.", "hypothesis"),
  D("Costs cross organisational boundaries", "NHS, social care, benefits, patients and unpaid carers may each bear different consequences.", "published", ["S7","S8","S10"]),
  D("Poor coordination can duplicate work", "Repeated assessment, tests, contacts and failed transitions can consume resources without improving outcomes.", "hypothesis"),
  D("Whole-system cost is rarely visible", "Separate budgets make transfers of cost look like savings or pressures in different places.", "gap")
];

// ============================================================
// 03. MULTIMORBIDITY CAUSAL RELATIONSHIPS
// ============================================================
[
  ["incidence","multimorbidity","core"],
  ["crisis","multimorbidity","feedback"],
  ["multimorbidity","disability","core"],
  ["multimorbidity","frailty","core"],
  ["multimorbidity","quality-life","core"],
  ["multimorbidity","independence","core"],
  ["multimorbidity","employment","feedback"],
  ["multimorbidity","treatment-complexity","core"],
  ["multimorbidity","appointment-burden","core"],
  ["multimorbidity","care-cost","core"],
  ["treatment-complexity","appointment-burden","core"],
  ["treatment-complexity","referral","core"],
  ["treatment-complexity","control","core"],
  ["treatment-complexity","continuity","core"],
  ["appointment-burden","continuity","core"],
  ["appointment-burden","self-management","core"],
  ["appointment-burden","employment","feedback"],
  ["care-cost","funding","feedback"],
  ["care-cost","thresholds","feedback"],
  ["disability","employment","feedback"]
].forEach(([source,target,type]) => addMapLink(source,target,type));

Object.assign(RELATIONSHIP_DETAILS,{
  "incidence>multimorbidity":{ label:"adds further conditions over time",polarity:"positive",evidence:"hypothesis",sources:["S12"] },
  "crisis>multimorbidity":{ label:"can add complications and new disability",polarity:"positive",evidence:"hypothesis",sources:["S10"] },
  "multimorbidity>disability":{ label:"can increase",polarity:"positive",evidence:"published",sources:["S12"] },
  "multimorbidity>frailty":{ label:"can accelerate",polarity:"positive",evidence:"hypothesis",sources:["S12"] },
  "multimorbidity>quality-life":{ label:"can reduce",polarity:"negative",evidence:"published",sources:["S12"] },
  "multimorbidity>independence":{ label:"can reduce",polarity:"negative",evidence:"published",sources:["S12"] },
  "multimorbidity>employment":{ label:"can make work harder to obtain or sustain",polarity:"negative",evidence:"hypothesis",sources:["S1","S12"] },
  "multimorbidity>treatment-complexity":{ label:"increases",polarity:"positive",evidence:"hypothesis",sources:[] },
  "multimorbidity>appointment-burden":{ label:"increases",polarity:"positive",evidence:"hypothesis",sources:["S4","S5"] },
  "multimorbidity>care-cost":{ label:"can increase",polarity:"positive",evidence:"hypothesis",sources:["S10"] },
  "treatment-complexity>appointment-burden":{ label:"creates more review and coordination",polarity:"positive",evidence:"hypothesis",sources:[] },
  "treatment-complexity>referral":{ label:"can increase specialist involvement",polarity:"positive",evidence:"hypothesis",sources:[] },
  "treatment-complexity>control":{ label:"can make overall control harder",polarity:"negative",evidence:"hypothesis",sources:[] },
  "treatment-complexity>continuity":{ label:"is harder to manage without",polarity:"negative",evidence:"hypothesis",sources:[] },
  "appointment-burden>continuity":{ label:"can fragment",polarity:"negative",evidence:"hypothesis",sources:[] },
  "appointment-burden>self-management":{ label:"can overwhelm",polarity:"negative",evidence:"hypothesis",sources:[] },
  "appointment-burden>employment":{ label:"can disrupt",polarity:"negative",evidence:"hypothesis",sources:[] },
  "care-cost>funding":{ label:"increases pressure on available resources",polarity:"negative",evidence:"hypothesis",sources:[] },
  "care-cost>thresholds":{ label:"can increase pressure to restrict access",polarity:"positive",evidence:"hypothesis",sources:[] },
  "disability>employment":{ label:"can reduce access to suitable work",polarity:"negative",evidence:"hypothesis",sources:["S1"] }
});

SYSTEM_LOOPS.push({
  id:"multimorbidity-burden",
  type:"R",
  title:"Multimorbidity, treatment burden and disadvantage",
  nodes:["multimorbidity","treatment-complexity","appointment-burden","employment","income","quality-life","crisis"],
  explanation:"More conditions can increase treatment and appointment burden, disrupt work and reduce income or quality of life. Those consequences can make care and self-management harder and increase the chance of further crisis and accumulated illness."
});
