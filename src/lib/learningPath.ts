import type { Section } from "@/types";
import { SUBTOPICS, type SubtopicMeta } from "./constants";

// ============================================================
// Learning path = DAG of subtopic prerequisites.
// Each skill lists the subtopics the learner should complete
// first. A skill unlocks when every prereq has >= UNLOCK_THRESHOLD
// mastery. Rank is used purely for visual grouping on the learn page.
// ============================================================

export const UNLOCK_THRESHOLD = 40; // percent mastery to count a prereq as "done"
export const COMPLETE_THRESHOLD = 80; // percent mastery to show the "completed" badge

export interface LearningNode {
  id: string;
  description: string;
  prereqIds: string[];
  /**
   * Optional visual stage override. Prereqs still control locking, but this lets
   * beginner paths show a calm order without creating artificial blockers.
   */
  displayRank?: number;
}

// Math: a real tree. Finishing the foundations unlocks multiple
// branches; later skills may require multiple siblings at once.
const MATH_NODES: LearningNode[] = [
  // Foundations
  { id: "order_of_operations", description: "PEMDAS: the order you evaluate arithmetic expressions.", prereqIds: [] },
  { id: "fractions_exponents", description: "Work with fractions and basic exponents: the building block for most math.", prereqIds: [] },
  { id: "memorization_math", description: "Perfect squares, powers of 2, common unit conversions worth memorizing.", prereqIds: [] },

  // Core arithmetic
  { id: "percentages", description: "Percent of, percent change, and percent-to-decimal conversion.", prereqIds: ["fractions_exponents"] },
  { id: "exponent_rules", description: "Product, quotient, power, and negative exponent rules.", prereqIds: ["fractions_exponents"] },
  { id: "radicals_roots", description: "Simplify square roots and manipulate radical expressions.", prereqIds: ["fractions_exponents", "order_of_operations"] },
  { id: "averages", description: "Arithmetic mean and weighted averages.", prereqIds: ["order_of_operations", "fractions_exponents"] },

  // Applied
  { id: "probability", description: "Single-event and compound probability, basic counting.", prereqIds: ["fractions_exponents", "percentages"] },
  { id: "distance_rate_time", description: "D = RT problems with one or two moving objects.", prereqIds: ["fractions_exponents", "averages"] },
  { id: "factoring", description: "Factor expressions and solve linear equations for x.", prereqIds: ["exponent_rules", "order_of_operations"] },
  { id: "discount_markup", description: "Sale prices, markup, and combined percent changes.", prereqIds: ["percentages"] },

  // Algebra
  { id: "word_to_equation", description: "Translate word problems into algebraic equations.", prereqIds: ["order_of_operations"] },
  { id: "quadratic", description: "Solve quadratics by factoring or the quadratic formula.", prereqIds: ["factoring", "radicals_roots"] },
  { id: "systems_of_equations", description: "Solve two-variable systems by substitution or elimination.", prereqIds: ["factoring"] },
  { id: "shared_work", description: "\"How long does it take working together?\" rate problems.", prereqIds: ["fractions_exponents", "word_to_equation"] },
  { id: "mixture_problems", description: "Concentration and mixture word problems.", prereqIds: ["percentages", "systems_of_equations"] },

  // Advanced
  { id: "logarithms", description: "Log properties and solving simple log equations.", prereqIds: ["exponent_rules"] },
  { id: "matrix", description: "Multiply matrices and read matrix notation.", prereqIds: ["systems_of_equations"] },
  { id: "series_summation", description: "Arithmetic and geometric sequences and sums.", prereqIds: ["exponent_rules", "averages"] },

  // Geometry
  { id: "geometry", description: "Area, perimeter, and volume of common shapes.", prereqIds: ["fractions_exponents", "exponent_rules"] },
  { id: "arc_length_sectors", description: "Circle arc length and sector area.", prereqIds: ["geometry"] },
  { id: "unit_conversions", description: "Convert between units using dimensional analysis.", prereqIds: ["fractions_exponents"] },
];

// Reading: a single linear progression per spec.
const READING_NODES: LearningNode[] = [
  { id: "main_idea", description: "Identify the central point of a passage.", prereqIds: [] },
  { id: "detail_identification", description: "Find supporting details and stated facts.", prereqIds: ["main_idea"] },
  { id: "vocabulary_in_context", description: "Figure out word meaning from surrounding text.", prereqIds: ["detail_identification"] },
  { id: "inference", description: "Draw conclusions from what's implied but not stated.", prereqIds: ["vocabulary_in_context"] },
  { id: "tone_purpose", description: "Detect author attitude and purpose.", prereqIds: ["inference"] },
  { id: "logical_structure", description: "Recognize how an argument is organized.", prereqIds: ["tone_purpose"] },
];

// Mechanical path notes:
// - levers, pulleys, and gears are preserved to protect existing content and
//   progress.
// - Do not rename existing subtopic IDs casually; progress is grouped by
//   `question.subtopic` / `questions.subtopic`.
// - Keep generated question IDs globally unique across banks.
// - binary_code remains a valid taxonomy ID, but is optional and omitted from
//   the main path for now.
const MECHANICAL_NODES: LearningNode[] = [
  // Stage 1 - Simple Machines & Rotation
  { id: "levers", description: "First, second, and third-class levers; fulcrums and arms.", prereqIds: [], displayRank: 1 },
  { id: "pulleys", description: "Fixed vs. movable pulleys and block-and-tackle systems.", prereqIds: [], displayRank: 1 },
  { id: "gears", description: "Gear ratios and direction of rotation.", prereqIds: [], displayRank: 1 },
  { id: "wheel_axle", description: "Wheels, axles, radius, rotation, and force tradeoffs.", prereqIds: [], displayRank: 1 },
  { id: "inclined_planes_wedges", description: "Ramps and wedges as simple machines that trade distance for force.", prereqIds: [], displayRank: 1 },
  { id: "belts_chains_cams", description: "How belts, chains, sprockets, and cams transfer motion.", prereqIds: ["gears", "wheel_axle"], displayRank: 1 },
  { id: "mechanical_advantage", description: "Force vs. distance tradeoff across simple machines.", prereqIds: ["levers", "pulleys", "gears", "wheel_axle"], displayRank: 1 },

  // Stage 2 - Forces, Motion & Balance
  { id: "newtons_laws", description: "Inertia, F = ma, and action-reaction force pairs.", prereqIds: [], displayRank: 2 },
  { id: "torque", description: "Rotational force: torque depends on force and lever arm.", prereqIds: ["levers"], displayRank: 2 },
  { id: "energy_work_power", description: "Work, kinetic/potential energy, and power.", prereqIds: ["newtons_laws"], displayRank: 2 },
  { id: "springs_pendulums", description: "Hooke's law, restoring force, and simple pendulum motion.", prereqIds: ["energy_work_power"], displayRank: 2 },

  // Stage 3 - Pressure, Fluids & Floating
  { id: "fluid_pressure", description: "Pressure in liquids and hydraulic systems.", prereqIds: ["newtons_laws"], displayRank: 3 },
  { id: "buoyancy_density", description: "Why things float: density and Archimedes' principle.", prereqIds: ["fluid_pressure"], displayRank: 3 },
  { id: "bernoulli", description: "Pressure and velocity in flowing fluids.", prereqIds: ["fluid_pressure"], displayRank: 3 },

  // Stage 4 - Heat, Gases, Electricity & Engines
  { id: "gas_laws", description: "Ideal gas law and pressure-volume-temperature relationships.", prereqIds: ["fluid_pressure"], displayRank: 4 },
  { id: "heat_temperature", description: "Heat transfer, specific heat, and temperature scales.", prereqIds: ["energy_work_power"], displayRank: 4 },
  { id: "circuits", description: "Ohm's law, series circuits, and parallel circuits.", prereqIds: [], displayRank: 4 },
  { id: "ac_dc_magnetism", description: "AC vs. DC current and basic magnetism.", prereqIds: ["circuits"], displayRank: 4 },
  { id: "engines_valves", description: "Basic engine cycles, valves, combustion, and power flow.", prereqIds: ["gas_laws", "heat_temperature"], displayRank: 4 },
  { id: "memorization_mech", description: "Formulas and definitions worth committing to memory.", prereqIds: [], displayRank: 4 },
];

const SECTION_NODES: Record<Section, LearningNode[]> = {
  math: MATH_NODES,
  reading: READING_NODES,
  mechanical: MECHANICAL_NODES,
};

// Sanity-check: every node references a known subtopic ID.
// Throwing at import time catches typos immediately.
for (const [section, nodes] of Object.entries(SECTION_NODES)) {
  for (const n of nodes) {
    if (!SUBTOPICS.some((s) => s.id === n.id && s.section === section)) {
      throw new Error(`Learning path node "${n.id}" in ${section} does not match any SUBTOPICS entry.`);
    }
    for (const p of n.prereqIds) {
      if (!nodes.some((other) => other.id === p)) {
        throw new Error(`Learning path node "${n.id}" references missing prereq "${p}".`);
      }
    }
  }
}

export function getLearningNodes(section: Section): LearningNode[] {
  return SECTION_NODES[section];
}

export function getLearningNode(subtopicId: string): LearningNode | undefined {
  for (const nodes of Object.values(SECTION_NODES)) {
    const n = nodes.find((x) => x.id === subtopicId);
    if (n) return n;
  }
  return undefined;
}

// Longest-path rank from a root (no-prereq) node unless a displayRank is set.
// Used only for grouping.
export function computeRanks(nodes: LearningNode[]): Map<string, number> {
  const rank = new Map<string, number>();
  const byId = new Map(nodes.map((n) => [n.id, n]));
  const visit = (id: string, stack: Set<string>): number => {
    if (rank.has(id)) return rank.get(id)!;
    if (stack.has(id)) throw new Error(`Cycle detected at ${id}`);
    stack.add(id);
    const n = byId.get(id)!;
    const prereqRank = n.prereqIds.length === 0
      ? 1
      : 1 + Math.max(...n.prereqIds.map((p) => visit(p, stack)));
    const r = n.displayRank ?? prereqRank;
    stack.delete(id);
    rank.set(id, r);
    return r;
  };
  for (const n of nodes) visit(n.id, new Set());
  return rank;
}

export interface LockState {
  locked: boolean;
  blockingPrereqs: SubtopicMeta[]; // prereqs that haven't hit the threshold
}

// A node is locked if any prereq has mastery < UNLOCK_THRESHOLD.
// Accuracy of 0 with totalAnswered=0 counts as not-yet-met.
export function computeLockState(
  node: LearningNode,
  masteryByid: Map<string, { accuracy: number; totalAnswered: number }>
): LockState {
  const blocking: SubtopicMeta[] = [];
  for (const p of node.prereqIds) {
    const m = masteryByid.get(p);
    const meets = m && m.totalAnswered > 0 && m.accuracy >= UNLOCK_THRESHOLD;
    if (!meets) {
      const meta = SUBTOPICS.find((s) => s.id === p);
      if (meta) blocking.push(meta);
    }
  }
  return { locked: blocking.length > 0, blockingPrereqs: blocking };
}

export interface RankGroup {
  rank: number;
  nodes: LearningNode[];
}

export function groupByRank(nodes: LearningNode[]): RankGroup[] {
  const ranks = computeRanks(nodes);
  const groups = new Map<number, LearningNode[]>();
  for (const n of nodes) {
    const r = ranks.get(n.id)!;
    if (!groups.has(r)) groups.set(r, []);
    groups.get(r)!.push(n);
  }
  return [...groups.entries()]
    .sort(([a], [b]) => a - b)
    .map(([rank, nodes]) => ({ rank, nodes }));
}

// "What's next" = first unlocked node (by rank) that still needs work,
// preferring direct dependents of the current subtopic.
export function getNextSubtopic(
  currentId: string,
  masteryByid: Map<string, { accuracy: number; totalAnswered: number }>
): LearningNode | null {
  const node = getLearningNode(currentId);
  if (!node) return null;
  const section = SUBTOPICS.find((s) => s.id === currentId)?.section;
  if (!section) return null;
  const nodes = getLearningNodes(section);

  // 1) Direct children (nodes that list currentId as a prereq), least-mastered first.
  const children = nodes.filter((n) => n.prereqIds.includes(currentId));
  if (children.length > 0) {
    const sorted = [...children].sort((a, b) => {
      const ma = masteryByid.get(a.id)?.accuracy ?? 0;
      const mb = masteryByid.get(b.id)?.accuracy ?? 0;
      return ma - mb;
    });
    return sorted[0];
  }

  // 2) Fall back to next node by rank that isn't already complete.
  const ranks = computeRanks(nodes);
  const currentRank = ranks.get(currentId) ?? 0;
  const later = nodes
    .filter((n) => (ranks.get(n.id) ?? 0) > currentRank)
    .sort((a, b) => (ranks.get(a.id)! - ranks.get(b.id)!));
  return later[0] ?? null;
}
