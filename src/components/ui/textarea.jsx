import { forwardRef } from "react";
import { cn } from "@/lib/utils";

/**
 * @param {import("react").TextareaHTMLAttributes<HTMLTextAreaElement>} props
 * @param {import("react").ForwardedRef<HTMLTextAreaElement>} ref
 */
function TextareaInner({ className, ...props }, ref) {
  return (
    <textarea
      className={cn(
        "flex min-h-[120px] w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-normal text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary disabled:cursor-not-allowed disabled:opacity-50 transition-colors resize-y",
        className
      )}
      ref={ref}
      {...props}
    />
  );
}

const Textarea = forwardRef(TextareaInner);
Textarea.displayName = "Textarea";

export { Textarea };
