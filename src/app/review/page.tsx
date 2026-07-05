"use client";

import { useEffect, useMemo, useState } from "react";
import QuestionCard from "@/components/review/QuestionCard";
import EmptyState from "@/components/ui/EmptyState";
import LoadingState, { ErrorState } from "@/components/ui/LoadingState";
import type { AnswerWithQuestion, Difficulty, QuestionStatus, Section } from "@/types";
import { SECTIONS, SUBTOPICS } from "@/lib/constants";
import { getLocalJoinedAnswers, subscribeToProgressChanges } from "@/lib/localProgress";

type DateRange = "7" | "30" | "all";

interface Filters {
  section: Section | "";
  subtopic: string;
  status: QuestionStatus | "";
  difficulty: Difficulty | "";
  flaggedOnly: boolean;
  dateRange: DateRange;
}

const DEFAULT_FILTERS: Filters = {
  section: "",
  subtopic: "",
  status: "incorrect", // default to showing incorrect
  difficulty: "",
  flaggedOnly: false,
  dateRange: "all",
};

const DIFFICULTIES: Difficulty[] = ["easy", "medium", "hard"];
const STATUSES: { value: QuestionStatus; label: string }[] = [
  { value: "new", label: "New" },
  { value: "incorrect", label: "Incorrect" },
  { value: "correct", label: "In Progress" },
  { value: "mastered", label: "Mastered" },
];

export default function ReviewPage() {
  const [allAnswers, setAllAnswers] = useState<AnswerWithQuestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<Filters>(DEFAULT_FILTERS);

  useEffect(() => {
    const load = () => {
      try {
        setAllAnswers(getLocalJoinedAnswers());
        setError(null);
      } catch (e) {
        setError((e as Error).message);
      } finally {
        setLoading(false);
      }
    };
    load();
    return subscribeToProgressChanges(load);
  }, []);

  // Cascading filter: each dropdown only shows options present in the data after
  // upstream filters are applied.
  const afterSection = useMemo(
    () => (filters.section ? allAnswers.filter((a) => a.section === filters.section) : allAnswers),
    [allAnswers, filters.section]
  );

  const afterSubtopic = useMemo(
    () => (filters.subtopic ? afterSection.filter((a) => a.subtopic === filters.subtopic) : afterSection),
    [afterSection, filters.subtopic]
  );

  const afterStatus = useMemo(
    () => (filters.status ? afterSubtopic.filter((a) => a.current_status === filters.status) : afterSubtopic),
    [afterSubtopic, filters.status]
  );

  const afterDifficulty = useMemo(
    () => (filters.difficulty ? afterStatus.filter((a) => a.difficulty === filters.difficulty) : afterStatus),
    [afterStatus, filters.difficulty]
  );

  const afterFlagged = useMemo(
    () => (filters.flaggedOnly ? afterDifficulty.filter((a) => a.is_flagged) : afterDifficulty),
    [afterDifficulty, filters.flaggedOnly]
  );

  const filtered = useMemo(() => {
    if (filters.dateRange === "all") return afterFlagged;
    const days = parseInt(filters.dateRange, 10);
    const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
    return afterFlagged.filter((a) => a.answered_at >= cutoff);
  }, [afterFlagged, filters.dateRange]);

  // Count helpers for cascading dropdowns.
  const sectionCounts = useMemo(() => {
    const m: Record<string, number> = {};
    for (const a of allAnswers) m[a.section] = (m[a.section] ?? 0) + 1;
    return m;
  }, [allAnswers]);

  const subtopicCounts = useMemo(() => {
    const m: Record<string, number> = {};
    for (const a of afterSection) m[a.subtopic] = (m[a.subtopic] ?? 0) + 1;
    return m;
  }, [afterSection]);

  const statusCounts = useMemo(() => {
    const m: Record<string, number> = {};
    for (const a of afterSubtopic) m[a.current_status] = (m[a.current_status] ?? 0) + 1;
    return m;
  }, [afterSubtopic]);

  const availableSubtopics = useMemo(
    () => SUBTOPICS.filter((s) => (filters.section ? s.section === filters.section : s.section === "math")),
    [filters.section]
  );

  function set<K extends keyof Filters>(key: K, value: Filters[K]) {
    setFilters((prev) => {
      const next = { ...prev, [key]: value };
      // Reset downstream when upstream changes.
      if (key === "section") next.subtopic = "";
      if (key === "section" || key === "subtopic") next.status = "";
      return next;
    });
  }

  const selectClass = "w-full rounded-lg border border-line bg-navy-800 px-3 py-2 text-sm text-ink-primary focus:border-accent-teal focus:outline-none";

  return (
    <div className="space-y-5 animate-fade-in">
      <div>
        <h1 className="page-title">Review</h1>
        <p className="page-subtitle">
          Study the questions you got wrong — that&apos;s where the gains are.
        </p>
      </div>

      {/* Cascading dropdowns */}
      <div className="card space-y-4">
        <div className="grid gap-3 sm:grid-cols-3">
          {/* Section */}
          <label className="flex flex-col gap-1 text-xs">
            <span className="font-semibold text-ink-secondary">Section</span>
            <select
              value={filters.section}
              onChange={(e) => set("section", e.target.value as Section | "")}
              className={selectClass}
            >
              <option value="">All Sections ({allAnswers.length})</option>
              {SECTIONS.map((s) => (
                <option key={s.id} value={s.id} disabled={!sectionCounts[s.id]}>
                  {s.label} ({sectionCounts[s.id] ?? 0})
                </option>
              ))}
            </select>
          </label>

          {/* Subtopic — cascades from section */}
          <label className="flex flex-col gap-1 text-xs">
            <span className="font-semibold text-ink-secondary">Subtopic</span>
            <select
              value={filters.subtopic}
              onChange={(e) => set("subtopic", e.target.value)}
              className={selectClass}
            >
              <option value="">All Subtopics ({afterSection.length})</option>
              {availableSubtopics.map((s) => (
                <option key={s.id} value={s.id} disabled={!subtopicCounts[s.id]}>
                  {s.label} ({subtopicCounts[s.id] ?? 0})
                </option>
              ))}
            </select>
          </label>

          {/* Status — cascades from section + subtopic */}
          <label className="flex flex-col gap-1 text-xs">
            <span className="font-semibold text-ink-secondary">Status</span>
            <select
              value={filters.status}
              onChange={(e) => set("status", e.target.value as QuestionStatus | "")}
              className={selectClass}
            >
              <option value="">All Statuses ({afterSubtopic.length})</option>
              {STATUSES.map(({ value, label }) => (
                <option key={value} value={value} disabled={!statusCounts[value]}>
                  {label} ({statusCounts[value] ?? 0})
                </option>
              ))}
            </select>
          </label>
        </div>

        {/* Chip filters */}
        <div className="flex flex-wrap items-center gap-4 border-t border-line pt-3">
          {/* Difficulty chips */}
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-semibold text-ink-muted">Difficulty:</span>
            {DIFFICULTIES.map((d) => (
              <button
                key={d}
                type="button"
                onClick={() => set("difficulty", filters.difficulty === d ? "" : d)}
                className={`chip cursor-pointer text-xs transition-colors ${
                  filters.difficulty === d
                    ? "border-accent-teal bg-accent-teal/10 text-accent-teal"
                    : "border-line bg-hover text-ink-secondary hover:border-accent-teal/40"
                }`}
              >
                {d}
              </button>
            ))}
          </div>

          {/* Flagged toggle */}
          <button
            type="button"
            onClick={() => set("flaggedOnly", !filters.flaggedOnly)}
            className={`chip cursor-pointer transition-colors ${
              filters.flaggedOnly
                ? "border-accent-amber bg-accent-amber/10 text-accent-amber"
                : "border-line bg-hover text-ink-secondary hover:border-accent-amber/40"
            }`}
          >
            Flagged only
          </button>

          {/* Date range */}
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-semibold text-ink-muted">Time:</span>
            {(["7", "30", "all"] as DateRange[]).map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => set("dateRange", r)}
                className={`chip cursor-pointer transition-colors ${
                  filters.dateRange === r
                    ? "border-accent-teal bg-accent-teal/10 text-accent-teal"
                    : "border-line bg-hover text-ink-secondary hover:border-accent-teal/40"
                }`}
              >
                {r === "7" ? "Last 7d" : r === "30" ? "Last 30d" : "All time"}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={() => setFilters(DEFAULT_FILTERS)}
            className="ml-auto text-xs text-accent-teal hover:underline"
          >
            Reset
          </button>
        </div>
      </div>

      {loading && <LoadingState />}
      {error && <ErrorState message={error} />}

      {!loading && !error && (
        <>
          <p className="text-sm text-ink-secondary">
            Showing <strong className="text-ink-primary">{filtered.length}</strong>{" "}
            {filtered.length === 1 ? "question" : "questions"}
          </p>

          {filtered.length === 0 ? (
            <EmptyState
              title="Nothing matches"
              message="No answers match these filters. Try loosening them — or go get more practice in."
              ctaLabel="Start a Session"
              ctaHref="/practice"
            />
          ) : (
            <div className="grid gap-4 lg:grid-cols-2">
              {filtered.map((a) => (
                <QuestionCard key={a.id} answer={a} />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
