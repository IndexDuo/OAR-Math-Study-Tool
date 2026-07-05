"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faArrowLeft,
  faArrowRight,
  faFlag,
  faCircleCheck,
  faCircleXmark,
  faFlagCheckered,
  faLightbulb,
  faCircleInfo,
  faClock,
} from "@fortawesome/free-solid-svg-icons";
import type { DraftAnswer, QuestionRow, SessionRow } from "@/types";
import { getSectionMeta } from "@/lib/constants";
import { getQuestionReviewLabel } from "@/lib/questionRouting";
import { completeLocalSession, getLocalSessionData } from "@/lib/localProgress";
import MathText from "@/components/ui/MathText";
import {
  clearPracticeSessionDraft,
  isCheckpointContext,
  loadPracticeSessionContext,
  loadPracticeSessionDraft,
  savePracticeSessionDraft,
  type PracticeSessionContext,
} from "@/lib/practiceModes";

interface LoadedSession {
  session: SessionRow;
  questions: QuestionRow[];
}

export default function TestTakingPage() {
  const params = useParams<{ sessionId: string }>();
  const router = useRouter();
  const sessionId = params.sessionId;

  const [data, setData] = useState<LoadedSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [drafts, setDrafts] = useState<Record<string, DraftAnswer>>({});
  const [showHint, setShowHint] = useState(false);
  const [showExplanation, setShowExplanation] = useState(false);
  const [answerLockMessage, setAnswerLockMessage] = useState<string | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [practiceContext, setPracticeContext] = useState<PracticeSessionContext | null>(null);
  const [continueAfterTimeExpired, setContinueAfterTimeExpired] = useState(false);

  const startTimeRef = useRef<number>(Date.now());
  const questionStartRef = useRef<number>(Date.now());
  const autoSubmittedRef = useRef(false);

  // Load session + questions.
  useEffect(() => {
    try {
        const { session, questions } = getLocalSessionData(sessionId);
        const context = loadPracticeSessionContext(sessionId);
        const savedDraft = loadPracticeSessionDraft(sessionId);
        setData({ session, questions });
        setPracticeContext(context);
        // Initialize drafts from empty state.
        const initial: Record<string, DraftAnswer> = {};
        for (const q of questions) {
          const saved = savedDraft?.drafts[q.id];
          initial[q.id] = {
            questionId: q.id,
            userAnswer: saved?.userAnswer ?? null,
            isFlagged: saved?.isFlagged ?? false,
            timeSpentSeconds: saved?.timeSpentSeconds ?? 0,
          };
        }
        setDrafts(initial);
        // If the session is already complete, bounce to results.
        if (session.completed_at) {
          clearPracticeSessionDraft(sessionId);
          router.replace(`/results/${sessionId}`);
          return;
        }
        const savedElapsed =
          savedDraft && Number.isFinite(savedDraft.elapsedSeconds)
            ? Math.max(0, Math.floor(savedDraft.elapsedSeconds))
            : 0;
        const savedIndex =
          savedDraft && savedDraft.currentIndex >= 0 && savedDraft.currentIndex < questions.length
            ? savedDraft.currentIndex
            : 0;
        setCurrentIndex(savedIndex);
        setElapsed(savedElapsed);
        setContinueAfterTimeExpired(Boolean(savedDraft?.continueAfterTimeExpired));
        startTimeRef.current = Date.now() - savedElapsed * 1000;
        questionStartRef.current = Date.now();
        setLoading(false);
    } catch (e) {
      setError((e as Error).message);
      setLoading(false);
    }
  }, [sessionId, router]);

  // Tick elapsed timer (total session).
  useEffect(() => {
    if (loading || !data) return;
    const t = setInterval(() => {
      setElapsed(Math.floor((Date.now() - startTimeRef.current) / 1000));
    }, 1000);
    return () => clearInterval(t);
  }, [loading, data]);

  // Reset per-question state when switching.
  useEffect(() => {
    setShowHint(false);
    setShowExplanation(false);
    setAnswerLockMessage(null);
    questionStartRef.current = Date.now();
  }, [currentIndex]);

  const currentQuestion = data?.questions[currentIndex];
  const currentDraft = currentQuestion ? drafts[currentQuestion.id] : undefined;
  const timeLimitSeconds = practiceContext?.timeLimitMinutes
    ? practiceContext.timeLimitMinutes * 60
    : null;
  const remainingSeconds =
    timeLimitSeconds !== null ? Math.max(0, timeLimitSeconds - elapsed) : null;
  const overtimeSeconds =
    timeLimitSeconds !== null ? Math.max(0, elapsed - timeLimitSeconds) : 0;
  const answeredCount = useMemo(
    () => Object.values(drafts).filter((d) => d.userAnswer !== null).length,
    [drafts]
  );

  useEffect(() => {
    if (loading || !data) return;
    savePracticeSessionDraft(sessionId, {
      drafts,
      currentIndex,
      elapsedSeconds: elapsed,
      savedAt: new Date().toISOString(),
      continueAfterTimeExpired,
    });
  }, [continueAfterTimeExpired, currentIndex, data, drafts, elapsed, loading, sessionId]);

  // Bank time spent on the current question into the draft whenever the
  // user answers or navigates away.
  const bankTime = useCallback(() => {
    if (!currentQuestion) return;
    const delta = Math.floor((Date.now() - questionStartRef.current) / 1000);
    questionStartRef.current = Date.now();
    setDrafts((prev) => {
      const d = prev[currentQuestion.id];
      if (!d) return prev;
      return {
        ...prev,
        [currentQuestion.id]: {
          ...d,
          timeSpentSeconds: d.timeSpentSeconds + delta,
        },
      };
    });
  }, [currentQuestion]);

  function selectAnswer(option: string) {
    if (!currentQuestion || !currentDraft) return;
    const checkpointActive =
      data?.session.session_type === "section_exam" || isCheckpointContext(practiceContext);
    if (checkpointActive && currentDraft.userAnswer !== null) {
      setAnswerLockMessage("Answers are locked in checkpoint tests.");
      return;
    }
    bankTime();
    setDrafts((prev) => ({
      ...prev,
      [currentQuestion.id]: {
        ...prev[currentQuestion.id],
        userAnswer: option,
      },
    }));
    setAnswerLockMessage(null);
    if (!checkpointActive) {
      setShowExplanation(true);
    }
  }

  function toggleFlag() {
    if (!currentQuestion) return;
    setDrafts((prev) => ({
      ...prev,
      [currentQuestion.id]: {
        ...prev[currentQuestion.id],
        isFlagged: !prev[currentQuestion.id].isFlagged,
      },
    }));
  }

  function goTo(index: number) {
    if (!data) return;
    if (index < 0 || index >= data.questions.length) return;
    bankTime();
    setCurrentIndex(index);
  }

  async function finish(forceSubmit = false) {
    if (!data) return;
    if (
      !forceSubmit &&
      answeredCount < data.questions.length &&
      !confirm("You still have unanswered questions. Submit anyway?")
    ) {
      return;
    }
    bankTime();
    setSubmitting(true);
    setError(null);

    // Build submission payload from current drafts.
    const answers = data.questions.map((q) => {
      const d = drafts[q.id];
      const userAnswer = d?.userAnswer ?? "";
      const isCorrect = userAnswer === q.correct_answer;
      return {
        questionId: q.id,
        userAnswer,
        isCorrect,
        isFlagged: d?.isFlagged ?? false,
        timeSpentSeconds: d?.timeSpentSeconds ?? 0,
      };
    });

    try {
      completeLocalSession(
        sessionId,
        answers,
        Math.floor((Date.now() - startTimeRef.current) / 1000)
      );
      clearPracticeSessionDraft(sessionId);
      router.push(`/results/${sessionId}`);
    } catch (e) {
      setError((e as Error).message);
      setSubmitting(false);
    }
  }

  useEffect(() => {
    if (
      !data ||
      timeLimitSeconds === null ||
      submitting ||
      autoSubmittedRef.current ||
      continueAfterTimeExpired
    ) {
      return;
    }
    if (elapsed < timeLimitSeconds) return;
    autoSubmittedRef.current = true;
    bankTime();

    const keepWorking = window.confirm(
      "Time is up. Keep working on this test? Choose Cancel to stop here and resume later from Test Center."
    );

    if (keepWorking) {
      setContinueAfterTimeExpired(true);
      return;
    }

    savePracticeSessionDraft(sessionId, {
      drafts,
      currentIndex,
      elapsedSeconds: elapsed,
      savedAt: new Date().toISOString(),
      continueAfterTimeExpired: false,
    });
    router.push(practiceContext?.returnTo ?? "/tests");
  }, [
    bankTime,
    continueAfterTimeExpired,
    currentIndex,
    data,
    drafts,
    elapsed,
    practiceContext?.returnTo,
    router,
    sessionId,
    submitting,
    timeLimitSeconds,
  ]);

  function handleContextBack() {
    const target = practiceContext?.returnTo ?? "/practice";
    bankTime();
    savePracticeSessionDraft(sessionId, {
      drafts,
      currentIndex,
      elapsedSeconds: elapsed,
      savedAt: new Date().toISOString(),
      continueAfterTimeExpired,
    });
    if (
      answeredCount > 0 &&
      !confirm("Leave this session? Your current answers are saved, and you can resume later.")
    ) {
      return;
    }
    router.push(target);
  }

  if (loading) {
    return <p className="text-sm text-ink-muted">Loading your session…</p>;
  }
  if (error || !data || !currentQuestion || !currentDraft) {
    return (
      <div className="card border-accent-red/30">
        <p className="text-sm font-semibold text-accent-red">
          {error ?? "Session could not be loaded."}
        </p>
        <a href="/practice" className="btn-secondary mt-4 inline-flex">
          Back to Practice
        </a>
      </div>
    );
  }

  const total = data.questions.length;
  const section = getSectionMeta(currentQuestion.section);
  const allAnswered = answeredCount === total;
  const backLabel = practiceContext?.returnLabel ?? "Practice setup";
  const isCheckpointSession =
    data.session.session_type === "section_exam" || isCheckpointContext(practiceContext);
  const hintsDisabled =
    isCheckpointSession || Boolean(practiceContext?.disableHints || practiceContext?.isCheckpoint);

  return (
    <div className="animate-fade-in">
      {/* Top bar */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-line bg-navy-800/60 px-4 py-3">
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={handleContextBack}
            className="flex items-center gap-1.5 text-xs text-ink-muted hover:text-ink-primary transition-colors"
            title={backLabel}
          >
            <FontAwesomeIcon icon={faArrowLeft} className="h-3 w-3" aria-hidden />
            {backLabel}
          </button>
          <span
            className="chip border-transparent"
            style={{ backgroundColor: `${section.color}20`, color: section.color }}
          >
            {section.shortLabel}
          </span>
          <p className="text-sm font-semibold text-ink-primary">
            Question {currentIndex + 1} <span className="text-ink-muted">of {total}</span>
          </p>
          {hintsDisabled && (
            <span className="chip border-accent-teal/20 bg-accent-teal/10 text-accent-teal">
              Hints off
            </span>
          )}
          {isCheckpointSession && (
            <span className="chip border-line bg-white/[0.03] text-ink-muted">
              Checkpoint Test
            </span>
          )}
        </div>
        <div className="flex items-center gap-4 text-xs text-ink-secondary">
          {remainingSeconds !== null && (
            <span
              className={
                overtimeSeconds > 0 || remainingSeconds <= 60
                  ? "font-bold text-accent-amber"
                  : "text-ink-secondary"
              }
            >
              <FontAwesomeIcon icon={faClock} className="mr-1.5 h-3 w-3" aria-hidden />
              {overtimeSeconds > 0
                ? `Over time ${formatDuration(overtimeSeconds)}`
                : formatDuration(remainingSeconds)}
            </span>
          )}
          <span className="text-ink-muted">
            {answeredCount}/{total} answered
          </span>
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-[1fr,240px]">
        {/* Main question area */}
        <div className="space-y-4">
          {isCheckpointSession && (
            <div className="rounded-xl border border-line bg-navy-800/60 px-4 py-3 text-xs text-ink-secondary">
              Answers lock after selection. Correctness and explanations appear after finishing.
            </div>
          )}
          <div className="card">
            <p className="text-xs uppercase tracking-wide text-ink-muted">
              {getQuestionReviewLabel(currentQuestion)} - {currentQuestion.difficulty}
            </p>
            <h2 className="mt-2 text-lg font-semibold leading-relaxed text-ink-primary sm:text-xl">
              <MathText text={currentQuestion.question_text} section={currentQuestion.section} />
            </h2>

            <div className="mt-5 space-y-2.5" role="radiogroup" aria-label="Answer options">
              {currentQuestion.options.map((opt, i) => {
                const selected = currentDraft.userAnswer === opt;
                const answered = currentDraft.userAnswer !== null;
                const isCorrect = opt === currentQuestion.correct_answer;
                const revealing = !isCheckpointSession && answered && showExplanation;

                let stateClass =
                  "border-line bg-hover/40 hover:border-accent-teal/40";
                if (revealing && isCorrect) {
                  stateClass = "border-accent-green bg-accent-green/10 text-accent-green";
                } else if (revealing && selected && !isCorrect) {
                  stateClass = "border-accent-red bg-accent-red/10 text-accent-red";
                } else if (selected) {
                  stateClass = "border-accent-teal bg-accent-teal/10 text-accent-teal";
                } else if (isCheckpointSession && answered) {
                  stateClass = "border-line bg-hover/20 text-ink-muted";
                }

                return (
                  <button
                    key={i}
                    type="button"
                    role="radio"
                    aria-checked={selected}
                    aria-disabled={isCheckpointSession && answered ? "true" : undefined}
                    onClick={() => selectAnswer(opt)}
                    className={`flex w-full items-center gap-3 rounded-xl border px-4 py-3 text-left text-sm transition-colors ${
                      isCheckpointSession && answered && !selected ? "cursor-not-allowed" : ""
                    } ${stateClass}`}
                  >
                    <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full border border-current text-xs font-bold">
                      {String.fromCharCode(65 + i)}
                    </span>
                    <MathText text={opt} className="flex-1" section={currentQuestion.section} />
                    {revealing && isCorrect && (
                      <FontAwesomeIcon icon={faCircleCheck} aria-label="Correct answer" />
                    )}
                    {revealing && selected && !isCorrect && (
                      <FontAwesomeIcon icon={faCircleXmark} aria-label="Your answer (wrong)" />
                    )}
                  </button>
                );
              })}
            </div>
            {answerLockMessage && (
              <p className="mt-3 text-xs text-ink-muted">{answerLockMessage}</p>
            )}
          </div>

          {/* Hint panel */}
          {!hintsDisabled && showHint && currentQuestion.hint && (
            <div className="card border-accent-amber/30">
              <p className="flex items-center gap-2 text-sm font-semibold text-accent-amber">
                <FontAwesomeIcon icon={faLightbulb} aria-hidden /> Hint
              </p>
              <MathText text={currentQuestion.hint} className="mt-2 text-sm text-ink-secondary" section={currentQuestion.section} />
            </div>
          )}

          {/* Explanation panel (after answering) */}
          {!isCheckpointSession && currentDraft.userAnswer !== null && showExplanation && (
            <div className="card">
              <p className="flex items-center gap-2 text-sm font-semibold text-accent-teal">
                <FontAwesomeIcon icon={faCircleInfo} aria-hidden /> Explanation
              </p>
              <p className="mt-1 text-xs text-ink-muted">
                Correct answer:{" "}
                <MathText text={currentQuestion.correct_answer} className="font-semibold text-accent-green" section={currentQuestion.section} />
              </p>
              {currentQuestion.formula && (
                <div className="mt-2 rounded-md bg-white/[0.03] px-3 py-2 text-sm text-ink-primary">
                  <MathText text={currentQuestion.formula} block section={currentQuestion.section} />
                </div>
              )}
              {currentQuestion.explanation ? (
                <MathText text={currentQuestion.explanation} className="explanation-text mt-3 text-sm text-ink-secondary" section={currentQuestion.section} />
              ) : (
                <p className="mt-3 text-xs text-ink-muted">
                  (No explanation provided for this question.)
                </p>
              )}
            </div>
          )}

          {/* Bottom action bar */}
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-line bg-navy-800/60 px-3 py-3">
            <div className="flex gap-2">
              {currentIndex > 0 && (
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => goTo(currentIndex - 1)}
                >
                  <FontAwesomeIcon icon={faArrowLeft} className="h-3.5 w-3.5" aria-hidden />
                  Previous
                </button>
              )}
              {currentIndex < total - 1 && (
                <button
                  type="button"
                  className="btn-primary"
                  onClick={() => goTo(currentIndex + 1)}
                >
                  Next
                  <FontAwesomeIcon icon={faArrowRight} className="h-3.5 w-3.5" aria-hidden />
                </button>
              )}
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                className="btn-secondary"
                onClick={toggleFlag}
                aria-pressed={currentDraft.isFlagged}
                aria-label={currentDraft.isFlagged ? "Unflag question" : "Flag question"}
              >
                <FontAwesomeIcon
                  icon={faFlag}
                  className={`h-3.5 w-3.5 ${
                    currentDraft.isFlagged ? "text-accent-amber" : "opacity-40"
                  }`}
                  aria-hidden
                />
                {currentDraft.isFlagged ? "Flagged" : "Flag"}
              </button>
              {!hintsDisabled && currentQuestion.hint && (
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => setShowHint((v) => !v)}
                  aria-pressed={showHint}
                >
                  <FontAwesomeIcon
                    icon={faLightbulb}
                    className="h-3.5 w-3.5"
                    aria-hidden
                  />
                  {showHint ? "Hide Hint" : "Show Hint"}
                </button>
              )}
              {currentIndex === total - 1 && (
                <button
                  type="button"
                  className="btn-primary"
                  onClick={() => finish()}
                  disabled={submitting}
                  title={
                    !allAnswered
                      ? `${total - answeredCount} unanswered - they'll be marked wrong`
                      : undefined
                  }
                >
                  <FontAwesomeIcon
                    icon={faFlagCheckered}
                    className="h-3.5 w-3.5"
                    aria-hidden
                  />
                  {submitting ? "Submitting..." : isCheckpointSession ? "Finish test" : "Finish practice"}
                </button>
              )}
            </div>
          </div>

          {error && <p className="text-xs text-accent-red">{error}</p>}
        </div>

        {/* Question navigator sidebar */}
        <aside
          className="card lg:sticky lg:top-20 lg:h-fit"
          aria-label="Question navigator"
        >
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink-muted">
            Navigator
          </p>
          <div className="grid grid-cols-5 gap-2 lg:grid-cols-6">
            {data.questions.map((q, i) => {
              const d = drafts[q.id];
              const isCurrent = i === currentIndex;
              const isAnswered = d?.userAnswer !== null;
              const isFlagged = d?.isFlagged;
              return (
                <button
                  key={q.id}
                  type="button"
                  onClick={() => goTo(i)}
                  aria-label={`Go to question ${i + 1}${
                    isAnswered ? " (answered)" : ""
                  }${isFlagged ? " (flagged)" : ""}`}
                  aria-current={isCurrent ? "true" : undefined}
                  className={`relative h-9 w-9 rounded-md text-xs font-semibold transition-colors ${
                    isCurrent
                      ? "bg-accent-teal text-navy-950 ring-2 ring-accent-teal/60"
                      : isAnswered
                      ? "bg-accent-teal/15 text-accent-teal"
                      : "bg-hover/60 text-ink-muted hover:bg-hover"
                  }`}
                >
                  {i + 1}
                  {isFlagged && (
                    <span
                      className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full bg-accent-amber"
                      aria-hidden
                    />
                  )}
                </button>
              );
            })}
          </div>
          <div className="mt-4 space-y-1 text-[11px] text-ink-muted">
            <p>
              <span className="mr-1.5 inline-block h-2.5 w-2.5 rounded-sm bg-accent-teal/60 align-middle" />
              Answered
            </p>
            <p>
              <span className="mr-1.5 inline-block h-2.5 w-2.5 rounded-sm bg-hover align-middle" />
              Unanswered
            </p>
            <p>
              <span className="mr-1.5 inline-block h-2 w-2 rounded-full bg-accent-amber align-middle" />
              Flagged
            </p>
          </div>
        </aside>
      </div>
    </div>
  );
}

function formatDuration(totalSeconds: number) {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}
