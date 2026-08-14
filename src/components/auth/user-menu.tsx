"use client";

import { useState, useRef, useEffect } from "react";
import { useSession, signOut } from "next-auth/react";
import { LogIn, LogOut, Crown, ShieldCheck, User } from "lucide-react";
import { AuthModal } from "./auth-modal";

export function UserMenu() {
  const { data: session, status } = useSession();
  const [modalOpen, setModalOpen] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const user = session?.user;
  const role = (user as any)?.role || "member";
  const isAdmin = role === "admin";

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  if (status === "loading") {
    return (
      <div className="h-8 w-8 animate-pulse rounded-full bg-surface-2 ring-1 ring-border" />
    );
  }

  if (!user) {
    return (
      <>
        <button
          type="button"
          onClick={() => setModalOpen(true)}
          className="inline-flex h-9 items-center gap-1.5 rounded-md border border-border bg-surface/60 px-3 text-xs font-medium text-foreground transition-all hover:border-garden/40 hover:text-garden"
        >
          <LogIn className="h-3.5 w-3.5" />
          <span>Sign In</span>
        </button>
        <AuthModal isOpen={modalOpen} onClose={() => setModalOpen(false)} />
      </>
    );
  }

  return (
    <>
      <div className="relative" ref={dropdownRef}>
        <button
          type="button"
          onClick={() => setDropdownOpen(!dropdownOpen)}
          className={`flex items-center gap-2 rounded-full border p-0.5 pr-2.5 transition-all ${
            isAdmin
              ? "border-amber-500/40 bg-amber-500/10 shadow-[0_0_12px_-3px_rgba(245,158,11,0.3)]"
              : "border-border bg-surface/60 hover:border-garden/40"
          }`}
          aria-label="User profile menu"
        >
          {user.image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={user.image}
              alt={user.name || "Avatar"}
              className="h-7 w-7 rounded-full object-cover ring-1 ring-border"
            />
          ) : (
            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-garden/20 text-[11px] font-bold text-garden">
              {user.name ? user.name.slice(0, 2).toUpperCase() : <User className="h-3.5 w-3.5" />}
            </div>
          )}

          <span className="hidden max-w-[110px] truncate text-xs font-medium text-foreground sm:inline">
            {user.name?.split(" ")[0]}
          </span>

          {isAdmin ? (
            <span className="inline-flex items-center gap-0.5 rounded-full bg-amber-500/20 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-amber-400">
              <Crown className="h-2.5 w-2.5" />
              <span>Admin</span>
            </span>
          ) : (
            <span className="inline-flex items-center rounded-full bg-garden/15 px-1.5 py-0.5 text-[9px] font-medium text-garden">
              Member
            </span>
          )}
        </button>

        {/* Dropdown Menu */}
        {dropdownOpen && (
          <div className="absolute right-0 top-full mt-2 w-56 rounded-xl border border-border bg-surface p-2 shadow-xl backdrop-blur-md animate-in fade-in zoom-in-95 duration-150 z-50">
            <div className="border-b border-border/60 px-3 py-2">
              <p className="truncate text-xs font-semibold text-heading">
                {user.name || "Garden Member"}
              </p>
              <p className="truncate text-[10px] text-muted-foreground">{user.email}</p>
              <div className="mt-1.5 flex items-center gap-1">
                {isAdmin ? (
                  <span className="inline-flex items-center gap-1 rounded bg-amber-500/15 px-1.5 py-0.5 text-[10px] font-medium text-amber-400">
                    <Crown className="h-3 w-3" />
                    Garden Author (Full Access)
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 rounded bg-garden/15 px-1.5 py-0.5 text-[10px] font-medium text-garden">
                    <ShieldCheck className="h-3 w-3" />
                    Verified Member
                  </span>
                )}
              </div>
            </div>

            <div className="pt-1">
              <button
                type="button"
                onClick={() => signOut({ callbackUrl: "/" })}
                className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium text-destructive transition-colors hover:bg-destructive/10"
              >
                <LogOut className="h-3.5 w-3.5" />
                <span>Sign Out</span>
              </button>
            </div>
          </div>
        )}
      </div>

      <AuthModal isOpen={modalOpen} onClose={() => setModalOpen(false)} />
    </>
  );
}
