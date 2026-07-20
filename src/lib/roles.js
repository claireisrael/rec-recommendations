/**
 * Role helpers — team directory comes from config/staff.json
 * (or config/staff.example.json when the local file is missing).
 * Do not put real staff emails in this file.
 */

import { staffConfig } from "@/lib/staff-config";

/** Canonical role directory (matched by email, case-insensitive). */
export const ROLE_DIRECTORY = staffConfig.users.filter(
  (u) => u.role === "superadmin" || u.role === "l1_reviewer"
);

/** Full team directory (admins + reviewers + members). */
export const TEAM_DIRECTORY = staffConfig.users.map((u) => ({
  email: u.email,
  name: u.name,
  role: u.role,
  userId: u.userId,
}));

export const L1_REVIEWERS = ROLE_DIRECTORY.filter(
  (u) => u.role === "l1_reviewer"
);

export const SUPERADMINS = ROLE_DIRECTORY.filter((u) => u.role === "superadmin");

/** Primary superadmin (notifications / legacy callers). */
export const SUPERADMIN = SUPERADMINS[0];

/** Email allowed to publish actions to the public portal. */
export const FINAL_PUBLISHER_EMAIL = staffConfig.finalPublisherEmail;

/**
 * Real display name from staff directory — avoids Appwrite account labels like "superadmin".
 * @param {string | undefined | null} email
 * @param {string | undefined | null} [fallback]
 * @returns {string}
 */
export function resolveStaffDisplayName(email, fallback) {
  const staff = getRoleUserByEmail(email);
  if (staff?.name?.trim()) return staff.name.trim();
  const fb = (fallback || "").trim();
  if (fb && !/^superadmin$/i.test(fb)) return fb;
  const norm = normalizeEmail(email);
  if (norm.includes("@")) {
    const local = norm.split("@")[0] || "";
    if (local) {
      return local.charAt(0).toUpperCase() + local.slice(1);
    }
  }
  return fb || "Team member";
}

/**
 * Staff record for whoever publishes to the public portal.
 * @returns {import("./roles-types").RoleUser | undefined}
 */
export function getFinalPublisherUser() {
  const byEmail = getRoleUserByEmail(FINAL_PUBLISHER_EMAIL);
  if (byEmail) return byEmail;
  return (
    SUPERADMINS.find(
      (u) => normalizeEmail(u.email) === normalizeEmail(FINAL_PUBLISHER_EMAIL)
    ) || SUPERADMIN
  );
}

/**
 * @returns {string}
 */
export function getFinalPublisherDisplayName() {
  return getFinalPublisherUser()?.name?.trim() || "Final publisher";
}

/**
 * @param {string | undefined | null} email
 * @returns {boolean}
 */
export function isFinalPublisher(email) {
  return normalizeEmail(email) === normalizeEmail(FINAL_PUBLISHER_EMAIL);
}

/**
 * Fixed L1 routing — each submitter is reviewed by their designated approver.
 * Keys/values are lowercase emails from staff config.
 */
export const L1_APPROVER_BY_SUBMITTER = Object.fromEntries(
  Object.entries(staffConfig.l1ApproverBySubmitter).map(([k, v]) => [
    normalizeEmail(k),
    normalizeEmail(v),
  ])
);

/** Emails that may choose an L1 among the peer L1 pool (never themselves). */
export const L1_PEER_CHOOSER_EMAILS = staffConfig.l1PeerChoosers.map(
  normalizeEmail
);

/**
 * @param {string | undefined | null} email
 * @returns {string}
 */
export function normalizeEmail(email) {
  return (email || "").trim().toLowerCase();
}

/**
 * @param {string | undefined | null} email
 * @returns {import("./roles-types").AppRole}
 */
export function getRoleForEmail(email) {
  const match = ROLE_DIRECTORY.find(
    (u) => normalizeEmail(u.email) === normalizeEmail(email)
  );
  return match?.role ?? "member";
}

/**
 * @param {string | undefined | null} email
 * @returns {import("./roles-types").RoleUser | undefined}
 */
export function getRoleUserByEmail(email) {
  const needle = normalizeEmail(email);
  return (
    ROLE_DIRECTORY.find((u) => normalizeEmail(u.email) === needle) ||
    TEAM_DIRECTORY.find((u) => normalizeEmail(u.email) === needle)
  );
}

/**
 * @param {string | undefined | null} userId
 * @returns {import("./roles-types").RoleUser | undefined}
 */
export function getRoleUserById(userId) {
  if (!userId) return undefined;
  return (
    ROLE_DIRECTORY.find((u) => u.userId === userId) ||
    TEAM_DIRECTORY.find((u) => u.userId === userId)
  );
}

/**
 * @param {string | undefined | null} email
 * @returns {boolean}
 */
export function isSuperadmin(email) {
  return getRoleForEmail(email) === "superadmin";
}

/**
 * @param {string | undefined | null} email
 * @returns {boolean}
 */
export function isL1Reviewer(email) {
  return getRoleForEmail(email) === "l1_reviewer";
}

/**
 * Designated L1 approver for this submitter (if mapped).
 * @param {string | undefined | null} submitterEmail
 * @returns {import("./roles-types").RoleUser | undefined}
 */
export function getDesignatedL1Reviewer(submitterEmail) {
  const key = normalizeEmail(submitterEmail);
  if (!key) return undefined;
  const approverEmail = L1_APPROVER_BY_SUBMITTER[key];
  if (!approverEmail) return undefined;
  return L1_REVIEWERS.find(
    (u) => normalizeEmail(u.email) === normalizeEmail(approverEmail)
  );
}

/**
 * Who this L1 reviewer is responsible for approving.
 * @param {string | undefined | null} l1Email
 * @returns {import("./roles-types").RoleUser[]}
 */
export function listSubmittersForL1Approver(l1Email) {
  const approver = normalizeEmail(l1Email);
  if (!approver) return [];
  return Object.entries(L1_APPROVER_BY_SUBMITTER)
    .filter(([, a]) => normalizeEmail(a) === approver)
    .map(([submitterEmail]) => getRoleUserByEmail(submitterEmail))
    .filter((u) => Boolean(u));
}

/**
 * Peer choosers may pick any L1 except themselves.
 * @param {string | undefined | null} email
 * @returns {boolean}
 */
export function canChooseL1Approver(email) {
  const self = normalizeEmail(email);
  return L1_PEER_CHOOSER_EMAILS.some((e) => e === self);
}

/**
 * L1 options when submitting for review:
 * - Peer choosers → other L1s (exclude self)
 * - Everyone else → their single designated approver only
 * @param {string | undefined | null} currentUserEmail
 * @returns {import("./roles-types").RoleUser[]}
 */
export function getAssignableL1Reviewers(currentUserEmail) {
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

/** @type {Record<import("./roles-types").AppRole, string>} */
export const ROLE_LABELS = {
  superadmin: "Superadmin",
  l1_reviewer: "Level 1 Reviewer",
  member: "Member",
  viewer: "Viewer",
};
