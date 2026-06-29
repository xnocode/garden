"use client";

import { useEffect, useState } from "react";
import { Keyboard, X, Search, Sun, Moon, ArrowLeft, ArrowRight, Home, Network, Tags, BookMarked } from "lucide-react";

const SHORTCUTS = [
  {
    group: "Navigation",
    items: [
      { keys: ["⌘", "K"], desc: "Open search", icon: Search },
      { keys: ["/"], desc: "Open search (alt)", icon: Search },
      { keys: ["g", "h"], desc: "Go home", icon: Home },
      { keys: ["g", "i"], desc: "Go to index", icon: BookMarked },
      { keys: ["g", "g"], desc: "Go to graph", icon: Network },
      { keys: ["g", "t"], desc: "Go to tags", icon: Tags },
      { keys: ["["], desc: "Previous note", icon: ArrowLeft },
      { keys: ["]"], desc: "Next note", icon: ArrowRight },
    ],
  },
  {
    group: "Actions",
    items: [
      { keys: ["t"], desc: "Toggle theme", icon: Sun },
      { keys: ["?"], desc: "Show this help", icon: Keyboard },
      { keys: ["Esc"], desc: "Close dialog", icon: X },
    ],
  },
];

export function ShortcutsHelp() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const tag = target?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || target?.isContentEditable)
        return;
      if (e.key === "?" && !e.metaKey && !e.ctrlKey && !e.altKey) {
        e.preventDefault();
        setOpen((o) => !o);
      } else if (e.key === "Escape" && open) {
        setOpen(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4 backdrop-blur-sm"
      onClick={() => setOpen(false)}
    >
      <div
        className="popover-card w-full max-w-lg overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <h2 className="flex items-center gap-2 font-serif text-lg font-semibold text-heading">
            <Keyboard className="h-5 w-5 text-garden" />
            Keyboard shortcuts
          </h2>
          <button
            onClick={() => setOpen(false)}
            className="rounded-md p-1.5 text-muted-foreground hover:bg-surface hover:text-foreground"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="max-h-[60vh] overflow-y-auto p-5">
          {SHORTCUTS.map((group) => (
            <div key={group.group} className="mb-5 last:mb-0">
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                {group.group}
              </h3>
              <ul className="space-y-1">
                {group.items.map((item) => {
                  const Icon = item.icon;
                  return (
                    <li
                      key={item.desc}
                      className="flex items-center justify-between gap-3 rounded-md px-2 py-1.5 hover:bg-surface/60"
                    >
                      <span className="flex items-center gap-2.5 text-sm text-foreground">
                        <Icon className="h-3.5 w-3.5 text-muted-foreground" />
                        {item.desc}
                      </span>
                      <span className="flex items-center gap-1">
                        {item.keys.map((k, i) => (
                          <kbd
                            key={i}
                            className="inline-flex min-w-[1.5rem] items-center justify-center rounded border border-border bg-surface px-1.5 py-0.5 font-mono text-[11px] text-foreground"
                          >
                            {k}
                          </kbd>
                        ))}
                      </span>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
          <p className="mt-4 border-t border-border pt-3 text-xs text-muted-foreground">
            Press{" "}
            <kbd className="rounded border border-border bg-surface px-1.5 py-0.5 font-mono text-[11px]">
              ?
            </kbd>{" "}
            anytime to toggle this help.
          </p>
        </div>
      </div>
    </div>
  );
}
