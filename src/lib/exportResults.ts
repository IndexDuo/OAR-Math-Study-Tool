import type {
  AnswerWithQuestion,
  ExportPayload,
  ExportedResult,
  QuestionRow,
  QuestionStatus,
  Section,
} from "@/types";
import { getSubtopicLabel } from "./constants";

// Build the v3 daily aggregated export payload.
export function buildExportPayload(
  joined: AnswerWithQuestion[],
  questionsById: Map<string, QuestionRow>,
  sessionCount = 1
): ExportPayload {
  const now = new Date();
  const exportDate = now.toISOString().slice(0, 10);

  const results: ExportedResult[] = joined.map((a) => {
    const q = questionsById.get(a.question_id);
    return {
      questionId: a.question_id,
      bankId: q?.bank_id ?? "",
      section: a.section,
      subtopic: a.subtopic,
      difficulty: a.difficulty,
      question: a.question_text,
      correctAnswer: a.correct_answer,
      userAnswer: a.user_answer,
      isCorrect: a.is_correct,
      isFlagged: a.is_flagged,
      timeSpentSeconds: a.time_spent_seconds,
      answeredAt: a.answered_at,
      attemptNumber: q?.attempt_count ?? 1,
      currentStatus: a.current_status,
      previousStatus: a.previous_status,
    };
  });

  const correctCount = results.filter((r) => r.isCorrect).length;
  const accuracy =
    results.length === 0 ? 0 : Number(((correctCount / results.length) * 100).toFixed(2));

  // bySection stats.
  const bySection: ExportPayload["stats"]["bySection"] = {};
  for (const r of results) {
    if (!bySection[r.section]) bySection[r.section] = { total: 0, correct: 0, accuracy: 0 };
    bySection[r.section].total += 1;
    if (r.isCorrect) bySection[r.section].correct += 1;
  }
  for (const v of Object.values(bySection)) {
    v.accuracy = v.total === 0 ? 0 : Number(((v.correct / v.total) * 100).toFixed(2));
  }

  // bySubtopic stats.
  const bySubtopic: ExportPayload["stats"]["bySubtopic"] = {};
  for (const r of results) {
    if (!bySubtopic[r.subtopic]) bySubtopic[r.subtopic] = { total: 0, correct: 0, accuracy: 0, status: "new" as QuestionStatus };
    bySubtopic[r.subtopic].total += 1;
    if (r.isCorrect) bySubtopic[r.subtopic].correct += 1;
    bySubtopic[r.subtopic].status = r.currentStatus;
  }
  for (const v of Object.values(bySubtopic)) {
    v.accuracy = v.total === 0 ? 0 : Number(((v.correct / v.total) * 100).toFixed(2));
  }

  // Improvements: subtopics where previous_status was incorrect/new and current is correct/mastered.
  const improvements: ExportPayload["stats"]["improvements"] = [];
  const prevAccBySubtopic: Record<string, { prev: number; curr: number }> = {};
  for (const r of results) {
    const wasWorse = ["new", "incorrect"].includes(r.previousStatus) && ["correct", "mastered"].includes(r.currentStatus);
    if (wasWorse && !prevAccBySubtopic[r.subtopic]) {
      // Use overall subtopic accuracy as current, assume 0 as previous.
      prevAccBySubtopic[r.subtopic] = { prev: 0, curr: bySubtopic[r.subtopic]?.accuracy ?? 0 };
    }
  }
  for (const [subtopic, { prev, curr }] of Object.entries(prevAccBySubtopic)) {
    if (curr > prev) {
      improvements.push({ subtopic, previousAccuracy: prev, currentAccuracy: curr });
    }
  }

  const totalTimeSeconds = results.reduce((s, r) => s + (r.timeSpentSeconds ?? 0), 0);

  const summary = buildSummary(results, bySection, bySubtopic, improvements, sessionCount);

  return {
    exportId: `export_${exportDate.replace(/-/g, "")}`,
    exportDate,
    summary,
    stats: {
      totalQuestions: results.length,
      correctCount,
      accuracy,
      sessionsCount: sessionCount,
      totalTimeSeconds,
      bySection,
      bySubtopic,
      improvements,
    },
    questions: results,
  };
}

// Deterministic natural-language summary paragraph for exports.
function buildSummary(
  results: ExportedResult[],
  bySection: ExportPayload["stats"]["bySection"],
  bySubtopic: ExportPayload["stats"]["bySubtopic"],
  improvements: ExportPayload["stats"]["improvements"],
  sessionCount: number
): string {
  if (results.length === 0) return "No questions were practiced in this export period.";

  const correctCount = results.filter((r) => r.isCorrect).length;
  const accuracy = results.length === 0 ? 0 : (correctCount / results.length) * 100;
  const flaggedCount = results.filter((r) => r.isFlagged).length;

  const sectionNames: Record<Section, string> = {
    math: "Math",
    reading: "Reading",
    mechanical: "Mechanical",
  };

  // Best and worst subtopics.
  const subtopicEntries = Object.entries(bySubtopic).filter(([, v]) => v.total >= 2);
  subtopicEntries.sort((a, b) => b[1].accuracy - a[1].accuracy);
  const best = subtopicEntries[0];
  const worst = subtopicEntries[subtopicEntries.length - 1];

  const sessionWord = sessionCount === 1 ? "session" : "sessions";
  let s = `Today you practiced ${results.length} question${results.length === 1 ? "" : "s"} across ${sessionCount} ${sessionWord}, scoring ${accuracy.toFixed(1)}% overall (${correctCount}/${results.length} correct).`;

  // Section breakdown.
  const sectionParts = Object.entries(bySection)
    .map(([sec, v]) => `${sectionNames[sec as Section] ?? sec}: ${v.correct}/${v.total} (${v.accuracy.toFixed(0)}%)`)
    .join("; ");
  if (sectionParts) s += ` By section — ${sectionParts}.`;

  // Strongest / weakest.
  if (best) s += ` Strongest area: ${getSubtopicLabel(best[0])} (${best[1].accuracy.toFixed(0)}%).`;
  if (worst && worst[0] !== best?.[0]) s += ` Weakest area: ${getSubtopicLabel(worst[0])} (${worst[1].accuracy.toFixed(0)}%).`;

  // Flagged.
  if (flaggedCount > 0) s += ` You flagged ${flaggedCount} question${flaggedCount === 1 ? "" : "s"} for extra review.`;

  // Improvements.
  if (improvements.length > 0) {
    const improved = improvements.map((imp) => getSubtopicLabel(imp.subtopic)).join(", ");
    s += ` Questions in the following areas moved from incorrect/new to correct/mastered today, indicating learning progress: ${improved}.`;
  }

  // Status transitions summary.
  const movedToCorrect = results.filter((r) => r.previousStatus === "incorrect" && r.currentStatus === "correct").length;
  const movedToMastered = results.filter((r) => r.currentStatus === "mastered").length;
  const droppedBack = results.filter((r) => r.previousStatus === "mastered" && r.currentStatus === "incorrect").length;

  if (movedToCorrect > 0) s += ` ${movedToCorrect} question${movedToCorrect === 1 ? "" : "s"} moved from incorrect to in-progress.`;
  if (movedToMastered > 0) s += ` ${movedToMastered} question${movedToMastered === 1 ? "" : "s"} reached mastered status.`;
  if (droppedBack > 0) s += ` Note: ${droppedBack} previously mastered question${droppedBack === 1 ? "" : "s"} dropped back to incorrect — worth re-drilling.`;

  return s;
}

// Trigger a JSON download in the browser.
export function downloadJson(payload: unknown, filename: string) {
  const json = JSON.stringify(payload, null, 2);
  const blob = new Blob([json], { type: "application/json" });
  downloadBlob(blob, filename);
}

export function downloadText(text: string, filename: string) {
  const blob = new Blob([text], { type: "text/plain" });
  downloadBlob(blob, filename);
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
