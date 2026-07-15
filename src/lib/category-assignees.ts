import type { RecommendationCategory } from "@/lib/categories";
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

export type CategoryAssignee = {
  name: string;
  email?: string;
  userId?: string;
};

/** Category leads from staff config (shown on R x.y even when items are split). */
const CATEGORY_LEADS: Partial<
  Record<RecommendationCategory, CategoryAssignee[]>
> = staffConfig.categoryLeads ?? {};

/** Build category roster from section / item assignees (6.1 → Clean Cooking, …). */
function buildCategoryAssignees(): Record<
  RecommendationCategory,
  CategoryAssignee[]
> {
  const map = Object.fromEntries(
    RECOMMENDATION_CATEGORIES.map((c) => [c, [] as CategoryAssignee[]])
  ) as Record<RecommendationCategory, CategoryAssignee[]>;

  const push = (cat: RecommendationCategory, a: CategoryAssignee) => {
    if (map[cat].some((x) => normalizeEmail(x.email) === normalizeEmail(a.email))) {
      return;
    }
    map[cat].push(a);
  };

  for (const [cat, leads] of Object.entries(CATEGORY_LEADS) as Array<
    [RecommendationCategory, CategoryAssignee[]]
  >) {
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

export type CategoryAssignmentRow = {
  category: RecommendationCategory;
  code: string;
  label: string;
  codeLabel: string;
  assignees: CategoryAssignee[];
};

export function getCategoryAssignees(
  category: RecommendationCategory
): CategoryAssignee[] {
  return CATEGORY_ASSIGNEES[category] ?? [];
}

export function listCategoryAssignmentRows(): CategoryAssignmentRow[] {
  return RECOMMENDATION_CATEGORIES.map((category) => ({
    category,
    code: getCategoryCode(category),
    label: CATEGORY_LABELS[category],
    codeLabel: getCategoryCodeLabel(category),
    assignees: getCategoryAssignees(category),
  }));
}

export function listAssignedCategories(
  emailOrName: string
): RecommendationCategory[] {
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

export function isAssignedToCategory(
  category: RecommendationCategory,
  email: string | undefined | null
): boolean {
  const self = normalizeEmail(email);
  if (!self) return false;
  return CATEGORY_ASSIGNEES[category].some(
    (a) => a.email && normalizeEmail(a.email) === self
  );
}

export function listUniqueAssignees(): Array<
  CategoryAssignee & { categories: RecommendationCategory[] }
> {
  const byKey = new Map<
    string,
    CategoryAssignee & { categories: RecommendationCategory[] }
  >();

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

export function describeAssigneeResponsibilities(
  categories: RecommendationCategory[]
): string {
  return categories.map((c) => getCategoryCodeLabel(c)).join("; ");
}
