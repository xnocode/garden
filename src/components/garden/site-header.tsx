"use client";

import Link from "next/link";
import { Search, Menu, Sprout } from "lucide-react";
import { usePathname, useSearchParams } from "next/navigation";
import { useUIStore } from "@/lib/ui-store";
import { ThemeToggle } from "./theme-toggle";

const NAV_ITEMS = [
  { label: "Garden", href: "/", key: "home" },
  { label: "Index", href: "/?view=index", key: "index" },
  { label: "Graph", href: "/?view=graph", key: "graph" },
  { label: "Tags", href: "/?view=tags", key: "tags" },
  { label: "About", href: "/?p=about", key: "about" },
];

function useActiveKey(): string {
  const sp = useSearchParams();
  const p = sp.get("p");
  const view = sp.get("view");
  const tag = sp.get("tag");
  if (p) return p === "about" ? "about" : "note";
  if (view) return view;
  if (tag) return "tags";
  return "home";
}

export function SiteHeader() {
  const active = useActiveKey();
  const { setSearchOpen, mobileNavOpen, setMobileNavOpen } = useUIStore();

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/80 backdrop-blur-xl supports-[backdrop-filter]:bg-background/60">
      <div className="mx-auto flex h-14 max-w-[1600px] items-center gap-3 px-4 sm:px-6">
        {/* Mobile menu button */}
        <button
          type="button"
          onClick={() => setMobileNavOpen(!mobileNavOpen)}
          className="lg:hidden inline-flex h-9 w-9 items-center justify-center rounded-md text-muted-foreground hover:text-foreground"
          aria-label="Toggle navigation"
        >
          <Menu className="h-5 w-5" />
        </button>

        {/* Logo */}
        <Link
          href="/"
          className="group flex items-center gap-2 font-serif text-lg font-semibold tracking-tight text-heading"
        >
          <span className="inline-flex h-7 w-7 items-center justify-center rounded-md bg-garden/10 text-garden ring-1 ring-garden/30 transition-transform group-hover:scale-105">
            <Sprout className="h-4 w-4" />
          </span>
          <span className="hidden sm:inline">garden</span>
        </Link>

        {/* Desktop nav */}
        <nav className="ml-2 hidden items-center gap-1 lg:flex">
          {NAV_ITEMS.map((item) => {
            const isActive =
              item.key === active ||
              (item.key === "home" && active === "home");
            return (
              <Link
                key={item.key}
                href={item.href}
                className={`nav-link rounded-md px-3 py-1.5 text-sm font-medium ${
                  isActive ? "active" : ""
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="ml-auto flex items-center gap-2">
          {/* Search trigger */}
          <button
            type="button"
            onClick={() => setSearchOpen(true)}
            className="group inline-flex h-9 items-center gap-2 rounded-md border border-border bg-surface/60 px-3 text-sm text-muted-foreground transition-colors hover:border-garden/40 hover:text-foreground"
            aria-label="Search notes"
          >
            <Search className="h-4 w-4" />
            <span className="hidden sm:inline">Search</span>
            <kbd className="hidden sm:inline-flex items-center gap-0.5 rounded border border-border bg-background px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">
              ⌘K
            </kbd>
          </button>
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
