/**
 * Set sectionCode on every recommendation from its category:
 * clean_cooking → 6.1, partnerships → 6.2, …
 *
 * Usage: node scripts/setup-section-codes.mjs
 */
import fs from "fs";

const env = Object.fromEntries(
  fs
    .readFileSync(".env", "utf8")
    .split(/\r?\n/)
    .filter((l) => l && !l.startsWith("#") && l.includes("="))
    .map((l) => {
      const i = l.indexOf("=");
      let v = l.slice(i + 1).trim();
      if (
        (v.startsWith('"') && v.endsWith('"')) ||
        (v.startsWith("'") && v.endsWith("'"))
      )
        v = v.slice(1, -1);
      return [l.slice(0, i).trim(), v];
    })
);

const endpoint = env.NEXT_PUBLIC_APPWRITE_ENDPOINT.replace(/\/$/, "");
const projectId = env.NEXT_PUBLIC_APPWRITE_PROJECT_ID;
const databaseId = env.NEXT_PUBLIC_APPWRITE_DATABASE_ID;
const collectionId = env.NEXT_PUBLIC_APPWRITE_COLLECTION_ID;
const apiKey = env.APPWRITE_API_KEY;

const CATEGORIES = [
  "clean_cooking",
  "partnerships",
  "finance",
  "agri_energy",
  "research",
  "energy_access",
  "policy",
  "training",
  "technology",
  "inclusion",
];

function sectionForCategory(cat) {
  if (cat === "biofuels") cat = "agri_energy";
  const idx = CATEGORIES.indexOf(cat);
  return `6.${idx >= 0 ? idx + 1 : 1}`;
}

const headers = {
  "Content-Type": "application/json",
  "X-Appwrite-Project": projectId,
  "X-Appwrite-Key": apiKey,
};

async function api(method, path, body) {
  const res = await fetch(`${endpoint}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let json = {};
  try {
    json = text ? JSON.parse(text) : {};
  } catch {
    json = { message: text };
  }
  return { ok: res.ok, status: res.status, json };
}

const list = await api(
  "GET",
  `/databases/${databaseId}/collections/${collectionId}/documents?` +
    `queries[]=${encodeURIComponent(JSON.stringify({ method: "limit", values: [200] }))}`
);

const docs = list.json.documents || [];
console.log("Documents:", docs.length);

for (const d of docs) {
  const cat = d.category || "clean_cooking";
  const section = sectionForCategory(cat);
  if (d.sectionCode === section) {
    console.log("skip", section, d.$id.slice(0, 8));
    continue;
  }
  const patch = await api(
    "PATCH",
    `/databases/${databaseId}/collections/${collectionId}/documents/${d.$id}`,
    { data: { sectionCode: section } }
  );
  console.log(
    patch.ok ? "✓" : "✗",
    cat,
    "→",
    section,
    d.$id.slice(0, 8),
    patch.ok ? "" : patch.json.message
  );
}

console.log("Done. Example: Clean Cooking items → 6.1.1, 6.1.2…");
