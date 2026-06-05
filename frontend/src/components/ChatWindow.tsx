import { useState, useEffect, useRef, useCallback } from "react";
import { Send, Loader2, Paperclip, X, FileText, CheckCheck, Check } from "lucide-react";
import { getChatHistory, sendMessage, uploadChatFile } from "@/api/chat";
import type { Message, ChatFile } from "@/api/chat";
import type { UserOut } from "@/api/auth";
import { useAuthStore } from "@/store/auth";
import { cn } from "@/lib/utils";

function getWsBase(): string {
  if (import.meta.env.VITE_WS_URL) return import.meta.env.VITE_WS_URL;
  const proto = window.location.protocol === "https:" ? "wss:" : "ws:";
  return `${proto}//${window.location.host}`;
}
const WS_BASE = getWsBase();

const TYPING_TIMEOUT = 2500;

function formatTime(iso: string) {
  const d = new Date(iso);
  const today = new Date();
  if (d.toDateString() === today.toDateString()) {
    return d.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" });
  }
  return d.toLocaleString("ru-RU", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
}

function groupByDate(messages: Message[]) {
  const groups: { date: string; messages: Message[] }[] = [];
  for (const msg of messages) {
    const date = new Date(msg.created_at).toLocaleDateString("ru-RU", {
      weekday: "long", day: "numeric", month: "long",
    });
    const last = groups[groups.length - 1];
    if (last && last.date === date) last.messages.push(msg);
    else groups.push({ date, messages: [msg] });
  }
  return groups;
}

function isImage(file: ChatFile) {
  return file.content_type.startsWith("image/");
}

function FilePreview({ file, onRemove }: { file: ChatFile; onRemove?: () => void }) {
  const img = isImage(file);
  return (
    <div className="relative group inline-block">
      {img ? (
        <a href={file.url} target="_blank" rel="noreferrer">
          <img
            src={file.url}
            alt={file.original_name}
            className="max-w-[200px] max-h-[160px] rounded-xl object-cover border border-white/20"
          />
        </a>
      ) : (
        <a
          href={file.url}
          target="_blank"
          rel="noreferrer"
          className="flex items-center gap-2 bg-white/20 rounded-xl px-3 py-2 hover:bg-white/30 transition-colors"
        >
          <FileText className="w-4 h-4 shrink-0" />
          <span className="text-xs truncate max-w-[160px]">{file.original_name}</span>
        </a>
      )}
      {onRemove && (
        <button
          onClick={onRemove}
          className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
        >
          <X className="w-3 h-3 text-white" />
        </button>
      )}
    </div>
  );
}

function AttachmentPreviewBar({ files, onRemove }: { files: ChatFile[]; onRemove: (i: number) => void }) {
  if (!files.length) return null;
  return (
    <div className="flex gap-2 flex-wrap px-4 py-2 border-t border-gray-100 bg-gray-50">
      {files.map((f, i) => (
        <FilePreview key={i} file={f} onRemove={() => onRemove(i)} />
      ))}
    </div>
  );
}

export default function ChatWindow({ contact }: { contact: UserOut }) {
  const { user, token } = useAuthStore();
  const [messages,  setMessages]  = useState<Message[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [text,      setText]      = useState("");
  const [sending,   setSending]   = useState(false);
  const [files,     setFiles]     = useState<ChatFile[]>([]);
  const [uploading, setUploading] = useState(false);
  const [peerTyping, setPeerTyping] = useState(false);

  const bottomRef  = useRef<HTMLDivElement>(null);
  const inputRef   = useRef<HTMLTextAreaElement>(null);
  const fileRef    = useRef<HTMLInputElement>(null);
  const wsRef      = useRef<WebSocket | null>(null);
  const typingTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastTypingSent = useRef(0);

  const appendMessage = useCallback((msg: Message) => {
    setMessages((prev) => prev.some((m) => m.id === msg.id) ? prev : [...prev, msg]);
  }, []);

  // Load history
  useEffect(() => {
    setLoading(true);
    getChatHistory(contact.id).then(setMessages).finally(() => setLoading(false));
    setFiles([]);
    setText("");
  }, [contact.id]);

  // WebSocket + polling fallback
  useEffect(() => {
    if (!token) return;
    const safeToken = token;

    let ws: WebSocket;
    let reconnectTimer: ReturnType<typeof setTimeout>;
    let pollTimer: ReturnType<typeof setInterval>;
    let destroyed = false;

    function connect() {
      if (destroyed) return;
      ws = new WebSocket(`${WS_BASE}/chat/ws?token=${encodeURIComponent(safeToken)}`);
      wsRef.current = ws;

      ws.onopen = () => {
        // WS восстановлен — подгружаем свежую историю
        getChatHistory(contact.id).then(setMessages).catch(() => {});
      };

      ws.onmessage = (event) => {
        try {
          const frame = JSON.parse(event.data);

          // Поддерживаем оба формата: новый {type:"message",...} и старый (без type)
          const isMsg = frame.type === "message" || (frame.id && frame.sender_id);

          if (isMsg) {
            if (frame.sender_id === contact.id || frame.receiver_id === contact.id) {
              appendMessage(frame as Message);
            }
          } else if (frame.type === "typing" && frame.from === contact.id) {
            setPeerTyping(true);
            if (typingTimer.current) clearTimeout(typingTimer.current);
            typingTimer.current = setTimeout(() => setPeerTyping(false), TYPING_TIMEOUT);
          } else if (frame.type === "read") {
            setMessages((prev) => prev.map((m) =>
              m.sender_id === user?.id ? { ...m, is_read: true } : m
            ));
          }
        } catch { /* ignore */ }
      };

      ws.onerror = () => ws.close();

      ws.onclose = () => {
        wsRef.current = null;
        if (!destroyed) {
          // переподключение через 3 сек
          reconnectTimer = setTimeout(connect, 3000);
        }
      };
    }

    connect();

    // Polling fallback: обновляем историю каждые 10 сек (на случай потери WS)
    pollTimer = setInterval(() => {
      if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
        getChatHistory(contact.id).then(setMessages).catch(() => {});
      }
    }, 10_000);

    return () => {
      destroyed = true;
      clearTimeout(reconnectTimer);
      clearInterval(pollTimer);
      ws?.close();
      wsRef.current = null;
    };
  }, [token, contact.id, appendMessage, user?.id]);

  // Scroll to bottom
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, peerTyping]);

  function sendTyping() {
    const now = Date.now();
    if (now - lastTypingSent.current < 1000) return;
    lastTypingSent.current = now;
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: "typing", to: contact.id }));
    }
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const picked = Array.from(e.target.files ?? []);
    if (!picked.length) return;
    e.target.value = "";
    setUploading(true);
    try {
      const uploaded = await Promise.all(picked.map(uploadChatFile));
      setFiles((prev) => [...prev, ...uploaded]);
    } catch {
      alert("Ошибка загрузки файла");
    } finally {
      setUploading(false);
    }
  }

  async function handleSend(e?: React.FormEvent) {
    e?.preventDefault();
    if ((!text.trim() && !files.length) || sending) return;
    setSending(true);
    const msgText = text.trim() || " ";
    const msgFiles = [...files];
    setText("");
    setFiles([]);
    try {
      const msg = await sendMessage({ receiver_id: contact.id, text: msgText, files: msgFiles });
      appendMessage(msg);
    } catch {
      setText(msgText.trim());
      setFiles(msgFiles);
    } finally {
      setSending(false);
      inputRef.current?.focus();
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  const groups = groupByDate(messages);

  return (
    <div className="flex flex-col h-full bg-white">

      {/* Header */}
      <div className="px-5 py-3.5 border-b border-gray-100 bg-white flex items-center gap-3 shrink-0">
        <div className="w-10 h-10 rounded-full bg-violet-100 flex items-center justify-center text-violet-700 font-bold shrink-0 text-sm">
          {contact.name[0].toUpperCase()}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-gray-900 text-sm">{contact.name}</p>
          <p className="text-xs text-gray-400">{contact.role === "tutor" ? "Репетитор" : "Ученик"}</p>
        </div>
      </div>

      {/* Messages */}
      <div
        className="flex-1 overflow-y-auto px-4 py-4 space-y-4"
        style={{ background: "linear-gradient(180deg, #f8f6ff 0%, #f1f5f9 100%)" }}
      >
        {loading && (
          <div className="flex justify-center pt-16">
            <Loader2 className="w-6 h-6 animate-spin text-violet-300" />
          </div>
        )}

        {!loading && messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center py-16">
            <div className="w-16 h-16 rounded-full bg-violet-50 flex items-center justify-center mb-3">
              <Send className="w-7 h-7 text-violet-300" />
            </div>
            <p className="font-semibold text-gray-600">Начните общение</p>
            <p className="text-sm text-gray-400 mt-1">Отправьте первое сообщение</p>
          </div>
        )}

        {groups.map((group) => (
          <div key={group.date}>
            {/* Date divider */}
            <div className="flex items-center gap-3 mb-3">
              <div className="flex-1 h-px bg-gray-200/60" />
              <span className="text-xs text-gray-400 bg-white px-2 py-0.5 rounded-full border border-gray-100 shrink-0">
                {group.date}
              </span>
              <div className="flex-1 h-px bg-gray-200/60" />
            </div>

            <div className="space-y-1">
              {group.messages.map((msg, i) => {
                const isMine = msg.sender_id === user?.id;
                const nextMsg = group.messages[i + 1];
                const isLastInGroup = !nextMsg || nextMsg.sender_id !== msg.sender_id;
                const msgFiles = msg.files ?? [];

                return (
                  <div key={msg.id} className={cn("flex items-end gap-2", isMine ? "justify-end" : "justify-start")}>
                    {/* Avatar */}
                    {!isMine && (
                      <div className="w-7 shrink-0">
                        {isLastInGroup && (
                          <div className="w-7 h-7 rounded-full bg-violet-100 flex items-center justify-center text-violet-600 text-xs font-bold">
                            {contact.name[0].toUpperCase()}
                          </div>
                        )}
                      </div>
                    )}

                    <div className={cn("max-w-[68%] flex flex-col gap-1", isMine ? "items-end" : "items-start")}>
                      {/* File attachments */}
                      {msgFiles.length > 0 && (
                        <div className={cn(
                          "flex flex-col gap-1.5 p-2 rounded-2xl",
                          isMine
                            ? "bg-violet-600 text-white rounded-br-sm"
                            : "bg-white border border-gray-100 shadow-sm rounded-bl-sm"
                        )}>
                          {msgFiles.map((f, fi) => (
                            <FilePreview key={fi} file={f} />
                          ))}
                        </div>
                      )}

                      {/* Text bubble */}
                      {msg.text.trim() && (
                        <div className={cn(
                          "px-4 py-2.5 text-sm leading-relaxed",
                          isMine
                            ? "bg-violet-600 text-white rounded-2xl rounded-br-sm"
                            : "bg-white text-gray-900 border border-gray-100 shadow-sm rounded-2xl rounded-bl-sm",
                          msgFiles.length > 0 && isMine && "rounded-2xl rounded-br-sm",
                          msgFiles.length > 0 && !isMine && "rounded-2xl rounded-bl-sm"
                        )}>
                          <p className="whitespace-pre-wrap break-words">{msg.text.trim()}</p>
                        </div>
                      )}

                      {/* Time + read status */}
                      <div className={cn("flex items-center gap-1 px-1", isMine && "flex-row-reverse")}>
                        <span className="text-[10px] text-gray-400">{formatTime(msg.created_at)}</span>
                        {isMine && (
                          msg.is_read
                            ? <CheckCheck className="w-3.5 h-3.5 text-violet-500" />
                            : <Check className="w-3.5 h-3.5 text-gray-300" />
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}

        {/* Typing indicator */}
        {peerTyping && (
          <div className="flex items-end gap-2">
            <div className="w-7 h-7 rounded-full bg-violet-100 flex items-center justify-center text-violet-600 text-xs font-bold shrink-0">
              {contact.name[0].toUpperCase()}
            </div>
            <div className="bg-white border border-gray-100 shadow-sm rounded-2xl rounded-bl-sm px-4 py-3 flex items-center gap-1">
              {[0, 150, 300].map((delay) => (
                <span
                  key={delay}
                  className="w-1.5 h-1.5 bg-gray-400 rounded-full inline-block"
                  style={{ animation: `bounce 1s ${delay}ms infinite` }}
                />
              ))}
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Attachment preview */}
      <AttachmentPreviewBar files={files} onRemove={(i) => setFiles((prev) => prev.filter((_, idx) => idx !== i))} />

      {/* Input */}
      <form
        onSubmit={handleSend}
        className="shrink-0 px-4 py-3 bg-white border-t border-gray-100"
      >
        <div className="flex items-end gap-2 bg-gray-50 rounded-2xl border border-gray-200 focus-within:border-violet-300 focus-within:ring-2 focus-within:ring-violet-100 transition-all px-3 py-2">
          {/* File attach */}
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
            className="shrink-0 w-8 h-8 flex items-center justify-center text-gray-400 hover:text-violet-600 transition-colors rounded-xl hover:bg-violet-50"
          >
            {uploading
              ? <Loader2 className="w-4 h-4 animate-spin" />
              : <Paperclip className="w-4 h-4" />
            }
          </button>
          <input
            ref={fileRef}
            type="file"
            multiple
            accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.txt,.zip"
            className="hidden"
            onChange={handleFileChange}
          />

          {/* Textarea */}
          <textarea
            ref={inputRef}
            value={text}
            onChange={(e) => { setText(e.target.value); sendTyping(); }}
            onKeyDown={handleKeyDown}
            placeholder="Написать сообщение…"
            rows={1}
            className="flex-1 bg-transparent text-sm text-gray-900 placeholder:text-gray-400 resize-none focus:outline-none max-h-32 py-1"
            style={{ minHeight: "24px" }}
            onInput={(e) => {
              const el = e.currentTarget;
              el.style.height = "auto";
              el.style.height = `${Math.min(el.scrollHeight, 128)}px`;
            }}
          />

          {/* Send */}
          <button
            type="submit"
            disabled={(!text.trim() && !files.length) || sending}
            className={cn(
              "shrink-0 w-8 h-8 flex items-center justify-center rounded-xl transition-all",
              (text.trim() || files.length) && !sending
                ? "bg-violet-600 text-white hover:bg-violet-700 active:scale-95"
                : "bg-gray-200 text-gray-400 cursor-not-allowed"
            )}
          >
            {sending
              ? <Loader2 className="w-4 h-4 animate-spin" />
              : <Send className="w-3.5 h-3.5" />
            }
          </button>
        </div>
        <p className="text-[10px] text-gray-300 mt-1 text-right">Enter — отправить · Shift+Enter — перенос</p>
      </form>

      <style>{`
        @keyframes bounce {
          0%, 60%, 100% { transform: translateY(0); }
          30% { transform: translateY(-4px); }
        }
      `}</style>
    </div>
  );
}
