/**
 * Delete an evidence bucket from a previous Appwrite project (one-off cleanup).
 *
 * Usage (PowerShell):
 *   $env:OLD_APPWRITE_ENDPOINT="https://cloud.appwrite.io/v1"
 *   $env:OLD_APPWRITE_PROJECT_ID="your_old_project_id"
 *   $env:OLD_APPWRITE_BUCKET_ID="your_old_bucket_id"
 *   $env:OLD_APPWRITE_API_KEY="..."
 *   node scripts/delete-old-bucket.mjs
 */
const endpoint = process.env.OLD_APPWRITE_ENDPOINT || "";
const projectId = process.env.OLD_APPWRITE_PROJECT_ID || "";
const bucketId = process.env.OLD_APPWRITE_BUCKET_ID || "";
const apiKey = process.env.OLD_APPWRITE_API_KEY || "";

if (!endpoint || !projectId || !bucketId || !apiKey) {
  console.error(
    "Set OLD_APPWRITE_ENDPOINT, OLD_APPWRITE_PROJECT_ID, OLD_APPWRITE_BUCKET_ID, and OLD_APPWRITE_API_KEY"
  );
  process.exit(1);
}

const headers = {
  "Content-Type": "application/json",
  "X-Appwrite-Project": projectId,
  "X-Appwrite-Key": apiKey,
};

async function main() {
  const getRes = await fetch(`${endpoint}/storage/buckets/${bucketId}`, {
    headers,
  });
  const getBody = await getRes.json().catch(() => ({}));
  if (!getRes.ok) {
    console.error(
      "Cannot find bucket:",
      getRes.status,
      getBody.message || getBody
    );
    process.exit(1);
  }
  console.log("Found bucket:", getBody.name || bucketId);

  const delRes = await fetch(`${endpoint}/storage/buckets/${bucketId}`, {
    method: "DELETE",
    headers,
  });
  if (!delRes.ok) {
    const delBody = await delRes.json().catch(() => ({}));
    console.error(
      "Delete failed:",
      delRes.status,
      delBody.message || delBody
    );
    process.exit(1);
  }
  console.log("Bucket deleted.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
