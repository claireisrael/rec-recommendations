import { parseActionPartners } from "@/lib/partners";

/**
 * @typedef {'very_poor' | 'poor' | 'fair' | 'good' | 'very_good' | 'exceptional'} ScoreTierKey
 */

/**
 * @typedef {Object} ScoreTier
 * @property {ScoreTierKey} key
 * @property {string} label
 * @property {number} min
 * @property {number} max
 * @property {string} color
 * @property {string} bgColor
 * @property {number} value
 */

/** Colors sampled from the REC score legend screenshot. */
export const SCORE_TIERS = [
  {
    key: "very_poor",
    label: "Very Poor",
    min: 0,
    max: 20,
    color: "#DD2116",
    bgColor: "#FDE8E6",
    value: 10,
  },
  {
    key: "poor",
    label: "Poor",
    min: 21,
    max: 40,
    color: "#F55807",
    bgColor: "#FEECDC",
    value: 30,
  },
  {
    key: "fair",
    label: "Fair",
    min: 41,
    max: 60,
    color: "#B27B38",
    bgColor: "#F5E6D3",
    value: 50,
  },
  {
    key: "good",
    label: "Good",
    min: 61,
    max: 80,
    color: "#379885",
    bgColor: "#E0F2EF",
    value: 70,
  },
  {
    key: "very_good",
    label: "Very Good",
    min: 81,
    max: 100,
    color: "#254F5F",
    bgColor: "#E4EEF1",
    value: 90,
  },
  {
    key: "exceptional",
    label: "Exceptional",
    min: 101,
    max: Number.POSITIVE_INFINITY,
    color: "#CA9961",
    bgColor: "#F5EDE0",
    value: 101,
  },
];

export const SCORE_TIER_KEYS = SCORE_TIERS.map((t) => t.key);

export const SELECTABLE_SCORE_TIERS = SCORE_TIERS;

export const DEFAULT_TIER = SCORE_TIERS[2]; // Fair

/** @param {ScoreTier} tier */
export function formatScoreRange(tier) {
  if (!Number.isFinite(tier.max) || tier.min >= 101) {
    return `${tier.min}+`;
  }
  return `${tier.min}–${tier.max}`;
}

export const SCORE_TIER_OPTIONS = SELECTABLE_SCORE_TIERS.map((tier) => ({
  value: tier.key,
  label: `${formatScoreRange(tier)} · ${tier.label}`,
}));

/** Legacy Appwrite / form keys → current tiers. */
const LEGACY_TIER_MAP = {
  average: "fair",
  excellent: "very_good",
};

/** @param {ScoreTierKey} key */
export function getTierByKey(key) {
  return SCORE_TIERS.find((t) => t.key === key) ?? DEFAULT_TIER;
}

/**
 * @param {string | number} raw
 * @returns {ScoreTierKey}
 */
export function toScoreTierKey(raw) {
  return /** @type {ScoreTierKey} */ (resolveScoreTier(raw).key);
}

/** @param {number} num */
export function tierFromScore(num) {
  const n = Math.round(num);
  if (n >= 101) return getTierByKey("exceptional");
  const clamped = Math.max(0, n);
  return (
    SCORE_TIERS.find(
      (t) => Number.isFinite(t.max) && clamped >= t.min && clamped <= t.max
    ) ?? DEFAULT_TIER
  );
}

/** @param {string | number} raw */
export function resolveScoreTier(raw) {
  if (typeof raw === "string") {
    const normalized = raw.trim();
    if (SCORE_TIER_KEYS.includes(normalized)) {
      return getTierByKey(/** @type {ScoreTierKey} */ (normalized));
    }
    if (normalized in LEGACY_TIER_MAP) {
      return getTierByKey(
        /** @type {ScoreTierKey} */ (LEGACY_TIER_MAP[normalized])
      );
    }
  }

  const num = typeof raw === "number" ? raw : Number(raw);
  if (!Number.isNaN(num)) {
    return tierFromScore(num);
  }

  return DEFAULT_TIER;
}

/** @param {ScoreTierKey | number | string} tierOrKey */
export function getScoreColor(tierOrKey) {
  return resolveScoreTier(tierOrKey).color;
}

/** @param {ScoreTierKey | number | string} tierOrKey */
export function getScoreLabel(tierOrKey) {
  return resolveScoreTier(tierOrKey).label;
}

/** @param {ScoreTierKey | number | string} tierOrKey */
export function getScoreBgColor(tierOrKey) {
  return resolveScoreTier(tierOrKey).bgColor;
}

/** @param {{ scoreTier: ScoreTierKey | string }[]} actions */
export function averageActionScore(actions) {
  if (actions.length === 0) return 0;
  return Math.round(
    actions.reduce(
      (sum, a) => sum + resolveScoreTier(a.scoreTier).value,
      0
    ) / actions.length
  );
}

/** @param {{ actions: { partner: string }[] }[]} recommendations */
export function countUniqueActionPartners(recommendations) {
  const partners = recommendations.flatMap((r) =>
    r.actions.flatMap((a) => parseActionPartners(a.partner))
  );
  return new Set(partners).size;
}
