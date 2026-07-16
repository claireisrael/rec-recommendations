"use client";

import { AuthProvider } from "@/lib/hooks/useAuth";
import { Toaster } from "sonner";

/**
 * @param {{ children: import("react").ReactNode }} props
 */
export function AppwriteProvider({ children }) {
  return (
    <AuthProvider>
      {children}
      <Toaster
        position="top-right"
        richColors
        closeButton
        toastOptions={{
          style: {
            fontFamily: "var(--font-sans)",
          },
        }}
      />
    </AuthProvider>
  );
}
