import { toScoreTierKey, type ScoreTierKey } from "@/lib/score";

export const ACTION_REVIEW_STATUSES = [
  "draft",
  "awaiting_l1",
  "awaiting_superadmin",
  "published",
  "changes_requested",
] as const;

export type ActionReviewStatus = (typeof ACTION_REVIEW_STATUSES)[number];

export const ACTION_REVIEW_STATUS_LABELS: Record<ActionReviewStatus, string> = {
  draft: "Draft",
  awaiting_l1: "Awaiting L1 review",
  awaiting_superadmin: "Awaiting final approval",
  published: "Published",
  changes_requested: "Changes requested",
};

export interface ActionReviewMeta {
  id: string;
  status: ActionReviewStatus;
  submitterId?: string;
  submitterName?: string;
  submitterEmail?: string;
  l1ReviewerId?: string;
  l1ReviewerName?: string;
  l1ReviewerEmail?: string;
  /** Contributor’s initial rating (mirrors action.scoreTier at submit time). */
  contributorScore?: ScoreTierKey;
  l1Score?: ScoreTierKey;
  l1Remark?: string;
  l1ReviewedAt?: string;
  superadminScore?: ScoreTierKey;
  superadminRemark?: string;
  superadminReviewedAt?: string;
  publishedAt?: string;
  /** Feedback thread visible to the submitter */
  feedback?: {
    fromRole: "l1_reviewer" | "superadmin";
    fromName: string;
    message: string;
    at: string;
  }[];
}

export function createActionId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `act_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

export function defaultActionReviewMeta(
  partial?: Partial<ActionReviewMeta>
): ActionReviewMeta {
  return {
    id: partial?.id || createActionId(),
    status: partial?.status || "draft",
    ...partial,
  };
}

export function parseActionReview(raw: string | undefined | null): ActionReviewMeta {
  if (!raw?.trim()) return defaultActionReviewMeta();
  try {
    const parsed = JSON.parse(raw) as Partial<ActionReviewMeta>;
    return defaultActionReviewMeta({
      ...parsed,
      id: parsed.id || createActionId(),
      status: (ACTION_REVIEW_STATUSES as readonly string[]).includes(
        parsed.status as string
      )
        ? (parsed.status as ActionReviewStatus)
        : "draft",
      feedback: Array.isArray(parsed.feedback) ? parsed.feedback : [],
    });
  } catch {
    return defaultActionReviewMeta();
  }
}

export function serializeActionReview(meta: ActionReviewMeta): string {
  return JSON.stringify(meta);
}

/** Score shown to the public once published. */
export function getPublishedScoreTier(
  meta: ActionReviewMeta | undefined,
  fallback: ScoreTierKey | string
): ScoreTierKey {
  const raw =
    meta?.status === "published"
      ? meta.superadminScore ||
        meta.l1Score ||
        meta.contributorScore ||
        fallback
      : fallback;
  return toScoreTierKey(raw);
}

export function isActionPublished(meta: ActionReviewMeta | undefined): boolean {
  return meta?.status === "published";
}
