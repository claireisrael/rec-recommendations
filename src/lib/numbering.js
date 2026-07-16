import {
  CATEGORY_LABELS,
  RECOMMENDATION_CATEGORIES,
  resolveCategory,
} from "@/lib/categories";

/**
 * Numbering (REC chapter 6)
 * -------------------------
 * R 6.1  Clean Cooking              → recommendations 6.1.1, 6.1.2, …
 * R 6.2  Partnerships               → 6.2.1, 6.2.2, …
 * R 6.3  Access to Finance          → 6.3.1, …
 * R 6.4  Productive Use of Energy   → 6.4.1, …
 * … through R 6.10 Inclusion
 *
 * Assignees own a category section (e.g. 6.9) and edit every item under it.
 */
export const RECOMMENDATION_CHAPTER = 6;
export const RECOMMENDATION_CODE_PREFIX = "R";

/**
 * @param {import("./categories").RecommendationCategory} category
 * @returns {number}
 */
export function getCategorySectionIndex(category) {
  const idx = RECOMMENDATION_CATEGORIES.indexOf(category);
  return idx >= 0 ? idx + 1 : 1;
}

/**
 * Section number under chapter 6: Clean Cooking → 1, Partnerships → 2, …
 * @param {string | undefined | null} category
 * @returns {number}
 */
export function getCategoryMinorNumber(category) {
  return getCategorySectionIndex(resolveCategory(category));
}

/** Kept for sort helpers that compared "majors" previously. */
export function getCategoryMajorNumber() {
  return RECOMMENDATION_CHAPTER;
}

/**
 * Category / section root code: clean_cooking → "6.1", partnerships → "6.2"
 * @param {string | undefined | null} category
 * @returns {string}
 */
export function getCategoryCode(category) {
  const minor = getCategoryMinorNumber(category);
  return `${RECOMMENDATION_CHAPTER}.${minor}`;
}

/**
 * Display "R 6.1 · Clean Cooking"
 * @param {string | undefined | null} category
 * @returns {string}
 */
export function getCategoryCodeLabel(category) {
  const key = resolveCategory(category);
  return `${RECOMMENDATION_CODE_PREFIX} ${getCategoryCode(key)} · ${CATEGORY_LABELS[key]}`;
}

/**
 * "6.9.1" → "6.9"
 * @param {string | undefined | null} code
 * @returns {string}
 */
export function getSectionRootFromCode(code) {
  if (!code) return "";
  const cleaned = code.trim().replace(/^R\s*/i, "");
  const parts = cleaned.split(".");
  if (parts.length >= 2) {
    return `${parts[0]}.${parts[1]}`;
  }
  return cleaned;
}

/**
 * Map "6.2" → partnerships category key
 * @param {string | undefined | null} section
 * @returns {import("./categories").RecommendationCategory | undefined}
 */
export function categoryFromSectionCode(section) {
  if (!section) return undefined;
  const cleaned = section.trim().replace(/^R\s*/i, "");
  const match = cleaned.match(/^6\.(\d+)$/);
  if (!match) return undefined;
  const minor = Number(match[1]);
  if (minor < 1 || minor > RECOMMENDATION_CATEGORIES.length) return undefined;
  return RECOMMENDATION_CATEGORIES[minor - 1];
}

/**
 * @param {string | undefined | null} category
 * @param {number} itemIndex
 * @returns {string}
 */
export function formatRecommendationNumber(category, itemIndex) {
  return `${getCategoryCode(category)}.${itemIndex}`;
}

/** All section roots that exist in the report (6.1 … 6.10). */
export const CATEGORY_SECTION_CODES = RECOMMENDATION_CATEGORIES.map((_, i) =>
  `${RECOMMENDATION_CHAPTER}.${i + 1}`
);

/**
 * @template {{ $id: string, $createdAt?: string, category?: string }} T
 * @param {T[]} list
 * @returns {T[]}
 */
function sortStable(list) {
  return [...list].sort((a, b) => {
    const ta = a.$createdAt ?? "";
    const tb = b.$createdAt ?? "";
    if (ta !== tb) return ta.localeCompare(tb);
    return a.$id.localeCompare(b.$id);
  });
}

/**
 * Stable number map for a set of recommendations (typically one year).
 * Clean Cooking → 6.1.1, 6.1.2… ; Partnerships → 6.2.1, 6.2.2…
 * @param {import("./numbering").NumberingSource[]} recommendations
 * @returns {Map<string, import("./numbering").RecommendationNumbering>}
 */
export function buildRecommendationNumbering(recommendations) {
  const map = new Map();
  const byCategory = new Map();

  for (const rec of recommendations) {
    const key = resolveCategory(rec.category);
    const list = byCategory.get(key) ?? [];
    list.push(rec);
    byCategory.set(key, list);
  }

  for (const category of RECOMMENDATION_CATEGORIES) {
    const list = byCategory.get(category);
    if (!list?.length) continue;

    const ordered = sortStable(list);
    const sectionCode = getCategoryCode(category);
    const categoryLabel = CATEGORY_LABELS[category];

    ordered.forEach((rec, i) => {
      const itemIndex = i + 1;
      map.set(rec.$id, {
        category,
        categoryCode: sectionCode,
        categoryLabel,
        sectionCode,
        itemIndex,
        code: `${sectionCode}.${itemIndex}`,
      });
    });
  }

  return map;
}

/**
 * @param {import("./types/recommendation").Recommendation[]} recommendations
 * @param {Map<string, import("./numbering").RecommendationNumbering>} numbering
 * @returns {import("./types/recommendation").Recommendation[]}
 */
export function sortByRecommendationNumber(recommendations, numbering) {
  return [...recommendations].sort((a, b) => {
    const na = numbering.get(a.$id);
    const nb = numbering.get(b.$id);
    if (!na && !nb) return 0;
    if (!na) return 1;
    if (!nb) return -1;
    const cat =
      getCategorySectionIndex(na.category) -
      getCategorySectionIndex(nb.category);
    if (cat !== 0) return cat;
    return na.itemIndex - nb.itemIndex;
  });
}
