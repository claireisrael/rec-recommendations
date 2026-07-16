import { cn } from "@/lib/utils";
import { forwardRef } from "react";

/**
 * @param {import("react").HTMLAttributes<HTMLDivElement>} props
 * @param {import("react").ForwardedRef<HTMLDivElement>} ref
 */
function CardInner({ className, ...props }, ref) {
  return (
    <div
      ref={ref}
      className={cn(
        "rounded-2xl border border-primary/[0.06] bg-white/95 shadow-[0_2px_12px_rgba(0,0,0,0.04)] backdrop-blur",
        className
      )}
      {...props}
    />
  );
}

/**
 * @param {import("react").HTMLAttributes<HTMLDivElement>} props
 * @param {import("react").ForwardedRef<HTMLDivElement>} ref
 */
function CardHeaderInner({ className, ...props }, ref) {
  return (
    <div
      ref={ref}
      className={cn("flex flex-col space-y-1.5 p-6", className)}
      {...props}
    />
  );
}

/**
 * @param {import("react").HTMLAttributes<HTMLHeadingElement>} props
 * @param {import("react").ForwardedRef<HTMLHeadingElement>} ref
 */
function CardTitleInner({ className, ...props }, ref) {
  return (
    <h3
      ref={ref}
      className={cn(
        "text-base font-semibold text-primary leading-snug tracking-tight",
        className
      )}
      {...props}
    />
  );
}

/**
 * @param {import("react").HTMLAttributes<HTMLDivElement>} props
 * @param {import("react").ForwardedRef<HTMLDivElement>} ref
 */
function CardContentInner({ className, ...props }, ref) {
  return <div ref={ref} className={cn("p-6 pt-0", className)} {...props} />;
}

const Card = forwardRef(CardInner);
const CardHeader = forwardRef(CardHeaderInner);
const CardTitle = forwardRef(CardTitleInner);
const CardContent = forwardRef(CardContentInner);

Card.displayName = "Card";
CardHeader.displayName = "CardHeader";
CardTitle.displayName = "CardTitle";
CardContent.displayName = "CardContent";

export { Card, CardHeader, CardTitle, CardContent };
