import { useState, useEffect, useRef } from "react";
import { Send, Loader2 } from "lucide-react";
import { getChatHistory, sendMessage } from "@/api/chat";
import type { Message } from "@/api/chat";
import type { UserOut } from "@/api/auth";
import { useAuthStore } from "@/store/auth";
import { cn } from "@/lib/utils";

interface Props {
  contact: UserOut;
}

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
    if (last && last.date === date) {
      last.messages.push(msg);
    } else {
      groups.push({ date, messages: [msg] });
    }
  }
  return groups;
}

export default function ChatWindow({ contact }: Props) {
  const { user } = useAuthStore();
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading]   = useState(true);
  const [text, setText]         = useState("");
  const [sending, setSending]   = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef  = useRef<HTMLTextAreaElement>(null);

  // Load history
  useEffect(() => {
    setLoading(true);
    getChatHistory(contact.id)
      .then(setMessages)
      .finally(() => setLoading(false));
  }, [contact.id]);

  // Scroll to bottom when messages change
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function handleSend(e?: React.FormEvent) {
    e?.preventDefault();
    if (!text.trim() || sending) return;
    setSending(true);
    const msgText = text.trim();
    setText("");
    try {
      const msg = await sendMessage({ receiver_id: contact.id, text: msgText });
      setMessages((prev) => [...prev, msg]);
    } catch {
      setText(msgText); // restore on error
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
    <div className="flex flex-col h-full">
      {/* Contact header */}
      <div className="px-6 py-4 border-b border-gray-100 bg-white flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold shrink-0">
          {contact.name[0].toUpperCase()}
        </div>
        <div>
          <p className="font-semibold text-gray-900">{contact.name}</p>
          <p className="text-xs text-gray-400">{contact.role === "tutor" ? "Репетитор" : "Ученик"} · {contact.email}</p>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-6 bg-gray-50">
        {loading && (
          <div className="flex items-center justify-center h-32">
            <Loader2 className="w-6 h-6 animate-spin text-gray-300" />
          </div>
        )}

        {!loading && messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-gray-400 py-16">
            <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mb-4">
              <Send className="w-7 h-7 opacity-40" />
            </div>
            <p className="font-medium text-gray-500">Начните общение</p>
            <p className="text-sm mt-1">Отправьте первое сообщение {contact.name.split(" ")[0]}</p>
          </div>
        )}

        {groups.map((group) => (
          <div key={group.date}>
            {/* Date divider */}
            <div className="flex items-center gap-3 mb-4">
              <div className="flex-1 h-px bg-gray-200" />
              <span className="text-xs text-gray-400 shrink-0">{group.date}</span>
              <div className="flex-1 h-px bg-gray-200" />
            </div>

            <div className="space-y-1.5">
              {group.messages.map((msg, i) => {
                const isMine = msg.sender_id === user?.id;
                const isLast = i === group.messages.length - 1 ||
                  group.messages[i + 1].sender_id !== msg.sender_id;

                return (
                  <div
                    key={msg.id}
                    className={cn("flex", isMine ? "justify-end" : "justify-start")}
                  >
                    {/* Avatar placeholder for spacing */}
                    {!isMine && (
                      <div className={cn("w-8 shrink-0 mr-2", !isLast && "invisible")}>
                        {isLast && (
                          <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center text-primary text-xs font-bold mt-auto">
                            {contact.name[0].toUpperCase()}
                          </div>
                        )}
                      </div>
                    )}

                    <div className={cn(
                      "max-w-[72%] px-4 py-2.5 rounded-2xl text-sm leading-relaxed",
                      isMine
                        ? "bg-primary text-white rounded-br-sm"
                        : "bg-white text-gray-900 border border-gray-100 rounded-bl-sm shadow-sm"
                    )}>
                      <p className="whitespace-pre-wrap break-words">{msg.text}</p>
                      <p className={cn(
                        "text-xs mt-1 text-right",
                        isMine ? "text-white/60" : "text-gray-400"
                      )}>
                        {formatTime(msg.created_at)}
                        {isMine && (
                          <span className="ml-1">
                            {msg.is_read ? " ✓✓" : " ✓"}
                          </span>
                        )}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}

        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <form onSubmit={handleSend} className="px-4 py-3 bg-white border-t border-gray-100">
        <div className="flex items-end gap-2 bg-gray-50 rounded-2xl border border-gray-200 focus-within:border-primary/40 focus-within:ring-2 focus-within:ring-primary/10 transition-all px-4 py-2">
          <textarea
            ref={inputRef}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Напишите сообщение… (Enter — отправить, Shift+Enter — перенос)"
            rows={1}
            className="flex-1 bg-transparent text-sm text-gray-900 placeholder:text-gray-400 resize-none focus:outline-none max-h-32 py-1"
            style={{ minHeight: "24px" }}
            onInput={(e) => {
              const el = e.currentTarget;
              el.style.height = "auto";
              el.style.height = `${Math.min(el.scrollHeight, 128)}px`;
            }}
          />
          <button
            type="submit"
            disabled={!text.trim() || sending}
            className={cn(
              "shrink-0 w-9 h-9 flex items-center justify-center rounded-xl transition-all",
              text.trim() && !sending
                ? "bg-primary text-white hover:opacity-90 active:scale-95"
                : "bg-gray-200 text-gray-400 cursor-not-allowed"
            )}
          >
            {sending
              ? <Loader2 className="w-4 h-4 animate-spin" />
              : <Send className="w-4 h-4" />
            }
          </button>
        </div>
        <p className="text-xs text-gray-300 mt-1 text-center">Enter — отправить</p>
      </form>
    </div>
  );
}
