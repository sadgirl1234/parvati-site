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
  LogOut,
  ShieldCheck,
} from "lucide-react";
import { supabase } from "@/lib/supabase";

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
  baseColor: string;
  highlightColor: string;
  alpha: number;
  fading: boolean;
}

interface ActiveUserSession {
  identifier: string;
  method: "google";
}

const USER_AUTH_KEY = "sweetie_ai_user_session_v1";
const QUESTION_BACKUP_KEY = "sweetie_stored_questions_v1";
const NAME_KEY = "sweetie_visitor_name";

const PETAL_PALETTE = [
  { base: "#e11d48", highlight: "#fda4af" },
  { base: "#db2777", highlight: "#f9a8d4" },
  { base: "#be123c", highlight: "#fecdd3" },
  { base: "#f43f5e", highlight: "#ffe4e6" },
  { base: "#c026d3", highlight: "#f5d0fe" },
];

const THINKING_PHRASES = [
  "Hold on, thinking with cute attitude... 🙄✨",
  "Sweetie is cooking up a funny comeback... 😏💅",
  "Give me a sec, making it extra cute... 🌸😌",
];

function ColourfulGoogleLogo({ size = 16 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      aria-hidden="true"
      className="shrink-0"
    >
      <path
        fill="#4285F4"
        d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.54-1.14 2.85-2.4 3.72v3.05h3.88c2.27-2.09 3.665-5.17 3.665-8.26z"
      />
      <path
        fill="#34A853"
        d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.11-6.72-4.96H1.29v3.14C3.26 21.3 7.31 24 12 24z"
      />
      <path
        fill="#FBBC05"
        d="M5.28 14.24c-.24-.72-.38-1.49-.38-2.24s.14-1.52.38-2.24V6.62H1.29C.47 8.24 0 10.06 0 12s.47 3.76 1.29 5.38l3.99-3.14z"
      />
      <path
        fill="#EA4335"
        d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.7 1.29 6.62l3.99 3.14c.95-2.85 3.6-4.96 6.72-4.96z"
      />
    </svg>
  );
}

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

  if (mood === "cry") out.push("haaah...");
  else if (mood === "calm") out.push("phewww...");
  else if (mood === "emotional") out.push("ahhh...");
  else if (mood === "attitude") out.push("hmmph...");
  else if (mood === "laugh") out.push("hehe...");
  else out.push("ahhh...");

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

function drawRealisticPetal(ctx: CanvasRenderingContext2D, p: Petal) {
  if (p.alpha <= 0.01) return;

  ctx.save();
  ctx.translate(p.x, p.y);
  ctx.rotate(p.rotation);

  ctx.shadowColor = `rgba(136, 19, 55, ${0.28 * p.alpha})`;
  ctx.shadowBlur = 9;
  ctx.shadowOffsetX = 2;
  ctx.shadowOffsetY = 5;

  const r = p.size;
  const grad = ctx.createLinearGradient(-r, -r * 0.6, r, r * 0.6);
  grad.addColorStop(0, p.highlightColor);
  grad.addColorStop(0.45, p.baseColor);
  grad.addColorStop(1, "#881337");

  ctx.fillStyle = grad;
  ctx.globalAlpha = Math.max(0, Math.min(0.92, p.alpha));

  ctx.beginPath();
  ctx.moveTo(-r * 0.85, 0);
  ctx.bezierCurveTo(
    -r * 0.55,
    -r * 0.72,
    r * 0.45,
    -r * 0.68,
    r * 0.95,
    0
  );
  ctx.bezierCurveTo(
    r * 0.45,
    r * 0.68,
    -r * 0.55,
    r * 0.72,
    -r * 0.85,
    0
  );
  ctx.closePath();
  ctx.fill();

  ctx.shadowColor = "transparent";
  ctx.strokeStyle = `rgba(255, 255, 255, ${0.35 * p.alpha})`;
  ctx.lineWidth = 0.8;
  ctx.beginPath();
  ctx.moveTo(-r * 0.65, 0);
  ctx.quadraticCurveTo(0, -r * 0.08, r * 0.65, 0);
  ctx.stroke();

  ctx.restore();
}

async function storeUserQuestionRecord(params: {
  userIdentifier: string;
  authMethod: "google";
  question: string;
  aiReply: string;
}) {
  const record = {
    user_identifier: params.userIdentifier,
    auth_method: params.authMethod,
    question: params.question,
    ai_reply: params.aiReply,
    created_at: new Date().toISOString(),
  };

  try {
    const existingRaw = localStorage.getItem(QUESTION_BACKUP_KEY);
    const existing = existingRaw ? (JSON.parse(existingRaw) as unknown[]) : [];
    const next = [{ id: Date.now(), ...record }, ...existing].slice(0, 100);
    localStorage.setItem(QUESTION_BACKUP_KEY, JSON.stringify(next));
  } catch {
    // Ignored
  }

  try {
    await supabase.from("sweetie_user_questions").insert([record]);
  } catch {
    // Ignored
  }
}

export default function SweetieAIPage() {
  const [userSession, setUserSession] = useState<ActiveUserSession | null>(
    null
  );
  const [authError, setAuthError] = useState("");
  const [authBusy, setAuthBusy] = useState(false);

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

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const petalsRef = useRef<Petal[]>([]);
  const bottomRef = useRef<HTMLDivElement | null>(null);
  const recognitionRef = useRef<SpeechRecognizerLike | null>(null);
  const holdingRef = useRef(false);
  const speakSessionRef = useRef(0);

  useEffect(() => {
    try {
      const savedSession = sessionStorage.getItem(USER_AUTH_KEY);
      if (savedSession) {
        const parsed = JSON.parse(savedSession) as ActiveUserSession;
        if (parsed?.identifier) {
          setUserSession(parsed);
        }
      }
    } catch {
      // Ignored
    }

    supabase.auth.getUser().then(({ data }) => {
      const email = data?.user?.email;
      if (email) {
        const sess: ActiveUserSession = {
          identifier: email,
          method: "google",
        };
        setUserSession(sess);
        try {
          sessionStorage.setItem(USER_AUTH_KEY, JSON.stringify(sess));
        } catch {
          // Ignored
        }
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      const email = session?.user?.email;
      if (email) {
        const sess: ActiveUserSession = {
          identifier: email,
          method: "google",
        };
        setUserSession(sess);
        setAuthError("");
        try {
          sessionStorage.setItem(USER_AUTH_KEY, JSON.stringify(sess));
        } catch {
          // Ignored
        }
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const createPetal = (startAtTop = true, slotIndex?: number): Petal => {
      const pair =
        PETAL_PALETTE[Math.floor(Math.random() * PETAL_PALETTE.length)];
      const spreadX =
        typeof slotIndex === "number"
          ? ((slotIndex + 0.5) / 64) * width + (Math.random() - 0.5) * 28
          : Math.random() * width;

      return {
        x: ((spreadX % width) + width) % width,
        y: startAtTop
          ? -24 - Math.random() * 120
          : Math.random() * (height - 40),
        vx: (Math.random() - 0.5) * 0.45,
        vy: 0.12 + Math.random() * 0.14,
        size: 9 + Math.random() * 6,
        rotation: Math.random() * Math.PI * 2,
        vRot: (Math.random() - 0.5) * 0.012,
        swayPhase: Math.random() * Math.PI * 2,
        swaySpeed: 0.014 + Math.random() * 0.012,
        baseColor: pair.base,
        highlightColor: pair.highlight,
        alpha: 0.9,
        fading: false,
      };
    };

    petalsRef.current = Array.from({ length: 64 }, (_, idx) =>
      createPetal(false, idx)
    );

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };
    window.addEventListener("resize", handleResize, { passive: true });

    let animId = 0;
    let windTick = 0;
    let spawnAccumulator = 0;

    const tick = () => {
      windTick += 0.006;
      const windForce =
        Math.sin(windTick) * 0.85 + Math.cos(windTick * 2.1) * 0.35;

      ctx.clearRect(0, 0, width, height);

      spawnAccumulator += 0.35;
      while (spawnAccumulator >= 1 && petalsRef.current.length < 120) {
        petalsRef.current.push(createPetal(true));
        spawnAccumulator -= 1;
      }

      const nextPetals: Petal[] = [];

      for (const p of petalsRef.current) {
        p.swayPhase += p.swaySpeed;
        const targetFallSpeed = 0.13 + (p.size % 4) * 0.018;
        p.vy += (targetFallSpeed - p.vy) * 0.05;
        p.x += windForce + Math.sin(p.swayPhase) * 0.75 + p.vx * 0.2;
        p.y += p.vy;
        p.rotation += p.vRot + windForce * 0.005;

        if (p.x < -28) p.x = width + 22;
        if (p.x > width + 28) p.x = -22;

        if (p.y >= height - 65) {
          p.fading = true;
        }
        if (p.fading) {
          p.alpha -= 0.008;
        }

        if (p.alpha > 0.01 && p.y <= height + 24) {
          drawRealisticPetal(ctx, p);
          nextPetals.push(p);
        }
      }

      petalsRef.current = nextPetals;
      animId = window.requestAnimationFrame(tick);
    };

    animId = window.requestAnimationFrame(tick);

    return () => {
      window.removeEventListener("resize", handleResize);
      window.cancelAnimationFrame(animId);
    };
  }, []);

  const handleContinueWithGoogle = async () => {
    setAuthError("");
    setAuthBusy(true);
    try {
      const redirectTo =
        typeof window !== "undefined"
          ? `${window.location.origin}/ai`
          : undefined;
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo },
      });
      if (error) {
        setAuthError(error.message || "Google sign-in failed.");
        setAuthBusy(false);
      }
    } catch {
      setAuthError("Could not start Google sign-in.");
      setAuthBusy(false);
    }
  };

  const handleLogout = async () => {
    setUserSession(null);
    setAuthBusy(false);
    try {
      sessionStorage.removeItem(USER_AUTH_KEY);
      await supabase.auth.signOut();
    } catch {
      // Ignored
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
      if (!text || loading || !userSession) return;

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

      let finalReply = "";
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
        finalReply = res.ok
          ? data.reply ??
            "Hmph, my cute brain blinked for a second! Ask me again 🙄🌸"
          : `⚠️ ${data.error ?? "Failed to reply."}`;

        setMessages((prev) => [
          ...prev,
          {
            id: `a-${Date.now()}`,
            role: "assistant",
            content: finalReply,
            time: getTimeNow(),
          },
        ]);
      } catch {
        finalReply = "Aww, network got sleepy 🙄🌸 Try again in a bit!";
        setMessages((prev) => [
          ...prev,
          {
            id: `err-${Date.now()}`,
            role: "assistant",
            content: finalReply,
            time: getTimeNow(),
          },
        ]);
      } finally {
        setLoading(false);
        await storeUserQuestionRecord({
          userIdentifier: userSession.identifier,
          authMethod: userSession.method,
          question: text,
          aiReply: finalReply,
        });
      }
    },
    [loading, stopSpeaking, userSession, visitorName]
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
          ? `Heyyy ${saved}! 😏💖 Sweetie is glowing with cute attitude today 🌸 Tap Speak on any reply to hear my soft voice!`
          : "Heyyy cutie! 😏💖 I'm Sweetie—cute, funny, and a little sassy. Tap Speak on any reply whenever you want to hear my soft voice! ✨🌸",
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

  const speakingNow = speakingMessageId !== null;
  const isChatAnimated = holdingMic || speakingNow;

  return (
    <>
      <canvas
        ref={canvasRef}
        aria-hidden="true"
        style={{
          position: "fixed",
          inset: 0,
          width: "100vw",
          height: "100vh",
          zIndex: 9999,
          pointerEvents: "none",
        }}
      />

      <div className="relative z-10 max-w-3xl mx-auto space-y-4">
        {!userSession ? (
          <div className="max-w-md mx-auto py-12">
            <div className="p-7 rounded-3xl bg-white/95 border border-rose-200 shadow-xl space-y-5 text-center">
              <div className="w-14 h-14 mx-auto rounded-2xl bg-gradient-to-br from-rose-500 to-pink-500 text-white flex items-center justify-center shadow-md">
                <ShieldCheck size={26} />
              </div>

              <div className="space-y-1">
                <h1 className="text-2xl font-heading font-bold text-slate-900">
                  Login or Create Account
                </h1>
                <p className="text-xs text-slate-600">
                  Sign in with your Google account to chat with Sweetie🌸 AI.
                </p>
              </div>

              <button
                type="button"
                disabled={authBusy}
                onClick={handleContinueWithGoogle}
                className="w-full inline-flex items-center justify-center gap-2.5 px-5 py-3.5 rounded-2xl bg-white hover:bg-rose-50 border border-slate-200 hover:border-rose-300 text-slate-900 font-mono text-xs font-bold shadow-md hover:scale-[1.02] transition-all cursor-pointer disabled:opacity-60"
              >
                <ColourfulGoogleLogo size={18} />
                <span>
                  {authBusy ? "Redirecting to Google..." : "Continue with Google"}
                </span>
              </button>

              {authError && (
                <p className="text-xs font-mono text-rose-700 bg-rose-50 border border-rose-200 rounded-xl p-2.5">
                  {authError}
                </p>
              )}
            </div>
          </div>
        ) : (
          <>
            <div className="rounded-3xl px-5 py-4 bg-gradient-to-r from-rose-50/95 via-white/95 to-pink-50/95 border border-rose-200 shadow-lg flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div
                  className={`w-12 h-12 rounded-2xl bg-gradient-to-br from-rose-500 via-pink-500 to-amber-400 text-white flex items-center justify-center shadow-md transition-transform duration-300 ${
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
                    {userSession.identifier} • Mood:{" "}
                    <span className="font-mono font-bold text-rose-600">
                      {speakingNow ? `${activeMood} (speaking)` : activeMood}
                    </span>
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {editingName ? (
                  <form
                    onSubmit={handleSaveName}
                    className="flex items-center gap-1.5"
                  >
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
                  onClick={handleLogout}
                  title="Sign out"
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-2xl bg-slate-900 hover:bg-rose-600 text-white text-xs font-mono font-bold transition-colors cursor-pointer"
                >
                  <LogOut size={12} /> Logout
                </button>
              </div>
            </div>

            <div
              className={`rounded-[2rem] bg-white/95 border shadow-xl overflow-hidden flex flex-col h-[64vh] min-h-[430px] transition-all duration-300 ${
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
                  <span>
                    Sweetie is speaking with cute exhales ({activeMood})...
                  </span>
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
                                  isThisSpeaking
                                    ? "Stop speaking reply"
                                    : "Speak reply"
                                }
                                title={
                                  isThisSpeaking
                                    ? "Stop speaking"
                                    : "Listen to reply"
                                }
                                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full transition-colors cursor-pointer ${
                                  isThisSpeaking
                                    ? "bg-rose-100 text-rose-700 font-bold"
                                    : "hover:bg-rose-50 hover:text-rose-600"
                                }`}
                              >
                                {isThisSpeaking ? (
                                  <>
                                    <Square size={10} className="fill-current" />{" "}
                                    Stop
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
          </>
        )}
      </div>
    </>
  );
}