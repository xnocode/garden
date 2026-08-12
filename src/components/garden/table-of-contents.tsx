"use client";

import { useEffect, useState, useRef } from "react";

export interface TocItem {
  id: string;
  text: string;
  level: number;
}

/** Extract a table-of-contents from rendered HTML (h2/h3/h4 with ids). */
export function extractToc(html: string): TocItem[] {
  const items: TocItem[] = [];
  const regex = /<h([234])\s+id="([^"]+)"[^>]*>([\s\S]*?)<\/h\1>/g;
  let m: RegExpExecArray | null;
  while ((m = regex.exec(html)) !== null) {
    const level = parseInt(m[1], 10);
    const id = m[2];
    // Iteratively strip inner HTML tags safely
    let text = m[3];
    let prev = "";
    while (text !== prev) {
      prev = text;
      text = text.replace(/<[^>]+>/g, "");
    }
    text = text.replace(/#$/, "").trim();
    if (id && text) items.push({ id, text, level });
  }
  return items;
}

export function TableOfContents({ items }: { items: TocItem[] }) {
  const [activeId, setActiveId] = useState<string>("");
  const navRef = useRef<HTMLElement>(null);
  const isClickingRef = useRef<boolean>(false);

  // Synchronize active heading as page text scrolls
  useEffect(() => {
    if (items.length === 0) return;

    // Check URL hash first
    const initialHash = typeof window !== "undefined" ? window.location.hash.replace("#", "") : "";
    if (initialHash && items.some((item) => item.id === initialHash)) {
      setActiveId(initialHash);
    } else if (items.length > 0) {
      setActiveId(items[0].id);
    }

    const handleScroll = () => {
      if (isClickingRef.current) return;

      const headingElements = items
        .map((item) => document.getElementById(item.id))
        .filter((el): el is HTMLElement => el !== null);

      if (headingElements.length === 0) return;

      // Bottom of page detection
      const isAtBottom =
        window.innerHeight + window.scrollY >=
        document.documentElement.scrollHeight - 80;
      if (isAtBottom) {
        setActiveId(items[items.length - 1].id);
        return;
      }

      // Calculate active section based on top offset
      const HEADER_OFFSET = 120;
      let currentActiveId = headingElements[0].id;

      for (const el of headingElements) {
        const top = el.getBoundingClientRect().top;
        if (top <= HEADER_OFFSET) {
          currentActiveId = el.id;
        } else {
          break;
        }
      }

      setActiveId(currentActiveId);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();

    return () => window.removeEventListener("scroll", handleScroll);
  }, [items]);

  // Auto-scroll TOC container to ensure active item is visible in TOC sidebar
  useEffect(() => {
    if (!activeId || !navRef.current) return;

    const activeElement = navRef.current.querySelector(
      `[data-toc-id="${CSS.escape(activeId)}"]`
    ) as HTMLElement | null;

    if (activeElement && navRef.current) {
      const container = navRef.current;
      const containerRect = container.getBoundingClientRect();
      const elementRect = activeElement.getBoundingClientRect();

      // If active link is outside or near the boundaries of the TOC scroll container
      if (
        elementRect.top < containerRect.top + 30 ||
        elementRect.bottom > containerRect.bottom - 30
      ) {
        const relativeTop = activeElement.offsetTop - container.offsetTop;
        const targetScrollTop =
          relativeTop - container.clientHeight / 2 + activeElement.offsetHeight / 2;

        container.scrollTo({
          top: Math.max(0, targetScrollTop),
          behavior: "smooth",
        });
      }
    }
  }, [activeId]);

  if (items.length === 0) return null;

  return (
    <nav
      ref={navRef}
      className="text-sm max-h-[calc(100vh-6rem)] overflow-y-auto no-scrollbar [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
      aria-label="Table of contents"
    >
      <h2 className="sticky top-0 bg-background/95 backdrop-blur-xs pb-3 pt-0 text-xs font-semibold uppercase tracking-wider text-muted-foreground z-10">
        On this page
      </h2>
      <ul className="space-y-1 border-l border-border pb-4">
        {items.map((item) => (
          <li key={item.id}>
            <a
              href={`#${item.id}`}
              data-toc-id={item.id}
              onClick={(e) => {
                e.preventDefault();
                isClickingRef.current = true;
                setActiveId(item.id);
                const el = document.getElementById(item.id);
                if (el) {
                  const yOffset = -90;
                  const y = el.getBoundingClientRect().top + window.scrollY + yOffset;
                  window.scrollTo({ top: y, behavior: "smooth" });
                  history.replaceState(null, "", `#${item.id}`);
                }
                setTimeout(() => {
                  isClickingRef.current = false;
                }, 800);
              }}
              className={`block border-l-2 -ml-px py-1 text-muted-foreground transition-colors hover:text-foreground ${
                item.level === 3 ? "pl-5" : item.level === 4 ? "pl-8" : "pl-3"
              } ${
                activeId === item.id
                  ? "border-garden text-garden font-medium"
                  : "border-transparent hover:border-border"
              }`}
            >
              {item.text}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}
