"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Loader2, MailCheck, AlertCircle, CheckCircle2 } from "lucide-react";

function VerifyEmailContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [message, setMessage] = useState("Verifying your email...");

  useEffect(() => {
    if (!token) {
      setStatus("error");
      setMessage(
        "No verification token found. Please open the link from your email, or enter the 6-digit code in the sign-in window."
      );
      return;
    }

    fetch("/api/auth/verify-email", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token }),
    })
      .then(async (res) => {
        const data = await res.json();
        if (res.ok) {
          setStatus("success");
          setMessage(data.message || "Email verified! You can now sign in.");
        } else {
          setStatus("error");
          setMessage(data.error || "Verification failed.");
        }
      })
      .catch(() => {
        setStatus("error");
        setMessage("Verification failed. Please try again.");
      });
  }, [token]);

  return (
    <main className="flex min-h-screen items-center justify-center bg-surface p-4">
      <div className="w-full max-w-md rounded-2xl border border-border bg-surface p-8 text-center shadow-2xl">
        {status === "loading" && (
          <>
            <Loader2 className="mx-auto h-10 w-10 animate-spin text-garden" />
            <h1 className="mt-4 text-xl font-serif font-bold text-heading">Verifying…</h1>
          </>
        )}
        {status === "success" && (
          <>
            <MailCheck className="mx-auto h-10 w-10 text-garden" />
            <h1 className="mt-4 text-xl font-serif font-bold text-heading">Email Verified</h1>
            <p className="mt-2 text-sm text-muted-foreground">{message}</p>
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
            <h1 className="mt-4 text-xl font-serif font-bold text-heading">Verification Problem</h1>
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

export default function VerifyEmailPage() {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-screen items-center justify-center bg-surface">
          <Loader2 className="h-10 w-10 animate-spin text-garden" />
        </main>
      }
    >
      <VerifyEmailContent />
    </Suspense>
  );
}
