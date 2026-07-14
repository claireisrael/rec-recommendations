/**
 * Turn raw Appwrite errors into clear, actionable messages.
 */
import { appwriteConfig } from "./config";

interface AppwriteLikeError {
  code?: number;
  type?: string;
  message?: string;
}

function asAppwriteError(err: unknown): AppwriteLikeError | null {
  if (err && typeof err === "object") return err as AppwriteLikeError;
  return null;
}

/** True when the error means the user's session is missing/expired. */
export function isAuthError(err: unknown): boolean {
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

export function formatAppwriteError(err: unknown, fallback: string): string {
  const raw = err instanceof Error ? err.message : "";

  if (isAuthError(err)) {
    return "Your session has expired. Please log in again, then retry.";
  }

  const target = `[project ${appwriteConfig.projectId} · db ${appwriteConfig.databaseId} · collection "${appwriteConfig.collectionId}"]`;

  if (!raw) return `${fallback} ${target}`;
  return `${raw}  —  ${target}`;
}
