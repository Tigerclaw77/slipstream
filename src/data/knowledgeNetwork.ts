import type { KnowledgeIndustry, KnowledgeTopicCluster } from "../types";

function categories(parentTopicSlug: string, names: string[]) {
  return names.map((name) => ({
    id: `${parentTopicSlug}-${name.toLowerCase().replace(/&/g, "and").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")}`,
    slug: name.toLowerCase().replace(/&/g, "and").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""),
    name,
    parentTopicSlug,
  }));
}

export const optometryKnowledgeNetwork: KnowledgeIndustry = {
  id: "industry-optometry",
  slug: "optometry",
  name: "Optometry",
  activeVertical: "Vision Care",
  rootTitle: "Vision Care Knowledge Network",
  questions: [],
  topicClusters: [
    {
      id: "cluster-contact-lenses",
      slug: "contact-lenses",
      name: "Contact Lenses",
      overview:
        "The contact lens cluster will organize buying, safety, prescription, modality, and comparison questions before any answer generation begins.",
      targetQuestionCount: 250,
      categories: categories("contact-lenses", [
        "Daily Contacts",
        "Monthly Contacts",
        "Astigmatism",
        "Multifocal",
        "Dry Eye",
        "Safety",
        "Prescriptions",
        "Online Ordering",
        "Comparisons",
      ]),
      exampleQuestions: [
        "Can I switch from monthly contacts to daily contacts?",
        "Are toric contact lenses different from regular contacts?",
        "Can contact lenses make dry eye worse?",
        "What information is included on a contact lens prescription?",
      ],
      relatedClusterSlugs: ["eye-exams", "insurance", "glasses"],
    },
    {
      id: "cluster-glasses",
      slug: "glasses",
      name: "Glasses & Lenses",
      overview:
        "The glasses cluster will support lens material, coating, frame, reading, computer, and pediatric glasses inventories.",
      targetQuestionCount: 250,
      categories: categories("glasses", [
        "Progressive Lenses",
        "Anti-Reflective",
        "Blue Light",
        "Transitions",
        "High Index",
        "Reading Glasses",
        "Computer Glasses",
        "Frames",
        "Children's Glasses",
      ]),
      exampleQuestions: [
        "When are progressive lenses recommended?",
        "What does anti-reflective coating do?",
        "Are high index lenses thinner than standard lenses?",
        "How should children's glasses fit?",
      ],
      relatedClusterSlugs: ["eye-exams", "insurance", "contact-lenses"],
    },
    {
      id: "cluster-eye-exams",
      slug: "eye-exams",
      name: "Eye Exams",
      overview:
        "The eye exams cluster will structure routine, medical, pediatric, senior, diabetic, cost, and frequency questions.",
      targetQuestionCount: 200,
      categories: categories("eye-exams", [
        "Adult Exams",
        "Pediatric Exams",
        "Senior Exams",
        "Diabetic Exams",
        "Dilation",
        "Costs",
        "Frequency",
        "Vision Screenings",
      ]),
      exampleQuestions: [
        "How often should adults schedule an eye exam?",
        "What happens during a dilated eye exam?",
        "Do children need eye exams before school starts?",
        "How are diabetic eye exams different from routine exams?",
      ],
      relatedClusterSlugs: ["contact-lenses", "glasses", "od-vs-omd"],
    },
    {
      id: "cluster-insurance",
      slug: "insurance",
      name: "Vision Insurance",
      overview:
        "The insurance cluster will group coverage, network, frame, contact lens, and medical-versus-vision benefit questions.",
      targetQuestionCount: 150,
      categories: categories("insurance", [
        "VSP",
        "EyeMed",
        "Out Of Network",
        "Contacts",
        "Frames",
        "Medical vs Vision",
        "Coverage Questions",
      ]),
      exampleQuestions: [
        "What does VSP usually cover for an eye exam?",
        "Can vision insurance be used for contact lenses?",
        "What does out of network mean for vision benefits?",
        "When is medical insurance used instead of vision insurance?",
      ],
      relatedClusterSlugs: ["eye-exams", "contact-lenses", "glasses"],
    },
    {
      id: "cluster-od-vs-omd",
      slug: "od-vs-omd",
      name: "OD vs OMD",
      overview:
        "The OD vs OMD cluster will separate training, scope of practice, referrals, surgery, disease management, and emergency questions.",
      targetQuestionCount: 150,
      categories: categories("od-vs-omd", [
        "Training",
        "Scope Of Practice",
        "Surgery",
        "Eye Diseases",
        "Referrals",
        "Emergencies",
      ]),
      exampleQuestions: [
        "What is the difference between an optometrist and an ophthalmologist?",
        "Can an optometrist treat eye diseases?",
        "When should a patient be referred for eye surgery?",
        "Who should handle an urgent eye problem?",
      ],
      relatedClusterSlugs: ["eye-exams", "insurance"],
    },
  ],
};

export const knowledgeTopicClusters = optometryKnowledgeNetwork.topicClusters;

export function getKnowledgeClusterBySlug(slug: string): KnowledgeTopicCluster | undefined {
  return knowledgeTopicClusters.find((cluster) => cluster.slug === slug);
}

export function getKnowledgeTotals(industry: KnowledgeIndustry) {
  return {
    categories: industry.topicClusters.reduce(
      (total, cluster) => total + cluster.categories.length,
      0,
    ),
    targetQuestions: industry.topicClusters.reduce(
      (total, cluster) => total + cluster.targetQuestionCount,
      0,
    ),
  };
}
