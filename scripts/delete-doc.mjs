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
const id = process.argv[2];
if (!id) {
  console.error("Usage: node scripts/delete-doc.mjs <documentId>");
  process.exit(1);
}

const url = `${endpoint}/databases/${env.NEXT_PUBLIC_APPWRITE_DATABASE_ID}/collections/${env.NEXT_PUBLIC_APPWRITE_COLLECTION_ID}/documents/${id}`;
const res = await fetch(url, {
  method: "DELETE",
  headers: {
    "X-Appwrite-Project": env.NEXT_PUBLIC_APPWRITE_PROJECT_ID,
    "X-Appwrite-Key": env.APPWRITE_API_KEY,
  },
});
console.log("status", res.status);
if (!res.ok) console.log(await res.text());
else console.log("deleted", id);
