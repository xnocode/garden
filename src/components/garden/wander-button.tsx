"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Sprout } from "lucide-react";

interface WanderButtonProps {
  featuredSlug?: string;
}

export function WanderButton({ featuredSlug }: WanderButtonProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const startWandering = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/random");
      if (!res.ok) throw new Error();
      const data = await res.json();
      if (data.slug) {
        router.push(`/?p=${encodeURIComponent(data.slug)}`);
      }
    } catch {
      if (featuredSlug) {
        router.push(`/?p=${encodeURIComponent(featuredSlug)}`);
      } else {
        router.push("/?view=index");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={startWandering}
      disabled={loading}
      className="btn-glow inline-flex items-center gap-2 rounded-md bg-garden px-6 py-2.5 text-sm font-medium text-garden-foreground disabled:opacity-50"
    >
      <Sprout className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
      Start wandering
    </button>
  );
}
