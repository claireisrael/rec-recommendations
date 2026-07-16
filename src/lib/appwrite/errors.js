/**
 * Turn raw Appwrite errors into clear, actionable messages.
 */
import { appwriteConfig } from "./config";

/**
 * @param {unknown} err
 * @returns {{ code?: number, type?: string, message?: string } | null}
 */
function asAppwriteError(err) {
  if (err && typeof err === "object") return /** @type {{ code?: number, type?: string, message?: string }} */ (err);
  return null;
}

/** True when the error means the user's session is missing/expired. */
export function isAuthError(err) {
  const e = asAppwriteError(err);
  if (!e) return false;
  const msg = (e.message ?? "").toLowerCase();
  return (
    e.code === 401 ||
    e.type === "user_unauthorized" ||
    e.type === "general_unauthorized_scope" ||
    msg.includes("not authorized") ||
    msg.includes("missing scope") ||
    msg.includes("unauthorized")
  );
}

/**
 * @param {unknown} err
 * @param {string} fallback
 */
export function formatAppwriteError(err, fallback) {
  const raw = err instanceof Error ? err.message : "";

  if (isAuthError(err)) {
    return "Your session has expired. Please log in again, then retry.";
  }

  const target = `[project ${appwriteConfig.projectId} · db ${appwriteConfig.databaseId} · collection "${appwriteConfig.collectionId}"]`;

  if (!raw) return `${fallback} ${target}`;
  return `${raw}  —  ${target}`;
}
