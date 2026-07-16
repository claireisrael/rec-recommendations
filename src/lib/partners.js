export function parseActionPartners(partner) {
  return partner
    .split(",")
    .map((name) => name.trim())
    .filter(Boolean);
}

export function formatActionPartners(partner) {
  return parseActionPartners(partner).join(", ");
}

export function getRecommendationPartners(actions) {
  return [
    ...new Set(actions.flatMap((action) => parseActionPartners(action.partner))),
  ];
}
