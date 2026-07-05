import type { Section } from "@/types";

export type MemorizationCategoryId = "unit_conversions" | "math_formulas" | "mechanical_formulas";

export interface MemorizationCategory {
  id: MemorizationCategoryId;
  title: string;
  description: string;
  section?: Section;
  available: boolean;
}

export interface MemorizationCard {
  id: string;
  categoryId: MemorizationCategoryId;
  group: string;
  front: string;
  back: string;
  note?: string;
}

export const MEMORIZATION_CATEGORIES: MemorizationCategory[] = [
  {
    id: "unit_conversions",
    title: "Unit Conversions",
    description: "Fast recall for OAR length, weight, volume, time, speed, metric, area, and volume facts.",
    section: "math",
    available: true,
  },
  {
    id: "math_formulas",
    title: "Math Formulas",
    description: "Formula recall for algebra, geometry, exponents, and probability.",
    section: "math",
    available: false,
  },
  {
    id: "mechanical_formulas",
    title: "Mechanical Formulas",
    description: "Formula and definition recall for mechanical comprehension.",
    section: "mechanical",
    available: false,
  },
];

// Seed deck. Future work: generate cards from bundled memorization
// questions, persist recall stats, add spaced repetition, and add typed-answer drills.
export const MEMORIZATION_CARDS: MemorizationCard[] = [
  { id: "unit_length_inches_foot", categoryId: "unit_conversions", group: "Length", front: "12 inches = ? foot", back: "1 foot" },
  { id: "unit_length_feet_yard", categoryId: "unit_conversions", group: "Length", front: "3 feet = ? yard", back: "1 yard" },
  { id: "unit_length_feet_mile", categoryId: "unit_conversions", group: "Length", front: "1 mile = ? feet", back: "5,280 feet" },
  { id: "unit_length_yards_mile", categoryId: "unit_conversions", group: "Length", front: "1 mile = ? yards", back: "1,760 yards" },
  { id: "unit_weight_ounces_pound", categoryId: "unit_conversions", group: "Weight", front: "1 pound = ? ounces", back: "16 ounces" },
  { id: "unit_weight_pounds_ton", categoryId: "unit_conversions", group: "Weight", front: "1 ton = ? pounds", back: "2,000 pounds" },
  { id: "unit_volume_quarts_gallon", categoryId: "unit_conversions", group: "Volume", front: "1 gallon = ? quarts", back: "4 quarts" },
  { id: "unit_volume_pints_quart", categoryId: "unit_conversions", group: "Volume", front: "1 quart = ? pints", back: "2 pints" },
  { id: "unit_volume_cups_pint", categoryId: "unit_conversions", group: "Volume", front: "1 pint = ? cups", back: "2 cups" },
  { id: "unit_volume_fl_oz_cup", categoryId: "unit_conversions", group: "Volume", front: "1 cup = ? fluid ounces", back: "8 fluid ounces" },
  { id: "unit_time_seconds_minute", categoryId: "unit_conversions", group: "Time", front: "1 minute = ? seconds", back: "60 seconds" },
  { id: "unit_time_minutes_hour", categoryId: "unit_conversions", group: "Time", front: "1 hour = ? minutes", back: "60 minutes" },
  { id: "unit_time_hours_day", categoryId: "unit_conversions", group: "Time", front: "1 day = ? hours", back: "24 hours" },
  { id: "unit_time_seconds_hour", categoryId: "unit_conversions", group: "Time", front: "1 hour = ? seconds", back: "3,600 seconds" },
  { id: "unit_speed_mph_fts", categoryId: "unit_conversions", group: "Speed", front: "60 mph = ? ft/s", back: "88 ft/s" },
  { id: "unit_speed_mph_to_fts", categoryId: "unit_conversions", group: "Speed", front: "To convert mph to ft/s, multiply by ?", back: "$\\frac{22}{15}$" },
  { id: "unit_speed_fts_to_mph", categoryId: "unit_conversions", group: "Speed", front: "To convert ft/s to mph, multiply by ?", back: "$\\frac{15}{22}$" },
  { id: "unit_speed_ms_to_kmh", categoryId: "unit_conversions", group: "Speed", front: "To convert m/s to km/h, multiply by ?", back: "3.6" },
  { id: "unit_speed_kmh_to_ms", categoryId: "unit_conversions", group: "Speed", front: "To convert km/h to m/s, divide by ?", back: "3.6" },
  { id: "unit_area_yd2_ft2", categoryId: "unit_conversions", group: "Area/Volume", front: "$1\\text{ yd}^2 = ?\\text{ ft}^2$", back: "$9\\text{ ft}^2$" },
  { id: "unit_volume_ft3_in3", categoryId: "unit_conversions", group: "Area/Volume", front: "$1\\text{ ft}^3 = ?\\text{ in}^3$", back: "$1,728\\text{ in}^3$" },
  { id: "unit_metric_mm_cm", categoryId: "unit_conversions", group: "Metric", front: "1 cm = ? mm", back: "10 mm" },
  { id: "unit_metric_cm_m", categoryId: "unit_conversions", group: "Metric", front: "1 m = ? cm", back: "100 cm" },
  { id: "unit_metric_m_km", categoryId: "unit_conversions", group: "Metric", front: "1 km = ? m", back: "1,000 m" },
];

export function getCardsForCategory(categoryId: MemorizationCategoryId): MemorizationCard[] {
  return MEMORIZATION_CARDS.filter((card) => card.categoryId === categoryId);
}
