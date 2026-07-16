"use client";

import { Button } from "@/components/ui/button";
import Link from "next/link";

/**
 * @param {{ error: Error & { digest?: string }, reset: () => void }} props
 */
export default function PublicError({ reset }) {
  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="text-center max-w-md">
        <h2 className="text-2xl font-bold text-primary mb-2">
          Failed to load recommendations
        </h2>
        <p className="text-muted font-light mb-6">
          There was a problem fetching data. Please check your Appwrite
          configuration.
        </p>
        <div className="flex gap-3 justify-center">
          <Button onClick={reset}>Try Again</Button>
          <Link href="/">
            <Button variant="outline">Go Home</Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
