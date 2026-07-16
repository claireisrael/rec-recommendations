import { toScoreTierKey } from "@/lib/score";

export const ACTION_REVIEW_STATUSES = [
  "draft",
  "awaiting_l1",
  "awaiting_superadmin",
  "published",
  "changes_requested",
];

/**
 * @typedef {'draft' | 'awaiting_l1' | 'awaiting_superadmin' | 'published' | 'changes_requested'} ActionReviewStatus
 */

/** @type {Record<ActionReviewStatus, string>} */
export const ACTION_REVIEW_STATUS_LABELS = {
  draft: "Draft",
  awaiting_l1: "Awaiting L1 review",
  awaiting_superadmin: "Awaiting final approval",
  published: "Published",
  changes_requested: "Changes requested",
};

/**
 * @typedef {Object} ActionReviewMeta
 * @property {string} id
 * @property {ActionReviewStatus} status
 * @property {string} [submitterId]
 * @property {string} [submitterName]
 * @property {string} [submitterEmail]
 * @property {string} [l1ReviewerId]
 * @property {string} [l1ReviewerName]
 * @property {string} [l1ReviewerEmail]
 * @property {import("@/lib/score").ScoreTierKey} [contributorScore]
 * @property {import("@/lib/score").ScoreTierKey} [l1Score]
 * @property {string} [l1Remark]
 * @property {string} [l1ReviewedAt]
 * @property {import("@/lib/score").ScoreTierKey} [superadminScore]
 * @property {string} [superadminRemark]
 * @property {string} [superadminReviewedAt]
 * @property {string} [publishedAt]
 * @property {{ fromRole: 'l1_reviewer' | 'superadmin', fromName: string, message: string, at: string }[]} [feedback]
 */

export function createActionId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `act_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

/** @param {Partial<ActionReviewMeta>} [partial] */
export function defaultActionReviewMeta(partial) {
  return {
    id: partial?.id || createActionId(),
    status: partial?.status || "draft",
    ...partial,
  };
}

/** @param {string | undefined | null} raw */
export function parseActionReview(raw) {
  if (!raw?.trim()) return defaultActionReviewMeta();
  try {
    const parsed = JSON.parse(raw);
    return defaultActionReviewMeta({
      ...parsed,
      id: parsed.id || createActionId(),
      status: ACTION_REVIEW_STATUSES.includes(parsed.status)
        ? parsed.status
        : "draft",
      feedback: Array.isArray(parsed.feedback) ? parsed.feedback : [],
    });
  } catch {
    return defaultActionReviewMeta();
  }
}

/** @param {ActionReviewMeta} meta */
export function serializeActionReview(meta) {
  return JSON.stringify(meta);
}

/**
 * @param {import("./action-review").ActionReviewMeta | undefined} meta
 * @param {import("./score").ScoreTierKey | string} fallback
 * @returns {import("./score").ScoreTierKey}
 */
export function getPublishedScoreTier(meta, fallback) {
  const raw =
    meta?.status === "published"
      ? meta.superadminScore ||
        meta.l1Score ||
        meta.contributorScore ||
        fallback
      : fallback;
  return toScoreTierKey(raw);
}

/** @param {ActionReviewMeta | undefined} meta */
export function isActionPublished(meta) {
  return meta?.status === "published";
}
