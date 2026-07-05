"use client";

import { notFound, useParams } from "next/navigation";
import Link from "next/link";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faGraduationCap } from "@fortawesome/free-solid-svg-icons";
import {
  VALID_SECTIONS,
  getSectionMeta,
  getSubtopicsForSection,
  getMasteryTier,
} from "@/lib/constants";
import { formatLastPracticed, formatPercent } from "@/lib/calculateStats";
import MasteryDoughnut from "@/components/charts/MasteryDoughnut";
import LoadingState, { ErrorState } from "@/components/ui/LoadingState";
import { useStats } from "@/hooks/useStats";
import type { Section } from "@/types";

export default function SectionPage() {
  const params = useParams<{ sectionId: string }>();
  const sectionId = params?.sectionId as Section;

  if (!VALID_SECTIONS.includes(sectionId)) notFound();

  const meta = getSectionMeta(sectionId);
  const { data, loading, error } = useStats();

  if (loading) return <LoadingState />;
  if (error) return <ErrorState message={error} />;
  if (!data) return null;

  const sectionStats = data.sections.find((s) => s.section === sectionId)!;
  const subtopicStats = data.subtopics.filter((s) => s.section === sectionId);

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <Link href="/learn" className="text-xs text-accent-teal hover:underline">
          Back to Learn
        </Link>
        <h1 className="page-title mt-2" style={{ color: meta.color }}>
          {meta.label}
        </h1>
        <p className="page-subtitle">{meta.description}</p>
      </div>

      {/* Hero: doughnut + summary */}
      <section className="card flex flex-col items-center gap-5 sm:flex-row">
        <MasteryDoughnut
          accuracy={sectionStats.accuracy}
          color={meta.color}
          size={160}
          label="accuracy"
        />
        <div className="flex-1 text-center sm:text-left">
          <p className="text-sm text-ink-muted">Section accuracy</p>
          <p className="text-4xl font-bold text-ink-primary">
            {formatPercent(sectionStats.accuracy, 1)}
          </p>
          <p className="mt-1 text-sm text-ink-secondary">
            {sectionStats.correct} of {sectionStats.totalAnswered} answered
            correctly · {sectionStats.questionsAvailable} questions in your bank
          </p>
          <div className="mt-4 flex flex-wrap justify-center gap-2 sm:justify-start">
            <Link
              href={`/practice?section=${sectionId}`}
              className="btn-primary"
            >
              Practice This Section
            </Link>
          </div>
        </div>
      </section>

      {/* Subtopic grid — every subtopic always visible */}
      <section aria-label="Subtopic cards">
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-ink-muted">
          All Subtopics
        </h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {getSubtopicsForSection(sectionId).map((st) => {
            const stats = subtopicStats.find((s) => s.subtopic === st.id);
            const accuracy = stats?.accuracy ?? 0;
            const totalAnswered = stats?.totalAnswered ?? 0;
            const available = stats?.questionsAvailable ?? 0;
            const tier = getMasteryTier(accuracy, totalAnswered);
            const lastPracticed = formatLastPracticed(stats?.lastPracticedAt ?? null);
            const sc = stats?.stateCounts;
            return (
              <div key={st.id} className="card">
                <div className="flex items-start justify-between gap-2">
                  <Link href={`/subtopic/${st.id}`} className="text-sm font-bold text-ink-primary hover:text-accent-teal transition-colors">
                    {st.label}
                  </Link>
                  <div className="flex items-center gap-2">
                    <Link
                      href={`/learn/${st.id}`}
                      className="flex items-center gap-1 text-[11px] text-accent-teal hover:underline"
                      title={`Learn ${st.label}`}
                    >
                      <FontAwesomeIcon icon={faGraduationCap} className="h-3 w-3" aria-hidden />
                      Learn
                    </Link>
                    <span className={`chip ${tier.badgeClass}`}>{tier.label}</span>
                  </div>
                </div>
                <div className="mt-3 flex items-baseline gap-2">
                  <p className="text-2xl font-bold" style={{ color: totalAnswered > 0 ? meta.color : "#64748B" }}>
                    {totalAnswered > 0 ? formatPercent(accuracy, 0) : "—"}
                  </p>
                  <p className="text-xs text-ink-muted">
                    {totalAnswered > 0 ? `${totalAnswered} answered` : "not started"}
                  </p>
                </div>
                {sc && available > 0 && (
                  <div className="mt-1 flex flex-wrap gap-x-2 text-[11px]">
                    {sc.new > 0 && <span className="text-ink-muted">{sc.new} new</span>}
                    {sc.incorrect > 0 && <span className="text-accent-red">{sc.incorrect} retry</span>}
                    {sc.correct > 0 && <span className="text-accent-teal">{sc.correct} in progress</span>}
                    {sc.mastered > 0 && <span className="text-accent-green">{sc.mastered} mastered</span>}
                  </div>
                )}
                <p className={`mt-1 text-[11px] ${
                  lastPracticed.urgency === "danger" ? "text-accent-red" :
                  lastPracticed.urgency === "warn" ? "text-accent-amber" : "text-ink-muted"
                }`}>
                  {lastPracticed.text}
                </p>
                <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-hover">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{ width: `${accuracy}%`, backgroundColor: totalAnswered > 0 ? meta.color : "transparent" }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
