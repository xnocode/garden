"use client";

import { useEffect } from "react";
import { RotateCcw, Sprout, AlertCircle, Trash2 } from "lucide-react";
import { clearGardenCachesAndReload } from "@/components/garden/pwa";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Garden app client error:", error);
  }, [error]);

  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center px-4 py-16 text-center">
      <div className="mx-auto max-w-md rounded-2xl border border-border/80 bg-surface/70 p-6 sm:p-8 backdrop-blur-xl shadow-2xl">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-destructive/10 text-destructive ring-1 ring-destructive/20">
          <AlertCircle className="h-6 w-6" />
        </div>

        <h2 className="font-serif text-xl sm:text-2xl font-bold text-heading">
          Garden Encountered a Hiccup
        </h2>

        <p className="mt-3 text-sm text-muted-foreground leading-relaxed">
          {error.message && error.message.includes("chunk")
            ? "A new update was deployed while you were browsing. Refreshing will load the latest version."
            : "An unexpected client issue occurred. You can retry loading or clear temporary caches."}
        </p>

        {error.digest && (
          <p className="mt-2 font-mono text-[11px] text-muted-foreground/60">
            Error ID: {error.digest}
          </p>
        )}

        <div className="mt-6 flex flex-col sm:flex-row items-center justify-center gap-3">
          <button
            type="button"
            onClick={() => reset()}
            className="inline-flex w-full sm:w-auto items-center justify-center gap-2 rounded-xl bg-garden px-4 py-2.5 text-xs font-semibold text-garden-foreground shadow-sm transition-all hover:opacity-90 active:scale-[0.98]"
          >
            <RotateCcw className="h-4 w-4" />
            <span>Try Again</span>
          </button>

          <button
            type="button"
            onClick={() => clearGardenCachesAndReload()}
            className="inline-flex w-full sm:w-auto items-center justify-center gap-2 rounded-xl border border-border bg-surface px-4 py-2.5 text-xs font-semibold text-foreground transition-all hover:border-garden/50 hover:bg-surface-2 active:scale-[0.98]"
          >
            <Trash2 className="h-4 w-4 text-muted-foreground" />
            <span>Clear Cache & Reload</span>
          </button>
        </div>

        <div className="mt-6 border-t border-border/60 pt-4">
          <a
            href="/"
            className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-garden transition-colors"
          >
            <Sprout className="h-3.5 w-3.5 text-garden" />
            <span>Return to Garden Home</span>
          </a>
        </div>
      </div>
    </div>
  );
}
