"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Sparkles, Search, X, Loader2, ArrowRight, BookOpen, Copy, Check, RotateCcw, ExternalLink } from "lucide-react";

const SUGGESTED_PROMPTS = [
  "What python notes are available?",
  "What is Zettelkasten method?",
  "Summarize Digital Garden concept",
  "How does posting work in this garden?",
];

function renderFormattedMarkdown(text: string, onNavigate: (urlOrSlug: string) => void) {
  const parts: (string | React.ReactNode)[] = [];
  const regex = /\[([^\]]+)\]\(([^)]+)\)/g;
  let lastIndex = 0;
  let match;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(text.substring(lastIndex, match.index));
    }
    const label = match[1];
    const url = match[2];

    const slugMatch = url.match(/[?&]p=([^&]+)/);
    const target = slugMatch ? slugMatch[1] : url;

    parts.push(
      <button
        key={match.index}
        type="button"
        onClick={() => onNavigate(target)}
        className="inline-flex items-center gap-0.5 text-garden underline underline-offset-4 font-semibold hover:text-garden/80 transition-colors cursor-pointer text-left"
      >
        <span>{label}</span>
        <ExternalLink className="h-3 w-3 inline" />
      </button>
    );

    lastIndex = regex.lastIndex;
  }

  if (lastIndex < text.length) {
    parts.push(text.substring(lastIndex));
  }

  return parts;
}

export function AISearchModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [answer, setAnswer] = useState<string | null>(null);
  const [sources, setSources] = useState<Array<{ title: string; slug: string; tags?: string[] }>>([]);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  function handleNavigate(urlOrSlug: string) {
    onClose();
    const href = urlOrSlug.startsWith("/") ? urlOrSlug : `/?p=${encodeURIComponent(urlOrSlug)}`;
    router.push(href);
  }

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

  function handleReset() {
    setQuery("");
    setAnswer(null);
    setError(null);
    setSources([]);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-md animate-in fade-in duration-200">
      {/* Outer Glow Wrapper */}
      <div className="relative w-full max-w-2xl overflow-hidden rounded-2xl border border-garden/30 bg-surface shadow-2xl shadow-garden/10 ring-1 ring-garden/20">
        {/* Top Header Bar */}
        <div className="flex items-center justify-between border-b border-border/80 bg-surface/80 backdrop-blur-md px-6 py-4">
          <div className="flex items-center gap-2.5">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-garden/15 text-garden ring-1 ring-garden/30 animate-pulse">
              <Sparkles className="h-4 w-4" />
            </span>
            <div>
              <h2 className="font-serif text-base font-semibold tracking-tight text-heading">Garden AI Assistant</h2>
              <p className="text-[11px] font-mono text-muted-foreground">Powered by Gemini 2.0 &amp; Groq Llama-3.3</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-muted-foreground hover:bg-surface-2 hover:text-foreground transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Form & Input Section */}
        <div className="p-6 max-h-[80vh] overflow-y-auto">
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
              className="w-full rounded-xl border border-border/80 bg-background/90 py-3.5 pl-11 pr-24 text-sm text-foreground placeholder:text-muted-foreground/60 focus:border-garden focus:outline-none focus:ring-1 focus:ring-garden transition-all"
              autoFocus
            />
            <button
              type="submit"
              disabled={loading || !query.trim()}
              className="absolute right-2.5 inline-flex items-center gap-1.5 rounded-lg bg-garden px-3.5 py-1.5 text-xs font-semibold text-background transition-all hover:bg-garden/90 disabled:opacity-50"
            >
              {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ArrowRight className="h-3.5 w-3.5" />}
              <span>Ask</span>
            </button>
          </form>

          {/* Suggested Prompts Pills */}
          {!answer && !loading && (
            <div className="mt-5 animate-in fade-in duration-300">
              <span className="text-[11px] font-mono uppercase tracking-wider text-muted-foreground/60">
                Suggested Questions:
              </span>
              <div className="mt-2.5 flex flex-wrap gap-2">
                {SUGGESTED_PROMPTS.map((prompt) => (
                  <button
                    key={prompt}
                    onClick={() => {
                      setQuery(prompt);
                      handleSearch(prompt);
                    }}
                    className="inline-flex items-center gap-1.5 rounded-full border border-border bg-surface-2/40 px-3.5 py-1 text-xs text-muted-foreground transition-all hover:border-garden/50 hover:bg-garden/5 hover:text-foreground"
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
            <div className="mt-8 flex flex-col items-center justify-center py-10 text-center animate-in fade-in duration-200">
              <div className="relative flex h-12 w-12 items-center justify-center rounded-full bg-garden/15 text-garden ring-1 ring-garden/30">
                <Sparkles className="h-6 w-6 animate-spin" />
              </div>
              <p className="mt-4 font-serif text-sm font-medium text-heading">Searching published notes &amp; synthesizing answer...</p>
              <p className="mt-1 font-mono text-[11px] text-muted-foreground/60">Reading content across garden vault</p>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="mt-6 rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-xs text-red-400">
              ⚠️ {error}
            </div>
          )}

          {/* AI Response Output */}
          {answer && (
            <div className="mt-6 space-y-4 animate-in fade-in duration-300">
              <div className="flex items-center justify-between border-b border-border/60 pb-2.5">
                <span className="flex items-center gap-1.5 text-xs font-mono font-semibold text-garden">
                  <Sparkles className="h-3.5 w-3.5" /> AI Response
                </span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleReset}
                    className="inline-flex items-center gap-1 rounded-md border border-border bg-surface/50 px-2 py-1 text-[11px] text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <RotateCcw className="h-3 w-3" />
                    <span>New Question</span>
                  </button>
                  <button
                    onClick={handleCopy}
                    className="inline-flex items-center gap-1 rounded-md border border-border bg-surface/50 px-2 py-1 text-[11px] text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {copied ? <Check className="h-3 w-3 text-green-400" /> : <Copy className="h-3 w-3" />}
                    <span>{copied ? "Copied" : "Copy"}</span>
                  </button>
                </div>
              </div>

              <div className="prose prose-invert prose-sm max-w-none font-sans leading-relaxed text-foreground/90 whitespace-pre-line">
                {renderFormattedMarkdown(answer, handleNavigate)}
              </div>

              {/* Source Note Badges */}
              {sources.length > 0 && (
                <div className="mt-6 border-t border-border/60 pt-4">
                  <span className="text-[11px] font-mono uppercase tracking-wider text-muted-foreground/60">
                    Click to Open Full Source Notes:
                  </span>
                  <div className="mt-2.5 flex flex-wrap gap-2">
                    {sources.map((s) => (
                      <button
                        key={s.slug}
                        onClick={() => handleNavigate(s.slug)}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-garden/30 bg-garden/10 px-3 py-1.5 text-xs font-medium text-garden hover:bg-garden/20 transition-all cursor-pointer"
                      >
                        <BookOpen className="h-3.5 w-3.5" />
                        <span>{s.title}</span>
                        <ExternalLink className="h-3 w-3 ml-0.5" />
                      </button>
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
