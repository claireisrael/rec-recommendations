import { isSuperadmin, normalizeEmail } from "@/lib/roles";
import { staffConfig } from "@/lib/staff-config";
import {
  categoryFromSectionCode,
  getCategoryCode,
  getSectionRootFromCode,
} from "@/lib/numbering";
import { resolveCategory, type RecommendationCategory } from "@/lib/categories";

/**
 * Assignees own a **category section** (e.g. 6.1 = Clean Cooking)
 * or specific item codes (e.g. 6.3.1 … 6.3.10).
 * Loaded from config/staff.json — do not hardcode staff here.
 */
export type RecommendationItemAssignee = {
  name: string;
  email: string;
  userId?: string;
  /** Section roots ("6.1") and/or item codes ("6.3.1"). */
  sections: string[];
};

export const RECOMMENDATION_ITEM_ASSIGNEES: RecommendationItemAssignee[] =
  staffConfig.itemAssignees.map((a) => ({
    name: a.name,
    email: a.email,
    userId: a.userId,
    sections: [...a.sections],
  }));

function normalizeSection(section: string): string {
  return section.trim().replace(/^R\s*/i, "");
}

/**
 * True when `section` owns `code` (exact match or proper parent prefix).
 * "6.3.1" owns "6.3.1" only — not "6.3.11".
 * "6.3" owns all "6.3.*".
 */
export function sectionOwnsCode(
  section: string,
  code: string | undefined | null
): boolean {
  if (!code) return false;
  const s = normalizeSection(section);
  const c = code.trim().replace(/^R\s*/i, "");
  return c === s || c.startsWith(`${s}.`);
}

/**
 * Item-level owners take precedence over section-root owners for a code.
 * Example: an owner of "6.3.11" wins over someone who only owns root "6.3".
 */
function ownsCodeWithPrecedence(
  entry: RecommendationItemAssignee,
  code: string
): boolean {
  const c = code.trim().replace(/^R\s*/i, "");
  const itemMatches = entry.sections.filter(
    (s) => normalizeSection(s).split(".").length >= 3 && sectionOwnsCode(s, c)
  );
  if (itemMatches.length > 0) return true;

  // Another person has an item-level claim on this code → root owner loses
  const claimedByOther = RECOMMENDATION_ITEM_ASSIGNEES.some(
    (a) =>
      normalizeEmail(a.email) !== normalizeEmail(entry.email) &&
      a.sections.some(
        (s) =>
          normalizeSection(s).split(".").length >= 3 && sectionOwnsCode(s, c)
      )
  );
  if (claimedByOther) return false;

  return entry.sections.some((s) => sectionOwnsCode(s, c));
}

export function getItemAssigneeEntry(
  email: string | undefined | null
): RecommendationItemAssignee | undefined {
  const self = normalizeEmail(email);
  if (!self) return undefined;
  return RECOMMENDATION_ITEM_ASSIGNEES.find(
    (a) => normalizeEmail(a.email) === self
  );
}

export function isEditRestrictedUser(
  email: string | undefined | null
): boolean {
  return Boolean(getItemAssigneeEntry(email));
}

export function listAssignedSectionsForEmail(
  email: string | undefined | null
): string[] {
  const entry = getItemAssigneeEntry(email);
  if (!entry) return [];
  // Prefer category roots for greeting chips; keep unique sorted
  const roots = new Set<string>();
  for (const s of entry.sections) {
    const n = normalizeSection(s);
    roots.add(getSectionRootFromCode(n) || n);
  }
  return [...roots].sort((a, b) => {
    const na = Number(a.split(".")[1] || 0);
    const nb = Number(b.split(".")[1] || 0);
    return na - nb || a.localeCompare(b);
  });
}

export function listAssignedCodesForEmail(
  email: string | undefined | null
): string[] {
  return getItemAssigneeEntry(email)?.sections.map(normalizeSection) ?? [];
}

export function listAssignedCategoriesForEmail(
  email: string | undefined | null
): RecommendationCategory[] {
  return listAssignedSectionsForEmail(email)
    .map((s) => categoryFromSectionCode(s))
    .filter((c): c is RecommendationCategory => Boolean(c));
}

export function canCreateRecommendations(
  email: string | undefined | null
): boolean {
  if (isSuperadmin(email)) return true;
  if (isEditRestrictedUser(email)) return false;
  return true;
}

type RecommendationAccessTarget = {
  id?: string;
  code?: string;
  sectionCode?: string;
  category?: string;
};

/**
 * Delete rules: only users listed as superadmin in staff config.
 */
export function canDeleteRecommendation(
  email: string | undefined | null,
  // Signature kept for call sites that pass an access target
  _target?: RecommendationAccessTarget
): boolean {
  void _target;
  return isSuperadmin(email);
}

export function canEditRecommendation(
  email: string | undefined | null,
  target: RecommendationAccessTarget
): boolean {
  if (isSuperadmin(email)) return true;

  const entry = getItemAssigneeEntry(email);
  if (!entry) return true;

  const code =
    (target.code || "").trim().replace(/^R\s*/i, "") ||
    (target.sectionCode
      ? ""
      : target.category
        ? getCategoryCode(resolveCategory(target.category))
        : "");

  if (code && code.split(".").length >= 3) {
    return ownsCodeWithPrecedence(entry, code);
  }

  const section =
    target.sectionCode ||
    (target.category ? getCategoryCode(resolveCategory(target.category)) : "") ||
    getSectionRootFromCode(target.code || "");

  if (target.code) {
    return ownsCodeWithPrecedence(entry, target.code);
  }

  if (section) {
    // Exact section root ownership (e.g. "6.1")
    if (
      entry.sections.some(
        (s) => normalizeSection(s) === normalizeSection(section)
      )
    ) {
      return true;
    }
    // Item-level owners can open their section's recommendations list items
    // only when the specific code is known — handled above.
  }

  return false;
}

export function listAllAssignedSections(): string[] {
  const set = new Set<string>();
  for (const a of RECOMMENDATION_ITEM_ASSIGNEES) {
    for (const s of a.sections) {
      set.add(getSectionRootFromCode(s) || normalizeSection(s));
    }
  }
  return [...set].sort((a, b) => {
    const na = Number(a.replace(/^R\s*/i, "").split(".")[1] || 0);
    const nb = Number(b.replace(/^R\s*/i, "").split(".")[1] || 0);
    return na - nb || a.localeCompare(b);
  });
}

export function getAssigneesForSection(
  section: string
): RecommendationItemAssignee[] {
  const needle = normalizeSection(section);
  const root = getSectionRootFromCode(needle) || needle;
  return RECOMMENDATION_ITEM_ASSIGNEES.filter((a) =>
    a.sections.some((s) => {
      const n = normalizeSection(s);
      return n === needle || n === root || getSectionRootFromCode(n) === root;
    })
  );
}

export function getAssigneesForCode(code: string): RecommendationItemAssignee[] {
  const c = code.trim().replace(/^R\s*/i, "");
  if (!c) return [];
  return RECOMMENDATION_ITEM_ASSIGNEES.filter((a) =>
    ownsCodeWithPrecedence(a, c)
  );
}
