import type { Difficulty, DraftAnswer, QuestionRow, QuestionStatus, Section } from "@/types";

export type PracticePoolMode =
  | "smart"
  | "full"
  | "missed"
  | "memorization"
  | "hard"
  | "custom";

export interface PracticeModeInfo {
  id: PracticePoolMode;
  label: string;
  shortLabel: string;
  description: string;
}

export interface CustomPracticeFilters {
  includeMastered: boolean;
  difficulty: "any" | Difficulty;
  memorizationOnly: boolean;
}

export interface PracticeFilters {
  statusFilter: QuestionStatus[];
  difficultyFilter?: Difficulty[];
  memorizationOnly?: boolean;
  difficultyPriority?: Difficulty[];
}

export interface PracticeSessionContext {
  mode: PracticePoolMode;
  modeLabel: string;
  section?: Section;
  subtopics?: string[];
  questionCount?: number;
  origin?: "lesson" | "learn" | "dashboard" | "practice" | "review" | "section" | "subtopic" | "memorize" | "tests";
  returnTo?: string;
  returnLabel?: string;
  sourceSubtopic?: string;
  sourceSection?: string;
  sourceMode?: string;
  sourceCta?: string;
  testId?: string;
  testTitle?: string;
  testType?: "checkpoint" | "section_review" | "cumulative";
  disableHints?: boolean;
  isCheckpoint?: boolean;
  testSubtopics?: string[];
  recommendedQuestionCount?: number;
  timeLimitMinutes?: number;
}

export interface PracticeSessionDraftState {
  drafts: Record<string, DraftAnswer>;
  currentIndex: number;
  elapsedSeconds: number;
  savedAt: string;
  continueAfterTimeExpired?: boolean;
}

export const ALL_STATUSES: QuestionStatus[] = ["new", "incorrect", "correct", "mastered"];
export const SMART_STATUSES: QuestionStatus[] = ["new", "incorrect", "correct"];

export const PRACTICE_MODES: PracticeModeInfo[] = [
  {
    id: "smart",
    label: "Smart Practice",
    shortLabel: "Smart Practice",
    description: "Recommended. Focuses on new, weak, and not-yet-mastered questions.",
  },
  {
    id: "full",
    label: "Full Topic Review",
    shortLabel: "Full Review",
    description: "Includes mastered questions too. Use this when you want to check retention.",
  },
  {
    id: "missed",
    label: "Missed Questions",
    shortLabel: "Missed Questions",
    description: "Practice currently incorrect questions for this topic.",
  },
  {
    id: "memorization",
    label: "Memorization Drill",
    shortLabel: "Memorization Drill",
    description: "Drill facts, formulas, and conversions that need fast recall.",
  },
  {
    id: "hard",
    label: "Hard/Application Practice",
    shortLabel: "Hard Practice",
    description: "Focuses on multi-step and application-style questions.",
  },
  {
    id: "custom",
    label: "Custom Practice",
    shortLabel: "Custom",
    description: "Choose your own filters.",
  },
];

export const DEFAULT_CUSTOM_FILTERS: CustomPracticeFilters = {
  includeMastered: false,
  difficulty: "any",
  memorizationOnly: false,
};

export function getPracticeModeInfo(mode: PracticePoolMode): PracticeModeInfo {
  return PRACTICE_MODES.find((m) => m.id === mode) ?? PRACTICE_MODES[0];
}

export function getPracticeFilters(
  mode: PracticePoolMode,
  custom: CustomPracticeFilters = DEFAULT_CUSTOM_FILTERS
): PracticeFilters {
  switch (mode) {
    case "full":
      return { statusFilter: ALL_STATUSES };
    case "missed":
      return { statusFilter: ["incorrect"] };
    case "memorization":
      return { statusFilter: ALL_STATUSES, memorizationOnly: true };
    case "hard":
      return {
        statusFilter: ALL_STATUSES,
        difficultyFilter: ["hard", "medium"],
        difficultyPriority: ["hard", "medium"],
      };
    case "custom":
      return {
        statusFilter: custom.includeMastered ? ALL_STATUSES : SMART_STATUSES,
        difficultyFilter: custom.difficulty === "any" ? undefined : [custom.difficulty],
        memorizationOnly: custom.memorizationOnly,
      };
    case "smart":
    default:
      return { statusFilter: SMART_STATUSES };
  }
}

export function getEmptyPoolMessage(mode: PracticePoolMode): string {
  switch (mode) {
    case "missed":
      return "No missed questions for this topic yet.";
    case "memorization":
      return "No memorization questions are available for this topic.";
    case "hard":
      return "No hard or medium application questions are available. Try Smart Practice or Full Topic Review.";
    case "full":
      return "No questions are available for this topic yet.";
    case "custom":
      return "No questions match your custom filters.";
    case "smart":
    default:
      return "No Smart Practice questions match this topic. Try Full Topic Review to include mastered questions.";
  }
}

export function questionMatchesPracticeFilters(
  question: QuestionRow,
  filters: PracticeFilters
): boolean {
  if (!filters.statusFilter.includes(question.status)) return false;
  if (filters.difficultyFilter && !filters.difficultyFilter.includes(question.difficulty)) return false;
  if (filters.memorizationOnly && !question.is_memorization) return false;
  return true;
}

export function buildPracticeSessionRequest(args: {
  section: Section;
  subtopics?: string[];
  questionCount: number;
  mode: PracticePoolMode;
  customFilters?: CustomPracticeFilters;
}) {
  const filters = getPracticeFilters(args.mode, args.customFilters);
  return {
    sections: [args.section],
    subtopics: args.subtopics && args.subtopics.length > 0 ? args.subtopics : undefined,
    questionCount: args.questionCount,
    statusFilter: filters.statusFilter,
    difficultyFilter: filters.difficultyFilter,
    memorizationOnly: filters.memorizationOnly,
    difficultyPriority: filters.difficultyPriority,
    poolMode: args.mode,
  };
}

const CONTEXT_PREFIX = "practice_session_context_";
const DRAFT_PREFIX = "practice_session_draft_";

export function savePracticeSessionContext(sessionId: string, context: PracticeSessionContext) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(`${CONTEXT_PREFIX}${sessionId}`, JSON.stringify(context));
  } catch {
    // Non-critical; results can still infer basic topic context from session questions.
  }
}

export function loadPracticeSessionContext(sessionId: string): PracticeSessionContext | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(`${CONTEXT_PREFIX}${sessionId}`);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object") return null;
    return parsed as PracticeSessionContext;
  } catch {
    return null;
  }
}

export function savePracticeSessionDraft(
  sessionId: string,
  draftState: PracticeSessionDraftState
) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(`${DRAFT_PREFIX}${sessionId}`, JSON.stringify(draftState));
  } catch {
    // Non-critical; users can still complete the active session.
  }
}

export function loadPracticeSessionDraft(sessionId: string): PracticeSessionDraftState | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(`${DRAFT_PREFIX}${sessionId}`);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as unknown;
    if (!isPracticeSessionDraftState(parsed)) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function clearPracticeSessionDraft(sessionId: string) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(`${DRAFT_PREFIX}${sessionId}`);
  } catch {
    // Non-critical cleanup.
  }
}

function isPracticeSessionDraftState(value: unknown): value is PracticeSessionDraftState {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<PracticeSessionDraftState>;
  return (
    Boolean(candidate.drafts) &&
    typeof candidate.drafts === "object" &&
    typeof candidate.currentIndex === "number" &&
    typeof candidate.elapsedSeconds === "number" &&
    typeof candidate.savedAt === "string"
  );
}

export function isCheckpointContext(context: PracticeSessionContext | null | undefined) {
  return Boolean(
    context?.isCheckpoint ||
      context?.disableHints ||
      context?.origin === "tests" ||
      context?.sourceMode === "checkpoint-test" ||
      context?.testId
  );
}
