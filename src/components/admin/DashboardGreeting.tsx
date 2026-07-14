"use client";

import type { Models } from "appwrite";
import { getFirstName } from "@/lib/greeting";
import { cn } from "@/lib/utils";
import { HeartHandshake } from "lucide-react";

interface DashboardGreetingProps {
  user: Pick<Models.User<Models.Preferences>, "name" | "email"> | null;
}

export function DashboardGreeting({ user }: DashboardGreetingProps) {
  const firstName = getFirstName(user);

  return (
    <div className="relative overflow-hidden border-b border-primary/10 shadow-[0_4px_24px_rgba(11,113,134,0.06)]">
      <div
        className="absolute inset-0 bg-gradient-to-r from-primary/12 via-secondary/15 to-white"
        aria-hidden
      />
      <div
        className="absolute -top-10 right-0 h-40 w-40 rounded-full bg-secondary/15 blur-3xl"
        aria-hidden
      />
      <div
        className="absolute -bottom-12 left-0 h-36 w-36 rounded-full bg-primary/10 blur-3xl"
        aria-hidden
      />

      <div className="relative flex items-start gap-4 px-6 py-6 sm:px-8 sm:py-7 lg:px-10">
        <div
          className={cn(
            "flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl shadow-sm",
            "bg-secondary/20 text-secondary-dark"
          )}
        >
          <HeartHandshake className="h-7 w-7" strokeWidth={1.75} />
        </div>

        <div className="min-w-0 flex-1">
          <h2 className="text-2xl font-extrabold leading-tight text-primary sm:text-[1.75rem]">
            Thanks for showing up,{" "}
            <span className="text-secondary-dark">{firstName}</span> 🤗
          </h2>
          <p className="mt-2 max-w-xl text-sm font-medium leading-relaxed text-primary/75 sm:text-[15px]">
            Any REC Recommendation?
          </p>
        </div>
      </div>
    </div>
  );
}
