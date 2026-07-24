// ============================================================
// 00. CONCEPTUAL SYSTEM CONTENT
// ============================================================
const SYSTEM_NODES = {
  determinants:{ title:"Wider determinants", summary:"Health is shaped long before someone reaches a health service.", influences:"Income, housing, education, employment, environment, crime, discrimination and social connection.", changes:"Exposure to risk, ability to stay healthy, help-seeking, recovery and healthy life expectancy.", measures:"IMD and its domains, employment, housing, education, crime and environmental indicators.", gaps:"Area measures do not describe every individual and cannot show exactly how determinants produced a particular outcome." },
  risk:{ title:"Risk and prevention", summary:"Risk accumulates across a lifetime, while prevention can delay or avoid some disease.", influences:"Wider determinants, genetics, behaviour, vaccination, screening and preventive treatment.", changes:"Disease incidence, age at onset, severity at diagnosis and later demand.", measures:"Risk-factor prevalence, screening uptake, vaccination, smoking, obesity, blood pressure and prescribing.", gaps:"Prevented events are invisible. Success is often inferred from what did not happen." },
  undiagnosed:{ title:"Condition develops", summary:"Disease can exist before it is recognised by either the person or the health system.", influences:"Underlying risk, disease biology, symptoms, access, testing and clinical thresholds.", changes:"The pool of unmet need and the likelihood of a later crisis or complication.", measures:"Modelled prevalence and selected audit measures can estimate part of the diagnosis gap.", gaps:"We usually cannot identify which specific people have an undiagnosed condition." },
  diagnosis:{ title:"Detection and diagnosis", summary:"Diagnosis makes disease visible and usually increases recorded prevalence.", influences:"Screening, contact with services, continuity, coding, thresholds and patient trust.", changes:"Access to treatment, recorded prevalence, patient identity and future monitoring.", measures:"QOF recorded prevalence, estimated prevalence, detection ratios and register counts.", gaps:"A high recorded rate may mean high burden, good detection, or both." },
  management:{ title:"Ongoing treatment", summary:"Treatment may control disease, prevent complications and help people live longer.", influences:"Workforce, continuity, medicines, adherence, self-management, access and treatment targets.", changes:"Symptoms, crisis risk, quality of life, mortality and the duration people live with conditions.", measures:"QOF achievement, CVDPREVENT, prescribing, reviews and treatment-to-target indicators.", gaps:"Process measures do not fully reveal treatment quality, individual preferences or causal effect." },
  crisis:{ title:"Crisis and acute care", summary:"Acute use reflects both population need and how the rest of the system is functioning.", influences:"Severity, prevention, access, help-seeking, ambulance pathways, bed capacity and admission thresholds.", changes:"Survival, disability, future risk, costs and subsequent service use.", measures:"Attendances, chief complaint, acuity, conversion, admissions, procedures, length of stay and mortality.", gaps:"Hospital-visible disease is not population prevalence. Capacity and demand influence one another." },
  recovery:{ title:"Recovery and adaptation", summary:"After illness or treatment, people may recover fully, adapt, relapse or become more dependent.", influences:"Severity, rehabilitation, community care, housing, informal care and social care.", changes:"Independence, quality of life, readmission, employment and future support needs.", measures:"Readmission, rehabilitation activity, discharge destination, community activity and social-care measures.", gaps:"Quality of recovery and unpaid care are poorly represented in routine health data." },
  living:{ title:"Living longer", summary:"Longer survival is a success, but it changes the future population and its needs.", influences:"Prevention, treatment effectiveness, living conditions and competing causes of death.", changes:"Prevalence, multimorbidity, dependency, healthy life expectancy and lifetime service use.", measures:"Survival, mortality, life expectancy, healthy life expectancy and condition prevalence.", gaps:"More prevalence or future treatment can reflect success rather than system failure." },
  capacity:{ title:"Service capacity", summary:"Capacity affects access, thresholds, queues and what activity the system can record.", influences:"Funding, workforce, infrastructure, historic provision, productivity and cross-boundary flows.", changes:"Waiting, admission decisions, treatment intensity, discharge and apparent demand.", measures:"Workforce, appointments, beds, occupancy, waits, community capacity and social-care supply.", gaps:"Supply can create or reveal demand. Current activity is therefore not a neutral measure of need." },
  "future-demand":{ title:"Future need and demand", summary:"Today’s choices alter tomorrow’s population, disease burden and service requirements.", influences:"Survival, incidence, ageing, migration, disability, prevention and treatment.", changes:"Workforce requirements, costs, capacity choices and the balance between sectors.", measures:"Population projections, prevalence trends, utilisation, bed-days and modelled scenarios.", gaps:"Avoided demand may be delayed rather than permanently removed, and forecasts depend on assumptions." },
  behaviour:{ title:"Access and behaviour", summary:"People do not experience or use the health system in identical ways.", influences:"Trust, health literacy, culture, continuity, cost, convenience, symptoms and prior experience.", changes:"Prevention uptake, time to diagnosis, emergency use, adherence and outcomes.", measures:"Survey results, appointment use, screening uptake, mode of arrival and patterns of attendance.", gaps:"Routine activity cannot reliably explain why someone sought—or did not seek—care." },
  outcomes:{ title:"Outcomes that matter", summary:"Activity is not the final objective. The system ultimately exists to improve lives fairly.", influences:"Every preceding part of the map, plus personal goals and circumstances.", changes:"Future health, participation, demand, public confidence and resource choices.", measures:"Mortality, quality of life, independence, healthy life expectancy, equity and patient-reported outcomes.", gaps:"The outcomes easiest to count are not always those people value most." }
};

// ============================================================
// 01. CONNECTIONS AND INTERVENTIONS
// ============================================================
const SYSTEM_EDGES = [
  ["determinants","risk","context"],["risk","undiagnosed","core"],["undiagnosed","diagnosis","core"],["diagnosis","management","core"],
  ["management","crisis","core"],["crisis","recovery","core"],["recovery","living","core"],["living","future-demand","feedback"],
  ["future-demand","capacity","feedback"],["capacity","diagnosis","context"],["capacity","management","context"],["capacity","crisis","context"],
  ["behaviour","diagnosis","context"],["behaviour","crisis","context"],["management","living","feedback"],["living","management","feedback"],
  ["recovery","outcomes","core"],["living","outcomes","core"],["determinants","outcomes","context"]
];

const INTERVENTIONS = {
  prevention:{ label:"Improve prevention and reduce risk", highlight:["determinants","risk","undiagnosed","future-demand"], intended:"Fewer or later new conditions; longer healthy life.", tradeoff:"Benefits emerge slowly and prevented events are difficult to observe." },
  detection:{ label:"Improve case-finding and diagnosis", highlight:["undiagnosed","diagnosis","management","future-demand"], intended:"More people receive treatment before complications occur.", tradeoff:"Recorded prevalence and immediate treatment demand rise, which can look like deterioration." },
  management:{ label:"Improve long-term condition management", highlight:["management","crisis","living","future-demand"], intended:"Better control, fewer complications and improved survival.", tradeoff:"People may live longer with conditions and require treatment for more years." },
  beds:{ label:"Increase acute bed capacity", highlight:["capacity","crisis","recovery"], intended:"Less crowding and more capacity to admit people who may benefit.", tradeoff:"Admission thresholds may fall; activity and cost can rise without a change in underlying need." },
  community:{ label:"Expand community and social care", highlight:["capacity","recovery","crisis","outcomes"], intended:"Support recovery, independence and alternatives to hospital care.", tradeoff:"Demand may be revealed rather than removed, and savings may appear in a different organisation." }
};

// ============================================================
// 02. ILLUSTRATIVE EVIDENCE NODES
// ============================================================
const EVIDENCE_NODES = [
  { id:"population", label:"Registered population", value:"1.24m", note:"People", status:"measured", interpretation:"A denominator for rates, but registration and resident populations differ." },
  { id:"need", label:"Estimated people living with selected conditions", value:"214k", note:"Modelled", status:"proxy", interpretation:"Estimated burden is independent of diagnosis but depends on model assumptions." },
  { id:"diagnosed", label:"People on QOF registers", value:"176k", note:"Recorded", status:"measured", interpretation:"Recorded prevalence reflects both underlying disease and how effectively conditions are identified." },
  { id:"controlled", label:"Condition appropriately controlled", value:"—", note:"Not consistently comparable", status:"gap", interpretation:"Available treatment indicators differ by condition and do not create one overall measure of good management." },
  { id:"attendance", label:"Emergency attendances", value:"412k", note:"Per year", status:"measured", interpretation:"Attendances reflect need, access, behaviour, ambulance pathways and alternative service availability." },
  { id:"conversion", label:"Attendance resulting in admission", value:"28.6%", note:"Illustrative", status:"proxy", interpretation:"A possible admission-threshold signal, but it also changes with acuity and the mix of people attending." },
  { id:"admissions", label:"Emergency admissions", value:"118k", note:"Per year", status:"measured", interpretation:"Admissions are an output of need, attendance and clinical/capacity decisions—not a direct measure of poor primary care." },
  { id:"severity", label:"Severity before reaching hospital", value:"?", note:"Important unknown", status:"gap", interpretation:"Hospital measures occur after selection into hospital and can make comparisons circular." },
  { id:"bed-days", label:"Emergency bed-days", value:"706k", note:"Per year", status:"measured", interpretation:"Bed-days combine admission volume and length of stay; the same total can arise through very different pathways." },
  { id:"recovery", label:"Quality of recovery", value:"?", note:"Limited routine measurement", status:"gap", interpretation:"Readmission and mortality do not fully describe independence, symptoms or quality of life." },
  { id:"survival", label:"People surviving longer", value:"+3.1 yrs", note:"Illustrative trend", status:"proxy", interpretation:"Longer survival is beneficial but increases the population living with ongoing conditions." },
  { id:"future", label:"Future support requirement", value:"?", note:"Model-dependent", status:"gap", interpretation:"Future need depends on survival, incidence, disability, prevention, migration and service choices." }
];

// ============================================================
// 03. SOURCE CATALOGUE
// A source supports a relationship or definition; it does not
// prove that the relationship caused a local result.
// ============================================================
const SOURCES = {
  S1:{ title:"Health Profile for England: social determinants of health", publisher:"Office for Health Improvement and Disparities", type:"Published evidence", url:"https://www.gov.uk/government/publications/health-profile-for-england/chapter-6-social-determinants-of-health", note:"Overview of the relationships between social conditions and health." },
  S2:{ title:"Place-based approaches for reducing health inequalities", publisher:"Public Health England / OHID", type:"Published evidence", url:"https://www.gov.uk/government/publications/health-inequalities-place-based-approaches-to-reduce-inequalities/place-based-approaches-for-reducing-health-inequalities-main-report", note:"Framework for wider determinants, behaviours, services and unequal outcomes." },
  S3:{ title:"English indices of deprivation 2025", publisher:"Ministry of Housing, Communities and Local Government", type:"Official definition/data", url:"https://www.gov.uk/government/statistics/english-indices-of-deprivation-2025", note:"Small-area measures covering seven deprivation domains. Area context, not an individual attribute." },
  S4:{ title:"Quality and Outcomes Framework 2024–25", publisher:"NHS England", type:"Official definition/data", url:"https://digital.nhs.uk/data-and-information/publications/statistical/quality-and-outcomes-framework-achievement-prevalence-and-exceptions-data/2024-25", note:"Practice-level recorded prevalence and achievement; recorded disease is affected by detection and coding." },
  S5:{ title:"CVDPREVENT", publisher:"NHS Benchmarking Network / NHS England", type:"Official definition/data", url:"https://www.cvdprevent.nhs.uk/", note:"Primary-care audit measures for cardiovascular diagnosis and management." },
  S6:{ title:"NHS workforce statistics", publisher:"NHS England", type:"Official definition/data", url:"https://digital.nhs.uk/data-and-information/publications/statistical/nhs-workforce-statistics", note:"Monthly hospital and community workforce counts and characteristics." },
  S7:{ title:"Workforce Strategy for Adult Social Care in England", publisher:"Skills for Care", type:"Published evidence", url:"https://www.skillsforcare.org.uk/Workforce-Strategy/Home.aspx", note:"Workforce supply, skills, attraction, retention and workforce planning." },
  S8:{ title:"Adult Social Care Workforce Data Set", publisher:"Skills for Care", type:"Official definition/data", url:"https://www.skillsforcare.org.uk/Adult-Social-Care-Workforce-Data/Adult-Social-Care-Workforce-Data-Set/Adult-Social-Care-Workforce-Data-Set.aspx", note:"Workforce characteristics including vacancies, turnover, pay, training and qualifications." },
  S9:{ title:"Emergency Care Data Set", publisher:"NHS England", type:"Official definition/data", url:"https://digital.nhs.uk/data-and-information/data-collections-and-data-sets/data-sets/emergency-care-data-set-ecds", note:"Patient-level emergency-care activity including presentation, acuity, diagnosis and discharge fields." },
  S10:{ title:"Hospital Episode Statistics", publisher:"NHS England", type:"Official definition/data", url:"https://digital.nhs.uk/data-and-information/data-tools-and-services/data-services/hospital-episode-statistics", note:"Admitted, outpatient and emergency-care activity; it describes people selected into hospital care." },
  S11:{ title:"Patients registered at a GP practice", publisher:"NHS England", type:"Official definition/data", url:"https://digital.nhs.uk/data-and-information/publications/statistical/patients-registered-at-a-gp-practice", note:"Practice registration denominators by age and sex." },
  S12:{ title:"Fingertips public health profiles", publisher:"Office for Health Improvement and Disparities", type:"Official definition/data", url:"https://fingertips.phe.org.uk/", note:"Local indicators for population health, determinants, services and outcomes." },
  S13:{ title:"Fit for the Future: 10 Year Health Plan for England", publisher:"Department of Health and Social Care", type:"Policy source", url:"https://www.gov.uk/government/publications/10-year-health-plan-for-england-fit-for-the-future/fit-for-the-future-10-year-health-plan-for-england-executive-summary", note:"Current policy direction; a policy source is not evidence that an intervention works." },
  S14:{ title:"Linked HES–ONS mortality data guide", publisher:"NHS England", type:"Official definition/data", url:"https://digital.nhs.uk/data-and-information/data-tools-and-services/data-services/linked-hes-ons-mortality-data/hes-and-ons-linked-mortality-data-guide", note:"Linkage of hospital records to registered deaths for outcome analysis." },
  S15:{ title:"NHS Health Check: preventable cardiovascular risk factors", publisher:"UK Health Security Agency", type:"Published evidence", url:"https://ukhsa.blog.gov.uk/2017/01/24/health-matters-combating-high-blood-pressure-with-the-nhs-health-check/", note:"Identifies blood pressure, smoking, cholesterol, obesity, diet, inactivity and alcohol as major modifiable risks." },
  S16:{ title:"NHS vaccinations", publisher:"NHS", type:"Official guidance", url:"https://www.nhs.uk/vaccinations/", note:"National vaccination schedules and information about infections preventable through vaccination." },
  S17:{ title:"NHS screening", publisher:"NHS", type:"Official guidance", url:"https://www.nhs.uk/tests-and-treatments/nhs-screening/", note:"National screening programmes intended to identify elevated risk or disease earlier." }
};

// ============================================================
// 04. RECURSIVE DRIVER TREES
// kinds: published, official, hypothesis, gap
// ============================================================
const D = (title, explanation, kind="hypothesis", sources=[], children=[]) => ({ title, explanation, kind, sources, children });

const WORKFORCE_TREE = D("Available workforce", "Capacity depends on how many appropriately skilled people are available, where and when care is needed.", "published", ["S6","S7"], [
  D("Established posts", "Organisations first decide which roles and how many posts they can fund.", "hypothesis", [], [
    D("Funding available", "Revenue, allocations, contract income and local priorities constrain the funded establishment.", "hypothesis"),
    D("Chosen service model", "The balance between professions, settings and skill mix changes the posts required.", "hypothesis", ["S13"]),
    D("Workload assumptions", "Planned staffing depends on expected demand, consultation time, complexity and non-clinical work.", "hypothesis")
  ]),
  D("Posts successfully filled", "A funded vacancy is not usable capacity until a suitable person is recruited.", "published", ["S6","S7","S8"], [
    D("Supply of qualified applicants", "The relevant labour market must contain people with the required competence and registration.", "published", ["S7","S8"], [
      D("Training pipeline", "Entrants, placement capacity, completion and time-to-qualification determine domestic supply.", "published", ["S7"], [
        D("Education places", "Places depend on education funding, provider capacity and expected workforce need.", "hypothesis"),
        D("Clinical placements", "Learners need supervised practice in services that already face staffing pressure.", "hypothesis", [], [
          D("Enough supervisors", "Qualified staff must have the competence and time to supervise.", "hypothesis"),
          D("Protected supervision time", "Releasing staff reduces current service capacity to create future capacity: a real feedback loop.", "hypothesis"),
          D("Placement quality", "Poor learning environments can affect completion, confidence and later retention.", "hypothesis")
        ]),
        D("Completion and registration", "Financial pressure, wellbeing, course quality and assessment affect how many entrants qualify.", "hypothesis")
      ]),
      D("Qualification and registration rules", "Standards protect patients but also define who can legally or safely fill a role.", "official", ["S6","S8"], [
        D("Required competence", "A qualification title alone may not show whether someone has the specific competence for the local role.", "gap"),
        D("Recognition of overseas qualifications", "Recognition, language requirements and adaptation routes affect international supply.", "hypothesis"),
        D("Time to gain advanced skills", "Experienced and specialist staff cannot be produced immediately by increasing entry-level recruitment.", "hypothesis")
      ]),
      D("Location of qualified people", "National supply can coexist with local shortage because workers and vacancies are unevenly distributed.", "hypothesis", [], [
        D("Housing and living costs", "Local affordability can make a nominal salary more or less attractive.", "published", ["S1","S3"]),
        D("Transport and travel time", "Shift patterns and dispersed services can make some jobs difficult to reach.", "hypothesis"),
        D("Competing employers", "Neighbouring NHS, care, private and non-health employers draw from overlapping labour markets.", "hypothesis")
      ])
    ]),
    D("Role attractiveness", "People compare pay, workload, flexibility, status, development and location.", "published", ["S7","S8"], [
      D("Pay and total reward", "Real pay, pensions, enhancements and local living costs influence attraction.", "published", ["S7","S8"]),
      D("Workload and moral distress", "Unmanageable demand and inability to provide desired care can deter applicants and increase exits.", "published", ["S7"]),
      D("Career progression", "Visible training and advancement routes affect whether a post is a sustainable career.", "published", ["S7"]),
      D("Flexibility and caring responsibilities", "Rota control, part-time work and predictable hours affect who can take a role.", "hypothesis")
    ]),
    D("Recruitment process", "Delay, poor candidate experience, checks and onboarding can lose otherwise suitable applicants.", "hypothesis")
  ]),
  D("People retained and present", "Headcount overstates capacity when turnover, sickness, burnout or absence are high.", "published", ["S6","S7","S8"], [
    D("Retention", "Management, workload, pay, team culture, flexibility and development all influence exits.", "published", ["S7","S8"], [
      D("Work pressure", "Vacancies increase pressure on remaining staff; pressure can then increase absence and turnover.", "published", ["S7"]),
      D("Leadership and team culture", "Psychological safety, autonomy and support can affect whether people remain.", "hypothesis"),
      D("Career and learning opportunities", "Limited development can push experienced staff elsewhere.", "published", ["S7"])
    ]),
    D("Sickness and other absence", "Physical and mental health, caring responsibilities and working conditions affect available time.", "official", ["S6","S8"]),
    D("Rota coverage", "The right total headcount may still leave nights, weekends, locations or specialties uncovered.", "hypothesis")
  ]),
  D("Productive clinical time", "The same staffing total can yield different patient-facing capacity.", "hypothesis", [], [
    D("Skill mix and delegation", "Work must be matched safely to competence; poor role design can create bottlenecks.", "hypothesis"),
    D("Administrative burden", "Documentation, coordination and duplicated processes consume time.", "hypothesis"),
    D("Technology, estates and equipment", "Staff cannot be productive without working systems, rooms and equipment.", "hypothesis"),
    D("Continuity and team stability", "Stable teams may require less rework and coordination, but routine data measures this incompletely.", "gap")
  ])
]);

const DRIVER_TREES = {
  determinants:[
    D("Income and financial security", "Resources affect material conditions, stress and the ability to act on health advice.", "published", ["S1","S2","S3"], [
      D("Employment and pay", "Job availability, hours, security and wages shape household income.", "published", ["S1","S3"]),
      D("Benefits and eligibility", "Entitlement, take-up and administrative access affect income after shocks.", "hypothesis"),
      D("Cost of essentials", "Housing, energy, food, transport and childcare determine what income can buy.", "published", ["S1"])
    ]),
    D("Housing", "Quality, affordability, crowding, security and location can affect exposure and recovery.", "published", ["S1","S2","S3"], [
      D("Supply and affordability", "Planning, tenure, local prices and household income shape housing options.", "hypothesis"),
      D("Quality and safety", "Damp, cold, hazards and overcrowding can harm health.", "published", ["S1"]),
      D("Stability", "Insecure housing can disrupt continuity of care and social connection.", "hypothesis")
    ]),
    D("Education and opportunity", "Education can influence employment, income, health literacy and agency.", "published", ["S1","S3"], [
      D("Attendance and attainment", "Health, family resources, school environment and additional needs interact.", "hypothesis"),
      D("Access to further learning", "Cost, geography, prior attainment and caring responsibilities affect progression.", "hypothesis")
    ]),
    D("Community, environment and safety", "Air, transport, green space, crime, discrimination and social connection alter exposure and opportunity.", "published", ["S1","S2","S3","S12"])
  ],
  risk:[
    D("Tobacco and nicotine exposure", "Smoking causes avoidable cardiovascular, respiratory and cancer risk; second-hand smoke also matters.", "published", ["S1","S12","S15"], [
      D("What it can lead to", "Lung and other cancers, COPD, coronary heart disease, stroke, peripheral arterial disease, pregnancy complications and shorter life.", "published", ["S12"]),
      D("Why exposure persists", "Nicotine dependence, stress, household smoking, price and availability, marketing, social norms and unequal access to effective cessation support.", "published", ["S1","S2"]),
      D("What can prevent harm", "Prevent uptake; smoke-free environments; identify smoking status; offer behavioural support and effective pharmacotherapy; support repeated quit attempts.", "published", ["S12"]),
      D("What can be measured", "Smoking prevalence and inequality, smoking status recording, quit attempts, treatment reach, four-week quits and longer-term abstinence.", "official", ["S12"])
    ]),
    D("High blood pressure", "Sustained raised blood pressure damages blood vessels and organs, often without symptoms.", "published", ["S5","S15"], [
      D("What it can lead to", "Stroke, coronary heart disease, heart failure, chronic kidney disease, vascular dementia and premature death.", "published", ["S5"]),
      D("What raises it", "Age and genetics; high dietary salt; excess weight; inactivity; alcohol; kidney disease; some medicines; stress and poor sleep.", "published", ["S15"]),
      D("What can prevent harm", "Population salt reduction, healthy weight and activity, case-finding, accurate repeat measurement, treatment to target and adherence support.", "published", ["S5","S15"]),
      D("What can be measured", "Diagnosed versus estimated hypertension, blood-pressure recording, control to target, treatment gap and variation by age, ethnicity and deprivation.", "official", ["S4","S5"])
    ]),
    D("Raised cholesterol and atherosclerotic risk", "LDL cholesterol contributes to plaque formation; total cardiovascular risk also reflects age, blood pressure, smoking, diabetes and other factors.", "published", ["S5","S15"], [
      D("What it can lead to", "Coronary heart disease, myocardial infarction, ischaemic stroke and peripheral arterial disease.", "published", ["S5"]),
      D("What raises it", "Genetics including familial hypercholesterolaemia, dietary pattern, excess weight, diabetes, kidney disease and some medicines.", "published", ["S5"]),
      D("What can prevent harm", "Identify high-risk people and familial disease; improve diet; prescribe and optimise lipid-lowering treatment; support adherence.", "published", ["S5"]),
      D("What can be measured", "Risk assessment, lipid testing, statin prescribing, treatment intensity and cholesterol response.", "official", ["S5"])
    ]),
    D("High blood glucose and diabetes risk", "Insulin resistance and impaired glucose regulation can progress to type 2 diabetes and vascular damage.", "published", ["S4","S5","S15"], [
      D("What it can lead to", "Diabetes, coronary disease, stroke, kidney disease, neuropathy, sight loss, foot disease and infection.", "published", ["S4","S5"]),
      D("What raises it", "Age, family history, ethnicity, previous gestational diabetes, excess central weight, inactivity, deprivation, poor diet and some medicines.", "published", ["S1","S15"]),
      D("What can prevent harm", "Healthier food environment, physical activity, weight-management support, diabetes prevention programmes, early diagnosis and control of glucose, blood pressure and lipids.", "published", ["S5","S15"]),
      D("What can be measured", "Non-diabetic hyperglycaemia, programme referral and completion, HbA1c control, care processes and complications.", "official", ["S4","S5"])
    ]),
    D("Diet, excess weight and physical inactivity", "These are overlapping risks shaped by environment and resources, not simply isolated personal choices.", "published", ["S1","S2","S15"], [
      D("What they can lead to", "Diabetes, cardiovascular disease, some cancers, musculoskeletal problems, fatty liver disease, reduced mobility and poorer mental health.", "published", ["S12"]),
      D("What drives them", "Food price and availability, marketing, working time, income, stress, sleep, medicines, disability, safe space, transport and access to facilities.", "published", ["S1","S2"]),
      D("What can prevent harm", "Food and planning policy, active travel, accessible green space, school and workplace action, brief advice, exercise referral and proportionate weight-management support.", "published", ["S2"]),
      D("What can be measured", "Diet and activity surveys, child and adult weight, local food environment, active travel, programme reach, retention and weight or functional change.", "official", ["S12"])
    ]),
    D("Alcohol and other substance use", "Risk varies by amount, pattern, duration, dependence and interaction with other vulnerabilities.", "published", ["S1","S2","S15"], [
      D("What it can lead to", "Liver disease, cancers, hypertension, stroke, injury, poisoning, mental ill health, family harm and avoidable emergency use.", "published", ["S12"]),
      D("Why harmful use develops", "Availability and price, marketing, trauma, stress, social norms, dependence, mental illness and limited access to support.", "published", ["S1","S2"]),
      D("What can prevent harm", "Price and availability measures, licensing, marketing controls, early identification and brief advice, specialist treatment, harm reduction and mental-health support.", "published", ["S2"]),
      D("What can be measured", "Consumption estimates, alcohol-related admissions and deaths, screening, treatment access, completion and unmet need—each with important under-recording.", "official", ["S10","S12"])
    ]),
    D("Infection exposure and incomplete immunity", "Contact with pathogens, susceptibility and insufficient immunity determine infection risk.", "published", ["S16"], [
      D("What it can lead to", "Respiratory and other infections, sepsis, post-infectious illness, cancer from selected infections and exacerbation of existing conditions.", "published", ["S16"]),
      D("What raises exposure or susceptibility", "Crowding, poor ventilation, occupational contact, age, pregnancy, immune suppression, chronic disease and low vaccine uptake.", "published", ["S1","S16"]),
      D("What can prevent harm", "Vaccination, clean air and ventilation, infection control, rapid diagnosis and treatment, outreach and protection of high-risk groups.", "published", ["S16"]),
      D("What can be measured", "Coverage by eligible group, timeliness, inequality in uptake, outbreaks, infection-related attendance, admission and mortality.", "official", ["S9","S10","S12","S16"])
    ]),
    D("Air pollution, damp, cold and occupational exposure", "Environmental exposure can accumulate at home, outdoors and at work.", "published", ["S1","S3"], [
      D("What it can lead to", "Asthma and COPD exacerbation, cardiovascular disease, lung cancer, infection, injury and occupational disease.", "published", ["S1"]),
      D("What creates exposure", "Traffic, combustion, housing quality, fuel poverty, ventilation, industrial processes, job design and enforcement.", "published", ["S1","S3"]),
      D("What can prevent harm", "Clean-air and transport policy, warm and dry homes, ventilation, workplace substitution and controls, protective equipment and enforcement.", "published", ["S1","S2"]),
      D("What can be measured", "Pollution concentrations, housing hazards, fuel poverty, occupation, respiratory activity and geographic inequalities; individual exposure remains difficult.", "gap", ["S3","S12"])
    ]),
    D("Poor mental health, trauma and social isolation", "Mental and physical health risks interact in both directions across the life course.", "published", ["S1","S2"], [
      D("What it can lead to", "Self-harm, suicide, substance use, reduced self-care, chronic stress, crisis use, unemployment and worsening physical illness.", "published", ["S1"]),
      D("What contributes", "Trauma, abuse, poverty, insecurity, discrimination, loneliness, caring burden, poor physical health and limited access to early support.", "published", ["S1","S2"]),
      D("What can prevent harm", "Safe childhoods, financial and housing security, social connection, early help, workplace support, accessible psychological care and crisis prevention.", "published", ["S2"]),
      D("What can be measured", "Wellbeing surveys, diagnosed prevalence, treatment access and waits, self-harm, suicide and social isolation—none fully measures unmet need.", "gap", ["S4","S12"])
    ]),
    D("Falls, frailty and medicine-related harm", "Loss of strength, balance or physiological reserve can combine with hazards and treatment effects.", "published", ["S12"], [
      D("What it can lead to", "Fracture, head injury, fear of falling, immobility, admission, loss of independence and increased care needs.", "published", ["S12"]),
      D("What raises risk", "Ageing, previous falls, muscle weakness, poor vision, unsafe housing, alcohol, hypotension and sedating or multiple medicines.", "hypothesis", ["S1"]),
      D("What can prevent harm", "Strength and balance work, medication review, vision and foot care, osteoporosis treatment, home-hazard reduction and rapid recovery support.", "published", ["S12"]),
      D("What can be measured", "Risk assessment, programme reach, fractures, ambulance call-outs, admissions, medicines and changes in mobility or independence.", "official", ["S9","S10","S12"])
    ]),
    D("Screening and preventive treatment not reaching people", "Effective prevention fails when eligibility, invitation, access, uptake, follow-up or treatment breaks down.", "official", ["S5","S16","S17"], [
      D("Eligible people not identified", "Incomplete demographic or clinical records and fragmented data can prevent a correct offer.", "hypothesis"),
      D("Offer does not become uptake", "Trust, language, convenience, transport, digital exclusion, fear, work and caring commitments affect uptake.", "published", ["S2"]),
      D("Positive result does not become action", "Diagnostic capacity, hand-offs, waits, communication and personal circumstances can interrupt follow-up.", "hypothesis"),
      D("What can be measured", "Eligibility, offer, uptake, follow-up and outcome at each stage, stratified to show where inequalities arise.", "official", ["S5","S12","S16","S17"])
    ])
  ],
  undiagnosed:[
    D("Condition is not yet detectable", "Some disease has a latent or asymptomatic period.", "published"),
    D("No effective opportunity to detect it", "A person may not attend, may attend for something else, or may not receive the relevant test.", "hypothesis", ["S4","S5"], [
      D("Contact with services", "Access, trust, symptoms and competing priorities affect contact.", "published", ["S2"]),
      D("Case-finding process", "Recall systems, prompts, clinician attention and test capacity affect detection.", "hypothesis")
    ]),
    D("Test or threshold misses it", "Test performance, biological variation and thresholds create false negatives and boundary cases.", "published"),
    D("True diagnosis gap is not directly observed", "Estimated prevalence can suggest a gap but usually cannot name the undiagnosed individuals.", "gap", ["S4","S5"])
  ],
  diagnosis:[
    D("People reach a diagnostic opportunity", "Screening, primary care, community services and hospital contacts offer different routes.", "published", ["S2","S4","S5","S10"]),
    D("Clinician investigates and interprets", "Symptoms, time, continuity, guidelines and access to tests affect the work-up.", "hypothesis"),
    D("Diagnosis is recorded", "Coding and register rules determine whether disease becomes visible in routine data.", "official", ["S4"], [
      D("Recorded prevalence rises", "This can mean more disease, better detection/coding, population change, or a combination.", "official", ["S4"]),
      D("Estimated-to-recorded ratio", "Useful as a detection signal, but dependent on the estimation model.", "gap")
    ])
  ],
  management:[
    D("Appropriate treatment is selected", "Evidence, contraindications, multimorbidity, preferences and clinician judgement affect choice.", "published", ["S4","S5"]),
    D("Treatment is accessible and continued", "Supply, appointments, cost, trust, side effects and daily circumstances affect adherence.", "hypothesis", ["S2"], [
      D("Continuity and follow-up", "Reviews and monitoring can detect non-response, harm and changing need.", "official", ["S4","S5"]),
      D("Self-management capacity", "Knowledge, confidence, time, money and support affect what is sustainable.", "published", ["S2"])
    ]),
    WORKFORCE_TREE,
    D("Quality is only partly visible", "Achievement and treatment-to-target measures capture selected processes and outcomes, not the full lived experience or causal effect.", "gap", ["S4","S5"])
  ],
  crisis:[
    D("Acute need develops", "Severity reflects underlying disease, complications, prevention and earlier management.", "published", ["S9","S10"]),
    D("A person seeks or is directed to urgent care", "Symptoms, advice, trust, alternatives, ambulance pathways and availability influence attendance.", "hypothesis", ["S9"]),
    D("Admission decision", "Clinical need matters, but so can observation options, risk tolerance, community alternatives and bed pressure.", "hypothesis", ["S9","S10"], [
      D("Different thresholds", "Conversion rates cannot isolate admission thresholds from acuity and case mix.", "gap"),
      D("Capacity–activity feedback", "More available capacity may reveal or accommodate need, so activity is not a neutral measure of population need.", "hypothesis")
    ]),
    D("Hospital data is selected data", "It describes people who reached hospital, not everyone with the condition in the population.", "official", ["S9","S10"])
  ],
  recovery:[
    D("Residual illness and functional loss", "Severity, complications, frailty and treatment response affect what recovery is possible.", "published", ["S10"]),
    D("Rehabilitation and community support", "Timeliness, intensity, eligibility and workforce affect recovery after discharge.", "hypothesis"),
    D("Home and unpaid care", "Housing, family capacity, equipment and social care can enable or limit independence.", "published", ["S1","S7"]),
    D("Outcome measurement gap", "Readmission and death miss symptoms, participation, dependence and burden on unpaid carers.", "gap", ["S10","S14"])
  ],
  living:[
    D("Deaths prevented or delayed", "Effective prevention and treatment increase survival.", "published", ["S12","S14"]),
    D("More time lived with a condition", "Longer survival can raise prevalence even if incidence is unchanged.", "published", ["S4","S12"]),
    D("Multimorbidity and dependency", "Ageing and accumulated conditions can increase complexity and support needs.", "published", ["S12"]),
    D("Success changes future demand", "Longer life is a benefit; extra future care is a consequence to plan for, not evidence the benefit was mistaken.", "hypothesis")
  ],
  capacity:[
    WORKFORCE_TREE,
    D("Physical and digital capacity", "Rooms, beds, diagnostics, equipment, interoperability and infrastructure constrain usable service capacity.", "official", ["S9","S10"]),
    D("Money and purchasing power", "Nominal budgets translate into different real capacity depending on pay, prices and commitments.", "hypothesis"),
    D("Flow across the pathway", "Bottlenecks elsewhere can consume capacity: delayed discharge, unavailable diagnostics or weak alternatives.", "hypothesis", ["S9","S10"], [
      D("Social-care availability", "Eligibility, local provider supply, workforce and funding affect discharge and independence.", "published", ["S7","S8"]),
      D("Demand and supply interact", "Waiting lists and activity are jointly shaped by need, access, thresholds and available supply.", "gap")
    ])
  ],
  "future-demand":[
    D("Population size and age structure", "Births, deaths, migration and ageing change denominators and expected need.", "official", ["S11","S12"]),
    D("Incidence and prevention", "New cases depend on exposure, susceptibility and preventive effectiveness.", "published", ["S12"]),
    D("Survival and years with conditions", "Successful care can increase the duration of treatment and monitoring.", "published", ["S4","S12","S14"]),
    D("Technology and thresholds", "New tests and treatments can change who is diagnosable or treatable and for how long.", "hypothesis"),
    D("Forecast uncertainty", "Scenarios depend on assumptions about all of these drivers and should show ranges.", "gap")
  ],
  behaviour:[
    D("Perceived need", "Symptoms, knowledge, prior experience and social norms shape whether care seems necessary.", "published", ["S2"]),
    D("Trust and acceptability", "Communication, discrimination, continuity and prior outcomes can affect willingness to engage.", "published", ["S2"]),
    D("Practical access", "Opening hours, transport, digital access, language, disability access and caring/work obligations matter.", "published", ["S1","S2"]),
    D("Routine data sees the action, not the reason", "Attendance or non-attendance rarely explains the person’s constraints or reasoning.", "gap")
  ],
  outcomes:[
    D("Length of life", "Mortality and survival are measurable but require careful case-mix and population comparison.", "official", ["S12","S14"]),
    D("Quality and function", "Symptoms, wellbeing, independence and participation may matter more than service activity.", "published", ["S12"]),
    D("Fair distribution", "An average improvement can conceal widening inequalities between groups or places.", "published", ["S1","S2","S3"]),
    D("Patient-defined goals", "Routine datasets incompletely capture whether care achieved what mattered to the person.", "gap")
  ]
};

// ============================================================
// 05. WHOLE-SYSTEM EMPHASIS
// Keep this explorer at system-driver level. The separate
// intervention explorer holds the detailed risk-factor catalogue.
// ============================================================
DRIVER_TREES.risk = [
  D("Underlying susceptibility", "Age, genetics, prior illness and accumulated life-course exposure affect the likelihood of disease.", "published", ["S12"], [
    D("Population structure", "Two places can have different expected need because their age, ethnicity and population histories differ.", "official", ["S11","S12"]),
    D("Existing illness and multimorbidity", "One condition, its treatment and reduced physiological reserve can alter the risk and consequences of another.", "published", ["S4","S12"])
  ]),
  D("Exposure to preventable risk", "Behavioural, environmental, occupational, infectious and commercial exposures can increase or reduce risk.", "published", ["S1","S2"], [
    D("Wider conditions shape exposure", "Income, housing, education, work, transport and neighbourhood conditions constrain the choices and exposures available to people.", "published", ["S1","S2","S3"]),
    D("Commercial and physical environment", "Price, availability, marketing, pollution and the built environment influence risk across whole populations.", "published", ["S1","S2"]),
    D("Individual behaviour is not an isolated cause", "Behaviour reflects opportunity, resources, habit, dependence, stress, knowledge and social context.", "published", ["S1","S2"])
  ]),
  D("Reach of prevention", "Prevention depends on whether effective action exists and reaches the right people early enough.", "official", ["S5","S12","S16","S17"], [
    D("Eligible population identified", "Records, coding, risk stratification and case-finding determine who is offered support.", "hypothesis"),
    D("Offer is accessible and acceptable", "Trust, communication, cost, convenience and competing demands affect uptake.", "published", ["S2"]),
    D("Intervention is completed and effective", "Quality, intensity, adherence, follow-up and the surrounding environment affect whether an offer changes risk.", "hypothesis"),
    D("Prevented events remain unseen", "Routine data records events that occurred, not the counterfactual events that prevention avoided.", "gap")
  ])
];

DRIVER_TREES.capacity.push(
  D("Capacity by part of the pathway", "A single total hides different types of capacity that are not freely interchangeable.", "hypothesis", [], [
    D("Primary care capacity", "Appointments depend on clinical and administrative workforce, premises, consultation length, demand management and continuity.", "official", ["S6","S11"], [
      D("Same-day versus planned care", "Urgent workload can displace prevention, diagnosis, reviews and continuity if total capacity is fixed.", "hypothesis"),
      D("Practice list and case mix", "List size alone does not represent workload; age, morbidity, turnover, language and deprivation can alter the work required.", "gap", ["S3","S4","S11"])
    ]),
    D("Community and mental-health capacity", "Caseloads, visit time, travel, eligibility, specialist skills and interfaces determine how much support can be delivered.", "hypothesis", ["S6"], [
      D("Geographic delivery", "Travel between homes and dispersed sites consumes capacity that activity counts may not show.", "hypothesis"),
      D("Caseload intensity", "The same number of people can require very different staff time, frequency and skill.", "gap")
    ]),
    D("Acute capacity", "Beds are only usable when staffed and supported by diagnostics, theatres, pharmacy, therapies and discharge pathways.", "official", ["S6","S9","S10"], [
      D("Staffed rather than physical beds", "A physical bed without the required staff and support services is not usable capacity.", "official", ["S6"]),
      D("Occupancy and resilience", "Running close to full occupancy leaves less ability to absorb variation, infection outbreaks or peaks in demand.", "hypothesis"),
      D("Diagnostic and treatment bottlenecks", "A bed may remain occupied because the next test, procedure, review or destination is unavailable.", "hypothesis")
    ]),
    D("Social-care and unpaid-care capacity", "Provider supply, eligibility, affordability, workforce and family circumstances affect support outside healthcare.", "published", ["S7","S8"], [
      D("Market sustainability", "Fees, wage competition, travel costs, provider exits and local demand affect whether commissioned care can actually be supplied.", "published", ["S7","S8"]),
      D("Unpaid carers", "Family care adds major capacity but is uneven, often invisible and can create health and financial consequences for carers.", "gap")
    ])
  ]),
  D("Commissioning and service design", "Resources become usable services through contracts, pathways, eligibility rules and organisational choices.", "hypothesis", [], [
    D("Allocation between services", "Funding one part of the pathway has opportunity costs elsewhere, even when organisational budgets are separate.", "hypothesis"),
    D("Contract incentives and specifications", "Payment rules and performance measures can encourage activity, access, continuity, prevention or cost control in different combinations.", "hypothesis"),
    D("Eligibility and thresholds", "Narrow criteria protect scarce capacity but transfer work, waiting or unmet need to patients, carers and other services.", "hypothesis"),
    D("Fragmentation and hand-offs", "Separate organisations, records and criteria can create duplicated assessment, delay and failed transitions.", "hypothesis")
  ]),
  D("Capacity visible in data", "Workforce, beds, appointments and activity each describe only part of usable capacity.", "gap", ["S6","S8","S9","S10"], [
    D("Headcount versus available time", "Headcount differs from full-time equivalent, rostered time, present time and patient-facing time.", "official", ["S6","S8"]),
    D("Activity versus capacity", "High activity may reflect high capacity, high need, short contacts, repeated work or pressure; it does not identify which on its own.", "gap"),
    D("Waiting versus unmet need", "Waiting lists contain people who reached a service; people who were not referred, declined, excluded or gave up may be absent.", "gap"),
    D("Quality-adjusted capacity", "More contacts are not necessarily more effective care. Routine data rarely combines volume, complexity, continuity and outcome into one comparable measure.", "gap")
  ])
);
