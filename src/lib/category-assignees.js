import {
  CATEGORY_LABELS,
  RECOMMENDATION_CATEGORIES,
} from "@/lib/categories";
import {
  categoryFromSectionCode,
  getCategoryCode,
  getCategoryCodeLabel,
  getSectionRootFromCode,
} from "@/lib/numbering";
import { normalizeEmail } from "@/lib/roles";
import { RECOMMENDATION_ITEM_ASSIGNEES } from "@/lib/recommendation-assignees";
import { staffConfig } from "@/lib/staff-config";

/** Category leads from staff config (shown on R x.y even when items are split). */
const CATEGORY_LEADS = staffConfig.categoryLeads ?? {};

/** Build category roster from section / item assignees (6.1 → Clean Cooking, …). */
function buildCategoryAssignees() {
  const map = Object.fromEntries(
    RECOMMENDATION_CATEGORIES.map((c) => [c, []])
  );

  /**
   * @param {import("./categories").RecommendationCategory} cat
   * @param {import("./category-assignees").CategoryAssignee} a
   */
  const push = (cat, a) => {
    if (map[cat].some((x) => normalizeEmail(x.email) === normalizeEmail(a.email))) {
      return;
    }
    map[cat].push(a);
  };

  for (const [cat, leads] of Object.entries(CATEGORY_LEADS)) {
    for (const lead of leads) push(cat, lead);
  }

  for (const a of RECOMMENDATION_ITEM_ASSIGNEES) {
    for (const section of a.sections) {
      const root = getSectionRootFromCode(section) || section;
      const cat = categoryFromSectionCode(root);
      if (!cat) continue;
      push(cat, {
        name: a.name,
        email: a.email,
        userId: a.userId,
      });
    }
  }
  return map;
}

export const CATEGORY_ASSIGNEES = buildCategoryAssignees();

/**
 * @param {import("./categories").RecommendationCategory} category
 * @returns {import("./category-assignees").CategoryAssignee[]}
 */
export function getCategoryAssignees(category) {
  return CATEGORY_ASSIGNEES[category] ?? [];
}

export function listCategoryAssignmentRows() {
  return RECOMMENDATION_CATEGORIES.map((category) => ({
    category,
    code: getCategoryCode(category),
    label: CATEGORY_LABELS[category],
    codeLabel: getCategoryCodeLabel(category),
    assignees: getCategoryAssignees(category),
  }));
}

/**
 * @param {string} emailOrName
 * @returns {import("./categories").RecommendationCategory[]}
 */
export function listAssignedCategories(emailOrName) {
  const q = emailOrName.trim().toLowerCase();
  if (!q) return [];
  return RECOMMENDATION_CATEGORIES.filter((cat) =>
    CATEGORY_ASSIGNEES[cat].some(
      (a) =>
        a.name.toLowerCase() === q ||
        (a.email && normalizeEmail(a.email) === normalizeEmail(q))
    )
  );
}

/**
 * @param {import("./categories").RecommendationCategory} category
 * @param {string | undefined | null} email
 * @returns {boolean}
 */
export function isAssignedToCategory(category, email) {
  const self = normalizeEmail(email);
  if (!self) return false;
  return CATEGORY_ASSIGNEES[category].some(
    (a) => a.email && normalizeEmail(a.email) === self
  );
}

export function listUniqueAssignees() {
  const byKey = new Map();

  for (const cat of RECOMMENDATION_CATEGORIES) {
    for (const a of CATEGORY_ASSIGNEES[cat]) {
      const key = a.email
        ? `e:${normalizeEmail(a.email)}`
        : `n:${a.name.trim().toLowerCase()}`;
      const existing = byKey.get(key);
      if (existing) {
        if (!existing.categories.includes(cat)) existing.categories.push(cat);
        continue;
      }
      byKey.set(key, { ...a, categories: [cat] });
    }
  }

  return [...byKey.values()];
}

/**
 * @param {import("./categories").RecommendationCategory[]} categories
 * @returns {string}
 */
export function describeAssigneeResponsibilities(categories) {
  return categories.map((c) => getCategoryCodeLabel(c)).join("; ");
}
