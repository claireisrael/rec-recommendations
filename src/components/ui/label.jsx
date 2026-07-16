import { cn } from "@/lib/utils";

/**
 * @param {import("react").LabelHTMLAttributes<HTMLLabelElement>} props
 */
function Label({ className, ...props }) {
  return (
    <label
      className={cn(
        "text-sm font-semibold text-primary leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70",
        className
      )}
      {...props}
    />
  );
}

export { Label };
