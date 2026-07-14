/** Split a stored partner field into individual implementation partners. */
export function parseActionPartners(partner: string): string[] {
  return partner
    .split(",")
    .map((name) => name.trim())
    .filter(Boolean);
}

/** Normalize and format partners for storage/display (comma-separated). */
export function formatActionPartners(partner: string): string {
  return parseActionPartners(partner).join(", ");
}

/** Unique implementation partners across all actions in a recommendation. */
export function getRecommendationPartners(
  actions: { partner: string }[]
): string[] {
  return [
    ...new Set(actions.flatMap((action) => parseActionPartners(action.partner))),
  ];
}
