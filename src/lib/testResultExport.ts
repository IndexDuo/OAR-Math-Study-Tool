import type { AnswerRow, QuestionRow, SessionRow } from "@/types";
import { getSectionMeta } from "@/lib/constants";
import { formatDuration, formatPercent } from "@/lib/calculateStats";
import { getTestTypeLabel, type CheckpointTestType } from "@/lib/testCenter";
import {
  getQuestionReviewLabel,
  getQuestionReviewSubtopicLabel,
  getQuestionReviewSubtopicSlug,
  getQuestionReviewTopicLabel,
  getQuestionReviewTopicSlug,
} from "@/lib/questionRouting";

export function buildTestResultMarkdown(args: {
  session: SessionRow;
  questions: QuestionRow[];
  answers: AnswerRow[];
  testTitle: string;
  testType?: CheckpointTestType;
}) {
  const { session, questions, answers, testTitle, testType } = args;
  const answerById = new Map(answers.map((answer) => [answer.question_id, answer]));
  const subtopicStats = buildSubtopicStats(questions, answerById);
  const missed = questions.filter((question) => answerById.get(question.id)?.is_correct === false);
  const lines: string[] = [];

  lines.push("# OAR Checkpoint Test Result");
  lines.push("");
  lines.push(`Test: ${testTitle}`);
  lines.push(`Type: ${testType ? getTestTypeLabel(testType) : "Checkpoint Review"}`);
  lines.push(`Completed: ${session.completed_at ? new Date(session.completed_at).toLocaleString() : "Not completed"}`);
  lines.push(`Sections: ${session.sections.map((section) => getSectionMeta(section).label).join(", ")}`);
  lines.push(`Score: ${session.correct_count}/${session.total_questions} (${formatPercent(session.accuracy, 1)})`);
  lines.push(`Time: ${formatDuration(session.time_spent_seconds)}`);
  lines.push("");
  lines.push("This was a no-hints checkpoint-style result. Explanations should be used for review after the test, not during retakes.");
  lines.push("");

  lines.push("## Subtopic Breakdown");
  lines.push("");
  if (subtopicStats.length === 0) {
    lines.push("- No subtopic data found.");
  } else {
    for (const item of subtopicStats) {
      lines.push(`- ${item.label}: ${item.correct}/${item.total} (${formatPercent(item.accuracy, 0)})`);
    }
  }
  lines.push("");

  lines.push("## Missed Questions");
  lines.push("");
  if (missed.length === 0) {
    lines.push("- No missed questions. Recommend retention review and a future retake.");
  } else {
    lines.push("Missed-topic routing:");
    for (const group of buildMissedTopicGroups(missed, questions)) {
      lines.push(`- ${group.topicLabel}`);
      for (const subtopic of group.subtopics) {
        lines.push(`  - ${subtopic.label}: missed Q${subtopic.questionNumbers.join(", Q")}`);
      }
    }
    lines.push("");

    for (const question of missed) {
      const answer = answerById.get(question.id);
      lines.push(`### Question ID: ${question.id}`);
      lines.push("");
      lines.push(`- Section: ${getSectionMeta(question.section).label}`);
      lines.push(`- Review route: ${getQuestionReviewLabel(question)}`);
      lines.push(`- Difficulty: ${question.difficulty}`);
      lines.push(`- Concepts/tags: ${formatList([...(question.concepts_tested ?? []), ...(question.tags ?? [])])}`);
      lines.push("");
      lines.push("Question:");
      lines.push(block(question.question_text));
      lines.push("");
      lines.push("User answer:");
      lines.push(block(answer?.user_answer || "(blank)"));
      lines.push("");
      lines.push("Correct answer:");
      lines.push(block(question.correct_answer));
      if (question.explanation) {
        lines.push("");
        lines.push("Explanation:");
        lines.push(block(question.explanation));
      }
      lines.push("");
    }
  }

  lines.push("## Every Question");
  lines.push("");
  questions.forEach((question, index) => {
    const answer = answerById.get(question.id);
    lines.push(`### ${index + 1}. ${getQuestionReviewLabel(question)} (${question.difficulty})`);
    lines.push("");
    lines.push(`- Correct: ${answer?.is_correct ? "Yes" : "No"}`);
    lines.push(`- Flagged: ${answer?.is_flagged ? "Yes" : "No"}`);
    lines.push(`- User answer: ${answer?.user_answer || "(blank)"}`);
    lines.push(`- Correct answer: ${question.correct_answer}`);
    lines.push("");
    lines.push(question.question_text);
    if (question.explanation) {
      lines.push("");
      lines.push(`Explanation: ${question.explanation}`);
    }
    lines.push("");
  });

  lines.push("## Instructions for ChatGPT");
  lines.push("");
  lines.push("Analyze this checkpoint test result. Identify the weakest topics, repeated mistake patterns, and what targeted practice questions should be generated next. Do not reuse the same numbers or exact wording.");

  return lines.join("\n");
}

function buildSubtopicStats(questions: QuestionRow[], answerById: Map<string, AnswerRow>) {
  const bySubtopic = new Map<string, { label: string; total: number; correct: number }>();
  for (const question of questions) {
    const subtopic = getQuestionReviewSubtopicSlug(question);
    const current = bySubtopic.get(subtopic) ?? {
      label: getQuestionReviewSubtopicLabel(question),
      total: 0,
      correct: 0,
    };
    current.total += 1;
    if (answerById.get(question.id)?.is_correct) current.correct += 1;
    bySubtopic.set(subtopic, current);
  }
  return Array.from(bySubtopic.values())
    .map((item) => ({
      ...item,
      accuracy: item.total === 0 ? 0 : (item.correct / item.total) * 100,
    }))
    .sort((a, b) => a.accuracy - b.accuracy);
}

function buildMissedTopicGroups(missed: QuestionRow[], allQuestions: QuestionRow[]) {
  const groups = new Map<
    string,
    {
      topicLabel: string;
      subtopics: Map<string, { label: string; questionNumbers: number[] }>;
    }
  >();

  for (const question of missed) {
    const topicSlug = getQuestionReviewTopicSlug(question);
    const subtopicSlug = getQuestionReviewSubtopicSlug(question);
    const questionNumber = allQuestions.findIndex((q) => q.id === question.id) + 1;
    const group = groups.get(topicSlug) ?? {
      topicLabel: getQuestionReviewTopicLabel(question),
      subtopics: new Map(),
    };
    const subtopic = group.subtopics.get(subtopicSlug) ?? {
      label: getQuestionReviewSubtopicLabel(question),
      questionNumbers: [],
    };
    subtopic.questionNumbers.push(questionNumber);
    group.subtopics.set(subtopicSlug, subtopic);
    groups.set(topicSlug, group);
  }

  return Array.from(groups.values()).map((group) => ({
    topicLabel: group.topicLabel,
    subtopics: Array.from(group.subtopics.values()),
  }));
}

function formatList(values: string[]) {
  const clean = Array.from(new Set(values.filter(Boolean)));
  return clean.length > 0 ? clean.join(", ") : "None provided";
}

function block(value: string) {
  return ["```", value, "```"].join("\n");
}
