import type { ReactNode } from "react";

export function AdminPageContent({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 ${className}`.trim()}
    >
      {children}
    </div>
  );
}
