import type {
  ArchitectureExperimentMetrics,
  ArchitectureExperimentPage,
  ArchitectureExperimentPair,
  ArchitectureExperimentQuestion,
  ArchitectureExperimentSe20Page,
  ArchitectureExperimentTraditionalPage,
  KnowledgeSchemaDraft,
} from "../types";

export const architectureExperimentId = "se20-architecture-v1";

type TopicDraft = {
  topicId: string;
  slug: string;
  topic: string;
  topicSlug: string;
  category: string;
  categorySlug: string;
  traditionalTitle: string;
  se20Title: string;
  sections: ArchitectureExperimentTraditionalPage["sections"];
  traditionalEntities: string[];
  questions: ArchitectureExperimentQuestion[];
  crossLinks: string[];
  relatedCategories: string[];
  entityRelationships: ArchitectureExperimentSe20Page["entityRelationships"];
};

const topicDrafts: TopicDraft[] = [
  {
    topicId: "daily-contact-lenses",
    slug: "daily-contact-lenses",
    topic: "Contact Lenses",
    topicSlug: "contact-lenses",
    category: "Daily Contacts",
    categorySlug: "daily-contacts",
    traditionalTitle: "What Are Daily Contact Lenses?",
    se20Title: "Daily Contact Lenses Authority Network",
    traditionalEntities: ["daily disposable contacts", "cornea", "contact lens prescription"],
    sections: [
      {
        heading: "Introduction",
        body: "Daily contact lenses are soft prescription lenses worn for one day and discarded after removal. They are popular because they simplify lens care and give the wearer a fresh pair each day. People often choose them for convenience, travel, allergies, sports, or part-time contact lens wear.",
      },
      {
        heading: "Benefits",
        body: "The main benefit is a simpler routine. Daily lenses do not require nightly cleaning, storage cases, or multipurpose solution. A fresh lens may also reduce deposit buildup and can be easier for new wearers, children, and people who wear contacts only a few days per week.",
      },
      {
        heading: "Drawbacks",
        body: "Daily contacts can cost more than reusable lenses for full-time wear, and not every prescription is available in every daily design. They still require careful handling, clean hands, no water exposure, and no sleeping. Convenience does not remove the need for a professional fitting.",
      },
      {
        heading: "Conclusion",
        body: "Daily contacts are a strong option for many patients, but the best choice depends on prescription, comfort, eye health, wearing schedule, and budget. A contact lens exam confirms fit, vision, and safety before a brand or replacement schedule is finalized. In a traditional article, the topic is summarized as one linear explanation rather than broken into a larger question pathway.",
      },
    ],
    questions: [
      {
        id: "daily-primary",
        question: "What are daily contact lenses?",
        answer:
          "Daily contact lenses are single-use soft contacts worn during waking hours and discarded after removal. They are designed to simplify care by removing the need for cleaning solution and storage cases. The lens still has to match the prescription, eye shape, tear film, and wearing schedule.",
        relatedQuestionIds: ["daily-safety", "daily-sleep", "daily-cost"],
        entityReferences: ["daily disposable contacts", "contact lens prescription", "tear film"],
      },
      {
        id: "daily-safety",
        question: "Are daily contacts safer than monthly contacts?",
        answer:
          "Daily contacts can reduce some hygiene risks because the wearer starts with a fresh lens each day. They avoid old cases, old solution, and deposit buildup. Monthly lenses can also be safe when cleaned and replaced correctly, so the safer choice depends on real habits and fit.",
        relatedQuestionIds: ["daily-primary", "daily-sleep"],
        entityReferences: ["monthly contacts", "lens case", "replacement schedule"],
      },
      {
        id: "daily-sleep",
        question: "Can I sleep in daily contact lenses?",
        answer:
          "Daily contacts should not be worn during sleep unless a doctor has prescribed a specific overnight lens. Closed-eye wear reduces oxygen flow and can increase infection risk. If sleep happens by accident, remove the lens carefully after it loosens and watch for redness, pain, light sensitivity, or blur.",
        relatedQuestionIds: ["daily-primary", "daily-safety"],
        entityReferences: ["cornea", "oxygen flow", "contact lens infection"],
      },
      {
        id: "daily-cost",
        question: "Are daily contacts worth the cost?",
        answer:
          "Daily contacts may cost more for full-time wear, but the value can be strong for part-time wearers, travelers, allergy sufferers, and people who want fewer cleaning steps. The decision should compare annual lens cost, solution cost, insurance allowance, comfort, and safety routine.",
        relatedQuestionIds: ["daily-primary", "daily-safety"],
        entityReferences: ["annual supply", "vision insurance", "contact lens allowance"],
      },
    ],
    crossLinks: ["/knowledge/contact-lenses/daily-contacts", "/experiment/se20/vsp-vision-insurance"],
    relatedCategories: ["Monthly Contacts", "Safety", "Prescriptions", "Online Ordering"],
    entityRelationships: [
      { entity: "daily disposable contacts", relationship: "single-use lens modality" },
      { entity: "cornea", relationship: "surface affected by oxygen and lens fit" },
      { entity: "contact lens prescription", relationship: "required before ordering lenses" },
    ],
  },
  {
    topicId: "progressive-lenses",
    slug: "progressive-lenses",
    topic: "Glasses & Lenses",
    topicSlug: "glasses",
    category: "Progressive Lenses",
    categorySlug: "progressive-lenses",
    traditionalTitle: "What Are Progressive Lenses?",
    se20Title: "Progressive Lenses Authority Network",
    traditionalEntities: ["progressive lenses", "presbyopia", "lens measurements"],
    sections: [
      {
        heading: "Introduction",
        body: "Progressive lenses are multifocal glasses that provide distance, intermediate, and reading vision without a visible bifocal line. They are commonly prescribed for adults with presbyopia who want one everyday pair instead of switching between distance glasses and readers.",
      },
      {
        heading: "Benefits",
        body: "The biggest benefit is range. Progressives can help with driving, computer distance, phone use, menus, and general daily tasks. They also look like regular lenses because there is no visible segment. Modern designs can be customized for frame position and visual demands.",
      },
      {
        heading: "Drawbacks",
        body: "Progressives require adaptation. Side blur, stair distortion, and a smaller reading area can happen, especially with basic designs or poor measurements. Some people still need computer glasses or task-specific reading glasses for long desk work or wide near tasks.",
      },
      {
        heading: "Conclusion",
        body: "Progressive lenses are often worth considering when near vision changes begin, but success depends on prescription, lens design, frame fit, measurements, and expectations. The right design should match how the wearer actually uses their vision during the day. This article format gives a broad overview instead of mapping every follow-up question a patient may ask.",
      },
    ],
    questions: [
      {
        id: "progressive-primary",
        question: "What are progressive lenses?",
        answer:
          "Progressive lenses are no-line multifocal lenses that move from distance vision near the top to reading vision near the bottom. The middle supports intermediate tasks such as computer screens and dashboards. They are often used when presbyopia makes near work harder.",
        relatedQuestionIds: ["progressive-worth", "progressive-adjust", "progressive-blur"],
        entityReferences: ["progressive lenses", "presbyopia", "intermediate vision"],
      },
      {
        id: "progressive-worth",
        question: "Are premium progressive lenses worth it?",
        answer:
          "Premium progressives can be worth it for all-day wearers, stronger prescriptions, heavy screen use, or people who struggled with basic progressives. They may offer wider usable zones and smoother transitions, but the upgrade should solve a specific visual problem.",
        relatedQuestionIds: ["progressive-primary", "progressive-adjust"],
        entityReferences: ["premium progressives", "digital lens design", "usable zones"],
      },
      {
        id: "progressive-adjust",
        question: "How long does it take to adjust to progressive lenses?",
        answer:
          "Many wearers adapt within a few days to two weeks. Consistent wear, proper frame adjustment, and learning to point the nose toward the target help. Persistent blur, dizziness, or unsafe walking should trigger a prescription, measurement, or fit check.",
        relatedQuestionIds: ["progressive-primary", "progressive-blur"],
        entityReferences: ["adaptation", "fitting height", "frame adjustment"],
      },
      {
        id: "progressive-blur",
        question: "Why are progressive lenses blurry on the sides?",
        answer:
          "Side blur is part of the optics that blend distance, intermediate, and near power without a visible line. The clearest areas are arranged through the central corridor. Better measurements, lens design, and frame choice can reduce the effect.",
        relatedQuestionIds: ["progressive-primary", "progressive-worth"],
        entityReferences: ["peripheral distortion", "progressive corridor", "lens design"],
      },
    ],
    crossLinks: ["/knowledge/glasses/progressive-lenses", "/experiment/se20/adult-eye-exams"],
    relatedCategories: ["Anti-Reflective", "High Index", "Computer Glasses", "Frames"],
    entityRelationships: [
      { entity: "presbyopia", relationship: "near-vision condition progressives address" },
      { entity: "lens measurements", relationship: "fit data needed to position viewing zones" },
      { entity: "digital lens design", relationship: "premium design method for wider zones" },
    ],
  },
  {
    topicId: "adult-eye-exams",
    slug: "adult-eye-exams",
    topic: "Eye Exams",
    topicSlug: "eye-exams",
    category: "Adult Exams",
    categorySlug: "adult-exams",
    traditionalTitle: "What Happens During an Adult Eye Exam?",
    se20Title: "Adult Eye Exams Authority Network",
    traditionalEntities: ["comprehensive eye exam", "refraction", "retinal health"],
    sections: [
      {
        heading: "Introduction",
        body: "An adult eye exam checks both vision and eye health. It can update a glasses or contact lens prescription, evaluate symptoms, and look for signs of eye disease. The visit is useful even when vision feels stable because some conditions develop gradually.",
      },
      {
        heading: "Benefits",
        body: "A comprehensive exam can identify prescription changes, dry eye, cataracts, eye pressure concerns, retinal changes, and other findings. It also gives patients a chance to discuss screen strain, night driving, headaches, contact lens comfort, and family history.",
      },
      {
        heading: "Drawbacks",
        body: "Patients may be unsure how often exams are needed or whether dilation is required. Some testing may add time or cost, especially retinal imaging or contact lens evaluations. Insurance may cover routine vision care differently from medical eye concerns.",
      },
      {
        heading: "Conclusion",
        body: "Most adults benefit from regular eye exams, with timing based on age, symptoms, contacts, medical history, and eye disease risk. A good exam ends with a plan for prescription, monitoring, treatment, or referral when needed. The traditional article keeps the advice together in one overview instead of separating exam frequency, steps, dilation, and health findings into linked questions.",
      },
    ],
    questions: [
      {
        id: "exam-primary",
        question: "How often should adults get eye exams?",
        answer:
          "Many healthy adults schedule comprehensive eye exams every one to two years. Annual exams are common for contact lens wearers, adults over 40, people with diabetes, strong prescriptions, glaucoma risk, or new symptoms. Risk level should guide timing.",
        relatedQuestionIds: ["exam-steps", "exam-dilation", "exam-health"],
        entityReferences: ["comprehensive eye exam", "diabetes", "glaucoma risk"],
      },
      {
        id: "exam-steps",
        question: "What happens during an adult eye exam?",
        answer:
          "An adult exam usually includes history, vision testing, refraction, eye pressure, front-of-eye evaluation, and retinal assessment. The doctor may recommend dilation, imaging, contact lens checks, dry eye testing, or referral depending on symptoms and risk.",
        relatedQuestionIds: ["exam-primary", "exam-dilation"],
        entityReferences: ["refraction", "eye pressure", "retinal assessment"],
      },
      {
        id: "exam-dilation",
        question: "Do adults need dilation at every eye exam?",
        answer:
          "Not every adult needs dilation at every visit, but it is important when risk factors or symptoms call for a wider retinal view. Diabetes, flashes, floaters, high prescriptions, suspicious optic nerves, or poor retinal views can make dilation more important.",
        relatedQuestionIds: ["exam-primary", "exam-health"],
        entityReferences: ["dilation", "retina", "optic nerve"],
      },
      {
        id: "exam-health",
        question: "Can an eye exam detect health problems?",
        answer:
          "Eye exams can reveal signs associated with diabetes, high blood pressure, inflammation, medication effects, and neurologic concerns. They do not replace primary medical care, but retinal and optic nerve findings can be useful signals for follow-up.",
        relatedQuestionIds: ["exam-primary", "exam-steps"],
        entityReferences: ["retinal health", "high blood pressure", "optic nerve"],
      },
    ],
    crossLinks: ["/knowledge/eye-exams/adult-exams", "/experiment/se20/optometrist-vs-ophthalmologist"],
    relatedCategories: ["Dilation", "Costs", "Frequency", "Vision Screenings"],
    entityRelationships: [
      { entity: "refraction", relationship: "test used to measure glasses prescription" },
      { entity: "retina", relationship: "back-of-eye tissue evaluated during health checks" },
      { entity: "optic nerve", relationship: "structure monitored for glaucoma risk" },
    ],
  },
  {
    topicId: "vsp-vision-insurance",
    slug: "vsp-vision-insurance",
    topic: "Vision Insurance",
    topicSlug: "insurance",
    category: "VSP",
    categorySlug: "vsp",
    traditionalTitle: "What Does VSP Vision Insurance Cover?",
    se20Title: "VSP Vision Insurance Authority Network",
    traditionalEntities: ["VSP", "frame allowance", "contact lens allowance"],
    sections: [
      {
        heading: "Introduction",
        body: "VSP is a common vision benefit plan used for routine eye care and eyewear. It may help with eye exams, lenses, frames, contacts, and selected lens enhancements. The exact benefit depends on the plan design and provider network.",
      },
      {
        heading: "Benefits",
        body: "VSP can make routine vision care more predictable by applying copays, allowances, and discounts. Patients may use benefits for an eye exam, glasses lenses, frame purchases, contact lenses, progressive lenses, coatings, or prescription sunglasses depending on the plan.",
      },
      {
        heading: "Drawbacks",
        body: "Coverage can be confusing because allowances, copays, discounts, upgrades, and renewal dates are separate. Medical eye problems may need medical insurance instead of routine vision benefits. Online purchases and out-of-network use may also follow different rules.",
      },
      {
        heading: "Conclusion",
        body: "The best way to use VSP is to verify benefits before the visit and before ordering eyewear. Patients should ask about exam copays, frame allowance, contact lens allowance, renewal timing, and whether glasses or contacts use the main materials benefit. As a traditional article, the coverage explanation remains consolidated rather than organized as benefit-specific answer nodes.",
      },
    ],
    questions: [
      {
        id: "vsp-primary",
        question: "What does VSP usually cover?",
        answer:
          "VSP commonly helps with routine exams, glasses lenses, frames, contact lenses, and selected lens upgrades. Exact coverage depends on the plan. Patients should verify copays, allowances, upgrade rules, provider network, and renewal timing before ordering.",
        relatedQuestionIds: ["vsp-contacts", "vsp-frequency", "vsp-progressives"],
        entityReferences: ["VSP", "vision benefits", "provider network"],
      },
      {
        id: "vsp-contacts",
        question: "Does VSP cover contact lenses?",
        answer:
          "Many VSP plans include a contact lens allowance, but it is usually not unlimited coverage. The allowance may apply to materials and sometimes part of the fitting. Contacts may replace the glasses materials benefit for that benefit period.",
        relatedQuestionIds: ["vsp-primary", "vsp-frequency"],
        entityReferences: ["contact lens allowance", "contact lens fitting", "materials benefit"],
      },
      {
        id: "vsp-frequency",
        question: "How often can I use VSP benefits?",
        answer:
          "Benefit frequency varies by plan. Exams, lenses, frames, and contacts may renew on different schedules such as every 12 months, calendar year, plan year, or every 24 months for frames. Eligibility should be checked before ordering.",
        relatedQuestionIds: ["vsp-primary", "vsp-progressives"],
        entityReferences: ["benefit renewal", "eligibility", "frame allowance"],
      },
      {
        id: "vsp-progressives",
        question: "Does VSP cover progressive lenses?",
        answer:
          "Many plans help with progressive lenses, but progressives may be treated as a lens upgrade above basic lens coverage. Standard and premium designs can have different costs. A lens estimate should separate covered benefits from upgrades.",
        relatedQuestionIds: ["vsp-primary", "vsp-contacts"],
        entityReferences: ["progressive lenses", "lens upgrade", "copay"],
      },
    ],
    crossLinks: ["/knowledge/insurance/vsp", "/experiment/se20/progressive-lenses"],
    relatedCategories: ["EyeMed", "Out Of Network", "Contacts", "Frames"],
    entityRelationships: [
      { entity: "frame allowance", relationship: "dollar benefit applied to eyeglass frames" },
      { entity: "contact lens allowance", relationship: "materials benefit for prescribed contacts" },
      { entity: "medical insurance", relationship: "coverage path for medical eye problems" },
    ],
  },
  {
    topicId: "optometrist-vs-ophthalmologist",
    slug: "optometrist-vs-ophthalmologist",
    topic: "OD vs OMD",
    topicSlug: "od-vs-omd",
    category: "Scope Of Practice",
    categorySlug: "scope-of-practice",
    traditionalTitle: "Optometrist vs Ophthalmologist: What Is the Difference?",
    se20Title: "Optometrist vs Ophthalmologist Authority Network",
    traditionalEntities: ["optometrist", "ophthalmologist", "scope of practice"],
    sections: [
      {
        heading: "Introduction",
        body: "Optometrists and ophthalmologists both care for eyes, but they often serve different roles. Patients usually ask this question when deciding where to schedule an exam, who can prescribe glasses or contacts, or when a problem needs medical or surgical care.",
      },
      {
        heading: "Benefits",
        body: "Understanding the difference helps patients choose the right starting point. Optometrists commonly provide routine exams, glasses, contacts, and many primary eye care services. Ophthalmologists are physicians and surgeons who manage advanced disease, procedures, and specialty care.",
      },
      {
        heading: "Drawbacks",
        body: "The comparison can be oversimplified because roles overlap and scope varies by state. Some optometrists provide extensive medical eye care, and some ophthalmologists also provide routine exams. The right answer depends on symptoms, urgency, local access, and treatment needs.",
      },
      {
        heading: "Conclusion",
        body: "The best choice is problem-based. Routine vision care often starts with an optometrist. Surgery, injections, severe trauma, complex disease, or urgent specialty care may require an ophthalmologist. Good care often involves referral and coordination between both. This traditional version explains the distinction in one article flow rather than modeling provider roles as a connected question network.",
      },
    ],
    questions: [
      {
        id: "od-primary",
        question: "What is the difference between an optometrist and an ophthalmologist?",
        answer:
          "An optometrist commonly provides primary eye care, eye exams, glasses, contacts, and management of many common eye conditions. An ophthalmologist is a physician and surgeon for advanced medical and surgical eye care. The right choice depends on the problem.",
        relatedQuestionIds: ["od-treat", "od-required", "od-together"],
        entityReferences: ["optometrist", "ophthalmologist", "primary eye care"],
      },
      {
        id: "od-treat",
        question: "What can an optometrist treat?",
        answer:
          "Optometrists can often manage routine exams, prescriptions, contact lenses, dry eye, allergies, infections, red eyes, monitoring, and many urgent symptoms. Exact scope depends on state law, training, equipment, and whether the condition needs specialty care.",
        relatedQuestionIds: ["od-primary", "od-required"],
        entityReferences: ["dry eye", "contact lenses", "state scope"],
      },
      {
        id: "od-required",
        question: "When is an ophthalmologist required?",
        answer:
          "Ophthalmology is usually required for surgery, injections, advanced disease, severe trauma, complex corneal or retinal conditions, and some emergency symptoms. Optometrists often detect problems, begin evaluation, and refer when specialist treatment is needed.",
        relatedQuestionIds: ["od-primary", "od-together"],
        entityReferences: ["eye surgery", "retina specialist", "referral"],
      },
      {
        id: "od-together",
        question: "How do optometrists and ophthalmologists work together?",
        answer:
          "They often work as a care pathway. The optometrist may provide routine care, detect changes, monitor stable conditions, and refer. The ophthalmologist may provide surgery or specialty treatment. Care can return to optometry for follow-up and glasses.",
        relatedQuestionIds: ["od-primary", "od-required"],
        entityReferences: ["co-management", "referral", "post-operative care"],
      },
    ],
    crossLinks: ["/knowledge/od-vs-omd/scope-of-practice", "/experiment/se20/adult-eye-exams"],
    relatedCategories: ["Training", "Surgery", "Eye Diseases", "Referrals"],
    entityRelationships: [
      { entity: "optometrist", relationship: "primary eye care provider for many routine needs" },
      { entity: "ophthalmologist", relationship: "medical doctor and surgeon for complex care" },
      { entity: "scope of practice", relationship: "legal and clinical boundary that varies by state" },
    ],
  },
];

function buildPair(draft: TopicDraft): ArchitectureExperimentPair {
  return {
    experimentId: architectureExperimentId,
    topicId: draft.topicId,
    slug: draft.slug,
    topic: draft.topic,
    traditional: {
      experimentId: architectureExperimentId,
      topicId: draft.topicId,
      variant: "traditional",
      route: `/experiment/traditional/${draft.slug}`,
      slug: draft.slug,
      title: draft.traditionalTitle,
      topic: draft.topic,
      topicSlug: draft.topicSlug,
      category: draft.category,
      categorySlug: draft.categorySlug,
      sections: draft.sections,
      internalLinks: [`/knowledge/${draft.topicSlug}`],
      entityReferences: draft.traditionalEntities,
      schemaTypes: ["Article"],
    },
    se20: {
      experimentId: architectureExperimentId,
      topicId: draft.topicId,
      variant: "se20",
      route: `/experiment/se20/${draft.slug}`,
      slug: draft.slug,
      title: draft.se20Title,
      topic: draft.topic,
      topicSlug: draft.topicSlug,
      category: draft.category,
      categorySlug: draft.categorySlug,
      primaryQuestionId: draft.questions[0].id,
      questions: draft.questions,
      crossLinks: draft.crossLinks,
      relatedCategories: draft.relatedCategories,
      entityRelationships: draft.entityRelationships,
      schemaTypes: ["FAQPage", "QAPage", "BreadcrumbList", "ItemList"],
    },
  };
}

export const architectureExperimentPairs: ArchitectureExperimentPair[] = topicDrafts.map(buildPair);

export const architectureExperimentPages: ArchitectureExperimentPage[] =
  architectureExperimentPairs.flatMap((pair) => [pair.traditional, pair.se20]);

export function getArchitectureExperimentPageByRoute(
  route: string,
): ArchitectureExperimentPage | undefined {
  const normalized = route.startsWith("/") ? route : `/${route}`;
  return architectureExperimentPages.find((page) => page.route === normalized);
}

export function getArchitectureExperimentPairBySlug(
  slug: string,
): ArchitectureExperimentPair | undefined {
  return architectureExperimentPairs.find((pair) => pair.slug === slug);
}

export function countArchitectureWords(text: string): number {
  return text
    .trim()
    .split(/\s+/)
    .filter(Boolean).length;
}

function getTraditionalText(page: ArchitectureExperimentTraditionalPage): string {
  return [page.title, ...page.sections.map((section) => `${section.heading} ${section.body}`)].join(" ");
}

function getSe20Text(page: ArchitectureExperimentSe20Page): string {
  return [
    page.title,
    ...page.questions.map((question) => `${question.question} ${question.answer}`),
    ...page.entityRelationships.map((relationship) => `${relationship.entity} ${relationship.relationship}`),
  ].join(" ");
}

function getRelatedQuestionLinkCount(page: ArchitectureExperimentSe20Page): number {
  return page.questions.reduce(
    (total, question) => total + question.relatedQuestionIds.length,
    0,
  );
}

function uniqueEntityCount(page: ArchitectureExperimentPage): number {
  const entities =
    page.variant === "traditional"
      ? page.entityReferences
      : [
          ...page.entityRelationships.map((relationship) => relationship.entity),
          ...page.questions.flatMap((question) => question.entityReferences),
        ];

  return new Set(entities.map((entity) => entity.toLowerCase())).size;
}

export function getArchitectureExperimentMetrics(
  page: ArchitectureExperimentPage,
): ArchitectureExperimentMetrics {
  if (page.variant === "traditional") {
    return {
      route: page.route,
      variant: "traditional",
      wordCount: countArchitectureWords(getTraditionalText(page)),
      internalLinks: page.internalLinks.length,
      relatedQuestionLinks: 0,
      entityReferences: uniqueEntityCount(page),
      schemaTypes: page.schemaTypes.length,
      questionCount: 0,
    };
  }

  const relatedQuestionLinks = getRelatedQuestionLinkCount(page);

  return {
    route: page.route,
    variant: "se20",
    wordCount: countArchitectureWords(getSe20Text(page)),
    internalLinks: relatedQuestionLinks + page.crossLinks.length + page.relatedCategories.length,
    relatedQuestionLinks,
    entityReferences: uniqueEntityCount(page),
    schemaTypes: page.schemaTypes.length,
    questionCount: page.questions.length,
  };
}

export function createArchitectureExperimentSchemaDrafts(
  page: ArchitectureExperimentPage,
): KnowledgeSchemaDraft[] {
  if (page.variant === "traditional") {
    return [
      {
        type: "article",
        status: "draft",
        itemCount: 1,
        payload: {
          "@context": "https://schema.org",
          "@type": "Article",
          headline: page.title,
          articleSection: page.category,
          about: page.entityReferences,
        },
      },
    ];
  }

  return [
    {
      type: "faq",
      status: "draft",
      itemCount: page.questions.length,
      payload: {
        "@context": "https://schema.org",
        "@type": "FAQPage",
        mainEntity: page.questions.map((question) => ({
          "@type": "Question",
          name: question.question,
          acceptedAnswer: {
            "@type": "Answer",
            text: question.answer,
          },
        })),
      },
    },
    {
      type: "qa",
      status: "draft",
      itemCount: page.questions.length,
      payload: {
        "@context": "https://schema.org",
        "@type": "QAPage",
        mainEntity: page.questions.map((question) => ({
          "@type": "Question",
          name: question.question,
          suggestedAnswer: {
            "@type": "Answer",
            text: question.answer,
          },
        })),
      },
    },
    {
      type: "breadcrumb",
      status: "draft",
      itemCount: 3,
      payload: {
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        itemListElement: [
          {
            "@type": "ListItem",
            position: 1,
            name: "SE2.0 Architecture Experiment",
            item: "/experiment/se20-validation",
          },
          {
            "@type": "ListItem",
            position: 2,
            name: page.topic,
            item: `/knowledge/${page.topicSlug}`,
          },
          {
            "@type": "ListItem",
            position: 3,
            name: page.title,
            item: page.route,
          },
        ],
      },
    },
    {
      type: "itemlist",
      status: "draft",
      itemCount: page.entityRelationships.length,
      payload: {
        "@context": "https://schema.org",
        "@type": "ItemList",
        name: `${page.title} entity relationships`,
        itemListElement: page.entityRelationships.map((relationship, index) => ({
          "@type": "ListItem",
          position: index + 1,
          name: relationship.entity,
          description: relationship.relationship,
        })),
      },
    },
  ];
}
