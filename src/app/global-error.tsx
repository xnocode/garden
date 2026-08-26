"use client";

import { useEffect } from "react";
import { clearGardenCachesAndReload } from "@/components/garden/pwa";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Garden global critical error:", error);
  }, [error]);

  return (
    <html lang="en" className="dark">
      <body className="flex min-h-screen items-center justify-center bg-[#0a0a0c] px-4 font-sans text-[#e4e4e7]">
        <div className="mx-auto max-w-md rounded-2xl border border-white/10 bg-[#121216] p-8 text-center shadow-2xl">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-400 ring-1 ring-emerald-500/20">
            🌱
          </div>
          <h2 className="text-xl font-bold tracking-tight text-white">
            Garden Temporarily Unavailable
          </h2>
          <p className="mt-3 text-sm text-[#a1a1aa] leading-relaxed">
            A critical error occurred while loading the application shell.
          </p>
          <div className="mt-6 flex flex-col gap-3">
            <button
              type="button"
              onClick={() => reset()}
              className="inline-flex w-full items-center justify-center rounded-xl bg-emerald-600 px-4 py-2.5 text-xs font-semibold text-white shadow-sm hover:bg-emerald-500 active:scale-[0.98]"
            >
              Try Again
            </button>
            <button
              type="button"
              onClick={() => clearGardenCachesAndReload()}
              className="inline-flex w-full items-center justify-center rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-xs font-semibold text-white hover:bg-white/10 active:scale-[0.98]"
            >
              Clear Cache & Fresh Reload
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}
