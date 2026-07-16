import { appwriteConfig } from "./config";

/** Client-safe: list inbox notifications with a user JWT (no nodemailer). */
/**
 * @param {string} jwt
 * @param {string} userId
 * @returns {Promise<import("./notification-types").AppNotification[]>}
 */
export async function listNotificationsForUser(jwt, userId) {
  const endpoint = appwriteConfig.endpoint.replace(/\/$/, "");
  const queries = [
    JSON.stringify({ method: "equal", attribute: "userId", values: [userId] }),
    JSON.stringify({ method: "orderDesc", attribute: "$createdAt" }),
    JSON.stringify({ method: "limit", values: [50] }),
  ];
  const qs = queries
    .map((q) => `queries[]=${encodeURIComponent(q)}`)
    .join("&");
  const res = await fetch(
    `${endpoint}/databases/${appwriteConfig.databaseId}/collections/notifications/documents?${qs}`,
    {
      headers: {
        "X-Appwrite-Project": appwriteConfig.projectId,
        "X-Appwrite-JWT": jwt,
      },
      cache: "no-store",
    }
  );
  if (!res.ok) return [];
  const body = await res.json();
  return body.documents || [];
}

/** Mark specific notifications as read (e.g. status updates after Track). */
/**
 * @param {string} jwt
 * @param {string[]} notificationIds
 * @returns {Promise<number>}
 */
export async function markNotificationsRead(jwt, notificationIds) {
  const ids = notificationIds.filter(Boolean);
  if (ids.length === 0) return 0;

  const endpoint = appwriteConfig.endpoint.replace(/\/$/, "");
  let marked = 0;

  await Promise.all(
    ids.map(async (id) => {
      const res = await fetch(
        `${endpoint}/databases/${appwriteConfig.databaseId}/collections/notifications/documents/${id}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            "X-Appwrite-Project": appwriteConfig.projectId,
            "X-Appwrite-JWT": jwt,
          },
          body: JSON.stringify({ data: { read: true } }),
        }
      );
      if (res.ok) marked += 1;
    })
  );

  if (marked > 0 && typeof window !== "undefined") {
    window.dispatchEvent(new Event("rec-notifications-updated"));
  }

  return marked;
}
