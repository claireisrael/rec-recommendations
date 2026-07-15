import { readFileSync } from "node:fs";

const env = Object.fromEntries(
  readFileSync(".env", "utf8")
    .split(/\r?\n/)
    .filter((l) => l && !l.startsWith("#"))
    .map((l) => {
      const i = l.indexOf("=");
      return [l.slice(0, i).trim(), l.slice(i + 1).trim()];
    })
);

const endpoint = env.NEXT_PUBLIC_APPWRITE_ENDPOINT.replace(/\/$/, "");
const url = `${endpoint}/databases/${env.NEXT_PUBLIC_APPWRITE_DATABASE_ID}/collections/${env.NEXT_PUBLIC_APPWRITE_COLLECTION_ID}/documents?queries[]=${encodeURIComponent('{"method":"limit","values":[500]}')}`;

const res = await fetch(url, {
  headers: {
    "X-Appwrite-Project": env.NEXT_PUBLIC_APPWRITE_PROJECT_ID,
    "X-Appwrite-Key": env.APPWRITE_API_KEY,
  },
});
const j = await res.json();
console.log("status", res.status, "total", j.total);
const byYear = {};
for (const d of j.documents || []) {
  const y = d["rec-year"];
  byYear[y] = (byYear[y] || 0) + 1;
  if (y === 2025) {
    console.log("2025 doc", d.$id, (d.recommendations || "").slice(0, 100));
  }
}
console.log("byYear", byYear);
