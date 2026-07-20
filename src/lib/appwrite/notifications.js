/** Client-safe inbox helpers — list/mark via server API (reliable permissions + user id merge). */

/**
 * @param {string} jwt
 * @returns {Promise<import("./notification-types").AppNotification[]>}
 */
export async function listNotificationsForUser(jwt) {
  const res = await fetch("/api/admin/notifications", {
    headers: { "X-Appwrite-JWT": jwt },
    cache: "no-store",
  });
  if (!res.ok) {
    console.warn("[notifications] list failed", res.status);
    return [];
  }
  const body = await res.json();
  return body.items || [];
}

/**
 * Mark specific notifications as read (e.g. status updates after Track).
 * @param {string} jwt
 * @param {string[]} notificationIds
 * @returns {Promise<number>}
 */
export async function markNotificationsRead(jwt, notificationIds) {
  const ids = notificationIds.filter(Boolean);
  if (ids.length === 0) return 0;

  const res = await fetch("/api/admin/notifications", {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      "X-Appwrite-JWT": jwt,
    },
    body: JSON.stringify({ ids }),
  });
  if (!res.ok) return 0;

  const body = await res.json();
  const marked = typeof body.marked === "number" ? body.marked : 0;

  if (marked > 0 && typeof window !== "undefined") {
    window.dispatchEvent(new Event("rec-notifications-updated"));
  }

  return marked;
}

/**
 * Dismiss an inbox notification.
 * Final publisher: full action thread. L1: own card + assignee for that action.
 * Assignee: own card only.
 * @param {string} jwt
 * @param {{ recommendationId: string; actionId: string; notificationId?: string }} input
 * @returns {Promise<number>}
 */
export async function dismissActionNotificationThread(jwt, input) {
  const recommendationId = String(input?.recommendationId || "").trim();
  const actionId = String(input?.actionId || "").trim();
  const notificationId = String(input?.notificationId || "").trim();
  if (!recommendationId || !actionId) return 0;

  const res = await fetch("/api/admin/notifications", {
    method: "DELETE",
    headers: {
      "Content-Type": "application/json",
      "X-Appwrite-JWT": jwt,
    },
    body: JSON.stringify({ recommendationId, actionId, notificationId }),
  });
  if (!res.ok) return 0;

  const body = await res.json();
  const deleted = typeof body.deleted === "number" ? body.deleted : 0;

  if (deleted > 0 && typeof window !== "undefined") {
    window.dispatchEvent(new Event("rec-notifications-updated"));
  }

  return deleted;
}
