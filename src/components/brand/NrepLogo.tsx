import Image from "next/image";
import { cn } from "@/lib/utils";

interface NrepLogoProps {
  className?: string;
  height?: number;
  priority?: boolean;
  /** Removes black background on dark surfaces */
  onDark?: boolean;
}

export function NrepLogo({
  className,
  height = 48,
  priority = false,
  onDark = false,
}: NrepLogoProps) {
  return (
    <Image
      src="/nrep-logo.png"
      alt="NREP"
      width={Math.round(height * 2.8)}
      height={height}
      priority={priority}
      className={cn(
        "object-contain",
        onDark && "mix-blend-screen",
        className
      )}
      style={{ height, width: "auto" }}
    />
  );
}
