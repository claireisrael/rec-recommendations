"use client";

import { useState } from "react";
import {
  isEvidenceLink,
  formatEvidenceLinkLabel,
  getEvidenceRef,
  getEvidenceFileName,
} from "@/lib/evidence";
import { uploadEvidenceFile, getEvidenceFileUrl } from "@/lib/appwrite/storage";
import { appwriteConfig } from "@/lib/appwrite/config";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Loader2, Upload, X, Plus, ExternalLink, FileText } from "lucide-react";
import { toast } from "sonner";

/**
 * @param {{
 *   evidence?: import("@/lib/evidence").EvidenceItem[];
 *   onChange: (evidence: import("@/lib/evidence").EvidenceItem[]) => void;
 *   error?: string;
 * }} props
 */
export function ActionEvidenceField({ evidence = [], onChange, error }) {
  const [uploading, setUploading] = useState(false);
  const [linkInput, setLinkInput] = useState("");

  const addLink = () => {
    const trimmed = linkInput.trim();
    if (!trimmed) return;
    try {
      new URL(trimmed);
      onChange([...evidence, trimmed]);
      setLinkInput("");
    } catch {
      toast.error("Enter a valid URL (https://...)");
    }
  };

  const handleFileUpload = async (e) => {
    const files = e.target.files;
    if (!files?.length) return;

    setUploading(true);
    try {
      /** @type {import("@/lib/evidence").EvidenceFile[]} */
      const uploaded = [];
      for (const file of Array.from(files)) {
        const result = await uploadEvidenceFile(file);
        uploaded.push({
          fileId: result.fileId,
          fileName: result.fileName || file.name,
        });
      }
      onChange([...evidence, ...uploaded]);
      toast.success(
        uploaded.length === 1
          ? `Uploaded “${uploaded[0].fileName}”`
          : `${uploaded.length} documents uploaded`
      );
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to upload document";
      const bucketId = appwriteConfig.evidenceBucketId;
      toast.error(
        message.includes("bucket") || message.includes("not found")
          ? `Upload failed — check bucket "${bucketId}" exists in Appwrite Storage (project ${appwriteConfig.projectId}) and allows Create for Users.`
          : message
      );
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  const removeItem = (index) => {
    onChange(evidence.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-3">
      <Label>Action Evidence (optional)</Label>
      <p className="text-xs text-muted font-light">
        Add links or upload documents proving this action. Click a document to
        open it.
      </p>

      {evidence.length > 0 && (
        <ul className="space-y-1.5">
          {evidence.map((item, i) => {
            const ref = getEvidenceRef(item);
            if (!ref) return null;
            return (
              <li
                key={`${ref}-${i}`}
                className="flex items-center justify-between gap-2 rounded-lg border border-border bg-gray-50 px-3 py-2"
              >
                <span className="flex min-w-0 flex-1 items-center gap-2 text-sm text-gray-700">
                  {isEvidenceLink(item) ? (
                    <>
                      <ExternalLink className="h-3.5 w-3.5 shrink-0 text-primary" />
                      <a
                        href={ref}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="truncate text-primary underline-offset-2 hover:underline"
                        title={ref}
                      >
                        {formatEvidenceLinkLabel(ref)}
                      </a>
                    </>
                  ) : (
                    <>
                      <FileText className="h-3.5 w-3.5 shrink-0 text-primary" />
                      <a
                        href={getEvidenceFileUrl(ref)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="truncate text-primary underline-offset-2 hover:underline"
                        title={`Open ${getEvidenceFileName(item)}`}
                      >
                        {getEvidenceFileName(item)}
                      </a>
                    </>
                  )}
                </span>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => removeItem(i)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </li>
            );
          })}
        </ul>
      )}

      <div className="flex gap-2">
        <Input
          value={linkInput}
          onChange={(e) => setLinkInput(e.target.value)}
          placeholder="https://example.com/evidence"
          type="url"
          onBlur={() => linkInput.trim() && addLink()}
          onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addLink())}
        />
        <Button type="button" variant="outline" size="sm" onClick={addLink}>
          <Plus className="h-4 w-4" />
          Add link
        </Button>
      </div>

      <label className="flex cursor-pointer items-center justify-center gap-2 rounded-lg border-2 border-dashed border-border px-4 py-4 transition-colors hover:border-primary/40 hover:bg-primary/5">
        {uploading ? (
          <Loader2 className="h-5 w-5 animate-spin text-primary" />
        ) : (
          <Upload className="h-5 w-5 text-primary" />
        )}
        <span className="text-sm font-medium text-primary">
          {uploading ? "Uploading..." : "Upload document(s)"}
        </span>
        <input
          type="file"
          className="hidden"
          multiple
          accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.png,.jpg,.jpeg"
          onChange={handleFileUpload}
          disabled={uploading}
        />
      </label>

      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  );
}
