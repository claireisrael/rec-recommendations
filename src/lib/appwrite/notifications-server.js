import "server-only";

import { appwriteConfig } from "./config";
import { reviewEmailHtml, reviewEmailText, sendReminderEmail } from "@/lib/email";
import { getRoleUserByEmail, getRoleUserById } from "@/lib/roles";

/** @param {string} apiKey */
function appwriteHeaders(apiKey) {
  return {
    "Content-Type": "application/json",
    "X-Appwrite-Project": appwriteConfig.projectId,
    "X-Appwrite-Key": apiKey,
  };
}

function portalBaseUrl() {
  return (
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.APP_BASE_URL ||
    "http://localhost:3000"
  ).replace(/\/$/, "");
}

/**
 * @param {string} apiKey
 * @param {string} userId
 * @param {string} [preferredEmail]
 * @returns {Promise<string | null>}
 */
async function resolveUserEmail(apiKey, userId, preferredEmail) {
  if (preferredEmail?.includes("@")) return preferredEmail;
  const fromRoles = getRoleUserById(userId)?.email;
  if (fromRoles) return fromRoles;

  const endpoint = appwriteConfig.endpoint.replace(/\/$/, "");
  try {
    const res = await fetch(`${endpoint}/users/${userId}`, {
      headers: appwriteHeaders(apiKey),
      cache: "no-store",
    });
    if (!res.ok) return null;
    const user = await res.json();
    return user.email || null;
  } catch {
    return null;
  }
}

/**
 * @param {string} apiKey
 * @param {string} email
 * @returns {Promise<string | null>}
 */
export async function findUserIdByEmail(apiKey, email) {
  const normalized = email.trim().toLowerCase();
  if (!normalized) return null;

  const known = getRoleUserByEmail(normalized);
  if (known?.userId) return known.userId;

  const endpoint = appwriteConfig.endpoint.replace(/\/$/, "");
  const query = JSON.stringify({
    method: "equal",
    attribute: "email",
    values: [normalized],
  });
  try {
    const res = await fetch(
      `${endpoint}/users?queries[]=${encodeURIComponent(query)}&queries[]=${encodeURIComponent(
        JSON.stringify({ method: "limit", values: [1] })
      )}`,
      {
        headers: appwriteHeaders(apiKey),
        cache: "no-store",
      }
    );
    if (!res.ok) return null;
    const body = await res.json();
    const user = body.users?.[0];
    return user?.$id || null;
  } catch {
    return null;
  }
}

/**
 * @param {string} apiKey
 * @param {Omit<import("./notification-types").AppNotification, "$id" | "read" | "$createdAt"> & { read?: boolean }} input
 * @returns {Promise<void>}
 */
export async function createNotificationServer(apiKey, input) {
  const endpoint = appwriteConfig.endpoint.replace(/\/$/, "");
  const res = await fetch(
    `${endpoint}/databases/${appwriteConfig.databaseId}/collections/notifications/documents`,
    {
      method: "POST",
      headers: appwriteHeaders(apiKey),
      body: JSON.stringify({
        documentId: "unique()",
        data: {
          userId: input.userId,
          type: input.type,
          title: input.title,
          body: input.body,
          recommendationId: input.recommendationId || "",
          actionId: input.actionId || "",
          read: input.read ?? false,
        },
        permissions: [
          `read("user:${input.userId}")`,
          `update("user:${input.userId}")`,
          `delete("user:${input.userId}")`,
        ],
      }),
    }
  );
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(
      err.message || `Failed to create notification (${res.status})`
    );
  }
}

/**
 * Clear a user's open work item for this action (so it leaves their review queue).
 * Used after L1 approves / finishes — standard handoff off their desk.
 *
 * @param {string} apiKey
 * @param {{ userId: string; recommendationId: string; actionId: string; types: import("./notification-types").NotificationType[] }} input
 * @returns {Promise<number>}
 */
export async function markActionNotificationsRead(apiKey, input) {
  const endpoint = appwriteConfig.endpoint.replace(/\/$/, "");
  const queries = [
    JSON.stringify({
      method: "equal",
      attribute: "userId",
      values: [input.userId],
    }),
    JSON.stringify({
      method: "equal",
      attribute: "recommendationId",
      values: [input.recommendationId],
    }),
    JSON.stringify({ method: "equal", attribute: "read", values: [false] }),
    JSON.stringify({ method: "limit", values: [50] }),
  ];
  const qs = queries
    .map((q) => `queries[]=${encodeURIComponent(q)}`)
    .join("&");

  const listRes = await fetch(
    `${endpoint}/databases/${appwriteConfig.databaseId}/collections/notifications/documents?${qs}`,
    {
      headers: appwriteHeaders(apiKey),
      cache: "no-store",
    }
  );
  if (!listRes.ok) return 0;

  const body = await listRes.json();
  const docs = body.documents || [];
  const typeSet = new Set(input.types);
  let marked = 0;

  for (const doc of docs) {
    if (!doc.$id || !typeSet.has(doc.type)) continue;
    if (input.actionId && doc.actionId && doc.actionId !== input.actionId) {
      continue;
    }
    const patchRes = await fetch(
      `${endpoint}/databases/${appwriteConfig.databaseId}/collections/notifications/documents/${doc.$id}`,
      {
        method: "PATCH",
        headers: appwriteHeaders(apiKey),
        body: JSON.stringify({ data: { read: true } }),
      }
    );
    if (patchRes.ok) marked += 1;
  }

  return marked;
}

/**
 * Clear every unread notification tied to this recommendation action (all users).
 * Used when the superadmin publishes so the communication loop closes.
 *
 * @param {string} apiKey
 * @param {{ recommendationId: string; actionId: string }} input
 * @returns {Promise<number>}
 */
export async function markAllActionNotificationsRead(apiKey, input) {
  const endpoint = appwriteConfig.endpoint.replace(/\/$/, "");
  const queries = [
    JSON.stringify({
      method: "equal",
      attribute: "recommendationId",
      values: [input.recommendationId],
    }),
    JSON.stringify({ method: "equal", attribute: "read", values: [false] }),
    JSON.stringify({ method: "limit", values: [100] }),
  ];
  const qs = queries
    .map((q) => `queries[]=${encodeURIComponent(q)}`)
    .join("&");

  const listRes = await fetch(
    `${endpoint}/databases/${appwriteConfig.databaseId}/collections/notifications/documents?${qs}`,
    {
      headers: appwriteHeaders(apiKey),
      cache: "no-store",
    }
  );
  if (!listRes.ok) return 0;

  const body = await listRes.json();
  const docs = body.documents || [];
  let marked = 0;

  for (const doc of docs) {
    if (!doc.$id) continue;
    if (input.actionId && doc.actionId && doc.actionId !== input.actionId) {
      continue;
    }
    const patchRes = await fetch(
      `${endpoint}/databases/${appwriteConfig.databaseId}/collections/notifications/documents/${doc.$id}`,
      {
        method: "PATCH",
        headers: appwriteHeaders(apiKey),
        body: JSON.stringify({ data: { read: true } }),
      }
    );
    if (patchRes.ok) marked += 1;
  }

  return marked;
}

/**
 * @param {string} apiKey
 * @param {string} userId
 * @param {string} [preferredEmail]
 * @returns {Promise<string | undefined>}
 */
async function resolveUserDisplayName(apiKey, userId, preferredEmail) {
  const fromRoles = getRoleUserById(userId);
  if (fromRoles?.name) return fromRoles.name;
  if (preferredEmail) {
    const byEmail = getRoleUserByEmail(preferredEmail);
    if (byEmail?.name) return byEmail.name;
  }

  const endpoint = appwriteConfig.endpoint.replace(/\/$/, "");
  try {
    const res = await fetch(`${endpoint}/users/${userId}`, {
      headers: appwriteHeaders(apiKey),
      cache: "no-store",
    });
    if (!res.ok) return preferredEmail;
    const user = await res.json();
    return user.name || user.email || preferredEmail;
  } catch {
    return preferredEmail;
  }
}

/**
 * @param {string} apiKey
 * @param {Omit<import("./notification-types").AppNotification, "$id" | "read" | "$createdAt"> & { read?: boolean; email?: string }} input
 * @returns {Promise<void>}
 */
export async function notifyUser(apiKey, input) {
  await createNotificationServer(apiKey, input);

  const to = await resolveUserEmail(apiKey, input.userId, input.email);
  if (!to) return;

  const recipientName = await resolveUserDisplayName(
    apiKey,
    input.userId,
    to
  );

  const actionUrl = input.recommendationId
    ? `${portalBaseUrl()}/admin/${input.recommendationId}${
        input.actionId ? `?review=${encodeURIComponent(input.actionId)}` : ""
      }`
    : input.type === "responsibility_assigned"
      ? `${portalBaseUrl()}/admin/assignments`
      : `${portalBaseUrl()}/admin/reviews`;

  const mailPayload = {
    title: input.title,
    body: input.body,
    actionUrl,
    recipientName,
    type: input.type,
  };

  await sendReminderEmail({
    to,
    subject: `[REC Portal] ${input.title}`,
    text: reviewEmailText(mailPayload),
    html: reviewEmailHtml(mailPayload),
  });
}

/**
 * @param {string} apiKey
 * @param {{ email: string; userId?: string; type: import("./notification-types").NotificationType; title: string; body: string; linkPath?: string; recipientName?: string }} input
 * @returns {Promise<{ notified: boolean; inApp: boolean; emailed: boolean }>}
 */
export async function notifyByEmail(apiKey, input) {
  const email = input.email.trim();
  if (!email.includes("@")) {
    return { notified: false, inApp: false, emailed: false };
  }

  const userId = input.userId || (await findUserIdByEmail(apiKey, email));
  let inApp = false;

  if (userId) {
    try {
      await createNotificationServer(apiKey, {
        userId,
        type: input.type,
        title: input.title,
        body: input.body,
      });
      inApp = true;
    } catch (e) {
      console.error("[notifyByEmail] in-app failed", e);
    }
  }

  const actionUrl = `${portalBaseUrl()}${input.linkPath || "/admin/assignments"}`;
  const recipientName =
    input.recipientName ||
    (userId
      ? await resolveUserDisplayName(apiKey, userId, email)
      : email);

  const mailPayload = {
    title: input.title,
    body: input.body,
    actionUrl,
    recipientName,
    type: input.type,
  };

  const mail = await sendReminderEmail({
    to: email,
    subject: `[REC Portal] ${input.title}`,
    text: reviewEmailText(mailPayload),
    html: reviewEmailHtml(mailPayload),
  });

  return {
    notified: inApp || Boolean(mail.sent),
    inApp,
    emailed: Boolean(mail.sent),
  };
}
