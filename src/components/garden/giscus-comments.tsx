"use client";

import { useEffect, useRef, useState } from "react";
import { useTheme } from "@/components/theme-provider";
import { MessageSquare } from "lucide-react";

export function GiscusComments() {
  const containerRef = useRef<HTMLDivElement>(null);
  const { theme } = useTheme();
  const [origin, setOrigin] = useState("");

  // Determine site origin client-side
  useEffect(() => {
    if (typeof window !== "undefined") {
      setOrigin(window.location.origin);
    }
  }, []);

  // Load configs with fallbacks to public sandbox so it works out of the box!
  const repo = process.env.NEXT_PUBLIC_GISCUS_REPO || "giscus/giscus-component";
  const repoId = process.env.NEXT_PUBLIC_GISCUS_REPO_ID || "MDEwOlJlcG9zaXRvcnkzOTEzMTMwMjA=";
  const category = process.env.NEXT_PUBLIC_GISCUS_CATEGORY || "General";
  const categoryId = process.env.NEXT_PUBLIC_GISCUS_CATEGORY_ID || "DIC_kwDOF1L2fM4B-hVT";

  const isDemo = !process.env.NEXT_PUBLIC_GISCUS_REPO;

  useEffect(() => {
    // 1. In secure production HTTPS, load the stylesheet directly from the host.
    // 2. In unsecure local HTTP localhost, load the stylesheet via a secure HTTPS proxy of your GitHub repository
    //    to bypass browser Mixed Content security blocks (which prevent loading HTTP styles inside HTTPS Giscus).
    const giscusTheme = theme === "dark" ? "transparent_dark" : "light";

    const iframe = document.querySelector<HTMLIFrameElement>("iframe.giscus-frame");

    if (iframe && iframe.contentWindow) {
      // Update theme in real-time without reloading the iframe
      iframe.contentWindow.postMessage(
        { giscus: { setConfig: { theme: giscusTheme } } },
        "https://giscus.app"
      );
    } else {
      // Clean up and load for the first time
      if (containerRef.current) {
        containerRef.current.innerHTML = "";
      }

      const script = document.createElement("script");
      script.src = "https://giscus.app/client.js";
      script.setAttribute("data-repo", repo);
      script.setAttribute("data-repo-id", repoId);
      script.setAttribute("data-category", category);
      script.setAttribute("data-category-id", categoryId);
      script.setAttribute("data-mapping", "pathname");
      script.setAttribute("data-strict", "0");
      script.setAttribute("data-reactions-enabled", "0");
      script.setAttribute("data-emit-metadata", "0");
      script.setAttribute("data-input-position", "bottom");
      script.setAttribute("data-theme", giscusTheme);
      script.setAttribute("data-lang", "en");
      script.crossOrigin = "anonymous";
      script.async = true;

      containerRef.current?.appendChild(script);
    }
  }, [theme, origin, repo, repoId, category, categoryId]);

  return (
    <section
      aria-label="Comments"
      className="rounded-xl border border-border bg-gradient-to-b from-surface/40 to-transparent p-5 shadow-sm garden-fade-in"
    >
      <header className="mb-4 flex items-center justify-between">
        <h3 className="flex items-center gap-2 text-sm font-semibold text-heading">
          <span className="inline-flex h-6 w-6 items-center justify-center rounded-md bg-garden/10 text-garden ring-1 ring-garden/20">
            <MessageSquare className="h-3.5 w-3.5" />
          </span>
          Comments
        </h3>

        {isDemo ? (
          <span className="rounded-full border border-yellow-500/20 bg-yellow-500/10 px-2 py-0.5 font-mono text-[9px] text-yellow-500/80">
            demo sandbox
          </span>
        ) : (
          <span className="rounded-full border border-border bg-surface px-2 py-0.5 font-mono text-[10px] text-muted-foreground">
            via GitHub
          </span>
        )}
      </header>

      {isDemo && (
        <div className="mb-4 rounded-lg border border-border/60 bg-surface-2/20 p-4 text-xs text-muted-foreground leading-relaxed">
          💡 <strong>Demo Mode active:</strong> Comments are currently stored in a public sandbox. To save comments to your own repo, activate Discussions on your GitHub repository (<code>xnocode/garden</code>), install the <a href="https://github.com/apps/giscus" target="_blank" rel="noopener noreferrer" className="text-garden hover:underline">Giscus App</a>, and add the credentials to your local <code>.env</code> file.
        </div>
      )}

      {/* Giscus script mounts the iframe inside this container */}
      <div ref={containerRef} className="giscus" />
    </section>
  );
}
