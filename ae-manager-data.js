// ============================================================
// 00. A&E MANAGEMENT MAP: PURPOSE AND COLOUR PALETTE
// ============================================================
// The map is organised around the management question:
// "A&E attendance is high or rising. What is driving it, what can we
// influence, who holds the lever and how quickly might change appear?"

const AE_DOMAINS = {
  problem:      { label:"Management problem", colour:"#103247" },
  need:         { label:"Population need", colour:"#64806c" },
  earlierCare:  { label:"Earlier care", colour:"#087f78" },
  alternatives: { label:"Alternatives to A&E", colour:"#7663a0" },
  navigation:   { label:"Advice and navigation", colour:"#4b7ea8" },
  reliability:  { label:"Why A&E is chosen", colour:"#b27a21" },
  social:       { label:"Social circumstances", colour:"#9a6a35" },
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
// 01. NODE HELPER
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

// ============================================================
// 02. CENTRAL PROBLEM AND FIRST-RING EXPLANATIONS
// ============================================================
const AE_MAP_NODES = [
  AE_NODE("ae-attendance","High or rising A&E attendance","problem",0,0,0,{
    summary:"The management problem is not simply that people are using a department. It is that more people are reaching A&E, for different reasons, through different routes and with different opportunities for prevention or alternative care.",
    why:"Attendance may reflect genuine urgent need, failures earlier in the pathway, unavailable alternatives, professional referral, social circumstances, repeat unresolved need, or population and recording change.",
    action:"Do not begin with a single intervention. First identify which explanation accounts for local growth, for which cohorts, at which times and through which arrival routes. Then choose actions matched to those drivers.",
    timescale:"mixed", owner:"NHSE, ICBs, providers, primary care, local authorities and partners",
    measures:"Attendances and rates by age, deprivation, condition, acuity, arrival mode, referral source, time, geography, repeat use and outcome.",
    caution:"High attendance is not synonymous with inappropriate attendance. Reducing necessary attendance would create harm.", evidence:"official", sources:["S9","S10","S11"]
  }),

  AE_NODE("more-urgent-need","More genuine urgent health need","need",1,-137,315,{
    summary:"More people may be becoming acutely ill, injured or unable to manage safely without urgent assessment.",
    why:"Population ageing, frailty, multimorbidity, seasonal illness, mental-health crises and unequal health can all increase genuine urgent need.",
    action:"Separate growth in underlying need from potentially avoidable escalation. Target prevention and proactive care at the cohorts contributing most to urgent deterioration.",
    timescale:"long", owner:"ICB population health, providers, primary care and local authorities",
    measures:"Age-standardised attendance, acuity, diagnoses, ambulance arrivals, admission conversion and cohort-specific rates.",
    caution:"A rise caused by genuine urgent need cannot safely be managed only by redirecting people elsewhere.", evidence:"hypothesis", sources:["S9","S10","S12"]
  }),

  AE_NODE("preventable-deterioration","Problems worsen before help arrives","earlierCare",1,-94,305,{
    summary:"Some people reach A&E after opportunities for diagnosis, monitoring, treatment or earlier response were missed or ineffective.",
    why:"Poor condition control, weak continuity, delayed diagnosis, medicine-related harm and failure to recognise deterioration can turn manageable need into crisis.",
    action:"Identify conditions and cohorts where crisis follows a visible earlier-care gap; strengthen continuity, review, case-finding and proactive response.",
    timescale:"medium", owner:"ICBs, primary care, community and specialist providers",
    measures:"Recent contacts, review completion, treatment control, referral waits, prior admissions and time from deterioration to response.",
    caution:"Not every crisis is preventable, even when earlier care was appropriate.", evidence:"hypothesis", sources:["S4","S5","S9","S10"]
  }),

  AE_NODE("alternatives-unavailable","Appropriate alternatives are unavailable or unusable","alternatives",1,-48,315,{
    summary:"A&E may be the only service that is open, timely, accessible and able to assess the problem when help is needed.",
    why:"Same-day primary care, urgent community response, mental-health crisis support, diagnostics or support at home may be absent, delayed or difficult to use.",
    action:"Test whether alternatives exist at the exact times and for the exact needs driving attendance—not merely whether a service exists somewhere in the pathway.",
    timescale:"quick", owner:"ICBs, primary care, community, mental-health and acute providers",
    measures:"Service availability by hour, direct booking, response times, eligibility, failed referrals and attendance after attempted alternative care.",
    caution:"Creating an alternative will not reduce A&E use unless patients and professionals can access it reliably.", evidence:"hypothesis", sources:["S6","S9"]
  }),

  AE_NODE("directed-to-ae","People are directed to A&E by the system","navigation",1,-2,305,{
    summary:"A substantial share of attendance may follow advice or referral from NHS 111, ambulances, general practice, care homes or other professionals.",
    why:"Triage rules, risk tolerance, access to records and availability of direct alternatives shape professional decisions.",
    action:"Analyse referral source and disposition; improve clinical validation, direct booking, shared information and safe alternatives to conveyance or referral.",
    timescale:"quick", owner:"NHSE, ICBs, NHS 111, ambulance services and providers",
    measures:"Referral source, NHS 111 disposition, ambulance conveyance, professional referrals, validation outcomes and alternative pathway use.",
    caution:"Reducing professional referral without safe alternatives may transfer risk to patients and clinicians.", evidence:"official", sources:["S9"]
  }),

  AE_NODE("ae-most-reliable","A&E appears the safest or most reliable option","reliability",1,43,315,{
    summary:"People may choose A&E because it offers visible access, diagnostics and treatment in one place when other routes feel uncertain or fragmented.",
    why:"Poor experiences elsewhere, unclear navigation, symptom uncertainty, opening hours and the convenience of a one-stop response can make A&E rationally attractive.",
    action:"Improve the reliability and simplicity of alternatives rather than relying on messages telling people not to attend.",
    timescale:"medium", owner:"ICBs, providers, primary care and communications teams",
    measures:"Patient-reported reasons, prior attempts to obtain care, service awareness, experience, opening times and diagnostic access.",
    caution:"Public messaging alone is unlikely to work when the underlying service experience remains unchanged.", evidence:"hypothesis", sources:["S2","S9"]
  }),

  AE_NODE("social-support-insufficient","Social circumstances make care outside hospital difficult","social",1,88,305,{
    summary:"A health problem may become an A&E attendance because the person cannot remain safe, cope or recover in their current circumstances.",
    why:"Living alone, weak carer capacity, unsafe housing, care-home support gaps and transport or digital barriers can make community management impractical.",
    action:"Develop rapid health-and-social-care responses for the cohorts where social circumstances are driving escalation or preventing safe alternatives.",
    timescale:"medium", owner:"ICBs, local authorities, community providers, housing and voluntary partners",
    measures:"Living situation, care needs, care-home origin, housing, safeguarding, support packages and reason community management was not possible.",
    caution:"These drivers often sit outside direct NHS control and require genuine partnership action.", evidence:"published", sources:["S1","S2","S7","S8"]
  }),

  AE_NODE("repeat-unresolved","Previous care did not resolve the underlying need","repeat",1,134,315,{
    summary:"Repeat attendance may follow discharge without effective follow-up, an unresolved diagnosis, recurring crisis or a care plan that cannot be implemented.",
    why:"A&E can treat the immediate problem while leaving the cause, treatment burden or social situation unchanged.",
    action:"Segment repeat users by need and review the pathway after attendance, rather than treating all frequent attendance as one behavioural problem.",
    timescale:"quick", owner:"ICBs, acute providers, primary care, mental-health and community services",
    measures:"7-, 30- and 90-day reattendance, frequent attendance, follow-up, unresolved diagnosis, care plans and cross-service contact patterns.",
    caution:"Frequent attenders are heterogeneous; a single intervention is unlikely to fit all groups.", evidence:"hypothesis", sources:["S9","S10"]
  }),

  AE_NODE("population-recording-change","Population, access or recording has changed","context",1,180,305,{
    summary:"Raw attendance can rise because the population grew or changed, services were reconfigured, coding improved or activity moved between sites.",
    why:"Without denominator, case-mix and pathway context, managers may attribute growth to behaviour or failure when it reflects structural change.",
    action:"Establish whether the apparent problem remains after adjusting for population, age, service configuration, coding and cross-boundary flows.",
    timescale:"diagnostic", owner:"NHSE and ICB analytical teams",
    measures:"Rates, age standardisation, registered and resident population, site changes, coding completeness, boundary flows and data breaks.",
    caution:"A data or denominator explanation can account for apparent growth but does not exclude real operational pressure.", evidence:"official", sources:["S9","S10","S11"]
  }),

  AE_NODE("population-ageing","Older and frailer population","need",2,-162,610,{
    summary:"A larger older population can increase falls, infection, frailty crises and the consequences of otherwise minor illness.", why:"This increases genuine urgent need and may also reduce the feasibility of care outside hospital.", action:"Use age- and frailty-specific analysis; plan proactive frailty, falls, vaccination and home-support responses.", timescale:"long", owner:"ICB population health, primary care, community and local authorities", measures:"Age-standardised rates, frailty markers, falls, care-home origin and ambulance conveyance.", caution:"Ageing is not itself a failure and crude comparisons can mislead.", evidence:"official", sources:["S11","S12"]
  }),
  AE_NODE("multimorbidity-frailty","Multimorbidity and frailty","need",2,-143,685,{
    summary:"Several conditions, reduced reserve and interacting treatments increase the chance that a small change becomes a crisis.", why:"Complexity can raise symptom burden, treatment difficulty, appointment burden and dependence on urgent care.", action:"Identify high-risk combinations; coordinate whole-person care, medicines, monitoring and escalation plans.", timescale:"medium", owner:"ICBs, primary care, community and specialist providers", measures:"Condition combinations, frailty, medicines, prior activity, crisis frequency and person-level linked use.", caution:"Condition count alone does not describe severity or preventability.", evidence:"hypothesis", sources:["S4","S10","S12"]
  }),
  AE_NODE("seasonal-infection","Seasonal illness and infection","need",2,-126,610,{
    summary:"Respiratory and other infections can create concentrated peaks in urgent need.", why:"Exposure, vaccination, housing, immunity and outbreaks change both incidence and severity.", action:"Use seasonal surveillance, vaccination, infection prevention and targeted support for high-risk groups.", timescale:"quick", owner:"NHSE, ICBs, public health, primary care and providers", measures:"Syndromic presentation, infection diagnoses, vaccination, outbreaks and age-specific rates.", caution:"Seasonal interventions reduce risk but cannot remove all peaks.", evidence:"published", sources:["S9","S12","S16"]
  }),
  AE_NODE("mental-health-crisis","Mental-health or substance-use crisis","need",2,-110,690,{
    summary:"Crisis may lead directly to A&E or indirectly through injury, self-harm, physical illness or lack of another safe response.", why:"Unmet need, access thresholds and fragmented physical and mental healthcare can increase urgent presentations.", action:"Strengthen crisis alternatives, liaison, follow-up and integrated responses for recurring presentations.", timescale:"medium", owner:"ICBs, mental-health providers, local authorities and voluntary partners", measures:"Presentation reason, crisis-service contact, repeat use, self-harm, substance use and follow-up.", caution:"A&E attendance may be the safest available response in an acute crisis.", evidence:"hypothesis", sources:["S9","S12"]
  }),

  AE_NODE("poor-condition-control","Long-term conditions are poorly controlled","earlierCare",2,-103,575,{
    summary:"Poor control can increase exacerbations, complications and urgent deterioration.", why:"Treatment, monitoring, adherence, access and wider circumstances all affect control.", action:"Target high-risk conditions and people; improve treatment-to-target, review and rapid response to deterioration.", timescale:"medium", owner:"Primary care, community and specialist providers", measures:"Control indicators, reviews, medicines, exacerbations and attendance after recent contact.", caution:"Process measures do not fully capture clinical quality or patient preferences.", evidence:"published", sources:["S4","S5"]
  }),
  AE_NODE("weak-continuity","Weak continuity and fragmented care","earlierCare",2,-87,675,{
    summary:"Repeated hand-offs and lack of a trusted clinician can leave deterioration, conflicting treatment and unresolved need unnoticed.", why:"Complex patients may receive many contacts without one coherent plan.", action:"Strengthen relational continuity, named coordination and shared care planning for high-risk cohorts.", timescale:"medium", owner:"ICBs, primary care and provider collaboratives", measures:"Usual clinician continuity, organisations involved, duplicated contacts, care plans and patient experience.", caution:"Continuity is difficult to measure and cannot always be delivered by one clinician.", evidence:"hypothesis", sources:["S4","S5"]
  }),
  AE_NODE("delayed-diagnosis","Diagnosis or treatment is delayed","earlierCare",2,-70,600,{
    summary:"A condition may progress while waiting for recognition, tests, referral or treatment.", why:"Delayed diagnosis can increase severity at presentation and reduce the options available outside hospital.", action:"Identify presentations preceded by diagnostic opportunity or long waits; target bottlenecks and safety-netting.", timescale:"medium", owner:"ICBs, primary care, diagnostics and specialist providers", measures:"Prior symptoms, referrals, waits, tests, missed appointments and severity at attendance.", caution:"Retrospective review can overstate what was knowable earlier.", evidence:"hypothesis", sources:["S9","S10"]
  }),
  AE_NODE("medicine-related-harm","Medicine-related harm or treatment burden","earlierCare",2,-55,690,{
    summary:"Interactions, side effects, missed medicines and impossible treatment plans can contribute to deterioration.", why:"Risk rises with multimorbidity, polypharmacy, poor coordination and practical barriers.", action:"Use targeted medication review, reconciliation, adherence support and simplified whole-person plans.", timescale:"quick", owner:"Primary care, pharmacy, community and acute providers", measures:"Medicine count, high-risk medicines, recent changes, adverse events and attendance diagnoses.", caution:"Deprescribing or changing treatment also carries risk and requires clinical judgement.", evidence:"hypothesis", sources:["S4","S5","S10"]
  }),

  AE_NODE("same-day-primary-care","Same-day primary care is not available","alternatives",2,-57,575,{
    summary:"People with urgent but potentially manageable problems may use A&E when same-day assessment is unavailable or uncertain.", why:"Capacity, opening, continuity, triage and diagnostic access determine whether primary care is a credible alternative.", action:"Match same-day capacity and clinical skill to periods and cohorts contributing to A&E use; enable direct booking.", timescale:"quick", owner:"ICBs and primary care", measures:"Same-day demand and capacity, failed appointment attempts, opening times and subsequent A&E attendance.", caution:"Increasing appointments alone may reveal unmet need without reducing A&E attendance.", evidence:"hypothesis", sources:["S6","S11"]
  }),
  AE_NODE("urgent-community-gap","Urgent community response cannot meet the need","alternatives",2,-40,680,{
    summary:"Some deterioration could be assessed or supported at home, but only if a sufficiently rapid and skilled response exists.", why:"Hours, workforce, eligibility, travel and diagnostic support determine usable capacity.", action:"Examine referrals declined, response time, operating hours and outcomes; target gaps where people are otherwise conveyed or referred to A&E.", timescale:"quick", owner:"ICBs and community providers", measures:"Referral volume, acceptance, response time, outcome, conveyance and admission after response.", caution:"Community response must not become an unsafe substitute for hospital assessment.", evidence:"hypothesis", sources:["S6","S9"]
  }),
  AE_NODE("mental-health-alternative-gap","Mental-health crisis alternatives are unavailable","alternatives",2,-23,590,{
    summary:"A&E may be used when no timely, acceptable and safe mental-health crisis response is available.", why:"Thresholds, geography, hours and the need to address physical risk can limit alternatives.", action:"Map crisis pathways by time and cohort; improve direct access, clinical support and follow-up.", timescale:"medium", owner:"ICBs and mental-health providers", measures:"Crisis referrals, response times, declined access, A&E use and repeat presentation.", caution:"Some crises require A&E because of physical or immediate safety needs.", evidence:"hypothesis", sources:["S9"]
  }),
  AE_NODE("support-at-home-gap","Support at home is not available quickly enough","alternatives",2,-8,685,{
    summary:"Even a clinically manageable problem may require A&E when home support, equipment, care or monitoring cannot be arranged.", why:"Health and social-care capacity jointly determine whether someone can remain safely at home.", action:"Create rapid routes to short-term support, equipment, reablement and carer assistance for urgent cases.", timescale:"medium", owner:"ICBs, local authorities and community providers", measures:"Reason home management failed, care package availability, response time and outcome.", caution:"Temporary support may reveal substantial ongoing unmet need and cost.", evidence:"hypothesis", sources:["S7","S8"]
  }),

  AE_NODE("nhs111-disposition","NHS 111 disposition directs people to A&E","navigation",2,-14,575,{
    summary:"Remote triage may recommend A&E because of symptoms, uncertainty, risk rules or lack of a directly bookable alternative.", why:"Disposition reflects both clinical risk and the services visible to the triage system.", action:"Review high-volume dispositions, clinical validation and direct booking into safe alternatives.", timescale:"quick", owner:"NHSE, ICBs and NHS 111 providers", measures:"Disposition, validation changes, presenting symptom, time, alternative booking and outcome.", caution:"Reducing cautious dispositions without better assessment or alternatives may increase harm.", evidence:"official", sources:["S9"]
  }),
  AE_NODE("ambulance-conveyance","Ambulance assessment results in conveyance","navigation",2,3,680,{
    summary:"Conveyance depends on clinical need, risk, available alternatives, crew support and the safety of remaining at home.", why:"Non-conveyance is only possible when assessment, records, referral routes and community response are reliable.", action:"Strengthen hear-and-treat, see-and-treat, clinical support and direct referral pathways where evidence supports them.", timescale:"quick", owner:"Ambulance services, ICBs and providers", measures:"Conveyance by condition and cohort, alternative referral, recontact, later attendance and adverse outcomes.", caution:"A lower conveyance rate is not automatically better and needs outcome monitoring.", evidence:"hypothesis", sources:["S9"]
  }),
  AE_NODE("professional-referral","Professionals refer because safer routes are absent","navigation",2,20,585,{
    summary:"General practice, care homes, community teams and other professionals may refer when risk cannot be assessed or managed elsewhere.", why:"Access to senior advice, diagnostics, records and rapid alternatives shapes referral decisions.", action:"Review referral patterns and provide direct specialist advice, diagnostics and booking where appropriate.", timescale:"quick", owner:"ICBs, provider collaboratives, primary care and care homes", measures:"Referral source, reason, prior advice, availability of alternatives and A&E outcome.", caution:"Variation may reflect case mix rather than referral quality.", evidence:"hypothesis", sources:["S9"]
  }),
  AE_NODE("shared-information-gap","Decision-makers lack shared information","navigation",2,35,680,{
    summary:"Without history, care plans or recent results, the safest decision may be A&E assessment.", why:"Fragmented records increase uncertainty and duplicate assessment.", action:"Make relevant records, escalation plans and recent clinical information available across urgent pathways.", timescale:"medium", owner:"NHSE, ICBs and provider digital teams", measures:"Record access, repeated assessment, missing information and disposition changes after clinical review.", caution:"Information access does not replace clinical capacity or professional judgement.", evidence:"hypothesis", sources:["S9","S10"]
  }),

  AE_NODE("symptom-uncertainty","Symptoms feel serious or uncertain","reliability",2,29,585,{
    summary:"People may attend because they cannot confidently distinguish a minor problem from a time-critical emergency.", why:"Severity, novelty, anxiety and prior experience influence perceived risk.", action:"Provide trusted clinical navigation and safety-netting, while preserving clear emergency messaging.", timescale:"quick", owner:"NHSE, ICBs, NHS 111 and providers", measures:"Patient-reported reason, symptom, advice sought and acuity.", caution:"Low-acuity outcome does not mean the original decision was unreasonable.", evidence:"hypothesis", sources:["S2","S9"]
  }),
  AE_NODE("poor-confidence-alternatives","Low confidence in other services","reliability",2,46,680,{
    summary:"Previous difficulty obtaining help can make A&E the route people trust to provide a response.", why:"Reliability, continuity, communication and previous outcomes shape future choices.", action:"Measure failed attempts and experience; improve reliability before relying on behaviour-change messages.", timescale:"medium", owner:"ICBs, providers and primary care", measures:"Prior attempted contacts, patient experience, continuity and future service choice.", caution:"Trust is slow to build and can be damaged quickly by poor access.", evidence:"published", sources:["S2"]
  }),
  AE_NODE("one-stop-diagnostics","A&E offers assessment and tests in one place","reliability",2,63,585,{
    summary:"A&E may provide a practical one-stop route when alternatives require several appointments, sites or referrals.", why:"Fragmentation and diagnostic delay increase the relative convenience of A&E.", action:"Develop rapid diagnostic and assessment routes outside A&E for suitable cohorts.", timescale:"medium", owner:"ICBs, diagnostics, primary care and providers", measures:"Tests performed, prior waits, multiple contacts and alternative diagnostic capacity.", caution:"Creating diagnostic access may increase activity and detect previously unmet need.", evidence:"hypothesis", sources:["S9","S10"]
  }),
  AE_NODE("opening-convenience","A&E is open when other services are not","reliability",2,78,675,{
    summary:"Work, caring responsibilities and service hours may make A&E the only feasible route.", why:"Availability must be considered by hour and day, not only as total weekly capacity.", action:"Align urgent alternatives with the timing of attendance and enable clear direct access.", timescale:"quick", owner:"ICBs, primary care and providers", measures:"Attendance by hour/day, opening times, employment or caring constraints and prior attempts.", caution:"Extending hours may redistribute demand rather than reduce it.", evidence:"hypothesis", sources:["S9"]
  }),

  AE_NODE("living-alone-carers","Living alone or limited carer capacity","social",2,72,590,{
    summary:"The absence of someone who can monitor, reassure or assist may make urgent attendance more likely.", why:"The same clinical problem can be manageable with support and unsafe without it.", action:"Include living situation and carer capacity in urgent response and discharge planning.", timescale:"medium", owner:"ICBs, local authorities, community and voluntary partners", measures:"Living alone, unpaid care, carer strain, support package and attendance outcome.", caution:"Unpaid care should not be assumed available or expanded without support.", evidence:"published", sources:["S1","S7"]
  }),
  AE_NODE("care-home-support","Care homes lack rapid clinical support","social",2,89,680,{
    summary:"Care-home residents may attend when staff cannot obtain timely assessment, treatment or escalation advice.", why:"Workforce, confidence, records, prescribing and access to community clinicians affect escalation.", action:"Provide enhanced care-home support, rapid advice, treatment and clear escalation plans.", timescale:"quick", owner:"ICBs, primary care, community providers and care homes", measures:"Attendances by care home, reason, time, advice sought, conveyance and admission.", caution:"Lower attendance must be balanced against recognition of serious illness and resident preferences.", evidence:"hypothesis", sources:["S7","S8","S9"]
  }),
  AE_NODE("housing-safety","Housing makes safe management difficult","social",2,106,590,{
    summary:"Cold, damp, hazards, homelessness or unsuitable housing can worsen illness and prevent recovery at home.", why:"Housing affects exposure, safety, medicine storage, mobility and the feasibility of home-based care.", action:"Connect urgent pathways with housing, welfare and homelessness support for relevant cohorts.", timescale:"long", owner:"Local authorities, housing, ICBs and voluntary partners", measures:"Housing status, homelessness, hazards, discharge barriers and repeat attendance.", caution:"Housing interventions are essential but unlikely to resolve immediate system pressure alone.", evidence:"published", sources:["S1","S3"]
  }),
  AE_NODE("transport-digital-barriers","Transport, language or digital barriers block alternatives","social",2,121,675,{
    summary:"An alternative may exist but remain unusable because of travel, disability, language, digital access or caring responsibilities.", why:"Nominal availability is different from practical accessibility.", action:"Audit accessibility and provide transport, interpretation, non-digital and flexible routes.", timescale:"medium", owner:"ICBs, providers, local authorities and partners", measures:"Access mode, travel, language, digital use, failed contacts and service choice.", caution:"Broad population categories may conceal very different individual barriers.", evidence:"published", sources:["S1","S2"]
  }),

  AE_NODE("unresolved-after-ae","Underlying cause remains unresolved after attendance","repeat",2,116,590,{
    summary:"Immediate symptoms may be treated without resolving diagnosis, treatment, social need or the trigger for crisis.", why:"This creates a pathway back to further deterioration and reattendance.", action:"Review recurring presentations and ensure ownership of unresolved problems after discharge.", timescale:"quick", owner:"Acute providers, primary care, community and mental-health services", measures:"Discharge diagnosis, pending tests, follow-up, reattendance and subsequent admission.", caution:"Some conditions are inherently recurrent despite appropriate care.", evidence:"hypothesis", sources:["S9","S10"]
  }),
  AE_NODE("post-ae-followup","Post-A&E follow-up is absent or delayed","repeat",2,133,680,{
    summary:"People discharged with ongoing risk may deteriorate again if follow-up is not timely or coordinated.", why:"Responsibility can be unclear across acute, primary, community and specialist care.", action:"Create targeted rapid follow-up for defined high-risk groups and monitor completion and outcomes.", timescale:"quick", owner:"ICBs, acute providers, primary care and community services", measures:"Follow-up offer and completion, timing, reattendance and admission.", caution:"Universal follow-up may create large workload with limited benefit; target by risk and need.", evidence:"hypothesis", sources:["S9","S10"]
  }),
  AE_NODE("frequent-attender-segmentation","Frequent attenders are not segmented by need","repeat",2,150,590,{
    summary:"Repeated attendance can arise from very different combinations of physical illness, mental health, social need, crisis and access failure.", why:"Treating all frequent attendance as one problem leads to generic interventions.", action:"Segment by pattern and need; use multidisciplinary review where there is a plausible coordinated response.", timescale:"quick", owner:"ICBs and provider collaboratives", measures:"Frequency, diagnoses, services involved, social factors, arrival route and response to prior interventions.", caution:"Small numbers and regression to the mean can make interventions appear more effective than they are.", evidence:"hypothesis", sources:["S9","S10"]
  }),
  AE_NODE("care-plan-not-usable","Care plans do not work in a crisis","repeat",2,165,675,{
    summary:"A plan may exist but be unavailable, unclear, unacceptable or unsupported when urgent decisions are made.", why:"Plans only change care when patients, carers and professionals can find and use them.", action:"Test care plans during real urgent episodes; make escalation preferences and direct routes visible.", timescale:"medium", owner:"ICBs, providers, primary care and digital teams", measures:"Plan availability, use during crisis, patient agreement, disposition and outcome.", caution:"A documented plan is not evidence that the plan is current, shared or effective.", evidence:"hypothesis", sources:["S9"]
  }),

  AE_NODE("population-growth","Population size or age mix has changed","context",2,158,590,{
    summary:"More residents or a different age structure can increase attendance even when individual risk is unchanged.", why:"Counts without denominators can misrepresent performance.", action:"Use rates, age standardisation and cohort-specific comparisons before attributing growth to service failure.", timescale:"diagnostic", owner:"NHSE and ICB analysts", measures:"Resident and registered population, age structure, migration and standardised rates.", caution:"Denominator adjustment explains volume change but not necessarily operational pressure.", evidence:"official", sources:["S11","S12"]
  }),
  AE_NODE("service-reconfiguration","Service configuration shifts activity into A&E","context",2,175,680,{
    summary:"Closure, relocation, changed opening or altered coding of urgent services can move activity between settings.", why:"The apparent A&E trend may partly reflect where care is counted rather than a change in underlying need.", action:"Annotate service changes and compare the combined urgent-care pathway, not one dataset in isolation.", timescale:"diagnostic", owner:"ICBs, providers and analysts", measures:"Site and service changes, attendance source, type, opening and coding discontinuities.", caution:"Reconfiguration can change both recording and patient behaviour.", evidence:"official", sources:["S9"]
  }),
  AE_NODE("coding-data-quality","Coding or data completeness has changed","context",2,192,590,{
    summary:"Improved completeness or altered definitions can create an apparent trend.", why:"Data quality affects diagnosis, acuity, referral source and even total recorded activity.", action:"Check metadata, completeness and breaks before interpreting subgroup changes.", timescale:"diagnostic", owner:"NHSE, providers and ICB analysts", measures:"Completeness, invalid values, submission changes, definitions and site-level breaks.", caution:"Data-quality concerns should not be used to dismiss a trend without evidence.", evidence:"official", sources:["S9"]
  }),
  AE_NODE("case-mix-change","The mix of patients or presentations has changed","context",2,208,680,{
    summary:"The same number of attendances can represent very different clinical and operational pressure.", why:"Age, acuity, arrival mode, condition and complexity affect resource requirement and the scope for alternatives.", action:"Separate volume from complexity and identify which segments are changing.", timescale:"diagnostic", owner:"NHSE and ICB analytical teams", measures:"Acuity, age, ambulance arrival, diagnosis, investigations, treatment, admission and length of stay.", caution:"Available case-mix fields may be incomplete or influenced by local practice.", evidence:"official", sources:["S9","S10"]
  })
];

// ============================================================
// 11. CAUSAL RELATIONSHIPS
// ============================================================
const AE_LINK = (source,target,label,polarity="positive",evidence="hypothesis",sources=[]) => ({ source,target,label,polarity,evidence,sources });

const AE_MAP_LINKS = [
  AE_LINK("more-urgent-need","ae-attendance","increases genuine urgent presentations"),
  AE_LINK("preventable-deterioration","ae-attendance","increases crisis presentations"),
  AE_LINK("alternatives-unavailable","ae-attendance","makes A&E the available route"),
  AE_LINK("directed-to-ae","ae-attendance","sends people to A&E"),
  AE_LINK("ae-most-reliable","ae-attendance","increases selection of A&E"),
  AE_LINK("social-support-insufficient","ae-attendance","makes care elsewhere harder"),
  AE_LINK("repeat-unresolved","ae-attendance","creates reattendance"),
  AE_LINK("population-recording-change","ae-attendance","changes recorded volume or rate","uncertain","official",["S9","S10","S11"]),
  AE_LINK("population-ageing","more-urgent-need","increases frailty-related need"),
  AE_LINK("multimorbidity-frailty","more-urgent-need","increases crisis risk"),
  AE_LINK("seasonal-infection","more-urgent-need","creates seasonal peaks"),
  AE_LINK("mental-health-crisis","more-urgent-need","creates urgent need"),
  AE_LINK("poor-condition-control","preventable-deterioration","increases exacerbation and complication"),
  AE_LINK("weak-continuity","preventable-deterioration","can leave deterioration unresolved"),
  AE_LINK("delayed-diagnosis","preventable-deterioration","allows severity to increase"),
  AE_LINK("medicine-related-harm","preventable-deterioration","can cause deterioration"),
  AE_LINK("same-day-primary-care","alternatives-unavailable","reduces the available alternative","negative"),
  AE_LINK("urgent-community-gap","alternatives-unavailable","removes a home-based response"),
  AE_LINK("mental-health-alternative-gap","alternatives-unavailable","removes a crisis alternative"),
  AE_LINK("support-at-home-gap","alternatives-unavailable","makes home management unsafe"),
  AE_LINK("nhs111-disposition","directed-to-ae","recommends A&E attendance"),
  AE_LINK("ambulance-conveyance","directed-to-ae","conveys people to A&E"),
  AE_LINK("professional-referral","directed-to-ae","refers people to A&E"),
  AE_LINK("shared-information-gap","directed-to-ae","increases uncertainty and cautious referral"),
  AE_LINK("symptom-uncertainty","ae-most-reliable","makes A&E appear safest"),
  AE_LINK("poor-confidence-alternatives","ae-most-reliable","reduces confidence in other routes"),
  AE_LINK("one-stop-diagnostics","ae-most-reliable","makes A&E comparatively convenient"),
  AE_LINK("opening-convenience","ae-most-reliable","makes A&E the feasible option"),
  AE_LINK("living-alone-carers","social-support-insufficient","reduces practical support"),
  AE_LINK("care-home-support","social-support-insufficient","can reduce avoidable escalation","negative"),
  AE_LINK("housing-safety","social-support-insufficient","makes home management difficult"),
  AE_LINK("transport-digital-barriers","social-support-insufficient","blocks usable alternatives"),
  AE_LINK("unresolved-after-ae","repeat-unresolved","creates recurring need"),
  AE_LINK("post-ae-followup","repeat-unresolved","can reduce reattendance","negative"),
  AE_LINK("frequent-attender-segmentation","repeat-unresolved","can enable targeted response","negative"),
  AE_LINK("care-plan-not-usable","repeat-unresolved","leaves crisis response unchanged"),
  AE_LINK("population-growth","population-recording-change","raises counts or expected demand","uncertain","official",["S11"]),
  AE_LINK("service-reconfiguration","population-recording-change","moves activity between settings","uncertain","official",["S9"]),
  AE_LINK("coding-data-quality","population-recording-change","changes recorded activity","uncertain","official",["S9"]),
  AE_LINK("case-mix-change","population-recording-change","changes interpretation of volume","uncertain","official",["S9","S10"]),
  AE_LINK("multimorbidity-frailty","poor-condition-control","increases treatment complexity"),
  AE_LINK("weak-continuity","poor-confidence-alternatives","can reduce trust in other routes"),
  AE_LINK("support-at-home-gap","repeat-unresolved","leaves recurring social need"),
  AE_LINK("shared-information-gap","weak-continuity","fragments the pathway"),
  AE_LINK("ae-attendance","unresolved-after-ae","may treat the immediate problem only","uncertain"),
  AE_LINK("repeat-unresolved","poor-confidence-alternatives","can reinforce reliance on A&E"),
  AE_LINK("transport-digital-barriers","alternatives-unavailable","makes alternatives unusable"),
  AE_LINK("population-ageing","multimorbidity-frailty","increases prevalence of complexity")
];

// ============================================================
// 12. FEEDBACK LOOPS
// ============================================================
const AE_MAP_LOOPS = [
  { id:"unresolved-need",type:"R",title:"Unresolved need and reattendance",nodes:["weak-continuity","poor-condition-control","preventable-deterioration","ae-attendance","unresolved-after-ae","repeat-unresolved"],explanation:"Fragmented earlier care can contribute to deterioration. A&E may resolve the immediate problem without resolving the cause, creating further deterioration and reattendance." },
  { id:"reliance-on-ae",type:"R",title:"Reliance on the most dependable route",nodes:["alternatives-unavailable","poor-confidence-alternatives","ae-most-reliable","ae-attendance","repeat-unresolved"],explanation:"When alternatives are unavailable or unreliable, A&E becomes the familiar dependable route. Repeated use can reinforce that expectation unless the underlying access problem changes." },
  { id:"complexity-crisis",type:"R",title:"Multimorbidity and crisis",nodes:["population-ageing","multimorbidity-frailty","poor-condition-control","preventable-deterioration","ae-attendance","unresolved-after-ae"],explanation:"Ageing and multimorbidity increase treatment complexity and crisis risk. Repeated urgent episodes can add disability and further complexity if the combined need remains unresolved." }
];
