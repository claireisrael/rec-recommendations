/**
 * Staff / RBAC directory.
 *
 * Resolution order:
 * 1. `NEXT_PUBLIC_STAFF_CONFIG` env var (minified JSON) — used on hosts like
 *    Vercel where config/staff.json is not in the repo.
 * 2. `config/staff.json` via the @staff-config alias (local dev).
 * 3. `config/staff.example.json` fallback (public clones / previews).
 */
import fallback from "@staff-config";

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

/** @returns {unknown} */
function parseEnvConfig() {
  const rawEnv = process.env.NEXT_PUBLIC_STAFF_CONFIG;
  if (!rawEnv || !rawEnv.trim()) return null;
  try {
    return JSON.parse(rawEnv);
  } catch (err) {
    throw new Error(
      `NEXT_PUBLIC_STAFF_CONFIG is set but is not valid JSON: ${
        err instanceof Error ? err.message : String(err)
      }`
    );
  }
}

const raw = parseEnvConfig() ?? fallback;

if (!isStaffConfig(raw)) {
  throw new Error(
    "Invalid staff config. Set NEXT_PUBLIC_STAFF_CONFIG, or copy config/staff.example.json to config/staff.json and fill in your team."
  );
}

export const staffConfig = raw;
