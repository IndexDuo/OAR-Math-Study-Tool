"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, notFound, useRouter } from "next/navigation";
import Link from "next/link";
import { startQuickPractice } from "@/lib/startQuickPractice";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faLightbulb,
  faTriangleExclamation,
  faCircleInfo,
  faFlask,
  faListCheck,
  faGraduationCap,
  faCalculator,
  faPlay,
  faArrowRight,
} from "@fortawesome/free-solid-svg-icons";
import { getSubtopicMeta, getSectionMeta, getSubtopicLabel } from "@/lib/constants";
import {
  getLocalConceptPages,
  getLocalDashboardStats,
  getLocalQuestions,
} from "@/lib/localProgress";
import {
  computeRanks,
  getLearningNodes,
  getNextSubtopic,
  type LearningNode,
} from "@/lib/learningPath";
import MathText from "@/components/ui/MathText";
import ExampleBlock from "@/components/ui/ExampleBlock";
import LoadingState, { ErrorState } from "@/components/ui/LoadingState";
import EmptyState from "@/components/ui/EmptyState";
import type { ConceptPageRow, ConceptBlock, QuestionRow } from "@/types";
import type { PracticePoolMode } from "@/lib/practiceModes";

const VISITED_KEY_PREFIX = "concept_visited_";

const BLOCK_STYLES: Record<ConceptBlock["type"], { icon: typeof faLightbulb; label: string; borderClass: string; bgClass: string; textClass: string }> = {
  intro: { icon: faCircleInfo, label: "Introduction", borderClass: "border-accent-teal/30", bgClass: "bg-accent-teal/5", textClass: "text-accent-teal" },
  explanation: { icon: faGraduationCap, label: "Explanation", borderClass: "border-line", bgClass: "", textClass: "text-ink-primary" },
  formula: { icon: faCalculator, label: "Key Formula", borderClass: "border-accent-teal/30", bgClass: "bg-accent-teal/5", textClass: "text-accent-teal" },
  example: { icon: faFlask, label: "Example", borderClass: "border-accent-green/30", bgClass: "bg-accent-green/5", textClass: "text-accent-green" },
  tip: { icon: faLightbulb, label: "Tip", borderClass: "border-accent-amber/30", bgClass: "bg-accent-amber/5", textClass: "text-accent-amber" },
  warning: { icon: faTriangleExclamation, label: "Watch Out", borderClass: "border-accent-red/30", bgClass: "bg-accent-red/5", textClass: "text-accent-red" },
  summary: { icon: faListCheck, label: "Summary", borderClass: "border-accent-teal/30", bgClass: "bg-accent-teal/5", textClass: "text-accent-teal" },
};

export default function LearnPage() {
  const params = useParams<{ subtopicId: string }>();
  const router = useRouter();
  const subtopicId = params?.subtopicId as string;
  const meta = getSubtopicMeta(subtopicId);
  if (!meta || meta.section !== "math") notFound();

  const sectionMeta = getSectionMeta(meta.section);

  const [page, setPage] = useState<ConceptPageRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [starting, setStarting] = useState(false);
  const [startingMode, setStartingMode] = useState<PracticePoolMode | null>(null);
  const [startError, setStartError] = useState<string | null>(null);
  const [questionPool, setQuestionPool] = useState<QuestionRow[]>([]);

  async function handleStartPractice(mode: PracticePoolMode = "smart") {
    if (!meta || starting) return;
    setStarting(true);
    setStartingMode(mode);
    setStartError(null);
    try {
      const sourceCta =
        mode === "full"
          ? "Full Topic Review"
          : mode === "memorization"
          ? "Memorization Drill"
          : mode === "hard"
          ? "Hard/Application Practice"
          : "Start Smart Practice";
      const sessionId = await startQuickPractice(meta.section, subtopicId, 5, mode, {
        origin: "lesson",
        returnTo: `/learn/${subtopicId}`,
        returnLabel: "Back to lesson",
        sourceSubtopic: subtopicId,
        sourceSection: meta.section,
        sourceMode: mode,
        sourceCta,
      });
      router.push(`/practice/${sessionId}`);
    } catch (e) {
      setStartError((e as Error).message);
      setStarting(false);
      setStartingMode(null);
    }
  }

  const load = useCallback(() => {
    setLoading(true);
    try {
      const pages = getLocalConceptPages({ subtopic: subtopicId });
      setPage(pages.length > 0 ? pages[0] : null);
      setError(null);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [subtopicId]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (typeof document === "undefined" || !meta) return;
    document.title = `${page?.title ?? `Learn: ${meta.label}`} | OAR Math Study Tool`;
    return () => {
      document.title = "OAR Math Study Tool";
    };
  }, [meta, page?.title]);

  useEffect(() => {
    if (!meta) return;
    setQuestionPool(getLocalQuestions({ section: meta.section, subtopic: subtopicId }));
  }, [meta, subtopicId]);

  // Mark this concept page as visited in localStorage (used by the
  // learn index to show "Review" vs "Learn").
  useEffect(() => {
    if (typeof window === "undefined" || !subtopicId) return;
    try {
      window.localStorage.setItem(`${VISITED_KEY_PREFIX}${subtopicId}`, "true");
    } catch {
      // localStorage may be unavailable (private mode, quota) — not fatal.
    }
  }, [subtopicId]);

  // Pull stats so "What's next" picks a sensible target.
  const [nextNode, setNextNode] = useState<LearningNode | null>(null);
  const [stageRank, setStageRank] = useState<number | null>(null);

  useEffect(() => {
    if (!meta) return;
    const nodes = getLearningNodes(meta.section);
    const ranks = computeRanks(nodes);
    setStageRank(ranks.get(subtopicId) ?? null);

    try {
      const stats = getLocalDashboardStats();
      const m = new Map<string, { accuracy: number; totalAnswered: number }>();
      for (const s of stats.subtopics ?? []) {
        m.set(s.subtopic, { accuracy: s.accuracy, totalAnswered: s.totalAnswered });
      }
      setNextNode(getNextSubtopic(subtopicId, m));
    } catch {
      setNextNode(getNextSubtopic(subtopicId, new Map()));
    }
  }, [subtopicId, meta]);

  if (loading) return <LoadingState />;
  if (error) return <ErrorState message={error} />;

  if (!page) {
    return (
      <div className="space-y-5 animate-fade-in">
        <div>
          <Link href={`/section/${meta.section}`} className="text-xs text-accent-teal hover:underline">
            ← Back to {sectionMeta.label}
          </Link>
          <h1 className="page-title mt-2">Learn: {meta.label}</h1>
        </div>
        <EmptyState
          title="No concept page yet"
          message={`A teaching page for "${meta.label}" is not included in this public math build yet.`}
          ctaLabel="Back to Learning Path"
          ctaHref="/learn"
        />
      </div>
    );
  }

  const difficultyOrder = { easy: 0, medium: 1, hard: 2 };
  const hasMemorizationQuestions = questionPool.some((q) => q.is_memorization);
  const hasHardQuestions = questionPool.some((q) => q.difficulty === "hard");

  return (
    <div className="mx-auto max-w-3xl space-y-6 animate-fade-in">
      {/* Breadcrumb + title */}
      <div>
        <div className="flex flex-wrap items-center gap-2 text-xs text-ink-muted">
          <Link href="/learn" className="text-accent-teal hover:underline">
            Learn
          </Link>
          <span>/</span>
          <Link href="/learn" className="text-accent-teal hover:underline">
            {sectionMeta.shortLabel}
          </Link>
          {stageRank !== null && (
            <>
              <span>/</span>
              <span>Stage {stageRank}</span>
            </>
          )}
          <span>/</span>
          <span>{meta.label}</span>
        </div>
        <h1 className="page-title mt-2">{page.title}</h1>
        <p className="page-subtitle mt-1">
          <MathText text={page.overview} section={meta.section} />
        </p>
      </div>

      {/* Prerequisites */}
      {page.prerequisites && page.prerequisites.length > 0 && (
        <div className="card border-accent-amber/30 bg-accent-amber/5">
          <p className="flex items-center gap-2 text-sm font-semibold text-accent-amber">
            <FontAwesomeIcon icon={faCircleInfo} aria-hidden />
            Prerequisites
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            {page.prerequisites.map((pre) => (
              <Link
                key={pre}
                href={`/learn/${pre}`}
                className="chip border-accent-amber/30 text-accent-amber hover:bg-accent-amber/10 transition-colors"
              >
                {getSubtopicLabel(pre)}
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Content blocks */}
      <div className="space-y-4">
        {page.blocks
          .sort((a, b) => {
            // Sort by difficulty if present: easy → medium → hard, then by original order
            if (a.difficulty && b.difficulty) {
              return (difficultyOrder[a.difficulty] ?? 1) - (difficultyOrder[b.difficulty] ?? 1);
            }
            return 0;
          })
          .map((block, i) => {
            const style = BLOCK_STYLES[block.type];
            return (
              <section
                key={i}
                className={`card ${style.borderClass} ${style.bgClass}`}
                aria-label={block.title ?? style.label}
              >
                <div className="flex items-center gap-2">
                  <FontAwesomeIcon icon={style.icon} className={`h-4 w-4 ${style.textClass}`} aria-hidden />
                  <h2 className={`text-sm font-bold ${style.textClass}`}>
                    {block.title ?? style.label}
                  </h2>
                  {block.difficulty && (
                    <span className="chip border-line text-ink-muted ml-auto text-[10px] capitalize">
                      {block.difficulty}
                    </span>
                  )}
                </div>
                <div className="mt-3">
                  {block.type === "example" ? (
                    <ExampleBlock content={block.content} solution={block.solution} section={meta.section} />
                  ) : (
                    <div className="text-sm leading-relaxed text-ink-secondary space-y-2">
                      {block.content.split("\n\n").map((paragraph, j) => (
                        <MathText key={j} text={paragraph} section={meta.section} className="block" />
                      ))}
                    </div>
                  )}
                </div>
              </section>
            );
          })}
      </div>

      {/* Key Formulas quick reference */}
      {page.key_formulas && page.key_formulas.length > 0 && (
        <section className="card border-accent-teal/30">
          <h2 className="flex items-center gap-2 text-sm font-bold text-accent-teal">
            <FontAwesomeIcon icon={faCalculator} aria-hidden />
            Quick Reference — Key Formulas
          </h2>
          <div className="mt-3 space-y-2">
            {page.key_formulas.map((formula, i) => (
              <div key={i} className="rounded-md bg-white/[0.03] px-4 py-3 text-center">
                <MathText text={formula} section={meta.section} block />
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Common Mistakes */}
      {page.common_mistakes && page.common_mistakes.length > 0 && (
        <section className="card border-accent-red/30 bg-accent-red/5">
          <h2 className="flex items-center gap-2 text-sm font-bold text-accent-red">
            <FontAwesomeIcon icon={faTriangleExclamation} aria-hidden />
            Common Mistakes to Avoid
          </h2>
          <ul className="mt-3 space-y-2 ml-4 list-disc text-sm text-ink-secondary">
            {page.common_mistakes.map((mistake, i) => (
              <li key={i}>
                <MathText text={mistake} section={meta.section} />
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* CTA: practice this subtopic */}
      <div className="card flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-ink-primary">Ready to practice?</p>
          <p className="text-xs text-ink-muted">
            Start with a guided set, or choose a focused review for {meta.label}.
          </p>
          {startError && (
            <p className="mt-2 text-xs text-accent-red">{startError}</p>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href={`/subtopic/${subtopicId}`} className="btn-secondary">
            View Attempts
          </Link>
          <button
            type="button"
            onClick={() => handleStartPractice("smart")}
            disabled={starting}
            className="btn-primary"
          >
            <FontAwesomeIcon icon={faPlay} className="h-3.5 w-3.5" aria-hidden />
            {starting && startingMode === "smart" ? "Starting..." : "Start Smart Practice"}
          </button>
          <button
            type="button"
            onClick={() => handleStartPractice("full")}
            disabled={starting}
            className="btn-secondary"
          >
            Full Topic Review
          </button>
          {hasMemorizationQuestions && (
            <button
              type="button"
              onClick={() => handleStartPractice("memorization")}
              disabled={starting}
              className="btn-secondary"
            >
              Memorization Drill
            </button>
          )}
          {hasHardQuestions && (
            <button
              type="button"
              onClick={() => handleStartPractice("hard")}
              disabled={starting}
              className="btn-secondary"
            >
              Hard/Application Practice
            </button>
          )}
        </div>
      </div>

      {/* What's Next */}
      {nextNode && (
        <Link
          href={`/learn/${nextNode.id}`}
          className="card flex items-center justify-between gap-4 border-accent-teal/30 bg-accent-teal/5 transition-colors hover:bg-accent-teal/10"
        >
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wide text-accent-teal">
              What&apos;s next
            </p>
            <p className="mt-1 text-sm font-bold text-ink-primary">
              {getSubtopicLabel(nextNode.id)}
            </p>
            <p className="mt-0.5 text-xs text-ink-secondary">{nextNode.description}</p>
          </div>
          <FontAwesomeIcon
            icon={faArrowRight}
            className="h-5 w-5 text-accent-teal"
            aria-hidden
          />
        </Link>
      )}
    </div>
  );
}
