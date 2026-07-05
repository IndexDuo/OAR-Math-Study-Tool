import type {
  AnswerRow,
  AnswerWithQuestion,
  DashboardStats,
  OverallStats,
  QuestionRow,
  Section,
  SectionStats,
  SessionRow,
  SessionSummary,
  SubtopicStateCounts,
  SubtopicStats,
} from "@/types";
import { SECTIONS, SUBTOPICS } from "./constants";

// Pure helpers for local progress and readiness calculations.

export function joinAnswers(
  answers: AnswerRow[],
  questions: QuestionRow[]
): AnswerWithQuestion[] {
  const qById = new Map(questions.map((q) => [q.id, q]));
  const out: AnswerWithQuestion[] = [];
  for (const a of answers) {
    const q = qById.get(a.question_id);
    if (!q) continue;
    out.push({
      ...a,
      bank_id: q.bank_id,
      section: q.section,
      subtopic: q.subtopic,
      difficulty: q.difficulty,
      question_text: q.question_text,
      correct_answer: q.correct_answer,
      explanation: q.explanation,
      hint: q.hint,
      formula: q.formula,
      source: q.source,
      tags: q.tags,
      question_type: q.question_type,
      concepts_tested: q.concepts_tested,
      related_to: q.related_to,
      is_memorization: q.is_memorization,
      current_status: q.status,
    });
  }
  return out;
}

export function calcOverall(
  joined: AnswerWithQuestion[],
  sessions: SessionRow[],
  sectionStats: SectionStats[]
): OverallStats {
  const total = joined.length;
  const correct = joined.filter((a) => a.is_correct).length;

  const readinessScore = SECTIONS.reduce((sum, s) => {
    const sec = sectionStats.find((x) => x.section === s.id);
    const acc = sec && sec.totalAnswered > 0 ? sec.accuracy : 0;
    return sum + acc * s.readinessWeight;
  }, 0);

  return {
    totalQuestions: total,
    totalCorrect: correct,
    accuracy: total === 0 ? 0 : (correct / total) * 100,
    totalSessions: sessions.filter((s) => s.completed_at).length,
    readinessScore,
  };
}

export function calcBySection(
  joined: AnswerWithQuestion[],
  questions: QuestionRow[]
): SectionStats[] {
  return SECTIONS.map(({ id }) => {
    const secAnswers = joined.filter((a) => a.section === id);
    const correct = secAnswers.filter((a) => a.is_correct).length;
    const available = questions.filter((q) => q.section === id).length;
    return {
      section: id,
      totalAnswered: secAnswers.length,
      correct,
      accuracy: secAnswers.length === 0 ? 0 : (correct / secAnswers.length) * 100,
      questionsAvailable: available,
    };
  });
}

export function calcBySubtopic(
  joined: AnswerWithQuestion[],
  questions: QuestionRow[]
): SubtopicStats[] {
  return SUBTOPICS.map((meta) => {
    const subAnswers = joined.filter(
      (a) => a.section === meta.section && a.subtopic === meta.id
    );
    const correct = subAnswers.filter((a) => a.is_correct).length;
    const available = questions.filter(
      (q) => q.section === meta.section && q.subtopic === meta.id
    ).length;

    // Find most recent answer for this subtopic.
    const lastAnswered = subAnswers.reduce<string | null>((latest, a) => {
      if (!latest) return a.answered_at;
      return a.answered_at > latest ? a.answered_at : latest;
    }, null);

    // State counts: derived from the question bank (current status of each question).
    const subQuestions = questions.filter(
      (q) => q.section === meta.section && q.subtopic === meta.id
    );
    const stateCounts: SubtopicStateCounts = {
      new: subQuestions.filter((q) => q.status === "new").length,
      incorrect: subQuestions.filter((q) => q.status === "incorrect").length,
      correct: subQuestions.filter((q) => q.status === "correct").length,
      mastered: subQuestions.filter((q) => q.status === "mastered").length,
    };

    return {
      section: meta.section,
      subtopic: meta.id,
      totalAnswered: subAnswers.length,
      correct,
      accuracy: subAnswers.length === 0 ? 0 : (correct / subAnswers.length) * 100,
      questionsAvailable: available,
      lastPracticedAt: lastAnswered,
      stateCounts,
    };
  });
}

export function summarizeSession(session: SessionRow): SessionSummary {
  return {
    id: session.id,
    sessionType: session.session_type,
    sections: session.sections,
    subtopics: session.subtopics,
    totalQuestions: session.total_questions,
    correct: session.correct_count,
    accuracy: session.accuracy,
    timeSpentSeconds: session.time_spent_seconds,
    startedAt: session.started_at,
    completedAt: session.completed_at,
  };
}

export function calcAccuracyOverTime(
  sessions: SessionRow[]
): { date: string; accuracy: number; section?: Section }[] {
  return [...sessions]
    .filter((s) => s.completed_at !== null)
    .sort((a, b) => a.started_at.localeCompare(b.started_at))
    .map((s) => ({
      date: s.started_at.slice(0, 10),
      accuracy: s.accuracy,
      section: s.sections.length === 1 ? s.sections[0] : undefined,
    }));
}

export function buildDashboardStats(
  answers: AnswerRow[],
  questions: QuestionRow[],
  sessions: SessionRow[]
): DashboardStats {
  const joined = joinAnswers(answers, questions);
  const sections = calcBySection(joined, questions);
  const subtopics = calcBySubtopic(joined, questions);
  const overall = calcOverall(joined, sessions, sections);

  const recentSessions = [...sessions]
    .filter((s) => s.completed_at !== null)
    .sort((a, b) => b.started_at.localeCompare(a.started_at))
    .slice(0, 5)
    .map(summarizeSession);

  const weakSubtopics = subtopics
    .filter((s) => s.totalAnswered > 0 && s.accuracy < 75)
    .sort((a, b) => a.accuracy - b.accuracy)
    .slice(0, 3);

  // Mastered subtopics not practiced in 14+ days.
  const fourteenDaysAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString();
  const staleMasteredSubtopics = subtopics.filter(
    (s) =>
      s.stateCounts.mastered > 0 &&
      (!s.lastPracticedAt || s.lastPracticedAt < fourteenDaysAgo)
  );

  return {
    overall,
    sections,
    subtopics,
    recentSessions,
    accuracyOverTime: calcAccuracyOverTime(sessions),
    weakSubtopics,
    staleMasteredSubtopics,
  };
}

// ============================================================
// "Last practiced" display helper used across subtopic cards.
// ============================================================

export function formatLastPracticed(isoString: string | null): {
  text: string;
  urgency: "none" | "normal" | "warn" | "danger";
} {
  if (!isoString) return { text: "Not started", urgency: "none" };

  const now = Date.now();
  const then = new Date(isoString).getTime();
  const diffDays = Math.floor((now - then) / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return { text: "Practiced today", urgency: "none" };
  if (diffDays <= 7) return { text: `${diffDays}d ago`, urgency: "normal" };
  if (diffDays <= 14) return { text: `${diffDays}d ago — consider reviewing`, urgency: "warn" };
  return { text: `${diffDays}d ago — needs review`, urgency: "danger" };
}

export function formatPercent(value: number, digits = 1): string {
  if (Number.isNaN(value) || !Number.isFinite(value)) return "0%";
  return `${value.toFixed(digits)}%`;
}

export function formatDuration(seconds: number | null | undefined): string {
  if (!seconds || seconds < 0) return "—";
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  if (m === 0) return `${s}s`;
  if (s === 0) return `${m}m`;
  return `${m}m ${s}s`;
}
