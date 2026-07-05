import type {
  AnswerWithQuestion,
  DashboardStats,
  QuestionBankRow,
  Section,
} from "@/types";
import { SECTIONS, getSectionMeta, getSubtopicLabel } from "@/lib/constants";
import { formatPercent } from "@/lib/calculateStats";

export type StudySnapshotScope = "all" | Section | "weak";

const DETAIL_LIMIT_PER_SUBTOPIC = 20;
const WEAK_ACCURACY_THRESHOLD = 75;

export interface StudySnapshot {
  generatedAt: string;
  scope: StudySnapshotScope;
  scopeLabel: string;
  summary: {
    totalQuestionsAnswered: number;
    totalSessionsCompleted: number;
    overallAccuracy: number;
    missedAnswers: number;
    masteredQuestions: number;
    mostRecentStudyDate: string | null;
    omittedMissedQuestionDetails: number;
    weakAreaDefinition: string;
  };
  sections: StudySnapshotSection[];
  repeatedMistakePatterns: string[];
  recommendations: string[];
}

export interface StudySnapshotSection {
  section: Section;
  label: string;
  answered: number;
  correct: number;
  accuracy: number;
  mastered: number;
  incorrect: number;
  inProgress: number;
  newQuestions: number;
  weakestSubtopics: Array<{
    subtopic: string;
    label: string;
    accuracy: number;
    incorrect: number;
  }>;
  subtopics: StudySnapshotSubtopic[];
}

export interface StudySnapshotSubtopic {
  section: Section;
  subtopic: string;
  label: string;
  status: "Needs review" | "In progress" | "Mastered" | "Not started";
  answered: number;
  correct: number;
  accuracy: number;
  newQuestions: number;
  inProgress: number;
  incorrect: number;
  mastered: number;
  lastPracticed: string | null;
  difficultiesMissed: Partial<Record<string, number>>;
  missedConcepts: string[];
  missedTags: string[];
  memorizationMisses: number;
  missedQuestions: StudySnapshotMissedQuestion[];
  omittedMissedQuestions: number;
}

export interface StudySnapshotMissedQuestion {
  answerId: string;
  questionId: string;
  sessionId: string;
  difficulty: string;
  concepts: string[];
  tags: string[];
  question: string;
  userAnswer: string;
  correctAnswer: string;
  explanation: string | null;
  bankId: string;
  bankTitle: string | null;
  bankSource: string | null;
  isMemorization: boolean;
  answeredAt: string;
}

export function buildStudySnapshot(args: {
  scope: StudySnapshotScope;
  answers: AnswerWithQuestion[];
  stats: DashboardStats;
  banks: QuestionBankRow[];
}): StudySnapshot {
  const { scope, answers, stats, banks } = args;
  const bankById = new Map(banks.map((bank) => [bank.id, bank]));
  const weakSubtopicIds = getWeakSubtopicIds(stats, answers);
  const scopedSections = getScopedSections(scope);
  const scopedSubtopicIds =
    scope === "weak" ? weakSubtopicIds : new Set(stats.subtopics.map((sub) => sub.subtopic));

  const scopedAnswers = answers.filter((answer) => {
    if (!scopedSections.includes(answer.section)) return false;
    if (scope === "weak") return scopedSubtopicIds.has(answer.subtopic);
    return true;
  });

  const sections: StudySnapshotSection[] = scopedSections
    .map((section) => buildSectionSnapshot(section, scopedAnswers, stats, bankById, scope, scopedSubtopicIds))
    .filter((section) => section.answered > 0 || section.subtopics.length > 0);

  const totalAnswered = scopedAnswers.length;
  const totalCorrect = scopedAnswers.filter((answer) => answer.is_correct).length;
  const missedAnswers = scopedAnswers.filter((answer) => !answer.is_correct).length;
  const omittedMissedQuestionDetails = sections.reduce(
    (sum, section) =>
      sum + section.subtopics.reduce((inner, subtopic) => inner + subtopic.omittedMissedQuestions, 0),
    0
  );
  const mostRecentStudyDate = scopedAnswers.reduce<string | null>((latest, answer) => {
    if (!latest) return answer.answered_at;
    return answer.answered_at > latest ? answer.answered_at : latest;
  }, null);

  const snapshot: StudySnapshot = {
    generatedAt: new Date().toISOString(),
    scope,
    scopeLabel: getScopeLabel(scope),
    summary: {
      totalQuestionsAnswered: totalAnswered,
      totalSessionsCompleted: stats.overall.totalSessions,
      overallAccuracy: totalAnswered === 0 ? 0 : (totalCorrect / totalAnswered) * 100,
      missedAnswers,
      masteredQuestions: stats.subtopics
        .filter((subtopic) => scopedSections.includes(subtopic.section))
        .reduce((sum, subtopic) => sum + subtopic.stateCounts.mastered, 0),
      mostRecentStudyDate,
      omittedMissedQuestionDetails,
      weakAreaDefinition:
        "Weak areas include subtopics below 75% accuracy, subtopics with current incorrect/retry questions, and subtopics with missed answer history.",
    },
    sections,
    repeatedMistakePatterns: buildMistakePatterns(sections),
    recommendations: buildRecommendations(sections, stats, scope),
  };

  return snapshot;
}

function buildSectionSnapshot(
  section: Section,
  scopedAnswers: AnswerWithQuestion[],
  stats: DashboardStats,
  bankById: Map<string, QuestionBankRow>,
  scope: StudySnapshotScope,
  scopedSubtopicIds: Set<string>
): StudySnapshotSection {
  const sectionAnswers = scopedAnswers.filter((answer) => answer.section === section);
  const subtopicStats = stats.subtopics.filter((subtopic) => {
    if (subtopic.section !== section) return false;
    if (scope === "weak") return scopedSubtopicIds.has(subtopic.subtopic);
    return true;
  });
  const answered = sectionAnswers.length;
  const correct = sectionAnswers.filter((answer) => answer.is_correct).length;

  const subtopics = subtopicStats
    .map((subtopic) =>
      buildSubtopicSnapshot(
        subtopic.section,
        subtopic.subtopic,
        sectionAnswers.filter((answer) => answer.subtopic === subtopic.subtopic),
        stats,
        bankById
      )
    )
    .filter((subtopic) => scope !== "weak" || subtopic.status === "Needs review" || subtopic.missedQuestions.length > 0);

  return {
    section,
    label: getSectionMeta(section).label,
    answered,
    correct,
    accuracy: answered === 0 ? 0 : (correct / answered) * 100,
    mastered: subtopicStats.reduce((sum, subtopic) => sum + subtopic.stateCounts.mastered, 0),
    incorrect: subtopicStats.reduce((sum, subtopic) => sum + subtopic.stateCounts.incorrect, 0),
    inProgress: subtopicStats.reduce((sum, subtopic) => sum + subtopic.stateCounts.correct, 0),
    newQuestions: subtopicStats.reduce((sum, subtopic) => sum + subtopic.stateCounts.new, 0),
    weakestSubtopics: subtopicStats
      .filter((subtopic) => subtopic.totalAnswered > 0)
      .sort((a, b) => a.accuracy - b.accuracy)
      .slice(0, 5)
      .map((subtopic) => ({
        subtopic: subtopic.subtopic,
        label: getSubtopicLabel(subtopic.subtopic),
        accuracy: subtopic.accuracy,
        incorrect: subtopic.stateCounts.incorrect,
      })),
    subtopics,
  };
}

function buildSubtopicSnapshot(
  section: Section,
  subtopic: string,
  answers: AnswerWithQuestion[],
  stats: DashboardStats,
  bankById: Map<string, QuestionBankRow>
): StudySnapshotSubtopic {
  const stat = stats.subtopics.find((item) => item.section === section && item.subtopic === subtopic);
  const missedAnswers = answers.filter((answer) => !answer.is_correct);
  const details = missedAnswers.slice(0, DETAIL_LIMIT_PER_SUBTOPIC).map((answer) => {
    const bank = bankById.get(answer.bank_id);
    return {
      answerId: answer.id,
      questionId: answer.question_id,
      sessionId: answer.session_id,
      difficulty: answer.difficulty,
      concepts: answer.concepts_tested ?? [],
      tags: answer.tags ?? [],
      question: answer.question_text,
      userAnswer: answer.user_answer,
      correctAnswer: answer.correct_answer,
      explanation: answer.explanation,
      bankId: answer.bank_id,
      bankTitle: bank?.title ?? null,
      bankSource: bank?.source ?? answer.source ?? null,
      isMemorization: answer.is_memorization,
      answeredAt: answer.answered_at,
    };
  });

  const accuracy = stat?.accuracy ?? localAccuracy(answers);
  return {
    section,
    subtopic,
    label: getSubtopicLabel(subtopic),
    status: getSubtopicStatus(accuracy, stat?.totalAnswered ?? answers.length, stat?.stateCounts.incorrect ?? 0),
    answered: stat?.totalAnswered ?? answers.length,
    correct: stat?.correct ?? answers.filter((answer) => answer.is_correct).length,
    accuracy,
    newQuestions: stat?.stateCounts.new ?? 0,
    inProgress: stat?.stateCounts.correct ?? 0,
    incorrect: stat?.stateCounts.incorrect ?? 0,
    mastered: stat?.stateCounts.mastered ?? 0,
    lastPracticed: stat?.lastPracticedAt ?? mostRecentAnswerDate(answers),
    difficultiesMissed: countBy(missedAnswers, (answer) => answer.difficulty),
    missedConcepts: topStrings(missedAnswers.flatMap((answer) => answer.concepts_tested ?? [])),
    missedTags: topStrings(missedAnswers.flatMap((answer) => answer.tags ?? [])),
    memorizationMisses: missedAnswers.filter((answer) => answer.is_memorization).length,
    missedQuestions: details,
    omittedMissedQuestions: Math.max(0, missedAnswers.length - details.length),
  };
}

export function snapshotToMarkdown(snapshot: StudySnapshot) {
  const lines: string[] = [];
  lines.push("# OAR Study Snapshot");
  lines.push("");
  lines.push(`Generated: ${formatDateTime(snapshot.generatedAt)}`);
  lines.push(`Scope: ${snapshot.scopeLabel}`);
  lines.push("");
  lines.push("## High-level summary");
  lines.push("");
  lines.push(`- Total questions answered: ${snapshot.summary.totalQuestionsAnswered}`);
  lines.push(`- Completed sessions: ${snapshot.summary.totalSessionsCompleted}`);
  lines.push(`- Overall accuracy in scope: ${formatPercent(snapshot.summary.overallAccuracy, 1)}`);
  lines.push(`- Missed/incorrect answer attempts: ${snapshot.summary.missedAnswers}`);
  lines.push(`- Currently mastered questions: ${snapshot.summary.masteredQuestions}`);
  lines.push(`- Most recent study date: ${snapshot.summary.mostRecentStudyDate ? formatDateTime(snapshot.summary.mostRecentStudyDate) : "No study date found"}`);
  lines.push(`- Weak area definition: ${snapshot.summary.weakAreaDefinition}`);
  if (snapshot.summary.omittedMissedQuestionDetails > 0) {
    lines.push(`- Detail cap: ${snapshot.summary.omittedMissedQuestionDetails} missed question detail(s) omitted after the first ${DETAIL_LIMIT_PER_SUBTOPIC} per subtopic.`);
  }

  for (const section of snapshot.sections) {
    lines.push("");
    lines.push(`## ${section.label}`);
    lines.push("");
    lines.push(`- Answered: ${section.answered}`);
    lines.push(`- Accuracy: ${formatPercent(section.accuracy, 1)}`);
    lines.push(`- Mastered: ${section.mastered}`);
    lines.push(`- Needs review: ${section.incorrect}`);
    lines.push(`- In progress: ${section.inProgress}`);
    lines.push(`- New: ${section.newQuestions}`);
    lines.push("");
    lines.push("Weakest subtopics:");
    if (section.weakestSubtopics.length === 0) {
      lines.push("- No answered subtopics in this scope.");
    } else {
      section.weakestSubtopics.forEach((subtopic, index) => {
        lines.push(`${index + 1}. ${subtopic.label} - ${formatPercent(subtopic.accuracy, 0)}, ${subtopic.incorrect} retry`);
      });
    }

    for (const subtopic of section.subtopics) {
      lines.push("");
      lines.push(`### ${subtopic.label}`);
      lines.push("");
      lines.push(`- Status: ${subtopic.status}`);
      lines.push(`- Answered: ${subtopic.answered}`);
      lines.push(`- Accuracy: ${formatPercent(subtopic.accuracy, 1)}`);
      lines.push(`- New: ${subtopic.newQuestions}`);
      lines.push(`- In progress: ${subtopic.inProgress}`);
      lines.push(`- Incorrect/retry: ${subtopic.incorrect}`);
      lines.push(`- Mastered: ${subtopic.mastered}`);
      lines.push(`- Last practiced: ${subtopic.lastPracticed ? formatDateTime(subtopic.lastPracticed) : "Not practiced yet"}`);
      lines.push("");
      lines.push("Difficulties missed:");
      if (Object.keys(subtopic.difficultiesMissed).length === 0) lines.push("- None recorded.");
      for (const [difficulty, count] of Object.entries(subtopic.difficultiesMissed)) {
        lines.push(`- ${difficulty}: ${count}`);
      }
      if (subtopic.missedConcepts.length > 0) {
        lines.push("");
        lines.push("Common concepts missed:");
        subtopic.missedConcepts.forEach((concept) => lines.push(`- ${concept}`));
      }
      if (subtopic.missedTags.length > 0) {
        lines.push("");
        lines.push("Common tags missed:");
        subtopic.missedTags.forEach((tag) => lines.push(`- ${tag}`));
      }
      if (subtopic.memorizationMisses > 0) {
        lines.push("");
        lines.push(`Memorization misses: ${subtopic.memorizationMisses}`);
      }

      lines.push("");
      lines.push("Missed questions:");
      if (subtopic.missedQuestions.length === 0) {
        lines.push("- No missed questions found for this subtopic.");
      } else {
        for (const question of subtopic.missedQuestions) {
          lines.push("");
          lines.push(`#### Question ID: ${question.questionId}`);
          lines.push(`- Difficulty: ${question.difficulty}`);
          lines.push(`- Concepts/tags: ${formatList([...question.concepts, ...question.tags])}`);
          lines.push(`- Question bank: ${question.bankTitle ?? question.bankId}${question.bankSource ? ` (${question.bankSource})` : ""}`);
          lines.push("");
          lines.push("Question:");
          lines.push(block(question.question));
          lines.push("");
          lines.push("User answer:");
          lines.push(block(question.userAnswer || "(blank)"));
          lines.push("");
          lines.push("Correct answer:");
          lines.push(block(question.correctAnswer));
          if (question.explanation) {
            lines.push("");
            lines.push("Explanation:");
            lines.push(block(question.explanation));
          }
          lines.push("");
          lines.push("Notes for ChatGPT:");
          lines.push("Generate similar questions that test this same concept, but use different numbers/context.");
        }
        if (subtopic.omittedMissedQuestions > 0) {
          lines.push("");
          lines.push(`Note: ${subtopic.omittedMissedQuestions} additional missed question(s) omitted for this subtopic after the first ${DETAIL_LIMIT_PER_SUBTOPIC}.`);
        }
      }
    }
  }

  lines.push("");
  lines.push("## Repeated Mistake Patterns");
  lines.push("");
  if (snapshot.repeatedMistakePatterns.length === 0) {
    lines.push("- No repeated missed-question patterns found in this scope.");
  } else {
    snapshot.repeatedMistakePatterns.forEach((pattern) => lines.push(`- ${pattern}`));
  }

  lines.push("");
  lines.push("## Recommended Next Actions");
  lines.push("");
  if (snapshot.recommendations.length === 0) {
    lines.push("- No targeted recommendations found. Use Full Topic Review for retention.");
  } else {
    snapshot.recommendations.forEach((recommendation) => lines.push(`- ${recommendation}`));
  }

  lines.push("");
  lines.push("## Instructions for ChatGPT");
  lines.push("");
  lines.push("Use this snapshot to diagnose my OAR study progress.");
  lines.push("Please identify:");
  lines.push("1. My weakest topics.");
  lines.push("2. The mistake patterns I repeat.");
  lines.push("3. Which lessons should be rewritten.");
  lines.push("4. Which new question banks should be generated.");
  lines.push("5. A short study plan for the next 1-3 days.");
  lines.push("");
  lines.push("When generating new questions, use different numbers and contexts from the questions listed here.");

  return lines.join("\n");
}

function getWeakSubtopicIds(stats: DashboardStats, answers: AnswerWithQuestion[]) {
  const ids = new Set<string>();
  for (const subtopic of stats.subtopics) {
    if (
      (subtopic.totalAnswered > 0 && subtopic.accuracy < WEAK_ACCURACY_THRESHOLD) ||
      subtopic.stateCounts.incorrect > 0
    ) {
      ids.add(subtopic.subtopic);
    }
  }
  for (const answer of answers) {
    if (!answer.is_correct || answer.is_flagged) ids.add(answer.subtopic);
  }
  return ids;
}

function getScopedSections(scope: StudySnapshotScope): Section[] {
  if (scope === "all" || scope === "weak") return SECTIONS.map((section) => section.id);
  return [scope];
}

function getScopeLabel(scope: StudySnapshotScope) {
  if (scope === "all") return "All Sections";
  if (scope === "weak") return "Weak Areas";
  return getSectionMeta(scope).label;
}

function getSubtopicStatus(accuracy: number, answered: number, incorrect: number) {
  if (answered === 0) return "Not started";
  if (incorrect > 0 || accuracy < WEAK_ACCURACY_THRESHOLD) return "Needs review";
  if (accuracy >= 80) return "Mastered";
  return "In progress";
}

function localAccuracy(answers: AnswerWithQuestion[]) {
  if (answers.length === 0) return 0;
  return (answers.filter((answer) => answer.is_correct).length / answers.length) * 100;
}

function mostRecentAnswerDate(answers: AnswerWithQuestion[]) {
  return answers.reduce<string | null>((latest, answer) => {
    if (!latest) return answer.answered_at;
    return answer.answered_at > latest ? answer.answered_at : latest;
  }, null);
}

function countBy<T>(items: T[], getKey: (item: T) => string) {
  const counts: Record<string, number> = {};
  for (const item of items) {
    const key = getKey(item);
    counts[key] = (counts[key] ?? 0) + 1;
  }
  return counts;
}

function topStrings(values: string[]) {
  return Object.entries(countBy(values.filter(Boolean), (value) => value))
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, 8)
    .map(([value]) => value);
}

function buildMistakePatterns(sections: StudySnapshotSection[]) {
  const patterns: string[] = [];
  for (const section of sections) {
    for (const subtopic of section.subtopics) {
      const missedCount = subtopic.missedQuestions.length + subtopic.omittedMissedQuestions;
      if (missedCount === 0) continue;
      if (subtopic.missedConcepts.length > 0) {
        patterns.push(
          `${subtopic.label}: ${missedCount} missed question${missedCount === 1 ? "" : "s"} involving ${subtopic.missedConcepts.slice(0, 3).join(", ")}.`
        );
      } else {
        const difficultyParts = Object.entries(subtopic.difficultiesMissed)
          .map(([difficulty, count]) => `${count} ${difficulty}`)
          .join(", ");
        patterns.push(
          `${subtopic.label}: ${missedCount} missed question${missedCount === 1 ? "" : "s"}${difficultyParts ? ` (${difficultyParts})` : ""}.`
        );
      }
    }
  }
  return patterns.slice(0, 12);
}

function buildRecommendations(sections: StudySnapshotSection[], stats: DashboardStats, scope: StudySnapshotScope) {
  const recommendations: string[] = [];
  for (const section of sections) {
    for (const subtopic of section.subtopics) {
      if (subtopic.answered > 0 && subtopic.accuracy < 70) {
        recommendations.push(`${subtopic.label}: review the lesson, then do Smart Practice before widening the topic pool.`);
      } else if (subtopic.status === "Needs review") {
        recommendations.push(`${subtopic.label}: do a short Smart Practice set focused on current retry questions.`);
      }
      const hardMisses = subtopic.difficultiesMissed.hard ?? 0;
      if (hardMisses >= 2) {
        recommendations.push(`${subtopic.label}: add Hard/Application Practice because hard questions are a repeated miss.`);
      }
      if (subtopic.memorizationMisses > 0) {
        recommendations.push(`${subtopic.label}: do a Memorization Drill or generate rapid-recall cards.`);
      }
    }
  }

  const scopedSections = getScopedSections(scope);
  const stale = stats.staleMasteredSubtopics.filter((subtopic) => scopedSections.includes(subtopic.section));
  for (const subtopic of stale.slice(0, 5)) {
    recommendations.push(`${getSubtopicLabel(subtopic.subtopic)}: mastered but stale; do a Full Topic Review for retention.`);
  }

  return Array.from(new Set(recommendations)).slice(0, 15);
}

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString();
}

function formatList(values: string[]) {
  const clean = Array.from(new Set(values.filter(Boolean)));
  return clean.length > 0 ? clean.join(", ") : "None provided";
}

function block(value: string) {
  return ["```", value, "```"].join("\n");
}
