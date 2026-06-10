import { useState, useRef, useEffect } from "react";
import { TUTOR_NAV } from "@/config/nav";
import { MessageSquareText, Plus, Send, Trash2, Tag, X, Loader2, ChevronLeft } from "lucide-react";
import { useAsync } from "@/hooks/useAsync";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { useAuthStore } from "@/store/auth";
import {
  getThreads, createThread, deleteThread,
  getPosts, createPost,
} from "@/api/forum";
import type { ForumThread, ForumPost } from "@/api/forum";
import Sidebar from "@/components/Sidebar";
import ErrorBanner from "@/components/ErrorBanner";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

const PRESET_TAGS = ["Методика", "ЕГЭ / ОГЭ", "Математика", "Физика", "Языки", "Начальная школа", "Онлайн"];

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const min = Math.floor(diff / 60000);
  if (min < 1) return "только что";
  if (min < 60) return `${min} мин назад`;
  const h = Math.floor(min / 60);
  if (h < 24) return `${h} ч назад`;
  const d = Math.floor(h / 24);
  return `${d} дн назад`;
}

function initials(name: string | null): string {
  if (!name) return "?";
  return name.split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2);
}

// ── Create thread modal ────────────────────────────────────────────────────────
function CreateThreadModal({ onClose, onCreated }: { onClose: () => void; onCreated: (t: ForumThread) => void }) {
  const [title,   setTitle]   = useState("");
  const [tag,     setTag]     = useState("");
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const thread = await createThread(title.trim(), tag.trim() || undefined);
      onCreated(thread);
      onClose();
    } catch (err: any) {
      setError(err?.response?.data?.detail ?? "Ошибка создания темы");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md">
        <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-gray-100">
          <h2 className="text-lg font-bold text-gray-900">Новая тема</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          <div>
            <label className="text-sm font-bold text-gray-700 block mb-1.5">Название темы</label>
            <input
              autoFocus
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="Например: Как объяснить логарифмы?"
              required
              maxLength={200}
              className="w-full h-10 rounded-xl border border-gray-200 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-violet-300"
            />
          </div>

          <div>
            <label className="text-sm font-bold text-gray-700 block mb-1.5">
              Тег <span className="text-gray-400 font-normal">(необязательно)</span>
            </label>
            <div className="flex flex-wrap gap-1.5 mb-2">
              {PRESET_TAGS.map(t => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setTag(prev => prev === t ? "" : t)}
                  className={cn(
                    "text-xs px-2.5 py-1 rounded-full border font-semibold transition-colors",
                    tag === t
                      ? "bg-violet-600 text-white border-violet-600"
                      : "border-gray-200 text-gray-500 hover:border-violet-300"
                  )}
                >
                  {t}
                </button>
              ))}
            </div>
            <input
              value={tag}
              onChange={e => setTag(e.target.value)}
              placeholder="Или введите свой тег"
              maxLength={40}
              className="w-full h-9 rounded-xl border border-gray-200 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-violet-300"
            />
          </div>

          {error && <p className="text-sm text-red-600 bg-red-50 rounded-xl px-3 py-2">{error}</p>}

          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose} className="flex-1 py-2.5 rounded-xl border-2 border-gray-200 text-sm font-bold text-gray-600 hover:bg-gray-50">
              Отмена
            </button>
            <button type="submit" disabled={loading || !title.trim()} className="flex-1 py-2.5 rounded-xl bg-violet-600 text-white text-sm font-bold hover:bg-violet-700 disabled:opacity-60 flex items-center justify-center gap-2">
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              Создать
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Thread view (posts) ────────────────────────────────────────────────────────
function ThreadView({
  thread, currentUserId, onBack, onDelete,
}: {
  thread: ForumThread;
  currentUserId: number;
  onBack: () => void;
  onDelete: () => void;
}) {
  const [posts, setPosts] = useState<ForumPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setLoading(true);
    getPosts(thread.id)
      .then(setPosts)
      .finally(() => setLoading(false));
  }, [thread.id]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [posts.length]);

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    if (!text.trim()) return;
    setSending(true);
    try {
      const post = await createPost(thread.id, text.trim());
      setPosts(prev => [...prev, post]);
      setText("");
    } finally {
      setSending(false);
    }
  }

  async function handleDeleteThread() {
    if (!confirm("Удалить тему? Все сообщения будут удалены.")) return;
    await deleteThread(thread.id);
    onDelete();
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="shrink-0 px-6 py-4 border-b border-gray-100 bg-white">
        <div className="flex items-start gap-3">
          <button onClick={onBack} className="mt-0.5 p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 transition-colors lg:hidden">
            <ChevronLeft className="w-4 h-4" />
          </button>
          <div className="flex-1 min-w-0">
            <h2 className="text-base font-bold text-gray-900 leading-snug">{thread.title}</h2>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              {thread.tag && (
                <span className="text-xs font-semibold text-violet-600 bg-violet-50 px-2 py-0.5 rounded-full">
                  {thread.tag}
                </span>
              )}
              <span className="text-xs text-gray-400">
                {thread.author_name} · {timeAgo(thread.created_at)}
              </span>
            </div>
          </div>
          {thread.tutor_id === currentUserId && (
            <button
              onClick={handleDeleteThread}
              className="shrink-0 p-2 text-gray-300 hover:text-red-400 hover:bg-red-50 rounded-xl transition-colors"
              title="Удалить тему"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Posts */}
      <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
        {loading ? (
          <div className="space-y-3">
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-3/4" />
          </div>
        ) : posts.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-400 py-12">
            <MessageSquareText className="w-10 h-10 mb-3 opacity-30" />
            <p className="text-sm font-semibold">Пока нет ответов</p>
            <p className="text-xs mt-1">Будьте первым!</p>
          </div>
        ) : (
          posts.map(post => {
            const isOwn = post.user_id === currentUserId;
            return (
              <div key={post.id} className={cn("flex gap-3", isOwn && "flex-row-reverse")}>
                <div className={cn(
                  "w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0",
                  isOwn ? "bg-violet-600 text-white" : "bg-gray-200 text-gray-600"
                )}>
                  {initials(post.author_name)}
                </div>
                <div className={cn("max-w-[75%]", isOwn && "items-end flex flex-col")}>
                  {!isOwn && (
                    <p className="text-[11px] text-gray-400 font-semibold mb-1 ml-1">
                      {post.author_name ?? "Репетитор"}
                    </p>
                  )}
                  <div className={cn(
                    "px-4 py-2.5 rounded-2xl text-sm leading-relaxed",
                    isOwn
                      ? "bg-violet-600 text-white rounded-tr-sm"
                      : "bg-gray-100 text-gray-900 rounded-tl-sm"
                  )}>
                    {post.text}
                  </div>
                  <p className={cn("text-[10px] text-gray-400 mt-1", isOwn ? "text-right mr-1" : "ml-1")}>
                    {timeAgo(post.created_at)}
                  </p>
                </div>
              </div>
            );
          })
        )}
        <div ref={bottomRef} />
      </div>

      {/* Compose */}
      <form onSubmit={handleSend} className="shrink-0 px-4 py-3 border-t border-gray-100 bg-white flex items-end gap-2">
        <textarea
          value={text}
          onChange={e => setText(e.target.value)}
          onKeyDown={e => {
            if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(e); }
          }}
          placeholder="Написать ответ…"
          rows={1}
          className="flex-1 resize-none rounded-2xl border border-gray-200 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-300 min-h-[42px] max-h-32"
          style={{ fieldSizing: "content" } as React.CSSProperties}
        />
        <button
          type="submit"
          disabled={!text.trim() || sending}
          className="w-10 h-10 rounded-xl bg-violet-600 text-white flex items-center justify-center hover:bg-violet-700 disabled:opacity-50 transition-colors shrink-0"
        >
          {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
        </button>
      </form>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function ForumPage() {
  useCurrentUser();
  const { user } = useAuthStore();

  const threads = useAsync(getThreads);
  const [activeThread, setActiveThread] = useState<ForumThread | null>(null);
  const [showCreate, setShowCreate]     = useState(false);
  const [filterTag, setFilterTag]       = useState<string | null>(null);

  const allTags = [...new Set((threads.data ?? []).map(t => t.tag).filter(Boolean))] as string[];

  const filtered = (threads.data ?? []).filter(t =>
    filterTag ? t.tag === filterTag : true
  );

  function handleCreated(thread: ForumThread) {
    threads.refetch();
    setActiveThread(thread);
  }

  function handleDelete() {
    setActiveThread(null);
    threads.refetch();
  }

  return (
    <div className="min-h-screen bg-gray-50 flex">
      <Sidebar items={TUTOR_NAV} />

      <main className="flex-1 flex overflow-hidden h-screen">
        {threads.error && (
          <ErrorBanner error={threads.error} onRetry={threads.refetch} className="absolute top-4 left-4 right-4 z-10" />
        )}
        {/* ── Thread list ─────────────────────────────────────────────── */}
        <div className={cn(
          "flex flex-col border-r border-gray-100 bg-white",
          "w-full lg:w-[360px] shrink-0",
          activeThread && "hidden lg:flex"
        )}>
          {/* Header */}
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
            <div>
              <h1 className="text-lg font-black text-gray-900">Форум</h1>
              <p className="text-xs text-gray-400 font-semibold">Обсуждения репетиторов</p>
            </div>
            <button
              onClick={() => setShowCreate(true)}
              className="flex items-center gap-1.5 px-3 py-2 bg-violet-600 text-white text-sm font-bold rounded-xl hover:bg-violet-700 transition-colors"
            >
              <Plus className="w-4 h-4" /> Тема
            </button>
          </div>

          {/* Tag filters */}
          {allTags.length > 0 && (
            <div className="px-4 py-2 border-b border-gray-100 flex gap-1.5 overflow-x-auto">
              <button
                onClick={() => setFilterTag(null)}
                className={cn(
                  "shrink-0 text-xs px-2.5 py-1 rounded-full border font-semibold transition-colors",
                  !filterTag ? "bg-violet-600 text-white border-violet-600" : "border-gray-200 text-gray-500 hover:border-violet-300"
                )}
              >
                Все
              </button>
              {allTags.map(tag => (
                <button
                  key={tag}
                  onClick={() => setFilterTag(filterTag === tag ? null : tag)}
                  className={cn(
                    "shrink-0 text-xs px-2.5 py-1 rounded-full border font-semibold transition-colors",
                    filterTag === tag ? "bg-violet-600 text-white border-violet-600" : "border-gray-200 text-gray-500 hover:border-violet-300"
                  )}
                >
                  {tag}
                </button>
              ))}
            </div>
          )}

          {/* List */}
          <div className="flex-1 overflow-y-auto">
            {threads.loading ? (
              <div className="p-4 space-y-3">
                {[1, 2, 3].map(i => <Skeleton key={i} className="h-20 rounded-xl" />)}
              </div>
            ) : filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-gray-400 py-16">
                <MessageSquareText className="w-12 h-12 mb-3 opacity-25" />
                <p className="text-sm font-semibold">Тем пока нет</p>
                <p className="text-xs mt-1">Создайте первую!</p>
              </div>
            ) : (
              filtered.map(thread => (
                <button
                  key={thread.id}
                  onClick={() => setActiveThread(thread)}
                  className={cn(
                    "w-full text-left px-5 py-4 border-b border-gray-50 hover:bg-gray-50 transition-colors",
                    activeThread?.id === thread.id && "bg-violet-50 border-l-2 border-l-violet-500"
                  )}
                >
                  <div className="flex items-start gap-3">
                    <div className="w-9 h-9 rounded-xl bg-violet-100 flex items-center justify-center text-violet-700 font-bold text-sm shrink-0">
                      {initials(thread.author_name)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-gray-900 text-sm leading-snug line-clamp-2">
                        {thread.title}
                      </p>
                      <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                        {thread.tag && (
                          <span className="flex items-center gap-1 text-[10px] font-bold text-violet-600 bg-violet-50 px-1.5 py-0.5 rounded-full">
                            <Tag className="w-2.5 h-2.5" />{thread.tag}
                          </span>
                        )}
                        <span className="text-[10px] text-gray-400">
                          {thread.author_name} · {timeAgo(thread.created_at)}
                        </span>
                        <span className="ml-auto text-[10px] text-gray-400 font-semibold">
                          {thread.post_count} {thread.post_count === 1 ? "ответ" : thread.post_count < 5 ? "ответа" : "ответов"}
                        </span>
                      </div>
                    </div>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>

        {/* ── Thread view ──────────────────────────────────────────────── */}
        <div className={cn(
          "flex-1 flex flex-col overflow-hidden",
          !activeThread && "hidden lg:flex"
        )}>
          {activeThread ? (
            <ThreadView
              thread={activeThread}
              currentUserId={user?.id ?? 0}
              onBack={() => setActiveThread(null)}
              onDelete={handleDelete}
            />
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-gray-400">
              <MessageSquareText className="w-16 h-16 mb-4 opacity-20" />
              <p className="font-semibold text-gray-500">Выберите тему для обсуждения</p>
              <p className="text-sm mt-1">или создайте новую</p>
            </div>
          )}
        </div>
      </main>

      {showCreate && (
        <CreateThreadModal
          onClose={() => setShowCreate(false)}
          onCreated={handleCreated}
        />
      )}
    </div>
  );
}
