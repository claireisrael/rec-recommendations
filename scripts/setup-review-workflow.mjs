/**
 * Sets up review workflow in Appwrite:
 * - labels on known users
 * - actionReviews string[] attribute on recommendation
 * - notifications collection
 * - backfill actionReviews for existing docs
 *
 * Usage: node scripts/setup-review-workflow.mjs
 */
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { randomUUID } from "node:crypto";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");

function loadEnv() {
  const text = readFileSync(resolve(root, ".env"), "utf8");
  for (const line of text.split(/\r?\n/)) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const i = t.indexOf("=");
    if (i === -1) continue;
    const k = t.slice(0, i).trim();
    let v = t.slice(i + 1).trim();
    if (
      (v.startsWith('"') && v.endsWith('"')) ||
      (v.startsWith("'") && v.endsWith("'"))
    ) {
      v = v.slice(1, -1);
    }
    if (!(k in process.env)) process.env[k] = v;
  }
}

loadEnv();

function loadStaffConfig() {
  const local = resolve(root, "config", "staff.json");
  const example = resolve(root, "config", "staff.example.json");
  const path = (() => {
    try {
      readFileSync(local);
      return local;
    } catch {
      return example;
    }
  })();
  return JSON.parse(readFileSync(path, "utf8"));
}

const staff = loadStaffConfig();

const endpoint = (process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT || "").replace(
  /\/$/,
  ""
);
const projectId = process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID || "";
const databaseId = process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID || "";
const collectionId = process.env.NEXT_PUBLIC_APPWRITE_COLLECTION_ID || "";
const apiKey = process.env.APPWRITE_API_KEY || "";

const headers = {
  "Content-Type": "application/json",
  "X-Appwrite-Project": projectId,
  "X-Appwrite-Key": apiKey,
};

const ROLE_USERS = (staff.users || [])
  .filter((u) => u.role === "superadmin" || u.role === "l1_reviewer")
  .map((u) => ({
    email: u.email,
    labels:
      u.role === "superadmin"
        ? ["superadmin", "admin"]
        : ["l1reviewer"],
  }));

async function api(method, path, body) {
  const res = await fetch(`${endpoint}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = { raw: text };
  }
  if (!res.ok) {
    const err = new Error(
      data?.message || text || `${res.status} ${res.statusText}`
    );
    err.status = res.status;
    err.data = data;
    throw err;
  }
  return data;
}

async function sleep(ms) {
  await new Promise((r) => setTimeout(r, ms));
}

async function ensureActionReviewsAttribute() {
  const list = await api(
    "GET",
    `/databases/${databaseId}/collections/${collectionId}/attributes`
  );
  const exists = (list.attributes || []).some((a) => a.key === "actionReviews");
  if (exists) {
    console.log("✓ actionReviews attribute exists");
    return;
  }
  console.log("+ creating actionReviews string[] attribute…");
  await api(
    "POST",
    `/databases/${databaseId}/collections/${collectionId}/attributes/string`,
    {
      key: "actionReviews",
      size: 4000,
      required: false,
      array: true,
    }
  );
  for (let i = 0; i < 40; i++) {
    await sleep(1500);
    const check = await api(
      "GET",
      `/databases/${databaseId}/collections/${collectionId}/attributes`
    );
    const attr = (check.attributes || []).find((a) => a.key === "actionReviews");
    console.log("  status:", attr?.status);
    if (attr?.status === "available") return;
    if (attr?.status === "failed") throw new Error("actionReviews failed");
  }
  throw new Error("Timed out waiting for actionReviews");
}

async function ensureNotificationsCollection() {
  try {
    await api("GET", `/databases/${databaseId}/collections/notifications`);
    console.log("✓ notifications collection exists");
    return;
  } catch (e) {
    if (e.status !== 404) throw e;
  }

  console.log("+ creating notifications collection…");
  await api("POST", `/databases/${databaseId}/collections`, {
    collectionId: "notifications",
    name: "Notifications",
    documentSecurity: true,
    enabled: true,
    permissions: [
      'read("users")',
      'create("users")',
      'update("users")',
      'delete("users")',
    ],
  });

  const attrs = [
    { path: "string", body: { key: "userId", size: 64, required: true, array: false } },
    { path: "string", body: { key: "type", size: 64, required: true, array: false } },
    { path: "string", body: { key: "title", size: 200, required: true, array: false } },
    { path: "string", body: { key: "body", size: 1000, required: true, array: false } },
    { path: "string", body: { key: "recommendationId", size: 64, required: false, array: false } },
    { path: "string", body: { key: "actionId", size: 64, required: false, array: false } },
    { path: "boolean", body: { key: "read", required: false, default: false, array: false } },
  ];

  for (const a of attrs) {
    console.log(`  + attribute ${a.body.key}`);
    await api(
      "POST",
      `/databases/${databaseId}/collections/notifications/attributes/${a.path}`,
      a.body
    );
    await sleep(2000);
  }

  // Wait for all available
  for (let i = 0; i < 30; i++) {
    await sleep(1500);
    const list = await api(
      "GET",
      `/databases/${databaseId}/collections/notifications/attributes`
    );
    const pending = (list.attributes || []).filter(
      (x) => x.status !== "available"
    );
    if (pending.length === 0) break;
    console.log(
      "  waiting attrs:",
      pending.map((p) => `${p.key}:${p.status}`).join(", ")
    );
  }

  try {
    await api(
      "POST",
      `/databases/${databaseId}/collections/notifications/indexes`,
      {
        key: "idx_user_read",
        type: "key",
        attributes: ["userId", "read"],
        orders: ["ASC", "ASC"],
      }
    );
  } catch (e) {
    console.log("  index note:", e.message);
  }

  console.log("✓ notifications collection ready");
}

async function setUserLabels() {
  const users = await api(
    "GET",
    `/users?queries[]=${encodeURIComponent(JSON.stringify({ method: "limit", values: [100] }))}`
  );
  for (const role of ROLE_USERS) {
    const user = (users.users || []).find(
      (u) => (u.email || "").toLowerCase() === role.email.toLowerCase()
    );
    if (!user) {
      console.warn("! user not found:", role.email);
      continue;
    }
    await api("PUT", `/users/${user.$id}/labels`, { labels: role.labels });
    console.log(`✓ labels ${role.labels.join(",")} → ${role.email}`);
  }
}

async function backfillActionReviews() {
  const all = [];
  let cursor = null;
  for (;;) {
    const queries = [
      JSON.stringify({ method: "limit", values: [100] }),
      JSON.stringify({ method: "orderAsc", attribute: "$id" }),
    ];
    if (cursor) {
      queries.push(
        JSON.stringify({ method: "cursorAfter", values: [cursor] })
      );
    }
    const qs = queries
      .map((q) => `queries[]=${encodeURIComponent(q)}`)
      .join("&");
    const page = await api(
      "GET",
      `/databases/${databaseId}/collections/${collectionId}/documents?${qs}`
    );
    const docs = page.documents || [];
    all.push(...docs);
    if (docs.length < 100) break;
    cursor = docs[docs.length - 1].$id;
  }

  console.log(`Backfilling actionReviews on ${all.length} documents…`);
  let updated = 0;
  for (const doc of all) {
    const items = doc.actionItems || [];
    const existing = doc.actionReviews || [];
    if (existing.length === items.length && items.length > 0) continue;
    const reviews = items.map((_, i) => {
      if (existing[i]) return existing[i];
      return JSON.stringify({
        id: randomUUID(),
        status: "draft",
        feedback: [],
      });
    });
    await api(
      "PATCH",
      `/databases/${databaseId}/collections/${collectionId}/documents/${doc.$id}`,
      { data: { actionReviews: reviews } }
    );
    updated++;
    if (updated % 20 === 0) console.log(`  … ${updated}`);
  }
  console.log(`✓ backfilled ${updated} documents`);
}

async function main() {
  await ensureActionReviewsAttribute();
  await ensureNotificationsCollection();
  await setUserLabels();
  await backfillActionReviews();
  console.log("\nDone.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
