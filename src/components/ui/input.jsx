import { forwardRef } from "react";
import { cn } from "@/lib/utils";

/**
 * @param {import("react").InputHTMLAttributes<HTMLInputElement>} props
 * @param {import("react").ForwardedRef<HTMLInputElement>} ref
 */
function InputInner({ className, type, ...props }, ref) {
  return (
    <input
      type={type}
      className={cn(
        "flex h-10 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-normal text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary disabled:cursor-not-allowed disabled:opacity-50 transition-colors",
        className
      )}
      ref={ref}
      {...props}
    />
  );
}

const Input = forwardRef(InputInner);
Input.displayName = "Input";

export { Input };
