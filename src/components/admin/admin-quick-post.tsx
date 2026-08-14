"use client";

import { useState, useEffect, useRef, useCallback, useDeferredValue } from "react";
import { createPortal } from "react-dom";
import {
  X,
  Send,
  Eye,
  Edit3,
  Globe,
  Users,
  Lock,
  Loader2,
  Trash2,
  FileText,
  Cloud,
  HardDrive,
  Bold,
  Italic,
  Heading2,
  Link as LinkIcon,
  Code,
  Quote,
  List,
  Sparkles,
  Plus,
  Maximize2,
  Minimize2,
  Columns,
  Clock,
  BookOpen,
} from "lucide-react";

interface AdminQuickPostProps {
  isOpen: boolean;
  onClose: () => void;
}

interface DraftItem {
  id: string;
  title: string;
  content: string;
  tags: string;
  visibility: string;
  updatedAt: string;
}

const LOCAL_STORAGE_KEY = "garden_admin_active_draft";

export function AdminQuickPost({ isOpen, onClose }: AdminQuickPostProps) {
  const [mounted, setMounted] = useState(false);
  // View mode: on desktop default to side-by-side "split", on mobile "write"
  const [viewMode, setViewMode] = useState<"write" | "split" | "preview" | "drafts">("split");

  // Note fields
  const [draftId, setDraftId] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [tagsInput, setTagsInput] = useState("");
  const [visibility, setVisibility] = useState<"public" | "members" | "private">("public");

  // Deferred content for live preview so typing has 0ms latency
  const deferredTitle = useDeferredValue(title);
  const deferredContent = useDeferredValue(content);
  const deferredTags = useDeferredValue(tagsInput);

  // Statuses
  const [localSavedTime, setLocalSavedTime] = useState<string | null>(null);
  const [cloudSaving, setCloudSaving] = useState(false);
  const [cloudSavedTime, setCloudSavedTime] = useState<string | null>(null);
  const [publishing, setPublishing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Cloud drafts list
  const [draftsList, setDraftsList] = useState<DraftItem[]>([]);
  const [loadingDrafts, setLoadingDrafts] = useState(false);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const localStorageTimerRef = useRef<NodeJS.Timeout | null>(null);
  const cloudSaveTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    setMounted(true);
    // Set split on desktop, write on mobile
    if (typeof window !== "undefined" && window.innerWidth < 768) {
      setViewMode("write");
    }
  }, []);

  // Fetch cloud drafts when opened
  const fetchCloudDrafts = useCallback(async () => {
    setLoadingDrafts(true);
    try {
      const res = await fetch("/api/admin/drafts");
      if (res.ok) {
        const data = await res.json();
        setDraftsList(data.drafts || []);
      }
    } catch {
      // Ignore network failure
    } finally {
      setLoadingDrafts(false);
    }
  }, []);

  // Load active draft from local storage when modal opens
  useEffect(() => {
    if (!isOpen) return;

    fetchCloudDrafts();

    const savedLocal = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (savedLocal) {
      try {
        const parsed = JSON.parse(savedLocal);
        if (parsed.title || parsed.content) {
          setTitle(parsed.title || "");
          setContent(parsed.content || "");
          setTagsInput(parsed.tagsInput || "");
          setVisibility(parsed.visibility || "public");
          setDraftId(parsed.draftId || null);
          setLocalSavedTime("Device safe");
        }
      } catch {
        // Corrupted draft
      }
    }
  }, [isOpen, fetchCloudDrafts]);

  // Debounced Local Storage & Cloud Auto-Save (smooth 60fps typing)
  useEffect(() => {
    if (!isOpen) return;

    // Debounce localStorage writes by 300ms
    if (localStorageTimerRef.current) {
      clearTimeout(localStorageTimerRef.current);
    }

    localStorageTimerRef.current = setTimeout(() => {
      const draftData = {
        draftId,
        title,
        content,
        tagsInput,
        visibility,
        savedAt: new Date().toISOString(),
      };
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(draftData));
      const now = new Date();
      setLocalSavedTime(
        now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })
      );
    }, 300);

    // Debounce Cloud Auto-Save by 4 seconds
    if (cloudSaveTimerRef.current) {
      clearTimeout(cloudSaveTimerRef.current);
    }

    if (title.trim() || content.trim()) {
      cloudSaveTimerRef.current = setTimeout(async () => {
        setCloudSaving(true);
        try {
          const tags = tagsInput
            .split(",")
            .map((t) => t.trim().replace(/^#/, ""))
            .filter(Boolean);

          const res = await fetch("/api/admin/drafts", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              id: draftId,
              title,
              content,
              tags,
              visibility,
            }),
          });

          if (res.ok) {
            const data = await res.json();
            if (data.draft?.id && !draftId) {
              setDraftId(data.draft.id);
            }
            const timeStr = new Date().toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            });
            setCloudSavedTime(`Synced ${timeStr}`);
          }
        } catch {
          // Cloud offline
        } finally {
          setCloudSaving(false);
        }
      }, 4000);
    }

    return () => {
      if (localStorageTimerRef.current) clearTimeout(localStorageTimerRef.current);
      if (cloudSaveTimerRef.current) clearTimeout(cloudSaveTimerRef.current);
    };
  }, [title, content, tagsInput, visibility, draftId, isOpen]);

  // Insert markdown helpers
  const insertMarkdown = (before: string, after: string = "", placeholder: string = "") => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selected = content.slice(start, end) || placeholder;

    const newContent = content.slice(0, start) + before + selected + after + content.slice(end);
    setContent(newContent);

    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + before.length, start + before.length + selected.length);
    }, 30);
  };

  // Load a draft from cloud drafts list
  const loadDraft = (d: DraftItem) => {
    let parsedTags = "";
    try {
      const arr = JSON.parse(d.tags);
      parsedTags = Array.isArray(arr) ? arr.join(", ") : "";
    } catch {
      parsedTags = d.tags || "";
    }

    setDraftId(d.id);
    setTitle(d.title || "");
    setContent(d.content || "");
    setTagsInput(parsedTags);
    setVisibility((d.visibility as any) || "public");
    setViewMode(window.innerWidth < 768 ? "write" : "split");
  };

  // Start a fresh note
  const startNewNote = () => {
    setDraftId(null);
    setTitle("");
    setContent("");
    setTagsInput("");
    setVisibility("public");
    localStorage.removeItem(LOCAL_STORAGE_KEY);
    setLocalSavedTime(null);
    setCloudSavedTime(null);
    setViewMode(window.innerWidth < 768 ? "write" : "split");
  };

  // Delete a draft
  const deleteDraft = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await fetch(`/api/admin/drafts?id=${id}`, { method: "DELETE" });
      setDraftsList((prev) => prev.filter((d) => d.id !== id));
      if (draftId === id) {
        startNewNote();
      }
    } catch {
      // Ignore
    }
  };

  // Publish Note
  const handlePublish = async () => {
    if (!title.trim()) {
      setError("Please add a title for your note.");
      return;
    }

    setPublishing(true);
    setError(null);
    setSuccess(null);

    try {
      const tags = tagsInput
        .split(",")
        .map((t) => t.trim().replace(/^#/, ""))
        .filter(Boolean);

      const res = await fetch("/api/admin/notes/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          content,
          tags,
          visibility,
          draftId,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Failed to publish note.");
        setPublishing(false);
        return;
      }

      // Clear local draft and go live
      localStorage.removeItem(LOCAL_STORAGE_KEY);
      setSuccess(`Published! Reloading garden...`);

      setTimeout(() => {
        window.location.href = "/";
      }, 800);
    } catch (err: any) {
      setError(err?.message || "Failed to publish note. Please check connection.");
      setPublishing(false);
    }
  };

  const wordCount = deferredContent.trim().split(/\s+/).filter(Boolean).length;
  const readTimeMin = Math.max(1, Math.ceil(wordCount / 200));

  if (!isOpen || !mounted) return null;

  const modalContent = (
    <div className="fixed inset-0 z-[100] flex flex-col bg-background text-foreground animate-in fade-in duration-150">
      {/* Top Studio Navigation Bar */}
      <header className="flex h-14 items-center justify-between border-b border-border bg-surface px-4 sm:px-6 flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-garden/15 text-garden">
            <Edit3 className="h-4 w-4" />
          </div>
          <div>
            <h1 className="text-sm font-serif font-bold text-heading leading-tight">
              Garden Writing Studio
            </h1>
            <p className="text-[10px] text-muted-foreground hidden sm:block">
              Full-window distraction-free author environment
            </p>
          </div>
        </div>

        {/* View Mode Controls (Desktop: Split/Write/Preview | Mobile: Write/Preview/Drafts) */}
        <div className="flex items-center gap-1 rounded-xl border border-border bg-surface-2 p-1">
          <button
            type="button"
            onClick={() => setViewMode("write")}
            className={`flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-medium transition-all ${
              viewMode === "write"
                ? "bg-garden text-garden-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
            title="Full Editor View"
          >
            <Edit3 className="h-3 w-3" />
            <span>Write</span>
          </button>

          <button
            type="button"
            onClick={() => setViewMode("split")}
            className={`hidden md:flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-medium transition-all ${
              viewMode === "split"
                ? "bg-garden text-garden-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
            title="Side-by-Side Editor & Live Preview"
          >
            <Columns className="h-3 w-3" />
            <span>Split Preview</span>
          </button>

          <button
            type="button"
            onClick={() => setViewMode("preview")}
            className={`flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-medium transition-all ${
              viewMode === "preview"
                ? "bg-garden text-garden-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
            title="Full Reader Preview"
          >
            <Eye className="h-3 w-3" />
            <span>Preview</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setViewMode("drafts");
              fetchCloudDrafts();
            }}
            className={`flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-medium transition-all ${
              viewMode === "drafts"
                ? "bg-garden text-garden-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
            title="View All Saved Drafts"
          >
            <FileText className="h-3 w-3" />
            <span>Drafts ({draftsList.length})</span>
          </button>
        </div>

        {/* Right Actions */}
        <div className="flex items-center gap-2 sm:gap-3">
          <button
            type="button"
            onClick={handlePublish}
            disabled={publishing || !title.trim()}
            className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-garden px-4 text-xs font-semibold text-garden-foreground shadow-sm transition-all hover:opacity-90 active:scale-[0.98] disabled:opacity-50"
          >
            {publishing ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Send className="h-3.5 w-3.5" />
            )}
            <span>{publishing ? "Publishing..." : "Publish Live"}</span>
          </button>

          <button
            type="button"
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-border bg-surface text-muted-foreground hover:bg-surface-2 hover:text-foreground transition-colors"
            aria-label="Close studio"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </header>

      {/* Main Studio Body */}
      {viewMode === "drafts" ? (
        /* Cloud Drafts Manager View */
        <div className="flex-1 overflow-y-auto p-4 sm:p-8 max-w-4xl mx-auto w-full space-y-6">
          <div className="flex items-center justify-between border-b border-border pb-4">
            <div>
              <h2 className="text-xl font-serif font-bold text-heading">Cloud & Device Drafts</h2>
              <p className="text-xs text-muted-foreground mt-1">
                Seamlessly resume any note you started on your phone, laptop, or any computer.
              </p>
            </div>
            <button
              type="button"
              onClick={startNewNote}
              className="inline-flex items-center gap-1.5 rounded-xl bg-garden px-3.5 py-2 text-xs font-semibold text-garden-foreground hover:opacity-90 transition-all"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Start Blank Note</span>
            </button>
          </div>

          {loadingDrafts ? (
            <div className="flex items-center justify-center py-20 text-muted-foreground gap-2 text-xs">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Fetching cloud drafts from database...</span>
            </div>
          ) : draftsList.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border p-16 text-center text-muted-foreground text-xs">
              <FileText className="mx-auto mb-3 h-10 w-10 opacity-30" />
              <p className="font-medium text-sm text-foreground">No cloud drafts saved yet.</p>
              <p className="mt-1">Any note you start writing will automatically appear here.</p>
              <button
                type="button"
                onClick={startNewNote}
                className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-garden/15 px-4 py-2 text-xs font-medium text-garden hover:bg-garden/25 transition-colors"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>Write a new note</span>
              </button>
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {draftsList.map((d) => (
                <div
                  key={d.id}
                  onClick={() => loadDraft(d)}
                  className="group relative flex cursor-pointer flex-col justify-between rounded-2xl border border-border bg-surface p-5 transition-all hover:border-garden/50 hover:shadow-lg"
                >
                  <div>
                    <h3 className="font-serif font-bold text-base text-foreground line-clamp-1 group-hover:text-garden transition-colors">
                      {d.title || "Untitled Draft"}
                    </h3>
                    <p className="mt-2 text-xs text-muted-foreground line-clamp-3 leading-relaxed">
                      {d.content || "Empty content..."}
                    </p>
                  </div>

                  <div className="mt-4 flex items-center justify-between text-[11px] text-muted-foreground border-t border-border/60 pt-3">
                    <span className="capitalize rounded bg-surface-2 px-1.5 py-0.5 font-medium">
                      {d.visibility || "public"}
                    </span>
                    <div className="flex items-center gap-2.5">
                      <span>{new Date(d.updatedAt).toLocaleDateString()}</span>
                      <button
                        type="button"
                        onClick={(e) => deleteDraft(d.id, e)}
                        className="p-1 text-muted-foreground hover:text-destructive transition-colors rounded"
                        title="Delete draft"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        /* Writing / Split / Preview View */
        <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
          {/* LEFT PANE: Editor (shown in write or split mode) */}
          {(viewMode === "write" || viewMode === "split") && (
            <div
              className={`flex flex-col border-r border-border bg-background overflow-hidden ${
                viewMode === "split" ? "w-full md:w-1/2" : "w-full max-w-4xl mx-auto"
              }`}
            >
              {/* Note Metadata Bar */}
              <div className="border-b border-border/60 bg-surface/50 p-3 sm:p-4 space-y-2.5 flex-shrink-0">
                <div className="flex flex-col sm:flex-row gap-2">
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Note Title (e.g. Thinking in Systems)"
                    className="flex-1 rounded-xl border border-border bg-surface px-3.5 py-2 text-sm font-semibold text-heading placeholder:text-muted-foreground/40 transition-colors focus:border-garden focus:outline-none focus:ring-1 focus:ring-garden/40"
                  />

                  {/* Visibility Pill Selector */}
                  <div className="flex items-center gap-1 rounded-xl border border-border bg-surface p-1 self-start sm:self-auto">
                    <button
                      type="button"
                      onClick={() => setVisibility("public")}
                      className={`flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-medium transition-all ${
                        visibility === "public"
                          ? "bg-garden text-garden-foreground shadow-sm"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                      title="Public — visible to all readers"
                    >
                      <Globe className="h-3 w-3" />
                      <span>Public</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setVisibility("members")}
                      className={`flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-medium transition-all ${
                        visibility === "members"
                          ? "bg-garden text-garden-foreground shadow-sm"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                      title="Members — requires free sign in"
                    >
                      <Users className="h-3 w-3" />
                      <span>Members</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setVisibility("private")}
                      className={`flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-medium transition-all ${
                        visibility === "private"
                          ? "bg-garden text-garden-foreground shadow-sm"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                      title="Private — only you can view when logged in"
                    >
                      <Lock className="h-3 w-3" />
                      <span>Private</span>
                    </button>
                  </div>
                </div>

                {/* Tags input */}
                <input
                  type="text"
                  value={tagsInput}
                  onChange={(e) => setTagsInput(e.target.value)}
                  placeholder="Tags (e.g. essay, thinking, university)"
                  className="w-full rounded-lg border border-border bg-surface px-3 py-1.5 text-xs text-foreground placeholder:text-muted-foreground/40 transition-colors focus:border-garden focus:outline-none"
                />

                {/* Markdown Formatting Toolbar */}
                <div className="flex flex-wrap items-center gap-1 pt-1 text-muted-foreground">
                  <button
                    type="button"
                    onClick={() => insertMarkdown("**", "**", "bold text")}
                    className="rounded p-1.5 hover:bg-surface-2 hover:text-foreground transition-colors"
                    title="Bold"
                  >
                    <Bold className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => insertMarkdown("*", "*", "italic text")}
                    className="rounded p-1.5 hover:bg-surface-2 hover:text-foreground transition-colors"
                    title="Italic"
                  >
                    <Italic className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => insertMarkdown("## ", "\n", "Heading")}
                    className="rounded p-1.5 hover:bg-surface-2 hover:text-foreground transition-colors"
                    title="Heading"
                  >
                    <Heading2 className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => insertMarkdown("[", "](url)", "link text")}
                    className="rounded p-1.5 hover:bg-surface-2 hover:text-foreground transition-colors"
                    title="Web Link"
                  >
                    <LinkIcon className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => insertMarkdown("[[", "]]", "Note Title")}
                    className="rounded px-1.5 py-1 text-[11px] font-mono hover:bg-surface-2 hover:text-foreground transition-colors"
                    title="Wikilink [[Note]]"
                  >
                    [[]]
                  </button>
                  <button
                    type="button"
                    onClick={() => insertMarkdown("```\n", "\n```", "code")}
                    className="rounded p-1.5 hover:bg-surface-2 hover:text-foreground transition-colors"
                    title="Code Block"
                  >
                    <Code className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => insertMarkdown("> ", "\n", "Quote")}
                    className="rounded p-1.5 hover:bg-surface-2 hover:text-foreground transition-colors"
                    title="Quote"
                  >
                    <Quote className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => insertMarkdown("- ", "\n", "List item")}
                    className="rounded p-1.5 hover:bg-surface-2 hover:text-foreground transition-colors"
                    title="Bullet List"
                  >
                    <List className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => insertMarkdown("$", "$", "x = 2")}
                    className="rounded px-1.5 py-1 text-[11px] font-mono hover:bg-surface-2 hover:text-foreground transition-colors"
                    title="Inline Math ($...$)"
                  >
                    $fx$
                  </button>
                  <button
                    type="button"
                    onClick={() => insertMarkdown("> [!note] ", "\n", "Callout text")}
                    className="rounded px-1.5 py-1 text-[11px] font-medium hover:bg-surface-2 hover:text-foreground transition-colors"
                    title="Obsidian Callout"
                  >
                    [!note]
                  </button>
                </div>
              </div>

              {/* Textarea */}
              <div className="flex-1 p-3 sm:p-5 overflow-hidden flex flex-col">
                <textarea
                  ref={textareaRef}
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="Write your note in Markdown... (supports [[wikilinks]], $math$, callouts, and code blocks)"
                  className="flex-1 w-full resize-none border-none bg-transparent p-0 text-sm sm:text-base font-mono text-foreground placeholder:text-muted-foreground/30 focus:outline-none leading-relaxed overflow-y-auto"
                />
              </div>
            </div>
          )}

          {/* RIGHT PANE: Live Auto-Preview (shown in preview or split mode) */}
          {(viewMode === "preview" || viewMode === "split") && (
            <div
              className={`flex-1 overflow-y-auto bg-surface/30 p-4 sm:p-8 ${
                viewMode === "preview" ? "max-w-4xl mx-auto w-full" : ""
              }`}
            >
              <div className="max-w-2xl mx-auto space-y-4">
                <div className="border-b border-border pb-4">
                  <div className="flex items-center gap-2 text-xs text-garden font-medium mb-1">
                    <Sparkles className="h-3.5 w-3.5" />
                    <span className="uppercase tracking-wider text-[10px]">
                      {visibility} Note Preview
                    </span>
                  </div>
                  <h1 className="text-2xl sm:text-3xl font-serif font-bold text-heading">
                    {deferredTitle || "Untitled Note"}
                  </h1>

                  {deferredTags && (
                    <div className="mt-2.5 flex flex-wrap gap-1.5">
                      {deferredTags
                        .split(",")
                        .map((t) => t.trim().replace(/^#/, ""))
                        .filter(Boolean)
                        .map((tag) => (
                          <span
                            key={tag}
                            className="rounded-md bg-garden/10 px-2 py-0.5 text-[11px] font-medium text-garden"
                          >
                            #{tag}
                          </span>
                        ))}
                    </div>
                  )}
                </div>

                {/* Body Preview */}
                <div className="prose dark:prose-invert max-w-none text-sm sm:text-base text-foreground whitespace-pre-wrap leading-relaxed font-sans">
                  {deferredContent || (
                    <p className="text-muted-foreground italic text-sm">
                      Start typing on the left to see live preview here...
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Toast Alerts */}
      {error && (
        <div className="mx-4 my-2 flex items-center justify-between rounded-xl bg-destructive/15 p-2.5 text-xs text-destructive border border-destructive/30">
          <span>{error}</span>
          <button onClick={() => setError(null)}>
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}
      {success && (
        <div className="mx-4 my-2 flex items-center justify-between rounded-xl bg-garden/15 p-2.5 text-xs text-garden border border-garden/30">
          <span>{success}</span>
        </div>
      )}

      {/* Bottom Status Bar */}
      <footer className="flex h-10 items-center justify-between border-t border-border bg-surface px-4 sm:px-6 text-[11px] text-muted-foreground flex-shrink-0">
        <div className="flex items-center gap-4">
          <span className="inline-flex items-center gap-1.5">
            <HardDrive className="h-3 w-3 text-garden" />
            <span>{localSavedTime ? `Device: ${localSavedTime}` : "Device safe"}</span>
          </span>

          <span className="inline-flex items-center gap-1.5">
            <Cloud
              className={`h-3 w-3 ${cloudSaving ? "animate-pulse text-amber-400" : "text-sky-400"}`}
            />
            <span>{cloudSaving ? "Syncing..." : cloudSavedTime || "Cloud ready"}</span>
          </span>
        </div>

        <div className="flex items-center gap-4">
          <span className="inline-flex items-center gap-1">
            <BookOpen className="h-3 w-3" />
            <span>{wordCount} words</span>
          </span>

          <span className="inline-flex items-center gap-1 hidden sm:inline-flex">
            <Clock className="h-3 w-3" />
            <span>~{readTimeMin} min read</span>
          </span>
        </div>
      </footer>
    </div>
  );

  return createPortal(modalContent, document.body);
}
