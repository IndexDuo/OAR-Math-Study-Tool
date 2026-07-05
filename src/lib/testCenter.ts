import type { Difficulty, QuestionBankRow, QuestionRow, Section, SessionSummary } from "@/types";
import { ALL_STATUSES } from "@/lib/practiceModes";
import { VALID_SECTIONS } from "@/lib/constants";

export type CheckpointTestType = "checkpoint" | "section_review" | "cumulative";
export type CheckpointSection = Section | "mixed";
const TEST_BANK_TAG = "content:test";

export interface CheckpointTest {
  id: string;
  title: string;
  description: string;
  section: CheckpointSection;
  subtopics: string[];
  recommendedQuestionCount: number;
  testType: CheckpointTestType;
  noHints: boolean;
  comingSoon?: boolean;
  sourceBankId?: string;
  timeLimitMinutes?: number;
  calculatorNote?: string;
}

export interface CheckpointAvailability extends CheckpointTest {
  availableSections: Section[];
  availableSubtopics: string[];
  availableQuestionCount: number;
  startable: boolean;
  disabledReason?: string;
}

export const CHECKPOINT_TESTS: CheckpointTest[] = [
  {
    id: "math-foundations",
    title: "Math Foundations Review",
    description: "A checkpoint for arithmetic basics, units, exponents, and core math facts.",
    section: "math",
    subtopics: [
      "order_of_operations",
      "fractions_exponents",
      "unit_conversions",
      "memorization_math",
      "core_arithmetic",
    ],
    recommendedQuestionCount: 10,
    testType: "checkpoint",
    noHints: true,
  },
  {
    id: "math-arithmetic-percent",
    title: "Arithmetic & Percent Review",
    description: "Retention check for percentages, averages, markup, discounts, and conversions.",
    section: "math",
    subtopics: ["percentages", "discount_markup", "averages", "unit_conversions"],
    recommendedQuestionCount: 10,
    testType: "checkpoint",
    noHints: true,
  },
  {
    id: "math-applied-problems",
    title: "Applied Problems Review",
    description: "Word problems, rate/work setups, mixtures, systems, and equation translation.",
    section: "math",
    subtopics: [
      "word_to_equation",
      "distance_rate_time",
      "averages",
      "percentages",
      "discount_markup",
      "mixture_problems",
      "shared_work",
      "systems_of_equations",
    ],
    recommendedQuestionCount: 15,
    testType: "checkpoint",
    noHints: true,
  },
  {
    id: "math-algebra-advanced",
    title: "Algebra & Advanced Topics Review",
    description: "A broader checkpoint for algebra, roots, logs, probability, geometry, and sequences.",
    section: "math",
    subtopics: [
      "quadratic",
      "factoring",
      "exponent_rules",
      "radicals_roots",
      "logarithms",
      "probability",
      "matrix",
      "series_summation",
      "geometry",
      "arc_length_sectors",
    ],
    recommendedQuestionCount: 15,
    testType: "checkpoint",
    noHints: true,
  },
  {
    id: "math-cumulative",
    title: "Math Cumulative Review",
    description: "A larger retention check across all available math topics.",
    section: "math",
    subtopics: [
      "probability",
      "distance_rate_time",
      "shared_work",
      "fractions_exponents",
      "averages",
      "factoring",
      "exponent_rules",
      "geometry",
      "percentages",
      "logarithms",
      "systems_of_equations",
      "quadratic",
      "matrix",
      "series_summation",
      "arc_length_sectors",
      "unit_conversions",
      "radicals_roots",
      "order_of_operations",
      "word_to_equation",
      "mixture_problems",
      "discount_markup",
      "memorization_math",
    ],
    recommendedQuestionCount: 20,
    testType: "cumulative",
    noHints: true,
  },
];

export function getCheckpointTest(testId: string): CheckpointTest | undefined {
  return CHECKPOINT_TESTS.find((test) => test.id === testId);
}

export function getTestTypeLabel(testType: CheckpointTestType): string {
  switch (testType) {
    case "section_review":
      return "Section Review";
    case "cumulative":
      return "Cumulative Review";
    case "checkpoint":
    default:
      return "Checkpoint Review";
  }
}

export function getCheckpointAvailability(
  test: CheckpointTest,
  questions: QuestionRow[]
): CheckpointAvailability {
  if (test.comingSoon) {
    return {
      ...test,
      availableSections: [],
      availableSubtopics: [],
      availableQuestionCount: 0,
      startable: false,
      disabledReason: "Coming later.",
    };
  }

  const subtopicSet = new Set(test.subtopics);
  const matching = questions.filter((question) => {
    if (test.sourceBankId) return question.bank_id === test.sourceBankId;
    const sectionMatches = test.section === "mixed" || question.section === test.section;
    const subtopicMatches =
      subtopicSet.size === 0 || subtopicSet.has(question.subtopic);
    return sectionMatches && subtopicMatches;
  });
  const availableSections = Array.from(new Set(matching.map((q) => q.section)));
  const availableSubtopics = Array.from(new Set(matching.map((q) => q.subtopic)));
  const availableQuestionCount = matching.length;

  return {
    ...test,
    availableSections,
    availableSubtopics,
    availableQuestionCount,
    startable: availableQuestionCount > 0,
    disabledReason:
      availableQuestionCount > 0
        ? undefined
        : "Not enough questions are available for this checkpoint yet.",
  };
}

export function getCheckpointAvailabilities(
  questions: QuestionRow[],
  banks: QuestionBankRow[] = []
): CheckpointAvailability[] {
  const taggedTests = getTaggedCheckpointTests(banks);
  return [...CHECKPOINT_TESTS, ...taggedTests].map((test) =>
    getCheckpointAvailability(test, questions)
  );
}

export function buildCheckpointSessionRequest(test: CheckpointAvailability) {
  const questionCount = Math.min(test.recommendedQuestionCount, test.availableQuestionCount);
  return {
    sections: test.availableSections,
    subtopics: test.availableSubtopics.length > 0 ? test.availableSubtopics : undefined,
    questionCount,
    statusFilter: ALL_STATUSES,
    difficultyPriority: ["hard", "medium", "easy"] as Difficulty[],
    poolMode: "checkpoint",
    sessionType: "section_exam" as const,
  };
}

export function getTaggedCheckpointTests(banks: QuestionBankRow[]): CheckpointTest[] {
  return banks
    .filter((bank) => bank.section === "math" && (bank.tags ?? []).includes(TEST_BANK_TAG))
    .map((bank) => {
      const tags = bank.tags ?? [];
      const timeLimitMinutes = parseNumericTag(tags, "time_limit_minutes");
      const calculatorNote = parseStringTag(tags, "calculator");
      const taggedSection = parseCheckpointSectionTag(tags);
      return {
        id: `bank-${bank.id}`,
        title: bank.title,
        description: bank.description ?? "Uploaded cumulative test.",
        section: taggedSection ?? bank.section,
        subtopics: [],
        recommendedQuestionCount: bank.question_count,
        testType: "cumulative",
        noHints: true,
        sourceBankId: bank.id,
        timeLimitMinutes,
        calculatorNote,
      };
    });
}

function parseNumericTag(tags: string[], key: string) {
  const raw = parseStringTag(tags, key);
  if (!raw) return undefined;
  const parsed = Number(raw);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined;
}

function parseStringTag(tags: string[], key: string) {
  const prefix = `${key}:`;
  return tags.find((tag) => tag.startsWith(prefix))?.slice(prefix.length);
}

function parseCheckpointSectionTag(tags: string[]): CheckpointSection | undefined {
  const raw = parseStringTag(tags, "test_section");
  if (!raw) return undefined;
  if (raw === "mixed" || raw === "oar") return "mixed";
  return VALID_SECTIONS.includes(raw as Section) ? (raw as Section) : undefined;
}

export function inferCheckpointTestFromSession(
  session: Pick<SessionSummary, "sessionType" | "sections" | "subtopics">
): CheckpointTest | null {
  if (session.sessionType !== "section_exam") return null;
  const sessionSubtopics = new Set(session.subtopics ?? []);
  const candidates = CHECKPOINT_TESTS.filter((test) => {
    if (test.comingSoon) return false;
    if (test.section !== "mixed" && !session.sections.includes(test.section)) return false;
    if (sessionSubtopics.size === 0) return test.section === "mixed" || session.sections.includes(test.section as Section);
    return [...sessionSubtopics].every((subtopic) => test.subtopics.includes(subtopic));
  });
  if (candidates.length === 0) return null;
  return candidates.sort((a, b) => {
    const aOverlap = a.subtopics.filter((subtopic) => sessionSubtopics.has(subtopic)).length;
    const bOverlap = b.subtopics.filter((subtopic) => sessionSubtopics.has(subtopic)).length;
    return bOverlap - aOverlap || a.subtopics.length - b.subtopics.length;
  })[0];
}
