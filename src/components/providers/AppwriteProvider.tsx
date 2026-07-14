"use client";

import { AuthProvider } from "@/lib/hooks/useAuth";
import { Toaster } from "sonner";
import type { ReactNode } from "react";

export function AppwriteProvider({ children }: { children: ReactNode }) {
  return (
    <AuthProvider>
      {children}
      <Toaster
        position="top-right"
        richColors
        closeButton
        toastOptions={{
          style: {
            fontFamily: "var(--font-poppins)",
          },
        }}
      />
    </AuthProvider>
  );
}
