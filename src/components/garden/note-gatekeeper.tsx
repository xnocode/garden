"use client";

import { useState } from "react";
import { Lock, Sparkles, ShieldAlert, LogIn } from "lucide-react";
import { AuthModal } from "@/components/auth/auth-modal";

interface NoteGatekeeperProps {
  visibility: "members" | "private";
  noteTitle: string;
}

export function NoteGatekeeper({ visibility, noteTitle }: NoteGatekeeperProps) {
  const [authModalOpen, setAuthModalOpen] = useState(false);

  if (visibility === "private") {
    return (
      <div className="my-8 rounded-2xl border border-destructive/30 bg-destructive/5 p-8 text-center shadow-lg">
        <div className="mx-auto mb-4 inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-destructive/15 text-destructive ring-1 ring-destructive/30">
          <ShieldAlert className="h-6 w-6" />
        </div>
        <h3 className="font-serif text-lg font-bold text-heading">Private Author Note</h3>
        <p className="mx-auto mt-2 max-w-md text-xs text-muted-foreground">
          This note (&ldquo;{noteTitle}&rdquo;) is private and only accessible by the garden author.
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="my-8 overflow-hidden rounded-2xl border border-garden/30 bg-gradient-to-b from-surface to-surface/40 p-8 text-center shadow-xl">
        <div className="mx-auto mb-4 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-garden/15 text-garden ring-1 ring-garden/30 shadow-[0_0_20px_-4px_rgba(132,165,157,0.4)]">
          <Lock className="h-7 w-7" />
        </div>

        <h3 className="font-serif text-xl font-bold text-heading">
          Members-Only Content
        </h3>

        <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
          &ldquo;{noteTitle}&rdquo; is exclusive to verified garden members. Sign in with your verified email to unlock and read this note.
        </p>

        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          <button
            type="button"
            onClick={() => setAuthModalOpen(true)}
            className="inline-flex items-center gap-2 rounded-xl bg-garden px-5 py-2.5 text-sm font-semibold text-garden-foreground transition-transform hover:opacity-90 active:scale-[0.98] shadow-md"
          >
            <LogIn className="h-4 w-4" />
            <span>Sign In to Unlock Note</span>
          </button>
        </div>

        <div className="mt-6 flex items-center justify-center gap-2 text-[11px] text-muted-foreground">
          <Sparkles className="h-3.5 w-3.5 text-garden" />
          <span>100% Free · Verified accounts only (Gmail, Outlook, Yahoo, iCloud, Proton)</span>
        </div>
      </div>

      <AuthModal isOpen={authModalOpen} onClose={() => setAuthModalOpen(false)} />
    </>
  );
}
