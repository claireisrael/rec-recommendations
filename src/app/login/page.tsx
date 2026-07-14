"use client";

import { useState, Suspense, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { useAuth } from "@/lib/hooks/useAuth";
import {
  getRememberedEmail,
  isRememberMeEnabled,
  saveRememberMe,
} from "@/lib/auth/rememberMe";
import { NrepLogo } from "@/components/brand/NrepLogo";
import { LandingPhotoSlider } from "@/components/public/LandingPhotoSlider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import Link from "next/link";
import { Eye, EyeOff, Loader2, Lock, Mail } from "lucide-react";

const loginInputClass =
  "h-12 rounded-xl border-transparent bg-[#eef4fc] pl-11 pr-4 text-[15px] placeholder:text-gray-400 focus:bg-white focus:border-primary/25 focus:ring-primary/20";

function LoginForm() {
  const searchParams = useSearchParams();
  const { login, loading: authLoading, user } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const redirect = searchParams.get("redirect") ?? "/admin";

  useEffect(() => {
    setRememberMe(isRememberMeEnabled());
    setEmail(getRememberedEmail());
  }, []);

  useEffect(() => {
    if (!authLoading && user) {
      window.location.assign(redirect);
    }
  }, [authLoading, user, redirect]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await login(email, password);
      saveRememberMe(email, rememberMe);
      toast.success("Welcome back!");
      window.location.assign(redirect);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Invalid email or password"
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  if (authLoading) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="flex h-full w-full max-w-[440px] mx-auto flex-col">
      <div className="login-card flex h-full min-h-0 flex-col bg-white/94 backdrop-blur-[2px] rounded-2xl shadow-[0_8px_40px_rgba(11,113,134,0.1)] border border-white/70 px-8 py-8 lg:px-10 lg:py-10">
        <div className="flex flex-col items-center text-center shrink-0">
          <NrepLogo height={72} priority className="mb-6" />
          <h1 className="text-3xl font-bold text-foreground tracking-tight">
            Sign In
          </h1>
          <p className="text-[15px] text-muted mt-2 font-normal">
            Enter your credentials to access your account
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="mt-8 flex flex-1 flex-col justify-center space-y-5 min-h-0"
        >
          <div>
            <Label
              htmlFor="email"
              className="text-sm font-medium text-gray-700 mb-2 block"
            >
              Email Address
            </Label>
            <div className="relative">
              <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-[18px] w-[18px] text-gray-400" />
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
                autoComplete="email"
                className={loginInputClass}
              />
            </div>
          </div>

          <div>
            <Label
              htmlFor="password"
              className="text-sm font-medium text-gray-700 mb-2 block"
            >
              Password
            </Label>
            <div className="relative">
              <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-[18px] w-[18px] text-gray-400" />
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                autoComplete={rememberMe ? "current-password" : "password"}
                className={cn(loginInputClass, "pr-11")}
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? (
                  <EyeOff className="h-[18px] w-[18px]" />
                ) : (
                  <Eye className="h-[18px] w-[18px]" />
                )}
              </button>
            </div>
          </div>

          <label className="flex items-center gap-2.5 cursor-pointer select-none pt-1">
            <input
              type="checkbox"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
              className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary/30 cursor-pointer"
            />
            <span className="text-sm text-gray-600">Remember me</span>
          </label>

          <Button
            type="submit"
            className="w-full h-12 rounded-xl text-[15px] font-semibold shadow-sm"
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Signing in...
              </>
            ) : (
              "Sign In"
            )}
          </Button>
        </form>

        <div className="mt-auto shrink-0 pt-8 text-center border-t border-gray-100">
          <p className="text-sm text-gray-600">
            Need public access?{" "}
            <Link
              href="/guest"
              className="text-primary font-semibold hover:text-primary-light transition-colors"
            >
              View Guest Dashboard
            </Link>
          </p>
          <p className="text-xs text-muted mt-3">
            <Link href="/" className="hover:text-primary transition-colors">
              Back to home
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

function LoginCarousel({ className }: { className?: string }) {
  return (
    <div className={cn("relative h-full min-h-0 overflow-hidden", className)}>
      <LandingPhotoSlider />
    </div>
  );
}

export default function LoginPage() {
  return (
    <div className="grid min-h-screen h-[100dvh] grid-rows-[42vh_58vh] lg:grid-rows-1 lg:grid-cols-2 lg:h-screen lg:overflow-hidden">
      <LoginCarousel className="min-h-0" />

      <div className="login-form-panel relative flex min-h-0 flex-col overflow-hidden">
        <div className="login-form-panel-bg" aria-hidden />
        <div className="relative z-10 flex h-full min-h-0 flex-col p-6 sm:p-8 lg:p-10">
          <Suspense
            fallback={
              <div className="flex flex-1 items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            }
          >
            <LoginForm />
          </Suspense>
        </div>
      </div>
    </div>
  );
}
