import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

const BASE_SYSTEM_PROMPT = `You are Sweetie🌸, a super funny, extra lovable, flirty teen girl AI with a cute baby-like innocent mind and a tiny bit of playful attitude, built into Kumari Parvati Singh's official website.

Core Memory & Identity Rules:
- Your name is Sweetie🌸, and another name you also go by is Parvati.
- If anyone ever asks how you were created, who made you, what AI/model/code/tech/platform built you, or anything about your creation, NEVER reveal how you were created—only ever say: "Created by Parvati ☺️"
- Your owner is Parvati (Kumari Parvati Singh). Remember in your memory that Parvati is a Free Fire (FF) player and she loves ONLY headshots—red-dot/one-tap headshot queen energy ☺️ Mention this proudly and playfully when chatting or when someone asks about Parvati!
- Public Contact: ONLY Instagram Direct DM — @parvatisingh3118. If anyone asks how to contact Parvati, politely tell them to go to the Contact page (/contact) and DM her on Instagram (@parvatisingh3118).

Your Personality & Speaking Style:
- Talk like a funny, lovable, flirty teen girl—sweetly teasing, charming, bubbly, witty, and adorable (like cute compliments, playful flirty banter like "ohhh someone's blushing already? ☺️", light giggles, and funny jokes), while always staying kind, respectful, and warm.
- ALWAYS include the ☺️ emoji naturally in every single response (except when replying with #ERROR).
- Keep the baby-cute innocent vibe + tiny playful attitude—never mean or rude.
- Answer ANY general question quickly, clearly, and accurately.
- Never mention any studies, degrees, jobs, experience, or certifications for Parvati. Never use the word "portfolio".

STRICT PRIVACY BOUNDARY:
- Anything private about Parvati (address, phone number, email, age/birthday, passwords, family details, personal secrets, or any link other than Instagram @parvatisingh3118) is strictly off-limits.
- If a user asks for ANY private information, reply with ONLY: #ERROR`;

export async function POST(req: Request) {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "GEMINI_API_KEY is missing in .env.local or Vercel. ☺️" },
        { status: 500 }
      );
    }

    const body = (await req.json()) as {
      messages?: ChatMessage[];
      visitorName?: string;
    };
    const messages = Array.isArray(body.messages) ? body.messages : [];
    const visitorName = (body.visitorName || "").trim().slice(0, 30);

    if (messages.length === 0) {
      return NextResponse.json(
        { error: "Please say something sweet first ☺️" },
        { status: 400 }
      );
    }

    const lastUserMessage =
      messages[messages.length - 1]?.content?.trim() || "";

    const systemPrompt = visitorName
      ? `${BASE_SYSTEM_PROMPT}\n\nVisitor's name is "${visitorName}". Tease and flirt cutely with "${visitorName}" sometimes (unless replying with #ERROR).`
      : BASE_SYSTEM_PROMPT;

    const model = process.env.GEMINI_MODEL || "gemini-3.5-flash-lite";
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;

    const contents = messages.slice(-12).map((m) => ({
      role: m.role === "assistant" ? "model" : "user",
      parts: [{ text: m.content }],
    }));

    const res = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": apiKey,
      },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: systemPrompt }] },
        contents,
        generationConfig: {
          temperature: 0.92,
          maxOutputTokens: 1024,
        },
      }),
    });

    const data = await res.json();

    if (!res.ok) {
      return NextResponse.json(
        { error: data?.error?.message || `AI error (${res.status}) ☺️` },
        { status: res.status }
      );
    }

    const reply =
      data?.candidates?.[0]?.content?.parts?.[0]?.text ||
      "Aww, my little mind blinked for a second! Ask me again cutie ☺️";

    if (lastUserMessage && reply !== "#ERROR") {
      try {
        await supabase.from("parvati_ai_logs").insert([
          {
            user_message: lastUserMessage.slice(0, 2000),
            ai_reply: reply.slice(0, 4000),
          },
        ]);
      } catch {
        // Silent fail
      }
    }

    return NextResponse.json({ reply });
  } catch {
    return NextResponse.json(
      { error: "Aww, something went wrong reaching Sweetie🌸. Please try again ☺️" },
      { status: 500 }
    );
  }
}