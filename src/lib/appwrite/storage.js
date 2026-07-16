import { ID, Permission, Role } from "appwrite";
import { getStorage } from "./client";
import { appwriteConfig } from "./config";

export function getEvidenceFileUrl(fileId) {
  return getStorage().getFileDownload({
    bucketId: appwriteConfig.evidenceBucketId,
    fileId,
  });
}

/**
 * @param {File} file
 */
export async function uploadEvidenceFile(file) {
  const uploaded = await getStorage().createFile({
    bucketId: appwriteConfig.evidenceBucketId,
    fileId: ID.unique(),
    file,
    permissions: [Permission.read(Role.any())],
  });

  return {
    fileId: uploaded.$id,
    fileName: uploaded.name,
  };
}
