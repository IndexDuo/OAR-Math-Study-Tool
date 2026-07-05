import content from "@/data/math-public-content.v1.json";
import type { ConceptPageRow, QuestionBankRow, QuestionRow } from "@/types";

type QuestionProgressFields =
  | "status"
  | "attempt_count"
  | "correct_count"
  | "correct_session_ids"
  | "last_attempted_at"
  | "last_correct_at";

export type StaticQuestionRow = Omit<QuestionRow, QuestionProgressFields>;

interface StaticContentBundle {
  contentVersion: string;
  generatedAt: string;
  scope: string;
  notes?: string[];
  banks: QuestionBankRow[];
  questions: StaticQuestionRow[];
  conceptPages: ConceptPageRow[];
}

export const STATIC_CONTENT = content as unknown as StaticContentBundle;
export const CONTENT_VERSION = STATIC_CONTENT.contentVersion;

export function getStaticQuestionBanks(): QuestionBankRow[] {
  return STATIC_CONTENT.banks.map((bank) => ({ ...bank, tags: bank.tags ?? [] }));
}

export function getStaticQuestions(): StaticQuestionRow[] {
  return STATIC_CONTENT.questions.map((question) => ({
    ...question,
    options: [...question.options],
    tags: question.tags ? [...question.tags] : [],
    concepts_tested: question.concepts_tested ? [...question.concepts_tested] : [],
    related_to: question.related_to ? [...question.related_to] : [],
  }));
}

export function getStaticConceptPages(): ConceptPageRow[] {
  return STATIC_CONTENT.conceptPages.map((page) => ({
    ...page,
    prerequisites: page.prerequisites ? [...page.prerequisites] : null,
    blocks: page.blocks.map((block) => ({ ...block })),
    key_formulas: page.key_formulas ? [...page.key_formulas] : null,
    common_mistakes: page.common_mistakes ? [...page.common_mistakes] : null,
  }));
}
