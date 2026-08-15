"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { signIn } from "next-auth/react";
import { X, Lock, Mail, User, ShieldCheck, AlertCircle, Loader2, Eye, EyeOff } from "lucide-react";
import { isAllowedEmailDomain } from "@/lib/email-validator";

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultMode?: "signin" | "signup";
}

export function AuthModal({ isOpen, onClose, defaultMode = "signin" }: AuthModalProps) {
  const [mounted, setMounted] = useState(false);
  const [mode, setMode] = useState<"signin" | "signup">(defaultMode);
  const [step, setStep] = useState<"form" | "verify" | "forgot">("form");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [otp, setOtp] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Resend cooldown ticker
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const t = setTimeout(() => setResendCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [resendCooldown]);

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setMode(defaultMode);
      setStep("form");
      setOtp("");
      setError(null);
      setSuccess(null);
      setShowPassword(false);
    }
  }, [isOpen, defaultMode]);

  if (!isOpen || !mounted) return null;

  // Sign-in errors come back opaque from NextAuth ("CredentialsSignin"),
  // so check whether the real cause is an unverified email and switch to
  // the OTP step if so.
  const handleSignInError = async (cleanEmail: string, err: string) => {
    try {
      const res = await fetch(
        `/api/auth/verify-status?email=${encodeURIComponent(cleanEmail)}`
      );
      const state = await res.json();
      if (state?.exists && !state?.verified) {
        setStep("verify");
        setError(
          "Your email isn't verified yet. Enter the 6-digit code we sent you, or request a new one below."
        );
        setLoading(false);
        return;
      }
    } catch {
      // fall through to the generic error
    }
    setError(err === "CredentialsSignin" ? "Invalid email or password." : err);
    setLoading(false);
  };

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const cleanEmail = email.toLowerCase().trim();

    if (!/^\d{6}$/.test(otp)) {
      setError("Please enter the 6-digit code from your email.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/auth/verify-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: cleanEmail, otp }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Verification failed.");
        setLoading(false);
        return;
      }

      setSuccess("Email verified! Signing you in...");

      // If we still hold the password (fresh signup), auto sign-in;
      // otherwise send the user to the sign-in form.
      if (password) {
        const signInRes = await signIn("credentials", {
          redirect: false,
          email: cleanEmail,
          password,
        });
        if (signInRes?.error) {
          setSuccess(null);
          setStep("form");
          setMode("signin");
          setError("Email verified! Please sign in with your password.");
        } else {
          window.location.reload();
        }
      } else {
        setSuccess(null);
        setStep("form");
        setMode("signin");
        setError("Email verified! Please sign in with your password.");
      }
      setLoading(false);
    } catch (err: any) {
      setError(err?.message || "An unexpected error occurred.");
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (resendCooldown > 0) return;
    setError(null);
    const cleanEmail = email.toLowerCase().trim();
    if (!cleanEmail) {
      setError("Please enter your email address first.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/auth/resend-verification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: cleanEmail }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Failed to resend the code.");
      } else {
        setSuccess(data.message || `A new code was sent to ${cleanEmail}.`);
        setResendCooldown(30);
      }
    } catch (err: any) {
      setError(err?.message || "Failed to resend the code.");
    }
    setLoading(false);
  };

  const handleGoogleSignIn = () => {
    setError("Google sign-in is not available yet. Please use email and password.");
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    const cleanEmail = email.toLowerCase().trim();
    if (!cleanEmail) {
      setError("Please enter your email address first.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: cleanEmail }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Failed to send the reset email.");
      } else {
        setSuccess(data.message || "If an account exists, a reset link has been sent.");
      }
    } catch (err: any) {
      setError(err?.message || "Failed to send the reset email.");
    }
    setLoading(false);
  };

  const handleCredentialsAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    const cleanEmail = email.toLowerCase().trim();

    if (!cleanEmail || !password) {
      setError("Please fill in all fields.");
      return;
    }

    if (mode === "signup" && !isAllowedEmailDomain(cleanEmail)) {
      setError(
        "Only trusted email providers (Gmail, Outlook, Yahoo, iCloud, Proton) are supported for registration. .edu and disposable emails are blocked."
      );
      return;
    }

    setLoading(true);

    if (mode === "signup") {
      try {
        const res = await fetch("/api/auth/register", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name, email: cleanEmail, password }),
        });
        const data = await res.json();

        if (!res.ok) {
          setError(data.error || "Failed to create account.");
          setLoading(false);
          return;
        }

        // Account created (or unverified one re-armed) — verify via OTP.
        setStep("verify");
        setError(null);
        setSuccess(
          data.message ||
            `We sent a 6-digit verification code to ${cleanEmail}. Enter it below.`
        );
        setLoading(false);
      } catch (err: any) {
        setError(err?.message || "An unexpected error occurred.");
        setLoading(false);
      }
    } else {
      // Sign in mode
      try {
        const res = await signIn("credentials", {
          redirect: false,
          email: cleanEmail,
          password,
        });

        if (res?.error) {
          await handleSignInError(cleanEmail, res.error);
        } else {
          window.location.reload();
        }
      } catch (err: any) {
        setError(err?.message || "Failed to sign in.");
        setLoading(false);
      }
    }
  };

  const modalContent = (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/75 p-4 backdrop-blur-md animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-md rounded-2xl border border-border bg-surface p-6 shadow-2xl transition-all"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute right-4 top-4 rounded-lg p-2 text-muted-foreground hover:bg-surface-2 hover:text-foreground transition-colors"
          aria-label="Close modal"
        >
          <X className="h-4 w-4" />
        </button>

        {/* Header */}
        <div className="mb-6 text-center">
          <div className="mx-auto mb-3 inline-flex h-11 w-11 items-center justify-center rounded-xl bg-garden/10 text-garden ring-1 ring-garden/30">
            <Lock className="h-5 w-5" />
          </div>
          <h2 className="text-xl font-serif font-bold text-heading">
            {step === "verify"
              ? "Verify Your Email"
              : step === "forgot"
                ? "Reset Your Password"
                : mode === "signin"
                  ? "Welcome Back"
                  : "Create an Account"}
          </h2>
          <p className="mt-1 text-xs text-muted-foreground">
            {step === "verify"
              ? `Enter the 6-digit code we sent to ${email.toLowerCase().trim() || "your email"}.`
              : step === "forgot"
                ? "Enter your account email and we'll send you a reset link."
                : mode === "signin"
                  ? "Sign in to unlock member notes, post, and join discussions."
                  : "Join our digital garden community with a verified email."}
          </p>
        </div>

        {/* Error / Success Banners */}
        {error && (
          <div className="mb-4 flex items-start gap-2.5 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-xs text-destructive">
            <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div className="mb-4 flex items-start gap-2.5 rounded-lg border border-garden/30 bg-garden/10 p-3 text-xs text-garden">
            <ShieldCheck className="h-4 w-4 flex-shrink-0 mt-0.5" />
            <span>{success}</span>
          </div>
        )}

        {step === "forgot" ? (
          <form onSubmit={handleForgotPassword} className="space-y-3.5">
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">
                Account Email
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground pointer-events-none" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@gmail.com"
                  autoComplete="email"
                  className="w-full rounded-lg border border-border bg-surface-2 py-2 pl-9 pr-3 text-xs text-foreground placeholder:text-muted-foreground/50 transition-colors focus:border-garden focus:outline-none focus:ring-1 focus:ring-garden/40"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl bg-garden px-4 py-2.5 text-sm font-semibold text-garden-foreground transition-transform hover:opacity-90 active:scale-[0.98] disabled:opacity-50"
            >
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              <span>Send Reset Link</span>
            </button>

            <div className="pt-1 text-center">
              <button
                type="button"
                onClick={() => {
                  setStep("form");
                  setError(null);
                  setSuccess(null);
                }}
                className="text-xs text-muted-foreground underline hover:text-foreground transition-colors"
              >
                ← Back to sign in
              </button>
            </div>
          </form>
        ) : step === "verify" ? (
          <form onSubmit={handleVerify} className="space-y-3.5">
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">
                Verification Code
              </label>
              <div className="relative">
                <ShieldCheck className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground pointer-events-none" />
                <input
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  maxLength={6}
                  required
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
                  placeholder="••••••"
                  className="w-full rounded-lg border border-border bg-surface-2 py-2 pl-9 pr-3 text-center text-base tracking-[0.5em] text-foreground placeholder:text-muted-foreground/50 transition-colors focus:border-garden focus:outline-none focus:ring-1 focus:ring-garden/40"
                />
              </div>
              <p className="mt-1 text-[10px] text-muted-foreground/70">
                The code expires in 15 minutes.
              </p>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl bg-garden px-4 py-2.5 text-sm font-semibold text-garden-foreground transition-transform hover:opacity-90 active:scale-[0.98] disabled:opacity-50"
            >
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              <span>Verify Account</span>
            </button>

            <button
              type="button"
              onClick={handleResend}
              disabled={loading || resendCooldown > 0}
              className="w-full rounded-xl border border-border px-4 py-2 text-xs font-medium text-muted-foreground transition-colors hover:border-garden/40 hover:text-foreground disabled:opacity-50"
            >
              {resendCooldown > 0
                ? `Resend code in ${resendCooldown}s`
                : "Didn't get the code? Resend it"}
            </button>

            <div className="pt-1 text-center">
              <button
                type="button"
                onClick={() => {
                  setStep("form");
                  setOtp("");
                  setError(null);
                  setSuccess(null);
                }}
                className="text-xs text-muted-foreground underline hover:text-foreground transition-colors"
              >
                ← Back
              </button>
            </div>
          </form>
        ) : (
          <>
        {/* Google 1-Click Button — hidden when OAuth isn't configured */}
        <button
          type="button"
          onClick={handleGoogleSignIn}
          className="flex w-full items-center justify-center gap-3 rounded-xl border border-border bg-surface-2 px-4 py-2.5 text-sm font-medium text-foreground transition-all hover:border-garden/40 hover:bg-surface-2/80 active:scale-[0.99]"
        >
          {/* Official Google SVG Icon */}
          <svg className="h-4 w-4" viewBox="0 0 24 24">
            <path
              fill="#4285F4"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            />
            <path
              fill="#34A853"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
              fill="#FBBC05"
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
            />
            <path
              fill="#EA4335"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
            />
          </svg>
          <span>Continue with Google</span>
        </button>

        {/* Divider */}
        <div className="my-5 flex items-center gap-3">
          <div className="h-px flex-1 bg-border/60" />
          <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
            Or with email
          </span>
          <div className="h-px flex-1 bg-border/60" />
        </div>

        {/* Email Form */}
        <form onSubmit={handleCredentialsAuth} className="space-y-3.5">
          {mode === "signup" && (
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">
                Your Name / Username
              </label>
              <div className="relative">
                <User className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground pointer-events-none" />
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Alex Rivers"
                  autoComplete="name"
                  className="w-full rounded-lg border border-border bg-surface-2 py-2 pl-9 pr-3 text-xs text-foreground placeholder:text-muted-foreground/50 transition-colors focus:border-garden focus:outline-none focus:ring-1 focus:ring-garden/40"
                />
              </div>
            </div>
          )}

          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">
              Email Address
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground pointer-events-none" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@gmail.com"
                autoComplete="email"
                className="w-full rounded-lg border border-border bg-surface-2 py-2 pl-9 pr-3 text-xs text-foreground placeholder:text-muted-foreground/50 transition-colors focus:border-garden focus:outline-none focus:ring-1 focus:ring-garden/40"
              />
            </div>
            {mode === "signup" && (
              <p className="mt-1 text-[10px] text-muted-foreground/70">
                Supported: Gmail, Outlook, Yahoo, iCloud, Proton (.edu blocked).
              </p>
            )}
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">
              Password
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground pointer-events-none" />
              <input
                type={showPassword ? "text" : "password"}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                autoComplete={mode === "signin" ? "current-password" : "new-password"}
                className="w-full rounded-lg border border-border bg-surface-2 py-2 pl-9 pr-10 text-xs text-foreground placeholder:text-muted-foreground/50 transition-colors focus:border-garden focus:outline-none focus:ring-1 focus:ring-garden/40"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-2.5 top-2 rounded p-1 text-muted-foreground hover:text-foreground transition-colors"
                title={showPassword ? "Hide password" : "Show password"}
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? (
                  <EyeOff className="h-3.5 w-3.5" />
                ) : (
                  <Eye className="h-3.5 w-3.5" />
                )}
              </button>
            </div>
            {mode === "signin" && (
              <div className="mt-1.5 text-right">
                <button
                  type="button"
                  onClick={() => {
                    setStep("forgot");
                    setError(null);
                    setSuccess(null);
                  }}
                  className="text-[11px] text-muted-foreground underline hover:text-garden transition-colors"
                >
                  Forgot password?
                </button>
              </div>
            )}
          </div>

          <button
            type="submit"
            disabled={loading}
            className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl bg-garden px-4 py-2.5 text-sm font-semibold text-garden-foreground transition-transform hover:opacity-90 active:scale-[0.98] disabled:opacity-50"
          >
            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
            <span>{mode === "signin" ? "Sign In" : "Create Account"}</span>
          </button>
        </form>

        {/* Mode Toggle */}
        <div className="mt-5 text-center text-xs text-muted-foreground">
          {mode === "signin" ? (
            <span>
              Don&apos;t have an account?{" "}
              <button
                type="button"
                onClick={() => {
                  setMode("signup");
                  setError(null);
                }}
                className="font-medium text-garden underline hover:opacity-80 transition-opacity"
              >
                Sign up
              </button>
            </span>
          ) : (
            <span>
              Already have an account?{" "}
              <button
                type="button"
                onClick={() => {
                  setMode("signin");
                  setError(null);
                }}
                className="font-medium text-garden underline hover:opacity-80 transition-opacity"
              >
                Sign in
              </button>
            </span>
          )}
        </div>
          </>
        )}
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}
