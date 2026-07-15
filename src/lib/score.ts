import { parseActionPartners } from "@/lib/partners";

/**
 * Action scoring — REC Recommendations scale (Appwrite `actionScores` enum).
 * Same bands for contributor, L1 reviewer, and superadmin.
 *
 *   0–29     Poor
 *  30–49     Fair
 *  50–64     Average
 *  65–74     Good
 *  75–84     Very Good
 *  85–94     Excellent
 *  95–100    Exceptional
 */
export type ScoreTierKey =
  | "poor"
  | "fair"
  | "average"
  | "good"
  | "very_good"
  | "excellent"
  | "exceptional";

export interface ScoreTier {
  key: ScoreTierKey;
  label: string;
  min: number;
  max: number;
  color: string;
  bgColor: string;
  /** Representative value for averages / gauges */
  value: number;
}

export const SCORE_TIERS: ScoreTier[] = [
  {
    key: "poor",
    label: "Poor",
    min: 0,
    max: 29,
    color: "#DC2626",
    bgColor: "#FEE2E2",
    value: 15,
  },
  {
    key: "fair",
    label: "Fair",
    min: 30,
    max: 49,
    color: "#D97706",
    bgColor: "#FEF3C7",
    value: 40,
  },
  {
    key: "average",
    label: "Average",
    min: 50,
    max: 64,
    /** Brand secondary — same orange as R chips / UI accents */
    color: "#FFB803",
    bgColor: "#FFF8E1",
    value: 57,
  },
  {
    key: "good",
    label: "Good",
    min: 65,
    max: 74,
    color: "#054653",
    bgColor: "#E8F4F6",
    value: 70,
  },
  {
    key: "very_good",
    label: "Very Good",
    min: 75,
    max: 84,
    color: "#0B7186",
    bgColor: "#E0F2F7",
    value: 80,
  },
  {
    key: "excellent",
    label: "Excellent",
    min: 85,
    max: 94,
    color: "#0891B2",
    bgColor: "#CFFAFE",
    value: 90,
  },
  {
    key: "exceptional",
    label: "Exceptional",
    min: 95,
    max: 100,
    color: "#6D28D9",
    bgColor: "#EDE9FE",
    value: 98,
  },
];

export const SCORE_TIER_KEYS = [
  "poor",
  "fair",
  "average",
  "good",
  "very_good",
  "excellent",
  "exceptional",
] as const satisfies readonly ScoreTierKey[];

/** All selectable ratings — identical for form, L1, and superadmin. */
export const SELECTABLE_SCORE_TIERS = SCORE_TIERS;

export const DEFAULT_TIER = SCORE_TIERS[2]; // Average 50–64

export function formatScoreRange(tier: ScoreTier): string {
  return `${tier.min}–${tier.max}`;
}

export const SCORE_TIER_OPTIONS = SELECTABLE_SCORE_TIERS.map((tier) => ({
  value: tier.key,
  label: `${formatScoreRange(tier)} · ${tier.label}`,
}));

export function getTierByKey(key: ScoreTierKey): ScoreTier {
  return SCORE_TIERS.find((t) => t.key === key) ?? DEFAULT_TIER;
}

/** Normalize stored / drifted values to a REC enum key. */
export function toScoreTierKey(raw: string | number): ScoreTierKey {
  return resolveScoreTier(raw).key;
}

/** Map a percent into its REC band. */
export function tierFromScore(num: number): ScoreTier {
  const clamped = Math.max(0, Math.min(100, Math.round(num)));
  return (
    SCORE_TIERS.find((t) => clamped >= t.min && clamped <= t.max) ??
    DEFAULT_TIER
  );
}

/**
 * Resolve tier from Appwrite — REC keys, temporary Matrix drift keys, or integers.
 */
export function resolveScoreTier(raw: string | number): ScoreTier {
  if (typeof raw === "string") {
    const normalized = raw.trim();
    if (SCORE_TIER_KEYS.includes(normalized as ScoreTierKey)) {
      return getTierByKey(normalized as ScoreTierKey);
    }
    // Temporary Matrix-band keys → nearest REC band (do not invent new scales)
    if (normalized === "very_poor") return getTierByKey("poor");
  }

  const num = typeof raw === "number" ? raw : Number(raw);
  if (!Number.isNaN(num)) {
    return tierFromScore(num);
  }

  return DEFAULT_TIER;
}

export function getScoreColor(tierOrKey: ScoreTierKey | number | string): string {
  return resolveScoreTier(tierOrKey as string | number).color;
}

export function getScoreLabel(tierOrKey: ScoreTierKey | number | string): string {
  return resolveScoreTier(tierOrKey as string | number).label;
}

export function getScoreBgColor(tierOrKey: ScoreTierKey | number | string): string {
  return resolveScoreTier(tierOrKey as string | number).bgColor;
}

/** Average score across action tier ratings (representative values, capped 0–100). */
export function averageActionScore(
  actions: { scoreTier: ScoreTierKey | string }[]
): number {
  if (actions.length === 0) return 0;
  const avg = Math.round(
    actions.reduce(
      (sum, a) => sum + resolveScoreTier(a.scoreTier).value,
      0
    ) / actions.length
  );
  return Math.max(0, Math.min(100, avg));
}

export function countUniqueActionPartners(
  recommendations: { actions: { partner: string }[] }[]
): number {
  const partners = recommendations.flatMap((r) =>
    r.actions.flatMap((a) => parseActionPartners(a.partner))
  );
  return new Set(partners).size;
}
