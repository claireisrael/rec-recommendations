import { forwardRef } from "react";
import { cva } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 disabled:pointer-events-none disabled:opacity-50 cursor-pointer",
  {
    variants: {
      variant: {
        default:
          "bg-primary text-white hover:bg-primary-dark shadow-[0_2px_8px_rgba(46, 158, 204,0.18)] hover:shadow-[0_4px_12px_rgba(46, 158, 204,0.22)]",
        secondary:
          "bg-secondary text-black hover:bg-secondary-dark hover:text-black shadow-sm",
        outline:
          "border border-primary text-primary bg-white hover:bg-primary/5",
        ghost: "text-muted hover:bg-primary-soft hover:text-primary",
        destructive:
          "bg-red-500 text-white hover:bg-red-600 shadow-sm",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-10 px-5",
        sm: "h-8 rounded-md px-3 text-xs",
        lg: "h-12 rounded-xl px-8 text-base",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

/**
 * @param {import("react").ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "default" | "secondary" | "outline" | "ghost" | "destructive" | "link", size?: "default" | "sm" | "lg" | "icon" }} props
 * @param {import("react").ForwardedRef<HTMLButtonElement>} ref
 */
function ButtonInner({ className, variant, size, ...props }, ref) {
  return (
    <button
      className={cn(buttonVariants({ variant, size, className }))}
      ref={ref}
      {...props}
    />
  );
}

const Button = forwardRef(ButtonInner);
Button.displayName = "Button";

export { Button, buttonVariants };
