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

  // Strip surrounding whitespace and any wrapping quotes a host may add.
  let text = rawEnv.trim();
  if (
    (text.startsWith('"') && text.endsWith('"')) ||
    (text.startsWith("'") && text.endsWith("'"))
  ) {
    text = text.slice(1, -1).trim();
  }

  // 1) Try raw JSON.
  try {
    return JSON.parse(text);
  } catch {
    // fall through
  }

  // 2) Try base64-encoded JSON (strip any whitespace/newlines first).
  try {
    return JSON.parse(decodeBase64(text.replace(/\s+/g, "")));
  } catch {
    return null;
  }
}

const parsed = parseEnvConfig();

if (process.env.NEXT_PUBLIC_STAFF_CONFIG && !isStaffConfig(parsed)) {
  // The env var was provided but unusable. Warn loudly but don't crash the
  // build/runtime — fall back to the bundled config so the app still serves.
  console.error(
    "[staff-config] NEXT_PUBLIC_STAFF_CONFIG is set but could not be parsed as valid staff JSON (raw or base64). Falling back to bundled config. Re-copy the value from config/staff.env.txt."
  );
}

const raw = isStaffConfig(parsed) ? parsed : fallback;

if (!isStaffConfig(raw)) {
  throw new Error(
    "Invalid staff config. Set NEXT_PUBLIC_STAFF_CONFIG, or copy config/staff.example.json to config/staff.json and fill in your team."
  );
}

export const staffConfig = raw;
