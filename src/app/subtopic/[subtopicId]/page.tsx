"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams, notFound } from "next/navigation";
import Link from "next/link";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faGraduationCap } from "@fortawesome/free-solid-svg-icons";
import {
  getSubtopicMeta,
  getSectionMeta,
  getMasteryTier,
} from "@/lib/constants";
import { formatPercent } from "@/lib/calculateStats";
import { getLocalJoinedAnswers, subscribeToProgressChanges } from "@/lib/localProgress";
import MasteryDoughnut from "@/components/charts/MasteryDoughnut";
import QuestionCard from "@/components/review/QuestionCard";
import LoadingState, { ErrorState } from "@/components/ui/LoadingState";
import EmptyState from "@/components/ui/EmptyState";
import type { AnswerWithQuestion } from "@/types";

type ResultFilter = "all" | "correct" | "incorrect";

export default function SubtopicPage() {
  const params = useParams<{ subtopicId: string }>();
  const subtopicId = params?.subtopicId as string;
  const meta = getSubtopicMeta(subtopicId);
  if (!meta || meta.section !== "math") notFound();

  const sectionMeta = getSectionMeta(meta.section);

  const [answers, setAnswers] = useState<AnswerWithQuestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [resultFilter, setResultFilter] = useState<ResultFilter>("all");
  const [difficultyFilter, setDifficultyFilter] = useState<string>("all");

  const load = useCallback(() => {
    setLoading(true);
    try {
      setAnswers(getLocalJoinedAnswers({ subtopic: subtopicId }));
      setError(null);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [subtopicId]);

  useEffect(() => {
    load();
    return subscribeToProgressChanges(load);
  }, [load]);

  const stats = useMemo(() => {
    const total = answers.length;
    const correct = answers.filter((a) => a.is_correct).length;
    return {
      total,
      correct,
      accuracy: total === 0 ? 0 : (correct / total) * 100,
    };
  }, [answers]);

  const filtered = useMemo(() => {
    let list = [...answers];
    if (resultFilter === "correct") list = list.filter((a) => a.is_correct);
    if (resultFilter === "incorrect") list = list.filter((a) => !a.is_correct);
    if (difficultyFilter !== "all") {
      list = list.filter((a) => a.difficulty === difficultyFilter);
    }
    return list;
  }, [answers, resultFilter, difficultyFilter]);

  const tier = getMasteryTier(stats.accuracy, stats.total);

  return (
    <div className="space-y-5 animate-fade-in">
      <div>
        <Link
          href={`/section/${meta.section}`}
          className="text-xs text-accent-teal hover:underline"
        >
          ← Back to {sectionMeta.label}
        </Link>
        <h1 className="page-title mt-2">{meta.label}</h1>
        <div className="flex items-center gap-3">
          <p className="page-subtitle">{sectionMeta.label}</p>
          <Link
            href={`/learn/${subtopicId}`}
            className="flex items-center gap-1.5 text-xs text-accent-teal hover:underline"
          >
            <FontAwesomeIcon icon={faGraduationCap} className="h-3 w-3" aria-hidden />
            Learn this topic
          </Link>
        </div>
      </div>

      {loading && <LoadingState />}
      {error && <ErrorState message={error} />}

      {!loading && !error && stats.total === 0 && (
        <EmptyState
          title="No answers yet"
          message={`You haven't answered any ${meta.label} questions yet. Start a practice session.`}
          ctaLabel="Go to Practice"
          ctaHref={`/practice?section=${meta.section}&subtopic=${subtopicId}`}
        />
      )}

      {stats.total > 0 && (
        <>
          <section className="card flex flex-col items-center gap-5 sm:flex-row">
            <MasteryDoughnut
              accuracy={stats.accuracy}
              color={sectionMeta.color}
              size={150}
            />
            <div className="flex-1 text-center sm:text-left">
              <p className="text-sm text-ink-muted">Mastery</p>
              <p className="text-4xl font-bold text-ink-primary">
                {formatPercent(stats.accuracy, 0)}
              </p>
              <p className="mt-1 text-sm text-ink-secondary">
                {stats.correct} of {stats.total} questions correct
              </p>
              <span className={`chip mt-3 ${tier.badgeClass}`}>
                {tier.label}
              </span>
            </div>
          </section>

          <div className="card flex flex-wrap items-center gap-3 text-xs">
            <label className="flex items-center gap-2">
              <span className="text-ink-secondary">Result:</span>
              <select
                value={resultFilter}
                onChange={(e) => setResultFilter(e.target.value as ResultFilter)}
                className="rounded-md border border-line bg-navy-950/60 px-2 py-1 text-sm"
              >
                <option value="all">All</option>
                <option value="correct">Correct only</option>
                <option value="incorrect">Incorrect only</option>
              </select>
            </label>
            <label className="flex items-center gap-2">
              <span className="text-ink-secondary">Difficulty:</span>
              <select
                value={difficultyFilter}
                onChange={(e) => setDifficultyFilter(e.target.value)}
                className="rounded-md border border-line bg-navy-950/60 px-2 py-1 text-sm"
              >
                <option value="all">All</option>
                <option value="easy">Easy</option>
                <option value="medium">Medium</option>
                <option value="hard">Hard</option>
              </select>
            </label>
            <span className="ml-auto text-ink-muted">
              {filtered.length} shown
            </span>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            {filtered.map((a) => (
              <QuestionCard key={a.id} answer={a} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
