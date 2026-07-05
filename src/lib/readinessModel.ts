import type { DashboardStats, Section, SessionSummary, SubtopicStats } from "@/types";
import { SECTIONS, getSectionMeta, getSubtopicLabel } from "@/lib/constants";
import {
  COMPLETE_THRESHOLD,
  computeLockState,
  computeRanks,
  getLearningNodes,
} from "@/lib/learningPath";
import type { CheckpointAvailability } from "@/lib/testCenter";
import type { PracticeSessionContext } from "@/lib/practiceModes";

export type StudyFocus =
  | "balanced"
  | "math"
  | "reading"
  | "mechanical"
  | "weak";

export interface StudyPlanSettings {
  targetDate?: string;
  dailyStudyMinutes?: number;
  focus?: StudyFocus;
}

export interface ReadinessFactor {
  label: string;
  score: number;
  explanation: string;
}

export interface SectionReadiness {
  section: Section;
  label: string;
  score: number;
  confidence: "High" | "Medium" | "Low";
  factors: ReadinessFactor[];
  weakSubtopics: SubtopicStats[];
  staleSubtopics: SubtopicStats[];
  recommendation: string;
  dataNote?: string;
}

export interface OverallReadiness {
  score: number;
  confidence: "High" | "Medium" | "Low";
  sections: SectionReadiness[];
  explanation: string;
}

export interface StudyTask {
  id: string;
  title: string;
  type:
    | "lesson"
    | "review_lesson"
    | "smart_practice"
    | "full_review"
    | "hard_practice"
    | "review_missed"
    | "memorization"
    | "checkpoint"
    | "export";
  section?: Section;
  subtopic?: string;
  reason: string;
  timeMinutes: number;
  href: string;
  cta: string;
  priority: number;
}

export interface StudyPlan {
  today: StudyTask[];
  nextThreeDays: Array<{ day: string; tasks: StudyTask[] }>;
  week: StudyTask[];
  target: {
    targetDate: string | null;
    daysUntil: number | null;
    message: string;
    urgency: "none" | "normal" | "urgent" | "past";
  };
}

export interface RecentSessionContextMap {
  [sessionId: string]: PracticeSessionContext | null;
}

export function buildReadinessModel(args: {
  stats: DashboardStats;
  recentContexts?: RecentSessionContextMap;
}): OverallReadiness {
  const { stats, recentContexts = {} } = args;
  const sectionModels = SECTIONS.map((section) =>
    buildSectionReadiness(section.id, stats, recentContexts)
  );
  const score = Math.round(
    SECTIONS.reduce((sum, section) => {
      const readiness = sectionModels.find((item) => item.section === section.id);
      return sum + (readiness?.score ?? 0) * section.readinessWeight;
    }, 0)
  );
  const confidence = combineConfidence(sectionModels);

  return {
    score,
    confidence,
    sections: sectionModels,
    explanation:
      "This is a study-readiness estimate, not an official OAR score. It uses coverage, accuracy, mastery, weak areas, retention, and recent checkpoint reviews when available.",
  };
}

export function buildStudyPlan(args: {
  stats: DashboardStats;
  readiness: OverallReadiness;
  settings?: StudyPlanSettings;
  checkpointTests?: CheckpointAvailability[];
  recentContexts?: RecentSessionContextMap;
}): StudyPlan {
  const settings = normalizeSettings(args.settings);
  const allTasks = buildCandidateTasks(args.stats, args.readiness, settings, args.checkpointTests ?? []);
  const ordered = orderTasks(allTasks, settings);
  const today = ordered.slice(0, 5);
  const nextThreeDays = [
    { day: "Day 1", tasks: ordered.slice(0, 3) },
    { day: "Day 2", tasks: ordered.slice(3, 6) },
    { day: "Day 3", tasks: ordered.slice(6, 9) },
  ].filter((day) => day.tasks.length > 0);

  return {
    today,
    nextThreeDays,
    week: ordered.slice(0, 10),
    target: buildTargetSummary(settings),
  };
}

export function normalizeSettings(settings?: StudyPlanSettings): StudyPlanSettings {
  return {
    targetDate: settings?.targetDate,
    dailyStudyMinutes: settings?.dailyStudyMinutes,
    focus: settings?.focus ?? "balanced",
  };
}

function buildSectionReadiness(
  section: Section,
  stats: DashboardStats,
  recentContexts: RecentSessionContextMap
): SectionReadiness {
  const sectionMeta = getSectionMeta(section);
  const sectionStat = stats.sections.find((item) => item.section === section);
  const subtopics = stats.subtopics.filter((item) => item.section === section);
  const withQuestions = subtopics.filter((item) => item.questionsAvailable > 0);
  const attempted = withQuestions.filter((item) => item.totalAnswered > 0);
  const masteredQuestions = withQuestions.reduce((sum, item) => sum + item.stateCounts.mastered, 0);
  const availableQuestions = withQuestions.reduce((sum, item) => sum + item.questionsAvailable, 0);
  const weakSubtopics = withQuestions
    .filter((item) => item.totalAnswered > 0 && (item.accuracy < 75 || item.stateCounts.incorrect > 0))
    .sort((a, b) => a.accuracy - b.accuracy)
    .slice(0, 3);
  const staleSubtopics = stats.staleMasteredSubtopics.filter((item) => item.section === section);
  const checkpointSessions = getRecentCheckpointSessions(section, stats.recentSessions, recentContexts);

  const coverageScore =
    withQuestions.length === 0 ? 0 : (attempted.length / withQuestions.length) * 100;
  const accuracyScore = sectionStat?.totalAnswered ? sectionStat.accuracy : 0;
  const masteryScore = availableQuestions === 0 ? 0 : (masteredQuestions / availableQuestions) * 100;
  const weakAreaScore =
    attempted.length === 0
      ? 0
      : Math.max(0, 100 - (weakSubtopics.length / Math.max(1, attempted.length)) * 100);
  const retentionScore =
    masteredQuestions === 0
      ? sectionStat?.totalAnswered
        ? 65
        : 0
      : Math.max(0, 100 - (staleSubtopics.length / Math.max(1, attempted.length)) * 100);
  const checkpointScore =
    checkpointSessions.length === 0
      ? null
      : checkpointSessions.reduce((sum, session) => sum + session.accuracy, 0) /
        checkpointSessions.length;

  const factors: ReadinessFactor[] = [
    {
      label: "Coverage",
      score: coverageScore,
      explanation:
        withQuestions.length === 0
          ? "No questions are available for this section yet."
          : `${attempted.length} of ${withQuestions.length} available topics have been attempted.`,
    },
    {
      label: "Accuracy",
      score: accuracyScore,
      explanation:
        sectionStat && sectionStat.totalAnswered > 0
          ? `${Math.round(accuracyScore)}% across ${sectionStat.totalAnswered} answered questions.`
          : "No answered questions yet.",
    },
    {
      label: "Mastery",
      score: masteryScore,
      explanation:
        availableQuestions > 0
          ? `${masteredQuestions} of ${availableQuestions} available questions are currently mastered.`
          : "No available question pool to measure mastery.",
    },
    {
      label: "Weak areas",
      score: weakAreaScore,
      explanation:
        weakSubtopics.length > 0
          ? `Needs attention: ${weakSubtopics.map((item) => getSubtopicLabel(item.subtopic)).join(", ")}.`
          : attempted.length > 0
          ? "No low-accuracy topics are currently flagged."
          : "Weak areas need practice data before they can be detected.",
    },
    {
      label: "Retention",
      score: retentionScore,
      explanation:
        staleSubtopics.length > 0
          ? `${staleSubtopics.length} mastered topic${staleSubtopics.length === 1 ? "" : "s"} need retention review.`
          : masteredQuestions > 0
          ? "No stale mastered topics are currently flagged."
          : "Retention will become meaningful after topics are mastered.",
    },
  ];

  if (checkpointScore !== null) {
    factors.push({
      label: "Checkpoint",
      score: checkpointScore,
      explanation: `${checkpointSessions.length} recent checkpoint result${checkpointSessions.length === 1 ? "" : "s"} found for this section.`,
    });
  }

  const weights =
    checkpointScore === null
      ? { Coverage: 0.25, Accuracy: 0.3, Mastery: 0.25, "Weak areas": 0.1, Retention: 0.1 }
      : { Coverage: 0.2, Accuracy: 0.25, Mastery: 0.2, "Weak areas": 0.15, Retention: 0.1, Checkpoint: 0.1 };
  const score = Math.round(
    factors.reduce((sum, factor) => {
      const weight = weights[factor.label as keyof typeof weights] ?? 0;
      return sum + factor.score * weight;
    }, 0)
  );

  const confidence = getConfidence({
    answered: sectionStat?.totalAnswered ?? 0,
    attemptedTopics: attempted.length,
    checkpointCount: checkpointSessions.length,
  });

  return {
    section,
    label: sectionMeta.label,
    score,
    confidence,
    factors,
    weakSubtopics,
    staleSubtopics,
    recommendation: getSectionRecommendation(section, weakSubtopics, staleSubtopics, checkpointScore),
    dataNote:
      confidence === "Low"
        ? `${sectionMeta.shortLabel} readiness is low-confidence because there is not much practice or checkpoint data yet.`
        : undefined,
  };
}

function buildCandidateTasks(
  stats: DashboardStats,
  readiness: OverallReadiness,
  settings: StudyPlanSettings,
  checkpointTests: CheckpointAvailability[]
): StudyTask[] {
  const tasks: StudyTask[] = [];
  const latest = stats.recentSessions[0];
  if (latest && latest.correct < latest.totalQuestions) {
    tasks.push({
      id: `review-missed-${latest.id}`,
      title: "Review latest missed questions",
      type: "review_missed",
      reason: `${latest.totalQuestions - latest.correct} question${latest.totalQuestions - latest.correct === 1 ? "" : "s"} from your most recent session need another pass.`,
      timeMinutes: 10,
      href: `/results/${latest.id}`,
      cta: "Open results",
      priority: 100,
    });
  }

  const weakPool =
    settings.focus === "weak"
      ? stats.weakSubtopics
      : focusSection(settings.focus)
      ? stats.weakSubtopics.filter((item) => item.section === focusSection(settings.focus))
      : stats.weakSubtopics;
  for (const weak of weakPool.slice(0, 3)) {
    tasks.push({
      id: `review-lesson-${weak.subtopic}`,
      title: `Review ${getSubtopicLabel(weak.subtopic)} lesson`,
      type: "review_lesson",
      section: weak.section,
      subtopic: weak.subtopic,
      reason: `${Math.round(weak.accuracy)}% accuracy means the concept deserves a short reset before more questions.`,
      timeMinutes: 15,
      href: `/learn/${weak.subtopic}`,
      cta: "Open lesson",
      priority: 92,
    });
    tasks.push({
      id: `smart-practice-${weak.subtopic}`,
      title: `Do Smart Practice for ${getSubtopicLabel(weak.subtopic)}`,
      type: "smart_practice",
      section: weak.section,
      subtopic: weak.subtopic,
      reason:
        weak.stateCounts.incorrect > 0
          ? `${weak.stateCounts.incorrect} question${weak.stateCounts.incorrect === 1 ? "" : "s"} are currently marked for retry.`
          : "This topic is below the readiness threshold.",
      timeMinutes: 20,
      href: practiceHref(weak.section, weak.subtopic, "smart", 10),
      cta: "Start practice",
      priority: 90,
    });
  }

  for (const stale of stats.staleMasteredSubtopics.slice(0, 2)) {
    tasks.push({
      id: `retention-${stale.subtopic}`,
      title: `Refresh ${getSubtopicLabel(stale.subtopic)}`,
      type: "full_review",
      section: stale.section,
      subtopic: stale.subtopic,
      reason: "This topic has mastered questions but has not been practiced recently.",
      timeMinutes: 15,
      href: practiceHref(stale.section, stale.subtopic, "full-review", 10),
      cta: "Start full review",
      priority: 72,
    });
  }

  const nextLesson = findNextLearningTarget(stats, focusSection(settings.focus));
  if (nextLesson) {
    tasks.push({
      id: `next-lesson-${nextLesson.subtopic}`,
      title: `Continue lesson: ${getSubtopicLabel(nextLesson.subtopic)}`,
      type: "lesson",
      section: nextLesson.section,
      subtopic: nextLesson.subtopic,
      reason: nextLesson.reason,
      timeMinutes: 15,
      href: `/learn/${nextLesson.subtopic}`,
      cta: "Open lesson",
      priority: 65,
    });
  }

  const checkpoint = chooseCheckpoint(readiness, checkpointTests, settings);
  if (checkpoint) {
    tasks.push({
      id: `checkpoint-${checkpoint.id}`,
      title: `Take ${checkpoint.title}`,
      type: "checkpoint",
      section: checkpoint.section === "mixed" ? undefined : checkpoint.section,
      reason: `${checkpoint.availableQuestionCount} existing questions are available for a no-hints retention check.`,
      timeMinutes: checkpoint.recommendedQuestionCount <= 10 ? 20 : 30,
      href: "/tests",
      cta: "Open Test Center",
      priority: 60,
    });
  }

  tasks.push({
    id: "memorization-drill",
    title: "Do a short memorization drill",
    type: "memorization",
    section: "math",
    reason: "Fast recall for conversions and formulas is high-value and low-friction.",
    timeMinutes: 5,
    href: "/practice?mode=memorization",
    cta: "Open Practice",
    priority: 55,
  });

  if (stats.overall.totalQuestions > 0) {
    tasks.push({
      id: "export-snapshot",
      title: "Export a Study Snapshot",
      type: "export",
      reason: "Use it when asking ChatGPT for diagnosis or targeted question bank ideas.",
      timeMinutes: 2,
      href: "/review",
      cta: "Open export",
      priority: 35,
    });
  }

  if (tasks.length === 0) {
    tasks.push({
      id: "start-learning",
      title: "Start with the Learning Path",
      type: "lesson",
      reason: "Not enough data yet. Begin with foundations so the app can start coaching from real progress.",
      timeMinutes: 15,
      href: "/learn",
      cta: "Open Learn",
      priority: 50,
    });
  }

  return dedupeTasks(tasks);
}

function getSectionRecommendation(
  section: Section,
  weakSubtopics: SubtopicStats[],
  staleSubtopics: SubtopicStats[],
  checkpointScore: number | null
) {
  if (weakSubtopics[0]) {
    return `Review ${getSubtopicLabel(weakSubtopics[0].subtopic)}, then do Smart Practice.`;
  }
  if (staleSubtopics[0]) {
    return `Do Full Topic Review for ${getSubtopicLabel(staleSubtopics[0].subtopic)}.`;
  }
  if (checkpointScore === null) {
    return `Take a ${getSectionMeta(section).shortLabel} checkpoint when enough questions are available.`;
  }
  return "Keep rotating checkpoint reviews with focused practice.";
}

function getConfidence(args: {
  answered: number;
  attemptedTopics: number;
  checkpointCount: number;
}): "High" | "Medium" | "Low" {
  if (args.answered >= 40 || args.checkpointCount >= 2) return "High";
  if (args.answered >= 10 || args.attemptedTopics >= 2 || args.checkpointCount >= 1) return "Medium";
  return "Low";
}

function combineConfidence(sections: SectionReadiness[]): "High" | "Medium" | "Low" {
  const values = sections.map((section) => section.confidence);
  if (values.every((value) => value === "High")) return "High";
  if (values.some((value) => value !== "Low")) return "Medium";
  return "Low";
}

function getRecentCheckpointSessions(
  section: Section,
  sessions: SessionSummary[],
  contexts: RecentSessionContextMap
) {
  return sessions.filter((session) => {
    const context = contexts[session.id];
    if (!context?.isCheckpoint && !context?.testId) return false;
    return session.sections.includes(section);
  });
}

function chooseCheckpoint(
  readiness: OverallReadiness,
  checkpoints: CheckpointAvailability[],
  settings: StudyPlanSettings
) {
  const focus = focusSection(settings.focus);
  const weakestSection = [...readiness.sections]
    .filter((section) => !focus || section.section === focus)
    .sort((a, b) => a.score - b.score)[0];
  return checkpoints.find(
    (test) =>
      test.startable &&
      !test.comingSoon &&
      (!weakestSection ||
        test.section === weakestSection.section ||
        (test.section === "mixed" && test.testType === "cumulative"))
  );
}

function findNextLearningTarget(stats: DashboardStats, preferredSection?: Section | null) {
  const sectionOrder = preferredSection
    ? [preferredSection, ...SECTIONS.map((section) => section.id).filter((section) => section !== preferredSection)]
    : SECTIONS.map((section) => section.id);
  const masteryById = new Map<string, { accuracy: number; totalAnswered: number }>();
  for (const subtopic of stats.subtopics) {
    masteryById.set(subtopic.subtopic, {
      accuracy: subtopic.accuracy,
      totalAnswered: subtopic.totalAnswered,
    });
  }

  for (const section of sectionOrder) {
    const nodes = getLearningNodes(section);
    const ranks = computeRanks(nodes);
    const sorted = [...nodes].sort((a, b) => {
      const rankDelta = (ranks.get(a.id) ?? 0) - (ranks.get(b.id) ?? 0);
      return rankDelta !== 0 ? rankDelta : nodes.indexOf(a) - nodes.indexOf(b);
    });
    const target = sorted.find((node) => {
      const mastery = masteryById.get(node.id);
      const complete =
        mastery && mastery.totalAnswered > 0 && mastery.accuracy >= COMPLETE_THRESHOLD;
      return !complete && !computeLockState(node, masteryById).locked;
    });
    if (target) {
      return {
        section,
        subtopic: target.id,
        reason: target.description,
      };
    }
  }
  return null;
}

function orderTasks(tasks: StudyTask[], settings: StudyPlanSettings) {
  const preferred = focusSection(settings.focus);
  return [...tasks].sort((a, b) => {
    const aFocus = preferred && a.section === preferred ? 8 : 0;
    const bFocus = preferred && b.section === preferred ? 8 : 0;
    const aWeak = settings.focus === "weak" && ["review_lesson", "smart_practice", "review_missed"].includes(a.type) ? 8 : 0;
    const bWeak = settings.focus === "weak" && ["review_lesson", "smart_practice", "review_missed"].includes(b.type) ? 8 : 0;
    return b.priority + bFocus + bWeak - (a.priority + aFocus + aWeak);
  });
}

function buildTargetSummary(settings: StudyPlanSettings): StudyPlan["target"] {
  if (!settings.targetDate) {
    return {
      targetDate: null,
      daysUntil: null,
      message: "No target date set. Use the short-term plan for today, the next 3 days, and this week.",
      urgency: "none",
    };
  }

  const target = new Date(`${settings.targetDate}T12:00:00`);
  if (Number.isNaN(target.getTime())) {
    return {
      targetDate: settings.targetDate,
      daysUntil: null,
      message: "The target date is invalid. Choose a new date.",
      urgency: "past",
    };
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diff = Math.ceil((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  if (diff < 0) {
    return {
      targetDate: settings.targetDate,
      daysUntil: diff,
      message: "Your target date has passed. Choose a new date.",
      urgency: "past",
    };
  }
  if (diff <= 14) {
    return {
      targetDate: settings.targetDate,
      daysUntil: diff,
      message: `${diff} day${diff === 1 ? "" : "s"} until test day. Prioritize weak areas and checkpoint reviews.`,
      urgency: "urgent",
    };
  }
  return {
    targetDate: settings.targetDate,
    daysUntil: diff,
    message: `${diff} days until test day. Keep a balanced pace and rotate sections each week.`,
    urgency: "normal",
  };
}

function practiceHref(section: Section, subtopic: string, mode: string, count: number) {
  return `/practice?section=${encodeURIComponent(section)}&subtopic=${encodeURIComponent(
    subtopic
  )}&mode=${encodeURIComponent(mode)}&count=${count}`;
}

function focusSection(focus?: StudyFocus): Section | null {
  if (focus === "math" || focus === "reading" || focus === "mechanical") return focus;
  return null;
}

function dedupeTasks(tasks: StudyTask[]) {
  const seen = new Set<string>();
  return tasks.filter((task) => {
    const key = `${task.type}:${task.href}:${task.title}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
