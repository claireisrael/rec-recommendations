import { parseActionPartners } from "@/lib/partners";

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
  color: string;
  bgColor: string;
  /** Exact score for this tier (display, averages, gauges) */
  value: number;
}

export const SCORE_TIERS: ScoreTier[] = [
  { key: "poor", label: "Poor", color: "#DC2626", bgColor: "#FEE2E2", value: 40 },
  { key: "fair", label: "Fair", color: "#EA580C", bgColor: "#FFEDD5", value: 50 },
  { key: "average", label: "Average", color: "#CA8A04", bgColor: "#FEF9C3", value: 65 },
  { key: "good", label: "Good", color: "#16A34A", bgColor: "#DCFCE7", value: 75 },
  { key: "very_good", label: "Very Good", color: "#0B7186", bgColor: "#E0F2F7", value: 85 },
  { key: "excellent", label: "Excellent", color: "#0891B2", bgColor: "#CFFAFE", value: 95 },
  { key: "exceptional", label: "Exceptional", color: "#B45309", bgColor: "#FFB803", value: 100 },
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

export const DEFAULT_TIER = SCORE_TIERS[2];

export const SCORE_TIER_OPTIONS = SCORE_TIERS.map((tier) => ({
  value: tier.key,
  label: `${tier.value} · ${tier.label}`,
}));

export function getTierByKey(key: ScoreTierKey): ScoreTier {
  return SCORE_TIERS.find((t) => t.key === key) ?? DEFAULT_TIER;
}

function closestTierByValue(num: number): ScoreTier {
  return SCORE_TIERS.reduce((closest, tier) =>
    Math.abs(tier.value - num) < Math.abs(closest.value - num) ? tier : closest
  );
}

/** Resolve tier from Appwrite value — supports tier keys or legacy integers. */
export function resolveScoreTier(raw: string | number): ScoreTier {
  if (typeof raw === "string" && SCORE_TIER_KEYS.includes(raw as ScoreTierKey)) {
    return getTierByKey(raw as ScoreTierKey);
  }

  const num = typeof raw === "number" ? raw : Number(raw);
  if (!Number.isNaN(num)) {
    const exact = SCORE_TIERS.find((t) => t.value === num);
    if (exact) return exact;
    return closestTierByValue(Math.max(40, Math.min(100, Math.round(num))));
  }

  return DEFAULT_TIER;
}

export function getScoreColor(tierOrKey: ScoreTierKey | number): string {
  if (typeof tierOrKey === "string") return getTierByKey(tierOrKey).color;
  return resolveScoreTier(tierOrKey).color;
}

export function getScoreLabel(tierOrKey: ScoreTierKey | number): string {
  if (typeof tierOrKey === "string") return getTierByKey(tierOrKey).label;
  return resolveScoreTier(tierOrKey).label;
}

/** Average score across action tier ratings (for summary gauges). */
export function averageActionScore(
  actions: { scoreTier: ScoreTierKey }[]
): number {
  if (actions.length === 0) return 0;
  return Math.round(
    actions.reduce((sum, a) => sum + getTierByKey(a.scoreTier).value, 0) /
      actions.length
  );
}

export function countUniqueActionPartners(
  recommendations: { actions: { partner: string }[] }[]
): number {
  const partners = recommendations.flatMap((r) =>
    r.actions.flatMap((a) => parseActionPartners(a.partner))
  );
  return new Set(partners).size;
}
