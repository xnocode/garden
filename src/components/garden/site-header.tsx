"use client";

import { useState } from "react";
import { GardenLink } from "./garden-link";
import { Search, Menu, Sprout, Sparkles } from "lucide-react";
import { usePathname, useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { useUIStore } from "@/lib/ui-store";
import { ThemeToggle } from "./theme-toggle";
import { AISearchModal } from "./ai-search-modal";
import { UserMenu } from "@/components/auth/user-menu";

const NAV_ITEMS = [
  { label: "Garden", href: "/", key: "home" },
  { label: "Books", href: "/?p=books", key: "books" },
  { label: "Index", href: "/?view=index", key: "index" },
  { label: "Graph", href: "/?view=graph", key: "graph" },
  { label: "Tags", href: "/?view=tags", key: "tags" },
  { label: "Collections", href: "/?view=series", key: "series" },
  { label: "Rhythm", href: "/?view=rhythm", key: "rhythm" },
  { label: "Taskwarrior", href: "/?view=tasks", key: "tasks" },
  { label: "About", href: "/?p=about", key: "about" },
];

function useActiveKey(): string {
  const sp = useSearchParams();
  const p = sp.get("p");
  const view = sp.get("view");
  const tag = sp.get("tag");
  if (p) return p === "books" ? "books" : p === "about" ? "about" : "note";
  if (view) return view === "books" ? "books" : view;
  if (tag) return "tags";
  return "home";
}

export function SiteHeader() {
  const active = useActiveKey();
  const { setSearchOpen, mobileNavOpen, setMobileNavOpen } = useUIStore();
  const [aiModalOpen, setAiModalOpen] = useState(false);
  const { data: session } = useSession();
  const isAdmin = (session?.user as any)?.role === "admin";
  const navItems = isAdmin
    ? [...NAV_ITEMS, { label: "Private", href: "/?view=private", key: "private" }]
    : NAV_ITEMS;

  return (
    <>
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
          <GardenLink
            href="/"
            className="group flex items-center gap-2 font-serif text-lg font-semibold tracking-tight text-heading"
          >
            <span className="inline-flex h-7 w-7 items-center justify-center rounded-md bg-garden/10 text-garden ring-1 ring-garden/30 transition-transform group-hover:scale-105">
              <Sprout className="h-4 w-4" />
            </span>
            <span className="hidden sm:inline">garden</span>
          </GardenLink>

          {/* Desktop nav */}
          <nav className="ml-2 hidden items-center gap-1 lg:flex">
            {navItems.map((item) => {
              const isActive =
                item.key === active ||
                (item.key === "home" && active === "home");
              return (
                <GardenLink
                  key={item.key}
                  href={item.href}
                  className={`nav-link rounded-md px-3 py-1.5 text-sm font-medium ${
                    isActive ? "active" : ""
                  }`}
                >
                  {item.label}
                </GardenLink>
              );
            })}
          </nav>

          <div className="ml-auto flex items-center gap-2">
            {/* Ask AI button */}
            <button
              type="button"
              onClick={() => setAiModalOpen(true)}
              className="inline-flex h-9 items-center gap-1.5 rounded-md border border-garden/30 bg-garden/10 px-3 text-sm font-medium text-garden hover:bg-garden/20 transition-colors"
            >
              <Sparkles className="h-4 w-4 text-garden" />
              <span className="hidden sm:inline">Ask AI</span>
            </button>

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
            <UserMenu />
          </div>
        </div>
      </header>

      {/* Website AI Search Modal */}
      <AISearchModal isOpen={aiModalOpen} onClose={() => setAiModalOpen(false)} />
    </>
  );
}
