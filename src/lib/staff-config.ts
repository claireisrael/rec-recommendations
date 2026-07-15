/**
 * Staff / RBAC directory loaded from config.
 * - Local deploys: copy config/staff.example.json → config/staff.json (gitignored)
 * - Public clones without staff.json fall back to the example placeholders
 */
import raw from "@staff-config";
import type { AppRole } from "@/lib/roles-types";
import type { RecommendationCategory } from "@/lib/categories";

export type StaffUser = {
  email: string;
  name: string;
  role: AppRole;
  userId?: string;
};

export type StaffItemAssignee = {
  name: string;
  email: string;
  userId?: string;
  sections: string[];
};

export type StaffCategoryLead = {
  name: string;
  email?: string;
  userId?: string;
};

export type StaffConfig = {
  finalPublisherEmail: string;
  users: StaffUser[];
  l1ApproverBySubmitter: Record<string, string>;
  l1PeerChoosers: string[];
  itemAssignees: StaffItemAssignee[];
  categoryLeads?: Partial<
    Record<RecommendationCategory, StaffCategoryLead[]>
  >;
};

function isStaffConfig(value: unknown): value is StaffConfig {
  if (!value || typeof value !== "object") return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.finalPublisherEmail === "string" &&
    Array.isArray(v.users) &&
    Array.isArray(v.itemAssignees) &&
    Array.isArray(v.l1PeerChoosers) &&
    typeof v.l1ApproverBySubmitter === "object" &&
    v.l1ApproverBySubmitter !== null
  );
}

if (!isStaffConfig(raw)) {
  throw new Error(
    "Invalid staff config. Copy config/staff.example.json to config/staff.json and fill in your team."
  );
}

export const staffConfig: StaffConfig = raw;
