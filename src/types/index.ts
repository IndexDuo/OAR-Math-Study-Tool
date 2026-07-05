// Core type definitions for the OAR Math Study Tool.

export type Section = "math" | "reading" | "mechanical";
export type Difficulty = "easy" | "medium" | "hard";
export type SessionType = "practice" | "section_exam" | "full_mock";
export type QuestionStatus = "new" | "incorrect" | "correct" | "mastered";

// ============================================================
// Bundled content and local-progress row shapes.
// ============================================================

export interface QuestionBankRow {
  id: string;
  title: string;
  description: string | null;
  section: Section;
  question_count: number;
  source: string | null;
  tags: string[] | null;
  created_at: string;
}

export interface QuestionRow {
  id: string;
  bank_id: string;
  section: Section;
  subtopic: string;
  difficulty: Difficulty;
  question_text: string;
  options: string[];
  correct_answer: string;
  explanation: string | null;
  hint: string | null;
  formula: string | null;
  // v3 state tracking
  status: QuestionStatus;
  attempt_count: number;
  correct_count: number;
  correct_session_ids: string[];
  last_attempted_at: string | null;
  last_correct_at: string | null;
  // v3 metadata
  source: string | null;
  tags: string[] | null;
  question_type: string | null;
  concepts_tested: string[] | null;
  related_to: string[] | null;
  is_memorization: boolean;
  created_at: string;
}

export interface SessionRow {
  id: string;
  session_type: SessionType;
  sections: Section[];
  subtopics: string[] | null;
  question_ids: string[];
  total_questions: number;
  correct_count: number;
  accuracy: number;
  time_spent_seconds: number | null;
  started_at: string;
  completed_at: string | null;
  created_at: string;
}

export interface AnswerRow {
  id: string;
  session_id: string;
  question_id: string;
  user_answer: string;
  is_correct: boolean;
  is_flagged: boolean;
  time_spent_seconds: number | null;
  answered_at: string;
  exported: boolean;
  previous_status: QuestionStatus;
}

// An answer joined with its question — the main shape stats code works with.
export interface AnswerWithQuestion extends AnswerRow {
  bank_id: string;
  section: Section;
  subtopic: string;
  difficulty: Difficulty;
  question_text: string;
  correct_answer: string;
  explanation: string | null;
  hint: string | null;
  formula: string | null;
  source: string | null;
  tags: string[] | null;
  question_type: string | null;
  concepts_tested: string[] | null;
  related_to: string[] | null;
  is_memorization: boolean;
  // current status of the question (after this answer was recorded)
  current_status: QuestionStatus;
}

// ============================================================
// Aggregated stats used by the dashboard.
// ============================================================

export interface OverallStats {
  totalQuestions: number;
  totalCorrect: number;
  accuracy: number;
  totalSessions: number;
  readinessScore: number; // weighted: math 40% / reading 30% / mech 30%
}

export interface SectionStats {
  section: Section;
  totalAnswered: number;
  correct: number;
  accuracy: number;
  questionsAvailable: number;
}

// State counts for a subtopic: how many questions are in each status bucket.
export interface SubtopicStateCounts {
  new: number;
  incorrect: number;
  correct: number;
  mastered: number;
}

export interface SubtopicStats {
  section: Section;
  subtopic: string;
  totalAnswered: number;
  correct: number;
  accuracy: number;
  questionsAvailable: number;
  lastPracticedAt: string | null; // ISO string or null
  stateCounts: SubtopicStateCounts;
}

export interface SessionSummary {
  id: string;
  sessionType: SessionType;
  sections: Section[];
  subtopics: string[] | null;
  totalQuestions: number;
  correct: number;
  accuracy: number;
  timeSpentSeconds: number | null;
  startedAt: string;
  completedAt: string | null;
}

export interface DashboardStats {
  overall: OverallStats;
  sections: SectionStats[];
  subtopics: SubtopicStats[];
  recentSessions: SessionSummary[];
  accuracyOverTime: { date: string; accuracy: number; section?: Section }[];
  weakSubtopics: SubtopicStats[];
  staleMasteredSubtopics: SubtopicStats[]; // mastered but not practiced in 14+ days
}

// ============================================================
// Results export JSON shape (downloaded from the app).
// ============================================================

export interface ExportedResult {
  questionId: string;
  bankId: string;
  section: Section;
  subtopic: string;
  difficulty: Difficulty;
  question: string;
  correctAnswer: string;
  userAnswer: string;
  isCorrect: boolean;
  isFlagged: boolean;
  timeSpentSeconds: number | null;
  answeredAt: string;
  attemptNumber: number;
  currentStatus: QuestionStatus;
  previousStatus: QuestionStatus;
}

export interface ExportPayload {
  exportId: string;
  exportDate: string;
  summary: string; // natural-language paragraph for exports
  stats: {
    totalQuestions: number;
    correctCount: number;
    accuracy: number;
    sessionsCount: number;
    totalTimeSeconds: number;
    bySection: Record<string, { total: number; correct: number; accuracy: number }>;
    bySubtopic: Record<string, { total: number; correct: number; accuracy: number; status: QuestionStatus }>;
    improvements: Array<{ subtopic: string; previousAccuracy: number; currentAccuracy: number }>;
  };
  questions: ExportedResult[];
}

// ============================================================
// Concept / Teaching page content (Khan Academy-style).
// ============================================================

/** A single teaching block — the building unit of a concept page. */
export interface ConceptBlock {
  type: "intro" | "explanation" | "formula" | "example" | "tip" | "warning" | "summary";
  title?: string;
  content: string; // supports LaTeX via MathText
  solution?: string; // optional hidden reveal content for structured examples
  difficulty?: Difficulty; // which level this block targets
}

export interface ConceptPageRow {
  id: string;
  subtopic: string;
  section: Section;
  title: string;
  overview: string;
  prerequisites: string[] | null;
  blocks: ConceptBlock[];
  key_formulas: string[] | null;
  common_mistakes: string[] | null;
  source: string | null;
  created_at: string;
  updated_at: string;
}

// ============================================================
// Client-side test-taking state (not persisted until submit).
// ============================================================

export interface DraftAnswer {
  questionId: string;
  userAnswer: string | null;
  isFlagged: boolean;
  timeSpentSeconds: number;
}
