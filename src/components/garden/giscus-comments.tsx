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

  const isDemo = false;

  useEffect(() => {
    // CSS files always live in xnocode/garden regardless of which Giscus repo/sandbox is used
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

          <span className="rounded-full border border-border bg-surface px-2 py-0.5 font-mono text-[10px] text-muted-foreground">
            via GitHub
          </span>
        </header>

      {/* Giscus script mounts the iframe inside this container */}
      <div ref={containerRef} className="giscus" />
    </section>
  );
}
