"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faPlay,
  faSliders,
  faTriangleExclamation,
} from "@fortawesome/free-solid-svg-icons";
import {
  getSubtopicsForSection,
  getSectionMeta,
  VALID_SECTIONS,
} from "@/lib/constants";
import { formatLastPracticed } from "@/lib/calculateStats";
import { createLocalSession, getLocalQuestions } from "@/lib/localProgress";
import {
  buildPracticeSessionRequest,
  DEFAULT_CUSTOM_FILTERS,
  getEmptyPoolMessage,
  getPracticeFilters,
  getPracticeModeInfo,
  PRACTICE_MODES,
  questionMatchesPracticeFilters,
  savePracticeSessionContext,
  type CustomPracticeFilters,
  type PracticePoolMode,
} from "@/lib/practiceModes";
import type { Difficulty, QuestionRow, QuestionStatus, Section } from "@/types";

const DEFAULT_SECTION: Section = "math";
const QUESTION_COUNT_OPTIONS = [5, 10, 20, 30];

const MODE_QUERY_ALIASES: Record<string, PracticePoolMode> = {
  smart: "smart",
  full: "full",
  "full-review": "full",
  missed: "missed",
  memorization: "memorization",
  hard: "hard",
  "hard-application": "hard",
  custom: "custom",
};

function parseModeParam(value: string | null): PracticePoolMode | null {
  if (!value) return null;
  return MODE_QUERY_ALIASES[value.toLowerCase()] ?? null;
}

function parseCountParam(value: string | null): number | null {
  if (!value) return null;
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

export default function PracticeSetupPage() {
  const router = useRouter();
  const [allQuestions, setAllQuestions] = useState<QuestionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [section, setSection] = useState<Section>(DEFAULT_SECTION);
  const [selectedSubtopics, setSelectedSubtopics] = useState<Set<string>>(new Set());
  const [practiceMode, setPracticeMode] = useState<PracticePoolMode>("smart");
  const [customFilters, setCustomFilters] = useState<CustomPracticeFilters>(DEFAULT_CUSTOM_FILTERS);
  const [questionCount, setQuestionCount] = useState(10);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setAllQuestions(getLocalQuestions());
    setLoading(false);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const modeParam = parseModeParam(params.get("mode"));
    const countParam = parseCountParam(params.get("count"));
    const sectionParam = params.get("section") as Section | null;
    const subtopicParam = params.get("subtopic");
    const nextSection =
      sectionParam && VALID_SECTIONS.includes(sectionParam)
        ? sectionParam
        : DEFAULT_SECTION;

    if (modeParam) setPracticeMode(modeParam);
    if (countParam) setQuestionCount(countParam);

    setSection(nextSection);
    if (
      subtopicParam &&
      getSubtopicsForSection(nextSection).some((subtopic) => subtopic.id === subtopicParam)
    ) {
      setSelectedSubtopics(new Set([subtopicParam]));
    }
  }, []);

  const activeFilters = useMemo(
    () => getPracticeFilters(practiceMode, customFilters),
    [practiceMode, customFilters]
  );

  const countsPerSubtopic = useMemo(() => {
    const out: Record<string, number> = {};
    for (const q of allQuestions) {
      if (q.section === section && questionMatchesPracticeFilters(q, activeFilters)) {
        out[q.subtopic] = (out[q.subtopic] ?? 0) + 1;
      }
    }
    return out;
  }, [allQuestions, section, activeFilters]);

  const stateCountsPerSubtopic = useMemo(() => {
    const out: Record<string, Record<QuestionStatus, number>> = {};
    for (const q of allQuestions) {
      if (q.section !== section) continue;
      if (!out[q.subtopic]) out[q.subtopic] = { new: 0, incorrect: 0, correct: 0, mastered: 0 };
      out[q.subtopic][q.status] += 1;
    }
    return out;
  }, [allQuestions, section]);

  const lastPracticedPerSubtopic = useMemo(() => {
    const out: Record<string, string | null> = {};
    for (const q of allQuestions) {
      if (q.section !== section) continue;
      const existing = out[q.subtopic];
      if (!existing && q.last_attempted_at) {
        out[q.subtopic] = q.last_attempted_at;
      } else if (q.last_attempted_at && existing && q.last_attempted_at > existing) {
        out[q.subtopic] = q.last_attempted_at;
      } else if (!existing) {
        out[q.subtopic] = null;
      }
    }
    return out;
  }, [allQuestions, section]);

  const availableCount = useMemo(() => {
    return countMatchingQuestions(allQuestions, {
      section,
      subtopics: selectedSubtopics.size > 0 ? Array.from(selectedSubtopics) : undefined,
      mode: practiceMode,
      customFilters,
    });
  }, [allQuestions, section, selectedSubtopics, practiceMode, customFilters]);

  const totalAvailable = allQuestions.length;

  function toggleSubtopic(id: string) {
    setSelectedSubtopics((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function startPractice() {
    setStarting(true);
    setError(null);
    try {
      const { session: nextSession } = createLocalSession(
        buildPracticeSessionRequest({
          section,
          subtopics: selectedSubtopics.size > 0 ? Array.from(selectedSubtopics) : undefined,
          questionCount: actualCount,
          mode: practiceMode,
          customFilters,
        })
      );
      savePracticeSessionContext(nextSession.id, {
        mode: practiceMode,
        modeLabel: getPracticeModeInfo(practiceMode).shortLabel,
        section,
        subtopics: selectedSubtopics.size > 0 ? Array.from(selectedSubtopics) : undefined,
        questionCount: nextSession.total_questions,
        origin: "practice",
        returnTo: "/practice",
        returnLabel: "Practice setup",
        sourceSection: section,
        sourceSubtopic: selectedSubtopics.size === 1 ? Array.from(selectedSubtopics)[0] : undefined,
        sourceMode: practiceMode,
        sourceCta: "Start Practice",
      });
      router.push(`/practice/${nextSession.id}`);
    } catch (e) {
      setError((e as Error).message);
      setStarting(false);
    }
  }

  if (loading) {
    return <p className="text-sm text-ink-muted">Loading the included math questions...</p>;
  }

  if (totalAvailable === 0) {
    return (
      <div className="space-y-6 animate-fade-in">
        <div>
          <h1 className="page-title">Practice</h1>
          <p className="page-subtitle">Answer questions from the included math set.</p>
        </div>
        <div className="card border-accent-amber/30 text-center py-10">
          <FontAwesomeIcon icon={faTriangleExclamation} className="text-3xl text-accent-amber" aria-hidden />
          <p className="mt-4 text-base font-semibold text-ink-primary">No math questions found</p>
          <p className="mt-1 text-sm text-ink-secondary">
            The bundled public content could not be loaded. Try refreshing the page.
          </p>
          <a href="/learn" className="btn-primary mt-5 inline-flex">Go to Learn</a>
        </div>
      </div>
    );
  }

  const requestedCount = questionCount > 0 ? questionCount : 5;
  const actualCount = availableCount > 0 ? Math.min(requestedCount, availableCount) : 0;
  const emptyPoolMessage = availableCount === 0 ? getEmptyPoolMessage(practiceMode) : null;

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="page-title">Practice</h1>
        <p className="page-subtitle">Choose the math topics you want to practice.</p>
      </div>

      <section className="card space-y-6">
        <SubtopicPicker
          section={section}
          selectedSubtopics={selectedSubtopics}
          countsPerSubtopic={countsPerSubtopic}
          stateCountsPerSubtopic={stateCountsPerSubtopic}
          lastPracticedPerSubtopic={lastPracticedPerSubtopic}
          toggleSubtopic={toggleSubtopic}
          clearSubtopics={() => setSelectedSubtopics(new Set())}
        />

        <StartPracticeControls
          questionCount={questionCount}
          setQuestionCount={setQuestionCount}
          availableCount={availableCount}
          actualCount={actualCount}
          practiceMode={practiceMode}
          setPracticeMode={(mode) => {
            setPracticeMode(mode);
            setError(null);
          }}
          customFilters={customFilters}
          setCustomFilters={setCustomFilters}
          starting={starting}
          emptyPoolMessage={emptyPoolMessage}
          error={error}
          onStart={startPractice}
        />
      </section>
    </div>
  );
}

function SubtopicPicker({
  section,
  selectedSubtopics,
  countsPerSubtopic,
  stateCountsPerSubtopic,
  lastPracticedPerSubtopic,
  toggleSubtopic,
  clearSubtopics,
}: {
  section: Section;
  selectedSubtopics: Set<string>;
  countsPerSubtopic: Record<string, number>;
  stateCountsPerSubtopic: Record<string, Record<QuestionStatus, number>>;
  lastPracticedPerSubtopic: Record<string, string | null>;
  toggleSubtopic: (id: string) => void;
  clearSubtopics: () => void;
}) {
  return (
    <section aria-label="Pick subtopics">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-ink-muted">
          Choose subtopics
        </h2>
        {selectedSubtopics.size > 0 && (
          <button
            type="button"
            onClick={clearSubtopics}
            className="text-xs text-accent-teal hover:underline"
          >
            Clear selection
          </button>
        )}
      </div>
      <p className="mb-3 text-xs text-ink-muted">
        Select one or more topics, or leave all unselected to practice all {getSectionMeta(section).label}.
      </p>
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {getSubtopicsForSection(section).map((sub) => {
          const count = countsPerSubtopic[sub.id] ?? 0;
          const active = selectedSubtopics.has(sub.id);
          const states = stateCountsPerSubtopic[sub.id];
          const disabled = !states;
          const lastPracticed = formatLastPracticed(lastPracticedPerSubtopic[sub.id] ?? null);
          return (
            <button
              key={sub.id}
              type="button"
              disabled={disabled}
              onClick={() => toggleSubtopic(sub.id)}
              className={`rounded-lg border px-3 py-2.5 text-left text-sm transition-colors ${
                active
                  ? "border-accent-teal bg-accent-teal/10 text-accent-teal"
                  : disabled
                  ? "border-line bg-hover/40 text-ink-muted opacity-50"
                  : "border-line bg-hover/40 text-ink-secondary hover:border-accent-teal/40 hover:text-ink-primary"
              }`}
            >
              <span className="block truncate font-medium">{sub.label}</span>
              {states ? (
                <span className="mt-1 flex flex-wrap gap-x-2 text-[11px] opacity-80">
                  {count > 0 && <span className="text-ink-secondary">{count} match</span>}
                  {states.new > 0 && <span className="text-ink-muted">{states.new} new</span>}
                  {states.incorrect > 0 && <span className="text-accent-red">{states.incorrect} retry</span>}
                  {states.correct > 0 && <span className="text-accent-teal">{states.correct} in progress</span>}
                  {states.mastered > 0 && <span className="text-accent-green">{states.mastered} mastered</span>}
                </span>
              ) : (
                <span className="mt-0.5 block text-xs opacity-70">No included questions</span>
              )}
              {states && (
                <span
                  className={`mt-0.5 block text-[10px] ${
                    lastPracticed.urgency === "danger"
                      ? "text-accent-red"
                      : lastPracticed.urgency === "warn"
                      ? "text-accent-amber"
                      : "text-ink-muted"
                  }`}
                >
                  {lastPracticed.text}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </section>
  );
}

function StartPracticeControls({
  questionCount,
  setQuestionCount,
  availableCount,
  actualCount,
  practiceMode,
  setPracticeMode,
  customFilters,
  setCustomFilters,
  starting,
  emptyPoolMessage,
  error,
  onStart,
}: {
  questionCount: number;
  setQuestionCount: (count: number) => void;
  availableCount: number;
  actualCount: number;
  practiceMode: PracticePoolMode;
  setPracticeMode: (mode: PracticePoolMode) => void;
  customFilters: CustomPracticeFilters;
  setCustomFilters: React.Dispatch<React.SetStateAction<CustomPracticeFilters>>;
  starting: boolean;
  emptyPoolMessage: string | null;
  error: string | null;
  onStart: () => void;
}) {
  return (
    <section aria-label="Start practice" className="rounded-xl border border-line bg-navy-950/20 p-4">
      <h2 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-ink-muted">
        <FontAwesomeIcon icon={faSliders} className="h-3 w-3" aria-hidden />
        Practice options
      </h2>

      <div className="mt-3 grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <label className="text-sm font-semibold text-ink-secondary">
          Mode
          <select
            value={practiceMode}
            onChange={(event) => setPracticeMode(event.target.value as PracticePoolMode)}
            className="mt-1 w-full rounded-lg border border-line bg-navy-900 px-3 py-2 text-sm text-ink-primary"
          >
            {PRACTICE_MODES.map((mode) => (
              <option key={mode.id} value={mode.id}>
                {mode.label}
              </option>
            ))}
          </select>
        </label>

        <div>
          <p className="text-sm font-semibold text-ink-secondary">Question count</p>
          <div className="mt-1 flex flex-wrap gap-2">
            {QUESTION_COUNT_OPTIONS.map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => setQuestionCount(n)}
                className={`rounded-lg border px-4 py-2 text-sm font-semibold transition-colors ${
                  questionCount === n
                    ? "border-accent-teal bg-accent-teal/15 text-accent-teal"
                    : "border-line text-ink-secondary hover:border-accent-teal/40"
                }`}
              >
                {n}
              </button>
            ))}
            <button
              type="button"
              disabled={availableCount === 0}
              onClick={() => {
                if (availableCount > 0) setQuestionCount(availableCount);
              }}
              className={`rounded-lg border px-4 py-2 text-sm font-semibold transition-colors ${
                questionCount === availableCount && availableCount > 0
                  ? "border-accent-teal bg-accent-teal/15 text-accent-teal"
                  : availableCount === 0
                  ? "border-line text-ink-muted opacity-50"
                  : "border-line text-ink-secondary hover:border-accent-teal/40"
              }`}
            >
              All ({availableCount})
            </button>
          </div>
        </div>
      </div>

      {practiceMode === "custom" && (
        <div className="mt-4 grid gap-3 rounded-lg border border-line bg-navy-800/60 p-3 sm:grid-cols-3">
          <label className="flex items-center gap-2 text-sm text-ink-secondary">
            <input
              type="checkbox"
              checked={customFilters.includeMastered}
              onChange={(event) =>
                setCustomFilters((prev) => ({ ...prev, includeMastered: event.target.checked }))
              }
            />
            Include mastered
          </label>
          <label className="flex items-center gap-2 text-sm text-ink-secondary">
            <input
              type="checkbox"
              checked={customFilters.memorizationOnly}
              onChange={(event) =>
                setCustomFilters((prev) => ({ ...prev, memorizationOnly: event.target.checked }))
              }
            />
            Memorization only
          </label>
          <label className="text-sm text-ink-secondary">
            Difficulty
            <select
              value={customFilters.difficulty}
              onChange={(event) =>
                setCustomFilters((prev) => ({
                  ...prev,
                  difficulty: event.target.value as "any" | Difficulty,
                }))
              }
              className="mt-1 w-full rounded-md border border-line bg-navy-900 px-2 py-1.5 text-sm text-ink-primary"
            >
              <option value="any">Any</option>
              <option value="easy">Easy</option>
              <option value="medium">Medium</option>
              <option value="hard">Hard</option>
            </select>
          </label>
        </div>
      )}

      {availableCount < 5 && availableCount > 0 && (
        <p className="mt-3 text-xs text-accent-amber">
          Only {availableCount} question{availableCount === 1 ? "" : "s"} match. Try another mode if you want a wider set.
        </p>
      )}

      {emptyPoolMessage && (
        <p className="mt-3 rounded-lg border border-accent-amber/30 bg-accent-amber/5 px-3 py-2 text-xs text-accent-amber">
          {emptyPoolMessage}
        </p>
      )}

      <div className="mt-5 flex flex-col gap-3 border-t border-line pt-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="text-xs text-ink-muted">
          Session size:{" "}
          <span className="font-semibold text-ink-primary">{actualCount}</span>{" "}
          of {availableCount} available
          {" - "}
          {practiceMode === "hard" ? "priority: hard -> medium" : `mode: ${getPracticeModeInfo(practiceMode).shortLabel}`}
        </div>
        <button
          type="button"
          className="btn-primary justify-center"
          disabled={starting || availableCount === 0}
          onClick={onStart}
        >
          <FontAwesomeIcon icon={faPlay} className="h-3.5 w-3.5" aria-hidden />
          {starting ? "Starting..." : `Start Practice (${actualCount})`}
        </button>
      </div>

      {error && <p className="mt-3 text-xs text-accent-red">{error}</p>}
    </section>
  );
}

function countMatchingQuestions(
  questions: QuestionRow[],
  args: {
    section: Section;
    subtopics?: string[];
    mode: PracticePoolMode;
    customFilters?: CustomPracticeFilters;
  }
) {
  const filters = getPracticeFilters(args.mode, args.customFilters);
  return questions.filter((q) => {
    if (q.section !== args.section) return false;
    if (args.subtopics && args.subtopics.length > 0 && !args.subtopics.includes(q.subtopic)) return false;
    return questionMatchesPracticeFilters(q, filters);
  }).length;
}
