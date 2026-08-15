"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Loader2, KeyRound, AlertCircle, CheckCircle2, Eye, EyeOff } from "lucide-react";

function ResetPasswordContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  const [status, setStatus] = useState<"checking" | "ready" | "saving" | "success" | "error">(
    "checking"
  );
  const [message, setMessage] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    if (!token) {
      setStatus("error");
      setMessage(
        "No reset token found. Please open the reset link from your email, or request a new one."
      );
      return;
    }

    fetch(`/api/auth/reset-password?token=${encodeURIComponent(token)}`)
      .then(async (res) => {
        const data = await res.json();
        if (data.valid) {
          setStatus("ready");
        } else {
          setStatus("error");
          setMessage(
            data.reason === "expired"
              ? "This reset link has expired. Please request a new one."
              : "This reset link is invalid or has already been used. Please request a new one."
          );
        }
      })
      .catch(() => {
        setStatus("error");
        setMessage("Failed to validate the reset link. Please try again.");
      });
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage("");

    if (password.length < 6) {
      setMessage("Password must be at least 6 characters long.");
      return;
    }

    setStatus("saving");
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });
      const data = await res.json();

      if (res.ok) {
        setStatus("success");
      } else {
        setStatus("error");
        setMessage(data.error || "Failed to reset the password.");
      }
    } catch {
      setStatus("error");
      setMessage("Failed to reset the password. Please try again.");
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-surface p-4">
      <div className="w-full max-w-md rounded-2xl border border-border bg-surface p-8 text-center shadow-2xl">
        {status === "checking" && (
          <>
            <Loader2 className="mx-auto h-10 w-10 animate-spin text-garden" />
            <h1 className="mt-4 text-xl font-serif font-bold text-heading">
              Checking your reset link…
            </h1>
          </>
        )}

        {(status === "ready" || status === "saving") && (
          <>
            <div className="mx-auto inline-flex h-12 w-12 items-center justify-center rounded-xl bg-garden/10 text-garden ring-1 ring-garden/30">
              <KeyRound className="h-6 w-6" />
            </div>
            <h1 className="mt-4 text-xl font-serif font-bold text-heading">
              Set a New Password
            </h1>
            <p className="mt-1 text-xs text-muted-foreground">
              Choose a new password for your Garden account.
            </p>

            {message && (
              <div className="mt-4 flex items-start gap-2.5 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-left text-xs text-destructive">
                <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
                <span>{message}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="mt-5 space-y-4 text-left">
              <div>
                <label className="mb-1 block text-xs font-medium text-muted-foreground">
                  New Password
                </label>
                <div className="relative">
                  <KeyRound className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    minLength={6}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    autoComplete="new-password"
                    className="w-full rounded-lg border border-border bg-surface-2 py-2 pl-9 pr-10 text-sm text-foreground placeholder:text-muted-foreground/50 transition-colors focus:border-garden focus:outline-none focus:ring-1 focus:ring-garden/40"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-2.5 top-2 rounded p-1 text-muted-foreground hover:text-foreground transition-colors"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                <p className="mt-1 text-[10px] text-muted-foreground/70">
                  At least 6 characters.
                </p>
              </div>

              <button
                type="submit"
                disabled={status === "saving"}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-garden px-4 py-2.5 text-sm font-semibold text-garden-foreground transition-transform hover:opacity-90 active:scale-[0.98] disabled:opacity-50"
              >
                {status === "saving" && <Loader2 className="h-4 w-4 animate-spin" />}
                <span>Update Password</span>
              </button>
            </form>
          </>
        )}

        {status === "success" && (
          <>
            <CheckCircle2 className="mx-auto h-10 w-10 text-garden" />
            <h1 className="mt-4 text-xl font-serif font-bold text-heading">Password Updated</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Your password has been changed. Sign in with your new password.
            </p>
            <a
              href="/"
              className="mt-6 inline-flex items-center gap-2 rounded-xl bg-garden px-5 py-2.5 text-sm font-semibold text-garden-foreground transition-transform hover:opacity-90 active:scale-[0.98]"
            >
              <CheckCircle2 className="h-4 w-4" />
              Go to the Garden & sign in
            </a>
          </>
        )}

        {status === "error" && (
          <>
            <AlertCircle className="mx-auto h-10 w-10 text-destructive" />
            <h1 className="mt-4 text-xl font-serif font-bold text-heading">Reset Link Problem</h1>
            <p className="mt-2 text-sm text-muted-foreground">{message}</p>
            <a
              href="/"
              className="mt-6 inline-block rounded-xl border border-border px-5 py-2.5 text-sm font-medium text-foreground transition-colors hover:border-garden/40"
            >
              Back to the Garden
            </a>
          </>
        )}
      </div>
    </main>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-screen items-center justify-center bg-surface">
          <Loader2 className="h-10 w-10 animate-spin text-garden" />
        </main>
      }
    >
      <ResetPasswordContent />
    </Suspense>
  );
}
