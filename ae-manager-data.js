// ============================================================
// 00. A&E DETERMINANTS MAP: PURPOSE AND COLOUR PALETTE
// ============================================================
// The visible network is organised as:
// A&E attendance <- direct determinants <- upstream determinants.
// Management responses, ownership, timescales and evidence remain in the
// details drawer rather than being mixed into the causal network itself.

const AE_DOMAINS = {
  problem:      { label:"Outcome", colour:"#103247" },
  clinical:     { label:"Urgent clinical need", colour:"#64806c" },
  access:       { label:"Access to alternatives", colour:"#7663a0" },
  direction:    { label:"Professional direction", colour:"#4b7ea8" },
  decision:     { label:"Patient or carer decision", colour:"#b27a21" },
  social:       { label:"Home and practical circumstances", colour:"#9a6a35" },
  repeat:       { label:"Repeat and unresolved need", colour:"#a9565e" },
  context:      { label:"Population and measurement", colour:"#65777d" }
};

const AE_TIMESCALES = {
  quick:      { label:"Potentially quicker lever", short:"Quick", order:1 },
  medium:     { label:"Medium-term service change", short:"Medium", order:2 },
  long:       { label:"Long-term population change", short:"Long", order:3 },
  diagnostic: { label:"Understand locally first", short:"Diagnose", order:4 },
  mixed:      { label:"Contains several timescales", short:"Mixed", order:5 }
};

// ============================================================
// 01. NODE AND RELATIONSHIP HELPERS
// ============================================================
const AE_NODE = (id,label,domain,ring,angle,radius,details={}) => ({
  id,label,domain,ring,angle,radius,
  summary:details.summary || "",
  why:details.why || "",
  action:details.action || "",
  timescale:details.timescale || "diagnostic",
  owner:details.owner || "ICB and local partners",
  measures:details.measures || "Local analysis required.",
  caution:details.caution || "Association does not by itself establish that changing this factor will reduce attendance.",
  evidence:details.evidence || "hypothesis",
  sources:details.sources || []
});

const AE_LINK = (source,target,label,polarity="positive",evidence="hypothesis",sources=[]) => ({ source,target,label,polarity,evidence,sources });

// ============================================================
// 02. OUTCOME AND DIRECT DETERMINANTS
// ============================================================
const AE_MAP_NODES = [
  AE_NODE("ae-attendance","A&E attendance","problem",0,0,0,{
    summary:"The number and rate of people attending A&E are shaped by clinical need, access to alternatives, professional direction, patient or carer decisions, practical circumstances and unresolved previous need.",
    why:"The useful management question is not whether attendance is simply appropriate or inappropriate. It is which determinants account for local attendance, for which groups, at which times and through which routes.",
    action:"Segment attendance before selecting interventions. Identify the determinants that are common, changing, locally unusual and potentially influenceable.",
    timescale:"mixed", owner:"NHSE, ICBs, providers, primary care, local authorities and partners",
    measures:"Attendance count and rate by age, deprivation, condition, acuity, time, arrival mode, referral source, geography, repeat use and outcome.",
    caution:"Reducing necessary attendance would create harm. A determinant may explain attendance without representing a failure of care.", evidence:"official", sources:["S9","S10","S11"]
  }),

  AE_NODE("severe-worsening-symptoms","Symptoms are severe or worsening","clinical",1,-166,355,{
    summary:"Acute illness, injury or deterioration may create a genuine need for immediate assessment or treatment.", why:"Severity, rate of change and the person's underlying resilience affect whether waiting or community management is safe.", action:"Identify which clinical groups account for growth and where prevention, proactive care or rapid specialist response is plausible.", timescale:"mixed", owner:"ICB population health, primary care and providers", measures:"Presenting complaint, acuity, diagnosis, ambulance arrival, admission conversion, recent contacts and condition-specific rates.", caution:"A rise in genuine urgent need cannot safely be managed by redirection alone.", evidence:"published", sources:["S9","S10","S12"]
  }),
  AE_NODE("mental-health-crisis-direct","A mental-health or substance-use crisis occurs","clinical",1,-138,350,{
    summary:"Crisis may require A&E because of immediate safety risk, physical injury, intoxication, self-harm or the absence of another safe response.", why:"The urgent need may be psychiatric, physical or both.", action:"Separate presentations that require hospital assessment from those where a timely specialist crisis response could be safer and more appropriate.", timescale:"medium", owner:"ICBs, mental-health providers, acute providers and local authorities", measures:"Presentation reason, crisis-service contact, self-harm, substance use, physical risk, outcome and repeat attendance.", caution:"A&E may be the necessary and safest response for some crises.", evidence:"hypothesis", sources:["S9","S12"]
  }),

  AE_NODE("no-same-day-appointment","No same-day primary-care appointment is available","access",1,-108,350,{
    summary:"A patient with an urgent problem may use A&E when they cannot obtain timely primary-care assessment.", why:"The determinant is not the existence of general practice, but whether suitable clinical capacity is accessible at the time of need.", action:"Match same-day capacity, clinical skill and direct booking to the times and cohorts contributing to A&E attendance.", timescale:"quick", owner:"ICBs and primary care", measures:"Failed appointment attempts, time to appointment, same-day demand and capacity, presenting problem and subsequent A&E attendance.", caution:"Additional appointments may reveal unmet need without reducing A&E attendance.", evidence:"hypothesis", sources:["S6","S11"]
  }),
  AE_NODE("primary-care-closed","Primary care is closed when help is needed","access",1,-82,350,{
    summary:"Evening, overnight and weekend need may arise when familiar primary-care routes are unavailable or unclear.", why:"Opening hours interact with work, caring responsibilities, service navigation and the timing of deterioration.", action:"Compare attendance by hour and day with the actual availability and accessibility of urgent primary-care routes.", timescale:"quick", owner:"ICBs, primary care and out-of-hours providers", measures:"Attendance by hour and day, opening hours, prior contacts, out-of-hours use and direct-booking availability.", caution:"Extending hours can redistribute activity without reducing total urgent demand.", evidence:"hypothesis", sources:["S9"]
  }),
  AE_NODE("urgent-community-too-slow","Urgent community response is unavailable or too slow","access",1,-56,350,{
    summary:"A person may attend or be conveyed to A&E when rapid assessment, treatment or monitoring at home cannot be provided.", why:"Operating hours, workforce, travel, eligibility and diagnostic support determine whether the service is a real-time alternative.", action:"Examine declined referrals, response times and outcomes for people who otherwise attend or are conveyed to A&E.", timescale:"quick", owner:"ICBs and community providers", measures:"Referral, acceptance, response time, operating hours, treatment, conveyance and later admission.", caution:"Community response must not become an unsafe substitute for hospital assessment.", evidence:"hypothesis", sources:["S6","S9"]
  }),
  AE_NODE("mental-health-alternative-unavailable","A mental-health crisis alternative is unavailable","access",1,-30,350,{
    summary:"A&E may become the available route when no timely and acceptable specialist crisis response can assess and support the person.", why:"Thresholds, hours, geography, physical-health risk and service capacity determine whether an alternative can be used.", action:"Map crisis access by time, cohort and presentation; improve direct routes and joint physical and mental-health assessment.", timescale:"medium", owner:"ICBs and mental-health providers", measures:"Crisis referrals, response times, declined access, reason for A&E use and repeat presentation.", caution:"Some crises require A&E because of immediate physical or safety needs.", evidence:"hypothesis", sources:["S9"]
  }),
  AE_NODE("home-support-not-ready","Support at home cannot be arranged quickly enough","access",1,-4,350,{
    summary:"A clinically manageable problem may still lead to A&E when care, equipment, monitoring or short-term support cannot be arranged promptly.", why:"Health and social-care capacity jointly determine whether someone can remain safely at home.", action:"Create rapid routes to temporary care, equipment, reablement and carer support for defined urgent needs.", timescale:"medium", owner:"ICBs, local authorities and community providers", measures:"Reason home management failed, support requested, availability, response time, attendance and admission.", caution:"Short-term support may expose substantial ongoing unmet need and cost.", evidence:"hypothesis", sources:["S7","S8"]
  }),

  AE_NODE("nhs111-directs-ae","NHS 111 directs the person to A&E","direction",1,24,350,{
    summary:"Remote triage may recommend A&E because of symptoms, risk rules, uncertainty or the absence of a directly bookable alternative.", why:"The disposition reflects both clinical risk and the services visible and accessible to the triage system.", action:"Review high-volume dispositions, clinical validation and direct booking into safe alternatives.", timescale:"quick", owner:"NHSE, ICBs and NHS 111 providers", measures:"Presenting symptom, disposition, validation change, time, alternative booking and outcome.", caution:"Reducing cautious dispositions without better assessment or alternatives may increase harm.", evidence:"official", sources:["S9"]
  }),
  AE_NODE("ambulance-conveys-ae","Ambulance assessment results in conveyance to A&E","direction",1,50,350,{
    summary:"An ambulance contact becomes an A&E attendance when the crew conveys the person to hospital.", why:"Conveyance depends on clinical need, uncertainty, records, professional support and the availability of safe alternatives.", action:"Strengthen appropriate hear-and-treat, see-and-treat, senior advice and direct referral pathways, with outcome monitoring.", timescale:"quick", owner:"Ambulance services, ICBs and providers", measures:"Conveyance by condition and cohort, alternative referral, recontact, later attendance and adverse outcomes.", caution:"A lower conveyance rate is not automatically better.", evidence:"hypothesis", sources:["S9"]
  }),
  AE_NODE("professional-refers-ae","A clinician or care professional refers the person to A&E","direction",1,76,350,{
    summary:"General practice, care homes, community teams and other professionals may refer when risk cannot be assessed or managed elsewhere.", why:"Diagnostic access, senior advice, records and rapid alternative pathways shape the decision.", action:"Analyse referral source and reason; provide direct advice, diagnostics and alternative booking where safe.", timescale:"quick", owner:"ICBs, provider collaboratives, primary care and care homes", measures:"Referral source, reason, prior advice, alternative availability, A&E assessment and outcome.", caution:"Variation may reflect case mix rather than referral quality.", evidence:"hypothesis", sources:["S9"]
  }),

  AE_NODE("severity-uncertain","The patient or carer is unsure how serious the symptoms are","decision",1,104,350,{
    summary:"A person may seek emergency assessment because they cannot confidently distinguish a minor problem from a time-critical condition.", why:"Novelty, severity, anxiety, health literacy and previous experience influence perceived risk.", action:"Provide trusted clinical navigation and safety-netting while preserving clear emergency messaging.", timescale:"quick", owner:"NHSE, ICBs, NHS 111 and providers", measures:"Patient-reported reason, symptom, advice sought, prior experience and final acuity.", caution:"A low-acuity outcome does not mean the original decision was unreasonable.", evidence:"hypothesis", sources:["S2","S9"]
  }),
  AE_NODE("ae-immediate-tests","Immediate assessment and tests are available at A&E","decision",1,130,350,{
    summary:"A&E may offer a practical one-stop route when alternatives require several appointments, sites or referrals.", why:"Diagnostic access and the speed and certainty of receiving an answer affect service choice.", action:"Identify presentations driven by diagnostic access and test rapid assessment routes outside A&E for suitable cohorts.", timescale:"medium", owner:"ICBs, diagnostics, primary care and providers", measures:"Tests performed, prior waits, prior contacts, patient-reported reason and alternative diagnostic capacity.", caution:"Improved diagnostic access may increase activity by revealing unmet need.", evidence:"hypothesis", sources:["S9","S10"]
  }),
  AE_NODE("low-confidence-other-services","The patient does not expect other services to provide timely help","decision",1,156,350,{
    summary:"Previous difficulty obtaining or completing care may make A&E the route a person expects to produce a response.", why:"Reliability, continuity, communication and previous outcomes shape future choices.", action:"Measure failed attempts and experience; improve service reliability before relying on behaviour-change messages.", timescale:"medium", owner:"ICBs, providers and primary care", measures:"Prior attempted contacts, failed access, patient experience, continuity and future service choice.", caution:"Confidence is slow to build and can be damaged quickly.", evidence:"published", sources:["S2"]
  }),

  AE_NODE("cannot-remain-safe-home","The person cannot remain safely at home","social",1,184,350,{
    summary:"The clinical problem may require hospital attendance because the person cannot cope, be monitored or recover safely in their current circumstances.", why:"Living situation, mobility, housing, safeguarding and carer availability alter what can be managed outside hospital.", action:"Identify the specific home or support constraint and create joint urgent health-and-social-care responses for relevant cohorts.", timescale:"medium", owner:"ICBs, local authorities, community providers and partners", measures:"Living situation, mobility, care need, safeguarding, housing, support available and reason home management failed.", caution:"These determinants often sit outside direct NHS control.", evidence:"published", sources:["S1","S7","S8"]
  }),
  AE_NODE("alternatives-hard-to-use","Other urgent-care options are difficult to use","social",1,212,350,{
    summary:"An alternative may exist but be impractical because of transport, disability, language, digital access, work or caring responsibilities.", why:"Nominal service availability is different from practical accessibility at the time of need.", action:"Audit the complete access route and provide transport, interpretation, non-digital and flexible options.", timescale:"medium", owner:"ICBs, providers, local authorities and partners", measures:"Travel, language, digital route, disability, caring or work constraints, failed contacts and eventual service used.", caution:"Broad demographic categories can conceal very different barriers.", evidence:"published", sources:["S1","S2"]
  }),
  AE_NODE("previous-care-unresolved","Previous care did not resolve the problem","repeat",1,240,350,{
    summary:"A person may return to A&E when symptoms, diagnosis, treatment, follow-up or the underlying social need remain unresolved.", why:"Immediate treatment can address the episode without changing the cause of recurring crisis.", action:"Segment repeat attendance by need and review what remained unresolved after the previous contact.", timescale:"quick", owner:"ICBs, acute providers, primary care, mental-health and community services", measures:"Reattendance interval, discharge diagnosis, pending tests, follow-up, medicines, care plan and subsequent admission.", caution:"Some conditions recur despite appropriate care.", evidence:"hypothesis", sources:["S9","S10"]
  }),

  // ============================================================
  // 03. UPSTREAM DETERMINANTS OF CLINICAL NEED
  // ============================================================
  AE_NODE("older-frailer-population","The population is older and frailer","clinical",2,-178,650,{ summary:"A larger frail population increases falls, infection, decompensation and the consequences of minor illness.", why:"Frailty reduces physiological reserve and the ability to recover without support.", action:"Use age- and frailty-specific analysis and strengthen prevention, proactive care and home support.", timescale:"long", owner:"ICB population health, primary care, community and local authorities", measures:"Age-standardised rates, frailty markers, falls, care-home origin and ambulance conveyance.", caution:"Ageing is not itself a service failure.", evidence:"official", sources:["S11","S12"] }),
  AE_NODE("multimorbidity-frailty","Multimorbidity and frailty increase crisis risk","clinical",2,-164,730,{ summary:"Several conditions, interacting treatments and reduced reserve make deterioration more likely and harder to manage.", why:"Complexity increases symptom burden, treatment burden and the chance that a small change becomes a crisis.", action:"Coordinate whole-person care, medicines, monitoring and escalation planning for high-risk combinations.", timescale:"medium", owner:"ICBs, primary care, community and specialist providers", measures:"Condition combinations, frailty, medicines, prior activity and crisis frequency.", caution:"Condition count alone does not describe severity or preventability.", evidence:"hypothesis", sources:["S4","S10","S12"] }),
  AE_NODE("poor-condition-control","Long-term conditions are poorly controlled","clinical",2,-148,620,{ summary:"Poor control increases exacerbations, complications and acute deterioration.", why:"Treatment, monitoring, adherence, access and wider circumstances all affect control.", action:"Target conditions and cohorts where poor control visibly precedes urgent attendance.", timescale:"medium", owner:"Primary care, community and specialist providers", measures:"Control indicators, reviews, medicines, exacerbations and recent contacts.", caution:"Process measures do not fully capture clinical quality or patient preference.", evidence:"published", sources:["S4","S5"] }),
  AE_NODE("seasonal-infection","Seasonal illness and infection increase acute need","clinical",2,-132,710,{ summary:"Respiratory and other infections create concentrated peaks in urgent need.", why:"Exposure, vaccination, housing, immunity and outbreaks affect incidence and severity.", action:"Use seasonal surveillance, vaccination, infection prevention and targeted support.", timescale:"quick", owner:"NHSE, ICBs, public health, primary care and providers", measures:"Syndromic presentation, infection diagnosis, vaccination, outbreaks and age-specific rates.", caution:"Seasonal measures cannot remove all peaks.", evidence:"published", sources:["S9","S12","S16"] }),
  AE_NODE("medicine-related-harm","Medicine-related harm contributes to deterioration","clinical",2,-118,620,{ summary:"Interactions, side effects, missed medicines and difficult treatment plans can create acute illness.", why:"Risk rises with polypharmacy, multimorbidity and fragmented care.", action:"Use targeted review, reconciliation, adherence support and simplified whole-person plans.", timescale:"quick", owner:"Primary care, pharmacy, community and acute providers", measures:"High-risk medicines, recent changes, adverse events, adherence and attendance diagnosis.", caution:"Medication changes also carry risk.", evidence:"hypothesis", sources:["S4","S5","S10"] }),
  AE_NODE("unmet-mental-health-need","Mental-health or substance-use need is not addressed early","clinical",2,-104,720,{ summary:"Unmet need can progress to crisis, self-harm, intoxication, injury or severe distress.", why:"Access thresholds, continuity and fragmentation between physical and mental healthcare affect escalation.", action:"Identify recurring crisis patterns and strengthen earlier treatment and follow-up.", timescale:"medium", owner:"ICBs, mental-health providers, primary care and partners", measures:"Prior contacts, waits, crisis history, treatment, follow-up and repeated presentation.", caution:"Not every crisis is predictable or preventable.", evidence:"hypothesis", sources:["S9","S12"] }),

  // ============================================================
  // 04. UPSTREAM DETERMINANTS OF ACCESS TO ALTERNATIVES
  // ============================================================
  AE_NODE("primary-care-workforce","Primary-care workforce capacity is insufficient","access",2,-104,610,{ summary:"Staffing, skill mix and absence constrain the number and type of urgent appointments available.", why:"Capacity must match both volume and clinical complexity.", action:"Examine demand, workforce, skill mix and appointment outcomes together.", timescale:"medium", owner:"ICBs and primary care", measures:"Workforce, absence, appointment supply, demand, skill mix and subsequent A&E use.", caution:"Headcount does not directly measure usable clinical capacity.", evidence:"hypothesis", sources:["S6","S11"] }),
  AE_NODE("appointment-demand-capacity","Same-day demand exceeds appointment capacity","access",2,-91,720,{ summary:"Appointments may be exhausted before or when urgent need arises.", why:"Demand patterns, triage, booking rules and protected capacity affect availability.", action:"Compare hourly demand, capacity and failed access rather than relying on total appointments.", timescale:"quick", owner:"ICBs and primary care", measures:"Requests, appointments, failed attempts, abandonment, time of day and later A&E attendance.", caution:"Recorded demand may exclude people who do not attempt access.", evidence:"hypothesis", sources:["S6"] }),
  AE_NODE("out-of-hours-coverage","Out-of-hours primary-care coverage is limited or unclear","access",2,-76,620,{ summary:"People may not know or be able to access the appropriate route outside normal hours.", why:"Service hours, location, booking and public understanding affect use.", action:"Map the end-to-end route by hour and simplify access and direct booking.", timescale:"quick", owner:"ICBs and out-of-hours providers", measures:"Availability, utilisation, failed contacts, awareness and attendance by hour.", caution:"Awareness campaigns cannot compensate for unreliable provision.", evidence:"hypothesis", sources:["S9"] }),
  AE_NODE("community-workforce-hours","Community workforce or operating hours limit rapid response","access",2,-60,720,{ summary:"A service may exist but lack the workforce or hours to respond when deterioration occurs.", why:"Urgent alternatives must be available in real time, not only on paper.", action:"Compare referral demand, staffing, hours, response times and outcomes.", timescale:"medium", owner:"ICBs and community providers", measures:"Workforce, hours, referrals, declines, response time and conveyance.", caution:"Increasing capacity without clear referral routes may not change use.", evidence:"hypothesis", sources:["S6","S9"] }),
  AE_NODE("restrictive-eligibility","Eligibility criteria exclude people who need an urgent alternative","access",2,-44,620,{ summary:"Thresholds may leave people with real need but no pathway outside A&E.", why:"Criteria may be designed around service boundaries rather than the presenting problem.", action:"Review rejected and redirected referrals and outcomes.", timescale:"quick", owner:"ICBs and providers", measures:"Referral reason, rejection, redirection, later attendance and admission.", caution:"Broadening eligibility without capacity can increase delays.", evidence:"hypothesis", sources:["S6","S9"] }),
  AE_NODE("mental-health-crisis-capacity","Mental-health crisis capacity is insufficient","access",2,-28,720,{ summary:"Demand may exceed the ability to assess and support people promptly outside A&E.", why:"Workforce, geography, hours and physical-health capability shape usable capacity.", action:"Measure demand, waits, declined access and outcomes across the whole crisis pathway.", timescale:"medium", owner:"ICBs and mental-health providers", measures:"Referrals, waits, staffing, acceptance, A&E attendance and repeat presentation.", caution:"Capacity alone does not resolve pathway fragmentation.", evidence:"hypothesis", sources:["S9"] }),
  AE_NODE("social-care-capacity","Social-care capacity cannot provide urgent support","access",2,-12,620,{ summary:"Home care, equipment or temporary support may not be available at the time required.", why:"Safe care outside hospital depends on timely social as well as clinical support.", action:"Track urgent support requests, response, unmet need and subsequent attendance.", timescale:"medium", owner:"Local authorities, ICBs and community providers", measures:"Requests, availability, response time, unmet need, attendance and admission.", caution:"Short-term urgent support does not replace sustainable care capacity.", evidence:"hypothesis", sources:["S7","S8"] }),

  // ============================================================
  // 05. UPSTREAM DETERMINANTS OF PROFESSIONAL DIRECTION
  // ============================================================
  AE_NODE("risk-triage-rules","Triage rules favour cautious escalation","direction",2,10,620,{ summary:"Protocols may recommend A&E when remote assessment cannot safely exclude serious illness.", why:"Risk tolerance and available information shape disposition.", action:"Review high-volume pathways with clinical validation and outcome data.", timescale:"quick", owner:"NHSE, ICBs and NHS 111 providers", measures:"Algorithm pathway, validation, disposition, outcome and adverse events.", caution:"Caution may be clinically justified.", evidence:"hypothesis", sources:["S9"] }),
  AE_NODE("no-direct-booking","Professionals cannot directly book a suitable alternative","direction",2,25,720,{ summary:"Advice may default to A&E when another service cannot be booked or guaranteed.", why:"A theoretical alternative is not usable without a reliable referral route.", action:"Create direct booking and closed-loop referral for selected pathways.", timescale:"quick", owner:"ICBs and providers", measures:"Booking availability, failed referrals, disposition and outcome.", caution:"Direct booking needs sufficient receiving capacity.", evidence:"hypothesis", sources:["S9"] }),
  AE_NODE("shared-records-missing","Relevant records or care plans are unavailable","direction",2,42,620,{ summary:"Without history, recent results or an escalation plan, A&E may be the safest decision.", why:"Missing information increases uncertainty and duplicated assessment.", action:"Make relevant records and plans available across urgent pathways.", timescale:"medium", owner:"NHSE, ICBs and provider digital teams", measures:"Record access, missing information, repeated assessment and disposition after review.", caution:"Information access does not replace clinical capacity.", evidence:"hypothesis", sources:["S9","S10"] }),
  AE_NODE("senior-advice-unavailable","Senior clinical advice is not available when decisions are made","direction",2,58,720,{ summary:"Professionals may refer or convey when they cannot obtain timely support for uncertainty or risk.", why:"Decision support can change whether safe alternatives are considered.", action:"Test rapid senior advice and specialist support for high-volume presentations.", timescale:"quick", owner:"ICBs, ambulance services and providers", measures:"Advice requested, response time, changed disposition, later attendance and adverse outcome.", caution:"Advice cannot compensate for unavailable services.", evidence:"hypothesis", sources:["S9"] }),
  AE_NODE("ambulance-alternatives-limited","Ambulance crews lack reliable alternatives to conveyance","direction",2,74,620,{ summary:"Crews may have no dependable route to community, primary or specialist care.", why:"Referral eligibility, waiting, records and receiving-service capacity affect non-conveyance.", action:"Develop specific direct referral pathways with outcome monitoring.", timescale:"quick", owner:"Ambulance services, ICBs and providers", measures:"Alternative referral, acceptance, conveyance, recontact and safety outcomes.", caution:"Non-conveyance targets alone can create risk.", evidence:"hypothesis", sources:["S9"] }),

  // ============================================================
  // 06. UPSTREAM DETERMINANTS OF PATIENT OR CARER DECISIONS
  // ============================================================
  AE_NODE("health-literacy-anxiety","Health literacy, anxiety or novelty increase uncertainty","decision",2,92,620,{ summary:"People may be less able to interpret symptoms or judge the risk of waiting.", why:"Information, experience and anxiety affect perceived urgency.", action:"Use accessible navigation and safety-netting for common uncertainty, without discouraging emergencies.", timescale:"medium", owner:"NHSE, ICBs and providers", measures:"Reason for attendance, advice sought, language, prior experience and acuity.", caution:"Education cannot remove genuine diagnostic uncertainty.", evidence:"hypothesis", sources:["S2","S9"] }),
  AE_NODE("diagnostics-outside-ae-slow","Diagnostics outside A&E require waits or multiple contacts","decision",2,108,720,{ summary:"The relative speed of A&E can make it the practical route to assessment.", why:"Fragmented tests and referrals increase time, travel and uncertainty.", action:"Identify presentations suitable for rapid diagnostic pathways outside A&E.", timescale:"medium", owner:"ICBs, diagnostics, primary care and providers", measures:"Prior tests, waits, contacts, travel, A&E investigations and alternative capacity.", caution:"Rapid diagnostics may increase total investigation activity.", evidence:"hypothesis", sources:["S9","S10"] }),
  AE_NODE("previous-failed-access","Previous attempts to obtain help failed or were delayed","decision",2,124,620,{ summary:"A failed attempt changes expectations about which service will respond next time.", why:"Reliability and experience influence future service choice.", action:"Capture prior attempts and close failed-access loops.", timescale:"quick", owner:"ICBs, providers and primary care", measures:"Prior contacts, failed booking, delay, advice, experience and later A&E use.", caution:"Patient recall and administrative records may differ.", evidence:"published", sources:["S2"] }),
  AE_NODE("fragmented-care-experience","Care is fragmented across several appointments and services","decision",2,140,720,{ summary:"Multiple hand-offs can make A&E appear simpler and more dependable.", why:"Fragmentation adds time, travel, repeated explanation and uncertainty.", action:"Measure the complete journey and simplify routes for recurring high-volume needs.", timescale:"medium", owner:"ICBs and provider collaboratives", measures:"Organisations involved, contacts, duplicated assessment, waits and patient experience.", caution:"Some complexity reflects necessary specialist care.", evidence:"hypothesis", sources:["S2","S10"] }),

  // ============================================================
  // 07. UPSTREAM DETERMINANTS OF HOME AND PRACTICAL CIRCUMSTANCES
  // ============================================================
  AE_NODE("living-alone-no-carer","The person lives alone or no carer is available","social",2,158,620,{ summary:"No one may be available to monitor, reassure or assist the person.", why:"The same clinical problem can be manageable with support and unsafe without it.", action:"Include living situation and carer capacity in urgent assessment and planning.", timescale:"medium", owner:"ICBs, local authorities, community and voluntary partners", measures:"Living alone, unpaid care, carer strain, support package and outcome.", caution:"Unpaid care should not be assumed available.", evidence:"published", sources:["S1","S7"] }),
  AE_NODE("unsafe-unsuitable-housing","Housing is unsafe or unsuitable for recovery","social",2,174,720,{ summary:"Cold, damp, hazards, homelessness or unsuitable space may prevent safe management at home.", why:"Housing affects exposure, mobility, medicine storage and recovery.", action:"Connect urgent pathways with housing and homelessness support for relevant cohorts.", timescale:"long", owner:"Local authorities, housing, ICBs and partners", measures:"Housing status, hazards, homelessness, attendance reason and repeat use.", caution:"Housing action is essential but will not solve immediate pressure alone.", evidence:"published", sources:["S1","S3"] }),
  AE_NODE("care-home-clinical-support","Care homes cannot obtain rapid clinical support","social",2,190,620,{ summary:"Residents may attend when staff cannot access timely assessment, prescribing or escalation advice.", why:"Workforce, confidence, records and community clinical access affect escalation.", action:"Provide enhanced support, rapid advice, treatment and clear escalation plans.", timescale:"quick", owner:"ICBs, primary care, community providers and care homes", measures:"Attendances by care home, reason, advice sought, conveyance and admission.", caution:"Avoiding attendance must not override recognition of serious illness or resident preference.", evidence:"hypothesis", sources:["S7","S8","S9"] }),
  AE_NODE("transport-language-digital","Transport, language or digital barriers block access","social",2,206,720,{ summary:"People may be unable to travel, communicate or complete the required access route.", why:"Alternative pathways can depend on resources or capabilities the person does not have.", action:"Provide transport, interpretation, non-digital routes and accessible communication.", timescale:"medium", owner:"ICBs, providers, local authorities and partners", measures:"Travel, interpretation, digital route, disability, failed contact and service used.", caution:"Barrier categories should be analysed specifically rather than assumed.", evidence:"published", sources:["S1","S2"] }),
  AE_NODE("work-caring-constraints","Work or caring responsibilities make scheduled care impractical","social",2,222,620,{ summary:"People may be unable to attend repeated or delayed appointments while meeting work or caring responsibilities.", why:"A&E may be the only feasible single-contact route.", action:"Test flexible, rapid and consolidated alternatives for affected groups.", timescale:"medium", owner:"ICBs and providers", measures:"Attendance timing, employment or caring constraint, prior appointment offer and contacts required.", caution:"Flexible access can shift rather than reduce demand.", evidence:"hypothesis", sources:["S2","S9"] }),

  // ============================================================
  // 08. UPSTREAM DETERMINANTS OF REPEAT AND UNRESOLVED NEED
  // ============================================================
  AE_NODE("unresolved-diagnosis","The diagnosis remains unresolved after previous care","repeat",2,234,720,{ summary:"Symptoms may continue or recur while the cause remains uncertain.", why:"Pending tests, intermittent symptoms and fragmented ownership can prolong uncertainty.", action:"Identify recurring presentations with unresolved diagnostic work and assign ownership.", timescale:"quick", owner:"Acute providers, primary care and diagnostics", measures:"Discharge diagnosis, pending tests, follow-up, reattendance and later diagnosis.", caution:"Some diagnoses legitimately require time and repeated assessment.", evidence:"hypothesis", sources:["S9","S10"] }),
  AE_NODE("follow-up-delayed","Follow-up is absent or delayed","repeat",2,248,620,{ summary:"Risk may recur when review, monitoring or treatment adjustment does not happen promptly.", why:"Responsibility can be unclear across acute, primary, community and specialist care.", action:"Create targeted rapid follow-up for defined high-risk groups.", timescale:"quick", owner:"ICBs, acute providers, primary care and community services", measures:"Follow-up offer, completion, timing, reattendance and admission.", caution:"Universal follow-up may create workload with limited benefit.", evidence:"hypothesis", sources:["S9","S10"] }),
  AE_NODE("treatment-not-accessed","Medicines or treatment cannot be obtained or followed","repeat",2,262,720,{ summary:"The plan may fail because medicines, appointments, equipment or practical support are inaccessible.", why:"A technically correct plan may be impossible in the person's circumstances.", action:"Review whether treatment was obtainable, understandable and feasible.", timescale:"quick", owner:"Primary care, pharmacy, community and providers", measures:"Prescription access, adherence barriers, equipment, appointments and recurring symptoms.", caution:"Non-completion should not automatically be attributed to patient choice.", evidence:"hypothesis", sources:["S4","S5"] }),
  AE_NODE("care-plan-unusable","The care plan is unavailable or unusable during a crisis","repeat",2,276,620,{ summary:"A plan may exist but be inaccessible, unclear, outdated or unsupported when urgent decisions are made.", why:"Plans only change care when patients, carers and professionals can find and use them.", action:"Test plans during real urgent episodes and make escalation routes visible.", timescale:"medium", owner:"ICBs, providers, primary care and digital teams", measures:"Plan availability, use, currency, patient agreement, disposition and outcome.", caution:"A documented plan is not evidence that it works.", evidence:"hypothesis", sources:["S9"] }),
  AE_NODE("weak-continuity","Continuity and ownership are weak","repeat",2,290,720,{ summary:"Repeated hand-offs can leave the underlying problem, conflicting treatment or social need unresolved.", why:"Many contacts do not guarantee a coherent whole-person response.", action:"Strengthen named coordination and continuity for people with recurring complex need.", timescale:"medium", owner:"ICBs, primary care and provider collaboratives", measures:"Usual clinician continuity, organisations involved, duplicated contacts, care plans and experience.", caution:"Continuity is difficult to measure and cannot always be delivered by one person.", evidence:"hypothesis", sources:["S4","S5"] }),

  // ============================================================
  // 09. CONTEXT THAT CHANGES THE MEASURED TOTAL OR RATE
  // ============================================================
  AE_NODE("population-growth","Population size or age mix has changed","context",2,156,790,{ summary:"More residents or a different age structure can increase total attendance even when individual risk is unchanged.", why:"Counts without denominators can misrepresent performance.", action:"Use rates, age standardisation and cohort-specific comparisons.", timescale:"diagnostic", owner:"NHSE and ICB analysts", measures:"Resident and registered population, age structure, migration and standardised rates.", caution:"Adjustment explains volume but not necessarily operational pressure.", evidence:"official", sources:["S11","S12"] }),
  AE_NODE("service-reconfiguration","Service configuration has shifted activity into A&E","context",2,174,820,{ summary:"Closure, relocation, opening changes or coding can move activity between urgent-care settings.", why:"The trend may partly reflect where activity is counted.", action:"Annotate changes and compare the combined urgent-care pathway.", timescale:"diagnostic", owner:"ICBs, providers and analysts", measures:"Site changes, service type, opening, referral source and coding discontinuities.", caution:"Reconfiguration can alter both recording and behaviour.", evidence:"official", sources:["S9"] }),
  AE_NODE("coding-data-quality","Coding or data completeness has changed","context",2,192,790,{ summary:"Improved completeness or changed definitions can create an apparent trend.", why:"Data quality affects counts, diagnoses, acuity and referral source.", action:"Check metadata, completeness and breaks before interpreting change.", timescale:"diagnostic", owner:"NHSE, providers and ICB analysts", measures:"Completeness, invalid values, submission changes, definitions and site-level breaks.", caution:"Data concerns should not be used to dismiss a trend without evidence.", evidence:"official", sources:["S9"] }),
  AE_NODE("cross-boundary-flow","Cross-boundary patient flows have changed","context",2,210,820,{ summary:"Changes in where people live, register or choose to attend can alter local activity.", why:"Provider counts and resident-population rates answer different questions.", action:"Separate resident, registered and provider activity and examine flows between areas.", timescale:"diagnostic", owner:"NHSE and ICB analysts", measures:"Residence, registered practice, provider site, travel pattern and boundary flow.", caution:"Flow adjustment does not remove the provider's operational workload.", evidence:"official", sources:["S9","S11"] })
];

// ============================================================
// 10. DIRECT DETERMINANTS OF A&E ATTENDANCE
// ============================================================
const AE_MAP_LINKS = [
  AE_LINK("severe-worsening-symptoms","ae-attendance","increases urgent attendance","positive","published",["S9","S10"]),
  AE_LINK("mental-health-crisis-direct","ae-attendance","creates an urgent presentation"),
  AE_LINK("no-same-day-appointment","ae-attendance","makes A&E the timely route"),
  AE_LINK("primary-care-closed","ae-attendance","leaves A&E as an open route"),
  AE_LINK("urgent-community-too-slow","ae-attendance","removes a rapid home-based alternative"),
  AE_LINK("mental-health-alternative-unavailable","ae-attendance","leaves A&E as the available crisis route"),
  AE_LINK("home-support-not-ready","ae-attendance","makes home management unavailable"),
  AE_LINK("nhs111-directs-ae","ae-attendance","directly recommends A&E","positive","official",["S9"]),
  AE_LINK("ambulance-conveys-ae","ae-attendance","brings the person to A&E"),
  AE_LINK("professional-refers-ae","ae-attendance","directly refers to A&E"),
  AE_LINK("severity-uncertain","ae-attendance","increases perceived need for emergency assessment"),
  AE_LINK("ae-immediate-tests","ae-attendance","makes A&E comparatively attractive"),
  AE_LINK("low-confidence-other-services","ae-attendance","increases selection of A&E","positive","published",["S2"]),
  AE_LINK("cannot-remain-safe-home","ae-attendance","makes care elsewhere unsafe"),
  AE_LINK("alternatives-hard-to-use","ae-attendance","makes other routes impractical"),
  AE_LINK("previous-care-unresolved","ae-attendance","creates repeat attendance"),

  AE_LINK("older-frailer-population","severe-worsening-symptoms","increases frailty-related urgent need"),
  AE_LINK("multimorbidity-frailty","severe-worsening-symptoms","increases crisis risk"),
  AE_LINK("poor-condition-control","severe-worsening-symptoms","increases exacerbation and complication","positive","published",["S4","S5"]),
  AE_LINK("seasonal-infection","severe-worsening-symptoms","creates seasonal acute illness","positive","published",["S12","S16"]),
  AE_LINK("medicine-related-harm","severe-worsening-symptoms","can cause acute deterioration"),
  AE_LINK("unmet-mental-health-need","mental-health-crisis-direct","allows need to escalate to crisis"),
  AE_LINK("multimorbidity-frailty","poor-condition-control","increases treatment complexity"),

  AE_LINK("primary-care-workforce","no-same-day-appointment","reduces usable appointment capacity"),
  AE_LINK("appointment-demand-capacity","no-same-day-appointment","exhausts available appointments"),
  AE_LINK("out-of-hours-coverage","primary-care-closed","limits access outside normal hours"),
  AE_LINK("community-workforce-hours","urgent-community-too-slow","limits response capacity"),
  AE_LINK("restrictive-eligibility","urgent-community-too-slow","excludes people from the pathway"),
  AE_LINK("restrictive-eligibility","mental-health-alternative-unavailable","excludes people from crisis support"),
  AE_LINK("mental-health-crisis-capacity","mental-health-alternative-unavailable","creates waits or unavailable access"),
  AE_LINK("social-care-capacity","home-support-not-ready","delays urgent support"),

  AE_LINK("risk-triage-rules","nhs111-directs-ae","favours cautious escalation"),
  AE_LINK("no-direct-booking","nhs111-directs-ae","removes a guaranteed alternative"),
  AE_LINK("shared-records-missing","professional-refers-ae","increases uncertainty and cautious referral"),
  AE_LINK("senior-advice-unavailable","professional-refers-ae","limits supported decision-making"),
  AE_LINK("ambulance-alternatives-limited","ambulance-conveys-ae","leaves conveyance as the reliable route"),
  AE_LINK("shared-records-missing","ambulance-conveys-ae","increases uncertainty at the scene"),
  AE_LINK("no-direct-booking","professional-refers-ae","removes a directly bookable route"),

  AE_LINK("health-literacy-anxiety","severity-uncertain","increases uncertainty about risk"),
  AE_LINK("diagnostics-outside-ae-slow","ae-immediate-tests","increases the relative speed of A&E"),
  AE_LINK("previous-failed-access","low-confidence-other-services","reduces expectation of timely help"),
  AE_LINK("fragmented-care-experience","low-confidence-other-services","reduces confidence in other routes"),
  AE_LINK("primary-care-closed","low-confidence-other-services","reinforces expectation that other routes are unavailable"),
  AE_LINK("no-same-day-appointment","low-confidence-other-services","reinforces expectation that help will be delayed"),

  AE_LINK("living-alone-no-carer","cannot-remain-safe-home","removes practical monitoring and support","positive","published",["S1","S7"]),
  AE_LINK("unsafe-unsuitable-housing","cannot-remain-safe-home","makes recovery or monitoring unsafe","positive","published",["S1","S3"]),
  AE_LINK("care-home-clinical-support","cannot-remain-safe-home","increases escalation from care homes"),
  AE_LINK("transport-language-digital","alternatives-hard-to-use","blocks the access route","positive","published",["S1","S2"]),
  AE_LINK("work-caring-constraints","alternatives-hard-to-use","makes delayed or repeated appointments impractical"),

  AE_LINK("unresolved-diagnosis","previous-care-unresolved","leaves the cause unresolved"),
  AE_LINK("follow-up-delayed","previous-care-unresolved","allows risk to recur"),
  AE_LINK("treatment-not-accessed","previous-care-unresolved","prevents the plan from resolving need"),
  AE_LINK("care-plan-unusable","previous-care-unresolved","leaves crisis management unchanged"),
  AE_LINK("weak-continuity","previous-care-unresolved","leaves no clear ownership"),
  AE_LINK("ae-attendance","previous-care-unresolved","may treat the immediate episode only","uncertain"),
  AE_LINK("previous-care-unresolved","low-confidence-other-services","can reinforce reliance on A&E"),
  AE_LINK("weak-continuity","poor-condition-control","can leave deterioration unmanaged"),

  AE_LINK("population-growth","ae-attendance","raises the expected count or rate","uncertain","official",["S11","S12"]),
  AE_LINK("service-reconfiguration","ae-attendance","moves recorded activity into A&E","uncertain","official",["S9"]),
  AE_LINK("coding-data-quality","ae-attendance","changes the recorded total","uncertain","official",["S9"]),
  AE_LINK("cross-boundary-flow","ae-attendance","changes local provider activity","uncertain","official",["S9","S11"])
];

// ============================================================
// 13. FEEDBACK LOOPS
// ============================================================
const AE_MAP_LOOPS = [
  { id:"unresolved-need",type:"R",title:"Unresolved need and reattendance",nodes:["weak-continuity","poor-condition-control","severe-worsening-symptoms","ae-attendance","previous-care-unresolved"],explanation:"Weak continuity can contribute to poor control and urgent deterioration. A&E may resolve the immediate episode without resolving the cause, allowing the same need to recur." },
  { id:"reliance-on-ae",type:"R",title:"Reliance on the route expected to respond",nodes:["previous-failed-access","low-confidence-other-services","ae-attendance","previous-care-unresolved"],explanation:"Failed access can reduce confidence in other services. Attendance that does not resolve the underlying need may reinforce future reliance on A&E." },
  { id:"complexity-crisis",type:"R",title:"Multimorbidity, poor control and crisis",nodes:["multimorbidity-frailty","poor-condition-control","severe-worsening-symptoms","ae-attendance","previous-care-unresolved"],explanation:"Multimorbidity increases treatment complexity and the risk of poor control. Recurrent urgent episodes can leave the combined need unresolved and contribute to further crisis." }
];