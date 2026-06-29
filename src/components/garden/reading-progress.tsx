"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { ArrowUp } from "lucide-react";

/**
 * Reading progress bar (fixed at the top of the viewport) + a scroll-to-top
 * floating button. Only active on note pages (/?p=...).
 *
 * Also wires up global keyboard shortcuts (Obsidian / Quartz-style):
 *   ⌘K / Ctrl+K  → command palette (handled in command-palette.tsx)
 *   /            → focus / open search
 *   t            → toggle theme
 *   g i          → index
 *   g g          → graph
 *   g t          → tags
 *   g h          → home
 *   [            → previous note
 *   ]            → next note
 *   ?            → show keyboard shortcuts help
 *
 * Implementation note: the progress bar width is driven by direct DOM style
 * mutation (via a ref) inside the scroll handler, NOT via React state, to
 * satisfy the `react-hooks/set-state-in-effect` lint rule and to avoid
 * re-rendering on every scroll event.
 */
export function ReadingProgress() {
  const router = useRouter();
  const sp = useSearchParams();
  const currentSlug = sp.get("p");
  const isNote = !!currentSlug;

  const barRef = useRef<HTMLDivElement>(null);
  const topBtnRef = useRef<HTMLButtonElement>(null);
  const [showTop, setShowTop] = useState(false);

  // Scroll handler — updates the progress bar via DOM and toggles the
  // scroll-to-top button visibility (throttled via rAF).
  useEffect(() => {
    if (!isNote) {
      if (barRef.current) barRef.current.style.width = "0%";
      if (topBtnRef.current) topBtnRef.current.style.display = "none";
      return;
    }
    let ticking = false;
    let lastShow = false;
    const update = () => {
      ticking = false;
      const el = document.documentElement;
      const scrollTop = el.scrollTop || document.body.scrollTop;
      const scrollHeight = el.scrollHeight - el.clientHeight;
      const pct = scrollHeight > 0 ? (scrollTop / scrollHeight) * 100 : 0;
      const clamped = Math.min(100, Math.max(0, pct));
      if (barRef.current) {
        barRef.current.style.width = clamped + "%";
        barRef.current.style.opacity = "1";
      }
      const shouldShow = scrollTop > 600;
      if (shouldShow !== lastShow) {
        lastShow = shouldShow;
        setShowTop(shouldShow);
      }
    };
    const onScroll = () => {
      if (!ticking) {
        ticking = true;
        requestAnimationFrame(update);
      }
    };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, [isNote, currentSlug]);

  // Keyboard shortcuts
  useEffect(() => {
    let gPressed = false;
    let gTimer: ReturnType<typeof setTimeout> | null = null;

    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const tag = target?.tagName;
      if (
        tag === "INPUT" ||
        tag === "TEXTAREA" ||
        target?.isContentEditable
      ) {
        return;
      }
      if (e.altKey || e.shiftKey) return;

      // g-prefix sequences
      if (e.key === "g" && !e.metaKey && !e.ctrlKey) {
        if (gPressed) return;
        gPressed = true;
        if (gTimer) clearTimeout(gTimer);
        gTimer = setTimeout(() => {
          gPressed = false;
        }, 800);
        return;
      }
      if (gPressed) {
        if (e.key === "i") {
          e.preventDefault();
          router.push("/?view=index");
        } else if (e.key === "g") {
          e.preventDefault();
          router.push("/?view=graph");
        } else if (e.key === "t") {
          e.preventDefault();
          router.push("/?view=tags");
        } else if (e.key === "h") {
          e.preventDefault();
          router.push("/");
        }
        gPressed = false;
        if (gTimer) clearTimeout(gTimer);
        return;
      }

      // Single-key shortcuts
      if (e.key === "/" && !e.metaKey && !e.ctrlKey) {
        e.preventDefault();
        window.dispatchEvent(
          new KeyboardEvent("keydown", {
            key: "k",
            metaKey: true,
            bubbles: true,
          })
        );
      } else if (e.key === "t" && !e.metaKey && !e.ctrlKey) {
        e.preventDefault();
        document.dispatchEvent(new CustomEvent("garden-toggle-theme"));
      } else if (e.key === "[") {
        const prevLink = Array.from(
          document.querySelectorAll<HTMLAnchorElement>("nav a[href*='p=']")
        ).find((a) =>
          a.querySelector(".uppercase")?.textContent?.includes("Previous")
        );
        prevLink?.click();
      } else if (e.key === "]") {
        const nextLink = Array.from(
          document.querySelectorAll<HTMLAnchorElement>("nav a[href*='p=']")
        ).find((a) =>
          a.querySelector(".uppercase")?.textContent?.includes("Next")
        );
        nextLink?.click();
      }
    };

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [router]);

  const scrollToTop = useCallback(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  return (
    <>
      {/* Reading progress bar */}
      <div
        ref={barRef}
        className="fixed left-0 top-0 z-50 h-[2px] bg-garden transition-[width] duration-150 ease-out"
        style={{
          width: "0%",
          opacity: isNote ? 1 : 0,
          boxShadow: "0 0 8px rgba(132,165,157,0.5)",
        }}
        aria-hidden="true"
      />

      {/* Scroll to top */}
      {showTop && (
        <button
          ref={topBtnRef}
          type="button"
          onClick={scrollToTop}
          className="fixed bottom-6 right-6 z-40 inline-flex h-10 w-10 items-center justify-center rounded-full border border-border bg-surface/90 text-muted-foreground shadow-lg backdrop-blur-md transition-all hover:border-garden/50 hover:text-garden garden-fade-in"
          aria-label="Scroll to top"
          title="Scroll to top"
        >
          <ArrowUp className="h-4 w-4" />
        </button>
      )}
    </>
  );
}
