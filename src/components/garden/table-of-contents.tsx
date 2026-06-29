"use client";

import { useEffect, useState } from "react";

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
    // Strip inner tags (e.g. the heading-anchor <a>#</a>) for display text
    const text = m[3].replace(/<[^>]+>/g, "").replace(/#$/, "").trim();
    if (id && text) items.push({ id, text, level });
  }
  return items;
}

export function TableOfContents({ items }: { items: TocItem[] }) {
  const [activeId, setActiveId] = useState<string>("");

  // Scrollspy — setActiveId is called from the observer callback (async), not
  // synchronously in the effect body.
  useEffect(() => {
    if (items.length === 0) return;
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible[0]) {
          setActiveId(visible[0].target.id);
        }
      },
      { rootMargin: "-80px 0px -70% 0px", threshold: 0 }
    );
    for (const item of items) {
      const el = document.getElementById(item.id);
      if (el) observer.observe(el);
    }
    return () => observer.disconnect();
  }, [items]);

  if (items.length === 0) return null;

  return (
    <nav className="text-sm" aria-label="Table of contents">
      <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        On this page
      </h2>
      <ul className="space-y-1 border-l border-border">
        {items.map((item) => (
          <li key={item.id}>
            <a
              href={`#${item.id}`}
              onClick={(e) => {
                e.preventDefault();
                const el = document.getElementById(item.id);
                if (el) {
                  el.scrollIntoView({ behavior: "smooth", block: "start" });
                  history.replaceState(null, "", `#${item.id}`);
                }
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
