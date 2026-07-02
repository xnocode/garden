"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { createPortal } from "react-dom";
import { Play, Loader2, Terminal, CheckCircle2, XCircle, Clock, MemoryStick } from "lucide-react";

interface RunResult {
  stdout: string | null;
  stderr: string | null;
  compileOutput: string | null;
  message: string | null;
  time: string | null;
  memory: number | null;
  status: { id: number; description: string } | null;
}

/** Languages that can be run via Judge0. */
const RUNNABLE_LANGUAGES = new Set([
  "python", "python3", "py",
  "javascript", "js", "node",
  "typescript", "ts",
  "c", "cpp", "c++", "c99",
  "java",
  "go", "golang",
  "rust", "rs",
  "ruby", "rb",
  "php",
  "swift",
  "kotlin", "kt",
  "scala",
  "lua",
  "bash", "sh", "shell",
  "sql",
  "dart",
  "elixir",
  "clojure",
  "haskell", "hs",
  "perl",
  "r",
  "csharp", "cs", "c#",
  "zig",
  "nim",
]);

interface CodeBlockInfo {
  id: number;
  lang: string;
  code: string;
}

/**
 * Enhances all <pre> code blocks in the note content with a Run button
 * (for runnable languages), a collapsible stdin input, and an output panel.
 * Uses React Portals to render UI into the correct DOM positions (inside
 * the <pre> for the button, after the <pre> for the output).
 */
export function CodeBlockRunner() {
  const [blocks, setBlocks] = useState<CodeBlockInfo[]>([]);

  useEffect(() => {
    const container = document.getElementById("note-content");
    if (!container) return;
    const pres = Array.from(
      container.querySelectorAll("pre")
    ) as HTMLPreElement[];
    const found: CodeBlockInfo[] = [];
    let id = 0;
    for (const pre of pres) {
      const codeEl = pre.querySelector("code");
      if (!codeEl) continue;
      const cls = codeEl.className || "";
      const langMatch = cls.match(/language-([\w+#-]+)/);
      const lang = langMatch ? langMatch[1].toLowerCase() : "";
      if (!RUNNABLE_LANGUAGES.has(lang)) continue;
      const code = codeEl.textContent || "";
      if (getComputedStyle(pre).position === "static") {
        pre.style.position = "relative";
      }
      found.push({ id: id++, lang, code });
    }
    // One-time DOM scan after mount
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setBlocks(found);
  }, []);

  if (blocks.length === 0) return null;

  return (
    <>
      {blocks.map((b) => (
        <CodeBlockEnhancer key={b.id} block={b} />
      ))}
    </>
  );
}

function CodeBlockEnhancer({ block }: { block: CodeBlockInfo }) {
  const [showInput, setShowInput] = useState(false);
  const [input, setInput] = useState("");
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<RunResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [preEl, setPreEl] = useState<HTMLPreElement | null>(null);
  const [outputEl, setOutputEl] = useState<HTMLDivElement | null>(null);

  // Find the matching <pre> element and create an output container after it
  useEffect(() => {
    const container = document.getElementById("note-content");
    if (!container) return;
    const pres = Array.from(
      container.querySelectorAll("pre")
    ) as HTMLPreElement[];
    let createdOut: HTMLDivElement | null = null;
    for (const pre of pres) {
      const codeEl = pre.querySelector("code");
      if (!codeEl) continue;
      const cls = codeEl.className || "";
      const langMatch = cls.match(/language-([\w+#-]+)/);
      const lang = langMatch ? langMatch[1].toLowerCase() : "";
      if (lang === block.lang && (codeEl.textContent || "") === block.code) {
        setPreEl(pre);
        // Create an output container after the pre
        const out = document.createElement("div");
        out.className = "code-output-wrapper";
        pre.parentNode?.insertBefore(out, pre.nextSibling);
        setOutputEl(out);
        createdOut = out;
        break;
      }
    }
    return () => {
      if (createdOut) {
        createdOut.remove();
      }
    };
  }, [block]);

  const run = useCallback(async () => {
    setRunning(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetch("/api/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: block.code,
          language: block.lang,
          input,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Run failed");
      } else {
        setResult(data);
      }
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setRunning(false);
    }
  }, [block.code, block.lang, input]);

  const isAccepted = result?.status?.id === 3;
  const isError = result?.status && result.status.id > 3;
  const output =
    result?.stdout || result?.stderr || result?.compileOutput || "";

  return (
    <>
      {/* Run button — portaled into the <pre> element */}
      {preEl &&
        createPortal(
          <div
            style={{
              position: "absolute",
              top: "0.5rem",
              right: "0.5rem",
              display: "flex",
              gap: "0.375rem",
              zIndex: 10,
            }}
          >
            <button
              onClick={run}
              disabled={running}
              className="inline-flex items-center gap-1 rounded bg-garden px-2.5 py-1 font-mono text-[11px] font-semibold text-garden-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
              title="Run code"
            >
              {running ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <Play className="h-3 w-3" fill="currentColor" />
              )}
              {running ? "…" : "Run"}
            </button>
            <button
              onClick={() => setShowInput(!showInput)}
              className={`inline-flex items-center justify-center rounded border p-1 transition-colors ${
                showInput
                  ? "border-garden/40 bg-garden/10 text-garden"
                  : "border-white/10 bg-white/5 text-muted-foreground hover:text-foreground"
              }`}
              title="Toggle stdin input"
            >
              <Terminal className="h-3.5 w-3.5" />
            </button>
          </div>,
          preEl
        )}

      {/* Output panel — portaled into the container after the <pre> */}
      {outputEl &&
        createPortal(
          <div className="code-output">
            {showInput && (
              <div className="mb-2">
                <div className="mb-1 flex items-center gap-1.5 font-mono text-[10px] text-muted-foreground">
                  <Terminal className="h-3 w-3" />
                  stdin
                </div>
                <textarea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Enter input for your program…"
                  className="min-h-[60px] w-full rounded-md border border-border bg-surface px-3 py-2 font-mono text-xs text-foreground outline-none focus:border-garden/40"
                />
              </div>
            )}

            {error && (
              <div
                className="mb-3 rounded-md border border-destructive/30 border-l-2 p-3 font-mono text-xs text-destructive"
                style={{ background: "rgba(224,108,117,0.06)" }}
              >
                ⚠ {error}
              </div>
            )}

            {result && (
              <div className="mb-4 overflow-hidden rounded-lg border border-border bg-surface">
                <div className="flex items-center gap-3 border-b border-border px-3 py-2 font-mono text-[10px]">
                  <span
                    className="flex items-center gap-1 font-semibold"
                    style={{
                      color: isAccepted
                        ? "var(--garden)"
                        : isError
                          ? "var(--destructive)"
                          : "var(--muted-foreground)",
                    }}
                  >
                    {isAccepted ? (
                      <CheckCircle2 className="h-3 w-3" />
                    ) : (
                      <XCircle className="h-3 w-3" />
                    )}
                    {result.status?.description || "Unknown"}
                  </span>
                  {result.time && (
                    <span className="flex items-center gap-1 text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      {result.time}s
                    </span>
                  )}
                  {result.memory != null && (
                    <span className="flex items-center gap-1 text-muted-foreground">
                      <MemoryStick className="h-3 w-3" />
                      {(result.memory / 1024).toFixed(1)} MB
                    </span>
                  )}
                </div>
                {output ? (
                  <pre
                    className="max-h-[300px] overflow-y-auto p-3 font-mono text-xs leading-relaxed"
                    style={{
                      color:
                        result.stderr || result.compileOutput
                          ? "var(--destructive)"
                          : "var(--foreground)",
                      whiteSpace: "pre-wrap",
                      wordBreak: "break-word",
                    }}
                  >
                    {output}
                  </pre>
                ) : isAccepted ? (
                  <div className="p-3 font-mono text-xs italic text-muted-foreground">
                    (no output)
                  </div>
                ) : null}
              </div>
            )}
          </div>,
          outputEl
        )}
    </>
  );
}
