/**
 * Set every recommendation's rec-year to 2025 (they are REC2025 items).
 *
 * Usage: node scripts/set-year-2025.mjs
 */
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");

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

const endpoint = (process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT || "").replace(
  /\/$/,
  ""
);
const projectId = process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID || "";
const databaseId = process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID || "";
const collectionId = process.env.NEXT_PUBLIC_APPWRITE_COLLECTION_ID || "";
const apiKey = process.env.APPWRITE_API_KEY || "";
const TARGET_YEAR = 2025;

const headers = {
  "Content-Type": "application/json",
  "X-Appwrite-Project": projectId,
  "X-Appwrite-Key": apiKey,
};

async function listAll() {
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
    const res = await fetch(
      `${endpoint}/databases/${databaseId}/collections/${collectionId}/documents?${qs}`,
      { headers }
    );
    const body = await res.json();
    if (!res.ok) throw new Error(body.message || res.statusText);
    const docs = body.documents || [];
    all.push(...docs);
    if (docs.length < 100) break;
    cursor = docs[docs.length - 1].$id;
  }
  return all;
}

async function main() {
  const docs = await listAll();
  console.log(`Found ${docs.length} documents`);

  let updated = 0;
  let skipped = 0;
  let failed = 0;

  for (const doc of docs) {
    const current = doc["rec-year"];
    if (current === TARGET_YEAR) {
      skipped++;
      continue;
    }
    const res = await fetch(
      `${endpoint}/databases/${databaseId}/collections/${collectionId}/documents/${doc.$id}`,
      {
        method: "PATCH",
        headers,
        body: JSON.stringify({ data: { "rec-year": TARGET_YEAR } }),
      }
    );
    if (!res.ok) {
      failed++;
      const err = await res.json().catch(() => ({}));
      console.error(`✗ ${doc.$id}`, err.message || res.status);
    } else {
      updated++;
      if (updated % 20 === 0) console.log(`  … ${updated} updated`);
    }
  }

  console.log({ updated, skipped, failed, year: TARGET_YEAR });
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
