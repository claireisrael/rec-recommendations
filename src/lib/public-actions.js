import { getPublishedScoreTier, isActionPublished } from "@/lib/action-review";

/** Guest portal: only published actions are visible. */
export function getPublicActions(recommendation) {
  return recommendation.actions
    .filter((a) => isActionPublished(a.review))
    .map((a) => ({
      ...a,
      scoreTier: getPublishedScoreTier(a.review, a.scoreTier),
    }));
}

export function withPublicActions(recommendation) {
  return {
    ...recommendation,
    actions: getPublicActions(recommendation),
  };
}
