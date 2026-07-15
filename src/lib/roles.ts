/**
 * Role helpers — team directory comes from config/staff.json
 * (or config/staff.example.json when the local file is missing).
 * Do not put real staff emails in this file.
 */

import { staffConfig, type StaffUser } from "@/lib/staff-config";
import type { AppRole, RoleUser } from "@/lib/roles-types";

export type { AppRole, RoleUser };

/** Canonical role directory (matched by email, case-insensitive). */
export const ROLE_DIRECTORY: RoleUser[] = staffConfig.users.filter(
  (u) => u.role === "superadmin" || u.role === "l1_reviewer"
);

/** Full team directory (admins + reviewers + members). */
export const TEAM_DIRECTORY: RoleUser[] = staffConfig.users.map(
  (u: StaffUser) => ({
    email: u.email,
    name: u.name,
    role: u.role,
    userId: u.userId,
  })
);

export const L1_REVIEWERS = ROLE_DIRECTORY.filter(
  (u) => u.role === "l1_reviewer"
);

export const SUPERADMINS = ROLE_DIRECTORY.filter((u) => u.role === "superadmin");

/** Primary superadmin (notifications / legacy callers). */
export const SUPERADMIN = SUPERADMINS[0]!;

/** Email allowed to publish actions to the public portal. */
export const FINAL_PUBLISHER_EMAIL = staffConfig.finalPublisherEmail;

export function isFinalPublisher(email: string | undefined | null): boolean {
  return normalizeEmail(email) === normalizeEmail(FINAL_PUBLISHER_EMAIL);
}

/**
 * Fixed L1 routing — each submitter is reviewed by their designated approver.
 * Keys/values are lowercase emails from staff config.
 */
export const L1_APPROVER_BY_SUBMITTER: Record<string, string> = Object.fromEntries(
  Object.entries(staffConfig.l1ApproverBySubmitter).map(([k, v]) => [
    normalizeEmail(k),
    normalizeEmail(v),
  ])
);

/** Emails that may choose an L1 among the peer L1 pool (never themselves). */
export const L1_PEER_CHOOSER_EMAILS = staffConfig.l1PeerChoosers.map(
  normalizeEmail
);

export function normalizeEmail(email: string | undefined | null): string {
  return (email || "").trim().toLowerCase();
}

export function getRoleForEmail(email: string | undefined | null): AppRole {
  const match = ROLE_DIRECTORY.find(
    (u) => normalizeEmail(u.email) === normalizeEmail(email)
  );
  return match?.role ?? "member";
}

export function getRoleUserByEmail(
  email: string | undefined | null
): RoleUser | undefined {
  const needle = normalizeEmail(email);
  return (
    ROLE_DIRECTORY.find((u) => normalizeEmail(u.email) === needle) ||
    TEAM_DIRECTORY.find((u) => normalizeEmail(u.email) === needle)
  );
}

export function getRoleUserById(
  userId: string | undefined | null
): RoleUser | undefined {
  if (!userId) return undefined;
  return (
    ROLE_DIRECTORY.find((u) => u.userId === userId) ||
    TEAM_DIRECTORY.find((u) => u.userId === userId)
  );
}

export function isSuperadmin(email: string | undefined | null): boolean {
  return getRoleForEmail(email) === "superadmin";
}

export function isL1Reviewer(email: string | undefined | null): boolean {
  return getRoleForEmail(email) === "l1_reviewer";
}

/** Designated L1 approver for this submitter (if mapped). */
export function getDesignatedL1Reviewer(
  submitterEmail: string | undefined | null
): RoleUser | undefined {
  const key = normalizeEmail(submitterEmail);
  if (!key) return undefined;
  const approverEmail = L1_APPROVER_BY_SUBMITTER[key];
  if (!approverEmail) return undefined;
  return L1_REVIEWERS.find(
    (u) => normalizeEmail(u.email) === normalizeEmail(approverEmail)
  );
}

/** Who this L1 reviewer is responsible for approving. */
export function listSubmittersForL1Approver(
  l1Email: string | undefined | null
): RoleUser[] {
  const approver = normalizeEmail(l1Email);
  if (!approver) return [];
  return Object.entries(L1_APPROVER_BY_SUBMITTER)
    .filter(([, a]) => normalizeEmail(a) === approver)
    .map(([submitterEmail]) => getRoleUserByEmail(submitterEmail))
    .filter((u): u is RoleUser => Boolean(u));
}

/** Peer choosers may pick any L1 except themselves. */
export function canChooseL1Approver(
  email: string | undefined | null
): boolean {
  const self = normalizeEmail(email);
  return L1_PEER_CHOOSER_EMAILS.some((e) => e === self);
}

/**
 * L1 options when submitting for review:
 * - Peer choosers → other L1s (exclude self)
 * - Everyone else → their single designated approver only
 */
export function getAssignableL1Reviewers(
  currentUserEmail: string | undefined | null
): RoleUser[] {
  const self = normalizeEmail(currentUserEmail);
  if (!self) return [];

  if (canChooseL1Approver(self)) {
    return L1_REVIEWERS.filter((u) => normalizeEmail(u.email) !== self);
  }

  const designated = getDesignatedL1Reviewer(currentUserEmail);
  if (!designated) return [];
  if (normalizeEmail(designated.email) === self) return [];
  return [designated];
}

export const ROLE_LABELS: Record<AppRole, string> = {
  superadmin: "Superadmin",
  l1_reviewer: "Level 1 Reviewer",
  member: "Member",
  viewer: "Viewer",
};
