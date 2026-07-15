/**
 * 1) Ensures a `category` string attribute exists on the collection
 * 2) Sets category on every document from import JSON / comments
 *
 * Usage: node scripts/backfill-categories.mjs
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

const headers = {
  "Content-Type": "application/json",
  "X-Appwrite-Project": projectId,
  "X-Appwrite-Key": apiKey,
};

const SECTION_MAP = [
  { match: /clean cooking|manufacturing|value chain|fumbahub/i, category: "clean_cooking" },
  { match: /partnership/i, category: "partnerships" },
  { match: /access to finance|^finance$/i, category: "finance" },
  { match: /productive use|pue|agri/i, category: "agri_energy" },
  { match: /research and data|research & data/i, category: "research" },
  { match: /energy access/i, category: "energy_access" },
  { match: /policy|planning|quality|institutions|markets/i, category: "policy" },
  { match: /training|communities/i, category: "training" },
  { match: /technology innovation|innovation, development/i, category: "technology" },
  { match: /leaving no one behind|inclusion/i, category: "inclusion" },
];

function categoryFromSection(section) {
  for (const e of SECTION_MAP) {
    if (e.match.test(section)) return e.category;
  }
  return "clean_cooking";
}

async function ensureCategoryAttribute() {
  const listUrl = `${endpoint}/databases/${databaseId}/collections/${collectionId}/attributes`;
  const listRes = await fetch(listUrl, { headers });
  const list = await listRes.json();
  const exists = (list.attributes || []).some((a) => a.key === "category");
  if (exists) {
    console.log("Attribute `category` already exists");
    return;
  }

  console.log("Creating `category` attribute…");
  const createRes = await fetch(
    `${endpoint}/databases/${databaseId}/collections/${collectionId}/attributes/string`,
    {
      method: "POST",
      headers,
      body: JSON.stringify({
        key: "category",
        size: 64,
        required: false,
        default: "clean_cooking",
        array: false,
      }),
    }
  );
  const body = await createRes.json().catch(() => ({}));
  if (!createRes.ok) {
    throw new Error(
      `Failed to create attribute: ${body.message || createRes.status}`
    );
  }

  // Wait until available
  for (let i = 0; i < 40; i++) {
    await new Promise((r) => setTimeout(r, 1500));
    const check = await fetch(listUrl, { headers }).then((r) => r.json());
    const attr = (check.attributes || []).find((a) => a.key === "category");
    console.log(`  status: ${attr?.status ?? "pending"}`);
    if (attr?.status === "available") return;
  }
  throw new Error("Timed out waiting for category attribute");
}

async function listDocuments() {
  const url = `${endpoint}/databases/${databaseId}/collections/${collectionId}/documents?queries[]=${encodeURIComponent(
    '{"method":"limit","values":[500]}'
  )}`;
  const res = await fetch(url, { headers });
  const body = await res.json();
  if (!res.ok) throw new Error(body.message || res.statusText);
  return body.documents || [];
}

async function main() {
  if (!apiKey) throw new Error("Missing APPWRITE_API_KEY");
  await ensureCategoryAttribute();

  const importRows = JSON.parse(
    readFileSync(resolve(root, "import-data/rec2025-recommendations.json"), "utf8")
  );
  const byText = new Map(
    importRows.map((r) => [
      r.recommendation.trim().toLowerCase(),
      categoryFromSection(r.section),
    ])
  );

  const docs = await listDocuments();
  console.log(`Updating ${docs.length} documents…`);

  let ok = 0;
  let failed = 0;
  const tally = {};

  for (const doc of docs) {
    const text = (doc.recommendations || "").trim().toLowerCase();
    let category = byText.get(text);
    if (!category) {
      const section = (doc.comments || "").replace(/^section:\s*/i, "");
      category = categoryFromSection(section);
    }
    tally[category] = (tally[category] || 0) + 1;

    const url = `${endpoint}/databases/${databaseId}/collections/${collectionId}/documents/${doc.$id}`;
    const res = await fetch(url, {
      method: "PATCH",
      headers,
      body: JSON.stringify({ data: { category } }),
    });
    if (!res.ok) {
      failed += 1;
      const err = await res.json().catch(() => ({}));
      console.error(`✗ ${doc.$id}`, err.message || res.status);
    } else {
      ok += 1;
      process.stdout.write(".");
    }
    await new Promise((r) => setTimeout(r, 80));
  }

  console.log(`\nDone. Updated: ${ok}. Failed: ${failed}.`);
  console.log("Counts by category:", tally);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
