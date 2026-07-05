"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faArrowRight,
  faBrain,
  faClipboardCheck,
  faFlask,
  faLock,
  faRotateRight,
  faShieldHalved,
} from "@fortawesome/free-solid-svg-icons";
import type { QuestionBankRow, QuestionRow } from "@/types";
import { getSectionMeta, getSubtopicLabel } from "@/lib/constants";
import {
  buildCheckpointSessionRequest,
  getCheckpointAvailabilities,
  getTestTypeLabel,
  inferCheckpointTestFromSession,
  type CheckpointAvailability,
} from "@/lib/testCenter";
import {
  loadPracticeSessionDraft,
  loadPracticeSessionContext,
  savePracticeSessionContext,
  type PracticeSessionContext,
} from "@/lib/practiceModes";
import {
  createLocalSession,
  getLocalQuestionBanks,
  getLocalQuestions,
} from "@/lib/localProgress";
import { useSessions } from "@/hooks/useSessions";
import { formatPercent } from "@/lib/calculateStats";

interface TestAttemptSummary {
  sessionId: string;
  correct: number;
  totalQuestions: number;
  accuracy: number;
  completedAt: string;
}

interface InProgressTestAttemptSummary {
  sessionId: string;
  answeredQuestions: number;
  totalQuestions: number;
  startedAt: string;
  savedAt?: string;
}

function sectionTitle(section: "math" | "cumulative") {
  switch (section) {
    case "math":
      return "Math Checkpoints";
    case "cumulative":
      return "Cumulative Tests";
  }
}

function sectionIcon(section: "math" | "cumulative") {
  switch (section) {
    case "math":
      return faBrain;
    case "cumulative":
      return faFlask;
  }
}

function TestCard({
  test,
  onStart,
  onResume,
  starting,
  previousAttempt,
  inProgressAttempt,
}: {
  test: CheckpointAvailability;
  onStart: (test: CheckpointAvailability) => void;
  onResume: (sessionId: string) => void;
  starting: boolean;
  previousAttempt?: TestAttemptSummary;
  inProgressAttempt?: InProgressTestAttemptSummary;
}) {
  const visibleTopics = test.availableSubtopics.length > 0
    ? test.availableSubtopics.slice(0, 5)
    : test.subtopics.slice(0, 5);
  const hiddenTopicCount =
    (test.availableSubtopics.length > 0 ? test.availableSubtopics : test.subtopics).length -
    visibleTopics.length;
  const usingShorterTest =
    test.startable && test.availableQuestionCount < test.recommendedQuestionCount;

  return (
    <article
      className={`rounded-2xl border p-5 ${
        test.startable
          ? "border-line bg-navy-800/70"
          : "border-line/70 bg-navy-800/35"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wide text-ink-muted">
            {getTestTypeLabel(test.testType)}
          </p>
          <h3 className="mt-1 text-lg font-bold text-ink-primary">{test.title}</h3>
        </div>
        <div className="flex flex-col items-end gap-1.5">
          {inProgressAttempt && (
            <span className="rounded-full border border-accent-teal/40 bg-accent-teal/10 px-2.5 py-1 text-[11px] font-semibold text-accent-teal">
              In progress
            </span>
          )}
          {previousAttempt && (
            <span className="rounded-full border border-accent-amber/40 bg-accent-amber/10 px-2.5 py-1 text-[11px] font-semibold text-accent-amber">
              Taken
            </span>
          )}
          <span
            className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold ${
              test.startable
                ? "border-accent-green/40 bg-accent-green/10 text-accent-green"
                : "border-line bg-hover/30 text-ink-muted"
            }`}
          >
            {test.startable ? "Ready" : test.comingSoon ? "Coming later" : "Needs questions"}
          </span>
        </div>
      </div>

      <p className="mt-2 text-sm leading-relaxed text-ink-secondary">{test.description}</p>

      {inProgressAttempt && (
        <div className="mt-4 rounded-xl border border-accent-teal/30 bg-accent-teal/10 p-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-accent-teal">
            Resume available
          </p>
          <p className="mt-1 text-sm font-bold text-ink-primary">
            {inProgressAttempt.answeredQuestions}/{inProgressAttempt.totalQuestions} answered
          </p>
          <p className="mt-0.5 text-xs text-ink-muted">
            Started {formatAttemptDate(inProgressAttempt.startedAt)}
            {inProgressAttempt.savedAt
              ? ` - saved ${formatAttemptDate(inProgressAttempt.savedAt)}`
              : ""}
          </p>
        </div>
      )}

      {previousAttempt && (
        <div className="mt-4 rounded-xl border border-accent-amber/30 bg-accent-amber/10 p-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-accent-amber">
            Last attempt
          </p>
          <p className="mt-1 text-sm font-bold text-ink-primary">
            {previousAttempt.correct}/{previousAttempt.totalQuestions} - {formatPercent(previousAttempt.accuracy, 0)}
          </p>
          <p className="mt-0.5 text-xs text-ink-muted">
            {formatAttemptDate(previousAttempt.completedAt)}
          </p>
          <Link
            href={`/results/${previousAttempt.sessionId}`}
            className="mt-2 inline-flex text-xs font-semibold text-accent-teal hover:underline"
          >
            View previous result
          </Link>
        </div>
      )}

      <div className="mt-4 flex flex-wrap gap-2 text-[11px] text-ink-muted">
        <span className="chip border-accent-teal/20 bg-accent-teal/10 text-accent-teal">
          <FontAwesomeIcon icon={faShieldHalved} className="h-3 w-3" aria-hidden />
          Hints off
        </span>
        <span className="chip border-line bg-white/[0.03]">
          {test.availableQuestionCount} available
        </span>
        {test.startable && (
          <span className="chip border-line bg-white/[0.03]">
            {Math.min(test.recommendedQuestionCount, test.availableQuestionCount)} question test
          </span>
        )}
        {test.timeLimitMinutes && (
          <span className="chip border-line bg-white/[0.03]">
            {test.timeLimitMinutes} min
          </span>
        )}
      </div>

      {visibleTopics.length > 0 && (
        <div className="mt-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-ink-muted">
            Topics covered
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            {visibleTopics.map((subtopic) => (
              <span
                key={subtopic}
                className="rounded-full border border-line bg-hover/40 px-2.5 py-1 text-xs text-ink-secondary"
              >
                {getSubtopicLabel(subtopic)}
              </span>
            ))}
            {hiddenTopicCount > 0 && (
              <span className="rounded-full border border-line bg-hover/40 px-2.5 py-1 text-xs text-ink-muted">
                +{hiddenTopicCount} more
              </span>
            )}
          </div>
        </div>
      )}

      {usingShorterTest && (
        <p className="mt-3 text-xs text-accent-amber">
          This review will use the {test.availableQuestionCount} included questions currently
          available for this topic.
        </p>
      )}
      {!test.startable && test.disabledReason && (
        <p className="mt-3 text-xs text-ink-muted">{test.disabledReason}</p>
      )}

      <button
        type="button"
        onClick={() =>
          inProgressAttempt ? onResume(inProgressAttempt.sessionId) : onStart(test)
        }
        disabled={(!inProgressAttempt && !test.startable) || starting}
        className="btn-primary mt-5 w-full justify-center disabled:cursor-not-allowed disabled:opacity-50"
      >
        <FontAwesomeIcon
          icon={starting ? faRotateRight : inProgressAttempt || test.startable ? faArrowRight : faLock}
          className="h-3.5 w-3.5"
          aria-hidden
        />
        {starting
          ? inProgressAttempt
            ? "Opening..."
            : "Starting..."
          : inProgressAttempt
          ? "Resume Test"
          : test.startable
          ? previousAttempt
            ? "Retake Test"
            : "Start Test"
          : "Unavailable"}
      </button>
    </article>
  );
}

export default function TestCenterPage() {
  const router = useRouter();
  const { data: sessions } = useSessions();
  const [questions, setQuestions] = useState<QuestionRow[]>([]);
  const [banks, setBanks] = useState<QuestionBankRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [startingId, setStartingId] = useState<string | null>(null);
  const [sessionContexts, setSessionContexts] = useState<Record<string, PracticeSessionContext | null>>({});

  useEffect(() => {
    try {
      setQuestions(getLocalQuestions());
      setBanks(getLocalQuestionBanks());
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const contexts: Record<string, PracticeSessionContext | null> = {};
    for (const session of sessions) {
      contexts[session.id] = loadPracticeSessionContext(session.id);
    }
    setSessionContexts(contexts);
  }, [sessions]);

  const tests = useMemo(() => getCheckpointAvailabilities(questions, banks), [questions, banks]);
  const grouped = {
    math: tests.filter((test) => test.section === "math" && test.testType !== "cumulative"),
    cumulative: tests.filter((test) => test.testType === "cumulative"),
  };
  const latestAttemptByTestId = useMemo(() => {
    const attempts = new Map<string, TestAttemptSummary>();

    for (const session of sessions) {
      if (!session.completedAt) continue;
      const context = sessionContexts[session.id];
      const inferred = inferCheckpointTestFromSession(session);
      const testId = context?.testId ?? inferred?.id;
      if (!testId || attempts.has(testId)) continue;
      attempts.set(testId, {
        sessionId: session.id,
        correct: session.correct,
        totalQuestions: session.totalQuestions,
        accuracy: session.accuracy,
        completedAt: session.completedAt,
      });
    }

    return attempts;
  }, [sessions, sessionContexts]);
  const inProgressAttemptByTestId = useMemo(() => {
    const attempts = new Map<string, InProgressTestAttemptSummary>();

    for (const session of sessions) {
      if (session.completedAt) continue;
      const context = sessionContexts[session.id];
      const inferred = inferCheckpointTestFromSession(session);
      const testId = context?.testId ?? inferred?.id;
      const isTestSession =
        session.sessionType === "section_exam" || Boolean(context?.isCheckpoint || context?.testId);
      if (!isTestSession || !testId || attempts.has(testId)) continue;

      const savedDraft = loadPracticeSessionDraft(session.id);
      const answeredQuestions = savedDraft
        ? Object.values(savedDraft.drafts).filter((draft) => draft.userAnswer !== null).length
        : 0;

      attempts.set(testId, {
        sessionId: session.id,
        answeredQuestions,
        totalQuestions: session.totalQuestions,
        startedAt: session.startedAt,
        savedAt: savedDraft?.savedAt,
      });
    }

    return attempts;
  }, [sessions, sessionContexts]);

  function resumeTest(sessionId: string) {
    setStartingId(sessionId);
    router.push(`/practice/${sessionId}`);
  }

  async function startTest(test: CheckpointAvailability) {
    if (!test.startable) return;
    setStartingId(test.id);
    setError(null);
    try {
      const requestBody = buildCheckpointSessionRequest(test);
      if (test.sourceBankId) {
        const bankQuestions = questions
          .filter((question) => question.bank_id === test.sourceBankId)
          .sort((a, b) => a.id.localeCompare(b.id));
        Object.assign(requestBody, {
          questionIds: bankQuestions.map((question) => question.id),
          sessionType: "section_exam",
        });
      }
      const { session } = createLocalSession(requestBody);
      const sessionId = session.id;
      const actualQuestionCount = session.total_questions;

      savePracticeSessionContext(sessionId, {
        mode: "full",
        modeLabel: "Checkpoint Test",
        section: test.availableSections.length === 1 ? test.availableSections[0] : undefined,
        subtopics: test.availableSubtopics,
        questionCount: actualQuestionCount,
        origin: "tests",
        returnTo: "/tests",
        returnLabel: "Back to Test Center",
        sourceSection: test.availableSections.join(","),
        sourceMode: "checkpoint-test",
        sourceCta: "Start Checkpoint Test",
        testId: test.id,
        testTitle: test.title,
        testType: test.testType,
        disableHints: true,
        isCheckpoint: true,
        testSubtopics: test.availableSubtopics,
        recommendedQuestionCount: test.recommendedQuestionCount,
        timeLimitMinutes: test.timeLimitMinutes,
      });

      router.push(`/practice/${sessionId}`);
    } catch (e) {
      setError((e as Error).message);
      setStartingId(null);
    }
  }

  return (
    <div className="space-y-7 animate-fade-in">
      <header className="space-y-2">
        <div className="flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-accent-teal/15 text-accent-teal">
            <FontAwesomeIcon icon={faClipboardCheck} className="h-5 w-5" aria-hidden />
          </span>
          <div>
            <h1 className="page-title">Test Center</h1>
            <p className="page-subtitle">
              Take checkpoint reviews to see what you still remember. Hints are off, but
              explanations are available after finishing.
            </p>
          </div>
        </div>
      </header>

      {error && (
        <div className="rounded-xl border border-accent-red/30 bg-accent-red/10 px-4 py-3 text-sm text-accent-red">
          {error}
        </div>
      )}

      {loading ? (
        <p className="text-sm text-ink-muted">Loading checkpoint tests...</p>
      ) : (
        <>
          {(["math", "cumulative"] as const).map((groupKey) => {
            const group = grouped[groupKey];
            if (group.length === 0) return null;
            return (
              <section key={groupKey} className="space-y-3">
                <div className="flex items-center gap-2">
                  <FontAwesomeIcon
                    icon={sectionIcon(groupKey)}
                    className="h-4 w-4 text-ink-muted"
                    aria-hidden
                  />
                  <h2 className="text-xl font-bold text-ink-primary">
                    {sectionTitle(groupKey)}
                  </h2>
                  {groupKey !== "cumulative" && (
                    <span
                      className="chip border-transparent"
                      style={{
                        backgroundColor: `${getSectionMeta(groupKey).color}20`,
                        color: getSectionMeta(groupKey).color,
                      }}
                    >
                      {getSectionMeta(groupKey).shortLabel}
                    </span>
                  )}
                </div>
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                  {group.map((test) => {
                    const inProgressAttempt = inProgressAttemptByTestId.get(test.id);
                    return (
                      <TestCard
                        key={test.id}
                        test={test}
                        onStart={startTest}
                        onResume={resumeTest}
                        starting={
                          startingId === test.id || startingId === inProgressAttempt?.sessionId
                        }
                        previousAttempt={latestAttemptByTestId.get(test.id)}
                        inProgressAttempt={inProgressAttempt}
                      />
                    );
                  })}
                </div>
              </section>
            );
          })}
        </>
      )}
    </div>
  );
}

function formatAttemptDate(value: string) {
  return new Date(value).toLocaleString([], {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
