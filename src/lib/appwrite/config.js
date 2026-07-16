export const appwriteConfig = {
  endpoint: process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT ?? "",
  projectId: process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID ?? "",
  databaseId: process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID ?? "rec_database",
  collectionId:
    process.env.NEXT_PUBLIC_APPWRITE_COLLECTION_ID ?? "recommendation",
  evidenceBucketId: (
    process.env.NEXT_PUBLIC_APPWRITE_EVIDENCE_BUCKET_ID ?? "rec-evidence"
  ).trim(),
};
