"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import {
  MessageSquare,
  CornerDownRight,
  Trash2,
  Send,
  Crown,
  ShieldCheck,
  User,
  Loader2,
  LogIn,
} from "lucide-react";
import { AuthModal } from "@/components/auth/auth-modal";

interface CommentUser {
  id: string;
  name: string | null;
  image: string | null;
  role: string;
}

interface CommentItem {
  id: string;
  content: string;
  noteSlug: string;
  userId: string;
  parentId: string | null;
  createdAt: string;
  user: CommentUser;
  replies?: CommentItem[];
}

interface CommentsSectionProps {
  noteSlug: string;
}

function timeAgo(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

export function CommentsSection({ noteSlug }: CommentsSectionProps) {
  const { data: session } = useSession();
  const [comments, setComments] = useState<CommentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [content, setContent] = useState("");
  const [replyingToId, setReplyingToId] = useState<string | null>(null);
  const [replyContent, setReplyContent] = useState("");
  const [authModalOpen, setAuthModalOpen] = useState(false);

  const currentUser = session?.user;
  const currentUserId = (currentUser as any)?.id;
  const currentUserRole = (currentUser as any)?.role || "member";
  const isAdmin = currentUserRole === "admin";

  const fetchComments = useCallback(async () => {
    try {
      const res = await fetch(`/api/comments?noteSlug=${encodeURIComponent(noteSlug)}`);
      if (res.ok) {
        const data = await res.json();
        setComments(data.comments || []);
      }
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  }, [noteSlug]);

  useEffect(() => {
    fetchComments();
  }, [fetchComments]);

  const handlePostComment = async (e: React.FormEvent, parentId: string | null = null) => {
    e.preventDefault();
    const text = parentId ? replyContent : content;
    if (!text.trim() || !session) return;

    setSubmitting(true);
    try {
      const res = await fetch("/api/comments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          noteSlug,
          content: text.trim(),
          parentId,
        }),
      });

      if (res.ok) {
        if (parentId) {
          setReplyContent("");
          setReplyingToId(null);
        } else {
          setContent("");
        }
        await fetchComments();
      }
    } catch {
      /* ignore */
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    if (!confirm("Are you sure you want to delete this comment?")) return;

    try {
      const res = await fetch(`/api/comments?id=${encodeURIComponent(commentId)}`, {
        method: "DELETE",
      });
      if (res.ok) {
        await fetchComments();
      }
    } catch {
      /* ignore */
    }
  };

  const totalComments = comments.reduce(
    (acc, c) => acc + 1 + (c.replies?.length || 0),
    0
  );

  return (
    <section
      aria-label="Discussion"
      className="rounded-2xl border border-border bg-gradient-to-b from-surface/50 to-surface/20 p-6 shadow-sm garden-fade-in"
    >
      {/* Header */}
      <header className="mb-6 flex items-center justify-between border-b border-border/40 pb-4">
        <div className="flex items-center gap-2.5">
          <span className="inline-flex h-8 w-8 items-center justify-center rounded-xl bg-garden/10 text-garden ring-1 ring-garden/30">
            <MessageSquare className="h-4 w-4" />
          </span>
          <div>
            <h3 className="font-serif text-base font-bold text-heading">
              Discussion ({totalComments})
            </h3>
            <p className="text-[11px] text-muted-foreground">
              Share your thoughts, ask questions, or connect with the author.
            </p>
          </div>
        </div>
      </header>

      {/* Main Comment Input Box */}
      {currentUser ? (
        <form onSubmit={(e) => handlePostComment(e, null)} className="mb-8">
          <div className="flex items-start gap-3">
            {currentUser.image ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={currentUser.image}
                alt={currentUser.name || "Avatar"}
                className="h-9 w-9 flex-shrink-0 rounded-full object-cover ring-1 ring-border"
              />
            ) : (
              <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-garden/20 text-xs font-bold text-garden">
                {currentUser.name ? currentUser.name.slice(0, 2).toUpperCase() : <User className="h-4 w-4" />}
              </div>
            )}

            <div className="flex-1 space-y-2">
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Write a thought or comment..."
                rows={3}
                className="w-full resize-none rounded-xl border border-border bg-surface-2 p-3 text-xs text-foreground placeholder:text-muted-foreground/60 focus:border-garden focus:outline-none focus:ring-1 focus:ring-garden/50"
              />
              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={submitting || !content.trim()}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-garden px-4 py-2 text-xs font-semibold text-garden-foreground transition-all hover:opacity-90 active:scale-95 disabled:opacity-50"
                >
                  {submitting ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Send className="h-3.5 w-3.5" />
                  )}
                  <span>Post Comment</span>
                </button>
              </div>
            </div>
          </div>
        </form>
      ) : (
        <div className="mb-8 flex flex-col items-center justify-center rounded-xl border border-border/70 bg-surface-2/60 p-6 text-center">
          <p className="text-xs text-muted-foreground">
            Sign in to join the conversation and leave a reply.
          </p>
          <button
            type="button"
            onClick={() => setAuthModalOpen(true)}
            className="mt-3 inline-flex items-center gap-2 rounded-lg bg-garden px-4 py-2 text-xs font-semibold text-garden-foreground transition-transform hover:opacity-90 active:scale-95"
          >
            <LogIn className="h-3.5 w-3.5" />
            <span>Sign In with Google or Email</span>
          </button>
        </div>
      )}

      {/* Comment List */}
      {loading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-5 w-5 animate-spin text-garden" />
        </div>
      ) : comments.length === 0 ? (
        <div className="py-6 text-center text-xs text-muted-foreground">
          No comments yet. Be the first to start the discussion!
        </div>
      ) : (
        <div className="space-y-4">
          {comments.map((comment) => {
            const isCommentAdmin = comment.user?.role === "admin";
            const isSelf = currentUserId === comment.userId;
            const canDelete = isSelf || isAdmin;

            return (
              <div
                key={comment.id}
                className={`rounded-xl border p-4 transition-colors ${
                  isCommentAdmin
                    ? "border-amber-500/30 bg-amber-500/5 shadow-[0_0_15px_-4px_rgba(245,158,11,0.1)]"
                    : "border-border/60 bg-surface/40"
                }`}
              >
                {/* Comment header */}
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    {comment.user?.image ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={comment.user.image}
                        alt=""
                        className="h-7 w-7 rounded-full object-cover ring-1 ring-border"
                      />
                    ) : (
                      <div className="flex h-7 w-7 items-center justify-center rounded-full bg-surface-2 text-[11px] font-bold text-foreground">
                        {comment.user?.name ? (
                          comment.user.name.slice(0, 2).toUpperCase()
                        ) : (
                          <User className="h-3 w-3" />
                        )}
                      </div>
                    )}

                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-semibold text-heading">
                        {comment.user?.name || "Anonymous Member"}
                      </span>

                      {isCommentAdmin && (
                        <span className="inline-flex items-center gap-0.5 rounded-full bg-amber-500/20 px-1.5 py-0.2 text-[9px] font-bold uppercase tracking-wider text-amber-400">
                          <Crown className="h-2.5 w-2.5" />
                          <span>Author</span>
                        </span>
                      )}

                      {!isCommentAdmin && (
                        <span className="inline-flex items-center rounded-full bg-surface-2 px-1.5 py-0.2 text-[9px] font-medium text-muted-foreground">
                          Member
                        </span>
                      )}

                      <span className="text-[10px] text-muted-foreground/60">·</span>
                      <span className="text-[10px] text-muted-foreground">
                        {timeAgo(comment.createdAt)}
                      </span>
                    </div>
                  </div>

                  {canDelete && (
                    <button
                      onClick={() => handleDeleteComment(comment.id)}
                      className="rounded p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
                      title="Delete comment"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>

                {/* Comment Body */}
                <p className="mt-2.5 text-xs leading-relaxed text-foreground whitespace-pre-wrap">
                  {comment.content}
                </p>

                {/* Reply trigger button */}
                {currentUser && (
                  <div className="mt-2 flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() =>
                        setReplyingToId(replyingToId === comment.id ? null : comment.id)
                      }
                      className="inline-flex items-center gap-1 text-[11px] font-medium text-muted-foreground hover:text-garden transition-colors"
                    >
                      <CornerDownRight className="h-3 w-3" />
                      <span>{replyingToId === comment.id ? "Cancel" : "Reply"}</span>
                    </button>
                  </div>
                )}

                {/* Reply Input Box */}
                {replyingToId === comment.id && currentUser && (
                  <form
                    onSubmit={(e) => handlePostComment(e, comment.id)}
                    className="mt-3 pl-4 border-l-2 border-garden/30"
                  >
                    <div className="space-y-2">
                      <textarea
                        value={replyContent}
                        onChange={(e) => setReplyContent(e.target.value)}
                        placeholder={`Reply to ${comment.user?.name || "member"}...`}
                        rows={2}
                        className="w-full resize-none rounded-lg border border-border bg-surface-2 p-2.5 text-xs text-foreground placeholder:text-muted-foreground/60 focus:border-garden focus:outline-none"
                      />
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setReplyingToId(null);
                            setReplyContent("");
                          }}
                          className="rounded px-2.5 py-1 text-xs text-muted-foreground hover:text-foreground"
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          disabled={submitting || !replyContent.trim()}
                          className="inline-flex items-center gap-1 rounded bg-garden px-3 py-1 text-xs font-semibold text-garden-foreground transition-all hover:opacity-90 disabled:opacity-50"
                        >
                          {submitting ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : (
                            <Send className="h-3 w-3" />
                          )}
                          <span>Reply</span>
                        </button>
                      </div>
                    </div>
                  </form>
                )}

                {/* Replies list */}
                {comment.replies && comment.replies.length > 0 && (
                  <div className="mt-3 space-y-2.5 border-l-2 border-border/60 pl-4">
                    {comment.replies.map((reply) => {
                      const isReplyAdmin = reply.user?.role === "admin";
                      const isReplySelf = currentUserId === reply.userId;
                      const canDeleteReply = isReplySelf || isAdmin;

                      return (
                        <div
                          key={reply.id}
                          className={`rounded-lg p-3 ${
                            isReplyAdmin
                              ? "bg-amber-500/5 border border-amber-500/20"
                              : "bg-surface-2/40 border border-border/40"
                          }`}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2">
                              {reply.user?.image ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img
                                  src={reply.user.image}
                                  alt=""
                                  className="h-5 w-5 rounded-full object-cover"
                                />
                              ) : (
                                <div className="flex h-5 w-5 items-center justify-center rounded-full bg-surface text-[10px] font-bold text-foreground">
                                  {reply.user?.name ? (
                                    reply.user.name.slice(0, 2).toUpperCase()
                                  ) : (
                                    <User className="h-2.5 w-2.5" />
                                  )}
                                </div>
                              )}

                              <span className="text-[11px] font-semibold text-heading">
                                {reply.user?.name || "Anonymous Member"}
                              </span>

                              {isReplyAdmin && (
                                <span className="inline-flex items-center gap-0.5 rounded-full bg-amber-500/20 px-1 py-0.1 text-[8px] font-bold uppercase tracking-wider text-amber-400">
                                  <Crown className="h-2 w-2" />
                                  <span>Author</span>
                                </span>
                              )}

                              <span className="text-[10px] text-muted-foreground/60">·</span>
                              <span className="text-[10px] text-muted-foreground">
                                {timeAgo(reply.createdAt)}
                              </span>
                            </div>

                            {canDeleteReply && (
                              <button
                                onClick={() => handleDeleteComment(reply.id)}
                                className="rounded p-0.5 text-muted-foreground hover:text-destructive"
                                title="Delete reply"
                              >
                                <Trash2 className="h-3 w-3" />
                              </button>
                            )}
                          </div>

                          <p className="mt-1 text-xs text-foreground whitespace-pre-wrap">
                            {reply.content}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <AuthModal isOpen={authModalOpen} onClose={() => setAuthModalOpen(false)} />
    </section>
  );
}
