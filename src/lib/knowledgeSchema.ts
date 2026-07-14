import type {
  AuthorityExperimentPage,
  KnowledgePilotHub,
  KnowledgePilotQuestion,
  KnowledgeSchemaDraft,
} from "../types";

type SchemaQuestionInput = Pick<KnowledgePilotQuestion, "question" | "shortAnswer">;

export function createFaqSchemaDraft(questions: SchemaQuestionInput[]): KnowledgeSchemaDraft {
  return {
    type: "faq",
    status: "draft",
    itemCount: questions.length,
    payload: {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: questions.map((question) => ({
        "@type": "Question",
        name: question.question,
        acceptedAnswer: {
          "@type": "Answer",
          text: question.shortAnswer,
        },
      })),
    },
  };
}

export function createQaSchemaDraft(questions: SchemaQuestionInput[]): KnowledgeSchemaDraft {
  return {
    type: "qa",
    status: "draft",
    itemCount: questions.length,
    payload: {
      "@context": "https://schema.org",
      "@type": "QAPage",
      mainEntity: questions.map((question) => ({
        "@type": "Question",
        name: question.question,
        text: question.question,
        suggestedAnswer: {
          "@type": "Answer",
          text: question.shortAnswer,
        },
      })),
    },
  };
}

export function createBreadcrumbSchemaDraft(hub: KnowledgePilotHub): KnowledgeSchemaDraft {
  return {
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
          name: "Vision Care Knowledge Network",
          item: "/knowledge",
        },
        {
          "@type": "ListItem",
          position: 2,
          name: hub.topicName,
          item: `/knowledge/${hub.topicSlug}`,
        },
        {
          "@type": "ListItem",
          position: 3,
          name: hub.categoryName,
          item: hub.route,
        },
      ],
    },
  };
}

export function createPilotHubSchemaDrafts(hub: KnowledgePilotHub): KnowledgeSchemaDraft[] {
  return [
    createFaqSchemaDraft(hub.questions),
    createQaSchemaDraft(hub.questions),
    createBreadcrumbSchemaDraft(hub),
  ];
}

export function createAuthorityExperimentBreadcrumbSchemaDraft(
  page: AuthorityExperimentPage,
): KnowledgeSchemaDraft {
  return {
    type: "breadcrumb",
    status: "draft",
    itemCount: 4,
    payload: {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        {
          "@type": "ListItem",
          position: 1,
          name: "SE2.0 Authority Experiment",
          item: "/lab/validation",
        },
        {
          "@type": "ListItem",
          position: 2,
          name: page.variantLabel,
          item: `/lab/${page.variant.toLowerCase()}`,
        },
        {
          "@type": "ListItem",
          position: 3,
          name: page.topic,
          item: `/knowledge/${page.topicSlug}`,
        },
        {
          "@type": "ListItem",
          position: 4,
          name: page.question,
          item: page.route,
        },
      ],
    },
  };
}

export function createAuthorityExperimentSchemaDrafts(
  page: AuthorityExperimentPage,
): KnowledgeSchemaDraft[] {
  return [
    createFaqSchemaDraft([page]),
    createQaSchemaDraft([page]),
    createAuthorityExperimentBreadcrumbSchemaDraft(page),
  ];
}
