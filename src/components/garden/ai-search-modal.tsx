"use client";

import { useState } from "react";
import { Sparkles, Search, X, Loader2, ArrowRight, BookOpen, Copy, Check } from "lucide-react";
import Link from "next/link";

const SUGGESTED_PROMPTS = [
  "What is Zettelkasten?",
  "Summarize Python data types notes",
  "What notes do I have about Digital Gardens?",
  "How does posting work in this garden?",
];

export function AISearchModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [answer, setAnswer] = useState<string | null>(null);
  const [sources, setSources] = useState<Array<{ title: string; slug: string }>>([]);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  async function handleSearch(searchQuery: string) {
    const q = searchQuery.trim();
    if (!q) return;

    setLoading(true);
    setError(null);
    setAnswer(null);
    setSources([]);

    try {
      const res = await fetch("/api/ai-search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: q }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to search garden AI.");
      }

      setAnswer(data.answer);
      setSources(data.sources || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  function handleCopy() {
    if (!answer) return;
    navigator.clipboard.writeText(answer);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl overflow-hidden rounded-2xl border border-border bg-surface shadow-2xl">
        {/* Top Header */}
        <div className="flex items-center justify-between border-b border-border bg-surface/50 px-6 py-4">
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-garden/10 text-garden ring-1 ring-garden/30">
              <Sparkles className="h-4 w-4" />
            </span>
            <div>
              <h2 className="font-serif text-base font-semibold text-heading">Ask Garden AI</h2>
              <p className="text-xs text-muted-foreground">Search and synthesize knowledge across published notes</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-muted-foreground hover:bg-surface-2 hover:text-foreground transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Search Bar Input */}
        <div className="p-6">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSearch(query);
            }}
            className="relative flex items-center"
          >
            <Search className="absolute left-4 h-5 w-5 text-muted-foreground" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Ask anything about the notes in this garden..."
              className="w-full rounded-xl border border-border bg-background py-3.5 pl-11 pr-24 text-sm text-foreground placeholder:text-muted-foreground/60 focus:border-garden focus:outline-none focus:ring-1 focus:ring-garden"
              autoFocus
            />
            <button
              type="submit"
              disabled={loading || !query.trim()}
              className="absolute right-2.5 inline-flex items-center gap-1.5 rounded-lg bg-garden px-3 py-1.5 text-xs font-semibold text-background transition-opacity hover:bg-garden/90 disabled:opacity-50"
            >
              {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ArrowRight className="h-3.5 w-3.5" />}
              <span>Ask</span>
            </button>
          </form>

          {/* Suggested prompts pills */}
          {!answer && !loading && (
            <div className="mt-4">
              <span className="text-[11px] font-mono uppercase tracking-wider text-muted-foreground/60">
                Suggested Questions:
              </span>
              <div className="mt-2 flex flex-wrap gap-2">
                {SUGGESTED_PROMPTS.map((prompt) => (
                  <button
                    key={prompt}
                    onClick={() => {
                      setQuery(prompt);
                      handleSearch(prompt);
                    }}
                    className="inline-flex items-center gap-1.5 rounded-full border border-border bg-surface-2/40 px-3 py-1 text-xs text-muted-foreground transition-colors hover:border-garden/40 hover:text-foreground"
                  >
                    <Sparkles className="h-3 w-3 text-garden" />
                    {prompt}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Loading Animation */}
          {loading && (
            <div className="mt-8 flex flex-col items-center justify-center py-10 text-center">
              <div className="relative flex h-12 w-12 items-center justify-center rounded-full bg-garden/10 text-garden ring-1 ring-garden/30 animate-pulse">
                <Sparkles className="h-6 w-6" />
              </div>
              <p className="mt-4 font-serif text-sm text-heading">Searching your garden notes & thinking...</p>
              <p className="mt-1 text-xs text-muted-foreground/60">Synthesizing insights with AI</p>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="mt-6 rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-xs text-red-400">
              ⚠️ {error}
            </div>
          )}

          {/* AI Response Output */}
          {answer && (
            <div className="mt-6 space-y-4">
              <div className="flex items-center justify-between border-b border-border/50 pb-2">
                <span className="flex items-center gap-1.5 text-xs font-mono text-garden">
                  <Sparkles className="h-3.5 w-3.5" /> AI Response
                </span>
                <button
                  onClick={handleCopy}
                  className="inline-flex items-center gap-1 rounded px-2 py-1 text-[11px] text-muted-foreground hover:bg-surface-2 hover:text-foreground"
                >
                  {copied ? <Check className="h-3 w-3 text-green-400" /> : <Copy className="h-3 w-3" />}
                  <span>{copied ? "Copied" : "Copy"}</span>
                </button>
              </div>

              <div className="prose prose-invert prose-sm max-w-none font-sans leading-relaxed text-foreground/90 whitespace-pre-line">
                {answer}
              </div>

              {/* Source Note Badges */}
              {sources.length > 0 && (
                <div className="mt-6 border-t border-border/50 pt-4">
                  <span className="text-[11px] font-mono uppercase tracking-wider text-muted-foreground/60">
                    Referenced Notes:
                  </span>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {sources.map((s) => (
                      <Link
                        key={s.slug}
                        href={`/?p=${s.slug}`}
                        onClick={onClose}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-surface px-2.5 py-1 text-xs text-garden hover:border-garden transition-colors"
                      >
                        <BookOpen className="h-3 w-3" />
                        <span>{s.title}</span>
                      </Link>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
