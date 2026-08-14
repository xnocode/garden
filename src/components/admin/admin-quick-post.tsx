"use client";

import { useState, useEffect, useRef, useCallback } from "react";
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
  const [activeTab, setActiveTab] = useState<"write" | "preview" | "drafts">("write");

  // Note fields
  const [draftId, setDraftId] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [tagsInput, setTagsInput] = useState("");
  const [visibility, setVisibility] = useState<"public" | "members" | "private">("public");

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
  const cloudSaveTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    setMounted(true);
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
          setLocalSavedTime("Loaded from device");
        }
      } catch {
        // Corrupted draft
      }
    }
  }, [isOpen, fetchCloudDrafts]);

  // Continuous Local Storage Auto-Save
  useEffect(() => {
    if (!isOpen) return;

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

    // Debounced Cloud Auto-Save (5 seconds)
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
            setCloudSavedTime(`Cloud synced ${timeStr}`);
          }
        } catch {
          // Cloud save offline
        } finally {
          setCloudSaving(false);
        }
      }, 5000);
    }

    return () => {
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
    }, 50);
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
    setActiveTab("write");
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
    setActiveTab("write");
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

      // Success! Clear local draft
      localStorage.removeItem(LOCAL_STORAGE_KEY);
      setSuccess(`Note published successfully!`);

      setTimeout(() => {
        window.location.href = "/";
      }, 1000);
    } catch (err: any) {
      setError(err?.message || "Failed to publish note. Please check your connection.");
      setPublishing(false);
    }
  };

  if (!isOpen || !mounted) return null;

  const modalContent = (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 p-2 sm:p-4 backdrop-blur-md animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="relative flex h-[95vh] sm:h-[88vh] w-full max-w-4xl flex-col rounded-2xl border border-border bg-surface shadow-2xl overflow-hidden transition-all"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Header Bar */}
        <div className="flex items-center justify-between border-b border-border/80 bg-surface-2/60 px-4 py-3">
          <div className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-garden/15 text-garden ring-1 ring-garden/30">
              <Edit3 className="h-4 w-4" />
            </span>
            <div>
              <h2 className="text-sm font-serif font-bold text-heading">Garden Note Publisher</h2>
              <p className="text-[10px] text-muted-foreground hidden sm:block">
                Write & instant publish to your digital garden
              </p>
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="flex items-center gap-1 rounded-lg border border-border bg-surface p-1">
            <button
              type="button"
              onClick={() => setActiveTab("write")}
              className={`flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium transition-all ${
                activeTab === "write"
                  ? "bg-garden text-garden-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Edit3 className="h-3 w-3" />
              <span>Write</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("preview")}
              className={`flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium transition-all ${
                activeTab === "preview"
                  ? "bg-garden text-garden-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Eye className="h-3 w-3" />
              <span>Preview</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setActiveTab("drafts");
                fetchCloudDrafts();
              }}
              className={`flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium transition-all ${
                activeTab === "drafts"
                  ? "bg-garden text-garden-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <FileText className="h-3 w-3" />
              <span>Drafts ({draftsList.length})</span>
            </button>
          </div>

          {/* Close button */}
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-muted-foreground hover:bg-surface-2 hover:text-foreground transition-colors"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Content Body */}
        {activeTab === "drafts" ? (
          /* Drafts Manager View */
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-serif font-bold text-heading">Cloud & Device Drafts</h3>
                <p className="text-xs text-muted-foreground">
                  Pick up any unfinished note from your phone, laptop, or any computer.
                </p>
              </div>
              <button
                type="button"
                onClick={startNewNote}
                className="inline-flex items-center gap-1.5 rounded-xl bg-garden px-3 py-1.5 text-xs font-semibold text-garden-foreground hover:opacity-90 transition-all"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>New Note</span>
              </button>
            </div>

            {loadingDrafts ? (
              <div className="flex items-center justify-center py-16 text-muted-foreground gap-2 text-xs">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Loading drafts from cloud...</span>
              </div>
            ) : draftsList.length === 0 ? (
              <div className="rounded-xl border border-dashed border-border p-10 text-center text-muted-foreground text-xs">
                <FileText className="mx-auto mb-2 h-8 w-8 opacity-40" />
                <p>No saved cloud drafts found.</p>
                <button
                  type="button"
                  onClick={startNewNote}
                  className="mt-3 text-garden underline font-medium hover:opacity-80"
                >
                  Start writing a new note
                </button>
              </div>
            ) : (
              <div className="grid gap-2.5 sm:grid-cols-2">
                {draftsList.map((d) => (
                  <div
                    key={d.id}
                    onClick={() => loadDraft(d)}
                    className="group relative flex cursor-pointer flex-col justify-between rounded-xl border border-border bg-surface-2/40 p-4 transition-all hover:border-garden/40 hover:bg-surface-2/80"
                  >
                    <div>
                      <h4 className="font-medium text-sm text-foreground line-clamp-1">
                        {d.title || "Untitled Draft"}
                      </h4>
                      <p className="mt-1 text-xs text-muted-foreground line-clamp-2">
                        {d.content || "Empty content..."}
                      </p>
                    </div>

                    <div className="mt-3 flex items-center justify-between text-[11px] text-muted-foreground/80 border-t border-border/40 pt-2">
                      <span className="capitalize">{d.visibility || "public"}</span>
                      <div className="flex items-center gap-2">
                        <span>{new Date(d.updatedAt).toLocaleDateString()}</span>
                        <button
                          type="button"
                          onClick={(e) => deleteDraft(d.id, e)}
                          className="p-1 text-muted-foreground hover:text-destructive transition-colors"
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
        ) : activeTab === "preview" ? (
          /* Live Markdown Preview */
          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            <div className="border-b border-border pb-4">
              <div className="flex items-center gap-2 text-xs text-garden font-medium mb-1">
                <Sparkles className="h-3.5 w-3.5" />
                <span className="uppercase tracking-wider text-[10px]">
                  {visibility} Note Preview
                </span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-serif font-bold text-heading">
                {title || "Untitled Note"}
              </h1>
              {tagsInput && (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {tagsInput
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

            <div className="prose dark:prose-invert max-w-none text-sm text-foreground whitespace-pre-wrap leading-relaxed font-sans">
              {content || "Nothing written yet. Switch back to Write to compose your thoughts."}
            </div>
          </div>
        ) : (
          /* Write Editor View */
          <div className="flex flex-1 flex-col overflow-hidden p-3 sm:p-4 gap-3">
            {/* Title & Visibility row */}
            <div className="flex flex-col sm:flex-row gap-2">
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Note Title (e.g. Thinking in Systems)"
                className="flex-1 rounded-xl border border-border bg-surface-2 px-3.5 py-2 text-sm font-semibold text-foreground placeholder:text-muted-foreground/50 transition-colors focus:border-garden focus:outline-none focus:ring-1 focus:ring-garden/40"
              />

              {/* Visibility Selector */}
              <div className="flex items-center gap-1 rounded-xl border border-border bg-surface-2 p-1 self-start sm:self-auto">
                <button
                  type="button"
                  onClick={() => setVisibility("public")}
                  className={`flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] font-medium transition-all ${
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
                  className={`flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] font-medium transition-all ${
                    visibility === "members"
                      ? "bg-garden text-garden-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                  title="Members — requires login"
                >
                  <Users className="h-3 w-3" />
                  <span>Members</span>
                </button>

                <button
                  type="button"
                  onClick={() => setVisibility("private")}
                  className={`flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] font-medium transition-all ${
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

            {/* Tags row */}
            <input
              type="text"
              value={tagsInput}
              onChange={(e) => setTagsInput(e.target.value)}
              placeholder="Tags (comma separated, e.g. essay, thinking, reading)"
              className="w-full rounded-lg border border-border bg-surface-2 px-3 py-1.5 text-xs text-foreground placeholder:text-muted-foreground/50 transition-colors focus:border-garden focus:outline-none"
            />

            {/* Markdown Toolbar */}
            <div className="flex flex-wrap items-center gap-1 border-y border-border/60 py-1.5 text-muted-foreground">
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
                title="Link"
              >
                <LinkIcon className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                onClick={() => insertMarkdown("[[", "]]", "Note Title")}
                className="rounded px-1.5 py-1 text-[11px] font-mono hover:bg-surface-2 hover:text-foreground transition-colors"
                title="Wikilink"
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

            {/* Markdown Textarea */}
            <textarea
              ref={textareaRef}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Write your note in Markdown... (supports [[wikilinks]], $math$, callouts, and code)"
              className="flex-1 w-full resize-none rounded-xl border border-border bg-surface-2/40 p-3 sm:p-4 text-xs sm:text-sm font-mono text-foreground placeholder:text-muted-foreground/40 transition-colors focus:border-garden focus:outline-none focus:ring-1 focus:ring-garden/40 leading-relaxed overflow-y-auto"
            />
          </div>
        )}

        {/* Error / Success Toast Banner */}
        {error && (
          <div className="mx-4 mb-2 flex items-center justify-between rounded-lg bg-destructive/15 p-2 text-xs text-destructive border border-destructive/30">
            <span>{error}</span>
            <button onClick={() => setError(null)}>
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        )}
        {success && (
          <div className="mx-4 mb-2 flex items-center justify-between rounded-lg bg-garden/15 p-2 text-xs text-garden border border-garden/30">
            <span>{success}</span>
          </div>
        )}

        {/* Bottom Footer Bar */}
        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border/80 bg-surface-2/60 px-4 py-2.5">
          {/* Real-time Status Indicators */}
          <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
            <span className="inline-flex items-center gap-1">
              <HardDrive className="h-3 w-3 text-garden" />
              <span>{localSavedTime ? `Device: ${localSavedTime}` : "Device safe"}</span>
            </span>

            <span className="inline-flex items-center gap-1">
              <Cloud className={`h-3 w-3 ${cloudSaving ? "animate-pulse text-amber-400" : "text-sky-400"}`} />
              <span>{cloudSaving ? "Syncing..." : cloudSavedTime || "Cloud ready"}</span>
            </span>

            <span className="hidden sm:inline">
              {content.trim().split(/\s+/).filter(Boolean).length} words
            </span>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground hover:bg-surface-2 hover:text-foreground transition-all"
            >
              Close
            </button>

            <button
              type="button"
              onClick={handlePublish}
              disabled={publishing || !title.trim()}
              className="inline-flex items-center gap-1.5 rounded-xl bg-garden px-4 py-1.5 text-xs font-semibold text-garden-foreground hover:opacity-90 active:scale-[0.98] transition-all disabled:opacity-50 shadow-sm"
            >
              {publishing ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Send className="h-3.5 w-3.5" />
              )}
              <span>{publishing ? "Publishing..." : "Publish Note"}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}
