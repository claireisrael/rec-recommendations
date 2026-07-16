/**
 * Staff / RBAC directory loaded from config.
 * - Local deploys: copy config/staff.example.json → config/staff.json (gitignored)
 * - Public clones without staff.json fall back to the example placeholders
 */
import raw from "@staff-config";

/**
 * @param {unknown} value
 * @returns {boolean}
 */
function isStaffConfig(value) {
  if (!value || typeof value !== "object") return false;
  const v = value;
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

export const staffConfig = raw;
