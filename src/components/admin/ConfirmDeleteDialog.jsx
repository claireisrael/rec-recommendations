"use client";

import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";

/**
 * @param {{
 *   open: boolean,
 *   title?: string,
 *   description?: string,
 *   confirming?: boolean,
 *   onConfirm: () => void,
 *   onCancel: () => void
 * }} props
 */
export function ConfirmDeleteDialog({
  open,
  title = "Delete recommendation?",
  description = "This cannot be undone. The recommendation and its actions will be permanently removed.",
  confirming = false,
  onConfirm,
  onCancel,
}) {
  return (
    <Dialog open={open} onClose={onCancel} className="max-w-md">
      <div className="p-6 sm:p-7">
        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-50 text-red-600">
          <Trash2 className="h-6 w-6" />
        </div>
        <h2 className="text-xl font-bold text-primary pr-8">{title}</h2>
        <p className="mt-2 text-sm font-light leading-relaxed text-muted">
          {description}
        </p>
        <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            disabled={confirming}
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant="destructive"
            onClick={onConfirm}
            disabled={confirming}
          >
            {confirming ? "Deleting…" : "Delete"}
          </Button>
        </div>
      </div>
    </Dialog>
  );
}
