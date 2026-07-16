/** @typedef {import("react").ReactNode} ReactNode */

/**
 * @param {{ children: ReactNode, className?: string }} props
 */
export function AdminPageContent({ children, className = "" }) {
  return (
    <div
      className={`mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8 lg:py-7 ${className}`.trim()}
    >
      {children}
    </div>
  );
}
