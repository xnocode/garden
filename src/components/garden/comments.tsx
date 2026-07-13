"use client";

import { useEffect, useRef, useState } from "react";
import { useTheme } from "@/components/theme-provider";
import { MessageSquare } from "lucide-react";

export function Comments({ slug }: { slug: string }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const { theme } = useTheme();
  const [commentCount, setCommentCount] = useState<number | null>(null);

  const giscusTheme = theme === "dark" ? "noborder_dark" : "noborder_light";

  // Resolve the correct theme: custom CSS on HTTPS, built-in fallback on HTTP
  const resolveTheme = (t: "dark" | "light") => {
    if (typeof window === "undefined") return t === "dark" ? "noborder_dark" : "noborder_light";
    const isHttps = window.location.protocol === "https:";
    if (isHttps) {
      return t === "dark"
        ? `${window.location.origin}/giscus-dark.css`
        : `${window.location.origin}/giscus-light.css`;
    }
    return t === "dark" ? "noborder_dark" : "noborder_light";
  };

  // Listen for Giscus metadata → get real comment count
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.origin !== "https://giscus.app") return;
      if (typeof event.data !== "object" || !event.data?.giscus) return;
      const { discussion } = event.data.giscus;
      if (discussion) {
        const total =
          (discussion.totalCommentCount ?? 0) +
          (discussion.totalReplyCount ?? 0);
        setCommentCount(total);
      }
    };
    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, []);

  // Load / reload Giscus script when slug changes
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    container.innerHTML = "";
    setCommentCount(null);

    const script = document.createElement("script");
    script.src = "https://giscus.app/client.js";
    script.setAttribute("data-repo", "xnocode/garden");
    script.setAttribute("data-repo-id", "R_kgDOTIfJWg");
    script.setAttribute("data-category", "Announcements");
    script.setAttribute("data-category-id", "DIC_kwDOTIfJWs4DBHk0");
    script.setAttribute("data-mapping", "pathname");
    script.setAttribute("data-strict", "0");
    script.setAttribute("data-reactions-enabled", "0");
    script.setAttribute("data-emit-metadata", "1");
    script.setAttribute("data-input-position", "top");
    script.setAttribute("data-lang", "en");
    script.setAttribute("crossorigin", "anonymous");
    script.setAttribute("data-theme", resolveTheme(theme as "dark" | "light"));
    script.async = true;
    container.appendChild(script);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug]);

  // Sync theme changes to already-loaded iframe
  useEffect(() => {
    const iframe = containerRef.current?.querySelector<HTMLIFrameElement>("iframe.giscus-frame");
    if (!iframe) return;
    iframe.contentWindow?.postMessage(
      { giscus: { setConfig: { theme: resolveTheme(theme as "dark" | "light") } } },
      "https://giscus.app"
    );
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [theme]);

  const hasComments = commentCount !== null && commentCount > 0;

  return (
    <div className="mt-12 border-t border-border pt-8">
      {/* Section header — matches the style of Related Notes / Backlinks headers */}
      <div className="mb-5 flex items-center gap-2">
        <MessageSquare className="h-[15px] w-[15px] text-garden shrink-0" />
        <span className="font-serif text-lg font-semibold text-heading">
          Comments
        </span>
        {/* Only show count when there are real comments */}
        {hasComments && (
          <span className="ml-0.5 inline-flex items-center rounded-full border border-garden/25 bg-garden/10 px-2 py-0.5 text-[11px] font-mono text-garden">
            {commentCount}
          </span>
        )}
        <a
          href="https://github.com/xnocode/garden/discussions"
          target="_blank"
          rel="noopener noreferrer"
          className="ml-auto text-[11px] font-mono text-muted-foreground/40 hidden sm:inline-flex items-center gap-1 hover:text-garden transition-colors"
        >
          via GitHub Discussions
        </a>
      </div>

      {/* Giscus widget — always visible, no collapse */}
      <div className="rounded-lg border border-border overflow-hidden giscus-wrapper">
        <div ref={containerRef} className="giscus w-full" />
      </div>
    </div>
  );
}
