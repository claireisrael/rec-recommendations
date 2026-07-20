/**
 * @typedef {'planned' | 'in_progress' | 'completed'} RecommendationStatus
 */

export const RECOMMENDATION_STATUSES = [
  "planned",
  "in_progress",
  "completed",
];

/** @type {Record<RecommendationStatus, string>} */
export const STATUS_LABELS = {
  planned: "Planned",
  in_progress: "In Progress",
  completed: "Completed",
};

/** Clear status chips — readable on white tables (HR-style). */
/** @type {Record<RecommendationStatus, { color: string, bg: string, border: string }>} */
export const STATUS_COLORS = {
  planned: { color: "#2E9ECC", bg: "rgba(46, 158, 204,0.08)", border: "rgba(46, 158, 204,0.18)" },
  in_progress: { color: "#92400e", bg: "#fef3c7", border: "#fcd34d" },
  completed: { color: "#166534", bg: "#dcfce7", border: "#86efac" },
};

/**
 * @typedef {Object} ActionItem
 * @property {string} id Stable id for review workflow
 * @property {string} text
 * @property {import("@/lib/score").ScoreTierKey} scoreTier
 * @property {string} partner
 * @property {import("@/lib/evidence").EvidenceItem[]} evidence
 * @property {import("@/lib/action-review").ActionReviewMeta} review
 */

/**
 * @typedef {import("appwrite").Models.Document & {
 *   recommendation: string,
 *   year: number,
 *   category: import("@/lib/categories").RecommendationCategory,
 *   sectionCode?: string,
 *   actions: ActionItem[],
 *   comments?: string,
 *   status: RecommendationStatus
 * }} Recommendation
 */

/**
 * @typedef {Object} RecommendationInput
 * @property {string} recommendation
 * @property {number} year
 * @property {import("@/lib/categories").RecommendationCategory} category
 * @property {string} [sectionCode] Section root the assignee owns (e.g. "6.9")
 * @property {ActionItem[]} actions
 * @property {string} [comments]
 * @property {RecommendationStatus} status
 */

/**
 * @typedef {import("appwrite").Models.Document & {
 *   recommendations: string,
 *   "rec-year": number,
 *   category?: string,
 *   sectionCode?: string,
 *   actionItems: string[],
 *   actionScores?: string[],
 *   actionPartners?: string[],
 *   actionEvidence?: string[],
 *   actionReviews?: string[],
 *   comments?: string,
 *   status: RecommendationStatus
 * }} RecommendationDocument
 */

/**
 * @typedef {Object} YearStats
 * @property {number} year
 * @property {number} totalRecommendations
 * @property {number} averageScore
 * @property {number} totalActionPartners
 */

/**
 * @typedef {Object} GlobalStats
 * @property {number} totalRecommendations
 * @property {number} averageScore
 * @property {number} totalActionPartners
 * @property {{ min: number, max: number } | null} yearRange
 */
