"use client";

import { Search } from "lucide-react";
import { useUIStore } from "@/lib/ui-store";

export function SearchTrigger({
  className,
  children,
}: {
  className?: string;
  children?: React.ReactNode;
}) {
  const setSearchOpen = useUIStore((s) => s.setSearchOpen);
  return (
    <button
      type="button"
      onClick={() => setSearchOpen(true)}
      className={className}
    >
      {children ?? (
        <>
          <Search className="h-4 w-4" />
          Search notes
        </>
      )}
    </button>
  );
}
