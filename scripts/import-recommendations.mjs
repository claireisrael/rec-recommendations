/**
 * One-off importer: loads REC 2025 recommendations into the Appwrite collection.
 *
 * Usage:
 *   node scripts/import-recommendations.mjs
 *
 * Requires in .env (local only, never commit):
 *   NEXT_PUBLIC_APPWRITE_ENDPOINT
 *   NEXT_PUBLIC_APPWRITE_PROJECT_ID
 *   NEXT_PUBLIC_APPWRITE_DATABASE_ID
 *   NEXT_PUBLIC_APPWRITE_COLLECTION_ID
 *   APPWRITE_API_KEY
 *
 * Optional:
 *   IMPORT_DRY_RUN=1   — validate + print, no writes
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

const endpoint = (process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT || "").replace(
  /\/$/,
  ""
);
const projectId = process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID || "";
const databaseId = process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID || "";
const collectionId = process.env.NEXT_PUBLIC_APPWRITE_COLLECTION_ID || "";
const apiKey = process.env.APPWRITE_API_KEY || "";
const dryRun = process.env.IMPORT_DRY_RUN === "1";

const YEAR = 2025;
const STATUS = "planned";
const PLACEHOLDER_ACTION = "Action to be defined";
const PLACEHOLDER_SCORE = "fair";

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

function categoryFromSection(section = "") {
  for (const e of SECTION_MAP) {
    if (e.match.test(section)) return e.category;
  }
  return "clean_cooking";
}

function required(name, value) {
  if (!value) {
    console.error(`Missing ${name} in .env`);
    process.exit(1);
  }
}

required("NEXT_PUBLIC_APPWRITE_ENDPOINT", endpoint);
required("NEXT_PUBLIC_APPWRITE_PROJECT_ID", projectId);
required("NEXT_PUBLIC_APPWRITE_DATABASE_ID", databaseId);
required("NEXT_PUBLIC_APPWRITE_COLLECTION_ID", collectionId);
required("APPWRITE_API_KEY", apiKey);

const rows = JSON.parse(
  readFileSync(
    resolve(root, "import-data/rec2025-recommendations.json"),
    "utf8"
  )
);

function toDocument(row) {
  const partners = (row.partners || "")
    .split(",")
    .map((p) => p.trim())
    .filter(Boolean)
    .join(", ");

  return {
    recommendations: row.recommendation.trim(),
    "rec-year": YEAR,
    category: categoryFromSection(row.section || ""),
    status: STATUS,
    comments: row.section ? `Section: ${row.section}` : "",
    actionItems: [PLACEHOLDER_ACTION],
    actionScores: [PLACEHOLDER_SCORE],
    actionPartners: [partners || "To be assigned"],
    actionEvidence: [""],
  };
}

async function createDocument(data) {
  const url = `${endpoint}/databases/${databaseId}/collections/${collectionId}/documents`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Appwrite-Project": projectId,
      "X-Appwrite-Key": apiKey,
    },
    body: JSON.stringify({
      documentId: "unique()",
      data,
      permissions: [
        'read("any")',
        'update("users")',
        'delete("users")',
      ],
    }),
  });

  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    const message = body?.message || JSON.stringify(body) || res.statusText;
    throw new Error(`${res.status}: ${message}`);
  }
  return body;
}

async function main() {
  console.log(
    `Importing ${rows.length} recommendations → project ${projectId}, collection "${collectionId}"${dryRun ? " (DRY RUN)" : ""}`
  );

  let ok = 0;
  let failed = 0;

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const data = toDocument(row);
    const label = `${i + 1}/${rows.length}`;

    try {
      if (dryRun) {
        console.log(`[dry] ${label}`, data.recommendations.slice(0, 80) + "…");
      } else {
        const doc = await createDocument(data);
        console.log(`✓ ${label} ${doc.$id}`);
      }
      ok += 1;
    } catch (err) {
      failed += 1;
      console.error(`✗ ${label} ${err.message}`);
      console.error(`  → ${data.recommendations.slice(0, 100)}`);
    }

    // gentle pacing for Appwrite rate limits
    if (!dryRun) await new Promise((r) => setTimeout(r, 120));
  }

  console.log(`\nDone. Created: ${ok}. Failed: ${failed}.`);
  if (failed > 0) process.exit(1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
