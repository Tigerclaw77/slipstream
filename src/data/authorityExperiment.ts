import type {
  AuthorityExperimentAnalytics,
  AuthorityExperimentDashboardMetrics,
  AuthorityExperimentPage,
  AuthorityExperimentPageMetrics,
  AuthorityExperimentPair,
  AuthorityExperimentStatus,
  AuthorityExperimentVariant,
  KnowledgeCitationPlaceholder,
} from "../types";

export const authorityExperimentId = "se20-authority-quality-v1";
const createdAt = "2026-06-23";

const citationPlaceholders: KnowledgeCitationPlaceholder[] = [
  {
    status: "placeholder",
    note: "Citation placeholder for OD review, clinical source validation, or insurer documentation.",
  },
];

type ExperimentAnswerDraft = {
  shortAnswer: string;
  longAnswer: string;
};

type ExperimentQuestionDraft = {
  questionId: string;
  slug: string;
  question: string;
  intent: string;
  topic: string;
  topicSlug: string;
  category: string;
  categorySlug: string;
  relatedQuestions: string[];
  tags: string[];
  status: AuthorityExperimentStatus;
  analyticsA: AuthorityExperimentAnalytics;
  analyticsB: AuthorityExperimentAnalytics;
  variantA: ExperimentAnswerDraft;
  variantB: ExperimentAnswerDraft;
};

const zeroAnalytics: AuthorityExperimentAnalytics = {
  indexedPages: 0,
  impressions: 0,
  clicks: 0,
  averagePosition: null,
};

const experimentQuestionDrafts: ExperimentQuestionDraft[] = [
  {
    questionId: "exp-q-001",
    slug: "can-i-sleep-in-daily-contact-lenses",
    question: "Can I sleep in daily contact lenses?",
    intent: "Safety guidance for daily disposable contact lens wear",
    topic: "Contact Lenses",
    topicSlug: "contact-lenses",
    category: "Daily Contacts",
    categorySlug: "daily-contacts",
    relatedQuestions: [
      "are-daily-contacts-safer-than-monthly-contacts",
      "how-often-should-adults-get-eye-exams",
      "what-happens-during-an-adult-eye-exam",
    ],
    tags: ["daily contacts", "sleeping in contacts", "contact lens safety"],
    status: "Receiving Clicks",
    analyticsA: { indexedPages: 1, impressions: 122, clicks: 3, averagePosition: 18.4 },
    analyticsB: { indexedPages: 1, impressions: 147, clicks: 6, averagePosition: 14.8 },
    variantA: {
      shortAnswer:
        "No. Daily contact lenses are intended for awake wear and should be discarded after removal. Sleeping in them can reduce oxygen to the cornea, trap debris, increase dryness, and raise infection risk. If you accidentally sleep in them, do not pull them off a dry eye. Use lubricating drops if needed, remove them carefully, discard them, and stay out of lenses if redness, pain, light sensitivity, or blur develops.",
      longAnswer:
        "Daily contact lenses are designed around a simple replacement schedule: open a fresh lens, wear it during waking hours, and throw it away after removal. They are not meant to be cleaned, stored, or slept in. When the eyelids are closed during sleep, oxygen flow to the cornea naturally drops. A contact lens adds another layer over the eye, which can make the surface drier and more vulnerable to irritation.\n\nSleeping in a daily lens also keeps deposits, oils, tears, and environmental debris against the eye longer than intended. That does not mean every accidental nap becomes an emergency, but it does raise the risk compared with taking lenses out before rest.\n\nIf you fall asleep in daily contacts, wait until the lenses move normally before removal. Blink, use contact-lens-safe lubricating drops if available, and remove the lenses gently. Discard them rather than trying to reuse them. If your eye feels normal after a break, your doctor may allow you to resume lens wear. If the eye is red, painful, light sensitive, watery, or blurry, stop wearing contacts and get eye care advice promptly.",
    },
    variantB: {
      shortAnswer:
        "No. From a practical safety standpoint, daily contacts should come out before sleep, including naps. Closed-eye wear increases corneal stress and can make a small irritation become a bigger problem. If it happens once, remove the lenses only after they loosen, use preservative-free lubricating drops if available, and watch closely for pain, redness, light sensitivity, discharge, or blurry vision.",
      longAnswer:
        "For most patients, the rule is simple: daily disposable contacts are for waking hours only. The reason is not that the lens expires at midnight. It is that the eye behaves differently when it is closed. Oxygen availability drops, tear exchange changes, and the lens can feel tighter on the cornea. That combination makes the eye less tolerant of deposits, dryness, and bacteria.\n\nAn OD-reviewed answer should separate a common accident from a safe habit. Accidentally dozing off once is not the same as routinely sleeping in contacts, but neither should be brushed off. If the lens feels stuck after sleep, do not scrape it off. Add contact-lens-safe rewetting drops or sterile artificial tears, blink until the lens moves freely, then remove and discard it. Give the eye time out of lenses.\n\nThe decision point is symptoms. Mild dryness that clears quickly is different from increasing redness, pain, light sensitivity, discharge, a white spot on the cornea, or vision that stays blurry. Those symptoms should be checked urgently, especially for contact lens wearers. If your schedule makes naps likely, build a removal habit before lying down or ask your eye doctor whether contacts are the right full-day option for you.",
    },
  },
  {
    questionId: "exp-q-002",
    slug: "are-daily-contacts-safer-than-monthly-contacts",
    question: "Are daily contacts safer than monthly contacts?",
    intent: "Compare safety tradeoffs between daily and reusable contacts",
    topic: "Contact Lenses",
    topicSlug: "contact-lenses",
    category: "Daily Contacts",
    categorySlug: "daily-contacts",
    relatedQuestions: [
      "can-i-sleep-in-daily-contact-lenses",
      "how-often-should-adults-get-eye-exams",
      "does-vsp-cover-contact-lenses",
    ],
    tags: ["daily contacts", "monthly contacts", "contact lens hygiene"],
    status: "Receiving Impressions",
    analyticsA: { indexedPages: 1, impressions: 88, clicks: 0, averagePosition: 24.7 },
    analyticsB: { indexedPages: 1, impressions: 93, clicks: 1, averagePosition: 21.2 },
    variantA: {
      shortAnswer:
        "Daily contacts can be safer for many wearers because each day starts with a fresh lens and avoids cleaning solution, storage cases, and deposit buildup over weeks. Monthly contacts can also be safe when cleaned and replaced correctly. The safer choice depends on hygiene, wearing schedule, prescription, eye health, cost, and whether the patient follows no-sleep and no-water rules.",
      longAnswer:
        "Daily contacts reduce several common risk points in contact lens wear. The wearer does not need to clean lenses, store them overnight, replace a case, or remember solution steps. A fresh lens each day can be especially helpful for people with allergies, deposits, occasional wear schedules, or busy routines.\n\nMonthly contacts are not automatically unsafe. Many people wear them successfully for years. The key is consistent cleaning, rubbing and rinsing when instructed, using fresh solution, replacing the case, following the monthly schedule, and avoiding water exposure. Problems usually come from shortcuts: topping off old solution, stretching lenses beyond their replacement period, sleeping in lenses, or using tap water.\n\nThe safety comparison should also include fit and prescription. Some patients have better vision or comfort in a monthly lens because of material, prescription range, astigmatism correction, or multifocal needs. A daily lens that fits poorly is not safer than a properly fit reusable lens. For many patients, daily lenses offer a simpler safety routine, while monthly lenses can be appropriate for reliable wearers who handle care correctly.",
    },
    variantB: {
      shortAnswer:
        "Often, yes, daily lenses are the lower-maintenance safety choice because they remove case and cleaning errors. But they are not risk-free, and monthly lenses are not unsafe when cared for properly. The practical OD judgment is to match the lens to the patient's real habits: sleeping, swimming, cleaning reliability, allergies, dry eye, prescription complexity, and budget.",
      longAnswer:
        "Daily disposables have a safety advantage because they eliminate several steps where real-world patients commonly slip. There is no case biofilm to manage, no old solution to top off, no two-week-old lens pretending to be one month fresh, and less time for deposits to build. For children, teens, occasional wearers, allergy sufferers, and people who travel often, that simplicity can matter.\n\nHowever, the word safer can be misleading if it sounds automatic. Daily contacts still require clean hands, correct insertion and removal, no sleeping, no showering or swimming, and replacement after each wear. A patient who sleeps in daily lenses is not using the safety advantage. A patient who handles monthly lenses carefully, replaces the case, and follows instructions may do very well.\n\nClinically, the better question is which lens reduces risk for this person. If someone admits they cut corners with cleaning, daily lenses are usually worth discussing strongly. If the prescription is complex or cost makes daily wear unrealistic, a monthly lens with clear hygiene coaching may be the more sustainable plan. Safety comes from lens design, fit, eye health, and behavior working together.",
    },
  },
  {
    questionId: "exp-q-003",
    slug: "does-vsp-cover-contact-lenses",
    question: "Does VSP cover contact lenses?",
    intent: "Understand contact lens benefits under VSP",
    topic: "Vision Insurance",
    topicSlug: "insurance",
    category: "VSP",
    categorySlug: "vsp",
    relatedQuestions: [
      "how-often-can-i-use-vsp-benefits",
      "are-daily-contacts-safer-than-monthly-contacts",
      "can-i-sleep-in-daily-contact-lenses",
    ],
    tags: ["vsp", "contact lens allowance", "vision insurance"],
    status: "Indexed",
    analyticsA: { indexedPages: 1, impressions: 0, clicks: 0, averagePosition: null },
    analyticsB: { indexedPages: 1, impressions: 0, clicks: 0, averagePosition: null },
    variantA: {
      shortAnswer:
        "Many VSP plans include a contact lens benefit, usually as an allowance rather than unlimited coverage. The allowance may apply to contact lens materials and sometimes part of the fitting or evaluation. Patients should check whether using contacts replaces the glasses materials benefit for that benefit period and whether specialty or medically necessary contacts are handled differently.",
      longAnswer:
        "VSP commonly helps pay for contact lenses, but the details depend on the plan. Many plans use a contact lens allowance, which means the plan contributes up to a set amount toward lens materials. If the selected lenses cost more than the allowance, the patient pays the remaining balance. Daily disposable lenses, toric lenses, multifocal lenses, and annual supplies can produce very different costs.\n\nContact lens fitting fees are separate from lens boxes. Because contacts sit on the eye, the doctor checks fit, movement, comfort, vision, and eye health. Some plans include part of this service, while others leave more of it to the patient.\n\nPatients should also ask whether the contact lens benefit replaces the glasses materials benefit. Many plans allow one main materials benefit per period, so choosing contacts may reduce what is available for frames and lenses until benefits renew. Before ordering, request a clear estimate that separates exam copay, fitting fees, lens allowance, rebates, and final patient cost.",
    },
    variantB: {
      shortAnswer:
        "Usually, VSP can help with contacts, but the benefit is often an allowance, not a promise that a full year supply is covered. The important questions are whether the allowance applies to materials only, whether the contact lens evaluation has a separate fee, and whether choosing contacts uses up the glasses benefit for the year.",
      longAnswer:
        "A patient-friendly answer is that VSP often contributes toward contact lenses, but the real value depends on the exact plan and lens type. A basic spherical monthly lens may fit within an allowance more easily than daily toric or multifocal lenses. A patient who wants a full annual supply of premium dailies may still have a meaningful out-of-pocket cost.\n\nThe clinical part of the visit matters too. Contact lenses require a contact lens evaluation or fitting because the prescription is not only power. The doctor evaluates lens movement, comfort, corneal response, vision stability, and wearing schedule. Patients sometimes think the routine eye exam automatically includes this, but contact lens services are commonly billed separately.\n\nBefore deciding, ask the office to price two scenarios: using VSP for contacts and using VSP for glasses. Contact lens wearers still need usable backup glasses for illness, irritation, lost lenses, or emergencies. The best use of VSP is not always the lowest checkout total that day; it is the plan that covers the patient's real visual needs for the year.",
    },
  },
  {
    questionId: "exp-q-004",
    slug: "how-often-can-i-use-vsp-benefits",
    question: "How often can I use VSP benefits?",
    intent: "Clarify benefit renewal timing and usage limits",
    topic: "Vision Insurance",
    topicSlug: "insurance",
    category: "VSP",
    categorySlug: "vsp",
    relatedQuestions: [
      "does-vsp-cover-contact-lenses",
      "does-vsp-cover-progressive-lenses",
      "how-often-should-adults-get-eye-exams",
    ],
    tags: ["vsp eligibility", "benefit renewal", "vision benefits"],
    status: "Not Indexed",
    analyticsA: zeroAnalytics,
    analyticsB: zeroAnalytics,
    variantA: {
      shortAnswer:
        "VSP benefit frequency depends on the plan. Exams, lenses, frames, and contact lenses may renew on different schedules, such as every 12 months, every calendar year, or every 24 months for frames. Patients should verify eligibility before scheduling or ordering because using contacts, glasses, or frame benefits can affect what remains available.",
      longAnswer:
        "VSP plans do not all renew the same way. One plan may provide an eye exam every 12 months, lenses every 12 months, and frames every 24 months. Another may reset by calendar year or employer plan year. Dependents can also have separate benefit timelines.\n\nThis matters because patients often use benefits in pieces. You might be eligible for an exam but not a new frame allowance. You might have already used contacts and have limited glasses coverage remaining. Some plans treat contacts as an alternative to glasses materials during the same benefit period.\n\nThe practical step is to verify eligibility before the visit and before ordering eyewear. Ask for the next eligible dates for the exam, lenses, frames, and contacts. If benefits reset soon, timing an eyewear order may change out-of-pocket cost. If you have symptoms or a medical eye concern, do not delay care just to wait for routine benefits; medical insurance may be more appropriate for that visit.",
    },
    variantB: {
      shortAnswer:
        "There is no single VSP renewal schedule. The exam, lens, frame, and contact lens benefits can each have different timing. An OD office usually verifies this before the visit because the answer changes the recommendation: use benefits now, wait until renewal, use contacts instead of glasses, or bill a medical concern another way.",
      longAnswer:
        "The most common mistake is treating VSP as one bucket that refills all at once. Many plans have separate benefit clocks. A patient may be exam eligible today, lens eligible today, and frame eligible six months from now. Another patient may be eligible for contacts but would give up the main glasses materials benefit by choosing them.\n\nFrom a clinical and practical standpoint, benefit timing should support care rather than drive it blindly. If the visit is routine and the patient mainly wants new glasses, it can be reasonable to check whether waiting a few weeks changes the frame allowance. If the patient has flashes, pain, infection symptoms, diabetic changes, or sudden blur, benefit timing should not delay evaluation.\n\nA good verification asks four things: when the exam benefit is available, when lens benefits are available, when the frame allowance renews, and whether contacts are separate or an alternative to glasses. That gives the patient a realistic plan instead of a surprise bill at checkout.",
    },
  },
  {
    questionId: "exp-q-005",
    slug: "how-often-should-adults-get-eye-exams",
    question: "How often should adults get eye exams?",
    intent: "Routine adult eye exam frequency guidance",
    topic: "Eye Exams",
    topicSlug: "eye-exams",
    category: "Adult Exams",
    categorySlug: "adult-exams",
    relatedQuestions: [
      "what-happens-during-an-adult-eye-exam",
      "how-often-can-i-use-vsp-benefits",
      "when-is-an-ophthalmologist-required",
    ],
    tags: ["adult eye exam", "exam frequency", "preventive eye care"],
    status: "Receiving Clicks",
    analyticsA: { indexedPages: 1, impressions: 156, clicks: 4, averagePosition: 16.9 },
    analyticsB: { indexedPages: 1, impressions: 181, clicks: 8, averagePosition: 12.6 },
    variantA: {
      shortAnswer:
        "Many adults should get a comprehensive eye exam every one to two years, but the right schedule depends on age, prescription, contact lens use, symptoms, diabetes, high blood pressure, family history, and eye disease risk. Adults with contacts, medical conditions, or new symptoms may need exams more often than low-risk adults with stable vision.",
      longAnswer:
        "Adult eye exam frequency is not one-size-fits-all. A healthy adult with stable vision and no risk factors may be advised to schedule a comprehensive exam every one to two years. People who wear contact lenses, have changing prescriptions, use medications that affect the eyes, or have medical conditions may need annual or more frequent visits.\n\nAge matters because the risk of eye disease increases over time. Adults over 40 may notice near vision changes and should be monitored for conditions that can develop gradually. Diabetes, high blood pressure, glaucoma family history, previous eye surgery, high prescriptions, or symptoms such as flashes, floaters, pain, redness, or sudden blur can change the schedule.\n\nA routine exam is not only a glasses prescription. It can include vision testing, eye pressure, eye alignment, front-of-eye evaluation, retinal assessment, and discussion of symptoms. The best schedule is based on the patient, not just the calendar. If vision changes or symptoms appear between routine visits, schedule sooner.",
    },
    variantB: {
      shortAnswer:
        "For many healthy adults, every one to two years is reasonable, but annual exams are common for contact lens wearers, adults over 40, people with diabetes, strong prescriptions, glaucoma risk, or changing symptoms. The safest answer is risk-based: stable low-risk eyes can usually wait longer than eyes with disease risk or active complaints.",
      longAnswer:
        "An OD-reviewed recommendation starts with risk. A 26-year-old who does not wear contacts, has stable vision, and has no symptoms is different from a 52-year-old with diabetes, a high prescription, and a family history of glaucoma. Both are adults, but their exam schedules should not be identical.\n\nFor low-risk adults, a comprehensive eye exam every one to two years is a common planning range. Annual exams are often appropriate for contact lens wearers because the doctor needs to check corneal health, lens fit, wearing habits, and prescription stability. Annual or more frequent care may also be needed for diabetes, hypertension, high myopia, previous eye surgery, glaucoma suspicion, dry eye treatment, or medication monitoring.\n\nSymptoms override routine timing. New flashes, floaters, eye pain, light sensitivity, double vision, sudden blur, or a red eye in a contact lens wearer should not wait for the next scheduled exam. The useful message for patients is this: routine exams protect long-term vision, but new symptoms deserve timely care.",
    },
  },
  {
    questionId: "exp-q-006",
    slug: "what-happens-during-an-adult-eye-exam",
    question: "What happens during an adult eye exam?",
    intent: "Explain routine adult eye exam steps",
    topic: "Eye Exams",
    topicSlug: "eye-exams",
    category: "Adult Exams",
    categorySlug: "adult-exams",
    relatedQuestions: [
      "how-often-should-adults-get-eye-exams",
      "what-is-the-difference-between-an-optometrist-and-an-ophthalmologist",
      "when-is-an-ophthalmologist-required",
    ],
    tags: ["comprehensive eye exam", "adult exam", "vision testing"],
    status: "Receiving Impressions",
    analyticsA: { indexedPages: 1, impressions: 67, clicks: 0, averagePosition: 28.1 },
    analyticsB: { indexedPages: 1, impressions: 79, clicks: 1, averagePosition: 23.9 },
    variantA: {
      shortAnswer:
        "An adult eye exam usually includes health history, vision testing, prescription measurement, eye pressure, focusing and eye movement checks, front-of-eye evaluation, and retinal assessment. Dilation or retinal imaging may be recommended depending on symptoms and risk factors. The exam can update glasses or contacts and screen for eye health issues.",
      longAnswer:
        "A comprehensive adult eye exam starts with the reason for the visit and health history. The office may ask about vision changes, headaches, screen use, medications, diabetes, blood pressure, previous eye problems, family history, and contact lens wear. This context helps the doctor decide what testing matters most.\n\nVision testing often includes reading an eye chart and measuring the prescription with refraction. The doctor may also check eye alignment, focusing, pupil responses, and eye pressure. A slit lamp exam evaluates the eyelids, tear film, cornea, conjunctiva, iris, and lens.\n\nThe back of the eye is assessed through retinal evaluation, which may involve dilation, retinal imaging, or both. Dilation gives a wider view of the retina and optic nerve, while imaging can document findings for comparison over time. The exam ends with recommendations: prescription changes, glasses or contact lens options, dry eye care, follow-up timing, referral if needed, or monitoring for risk factors.",
    },
    variantB: {
      shortAnswer:
        "A good adult eye exam checks both vision and eye health. Expect questions about symptoms and medical history, prescription testing, eye pressure, eye muscle and focusing checks when needed, microscope evaluation of the front of the eye, and a retinal health assessment. Dilation is not automatic for every patient, but it is important when risk or symptoms call for it.",
      longAnswer:
        "Patients often think an eye exam is mainly, which is better, one or two. Refraction is important, but it is only one part of a comprehensive visit. The doctor first needs context: Are you having blur, headaches, dryness, floaters, diabetes, medication changes, computer strain, or trouble driving at night? Those answers shape the exam.\n\nThe vision portion measures how each eye sees and whether lenses can improve clarity or comfort. The health portion looks at the eye as tissue. The doctor may check eye pressure, pupils, eye movements, eyelids, tear film, cornea, lens clarity, optic nerve, macula, and peripheral retina. Contact lens wearers need additional attention to corneal response and lens fit.\n\nDilation or retinal imaging is recommended based on risk, symptoms, and the view inside the eye. For example, diabetes, high prescriptions, flashes, floaters, suspicious optic nerves, or poor retinal views may make dilation more important. A strong exam should end with a plan, not just a prescription: what changed, what is healthy, what needs monitoring, and when to return.",
    },
  },
  {
    questionId: "exp-q-007",
    slug: "are-premium-progressive-lenses-worth-it",
    question: "Are premium progressive lenses worth it?",
    intent: "Evaluate value of premium progressive lenses",
    topic: "Glasses & Lenses",
    topicSlug: "glasses",
    category: "Progressive Lenses",
    categorySlug: "progressive-lenses",
    relatedQuestions: [
      "how-long-does-it-take-to-adjust-to-progressive-lenses",
      "does-vsp-cover-progressive-lenses",
      "what-happens-during-an-adult-eye-exam",
    ],
    tags: ["premium progressives", "progressive lenses", "lens value"],
    status: "Receiving Clicks",
    analyticsA: { indexedPages: 1, impressions: 134, clicks: 2, averagePosition: 19.7 },
    analyticsB: { indexedPages: 1, impressions: 142, clicks: 5, averagePosition: 15.1 },
    variantA: {
      shortAnswer:
        "Premium progressive lenses can be worth it for people who wear glasses all day, use computers often, have stronger prescriptions, want wider viewing zones, or struggled with basic progressives. They are not automatically necessary for everyone. The value depends on visual demands, prescription complexity, frame choice, budget, and comfort expectations.",
      longAnswer:
        "Premium progressive lenses usually offer more customized optics than basic designs. They may provide wider usable zones, smoother transitions, better intermediate vision, and less peripheral distortion. For someone who wears glasses from morning to night, works on screens, drives often, or has a complex prescription, those improvements can be meaningful.\n\nThe value is not only about sharpness on an eye chart. It is about how naturally the glasses work during a real day: walking, reading, checking a phone, using a laptop, cooking, shopping, and driving. A premium design may reduce the amount of head movement needed and make adaptation easier.\n\nPremium does not mean perfect, and it is not mandatory for every patient. Someone with a mild prescription, limited near demands, or a tight budget may do well with a standard design. Measurements and frame fit still matter. The best decision is to match lens level to lifestyle and ask what problem the premium design is solving.",
    },
    variantB: {
      shortAnswer:
        "They can be worth it, especially for all-day wear, stronger prescriptions, heavy computer use, previous trouble with progressives, or a need for wider usable zones. But premium is not a clinical requirement for every patient. The OD-reviewed question is whether the upgrade solves a specific visual problem enough to justify the cost.",
      longAnswer:
        "Premium progressives are best understood as a design upgrade, not a guarantee of perfect vision. They can use more individualized measurements and refined optics to widen useful zones, smooth transitions, and reduce some peripheral distortion. For patients who live in their glasses all day, small improvements can feel significant.\n\nThe strongest candidates are people with visually demanding days: computer work, frequent driving, reading, cooking, shopping, multitasking, stronger prescriptions, higher reading adds, or poor adaptation to basic progressives. Premium designs may also help when frame position and measurements are carefully taken. The lens and the fitting process work together.\n\nAn OD-reviewed recommendation should also protect patients from overbuying. If someone only wears progressives occasionally, has a mild prescription, or mainly needs a dedicated computer pair, premium everyday progressives may not be the best use of money. Ask the optical team to explain the expected benefit in plain terms: wider reading, better intermediate, easier adaptation, or better support for the prescription. If nobody can name the benefit, the upgrade is harder to justify.",
    },
  },
  {
    questionId: "exp-q-008",
    slug: "how-long-does-it-take-to-adjust-to-progressive-lenses",
    question: "How long does it take to adjust to progressive lenses?",
    intent: "Set expectations for progressive lens adaptation",
    topic: "Glasses & Lenses",
    topicSlug: "glasses",
    category: "Progressive Lenses",
    categorySlug: "progressive-lenses",
    relatedQuestions: [
      "are-premium-progressive-lenses-worth-it",
      "what-happens-during-an-adult-eye-exam",
      "does-vsp-cover-progressive-lenses",
    ],
    tags: ["progressive adaptation", "new glasses", "lens fitting"],
    status: "Indexed",
    analyticsA: { indexedPages: 1, impressions: 0, clicks: 0, averagePosition: null },
    analyticsB: { indexedPages: 1, impressions: 0, clicks: 0, averagePosition: null },
    variantA: {
      shortAnswer:
        "Many people adjust to progressive lenses within a few days to two weeks, but adaptation varies. Wearing the glasses consistently, pointing the nose toward what you want to see, and avoiding constant switching can help. If blur, dizziness, or distortion remains significant, the prescription, measurements, frame fit, or lens design should be checked.",
      longAnswer:
        "Progressive adaptation is partly visual and partly habit. The lenses contain distance, intermediate, and reading zones, so the wearer learns where to look for each task. The brain also learns how the side distortion feels during walking, stairs, and quick glances.\n\nMany patients feel functional within a few days, while first-time wearers, stronger prescriptions, higher reading powers, and big design changes can take longer. Consistent wear helps because switching back and forth between old glasses and new progressives slows learning.\n\nStill, adaptation should improve. If the glasses cause persistent dizziness, blurry distance, poor reading, neck strain, or trouble finding the computer zone, the eyewear should be rechecked. Problems can come from frame fit, pupil measurements, lens height, prescription, or lens design. A remake is not always the first step; sometimes adjustment or measurement correction solves the issue.",
    },
    variantB: {
      shortAnswer:
        "A few days to two weeks is common, but the important point is steady improvement. Early swim, side blur, or stair awareness can be normal. Persistent nausea, unsafe walking, blurry distance, or inability to find reading after consistent wear should trigger a fit, measurement, prescription, or design check rather than being dismissed as adaptation.",
      longAnswer:
        "Progressives ask the visual system to learn a new map. Distance is usually higher in the lens, near vision is lower, and intermediate vision sits between them. The sides are not meant to be equally clear. Patients adapt by turning their head more deliberately and using the central viewing zones.\n\nFor many people, the first week is the adjustment period. Mild side awareness, a floating sensation, or awkward stairs can improve with consistent wear. Stronger prescriptions, first-time progressives, large prescription changes, small frames, or high reading adds can make adaptation slower.\n\nThe OD-reviewed nuance is that not every complaint should be waved away. If the frame slides, sits crooked, or was measured at the wrong height, no amount of willpower fixes the optics. If the patient works all day on multiple monitors, a general progressive may never feel ideal at the desk. A good office asks what task fails: driving, reading, stairs, computer, or all distances. That detail points to adjustment, remake, different design, or task-specific glasses.",
    },
  },
  {
    questionId: "exp-q-009",
    slug: "what-is-the-difference-between-an-optometrist-and-an-ophthalmologist",
    question: "What is the difference between an optometrist and an ophthalmologist?",
    intent: "Clarify OD and OMD roles for patient provider choice",
    topic: "OD vs OMD",
    topicSlug: "od-vs-omd",
    category: "Scope Of Practice",
    categorySlug: "scope-of-practice",
    relatedQuestions: [
      "when-is-an-ophthalmologist-required",
      "how-often-should-adults-get-eye-exams",
      "what-happens-during-an-adult-eye-exam",
    ],
    tags: ["optometrist", "ophthalmologist", "eye doctor roles"],
    status: "Receiving Impressions",
    analyticsA: { indexedPages: 1, impressions: 101, clicks: 0, averagePosition: 22.6 },
    analyticsB: { indexedPages: 1, impressions: 119, clicks: 2, averagePosition: 18.9 },
    variantA: {
      shortAnswer:
        "An optometrist is an eye doctor who commonly provides routine eye exams, glasses and contact lens prescriptions, primary eye care, and management of many common eye conditions. An ophthalmologist is a medical doctor who diagnoses and treats eye diseases and performs eye surgery. The right choice depends on symptoms, condition complexity, and whether surgery or specialty care is needed.",
      longAnswer:
        "Optometrists and ophthalmologists both care for eyes, but their training and typical roles differ. Optometrists often serve as primary eye care providers. They perform comprehensive eye exams, prescribe glasses and contact lenses, treat many common eye problems, manage dry eye, evaluate urgent symptoms, monitor disease risk, and refer when specialty or surgical care is needed.\n\nOphthalmologists are medical doctors or osteopathic physicians who specialize in eye disease and surgery. They may manage cataracts, glaucoma, retina disease, corneal disease, inflammatory conditions, trauma, and surgical procedures. Many ophthalmologists focus on referred medical or surgical cases, although some also provide routine care.\n\nPatients do not need to choose based on title alone. A routine exam, new glasses, contacts, mild dry eye, or first evaluation of many symptoms often starts with an optometrist. Known surgical needs, retina injections, severe trauma, complex disease, or urgent specialty problems may require ophthalmology. Many patients receive the best care when both providers coordinate.",
    },
    variantB: {
      shortAnswer:
        "An optometrist is usually the primary eye care doctor for exams, glasses, contacts, many red eyes, dry eye, monitoring, and referral decisions. An ophthalmologist is a physician and surgeon for advanced medical and surgical eye care. The distinction is not better versus worse; it is matching the provider to the problem and escalating when needed.",
      longAnswer:
        "Patients often ask this when they are really asking, who should I see first? In many situations, an optometrist is the right starting point: routine vision care, glasses, contacts, dry eye, mild infections, eye strain, and monitoring for common conditions. Optometrists are trained to examine the eye, prescribe lenses, diagnose many eye diseases, treat within their scope, and recognize when referral is appropriate.\n\nAn ophthalmologist is a medical doctor or DO with surgical training in eye disease. Ophthalmology is needed for many procedures and advanced treatments, such as cataract surgery, retina injections, glaucoma surgery, corneal surgery, complex trauma, and specialty disease management.\n\nThe OD-reviewed nuance is that roles overlap and local scope varies. Some optometrists provide extensive medical eye care; some ophthalmologists also do routine exams. The safest patient guidance is symptom-based. If you need routine care or are unsure, an optometrist can often triage. If you have sudden vision loss, severe injury, known surgical disease, or a specialist referral, ophthalmology may be required. Good care is a pathway, not a turf contest.",
    },
  },
  {
    questionId: "exp-q-010",
    slug: "when-is-an-ophthalmologist-required",
    question: "When is an ophthalmologist required?",
    intent: "Identify situations requiring ophthalmology referral or specialty care",
    topic: "OD vs OMD",
    topicSlug: "od-vs-omd",
    category: "Scope Of Practice",
    categorySlug: "scope-of-practice",
    relatedQuestions: [
      "what-is-the-difference-between-an-optometrist-and-an-ophthalmologist",
      "what-happens-during-an-adult-eye-exam",
      "how-often-should-adults-get-eye-exams",
    ],
    tags: ["ophthalmology referral", "eye surgery", "urgent eye care"],
    status: "Not Indexed",
    analyticsA: zeroAnalytics,
    analyticsB: zeroAnalytics,
    variantA: {
      shortAnswer:
        "An ophthalmologist is required or strongly preferred when a condition needs surgery, injections, advanced specialty care, hospital-level emergency care, or management beyond the current provider's scope. Examples include cataract surgery, retinal treatment, severe trauma, advanced glaucoma, complex corneal disease, and certain sudden vision loss symptoms.",
      longAnswer:
        "Ophthalmology is needed when the condition requires medical or surgical care beyond what the current eye care provider can safely manage. Surgery is the clearest example. Cataract surgery, retinal surgery, glaucoma procedures, corneal transplants, and many eyelid surgeries are performed by ophthalmologists.\n\nUrgent symptoms can also require ophthalmology or emergency care. Sudden vision loss, a curtain or shadow in vision, severe trauma, chemical exposure, penetrating injury, severe eye pain with nausea, or suspected retinal detachment should be escalated quickly. Sometimes the first call is to an optometrist, who then arranges urgent referral.\n\nChronic diseases may move between providers depending on severity. Mild glaucoma risk may be monitored by an optometrist, while advanced or progressing glaucoma may need a specialist. Cataracts may be watched until surgery is appropriate. The goal is the right level of care at the right time, with communication between providers.",
    },
    variantB: {
      shortAnswer:
        "Ophthalmology is required when the problem needs surgery, injections, subspecialty treatment, emergency hospital care, or care outside the optometrist's scope. Red flags include sudden vision loss, curtain-like vision changes, severe trauma, chemical burns, suspected retinal detachment, advanced glaucoma, complex corneal disease, or cataracts ready for surgery.",
      longAnswer:
        "The cleanest line is treatment capability. If the next step may be surgery, intraocular injection, laser or specialty procedure, complex disease management, or emergency trauma care, an ophthalmologist is usually needed. Cataract surgery, retina treatment, glaucoma procedures, corneal surgery, and many eyelid procedures fall into that category.\n\nUrgency matters. A routine cataract referral is different from sudden vision loss or a curtain in the vision. Severe eye pain, chemical exposure, penetrating injury, new flashes and floaters with vision changes, or trauma should be escalated quickly. Depending on access and symptoms, that may mean ophthalmology, an emergency department, or an optometrist who can triage and arrange same-day referral.\n\nAn OD-reviewed answer should reassure patients that referral is part of good care. Optometrists often detect the issue, document findings, explain why escalation is needed, and coordinate with the specialist. After treatment, care may return to the optometrist for glasses, dry eye care, monitoring, or post-operative co-management. The aim is not to pick one doctor forever; it is to use the right expertise at the right moment.",
    },
  },
];

function buildExperimentPage(
  draft: ExperimentQuestionDraft,
  variant: AuthorityExperimentVariant,
): AuthorityExperimentPage {
  const answer = variant === "A" ? draft.variantA : draft.variantB;

  return {
    experimentId: authorityExperimentId,
    questionId: draft.questionId,
    variant,
    variantLabel: variant === "A" ? "Machine-Generated" : "OD-Reviewed",
    route: `/lab/${variant.toLowerCase()}/${draft.slug}`,
    createdAt,
    question: draft.question,
    slug: draft.slug,
    topic: draft.topic,
    topicSlug: draft.topicSlug,
    category: draft.category,
    categorySlug: draft.categorySlug,
    shortAnswer: answer.shortAnswer,
    longAnswer: answer.longAnswer,
    relatedQuestions: draft.relatedQuestions,
    tags: draft.tags,
    citations: citationPlaceholders,
    analytics: variant === "A" ? draft.analyticsA : draft.analyticsB,
  };
}

export const authorityExperimentPairs: AuthorityExperimentPair[] = experimentQuestionDrafts.map((draft) => ({
  experimentId: authorityExperimentId,
  questionId: draft.questionId,
  slug: draft.slug,
  question: draft.question,
  intent: draft.intent,
  status: draft.status,
  variantA: buildExperimentPage(draft, "A"),
  variantB: buildExperimentPage(draft, "B"),
}));

export const authorityExperimentPages = authorityExperimentPairs.flatMap((pair) => [
  pair.variantA,
  pair.variantB,
]);

export function getAuthorityExperimentPageByRoute(
  route: string,
): AuthorityExperimentPage | undefined {
  const normalized = route.startsWith("/") ? route : `/${route}`;
  return authorityExperimentPages.find((page) => page.route === normalized);
}

export function getAuthorityExperimentPairBySlug(
  slug: string,
): AuthorityExperimentPair | undefined {
  return authorityExperimentPairs.find((pair) => pair.slug === slug);
}

export function getAuthorityExperimentPageWordCount(page: AuthorityExperimentPage): number {
  return [page.question, page.shortAnswer, page.longAnswer]
    .join(" ")
    .trim()
    .split(/\s+/)
    .filter(Boolean).length;
}

export function getAuthorityExperimentPageMetrics(
  page: AuthorityExperimentPage,
): AuthorityExperimentPageMetrics {
  return {
    route: page.route,
    wordCount: getAuthorityExperimentPageWordCount(page),
    internalLinks: 2 + page.relatedQuestions.length,
    relatedLinks: page.relatedQuestions.length,
    schemaCoveragePercent: 100,
  };
}

export function getAuthorityExperimentDashboardMetrics(): AuthorityExperimentDashboardMetrics {
  const pageCount = authorityExperimentPages.length;
  const indexedPages = authorityExperimentPages.reduce(
    (total, page) => total + page.analytics.indexedPages,
    0,
  );
  const impressions = authorityExperimentPages.reduce(
    (total, page) => total + page.analytics.impressions,
    0,
  );
  const clicks = authorityExperimentPages.reduce((total, page) => total + page.analytics.clicks, 0);
  const pagesWithPosition = authorityExperimentPages.filter(
    (page) => page.analytics.averagePosition !== null,
  );
  const averagePosition =
    pagesWithPosition.length === 0
      ? null
      : Number(
          (
            pagesWithPosition.reduce(
              (total, page) => total + (page.analytics.averagePosition ?? 0),
              0,
            ) / pagesWithPosition.length
          ).toFixed(1),
        );

  return {
    experimentId: authorityExperimentId,
    pageCount,
    variantACount: authorityExperimentPairs.length,
    variantBCount: authorityExperimentPairs.length,
    indexedPages,
    impressions,
    clicks,
    ctr: impressions === 0 ? 0 : Number(((clicks / impressions) * 100).toFixed(2)),
    averagePosition,
  };
}

export function getVariantDashboardMetrics(
  variant: AuthorityExperimentVariant,
): AuthorityExperimentDashboardMetrics {
  const pages = authorityExperimentPages.filter((page) => page.variant === variant);
  const indexedPages = pages.reduce((total, page) => total + page.analytics.indexedPages, 0);
  const impressions = pages.reduce((total, page) => total + page.analytics.impressions, 0);
  const clicks = pages.reduce((total, page) => total + page.analytics.clicks, 0);
  const pagesWithPosition = pages.filter((page) => page.analytics.averagePosition !== null);
  const averagePosition =
    pagesWithPosition.length === 0
      ? null
      : Number(
          (
            pagesWithPosition.reduce(
              (total, page) => total + (page.analytics.averagePosition ?? 0),
              0,
            ) / pagesWithPosition.length
          ).toFixed(1),
        );

  return {
    experimentId: authorityExperimentId,
    pageCount: pages.length,
    variantACount: variant === "A" ? pages.length : 0,
    variantBCount: variant === "B" ? pages.length : 0,
    indexedPages,
    impressions,
    clicks,
    ctr: impressions === 0 ? 0 : Number(((clicks / impressions) * 100).toFixed(2)),
    averagePosition,
  };
}
