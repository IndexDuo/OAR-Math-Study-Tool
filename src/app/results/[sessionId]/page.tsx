"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faCircleCheck,
  faCircleXmark,
  faDownload,
  faChevronDown,
  faChevronRight,
  faClock,
  faTrophy,
  faRotateRight,
  faStarOfLife,
  faClipboardCheck,
  faShieldHalved,
} from "@fortawesome/free-solid-svg-icons";
import type { AnswerRow, QuestionRow, Section, SessionRow } from "@/types";
import { getSectionMeta } from "@/lib/constants";
import {
  getQuestionReviewLabel,
  getQuestionReviewSubtopicLabel,
  getQuestionReviewSubtopicSlug,
  getQuestionReviewTopicLabel,
  getQuestionReviewTopicSlug,
} from "@/lib/questionRouting";
import { formatDuration, formatPercent } from "@/lib/calculateStats";
import { startQuickPractice } from "@/lib/startQuickPractice";
import {
  buildLocalExportPayload,
  createLocalSession,
  getLocalQuestions,
  getLocalSessionData,
} from "@/lib/localProgress";
import {
  getPracticeModeInfo,
  isCheckpointContext,
  loadPracticeSessionContext,
  savePracticeSessionContext,
  type PracticePoolMode,
  type PracticeSessionContext,
} from "@/lib/practiceModes";
import {
  buildCheckpointSessionRequest,
  getCheckpointAvailability,
  getCheckpointTest,
  getTestTypeLabel,
  inferCheckpointTestFromSession,
} from "@/lib/testCenter";
import MathText from "@/components/ui/MathText";
import { downloadJson, downloadText } from "@/lib/exportResults";
import { buildTestResultMarkdown } from "@/lib/testResultExport";
import SubtopicHorizontalBar from "@/components/charts/SubtopicHorizontalBar";

interface Loaded {
  session: SessionRow;
  questions: QuestionRow[];
  answers: AnswerRow[];
}

export default function ResultsPage() {
  const params = useParams<{ sessionId: string }>();
  const router = useRouter();
  const sessionId = params.sessionId;
  const [data, setData] = useState<Loaded | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [retrying, setRetrying] = useState(false);
  const [practicingMore, setPracticingMore] = useState(false);
  const [retakingTest, setRetakingTest] = useState(false);
  const [exportingTest, setExportingTest] = useState(false);
  const [practiceContext, setPracticeContext] = useState<PracticeSessionContext | null>(null);

  useEffect(() => {
    try {
      const { session, questions, answers } = getLocalSessionData(sessionId);
      setData({ session, questions, answers });
      setPracticeContext(loadPracticeSessionContext(sessionId));
    } catch (e) {
      setError((e as Error).message);
    }
  }, [sessionId]);

  const stats = useMemo(() => {
    if (!data) return null;
    const { answers, questions } = data;
    const qById = new Map(questions.map((q) => [q.id, q]));
    const answerBySubtopic = new Map<
      string,
      { total: number; correct: number; label: string; subtopic: string; section: Section }
    >();
    for (const a of answers) {
      const q = qById.get(a.question_id);
      if (!q) continue;
      const subtopic = getQuestionReviewSubtopicSlug(q);
      const curr = answerBySubtopic.get(subtopic) ?? {
        total: 0,
        correct: 0,
        label: getQuestionReviewSubtopicLabel(q),
        subtopic,
        section: q.section,
      };
      curr.total += 1;
      if (a.is_correct) curr.correct += 1;
      answerBySubtopic.set(subtopic, curr);
    }
    const subtopicBars = Array.from(answerBySubtopic.values())
      .map((s) => ({
        label: s.label,
        subtopic: s.subtopic,
        section: s.section,
        total: s.total,
        accuracy: s.total === 0 ? 0 : (s.correct / s.total) * 100,
      }))
      .sort((a, b) => a.accuracy - b.accuracy);
    return subtopicBars;
  }, [data]);

  const incorrectQuestions = useMemo(() => {
    if (!data) return [];
    const answerById = new Map(data.answers.map((a) => [a.question_id, a]));
    return data.questions.filter((q) => answerById.get(q.id)?.is_correct === false);
  }, [data]);

  const topicContext = useMemo(() => {
    if (!data || data.questions.length === 0) return null;
    const sections = new Set(data.questions.map((q) => q.section));
    const subtopics = new Set(data.questions.map((q) => getQuestionReviewSubtopicSlug(q)));
    if (sections.size !== 1 || subtopics.size !== 1) return null;
    const section = data.questions[0].section;
    const subtopic = getQuestionReviewSubtopicSlug(data.questions[0]);
    return { section, subtopic, label: getQuestionReviewSubtopicLabel(data.questions[0]) };
  }, [data]);

  const missedTopicGroups = useMemo(() => {
    const groups = new Map<
      string,
      {
        topicLabel: string;
        subtopics: Map<string, { label: string; questionNumbers: number[]; subtopic: string }>;
      }
    >();

    incorrectQuestions.forEach((question) => {
      const questionIndex = data?.questions.findIndex((q) => q.id === question.id) ?? -1;
      const topicSlug = getQuestionReviewTopicSlug(question);
      const subtopicSlug = getQuestionReviewSubtopicSlug(question);
      const group = groups.get(topicSlug) ?? {
        topicLabel: getQuestionReviewTopicLabel(question),
        subtopics: new Map(),
      };
      const subtopic = group.subtopics.get(subtopicSlug) ?? {
        label: getQuestionReviewSubtopicLabel(question),
        questionNumbers: [],
        subtopic: subtopicSlug,
      };
      subtopic.questionNumbers.push(questionIndex >= 0 ? questionIndex + 1 : 0);
      group.subtopics.set(subtopicSlug, subtopic);
      groups.set(topicSlug, group);
    });

    return Array.from(groups.values()).map((group) => ({
      ...group,
      subtopics: Array.from(group.subtopics.values()),
    }));
  }, [data?.questions, incorrectQuestions]);

  function toggleExpand(id: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  async function exportSession() {
    const body = buildLocalExportPayload({ mode: "session", sessionId });
    downloadJson(body, `${body.exportId}.json`);
  }

  function exportThisTest() {
    if (!data) return;
    setExportingTest(true);
    try {
      const inferred = inferCheckpointTestFromSession({
        sessionType: data.session.session_type,
        sections: data.session.sections,
        subtopics: data.session.subtopics,
      });
      const testTitle = practiceContext?.testTitle ?? inferred?.title ?? "Checkpoint Test";
      const testType = practiceContext?.testType ?? inferred?.testType;
      const markdown = buildTestResultMarkdown({
        session: data.session,
        questions: data.questions,
        answers: data.answers,
        testTitle,
        testType,
      });
      const date = new Date(data.session.completed_at ?? data.session.started_at)
        .toISOString()
        .slice(0, 10);
      downloadText(markdown, `oar-test-result-${slugify(testTitle)}-${date}.md`);
    } finally {
      setExportingTest(false);
    }
  }

  async function reviewMissedQuestions() {
    if (incorrectQuestions.length === 0) return;
    setRetrying(true);
    try {
      const { session } = createLocalSession({
        questionIds: incorrectQuestions.map((q) => q.id),
      });
      savePracticeSessionContext(session.id, {
        mode: "missed",
        modeLabel: getPracticeModeInfo("missed").shortLabel,
        section: topicContext?.section,
        subtopics: topicContext ? [topicContext.subtopic] : undefined,
        questionCount: incorrectQuestions.length,
        origin: practiceContext?.origin ?? "review",
        returnTo: practiceContext?.returnTo,
        returnLabel: practiceContext?.returnLabel,
        sourceSection: topicContext?.section ?? practiceContext?.sourceSection,
        sourceSubtopic: topicContext?.subtopic ?? practiceContext?.sourceSubtopic,
        sourceMode: "missed",
        sourceCta: "Review missed questions",
      });
      router.push(`/practice/${session.id}`);
    } catch (e) {
      alert((e as Error).message);
      setRetrying(false);
    }
  }

  async function practiceMoreSameTopic(modeOverride?: PracticePoolMode) {
    if (!topicContext) return;
    setPracticingMore(true);
    try {
      const nextMode = modeOverride ?? practiceContext?.mode ?? "smart";
      const nextSessionId = await startQuickPractice(
        topicContext.section,
        topicContext.subtopic,
        5,
        nextMode,
        {
          origin: practiceContext?.origin ?? "practice",
          returnTo: practiceContext?.returnTo,
          returnLabel: practiceContext?.returnLabel,
          sourceSection: topicContext.section,
          sourceSubtopic: topicContext.subtopic,
          sourceMode: nextMode,
          sourceCta: continueLabel,
        }
      );
      router.push(`/practice/${nextSessionId}`);
    } catch (e) {
      alert((e as Error).message);
      setPracticingMore(false);
    }
  }

  async function retakeCheckpointTest() {
    if (!data) return;
    const inferred = inferCheckpointTestFromSession({
      sessionType: data.session.session_type,
      sections: data.session.sections,
      subtopics: data.session.subtopics,
    });
    const definition = practiceContext?.testId
      ? getCheckpointTest(practiceContext.testId)
      : inferred;
    if (!definition) {
      alert("This checkpoint definition is no longer available.");
      return;
    }

    setRetakingTest(true);
    try {
      const availability = getCheckpointAvailability(
        definition,
        getLocalQuestions()
      );
      if (!availability.startable) {
        throw new Error(
          availability.disabledReason ?? "No questions are available for this checkpoint."
        );
      }

      const { session: nextSession } = createLocalSession(buildCheckpointSessionRequest(availability));
      const nextSessionId = nextSession.id;
      savePracticeSessionContext(nextSessionId, {
        mode: "full",
        modeLabel: "Checkpoint Test",
        section:
          availability.availableSections.length === 1
            ? availability.availableSections[0]
            : undefined,
        subtopics: availability.availableSubtopics,
        questionCount: nextSession.total_questions,
        origin: "tests",
        returnTo: "/tests",
        returnLabel: "Back to Test Center",
        sourceSection: availability.availableSections.join(","),
        sourceMode: "checkpoint-test",
        sourceCta: "Retake checkpoint test",
        testId: availability.id,
        testTitle: availability.title,
        testType: availability.testType,
        disableHints: true,
        isCheckpoint: true,
        testSubtopics: availability.availableSubtopics,
        recommendedQuestionCount: availability.recommendedQuestionCount,
        timeLimitMinutes: availability.timeLimitMinutes,
      });
      router.push(`/practice/${nextSessionId}`);
    } catch (e) {
      alert((e as Error).message);
      setRetakingTest(false);
    }
  }

  if (error) {
    return (
      <div className="card border-accent-red/30">
        <p className="text-sm font-semibold text-accent-red">{error}</p>
        <Link href="/learn" className="btn-secondary mt-4 inline-flex">Back to Learn</Link>
      </div>
    );
  }

  if (!data || !stats) {
    return <p className="text-sm text-ink-muted">Loading results…</p>;
  }

  const { session } = data;
  const answersById = new Map(data.answers.map((a) => [a.question_id, a]));
  const correct = session.correct_count;
  const total = session.total_questions;
  const acc = session.accuracy;
  const incorrectCount = incorrectQuestions.length;
  const perfect = incorrectCount === 0;
  const currentMode = practiceContext?.mode ?? "smart";
  const inferredCheckpoint = inferCheckpointTestFromSession({
    sessionType: session.session_type,
    sections: session.sections,
    subtopics: session.subtopics,
  });
  const checkpointDefinition = practiceContext?.testId
    ? getCheckpointTest(practiceContext.testId)
    : inferredCheckpoint;
  const isCheckpointSession =
    session.session_type === "section_exam" || isCheckpointContext(practiceContext);
  const checkpointTitle = practiceContext?.testTitle ?? checkpointDefinition?.title ?? "Checkpoint Test";
  const checkpointType = practiceContext?.testType ?? checkpointDefinition?.testType;
  const checkpointTypeLabel = checkpointType
    ? getTestTypeLabel(checkpointType)
    : "Checkpoint Review";
  const weakestTestSubtopic = isCheckpointSession && stats.length > 0 ? stats[0] : null;
  const continueLabel =
    currentMode === "full"
      ? "Continue Full Topic Review"
      : currentMode === "memorization"
      ? "Continue Memorization Drill"
      : currentMode === "hard"
      ? "Continue Hard/Application Practice"
      : currentMode === "missed"
      ? "Continue Missed Questions"
      : "Practice 5 more";
  const explicitLessonReturn =
    practiceContext?.origin === "lesson" && practiceContext.returnTo
      ? {
          href: practiceContext.returnTo,
          label: practiceContext.returnLabel ?? "Back to lesson",
        }
      : null;
  const inferredLessonReturn =
    !explicitLessonReturn && topicContext && (!practiceContext || !practiceContext.origin)
      ? { href: `/learn/${topicContext.subtopic}`, label: "Back to lesson" }
      : null;
  const lessonReturn = explicitLessonReturn ?? inferredLessonReturn;

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="page-title">Session Results</h1>
        <p className="page-subtitle">Review every question, see the explanation, and export your results.</p>
      </div>

      {/* Hero score */}
      <section className="grid gap-4 lg:grid-cols-[1.5fr,1fr]">
        <div className="card flex flex-col items-center justify-center py-8 text-center">
          <FontAwesomeIcon icon={faTrophy} className="text-4xl text-accent-teal" aria-hidden />
          <p className="mt-3 text-xs font-semibold uppercase tracking-wide text-ink-muted">You scored</p>
          <p className="mt-1 text-6xl font-bold text-ink-primary">{Math.round(acc)}%</p>
          <p className="mt-1 text-sm text-ink-secondary">{correct} correct out of {total}</p>
        </div>
        <div className="card grid grid-cols-2 gap-3">
          <div>
            <p className="text-xs uppercase tracking-wide text-ink-muted">Time</p>
            <p className="mt-1 flex items-center gap-2 text-xl font-bold text-ink-primary">
              <FontAwesomeIcon icon={faClock} className="h-4 w-4 text-ink-muted" aria-hidden />
              {formatDuration(session.time_spent_seconds)}
            </p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-wide text-ink-muted">Section</p>
            <p className="mt-1 text-xl font-bold text-ink-primary">
              {session.sections.map((s) => getSectionMeta(s).shortLabel).join(", ")}
            </p>
          </div>
          <div className="col-span-2 mt-2 border-t border-line pt-3">
            <p className="mb-2 text-xs text-ink-muted">Quick actions</p>
            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={exportSession} className="btn-secondary">
                <FontAwesomeIcon icon={faDownload} className="h-3.5 w-3.5" aria-hidden />
                Export Session
              </button>
              {isCheckpointSession && (
                <button
                  type="button"
                  onClick={exportThisTest}
                  disabled={exportingTest}
                  className="btn-secondary"
                >
                  <FontAwesomeIcon icon={faDownload} className="h-3.5 w-3.5" aria-hidden />
                  {exportingTest ? "Exporting..." : "Export This Test"}
                </button>
              )}
              <Link href="/learn" className="btn-secondary">Learn</Link>
            </div>
          </div>
        </div>
      </section>

      {/* Test summary */}
      {isCheckpointSession && (
        <section className="rounded-2xl border border-accent-teal/25 bg-accent-teal/10 p-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-accent-teal">
                <FontAwesomeIcon icon={faClipboardCheck} className="h-3.5 w-3.5" aria-hidden />
                {checkpointTypeLabel}
              </p>
              <h2 className="mt-1 text-2xl font-bold text-ink-primary">{checkpointTitle}</h2>
              <p className="mt-1 text-sm text-ink-secondary">
                {correct}/{total} correct. Use the weakest subtopics below to decide what to
                relearn before retaking this checkpoint.
              </p>
              {practiceContext?.disableHints && (
                <p className="mt-2 inline-flex items-center gap-2 rounded-full border border-accent-teal/25 bg-navy-900/40 px-3 py-1 text-xs font-semibold text-accent-teal">
                  <FontAwesomeIcon icon={faShieldHalved} className="h-3 w-3" aria-hidden />
                  Hints were off
                </p>
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              {incorrectCount > 0 && (
                <button
                  type="button"
                  onClick={reviewMissedQuestions}
                  disabled={retrying}
                  className="btn-primary"
                >
                  <FontAwesomeIcon icon={faRotateRight} className="h-3.5 w-3.5" aria-hidden />
                  {retrying ? "Starting..." : "Review missed"}
                </button>
              )}
              <button
                type="button"
                onClick={retakeCheckpointTest}
                disabled={retakingTest || !checkpointDefinition}
                className="btn-secondary"
              >
                <FontAwesomeIcon icon={faRotateRight} className="h-3.5 w-3.5" aria-hidden />
                {retakingTest ? "Starting..." : "Retake this test"}
              </button>
              <Link href="/tests" className="btn-secondary">
                Back to Test Center
              </Link>
            </div>
          </div>

          <div className="mt-4 grid gap-3 md:grid-cols-3">
            {stats.slice(0, 3).map((item) => (
              <div key={item.subtopic} className="rounded-xl border border-line bg-navy-900/35 p-3">
                <p className="text-sm font-semibold text-ink-primary">{item.label}</p>
                <p className="mt-1 text-xs text-ink-muted">
                  {Math.round(item.accuracy)}% accuracy across {item.total} question
                  {item.total === 1 ? "" : "s"}
                </p>
              </div>
            ))}
          </div>

          {missedTopicGroups.length > 0 && (
            <div className="mt-4 rounded-xl border border-line bg-navy-900/35 p-4">
              <h3 className="text-sm font-bold text-ink-primary">Missed Topic Routing</h3>
              <div className="mt-3 space-y-3">
                {missedTopicGroups.map((group) => (
                  <div key={group.topicLabel}>
                    <p className="text-sm font-semibold text-ink-primary">{group.topicLabel}</p>
                    <ul className="mt-1 space-y-1 text-xs text-ink-secondary">
                      {group.subtopics.map((subtopic) => (
                        <li key={subtopic.subtopic}>
                          {subtopic.label}: missed Q
                          {subtopic.questionNumbers.filter(Boolean).join(", Q")}
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="mt-4 flex flex-wrap gap-2">
            {weakestTestSubtopic && (
              <Link
                href={`/practice?section=${weakestTestSubtopic.section}&subtopic=${weakestTestSubtopic.subtopic}&mode=smart&count=5`}
                className="btn-secondary"
              >
                Practice weakest subtopic
              </Link>
            )}
            <Link href="/review" className="btn-secondary">
              Export Study Snapshot
            </Link>
            <button
              type="button"
              onClick={exportThisTest}
              disabled={exportingTest}
              className="btn-secondary"
            >
              {exportingTest ? "Exporting..." : "Export This Test"}
            </button>
            <Link href="/learn" className="btn-secondary">
              Learn
            </Link>
          </div>
        </section>
      )}

      {/* Primary CTA: topic-aware next step */}
      {!isCheckpointSession && (
      <section>
        {perfect ? (
          <div className="card border-accent-green/40 bg-accent-green/5">
            <div className="flex items-center gap-4">
              <FontAwesomeIcon icon={faStarOfLife} className="text-2xl text-accent-green" aria-hidden />
              <div>
                <p className="font-bold text-accent-green">Perfect score!</p>
                <p className="text-sm text-ink-secondary">All questions answered correctly. Keep it up!</p>
              </div>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              {topicContext ? (
                <>
                  <button
                    type="button"
                    onClick={() => practiceMoreSameTopic()}
                    disabled={practicingMore}
                    className="btn-primary"
                  >
                    <FontAwesomeIcon icon={faRotateRight} className="h-3.5 w-3.5" aria-hidden />
                    {practicingMore ? "Starting..." : `${continueLabel}: ${topicContext.label}`}
                  </button>
                  {lessonReturn && (
                    <Link href={lessonReturn.href} className="btn-secondary">
                      {lessonReturn.label}
                    </Link>
                  )}
                  <Link href="/learn" className="btn-secondary">
                    Back to learn page
                  </Link>
                </>
              ) : (
                <>
                  <Link href="/practice" className="btn-primary">Practice More</Link>
                  {lessonReturn && (
                    <Link href={lessonReturn.href} className="btn-secondary">
                      {lessonReturn.label}
                    </Link>
                  )}
                </>
              )}
            </div>
          </div>
        ) : (
          <div className="rounded-2xl border border-accent-red/30 bg-accent-red/5 p-5">
            <p className="mb-3 text-sm text-ink-secondary">
              You missed <span className="font-bold text-accent-red">{incorrectCount}</span> question{incorrectCount === 1 ? "" : "s"}.
              Review those first, then keep practicing the same topic while it is still fresh.
            </p>
            <button
              type="button"
              onClick={reviewMissedQuestions}
              disabled={retrying}
              className="flex w-full items-center justify-center gap-3 rounded-xl bg-accent-red py-3 text-base font-bold text-white transition-opacity hover:opacity-90 disabled:opacity-60"
            >
              <FontAwesomeIcon icon={faRotateRight} className="h-5 w-5" aria-hidden />
              {retrying ? "Starting..." : "Review missed questions"}
            </button>
            <div className="mt-3 flex flex-wrap gap-2">
              {lessonReturn && (
                <Link href={lessonReturn.href} className="btn-secondary">
                  {lessonReturn.label}
                </Link>
              )}
              {topicContext && (
                <>
                  <button
                    type="button"
                    onClick={() => practiceMoreSameTopic()}
                    disabled={practicingMore}
                    className="btn-secondary"
                  >
                    {practicingMore ? "Starting..." : `${continueLabel}: ${topicContext.label}`}
                  </button>
                  {currentMode === "smart" && (
                    <button
                      type="button"
                      onClick={() => practiceMoreSameTopic("full")}
                      disabled={practicingMore}
                      className="btn-secondary"
                    >
                      Full Topic Review
                    </button>
                  )}
                </>
              )}
              <Link href="/learn" className="btn-secondary">
                Back to Learn
              </Link>
              <Link href="/practice" className="btn-secondary">
                Practice setup
              </Link>
              <Link href="/learn" className="btn-secondary">
                Learn
              </Link>
            </div>
          </div>
        )}
      </section>
      )}

      {/* Subtopic breakdown */}
      {stats.length > 0 && (
        <section className="card">
          <h2 className="text-lg font-bold text-ink-primary">Subtopic Breakdown</h2>
          <p className="text-xs text-ink-muted">Accuracy per subtopic covered in this session</p>
          <div className="mt-3">
            <SubtopicHorizontalBar items={stats} />
          </div>
        </section>
      )}

      {/* Per-question list */}
      <section className="card">
        <h2 className="text-lg font-bold text-ink-primary">Every Question</h2>
        <p className="text-xs text-ink-muted">Click a question to expand the explanation.</p>
        <ul className="mt-3 divide-y divide-line">
          {data.questions.map((q, i) => {
            const answer = answersById.get(q.id);
            const isCorrect = answer?.is_correct ?? false;
            const isOpen = expanded.has(q.id);
            return (
              <li key={q.id} className="py-3">
                <button
                  type="button"
                  onClick={() => toggleExpand(q.id)}
                  aria-expanded={isOpen}
                  className="flex w-full items-start gap-3 text-left"
                >
                  <FontAwesomeIcon
                    icon={isOpen ? faChevronDown : faChevronRight}
                    className="mt-1.5 h-3 w-3 text-ink-muted"
                    aria-hidden
                  />
                  <FontAwesomeIcon
                    icon={isCorrect ? faCircleCheck : faCircleXmark}
                    className={`mt-0.5 h-4 w-4 ${isCorrect ? "text-accent-green" : "text-accent-red"}`}
                    aria-hidden
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm text-ink-primary">
                      <span className="text-ink-muted">Q{i + 1}.</span> <MathText text={q.question_text} section={q.section} />
                    </p>
                    <p className="mt-0.5 text-xs text-ink-muted">
                      {getQuestionReviewLabel(q)} - {q.difficulty}
                      {answer?.is_flagged && (
                        <span className="ml-2 text-accent-amber">flagged</span>
                      )}
                    </p>
                  </div>
                </button>
                {isOpen && (
                  <div className="ml-10 mt-2 space-y-2 text-sm">
                    <p className="text-xs">
                      <span className="text-ink-muted">Your answer: </span>
                      {answer?.user_answer ? (
                        <MathText
                          text={answer.user_answer}
                          className={isCorrect ? "text-accent-green" : "text-accent-red"}
                          section={q.section}
                        />
                      ) : (
                        <span className={isCorrect ? "text-accent-green" : "text-accent-red"}>
                          (unanswered)
                        </span>
                      )}
                    </p>
                    {!isCorrect && (
                      <p className="text-xs">
                        <span className="text-ink-muted">Correct: </span>
                        <MathText text={q.correct_answer} className="text-accent-green" section={q.section} />
                      </p>
                    )}
                    {q.formula && (
                      <div className="rounded-md bg-hover px-3 py-2 text-sm text-ink-primary">
                        <MathText text={q.formula} block section={q.section} />
                      </div>
                    )}
                    {q.explanation && (
                      <MathText text={q.explanation} className="explanation-text text-sm text-ink-secondary" section={q.section} />
                    )}
                    {answer?.time_spent_seconds != null && (
                      <p className="text-[11px] text-ink-muted">Time: {formatDuration(answer.time_spent_seconds)}</p>
                    )}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      </section>

      <p className="text-center text-xs text-ink-muted">Session accuracy: {formatPercent(acc, 1)}</p>
    </div>
  );
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 64);
}
