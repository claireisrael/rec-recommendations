import { z } from "zod";
import { isEvidenceLink } from "@/lib/evidence";

// Field length limits are intentionally NOT enforced here.
// Appwrite is the single source of truth for attribute sizes; it will reject
// anything too long, and that message is surfaced to the user.

const actionSchema = z.object({
  text: z.string().min(1, "Action text is required"),
  scoreTier: z.enum(
    [
      "poor",
      "fair",
      "average",
      "good",
      "very_good",
      "excellent",
      "exceptional",
    ],
    {
      error: "Please select a score rating",
    }
  ),
  partner: z.string().min(1, "Action implementation partner is required"),
  evidence: z.array(
    z.string().refine(
      (val) => {
        if (!val.trim()) return false;
        if (isEvidenceLink(val)) {
          try {
            new URL(val);
            return true;
          } catch {
            return false;
          }
        }
        return true;
      },
      { message: "Enter a valid URL (https://...)" }
    )
  ),
});

export const recommendationSchema = z.object({
  recommendation: z.string().min(1, "Recommendation is required"),
  year: z
    .number({ error: "Year is required" })
    .int()
    .min(2020, "Year must be 2020 or later")
    .max(2040, "Year must be 2040 or earlier"),
  actions: z
    .array(actionSchema)
    .min(1, "At least one action is required"),
  // No max() — admins can add as many actions as needed.
  comments: z.string().optional(),
  status: z.enum(["planned", "in_progress", "completed"]),
});
export type RecommendationFormData = z.infer<typeof recommendationSchema>;
