import { dailyContactsPilotQuestions } from "./dailyContactsPilot";
import type {
  KnowledgeOverlapFlag,
  KnowledgePilotHub,
  KnowledgePilotHubMetrics,
  KnowledgePilotQuestion,
} from "../types";

const lastUpdated = "2026-06-23";
const citationPlaceholders = [
  {
    status: "placeholder" as const,
    note: "Citation to be added during clinical and editorial sourcing pass.",
  },
];

type QuestionDraft = {
  slug: string;
  question: string;
  shortAnswer: string;
  longAnswer: string;
  relatedQuestions: string[];
  tags: string[];
  relatedCategorySlugs: string[];
};

const selectedQuestionSlugsByHub: Record<string, string[]> = {
  vsp: [
    "what-does-vsp-usually-cover",
    "does-vsp-cover-contact-lenses",
    "does-vsp-cover-frames",
    "how-often-can-i-use-vsp-benefits",
    "can-vsp-cover-an-eye-exam-and-glasses-in-the-same-year",
    "does-vsp-cover-progressive-lenses",
    "can-i-use-vsp-out-of-network",
    "how-do-i-find-a-vsp-eye-doctor",
    "does-vsp-cover-medical-eye-problems",
    "can-vsp-benefits-be-used-online",
    "can-i-use-vsp-for-prescription-sunglasses",
    "what-is-a-vsp-frame-allowance",
    "what-is-a-vsp-contact-lens-allowance",
    "can-vsp-benefits-be-split-between-glasses-and-contacts",
    "how-do-vsp-copays-work",
  ],
  "scope-of-practice": [
    "what-can-an-optometrist-treat",
    "what-can-an-ophthalmologist-treat",
    "can-an-optometrist-prescribe-glasses",
    "can-an-optometrist-prescribe-contact-lenses",
    "can-an-optometrist-prescribe-eye-drops",
    "can-an-optometrist-prescribe-medication-for-eye-infections",
    "can-an-optometrist-treat-dry-eye",
    "can-an-optometrist-manage-glaucoma",
    "can-an-optometrist-monitor-cataracts-before-surgery",
    "can-an-optometrist-diagnose-diabetic-eye-disease",
    "can-optometrists-handle-urgent-eye-visits",
    "can-optometrists-refer-for-surgery",
    "does-optometry-scope-vary-by-state",
    "when-is-an-ophthalmologist-required",
    "how-do-optometrists-and-ophthalmologists-work-together",
  ],
};

function buildQuestion(
  hub: Pick<KnowledgePilotHub, "id" | "topicSlug" | "topicName" | "categorySlug" | "categoryName">,
  draft: QuestionDraft,
): KnowledgePilotQuestion {
  return {
    id: `${hub.id}-${draft.slug}`,
    slug: draft.slug,
    topic: hub.topicName,
    category: hub.categoryName,
    question: draft.question,
    shortAnswer: draft.shortAnswer,
    longAnswer: draft.longAnswer,
    relatedQuestions: draft.relatedQuestions,
    tags: draft.tags,
    citations: citationPlaceholders,
    lastUpdated,
    parentTopicSlug: hub.topicSlug,
    parentCategorySlug: hub.categorySlug,
    relatedCategorySlugs: draft.relatedCategorySlugs,
  };
}

function buildHub(
  hub: Omit<KnowledgePilotHub, "questions">,
  questions: QuestionDraft[],
): KnowledgePilotHub {
  const selectedSlugs = selectedQuestionSlugsByHub[hub.id];
  const selectedQuestions = selectedSlugs
    ? selectedSlugs
        .map((slug) => questions.find((question) => question.slug === slug))
        .filter((question): question is QuestionDraft => Boolean(question))
    : questions;
  const selectedSlugSet = new Set(selectedQuestions.map((question) => question.slug));

  return {
    ...hub,
    questions: selectedQuestions.map((question) => {
      const relatedQuestions = question.relatedQuestions.filter(
        (slug, index, all) =>
          slug !== question.slug && selectedSlugSet.has(slug) && all.indexOf(slug) === index,
      );

      for (const candidate of selectedQuestions) {
        if (relatedQuestions.length >= 4) {
          break;
        }

        if (candidate.slug !== question.slug && !relatedQuestions.includes(candidate.slug)) {
          relatedQuestions.push(candidate.slug);
        }
      }

      return buildQuestion(hub, {
        ...question,
        relatedQuestions,
      });
    }),
  };
}

export function countWords(text: string): number {
  return text
    .trim()
    .split(/\s+/)
    .filter(Boolean).length;
}

function getQuestionWordCount(question: KnowledgePilotQuestion): number {
  return countWords(question.shortAnswer) + countWords(question.longAnswer);
}

export function getPilotHubMetrics(hub: KnowledgePilotHub): KnowledgePilotHubMetrics {
  const totalWordCount = hub.questions.reduce(
    (total, question) => total + getQuestionWordCount(question),
    0,
  );
  const longAnswerWordCount = hub.questions.reduce(
    (total, question) => total + countWords(question.longAnswer),
    0,
  );
  const relatedQuestionLinks = hub.questions.reduce(
    (total, question) => total + question.relatedQuestions.length,
    0,
  );
  const parentLinks = hub.questions.length * 2;
  const relatedCategoryLinks = hub.questions.reduce(
    (total, question) => total + question.relatedCategorySlugs.length,
    0,
  );

  return {
    hubId: hub.id,
    title: hub.title,
    route: hub.route,
    questionCount: hub.questions.length,
    totalWordCount,
    internalLinksCreated: parentLinks + relatedQuestionLinks + relatedCategoryLinks,
    relatedQuestionLinks,
    averageAnswerLength: Math.round(longAnswerWordCount / hub.questions.length),
  };
}

export const dailyContactsPilotHub: KnowledgePilotHub = {
  id: "daily-contacts",
  route: "/knowledge/contact-lenses/daily-contacts",
  title: "Daily Contacts",
  topicSlug: "contact-lenses",
  topicName: "Contact Lenses",
  categorySlug: "daily-contacts",
  categoryName: "Daily Contacts",
  overview:
    "Daily contact lenses are single-use soft contacts worn for one day and discarded after removal. This pilot hub focuses on safety, comfort, cost, children, allergies, travel, sports, prescriptions, and practical handling.",
  questions: dailyContactsPilotQuestions,
  relatedCategorySlugs: ["monthly-contacts", "dry-eye", "safety", "prescriptions", "online-ordering", "comparisons"],
};

const vspHub = buildHub(
  {
    id: "vsp",
    route: "/knowledge/insurance/vsp",
    title: "VSP",
    topicSlug: "insurance",
    topicName: "Vision Insurance",
    categorySlug: "vsp",
    categoryName: "VSP",
    overview:
      "The VSP pilot hub tests insurance-navigation intent: what benefits usually mean, how allowances work, when routine coverage stops, and what patients should verify before using a plan.",
    relatedCategorySlugs: ["eyemed", "out-of-network", "contacts", "frames", "medical-vs-vision", "coverage-questions"],
  },
  [
    {
      slug: "what-does-vsp-usually-cover",
      question: "What does VSP usually cover?",
      shortAnswer:
        "VSP commonly helps with routine vision benefits such as an eye exam, glasses lenses, frames, contact lenses, and selected lens upgrades, but the exact coverage depends on the employer or plan design. Patients should verify exam copays, frame allowance, contact lens allowance, lens enhancement coverage, frequency limits, and whether the provider is in network before scheduling or ordering eyewear.",
      longAnswer:
        "VSP is usually a vision benefit plan, not a guarantee that every eye care cost is fully covered. Most VSP plans are built around routine vision needs: an annual or periodic eye exam, a frame allowance, standard prescription lenses, contact lens benefits, and discounts or partial coverage for upgrades such as progressive lenses, anti-reflective coating, or photochromic lenses.\n\nThe important detail is that VSP plans vary. One patient may have a generous frame allowance and yearly exam benefits, while another may have a smaller allowance or different renewal schedule. Some plans cover either glasses or contacts during a benefit period, not both. Some upgrades are discounted rather than fully covered. Medical eye problems such as infections, diabetic eye disease, glaucoma monitoring, or dry eye visits may need medical insurance instead.\n\nBefore using VSP, ask the office to verify eligibility and benefits. The most useful questions are practical: What is my exam copay? What is my frame allowance? Do I have a contact lens allowance? Are progressives or coatings covered? When do my benefits renew? That turns VSP from a vague benefit into a clear shopping and care plan.",
      relatedQuestions: [
        "how-often-can-i-use-vsp-benefits",
        "can-vsp-cover-an-eye-exam-and-glasses-in-the-same-year",
        "what-is-a-vsp-frame-allowance",
        "what-is-a-vsp-contact-lens-allowance",
      ],
      tags: ["vsp benefits", "vision coverage", "allowances"],
      relatedCategorySlugs: ["coverage-questions", "frames", "contacts"],
    },
    {
      slug: "does-vsp-cover-contact-lenses",
      question: "Does VSP cover contact lenses?",
      shortAnswer:
        "Many VSP plans include a contact lens benefit, but it is often handled as an allowance rather than unlimited coverage. The allowance may apply to contact lens materials and sometimes a fitting or evaluation, depending on the plan. Patients should confirm whether contacts replace the glasses benefit for that period and whether specialty or medically necessary lenses are treated differently.",
      longAnswer:
        "VSP often helps with contact lenses, but the benefit is usually structured around a dollar allowance. That means the plan contributes up to a set amount toward contacts, and the patient pays any remaining balance. Daily contacts, toric lenses, multifocal lenses, and annual supplies can have very different final costs even under the same allowance.\n\nThe contact lens fitting or evaluation is a separate issue. Contact lenses sit on the eye, so the doctor must check fit, movement, vision, comfort, and eye health. Some VSP plans include part of that fitting fee; others leave more of it to the patient. Specialty lenses may have a different benefit structure, especially if they are considered medically necessary.\n\nPatients should ask whether their plan allows both glasses and contacts in the same benefit cycle. Many plans make patients choose how to use the materials benefit. If you want contacts most days but also need backup glasses, ask for a side-by-side estimate before ordering. The best VSP contact lens decision is based on annual supply cost, fitting fees, rebates, and backup eyewear needs.",
      relatedQuestions: [
        "what-is-a-vsp-contact-lens-allowance",
        "can-vsp-benefits-be-split-between-glasses-and-contacts",
        "does-vsp-cover-medical-eye-problems",
        "how-do-vsp-copays-work",
      ],
      tags: ["contact lenses", "vsp allowance", "materials benefit"],
      relatedCategorySlugs: ["contacts", "coverage-questions"],
    },
    {
      slug: "does-vsp-cover-frames",
      question: "Does VSP cover frames?",
      shortAnswer:
        "VSP commonly includes a frame allowance that reduces the cost of eyeglass frames. If the frame costs more than the allowance, the patient usually pays the difference, sometimes with additional plan discounts. Coverage can vary by plan, provider network, frame brand, and benefit timing, so it is worth verifying the allowance before choosing frames.",
      longAnswer:
        "VSP frame coverage is usually an allowance. The plan sets a dollar amount that can be applied toward eligible frames. If you choose frames within that allowance, your out-of-pocket cost may be low. If you choose a designer frame or a frame above the allowance, you generally pay the amount over the allowance, sometimes with a percentage discount depending on the plan.\n\nFrame benefits are tied to frequency rules. Some patients can use a new frame allowance every calendar year; others may have a 12-month or 24-month schedule. Dependents may have their own benefits. Plan details also matter for prescription sunglasses, safety frames, children's frames, and online purchases.\n\nThe frame allowance is only one part of the total glasses cost. Lenses, coatings, progressive design, high index material, transitions, and anti-reflective options may be calculated separately. A patient may have a strong frame benefit but still pay for lens upgrades. The most useful approach is to ask for a full estimate before finalizing the order. That estimate should show the frame allowance, lens coverage, upgrades, discounts, and final patient responsibility.",
      relatedQuestions: [
        "what-is-a-vsp-frame-allowance",
        "can-i-use-vsp-for-prescription-sunglasses",
        "does-vsp-cover-progressive-lenses",
        "can-vsp-cover-an-eye-exam-and-glasses-in-the-same-year",
      ],
      tags: ["frames", "frame allowance", "glasses benefits"],
      relatedCategorySlugs: ["frames", "coverage-questions"],
    },
    {
      slug: "how-often-can-i-use-vsp-benefits",
      question: "How often can I use VSP benefits?",
      shortAnswer:
        "VSP benefit timing depends on the specific plan. Many plans renew exam, lens, frame, or contact lens benefits every 12 months, but some use calendar-year rules, plan-year rules, or longer frame replacement periods. Patients should verify eligibility before scheduling or ordering because using one benefit can affect what remains available for glasses or contacts.",
      longAnswer:
        "VSP benefits are not always available on the same schedule for every service. A plan may allow an eye exam every 12 months, lenses every 12 months, frames every 24 months, and contacts as an alternative to glasses. Another plan may renew on the calendar year or on an employer plan year. That is why two people with VSP can have different answers.\n\nTiming matters because routine eye care and eyewear purchases often happen separately. You might be eligible for an exam but not a new frame allowance yet. You might have used contact lens benefits earlier in the year and no longer have a full glasses benefit. Dependents can also have separate timelines.\n\nBefore making decisions, ask the office or VSP portal to verify the next eligible dates for exam, lenses, frames, and contacts. If benefits reset soon, timing the order can change out-of-pocket cost. If symptoms or medical concerns are present, do not delay care just to wait for a routine benefit; medical insurance may be the right path. For planned eyewear, benefit timing is one of the simplest ways to avoid surprises.",
      relatedQuestions: [
        "what-does-vsp-usually-cover",
        "can-vsp-cover-an-eye-exam-and-glasses-in-the-same-year",
        "what-happens-if-i-do-not-use-vsp-benefits",
        "how-do-i-check-my-vsp-eligibility",
      ],
      tags: ["benefit frequency", "eligibility", "renewal timing"],
      relatedCategorySlugs: ["coverage-questions"],
    },
    {
      slug: "can-vsp-cover-an-eye-exam-and-glasses-in-the-same-year",
      question: "Can VSP cover an eye exam and glasses in the same year?",
      shortAnswer:
        "Often yes, but it depends on the plan. Many VSP plans include a routine eye exam and a materials benefit for glasses during the same benefit period. The exam, lenses, frame allowance, and upgrades may each have separate copays or limits. Patients should verify whether contact lenses would replace the glasses materials benefit.",
      longAnswer:
        "Many VSP plans are designed to support both a routine eye exam and eyewear in the same benefit period. The exam checks vision and eye health, while the materials benefit helps pay for lenses and frames. That said, the plan may apply separate copays, allowances, and upgrade rules. Covered does not always mean free.\n\nA common pattern is an exam copay, basic lens coverage, a frame allowance, and additional costs for premium lens options. Progressive lenses, high index lenses, anti-reflective coatings, and photochromic lenses may be partially covered, discounted, or billed as upgrades. Contact lenses may be offered instead of glasses materials, which can change the calculation.\n\nThe best way to use the benefit is to verify before the appointment and again before ordering. Ask what is available for the exam, lenses, frames, and contacts. If you need both contacts and glasses, request two estimates. One may use insurance for glasses and pay contacts separately; the other may use insurance for contacts and pay more for glasses. The right choice depends on prescription, daily needs, and total annual cost.",
      relatedQuestions: [
        "does-vsp-cover-frames",
        "does-vsp-cover-progressive-lenses",
        "can-vsp-benefits-be-split-between-glasses-and-contacts",
        "how-do-vsp-copays-work",
      ],
      tags: ["exam benefit", "glasses benefit", "materials benefit"],
      relatedCategorySlugs: ["coverage-questions", "frames", "contacts"],
    },
    {
      slug: "does-vsp-cover-progressive-lenses",
      question: "Does VSP cover progressive lenses?",
      shortAnswer:
        "Many VSP plans help with progressive lenses, but the amount varies. Basic lens coverage may apply first, with progressive design billed as an upgrade or copay. Premium digital progressives may cost more than standard progressives. Patients should ask for a lens estimate that separates covered lens benefits from progressive, material, and coating upgrades.",
      longAnswer:
        "VSP often provides some support for progressive lenses, but the plan details determine how much. Progressive lenses are more complex than single-vision lenses because they include distance, intermediate, and near zones in one lens. Many plans treat that design as an upgrade above basic lens coverage.\n\nThe final cost depends on several choices: standard versus premium progressive design, lens material, anti-reflective coating, transitions, high index material, and frame size. A patient may see progressive coverage on the plan and still have an out-of-pocket balance because the chosen lens package goes beyond the basic covered level.\n\nFor patients, the key is to evaluate progressives as both a benefit and a visual tool. A cheaper progressive may not perform as well for wide reading, computer work, or adaptation. A premium design may be worthwhile for people who wear glasses all day. Ask the optical team to explain the difference between what VSP covers, what is discounted, and what is optional. A clear estimate prevents the common surprise of assuming progressive lenses are fully covered when they are actually partially supported.",
      relatedQuestions: [
        "what-does-vsp-usually-cover",
        "does-vsp-cover-anti-reflective-coating",
        "does-vsp-cover-frames",
        "how-do-vsp-copays-work",
      ],
      tags: ["progressive lenses", "lens upgrades", "vsp lens coverage"],
      relatedCategorySlugs: ["frames", "coverage-questions"],
    },
    {
      slug: "does-vsp-cover-anti-reflective-coating",
      question: "Does VSP cover anti-reflective coating?",
      shortAnswer:
        "Some VSP plans cover or discount anti-reflective coating, but coverage varies by plan and coating level. Basic anti-reflective coating may have a different cost than premium coating with scratch resistance, easier cleaning, or better glare reduction. Patients should ask whether the coating is covered, discounted, or fully out of pocket before choosing lenses.",
      longAnswer:
        "Anti-reflective coating is often treated as a lens enhancement. VSP may cover part of it, offer a set copay, provide a discount, or leave it as an optional out-of-pocket upgrade. The answer depends on the plan and the coating selected.\n\nThis distinction matters because anti-reflective coatings are not all the same. A basic coating may reduce reflections, while premium coatings may add better durability, easier cleaning, improved scratch resistance, or better performance with night driving and screen use. Patients comparing prices should make sure they are comparing the same coating level, not just asking whether anti-reflective is covered.\n\nAnti-reflective coating is especially common for progressive lenses, high index lenses, and people bothered by glare. It can also improve the appearance of glasses by reducing reflections on the lens surface. Before ordering, ask for the lens estimate with each enhancement listed separately. That makes it clear whether VSP is paying, discounting, or not contributing to the coating. The right choice should balance visual benefit, durability, and budget.",
      relatedQuestions: [
        "does-vsp-cover-progressive-lenses",
        "what-does-vsp-usually-cover",
        "how-do-vsp-copays-work",
        "can-i-use-vsp-for-prescription-sunglasses",
      ],
      tags: ["anti-reflective coating", "lens enhancements", "glare"],
      relatedCategorySlugs: ["coverage-questions", "frames"],
    },
    {
      slug: "can-i-use-vsp-out-of-network",
      question: "Can I use VSP out of network?",
      shortAnswer:
        "Many VSP plans allow out-of-network use, but reimbursement is usually lower and requires the patient to pay upfront and submit a claim. In-network providers typically verify benefits and apply coverage at the time of service. Patients should compare in-network costs with out-of-network reimbursement before assuming the cheaper or preferred option is obvious.",
      longAnswer:
        "VSP may offer out-of-network benefits, but they usually work differently from in-network benefits. With an in-network provider, the office can often verify eligibility, apply allowances, and collect the remaining patient responsibility. With an out-of-network provider, the patient may pay the full amount first and submit paperwork for reimbursement.\n\nThe reimbursement amount may be lower than the in-network value. It may also be split by service: one amount for the exam, another for frames, another for lenses, and another for contacts. Some upgrades may not reimburse at the same level. Processing time and documentation requirements can also vary.\n\nOut-of-network use can still make sense if a patient has a preferred doctor or needs a service not available in network. The key is to know the numbers before care or purchase. Ask VSP what the out-of-network reimbursement is for each item, and ask the provider for an itemized receipt. If the difference is small, choice may matter more than savings. If the difference is large, an in-network provider may produce a better total cost.",
      relatedQuestions: [
        "how-do-i-find-a-vsp-eye-doctor",
        "what-does-vsp-usually-cover",
        "how-do-i-check-my-vsp-eligibility",
        "how-do-vsp-copays-work",
      ],
      tags: ["out of network", "reimbursement", "claims"],
      relatedCategorySlugs: ["out-of-network", "coverage-questions"],
    },
    {
      slug: "how-do-i-find-a-vsp-eye-doctor",
      question: "How do I find a VSP eye doctor?",
      shortAnswer:
        "You can usually find a VSP eye doctor through the VSP provider search, your employer benefits portal, or by asking the eye care office to verify participation. Before scheduling, confirm that the doctor or location is in network for your specific plan. Network status can vary by provider, office location, plan type, and service.",
      longAnswer:
        "Finding a VSP eye doctor is usually straightforward, but it is worth confirming details before the appointment. The VSP provider search can show participating doctors and offices. Employers may also link to a benefits portal. Many eye care offices can check participation if you provide the member information needed to verify benefits.\n\nDo not rely only on a general statement that an office takes VSP. Some offices participate with certain plan types but not others. A doctor may be in network at one location and not another. Retail optical locations and independent practices may also handle benefits differently. If you need specific services, such as contact lens fitting, pediatric care, medical eye visits, or specialty lenses, ask whether those services are available before booking.\n\nThe most useful call script is simple: I have VSP, can you verify whether this doctor and location are in network for my plan, and can you check my exam, frame, lens, and contact lens benefits? That prevents confusion between network participation and actual eligibility. Once verified, ask what to bring: insurance details, ID, current glasses, contact lens boxes, and any medical insurance card in case the visit becomes medical.",
      relatedQuestions: [
        "can-i-use-vsp-out-of-network",
        "how-do-i-check-my-vsp-eligibility",
        "does-vsp-cover-medical-eye-problems",
        "what-does-vsp-usually-cover",
      ],
      tags: ["provider search", "in network", "eligibility"],
      relatedCategorySlugs: ["coverage-questions", "out-of-network"],
    },
    {
      slug: "does-vsp-cover-medical-eye-problems",
      question: "Does VSP cover medical eye problems?",
      shortAnswer:
        "VSP is usually for routine vision benefits, not medical eye problems. Symptoms such as eye pain, infection, sudden vision changes, diabetic eye disease, glaucoma, or dry eye treatment may need medical insurance. Some visits begin as routine but become medical if a problem is evaluated. Patients should bring both vision and medical insurance cards.",
      longAnswer:
        "VSP generally supports routine vision care: checking vision, updating glasses or contact lens prescriptions, and helping with eyewear benefits. Medical eye problems are different. Redness, pain, flashes, floaters, infections, injuries, diabetic eye disease, glaucoma monitoring, cataract evaluations, and dry eye treatment often fall under medical insurance rather than vision benefits.\n\nThis can surprise patients because both visits happen at an eye doctor's office. The difference is the reason for the visit and what is diagnosed or treated. A routine exam asks, in part, what prescription helps you see clearly. A medical eye visit evaluates a symptom, disease, injury, or ongoing condition.\n\nSome appointments include both routine and medical elements. For example, a patient may schedule a routine exam but also report new flashes and floaters. The doctor may need to perform a medical evaluation, and billing may change accordingly. That is not a trick; it reflects what care was actually provided.\n\nPatients should bring both vision and medical insurance cards and describe symptoms clearly when scheduling. If the concern is urgent, do not wait for routine VSP eligibility. Medical insurance may be the more appropriate route, and timely care matters more than preserving a vision benefit.",
      relatedQuestions: [
        "what-does-vsp-usually-cover",
        "how-do-i-find-a-vsp-eye-doctor",
        "how-do-vsp-copays-work",
        "can-vsp-cover-an-eye-exam-and-glasses-in-the-same-year",
      ],
      tags: ["medical vs vision", "routine eye exam", "medical eye care"],
      relatedCategorySlugs: ["medical-vs-vision", "coverage-questions"],
    },
    {
      slug: "can-vsp-benefits-be-used-online",
      question: "Can VSP benefits be used online?",
      shortAnswer:
        "Some VSP benefits can be used online, but the options depend on the plan, retailer, and product. Online ordering may work for glasses or contacts through approved channels, while some services still require an in-person exam or fitting. Patients should confirm whether online use applies in network, out of network, by reimbursement, or through a specific VSP-supported store.",
      longAnswer:
        "VSP benefits may be usable online, but online use is not identical across plans. Some patients can apply benefits directly through approved online retailers. Others may need to pay upfront and submit an out-of-network claim. Some plans limit where benefits can be used or treat online orders differently from in-office purchases.\n\nContacts are often easier to reorder online if the prescription is current and the exact prescribed brand is available. Glasses can be more complicated because frame fit, lens measurements, progressive lens placement, coatings, and adjustments affect the result. A simple single-vision pair may be more suitable for online ordering than complex progressives or high prescriptions.\n\nPatients should avoid assuming that an online checkout showing a discount equals the best use of VSP. Compare final cost, return policies, prescription accuracy, measurement needs, and whether the purchase uses up your materials benefit. If the order involves progressives, children's glasses, strong prescriptions, or first-time contact lenses, in-person support may be worth more than convenience. The safest next step is to verify online benefit rules before placing the order.",
      relatedQuestions: [
        "can-i-use-vsp-out-of-network",
        "does-vsp-cover-contact-lenses",
        "does-vsp-cover-frames",
        "how-do-i-check-my-vsp-eligibility",
      ],
      tags: ["online benefits", "online glasses", "online contacts"],
      relatedCategorySlugs: ["coverage-questions", "out-of-network", "contacts"],
    },
    {
      slug: "can-i-use-vsp-for-prescription-sunglasses",
      question: "Can I use VSP for prescription sunglasses?",
      shortAnswer:
        "VSP may help with prescription sunglasses if the plan allows the frame and lens benefits to be used that way. The final cost depends on frame allowance, sunglass tint or polarization, lens material, prescription strength, and whether the patient also needs regular glasses. Patients should compare using benefits on everyday glasses versus sunglasses.",
      longAnswer:
        "Prescription sunglasses can often be purchased with vision benefits, but the exact VSP contribution depends on the plan and the order. The frame allowance may apply to sunglass frames, and lens benefits may apply to prescription sunglass lenses. Tint, polarization, mirror coatings, progressives, and high index materials may add costs.\n\nThe bigger decision is strategic. If you have one materials benefit for the year, using it on sunglasses may leave less coverage for everyday glasses or contacts. For someone who already has current everyday glasses, using VSP for prescription sunglasses may be a smart choice. For someone whose main glasses are outdated, everyday eyewear may be the priority.\n\nPrescription sunglasses are especially useful for driving, outdoor work, sports, light sensitivity, and post-dilation comfort. They can also be made as progressives, depending on the prescription and frame. Before ordering, ask for an estimate that separates frame allowance, lens coverage, tint or polarization, and upgrades. Then compare that with the cost of regular glasses. VSP can help, but the best use of the benefit depends on what pair will matter most over the next year.",
      relatedQuestions: [
        "does-vsp-cover-frames",
        "does-vsp-cover-progressive-lenses",
        "can-vsp-cover-an-eye-exam-and-glasses-in-the-same-year",
        "what-is-a-vsp-frame-allowance",
      ],
      tags: ["prescription sunglasses", "frame allowance", "lens options"],
      relatedCategorySlugs: ["frames", "coverage-questions"],
    },
    {
      slug: "what-is-a-vsp-frame-allowance",
      question: "What is a VSP frame allowance?",
      shortAnswer:
        "A VSP frame allowance is the amount the plan contributes toward eligible eyeglass frames. If the frame price is higher than the allowance, the patient typically pays the difference, sometimes with an added discount. The allowance may renew on a schedule and may not cover lenses or upgrades, which are calculated separately.",
      longAnswer:
        "A frame allowance is a dollar amount that helps pay for eyeglass frames. For example, if a plan has a frame allowance and the chosen frame costs more than that amount, the patient pays the difference. If the frame costs less, the unused amount may not convert to cash or transfer to other services. The exact rules depend on the plan.\n\nFrame allowance is separate from lens coverage. A patient can choose a frame within allowance and still have costs for progressive lenses, high index material, anti-reflective coating, transitions, or other enhancements. That is why the final glasses total can be higher than expected even when the frame benefit is strong.\n\nThe allowance may also interact with frame brands, provider network, sales, and renewal timing. Some plans offer extra savings on certain frame lines. Others allow the benefit once every 12 or 24 months. Patients should ask when the frame benefit renews and whether the selected frame is eligible. A clear estimate should show the retail frame price, VSP allowance, any discount, and final patient cost. That makes the benefit understandable before the order is placed.",
      relatedQuestions: [
        "does-vsp-cover-frames",
        "can-i-use-vsp-for-prescription-sunglasses",
        "how-often-can-i-use-vsp-benefits",
        "how-do-vsp-copays-work",
      ],
      tags: ["frame allowance", "eyeglass frames", "out of pocket"],
      relatedCategorySlugs: ["frames", "coverage-questions"],
    },
    {
      slug: "what-is-a-vsp-contact-lens-allowance",
      question: "What is a VSP contact lens allowance?",
      shortAnswer:
        "A VSP contact lens allowance is the amount the plan contributes toward contact lens materials. The patient pays any cost above that amount. The allowance may apply instead of glasses benefits during the same period, and fitting or evaluation fees may be separate. Daily, toric, multifocal, and specialty contacts can produce different final costs.",
      longAnswer:
        "A contact lens allowance is a set contribution toward contact lens materials. It helps reduce the cost of boxes of lenses, but it does not mean every contact lens order is fully covered. A year supply of daily lenses, toric lenses, or multifocal lenses may exceed the allowance. A smaller supply may cost less upfront but may not be the best annual value if rebates apply.\n\nThe contact lens evaluation is often separate from the material allowance. That evaluation checks fit, comfort, movement, prescription accuracy, and eye health. Some plans reduce the fitting fee; others do not. Specialty or medically necessary contacts can follow different rules.\n\nPatients should ask whether using the contact allowance replaces the glasses materials benefit. Many plans make contacts and glasses an either-or decision for the benefit period. If you need both, ask for two estimates: one using insurance for contacts and one using it for glasses. The best choice depends on which item has the higher cost, which you use more often, and whether you already have usable backup glasses.",
      relatedQuestions: [
        "does-vsp-cover-contact-lenses",
        "can-vsp-benefits-be-split-between-glasses-and-contacts",
        "what-does-vsp-usually-cover",
        "how-do-vsp-copays-work",
      ],
      tags: ["contact lens allowance", "contact lens costs", "vsp contacts"],
      relatedCategorySlugs: ["contacts", "coverage-questions"],
    },
    {
      slug: "can-vsp-benefits-be-split-between-glasses-and-contacts",
      question: "Can VSP benefits be split between glasses and contacts?",
      shortAnswer:
        "Sometimes, but many VSP plans require patients to choose how to use the materials benefit during a benefit period. Contacts may replace the glasses lens and frame benefit, or vice versa. Some plans allow partial options or discounts after the main benefit is used. Patients should request estimates for both scenarios before deciding.",
      longAnswer:
        "Splitting VSP benefits between glasses and contacts depends on the plan. A common structure lets the patient use the main materials benefit for either glasses or contact lenses during the benefit period. If contacts are chosen, the frame and lens allowance may not also be fully available. If glasses are chosen, the contact lens allowance may not be available until the next benefit period.\n\nThat structure can be frustrating for patients who need both. Contact lens wearers still need backup glasses, and glasses wearers may want contacts for sports or events. Some plans offer additional discounts after the primary benefit is used, but discounts are different from full coverage.\n\nThe practical solution is to compare the annual cost both ways. If contacts are expensive and glasses are simple, using benefits for contacts may save more. If progressives or premium glasses are the larger expense, using benefits for glasses may be smarter. Also consider safety: contact lens wearers should have usable backup glasses even if insurance is used for contacts. A good office can show both estimates so the patient can choose based on real numbers instead of guesswork.",
      relatedQuestions: [
        "does-vsp-cover-contact-lenses",
        "what-is-a-vsp-contact-lens-allowance",
        "can-vsp-cover-an-eye-exam-and-glasses-in-the-same-year",
        "does-vsp-cover-frames",
      ],
      tags: ["split benefits", "glasses vs contacts", "materials benefit"],
      relatedCategorySlugs: ["contacts", "frames", "coverage-questions"],
    },
    {
      slug: "does-vsp-cover-retinal-imaging",
      question: "Does VSP cover retinal imaging?",
      shortAnswer:
        "VSP coverage for retinal imaging varies. Some plans cover it, some discount it, and some leave it as an optional out-of-pocket screening. Retinal imaging may also be billed differently when it is medically necessary for diabetes, glaucoma, retinal symptoms, or disease monitoring. Patients should ask whether imaging is routine, optional, or medical in their situation.",
      longAnswer:
        "Retinal imaging is a photograph or scan that helps document the back of the eye. In routine vision care, it may be offered as an optional screening or baseline record. VSP coverage for that screening depends on the plan. Some plans contribute, some provide a discount, and some do not cover it as part of the routine exam.\n\nMedical necessity changes the conversation. If imaging is needed because of diabetic eye disease, glaucoma suspicion, retinal symptoms, high-risk medication use, or another medical concern, medical insurance may be more appropriate than VSP. The same technology can be used in different billing contexts depending on why it is performed.\n\nPatients should ask two questions: Why is imaging recommended for me, and how will it be billed? If it is optional routine screening, ask the cost and decide whether the added documentation is worth it. If it is medically needed, ask whether medical insurance applies. Retinal imaging can be valuable, but coverage clarity helps patients separate clinical value from benefit confusion.",
      relatedQuestions: [
        "does-vsp-cover-medical-eye-problems",
        "what-does-vsp-usually-cover",
        "how-do-vsp-copays-work",
        "can-vsp-cover-an-eye-exam-and-glasses-in-the-same-year",
      ],
      tags: ["retinal imaging", "medical billing", "screening"],
      relatedCategorySlugs: ["medical-vs-vision", "coverage-questions"],
    },
    {
      slug: "how-do-vsp-copays-work",
      question: "How do VSP copays work?",
      shortAnswer:
        "VSP copays are fixed patient costs tied to specific benefits, such as an exam copay or materials copay. Copays are separate from costs above allowances and optional upgrades. A patient may pay an exam copay, a materials copay, and additional amounts for frames, contacts, progressive lenses, coatings, or other enhancements.",
      longAnswer:
        "A VSP copay is the amount the patient pays for a covered service or benefit category. For example, a plan may have one copay for the routine exam and another for materials. Paying the copay does not always mean every eyewear option is fully covered. It means the plan benefit has been applied according to its rules.\n\nAllowances and upgrades are separate from copays. If your frame costs more than the frame allowance, you pay the difference. If you choose premium progressive lenses, high index material, anti-reflective coating, transitions, or a contact lens supply above the allowance, those costs may be added after the copay. This is why patients can have VSP and still owe a balance.\n\nThe clearest estimate lists each piece separately: exam copay, materials copay, frame allowance, lens coverage, contact lens allowance, upgrades, discounts, and final patient responsibility. Ask for that breakdown before ordering. Copays are not bad news; they make benefits predictable. The confusion happens when copays, allowances, and upgrades are blended together without explanation.",
      relatedQuestions: [
        "what-does-vsp-usually-cover",
        "what-is-a-vsp-frame-allowance",
        "what-is-a-vsp-contact-lens-allowance",
        "does-vsp-cover-progressive-lenses",
      ],
      tags: ["copays", "patient cost", "benefit estimate"],
      relatedCategorySlugs: ["coverage-questions"],
    },
  ],
);

const adultExamsHub = buildHub(
  {
    id: "adult-exams",
    route: "/knowledge/eye-exams/adult-exams",
    title: "Adult Exams",
    topicSlug: "eye-exams",
    topicName: "Eye Exams",
    categorySlug: "adult-exams",
    categoryName: "Adult Exams",
    overview:
      "The Adult Exams pilot hub tests care-expectation intent: what happens during an exam, what patients should bring, and why routine visits can reveal more than a glasses prescription.",
    relatedCategorySlugs: ["dilation", "costs", "frequency", "vision-screenings", "diabetic-exams", "senior-exams"],
  },
  [
    {
      slug: "what-happens-during-an-adult-eye-exam",
      question: "What happens during an adult eye exam?",
      shortAnswer:
        "An adult eye exam usually checks vision, prescription needs, eye focusing, eye pressure, eye movement, and the health of the front and back of the eyes. The visit may include refraction, microscope evaluation, retinal evaluation, and discussion of symptoms or medical history. The goal is both clear vision and early detection of eye conditions.",
      longAnswer:
        "An adult eye exam is more than reading letters on a chart. The visit usually starts with history: vision concerns, headaches, screen strain, medications, health conditions, family history, glasses, contacts, and previous eye problems. That context helps the doctor decide which tests matter most.\n\nThe exam typically checks how clearly each eye sees, whether a new glasses prescription is needed, how the eyes focus and work together, and whether eye pressure is in a healthy range. The doctor may use a microscope to examine the eyelids, cornea, tear film, lens, and other front-eye structures. The retina and optic nerve may be evaluated with dilation, imaging, or both depending on the patient and findings.\n\nAdults often come in for a prescription update, but the health portion is just as important. Eye exams can reveal cataracts, glaucoma risk, diabetic changes, dry eye, inflammation, retinal problems, and effects from medications or systemic disease. A good exam ends with a clear plan: prescription update if needed, treatment recommendations, follow-up timing, and whether anything should be monitored or referred.",
      relatedQuestions: [
        "what-tests-are-included-in-a-comprehensive-eye-exam",
        "do-i-need-an-eye-exam-if-i-see-well",
        "what-should-i-bring-to-an-eye-exam",
        "do-adults-need-dilation-at-every-eye-exam",
      ],
      tags: ["adult eye exam", "comprehensive exam", "eye health"],
      relatedCategorySlugs: ["dilation", "frequency"],
    },
    {
      slug: "how-long-does-a-routine-eye-exam-take",
      question: "How long does a routine eye exam take?",
      shortAnswer:
        "A routine adult eye exam often takes about 30 to 60 minutes, depending on testing, dilation, contact lens needs, medical history, and whether eyewear is selected afterward. A simple prescription check may be shorter, while first-time visits, complex symptoms, dilation, retinal imaging, or contact lens evaluations can take longer.",
      longAnswer:
        "Most adult eye exams fit into a 30- to 60-minute window, but the exact time depends on what the visit needs to accomplish. A patient with a stable prescription and no symptoms may move through testing quickly. A patient with diabetes, eye pain, new floaters, dry eye symptoms, contact lens concerns, or a first exam in years may need more time.\n\nSeveral steps affect visit length: intake history, vision testing, refraction, eye pressure measurement, eye health evaluation, dilation or retinal imaging, and discussion of results. Dilation can add waiting time because drops need time to work. Choosing glasses or contact lenses after the medical portion can also extend the appointment.\n\nPatients can make the visit smoother by bringing current glasses, contact lens boxes, medication lists, insurance information, and a clear description of symptoms. If you are scheduling during work or before driving, ask whether dilation is likely. A good office can estimate timing, but the exam should be long enough to answer the clinical question, not just short enough to fit the calendar.",
      relatedQuestions: [
        "what-happens-during-an-adult-eye-exam",
        "can-i-drive-after-a-routine-eye-exam",
        "what-should-i-bring-to-an-eye-exam",
        "should-i-wear-contacts-to-my-eye-exam",
      ],
      tags: ["exam length", "appointment planning", "routine exam"],
      relatedCategorySlugs: ["costs", "dilation"],
    },
    {
      slug: "do-i-need-an-eye-exam-if-i-see-well",
      question: "Do I need an eye exam if I see well?",
      shortAnswer:
        "Yes, adults can benefit from eye exams even when vision seems fine. Some eye diseases develop slowly or without early symptoms, and a person can have clear central vision while still having glaucoma risk, retinal changes, dry eye, eye pressure issues, or early cataracts. Exams also establish a baseline for future comparison.",
      longAnswer:
        "Seeing well is important, but it does not prove the eyes are healthy. Many eye conditions begin quietly. Glaucoma can affect peripheral vision before a patient notices. Diabetic eye disease can start before obvious blur. Early cataracts, retinal findings, dry eye, medication effects, and blood pressure-related changes may be found during a health evaluation even when the eye chart looks normal.\n\nAn eye exam also creates a baseline. If the doctor knows what your optic nerve, retina, pressure, and prescription looked like before symptoms, future changes are easier to interpret. That is especially useful for adults with family history of glaucoma or macular degeneration, diabetes, high blood pressure, autoimmune disease, high prescriptions, or medication use that can affect the eyes.\n\nRoutine exams also catch everyday issues that people normalize: eye strain, night driving difficulty, dryness, fluctuating focus, and mild prescription changes. You do not need to wait until vision is bad to schedule care. The best time to find many eye problems is before they are obvious to the patient.",
      relatedQuestions: [
        "can-an-eye-exam-find-health-problems",
        "how-often-should-adults-get-eye-exams",
        "can-eye-exams-detect-glaucoma-early",
        "is-an-eye-exam-different-from-a-vision-test",
      ],
      tags: ["preventive eye care", "asymptomatic eye disease", "routine exams"],
      relatedCategorySlugs: ["frequency", "vision-screenings"],
    },
    {
      slug: "can-an-eye-exam-find-health-problems",
      question: "Can an eye exam find health problems?",
      shortAnswer:
        "An eye exam can sometimes reveal signs related to health problems such as diabetes, high blood pressure, inflammatory disease, medication effects, or neurologic concerns. It does not replace a primary care exam, but the eyes provide visible clues about blood vessels, nerves, inflammation, and tissue health that may prompt medical follow-up.",
      longAnswer:
        "The eyes are one of the few places where small blood vessels and nerve tissue can be examined directly. During an eye exam, doctors may see findings that suggest diabetes, high blood pressure, cholesterol-related changes, inflammatory disease, medication side effects, or neurologic concerns. These findings do not always diagnose a systemic condition by themselves, but they can be important clues.\n\nFor example, bleeding or swelling in the retina can be associated with diabetes or vascular disease. Optic nerve appearance can raise concern for glaucoma or neurologic issues. Dryness, inflammation, or pupil findings can connect with medications or broader health conditions. Sudden vision changes can sometimes signal urgent medical problems.\n\nAn eye exam should not be treated as a substitute for primary care, bloodwork, or disease management. Instead, it is a useful window into how health conditions may be affecting the eyes. If the eye doctor sees something concerning, they may recommend follow-up with a primary care doctor, endocrinologist, neurologist, retina specialist, or another provider. That coordination is part of why routine eye care matters for adults.",
      relatedQuestions: [
        "can-eye-exams-detect-high-blood-pressure",
        "can-eye-exams-detect-diabetes",
        "why-does-my-eye-doctor-ask-about-medications",
        "what-tests-are-included-in-a-comprehensive-eye-exam",
      ],
      tags: ["systemic health", "retina", "medical findings"],
      relatedCategorySlugs: ["diabetic-exams", "senior-exams"],
    },
    {
      slug: "what-should-i-bring-to-an-eye-exam",
      question: "What should I bring to an eye exam?",
      shortAnswer:
        "Bring your current glasses, contact lens boxes or prescription, insurance cards, medication list, medical history, and any eye drops you use. It also helps to bring sunglasses if dilation may be performed. If you have symptoms, note when they started, what triggers them, and whether they affect one eye or both.",
      longAnswer:
        "The most useful items for an eye exam are the ones that help the doctor understand your current vision and eye health. Bring your current glasses, even if they are old or not working well. If you wear contacts, bring the boxes or a photo of the lens brand and prescription. Contact lens details matter because power alone does not identify the lens.\n\nBring vision insurance and medical insurance cards. Routine exams may use vision benefits, while symptoms or medical diagnoses may involve medical insurance. A medication list is also important because many medicines affect dryness, focusing, pupils, eye pressure, or retinal health. Include eye drops, supplements, and major health conditions.\n\nIf you are coming in for a specific issue, write down the timeline. Is the blur constant or intermittent? Is pain sharp or dull? Does it happen with screens, driving, reading, contacts, or allergies? Are both eyes involved? Clear symptom details can shorten guesswork. If dilation is possible, bring sunglasses and consider whether you need someone to drive. Good preparation helps the visit focus on decisions instead of missing information.",
      relatedQuestions: [
        "should-i-wear-contacts-to-my-eye-exam",
        "can-i-drive-after-a-routine-eye-exam",
        "why-does-my-eye-doctor-ask-about-medications",
        "how-do-i-prepare-for-my-first-eye-exam-in-years",
      ],
      tags: ["exam preparation", "what to bring", "patient history"],
      relatedCategorySlugs: ["dilation", "costs"],
    },
    {
      slug: "should-i-wear-contacts-to-my-eye-exam",
      question: "Should I wear contacts to my eye exam?",
      shortAnswer:
        "If you are having a contact lens evaluation, wearing your contacts can help the doctor assess fit and performance, unless the office tells you otherwise. Also bring your glasses and contact lens boxes. If your eyes are painful, red, or irritated, you may be asked to remove lenses or come in wearing glasses.",
      longAnswer:
        "For a routine glasses-only exam, contacts may not be necessary. For a contact lens exam, wearing your current lenses can be helpful because the doctor can see how they fit after real wear. Lens movement, dryness, deposits, rotation, and comfort complaints are often easier to understand when the lens is on the eye.\n\nBring your contact lens boxes or prescription details. The doctor needs the brand, base curve, diameter, power, and any astigmatism or multifocal parameters. If the lenses are uncomfortable, note how long you wore them before symptoms began. That information helps separate lens fit problems from dry eye, allergy, or overwear.\n\nThere are exceptions. If your eye is red, painful, light sensitive, or has discharge, it may be safer to wear glasses and bring the lenses or packaging separately. If you are a new wearer, the office may give specific instructions. When in doubt, call ahead. A good contact lens exam is not just a prescription update; it checks whether the lens is still healthy and practical for your eyes.",
      relatedQuestions: [
        "what-should-i-bring-to-an-eye-exam",
        "can-i-get-glasses-and-contacts-checked-at-the-same-exam",
        "can-dry-eye-be-diagnosed-during-an-exam",
        "what-happens-during-an-adult-eye-exam",
      ],
      tags: ["contact lens exam", "exam preparation", "lens fit"],
      relatedCategorySlugs: ["costs", "dilation"],
    },
    {
      slug: "can-i-drive-after-a-routine-eye-exam",
      question: "Can I drive after a routine eye exam?",
      shortAnswer:
        "Many people can drive after a routine eye exam, but dilation can make near vision blurry and light sensitivity stronger for several hours. Whether driving feels safe depends on your eyes, the drops used, lighting, prescription, and comfort. Bring sunglasses, and arrange a driver if you know dilation affects you strongly.",
      longAnswer:
        "Driving after an eye exam depends mostly on whether your pupils are dilated and how you personally respond. Dilation lets the doctor see more of the retina, but it also allows more light into the eye and can blur near vision. Distance vision may be acceptable for many patients, but glare and brightness can make driving uncomfortable.\n\nSome people drive after dilation with sunglasses and no problem. Others feel unsafe, especially in bright sun, heavy traffic, unfamiliar areas, or if they already have light sensitivity, cataracts, or a strong prescription. First-time dilation is harder to predict, so planning conservatively is reasonable.\n\nIf the visit is routine and dilation is not performed, driving is usually unaffected. Retinal imaging may be offered in some offices, but it does not always replace dilation. Ask when scheduling whether dilation is likely and how long effects may last. Bring sunglasses even on cloudy days. If you need to return to work, read fine print, or drive a long distance, discuss timing with the office before the drops are placed.",
      relatedQuestions: [
        "do-adults-need-dilation-at-every-eye-exam",
        "how-long-does-a-routine-eye-exam-take",
        "what-should-i-bring-to-an-eye-exam",
        "what-tests-are-included-in-a-comprehensive-eye-exam",
      ],
      tags: ["dilation", "driving", "exam planning"],
      relatedCategorySlugs: ["dilation"],
    },
    {
      slug: "what-tests-are-included-in-a-comprehensive-eye-exam",
      question: "What tests are included in a comprehensive eye exam?",
      shortAnswer:
        "A comprehensive eye exam may include visual acuity, refraction, eye pressure, pupil testing, eye movement, focusing, peripheral vision screening, microscope evaluation, and retinal or optic nerve evaluation. The exact tests depend on age, symptoms, medical history, prescription, and risk factors. Contact lens testing may be added separately.",
      longAnswer:
        "A comprehensive eye exam is a collection of tests that answer two broad questions: how well do you see, and how healthy are the eyes? Visual acuity checks clarity. Refraction determines whether glasses or prescription changes are needed. Eye movement and focusing tests look at how the eyes work together. Eye pressure helps assess glaucoma risk.\n\nThe health evaluation usually includes a microscope exam of the eyelids, cornea, tear film, iris, lens, and other front-eye structures. The back of the eye may be evaluated through dilation, retinal imaging, optic nerve assessment, or other testing. Some patients also need visual field screening, OCT imaging, color vision testing, or dry eye evaluation.\n\nNot every patient needs every test at every visit. A healthy adult with no symptoms may have a simpler exam than someone with diabetes, glaucoma risk, flashes, eye pain, or medication concerns. A contact lens wearer may need additional fit and corneal checks. The value of a comprehensive exam is that it can be tailored. It is not a single test; it is a structured review of vision, function, and eye health.",
      relatedQuestions: [
        "what-happens-during-an-adult-eye-exam",
        "can-an-eye-exam-find-health-problems",
        "do-adults-need-dilation-at-every-eye-exam",
        "is-an-eye-exam-different-from-a-vision-test",
      ],
      tags: ["comprehensive eye exam", "eye tests", "refraction"],
      relatedCategorySlugs: ["dilation", "vision-screenings"],
    },
    {
      slug: "how-often-should-adults-get-eye-exams",
      question: "How often should adults get eye exams?",
      shortAnswer:
        "Many adults benefit from an eye exam every one to two years, but the right timing depends on age, prescription, symptoms, contact lens wear, diabetes, high blood pressure, family history, medications, and eye disease risk. Contact lens wearers and patients with medical conditions often need yearly or more frequent care.",
      longAnswer:
        "There is no single interval that fits every adult. A healthy adult with stable vision and no risk factors may be advised to return every one to two years. Someone who wears contact lenses, has diabetes, high blood pressure, glaucoma risk, strong prescriptions, eye disease, or new symptoms may need annual exams or closer follow-up.\n\nAge also changes the conversation. Adults over 40 may notice near-vision changes and may have increasing risk for glaucoma, dry eye, and other conditions. Older adults may need more frequent monitoring for cataracts, macular degeneration, diabetic changes, or medication effects.\n\nSymptoms override routine timing. Blurry vision, eye pain, flashes, new floaters, sudden vision loss, double vision, redness with pain, or light sensitivity should not wait for the next scheduled routine exam. Those concerns may need urgent or medical evaluation.\n\nThe best exam frequency is personalized after the doctor knows your eyes and health history. Ask at the end of the visit: when should I come back, and what symptoms should make me call sooner? That turns a general recommendation into a practical plan.",
      relatedQuestions: [
        "do-i-need-an-eye-exam-if-i-see-well",
        "can-eye-exams-detect-diabetes",
        "can-eye-exams-detect-glaucoma-early",
        "should-i-schedule-an-exam-for-blurry-vision",
      ],
      tags: ["exam frequency", "preventive care", "adult eye health"],
      relatedCategorySlugs: ["frequency", "diabetic-exams", "senior-exams"],
    },
    {
      slug: "can-eye-exams-detect-high-blood-pressure",
      question: "Can eye exams detect high blood pressure?",
      shortAnswer:
        "An eye exam can sometimes show blood vessel changes that are associated with high blood pressure, but it does not replace blood pressure measurement or primary care. Retinal findings may suggest that blood pressure has affected small vessels. If concerning changes are seen, the eye doctor may recommend medical follow-up.",
      longAnswer:
        "The retina contains small blood vessels that can show signs of vascular stress. During an eye exam, a doctor may notice narrowing, bleeding, swelling, or other vessel changes that can be associated with high blood pressure. These findings do not always mean a patient currently has high blood pressure, but they can be important clues.\n\nEye exams are not the main way to diagnose hypertension. Blood pressure should be measured directly and managed by a primary care clinician or appropriate medical provider. However, retinal findings can show how blood vessel health is affecting the eye and may prompt a patient to seek medical evaluation sooner.\n\nHigh blood pressure can also interact with other eye conditions, including diabetic eye disease, retinal vein occlusion risk, and optic nerve concerns. If the eye doctor sees suspicious changes, they may send a report to the primary care doctor or recommend timely follow-up. Patients with known hypertension should mention it during the exam and bring medication information. Good blood pressure control protects more than the eyes, but the eyes can reveal when small vessels may be under stress.",
      relatedQuestions: [
        "can-an-eye-exam-find-health-problems",
        "can-eye-exams-detect-diabetes",
        "why-does-my-eye-doctor-ask-about-medications",
        "what-tests-are-included-in-a-comprehensive-eye-exam",
      ],
      tags: ["high blood pressure", "retina", "systemic health"],
      relatedCategorySlugs: ["diabetic-exams", "senior-exams"],
    },
    {
      slug: "can-eye-exams-detect-diabetes",
      question: "Can eye exams detect diabetes?",
      shortAnswer:
        "An eye exam can reveal retinal changes that suggest diabetes or show how known diabetes is affecting the eyes, but it does not replace blood sugar testing or medical diagnosis. Diabetic eye changes can occur before vision feels different, so regular dilated or retinal exams are important for people with diabetes.",
      longAnswer:
        "Eye exams can sometimes reveal signs that are associated with diabetes, especially in the retina. Small areas of bleeding, leaking, swelling, or abnormal blood vessel changes may suggest diabetic eye disease. These findings can appear before a patient notices vision loss, which is why eye care is an important part of diabetes management.\n\nAn eye doctor does not diagnose diabetes based only on an eye exam. Diabetes is diagnosed through medical evaluation and blood testing. But eye findings can prompt referral or communication with a primary care doctor. For patients already diagnosed with diabetes, the exam helps monitor whether blood sugar, blood pressure, and time with the disease are affecting the retina.\n\nA diabetic eye exam is often more detailed than a simple prescription check. Dilation, retinal imaging, OCT scans, or referral to a retina specialist may be needed depending on findings. If you have diabetes, tell the eye doctor your diagnosis, recent A1C if known, medications, and whether you have noticed vision changes. Stable vision does not always mean the retina is stable, so routine monitoring matters.",
      relatedQuestions: [
        "can-an-eye-exam-find-health-problems",
        "how-often-should-adults-get-eye-exams",
        "do-adults-need-dilation-at-every-eye-exam",
        "what-tests-are-included-in-a-comprehensive-eye-exam",
      ],
      tags: ["diabetes", "diabetic eye exam", "retina"],
      relatedCategorySlugs: ["diabetic-exams", "dilation"],
    },
    {
      slug: "why-does-my-eye-doctor-ask-about-medications",
      question: "Why does my eye doctor ask about medications?",
      shortAnswer:
        "Eye doctors ask about medications because many prescriptions and over-the-counter products can affect vision, dryness, pupils, focusing, eye pressure, bleeding risk, or retinal health. Medication history also helps explain symptoms and guides safe treatment choices. Bring a current list, including eye drops and supplements.",
      longAnswer:
        "Medication history matters because the eyes are sensitive to whole-body health and treatment. Some medications can worsen dry eye, affect focusing, change pupil size, increase light sensitivity, influence eye pressure, or have retinal side effects. Blood thinners, allergy medicines, acne medications, autoimmune treatments, steroids, and many other drugs can be relevant.\n\nThe eye doctor is not asking out of curiosity. The information can help explain symptoms such as blur, dryness, halos, headaches, or fluctuating vision. It also helps the doctor choose safe eye drops or decide whether certain findings need monitoring. If a medication is known to have potential eye effects, baseline testing or periodic follow-up may be recommended.\n\nPatients should bring a current medication list rather than trying to remember names during the visit. Include dosage if available, eye drops, supplements, and recent medication changes. Do not stop a medication because of an eye concern without speaking to the prescribing doctor. The eye exam can identify possible connections and coordinate care, but medication decisions should be made with the full medical picture.",
      relatedQuestions: [
        "what-should-i-bring-to-an-eye-exam",
        "can-an-eye-exam-find-health-problems",
        "can-eye-exams-detect-high-blood-pressure",
        "can-dry-eye-be-diagnosed-during-an-exam",
      ],
      tags: ["medications", "dry eye", "medical history"],
      relatedCategorySlugs: ["costs", "senior-exams"],
    },
    {
      slug: "is-an-eye-exam-different-from-a-vision-test",
      question: "Is an eye exam different from a vision test?",
      shortAnswer:
        "Yes. A vision test usually checks how clearly you see, often with a chart or screening device. A comprehensive eye exam evaluates both vision and eye health. It can include prescription testing, eye pressure, focusing, eye movement, microscope evaluation, retinal assessment, and discussion of symptoms or medical risk factors.",
      longAnswer:
        "A vision test is usually a narrow screening. It may measure whether you can read a certain line on a chart or whether your vision meets a basic standard for school, work, or driving. That information can be useful, but it does not fully evaluate eye health or explain why vision may be blurry.\n\nA comprehensive eye exam is broader. It checks prescription needs, eye focusing, eye coordination, eye pressure, and the health of structures such as the cornea, lens, retina, and optic nerve. It also considers symptoms, medications, health conditions, family history, contact lens wear, and risk factors.\n\nThis difference matters because a person can pass a vision screening and still have eye disease, focusing problems, dry eye, early cataracts, retinal changes, or glaucoma risk. Screenings are designed to identify some people who need more care; they are not designed to replace that care. If you have symptoms, risk factors, or have not had a full exam in years, a comprehensive eye exam gives a much more complete picture than a vision test alone.",
      relatedQuestions: [
        "what-tests-are-included-in-a-comprehensive-eye-exam",
        "do-i-need-an-eye-exam-if-i-see-well",
        "what-happens-during-an-adult-eye-exam",
        "can-an-eye-exam-find-health-problems",
      ],
      tags: ["vision screening", "comprehensive eye exam", "eye health"],
      relatedCategorySlugs: ["vision-screenings", "frequency"],
    },
    {
      slug: "can-an-eye-exam-explain-headaches",
      question: "Can an eye exam explain headaches?",
      shortAnswer:
        "An eye exam can sometimes identify vision-related contributors to headaches, such as uncorrected prescription, eye strain, focusing problems, binocular vision issues, dry eye, or screen-related fatigue. Many headaches are not caused by the eyes, but an exam can rule in or rule out visual factors and guide next steps.",
      longAnswer:
        "Headaches can have many causes, and the eyes are only one possible contributor. An eye exam can check whether a prescription change, astigmatism, focusing difficulty, eye teaming problem, dry eye, or screen strain is adding stress. The doctor may ask when headaches occur, where they are located, whether they happen with reading or computer work, and whether vision changes happen at the same time.\n\nVision-related headaches often follow patterns. They may worsen after near work, improve with breaks, show up with outdated glasses, or occur when the eyes struggle to focus together. Dry eye can also create discomfort around the eyes that patients describe as strain or headache.\n\nAn eye exam cannot diagnose every cause of headache. Migraines, sinus disease, blood pressure problems, medication effects, neurologic conditions, and stress can all play a role. But the exam can identify whether eye-related treatment is likely to help. If headaches are sudden, severe, associated with neurologic symptoms, or unlike prior headaches, medical care should not wait. For recurring headaches with visual strain, an eye exam is a reasonable part of the workup.",
      relatedQuestions: [
        "can-eye-strain-be-evaluated-during-an-exam",
        "why-did-my-glasses-prescription-change",
        "what-tests-are-included-in-a-comprehensive-eye-exam",
        "should-i-schedule-an-exam-for-blurry-vision",
      ],
      tags: ["headaches", "eye strain", "focusing"],
      relatedCategorySlugs: ["frequency", "vision-screenings"],
    },
    {
      slug: "do-adults-need-dilation-at-every-eye-exam",
      question: "Do adults need dilation at every eye exam?",
      shortAnswer:
        "Not every adult needs dilation at every exam, but many adults need it periodically or when risk factors, symptoms, or retinal concerns are present. Dilation gives the doctor a wider view of the retina and optic nerve. Diabetes, high prescriptions, flashes, floaters, eye disease risk, or reduced views can make dilation more important.",
      longAnswer:
        "Dilation is a tool, not a punishment or automatic requirement for every adult at every visit. Dilating drops enlarge the pupils so the doctor can see more of the retina and optic nerve. That wider view can reveal findings that may be missed through a small pupil, especially in the far peripheral retina.\n\nWhether dilation is needed depends on the patient. Diabetes, high blood pressure, high nearsightedness, family history of retinal disease, glaucoma risk, cataracts, new flashes, new floaters, trauma, or unexplained vision changes can make dilation important. Some offices use retinal imaging as part of the evaluation, but imaging may not fully replace dilation in every situation.\n\nThe downside is temporary blur and light sensitivity. Adults should ask why dilation is recommended and how long effects may last. If you cannot be dilated on a particular day because of driving or work, tell the office; the doctor may decide whether it can wait or should be scheduled separately. The decision should balance comfort, safety, and the need for a complete eye health view.",
      relatedQuestions: [
        "can-i-drive-after-a-routine-eye-exam",
        "can-eye-exams-detect-diabetes",
        "what-tests-are-included-in-a-comprehensive-eye-exam",
        "what-happens-during-an-adult-eye-exam",
      ],
      tags: ["dilation", "retina", "eye health"],
      relatedCategorySlugs: ["dilation", "diabetic-exams"],
    },
  ],
);

const progressiveLensesHub = buildHub(
  {
    id: "progressive-lenses",
    route: "/knowledge/glasses/progressive-lenses",
    title: "Progressive Lenses",
    topicSlug: "glasses",
    topicName: "Glasses & Lenses",
    categorySlug: "progressive-lenses",
    categoryName: "Progressive Lenses",
    overview:
      "The Progressive Lenses pilot hub tests product-decision intent: how the lens design works, what tradeoffs patients feel, and when premium designs, measurements, frames, or alternatives matter.",
    relatedCategorySlugs: ["anti-reflective", "high-index", "reading-glasses", "computer-glasses", "frames", "transitions"],
  },
  [
    {
      slug: "what-are-progressive-lenses",
      question: "What are progressive lenses?",
      shortAnswer:
        "Progressive lenses are no-line multifocal eyeglass lenses that provide distance, intermediate, and near vision in one pair of glasses. The top area is generally used for distance, the middle for computer or dashboard range, and the lower area for reading. They are often prescribed for presbyopia when near vision becomes harder after about age 40.",
      longAnswer:
        "Progressive lenses are designed to replace the need for separate distance glasses and reading glasses. Instead of having a visible line like a bifocal, the lens power changes gradually from distance correction near the top to reading correction near the bottom. Between those zones is an intermediate range that can help with computer screens, dashboards, shopping shelves, and other arm's-length tasks.\n\nThe benefit is convenience. One pair can handle most daily viewing distances without taking glasses on and off. The tradeoff is that the lens has areas of distortion toward the sides because of how the power changes. Patients learn to point their nose more directly at what they want to see and use the correct part of the lens.\n\nProgressives vary by design quality, frame fit, measurements, and prescription. A well-measured premium progressive can feel much easier than a poorly fit basic design. They are not perfect for every task, but for many adults with presbyopia, they are the most practical everyday glasses option.",
      relatedQuestions: [
        "how-do-progressive-lenses-work",
        "are-progressive-lenses-better-than-bifocals",
        "how-long-does-it-take-to-adjust-to-progressive-lenses",
        "why-do-progressive-lenses-feel-blurry-on-the-sides",
      ],
      tags: ["progressive lenses", "presbyopia", "multifocal glasses"],
      relatedCategorySlugs: ["reading-glasses", "computer-glasses"],
    },
    {
      slug: "how-do-progressive-lenses-work",
      question: "How do progressive lenses work?",
      shortAnswer:
        "Progressive lenses work by blending multiple prescriptions into one lens. Distance vision is usually positioned higher, near vision lower, and intermediate vision between them. As your eyes move through the lens, the focus changes smoothly. Clear vision depends on accurate measurements, frame fit, prescription design, and learning where to look for each distance.",
      longAnswer:
        "Progressive lenses work through a gradual change in lens power. The wearer looks through the upper portion for distance, lowers the eyes slightly for intermediate range, and looks farther down for reading. There is no visible dividing line because the prescription transitions smoothly through the lens.\n\nThat smooth transition creates the main advantage and the main compromise. The advantage is natural movement between distances. The compromise is peripheral distortion, especially in lower side areas. This is why progressives can feel strange at first when walking, using stairs, or glancing sideways. The clearest zones are arranged vertically, so head position matters.\n\nAccurate fitting is critical. The optical center, pupil height, frame tilt, wrap, and how the frame sits on the face all affect performance. A lens can be the right prescription but still feel wrong if the measurements or frame choice are poor. Modern digital progressive designs can customize these zones more precisely. Once patients understand that progressives are a guided viewing system rather than a uniform lens, adaptation usually makes more sense.",
      relatedQuestions: [
        "why-do-i-need-measurements-for-progressive-lenses",
        "what-is-the-difference-between-standard-and-digital-progressive-lenses",
        "why-is-my-reading-area-small-in-progressive-lenses",
        "can-progressive-lenses-fit-in-small-frames",
      ],
      tags: ["lens design", "progressive corridor", "measurements"],
      relatedCategorySlugs: ["frames", "high-index"],
    },
    {
      slug: "are-progressive-lenses-better-than-bifocals",
      question: "Are progressive lenses better than bifocals?",
      shortAnswer:
        "Progressive lenses are better for many people who want distance, intermediate, and near vision without a visible line. Bifocals can be better for patients who want a wider, simpler reading area and do not need much intermediate vision. The best choice depends on work tasks, adaptation, budget, prior lens experience, and how much computer vision matters.",
      longAnswer:
        "Progressives and bifocals solve a similar problem in different ways. Bifocals have two main zones: distance and near. The reading segment is visible and often provides a broad near area. Progressives have no visible line and include intermediate vision, which is useful for computers and everyday transitions between distances.\n\nProgressives usually look more modern and feel more flexible for daily life. They avoid the image jump that some people notice with bifocals and let the wearer move through distance, dashboard, computer, and reading ranges. The tradeoff is that progressives have side distortion and require adaptation.\n\nBifocals may still be the better choice for someone who struggled with progressives, needs a large reading area, does limited computer work, or prefers a clear separation between distance and near. Some people also use task-specific glasses for reading or computer work instead of trying to make one pair do everything. The right answer is not about which lens is universally better; it is about which lens matches the patient's visual day.",
      relatedQuestions: [
        "when-should-i-choose-bifocals-instead-of-progressives",
        "why-do-progressive-lenses-feel-blurry-on-the-sides",
        "are-premium-progressive-lenses-worth-it",
        "when-are-progressive-lenses-not-ideal-for-full-day-computer-work",
      ],
      tags: ["bifocals", "lens comparison", "presbyopia"],
      relatedCategorySlugs: ["reading-glasses", "computer-glasses"],
    },
    {
      slug: "why-do-progressive-lenses-feel-blurry-on-the-sides",
      question: "Why do progressive lenses feel blurry on the sides?",
      shortAnswer:
        "Progressive lenses feel blurry on the sides because the lens power changes from distance to reading, and that design creates peripheral distortion. The clearest vision is through the intended viewing zones. Better measurements, premium designs, appropriate frame choice, and adaptation can reduce the effect, but some side blur is normal with progressives.",
      longAnswer:
        "Side blur is part of progressive lens optics. To blend distance, intermediate, and near prescriptions without a line, the lens has to manage unwanted distortion somewhere. That distortion is usually pushed into the lower side areas. Patients may notice it when looking sideways, walking, using stairs, or turning only their eyes instead of their head.\n\nThis does not mean the prescription is wrong. It may simply mean the wearer is experiencing the edge of the progressive design. Adaptation involves learning to move the head slightly toward what you want to see and using the central corridor of the lens. Most people improve with practice.\n\nHowever, excessive blur can come from fixable issues. The frame may be too small, too tilted, too loose, or sitting at the wrong height. The measurements may be off. The progressive design may not match the patient's prescription or visual needs. Premium digital lenses often provide wider usable zones than basic designs. If side blur is severe, nausea-inducing, or not improving after a reasonable trial, the glasses should be rechecked rather than tolerated indefinitely.",
      relatedQuestions: [
        "how-long-does-it-take-to-adjust-to-progressive-lenses",
        "can-progressive-lenses-cause-dizziness",
        "are-premium-progressive-lenses-worth-it",
        "why-do-i-need-measurements-for-progressive-lenses",
      ],
      tags: ["side blur", "adaptation", "lens distortion"],
      relatedCategorySlugs: ["frames", "high-index"],
    },
    {
      slug: "how-long-does-it-take-to-adjust-to-progressive-lenses",
      question: "How long does it take to adjust to progressive lenses?",
      shortAnswer:
        "Many people adjust to progressive lenses within a few days to two weeks, but some adapt faster or slower. New wearers should use the glasses consistently, point their nose toward what they want to see, and avoid switching back and forth too often. If vision remains uncomfortable or distorted, the fit and prescription should be checked.",
      longAnswer:
        "Progressive adaptation is partly visual and partly habit. The eyes and brain need to learn where distance, intermediate, and reading zones are located. At the same time, the wearer learns new head and eye movements. Instead of glancing far to the side or dropping the chin too much, progressives work best when the wearer points toward the target and uses the appropriate lens zone.\n\nMany patients feel functional within a few days. First-time wearers, stronger prescriptions, higher reading adds, and large design changes may take longer. Stairs, curbs, and side glances can feel odd at first, so caution is sensible during the early period.\n\nConsistent wear helps. Switching constantly between old single-vision glasses and new progressives can slow adaptation because the brain keeps changing strategies. That said, discomfort should not be ignored forever. If the glasses feel impossible, cause persistent dizziness, or remain blurry in normal positions, the issue may be measurement, frame fit, prescription, or design selection. A recheck can identify whether the lens needs adjustment or whether the patient simply needs more guided adaptation time.",
      relatedQuestions: [
        "can-progressive-lenses-cause-dizziness",
        "why-do-progressive-lenses-feel-blurry-on-the-sides",
        "can-progressive-lenses-be-remade-if-they-do-not-work",
        "why-do-my-old-progressives-feel-different-from-my-new-ones",
      ],
      tags: ["adaptation", "new glasses", "progressive comfort"],
      relatedCategorySlugs: ["frames", "reading-glasses"],
    },
    {
      slug: "can-progressive-lenses-cause-dizziness",
      question: "Can progressive lenses cause dizziness?",
      shortAnswer:
        "Progressive lenses can cause temporary dizziness or imbalance during adaptation, especially for first-time wearers or large prescription changes. The effect often improves as the wearer learns the viewing zones. Persistent dizziness can also signal measurement, fit, prescription, or lens design problems, so the glasses should be checked if symptoms do not improve.",
      longAnswer:
        "Progressives can feel dizzy at first because the lens changes power from top to bottom and has peripheral distortion. When the wearer moves through space, the edges of the lens may make floors, stairs, or side objects feel shifted. This is most noticeable for people new to progressives, people with strong prescriptions, or patients whose new glasses differ greatly from their old pair.\n\nSome early dizziness is adaptation. Moving the head toward the target, looking through the central zones, and wearing the glasses consistently can help the brain adjust. Taking extra care on stairs and curbs during the first days is wise.\n\nDizziness should improve, not intensify. If it continues, the glasses may need evaluation. The frame could be sitting too low, the measurements could be inaccurate, the corridor length might not match the frame, or the prescription could need refinement. Sometimes a different progressive design or task-specific pair is better. Patients should not force themselves through weeks of severe symptoms. Progressives require adaptation, but they should become usable and stable with the right design and fit.",
      relatedQuestions: [
        "why-do-progressive-lenses-feel-blurry-on-the-sides",
        "how-long-does-it-take-to-adjust-to-progressive-lenses",
        "why-do-stairs-look-strange-with-progressive-lenses",
        "why-do-i-need-measurements-for-progressive-lenses",
      ],
      tags: ["dizziness", "adaptation", "progressive fit"],
      relatedCategorySlugs: ["frames"],
    },
    {
      slug: "are-premium-progressive-lenses-worth-it",
      question: "Are premium progressive lenses worth it?",
      shortAnswer:
        "Premium progressive lenses can be worth it for people who wear glasses all day, use computers often, have stronger prescriptions, want wider viewing zones, or struggled with basic progressives. They are not automatically necessary for everyone. The value depends on visual demands, prescription complexity, frame choice, budget, and how much comfort matters.",
      longAnswer:
        "Premium progressive lenses usually offer more customized optics than basic designs. They may provide wider usable zones, smoother transitions, better intermediate vision, and less peripheral distortion. For someone who wears glasses from morning to night, works on screens, drives often, or has a complex prescription, those improvements can be meaningful.\n\nThe value is not only about sharpness on an eye chart. It is about how naturally the glasses work during a real day: walking, reading, checking a phone, using a laptop, cooking, shopping, and driving. A premium design may reduce the amount of head movement needed and make adaptation easier.\n\nThat said, premium does not mean perfect, and it is not mandatory for every patient. Someone with a mild prescription, limited near demands, or a tight budget may do well with a standard design. Measurements and frame fit still matter; a premium lens can perform poorly if fit incorrectly. The best decision is to match lens level to lifestyle. Ask what problem the premium design is solving for you: wider reading, better computer range, easier adaptation, stronger prescription support, or all-day comfort.",
      relatedQuestions: [
        "what-is-the-difference-between-standard-and-digital-progressive-lenses",
        "why-do-progressive-lenses-feel-blurry-on-the-sides",
        "when-are-progressive-lenses-not-ideal-for-full-day-computer-work",
        "why-do-i-need-measurements-for-progressive-lenses",
      ],
      tags: ["premium progressives", "digital lenses", "lens value"],
      relatedCategorySlugs: ["high-index", "computer-glasses"],
    },
    {
      slug: "when-are-progressive-lenses-not-ideal-for-full-day-computer-work",
      question: "When are progressive lenses not ideal for full day computer work?",
      shortAnswer:
        "Progressive lenses may not be ideal for full-day computer work when the intermediate zone feels too narrow, the monitor is high or wide, or the wearer develops neck strain from finding the right focus. Office or computer glasses can provide a wider intermediate area for desk work while progressives remain useful for general daily wear.",
      longAnswer:
        "Progressives include an intermediate zone, but that zone is only one part of a lens designed to cover many distances. For someone who spends most of the day at a computer, especially with multiple monitors or a large screen, the intermediate area may feel too narrow. The wearer may lift the chin, lean forward, or move the head excessively to keep the screen clear.\n\nThis does not mean the progressives are bad. It means one pair is being asked to do a specialized job for many hours. General-purpose progressives are excellent for moving through the day, but desk work often benefits from a wider computer-focused design.\n\nOffice lenses or computer glasses can be set for intermediate and near distances. They may not be safe for driving or distance use, but they can be much more comfortable at a workstation. Patients who love their progressives for errands and driving may still need a separate office pair for long screen days. The clue is posture: if clear computer vision requires chin lifting, neck strain, or constant searching, a task-specific design should be discussed.",
      relatedQuestions: [
        "why-is-my-reading-area-small-in-progressive-lenses",
        "are-premium-progressive-lenses-worth-it",
        "how-do-progressive-lenses-work",
        "what-is-the-difference-between-standard-and-digital-progressive-lenses",
      ],
      tags: ["computer work", "office lenses", "intermediate vision"],
      relatedCategorySlugs: ["computer-glasses", "reading-glasses"],
    },
    {
      slug: "why-is-my-reading-area-small-in-progressive-lenses",
      question: "Why is my reading area small in progressive lenses?",
      shortAnswer:
        "The reading area in progressive lenses can feel small because the lens has to fit distance, intermediate, and near correction into one design. Frame size, corridor length, reading power, lens design, and measurements all affect how wide the near zone feels. Premium designs or different frames may improve usable reading space.",
      longAnswer:
        "Progressive lenses divide usable vision into zones. The lower portion provides near vision, but it is not the full width of the lens. Because the lens gradually changes power, some side areas contain distortion. A higher reading power, shorter frame, or basic lens design can make the reading area feel narrower.\n\nFrame choice matters. If the frame is too shallow vertically, there may not be enough room for a comfortable progression from distance to reading. If the glasses sit too low or measurements are inaccurate, the wearer may have trouble finding the near zone. Even small fitting differences can change how useful the reading area feels.\n\nThe task matters too. Reading a phone or menu may work well, while reading a wide book, spreadsheet, or tablet may feel constrained. In those cases, a dedicated reading pair or office lens may be more comfortable than expecting a general progressive to provide a wide near field.\n\nIf the reading area feels unusually small, ask for a fitting check. The solution might be frame adjustment, measurement correction, a different progressive design, or a task-specific pair.",
      relatedQuestions: [
        "can-progressive-lenses-fit-in-small-frames",
        "why-do-i-need-measurements-for-progressive-lenses",
        "when-are-progressive-lenses-not-ideal-for-full-day-computer-work",
        "are-premium-progressive-lenses-worth-it",
      ],
      tags: ["reading area", "near vision", "progressive design"],
      relatedCategorySlugs: ["reading-glasses", "frames"],
    },
    {
      slug: "can-progressive-lenses-be-made-thinner",
      question: "Can progressive lenses be made thinner?",
      shortAnswer:
        "Yes, progressive lenses can often be made thinner by using high index materials, choosing an appropriate frame size and shape, and optimizing lens design. Thickness depends on prescription, pupillary distance, frame width, lens material, and whether the prescription is nearsighted, farsighted, or includes astigmatism.",
      longAnswer:
        "Progressive lenses can be made thinner, but the best method depends on why the lens is thick. Strong nearsighted prescriptions are thickest at the edges, while farsighted prescriptions are thickest in the center. Astigmatism, frame size, and where the eyes sit in the frame also affect thickness.\n\nHigh index lens materials bend light more efficiently, so they can reduce thickness for stronger prescriptions. They are often paired with anti-reflective coating because high index lenses can create more reflections. Frame choice can be just as important. A smaller, well-centered frame often produces thinner lenses than a large oversized frame.\n\nProgressive design adds complexity because the lens must support multiple viewing zones. Patients should avoid choosing a frame only by fashion if thickness and optics matter. Ask the optician to estimate thickness with different frame and material choices. The thinnest option is not always the best value, but a thoughtful combination of frame size, high index material, and accurate measurements can make progressive glasses lighter, better-looking, and more comfortable.",
      relatedQuestions: [
        "are-progressive-lenses-good-for-strong-prescriptions",
        "can-progressive-lenses-fit-in-small-frames",
        "what-frame-shapes-work-best-with-progressive-lenses",
        "does-vsp-cover-progressive-lenses",
      ],
      tags: ["thin lenses", "high index", "frame choice"],
      relatedCategorySlugs: ["high-index", "frames"],
    },
    {
      slug: "are-progressive-lenses-good-for-driving",
      question: "Are progressive lenses good for driving?",
      shortAnswer:
        "Progressive lenses are good for driving for many people because they provide distance vision through the upper lens and intermediate vision for the dashboard. Adaptation and fit matter. New wearers should be comfortable walking and using the lenses before relying on them for difficult night driving, unfamiliar roads, or long trips.",
      longAnswer:
        "Progressives can work very well for driving because they combine distance vision with access to dashboard and navigation distances. The upper portion is used for the road, while the intermediate zone can help with gauges, mirrors, and screens. For people who need reading help, this can be more practical than switching between distance glasses and readers.\n\nThe main caution is adaptation. New progressive wearers may notice side blur, swim, or distortion when checking mirrors or scanning intersections. Most adapt, but it is wise to practice in familiar, low-stress settings before using new progressives for night driving or long highway trips.\n\nLens quality and coatings matter for driving. Anti-reflective coating can reduce glare from headlights and reflections. Prescription accuracy, frame fit, and lens measurements affect how naturally the distance zone lines up. If driving feels blurry unless you tilt your head, the glasses should be checked.\n\nFor patients with strong night glare, cataracts, or occupational driving demands, a dedicated distance pair may sometimes be useful. Progressives are often excellent daily driving glasses, but they should feel stable and clear before being trusted in challenging conditions.",
      relatedQuestions: [
        "can-progressive-lenses-cause-dizziness",
        "why-do-progressive-lenses-feel-blurry-on-the-sides",
        "does-vsp-cover-anti-reflective-coating",
        "are-premium-progressive-lenses-worth-it",
      ],
      tags: ["driving", "night driving", "dashboard vision"],
      relatedCategorySlugs: ["anti-reflective", "transitions"],
    },
    {
      slug: "what-is-the-difference-between-standard-and-digital-progressive-lenses",
      question: "What is the difference between standard and digital progressive lenses?",
      shortAnswer:
        "Standard progressives use more general lens designs, while digital progressives use computer-controlled surfacing and often more customized measurements. Digital designs may provide wider clear zones, smoother transitions, and better performance for complex prescriptions. The difference matters most for all-day wearers, stronger prescriptions, computer use, and patients sensitive to distortion.",
      longAnswer:
        "Standard progressive lenses are built from established designs that work for many patients. Digital progressive lenses use more advanced surfacing technology and may incorporate individualized measurements such as frame position, pupil height, wrap, tilt, vertex distance, and prescription details. The goal is to place usable vision zones more precisely for the wearer.\n\nThe patient may experience digital progressives as wider intermediate and reading areas, less peripheral distortion, easier adaptation, or more natural transitions. The improvement is not identical for every patient. Someone with a simple prescription and modest visual demands may do fine with a standard lens. Someone with a strong prescription, previous progressive trouble, or long screen days may notice more benefit.\n\nDigital does not remove the need for good measurements or frame choice. A poorly fit digital lens can still disappoint. The best comparison is based on daily use: How much do you wear glasses? What tasks are hardest? Did you struggle with progressives before? If the answer points to high visual demand, digital progressives may be worth considering.",
      relatedQuestions: [
        "are-premium-progressive-lenses-worth-it",
        "why-do-i-need-measurements-for-progressive-lenses",
        "why-do-progressive-lenses-feel-blurry-on-the-sides",
        "when-are-progressive-lenses-not-ideal-for-full-day-computer-work",
      ],
      tags: ["digital progressives", "premium lenses", "custom lenses"],
      relatedCategorySlugs: ["high-index", "computer-glasses"],
    },
    {
      slug: "can-progressive-lenses-fit-in-small-frames",
      question: "Can progressive lenses fit in small frames?",
      shortAnswer:
        "Progressive lenses can fit in some small frames, but the frame must have enough vertical height for distance, intermediate, and near zones. Very shallow frames can make reading or adaptation harder. Short-corridor progressive designs can help, but frame fit, pupil height, and visual needs should guide the choice.",
      longAnswer:
        "Progressive lenses need vertical space. The lens has to provide distance vision, transition through intermediate vision, and still leave enough room for reading. If a frame is too shallow, those zones can become compressed. The result may be a reading area that feels too low, too small, or hard to find.\n\nShort-corridor progressive designs were created for smaller frames, and they can work well when properly measured. However, they are not magic. A frame still needs enough height, stable fit, and proper alignment with the eyes. If the frame slides down or sits unevenly, the progressive zones shift out of position.\n\nPatients should choose frames with the prescription in mind. Fashion matters, but progressives are less forgiving than single-vision lenses. An optician can check whether a frame has enough depth and whether the patient's pupil position works with the design. If a very small frame is non-negotiable, expectations should be clear. A slightly taller frame may provide a much better everyday progressive experience.",
      relatedQuestions: [
        "why-is-my-reading-area-small-in-progressive-lenses",
        "why-do-i-need-measurements-for-progressive-lenses",
        "what-frame-shapes-work-best-with-progressive-lenses",
        "how-do-progressive-lenses-work",
      ],
      tags: ["small frames", "frame fit", "short corridor"],
      relatedCategorySlugs: ["frames"],
    },
    {
      slug: "why-do-i-need-measurements-for-progressive-lenses",
      question: "Why do I need measurements for progressive lenses?",
      shortAnswer:
        "Progressive lenses need precise measurements because the distance, intermediate, and reading zones must line up with your eyes and frame position. Measurements such as pupil distance, fitting height, frame tilt, wrap, and how the frame sits affect comfort and clarity. Poor measurements can make even the right prescription feel wrong.",
      longAnswer:
        "Progressive measurements are essential because the lens is not the same everywhere. Each zone has a purpose, and those zones must align with how the frame sits on the face. If the reading zone is too low, near vision may be hard to find. If the distance zone is misaligned, the wearer may tilt or turn the head unnaturally. If the frame sits differently after adjustment, the lens performance can change.\n\nBasic measurements include pupillary distance and fitting height. More advanced designs may also use frame wrap, pantoscopic tilt, vertex distance, and individualized wearing position. These details help the lab place the progressive corridor where the patient will actually look.\n\nThis is why ordering progressives without accurate measurements can be risky. It is also why frame adjustment matters before measurements are taken. The frame should sit the way it will be worn. If progressive lenses feel wrong, measurement and fit should be checked before assuming the prescription is bad. Good measurements turn the design into a usable pair of glasses.",
      relatedQuestions: [
        "how-do-progressive-lenses-work",
        "can-progressive-lenses-fit-in-small-frames",
        "what-is-the-difference-between-standard-and-digital-progressive-lenses",
        "can-progressive-lenses-be-remade-if-they-do-not-work",
      ],
      tags: ["measurements", "fitting height", "pupillary distance"],
      relatedCategorySlugs: ["frames", "high-index"],
    },
    {
      slug: "can-progressive-lenses-be-remade-if-they-do-not-work",
      question: "Can progressive lenses be remade if they do not work?",
      shortAnswer:
        "Progressive lenses can often be remade or adjusted if they do not work, depending on the office policy, lens warranty, prescription findings, and timing. Before remaking, the optician or doctor should check frame fit, measurements, prescription, lens design, and adaptation. Sometimes adjustment solves the issue without a full remake.",
      longAnswer:
        "If progressive lenses do not work, the first step is diagnosis, not immediately ordering another pair. Many problems come from frame fit: glasses sitting too low, sliding, tilting incorrectly, or sitting unevenly. Adjusting the frame can move the viewing zones back where they belong. Measurements should also be checked, especially fitting height and pupil distance.\n\nThe prescription may need review if distance, computer, or reading vision is consistently unclear even when looking through the correct zone. The lens design may also be mismatched to the patient's needs. Someone who spends all day at a computer may not be happy in a general-purpose design even if the lens was made correctly.\n\nMany optical offices and lens manufacturers have non-adapt or remake policies, but they have time limits and conditions. Patients should report problems early rather than waiting months. Describe the specific issue: blurry distance, narrow reading, dizziness, computer strain, or trouble with stairs. A precise complaint helps determine whether the solution is adjustment, prescription recheck, different design, task-specific glasses, or remake.",
      relatedQuestions: [
        "how-long-does-it-take-to-adjust-to-progressive-lenses",
        "why-do-i-need-measurements-for-progressive-lenses",
        "can-progressive-lenses-cause-dizziness",
        "why-do-my-old-progressives-feel-different-from-my-new-ones",
      ],
      tags: ["remake policy", "non-adapt", "lens troubleshooting"],
      relatedCategorySlugs: ["frames", "computer-glasses"],
    },
  ],
);

const scopeHub = buildHub(
  {
    id: "scope-of-practice",
    route: "/knowledge/od-vs-omd/scope-of-practice",
    title: "Scope Of Practice",
    topicSlug: "od-vs-omd",
    topicName: "OD vs OMD",
    categorySlug: "scope-of-practice",
    categoryName: "Scope Of Practice",
    overview:
      "The Scope Of Practice pilot hub tests provider-selection intent: which eye doctor to call, what optometrists and ophthalmologists can manage, and when referral or surgery-level care is needed.",
    relatedCategorySlugs: ["training", "surgery", "eye-diseases", "referrals", "emergencies"],
  },
  [
    {
      slug: "what-can-an-optometrist-treat",
      question: "What can an optometrist treat?",
      shortAnswer:
        "Optometrists commonly provide routine eye exams, glasses and contact lens prescriptions, dry eye care, eye infection treatment, allergy care, urgent eye evaluations, and monitoring for conditions such as glaucoma, cataracts, diabetic eye disease, and macular degeneration. Exact scope varies by state, training, equipment, and the complexity of the condition.",
      longAnswer:
        "An optometrist is often the first eye doctor patients see for both vision and many eye health concerns. Optometrists prescribe glasses and contact lenses, diagnose common eye conditions, treat many infections and inflammatory problems, manage dry eye, evaluate eye pain or redness, and monitor chronic conditions such as glaucoma risk, cataracts, diabetic eye changes, and macular degeneration.\n\nThe exact boundary depends on state law and the doctor's training, equipment, and practice setting. Some optometrists focus heavily on routine vision care and contacts. Others provide medical eye care, urgent visits, specialty lenses, myopia management, low vision, or co-management after surgery.\n\nOptometrists also refer when a condition needs surgery, injections, complex specialty care, or emergency hospital-level treatment. That referral role is part of good care, not a failure to treat. For many patients, the practical rule is simple: if you need a routine exam, glasses, contacts, red eye evaluation, dry eye care, or the first look at a new eye symptom, an optometrist is often an appropriate starting point.",
      relatedQuestions: [
        "what-can-an-ophthalmologist-treat",
        "when-is-an-ophthalmologist-required",
        "can-optometrists-handle-urgent-eye-visits",
        "how-do-optometrists-and-ophthalmologists-work-together",
      ],
      tags: ["optometrist", "scope of practice", "eye care roles"],
      relatedCategorySlugs: ["training", "eye-diseases", "referrals"],
    },
    {
      slug: "what-can-an-ophthalmologist-treat",
      question: "What can an ophthalmologist treat?",
      shortAnswer:
        "Ophthalmologists are medical doctors who diagnose and treat eye diseases and perform eye surgery. They may manage cataracts, glaucoma, retinal disease, corneal disease, eye trauma, inflammatory disease, and complex medical or surgical cases. Some also provide routine exams and glasses prescriptions, but many focus on specialty medical or surgical care.",
      longAnswer:
        "An ophthalmologist is a medical doctor or osteopathic physician trained in eye disease and surgery. Ophthalmologists can diagnose and treat a wide range of eye conditions, prescribe medications, perform procedures, and operate when needed. Many complete additional fellowship training in retina, glaucoma, cornea, pediatrics, oculoplastics, neuro-ophthalmology, or other specialties.\n\nPatients often see ophthalmologists for cataract surgery, retina injections, glaucoma surgery, corneal disease, significant trauma, complex inflammation, tumors, or conditions requiring surgical decision-making. Some ophthalmologists also provide routine eye exams, but in many communities routine vision care is handled primarily by optometrists while ophthalmologists focus on referred medical and surgical cases.\n\nThe choice is not about which doctor is better. It is about the problem. A routine contact lens fitting does not usually require a surgeon. A retinal detachment does. Many patients receive the best care when optometrists and ophthalmologists coordinate: the optometrist detects or monitors, the ophthalmologist handles surgical or specialty treatment, and care returns to the appropriate provider afterward.",
      relatedQuestions: [
        "when-is-an-ophthalmologist-required",
        "can-optometrists-refer-for-surgery",
        "who-manages-complex-eye-disease",
        "how-do-optometrists-and-ophthalmologists-work-together",
      ],
      tags: ["ophthalmologist", "eye surgery", "medical eye care"],
      relatedCategorySlugs: ["surgery", "eye-diseases", "referrals"],
    },
    {
      slug: "can-an-optometrist-prescribe-glasses",
      question: "Can an optometrist prescribe glasses?",
      shortAnswer:
        "Yes. Prescribing glasses is a core part of optometric care. Optometrists perform refraction to determine lens power and evaluate how the prescription fits the patient's visual needs. They can prescribe single-vision lenses, progressives, bifocals, prism when appropriate, computer glasses, reading glasses, and other prescription eyewear.",
      longAnswer:
        "Optometrists are primary providers for glasses prescriptions. During an exam, the optometrist measures how each eye focuses and determines whether lenses can improve clarity, comfort, or function. The process includes more than asking which lens is clearer. The doctor considers symptoms, age, work demands, eye alignment, focusing ability, prescription history, and eye health.\n\nA glasses prescription can be simple or specialized. Some patients need single-vision distance glasses. Others need progressives, bifocals, reading glasses, computer glasses, prism, safety glasses, sports eyewear, or prescription sunglasses. The optometrist can recommend lens designs based on how the patient uses vision throughout the day.\n\nIf the prescription changes unexpectedly, the optometrist may also look for medical explanations such as diabetes, cataracts, dry eye, medication effects, or focusing problems. That is why a glasses prescription is tied to an eye exam rather than treated as a standalone number. Opticians help make and fit the glasses, but optometrists commonly determine the prescription itself.",
      relatedQuestions: [
        "can-an-ophthalmologist-prescribe-glasses",
        "can-an-optometrist-prescribe-contact-lenses",
        "who-manages-routine-eye-care",
        "what-can-an-optometrist-treat",
      ],
      tags: ["glasses prescription", "refraction", "routine eye care"],
      relatedCategorySlugs: ["training"],
    },
    {
      slug: "can-an-optometrist-prescribe-contact-lenses",
      question: "Can an optometrist prescribe contact lenses?",
      shortAnswer:
        "Yes. Optometrists commonly prescribe contact lenses after evaluating prescription, corneal shape, lens fit, movement, comfort, vision, and eye health. A contact lens prescription is different from a glasses prescription because it includes lens brand or design, base curve, diameter, material, and replacement schedule.",
      longAnswer:
        "Contact lens prescribing is a major part of optometry. Because contact lenses sit directly on the eye, the doctor must evaluate both vision and fit. The prescription includes more than power. It may specify brand, material, base curve, diameter, astigmatism parameters, multifocal design, and replacement schedule.\n\nOptometrists fit soft daily lenses, monthly lenses, toric lenses, multifocals, colored contacts, rigid gas permeable lenses, scleral lenses, and other specialty options depending on training and practice focus. The fitting process may include trial lenses, insertion and removal training, follow-up visits, and checks for dryness, redness, or corneal changes.\n\nPatients should not use a glasses prescription to buy contacts. The numbers may differ because contact lenses sit on the eye instead of in a frame. The fit also affects safety. An optometrist can help choose a lens that matches the patient's prescription, lifestyle, comfort needs, and ability to follow care rules. If a specialty medical lens is needed, the optometrist may provide it directly or refer to a specialist.",
      relatedQuestions: [
        "can-an-optometrist-prescribe-glasses",
        "can-an-ophthalmologist-fit-contact-lenses",
        "what-can-an-optometrist-treat",
        "does-optometry-scope-vary-by-state",
      ],
      tags: ["contact lens prescription", "contact lens fitting", "optometrist"],
      relatedCategorySlugs: ["training", "eye-diseases"],
    },
    {
      slug: "can-an-optometrist-prescribe-eye-drops",
      question: "Can an optometrist prescribe eye drops?",
      shortAnswer:
        "In many places, optometrists can prescribe eye drops for conditions such as infections, allergies, inflammation, dry eye, glaucoma, and other eye problems within their scope. The exact medications and rules vary by state or jurisdiction. Patients should ask their eye doctor what can be treated in-office and when referral is needed.",
      longAnswer:
        "Optometrists commonly prescribe therapeutic eye drops, but the exact scope depends on state law and clinical context. Many optometrists treat bacterial conjunctivitis, allergic eye disease, dry eye inflammation, eyelid disease, corneal irritation, and glaucoma using prescription drops. Some also prescribe oral medications within their permitted scope.\n\nThe key is diagnosis. Red eye can be simple allergy, viral infection, bacterial infection, contact lens complication, inflammation, injury, or a sign of a more serious condition. An optometrist evaluates the eye to decide whether drops are appropriate, which medication is safest, and whether follow-up is needed.\n\nNot every condition should be handled only with drops, and not every case stays in optometry. Severe infection, corneal ulcer, trauma, high eye pressure, uveitis, or symptoms suggesting deeper disease may require urgent referral or co-management with an ophthalmologist. Patients should avoid using leftover drops or someone else's medication. The right drop depends on the actual cause, and the wrong drop can delay care or worsen certain problems.",
      relatedQuestions: [
        "can-an-optometrist-prescribe-medication-for-eye-infections",
        "can-an-optometrist-treat-dry-eye",
        "does-optometry-scope-vary-by-state",
        "when-is-an-ophthalmologist-required",
      ],
      tags: ["eye drops", "prescribing authority", "red eye"],
      relatedCategorySlugs: ["eye-diseases", "emergencies"],
    },
    {
      slug: "can-an-optometrist-prescribe-medication-for-eye-infections",
      question: "Can an optometrist prescribe medication for eye infections?",
      shortAnswer:
        "Many optometrists can prescribe medication for eye infections, including antibiotic or anti-inflammatory drops when appropriate. The doctor first determines whether the problem is bacterial, viral, allergic, contact lens related, inflammatory, or something more serious. Severe pain, light sensitivity, corneal involvement, or vision loss may require urgent referral.",
      longAnswer:
        "Optometrists often evaluate and treat eye infections. A red or irritated eye is not automatically a simple infection, so the exam matters. The doctor checks the cornea, conjunctiva, eyelids, tear film, contact lens history, discharge, pain level, light sensitivity, and vision. That helps determine whether medication is needed and which type is appropriate.\n\nBacterial infections may require antibiotic drops. Allergic or inflammatory conditions may need different medication. Viral conjunctivitis may be managed with supportive care and hygiene rather than antibiotics. Contact lens wearers need special attention because corneal infections can become serious quickly.\n\nState scope rules vary, but in many areas optometrists prescribe the common medications needed for front-of-eye infections. Referral is important when the infection is severe, not improving, involves the cornea, threatens vision, or may need surgical or specialty treatment. Patients should not self-treat with old drops because steroid or antibiotic misuse can hide symptoms, worsen some infections, or delay proper care. A same-day optometry visit is often a good starting point for red, painful, or suspicious eyes.",
      relatedQuestions: [
        "can-an-optometrist-prescribe-eye-drops",
        "can-optometrists-handle-urgent-eye-visits",
        "when-is-an-ophthalmologist-required",
        "what-can-an-optometrist-treat",
      ],
      tags: ["eye infection", "urgent eye care", "medication"],
      relatedCategorySlugs: ["eye-diseases", "emergencies"],
    },
    {
      slug: "can-an-optometrist-treat-dry-eye",
      question: "Can an optometrist treat dry eye?",
      shortAnswer:
        "Yes. Optometrists commonly diagnose and treat dry eye. Care may include tear evaluation, eyelid and oil gland assessment, artificial tears, prescription drops, warm compresses, lid hygiene, allergy management, contact lens changes, in-office treatments, or referral for complex cases. Treatment depends on the type and severity of dryness.",
      longAnswer:
        "Dry eye is one of the most common conditions optometrists treat. It can come from tear evaporation, poor oil gland function, inflammation, medication effects, autoimmune disease, screen habits, contact lens wear, allergies, or environmental exposure. Because causes differ, treatment should be more specific than simply buying random drops.\n\nAn optometrist can evaluate the tear film, eyelids, cornea, conjunctiva, blinking, and contact lens interaction. Mild cases may improve with preservative-free artificial tears, environmental changes, screen breaks, warm compresses, or lid hygiene. More persistent cases may need prescription anti-inflammatory drops, allergy treatment, punctal plugs, meibomian gland therapy, or changes to contact lens material and wearing schedule.\n\nDry eye treatment often works best as a plan rather than a one-time fix. The doctor may adjust therapy based on response and flare patterns. Referral may be needed for severe autoimmune disease, corneal complications, or complex pain. For most patients, though, an optometrist is an appropriate first provider for diagnosis, daily management, and practical comfort strategies.",
      relatedQuestions: [
        "what-can-an-optometrist-treat",
        "can-an-optometrist-prescribe-eye-drops",
        "can-optometrists-treat-eye-allergies",
        "when-is-an-ophthalmologist-required",
      ],
      tags: ["dry eye", "optometry treatment", "ocular surface"],
      relatedCategorySlugs: ["eye-diseases"],
    },
    {
      slug: "can-an-optometrist-manage-glaucoma",
      question: "Can an optometrist manage glaucoma?",
      shortAnswer:
        "Many optometrists can diagnose, monitor, and manage glaucoma or glaucoma risk, including eye pressure checks, optic nerve evaluation, visual field testing, imaging, and prescription drops where allowed. More advanced, unstable, or surgical cases may require referral or co-management with an ophthalmologist or glaucoma specialist.",
      longAnswer:
        "Optometrists often play a major role in glaucoma care. They may detect suspicious optic nerve changes during routine exams, measure eye pressure, order visual field testing, perform optic nerve imaging, monitor progression, and prescribe pressure-lowering drops depending on state scope and clinical training.\n\nGlaucoma management is long-term. The goal is to reduce the risk of vision loss by tracking pressure, nerve structure, visual field function, risk factors, and response to treatment. Some patients are monitored as glaucoma suspects without medication. Others need drops, laser, surgery, or specialist care.\n\nReferral is appropriate when glaucoma is advanced, progressing despite treatment, requires laser or surgery, has unusual features, or is outside the provider's equipment or scope. Co-management is common: an ophthalmologist may perform a procedure while the optometrist continues routine monitoring. Patients should ask who is managing each part of the plan and how often testing is needed. The provider label matters less than whether the disease is being monitored carefully and escalated when needed.",
      relatedQuestions: [
        "when-is-an-ophthalmologist-required",
        "can-optometrists-order-imaging-tests",
        "who-manages-complex-eye-disease",
        "how-do-optometrists-and-ophthalmologists-work-together",
      ],
      tags: ["glaucoma", "co-management", "optic nerve"],
      relatedCategorySlugs: ["eye-diseases", "referrals"],
    },
    {
      slug: "can-an-optometrist-monitor-cataracts-before-surgery",
      question: "Can an optometrist monitor cataracts before surgery?",
      shortAnswer:
        "Yes. Optometrists commonly diagnose and monitor cataracts before surgery is needed. They can track vision changes, update glasses when useful, evaluate glare complaints, and refer to an ophthalmologist when cataracts interfere with daily life or require surgical evaluation. The surgeon performs the cataract procedure.",
      longAnswer:
        "Cataracts often develop gradually, and optometrists commonly monitor them during routine exams. Early cataracts may cause mild blur, glare, night driving difficulty, color changes, or more frequent prescription shifts. Sometimes glasses updates help for a while. Other times, lens clouding becomes the limiting factor.\n\nThe optometrist's role is to evaluate how much the cataract affects vision and daily function. That includes checking best-corrected vision, glare symptoms, lens appearance, retinal health, and whether other conditions may be contributing. If vision can still be improved with glasses and symptoms are manageable, monitoring may be appropriate.\n\nReferral for cataract surgery is usually considered when cataracts interfere with driving, reading, work, hobbies, or safety, and when a glasses change is no longer enough. An ophthalmologist evaluates surgical options, lens implants, risks, and timing. After surgery, optometrists may also co-manage recovery and update glasses. Monitoring cataracts before surgery is a normal part of optometric care.",
      relatedQuestions: [
        "can-optometrists-refer-for-surgery",
        "can-optometrists-co-manage-cataract-surgery",
        "when-is-an-ophthalmologist-required",
        "what-can-an-optometrist-treat",
      ],
      tags: ["cataracts", "surgery referral", "monitoring"],
      relatedCategorySlugs: ["surgery", "referrals"],
    },
    {
      slug: "can-an-optometrist-diagnose-diabetic-eye-disease",
      question: "Can an optometrist diagnose diabetic eye disease?",
      shortAnswer:
        "Optometrists can often detect and monitor diabetic eye disease through dilated retinal exams, retinal imaging, OCT testing, and coordination with the patient's medical team. Mild or stable findings may be monitored, while swelling, bleeding, vision loss, or advanced disease may require referral to a retina specialist.",
      longAnswer:
        "Diabetic eye disease affects the retina, and optometrists are trained to evaluate retinal health. During a diabetic eye exam, the doctor may use dilation, retinal photography, OCT imaging, and careful examination to look for bleeding, leakage, swelling, or abnormal blood vessel changes. These findings help determine whether diabetic retinopathy is absent, mild, or concerning.\n\nOptometrists often send reports to primary care doctors or endocrinologists because eye findings are part of diabetes management. Stable patients may be monitored at recommended intervals. If the disease is more advanced, if macular swelling is present, or if treatment such as injections or laser may be needed, referral to a retina specialist is appropriate.\n\nPatients with diabetes should not wait for blurry vision before scheduling exams. Diabetic changes can begin silently. The optometrist's role is early detection, documentation, patient education, and referral when treatment is needed. Good care also includes communication about blood sugar, blood pressure, medications, and follow-up timing.",
      relatedQuestions: [
        "can-optometrists-order-imaging-tests",
        "when-is-an-ophthalmologist-required",
        "who-manages-complex-eye-disease",
        "how-do-optometrists-and-ophthalmologists-work-together",
      ],
      tags: ["diabetic eye disease", "retina", "dilated exam"],
      relatedCategorySlugs: ["eye-diseases", "referrals"],
    },
    {
      slug: "can-an-ophthalmologist-prescribe-glasses",
      question: "Can an ophthalmologist prescribe glasses?",
      shortAnswer:
        "Yes. Ophthalmologists can prescribe glasses, although many focus more on medical and surgical eye care. In some practices, refractions are performed by technicians, optometrists, or the ophthalmologist depending on the setting. For routine glasses and contacts, many patients see an optometrist; for surgical or complex disease care, they may see an ophthalmologist.",
      longAnswer:
        "Ophthalmologists are trained to diagnose and treat eye disease, perform surgery, and prescribe optical correction. They can prescribe glasses. However, the way this happens varies by practice. Some ophthalmology offices provide routine refractions and eyewear prescriptions. Others focus on medical or surgical care and may not emphasize routine glasses services.\n\nPatients sometimes assume ophthalmologists are automatically the best choice for every eye need because they are medical doctors. For surgery and complex disease, ophthalmologists are essential. For routine glasses, contact lenses, and primary vision care, optometrists often provide more focused access and fitting support. Both provider types can be involved appropriately.\n\nIf you are scheduling mainly for glasses, ask whether the ophthalmology office performs refractions and whether there is a separate fee. Some medical insurance plans do not cover routine refraction. If you are seeing an ophthalmologist for cataracts, retina disease, or glaucoma, glasses may be discussed as part of care, but the main purpose of the visit may be medical decision-making rather than optical shopping.",
      relatedQuestions: [
        "can-an-optometrist-prescribe-glasses",
        "what-can-an-ophthalmologist-treat",
        "who-manages-routine-eye-care",
        "does-optometry-scope-vary-by-state",
      ],
      tags: ["ophthalmologist", "glasses prescription", "refraction"],
      relatedCategorySlugs: ["training", "surgery"],
    },
    {
      slug: "can-optometrists-remove-foreign-bodies-from-the-eye",
      question: "Can optometrists remove foreign bodies from the eye?",
      shortAnswer:
        "Many optometrists can remove superficial foreign bodies from the eye, such as small particles on the cornea or under the eyelid, depending on state scope and case severity. Deep, penetrating, high-speed, chemical, or vision-threatening injuries need urgent emergency or ophthalmology care. Eye injuries should be evaluated promptly.",
      longAnswer:
        "Optometrists commonly evaluate the feeling of something stuck in the eye. In many cases, the cause is a small particle, eyelash, contact lens issue, or debris under the lid. If the foreign body is superficial and within the doctor's scope, the optometrist may remove it, prescribe medication, and schedule follow-up to make sure the surface heals.\n\nNot every foreign body is appropriate for routine office removal. Metal fragments, high-speed injuries, deep penetration, chemical exposure, severe pain, major vision changes, or suspicion that something entered the eye require urgent specialty or emergency care. These situations can threaten vision and may need imaging, surgical treatment, or intensive medication.\n\nPatients should avoid rubbing the eye, trying to dig out material, or using leftover drops. If something entered the eye while grinding, hammering, drilling, working with metal, using chemicals, or doing yard work, describe the mechanism clearly when calling. An optometrist can often be the first call for minor surface foreign bodies, but the history determines how urgent and specialized the care needs to be.",
      relatedQuestions: [
        "can-optometrists-handle-urgent-eye-visits",
        "when-is-an-ophthalmologist-required",
        "can-an-optometrist-prescribe-medication-for-eye-infections",
        "what-can-an-optometrist-treat",
      ],
      tags: ["foreign body", "eye injury", "urgent eye care"],
      relatedCategorySlugs: ["emergencies", "referrals"],
    },
    {
      slug: "can-optometrists-handle-urgent-eye-visits",
      question: "Can optometrists handle urgent eye visits?",
      shortAnswer:
        "Many optometrists handle urgent eye visits for symptoms such as red eye, pain, contact lens irritation, foreign body sensation, flashes, floaters, infections, allergies, and sudden vision concerns. They can treat many problems directly and refer quickly when surgery, retina care, trauma care, or emergency treatment is needed.",
      longAnswer:
        "Optometrists are often accessible first-line providers for urgent eye problems. They can evaluate red eyes, painful eyes, contact lens complications, corneal abrasions, allergies, infections, flashes, floaters, eyelid swelling, and sudden blur. The exam helps determine whether the issue can be treated in-office or needs referral.\n\nUrgent does not always mean emergency room. Many eye problems are better evaluated with eye-specific equipment than in a general urgent care clinic. An optometrist can look at the cornea under magnification, check eye pressure, assess the retina, remove certain superficial foreign bodies, and prescribe appropriate eye medication where allowed.\n\nSome symptoms require escalation. Sudden vision loss, a curtain or shadow, severe trauma, chemical exposure, deep injury, severe light sensitivity, or signs of retinal detachment may need same-day ophthalmology or emergency care. A good optometry office triages these symptoms quickly. For patients, the key is to call and describe symptoms clearly rather than waiting for a routine appointment.",
      relatedQuestions: [
        "can-optometrists-remove-foreign-bodies-from-the-eye",
        "can-an-optometrist-prescribe-medication-for-eye-infections",
        "when-is-an-ophthalmologist-required",
        "who-manages-complex-eye-disease",
      ],
      tags: ["urgent eye care", "red eye", "eye pain"],
      relatedCategorySlugs: ["emergencies", "eye-diseases"],
    },
    {
      slug: "can-optometrists-refer-for-surgery",
      question: "Can optometrists refer for surgery?",
      shortAnswer:
        "Yes. Optometrists commonly refer patients to ophthalmologists for cataract surgery, LASIK evaluation, glaucoma procedures, retina treatment, eyelid surgery, corneal procedures, and other surgical care. They may diagnose the problem, monitor timing, explain options, and co-manage care before or after surgery when appropriate.",
      longAnswer:
        "Optometrists do not need to perform a surgery to play an important role in surgical care. They often identify when a condition has reached the point where a surgical opinion is appropriate. Cataracts, retinal disease, glaucoma progression, corneal problems, eyelid concerns, and refractive surgery interest can all lead to referral.\n\nA good referral includes the reason for referral, exam findings, testing, symptom history, and urgency. The ophthalmologist then evaluates surgical options, risks, timing, and candidacy. After treatment, the optometrist may help with post-operative checks, glasses updates, dry eye care, or long-term monitoring depending on the arrangement.\n\nReferral timing matters. Sending every early cataract to a surgeon may be unnecessary, but waiting too long when daily life is affected can frustrate patients. Optometrists often help bridge that decision by tracking vision, glare, functional complaints, and medical findings over time. The best surgical referrals feel coordinated rather than abrupt.",
      relatedQuestions: [
        "can-an-optometrist-monitor-cataracts-before-surgery",
        "when-is-an-ophthalmologist-required",
        "can-optometrists-co-manage-cataract-surgery",
        "how-do-optometrists-and-ophthalmologists-work-together",
      ],
      tags: ["surgery referral", "co-management", "ophthalmology"],
      relatedCategorySlugs: ["surgery", "referrals"],
    },
    {
      slug: "does-optometry-scope-vary-by-state",
      question: "Does optometry scope vary by state?",
      shortAnswer:
        "Yes. Optometry scope of practice can vary by state or jurisdiction. Differences may include which medications optometrists can prescribe, which procedures they can perform, and how certain diseases are managed. Patients do not need to memorize the rules, but they should ask whether their local optometrist can treat the specific problem or should refer.",
      longAnswer:
        "Optometry is regulated at the state or jurisdiction level, so scope of practice is not identical everywhere. In one state, optometrists may have broad authority to prescribe oral medications or perform certain procedures. In another, the rules may be narrower. Training, certification, equipment, and practice focus also influence what an individual optometrist provides.\n\nThis variation can make online answers confusing. A statement that is true in one location may not apply exactly in another. For patients, the practical issue is not the legal detail; it is whether the doctor they are calling can evaluate and manage the problem safely.\n\nWhen scheduling, describe the concern clearly. Ask whether the office treats that condition, whether the doctor prescribes the needed medications, and whether referral would be arranged if necessary. Good optometrists know their scope and referral network. Scope variation should not leave patients guessing; it should result in clear triage and appropriate care.",
      relatedQuestions: [
        "can-an-optometrist-prescribe-eye-drops",
        "can-an-optometrist-prescribe-contact-lenses",
        "what-can-an-optometrist-treat",
        "when-is-an-ophthalmologist-required",
      ],
      tags: ["state scope", "optometry law", "provider authority"],
      relatedCategorySlugs: ["training", "referrals"],
    },
    {
      slug: "when-is-an-ophthalmologist-required",
      question: "When is an ophthalmologist required?",
      shortAnswer:
        "An ophthalmologist is required or strongly preferred when a condition needs surgery, injections, advanced specialty care, hospital-level emergency care, or management beyond the optometrist's scope. Examples include cataract surgery, retina treatment, severe trauma, advanced glaucoma, complex corneal disease, and certain sudden vision loss symptoms.",
      longAnswer:
        "An ophthalmologist is needed when the problem requires medical or surgical care beyond what the current provider can safely manage. Surgery is the clearest example: cataract surgery, retinal surgery, glaucoma procedures, corneal transplants, and many eyelid surgeries are performed by ophthalmologists. Retina injections and complex specialty treatments also generally require ophthalmology.\n\nUrgent symptoms may also require ophthalmology or emergency care. Sudden vision loss, a curtain or shadow in vision, severe trauma, chemical burns, penetrating injury, severe eye pain with nausea, or suspected retinal detachment should be escalated quickly. Some cases start with an optometrist, who then arranges urgent referral.\n\nChronic diseases may move between providers depending on severity. Mild glaucoma risk may be monitored by an optometrist, while advanced or progressing glaucoma may need a specialist. Cataracts may be monitored until surgery is appropriate. The goal is not to choose one provider forever. It is to use the right level of care at the right time, with communication between doctors.",
      relatedQuestions: [
        "what-can-an-ophthalmologist-treat",
        "can-optometrists-refer-for-surgery",
        "who-manages-complex-eye-disease",
        "can-optometrists-handle-urgent-eye-visits",
      ],
      tags: ["ophthalmology referral", "surgery", "complex eye disease"],
      relatedCategorySlugs: ["surgery", "emergencies", "referrals"],
    },
    {
      slug: "who-manages-routine-eye-care",
      question: "Who manages routine eye care?",
      shortAnswer:
        "Routine eye care is commonly managed by optometrists, especially for eye exams, glasses prescriptions, contact lenses, dry eye, screenings, and monitoring common conditions. Ophthalmologists may also provide routine care, but many focus on medical and surgical cases. The right provider depends on symptoms, history, and local access.",
      longAnswer:
        "For most patients, routine eye care starts with an optometrist. Optometrists are trained to provide comprehensive eye exams, glasses prescriptions, contact lens fittings, preventive eye health checks, dry eye treatment, and monitoring of common conditions. They are often the most practical access point for annual or periodic vision care.\n\nOphthalmologists can also provide routine care, but their practices often emphasize disease treatment and surgery. In many communities, optometrists and ophthalmologists work together: optometrists manage routine and primary eye care, while ophthalmologists handle surgical or complex medical needs.\n\nPatients should choose based on the reason for the visit. If you need new glasses, contact lenses, a routine exam, or evaluation of common symptoms, an optometrist is usually appropriate. If you already know you need surgery, retina injections, or specialty disease care, ophthalmology may be the destination. If you are unsure, an optometry office can often triage and refer. Routine care works best when it includes a clear path for escalation.",
      relatedQuestions: [
        "what-can-an-optometrist-treat",
        "can-an-optometrist-prescribe-glasses",
        "can-an-ophthalmologist-prescribe-glasses",
        "how-do-optometrists-and-ophthalmologists-work-together",
      ],
      tags: ["routine eye care", "primary eye care", "optometry"],
      relatedCategorySlugs: ["training", "referrals"],
    },
    {
      slug: "who-manages-complex-eye-disease",
      question: "Who manages complex eye disease?",
      shortAnswer:
        "Complex eye disease may be managed by an ophthalmologist, specialist, optometrist, or a team depending on severity. Retina disease, advanced glaucoma, corneal disease, uveitis, tumors, severe trauma, and surgical cases often require ophthalmology. Optometrists may detect, monitor, educate, and co-manage stable or referred cases.",
      longAnswer:
        "Complex eye disease is best managed by the provider or team with the right training, equipment, and treatment options. Ophthalmologists and subspecialists are often needed for retina injections, surgery, advanced glaucoma, corneal procedures, inflammatory disease, tumors, and severe trauma. These cases may require treatments that are not part of routine optometric care.\n\nOptometrists still play an important role. They may be the first to detect disease during an exam, monitor stable findings, order screening tests, educate patients, and refer when findings cross a threshold. After specialist treatment, patients may return to optometry for ongoing vision care, glasses, dry eye management, or shared monitoring.\n\nThe boundary is not always fixed. A stable glaucoma suspect is different from rapidly progressing glaucoma. Mild diabetic changes are different from macular edema requiring injections. Patients should ask who is responsible for each part of the plan, how results are shared, and what symptoms require urgent escalation. Complex disease care should feel coordinated, not fragmented.",
      relatedQuestions: [
        "when-is-an-ophthalmologist-required",
        "can-an-optometrist-manage-glaucoma",
        "can-an-optometrist-diagnose-diabetic-eye-disease",
        "how-do-optometrists-and-ophthalmologists-work-together",
      ],
      tags: ["complex eye disease", "specialist care", "co-management"],
      relatedCategorySlugs: ["eye-diseases", "referrals", "surgery"],
    },
    {
      slug: "how-do-optometrists-and-ophthalmologists-work-together",
      question: "How do optometrists and ophthalmologists work together?",
      shortAnswer:
        "Optometrists and ophthalmologists often work together through referral, co-management, testing, surgery planning, post-operative care, and long-term monitoring. The optometrist may provide primary eye care and identify problems, while the ophthalmologist provides specialty medical or surgical treatment when needed. Good communication keeps care continuous.",
      longAnswer:
        "Optometrists and ophthalmologists are not competing answers to every eye problem. They often form a care pathway. The optometrist may provide routine exams, detect cataracts, monitor glaucoma risk, identify diabetic changes, manage dry eye, or evaluate urgent symptoms. If the condition needs surgery, injections, or specialty care, the patient is referred to an ophthalmologist.\n\nAfter the ophthalmologist evaluates or treats the condition, care may continue in both settings. Cataract surgery patients may return to an optometrist for post-operative checks and glasses updates. Glaucoma patients may see a specialist periodically while an optometrist helps with interim monitoring. Retina patients may continue routine care outside injection visits.\n\nThe best collaborations are clear about roles. Patients should know who to call for symptoms, who manages medications, when follow-up is due, and whether reports are shared. Good co-management reduces delays and keeps patients from feeling bounced between offices. The goal is simple: primary access when appropriate, specialist care when needed, and a connected plan across both.",
      relatedQuestions: [
        "what-can-an-optometrist-treat",
        "what-can-an-ophthalmologist-treat",
        "can-optometrists-refer-for-surgery",
        "who-manages-complex-eye-disease",
      ],
      tags: ["co-management", "referral", "care coordination"],
      relatedCategorySlugs: ["referrals", "surgery", "eye-diseases"],
    },
  ],
);

export const pilotHubs: KnowledgePilotHub[] = [
  dailyContactsPilotHub,
  vspHub,
  adultExamsHub,
  progressiveLensesHub,
  scopeHub,
];

export function getPilotHubByRoute(route: string): KnowledgePilotHub | undefined {
  const normalized = route.startsWith("/") ? route : `/${route}`;
  return pilotHubs.find((hub) => hub.route === normalized);
}

export function getPilotHubByCategory(
  topicSlug: string,
  categorySlug: string,
): KnowledgePilotHub | undefined {
  return pilotHubs.find(
    (hub) => hub.topicSlug === topicSlug && hub.categorySlug === categorySlug,
  );
}

function normalizedTokens(text: string): Set<string> {
  const stopWords = new Set([
    "about",
    "after",
    "also",
    "because",
    "before",
    "being",
    "between",
    "could",
    "every",
    "from",
    "have",
    "into",
    "more",
    "need",
    "often",
    "only",
    "other",
    "patients",
    "should",
    "some",
    "that",
    "their",
    "them",
    "there",
    "these",
    "they",
    "this",
    "through",
    "when",
    "where",
    "which",
    "while",
    "with",
    "your",
  ]);

  return new Set(
    text
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, " ")
      .split(/\s+/)
      .filter((token) => token.length > 3 && !stopWords.has(token)),
  );
}

function getAnswerText(hub: KnowledgePilotHub): string {
  return hub.questions
    .map((question) => `${question.question} ${question.shortAnswer} ${question.longAnswer}`)
    .join(" ");
}

function jaccard(a: Set<string>, b: Set<string>): number {
  const intersection = [...a].filter((token) => b.has(token)).length;
  const union = new Set([...a, ...b]).size;
  return union === 0 ? 0 : intersection / union;
}

function phraseCounts(hub: KnowledgePilotHub): Map<string, number> {
  const words = getAnswerText(hub)
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, " ")
    .split(/\s+/)
    .filter((word) => word.length > 3);
  const counts = new Map<string, number>();

  for (let index = 0; index <= words.length - 4; index += 1) {
    const phrase = words.slice(index, index + 4).join(" ");
    counts.set(phrase, (counts.get(phrase) ?? 0) + 1);
  }

  return counts;
}

export function getCrossClusterOverlapFlags(hubs: KnowledgePilotHub[] = pilotHubs): KnowledgeOverlapFlag[] {
  const flags: KnowledgeOverlapFlag[] = [];
  const hubTokens = hubs.map((hub) => ({
    hub,
    tokens: normalizedTokens(getAnswerText(hub)),
    tagTokens: new Set(hub.questions.flatMap((question) => question.tags.map((tag) => tag.toLowerCase()))),
    phrases: phraseCounts(hub),
  }));

  for (let a = 0; a < hubTokens.length; a += 1) {
    for (let b = a + 1; b < hubTokens.length; b += 1) {
      const left = hubTokens[a];
      const right = hubTokens[b];
      const conceptOverlap = jaccard(left.tagTokens, right.tagTokens);
      const answerOverlap = jaccard(left.tokens, right.tokens);
      const sharedPhrases = [...left.phrases.keys()].filter(
        (phrase) => right.phrases.has(phrase) && left.phrases.get(phrase)! > 1 && right.phrases.get(phrase)! > 1,
      );

      if (conceptOverlap > 0.22) {
        flags.push({
          type: "duplicated concepts",
          severity: conceptOverlap > 0.35 ? "medium" : "low",
          label: `${left.hub.title} and ${right.hub.title} share concept tags`,
          detail: `${Math.round(conceptOverlap * 100)}% tag overlap. Check whether the hubs are solving the same user intent or simply touching adjacent care concepts.`,
          hubs: [left.hub.title, right.hub.title],
        });
      }

      if (answerOverlap > 0.32) {
        flags.push({
          type: "duplicated answers",
          severity: answerOverlap > 0.42 ? "high" : "medium",
          label: `${left.hub.title} and ${right.hub.title} have high answer-token overlap`,
          detail: `${Math.round(answerOverlap * 100)}% normalized answer-token overlap. Review for repeated explanations or insufficient intent separation.`,
          hubs: [left.hub.title, right.hub.title],
        });
      }

      if (sharedPhrases.length > 8) {
        flags.push({
          type: "duplicated phrasing",
          severity: sharedPhrases.length > 16 ? "high" : "medium",
          label: `${left.hub.title} and ${right.hub.title} repeat phrasing patterns`,
          detail: `${sharedPhrases.length} repeated four-word phrases appeared in both hubs. Examples: ${sharedPhrases.slice(0, 3).join("; ")}.`,
          hubs: [left.hub.title, right.hub.title],
        });
      }

      if (answerOverlap > 0.24 && conceptOverlap > 0.14) {
        flags.push({
          type: "weak differentiation",
          severity: answerOverlap > 0.3 ? "medium" : "low",
          label: `${left.hub.title} and ${right.hub.title} may need sharper positioning`,
          detail: `Token and concept overlap are both elevated. The hubs should be checked for distinct user jobs, examples, and decision criteria.`,
          hubs: [left.hub.title, right.hub.title],
        });
      }
    }
  }

  if (flags.length === 0) {
    flags.push({
      type: "weak differentiation",
      severity: "low",
      label: "No major overlap flags detected",
      detail:
        "Automated checks did not find high duplicated concepts, answer overlap, or repeated phrasing across the pilot hubs. Human editorial review is still recommended.",
      hubs: hubs.map((hub) => hub.title),
    });
  }

  return flags;
}
