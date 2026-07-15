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

  // Load configs — env vars take priority, fallback to xnocode/garden defaults
  const repo = process.env.NEXT_PUBLIC_GISCUS_REPO || "xnocode/garden";
  const repoId = process.env.NEXT_PUBLIC_GISCUS_REPO_ID || "R_kgDOTIfJWg";
  const category = process.env.NEXT_PUBLIC_GISCUS_CATEGORY || "General";
  const categoryId = process.env.NEXT_PUBLIC_GISCUS_CATEGORY_ID || "DIC_kwDOTIfJWs4DBHk1";

  useEffect(() => {
    // CSS always lives in xnocode/garden regardless of Giscus repo/sandbox
    const cssRepo = "xnocode/garden";
    const giscusTheme = origin && origin.startsWith("https")
      ? `${origin}/giscus-${theme}.css`
      : `https://raw.githubusercontent.com/${cssRepo}/main/public/giscus-${theme}.css`;

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
      aria-label="Discussion"
      className="rounded-xl border border-border bg-gradient-to-b from-surface/40 to-transparent p-5 shadow-sm garden-fade-in"
    >
      <header className="mb-5 flex items-center justify-between border-b border-border/40 pb-4">
        {/* Left: icon + title */}
        <div className="flex items-center gap-2.5">
          <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-garden/10 text-garden ring-1 ring-garden/20">
            <MessageSquare className="h-4 w-4" />
          </span>
          <div>
            <h3 className="text-sm font-semibold text-heading">Discussion</h3>
            <p className="text-[10px] text-muted-foreground">Powered by GitHub Discussions</p>
          </div>
        </div>

        {/* Right: GitHub link */}
        <a
          href={`https://github.com/${repo}/discussions`}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="View discussions on GitHub"
          className="flex items-center gap-1.5 rounded-full border border-border/60 bg-surface/60 px-3 py-1 text-[11px] font-medium text-muted-foreground transition-colors hover:border-garden/40 hover:text-garden"
        >
          {/* GitHub icon */}
          <svg viewBox="0 0 16 16" className="h-3.5 w-3.5 fill-current" aria-hidden="true">
            <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z" />
          </svg>
          GitHub
        </a>
      </header>

      {/* Giscus script mounts the iframe inside this container */}
      <div ref={containerRef} className="giscus" />
    </section>
  );
}
