"use client";

import { buildDashboardStats, joinAnswers, summarizeSession } from "@/lib/calculateStats";
import { CONTENT_VERSION, getStaticConceptPages, getStaticQuestionBanks, getStaticQuestions, type StaticQuestionRow } from "@/lib/staticContent";
import { buildExportPayload } from "@/lib/exportResults";
import type {
  AnswerRow,
  AnswerWithQuestion,
  ConceptPageRow,
  DashboardStats,
  Difficulty,
  DraftAnswer,
  QuestionBankRow,
  QuestionRow,
  QuestionStatus,
  Section,
  SessionRow,
  SessionSummary,
  SessionType,
} from "@/types";

const STORAGE_KEY = "oar_public_progress_v1";
const PROGRESS_EVENT = "oar-public-progress-updated";

const STATUS_PRIORITY: Record<QuestionStatus, number> = {
  new: 0,
  incorrect: 1,
  correct: 2,
  mastered: 3,
};

interface QuestionProgress {
  status: QuestionStatus;
  attempt_count: number;
  correct_count: number;
  correct_session_ids: string[];
  last_attempted_at: string | null;
  last_correct_at: string | null;
}

interface LocalProgressState {
  schema: "oar-public-progress";
  version: 1;
  contentVersion: string;
  sessions: SessionRow[];
  answers: AnswerRow[];
  questionProgress: Record<string, QuestionProgress>;
}

interface SessionRequest {
  sections?: Section[];
  subtopics?: string[];
  questionCount?: number;
  statusFilter?: QuestionStatus[];
  questionIds?: string[];
  difficultyFilter?: Difficulty[];
  memorizationOnly?: boolean;
  difficultyPriority?: Difficulty[];
  poolMode?: string;
  sessionType?: SessionType;
}

interface SubmittedAnswer {
  questionId: string;
  userAnswer: string;
  isCorrect: boolean;
  isFlagged?: boolean;
  timeSpentSeconds?: number;
}

function defaultProgress(): QuestionProgress {
  return {
    status: "new",
    attempt_count: 0,
    correct_count: 0,
    correct_session_ids: [],
    last_attempted_at: null,
    last_correct_at: null,
  };
}

function emptyState(): LocalProgressState {
  return {
    schema: "oar-public-progress",
    version: 1,
    contentVersion: CONTENT_VERSION,
    sessions: [],
    answers: [],
    questionProgress: {},
  };
}

function hasStorage() {
  return typeof window !== "undefined" && Boolean(window.localStorage);
}

export function loadProgressState(): LocalProgressState {
  if (!hasStorage()) return emptyState();
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return emptyState();
    const parsed = JSON.parse(raw) as Partial<LocalProgressState>;
    if (parsed.schema !== "oar-public-progress" || parsed.version !== 1) return emptyState();
    return {
      schema: "oar-public-progress",
      version: 1,
      contentVersion: parsed.contentVersion ?? CONTENT_VERSION,
      sessions: Array.isArray(parsed.sessions) ? parsed.sessions : [],
      answers: Array.isArray(parsed.answers) ? parsed.answers : [],
      questionProgress: parsed.questionProgress && typeof parsed.questionProgress === "object" ? parsed.questionProgress : {},
    };
  } catch {
    return emptyState();
  }
}

function saveProgressState(state: LocalProgressState) {
  if (!hasStorage()) return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...state, contentVersion: CONTENT_VERSION }));
  notifyProgressChanged();
}

export function notifyProgressChanged() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(PROGRESS_EVENT));
}

export function subscribeToProgressChanges(callback: () => void) {
  if (typeof window === "undefined") return () => undefined;
  const storageHandler = (event: StorageEvent) => {
    if (event.key === STORAGE_KEY) callback();
  };
  window.addEventListener(PROGRESS_EVENT, callback);
  window.addEventListener("storage", storageHandler);
  return () => {
    window.removeEventListener(PROGRESS_EVENT, callback);
    window.removeEventListener("storage", storageHandler);
  };
}

function applyProgress(question: StaticQuestionRow, progress?: QuestionProgress): QuestionRow {
  const state = progress ?? defaultProgress();
  return {
    ...question,
    status: state.status,
    attempt_count: state.attempt_count,
    correct_count: state.correct_count,
    correct_session_ids: [...state.correct_session_ids],
    last_attempted_at: state.last_attempted_at,
    last_correct_at: state.last_correct_at,
  };
}

export function getLocalQuestionBanks(): QuestionBankRow[] {
  return getStaticQuestionBanks();
}

export function getLocalConceptPages(filters: { section?: string; subtopic?: string } = {}): ConceptPageRow[] {
  return getStaticConceptPages()
    .filter((page) => !filters.section || page.section === filters.section)
    .filter((page) => !filters.subtopic || page.subtopic === filters.subtopic)
    .sort((a, b) => b.updated_at.localeCompare(a.updated_at));
}

export function getLocalQuestions(filters: { section?: string; subtopic?: string; difficulty?: string; bankId?: string } = {}): QuestionRow[] {
  const progress = loadProgressState().questionProgress;
  return getStaticQuestions()
    .map((question) => applyProgress(question, progress[question.id]))
    .filter((question) => !filters.section || question.section === filters.section)
    .filter((question) => !filters.subtopic || question.subtopic === filters.subtopic)
    .filter((question) => !filters.difficulty || question.difficulty === filters.difficulty)
    .filter((question) => !filters.bankId || question.bank_id === filters.bankId)
    .sort((a, b) => b.created_at.localeCompare(a.created_at));
}

export function getLocalDashboardStats(): DashboardStats {
  const state = loadProgressState();
  return buildDashboardStats(state.answers, getLocalQuestions(), state.sessions);
}

export function getLocalSessions(): SessionSummary[] {
  return loadProgressState()
    .sessions
    .sort((a, b) => b.started_at.localeCompare(a.started_at))
    .map(summarizeSession);
}

export function getLocalSessionData(sessionId: string) {
  const state = loadProgressState();
  const session = state.sessions.find((item) => item.id === sessionId);
  if (!session) throw new Error("Session not found.");
  const byId = new Map(getLocalQuestions().map((question) => [question.id, question]));
  const questions = session.question_ids
    .map((id) => byId.get(id))
    .filter((question): question is QuestionRow => Boolean(question));
  const answers = state.answers.filter((answer) => answer.session_id === sessionId);
  return { session, questions, answers };
}

export function getLocalJoinedAnswers(filters: {
  section?: string;
  subtopic?: string;
  difficulty?: string;
  correct?: "true" | "false";
  flagged?: "true" | "false";
  sessionId?: string;
} = {}): AnswerWithQuestion[] {
  const state = loadProgressState();
  let answers = [...state.answers];
  if (filters.correct === "true") answers = answers.filter((answer) => answer.is_correct);
  if (filters.correct === "false") answers = answers.filter((answer) => !answer.is_correct);
  if (filters.flagged === "true") answers = answers.filter((answer) => answer.is_flagged);
  if (filters.flagged === "false") answers = answers.filter((answer) => !answer.is_flagged);
  if (filters.sessionId) answers = answers.filter((answer) => answer.session_id === filters.sessionId);

  let questions = getLocalQuestions();
  if (filters.section) questions = questions.filter((question) => question.section === filters.section);
  if (filters.subtopic) questions = questions.filter((question) => question.subtopic === filters.subtopic);
  if (filters.difficulty) questions = questions.filter((question) => question.difficulty === filters.difficulty);

  return joinAnswers(answers, questions).sort((a, b) => b.answered_at.localeCompare(a.answered_at));
}

export function createLocalSession(request: SessionRequest) {
  const state = loadProgressState();
  const allQuestions = getLocalQuestions();
  let selected: QuestionRow[];

  if (request.questionIds && request.questionIds.length > 0) {
    const order = new Map(request.questionIds.map((id, index) => [id, index]));
    selected = allQuestions
      .filter((question) => order.has(question.id))
      .sort((a, b) => (order.get(a.id) ?? 0) - (order.get(b.id) ?? 0));
  } else {
    const sections = request.sections ?? [];
    if (sections.length === 0) throw new Error("At least one section is required.");
    const statusFilter = request.statusFilter && request.statusFilter.length > 0
      ? request.statusFilter
      : (["new", "incorrect", "correct"] as QuestionStatus[]);
    const difficultyFilter = request.difficultyFilter && request.difficultyFilter.length > 0
      ? request.difficultyFilter
      : undefined;
    const pool = allQuestions.filter((question) => {
      if (!sections.includes(question.section)) return false;
      if (!statusFilter.includes(question.status)) return false;
      if (request.subtopics && request.subtopics.length > 0 && !request.subtopics.includes(question.subtopic)) return false;
      if (difficultyFilter && !difficultyFilter.includes(question.difficulty)) return false;
      if (request.memorizationOnly && !question.is_memorization) return false;
      return true;
    });
    if (pool.length === 0) {
      throw new Error("No questions match this selection. Try including more statuses or choose another topic.");
    }
    const difficultyPriority = new Map((request.difficultyPriority ?? []).map((difficulty, index) => [difficulty, index]));
    const prioritizeStatus = !request.poolMode || request.poolMode === "smart";
    selected = [...pool]
      .sort(() => Math.random() - 0.5)
      .sort((a, b) => {
        const difficultyDelta = (difficultyPriority.get(a.difficulty) ?? 99) - (difficultyPriority.get(b.difficulty) ?? 99);
        if (difficultyDelta !== 0) return difficultyDelta;
        return prioritizeStatus ? STATUS_PRIORITY[a.status] - STATUS_PRIORITY[b.status] : 0;
      })
      .slice(0, Math.min(Math.max(1, Math.floor(request.questionCount ?? 10)), pool.length));
  }

  if (selected.length === 0) throw new Error("No questions found for this session.");
  const now = new Date().toISOString();
  const session: SessionRow = {
    id: `sess_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    session_type: request.sessionType ?? (request.poolMode === "checkpoint" ? "section_exam" : "practice"),
    sections: Array.from(new Set(selected.map((question) => question.section))),
    subtopics: request.subtopics ?? null,
    question_ids: selected.map((question) => question.id),
    total_questions: selected.length,
    correct_count: 0,
    accuracy: 0,
    time_spent_seconds: null,
    started_at: now,
    completed_at: null,
    created_at: now,
  };

  saveProgressState({ ...state, sessions: [session, ...state.sessions] });
  return { session, questions: selected };
}

export function completeLocalSession(sessionId: string, answers: SubmittedAnswer[], timeSpentSeconds?: number) {
  const state = loadProgressState();
  const session = state.sessions.find((item) => item.id === sessionId);
  if (!session) throw new Error("Session not found.");
  if (session.completed_at) throw new Error("Session is already completed.");
  if (answers.length === 0) throw new Error("At least one answer is required to complete a session.");

  const now = new Date().toISOString();
  const progress = { ...state.questionProgress };
  const answerRows = answers.map((answer) => {
    const previous = progress[answer.questionId] ?? defaultProgress();
    const row: AnswerRow = {
      id: `ans_${sessionId}_${answer.questionId}`,
      session_id: sessionId,
      question_id: answer.questionId,
      user_answer: answer.userAnswer,
      is_correct: answer.isCorrect,
      is_flagged: answer.isFlagged ?? false,
      time_spent_seconds: answer.timeSpentSeconds ?? null,
      answered_at: now,
      exported: false,
      previous_status: previous.status,
    };
    progress[answer.questionId] = nextProgress(previous, answer.isCorrect, sessionId, now);
    return row;
  });

  const correct = answerRows.filter((answer) => answer.is_correct).length;
  const updatedSession: SessionRow = {
    ...session,
    correct_count: correct,
    accuracy: Number(((correct / answerRows.length) * 100).toFixed(2)),
    time_spent_seconds: timeSpentSeconds ?? null,
    completed_at: now,
  };

  saveProgressState({
    ...state,
    sessions: state.sessions.map((item) => (item.id === sessionId ? updatedSession : item)),
    answers: [...state.answers.filter((answer) => answer.session_id !== sessionId), ...answerRows],
    questionProgress: progress,
  });
  return updatedSession;
}

function nextProgress(previous: QuestionProgress, isCorrect: boolean, sessionId: string, now: string): QuestionProgress {
  const attemptCount = previous.attempt_count + 1;
  if (!isCorrect) {
    return {
      status: "incorrect",
      attempt_count: attemptCount,
      correct_count: 0,
      correct_session_ids: [],
      last_attempted_at: now,
      last_correct_at: previous.last_correct_at,
    };
  }
  const correctSessionIds = previous.correct_session_ids.includes(sessionId)
    ? previous.correct_session_ids
    : [...previous.correct_session_ids, sessionId];
  return {
    status: correctSessionIds.length >= 2 ? "mastered" : "correct",
    attempt_count: attemptCount,
    correct_count: previous.correct_count + 1,
    correct_session_ids: correctSessionIds,
    last_attempted_at: now,
    last_correct_at: now,
  };
}

export function deleteLocalSession(sessionId: string) {
  const state = loadProgressState();
  const sessions = state.sessions.filter((session) => session.id !== sessionId);
  const answers = state.answers.filter((answer) => answer.session_id !== sessionId);
  saveProgressState({
    ...state,
    sessions,
    answers,
    questionProgress: rebuildQuestionProgress(answers),
  });
}

function rebuildQuestionProgress(answers: AnswerRow[]): Record<string, QuestionProgress> {
  const progress: Record<string, QuestionProgress> = {};
  for (const answer of [...answers].sort((a, b) => a.answered_at.localeCompare(b.answered_at))) {
    const previous = progress[answer.question_id] ?? defaultProgress();
    progress[answer.question_id] = nextProgress(previous, answer.is_correct, answer.session_id, answer.answered_at);
  }
  return progress;
}

export function buildLocalExportPayload(args: { mode?: "today" | "day" | "session" | "all"; date?: string; sessionId?: string }) {
  const state = loadProgressState();
  let answers = [...state.answers];
  if (args.mode === "today" || !args.mode) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    answers = answers.filter((answer) => answer.answered_at >= today.toISOString() && !answer.exported);
  } else if (args.mode === "day" && args.date) {
    const start = new Date(`${args.date}T00:00:00.000`).toISOString();
    const end = new Date(`${args.date}T23:59:59.999`).toISOString();
    answers = answers.filter((answer) => answer.answered_at >= start && answer.answered_at <= end);
  } else if (args.mode === "session" && args.sessionId) {
    answers = answers.filter((answer) => answer.session_id === args.sessionId);
  }
  const questions = getLocalQuestions();
  const joined = joinAnswers(answers, questions);
  return buildExportPayload(joined, new Map(questions.map((question) => [question.id, question])), new Set(answers.map((answer) => answer.session_id)).size);
}

export function exportProgressPackage() {
  const extras: Record<string, string> = {};
  if (hasStorage()) {
    for (let index = 0; index < window.localStorage.length; index += 1) {
      const key = window.localStorage.key(index);
      if (!key) continue;
      if (key.startsWith("practice_session_context_") || key.startsWith("practice_session_draft_") || key.startsWith("concept_visited_")) {
        extras[key] = window.localStorage.getItem(key) ?? "";
      }
    }
  }
  return {
    schema: "oar-public-progress-export",
    version: 1,
    contentVersion: CONTENT_VERSION,
    exportedAt: new Date().toISOString(),
    progress: loadProgressState(),
    extras,
  };
}

export function importProgressPackage(payload: unknown) {
  if (!payload || typeof payload !== "object") throw new Error("Progress file is not valid JSON.");
  const candidate = payload as {
    schema?: string;
    version?: number;
    progress?: LocalProgressState;
    extras?: Record<string, string>;
  };
  if (candidate.schema !== "oar-public-progress-export" || candidate.version !== 1 || !candidate.progress) {
    throw new Error("This does not look like an OAR progress export.");
  }
  saveProgressState({
    ...emptyState(),
    sessions: Array.isArray(candidate.progress.sessions) ? candidate.progress.sessions : [],
    answers: Array.isArray(candidate.progress.answers) ? candidate.progress.answers : [],
    questionProgress: candidate.progress.questionProgress ?? {},
  });
  if (hasStorage() && candidate.extras) {
    for (const [key, value] of Object.entries(candidate.extras)) {
      if (key.startsWith("practice_session_context_") || key.startsWith("practice_session_draft_") || key.startsWith("concept_visited_")) {
        window.localStorage.setItem(key, value);
      }
    }
  }
  notifyProgressChanged();
}

export function resetLocalProgress() {
  if (!hasStorage()) return;
  window.localStorage.removeItem(STORAGE_KEY);
  const prefixes = ["practice_session_context_", "practice_session_draft_", "concept_visited_"];
  for (let index = window.localStorage.length - 1; index >= 0; index -= 1) {
    const key = window.localStorage.key(index);
    if (key && prefixes.some((prefix) => key.startsWith(prefix))) {
      window.localStorage.removeItem(key);
    }
  }
  notifyProgressChanged();
}

export function getDraftAnsweredCount(drafts: Record<string, DraftAnswer>) {
  return Object.values(drafts).filter((draft) => draft.userAnswer !== null).length;
}
