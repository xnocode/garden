"use client";

import { useEffect } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useUIStore } from "@/lib/ui-store";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Sidebar } from "./sidebar";
import type { ExplorerNode, NoteSummary } from "@/lib/notes";
import { Sprout } from "lucide-react";

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

export function MobileSidebar({
  tree,
  recentNotes,
  showExplorer = true,
}: {
  tree: ExplorerNode[];
  recentNotes: NoteSummary[];
  showExplorer?: boolean;
}) {
  const { mobileNavOpen, setMobileNavOpen } = useUIStore();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const active = useActiveKey();

  useEffect(() => {
    setMobileNavOpen(false);
  }, [pathname, searchParams, setMobileNavOpen]);

  return (
    <Sheet open={mobileNavOpen} onOpenChange={setMobileNavOpen}>
      <SheetContent side="left" className="w-[300px] p-0 flex flex-col h-full bg-background border-r border-border">
        <SheetHeader className="px-6 py-4 border-b border-border flex flex-row items-center gap-2">
          <span className="inline-flex h-7 w-7 items-center justify-center rounded-md bg-garden/10 text-garden ring-1 ring-garden/30">
            <Sprout className="h-4 w-4" />
          </span>
          <SheetTitle className="font-serif text-lg font-semibold tracking-tight text-heading">garden</SheetTitle>
        </SheetHeader>
        
        {/* Navigation items for mobile */}
        <div className="px-4 py-3 border-b border-border flex flex-col gap-1">
          <span className="px-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/75">
            Navigation
          </span>
          <nav className="flex flex-col gap-0.5 mt-1">
            {NAV_ITEMS.map((item) => {
              const isActive = item.key === active;
              return (
                <Link
                  key={item.key}
                  href={item.href}
                  onClick={() => setMobileNavOpen(false)}
                  className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                    isActive
                      ? "bg-garden/10 text-garden font-medium"
                      : "text-muted-foreground hover:text-foreground hover:bg-surface"
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Explorer Sidebar content */}
        {showExplorer && (
          <div className="flex-1 min-h-0 flex flex-col py-2">
            <Sidebar tree={tree} recentNotes={recentNotes} />
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
