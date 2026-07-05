import type { Section } from "@/types";

// ============================================================
// v2 taxonomy — exact match to OAR_STUDY_TRACKER_V2_PROMPT.md
// ============================================================

export interface SectionMeta {
  id: Section;
  label: string;
  shortLabel: string;
  description: string;
  color: string; // hex for charts
  icon: string; // Font Awesome name
  questionCount: string;
  examQuestions: number;
  examMinutes: number;
  readinessWeight: number; // for OAR readiness score
}

const ALL_SECTION_META: SectionMeta[] = [
  {
    id: "math",
    label: "Math Skills",
    shortLabel: "Math",
    description: "Arithmetic, algebra, probability, geometry, word problems.",
    color: "#06B6D4",
    icon: "square-root-variable",
    questionCount: "~30 questions · 40 min",
    examQuestions: 30,
    examMinutes: 40,
    readinessWeight: 1,
  },
  {
    id: "reading",
    label: "Reading Comprehension",
    shortLabel: "Reading",
    description: "Passage analysis, main idea, inference, tone, structure.",
    color: "#10B981",
    icon: "book-open",
    questionCount: "~27 questions · 25 min",
    examQuestions: 27,
    examMinutes: 25,
    readinessWeight: 0.3,
  },
  {
    id: "mechanical",
    label: "Mechanical Comprehension",
    shortLabel: "Mechanical",
    description: "Pulleys, gears, levers, circuits, physics principles.",
    color: "#F59E0B",
    icon: "gears",
    questionCount: "~30 questions · 15 min",
    examQuestions: 30,
    examMinutes: 15,
    readinessWeight: 0.3,
  },
];

export const SECTIONS: SectionMeta[] = ALL_SECTION_META.filter(
  (section) => section.id === "math"
);

export interface SubtopicMeta {
  id: string;
  label: string;
  section: Section;
  priority?: "high" | "medium" | "lower";
}

// Stable taxonomy for bundled content and progress grouping.
// Existing IDs should not be renamed casually: progress and mastery are grouped
// by `questions.subtopic`, and answers are tied back through question IDs.
// Also keep generated question IDs globally unique across all banks because
// Question IDs must stay stable because progress is keyed by question ID.
export const SUBTOPICS: SubtopicMeta[] = [
  // ============= MATH =============
  { id: "probability", label: "Probability & Combinatorics", section: "math", priority: "high" },
  { id: "distance_rate_time", label: "Distance, Rate & Time (D=RT)", section: "math", priority: "high" },
  { id: "shared_work", label: "Shared Work Problems", section: "math", priority: "high" },
  { id: "fractions_exponents", label: "Fractions & Exponents", section: "math", priority: "high" },
  { id: "averages", label: "Averages (Weighted & Non-weighted)", section: "math", priority: "high" },
  { id: "factoring", label: "Factoring & Solving for X", section: "math", priority: "high" },
  { id: "exponent_rules", label: "Exponent Rules", section: "math", priority: "high" },
  { id: "geometry", label: "Geometry (Area, Volume, Perimeter)", section: "math", priority: "medium" },
  { id: "percentages", label: "Percentages & Percent Change", section: "math", priority: "medium" },
  { id: "logarithms", label: "Logarithms", section: "math", priority: "medium" },
  { id: "systems_of_equations", label: "Systems of Equations", section: "math", priority: "medium" },
  { id: "quadratic", label: "Quadratic Formula", section: "math", priority: "medium" },
  { id: "matrix", label: "Matrix Multiplication", section: "math", priority: "medium" },
  { id: "series_summation", label: "Series & Summation", section: "math", priority: "medium" },
  { id: "arc_length_sectors", label: "Arc Length & Sector Area", section: "math", priority: "medium" },
  { id: "unit_conversions", label: "Unit Conversions", section: "math", priority: "medium" },
  { id: "radicals_roots", label: "Radicals & Roots", section: "math", priority: "lower" },
  { id: "order_of_operations", label: "Order of Operations", section: "math", priority: "lower" },
  { id: "word_to_equation", label: "Word-to-Equation Translation", section: "math", priority: "lower" },
  { id: "mixture_problems", label: "Mixture & Solution Problems", section: "math", priority: "lower" },
  { id: "discount_markup", label: "Discount & Markup", section: "math", priority: "lower" },
  { id: "memorization_math", label: "Memorization (Perfect Numbers, Powers, Units)", section: "math", priority: "lower" },

  // ============= READING =============
  { id: "main_idea", label: "Main Idea", section: "reading" },
  { id: "inference", label: "Inference & Implied Meaning", section: "reading" },
  { id: "vocabulary_in_context", label: "Vocabulary in Context", section: "reading" },
  { id: "detail_identification", label: "Detail Identification", section: "reading" },
  { id: "tone_purpose", label: "Tone & Author's Purpose", section: "reading" },
  { id: "logical_structure", label: "Logical Structure & Sequence", section: "reading" },

  // ============= MECHANICAL =============
  // levers, pulleys, and gears already have content and user progress;
  // preserve these IDs when restructuring the learning path.
  { id: "levers", label: "Levers (1st, 2nd, 3rd Class)", section: "mechanical" },
  { id: "pulleys", label: "Pulleys & Pulley Systems", section: "mechanical" },
  { id: "gears", label: "Gears & Gear Ratios", section: "mechanical" },
  { id: "wheel_axle", label: "Wheel & Axle", section: "mechanical" },
  { id: "belts_chains_cams", label: "Belts, Chains, Sprockets & Cams", section: "mechanical" },
  { id: "mechanical_advantage", label: "Mechanical Advantage & Simple Machines", section: "mechanical" },
  { id: "newtons_laws", label: "Newton's Laws & Forces", section: "mechanical" },
  { id: "torque", label: "Torque", section: "mechanical" },
  { id: "energy_work_power", label: "Energy, Work & Power", section: "mechanical" },
  { id: "springs_pendulums", label: "Springs & Pendulums", section: "mechanical" },
  { id: "fluid_pressure", label: "Fluid Pressure & Hydraulics/Pistons", section: "mechanical" },
  { id: "buoyancy_density", label: "Buoyancy & Density", section: "mechanical" },
  { id: "bernoulli", label: "Bernoulli's Principle & Fluid Flow", section: "mechanical" },
  { id: "gas_laws", label: "Gas Laws (Ideal Gas Law)", section: "mechanical" },
  { id: "heat_temperature", label: "Heat & Temperature", section: "mechanical" },
  { id: "circuits", label: "Electrical Circuits (Ohm's Law, Series/Parallel)", section: "mechanical" },
  { id: "ac_dc_magnetism", label: "AC/DC & Magnetism", section: "mechanical" },
  { id: "engines_valves", label: "Engines, Valves & Combustion Basics", section: "mechanical" },
  { id: "memorization_mech", label: "Memorization (Formulas, Definitions, Conversions)", section: "mechanical" },
  // Valid but optional for now; omitted from the main mechanical learning path.
  { id: "binary_code", label: "Binary Code", section: "mechanical", priority: "lower" },
  { id: "inclined_planes_wedges", label: "Inclined Planes & Wedges", section: "mechanical" },
];

export const VALID_SECTIONS: Section[] = SECTIONS.map((s) => s.id);
export const VALID_SUBTOPIC_IDS = SUBTOPICS.map((s) => s.id);
export const VALID_DIFFICULTIES = ["easy", "medium", "hard"] as const;

export function getSectionMeta(id: Section): SectionMeta {
  const meta = SECTIONS.find((s) => s.id === id);
  if (!meta) throw new Error(`Unknown section: ${id}`);
  return meta;
}

export function getSubtopicMeta(id: string): SubtopicMeta | undefined {
  return SUBTOPICS.find((s) => s.id === id);
}

export function getSubtopicLabel(id: string): string {
  return getSubtopicMeta(id)?.label ?? id;
}

export function getSubtopicsForSection(section: Section): SubtopicMeta[] {
  return SUBTOPICS.filter((s) => s.section === section);
}

// ============================================================
// Mastery tiers — v2 spec exact bands.
// ============================================================

export interface MasteryTier {
  label: string;
  min: number;
  max: number;
  color: string;
  badgeClass: string;
}

export const MASTERY_TIERS: MasteryTier[] = [
  {
    label: "Not Started",
    min: -1,
    max: 0,
    color: "#64748B",
    badgeClass: "bg-white/5 text-ink-muted border border-white/10",
  },
  {
    label: "Needs Practice",
    min: 1,
    max: 25,
    color: "#EF4444",
    badgeClass: "bg-accent-red/20 text-accent-red border border-accent-red/40",
  },
  {
    label: "Learning",
    min: 26,
    max: 50,
    color: "#F59E0B",
    badgeClass: "bg-accent-amber/20 text-accent-amber border border-accent-amber/40",
  },
  {
    label: "Developing",
    min: 51,
    max: 75,
    color: "#3B82F6",
    badgeClass: "bg-blue-500/20 text-blue-400 border border-blue-500/40",
  },
  {
    label: "Proficient",
    min: 76,
    max: 89,
    color: "#06B6D4",
    badgeClass: "bg-accent-teal/20 text-accent-teal border border-accent-teal/40",
  },
  {
    label: "Mastered",
    min: 90,
    max: 100,
    color: "#10B981",
    badgeClass: "bg-accent-green/20 text-accent-green border border-accent-green/40",
  },
];

export function getMasteryTier(accuracy: number, totalAnswered: number): MasteryTier {
  if (totalAnswered === 0) return MASTERY_TIERS[0]; // Not Started
  const pct = Math.round(accuracy);
  return MASTERY_TIERS.find((t) => pct >= t.min && pct <= t.max) ?? MASTERY_TIERS[1];
}

// ============================================================
// Motivational message bands — v2 spec.
// ============================================================

export function getMotivationalMessage(accuracy: number, totalQuestions: number): string {
  if (totalQuestions === 0) {
    return "Your OAR journey starts now. Upload your first question bank!";
  }
  const pct = Math.round(accuracy);
  if (pct <= 20) return "Every expert was once a beginner. Keep at it!";
  if (pct <= 40) return `You're building momentum — ${pct}% and climbing!`;
  if (pct <= 60) return "Getting the hang of this! You're halfway to your goal.";
  if (pct <= 75) return "Solid progress! Above the average candidate.";
  if (pct <= 89) return "You're in the zone! The OAR doesn't stand a chance.";
  return "Test-ready! Time to schedule your OAR. You've got this.";
}
