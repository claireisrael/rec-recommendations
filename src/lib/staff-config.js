/**
 * Staff / RBAC directory.
 *
 * Resolution order:
 * 1. `NEXT_PUBLIC_STAFF_CONFIG` env var — used on hosts like Vercel where
 *    config/staff.json is not in the repo. Accepts either raw JSON or a
 *    base64-encoded JSON string (base64 is safer to paste into env fields).
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

/**
 * Universal base64 → UTF-8 string (works in Node build and browser runtime).
 * @param {string} str
 * @returns {string}
 */
function decodeBase64(str) {
  if (typeof atob === "function") {
    const bin = atob(str);
    const bytes = Uint8Array.from(bin, (c) => c.charCodeAt(0));
    return new TextDecoder().decode(bytes);
  }
  return Buffer.from(str, "base64").toString("utf8");
}

/** @returns {unknown} */
function parseEnvConfig() {
  const rawEnv = process.env.NEXT_PUBLIC_STAFF_CONFIG;
  if (!rawEnv || !rawEnv.trim()) return null;
  const text = rawEnv.trim();

  // 1) Try raw JSON.
  try {
    return JSON.parse(text);
  } catch {
    // fall through
  }

  // 2) Try base64-encoded JSON.
  try {
    return JSON.parse(decodeBase64(text));
  } catch {
    throw new Error(
      "NEXT_PUBLIC_STAFF_CONFIG could not be parsed as JSON or base64-encoded JSON. Re-copy the value from config/staff.env.txt."
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
