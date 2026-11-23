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
  Lock,
  Unlock,
  KeyRound,
  Brush,
  Sparkles,
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

interface Petal {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  rotation: number;
  vRot: number;
  swayPhase: number;
  swaySpeed: number;
  color: string;
  settled: boolean;
}

const AI_ACCESS_PWD = "841694";
const UNLOCK_SESSION_KEY = "sweetie_ai_unlocked_v1";
const NAME_KEY = "sweetie_visitor_name";

const PETAL_COLORS = [
  "#fb7185",
  "#f43f5e",
  "#fda4af",
  "#f472b6",
  "#f9a8d4",
  "#fecdd3",
];

const THINKING_PHRASES = [
  "Hold on, thinking with cute attitude... 🙄✨",
  "Sweetie is cooking up a funny comeback... 😏💅",
  "Give me a sec, making it extra cute... 🌸😌",
];

function getTimeNow() {
  return new Intl.DateTimeFormat("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  }).format(new Date());
}

function sanitizeForSpeech(raw: string): string {
  const withoutSurrogatePairs = raw.replace(
    /[\uD800-\uDBFF][\uDC00-\uDFFF]/g,
    " "
  );
  const withoutSymbols = withoutSurrogatePairs.replace(/[\u2600-\u27BF]/g, " ");
  const withoutSelectors = withoutSymbols.replace(
    /[\uFE00-\uFE0F\u200D]/g,
    ""
  );
  const withoutEmojiLabels = withoutSelectors.replace(
    /\b(smiling face|blushing|cherry blossom|sparkles|heart|red heart|grinning|laughing|crying|sob|tears|wink|kiss|rolling eyes|eye roll|emoji)\b/gi,
    " "
  );
  const withoutAsterisks = withoutEmojiLabels.replace(/\*[^*]+\*/g, " ");
  return withoutAsterisks.replace(/\s+/g, " ").trim();
}

function isHindiWord(word: string): boolean {
  if (/[\u0900-\u097F]/.test(word)) return true;
  return /^(kya|hai|hain|hoon|hu|mera|meri|mere|tum|aap|kaise|kaisi|kyun|kyu|kyon|acha|achha|achchha|batao|sunao|pyaar|dil|yaar|haan|nahi|nhi|nahin|bhai|didi|shukriya|dhanyavaad|khush|udas|rona|hasna|bilkul|zaroor|suno|dekho|chalo|abhi|bahut|thoda|thora|kaun|kahan|kidhar|mat|karo|karna|raha|rahi|rahe|tha|thi|the|ho|toh|aur|lekin|par|se|ko|ka|ki|ke|mein|main|ne)$/i.test(
    word.replace(/[^a-zA-Z\u0900-\u097F]/g, "")
  );
}

function hasHindiText(text: string): boolean {
  if (/[\u0900-\u097F]/.test(text)) return true;
  return text.split(/\s+/).some(isHindiWord);
}

function clarifyWordPhonetics(word: string): string {
  const clean = word.replace(/[^a-zA-Z\u0900-\u097F'?!.,]/g, "");
  const lower = clean.toLowerCase().replace(/[?!.,]/g, "");

  if (lower === "acha" || lower === "achha") return "achchha";
  if (lower === "kyun" || lower === "kyu") return "kyon";
  if (lower === "nahi" || lower === "nhi") return "nahin";
  if (lower === "thoda") return "thora";
  if (lower === "hoon" || lower === "hu") return "hoon";
  return clean;
}

type EmotionMood = "laugh" | "smile" | "cry" | "emotional" | "calm" | "attitude";

function detectEmotionMood(text: string): EmotionMood {
  const lower = text.toLowerCase();
  if (/\b(haha|hehe|lol|joke|funny|laugh|haso|hansi|mazak)\b/i.test(lower)) {
    return "laugh";
  }
  if (
    /\b(cry|crying|sad|sorry|hurt|miss|lonely|tear|rona|udas|dukhi)\b/i.test(
      lower
    )
  ) {
    return "cry";
  }
  if (
    /\b(love|sweet|cute|heart|care|hug|special|emotional|pyaar|dil)\b/i.test(
      lower
    )
  ) {
    return "emotional";
  }
  if (
    /\b(calm|relax|peace|slow|gentle|breathe|aaram|shanti|sleep)\b/i.test(
      lower
    )
  ) {
    return "calm";
  }
  if (/\b(attitude|whatever|seriously|huh|sassy|boss|hmph)\b/i.test(lower)) {
    return "attitude";
  }
  return "smile";
}

function buildExhalationWordStream(words: string[], mood: EmotionMood): string[] {
  const out: string[] = [];

  if (mood === "cry") {
    out.push("haaah...");
  } else if (mood === "calm") {
    out.push("phewww...");
  } else if (mood === "emotional") {
    out.push("ahhh...");
  } else if (mood === "attitude") {
    out.push("hmmph...");
  } else if (mood === "laugh") {
    out.push("hehe...");
  } else {
    out.push("ahhh...");
  }

  words.forEach((w, idx) => {
    out.push(w);
    if (idx > 0 && idx % 9 === 0) {
      if (mood === "cry") out.push("haaah...");
      else if (mood === "calm") out.push("phewww...");
      else out.push("ahhh...");
    }
  });

  return out;
}

export default function SweetieAIPage() {
  // Always start locked on mount unless explicitly unlocked in this session
  const [unlocked, setUnlocked] = useState(false);
  const [pwdInput, setPwdInput] = useState("");
  const [pwdError, setPwdError] = useState("");

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

  const [brushPos, setBrushPos] = useState<{ x: number; y: number } | null>(
    null
  );
  const [draggingBrush, setDraggingBrush] = useState(false);
  const [sweptCount, setSweptCount] = useState(0);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const petalsRef = useRef<Petal[]>([]);
  const bottomRef = useRef<HTMLDivElement | null>(null);
  const recognitionRef = useRef<SpeechRecognizerLike | null>(null);
  const holdingRef = useRef(false);
  const speakSessionRef = useRef(0);
  const draggingBrushRef = useRef(false);

  // Slow-motion wind-blown continuous petals + bottom pile + manual brush sweeping
  useEffect(() => {
    if (!unlocked) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const createPetal = (startAtTop = true): Petal => ({
      x: Math.random() * width,
      y: startAtTop
        ? -24 - Math.random() * 180
        : Math.random() * (height - 50),
      vx: (Math.random() - 0.5) * 0.8,
      vy: 0.55 + Math.random() * 0.75, // Gentle slow-motion fall speed
      size: 7 + Math.random() * 7,
      rotation: Math.random() * Math.PI * 2,
      vRot: (Math.random() - 0.5) * 0.035,
      swayPhase: Math.random() * Math.PI * 2,
      swaySpeed: 0.018 + Math.random() * 0.018,
      color: PETAL_COLORS[Math.floor(Math.random() * PETAL_COLORS.length)],
      settled: false,
    });

    petalsRef.current = Array.from({ length: 150 }, () => createPetal(false));

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };
    window.addEventListener("resize", handleResize, { passive: true });

    let animId = 0;
    let windTick = 0;
    const maxPileHeight = 140;

    const tick = () => {
      windTick += 0.008;
      // Blowing wind oscillates smoothly left and right with gentle gusts
      const windForce = Math.sin(windTick) * 1.45 + Math.cos(windTick * 2.3) * 0.55;

      ctx.clearRect(0, 0, width, height);

      // Non-stop continuous emission of fresh falling petals
      for (let i = 0; i < 2; i++) {
        petalsRef.current.push(createPetal(true));
      }

      // Keep settled pile bounded cleanly so frame rate stays silky while emission is non-stop
      if (petalsRef.current.length > 900) {
        petalsRef.current.splice(0, petalsRef.current.length - 900);
      }

      const nextPetals: Petal[] = [];

      for (const p of petalsRef.current) {
        if (!p.settled) {
          p.swayPhase += p.swaySpeed;
          // Slow-motion terminal drift with blowing wind
          const targetFallSpeed = 0.65 + (p.size % 5) * 0.14;
          p.vy += (targetFallSpeed - p.vy) * 0.04;
          p.x +=
            windForce +
            Math.sin(p.swayPhase) * 1.15 +
            p.vx * 0.25;
          p.y += p.vy;
          p.rotation += p.vRot + windForce * 0.012;

          // Wrap horizontally across viewport edges as wind blows
          if (p.x < -20) p.x = width + 15;
          if (p.x > width + 20) p.x = -15;

          const clampedX = Math.max(10, Math.min(width - 10, p.x));
          const pileJitter =
            ((Math.sin(clampedX * 0.035) + 1) * 0.5) * maxPileHeight;
          const floorY = height - 10 - pileJitter;

          if (p.y >= floorY) {
            p.y = floorY;
            p.x = clampedX;
            p.vy = 0;
            p.vx = 0;
            p.vRot = 0;
            p.settled = true;
          }
        }

        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rotation);
        ctx.fillStyle = p.color;
        ctx.globalAlpha = p.settled ? 0.92 : 0.86;
        ctx.beginPath();
        ctx.ellipse(0, 0, p.size * 0.65, p.size * 0.36, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();

        nextPetals.push(p);
      }

      petalsRef.current = nextPetals;
      animId = window.requestAnimationFrame(tick);
    };

    animId = window.requestAnimationFrame(tick);

    return () => {
      window.removeEventListener("resize", handleResize);
      window.cancelAnimationFrame(animId);
    };
  }, [unlocked]);

  const sweepPetalsAt = useCallback((clientX: number, clientY: number) => {
    const brushRadius = 72;
    let clearedNow = 0;

    petalsRef.current = petalsRef.current.filter((p) => {
      const dx = p.x - clientX;
      const dy = p.y - clientY;
      const dist = Math.hypot(dx, dy);
      if (dist <= brushRadius) {
        clearedNow += 1;
        return false;
      }
      return true;
    });

    if (clearedNow > 0) {
      setSweptCount((c) => c + clearedNow);
    }
  }, []);

  useEffect(() => {
    if (!draggingBrush) return;

    const onMove = (e: PointerEvent) => {
      setBrushPos({ x: e.clientX, y: e.clientY });
      sweepPetalsAt(e.clientX, e.clientY);
    };

    const onUp = () => {
      draggingBrushRef.current = false;
      setDraggingBrush(false);
    };

    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
    };
  }, [draggingBrush, sweepPetalsAt]);

  const handleUnlock = (e: React.FormEvent) => {
    e.preventDefault();
    if (pwdInput.trim() === AI_ACCESS_PWD) {
      setUnlocked(true);
      setPwdError("");
      setPwdInput("");
      try {
        sessionStorage.setItem(UNLOCK_SESSION_KEY, "1");
      } catch {
        // Ignored
      }
    } else {
      setPwdError("Incorrect password. Please try again.");
    }
  };

  const stopSpeaking = useCallback(() => {
    speakSessionRef.current += 1;
    setSpeakingMessageId(null);
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      try {
        window.speechSynthesis.cancel();
      } catch {
        // Ignored
      }
    }
  }, []);

  const handleLock = () => {
    stopSpeaking();
    setUnlocked(false);
    try {
      sessionStorage.removeItem(UNLOCK_SESSION_KEY);
    } catch {
      // Ignored
    }
  };

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

      const baseWords = stripped.split(/\s+/).filter(Boolean);
      if (baseWords.length === 0) return;

      const mood = detectEmotionMood(stripped);
      setActiveMood(mood);

      const spokenStream = buildExhalationWordStream(baseWords, mood);
      const sessionId = speakSessionRef.current + 1;
      speakSessionRef.current = sessionId;

      try {
        window.speechSynthesis.cancel();
      } catch {
        // Ignored
      }

      const voices = window.speechSynthesis.getVoices();
      const hindiVoice =
        voices.find((v) => v.lang.toLowerCase().startsWith("hi")) ||
        voices.find((v) => /india|hindi|heera|swara|neerja/i.test(v.name)) ||
        null;

      const englishVoice =
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

      let basePitch = 1.36;
      let baseRate = 1.03;
      let baseVolume = 0.86;

      if (mood === "laugh") {
        basePitch = 1.44;
        baseRate = 1.09;
        baseVolume = 0.92;
      } else if (mood === "attitude") {
        basePitch = 1.38;
        baseRate = 1.05;
        baseVolume = 0.88;
      } else if (mood === "cry") {
        basePitch = 1.28;
        baseRate = 0.92;
        baseVolume = 0.8;
      } else if (mood === "emotional") {
        basePitch = 1.37;
        baseRate = 0.99;
        baseVolume = 0.86;
      } else if (mood === "calm") {
        basePitch = 1.25;
        baseRate = 0.96;
        baseVolume = 0.8;
      }

      setSpeakingMessageId(messageId);

      const speakWordAt = (idx: number) => {
        if (speakSessionRef.current !== sessionId) return;
        if (idx >= spokenStream.length) {
          setSpeakingMessageId(null);
          return;
        }

        const rawWord = spokenStream[idx];
        const isExhale = /^(ahhh|haaah|phewww|hmmph|hehe)\.{3}$/i.test(rawWord);
        const wordIsHindi = isHindiWord(rawWord);
        const spokenWord = isExhale
          ? rawWord.replace(/\./g, "")
          : wordIsHindi
          ? clarifyWordPhonetics(rawWord)
          : rawWord.replace(/[^\w'-]/g, "") || rawWord;

        const wave = Math.sin(idx * 0.9) * 0.06;
        const utterance = new SpeechSynthesisUtterance(spokenWord);

        if (wordIsHindi) {
          utterance.lang = hindiVoice?.lang || "hi-IN";
          if (hindiVoice) utterance.voice = hindiVoice;
        } else {
          utterance.lang = englishVoice?.lang || "en-IN";
          if (englishVoice) utterance.voice = englishVoice;
        }

        if (isExhale) {
          utterance.pitch = Math.min(2, basePitch + 0.08);
          utterance.rate = 0.86;
          utterance.volume = Math.max(0.55, baseVolume - 0.14);
        } else {
          utterance.pitch = Math.min(2, Math.max(0.65, basePitch + wave));
          utterance.rate = Math.min(1.6, Math.max(0.78, baseRate + wave * 0.4));
          utterance.volume = baseVolume;
        }

        utterance.onend = () => {
          if (speakSessionRef.current !== sessionId) return;
          const delay = isExhale ? 45 : 18;
          setTimeout(() => speakWordAt(idx + 1), delay);
        };

        utterance.onerror = () => {
          if (speakSessionRef.current !== sessionId) return;
          speakWordAt(idx + 1);
        };

        try {
          window.speechSynthesis.speak(utterance);
        } catch {
          setSpeakingMessageId(null);
        }
      };

      speakWordAt(0);
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

      const askedAboutGame = /\b(free fire|ff|game|gaming|headshot)\b/i.test(
        text
      );
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
              "Be extra charming, funny, cute, expressive with emojis, and have a playful little attitude. Do not bring up Free Fire unless asked.",
            messages: filteredHistory.map((m) => ({
              role: m.role,
              content: m.content,
            })),
          }),
        });

        const data = (await res.json()) as { reply?: string; error?: string };
        const replyText = res.ok
          ? data.reply ??
            "Hmph, my cute brain blinked for a second! Ask me again 🙄🌸"
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
          ? `Heyyy ${saved}! 😏💖 Sweetie is glowing with cute attitude today 🌸 Drag the brush at the bottom to sweep fallen petals, or tap Speak to hear my soft voice!`
          : "Heyyy cutie! 😏💖 I'm Sweetie—cute, funny, and a little sassy. Drag the brush to sweep the petal pile at the bottom, or tap Speak on any reply! ✨🌸",
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
      recognition.lang = hasHindiText(input) ? "hi-IN" : "en-IN";
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
          "Okay fine, fresh slate! 😏💖 Cute & sassy mode is ready whenever you are ✨🌸",
        time: getTimeNow(),
      },
    ]);
  };

  if (!unlocked) {
    return (
      <div className="max-w-md mx-auto py-12 animate-fade-up">
        <form
          onSubmit={handleUnlock}
          className="p-7 rounded-3xl bg-white/95 border border-rose-200 shadow-xl space-y-5 text-center"
        >
          <div className="w-14 h-14 mx-auto rounded-2xl bg-gradient-to-br from-rose-500 to-pink-500 text-white flex items-center justify-center shadow-md">
            <Lock size={26} />
          </div>

          <div className="space-y-1">
            <h1 className="text-2xl font-heading font-bold text-slate-900">
              Sweetie🌸 AI Protected
            </h1>
            <p className="text-xs text-slate-600">
              Enter access password to open Sweetie🌸 chat.
            </p>
          </div>

          <div className="relative">
            <KeyRound
              size={16}
              className="text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2"
            />
            <input
              type="password"
              inputMode="numeric"
              autoFocus
              value={pwdInput}
              onChange={(e) => {
                setPwdInput(e.target.value);
                if (pwdError) setPwdError("");
              }}
              placeholder="Enter password..."
              className="w-full pl-10 pr-4 py-3 rounded-2xl bg-slate-50 border border-slate-200 focus:border-rose-400 focus:bg-white focus:outline-none text-sm font-mono text-slate-900"
            />
          </div>

          {pwdError && (
            <p className="text-xs font-mono font-bold text-rose-600">
              {pwdError}
            </p>
          )}

          <button
            type="submit"
            className="w-full inline-flex items-center justify-center gap-2 px-5 py-3 rounded-2xl bg-gradient-to-r from-rose-500 to-pink-500 text-white font-mono text-xs font-bold shadow-md hover:scale-[1.02] transition-all cursor-pointer"
          >
            <Unlock size={15} /> Unlock Sweetie🌸
          </button>
        </form>
      </div>
    );
  }

  const speakingNow = speakingMessageId !== null;
  const isChatAnimated = holdingMic || speakingNow;

  return (
    <div className="relative max-w-3xl mx-auto space-y-4 animate-fade-up">
      <canvas
        ref={canvasRef}
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 z-20"
      />

      {draggingBrush && brushPos && (
        <div
          style={{ left: brushPos.x - 24, top: brushPos.y - 24 }}
          aria-hidden="true"
          className="pointer-events-none fixed z-40 w-12 h-12 rounded-full bg-rose-500/20 border-2 border-rose-400 flex items-center justify-center text-rose-600 shadow-lg"
        >
          <Brush size={22} />
        </div>
      )}

      <div className="relative z-30 rounded-3xl px-5 py-4 bg-gradient-to-r from-rose-50/95 via-white/95 to-pink-50/95 border border-rose-200 shadow-lg flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div
            className={`w-12 h-12 rounded-2xl bg-gradient-to-br from-rose-500 via-pink-500 to-amber-400 text-white flex items-center justify-center shadow-md transition-transform duration-300 ${
              speakingNow ? "scale-110 animate-bounce" : ""
            }`}
          >
            <Cog size={22} />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <h1 className="text-xl sm:text-2xl font-heading font-bold text-slate-900">
                Sweetie🌸
              </h1>
              <Sparkles size={16} className="text-rose-500" />
            </div>
            <p className="text-xs text-slate-600">
              Slow wind petals + baby voice • Mood:{" "}
              <span className="font-mono font-bold text-rose-600">
                {speakingNow ? `${activeMood} (speaking)` : activeMood}
              </span>
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onPointerDown={(e) => {
              e.preventDefault();
              draggingBrushRef.current = true;
              setDraggingBrush(true);
              setBrushPos({ x: e.clientX, y: e.clientY });
              sweepPetalsAt(e.clientX, e.clientY);
            }}
            title="Drag across bottom petals to sweep them clean"
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-2xl border text-xs font-mono font-bold select-none touch-none cursor-grab active:cursor-grabbing transition-all ${
              draggingBrush
                ? "bg-rose-500 border-rose-500 text-white scale-105 shadow-md"
                : "bg-amber-50 hover:bg-amber-100 border-amber-300 text-amber-900"
            }`}
          >
            <Brush size={13} />
            <span>{draggingBrush ? "Sweeping..." : "Drag Brush"}</span>
            {sweptCount > 0 && (
              <span className="text-[10px] opacity-80">({sweptCount})</span>
            )}
          </button>

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

          <button
            type="button"
            onClick={handleLock}
            title="Lock AI"
            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-2xl bg-slate-900 hover:bg-rose-600 text-white text-xs font-mono font-bold transition-colors cursor-pointer"
          >
            <Lock size={12} /> Lock
          </button>
        </div>
      </div>

      <div
        className={`relative z-30 rounded-[2rem] bg-white/95 border shadow-xl overflow-hidden flex flex-col h-[64vh] min-h-[430px] transition-all duration-300 ${
          isChatAnimated
            ? "border-rose-400 ring-4 ring-rose-400/35 shadow-[0_0_40px_rgba(244,63,94,0.28)] scale-[1.01] animate-pulse"
            : "border-rose-200/80"
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
            <span>Sweetie is speaking with cute exhales ({activeMood})...</span>
            <button
              type="button"
              onClick={stopSpeaking}
              className="underline text-[11px] cursor-pointer"
            >
              Stop voice
            </button>
          </div>
        )}

        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 bg-gradient-to-b from-rose-50/40 via-white to-pink-50/40">
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
                      : "rounded-3xl rounded-bl-md bg-white border border-rose-100 text-slate-800 shadow-sm"
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