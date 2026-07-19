import { z } from "zod";
import { getEvidenceRef, isEvidenceLink } from "@/lib/evidence";
import { RECOMMENDATION_CATEGORIES } from "@/lib/categories";
import {
  createActionId,
  defaultActionReviewMeta,
} from "@/lib/action-review";

// Field length limits are intentionally NOT enforced here.
// Appwrite is the single source of truth for attribute sizes; it will reject
// anything too long, and that message is surfaced to the user.

/** REC actionScores enum — same keys for contributor, L1, and superadmin. */
const SCORE_KEYS = [
  "very_poor",
  "poor",
  "fair",
  "good",
  "very_good",
  "exceptional",
];

const evidenceFileSchema = z.object({
  fileId: z.string().min(1),
  fileName: z.string().min(1),
});

const evidenceSchema = z.array(
  z.union([
    z.string().refine(
      (val) => {
        if (!val.trim()) return false;
        if (isEvidenceLink(val)) {
          try {
            new URL(val);
            return true;
          } catch {
            return false;
          }
        }
        return true;
      },
      { message: "Enter a valid URL (https://...)" }
    ),
    evidenceFileSchema,
  ])
);

/** Draft row in the form — empty rows are allowed until submit filters them. */
const actionDraftSchema = z.object({
  id: z.string().optional(),
  text: z.string(),
  scoreTier: z.enum(SCORE_KEYS, {
    error: "Please select a score rating",
  }),
  partner: z.string(),
  evidence: evidenceSchema,
});

export const recommendationSchema = z
  .object({
    recommendation: z.string().min(1, "Recommendation is required"),
    year: z
      .number({ error: "Year is required" })
      .int()
      .min(2020, "Year must be 2020 or later")
      .max(2040, "Year must be 2040 or earlier"),
    category: z.enum(RECOMMENDATION_CATEGORIES, {
      error: "Please select a category",
    }),
    sectionCode: z.string().optional(),
    actions: z
      .array(actionDraftSchema)
      .min(1, "Add at least one action")
      .max(50, "Maximum 50 actions per recommendation"),
    comments: z.string().optional(),
    status: z.enum(["planned", "in_progress", "completed"]),
  })
  .superRefine((data, ctx) => {
    const filledIndexes = data.actions
      .map((a, i) => (a.text.trim() ? i : -1))
      .filter((i) => i >= 0);

    if (filledIndexes.length === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "At least one action with a description is required",
        path: ["actions"],
      });
      return;
    }

    for (const i of filledIndexes) {
      const action = data.actions[i];
      if (!action.partner.trim()) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Action implementation partner is required",
          path: ["actions", i, "partner"],
        });
      }
    }
  });

/**
 * Keep only filled actions and preserve review metadata where possible.
 * @param {import("@/lib/schemas/recommendation").RecommendationFormData["actions"]} actions
 * @param {import("@/lib/types/recommendation").ActionItem[]} [previous]
 * @returns {import("@/lib/types/recommendation").ActionItem[]}
 */
export function finalizeActions(actions, previous = []) {
  const prevById = new Map(previous.map((a) => [a.id, a]));

  return actions
    .filter((a) => a.text.trim())
    .map((a) => {
      const prev = (a.id && prevById.get(a.id)) || undefined;
      const id = a.id || prev?.id || createActionId();
      const review =
        prev?.review?.id === id
          ? prev.review
          : defaultActionReviewMeta({ id, status: "draft" });
      return {
        id,
        text: a.text.trim(),
        scoreTier: a.scoreTier,
        partner: a.partner.trim(),
        evidence: (a.evidence ?? []).filter((item) => Boolean(getEvidenceRef(item))),
        review: { ...review, id },
      };
    });
}
