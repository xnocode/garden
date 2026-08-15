"use client";

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { NoteView } from "@/components/garden/note-view";
import { NotFoundView } from "@/components/garden/views";
import type { NoteDetail } from "@/lib/notes";

/**
 * Loads a note that isn't in the static bundle — i.e. a private note.
 * The API only returns it to a signed-in admin session; everyone else
 * gets a 404 and sees the normal not-found view.
 */
export function PrivateNoteLoader({ slug }: { slug: string }) {
  const [note, setNote] = useState<NoteDetail | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setNote(null);
    setFailed(false);
    fetch(`/api/notes/${encodeURIComponent(slug)}`)
      .then(async (res) => {
        if (!res.ok) throw new Error("not found");
        const data = await res.json();
        if (!cancelled) setNote(data.note);
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      });
    return () => {
      cancelled = true;
    };
  }, [slug]);

  if (note) return <NoteView note={note} />;
  if (failed) return <NotFoundView slug={slug} />;

  return (
    <div className="flex min-h-[50vh] items-center justify-center">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        <span>Loading note…</span>
      </div>
    </div>
  );
}
