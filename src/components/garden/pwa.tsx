"use client";

import { useEffect, useState } from "react";
import { Download, Share, PlusSquare, X, Smartphone } from "lucide-react";

/* ------------------------------------------------------------------ */
/* Service worker registration & Chunk Error Auto-Recovery            */
/* ------------------------------------------------------------------ */
export async function clearGardenCachesAndReload() {
  try {
    if ("caches" in window) {
      const keys = await caches.keys();
      await Promise.all(keys.map((k) => caches.delete(k)));
    }
    if ("serviceWorker" in navigator) {
      const registrations = await navigator.serviceWorker.getRegistrations();
      await Promise.all(registrations.map((r) => r.unregister()));
    }
  } catch {
    /* ignore */
  }
  window.location.reload();
}

export function PwaRegister() {
  useEffect(() => {
    // 1. Register service worker in production
    if (process.env.NODE_ENV === "production" && "serviceWorker" in navigator) {
      navigator.serviceWorker
        .register("/sw.js")
        .then((reg) => {
          // Check for SW updates periodically
          reg.update().catch(() => {});
        })
        .catch(() => {});
    }

    // 2. Global chunk load error handler (auto-reloads once on stale deployments)
    const isChunkError = (err: any) => {
      const message = err?.message || String(err || "");
      const name = err?.name || "";
      return (
        name === "ChunkLoadError" ||
        message.includes("Loading chunk") ||
        message.includes("Failed to fetch dynamically imported module") ||
        message.includes("error loading dynamically imported module")
      );
    };

    const handleChunkError = (err: any) => {
      if (!isChunkError(err)) return;
      const reloadKey = "garden_chunk_reload";
      const lastReload = sessionStorage.getItem(reloadKey);
      const now = Date.now();

      // Only auto-reload once within a 15-second window to prevent infinite reload loops
      if (!lastReload || now - parseInt(lastReload, 10) > 15000) {
        sessionStorage.setItem(reloadKey, String(now));
        clearGardenCachesAndReload();
      }
    };

    const onError = (e: ErrorEvent) => handleChunkError(e.error || e.message);
    const onUnhandledRejection = (e: PromiseRejectionEvent) => handleChunkError(e.reason);

    window.addEventListener("error", onError);
    window.addEventListener("unhandledrejection", onUnhandledRejection);

    return () => {
      window.removeEventListener("error", onError);
      window.removeEventListener("unhandledrejection", onUnhandledRejection);
    };
  }, []);

  return null;
}

/* ------------------------------------------------------------------ */
/* Install button — native prompt on Android/desktop,                  */
/* guided hint on iOS Safari                                           */
/* ------------------------------------------------------------------ */
function isStandalone(): boolean {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (navigator as any).standalone === true
  );
}

function isIOS(): boolean {
  if (typeof window === "undefined") return false;
  return (
    /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.userAgent.includes("Mac") && "ontouchend" in document)
  );
}

export function InstallButton({ variant = "footer" }: { variant?: "footer" | "button" }) {
  const [deferred, setDeferred] = useState<any>(null);
  const [showIOSHint, setShowIOSHint] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [hidden, setHidden] = useState(true); // hidden until we know it's useful

  useEffect(() => {
    if (isStandalone()) return; // already installed
    if (isIOS()) {
      setHidden(false); // iOS: always offer the guided hint
      return;
    }
    const onPrompt = (e: Event) => {
      e.preventDefault();
      setDeferred(e);
      setHidden(false);
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", () => setHidden(true));
    return () => window.removeEventListener("beforeinstallprompt", onPrompt);
  }, []);

  const install = async () => {
    if (deferred) {
      deferred.prompt();
      const { outcome } = await deferred.userChoice;
      if (outcome === "accepted") setHidden(true);
      setDeferred(null);
    } else if (isIOS()) {
      setShowIOSHint(true);
    }
  };

  if (hidden || dismissed) return null;

  const label = "Install app";

  if (variant === "button") {
    return (
      <>
        <button
          onClick={install}
          className="inline-flex items-center gap-1.5 rounded-md border border-border bg-surface/50 px-2.5 py-1.5 text-xs font-medium text-muted-foreground transition-all hover:border-garden/40 hover:text-foreground"
          aria-label="Install the garden as an app"
        >
          <Download className="h-3.5 w-3.5" />
          {label}
        </button>
        {showIOSHint && <IOSHint onClose={() => { setShowIOSHint(false); setDismissed(true); }} />}
      </>
    );
  }

  return (
    <>
      <button
        onClick={install}
        className="inline-flex items-center gap-1.5 text-xs text-muted-foreground transition-colors hover:text-garden"
        aria-label="Install the garden as an app"
      >
        <Download className="h-3 w-3" />
        {label}
      </button>
      {showIOSHint && <IOSHint onClose={() => { setShowIOSHint(false); setDismissed(true); }} />}
    </>
  );
}

function IOSHint({ onClose }: { onClose: () => void }) {
  return (
    <div className="fixed inset-x-0 bottom-0 z-50 flex justify-center px-4 pb-4">
      <div className="garden-fade-in w-full max-w-sm rounded-lg border border-garden/30 bg-surface p-4 shadow-xl">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2 text-sm font-medium text-foreground">
            <Smartphone className="h-4 w-4 text-garden" />
            Install on iPhone/iPad
          </div>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <ol className="mt-3 space-y-2 text-xs text-muted-foreground">
          <li className="flex items-center gap-2">
            <span className="font-mono text-garden">1.</span>
            Tap the <Share className="inline h-3.5 w-3.5 text-garden" /> <b>Share</b> button in
            Safari&apos;s toolbar
          </li>
          <li className="flex items-center gap-2">
            <span className="font-mono text-garden">2.</span>
            Scroll down and tap <PlusSquare className="inline h-3.5 w-3.5 text-garden" />{" "}
            <b>Add to Home Screen</b>
          </li>
          <li className="flex items-center gap-2">
            <span className="font-mono text-garden">3.</span>
            Confirm — the Garden app appears on your home screen
          </li>
        </ol>
      </div>
    </div>
  );
}
