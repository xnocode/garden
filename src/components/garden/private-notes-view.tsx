"use client";

import { useEffect, useState } from "react";
import { GardenLink } from "./garden-link";
import { useSession } from "next-auth/react";
import { Lock, Loader2, ShieldAlert } from "lucide-react";

interface PrivateNoteMeta {
  slug: string;
  title: string;
  description: string | null;
  wordCount: number;
  publishDate: string | null;
  updatedAt: string;
}

/**
 * Admin-only listing of private notes. Private notes never enter the static
 * bundle — this view fetches their metadata from /api/admin/private-notes,
 * which requires an admin session. Everyone else sees a lock message.
 */
export function PrivateNotesView() {
  const { data: session, status } = useSession();
  const isAdmin = (session?.user as any)?.role === "admin";
  const [notes, setNotes] = useState<PrivateNoteMeta[] | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!isAdmin) return;
    let cancelled = false;
    setNotes(null);
    setError(false);
    fetch("/api/admin/private-notes")
      .then(async (res) => {
        if (!res.ok) throw new Error("failed");
        const data = await res.json();
        if (!cancelled) setNotes(data.notes);
      })
      .catch(() => {
        if (!cancelled) setError(true);
      });
    return () => {
      cancelled = true;
    };
  }, [isAdmin]);

  if (status === "loading") {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="garden-fade-in mx-auto max-w-3xl py-16 text-center">
        <ShieldAlert className="mx-auto h-10 w-10 text-muted-foreground/50" />
        <h1 className="mt-4 font-serif text-2xl font-semibold text-heading">
          Admin only
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          This section lists private notes and requires the admin account.
        </p>
      </div>
    );
  }

  return (
    <div className="garden-fade-in mx-auto max-w-3xl">
      <header className="mb-8 border-b border-border pb-6">
        <h1 className="flex items-center gap-3 font-serif text-3xl font-semibold text-heading">
          <Lock className="h-6 w-6 text-garden" />
          Private notes
        </h1>
        <p className="mt-2 text-muted-foreground">
          Visible only to you — never published to GitHub or the public site.
        </p>
      </header>

      {error && (
        <p className="text-sm text-muted-foreground">
          Failed to load private notes. Try again.
        </p>
      )}
      {!error && notes === null && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading…
        </div>
      )}
      {notes && notes.length === 0 && (
        <p className="text-sm text-muted-foreground">
          No private notes yet. Set <code className="font-mono text-xs">visibility: private</code> in a
          note&apos;s frontmatter and run <code className="font-mono text-xs">bun run deploy</code>.
        </p>
      )}
      {notes && notes.length > 0 && (
        <div className="space-y-2">
          {notes.map((n) => (
            <GardenLink
              key={n.slug}
              href={`/?p=${encodeURIComponent(n.slug)}`}
              className="group flex items-center justify-between gap-3 rounded-lg border border-border bg-surface/30 px-4 py-3 transition-colors hover:border-garden/40"
            >
              <span className="min-w-0">
                <span className="flex items-center gap-2">
                  <Lock className="h-3.5 w-3.5 flex-shrink-0 text-garden/70" />
                  <span className="truncate font-medium text-foreground group-hover:text-garden">
                    {n.title}
                  </span>
                </span>
                {n.description && (
                  <span className="mt-0.5 block truncate text-xs text-muted-foreground">
                    {n.description}
                  </span>
                )}
              </span>
              <span className="flex-shrink-0 font-mono text-xs text-muted-foreground/60">
                {n.wordCount}w
              </span>
            </GardenLink>
          ))}
        </div>
      )}
    </div>
  );
}
