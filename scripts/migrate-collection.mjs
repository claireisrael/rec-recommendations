/**
 * Migrate the `recommendation` collection (schema + documents)
 * from the current Appwrite project into a target project/database.
 *
 * Usage:
 *   node scripts/migrate-collection.mjs
 *
 * Reads source from .env, target from TARGET_* env vars (or defaults below).
 * Set MIGRATE_DRY_RUN=1 to inspect without writing.
 */

import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");

function loadEnvFile(path) {
  try {
    const text = readFileSync(path, "utf8");
    for (const line of text.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eq = trimmed.indexOf("=");
      if (eq === -1) continue;
      const key = trimmed.slice(0, eq).trim();
      let value = trimmed.slice(eq + 1).trim();
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1);
      }
      if (!(key in process.env)) process.env[key] = value;
    }
  } catch {
    // optional
  }
}

loadEnvFile(resolve(root, ".env"));
loadEnvFile(resolve(root, ".env.local"));

const dryRun = process.env.MIGRATE_DRY_RUN === "1";

const SOURCE = {
  endpoint: (
    process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT || ""
  ).replace(/\/$/, ""),
  projectId: process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID || "",
  databaseId: process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID || "",
  collectionId: process.env.NEXT_PUBLIC_APPWRITE_COLLECTION_ID || "recommendation",
  apiKey: process.env.APPWRITE_API_KEY || "",
};

const TARGET = {
  endpoint: (
    process.env.TARGET_APPWRITE_ENDPOINT ||
    process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT ||
    ""
  ).replace(/\/$/, ""),
  projectId: process.env.TARGET_APPWRITE_PROJECT_ID || "",
  databaseId: process.env.TARGET_APPWRITE_DATABASE_ID || "",
  collectionId:
    process.env.TARGET_APPWRITE_COLLECTION_ID || SOURCE.collectionId,
  apiKey: process.env.TARGET_APPWRITE_API_KEY || "",
};

function required(label, value) {
  if (!value) {
    console.error(`Missing ${label}`);
    process.exit(1);
  }
}

required("SOURCE endpoint", SOURCE.endpoint);
required("SOURCE project", SOURCE.projectId);
required("SOURCE database", SOURCE.databaseId);
required("SOURCE collection", SOURCE.collectionId);
required("SOURCE api key", SOURCE.apiKey);
required("TARGET endpoint", TARGET.endpoint);
required("TARGET project", TARGET.projectId);
required("TARGET database", TARGET.databaseId);
required("TARGET collection", TARGET.collectionId);
required("TARGET api key", TARGET.apiKey);

function headers(client) {
  return {
    "Content-Type": "application/json",
    "X-Appwrite-Project": client.projectId,
    "X-Appwrite-Key": client.apiKey,
  };
}

async function api(client, method, path, body) {
  const res = await fetch(`${client.endpoint}${path}`, {
    method,
    headers: headers(client),
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
    const msg =
      data?.message || data?.raw || text || `${res.status} ${res.statusText}`;
    const err = new Error(`${method} ${path} → ${res.status}: ${msg}`);
    err.status = res.status;
    err.data = data;
    throw err;
  }
  return data;
}

async function sleep(ms) {
  await new Promise((r) => setTimeout(r, ms));
}

async function waitAttributeAvailable(client, dbId, colId, key, timeoutMs = 60000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const list = await api(
      client,
      "GET",
      `/databases/${dbId}/collections/${colId}/attributes`
    );
    const attr = (list.attributes || []).find((a) => a.key === key);
    if (attr?.status === "available") return attr;
    if (attr?.status === "failed") {
      throw new Error(`Attribute ${key} failed: ${JSON.stringify(attr)}`);
    }
    await sleep(1500);
  }
  throw new Error(`Timed out waiting for attribute ${key}`);
}

function attributeCreatePath(attr) {
  if (attr.format === "enum" || (attr.elements && attr.elements.length)) {
    return "enum";
  }
  switch (attr.type) {
    case "string":
      return "string";
    case "integer":
      return "integer";
    case "float":
      return "float";
    case "boolean":
      return "boolean";
    case "datetime":
      return "datetime";
    case "email":
      return "email";
    case "url":
      return "url";
    case "enum":
      return "enum";
    default:
      throw new Error(`Unsupported attribute type: ${attr.type}`);
  }
}

function buildAttributePayload(attr) {
  const isEnum = attr.format === "enum" || (attr.elements && attr.elements.length);
  const base = {
    key: attr.key,
    required: !!attr.required,
    array: !!attr.array,
  };
  if (attr.default !== undefined && attr.default !== null && !attr.required) {
    base.default = attr.default;
  }

  if (isEnum) {
    return { ...base, elements: attr.elements || [] };
  }

  switch (attr.type) {
    case "string":
    case "email":
    case "url":
      return { ...base, size: attr.size || 255 };
    case "integer":
    case "float":
      return {
        ...base,
        min: attr.min ?? undefined,
        max: attr.max ?? undefined,
      };
    case "boolean":
    case "datetime":
      return base;
    default:
      throw new Error(`Unsupported attribute type: ${attr.type}`);
  }
}

async function ensureDatabase(client, databaseId) {
  try {
    const db = await api(client, "GET", `/databases/${databaseId}`);
    console.log(`✓ Target database exists: ${db.$id} (${db.name})`);
    return db;
  } catch (e) {
    if (e.status !== 404) throw e;
    if (dryRun) {
      console.log(`[dry-run] Would create database ${databaseId}`);
      return null;
    }
    console.log(`Creating database ${databaseId}...`);
    return api(client, "POST", "/databases", {
      databaseId,
      name: databaseId,
    });
  }
}

async function ensureCollection(client, databaseId, collectionId, sourceCollection) {
  try {
    const col = await api(
      client,
      "GET",
      `/databases/${databaseId}/collections/${collectionId}`
    );
    console.log(`✓ Target collection exists: ${col.$id}`);
    return col;
  } catch (e) {
    if (e.status !== 404) throw e;
    if (dryRun) {
      console.log(`[dry-run] Would create collection ${collectionId}`);
      return null;
    }
    console.log(`Creating collection ${collectionId}...`);
    return api(client, "POST", `/databases/${databaseId}/collections`, {
      collectionId,
      name: sourceCollection.name || collectionId,
      documentSecurity: !!sourceCollection.documentSecurity,
      enabled: sourceCollection.enabled !== false,
      permissions: sourceCollection.$permissions || [
        'read("any")',
        'create("users")',
        'update("users")',
        'delete("users")',
      ],
    });
  }
}

async function ensureAttributes(client, databaseId, collectionId, sourceAttrs) {
  const existing = dryRun
    ? { attributes: [] }
    : await api(
        client,
        "GET",
        `/databases/${databaseId}/collections/${collectionId}/attributes`
      );
  const have = new Set((existing.attributes || []).map((a) => a.key));

  for (const attr of sourceAttrs) {
    if (have.has(attr.key)) {
      console.log(`  · attribute ${attr.key} already exists`);
      continue;
    }
    const typePath = attributeCreatePath(attr);
    const payload = buildAttributePayload(attr);
    if (dryRun) {
      console.log(
        `[dry-run] Would create attribute ${attr.key} (${typePath}${attr.array ? "[]" : ""})`
      );
      continue;
    }
    console.log(
      `  + creating attribute ${attr.key} (${typePath}${attr.array ? "[]" : ""})`
    );
    await api(
      client,
      "POST",
      `/databases/${databaseId}/collections/${collectionId}/attributes/${typePath}`,
      payload
    );
    await waitAttributeAvailable(client, databaseId, collectionId, attr.key);
  }
}

async function listAllDocuments(client, databaseId, collectionId) {
  const all = [];
  let cursor = null;
  const limit = 100;

  for (;;) {
    const queries = [
      JSON.stringify({ method: "limit", values: [limit] }),
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
      client,
      "GET",
      `/databases/${databaseId}/collections/${collectionId}/documents?${qs}`
    );
    const docs = page.documents || [];
    all.push(...docs);
    if (docs.length < limit) break;
    cursor = docs[docs.length - 1].$id;
  }
  return all;
}

function toCreatePayload(doc) {
  const data = { ...doc };
  delete data.$id;
  delete data.$createdAt;
  delete data.$updatedAt;
  delete data.$permissions;
  delete data.$databaseId;
  delete data.$collectionId;
  delete data.$sequence;
  return data;
}

async function migrateDocuments(client, databaseId, collectionId, docs) {
  let created = 0;
  let skipped = 0;
  let failed = 0;

  for (const doc of docs) {
    const payload = {
      documentId: doc.$id,
      data: toCreatePayload(doc),
      permissions: doc.$permissions?.length
        ? doc.$permissions
        : ['read("any")', 'update("users")', 'delete("users")'],
    };

    if (dryRun) {
      skipped++;
      continue;
    }

    try {
      await api(
        client,
        "POST",
        `/databases/${databaseId}/collections/${collectionId}/documents`,
        payload
      );
      created++;
      if (created % 25 === 0) console.log(`  … created ${created}/${docs.length}`);
    } catch (e) {
      if (e.status === 409) {
        // Already exists — update data to match source
        try {
          await api(
            client,
            "PATCH",
            `/databases/${databaseId}/collections/${collectionId}/documents/${doc.$id}`,
            { data: toCreatePayload(doc) }
          );
          skipped++;
        } catch (e2) {
          failed++;
          console.error(`  ✗ update ${doc.$id}: ${e2.message}`);
        }
      } else {
        failed++;
        console.error(`  ✗ create ${doc.$id}: ${e.message}`);
      }
    }
  }

  return { created, skipped, failed };
}

async function main() {
  console.log("Source:", {
    project: SOURCE.projectId,
    database: SOURCE.databaseId,
    collection: SOURCE.collectionId,
  });
  console.log("Target:", {
    project: TARGET.projectId,
    database: TARGET.databaseId,
    collection: TARGET.collectionId,
  });
  if (dryRun) console.log("DRY RUN — no writes\n");

  const sourceCollection = await api(
    SOURCE,
    "GET",
    `/databases/${SOURCE.databaseId}/collections/${SOURCE.collectionId}`
  );
  const sourceAttrs = await api(
    SOURCE,
    "GET",
    `/databases/${SOURCE.databaseId}/collections/${SOURCE.collectionId}/attributes`
  );
  const attrs = (sourceAttrs.attributes || []).filter(
    (a) => a.status === "available"
  );
  console.log(`\nSource collection "${sourceCollection.name}" — ${attrs.length} attributes`);
  for (const a of attrs) {
    console.log(
      `  - ${a.key}: ${a.type}${a.array ? "[]" : ""} size=${a.size ?? "-"} required=${a.required}`
    );
  }

  const docs = await listAllDocuments(
    SOURCE,
    SOURCE.databaseId,
    SOURCE.collectionId
  );
  console.log(`\nSource documents: ${docs.length}`);

  await ensureDatabase(TARGET, TARGET.databaseId);
  await ensureCollection(
    TARGET,
    TARGET.databaseId,
    TARGET.collectionId,
    sourceCollection
  );
  console.log("\nEnsuring attributes on target...");
  await ensureAttributes(
    TARGET,
    TARGET.databaseId,
    TARGET.collectionId,
    attrs
  );

  console.log(`\nMigrating ${docs.length} documents...`);
  const result = await migrateDocuments(
    TARGET,
    TARGET.databaseId,
    TARGET.collectionId,
    docs
  );

  console.log("\nDone.");
  console.log(result);
  if (!dryRun) {
    console.log("\nNext: update .env to:");
    console.log(`  NEXT_PUBLIC_APPWRITE_PROJECT_ID=${TARGET.projectId}`);
    console.log(`  NEXT_PUBLIC_APPWRITE_DATABASE_ID=${TARGET.databaseId}`);
    console.log(`  NEXT_PUBLIC_APPWRITE_COLLECTION_ID=${TARGET.collectionId}`);
    console.log(`  APPWRITE_API_KEY=<target api key>`);
  }
}

main().catch((err) => {
  console.error("\nMigration failed:", err.message);
  if (err.data) console.error(JSON.stringify(err.data, null, 2));
  process.exit(1);
});
