/**
 * One-off: delete an old collection from a previous Appwrite project.
 *
 * Usage (PowerShell):
 *   $env:OLD_APPWRITE_ENDPOINT="https://cloud.appwrite.io/v1"
 *   $env:OLD_APPWRITE_PROJECT_ID="your_old_project_id"
 *   $env:OLD_APPWRITE_DATABASE_ID="your_old_database_id"
 *   $env:OLD_APPWRITE_COLLECTION_ID="your_old_collection_id"
 *   $env:OLD_APPWRITE_API_KEY="..."
 *   node scripts/delete-old-collection.mjs
 */
const endpoint = process.env.OLD_APPWRITE_ENDPOINT || "";
const projectId = process.env.OLD_APPWRITE_PROJECT_ID || "";
const databaseId = process.env.OLD_APPWRITE_DATABASE_ID || "";
const collectionId = process.env.OLD_APPWRITE_COLLECTION_ID || "recommendation";
const apiKey = process.env.OLD_APPWRITE_API_KEY || "";

if (!endpoint || !projectId || !databaseId || !apiKey) {
  console.error(
    "Set OLD_APPWRITE_ENDPOINT, OLD_APPWRITE_PROJECT_ID, OLD_APPWRITE_DATABASE_ID, and OLD_APPWRITE_API_KEY"
  );
  process.exit(1);
}

const headers = {
  "Content-Type": "application/json",
  "X-Appwrite-Project": projectId,
  "X-Appwrite-Key": apiKey,
};

async function main() {
  const getRes = await fetch(
    `${endpoint}/databases/${databaseId}/collections/${collectionId}`,
    { headers }
  );
  const getBody = await getRes.json().catch(() => ({}));
  if (!getRes.ok) {
    console.error(
      "Cannot find collection:",
      getRes.status,
      getBody.message || getBody
    );
    process.exit(1);
  }
  console.log("Found:", getBody.$id, "-", getBody.name);

  const listQs =
    "queries[]=" +
    encodeURIComponent(JSON.stringify({ method: "limit", values: [1] }));
  const docsRes = await fetch(
    `${endpoint}/databases/${databaseId}/collections/${collectionId}/documents?${listQs}`,
    { headers }
  );
  const docsBody = await docsRes.json().catch(() => ({}));
  console.log("Documents in old collection:", docsBody.total ?? "?");

  const delRes = await fetch(
    `${endpoint}/databases/${databaseId}/collections/${collectionId}`,
    { method: "DELETE", headers }
  );
  if (!delRes.ok && delRes.status !== 204) {
    const err = await delRes.json().catch(() => ({}));
    console.error("Delete failed:", delRes.status, err.message || err);
    process.exit(1);
  }
  console.log(
    `Deleted collection "${collectionId}" from project ${projectId} / db ${databaseId}`
  );

  const check = await fetch(
    `${endpoint}/databases/${databaseId}/collections/${collectionId}`,
    { headers }
  );
  console.log(
    "Verify after delete:",
    check.status,
    check.status === 404 ? "(gone)" : await check.text()
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
