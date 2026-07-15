import type { ActionItem, Recommendation } from "@/lib/types/recommendation";
import {
  getPublishedScoreTier,
  isActionPublished,
} from "@/lib/action-review";

/** Guest portal: only published actions are visible. */
export function getPublicActions(recommendation: Recommendation): ActionItem[] {
  return recommendation.actions
    .filter((a) => isActionPublished(a.review))
    .map((a) => ({
      ...a,
      scoreTier: getPublishedScoreTier(a.review, a.scoreTier),
    }));
}

export function withPublicActions(
  recommendation: Recommendation
): Recommendation {
  return {
    ...recommendation,
    actions: getPublicActions(recommendation),
  };
}
