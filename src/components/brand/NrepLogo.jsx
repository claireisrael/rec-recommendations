import Image from "next/image";
import { cn } from "@/lib/utils";

/**
 * @param {{ className?: string, height?: number, priority?: boolean, onDark?: boolean }} props
 */
export function NrepLogo({
  className,
  height = 48,
  priority = false,
  onDark = false,
}) {
  return (
    <Image
      src="/nrep-logo.png"
      alt="NREP"
      width={Math.round(height * 2.8)}
      height={height}
      priority={priority}
      className={cn("object-contain", onDark && "mix-blend-screen", className)}
      style={{ height, width: "auto" }}
    />
  );
}
