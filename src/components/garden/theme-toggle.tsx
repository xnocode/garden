"use client";

import { Moon, Sun } from "lucide-react";
import { useEffect } from "react";
import { useTheme } from "@/components/theme-provider";

export function ThemeToggle({ className }: { className?: string }) {
  const { toggleTheme } = useTheme();

  // Listen for the global "garden-toggle-theme" custom event (fired by the
  // keyboard shortcut `t`).
  useEffect(() => {
    const handler = () => toggleTheme();
    document.addEventListener("garden-toggle-theme", handler);
    return () => document.removeEventListener("garden-toggle-theme", handler);
  }, [toggleTheme]);

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label="Toggle theme (press t)"
      title="Toggle dark / light theme (t)"
      className={`relative inline-flex h-9 w-9 items-center justify-center rounded-md border border-border text-muted-foreground transition-colors hover:text-foreground hover:border-garden/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${className ?? ""}`}
    >
      {/* Icon is toggled via CSS based on the .dark class on <html>
          (set before paint by the no-flash script), avoiding hydration issues. */}
      <Moon className="hidden h-4 w-4 dark:block" />
      <Sun className="h-4 w-4 dark:hidden" />
    </button>
  );
}
