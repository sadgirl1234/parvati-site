"use client";

import { useEffect, useRef, useState } from "react";
import { Send, Trash2, Copy, Check, Smile } from "lucide-react";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  time: string;
}

const NAME_KEY = "parvati_sweetie_visitor_name";

const THINKING_PHRASES = [
  "Wait a tiny second pleaseee ☺️",
  "Sweetie🌸 is thinking cutely ☺️",
  "Almost ready for you ☺️",
];

function getTimeNow() {
  return new Intl.DateTimeFormat("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  }).format(new Date());
}

export default function ParvatiAIPage() {
  const [visitorName, setVisitorName] = useState("");
  const [nameInput, setNameInput] = useState("");
  const [editingName, setEditingName] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [thinkingIdx, setThinkingIdx] = useState(0);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    let saved = "";
    try {
      const stored = localStorage.getItem(NAME_KEY);
      if (stored) saved = stored;
    } catch {
      // Ignored
    }
    if (saved) {
      setVisitorName(saved);
      setNameInput(saved);
    }
    setMessages([
      {
        id: "welcome",
        role: "assistant",
        content: saved
          ? `Aww hi ${saved}! You came back to talk to me? Hehe I'm so happy! Ask me anything please ☺️🌸`
          : "Hiii! I'm Sweetie🌸, Parvati's cute little AI! Please be nice to me okay? Ask me anything you want ☺️",
        time: getTimeNow(),
      },
    ]);
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  useEffect(() => {
    if (!loading) {
      setThinkingIdx(0);
      return;
    }
    const iv = setInterval(
      () => setThinkingIdx((p) => (p + 1) % THINKING_PHRASES.length),
      1100
    );
    return () => clearInterval(iv);
  }, [loading]);

  const handleSaveName = (e: React.FormEvent) => {
    e.preventDefault();
    const cleaned = nameInput.trim().slice(0, 30);
    setVisitorName(cleaned);
    setEditingName(false);
    try {
      if (cleaned) localStorage.setItem(NAME_KEY, cleaned);
      else localStorage.removeItem(NAME_KEY);
    } catch {
      // Ignored
    }
  };

  const sendMessage = async () => {
    const text = input.trim();
    if (!text) return;
    if (loading) return;

    const userMsg: Message = {
      id: `u-${Date.now()}`,
      role: "user",
      content: text,
      time: getTimeNow(),
    };

    const nextMessages = [...messages, userMsg];
    setMessages(nextMessages);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch("/api/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          visitorName,
          messages: nextMessages.map((m) => ({
            role: m.role,
            content: m.content,
          })),
        }),
      });

      const data = (await res.json()) as { reply?: string; error?: string };

      const replyText = res.ok
        ? data.reply ?? "Aww, no reply came through! Please ask again ☺️"
        : `⚠️ ${data.error ?? "Failed to reply."}`;

      setMessages((prev) => [
        ...prev,
        {
          id: `a-${Date.now()}`,
          role: "assistant",
          content: replyText,
          time: getTimeNow(),
        },
      ]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: `err-${Date.now()}`,
          role: "assistant",
          content: "Aww, network got sleepy! Please try again ☺️",
          time: getTimeNow(),
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = async (id: string, content: string) => {
    try {
      await navigator.clipboard.writeText(content);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 1600);
    } catch {
      // Ignored
    }
  };

  const handleClear = () => {
    setMessages([
      {
        id: `reset-${Date.now()}`,
        role: "assistant",
        content: "All clean and fresh! What shall we talk about now? ☺️🌸",
        time: getTimeNow(),
      },
    ]);
  };

  return (
    <div className="max-w-3xl mx-auto space-y-4 animate-fade-up">
      <style>{`
        @keyframes bubble-pop {
          0% { opacity: 0; transform: translateY(8px) scale(0.97); }
          100% { opacity: 1; transform: translateY(0) scale(1); }
        }
        .animate-bubble-pop { animation: bubble-pop 0.3s ease-out both; }
      `}</style>

      {/* Clean Header without AI Logo */}
      <div className="rounded-3xl px-5 py-4 bg-white/85 backdrop-blur-xl border border-rose-200/80 shadow-md flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-heading font-bold bg-gradient-to-r from-rose-600 to-fuchsia-600 bg-clip-text text-transparent">
          Sweetie🌸
        </h1>

        <div className="flex items-center gap-2">
          {editingName ? (
            <form onSubmit={handleSaveName} className="flex items-center gap-1.5">
              <input
                type="text"
                value={nameInput}
                onChange={(e) => setNameInput(e.target.value)}
                placeholder="Your name..."
                autoFocus
                className="w-28 px-3 py-1.5 rounded-xl bg-white border border-rose-300 text-xs focus:outline-none"
              />
              <button
                type="submit"
                className="px-3 py-1.5 rounded-xl bg-rose-500 text-white text-xs font-bold cursor-pointer"
              >
                Save
              </button>
            </form>
          ) : (
            <button
              type="button"
              onClick={() => setEditingName(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-2xl bg-rose-50 border border-rose-200 text-xs font-mono font-bold text-rose-700 cursor-pointer"
            >
              <Smile size={13} />
              {visitorName ? `Hi, ${visitorName}` : "Your name"}
            </button>
          )}

          <button
            type="button"
            onClick={handleClear}
            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-2xl bg-slate-50 hover:bg-rose-50 border border-slate-200 text-xs font-mono font-bold text-slate-700 cursor-pointer"
          >
            <Trash2 size={13} /> Clear
          </button>
        </div>
      </div>

      {/* Chat Box */}
      <div className="rounded-[2rem] bg-white/90 backdrop-blur-xl border-2 border-rose-200/80 shadow-xl overflow-hidden flex flex-col h-[68vh] min-h-[450px]">
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 bg-gradient-to-b from-rose-50/40 via-white to-pink-50/40">
          {messages.map((msg) => {
            const isUser = msg.role === "user";
            return (
              <div
                key={msg.id}
                className={`flex items-end gap-2.5 animate-bubble-pop ${
                  isUser ? "justify-end" : "justify-start"
                }`}
              >
                <div
                  className={`max-w-[85%] px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap ${
                    isUser
                      ? "rounded-3xl rounded-br-md bg-gradient-to-r from-rose-500 to-pink-500 text-white shadow-md"
                      : "rounded-3xl rounded-bl-md bg-white border border-rose-200/80 text-slate-800 shadow-sm"
                  }`}
                >
                  <div>{msg.content}</div>
                  <div
                    className={`mt-1.5 flex items-center justify-between gap-3 text-[10px] font-mono ${
                      isUser ? "text-white/75" : "text-slate-400"
                    }`}
                  >
                    <span>{msg.time}</span>
                    {!isUser && (
                      <button
                        type="button"
                        onClick={() => handleCopy(msg.id, msg.content)}
                        className="inline-flex items-center gap-1 hover:text-rose-600 cursor-pointer"
                      >
                        {copiedId === msg.id ? (
                          <>
                            <Check size={11} /> Copied
                          </>
                        ) : (
                          <>
                            <Copy size={11} /> Copy
                          </>
                        )}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}

          {loading && (
            <div className="flex justify-start animate-bubble-pop">
              <div className="px-4 py-3 rounded-3xl rounded-bl-md bg-white border border-rose-200 text-xs font-mono font-bold text-rose-600 shadow-sm">
                {THINKING_PHRASES[thinkingIdx]}
              </div>
            </div>
          )}

          <div ref={bottomRef} />
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            sendMessage();
          }}
          className="p-3 bg-white border-t border-rose-100 flex items-center gap-2"
        >
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Say hi to Sweetie🌸..."
            className="flex-1 px-4 py-2.5 rounded-2xl bg-rose-50/50 border border-rose-200 focus:border-rose-400 focus:bg-white focus:outline-none text-sm text-slate-900"
          />
          <button
            type="submit"
            disabled={loading ? true : !input.trim()}
            className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-2xl bg-gradient-to-r from-rose-500 to-fuchsia-500 text-white font-mono text-xs font-bold shadow-md hover:scale-105 transition-all cursor-pointer disabled:opacity-50"
          >
            <Send size={14} /> Send
          </button>
        </form>
      </div>
    </div>
  );
}