"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  Send,
  Trash2,
  Copy,
  Check,
  User,
  Smile,
  Mic,
  Volume2,
  Square,
  Cog,
} from "lucide-react";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  time: string;
}

interface SpeechResultItem {
  transcript: string;
}

interface SpeechResultList {
  [index: number]: {
    [index: number]: SpeechResultItem;
    isFinal?: boolean;
  };
}

interface SpeechEventLike {
  resultIndex?: number;
  results: SpeechResultList;
}

interface SpeechRecognizerLike {
  lang: string;
  interimResults: boolean;
  maxAlternatives: number;
  continuous: boolean;
  onresult: ((e: SpeechEventLike) => void) | null;
  onend: (() => void) | null;
  onerror: ((e: { error?: string }) => void) | null;
  start: () => void;
  stop: () => void;
}

const NAME_KEY = "parvati_sweetie_visitor_name";

const THINKING_PHRASES = [
  "Hold on, rolling my cute eyes & thinking... 🙄✨",
  "Sweetie is cooking up a funny little comeback... 😏💅",
  "Don't rush me, good attitude takes time... 🌸😌",
];

function getTimeNow() {
  return new Intl.DateTimeFormat("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  }).format(new Date());
}

/**
 * Strips all Unicode emojis, pictographs, symbols, and emoji word-labels
 * so speech synthesis NEVER reads emoji names out loud.
 */
function sanitizeForSpeech(raw: string): string {
  return raw
    .replace(/[\u{1F300}-\u{1FAFF}]/gu, " ")
    .replace(/[\u{2600}-\u{27BF}]/gu, " ")
    .replace(/[\u{FE00}-\u{FE0F}]/gu, "")
    .replace(/[\u{200D}]/gu, "")
    .replace(
      /\b(smiling face|blushing|cherry blossom|sparkles|heart|red heart|grinning|laughing|crying|sob|tears|wink|kiss|rolling eyes|eye roll|emoji)\b/gi,
      " "
    )
    .replace(/\*[^*]+\*/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function hasHindiScriptOrWords(text: string): boolean {
  if (/[\u0900-\u097F]/.test(text)) return true;
  return /\b(kya|hai|hain|mera|meri|tum|aap|kaise|kaisi|kyun|kyu|acha|achha|batao|sunao|pyaar|dil|yaar|haan|nahi|nhi|bhai|didi|shukriya|dhanyavaad|khush|udas|rona|hasna|bilkul|zaroor|suno|dekho|chalo|abhi|bahut|thoda)\b/i.test(
    text
  );
}

/**
 * Normalizes common Hinglish spellings so Indian/Hindi speech engines pronounce them more naturally
 * without long awkward pauses.
 */
function normalizeHindiPhonetics(text: string): string {
  return text
    .replace(/\bachha\b|\bacha\b/gi, "achchha")
    .replace(/\bkyun\b|\bkyu\b/gi, "kyon")
    .replace(/\bnahi\b|\bnhi\b/gi, "nahin")
    .replace(/\bthoda\b/gi, "thora")
    .replace(/\bkhush\b/gi, "khush")
    .replace(/[।]/g, ". ")
    .replace(/\s+/g, " ")
    .trim();
}

type EmotionMood = "laugh" | "smile" | "cry" | "emotional" | "calm" | "attitude";

function detectEmotionMood(text: string): EmotionMood {
  const lower = text.toLowerCase();
  if (/\b(haha|hehe|lol|joke|funny|laugh|haso|hansi|mazak|funny)\b/i.test(lower)) {
    return "laugh";
  }
  if (/\b(cry|crying|sad|sorry|hurt|miss|lonely|tear|rona|udas|dukhi)\b/i.test(lower)) {
    return "cry";
  }
  if (/\b(love|sweet|cute|heart|care|hug|special|emotional|pyaar|dil)\b/i.test(lower)) {
    return "emotional";
  }
  if (/\b(calm|relax|peace|slow|gentle|breathe|aaram|shanti|sleep)\b/i.test(lower)) {
    return "calm";
  }
  if (/\b(attitude|whatever|seriously|huh|sassy|boss|bother)\b/i.test(lower)) {
    return "attitude";
  }
  return "smile";
}

function buildSmoothSpokenText(
  cleanText: string,
  mood: EmotionMood,
  isHindi: boolean
): string {
  const prepared = isHindi ? normalizeHindiPhonetics(cleanText) : cleanText;

  if (mood === "laugh") {
    return isHindi
      ? `Hehe, suno na! ${prepared} Hehe!`
      : `Hehe, listen! ${prepared} Hehe!`;
  }
  if (mood === "attitude") {
    return isHindi
      ? `Hmm, sun liya. ${prepared}`
      : `Hmph, okay fine. ${prepared}`;
  }
  if (mood === "cry") {
    return isHindi
      ? `Aww, dil bhar aaya. ${prepared}`
      : `Aww, sniffle. ${prepared}`;
  }
  if (mood === "emotional") {
    return isHindi
      ? `Aww, sach mein? ${prepared}`
      : `Aww, softly. ${prepared}`;
  }
  if (mood === "calm") {
    return isHindi
      ? `Aaram se suno. ${prepared}`
      : `Take a soft breath. ${prepared}`;
  }
  return isHindi ? `Hmm! ${prepared}` : `Mmm! ${prepared}`;
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
  const [holdingMic, setHoldingMic] = useState(false);
  const [speakingMessageId, setSpeakingMessageId] = useState<string | null>(
    null
  );
  const [micError, setMicError] = useState("");
  const [activeMood, setActiveMood] = useState<EmotionMood>("smile");

  const bottomRef = useRef<HTMLDivElement | null>(null);
  const recognitionRef = useRef<SpeechRecognizerLike | null>(null);
  const holdingRef = useRef(false);

  const stopSpeaking = useCallback(() => {
    setSpeakingMessageId(null);
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      try {
        window.speechSynthesis.cancel();
      } catch {
        // Ignored
      }
    }
  }, []);

  // Single continuous utterance per click so commas/periods never cause long dead pauses
  const speakMessage = useCallback(
    (messageId: string, rawText: string) => {
      if (speakingMessageId === messageId) {
        stopSpeaking();
        return;
      }

      if (typeof window === "undefined" || !("speechSynthesis" in window)) {
        return;
      }

      const stripped = sanitizeForSpeech(rawText);
      if (!stripped) return;

      const isHindi = hasHindiScriptOrWords(stripped);
      const mood = detectEmotionMood(stripped);
      setActiveMood(mood);

      const spokenText = buildSmoothSpokenText(stripped, mood, isHindi);
      if (!spokenText) return;

      try {
        window.speechSynthesis.cancel();
      } catch {
        // Ignored
      }

      const voices = window.speechSynthesis.getVoices();
      let chosenVoice: SpeechSynthesisVoice | null = null;

      if (isHindi) {
        chosenVoice =
          voices.find((v) => v.lang.toLowerCase().startsWith("hi")) ||
          voices.find((v) =>
            /india|hindi|heera|swara|neerja/i.test(v.name)
          ) ||
          null;
      } else {
        chosenVoice =
          voices.find(
            (v) =>
              /en-IN/i.test(v.lang) &&
              /female|girl|heera|neerja|priya|aditi|rhea/i.test(v.name)
          ) ||
          voices.find((v) =>
            /female|zira|aria|samantha|heera|veena|google uk english female|google us english/i.test(
              v.name
            )
          ) ||
          voices.find((v) => v.lang.toLowerCase().startsWith("en")) ||
          null;
      }

      const utterance = new SpeechSynthesisUtterance(spokenText);
      utterance.lang = isHindi
        ? chosenVoice?.lang || "hi-IN"
        : chosenVoice?.lang || "en-IN";
      if (chosenVoice) {
        utterance.voice = chosenVoice;
      }

      // Soft baby-girl tone with natural flow (no slow drag after punctuation)
      if (mood === "laugh") {
        utterance.pitch = 1.38;
        utterance.rate = 1.08;
        utterance.volume = 0.9;
      } else if (mood === "attitude") {
        utterance.pitch = 1.34;
        utterance.rate = 1.04;
        utterance.volume = 0.88;
      } else if (mood === "cry") {
        utterance.pitch = 1.28;
        utterance.rate = 0.92;
        utterance.volume = 0.82;
      } else if (mood === "emotional") {
        utterance.pitch = 1.35;
        utterance.rate = 0.98;
        utterance.volume = 0.86;
      } else if (mood === "calm") {
        utterance.pitch = 1.26;
        utterance.rate = 0.95;
        utterance.volume = 0.82;
      } else {
        utterance.pitch = 1.35;
        utterance.rate = 1.02;
        utterance.volume = 0.86;
      }

      utterance.onstart = () => setSpeakingMessageId(messageId);
      utterance.onend = () => setSpeakingMessageId(null);
      utterance.onerror = () => setSpeakingMessageId(null);

      setSpeakingMessageId(messageId);
      try {
        window.speechSynthesis.speak(utterance);
      } catch {
        setSpeakingMessageId(null);
      }
    },
    [speakingMessageId, stopSpeaking]
  );

  const sendMessageWithText = useCallback(
    async (rawText: string, currentHistory: Message[]) => {
      const text = rawText.trim();
      if (!text || loading) return;

      stopSpeaking();

      const userMsg: Message = {
        id: `u-${Date.now()}`,
        role: "user",
        content: text,
        time: getTimeNow(),
      };

      const nextMessages = [...currentHistory, userMsg];
      setMessages(nextMessages);
      setInput("");
      setLoading(true);

      // Filter out any prior assistant messages that repeatedly mention Free Fire unless user asked
      const askedAboutGame = /\b(free fire|ff|game|gaming|headshot)\b/i.test(text);
      const filteredHistory = askedAboutGame
        ? nextMessages
        : nextMessages.map((m) =>
            m.role === "assistant"
              ? {
                  ...m,
                  content: m.content.replace(
                    /[^.!?]*\b(free fire|headshot queen|ff)\b[^.!?]*[.!?]?/gi,
                    ""
                  ),
                }
              : m
          );

      try {
        const res = await fetch("/api/ai", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            visitorName,
            styleHint:
              "Be funny, cute, expressive with emojis, and have a tiny playful attitude. Do not bring up Free Fire unless the user asks about games.",
            messages: filteredHistory.map((m) => ({
              role: m.role,
              content: m.content,
            })),
          }),
        });

        const data = (await res.json()) as { reply?: string; error?: string };
        const replyText = res.ok
          ? data.reply ?? "Hmph, my cute brain blinked for a second! Ask me again 🙄🌸"
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
            content: "Aww, network got sleepy 🙄🌸 Try again in a bit!",
            time: getTimeNow(),
          },
        ]);
      } finally {
        setLoading(false);
      }
    },
    [loading, stopSpeaking, visitorName]
  );

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
          ? `Ohhh, look who's here—${saved}! 😏✨ Sweetie is smiling, cute, and has just a tiny bit of attitude today 🌸 Tap Speak on any reply if you wanna hear my soft voice!`
          : "Heyyy cutie! 😏🌸 I'm Sweetie—funny, expressive, and a little sassy. Replies stay text-only until you tap Speak on a message! ✨💅",
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

  useEffect(() => {
    return () => {
      holdingRef.current = false;
      try {
        recognitionRef.current?.stop();
      } catch {
        // Ignored
      }
      stopSpeaking();
    };
  }, [stopSpeaking]);

  const startHoldToSpeak = () => {
    if (holdingRef.current) return;
    stopSpeaking();
    setMicError("");

    if (typeof window === "undefined") return;
    const win = window as unknown as {
      SpeechRecognition?: new () => SpeechRecognizerLike;
      webkitSpeechRecognition?: new () => SpeechRecognizerLike;
    };
    const SpeechRec = win.SpeechRecognition || win.webkitSpeechRecognition;

    if (!SpeechRec) {
      setMicError(
        "Hold-to-speak mic is not supported in this browser. Try Chrome or Edge."
      );
      return;
    }

    try {
      const recognition = new SpeechRec();
      recognition.lang = hasHindiScriptOrWords(input) ? "hi-IN" : "en-IN";
      recognition.interimResults = true;
      recognition.maxAlternatives = 1;
      recognition.continuous = true;
      recognitionRef.current = recognition;

      recognition.onresult = (event: SpeechEventLike) => {
        const startIdx = event.resultIndex ?? 0;
        let transcript = "";
        for (let i = startIdx; ; i++) {
          const item = event.results[i];
          if (!item || !item[0]) break;
          transcript += item[0].transcript;
        }
        if (transcript.trim()) {
          setInput(transcript.trim());
        }
      };

      recognition.onerror = (event) => {
        holdingRef.current = false;
        setHoldingMic(false);
        if (event?.error === "not-allowed") {
          setMicError("Microphone permission blocked. Please allow mic access.");
        } else if (event?.error !== "aborted" && event?.error !== "no-speech") {
          setMicError("Could not capture voice while holding. Please try again.");
        }
      };

      recognition.onend = () => {
        if (!holdingRef.current) {
          setHoldingMic(false);
        }
      };

      holdingRef.current = true;
      setHoldingMic(true);
      recognition.start();
    } catch {
      holdingRef.current = false;
      setHoldingMic(false);
      setMicError("Unable to activate microphone.");
    }
  };

  const stopHoldToSpeak = () => {
    if (!holdingRef.current) return;
    holdingRef.current = false;
    setHoldingMic(false);
    try {
      recognitionRef.current?.stop();
    } catch {
      // Ignored
    }
  };

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
    stopSpeaking();
    setMicError("");
    setMessages([
      {
        id: `reset-${Date.now()}`,
        role: "assistant",
        content:
          "Okay fine, fresh slate! 😏🌸 Cute & sassy mode is ready whenever you are ✨",
        time: getTimeNow(),
      },
    ]);
  };

  const speakingNow = speakingMessageId !== null;
  const isChatAnimated = holdingMic || speakingNow;

  return (
    <div className="max-w-3xl mx-auto space-y-4 animate-fade-up">
      {/* Header */}
      <div className="rounded-3xl px-5 py-4 bg-white/95 border border-rose-200/80 shadow-md flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div
            className={`w-11 h-11 rounded-2xl bg-gradient-to-br from-rose-500 to-pink-500 text-white flex items-center justify-center shadow-md transition-transform duration-300 ${
              speakingNow ? "scale-110 animate-bounce" : ""
            }`}
          >
            <Cog size={22} />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-heading font-bold text-slate-900">
              Sweetie🌸
            </h1>
            <p className="text-xs text-slate-600">
              Soft baby voice • Vibe:{" "}
              <span className="font-mono font-bold text-rose-600">
                {speakingNow ? `${activeMood} (speaking)` : activeMood}
              </span>
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
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
              {visitorName ? `Hi, ${visitorName}` : "Tell me your name"}
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

      {/* Entire AI Chat Box — Animates smoothly while holding mic OR speaking */}
      <div
        className={`rounded-[2rem] bg-white/95 border shadow-xl overflow-hidden flex flex-col h-[66vh] min-h-[440px] transition-all duration-300 ${
          isChatAnimated
            ? "border-rose-400 ring-4 ring-rose-400/35 shadow-[0_0_40px_rgba(244,63,94,0.28)] scale-[1.01] animate-pulse"
            : "border-slate-200"
        }`}
      >
        {holdingMic && (
          <div className="px-4 py-2 bg-gradient-to-r from-rose-500 via-pink-500 to-sky-500 text-white text-xs font-mono font-bold flex items-center justify-between animate-pulse">
            <span>Sweetie is listening while you hold the mic...</span>
            <span>Release to finish</span>
          </div>
        )}

        {!holdingMic && speakingNow && (
          <div className="px-4 py-2 bg-gradient-to-r from-pink-500 via-rose-400 to-amber-400 text-white text-xs font-mono font-bold flex items-center justify-between animate-pulse">
            <span>Sweetie is talking softly ({activeMood})...</span>
            <button
              type="button"
              onClick={stopSpeaking}
              className="underline text-[11px] cursor-pointer"
            >
              Stop voice
            </button>
          </div>
        )}

        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 bg-gradient-to-b from-rose-50/30 via-white to-pink-50/30">
          {messages.map((msg) => {
            const isUser = msg.role === "user";
            const isThisSpeaking = speakingMessageId === msg.id;

            return (
              <div
                key={msg.id}
                className={`flex items-end gap-2.5 ${
                  isUser ? "flex-row-reverse" : "flex-row"
                }`}
              >
                <div
                  className={`w-8 h-8 rounded-2xl flex items-center justify-center shrink-0 shadow-sm ${
                    isUser
                      ? "bg-slate-900 text-white"
                      : "bg-gradient-to-br from-rose-500 to-pink-500 text-white"
                  }`}
                >
                  {isUser ? <User size={15} /> : <Cog size={15} />}
                </div>

                <div
                  className={`max-w-[82%] px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap ${
                    isUser
                      ? "rounded-3xl rounded-br-md bg-slate-900 text-white shadow-md"
                      : "rounded-3xl rounded-bl-md bg-white border border-slate-200 text-slate-800 shadow-sm"
                  }`}
                >
                  <div>{msg.content}</div>
                  <div className="mt-1.5 flex items-center justify-between gap-3 text-[10px] font-mono text-slate-400">
                    <span>{msg.time}</span>
                    {!isUser && (
                      <div className="flex items-center gap-2.5">
                        <button
                          type="button"
                          onClick={() => speakMessage(msg.id, msg.content)}
                          aria-label={
                            isThisSpeaking ? "Stop speaking reply" : "Speak reply"
                          }
                          title={
                            isThisSpeaking ? "Stop speaking" : "Listen to reply"
                          }
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full transition-colors cursor-pointer ${
                            isThisSpeaking
                              ? "bg-rose-100 text-rose-700 font-bold"
                              : "hover:bg-rose-50 hover:text-rose-600"
                          }`}
                        >
                          {isThisSpeaking ? (
                            <>
                              <Square size={10} className="fill-current" /> Stop
                            </>
                          ) : (
                            <>
                              <Volume2 size={12} /> Speak
                            </>
                          )}
                        </button>

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
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}

          {loading && (
            <div className="flex items-end gap-2.5">
              <div className="w-8 h-8 rounded-2xl bg-gradient-to-br from-rose-500 to-pink-500 text-white flex items-center justify-center shrink-0">
                <Cog size={15} className="animate-spin" />
              </div>
              <div className="px-4 py-3 rounded-3xl rounded-bl-md bg-white border border-rose-200 text-xs font-mono font-bold text-rose-600 shadow-sm">
                {THINKING_PHRASES[thinkingIdx]}
              </div>
            </div>
          )}

          <div ref={bottomRef} />
        </div>

        {micError && (
          <div className="px-4 py-1.5 bg-rose-50 border-t border-rose-200 text-[11px] font-mono text-rose-700">
            {micError}
          </div>
        )}

        <form
          onSubmit={(e) => {
            e.preventDefault();
            sendMessageWithText(input, messages);
          }}
          className="p-3 bg-white border-t border-slate-200 flex items-center gap-2"
        >
          <button
            type="button"
            onPointerDown={startHoldToSpeak}
            onPointerUp={stopHoldToSpeak}
            onPointerLeave={stopHoldToSpeak}
            onPointerCancel={stopHoldToSpeak}
            onContextMenu={(e) => e.preventDefault()}
            aria-label="Hold to speak"
            title="Press and hold to speak"
            className={`inline-flex items-center gap-1.5 px-3 py-2.5 rounded-2xl border text-xs font-mono font-bold transition-all select-none touch-none cursor-pointer shrink-0 ${
              holdingMic
                ? "bg-rose-500 border-rose-500 text-white scale-105 shadow-md"
                : "bg-slate-50 hover:bg-rose-50 border-slate-200 text-slate-700"
            }`}
          >
            <Mic size={16} />
            <span className="hidden sm:inline">
              {holdingMic ? "Speaking..." : "Hold Mic"}
            </span>
          </button>

          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={
              holdingMic ? "Hold & speak now..." : "Ask Sweetie anything..."
            }
            className="flex-1 px-4 py-2.5 rounded-2xl bg-slate-50 border border-slate-200 focus:border-rose-400 focus:bg-white focus:outline-none text-sm text-slate-900"
          />

          <button
            type="submit"
            disabled={loading || !input.trim()}
            className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-2xl bg-gradient-to-r from-rose-500 to-pink-500 text-white font-mono text-xs font-bold shadow-md hover:scale-105 transition-all cursor-pointer disabled:opacity-50 shrink-0"
          >
            <Send size={14} /> Send
          </button>
        </form>
      </div>
    </div>
  );
}