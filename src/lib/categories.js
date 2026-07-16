export const RECOMMENDATION_CATEGORIES = [
  "clean_cooking",
  "partnerships",
  "finance",
  "agri_energy",
  "research",
  "energy_access",
  "policy",
  "training",
  "technology",
  "inclusion",
];

/** @type {Record<import("./categories").RecommendationCategory, string>} */
export const CATEGORY_LABELS = {
  clean_cooking: "Clean Cooking",
  partnerships: "Partnerships",
  finance: "Access to Finance",
  agri_energy: "Productive Use of Energy",
  research: "Research & Data",
  energy_access: "Energy Access",
  policy: "Policy & Markets",
  training: "Training & Skills",
  technology: "Technology & Innovation",
  inclusion: "Leaving No One Behind",
};

/** @type {Record<import("./categories").RecommendationCategory, { color: string, bg: string, border: string }>} */
export const CATEGORY_COLORS = {
  clean_cooking: { color: "#054653", bg: "#E0EEF0", border: "#054653" },
  partnerships: { color: "#043b45", bg: "#D6E8EB", border: "#043b45" },
  finance: { color: "#054653", bg: "#FFF8E6", border: "#FFB803" },
  agri_energy: { color: "#0b7186", bg: "#E5F2F4", border: "#0b7186" },
  research: { color: "#054653", bg: "#E8F4F6", border: "#0b7186" },
  energy_access: { color: "#054653", bg: "#CFF0F4", border: "#0b7186" },
  policy: { color: "#043b45", bg: "#E8F0F2", border: "#054653" },
  training: { color: "#054653", bg: "#FFF8E6", border: "#FFB803" },
  technology: { color: "#0b7186", bg: "#E5F2F4", border: "#FFB803" },
  inclusion: { color: "#054653", bg: "#E0EEF0", border: "#e6a500" },
};

/** @type {import("./categories").RecommendationCategory} */
export const DEFAULT_CATEGORY = "clean_cooking";

export const CATEGORY_OPTIONS = RECOMMENDATION_CATEGORIES.map((value) => ({
  value,
  label: CATEGORY_LABELS[value],
}));

const SECTION_CATEGORY_MAP = [
  { match: /clean cooking|manufacturing|value chain|fumbahub/i, category: "clean_cooking" },
  { match: /partnership/i, category: "partnerships" },
  { match: /access to finance|finance/i, category: "finance" },
  { match: /productive use of energy|productive use|pue/i, category: "agri_energy" },
  { match: /research and data|research & data/i, category: "research" },
  { match: /energy access and management|energy access/i, category: "energy_access" },
  { match: /policy|planning|quality|standards, institutions|markets/i, category: "policy" },
  { match: /training|communities of/i, category: "training" },
  { match: /technology innovation|innovation, development/i, category: "technology" },
  { match: /leaving no one behind|inclusion/i, category: "inclusion" },
];

/**
 * @param {string | undefined | null} raw
 * @returns {import("./categories").RecommendationCategory}
 */
export function resolveCategory(raw) {
  if (!raw) return DEFAULT_CATEGORY;
  const normalized = raw.trim();
  if (normalized === "biofuels") return "agri_energy";
  if (RECOMMENDATION_CATEGORIES.includes(normalized)) {
    return /** @type {import("./categories").RecommendationCategory} */ (normalized);
  }
  const section = normalized.replace(/^section:\s*/i, "");
  for (const entry of SECTION_CATEGORY_MAP) {
    if (entry.match.test(section)) return /** @type {import("./categories").RecommendationCategory} */ (entry.category);
  }
  return DEFAULT_CATEGORY;
}

/** @param {string} section */
export function categoryFromSection(section) {
  return resolveCategory(section);
}

/** @param {string | undefined | null} category */
export function getCategoryLabel(category) {
  const key = resolveCategory(category);
  return CATEGORY_LABELS[key];
}
